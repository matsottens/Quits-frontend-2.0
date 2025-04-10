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
    
    // Get the current environment
    const isProd = window.location.hostname === 'www.quits.cc' || window.location.hostname === 'quits.cc';
    
    // ALWAYS use https://quits.cc/auth/callback as the redirect URI
    // This must match exactly what's registered in Google Console
    const redirectUri = 'https://quits.cc/auth/callback';
    
    console.log('Using redirect URI for token exchange:', redirectUri);
    
    try {
      console.log('Attempting no-cors fetch as last resort');
      
      // First make a cookie-setting request
      const noCorsResponse = await fetch(`${API_BASE_URL}/api/auth/google/callback/direct2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        mode: 'no-cors', // This will make the request succeed but you won't be able to read the response
        credentials: 'include',
        body: new URLSearchParams({
          code,
          origin: window.location.origin,
          redirectUri,
          requestId: 'req_' + Math.random().toString(36).substring(2)
        })
      });
      
      console.log('No-cors request completed');
      
      // As a fallback, we'll try a server-side approach
      // Create a URL with the code as a query parameter
      console.log('Trying server-side redirect as final fallback');
      // Redirect to the server directly and let it handle the token exchange
      // The user will be redirected back to our frontend afterward
      const serverRedirectUrl = `${API_BASE_URL}/api/auth/google/callback?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
      
      // Save current progress in sessionStorage
      sessionStorage.setItem('auth_in_progress', 'true');
      sessionStorage.setItem('auth_redirect_time', Date.now().toString());
      
      // Redirect to the server
      window.location.href = serverRedirectUrl;
      
      // Return a placeholder response - the actual auth will happen after the redirect
      return {
        token: 'pending-token',
        success: true
      };
    } catch (error) {
      console.error('All authentication approaches failed:', error);
      throw new Error('Authentication failed after trying all possible methods');
    }
  } catch (error) {
    console.error('Error in handleGoogleCallback:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error: string; details?: string }>;
      console.error('Google callback error details:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message,
        code: axiosError.code
      });
      throw new Error(axiosError.response?.data?.error || 'Authentication failed');
    }
    throw error;
  }
};

// Add other API functions here...

export default api; 