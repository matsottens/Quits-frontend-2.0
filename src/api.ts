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
    
    // ALWAYS use https://quits.cc/auth/callback as the redirect URI
    // This must match exactly what's registered in Google Console
    const redirectUri = 'https://quits.cc/auth/callback';
    
    console.log('Using redirect URI for token exchange:', redirectUri);
    
    // Just go straight to the server side approach
    // Create a URL with the code as a query parameter
    console.log('Using direct server redirect approach');
    
    // The simplest solution: redirect to the backend server directly
    // The server will process the code and redirect back to the frontend
    const serverRedirectUrl = `${API_BASE_URL}/api/auth/google/callback?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
    
    console.log('Redirecting to server:', serverRedirectUrl);
    
    // Redirect the browser directly to the server
    window.location.href = serverRedirectUrl;
    
    // Return a placeholder response
    // This code won't actually execute due to the redirect
    return {
      token: 'pending-redirect',
      success: true
    };
  } catch (error) {
    console.error('Error in handleGoogleCallback:', error);
    throw new Error('Authentication redirect failed');
  }
};

// Add other API functions here...

export default api; 