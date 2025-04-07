import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Extract the authorization code from URL parameters
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        
        if (!code) {
          setError('No authorization code received');
          return;
        }
        
        // Exchange the code for tokens and user data
        const { data } = await api.auth.handleGoogleCallback(code);
        
        if (data.error) {
          setError(data.error);
          return;
        }

        if (data.user && data.token) {
          // Save user data and token in auth context
          await login(data.user, data.token);
          
          // Redirect to phone number screen
          navigate('/add-phone');
        } else {
          setError('Authentication failed');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Failed to complete authentication');
      }
    };

    handleAuthCallback();
  }, [location, navigate, login]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Authentication Error</h2>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#26457A] hover:bg-[#1c345c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26457A]"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-sm text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback; 