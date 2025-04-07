import axios from 'axios';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// API service with methods for different API calls
const api = {
  // Auth endpoints
  auth: {
    // Get Google OAuth URL
    getGoogleAuthUrl: async () => {
      const response = await axios.get(`${API_URL}/auth/google/url`);
      return response.data;
    },
    
    // Get current user info
    getMe: async () => {
      const response = await axios.get(`${API_URL}/auth/me`);
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