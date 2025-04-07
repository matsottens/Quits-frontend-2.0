import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Google OAuth configuration
const GOOGLE_OAUTH_CONFIG = {
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_AUTH_REDIRECT_URI,
  scope: 'email profile https://www.googleapis.com/auth/gmail.readonly',
  response_type: 'code',
  access_type: 'offline',
  prompt: 'consent',
};

// API service with methods for different API calls
const api = {
  // Auth endpoints
  auth: {
    // Get Google OAuth URL
    getGoogleAuthUrl: async () => {
      const params = new URLSearchParams(GOOGLE_OAUTH_CONFIG);
      return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
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
    
    // Supabase auth methods
    signInWithEmail: async (email: string, password: string) => {
      return await supabase.auth.signInWithPassword({
        email,
        password,
      });
    },
    
    signUpWithEmail: async (email: string, password: string) => {
      return await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    },
    
    resetPassword: async (email: string) => {
      return await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    },
    
    updatePassword: async (newPassword: string) => {
      return await supabase.auth.updateUser({
        password: newPassword,
      });
    },
    
    signOut: async () => {
      return await supabase.auth.signOut();
    },

    onAuthStateChange: supabase.auth.onAuthStateChange,
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