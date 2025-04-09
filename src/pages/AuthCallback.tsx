import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        
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
        const response = await api.auth.handleGoogleCallback(code);
        const { token } = response;

        if (!token) {
          console.error('No token received from server');
          setError('Authentication failed: No token received');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        await login(token);
        navigate('/dashboard');
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
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
      </div>
    </div>
  );
};

export default AuthCallback; 