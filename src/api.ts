import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true,
});

export const handleGoogleCallback = async (code: string) => {
  try {
    const response = await api.get(`/auth/google/callback`, {
      params: { code },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Google callback error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Authentication failed');
    }
    throw error;
  }
};

// Add other API functions here...

export default api; 