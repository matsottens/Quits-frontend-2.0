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

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const handleGoogleCallback = async (code: string): Promise<AuthResponse> => {
  try {
    const response = await api.get<AuthResponse>('/auth/google/callback', {
      params: { code },
    });
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