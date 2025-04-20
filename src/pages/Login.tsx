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
      
      // Store a timestamp to track how long the process takes
      localStorage.setItem('auth_started', Date.now().toString());
      
      // First check if the API is reachable
      try {
        const healthCheck = await fetch('https://api.quits.cc/api/health', {
          method: 'GET',
          mode: 'no-cors', // Avoid CORS issues
          cache: 'no-store'
        });
        console.log('API health check complete');
      } catch (e) {
        console.warn('API health check failed, continuing anyway:', e);
      }
      
      // Use the improved API service for Google auth
      const authUrl = await api.auth.getGoogleAuthUrl(email);
      
      if (authUrl) {
        console.log('Redirecting to Google OAuth...');
        // Add timestamp to track OAuth flow
        localStorage.setItem('google_auth_started', Date.now().toString());
        
        // Show a simple message to the user
        alert('You will now be redirected to Google for authentication. After signing in with Google, you will be returned to this site automatically.');
        
        // Redirect to Google
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
    <div className="min-h-screen flex justify-center items-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img className="mx-auto h-12 w-auto" src="/quits-logo.svg" alt="Quits Logo" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Manage your subscriptions with Quits
          </p>
          
          {/* Error display */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isLoading ? (
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                ) : (
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                    </svg>
                  </span>
                )}
                <span>{isLoading ? "Signing in..." : "Continue with Google"}</span>
              </button>
            </div>
          </div>
          
          {/* API Connection Testing Section */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Having issues?</span>
              </div>
            </div>
            
            <div className="mt-6 flex flex-col space-y-3">
              <button
                onClick={() => window.open('https://api.quits.cc/api/debug-env', '_blank')}
                className="text-sm text-gray-600 hover:text-blue-800 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Debug API Connection
              </button>
              
              <button
                onClick={() => window.open('https://www.quits.cc/test-auth', '_blank')}
                className="text-sm text-gray-600 hover:text-blue-800 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Advanced Testing
              </button>
              
              <a 
                href="mailto:support@quits.cc?subject=Login%20Issue&body=I'm%20having%20trouble%20logging%20in%20to%20Quits."
                className="text-sm text-gray-600 hover:text-blue-800 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 