import axios from 'axios';

const apiBase = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://api.quits.cc/api';

// Create axios instance with interceptors for authentication
const settingsApi = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add token to every request
settingsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[settingsService] Adding Authorization header');
    } else {
      console.log('[settingsService] No token found in localStorage');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle authentication errors
settingsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        console.error('[settingsService] Authentication failed - clearing token');
        localStorage.removeItem('token');
        // Optionally redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?error=session_expired';
        }
      }
    }
    return Promise.reject(error);
  }
);

const settingsService = {
  async getSettings() {
    try {
      const res = await settingsApi.get('/settings');
      return res.data;
    } catch (err) {
      console.error('[settingsService] GET failed', err);
      return null;
    }
  },

  async updateSettings(patch: Record<string, any>) {
    try {
      console.log('[settingsService] Sending update request with patch:', patch);
      const res = await settingsApi.put('/settings', patch);
      console.log('[settingsService] Received response:', res.data);
      return res.data;
    } catch (err) {
      console.error('[settingsService] UPDATE failed', err);
      throw err;
    }
  },
};

export default settingsService; 