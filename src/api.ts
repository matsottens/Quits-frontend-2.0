import axios, { AxiosError } from 'axios';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
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
    'X-Requested-With': 'XMLHttpRequest', // Helps with CORS in some servers
  },
});

export const handleGoogleCallback = async (code: string): Promise<AuthResponse> => {
  try {
    console.log(`Attempting Google auth callback with code: ${code.substring(0, 10)}...`);
    
    // First try the direct API call
    try {
      // The URL should use /auth/google/callback not /auth/callback
      const response = await api.get<AuthResponse>('/auth/google/callback', {
        params: { code },
      });
      
      console.log('Auth response received:', response.status);
      
      if (!response.data) {
        throw new Error('No data received from authentication server');
      }
      
      return response.data;
    } catch (apiError) {
      // Log the initial error
      console.error('Initial API call failed:', apiError);
      
      // Try with fetch API as a fallback (better CORS handling)
      console.log('Trying fetch API as fallback');
      const fetchResponse = await fetch(`${API_BASE_URL}/auth/google/callback?code=${code}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        return data;
      }
      
      // If fetch also fails, try no-cors mode
      console.log('Trying no-cors mode as last resort');
      await fetch(`${API_BASE_URL}/auth/google/callback?code=${code}`, {
        method: 'GET',
        credentials: 'include',
        mode: 'no-cors'
      });
      
      // We can't read the response in no-cors mode, so we'll try to check auth status separately
      try {
        const meResponse = await api.get('/auth/me');
        if (meResponse.data) {
          return { 
            token: meResponse.data.token || 'placeholder-token',
            user: meResponse.data.user || { id: 'unknown', email: 'unknown' }
          };
        }
      } catch (meError) {
        console.error('Failed to verify auth via /me endpoint:', meError);
      }
      
      // Re-throw the original error if all fallbacks fail
      throw apiError;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error: string; details?: string }>;
      console.error('Google callback error:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message,
        code: axiosError.code,
        headers: axiosError.response?.headers
      });
      throw new Error(axiosError.response?.data?.error || 'Authentication failed');
    }
    throw error;
  }
};

// Add other API functions here...

export default api; 