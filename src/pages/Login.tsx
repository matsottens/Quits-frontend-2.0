import { useState, FormEvent, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import GoogleLogo from '../components/GoogleLogo';
import api from '../services/api';

const Login = () => {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Get URL query parameters
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const errorParam = query.get('error');
  const reason = query.get('reason');
  const message = query.get('message');

  // Handle URL errors on page load
  useEffect(() => {
    // Clear any previous auth data on login page
    api.auth.clearAuthData();
    
    // Handle error parameters
    if (errorParam) {
      console.log(`Login error: ${errorParam}, reason: ${reason}, message: ${message}`);
      
      if (errorParam === 'invalid_grant') {
        setError('Authentication session expired. Please try logging in again.');
      } else if (errorParam === 'session_expired') {
        setError('Your session has expired. Please sign in again.');
      } else if (message) {
        setError(message);
      } else {
        setError('Authentication error. Please try again.');
      }
    } else if (reason) {
      if (reason === 'token_missing') {
        setError('Authentication required. Please sign in.');
      } else if (reason === 'token_expired') {
        setError('Your session has expired. Please sign in again.');
      } else if (reason === 'missing_gmail_access') {
        setError('Gmail access is required. Please authorize access to your Gmail account.');
      } else if (reason === 'invalid_token') {
        setError('Invalid authentication token. Please sign in again.');
      } else if (reason === 'auth_failed') {
        setError('Authentication failed. Please try again.');
      } else if (reason === 'permission_denied') {
        setError('Access to Gmail was denied. Please try again and grant permission.');
      }
    }
  }, [errorParam, reason, message]);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setIsLoading(true);
      const { data, error } = await api.auth.signInWithEmail(email, password);
      if (error) throw error;
      // Handle successful login
      if (data?.user) {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Clear any previous authentication data
      localStorage.removeItem('token');
      localStorage.removeItem('quits_auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_state');
      console.log('Cleared previous authentication data');
      
      // First try to visit the restart-oauth endpoint to ensure all server-side state is cleared
      try {
        console.log('Visiting restart-oauth endpoint');
        await fetch('https://api.quits.cc/restart-oauth', {
          method: 'GET',
          mode: 'no-cors'
        });
      } catch (e) {
        console.log('Failed to visit restart-oauth endpoint, continuing anyway');
      }
      
      // Use the improved API service for Google auth
      const authUrl = await api.auth.getGoogleAuthUrl(email);
      
      if (authUrl) {
        console.log('Redirecting to Google OAuth...');
        // Add timestamp to track OAuth flow
        localStorage.setItem('google_auth_started', Date.now().toString());
        window.location.href = authUrl;
      } else {
        throw new Error('Failed to generate Google auth URL');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      setError(error.message || 'Failed to initiate Google login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Header />
      <div className="flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
              <div className="flex justify-center mb-6">
                <img src="/quits-logo.svg" alt="Quits" className="h-16 w-auto" />
              </div>
              <h2 className="text-center text-3xl font-extrabold text-gray-900">
                Sign in to your account
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Or{' '}
                <Link to="/signup" className="font-medium text-[#26457A] hover:text-[#1c345c]">
                  create a new account
                </Link>
              </p>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-400 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <form onSubmit={handleEmailLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#26457A] focus:border-[#26457A] sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#26457A] focus:border-[#26457A] sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#26457A] hover:bg-[#1c345c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26457A] transition-colors duration-200"
                  >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26457A] transition-colors duration-200"
                >
                  <GoogleLogo className="w-5 h-5 mr-2 flex-shrink-0" />
                  Continue with Google
                </button>
              </div>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Need help?</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/forgot-password"
                  className="font-medium text-[#26457A] hover:text-[#1c345c] transition-colors duration-200"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 