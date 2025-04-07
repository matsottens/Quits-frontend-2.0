import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processAuth = async () => {
      try {
        const token = searchParams.get('token');
        
        if (!token) {
          setError('No authentication token received');
          return;
        }
        
        // Store token in auth context
        login(token);
        
        // Redirect to scanning page after successful login
        navigate('/scanning');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Failed to process authentication');
      }
    };
    
    processAuth();
  }, [searchParams, login, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="text-center text-3xl font-extrabold text-gray-900">Authentication Error</h1>
            <p className="mt-2 text-center text-sm text-gray-600">{error}</p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="animate-pulse">
          <h1 className="text-center text-3xl font-extrabold text-gray-900">Authenticating...</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please wait while we complete the authentication process.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback; 