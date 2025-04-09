import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

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
  // Remove /api prefix if present - the URL is already correct in AUTH_API_URL
  if (config.url?.startsWith('/api/')) {
    config.url = config.url.replace('/api/', '/');
    console.log(`Corrected API path, now requesting: ${config.baseURL}${config.url}`);
  }
  console.log(`Auth API request to: ${config.baseURL}${config.url}`);
  return config;
});

// Add response interceptor for better error handling
authApi.interceptors.response.use(
  response => response,
  error => {
    console.error('Auth API error:', error);
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

// Add request interceptor to include JWT token
api.interceptors.request.use(async (config) => {
  console.log(`Making request to: ${config.baseURL}${config.url}`);
  const session = await supabase.auth.getSession();
  if (session?.data?.session?.access_token) {
    config.headers.Authorization = `Bearer ${session.data.session.access_token}`;
  }
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// Add response interceptor to handle auth errors and network issues
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized error (e.g., redirect to login)
      window.location.href = '/login';
    } else if (error.code === 'ERR_NETWORK') {
      console.error('Network error in API call:', error);
      // You could implement retry logic here if needed
    }
    return Promise.reject(error);
  }
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Google OAuth configuration for different environments
const GOOGLE_OAUTH_CONFIG = {
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  redirect_uri: isProd 
    ? 'https://quits.cc/auth/callback'  // Production: hard-coded to avoid any issues
    : `${window.location.origin}/auth/callback`,  // Development: based on origin
  scope: 'email profile https://www.googleapis.com/auth/gmail.readonly openid',
  response_type: 'code',
  access_type: 'offline',
  prompt: 'consent',
};

// Log the redirect URI for debugging
console.log(`Using Google OAuth redirect_uri: ${GOOGLE_OAUTH_CONFIG.redirect_uri}`);

// API service with methods for different API calls
const apiService = {
  // Auth endpoints
  auth: {
    // Get Google OAuth URL
    getGoogleAuthUrl: async () => {
      const params = new URLSearchParams(GOOGLE_OAUTH_CONFIG);
      return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
    },
    
    // Handle Google OAuth callback
    handleGoogleCallback: async (code: string) => {
      try {
        // Always use the correct path format with the auth API
        const endpoint = `/auth/google/callback?code=${code}`;
        console.log(`Sending callback request to: ${AUTH_API_URL}${endpoint}`);
        
        // Make direct request with axios to ensure correct URL
        const response = await axios({
          method: 'get',
          url: `${AUTH_API_URL}${endpoint}`,
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000 // 30-second timeout for callbacks
        });
        
        console.log('Google auth callback response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Google callback error:', error);
        
        // Try alternative approach with fetch if axios fails
        if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
          try {
            console.log('Trying alternative approach with fetch API');
            const response = await fetch(`${AUTH_API_URL}/auth/google/callback?code=${code}`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              return data;
            }
          } catch (fetchError) {
            console.error('Fetch fallback also failed:', fetchError);
          }
        }
        
        throw error; // Rethrow the original error if fetch also fails
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
        const response = await api.post('/email/scan', {}, {
          timeout: 60000 // 60 second timeout for scanning initialization
        });
        console.log('Email scan response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Email scanning error:', error);
        
        // If network error, try alternative approach with fetch
        if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
          try {
            console.log('Trying alternative approach with fetch API for email scanning');
            const fetchResponse = await fetch(`${API_URL}/email/scan`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (fetchResponse.ok) {
              const data = await fetchResponse.json();
              return data;
            }
          } catch (fetchError) {
            console.error('Fetch fallback for email scanning failed:', fetchError);
          }
        }
        
        throw new Error('Failed to start email scanning. Please try again later.');
      }
    },

    // Get scanning status with retry mechanism
    getScanningStatus: async () => {
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

    // Get subscription suggestions from scanned emails
    getSubscriptionSuggestions: async () => {
      try {
        const response = await api.get('/email/suggestions');
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
                'Accept': 'application/json'
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