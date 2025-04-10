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
    
    // Test the API connection first
    try {
      const testResponse = await fetch(`${API_BASE_URL}/api/test`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (testResponse.ok) {
        console.log('API test endpoint is working');
      } else {
        console.warn('API test endpoint returned:', testResponse.status);
      }
    } catch (testError) {
      console.warn('Error testing API connection:', testError);
    }
    
    // Use the emergency proxy endpoint
    const proxyUrl = `${API_BASE_URL}/api/google-proxy?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
    
    console.log('Using proxy URL for token exchange:', proxyUrl);
    
    // Try direct fetch first, with simplified options
    try {
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
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
      } else {
        console.warn(`Fetch response not OK: ${response.status} ${response.statusText}`);
      }
    } catch (fetchError) {
      console.warn('Standard fetch approach failed:', fetchError);
      
      // Try again with no-cors as a last resort
      try {
        console.log('Attempting fetch with no-cors mode');
        await fetch(proxyUrl, {
          method: 'GET',
          mode: 'no-cors'
        });
        
        // If we get here, the request didn't throw but we can't access the response
        // Redirect directly to the callback endpoint
        console.log('Using direct redirection to callback endpoint');
      } catch (noCorsError) {
        console.warn('No-cors fetch also failed:', noCorsError);
      }
    }
    
    // As a fallback, redirect directly to the backend
    console.log('Redirecting directly to backend');
    const directUrl = `${API_BASE_URL}/api/auth/google/callback?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
    window.location.href = directUrl;
    
    // Return placeholder to avoid errors
    return {
      token: 'pending-redirect',
      success: true
    };
  } catch (error) {
    console.error('Error in handleGoogleCallback:', error);
    throw error;
  }
};

// Add other API functions here...

export default api; 