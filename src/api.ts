import axios, { AxiosError } from 'axios';

interface AuthResponse {
  token: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
  error?: string;
  success?: boolean;
}

// Always use api.quits.cc for auth operations, regardless of environment
const API_BASE_URL = 'https://api.quits.cc';

// Create axios instance with proper CORS handling
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest' // Helps with CORS in some servers
  },
});

// Simplified Google OAuth callback implementation that works with our serverless API
export const handleGoogleCallback = async (code: string): Promise<AuthResponse> => {
  try {
    console.log(`Attempting Google auth callback with code: ${code.substring(0, 10)}...`);
    
    // Add timestamp to prevent caching and ensure unique requests
    const timestamp = Date.now();
    // Use direct backend API URL for most consistent behavior
    const endpoint = `${API_BASE_URL}/api/auth/google/callback`;
    const proxyUrl = `${endpoint}?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}&_t=${timestamp}`;
    
    console.log('Calling backend endpoint directly:', proxyUrl);
    
    // Simple fetch with headers to prevent caching
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success with direct backend call');
      
      if (data?.token) {
        // Success! Return the token and user
        return {
          token: data.token,
          user: data.user,
          success: true
        };
      } else {
        throw new Error('No token received from backend');
      }
    } else {
      const errorText = await response.text().catch(() => 'Could not parse error response');
      console.error(`Backend auth failed with status: ${response.status}`, errorText);
      throw new Error(`Authentication failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error in handleGoogleCallback:', error);
    throw error;
  }
};

// Add other API functions here...

export default api; 