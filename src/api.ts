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
          'Accept': 'application/json'
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
    
    // Second try: Use axios instead of fetch
    try {
      console.log('Attempt 2: Using axios as fallback');
      const axiosResponse = await api.get(proxyUrl);
      
      if (axiosResponse.data?.token) {
        console.log('Axios approach succeeded:', axiosResponse.data);
        return {
          token: axiosResponse.data.token,
          user: axiosResponse.data.user,
          success: true
        };
      } else {
        console.warn('Axios response has no token:', axiosResponse.data);
      }
    } catch (axiosError) {
      console.warn('Axios fallback failed:', axiosError);
      
      // Log the detailed error response if available
      if (axios.isAxiosError(axiosError) && axiosError.response) {
        console.error('Axios error details:', {
          status: axiosError.response.status,
          data: axiosError.response.data
        });
      }
      // Continue to JSONP fallback
    }
    
    // Third try: Try with mode: 'no-cors'
    try {
      console.log('Attempt 3: Fetch with no-cors mode');
      await fetch(proxyUrl, {
        method: 'GET',
        mode: 'no-cors'
      });
      
      // If we get here, the request didn't throw, but we likely can't read the response
      console.log('no-cors request sent, but response is opaque');
    } catch (noCorsError) {
      console.warn('no-cors attempt failed:', noCorsError);
    }
    
    // Last resort: Try JSONP approach by redirecting
    console.log('All API attempts failed, redirecting to backend directly');
    
    // Add a flag in sessionStorage to track the redirect
    sessionStorage.setItem('auth_redirect_attempted', 'true');
    sessionStorage.setItem('auth_code', code.substring(0, 10) + '...');
    
    // Direct the user to the proxy URL
    window.location.href = proxyUrl;
    
    // Return a pending promise since we're redirecting
    return new Promise<AuthResponse>((resolve) => {
      setTimeout(() => {
        resolve({ token: '', error: 'Redirecting to backend', redirecting: true });
      }, 5000);
    });
    
  } catch (error) {
    console.error('Error in handleGoogleCallback:', error);
    throw error;
  }
};

// Add other API functions here...

export default api; 