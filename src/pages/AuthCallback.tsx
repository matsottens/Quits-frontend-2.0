import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios, { AxiosError } from 'axios';

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
          code: code ? `${code.substring(0, 15)}...` : 'none',
          timestamp: new Date().toISOString()
        };
        
        if (isMounted) {
          setDebugInfo(JSON.stringify(debugObj, null, 2));
        }
        
        console.log('Auth callback debug:', debugObj);
        
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

        // Try both the proxy endpoint and the regular endpoint
        await tryWithProxy(code);
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

    const tryWithProxy = async (code: string) => {
      try {
        console.log('Using emergency proxy endpoint');
        
        // Use the new proxy endpoint
        const API_BASE_URL = 'https://api.quits.cc';
        const proxyUrl = `${API_BASE_URL}/api/google-proxy?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
        
        console.log('Calling proxy endpoint:', proxyUrl);
        
        const response = await axios.get(proxyUrl, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        console.log('Proxy response:', response.data);
        
        if (response.data.token) {
          // Success! Log in with the token
          await login(response.data.token);
          
          if (isMounted) {
            // Navigate to dashboard
            navigate('/dashboard');
          }
          return;
        }
        
        // Fall back to manual navigation if we got a response but no token
        if (isMounted) {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error with proxy endpoint:', error);
        
        // Try force navigate to dashboard anyway
        if (isMounted) {
          const timeoutId = setTimeout(() => navigate('/dashboard?fallback=true'), 1000);
          timeoutIds.push(timeoutId);
        }
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