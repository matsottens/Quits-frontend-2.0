import axios, { AxiosError } from 'axios';

interface AuthResponse {
  token: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
  error?: string;
  success?: boolean;
  redirecting?: boolean;
  pending?: boolean;
  message?: string;
}

// Always use api.quits.cc for auth operations, regardless of environment
const API_BASE_URL = 'https://api.quits.cc';

// Create axios instance with proper CORS handling
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest' // Helps with CORS in some servers
  },
});

// Simplified Google OAuth callback implementation that works with our serverless API
export const handleGoogleCallback = async (code: string): Promise<AuthResponse> => {
  try {
    console.log(`Attempting Google auth callback with code: ${code.substring(0, 10)}...`);
    
    // Add timestamp to prevent caching and ensure unique requests
    const timestamp = Date.now();
    // Use proxy endpoint to avoid CORS issues
    const proxyUrl = `${API_BASE_URL}/api/google-proxy?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}&_t=${timestamp}`;
    
    console.log('Calling backend proxy endpoint:', proxyUrl);
    
    // First try: Simple fetch with minimal headers to avoid CORS issues
    try {
      console.log('Attempt 1: Simple fetch with minimal headers');
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      // Check if response is ok
      if (response.ok) {
        const data = await response.json();
        console.log('Success with proxy backend call:', data);
        
        if (data?.token) {
          // Success! Return the token and user
          return {
            token: data.token,
            user: data.user,
            success: true
          };
        } else {
          console.warn('Response ok but no token in the response:', data);
        }
      } else {
        // Log error response for debugging
        const errorText = await response.text();
        console.error(`Error response (${response.status}):`, errorText);
        
        // Try to parse the error response
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Parsed error details:', errorJson);
        } catch (e) {
          // Not JSON, just log the text
        }
      }
    } catch (fetchError) {
      console.warn('First fetch attempt failed:', fetchError);
      // Continue to fallback methods
    }
    
    // Second try: Use axios as fallback with different headers
    console.log('Attempt 2: Using axios as fallback');
    try {
      const axiosResponse = await api.get(proxyUrl, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (axiosResponse.data?.token) {
        console.log('Success with axios backend call');
        return {
          token: axiosResponse.data.token,
          user: axiosResponse.data.user,
          success: true
        };
      }
    } catch (axiosError) {
      console.warn('Axios attempt failed:', axiosError);
    }
    
    // Third try: Attempt with no-cors mode as last resort
    console.log('Attempt 3: Fetch with no-cors mode');
    try {
      const noCorsResponse = await fetch(proxyUrl, {
        method: 'GET',
        mode: 'no-cors',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      // no-cors mode always returns an opaque response which can't be read
      console.log('no-cors request sent, but response is opaque');
    } catch (noCorsError) {
      console.warn('no-cors attempt failed:', noCorsError);
    }
    
    // If all APIs fail, redirect the user to the backend directly
    console.log('All API attempts failed, redirecting to backend directly');
    
    // Create a full redirect URL that includes the original code
    const directBackendUrl = `${API_BASE_URL}/api/auth/google/callback?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}&_t=${timestamp}`;
    
    // Redirect the browser
    window.location.href = directBackendUrl;
    
    // Return a pending response since we're redirecting
    return {
      token: '',
      success: false,
      pending: true,
      message: 'Redirecting to backend authentication service'
    };
  } catch (error) {
    console.error('OAuth callback error:', error);
    return {
      token: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during authentication'
    };
  }
};

// Add other API functions here...

export default api; 