import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import axios from 'axios';

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
        
        // Log debugging information without using api.defaults that doesn't exist
        setDebugInfo(`Using origin: ${window.location.origin}, Code: ${code?.substring(0, 10)}...`);
        console.log(`Auth callback initiated. Host: ${window.location.hostname}, Origin: ${window.location.origin}`);
        
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

        // Exchange the code for a token using the auth service
        console.log('Attempting to exchange code for token...');
        const response = await api.auth.handleGoogleCallback(code);
        const { token } = response;

        if (!token) {
          console.error('No token received from server');
          setError('Authentication failed: No token received');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        console.log('Token received, logging in...');
        await login(token);
        navigate('/dashboard');
      } catch (error: unknown) {
        console.error('Auth callback error:', error);
        // Properly type check and handle the unknown error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(`Authentication failed: ${errorMessage}`);
        setTimeout(() => navigate('/login'), 5000);
      }
    };

    handleCallback();
  }, [navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <div className="text-red-500 mb-4">{error}</div>
        ) : (
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        )}
        <p className="mt-4 text-gray-600">
          {error ? 'Redirecting to login...' : 'Completing authentication...'}
        </p>
        {(error || debugInfo) && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-left overflow-auto max-w-md max-h-32">
            <pre>{debugInfo || ''}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 