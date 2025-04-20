import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import authService from '../services/authService';

const Login: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

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
      } else if (errorParam === 'api_error') {
        if (reasonParam === 'invalid_response_format') {
          setError('Our authentication server is returning an invalid response. Please try again later or contact support.');
        } else if (reasonParam === 'endpoint_unavailable') {
          setError('Unable to connect to our authentication server. Please try again later.');
        } else {
          setError(`API error: ${reasonParam || 'Unknown issue'}`);
        }
      } else if (reasonParam) {
        setError(`Authentication error: ${reasonParam}`);
      } else {
        setError(`Authentication error: ${errorParam}`);
      }
      
      // Show debug panel for API errors
      if (errorParam === 'api_error') {
        setShowDebug(true);
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

  const handleDirectLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create direct Google auth URL
      const clientId = '82730443897-ji64k4jhk02lonkps5vu54e1q5opoq3g.apps.googleusercontent.com';
      const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
      const scope = encodeURIComponent('email profile https://www.googleapis.com/auth/gmail.readonly openid');
      const state = Date.now().toString();
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account+consent&state=${state}`;
      
      // Redirect to Google authentication
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('Direct login error:', err);
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
          <div className="text-4xl font-bold text-primary-600">Quits</div>
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
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M12.2461 14.5C13.0971 14.5 13.8341 14.176 14.4281 13.61L17.5861 16.755C16.1051 18.162 14.2581 19 12.2461 19C8.66413 19 5.59713 16.632 4.63013 13.345L1.31213 16.656V11.001H6.96713L4.21613 13.751C4.84613 16.123 7.29013 18 10.2461 18C11.4001 18 12.4951 17.701 13.4361 17.145L10.6951 14.415C10.2211 14.461 9.74113 14.5 9.25013 14.5C7.76013 14.5 6.45713 14.051 5.44113 13.268L5.44213 13.267C4.41313 12.474 3.75013 11.32 3.75013 10C3.75013 8.68 4.41313 7.526 5.44213 6.733L5.44113 6.732C6.45713 5.949 7.76013 5.5 9.25013 5.5C11.6301 5.5 13.6051 7.007 14.1221 9.079H9.25013V11.825H17.1851C17.3671 11.278 17.5001 10.713 17.5001 10C17.5001 7.791 16.3761 5.805 14.6381 4.58L14.6401 4.579C13.1341 3.497 11.2751 3 9.25013 3C6.43513 3 3.92413 4.243 2.37313 6.251L2.37213 6.25C0.837131 8.234 0.000131279 10.724 0.000131279 13.5C0.000131279 16.276 0.837131 18.766 2.37213 20.75L2.37313 20.749C3.92413 22.757 6.43513 24 9.25013 24C11.2751 24 13.1341 23.503 14.6401 22.421L14.6381 22.42C16.8071 20.982 18.3471 18.585 18.8471 16H12.2461V14.5Z"
                        fill="#4285F4"
                      />
                    </svg>
                  </span>
                  Continue with Google
                </>
              )}
            </button>
            
            {showDebug && (
              <div className="mt-4">
                <div className="text-sm text-gray-700 mb-2 font-medium">Having trouble logging in?</div>
                <button
                  type="button"
                  onClick={handleDirectLogin}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 relative"
                >
                  Try Direct Google Login
                </button>
                <div className="mt-2 text-xs text-gray-500">
                  <p>This bypasses our authentication server and connects directly to Google.</p>
                </div>
              </div>
            )}
            
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