import axios from 'axios';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Google OAuth configuration
const GOOGLE_OAUTH_CONFIG = {
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback`,
  scope: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.readonly'
  ].join(' '),
  response_type: 'code',
  access_type: 'offline',
  prompt: 'consent'
};

// API service with methods for different API calls
const api = {
  // Auth endpoints
  auth: {
    // Get Google OAuth URL
    getGoogleAuthUrl: async () => {
      try {
        const params = new URLSearchParams({
          client_id: GOOGLE_OAUTH_CONFIG.client_id,
          redirect_uri: GOOGLE_OAUTH_CONFIG.redirect_uri,
          scope: GOOGLE_OAUTH_CONFIG.scope,
          response_type: GOOGLE_OAUTH_CONFIG.response_type,
          access_type: GOOGLE_OAUTH_CONFIG.access_type,
          prompt: GOOGLE_OAUTH_CONFIG.prompt
        });

        const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        return { url };
      } catch (error) {
        console.error('Error generating Google OAuth URL:', error);
        throw error;
      }
    },
    
    // Handle Google OAuth callback
    handleGoogleCallback: async (code: string) => {
      const response = await axios.post(`${API_URL}/auth/google/callback`, { code });
      return response.data;
    },
    
    // Get current user info
    getMe: async () => {
      const response = await axios.get(`${API_URL}/auth/me`);
      return response.data;
    },
    
    // Logout the user
    logout: async () => {
      const response = await axios.post(`${API_URL}/auth/logout`);
      return response.data;
    },
  },
  
  // Email scanning endpoints
  email: {
    // Start email scanning process
    scanEmails: async () => {
      const response = await axios.post(`${API_URL}/email/scan`);
      return response.data;
    },

    // Get scanning status
    getScanningStatus: async () => {
      const response = await axios.get(`${API_URL}/email/scan/status`);
      return response.data;
    },

    // Get subscription suggestions from scanned emails
    getSubscriptionSuggestions: async () => {
      const response = await axios.get(`${API_URL}/email/subscriptions/suggestions`);
      return response.data;
    },

    // Confirm subscription suggestion
    confirmSubscriptionSuggestion: async (suggestionId: string, confirmed: boolean) => {
      const response = await axios.post(`${API_URL}/email/subscriptions/suggestions/${suggestionId}/confirm`, {
        confirmed
      });
      return response.data;
    }
  },
  
  // Subscription endpoints
  subscriptions: {
    // Get all subscriptions
    getAll: async () => {
      const response = await axios.get(`${API_URL}/subscription`);
      return response.data;
    },
    
    // Get a single subscription
    getById: async (id: string) => {
      const response = await axios.get(`${API_URL}/subscription/${id}`);
      return response.data;
    },
    
    // Create a new subscription
    create: async (data: any) => {
      const response = await axios.post(`${API_URL}/subscription`, data);
      return response.data;
    },
    
    // Update a subscription
    update: async (id: string, data: any) => {
      const response = await axios.put(`${API_URL}/subscription/${id}`, data);
      return response.data;
    },
    
    // Delete a subscription
    delete: async (id: string) => {
      const response = await axios.delete(`${API_URL}/subscription/${id}`);
      return response.data;
    },
  },
};

export default api; 