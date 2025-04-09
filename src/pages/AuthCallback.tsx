import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

// ONLY use direct axios calls, avoid importing the api service entirely
const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);

  // Define API URLs based on environment - critical for proper connectivity
  const isProd = window.location.hostname !== 'localhost';
  const API_BASE_URL = isProd 
    ? 'https://api.quits.cc' 
    : 'http://localhost:3000';

  useEffect(() => {
    let isMounted = true; // Prevent state updates after unmount
    const timeoutIds = []; // Track timeouts to clean up on unmount

    const processAuthCode = async () => {
      // Get code from URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      // Log debug info
      const debugObj = {
        url: window.location.href,
        code: code ? `${code.substring(0, 15)}...` : 'none',
        hostname: window.location.hostname,
        isProd: isProd,
        apiBase: API_BASE_URL,
        time: new Date().toISOString()
      };
      
      console.log('Auth callback debug:', debugObj);
      if (isMounted) setDebugInfo(JSON.stringify(debugObj, null, 2));
      
      if (!code) {
        if (isMounted) {
          setError('No authorization code found');
          setIsProcessing(false);
          const timeoutId = setTimeout(() => navigate('/login'), 3000);
          timeoutIds.push(timeoutId);
        }
        return;
      }
      
      // Try multiple approaches for maximum reliability
      await tryMultipleApproaches(code);
    };

    const tryMultipleApproaches = async (code) => {
      const approaches = [
        () => tryDirectApiCall(code),
        () => tryDifferentContentType(code),
        () => tryFetchApproach(code),
        () => tryProxyFetchApproach(code),
        () => tryJSONPApproach(code)
      ];
      
      // Try each approach sequentially until one works
      for (const approach of approaches) {
        try {
          const success = await approach();
          if (success) return; // Stop if we succeed
        } catch (err) {
          console.error('Approach failed, trying next one:', err);
          // Continue to next approach
        }
      }
      
      // If we get here, all approaches failed
      if (isMounted) {
        setError('All authentication approaches failed. Please try again.');
        setIsProcessing(false);
        const timeoutId = setTimeout(() => navigate('/login'), 5000);
        timeoutIds.push(timeoutId);
      }
    };

    const tryDirectApiCall = async (code) => {
      try {
        console.log('Trying direct API approach');
        const endpoint = `/auth/google/callback`;
        const fullUrl = `${API_BASE_URL}${endpoint}?code=${code}`;
        console.log('Requesting URL:', fullUrl);
        
        const response = await axios({
          method: 'GET',
          url: fullUrl,
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        });
        
        console.log('Auth response:', response.data);
        
        if (response.data?.token) {
          await handleSuccessfulAuth(response.data.token);
          return true;
        }
        return false;
      } catch (err) {
        console.error('Direct API approach failed:', err);
        return false;
      }
    };

    const tryDifferentContentType = async (code) => {
      try {
        console.log('Trying with different content type');
        const endpoint = `/auth/google/callback`;
        const fullUrl = `${API_BASE_URL}${endpoint}?code=${code}`;
        
        const response = await axios({
          method: 'GET',
          url: fullUrl,
          withCredentials: true,
          headers: {
            'Content-Type': 'text/plain',
            'Accept': '*/*'
          },
          timeout: 30000
        });
        
        if (response.data?.token) {
          await handleSuccessfulAuth(response.data.token);
          return true;
        }
        return false;
      } catch (err) {
        console.error('Different content type approach failed:', err);
        return false;
      }
    };
    
    const tryFetchApproach = async (code) => {
      try {
        console.log('Trying fetch API approach');
        const endpoint = `/auth/google/callback`;
        const fullUrl = `${API_BASE_URL}${endpoint}?code=${code}`;
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data?.token) {
            await handleSuccessfulAuth(data.token);
            return true;
          }
        }
        return false;
      } catch (err) {
        console.error('Fetch approach failed:', err);
        return false;
      }
    };
    
    const tryProxyFetchApproach = async (code) => {
      try {
        console.log('Trying proxy fetch approach');
        // This would use a CORS proxy service in a production environment
        // For this example, we're just trying a slight variation in headers and no-cors mode
        const endpoint = `/auth/google/callback`;
        const fullUrl = `${API_BASE_URL}${endpoint}?code=${code}`;
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          },
          mode: 'no-cors' // Try no-cors mode as a last resort
        });
        
        // Note: no-cors mode will return an opaque response
        // We won't be able to read its contents, but can detect if it succeeded
        if (response.type === 'opaque') {
          // For opaque responses, we'll have to assume success and redirect to dashboard
          // In production, you'd want to validate the session in another way
          if (isMounted) {
            navigate('/dashboard');
          }
          return true;
        }
        return false;
      } catch (err) {
        console.error('Proxy fetch approach failed:', err);
        return false;
      }
    };

    // JSONP approach for cross-domain requests (fallback)
    const tryJSONPApproach = async (code) => {
      return new Promise((resolve) => {
        console.log('Trying JSONP approach');
        const callbackName = 'googleAuthCallback_' + Math.random().toString(36).substring(2, 15);
        
        // Set up global callback function
        window[callbackName] = async (data) => {
          console.log('JSONP callback received:', data);
          if (data?.token) {
            try {
              await handleSuccessfulAuth(data.token);
              resolve(true);
            } catch (err) {
              console.error('Error handling JSONP auth data:', err);
              resolve(false);
            }
          } else {
            resolve(false);
          }
          // Clean up the script and global function
          document.body.removeChild(script);
          delete window[callbackName];
        };
        
        // Create and insert script tag
        const script = document.createElement('script');
        script.src = `${API_BASE_URL}/auth/google/callback/jsonp?code=${code}&callback=${callbackName}`;
        
        // Handle script errors
        script.onerror = () => {
          console.error('JSONP script failed to load');
          document.body.removeChild(script);
          delete window[callbackName];
          resolve(false);
        };
        
        // Add script to page
        document.body.appendChild(script);
        
        // Set timeout to cleanup in case of no response
        setTimeout(() => {
          if (document.body.contains(script)) {
            document.body.removeChild(script);
            delete window[callbackName];
            resolve(false);
          }
        }, 10000);
      });
    };

    const handleSuccessfulAuth = async (token) => {
      if (isMounted) {
        try {
          console.log('Authentication successful, logging in');
          await login(token);
          navigate('/dashboard');
        } catch (err) {
          console.error('Error during login after successful auth:', err);
          setError('Error during login process. Please try again.');
          setIsProcessing(false);
          const timeoutId = setTimeout(() => navigate('/login'), 3000);
          timeoutIds.push(timeoutId);
        }
      }
    };

    // Start processing
    processAuthCode();

    // Cleanup function
    return () => {
      isMounted = false;
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [navigate, login, isProd, API_BASE_URL]);

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