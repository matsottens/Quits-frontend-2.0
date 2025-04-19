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
  prompt: 'select_account consent', // Always prompt for account selection + consent
  include_granted_scopes: 'true', // Include previously granted scopes
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
    
    // If token has expired, return null
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn('Token has expired, clearing from storage');
      localStorage.removeItem('token');
      return null;
    }
    
    // Check when the token was created
    if (payload.createdAt) {
      const createdTime = new Date(payload.createdAt).getTime();
      // If token is older than 7 days, it may be expired
      if (Date.now() - createdTime > 7 * 24 * 60 * 60 * 1000) {
        console.warn('Token is older than 7 days, might be stale');
      }
    }
    
    // If no Gmail token is present, return null
    if (!payload.gmail_token) {
      console.warn('No Gmail token found in JWT payload');
      return null;
    }
    
    return payload.gmail_token;
  } catch (error) {
    console.error('Error extracting Gmail token:', error);
    // Clear the token if it can't be parsed - it's probably corrupted
    localStorage.removeItem('token');
    return null;
  }
}

// API service with methods for different API calls
const apiService = {
  // Auth endpoints
  auth: {
    // Generate Google OAuth URL with state parameter for security
    getGoogleAuthUrl: (email = '') => {
      console.log('Generating Google OAuth URL');
      
      // Generate a random state value for CSRF protection
      const state = Math.random().toString(36).substring(2, 15);
      
      // Store state in sessionStorage to verify on callback
      try {
        sessionStorage.setItem('oauth_state', state);
        console.log('Stored OAuth state in sessionStorage:', state);
      } catch (e) {
        console.error('Failed to store OAuth state:', e);
      }
      
      // Always force the account picker by using prompt=select_account
      const params = new URLSearchParams({
        client_id: GOOGLE_OAUTH_CONFIG.client_id,
        redirect_uri: GOOGLE_OAUTH_CONFIG.redirect_uri,
        response_type: 'code',
        scope: GOOGLE_OAUTH_CONFIG.scope,
        state,
        prompt: 'select_account consent', // Force Google to show account selection screen
        access_type: 'offline'
      });
      
      // If email was provided, add login_hint parameter
      if (email && email.includes('@')) {
        params.append('login_hint', email);
        console.log(`Added login_hint with email: ${email}`);
      }
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      console.log(`Generated Google auth URL: ${authUrl.substring(0, 50)}...`);
      return authUrl;
    },

    // Handle Google OAuth callback with multiple fallback methods
    handleGoogleCallback: async (code: string) => {
      console.log(`Starting OAuth callback process for code: ${code.substring(0, 10)}...`);
      
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
              console.log('Existing token validated successfully');
              return {
                success: true,
                token: existingToken,
                message: 'Using existing token from localStorage'
              };
            }
          } catch (e) {
            console.error('Error decoding existing token:', e);
            localStorage.removeItem('token');
            console.log('Removed invalid token from localStorage');
          }
        }
      }

      // Check if this code has already been processed using sessionStorage to track codes
      const processedCodesKey = 'processed_oauth_codes';
      const processedCodes = JSON.parse(sessionStorage.getItem(processedCodesKey) || '{}');
      
      if (processedCodes[code]) {
        console.log(`This code has already been processed at ${new Date(processedCodes[code]).toISOString()}`);
        
        // Check if we now have a token (might have been set by another tab/process)
        const newToken = localStorage.getItem('token');
        if (newToken) {
          console.log('Found token in localStorage from previous processing');
          return {
            success: true,
            token: newToken,
            message: 'Using token from previous code processing'
          };
        }
        
        // If code was processed but no token, return error
        return {
          success: false,
          error: 'auth_code_already_used',
          message: 'This authorization code has already been used. Please start a new login flow.'
        };
      }
      
      // Mark this code as being processed
      processedCodes[code] = Date.now();
      sessionStorage.setItem(processedCodesKey, JSON.stringify(processedCodes));
      
      try {
        // First try the direct callback endpoint which is most efficient
        console.log('Attempting to use direct callback endpoint');
        
        try {
          const directUrl = `${AUTH_API_URL}/auth/google/callback?code=${encodeURIComponent(code)}&_t=${Date.now()}`;
          console.log(`Using direct URL: ${directUrl}`);
          
          // Use fetch for this call as it has better cross-origin support
          const response = await fetch(directUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'X-Client-Version': '2.0',
              'X-Requested-With': 'XMLHttpRequest',
              'Cache-Control': 'no-cache, no-store'
            }
          });
          
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              console.log('Direct callback successful:', data);
              
              if (data.token) {
                // Store token in localStorage
                localStorage.setItem('token', data.token);
                return {
                  success: true,
                  token: data.token,
                  user: data.user
                };
              }
            } else {
              console.log('Received non-JSON response from direct callback');
              const text = await response.text();
              console.log(`Response text (first 100 chars): ${text.substring(0, 100)}...`);
            }
          } else {
            console.error(`Direct callback failed with status: ${response.status}`);
            try {
              const errorText = await response.text();
              console.error('Error response:', errorText);
            } catch (e) {
              console.error('Could not read error response');
            }
          }
        } catch (directError) {
          console.error('Error with direct callback:', directError);
        }
        
        // If we get here, the direct method failed, try the Google proxy API as a fallback
        console.log('Direct callback failed, attempting to exchange code via Google proxy API');
        
        const proxyEndpoint = `${AUTH_API_URL}/google-proxy`;
        console.log(`Using proxy endpoint: ${proxyEndpoint}`);
        
        try {
          // Include extensive debugging headers to help diagnose issues
          const fetchOptions = {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-Client-Version': '2.0',
              'X-Requested-With': 'XMLHttpRequest',
              'Cache-Control': 'no-cache, no-store',
              'Pragma': 'no-cache'
            }
          };
          
          console.log('Fetch options:', fetchOptions);
          
          // Try both paths: with and without /api prefix
          const urls = [
            `${proxyEndpoint}?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}&_t=${Date.now()}`,
            `https://api.quits.cc/api/google-proxy?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}&_t=${Date.now()}`,
            `https://api.quits.cc/google-proxy?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}&_t=${Date.now()}`
          ];
          
          let successResponse = null;
          
          for (const url of urls) {
            try {
              console.log(`Trying URL: ${url}`);
              
              const response = await fetch(url, fetchOptions);
              
              console.log(`Response status for ${url}: ${response.status}`);
              
              if (response.ok) {
                const responseText = await response.text();
                console.log(`Raw response from ${url}: ${responseText.substring(0, 100)}...`);
                
                try {
                  const data = JSON.parse(responseText);
                  console.log(`Parsed response from ${url}:`, data);
                  
                  if (data.token) {
                    successResponse = data;
                    break;
                  }
                } catch (parseError) {
                  console.error(`Failed to parse response from ${url} as JSON:`, parseError);
                }
              }
            } catch (urlError) {
              console.error(`Failed to fetch from ${url}:`, urlError);
            }
          }
          
          if (successResponse) {
            console.log('Successfully obtained token from Google proxy');
            localStorage.setItem('token', successResponse.token);
            return {
              success: true,
              token: successResponse.token,
              user: successResponse.user
            };
          }
        } catch (proxyError) {
          console.error('All proxy attempts failed:', proxyError);
        }
        
        // If we get here, all attempts failed
        return {
          success: false,
          error: 'auth_failed',
          message: 'Failed to authenticate with Google. Please try again.'
        };
      } catch (error: any) {
        console.error('Google callback error:', error);
        
        // Check if we have an error response with details
        if (error.response?.data) {
          const errorData = error.response.data;
          
          if (errorData.error === 'invalid_grant') {
            // Mark this code as invalid in our tracking
            processedCodes[code] = 'invalid';
            sessionStorage.setItem(processedCodesKey, JSON.stringify(processedCodes));
          }
          
          return {
            success: false,
            error: errorData.error,
            message: errorData.message || 'Failed to authenticate with Google'
          };
        }
        
        return {
          success: false,
          error: 'request_failed',
          message: error.message || 'Unknown error during authentication'
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

    // Clear all auth data and storage
    clearAuthData: () => {
      // Clear local storage
      localStorage.removeItem('token');
      
      // Clear session storage
      try {
        sessionStorage.removeItem('processed_oauth_codes');
        sessionStorage.removeItem('oauth_state');
      } catch (e) {
        console.error('Error clearing session storage:', e);
      }
      
      // Clear any cookies (add any auth-related cookies here)
      document.cookie = 'auth_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      console.log('All authentication data cleared');
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
          // Redirect to login page instead of throwing error
          window.location.href = '/login?reason=token_missing';
          throw new Error('Authentication required to scan emails');
        }
        
        // Validate the token before proceeding
        try {
          const parts = authToken.split('.');
          if (parts.length !== 3) {
            throw new Error('Invalid token format');
          }
          
          // Parse the payload
          const payload = JSON.parse(atob(parts[1]));
          
          // Check token expiration
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.error('Token has expired');
            localStorage.removeItem('token'); // Clear invalid token
            window.location.href = '/login?reason=token_expired';
            throw new Error('Authentication token has expired');
          }
          
          // Check if we have a Gmail token inside the JWT
          if (!payload.gmail_token) {
            console.warn('No Gmail token in JWT - user needs to re-authenticate with Gmail');
            window.location.href = '/login?reason=missing_gmail_access';
            throw new Error('Gmail access token is missing. Please re-authenticate with Gmail.');
          }
        } catch (tokenError) {
          console.error('Token validation error:', tokenError);
          localStorage.removeItem('token'); // Clear invalid token
          window.location.href = '/login?reason=invalid_token';
          throw new Error('Invalid authentication token');
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
        
        // Check for specific error types that indicate authentication issues
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            console.error('Authentication failed (401) - clearing token');
            localStorage.removeItem('token');
            window.location.href = '/login?reason=auth_failed';
            throw new Error('Authentication failed. Please log in again.');
          }
          
          if (error.response?.status === 403) {
            console.error('Access forbidden (403) - may need new Gmail permissions');
            window.location.href = '/login?reason=permission_denied';
            throw new Error('Access to Gmail was denied. Please re-authorize with Gmail.');
          }
          
          // Only try fetch fallback if there's a network error
          if (error.code === 'ERR_NETWORK' || error.response?.status === 400) {
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