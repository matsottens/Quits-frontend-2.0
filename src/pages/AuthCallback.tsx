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

  useEffect(() => {
    const timeoutIds: NodeJS.Timeout[] = [];
    let isMounted = true;

    const processAuthCode = async () => {
      try {
        // Get code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
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
        
        // First check connectivity to API server
        try {
          const testUrl = 'https://api.quits.cc/api/health';
          console.log('Testing API connectivity to:', testUrl);
          const testResponse = await fetch(testUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (testResponse.ok) {
            const healthData = await testResponse.json();
            console.log('API health check successful:', healthData);
          } else {
            console.warn('API health check failed with status:', testResponse.status);
          }
        } catch (healthError) {
          console.error('API health check error:', healthError);
        }
        
        console.log('Auth callback debug info:', debugObj);
        
        if (!code) {
          console.error('No authorization code found');
          if (isMounted) {
            setError('No authorization code found');
            setIsProcessing(false);
            const timeoutId = setTimeout(() => navigate('/login'), 3000);
            timeoutIds.push(timeoutId);
          }
          return;
        }

        // Try both approaches in parallel - the proxy and direct API endpoints
        const successfulAuth = await Promise.any([
          tryWithProxy(code),
          tryWithDirectUrl(code)
        ]).catch(err => {
          console.error('All auth approaches failed:', err);
          return false;
        });
        
        if (successfulAuth && isMounted) {
          navigate('/dashboard');
        } else if (isMounted) {
          setError('Authentication failed. Please try again.');
          setIsProcessing(false);
          const timeoutId = setTimeout(() => navigate('/login'), 5000);
          timeoutIds.push(timeoutId);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        if (isMounted) {
          setError('Authentication failed. Please try again.');
          setIsProcessing(false);
          const timeoutId = setTimeout(() => navigate('/login'), 5000);
          timeoutIds.push(timeoutId);
        }
      }
    };
    
    // Try the direct URL approach - useful if we have CORS issues with the proxy
    const tryWithDirectUrl = async (code: string): Promise<boolean> => {
      try {
        console.log('Trying direct URL approach');
        const directUrl = `https://api.quits.cc/api/auth/google/callback?code=${encodeURIComponent(code)}`;
        console.log('Redirecting to:', directUrl);
        
        // Redirect to the backend directly (with no return)
        window.location.href = directUrl;
        
        // Return a promise that never resolves since we're redirecting
        return new Promise<boolean>(() => {});
      } catch (error) {
        console.error('Error with direct URL approach:', error);
        return false;
      }
    };

    const tryWithProxy = async (code: string): Promise<boolean> => {
      try {
        console.log('Using Google proxy endpoint');
        
        // Try multiple endpoints to increase chances of success
        const endpoints = [
          'https://api.quits.cc/api/google-proxy',
          'https://api.quits.cc/google-proxy'
        ];
        
        // Parameter to include in all requests
        const params = `code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
        
        // Try each endpoint
        for (const baseEndpoint of endpoints) {
          const proxyUrl = `${baseEndpoint}?${params}`;
          console.log('Trying endpoint:', proxyUrl);
          
          try {
            // Try with fetch for better CORS handling
            const fetchResponse = await fetch(proxyUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            });
            
            if (fetchResponse.ok) {
              const data = await fetchResponse.json();
              console.log('Successfully got response from proxy:', data);
              
              if (data.token) {
                await login(data.token);
                return true;
              }
            } else {
              console.warn(`Fetch failed for ${baseEndpoint}, status:`, fetchResponse.status);
              try {
                const errorText = await fetchResponse.text();
                console.warn('Error response:', errorText);
              } catch (e) {
                // Ignore error parsing failures
              }
            }
          } catch (fetchError) {
            console.warn(`Fetch failed for ${baseEndpoint}:`, fetchError);
          }
          
          try {
            // Fall back to axios
            const response = await axios.get(proxyUrl, {
              headers: {
                'Accept': 'application/json'
              }
            });
            
            console.log('Axios response from proxy:', response.data);
            
            if (response.data?.token) {
              await login(response.data.token);
              return true;
            }
          } catch (axiosError) {
            console.warn(`Axios failed for ${baseEndpoint}:`, axiosError);
          }
        }
        
        // None of the endpoints worked
        return false;
      } catch (error) {
        console.error('General error in proxy attempts:', error);
        return false;
      }
    };

    // Start the auth process
    processAuthCode();

    // Clean up timeouts
    return () => {
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
        {debugInfo && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer">Debug Information</summary>
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
              <pre>{debugInfo}</pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 