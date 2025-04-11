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

  // Custom logging function
  const log = (message: string) => {
    console.log(`[AuthCallback] ${message}`);
    setLogMessages(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
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
        
        // Get the code from URL query params
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          setError('No authorization code found');
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
        
        log(`Auth callback with code: ${code.substring(0, 8)}...`);
        
        // Attempt to get token
        log('Requesting token from API');
        const result = await apiService.auth.handleGoogleCallback(code);
        
        if (result && result.token) {
          log('Successfully received auth token');
          login(result.token);
          navigate('/dashboard');
        } else {
          setError('Failed to authenticate with Google');
        }
      } catch (err) {
        console.error('Google callback error:', err);
        setError('Authentication failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
          <div className="text-red-500 mb-6 font-semibold">{error}</div>
        ) : (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mx-auto mb-4"></div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Authentication Processing...</h1>
          </>
        )}
        <p className="mt-4 text-gray-600">
          {error ? 'Redirecting to login...' : 'Redirecting to your dashboard...'}
        </p>
        
        {/* Log display */}
        <details className="mt-6 text-left" open>
          <summary className="text-sm text-gray-500 cursor-pointer">Auth Log</summary>
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
            <pre>{logMessages.map((msg, i) => <div key={i}>{msg}</div>)}</pre>
          </div>
        </details>

        <div className="mt-6">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback; 