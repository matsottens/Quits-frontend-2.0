import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import authService from '../services/authService';

const AuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get code and state from URL
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');

        // Check for error parameter from Google
        if (errorParam) {
          console.error('Google returned an error:', errorParam);
          navigate(`/login?error=${errorParam}`);
          return;
        }

        // Verify we have a code
        if (!code) {
          const errorMsg = 'No authorization code received from Google';
          console.error(errorMsg);
          navigate('/login?error=auth_failed&reason=missing_code');
          return;
        }

        // Make API call to exchange the code for tokens
        setProcessing(true);
        
        try {
          console.log('Processing OAuth code:', code.substring(0, 10) + '...');
          
          // Call the backend to process the OAuth code
          const response = await fetch(`https://api.quits.cc/api/auth/google/callback?code=${encodeURIComponent(code)}`);
          
          // Log the response status and content type for debugging
          console.log('Auth callback response status:', response.status);
          console.log('Content-Type:', response.headers.get('content-type'));
          
          // Check if response is JSON before trying to parse it
          const contentType = response.headers.get('content-type');
          
          // Handle HTML responses (which indicate an error)
          if (contentType && contentType.includes('text/html')) {
            const htmlText = await response.text();
            console.error('Received HTML response instead of JSON:', htmlText.substring(0, 200) + '...');
            throw new Error('Received HTML instead of JSON response. The API server might be returning an error page.');
          }
          
          // Parse JSON response
          const result = await response.json();
          console.log('Auth callback result:', result);
          
          if (!response.ok) {
            throw new Error(result.message || 'Authentication failed');
          }
          
          // If successful, store the token
          if (result.success && result.token) {
            console.log('Token received, storing and redirecting');
            authService.setToken(result.token);
            
            // Redirect to dashboard
            setTimeout(() => {
              navigate('/dashboard');
            }, 500);
            return;
          }
          
          // Handle special case for pending scan
          if (result && 'pending' in result && result.pending) {
            console.log('Pending scan detected, redirecting to scanning page');
            // Redirect to scanning page
            navigate('/scanning');
            return;
          }
          
          // If we get here without a token, something went wrong
          throw new Error('No valid authentication token received');
        } catch (error: any) {
          console.error('Auth callback error:', error);
          
          // Check if the error is from parsing JSON
          if (error instanceof SyntaxError && error.message.includes('JSON')) {
            console.error('Failed to parse JSON response, likely received HTML error page');
            // Try direct authentication as a fallback
            navigate('/login?error=api_error&reason=invalid_response_format');
            return;
          }
          
          // Handle specific errors
          if (error.message && error.message.includes('invalid_grant')) {
            navigate('/login?error=invalid_grant');
            return;
          }
          
          if (error.message && error.message.includes('auth_code_already_used')) {
            navigate('/login?error=invalid_grant&reason=code_reused');
            return;
          }
          
          if (error.message && error.message.includes('auth_failed')) {
            navigate('/login?error=auth_failed');
            return;
          }
          
          // Use direct URL as fallback for API errors
          if (error.message && error.message.includes('API')) {
            console.log('API error detected, trying alternative approach');
            // Try using a direct Google auth URL as a last resort
            const clientId = '82730443897-ji64k4jhk02lonkps5vu54e1q5opoq3g.apps.googleusercontent.com';
            console.log('Redirecting to login with API error message');
            navigate('/login?error=api_error&reason=endpoint_unavailable');
            return;
          }
          
          // Generic error handler
          setError(`Authentication error: ${error.message}`);
          setProcessing(false);
        }
      } catch (error: any) {
        console.error('Error processing callback:', error);
        setError(`An unexpected error occurred: ${error.message}`);
        setProcessing(false);
      }
    };

    // Execute the callback handler
    handleCallback();
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Authenticating - Quits</title>
      </Helmet>
      
      <div className="max-w-md w-full space-y-8 text-center">
        {error ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Authentication Failed</h3>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Return to Login
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mx-auto h-10 w-10">
              <svg className="animate-spin h-10 w-10 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Authenticating...</h3>
            <p className="mt-2 text-sm text-gray-500">Please wait while we complete your authentication process.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 