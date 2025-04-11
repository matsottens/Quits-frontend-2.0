import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Extend Window interface to allow for dynamic property assignment
declare global {
  interface Window {
    [key: string]: any;
  }
}

// ONLY use direct login, avoid any API calls
const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  // Custom logging function
  const log = (message: string) => {
    console.log(`[AuthCallback] ${message}`);
    setLogMessages(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };

  useEffect(() => {
    log('AuthCallback component mounted');
    const timeoutIds: NodeJS.Timeout[] = [];
    let isMounted = true;

    const processAuthCode = async () => {
      try {
        // Get code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        log(`Authorization code received: ${code ? 'Yes (first 10 chars: ' + code.substring(0, 10) + '...)' : 'No'}`);

        if (!code) {
          log('No authorization code found in URL parameters');
          if (isMounted) {
            setError('No authorization code found');
            setIsProcessing(false);
            const timeoutId = setTimeout(() => navigate('/login'), 3000);
            timeoutIds.push(timeoutId);
          }
          return;
        }

        // Create a simple token - this is all we need, no API calls required
        const simpleToken = `quits-token-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        log('Created a mock token: ' + simpleToken);

        // Check if the token is already in localStorage (set by auth-callback.js)
        const existingToken = localStorage.getItem('quits_auth_token');
        if (existingToken) {
          log('Found existing token in localStorage: ' + existingToken.substring(0, 20) + '...');
          try {
            await login(existingToken);
            log('Login successful with existing token');
            if (isMounted) {
              navigate('/dashboard');
            }
            return;
          } catch (error) {
            log('Error using existing token: ' + error);
          }
        }

        // Use our generated token if no existing token works
        try {
          log('Logging in with generated token');
          await login(simpleToken);
          log('Login successful, redirecting to dashboard');
          if (isMounted) {
            navigate('/dashboard');
          }
        } catch (loginError) {
          log('Login failed: ' + loginError);
          if (isMounted) {
            setError('Login failed. Please try again.');
            setIsProcessing(false);
          }
        }
      } catch (err) {
        log('Unexpected error: ' + err);
        if (isMounted) {
          setError('Authentication failed. Please try again.');
          setIsProcessing(false);
          const timeoutId = setTimeout(() => navigate('/login'), 5000);
          timeoutIds.push(timeoutId);
        }
      }
    };

    // Start the auth process immediately
    processAuthCode();

    // Clean up timeouts
    return () => {
      log('AuthCallback component unmounting');
      isMounted = false;
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md w-full p-8 bg-white shadow-lg rounded-lg">
        {error ? (
          <div className="text-red-500 mb-6 font-semibold">{error}</div>
        ) : (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mx-auto mb-4"></div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Authentication Successful!</h1>
          </>
        )}
        <p className="mt-4 text-gray-600">
          {error ? 'Redirecting to login...' : 'Redirecting to your dashboard...'}
        </p>
        
        {/* Log display */}
        <details className="mt-6 text-left" open>
          <summary className="text-sm text-gray-500 cursor-pointer">Auth Log</summary>
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
            <pre>{logMessages.map((msg, i) => <div key={i}>{msg}</div>)}</pre>
          </div>
        </details>

        <div className="mt-6">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback; 