import axios from 'axios';

const apiBase = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://api.quits.cc';

// Create axios instance with interceptors for authentication
const settingsApi = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add token to every request
settingsApi.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[settingsService] Adding Authorization header');
    } else {
      console.log('[settingsService] No token found in localStorage');
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle authentication errors
settingsApi.interceptors.response.use(
  (response: any) => {
    return response;
  },
  (error: any) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        console.error('[settingsService] Authentication failed - letting main interceptor handle it');
        // Don't automatically logout - let the main interceptor handle it
      }
    }
    return Promise.reject(error);
  }
);

const settingsService = {
  async getSettings() {
    try {
      const res = await settingsApi.get('/api/settings');
      return res.data;
    } catch (err) {
      console.error('[settingsService] GET failed', err);
      return null;
    }
  },

  async updateSettings(patch: Record<string, any>) {
    try {
      console.log('[settingsService] Sending update request with patch:', patch);
      const res = await settingsApi.put('/api/settings', patch);
      console.log('[settingsService] Received response:', res.data);
      return res.data;
    } catch (err) {
      console.error('[settingsService] UPDATE failed', err);
      throw err;
    }
  },
};

export default settingsService; 