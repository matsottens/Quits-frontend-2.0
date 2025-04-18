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
        
        // Attempt to get token
        log('Requesting token from API');
        const result = await apiService.auth.handleGoogleCallback(code);
        
        if (result.pending) {
          // The API is handling the redirect, show a loading message
          log('Pending redirect to backend service');
          setError('Redirecting to authentication service...');
          // Don't navigate or complete - the page will be redirected by the API
          return;
        }

        if (result.success === false) {
          // Handle specific error cases more gracefully
          log(`Authentication error: ${result.error}`);
          
          if (result.error === 'invalid_grant') {
            setError('Your authentication session has expired. Please try logging in again.');
            return;
          }
          
          setError(result.message || 'Authentication failed');
          return;
        }
        
        if (result && result.token) {
          log('Successfully received auth token');
          login(result.token);
          navigate('/dashboard');
        } else {
          log('No token received from authentication server');
          setError('No token received from authentication server. Please try again.');
        }
      } catch (err) {
        console.error('Google callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        log(`Error: ${errorMessage}`);
        setError('Authentication failed: ' + errorMessage);
      } finally {
        setIsProcessing(false);
      }
    };
    
    processGoogleCallback();
    
    // Cleanup function
    return () => {
      log('AuthCallback component unmounting');
    };
  }, [login, navigate, location.search]); // Only include dependencies that should trigger a rerun

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md w-full p-8 bg-white shadow-lg rounded-lg">
        {error ? (
          <>
            <div className="text-red-500 mb-6 font-semibold">{error}</div>
            <p className="mt-4 text-gray-600">
              Redirecting to login in {redirectCountdown} seconds...
            </p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mx-auto mb-4"></div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Authentication Processing...</h1>
            <p className="mt-4 text-gray-600">
              Redirecting to your dashboard...
            </p>
          </>
        )}
        
        {/* Log display */}
        <details className="mt-6 text-left" open>
          <summary className="text-sm text-gray-500 cursor-pointer">Auth Log</summary>
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
            <pre>{logMessages.map((msg, i) => <div key={i}>{msg}</div>)}</pre>
          </div>
        </details>

        <div className="mt-6">
          <button 
            onClick={() => error ? navigate('/login') : navigate('/dashboard')} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {error ? 'Go to Login' : 'Continue to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback; 