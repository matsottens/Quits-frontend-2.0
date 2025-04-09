import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

// ONLY use direct axios calls, avoid importing the api service entirely
const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    // Define the function inside the effect to avoid any closure issues
    const handleOAuthCallback = async () => {
      try {
        // Get code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        // Log debug info
        const debugObj = {
          url: window.location.href,
          code: code ? `${code.substring(0, 15)}...` : 'none',
          hostname: window.location.hostname,
          time: new Date().toISOString()
        };
        console.log('Auth callback debug:', debugObj);
        setDebugInfo(JSON.stringify(debugObj, null, 2));
        
        if (!code) {
          setError('No authorization code found');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        
        // Make direct call to the production API
        console.log('Making direct API call to production endpoint');
        const apiUrl = 'https://api.quits.cc/auth/google/callback';
        const fullUrl = `${apiUrl}?code=${code}`;
        console.log('Requesting:', fullUrl);
        
        const response = await axios({
          method: 'GET',
          url: fullUrl,
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log('Auth response:', response.data);
        
        if (response.data?.token) {
          // Success! Log the user in
          await login(response.data.token);
          navigate('/dashboard');
        } else {
          console.error('No token in response:', response.data);
          setError('Authentication failed: No token received');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (err) {
        // Handle the error
        console.error('Auth callback error:', err);
        setError(`Authentication failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        
        // Always redirect to login after error
        setTimeout(() => navigate('/login'), 5000);
      }
    };

    // Call the function
    handleOAuthCallback();
  }, [navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md w-full p-6 bg-white shadow-md rounded-lg">
        {error ? (
          <div className="text-red-500 mb-4 font-semibold">{error}</div>
        ) : (
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        )}
        <p className="mt-4 text-gray-600">
          {error ? 'Redirecting to login...' : 'Completing authentication...'}
        </p>
        {debugInfo && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-left overflow-auto max-h-48">
            <pre>{debugInfo}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 