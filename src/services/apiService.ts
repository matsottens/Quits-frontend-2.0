import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for handling cookies/sessions
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth endpoints
export const auth = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string) => 
    api.post('/auth/register', { email, password }),
  logout: () => 
    api.post('/auth/logout'),
  getProfile: () => 
    api.get('/auth/profile'),
};

// Subscription endpoints
export const subscription = {
  getAll: () => 
    api.get('/subscription'),
  getById: (id: string) => 
    api.get(`/subscription/${id}`),
  create: (data: any) => 
    api.post('/subscription', data),
  update: (id: string, data: any) => 
    api.put(`/subscription/${id}`, data),
  delete: (id: string) => 
    api.delete(`/subscription/${id}`),
};

// Email endpoints
export const email = {
  send: (data: any) => 
    api.post('/email', data),
};

// Health check
export const health = {
  check: () => 
    api.get('/health'),
};

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      // You might want to redirect to login page or refresh token
      console.error('Unauthorized access');
    }
    return Promise.reject(error);
  }
);

export default api; 