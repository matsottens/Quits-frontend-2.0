import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const redirectUrl = window.location.origin + '/auth/callback';
      const response = await login('google', redirectUrl);
      if (response?.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (err) {
      setError('Failed to initialize Google login. Please try again.');
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
                <img src="/quits-logo.svg" alt="Quits" className="h-12 w-12" />
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
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#26457A] hover:bg-[#1c345c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26457A] transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545,12.151L12.545,12.151c0,1.054,0.855,1.909,1.909,1.909h3.536c-0.447,1.722-1.498,3.39-2.945,4.624 c-1.447,1.234-3.264,1.91-5.045,1.91c-2.068,0-4.021-0.806-5.488-2.273C3.044,16.854,2.238,14.901,2.238,12.833 c0-2.068,0.806-4.021,2.273-5.488c1.467-1.467,3.42-2.273,5.488-2.273c2.437,0,4.786,1.132,6.272,3.049l2.914-2.914 c-2.199-2.831-5.567-4.45-9.186-4.45c-3.247,0-6.291,1.264-8.587,3.561C-1.264,6.542,0,9.586,0,12.833 c0,3.247,1.264,6.291,3.561,8.587c2.296,2.296,5.34,3.561,8.587,3.561c3.247,0,6.291-1.264,8.587-3.561 c2.296-2.296,3.561-5.34,3.561-8.587c0-0.647-0.061-1.292-0.182-1.923h-9.66C12.545,10.91,12.545,12.151,12.545,12.151z"/>
                </svg>
                {isLoading ? 'Signing in...' : 'Continue with Google'}
              </button>
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