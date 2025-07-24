import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GoogleLogo from '../components/GoogleLogo';

const Welcome = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleConnect = async () => {
    try {
      setIsLoading(true);
      // Build Google OAuth URL (same logic as Signup / Login pages)
      const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const isProd = window.location.hostname !== 'localhost';
      const REDIRECT_URI = isProd
        ? 'https://www.quits.cc/auth/callback'
        : `${window.location.origin}/auth/callback`;

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: 'email profile https://www.googleapis.com/auth/gmail.readonly openid',
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent'
      });

      const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      window.location.href = url;
    } catch (error) {
      console.error('Google connect error:', error);
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <Header />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <img src={`${import.meta.env.BASE_URL}quits-logo.svg`} alt="Quits" className="h-16 w-auto mx-auto mb-6" />
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
              Welcome to Quits!
            </h2>
            <p className="text-gray-600 mb-8">
              How would you like to get started?
            </p>
          </div>
          <div className="space-y-4">
            <button
              onClick={handleGoogleConnect}
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26457A] transition-colors duration-200"
            >
              <GoogleLogo className="w-5 h-5 mr-2 flex-shrink-0" />
              Connect Gmail and Scan Automatically
            </button>
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#26457A] hover:bg-[#1c345c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26457A] transition-colors duration-200"
            >
              I'll Add Subscriptions Manually
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome; 