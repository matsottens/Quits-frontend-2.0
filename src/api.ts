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
    'X-Requested-With': 'XMLHttpRequest' // Helps with CORS in some servers
  },
});

export const handleGoogleCallback = async (code: string): Promise<AuthResponse> => {
  try {
    console.log(`Attempting Google auth callback with code: ${code.substring(0, 10)}...`);
    
    // Use JSONP as the primary approach since it bypasses CORS
    console.log('Using JSONP approach to bypass CORS issues');
    return new Promise<AuthResponse>((resolve, reject) => {
      try {
        // Generate a unique callback function name
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
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
          delete window[callbackName];
        };
        
        // Create script element
        const script = document.createElement('script');
        script.src = `${API_BASE_URL}/auth/google/callback/jsonp?code=${encodeURIComponent(code)}&callback=${callbackName}`;
        
        // Handle errors
        script.onerror = (e) => {
          console.error('JSONP script failed to load:', e);
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
          delete window[callbackName];
          reject(new Error('JSONP request failed'));
        };
        
        console.log('Adding JSONP script to page:', script.src);
        
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
      } catch (err) {
        reject(new Error(`JSONP setup error: ${err instanceof Error ? err.message : String(err)}`));
      }
    });
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