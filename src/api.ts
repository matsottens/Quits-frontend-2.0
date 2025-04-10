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
  withCredentials: true,
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
    
    // Use fetch for simplicity
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      // If the response is not OK, throw an error
      throw new Error(`Failed to exchange code: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Proxy response:', data);
    
    if (data.token) {
      // Success! Return the token and user
      return {
        token: data.token,
        user: data.user,
        success: true
      };
    } else {
      // No token in the response
      throw new Error('No token received from authentication server');
    }
  } catch (error) {
    console.error('Error in handleGoogleCallback:', error);
    throw error;
  }
};

// Add other API functions here...

export default api; 