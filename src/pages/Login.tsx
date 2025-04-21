import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import authService from '../services/authService';
import api from '../services/api';

const Login: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      setIsLoading(true);
      setError(null);
      
      // Get the Google auth URL directly using the auth service
      const googleAuthUrl = api.auth.getGoogleAuthUrl();
      console.log('Opening Google Auth URL:', googleAuthUrl);
      
      // Open the Google auth URL in a popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        googleAuthUrl,
        'googleAuth',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setError('Popup blocked! Please allow popups for this site and try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError('Failed to start Google login. Please try again.');
      setIsLoading(false);
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

  // Listen for messages from the popup window
  const handleAuthMessage = useCallback((event: MessageEvent) => {
    if (event.data && event.data.type === 'AUTH_SUCCESS') {
      console.log('Authentication successful via popup');
      setIsLoading(false);
      
      // The auth callback component will have already set the token and user data
      // Just need to redirect to dashboard
      navigate('/dashboard');
    }
  }, [navigate]);
  
  useEffect(() => {
    // Add event listener for messages from the popup
    window.addEventListener('message', handleAuthMessage);
    
    // Parse URL parameters for error messages
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    const reason = params.get('reason');
    
    if (errorParam) {
      // Clear any lingering auth data
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (errorParam === 'invalid_grant') {
        errorMessage = 'Your authorization expired or was already used. Please try again.';
      } else if (errorParam === 'auth_failed') {
        errorMessage = reason || 'Authentication failed. Please try again.';
      } else if (errorParam === 'access_denied') {
        errorMessage = 'You denied the authorization request. Please try again and allow access.';
      }
      
      setError(errorMessage);
      
      // Remove the error parameters from URL to prevent showing the error again on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    
    // Clean up the event listener
    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
  }, [location, handleAuthMessage]);

  // Add this new function
  const testAuthProxy = async () => {
    try {
      setLoading(true);
      setError(null);
      setShowDebug(true);

      // Try a direct request to the proxy endpoint
      const proxyEndpoint = 'https://api.quits.cc/api/google-proxy';
      console.log('Testing proxy endpoint:', proxyEndpoint);
      
      const response = await fetch(proxyEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const status = response.status;
      const contentType = response.headers.get('content-type');
      
      let content;
      try {
        // Try to parse as JSON
        content = await response.json();
      } catch (e) {
        // Fallback to text
        content = await response.text();
      }
      
      setError(`Proxy test result: Status ${status}, Type: ${contentType}, Content: ${JSON.stringify(content).substring(0, 100)}...`);
    } catch (err: any) {
      console.error('Proxy test error:', err);
      setError(`Proxy test failed: ${err.message}`);
    } finally {
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
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg p-3 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mb-4"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-t-2 border-b-2 border-gray-700 rounded-full animate-spin"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <img src="/google-icon.svg" alt="Google Logo" className="w-5 h-5" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>
            
            {showDebug && (
              <div className="mt-4">
                <div className="text-sm text-gray-700 mb-2 font-medium">Troubleshooting Options</div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleDirectLogin}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Try Direct Google Login
                  </button>
                  <button
                    type="button"
                    onClick={testAuthProxy}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Test Auth Proxy
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  <p>These options help diagnose authentication issues.</p>
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