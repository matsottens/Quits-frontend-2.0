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
  const [debugVisible, setDebugVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, validateToken } = useAuth();
  const processedRef = useRef(false);
  
  // Helper for adding debug messages
  const log = (message: string) => {
    console.log(`[AuthCallback] ${message}`);
    setDebugMessages(prev => [...prev, message]);
  };

  // Toggle debug info visibility
  const toggleDebug = () => {
    setDebugVisible(prev => !prev);
  };

  // Function to make a direct call to debug endpoint
  const checkAuthConfig = async () => {
    try {
      log('Checking auth configuration...');
      const response = await fetch('https://api.quits.cc/debug?type=auth');
      
      if (response.ok) {
        const data = await response.json();
        log('Auth configuration received:');
        log(`- Environment: ${data.env?.NODE_ENV || 'undefined'} / ${data.env?.VERCEL_ENV || 'undefined'}`);
        log(`- Google Client ID: ${data.env?.has_google_id === 'yes' ? 'Found' : 'Not found'}`);
        log(`- Google Redirect URI: ${data.env?.using_redirect_uri || 'Not set'}`);
        log(`- JWT Secret: ${data.env?.has_jwt_secret === 'yes' ? 'Set' : 'Not set'}`);
        
        if (data.env?.oauth_client_created) {
          log('- OAuth client created successfully');
        } else {
          log('- OAuth client creation failed');
        }
      } else {
        log(`Failed to check auth config: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      log(`Error checking auth config: ${error instanceof Error ? error.message : String(error)}`);
    }
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
        log(`URL: ${window.location.href}`);
        
        // Log any network issues
        try {
          // Use a simple GET request to avoid CORS issues
          const testFetch = await fetch('https://api.quits.cc/health', { 
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            mode: 'no-cors' // This prevents CORS errors, but will give an opaque response
          });
          log(`API health check: ${testFetch.type === 'opaque' ? 'Connection successful (opaque response)' : testFetch.status}`);
        } catch (e) {
          log(`API health check failed: ${e instanceof Error ? e.message : String(e)}`);
        }
        
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
        const state = urlParams.get('state');
        log(`State parameter: ${state || 'Not present'}`);
        
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
        
        // Add direct Google redirect option for user
        const directGoogleAuth = () => {
          const redirectUrl = 'https://accounts.google.com/o/oauth2/auth' +
            '?client_id=82730443897-ji64k4jhk02lonkps5vu54e1q5opoq3g.apps.googleusercontent.com' +
            '&redirect_uri=' + encodeURIComponent('https://www.quits.cc/auth/callback') +
            '&response_type=code' +
            '&scope=' + encodeURIComponent('email profile https://www.googleapis.com/auth/gmail.readonly openid') +
            '&state=auth' +
            '&prompt=select_account+consent' +
            '&access_type=offline';
          
          window.location.href = redirectUrl;
        };
        
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
          
          // Check for pending property (may not be in the type definition)
          if ('pending' in result && result.pending) {
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
              // Automatically check auth configuration to help debug
              await checkAuthConfig();
              
              // Simply redirect back to login with better error message
              window.location.href = '/login?error=invalid_grant&message=Your authorization session has expired. Please login again.';
              return;
            } else if (result.error === 'auth_failed') {
              await checkAuthConfig();
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
          
        } catch (error) {
          // Handle CORS errors specifically
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.includes('CORS') || errorMsg.includes('cross-origin') || errorMsg.includes('network error')) {
            log(`CORS or network error detected: ${errorMsg}`);
            setError(`Authentication server connection issue. Please try again or contact support.`);
            
            // Add a button for manual authentication
            setShowDirectAuthOption(true);
          } else {
            log(`Authentication error: ${errorMsg}`);
            setError(`Authentication failed. ${errorMsg}`);
          }
          
          // Check API configuration anyway
          await checkAuthConfig();
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`Unhandled error: ${errorMsg}`);
        setError(`An unexpected error occurred: ${errorMsg}`);
      } finally {
        setIsProcessing(false);
      }
    };
    
    processGoogleCallback();
  }, [location.search, navigate, login, validateToken]);

  // Add state for showing direct auth option
  const [showDirectAuthOption, setShowDirectAuthOption] = useState(false);

  // Direct Google auth function
  const handleDirectGoogleAuth = () => {
    const redirectUrl = 'https://accounts.google.com/o/oauth2/auth' +
      '?client_id=82730443897-ji64k4jhk02lonkps5vu54e1q5opoq3g.apps.googleusercontent.com' +
      '&redirect_uri=' + encodeURIComponent('https://www.quits.cc/auth/callback') +
      '&response_type=code' +
      '&scope=' + encodeURIComponent('email profile https://www.googleapis.com/auth/gmail.readonly openid') +
      '&state=auth' +
      '&prompt=select_account+consent' +
      '&access_type=offline';
    
    window.location.href = redirectUrl;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Processing Authentication</h1>
          
          {isProcessing ? (
            <div className="mt-4">
              <div className="w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600">Please wait while we authenticate your account...</p>
            </div>
          ) : error ? (
            <div className="mt-4">
              <div className="text-red-500 mb-4">{error}</div>
              
              {/* Show direct auth option if there were CORS issues */}
              {showDirectAuthOption && (
                <button
                  onClick={handleDirectGoogleAuth}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
                >
                  Try Direct Google Authentication
                </button>
              )}
              
              <button
                onClick={() => navigate('/login')}
                className="mt-4 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="w-12 h-12 border-t-2 border-b-2 border-green-500 rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600">Authentication successful! Redirecting...</p>
            </div>
          )}
        </div>

        {/* Debug toggle button */}
        <div className="mt-8 text-center">
          <button 
            onClick={toggleDebug}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {debugVisible ? 'Hide Debug Info' : 'Show Debug Info'}
          </button>
        </div>

        {/* Debug information */}
        {debugVisible && (
          <div className="mt-4 p-4 bg-gray-100 rounded overflow-auto max-h-60 text-xs font-mono">
            {debugMessages.map((msg, i) => (
              <div key={i} className="mb-1">
                {msg}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 