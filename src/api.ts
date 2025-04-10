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
    
    // In production, use the full API URL to avoid CORS issues
    // In development, use the proxy
    const apiUrl = isProd 
      ? `${API_BASE_URL}/api/auth/google/callback/direct2`
      : `/auth/google/callback/direct2`;
    
    console.log(`Making request to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      credentials: 'include', // Important to include cookies
      body: new URLSearchParams({
        code,
        origin: window.location.origin,
        redirectUri, // Add the exact redirect URI used in Google OAuth
        requestId: 'req_' + Math.random().toString(36).substring(2)
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Authentication failed');
    }
    
    // Parse the response
    const authData = await response.json();
    console.log('Received successful auth response');
    
    return authData;
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