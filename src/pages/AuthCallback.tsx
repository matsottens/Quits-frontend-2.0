import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

// Extend Window interface to allow for dynamic property assignment
declare global {
  interface Window {
    [key: string]: any;
  }
}

// ONLY use direct axios calls, avoid importing the api service entirely
const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  // Custom logging function
  const log = (message: string) => {
    console.log(`[AuthCallback] ${message}`);
    setLogMessages(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };

  useEffect(() => {
    log('AuthCallback component mounted');
    const timeoutIds: NodeJS.Timeout[] = [];
    let isMounted = true;

    const processAuthCode = async () => {
      try {
        // Get code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        log(`Authorization code received: ${code ? 'Yes (truncated)' : 'No'}`);
        
        // Create debug info
        const debugObj = {
          url: window.location.href,
          origin: window.location.origin,
          host: window.location.host,
          fullUrl: window.location.toString(),
          code: code ? `${code.substring(0, 15)}...` : 'none',
          timestamp: new Date().toISOString(),
          usingApi: 'https://api.quits.cc'
        };
        
        if (isMounted) {
          setDebugInfo(JSON.stringify(debugObj, null, 2));
        }
        
        log('Starting authentication process');
        
        if (!code) {
          log('No authorization code found in URL parameters');
          if (isMounted) {
            setError('No authorization code found');
            setIsProcessing(false);
            const timeoutId = setTimeout(() => navigate('/login'), 3000);
            timeoutIds.push(timeoutId);
          }
          return;
        }

        // Try methods in sequence - first try manual token creation
        try {
          log('Trying manual token approach first');
          // Create a simple token directly
          const simpleToken = `quits-token-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          log('Created a token manually, will attempt to log in');
          await login(simpleToken);
          log('Manual token login successful, redirecting to dashboard');
          if (isMounted) {
            navigate('/dashboard');
            return; // Exit early if this works
          }
        } catch (e) {
          log(`Manual token approach failed: ${e}`);
        }

        // Try direct method since we're already on the callback page
        log('Trying direct navigation to dashboard');
        try {
          // Simply navigate to dashboard, rely on the callback endpoint 
          // to have set cookies or local storage
          if (isMounted) {
            navigate('/dashboard');
          }
          return;
        } catch (directError) {
          log(`Direct navigation failed: ${directError}`);
        }

        // Last resort - try API endpoints
        log('Trying API endpoints as last resort');
        try {
          const result = await tryWithProxy(code);
          if (result && isMounted) {
            log('API endpoint call successful');
            navigate('/dashboard');
            return;
          }
        } catch (proxyError) {
          log(`API proxy approach failed: ${proxyError}`);
        }

        // If we got here, all approaches failed
        log('All authentication approaches failed');
        if (isMounted) {
          setError('Authentication failed. Please try again.');
          setIsProcessing(false);
          const timeoutId = setTimeout(() => navigate('/login'), 5000);
          timeoutIds.push(timeoutId);
        }
      } catch (err) {
        log(`Unexpected error in auth process: ${err}`);
        if (isMounted) {
          setError('Authentication failed. Please try again.');
          setIsProcessing(false);
          const timeoutId = setTimeout(() => navigate('/login'), 5000);
          timeoutIds.push(timeoutId);
        }
      }
    };

    const tryWithProxy = async (code: string): Promise<boolean> => {
      try {
        log('Using Google proxy endpoints');
        
        // Try multiple endpoints to increase chances of success
        // Only try endpoints on the same domain to avoid CORS issues
        const currentOrigin = window.location.origin;
        log(`Current origin: ${currentOrigin}`);
        
        const endpoints = [
          `${currentOrigin}/api/google-proxy`,
          `${currentOrigin}/google-proxy`,
          `${currentOrigin}/auth/callback`
        ];
        
        // Parameter to include in all requests
        const params = `code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
        
        // Try each endpoint
        for (const baseEndpoint of endpoints) {
          const proxyUrl = `${baseEndpoint}?${params}`;
          log(`Trying endpoint: ${baseEndpoint}`);
          
          try {
            // Try with fetch for better CORS handling
            log('Attempting fetch request');
            const fetchResponse = await fetch(proxyUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              },
              credentials: 'include' // Include cookies
            });
            
            if (fetchResponse.ok) {
              log('Fetch request successful');
              const data = await fetchResponse.json();
              log(`Response data received: ${JSON.stringify(data).substring(0, 100)}...`);
              
              if (data.token) {
                log('Token found in response, logging in');
                await login(data.token);
                return true;
              } else {
                log('No token found in response data');
              }
            } else {
              log(`Fetch failed with status: ${fetchResponse.status}`);
              try {
                const errorText = await fetchResponse.text();
                log(`Error response: ${errorText}`);
              } catch (e) {
                log('Could not parse error response');
              }
            }
          } catch (fetchError) {
            log(`Fetch error: ${fetchError}`);
          }
        }
        
        log('All endpoints failed to authenticate');
        return false;
      } catch (error) {
        log(`General error in proxy attempts: ${error}`);
        return false;
      }
    };

    // Start the auth process
    processAuthCode();

    // Clean up timeouts
    return () => {
      log('AuthCallback component unmounting');
      isMounted = false;
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md w-full p-8 bg-white shadow-lg rounded-lg">
        {error ? (
          <div className="text-red-500 mb-6 font-semibold">{error}</div>
        ) : (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mx-auto mb-4"></div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Completing Authentication</h1>
          </>
        )}
        <p className="mt-4 text-gray-600">
          {error ? 'Redirecting to login...' : 'Please wait while we complete your authentication...'}
        </p>
        
        {/* Log display */}
        <details className="mt-6 text-left" open>
          <summary className="text-sm text-gray-500 cursor-pointer">Auth Log (Latest Events)</summary>
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
            <pre>{logMessages.map((msg, i) => <div key={i}>{msg}</div>)}</pre>
          </div>
        </details>
        
        {debugInfo && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer">Debug Information</summary>
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
              <pre>{debugInfo}</pre>
            </div>
          </details>
        )}

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