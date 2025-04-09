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

// Store the original URL before redirecting for auth
export const saveAuthReturnUrl = () => {
  try {
    localStorage.setItem('auth_return_url', window.location.href);
  } catch (error) {
    console.error('Failed to save return URL:', error);
  }
};

// Check if we have an auth result in the URL's hash fragment
export const checkForAuthResult = (): AuthResponse | null => {
  try {
    // Check if we have auth data in the hash (added by the auth server)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const authData = hashParams.get('auth_data');
    
    if (authData) {
      // Clear the hash to clean up the URL
      window.location.hash = '';
      
      try {
        // Parse and return the auth data
        return JSON.parse(decodeURIComponent(authData));
      } catch (e) {
        console.error('Failed to parse auth data:', e);
        return null;
      }
    }
    
    return null;
  } catch (e) {
    console.error('Error checking for auth result:', e);
    return null;
  }
};

export const handleGoogleCallback = async (code: string): Promise<AuthResponse> => {
  try {
    console.log(`Attempting Google auth callback with code: ${code.substring(0, 10)}...`);
    
    // Create and store a unique request ID in sessionStorage
    const requestId = 'auth_req_' + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('last_auth_request_id', requestId);
    
    // Store the current time so we can check for timeouts
    sessionStorage.setItem('auth_request_time', Date.now().toString());
    
    // Create a simple form and submit it directly to avoid CORS/CSP issues
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${API_BASE_URL}/auth/google/callback/direct2`;
    
    // Add hidden input fields
    const codeInput = document.createElement('input');
    codeInput.type = 'hidden';
    codeInput.name = 'code';
    codeInput.value = code;
    form.appendChild(codeInput);
    
    const originInput = document.createElement('input');
    originInput.type = 'hidden';
    originInput.name = 'origin';
    originInput.value = window.location.origin;
    form.appendChild(originInput);
    
    const requestIdInput = document.createElement('input');
    requestIdInput.type = 'hidden';
    requestIdInput.name = 'requestId';
    requestIdInput.value = requestId;
    form.appendChild(requestIdInput);
    
    // Create a promise that will be resolved when we return from the auth server
    return new Promise<AuthResponse>((resolve, reject) => {
      // Set up poll interval to check if we've returned from auth
      const startTime = Date.now();
      const maxWaitTime = 30000; // 30 seconds timeout
      
      // Store the resolve/reject functions in sessionStorage
      sessionStorage.setItem('auth_promise_pending', 'true');
      
      // Start polling for result
      const checkInterval = setInterval(() => {
        // Check if we timed out
        if (Date.now() - startTime > maxWaitTime) {
          clearInterval(checkInterval);
          sessionStorage.removeItem('auth_promise_pending');
          reject(new Error('Authentication request timed out'));
          return;
        }
        
        // Check for auth result
        const authResult = checkForAuthResult();
        if (authResult) {
          clearInterval(checkInterval);
          sessionStorage.removeItem('auth_promise_pending');
          resolve(authResult);
          return;
        }
      }, 500);
      
      // Submit the form
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    });
  } catch (error) {
    console.error('Error in handleGoogleCallback:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error: string; details?: string }>;
      console.error('Google callback error details:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message,
        code: axiosError.code
      });
      throw new Error(axiosError.response?.data?.error || 'Authentication failed');
    }
    throw error;
  }
};

// Add other API functions here...

export default api; 