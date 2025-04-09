import axios, { AxiosError } from 'axios';

interface AuthResponse {
  token: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

// Always use api.quits.cc for auth operations, regardless of environment
const API_BASE_URL = 'https://api.quits.cc';

// Create axios instance with proper CORS handling
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Helps with CORS in some servers
    'Origin': window.location.origin // Include origin explicitly
  },
});

export const handleGoogleCallback = async (code: string): Promise<AuthResponse> => {
  try {
    console.log(`Attempting Google auth callback with code: ${code.substring(0, 10)}...`);
    
    // First try the direct API call
    try {
      // Use the correct endpoint path
      const response = await api.get<AuthResponse>('/auth/google/callback', {
        params: { code },
        headers: {
          // Add special headers to help with CORS
          'Origin': window.location.origin,
          'Referer': window.location.href
        }
      });
      
      console.log('Auth response received:', response.status);
      
      if (!response.data) {
        throw new Error('No data received from authentication server');
      }
      
      return response.data;
    } catch (apiError) {
      // Log the initial error
      console.error('Initial API call failed:', apiError);
      
      // Try with fetch API as a fallback (better CORS handling)
      console.log('Trying fetch API as fallback');
      const fetchResponse = await fetch(`${API_BASE_URL}/auth/google/callback?code=${code}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': window.location.origin
        }
      });
      
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        return data;
      }
      
      // If fetch also fails, try JSONP approach (most reliable for CORS issues)
      console.log('Trying JSONP approach for maximum compatibility');
      return new Promise<AuthResponse>((resolve, reject) => {
        const callbackName = 'googleCallback_' + Math.random().toString(36).substring(2, 15);
        
        // Set up global callback function
        window[callbackName] = (data: any) => {
          console.log('JSONP callback received data:', data.token ? 'token present' : 'no token');
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
          
          // Clean up
          document.body.removeChild(script);
          delete window[callbackName];
        };
        
        // Create script element
        const script = document.createElement('script');
        script.src = `${API_BASE_URL}/auth/google/callback/jsonp?code=${code}&callback=${callbackName}`;
        
        // Handle errors
        script.onerror = () => {
          console.error('JSONP script failed to load');
          document.body.removeChild(script);
          delete window[callbackName];
          reject(new Error('JSONP request failed'));
        };
        
        // Add script to page
        document.body.appendChild(script);
        
        // Set timeout to clean up if no response
        setTimeout(() => {
          if (document.body.contains(script)) {
            document.body.removeChild(script);
            delete window[callbackName];
            reject(new Error('JSONP request timed out'));
          }
        }, 30000);
      });
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error: string; details?: string }>;
      console.error('Google callback error:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message,
        code: axiosError.code,
        headers: axiosError.response?.headers
      });
      throw new Error(axiosError.response?.data?.error || 'Authentication failed');
    }
    throw error;
  }
};

// Add other API functions here...

export default api; 