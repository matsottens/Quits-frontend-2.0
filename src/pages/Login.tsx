import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import authService from '../services/authService';
import { ReactComponent as GoogleIcon } from '../assets/google.svg';
import { ReactComponent as Logo } from '../assets/logo.svg';

const Login: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error parameters in URL
    const searchParams = new URLSearchParams(location.search);
    const errorParam = searchParams.get('error');
    const reasonParam = searchParams.get('reason');
    
    // Clear any existing auth data on login page load
    localStorage.removeItem('token');
    localStorage.removeItem('quits_auth_token');
    
    // Set error message based on URL parameters
    if (errorParam) {
      if (errorParam === 'invalid_grant') {
        setError('Your authentication code has expired. Please try logging in again.');
      } else if (errorParam === 'auth_failed') {
        setError('Authentication failed. Please try again.');
      } else if (errorParam === 'token_storage') {
        setError('Failed to store authentication token. Please ensure cookies and localStorage are enabled.');
      } else if (reasonParam) {
        setError(`Authentication error: ${reasonParam}`);
      } else {
        setError(`Authentication error: ${errorParam}`);
      }
    }
  }, [location]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use authService to get Google auth URL
      const authUrl = await authService.getGoogleAuthUrl();
      
      // Redirect to Google for authentication
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('Google login error:', err);
      setError('Failed to start Google login process. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>Login - Quits</title>
      </Helmet>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo className="h-16 w-auto" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to Quits
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Manage your subscriptions with ease
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 relative"
            >
              {loading ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              ) : (
                <>
                  <span className="mr-2">
                    <GoogleIcon className="h-5 w-5" />
                  </span>
                  Continue with Google
                </>
              )}
            </button>
            
            <div className="text-sm text-center text-gray-600">
              <p>By signing in, you agree to our <a href="/terms" className="font-medium text-primary-600 hover:text-primary-500">Terms of Service</a> and <a href="/privacy" className="font-medium text-primary-600 hover:text-primary-500">Privacy Policy</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 