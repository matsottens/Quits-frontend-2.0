import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          console.error('No authorization code found');
          navigate('/login');
          return;
        }

        // Make direct request to backend
        const response = await axios.get(`${API_URL}/auth/google/callback`, {
          params: { code },
          withCredentials: true
        });
        
        const { token, user } = response.data;
        
        if (token) {
          await login(token);
          navigate('/dashboard');
        } else {
          console.error('Invalid response from server:', response.data);
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        if (axios.isAxiosError(error)) {
          console.error('Server response:', error.response?.data);
        }
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback; 