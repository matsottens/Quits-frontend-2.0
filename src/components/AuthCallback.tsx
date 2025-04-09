import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { handleGoogleCallback } from '../api';
import axios from 'axios';

interface AuthResponse {
  token: string;
  user: {
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

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        // Create debug info
        const debugObj = {
          url: window.location.href,
          code: code ? `${code.substring(0, 15)}...` : 'none',
          timestamp: new Date().toISOString()
        };
        setDebugInfo(JSON.stringify(debugObj, null, 2));
        
        if (!code) {
          console.error('No authorization code found');
          setError('No authorization code found');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Try to get token from server
        const response = await handleGoogleCallback(code) as AuthResponse;
        
        if (response?.token) {
          await login(response.token);
          // Redirect to scanning page instead of dashboard
          navigate('/scanning');
        } else {
          console.error('Invalid response from server:', response);
          setError('Invalid server response');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        
        let errorMessage = 'Authentication failed';
        
        // Handle specific error types
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          } else if (error.response?.status === 400) {
            errorMessage = 'Invalid request. Please try again.';
          } else if (error.code === 'ERR_NETWORK') {
            errorMessage = 'Network error. Please check your connection.';
          }
        }
        
        setError(errorMessage);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
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