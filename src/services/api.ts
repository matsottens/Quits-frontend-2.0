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
      // First check if we already have a token in localStorage
      const existingToken = localStorage.getItem('token');
      if (existingToken) {
        console.log('Token already exists in localStorage, using it directly');
        // Verify token is valid by checking its format (simple validation)
        const parts = existingToken.split('.');
        if (parts.length === 3) {
          try {
            // Try to decode the middle part
            const payload = JSON.parse(atob(parts[1]));
            if (payload && payload.email) {
              return {
                success: true,
                token: existingToken,
                message: 'Using existing token from localStorage'
              };
            }
          } catch (e) {
            console.error('Error decoding existing token:', e);
          }
        }
      }

      // Track if we're processing this code - use a cache to prevent multiple calls with the same code
      const codeCache = window.sessionStorage.getItem('processed_oauth_codes') || '{}';
      const processedCodes = JSON.parse(codeCache);
      
      // If this code has been processed before, return a pending response
      if (processedCodes[code]) {
        console.log('This OAuth code has already been processed, returning pending status');
        
        // Check if we have a token in localStorage that might have been set by a redirect
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          console.log('Found token in localStorage despite detecting duplicate code');
          return {
            success: true,
            token: storedToken,
            message: 'Using cached token'
          };
        }
        
        // If the code was processed over 10 seconds ago, it's probably stale
        const processTime = processedCodes[code];
        if (Date.now() - processTime > 10000) {
          console.log('Code was processed too long ago, treating as invalid');
          return {
            success: false,
            error: 'invalid_grant',
            message: 'Authorization code has expired or already been used'
          };
        }
        
        return { pending: true, message: 'Auth code already being processed' };
      }
      
      // Mark this code as being processed
      processedCodes[code] = Date.now();
      window.sessionStorage.setItem('processed_oauth_codes', JSON.stringify(processedCodes));
      
      // Only attempt once, using URLSearchParams for proper encoding
      const safeCode = encodeURIComponent(code);
      const redirectUrl = encodeURIComponent(window.location.origin + '/dashboard');
      
      console.log(`Attempting Google auth callback with code: ${safeCode.substring(0, 12)}...`);
      
      // Create an array of possible approaches
      const approaches = [
        // Approach 1: Simple window.open to directly hit the callback URL
        async () => {
          try {
            console.log('[apiService] Trying window.open approach');
            const callbackUrl = `${window.location.origin.includes('localhost') ? 
              'http://localhost:3000' : 'https://api.quits.cc'}/api/auth/google/callback?code=${safeCode}&redirect=${redirectUrl}&_t=${Date.now()}`;
            
            // Open in a tiny popup that will close itself
            const popup = window.open(callbackUrl, '_blank', 'width=100,height=100,left=-1000,top=-1000');
            
            // Wait a bit and check if token appeared in localStorage
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try to close the popup
            if (popup) popup.close();
            
            // Check if we have a token now
            const popupToken = localStorage.getItem('token');
            if (popupToken) {
              console.log('[apiService] Window.open approach succeeded, found token');
              return {
                success: true,
                token: popupToken
              };
            }
            return null; // Approach failed
          } catch (e) {
            console.error('[apiService] Window.open approach failed:', e);
            return null; // Approach failed
          }
        },
        
        // Approach 2: Use the Google proxy endpoint
        async () => {
          try {
            console.log('[apiService] Trying Google proxy approach');
            // Add a timestamp to prevent browser caching issues
            const timestamp = Date.now();
            // Use the proxy endpoint instead of direct callback to avoid CORS issues
            const endpoint = `${AUTH_API_URL}/api/google-proxy?code=${safeCode}&redirect=${redirectUrl}&_t=${timestamp}`;
            
            const response = await fetch(endpoint, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log('[apiService] Proxy approach result:', data);
              
              // If we got a token, use it
              if (data.token) {
                localStorage.setItem('token', data.token);
                return data;
              }
              
              // If pending, return that
              if (data.pending) {
                return { pending: true };
              }
            }
            return null; // Approach failed
          } catch (e) {
            console.error('[apiService] Proxy approach failed:', e);
            return null; // Approach failed
          }
        },
        
        // Approach 3: Direct API call
        async () => {
          try {
            console.log('[apiService] Trying direct API call');
            const directApiUrl = `${window.location.origin.includes('localhost') ? 
              'http://localhost:3000' : 'https://api.quits.cc'}/api/auth/google/callback?code=${safeCode}&redirect=${redirectUrl}&_t=${Date.now()}`;
            
            const directResponse = await fetch(directApiUrl, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-store, no-cache'
              }
            });
            
            if (directResponse.ok) {
              const directData = await directResponse.json();
              console.log('[apiService] Direct API call result:', directData);
              
              if (directData.token) {
                localStorage.setItem('token', directData.token);
                return directData;
              }
            }
            return null; // Approach failed
          } catch (e) {
            console.error('[apiService] Direct API call failed:', e);
            return null; // Approach failed
          }
        }
      ];
      
      // Try each approach in sequence until one works
      try {
        for (const approach of approaches) {
          const result = await approach();
          if (result) {
            // Clear the code cache when successful
            delete processedCodes[code];
            window.sessionStorage.setItem('processed_oauth_codes', JSON.stringify(processedCodes));
            
            return result;
          }
          
          // Check after each approach if a token has appeared in localStorage
          const checkToken = localStorage.getItem('token');
          if (checkToken) {
            console.log('[apiService] Token appeared in localStorage during approaches');
            return {
              success: true,
              token: checkToken,
              message: 'Token found in localStorage during authentication'
            };
          }
        }
        
        // Final check for token in localStorage
        const finalCheckToken = localStorage.getItem('token');
        if (finalCheckToken) {
          console.log('[apiService] Final check found token in localStorage');
          return {
            success: true,
            token: finalCheckToken,
            message: 'Token found in localStorage after all approaches'
          };
        }
        
        // All approaches failed
        delete processedCodes[code];
        window.sessionStorage.setItem('processed_oauth_codes', JSON.stringify(processedCodes));
        
        return { 
          success: false,
          error: 'auth_failed',
          message: 'All authentication approaches failed',
          pending: true // Indicate we're still trying in the background
        };
      } catch (error) {
        // Clear this code from processing cache on error
        delete processedCodes[code];
        window.sessionStorage.setItem('processed_oauth_codes', JSON.stringify(processedCodes));
        
        console.error('[apiService] Auth API error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
          message: 'Failed to authenticate with Google'
        };
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