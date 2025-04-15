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
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Success with proxy backend call');
        
        if (data?.token) {
          // Success! Return the token and user
          return {
            token: data.token,
            user: data.user,
            success: true
          };
        }
      }
    } catch (fetchError) {
      console.warn('First fetch attempt failed:', fetchError);
      // Continue to fallback methods
    }
    
    // Second try: Use axios instead of fetch
    try {
      console.log('Trying axios as fallback');
      const axiosResponse = await api.get(proxyUrl);
      
      if (axiosResponse.data?.token) {
        return {
          token: axiosResponse.data.token,
          user: axiosResponse.data.user,
          success: true
        };
      }
    } catch (axiosError) {
      console.warn('Axios fallback failed:', axiosError);
      // Continue to JSONP fallback
    }
    
    // Last resort: Try JSONP approach by redirecting
    console.log('All API attempts failed, redirecting to backend directly');
    window.location.href = proxyUrl;
    
    // Return a pending promise since we're redirecting
    return new Promise<AuthResponse>((resolve) => {
      setTimeout(() => {
        resolve({ token: '', error: 'Redirecting to backend' });
      }, 5000);
    });
    
  } catch (error) {
    console.error('Error in handleGoogleCallback:', error);
    throw error;
  }
};

// Add other API functions here...

export default api; 