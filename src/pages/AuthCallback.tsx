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

// Function to safely decode JWT token 
const decodeToken = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    return JSON.parse(atob(parts[1]));
  } catch (e) {
    console.error('Error decoding token:', e);
    return null;
  }
};

// Check if token is valid and not expired
const isTokenValid = (token: string) => {
  const decoded = decodeToken(token);
  if (!decoded) return false;
  
  // Check if token has expiration
  if (decoded.exp) {
    // exp is in seconds, Date.now() is in milliseconds
    return decoded.exp * 1000 > Date.now();
  }
  
  // If no expiration, check if token was created recently (within 7 days)
  if (decoded.createdAt) {
    const createdTime = new Date(decoded.createdAt).getTime();
    // 7 days in milliseconds
    return Date.now() - createdTime < 7 * 24 * 60 * 60 * 1000;
  }
  
  return false;
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processedRef = useRef(false); // Local ref to track if we've already processed this callback
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // Custom logging function
  const log = (message: string, ...args: any[]) => {
    console.log(`[AuthCallback] ${message}`, ...args);
    setLogMessages(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };

  // Effect to handle countdown timer for redirects
  useEffect(() => {
    if (error && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (error && redirectCountdown === 0) {
      log('Redirect countdown finished, navigating to login');
      navigate('/login');
    }
  }, [error, redirectCountdown, navigate]);

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

        // First check for token in localStorage (may have been set by a redirect)
        const storedToken = localStorage.getItem('token');
        if (storedToken && isTokenValid(storedToken)) {
          log('Found valid token in localStorage, using it directly');
          login(storedToken);
          navigate('/dashboard');
          return;
        } else if (storedToken) {
          log('Found token in localStorage but it appears invalid, clearing');
          localStorage.removeItem('token');
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
          log('Token found in URL, using it directly');
          localStorage.setItem('token', token); // Save to localStorage for future use
          login(token);
          navigate('/dashboard');
          return;
        }
        
        if (!code) {
          setError('No authorization code found in URL');
          return;
        }
        
        // Debug info
        const debugInfo = {
          url: window.location.href,
          origin: window.location.origin,
          hostname: window.location.hostname,
          code: code.substring(0, 12) + '...',
          timestamp: new Date().toISOString()
        };
        
        log('Auth callback debug: ', debugInfo);
        
        // Try direct iframe approach first - this can bypass CSP issues
        try {
          log('Attempting iframe approach to handle authentication');
          
          // Create an iframe to handle the callback
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          
          // Create a promise to track completion
          const iframePromise = new Promise<void>((resolve) => {
            // Check localStorage for token periodically
            const checkInterval = setInterval(() => {
              const iframeToken = localStorage.getItem('token');
              if (iframeToken) {
                log('Token found in localStorage via iframe approach');
                clearInterval(checkInterval);
                document.body.removeChild(iframe);
                login(iframeToken);
                navigate('/dashboard');
                resolve();
              }
            }, 500);
            
            // Set timeout to abandon this approach after 5 seconds
            setTimeout(() => {
              clearInterval(checkInterval);
              try {
                document.body.removeChild(iframe);
              } catch (e) {}
              log('Iframe approach timed out');
              resolve();
            }, 5000);
            
            // Set the iframe src to the direct callback URL
            const callbackUrl = `${window.location.origin.includes('localhost') ? 
              'http://localhost:3000' : 'https://api.quits.cc'}/api/auth/google/callback?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}&_t=${Date.now()}`;
            
            iframe.src = callbackUrl;
          });
          
          // Wait for iframe approach to complete or time out
          await iframePromise;
          
          // Check if we have a token now
          const iframeToken = localStorage.getItem('token');
          if (iframeToken) {
            // We already handled login in the interval above
            return;
          }
        } catch (iframeError) {
          log(`Iframe approach failed: ${iframeError instanceof Error ? iframeError.message : 'Unknown error'}`);
        }
        
        // Try direct callback approach
        try {
          log('Attempting direct API call to /api/auth/google/callback');
          
          // Create direct API request to bypass CSP issues
          const directApiUrl = `${window.location.origin.includes('localhost') ? 
            'http://localhost:3000' : 'https://api.quits.cc'}/api/auth/google/callback`;
            
          const response = await fetch(`${directApiUrl}?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}&_t=${Date.now()}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-store, no-cache'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            log('Direct API call successful, received token');
            
            if (data.token) {
              localStorage.setItem('token', data.token);
              login(data.token);
              navigate('/dashboard');
              return;
            }
          } else {
            log(`Direct API call failed with status ${response.status}`);
          }
        } catch (directError) {
          log(`Direct API call error: ${directError instanceof Error ? directError.message : 'Unknown error'}`);
        }
        
        // Last resort: Try apiService approach
        log('Requesting token from API service');
        const result = await apiService.auth.handleGoogleCallback(code);
        
        if (result.pending) {
          // The API is handling the redirect, show a loading message
          log('Pending redirect to backend service');
          setError('Authentication in progress, please wait...');
          
          // Set a timer to check localStorage for token
          log('Setting timer to check for token in localStorage');
          const checkInterval = setInterval(() => {
            const tokenCheck = localStorage.getItem('token');
            if (tokenCheck) {
              log('Token appeared in localStorage, using it');
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
        
        if (result.success && result.token) {
          log('Successfully received token from API');
          localStorage.setItem('token', result.token);
          login(result.token);
          navigate('/dashboard');
          return;
        }
        
        // If we get here, something unexpected happened
        setError('An unexpected error occurred during authentication. Please try again.');
        
      } catch (callbackError) {
        log(`Auth callback error: ${callbackError instanceof Error ? callbackError.message : 'Unknown error'}`);
        setError('Failed to process authentication. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    };

    processGoogleCallback();
  }, [location, navigate, login]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA] p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img src="/quits-logo.svg" alt="Quits" className="mx-auto h-16 w-auto" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {error ? "Authentication Error" : "Authenticating..."}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {error 
              ? "There was a problem with authentication." 
              : "Please wait while we complete your sign-in."}
          </p>
        </div>

        {error ? (
          <div className="mt-4">
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">{error}</p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => window.location.href = '/login'}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Return to Login
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex justify-center">
              <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
            </div>
            <div className="mt-4 text-center text-sm text-gray-500">
              <p>This should only take a moment...</p>
            </div>
          </div>
        )}

        {logMessages.length > 0 && (
          <div className="mt-8 p-4 bg-gray-100 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Authentication log:</h3>
            <div className="text-xs text-gray-600 overflow-auto max-h-40">
              {logMessages.map((msg, i) => (
                <div key={i} className="mb-1">{msg}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 