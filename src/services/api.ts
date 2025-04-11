import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Extend Window interface to allow for dynamic property assignment
declare global {
  interface Window {
    [key: string]: any;
  }
}

// API base URL - ALWAYS use api.quits.cc for auth in both prod and dev
const isProd = window.location.hostname !== 'localhost';
const API_URL = isProd 
  ? 'https://api.quits.cc' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000/api');

// Auth-specific API URL (always use production)
const AUTH_API_URL = 'https://api.quits.cc';

console.log(`Using API URL: ${API_URL} in ${isProd ? 'production' : 'development'} mode`);
console.log(`Using AUTH_API_URL: ${AUTH_API_URL} for all auth operations`);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Create a separate axios instance for auth that always uses the production API
const authApi = axios.create({
  baseURL: AUTH_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add special interceptor to debug all requests
authApi.interceptors.request.use(config => {
  try {
    // Remove /api prefix if present - the URL is already correct in AUTH_API_URL
    if (config.url?.startsWith('/api/')) {
      config.url = config.url.replace('/api/', '/');
      console.log(`Corrected API path, now requesting: ${config.baseURL}${config.url}`);
    }
    
    // Add CORS headers for auth requests
    config.headers['Access-Control-Allow-Origin'] = '*';
    config.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    config.headers['Access-Control-Allow-Headers'] = 'Origin, Content-Type, Accept, Authorization';
    
    console.log(`Auth API request to: ${config.baseURL}${config.url}`);
    return config;
  } catch (error) {
    console.error('Error in auth request interceptor:', error);
    return config;
  }
});

// Add response interceptor for better error handling
authApi.interceptors.response.use(
  response => response,
  async error => {
    console.log('Google callback error:', error);
    
    // If we get a network error on auth calls, try an alternative approach
    if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
      const originalRequest = error.config;
      if (originalRequest && originalRequest.url) {
        try {
          console.log('Trying fetch fallback for auth request:', originalRequest.url);
          
          // Extract the full URL including any query parameters
          const fullUrl = originalRequest.baseURL + originalRequest.url;
          console.log('Full URL for fetch fallback:', fullUrl);
          
          // Attempt with fetch API as a fallback
          const fetchResponse = await fetch(fullUrl, {
            method: originalRequest.method?.toUpperCase() || 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          if (fetchResponse.ok) {
            const data = await fetchResponse.json();
            console.log('Fetch fallback succeeded:', data);
            return { data, status: fetchResponse.status, headers: fetchResponse.headers };
          } else {
            console.error('Fetch fallback failed with status:', fetchResponse.status);
            const errorText = await fetchResponse.text().catch(() => 'No error text available');
            console.error('Error response:', errorText);
          }
        } catch (fetchError) {
          console.error('Fetch fallback also failed:', fetchError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Regular API for non-auth endpoints
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      // Handle authentication errors
      if (error.response?.status === 401) {
        console.error('Authentication failed - clearing token');
        localStorage.removeItem('token');
        // Optionally redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?error=session_expired';
        }
      }
      
      // Handle CORS errors with more debug info
      if (error.code === 'ERR_NETWORK') {
        console.error('Network error - possible CORS issue:', error);
      }
    }
    
    return Promise.reject(error);
  }
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Google OAuth configuration for different environments
const GOOGLE_OAUTH_CONFIG = {
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  redirect_uri: 'https://quits.cc/auth/callback',  // Always use production URL to avoid issues
  scope: 'email profile https://www.googleapis.com/auth/gmail.readonly openid',
  response_type: 'code',
  access_type: 'offline',
  prompt: 'consent',
};

// Log the redirect URI for debugging
console.log(`Using Google OAuth redirect_uri: ${GOOGLE_OAUTH_CONFIG.redirect_uri}`);

// Define interfaces for API responses
interface SubscriptionSuggestion {
  id?: string;
  service_name?: string;
  price?: number;
  currency?: string;
  billing_frequency?: string;
  confidence?: number;
  email_subject?: string;
  email_from?: string;
  email_date?: string;
  next_billing_date?: string;
  // Add any other fields that might be in the suggestion object
  [key: string]: any; // Allow for additional fields
}

// Function to safely extract the Gmail token from JWT
function getGmailToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    // JWT tokens have 3 parts separated by periods
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (middle part)
    const payload = JSON.parse(atob(parts[1]));
    return payload.gmail_token || null;
  } catch (error) {
    console.error('Error extracting Gmail token:', error);
    return null;
  }
}

// API service with methods for different API calls
const apiService = {
  // Auth endpoints
  auth: {
    // Get Google OAuth URL
    getGoogleAuthUrl: async () => {
      const params = new URLSearchParams(GOOGLE_OAUTH_CONFIG);
      return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
    },
    
    // Handle Google OAuth callback with multiple fallback methods
    handleGoogleCallback: async (code: string) => {
      // Only attempt once, using URLSearchParams for proper encoding
      const safeCode = encodeURIComponent(code);
      const redirectUrl = encodeURIComponent(window.location.origin + '/dashboard');
      
      console.log(`Attempting Google auth callback with code: ${safeCode.substring(0, 12)}...`);
      
      try {
        // Use a single endpoint for stability
        const endpoint = `/auth/google/callback?code=${safeCode}&redirect=${redirectUrl}`;
        const response = await authApi.get(endpoint, {
          timeout: 20000, // 20 second timeout
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.data?.token) {
          return response.data;
        } else {
          throw new Error('No token received from auth endpoint');
        }
      } catch (error) {
        console.error('Auth API error:', error);
        
        // Single fallback with fetch API if axios fails
        try {
          console.log('Trying fetch fallback for auth');
          const fetchResponse = await fetch(`${AUTH_API_URL}/auth/google/callback?code=${safeCode}&redirect=${redirectUrl}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (fetchResponse.ok) {
            const data = await fetchResponse.json();
            if (data?.token) {
              return data;
            }
          }
        } catch (fetchError) {
          console.error('Fetch fallback also failed:', fetchError);
        }
        
        throw new Error('All authentication attempts failed');
      }
    },
    
    // Get current user info
    getMe: async () => {
      console.log(`Getting user info`);
      const response = await authApi.get('/auth/me');
      return response.data;
    },
    
    // Logout the user
    logout: async () => {
      console.log(`Logging out`);
      const response = await authApi.post('/auth/logout');
      return response.data;
    },
    
    // Supabase auth methods
    signInWithEmail: async (email: string, password: string) => {
      return await supabase.auth.signInWithPassword({
        email,
        password,
      });
    },
    
    signUpWithEmail: async (email: string, password: string) => {
      return await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    },
    
    resetPassword: async (email: string) => {
      return await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    },
    
    updatePassword: async (newPassword: string) => {
      return await supabase.auth.updateUser({
        password: newPassword,
      });
    },
    
    signOut: async () => {
      return await supabase.auth.signOut();
    },

    onAuthStateChange: supabase.auth.onAuthStateChange,

    // Update user profile with phone number
    updatePhoneNumber: async (phoneNumber: string) => {
      const response = await api.post('/auth/update-phone', { phoneNumber });
      return response.data;
    },
  },
  
  // Email scanning endpoints
  email: {
    // Start email scanning process
    scanEmails: async () => {
      try {
        console.log('Initiating email scanning process');
        
        // Check if we have Gmail token
        const gmailToken = getGmailToken();
        if (!gmailToken) {
          console.warn('No Gmail token found in JWT - might use mock data');
        } else {
          console.log('Gmail token found in JWT - will use real data');
        }
        
        // Use the correct endpoint and a longer timeout
        const response = await api.post('/email/scan', {
          useRealData: !!gmailToken
        }, {
          timeout: 60000, // 60 second timeout
          headers: {
            'X-Gmail-Token': gmailToken || ''
          }
        });
        
        console.log('Email scan response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Email scanning error:', error);
        
        // Only try fetch fallback if there's a network error
        if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
          try {
            const gmailToken = getGmailToken();
            const fetchResponse = await fetch(`${API_URL}/email/scan`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Gmail-Token': gmailToken || ''
              },
              body: JSON.stringify({ useRealData: !!gmailToken })
            });
            
            if (fetchResponse.ok) {
              const data = await fetchResponse.json();
              return data;
            }
          } catch (fetchError) {
            console.error('Fetch fallback failed:', fetchError);
          }
        }
        
        // Return a consistent error object rather than throwing
        return { 
          error: true, 
          message: 'Failed to start email scanning',
          details: axios.isAxiosError(error) ? error.message : String(error)
        };
      }
    },

    // Get scanning status with retry mechanism
    getScanStatus: async () => {
      const maxRetries = 3;
      let retries = 0;
      
      const tryGetStatus = async () => {
        try {
          const response = await api.get('/email/status');
          return response.data;
        } catch (error) {
          console.error(`Error getting scan status (attempt ${retries + 1}/${maxRetries}):`, error);
          
          if (retries < maxRetries - 1) {
            retries++;
            // Exponential backoff: 1s, 2s, 4s...
            const delay = Math.pow(2, retries) * 1000;
            console.log(`Retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return tryGetStatus();
          }
          
          return { 
            error: 'Failed to retrieve scanning status', 
            status: 'error', 
            progress: 0 
          };
        }
      };
      
      return tryGetStatus();
    },

    // Alias for getScanStatus to maintain backward compatibility
    getScanningStatus: async () => {
      return await apiService.email.getScanStatus();
    },

    // Get subscription suggestions from scanned emails
    getSubscriptionSuggestions: async () => {
      try {
        const response = await api.get('/email/suggestions');
        
        // Map the response data to make it more consistent
        if (response.data?.suggestions && Array.isArray(response.data.suggestions)) {
          // Ensure all fields are present with consistent naming
          response.data.suggestions = response.data.suggestions.map((suggestion: SubscriptionSuggestion) => ({
            ...suggestion,
            // Ensure consistent property names (frontend uses camelCase)
            price: suggestion.price || 0,
            currency: suggestion.currency || 'USD',
            confidence: suggestion.confidence || 0.5,
            // Maintain both billing_frequency (backend) and billingFrequency (frontend) for compatibility
            billingFrequency: suggestion.billing_frequency || 'monthly',
            // Ensure email metadata is present
            email_subject: suggestion.email_subject || 'No Subject',
            email_from: suggestion.email_from || 'Unknown Sender',
            email_date: suggestion.email_date || new Date().toISOString()
          }));
        }
        
        return response.data;
      } catch (error) {
        console.error('Error getting subscription suggestions:', error);
        
        // Try the fetch API as a fallback
        if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
          try {
            console.log('Trying fetch fallback for getting suggestions');
            const fetchResponse = await fetch(`${API_URL}/email/suggestions`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (fetchResponse.ok) {
              const data = await fetchResponse.json();
              return data;
            }
          } catch (fetchError) {
            console.error('Fetch fallback for suggestions failed:', fetchError);
          }
        }
        
        return { error: 'Failed to retrieve suggestions', suggestions: [] };
      }
    },

    // Confirm or reject a subscription suggestion
    confirmSubscriptionSuggestion: async (suggestionId: string, confirmed: boolean) => {
      try {
        const response = await api.post(`/email/suggestions/${suggestionId}/confirm`, {
          confirmed
        });
        return response.data;
      } catch (error) {
        console.error('Error confirming suggestion:', error);
        
        // Try fetch API fallback
        if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
          try {
            console.log('Trying fetch fallback for confirming suggestion');
            const fetchResponse = await fetch(`${API_URL}/email/suggestions/${suggestionId}/confirm`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ confirmed })
            });
            
            if (fetchResponse.ok) {
              const data = await fetchResponse.json();
              return data;
            }
          } catch (fetchError) {
            console.error('Fetch fallback for confirming suggestion failed:', fetchError);
          }
        }
        
        throw error;
      }
    },
    
    // Test connectivity to the email API endpoint
    testConnection: async () => {
      try {
        const response = await api.get('/email/test-connection', { timeout: 5000 });
        return { success: true, data: response.data };
      } catch (error) {
        console.error('API connectivity test failed:', error);
        return { 
          success: false, 
          error: axios.isAxiosError(error) && error.code === 'ERR_NETWORK' 
            ? 'Network connectivity issue' 
            : 'API connection failed'
        };
      }
    }
  },
  
  // Subscription endpoints
  subscriptions: {
    // Get all subscriptions
    getAll: async () => {
      const response = await api.get('/subscription');
      return response.data;
    },
    
    // Get a single subscription
    getById: async (id: string) => {
      const response = await api.get(`/subscription/${id}`);
      return response.data;
    },
    
    // Create a new subscription
    create: async (data: any) => {
      const response = await api.post('/subscription', data);
      return response.data;
    },
    
    // Update a subscription
    update: async (id: string, data: any) => {
      const response = await api.put(`/subscription/${id}`, data);
      return response.data;
    },
    
    // Delete a subscription
    delete: async (id: string) => {
      const response = await api.delete(`/subscription/${id}`);
      return response.data;
    },
  },
};

export default apiService; 