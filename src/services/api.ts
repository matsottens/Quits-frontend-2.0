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
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

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

/**
 * Function to extract Gmail token from JWT
 */
function extractGmailToken(token: string | null): string | null {
  if (!token) return null;
  
  try {
    // Split the token to get the payload
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (second part)
    const payload = atob(parts[1]);
    const parsed = JSON.parse(payload);
    
    return parsed.gmail_token || null;
  } catch (e) {
    console.error('Error extracting Gmail token:', e);
    return null;
  }
}

// Add a global OAuth code processing lock
let oauthCodeProcessing = false;

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
      
      // Prevent multiple simultaneous exchanges of the same code
      if (oauthCodeProcessing) {
        console.log('OAuth code already being processed, waiting for completion');
        return {
          success: false,
          error: 'processing_in_progress',
          message: 'Authentication is already in progress. Please wait.'
        };
      }
      
      oauthCodeProcessing = true;
      
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
              oauthCodeProcessing = false; // Reset processing flag
              return data;
            } else {
              // Handle HTML response
              const text = await response.text();
              console.log('Received HTML/text response, length:', text.length);
              oauthCodeProcessing = false; // Reset processing flag
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
              oauthCodeProcessing = false; // Reset processing flag
              return JSON.parse(errorText);
            } catch {
              oauthCodeProcessing = false; // Reset processing flag
              return {
                success: false,
                error: 'proxy_error',
                message: `Server returned ${response.status}: ${errorText}`
              };
            }
          }
        } catch (error: unknown) {
          console.error('Fetch error:', error);
          oauthCodeProcessing = false; // Reset processing flag on error
          return {
            success: false,
            error: 'fetch_error',
            message: error instanceof Error ? error.message : 'Network error during authentication'
          };
        }
      } catch (error: unknown) {
        console.error('Error in handleGoogleCallback:', error);
        oauthCodeProcessing = false; // Reset processing flag on error
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
        const response = await fetch(`${AUTH_API_URL}/api/auth/verify`, {
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
    // Scan emails for subscription information
    scanEmails: async (options = {}) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');
        
        console.log('SCAN-DEBUG: scanEmails called with options:', options);
        
        // Use axios instead of fetch to go through authentication interceptors
        const response = await axios.post(`${API_URL}/api/email/scan`, {
          token, // <-- Always include token in body
          ...options,
          useRealData: true
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('SCAN-DEBUG: /api/email/scan response status:', response.status);
        
        const data = response.data;
        console.log('SCAN-DEBUG: Email scan response data:', data);
        console.log('SCAN-DEBUG: scanId in response:', data.scanId);
        return data;
      } catch (error) {
        console.error('Email scan error:', error);
        
        // If it's an axios error with 401/403 status, let the interceptor handle it
        if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          console.log('Authentication error detected in scanEmails, letting interceptor handle logout');
          throw error;
        }
        
        throw error;
      }
    },

    // Analyze emails with Gemini
    analyzeEmails: async (scanId: string) => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/api/analyze-emails`, {
          scan_id: scanId
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        return response.data;
      } catch (error) {
        console.error('Email analysis error:', error);
        
        // If it's an axios error with 401/403 status, let the interceptor handle it
        if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          console.log('Authentication error detected in analyzeEmails, letting interceptor handle logout');
          throw error;
        }
        
        throw error;
      }
    },

    // Get analyzed subscriptions
    getAnalyzedSubscriptions: async (scanId?: string) => {
      try {
        const token = localStorage.getItem('token');
        const url = scanId 
          ? `${API_URL}/api/analyzed-subscriptions?scan_id=${scanId}`
          : `${API_URL}/api/analyzed-subscriptions`;
        
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        return response.data;
      } catch (error) {
        console.error('Get analyzed subscriptions error:', error);
        
        // If it's an axios error with 401/403 status, let the interceptor handle it
        if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          console.log('Authentication error detected in getAnalyzedSubscriptions, letting interceptor handle logout');
          throw error;
        }
        
        throw error;
      }
    },

    // Get scan status
    getScanStatus: async (scanId: string) => {
      try {
        const token = localStorage.getItem('token');
        // Use production endpoint only
        const response = await axios.get(`${API_URL}/api/email/status`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = response.data;
        
        // If we get an error that the scan doesn't exist, clean up localStorage
        if (data.error === 'scan_not_found' || (data.error && data.message?.includes('not found'))) {
          localStorage.removeItem('current_scan_id');
        }
        
        return data;
      } catch (error) {
        console.error('Error getting scan status:', error);
        
        // Handle 404 errors specifically
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.error('Scan ID not found, it may have expired');
          localStorage.removeItem('current_scan_id'); // Clear invalid scan ID
          return { 
            error: 'scan_not_found', 
            status: 'error', 
            message: 'Scan not found. It may have expired or been deleted.',
            progress: 0 
          };
        }
        
        // If it's an axios error with 401/403 status, let the interceptor handle it
        if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          console.log('Authentication error detected in getScanStatus, letting interceptor handle logout');
          throw error;
        }
        
        return { error: 'Failed to retrieve scanning status', status: 'error', progress: 0 };
      }
    },

    // Alias for getScanStatus to maintain backward compatibility
    getScanningStatus: async (scanId: string = 'latest') => {
      return await apiService.email.getScanStatus(scanId);
    },

    // Get subscription suggestions using axios
    getSubscriptionSuggestions: async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/email/suggestions`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = response.data;
        
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
        
        // If it's an axios error with 401/403 status, let the interceptor handle it
        if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          console.log('Authentication error detected in getSubscriptionSuggestions, letting interceptor handle logout');
          throw error;
        }
        
        return { error: 'Failed to retrieve suggestions', suggestions: [] };
      }
    },

    // Confirm or reject a subscription suggestion using axios
    confirmSubscriptionSuggestion: async (suggestionId: string, confirmed: boolean) => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/api/email/suggestions/${suggestionId}/confirm`, {
          confirmed
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        return response.data;
      } catch (error) {
        console.error('Error confirming suggestion:', error);
        
        // If it's an axios error with 401/403 status, let the interceptor handle it
        if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          console.log('Authentication error detected in confirmSubscriptionSuggestion, letting interceptor handle logout');
          throw error;
        }
        
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
        const response = await fetch(`${API_URL}/api/subscriptions/`, {
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
        const response = await fetch(`${API_URL}/api/subscriptions/${id}`, {
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
        const response = await fetch(`${API_URL}/api/subscriptions`, {
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
        const response = await fetch(`${API_URL}/api/subscriptions/${id}`, {
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
        const response = await fetch(`${API_URL}/api/subscriptions/${id}`, {
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