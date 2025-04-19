import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

// Extend Window interface to allow for dynamic property assignment
declare global {
  interface Window {
    [key: string]: any;
  }
}

// Global flag to prevent multiple auth attempts across renders
let hasProcessedAuth = false;

// Helper to check if localStorage is available and working
const isLocalStorageAvailable = () => {
  try {
    const test = 'test';
    localStorage.setItem(test, test);
    const result = localStorage.getItem(test) === test;
    localStorage.removeItem(test);
    return result;
  } catch (e) {
    return false;
  }
};

// Helper to safely store tokens in localStorage
const safelyStoreToken = (token: string): boolean => {
  try {
    // First clear any existing tokens
    localStorage.removeItem('token');
    localStorage.removeItem('quits_auth_token');
    
    // Store the token in both places for consistency
    localStorage.setItem('token', token);
    localStorage.setItem('quits_auth_token', token);
    
    // Verify token was stored correctly
    return localStorage.getItem('token') === token;
  } catch (e) {
    console.error('Error storing token:', e);
    return false;
  }
};

const AuthCallback = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, validateToken } = useAuth();
  const processedRef = useRef(false);
  
  // Helper for adding debug messages
  const log = (message: string) => {
    console.log(`[AuthCallback] ${message}`);
    setDebugMessages(prev => [...prev, message]);
  };
  
  useEffect(() => {
    // Check both local and global processed flags to prevent multiple calls
    if (processedRef.current || hasProcessedAuth) {
      log('Auth callback already processed, skipping');
      return; // Skip if already processed
    }
    
    const processGoogleCallback = async () => {
      try {
        // Set both local and global processed flags immediately
        processedRef.current = true;
        hasProcessedAuth = true;
        setIsProcessing(true);
        
        log('Starting Google callback processing');
        
        // Check localStorage availability
        if (!isLocalStorageAvailable()) {
          log('localStorage is not available - authentication will not persist');
          setError('Your browser storage is disabled. Please enable cookies and localStorage for this site.');
          return;
        }

        // First check for token in localStorage (may have been set by a redirect)
        const storedToken = localStorage.getItem('token');
        if (storedToken && validateToken(storedToken)) {
          log('Found valid token in localStorage, using it directly');
          await login(storedToken);
          navigate('/dashboard');
          return;
        } else if (storedToken) {
          log('Found token in localStorage but it appears invalid, clearing');
          localStorage.removeItem('token');
          localStorage.removeItem('quits_auth_token');
        }
        
        // Get the code from URL query params
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        
        // Also check for token in query params (from backend redirect)
        const token = urlParams.get('token');
        
        // Handle error parameters directly from URL
        const errorParam = urlParams.get('error');
        const errorMessage = urlParams.get('message');
        if (errorParam) {
          log(`Error in URL parameters: ${errorParam} - ${errorMessage}`);
          setError(errorMessage || `Authentication error: ${errorParam}`);
          return;
        }
        
        // If we have a token already, we can skip the code exchange
        if (token) {
          log('Token found in URL, validating it');
          
          if (validateToken(token)) {
            log('Token is valid, storing and proceeding');
            if (safelyStoreToken(token)) {
              log('Token stored successfully');
              await login(token);
              navigate('/dashboard');
              return;
            } else {
              log('Failed to store token in localStorage');
              setError('Failed to store authentication token. Please ensure cookies and localStorage are enabled.');
              return;
            }
          } else {
            log('Token from URL is invalid');
            setError('Invalid authentication token received. Please try logging in again.');
            return;
          }
        }
        
        // If no token but we have a code, exchange it for a token
        if (!code) {
          log('No code found in URL parameters');
          setError('No authentication code found. Please try logging in again.');
          return;
        }
        
        log(`Found authorization code: ${code.substring(0, 8)}...`);
        log('Attempting to exchange code for token');
        
        try {
          // First try direct method
          log('Trying direct Google proxy method');
          const result = await apiService.auth.handleGoogleCallback(code);
          
          log(`Auth result: ${JSON.stringify(result, null, 2)}`);
          
          if (result.success && result.token) {
            log('Successfully obtained token, storing and logging in');
            
            // Validate the token first
            if (!validateToken(result.token)) {
              log('Token validation failed');
              setError('Invalid authentication token received. Please try logging in again.');
              return;
            }
            
            if (safelyStoreToken(result.token)) {
              log('Token stored successfully');
              await login(result.token);
              navigate('/dashboard');
              return;
            } else {
              log('Failed to store token');
              setError('Failed to store authentication data. Please ensure cookies and localStorage are enabled.');
              return;
            }
          }
          
          if (result.pending) {
            // The API is handling the redirect, show a loading message
            log('Pending redirect to backend service');
            setError('Authentication in progress, please wait...');
            
            // Set a timer to check localStorage for token
            log('Setting timer to check for token in localStorage');
            const checkInterval = setInterval(() => {
              const tokenCheck = localStorage.getItem('token');
              if (tokenCheck && validateToken(tokenCheck)) {
                log('Valid token appeared in localStorage, using it');
                clearInterval(checkInterval);
                login(tokenCheck);
                navigate('/dashboard');
              }
            }, 1000);
            
            // Clear interval after 15 seconds if no token appears
            setTimeout(() => {
              clearInterval(checkInterval);
              log('Token check timed out after 15 seconds');
              setError('Authentication timed out. Please try again.');
            }, 15000);
            
            return;
          }

          if (result.success === false) {
            // Handle specific error cases more gracefully
            log(`Authentication error: ${result.error}`);
            
            if (result.error === 'invalid_grant' || result.error === 'auth_code_already_used') {
              // Simply redirect back to login with better error message
              window.location.href = '/login?error=invalid_grant&message=Your authorization session has expired. Please login again.';
              return;
            } else if (result.error === 'auth_failed') {
              window.location.href = '/login?error=auth_failed&message=Authentication failed. Please try again.';
              return;
            }
            
            // For other errors, show in UI
            setError(result.message || 'Failed to authenticate with Google. Please try again.');
            return;
          }
          
          // If we got here, something unexpected happened
          log('Unexpected response format');
          setError('Unexpected authentication response. Please try again.');
          
        } catch (error: any) {
          log(`Error during code exchange: ${error.message}`);
          setError(`Authentication error: ${error.message}`);
        }
        
      } catch (error: any) {
        console.error('Error in Google callback processing:', error);
        setError(`Authentication failed: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    
    processGoogleCallback();
    
    // Cleanup function
    return () => {
      // Any cleanup needed
    };
    
  }, [login, navigate, location]);
  
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md overflow-hidden p-6">
        <div className="flex justify-center mb-6">
          <img src="/quits-logo.svg" alt="Quits Logo" className="h-16 w-auto" />
        </div>
        
        <h2 className="text-center text-2xl font-bold text-gray-900 mb-4">
          {error ? 'Authentication Error' : 'Authenticating...'}
        </h2>
        
        {isProcessing && !error && (
          <div className="flex flex-col items-center justify-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mb-4"></div>
            <p className="text-gray-600 text-center">
              Please wait while we complete your authentication...
            </p>
          </div>
        )}
        
        {error && (
          <div className="mt-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Login
            </button>
          </div>
        )}
        
        {/* Debug info section (hidden in production) */}
        {process.env.NODE_ENV !== 'production' && debugMessages.length > 0 && (
          <div className="mt-8 p-2 border border-gray-200 rounded-md bg-gray-50">
            <p className="text-xs font-bold mb-1">Debug Info:</p>
            <div className="max-h-40 overflow-y-auto">
              {debugMessages.map((msg, i) => (
                <p key={i} className="text-xs font-mono text-gray-700">{msg}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 