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

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const handleGoogleCallback = async (code: string): Promise<AuthResponse> => {
  try {
    // The URL should use /auth/google/callback not /auth/callback
    const response = await api.get<AuthResponse>('/auth/google/callback', {
      params: { code },
    });
    
    if (!response.data) {
      throw new Error('No data received from authentication server');
    }
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error: string; details?: string }>;
      console.error('Google callback error:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message,
      });
      throw new Error(axiosError.response?.data?.error || 'Authentication failed');
    }
    throw error;
  }
};

// Add other API functions here...

export default api; 