import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useLogo } from '../hooks/useLogo';
import GoogleLogo from '../components/GoogleLogo';
import authService from '../services/authService';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { logoUrl, handleImageError } = useLogo();
  const { login } = useAuth();

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
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Initiating Google login process');
      
      // Generate random state parameter to prevent CSRF attacks
      const stateParam = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('google_auth_state', stateParam);
      
      // Clear any previous auth data on login
      api.auth.clearAuthData();
      
      // Try the direct URL construction approach (more reliable)
      // Specifically configure to force account selection and consent to avoid invalid_grant errors
      const redirectUri = window.location.hostname === 'localhost' 
        ? 'http://localhost:5173/auth/callback'
        : 'https://www.quits.cc/auth/callback';
      
      const clientId = '82730443897-ji64k4jhk02lonkps5vu54e1q5opoq3g.apps.googleusercontent.com';
      const scope = encodeURIComponent('email profile https://www.googleapis.com/auth/gmail.readonly openid');
      
      const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
        `?client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        '&response_type=code' +
        `&scope=${scope}` +
        '&prompt=select_account+consent' + // Always force selection to avoid invalid_grant
        '&access_type=offline' +
        `&state=${stateParam}`;
      
      console.log('Redirecting to Google auth URL:', googleAuthUrl);
      window.location.href = googleAuthUrl;
      
    } catch (error) {
      console.error('Error initiating Google login:', error);
      setError('Failed to initiate Google login. Please try again later.');
      setIsLoading(false);
    }
  };

  const handleDirectLogin = async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  // New email/password login handler
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const resp = await authService.login(email, password);
      if (resp.token) {
        navigate('/dashboard');
      } else {
        setError(resp.error || 'Login failed');
      }
    } catch (err: any) {
      console.error('Email login error', err);
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setIsLoading(false);
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
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>Login - Quits</title>
      </Helmet>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center py-4">
          <img
            src={logoUrl}
            alt="Quits"
            className="h-16 w-auto"
            onError={handleImageError}
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in
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
            {/* Email/Password Form */}
            <form className="space-y-4" onSubmit={handleEmailLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#26457A] hover:bg-[#1d3557] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26457A]">
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </div>
            </form>

            <div className="flex justify-between text-sm">
              <a href="/forgot-password" className="text-primary-600 hover:text-primary-500">Forgot password?</a>
              <a href="/signup" className="text-primary-600 hover:text-primary-500">Create account</a>
            </div>

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
                  <GoogleLogo className="w-5 h-5" />
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