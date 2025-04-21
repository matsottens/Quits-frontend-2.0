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
  // Expose utility methods at the root level for direct access
  getGoogleCallbackUrl: (code: string) => {
    const baseUrl = `${AUTH_API_URL}/api/google-proxy`;
    const timestamp = Date.now();
    const redirectUrl = 'https://www.quits.cc/dashboard';
    return `${baseUrl}?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(redirectUrl)}&_t=${timestamp}`;
  },
  
  // Add backward compatibility alias for verifyToken
  verifyToken: async (token: string) => {
    return await apiService.auth.verifyToken(token);
  },
  
  // Auth endpoints
  auth: {
    // Get Google Auth URL directly (no backend call needed)
    getGoogleAuthUrl: (emailHint = '') => {
      console.log('Generating direct Google auth URL');
      
      // Generate random state to prevent CSRF
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('oauth_state', state);
      
      // Store the timestamp for debugging
      localStorage.setItem('oauth_start_time', Date.now().toString());
      
      // Get the redirect URI based on current environment
      const isProd = window.location.hostname !== 'localhost';
      const redirectUri = isProd 
        ? 'https://www.quits.cc/auth/callback'
        : `${window.location.origin}/auth/callback`;
      
      // Direct URL construction (matching what the backend would provide)
      const clientId = '82730443897-ji64k4jhk02lonkps5vu54e1q5opoq3g.apps.googleusercontent.com';
      const scope = 'email profile https://www.googleapis.com/auth/gmail.readonly openid';
      
      const url = 'https://accounts.google.com/o/oauth2/auth' +
        '?client_id=' + encodeURIComponent(clientId) +
        '&redirect_uri=' + encodeURIComponent(redirectUri) +
        '&response_type=code' +
        '&scope=' + encodeURIComponent(scope) +
        '&state=' + encodeURIComponent(state) +
        '&prompt=select_account+consent' +
        '&access_type=offline';
      
      // Add email hint if provided
      const finalUrl = emailHint ? 
        `${url}&login_hint=${encodeURIComponent(emailHint)}` : 
        url;
      
      console.log('Using Google OAuth redirect_uri:', redirectUri);
      return finalUrl;
    },
    
    // Handle Google callback
    handleGoogleCallback: async (code: string) => {
      console.log('Starting OAuth callback process for code:', code.substring(0, 8) + '...');
      
      try {
        // Always use GET for Google proxy to avoid CORS issues
        const timestamp = Date.now();
        const proxyUrl = `${AUTH_API_URL}/api/google-proxy?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent('https://www.quits.cc/dashboard')}&_t=${timestamp}`;
        
        console.log('Trying proxy URL:', proxyUrl);
        
        try {
          // First try with standard fetch - no explicit OPTIONS request
          const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json, text/html, */*',
              'Cache-Control': 'no-cache'
            },
            credentials: 'include' // Include credentials for cross-domain requests
          });
          
          if (response.ok) {
            // Try to determine content type
            const contentType = response.headers.get('content-type');
            console.log('Response content type:', contentType);
            
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              console.log('Proxy response (JSON):', data);
              return data;
            } else {
              // Handle HTML response
              const text = await response.text();
              console.log('Received HTML/text response, length:', text.length);
              return {
                success: false,
                html_response: true,
                html_content: text, // Return the full HTML for token extraction
                message: 'Received HTML response instead of JSON'
              };
            }
          } else {
            console.log('Proxy response not OK:', response.status);
            const errorText = await response.text();
            console.log('Error response:', errorText);
            
            // Try to parse the error text as JSON
            try {
              return JSON.parse(errorText);
            } catch {
              return {
                success: false,
                error: 'proxy_error',
                message: `Server returned ${response.status}: ${errorText}`
              };
            }
          }
        } catch (error: unknown) {
          console.error('Fetch error:', error);
          return {
            success: false,
            error: 'fetch_error',
            message: error instanceof Error ? error.message : 'Network error during authentication'
          };
        }
      } catch (error: unknown) {
        console.error('Error in handleGoogleCallback:', error);
        return {
          success: false,
          error: 'auth_failed',
          message: 'Failed to authenticate with Google. Please try again.'
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

    // Verify token with backend
    verifyToken: async (token: string) => {
      try {
        console.log('Verifying token with backend');
        
        // First, store the token securely
        localStorage.setItem('token', token);
        
        // Make a request to verify the token
        const response = await fetch(`${AUTH_API_URL}/auth/verify`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          // If the server rejects the token, try to extract the error
          const errorText = await response.text();
          console.error('Token verification failed:', errorText);
          return { success: false, error: errorText };
        }
        
        // If we get a successful response, the token is valid
        const data = await response.json();
        return { success: true, ...data };
      } catch (error) {
        console.error('Error verifying token:', error);
        // Return success anyway if we can't reach the backend
        // This allows offline mode to work
        return { 
          success: true, 
          warning: 'Could not verify with backend, but token is stored',
          offline: true
        };
      }
    },

    // Clear all auth data and storage
    clearAuthData: () => {
      console.log('All authentication data cleared');
      localStorage.removeItem('token');
      localStorage.removeItem('quits_auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('oauth_state');
      localStorage.removeItem('oauth_start_time');
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
        
        // Use direct fetch approach with simple headers to avoid CORS issues
        console.log('Using direct fetch for email scanning');
        const response = await fetch(`${API_URL}/email/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-Gmail-Token': gmailToken || ''
          },
          body: JSON.stringify({ useRealData: !!gmailToken })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Email scan failed:', response.status, errorText);
          throw new Error(`Scan failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Email scan response:', data);
        return data;
      } catch (error) {
        console.error('Email scanning error:', error);
        
        // Check if the error message suggests authentication issues
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        if (errorMsg.includes('401') || errorMsg.includes('auth')) {
          console.error('Authentication issue detected - redirecting to login');
          localStorage.removeItem('token');
          window.location.href = '/login?reason=auth_failed';
          throw new Error('Authentication failed. Please log in again.');
        }
        
        // Fall back to fetch mode
        try {
          console.log('Trying fallback mode with minimal headers');
          const authToken = localStorage.getItem('token');
          const gmailToken = getGmailToken();
          
          // Even simpler approach with minimal headers
          const fallbackResponse = await fetch(`${API_URL}/email/scan`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Accept': 'application/json'
            },
            body: JSON.stringify({ useRealData: !!gmailToken })
          });
          
          if (!fallbackResponse.ok) {
            console.error('Fallback mode failed:', await fallbackResponse.text());
            throw new Error('All email scanning approaches failed');
          }
          
          const fallbackData = await fallbackResponse.json();
          console.log('Fallback approach succeeded:', fallbackData);
          return fallbackData;
        } catch (fallbackError) {
          console.error('All scanning approaches failed:', fallbackError);
          
          // Return mock response to avoid breaking the UI
          return {
            status: 'error',
            message: 'Could not connect to scanning service. Please try again later.',
            jobId: 'error-' + Date.now(),
            mock: true
          };
        }
      }
    },

    // Get scanning status with retry mechanism and using fetch
    getScanStatus: async () => {
      const maxRetries = 3;
      let retries = 0;
      
      const tryGetStatus = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_URL}/email/status`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`Status check failed with ${response.status}`);
          }
          
          return await response.json();
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

    // Get subscription suggestions using fetch
    getSubscriptionSuggestions: async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/email/suggestions`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to get suggestions: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Map the response data to make it more consistent
        if (data?.suggestions && Array.isArray(data.suggestions)) {
          // Ensure all fields are present with consistent naming
          data.suggestions = data.suggestions.map((suggestion: SubscriptionSuggestion) => ({
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
        
        return data;
      } catch (error) {
        console.error('Error getting subscription suggestions:', error);
        return { error: 'Failed to retrieve suggestions', suggestions: [] };
      }
    },

    // Confirm or reject a subscription suggestion using fetch
    confirmSubscriptionSuggestion: async (suggestionId: string, confirmed: boolean) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/email/suggestions/${suggestionId}/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ confirmed })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to confirm suggestion: ${response.status}`);
        }
        
        return await response.json();
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
      try {
        // Use fetch instead of axios to avoid CORS issues
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/subscription`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          console.error(`Subscription fetch failed with status: ${response.status}`);
          return { error: `Failed to fetch subscriptions: ${response.status}`, subscriptions: [] };
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return { error: 'Failed to fetch subscriptions', subscriptions: [] };
      }
    },
    
    // Get a single subscription
    getById: async (id: string) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/subscription/${id}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch subscription: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Error fetching subscription ${id}:`, error);
        throw error;
      }
    },
    
    // Create a new subscription
    create: async (data: any) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create subscription: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error creating subscription:', error);
        throw error;
      }
    },
    
    // Update a subscription
    update: async (id: string, data: any) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/subscription/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update subscription: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Error updating subscription ${id}:`, error);
        throw error;
      }
    },
    
    // Delete a subscription
    delete: async (id: string) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/subscription/${id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete subscription: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Error deleting subscription ${id}:`, error);
        throw error;
      }
    }
  }
};

export default apiService;