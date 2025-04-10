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

export const handleGoogleCallback = async (code: string): Promise<AuthResponse> => {
  try {
    console.log(`Attempting Google auth callback with code: ${code.substring(0, 10)}...`);
    
    // Use the emergency proxy endpoint
    const proxyUrl = `${API_BASE_URL}/api/google-proxy?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
    
    console.log('Using proxy URL for token exchange:', proxyUrl);
    
    // Use fetch with no credentials to avoid CORS preflight
    try {
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
        // No credentials to avoid CORS preflight issues
      });
      
      if (!response.ok) {
        console.warn(`Fetch response not OK: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to exchange code: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Proxy response data:', data);
      
      if (data.token) {
        // Success! Return the token and user
        return {
          token: data.token,
          user: data.user,
          success: true
        };
      }
    } catch (fetchError) {
      console.warn('Fetch failed, trying direct browser navigation:', fetchError);
      
      // As a last resort, redirect directly to the backend endpoint
      const directUrl = `${API_BASE_URL}/api/auth/google/callback?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
      console.log('Redirecting directly to backend:', directUrl);
      window.location.href = directUrl;
      
      // Return placeholder to avoid errors
      return {
        token: 'pending-redirect',
        success: true
      };
    }
    
    // If we got here, we didn't get a token
    throw new Error('No token received from authentication server');
  } catch (error) {
    console.error('Error in handleGoogleCallback:', error);
    throw error;
  }
};

// Add other API functions here...

export default api; 