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
          
          // Redirect to phone number screen instead of scanning page
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
              <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
                Authentication Error
              </h2>
            </div>

            <div className="mt-6">
              <div className="bg-red-50 border border-red-400 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#26457A] hover:bg-[#1c345c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26457A]"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Completing Authentication</h2>
          <LoadingSpinner />
          <p className="mt-4 text-sm text-gray-600">Please wait while we complete the authentication process...</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback; 