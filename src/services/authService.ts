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

const API_URL = import.meta.env.VITE_API_URL || 'https://api.quits.cc';

// Service for handling authentication
const authService = {
  // Get the Google Auth URL for initiating login
  getGoogleAuthUrl: async (): Promise<string> => {
    try {
      console.log(`Requesting Google auth URL from ${API_URL}/api/google-auth-url`);
      const response = await axios.get(`${API_URL}/api/google-auth-url`, {
        params: {
          redirect_uri: window.location.origin + '/auth/callback',
          state: Date.now().toString(), // Add state parameter to prevent CSRF
        }
      });
      
      console.log('Google auth URL response:', response.status);
      
      if (response.data && response.data.url) {
        console.log(`Received auth URL (length: ${response.data.url.length})`);
        return response.data.url;
      }
      
      console.error('Missing URL in response:', response.data);
      throw new Error('Failed to get Google authentication URL');
    } catch (error: any) {
      console.error('Error getting Google Auth URL:', error);
      
      // Try fallback direct URL if API fails
      console.log('Using fallback direct Google auth URL');
      const clientId = '82730443897-ji64k4jhk02lonkps5vu54e1q5opoq3g.apps.googleusercontent.com';
      const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
      const scope = encodeURIComponent('email profile https://www.googleapis.com/auth/gmail.readonly openid');
      const state = Date.now().toString();
      
      const directUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account+consent&state=${state}`;
      console.log(`Generated direct URL (length: ${directUrl.length})`);
      return directUrl;
    }
  },

  // Get current user from token
  getCurrentUser: (): User | null => {
    const token = authService.getToken();
    if (!token) {
      console.log('No token found, user not authenticated');
      return null;
    }
    
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
      const user = JSON.parse(jsonPayload);
      console.log(`User info retrieved from token: ${user.email}`);
      return user;
    } catch (error) {
      console.error('Error parsing user from token:', error);
      authService.logout();
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = authService.getToken();
    if (!token) {
      console.log('No token found, user not authenticated');
      return false;
    }
    
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
        console.log('Token expired, logging out user');
        authService.logout();
        return false;
      }
      
      console.log('Valid token found, user is authenticated');
      return true;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      authService.logout();
      return false;
    }
  },

  // Get token from storage
  getToken: (): string | null => {
    const token = localStorage.getItem('token') || localStorage.getItem('quits_auth_token') || null;
    if (token) {
      console.log(`Token found (length: ${token.length})`);
    } else {
      console.log('No token found in storage');
    }
    return token;
  },

  // Set auth token in storage
  setToken: (token: string): void => {
    console.log(`Storing token (length: ${token.length})`);
    localStorage.setItem('token', token);
    localStorage.setItem('quits_auth_token', token);
  },

  // Clear auth data on logout
  logout: (): void => {
    console.log('Logging out user, clearing authentication data');
    localStorage.removeItem('token');
    localStorage.removeItem('quits_auth_token');
    // Redirect to login page
    window.location.href = '/login';
  },
  
  // Setup axios interceptor for auth headers
  setupAxiosInterceptors: (): void => {
    console.log('Setting up axios interceptors for auth headers');
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
          console.log('Received 401 unauthorized response, logging out');
          // Auto logout if 401 response returned from API
          authService.logout();
        }
        return Promise.reject(error);
      }
    );
    console.log('Axios interceptors setup complete');
  },

  // ----------------------
  // Email / Password Flow
  // ----------------------

  signup: async (email: string, password: string, name?: string): Promise<AuthResponse> => {
    const payload = { email, password, name };
    const response = await axios.post(`${API_URL}/api/auth/signup`, payload, { withCredentials: true });
    if (response.data?.token) {
      authService.setToken(response.data.token);
    }
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/api/auth/login`, { email, password }, { withCredentials: true });
    if (response.data?.token) {
      authService.setToken(response.data.token);
    }
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ success: boolean }> => {
    const response = await axios.post(`${API_URL}/api/auth/forgot-password`, { email }, { withCredentials: true });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/api/auth/reset-password`, { token, password }, { withCredentials: true });
    if (response.data?.token) {
      authService.setToken(response.data.token);
    }
    return response.data;
  }
};

export default authService; 