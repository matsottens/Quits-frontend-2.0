import axios from 'axios';

// Types
export interface AuthTokens {
  token: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

const API_URL = process.env.REACT_APP_API_URL || 'https://api.quits.cc';

// Service for handling authentication
const authService = {
  // Get the Google Auth URL for initiating login
  getGoogleAuthUrl: async (): Promise<string> => {
    try {
      const response = await axios.get(`${API_URL}/api/google-auth-url`, {
        params: {
          redirect_uri: window.location.origin + '/auth/callback',
          state: Date.now().toString(), // Add state parameter to prevent CSRF
        }
      });
      
      if (response.data && response.data.url) {
        return response.data.url;
      }
      throw new Error('Failed to get Google authentication URL');
    } catch (error: any) {
      console.error('Error getting Google Auth URL:', error);
      // Try fallback direct URL if API fails
      const clientId = '82730443897-ji64k4jhk02lonkps5vu54e1q5opoq3g.apps.googleusercontent.com';
      const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
      const scope = encodeURIComponent('email profile https://www.googleapis.com/auth/gmail.readonly openid');
      const state = Date.now().toString();
      
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account+consent&state=${state}`;
    }
  },

  // Get current user from token
  getCurrentUser: (): User | null => {
    const token = authService.getToken();
    if (!token) return null;
    
    try {
      // Decode the JWT token to get user info
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing user from token:', error);
      authService.logout();
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = authService.getToken();
    if (!token) return false;
    
    try {
      // Decode token to check expiration
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const { exp } = JSON.parse(jsonPayload);
      const expired = Date.now() >= exp * 1000;
      
      if (expired) {
        authService.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      authService.logout();
      return false;
    }
  },

  // Get token from storage
  getToken: (): string | null => {
    return localStorage.getItem('token') || localStorage.getItem('quits_auth_token') || null;
  },

  // Set auth token in storage
  setToken: (token: string): void => {
    localStorage.setItem('token', token);
    localStorage.setItem('quits_auth_token', token);
  },

  // Clear auth data on logout
  logout: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('quits_auth_token');
    // Redirect to login page
    window.location.href = '/login';
  },
  
  // Setup axios interceptor for auth headers
  setupAxiosInterceptors: (): void => {
    axios.interceptors.request.use(
      (config) => {
        const token = authService.getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // Auto logout if 401 response returned from API
          authService.logout();
        }
        return Promise.reject(error);
      }
    );
  }
};

export default authService; 