import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { handleGoogleCallback } from '../api';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          console.error('No authorization code found');
          navigate('/login');
          return;
        }

        const response = await handleGoogleCallback(code);
        
        if (response?.token && response?.user) {
          await login(response.token, response.user);
          navigate('/dashboard');
        } else {
          console.error('Invalid response from server:', response);
          navigate('/login');
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        // Handle specific error types
        if (error.response?.status === 500) {
          console.error('Server error:', error.response?.data);
        } else if (error.response?.status === 400) {
          console.error('Bad request:', error.response?.data);
        }
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate, login]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback; 