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
const AUTH_API_URL = isProd
  ? 'https://api.quits.cc'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000/api');

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
  redirect_uri: isProd 
    ? 'https://www.quits.cc/auth/callback'
    : 'http://localhost:5173/auth/callback',
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
        // Add a timestamp to prevent browser caching issues
        const timestamp = Date.now();
        // Use the proxy endpoint instead of direct callback to avoid CORS issues
        const endpoint = `${AUTH_API_URL}/api/google-proxy?code=${safeCode}&redirect=${redirectUrl}&_t=${timestamp}`;
        
        console.log(`Calling backend proxy endpoint: ${endpoint}`);
        
        // First try: simple fetch with minimal headers
        try {
          console.log('[apiService] Attempt 1: Basic fetch');
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('[apiService] First fetch succeeded:', data);
            if (data.token) {
              return data;
            } else {
              console.warn('[apiService] Response OK but no token:', data);
            }
          } else {
            // Log the error response
            try {
              const errorText = await response.text();
              console.error(`[apiService] Error response (${response.status}):`, errorText);
              
              // Try to parse as JSON
              try {
                const errorJson = JSON.parse(errorText);
                console.error('[apiService] Error details:', errorJson);
              } catch (e) {
                // Not JSON
              }
            } catch (e) {
              console.error('[apiService] Could not read error response:', e);
            }
          }
        } catch (fetchError) {
          console.warn('[apiService] Initial fetch attempt failed:', fetchError);
          // Continue to next approach
        }
        
        // Second try: Add credentials but still keep headers minimal
        try {
          console.log('[apiService] Attempt 2: Fetch with credentials');
          const response = await fetch(endpoint, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('[apiService] Second fetch approach succeeded:', data);
            if (data.token) {
              return data;
            } else {
              console.warn('[apiService] Response OK but no token (attempt 2):', data);
            }
          } else {
            console.error(`[apiService] Second fetch failed with status: ${response.status}`);
          }
        } catch (fetchError2) {
          console.warn('[apiService] Second fetch attempt failed:', fetchError2);
          // Continue to next approach
        }
        
        // Third try: Use axios
        try {
          console.log('[apiService] Attempt 3: Axios call');
          const axiosResponse = await authApi.get(endpoint.replace(AUTH_API_URL, ''));
          if (axiosResponse?.data?.token) {
            console.log('[apiService] Axios approach succeeded:', axiosResponse.data);
            return axiosResponse.data;
          } else {
            console.warn('[apiService] Axios response without token:', axiosResponse.data);
          }
        } catch (axiosError) {
          console.warn('[apiService] Axios attempt failed:', axiosError);
          
          // Log more details if it's an axios error
          if (axios.isAxiosError(axiosError) && axiosError.response) {
            console.error('[apiService] Axios error details:', {
              status: axiosError.response.status,
              data: axiosError.response.data
            });
          }
        }
        
        // Fourth try: Use no-cors mode
        try {
          console.log('[apiService] Attempt 4: Fetch with no-cors mode');
          await fetch(endpoint, {
            method: 'GET',
            mode: 'no-cors'
          });
          console.log('[apiService] no-cors request didn\'t throw but response is opaque');
        } catch (noCorsError) {
          console.warn('[apiService] no-cors attempt failed:', noCorsError);
        }
        
        // Last resort: Redirect directly to the proxy URL
        console.log('[apiService] All API attempts failed, redirecting to backend directly');
        
        // Save state in sessionStorage
        sessionStorage.setItem('auth_redirect_attempted', 'true');
        sessionStorage.setItem('auth_redirect_time', Date.now().toString());
        sessionStorage.setItem('auth_code_prefix', safeCode.substring(0, 10) + '...');
        
        window.location.href = endpoint;
        
        // Return a temporary response since we're redirecting
        return { token: '', user: null, redirecting: true };
        
      } catch (error) {
        console.error('[apiService] Auth API error:', error);
        throw error;
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
        
        // Get auth token
        const authToken = localStorage.getItem('token');
        if (!authToken) {
          console.error('No authentication token found');
          throw new Error('Authentication required to scan emails');
        }
        
        // Check if we have Gmail token
        const gmailToken = getGmailToken();
        if (!gmailToken) {
          console.warn('No Gmail token found in JWT - will use mock data');
        } else {
          console.log('Gmail token found in JWT - will use real data');
        }
        
        // Use the correct endpoint with explicit Authorization header
        const response = await api.post('/email/scan', {
          useRealData: !!gmailToken
        }, {
          timeout: 60000, // 60 second timeout
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-Gmail-Token': gmailToken || ''
          }
        });
        
        console.log('Email scan response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Email scanning error:', error);
        
        // Only try fetch fallback if there's a network error
        if (axios.isAxiosError(error) && (error.code === 'ERR_NETWORK' || error.response?.status === 400)) {
          try {
            console.log('Trying fetch fallback method');
            const authToken = localStorage.getItem('token');
            const gmailToken = getGmailToken();
            
            const fetchResponse = await fetch(`${API_URL}/email/scan`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'X-Gmail-Token': gmailToken || ''
              },
              body: JSON.stringify({ useRealData: !!gmailToken })
            });
            
            if (!fetchResponse.ok) {
              console.error('Fetch fallback failed:', await fetchResponse.text());
              throw new Error('Failed to fetch');
            }
            
            const data = await fetchResponse.json();
            console.log('Fetch fallback succeeded:', data);
            return data;
          } catch (fetchError) {
            console.error('Fetch fallback failed:', fetchError);
            throw new Error('Failed to start email scanning');
          }
        }
        
        throw new Error('Failed to start email scanning');
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
            console.error('Error getting scan status:', error);
             
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
          throw error;
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
    }
  }
};

export default apiService;