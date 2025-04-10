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
    
    // Try multiple possible endpoint formats to improve chances of success
    const endpoints = [
      `${API_BASE_URL}/api/google-proxy`,
      `${API_BASE_URL}/google-proxy`
    ];
    
    // Log all attempts
    console.log('Will try these endpoints in sequence:', endpoints);
    
    // Use the proxy endpoint (handled by our serverless function)
    let success = false;
    let data = null;
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        const proxyUrl = `${endpoint}?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
        console.log('Trying endpoint:', proxyUrl);
        
        // Simple fetch with minimal options to avoid CORS issues
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          data = await response.json();
          console.log('Success with endpoint:', endpoint);
          console.log('Response data:', data);
          success = true;
          break;
        } else {
          console.warn(`Endpoint ${endpoint} failed with status: ${response.status}`);
          try {
            const errorText = await response.text();
            console.warn('Error response:', errorText);
          } catch (e) {
            console.warn('Could not parse error response');
          }
        }
      } catch (error) {
        console.warn(`Error with endpoint ${endpoint}:`, error);
      }
    }
    
    if (success && data?.token) {
      // Success! Return the token and user
      return {
        token: data.token,
        user: data.user,
        success: true
      };
    }
    
    // As fallback, redirect directly to the callback endpoint
    console.log('All endpoints failed, redirecting directly to backend callback');
    const directUrl = `${API_BASE_URL}/api/auth/google/callback?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
    window.location.href = directUrl;
    
    // Return placeholder for the redirect case
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