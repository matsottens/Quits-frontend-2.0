import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import axios from 'axios';

// Create a standalone authApi instance for fallback with correct URL structure
const authApi = axios.create({
  baseURL: 'https://api.quits.cc',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to fix any incorrect paths
authApi.interceptors.request.use(config => {
  // Remove /api prefix if present - the authApi URL is already correct
  if (config.url?.startsWith('/api/')) {
    config.url = config.url.replace('/api/', '/');
    console.log(`Fixed URL path in AuthCallback, now requesting: ${config.baseURL}${config.url}`);
  }
  return config;
});

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        
        // Enhanced debugging information
        const debugDetails = {
          hostname: window.location.hostname,
          origin: window.location.origin,
          code: code ? `${code.substring(0, 10)}...` : 'none',
          errorParam,
          isProd: window.location.hostname !== 'localhost',
        };
        
        setDebugInfo(JSON.stringify(debugDetails, null, 2));
        console.log('Auth callback details:', debugDetails);
        
        if (errorParam) {
          console.error('Error in callback URL:', errorParam);
          setError(`Authentication error: ${errorParam}`);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        
        if (!code) {
          console.error('No authorization code found in callback URL');
          setError('Missing authorization code');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Skip the api service and make direct call to the correct endpoint
        console.log('Making direct API call to the auth endpoint');
        const endpoint = `/auth/google/callback?code=${code}`;
        console.log(`Requesting: https://api.quits.cc${endpoint}`);
        
        try {
          const response = await authApi.get(endpoint);
          
          if (response.data?.token) {
            console.log('Authentication succeeded, logging in...');
            await login(response.data.token);
            navigate('/dashboard');
            return;
          } else {
            console.error('No token received in response:', response.data);
            setError('Authentication failed: No token received');
            setTimeout(() => navigate('/login'), 3000);
          }
        } catch (apiError) {
          console.error('Auth API call failed:', apiError);
          setError(`Authentication failed: ${apiError instanceof Error ? apiError.message : 'API error'}`);
          setTimeout(() => navigate('/login'), 5000);
        }
      } catch (error: unknown) {
        console.error('Auth callback error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(`Authentication failed: ${errorMessage}`);
        setTimeout(() => navigate('/login'), 5000);
      }
    };

    handleCallback();
  }, [navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md w-full p-6 bg-white shadow-md rounded-lg">
        {error ? (
          <div className="text-red-500 mb-4 font-semibold">{error}</div>
        ) : (
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        )}
        <p className="mt-4 text-gray-600">
          {error ? 'Redirecting to login...' : 'Completing authentication...'}
        </p>
        {(error || debugInfo) && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-left overflow-auto max-h-48">
            <pre>{debugInfo || ''}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 