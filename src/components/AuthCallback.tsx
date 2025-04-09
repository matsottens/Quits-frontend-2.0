import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { handleGoogleCallback } from '../api';
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

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const timeoutIds: NodeJS.Timeout[] = [];
    let isMounted = true;

    const handleAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        // Create debug info
        const debugObj = {
          url: window.location.href,
          origin: window.location.origin,
          hostname: window.location.hostname,
          code: code ? `${code.substring(0, 15)}...` : 'none',
          timestamp: new Date().toISOString()
        };
        
        if (isMounted) setDebugInfo(JSON.stringify(debugObj, null, 2));
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

        // Try to get token from server
        try {
          console.log('Attempting to get token using handleGoogleCallback');
          const response = await handleGoogleCallback(code) as AuthResponse;
          
          if (response?.token) {
            console.log('Successfully received auth token');
            
            try {
              // Try to login with the token
              await login(response.token);
              
              // Redirect to scanning page on success
              if (isMounted) {
                navigate('/scanning');
              }
            } catch (loginErr) {
              console.error('Login error after successful token retrieval:', loginErr);
              if (isMounted) {
                setError('Error during login process. Please try again.');
                setIsProcessing(false);
                const timeoutId = setTimeout(() => navigate('/login'), 3000);
                timeoutIds.push(timeoutId);
              }
            }
          } else {
            console.error('Invalid response from server:', response);
            if (isMounted) {
              setError('Invalid server response. No auth token received.');
              setIsProcessing(false);
              const timeoutId = setTimeout(() => navigate('/login'), 3000);
              timeoutIds.push(timeoutId);
            }
          }
        } catch (error: any) {
          console.error('Auth callback error:', error);
          
          let errorMessage = 'Authentication failed';
          
          // Handle specific error types
          if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            if (axiosError.response?.status === 500) {
              errorMessage = 'Server error. Please try again later.';
            } else if (axiosError.response?.status === 400) {
              errorMessage = 'Invalid request. Please try again.';
            } else if (axiosError.code === 'ERR_NETWORK') {
              errorMessage = 'Network error. Please check your connection.';
            } else if (axiosError.message.includes('blocked by CORS')) {
              errorMessage = 'Cross-Origin error. Please try again or contact support.';
            }
          } else if (error.message?.includes('Content Security Policy')) {
            errorMessage = 'Security policy error. Please try again or contact support.';
          }
          
          if (isMounted) {
            setError(errorMessage);
            setIsProcessing(false);
            const timeoutId = setTimeout(() => navigate('/login'), 5000);
            timeoutIds.push(timeoutId);
          }
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        
        let errorMessage = 'Authentication failed';
        
        // Handle specific error types
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          if (axiosError.response?.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          } else if (axiosError.response?.status === 400) {
            errorMessage = 'Invalid request. Please try again.';
          } else if (axiosError.code === 'ERR_NETWORK') {
            errorMessage = 'Network error. Please check your connection.';
          } else if (axiosError.message.includes('blocked by CORS')) {
            errorMessage = 'Cross-Origin error. Please try again or contact support.';
          }
        } else if (error.message?.includes('Content Security Policy')) {
          errorMessage = 'Security policy error. Please try again or contact support.';
        }
        
        if (isMounted) {
          setError(errorMessage);
          setIsProcessing(false);
          const timeoutId = setTimeout(() => navigate('/login'), 5000);
          timeoutIds.push(timeoutId);
        }
      }
    };

    handleAuthCallback();

    // Clean up timeouts when unmounting
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