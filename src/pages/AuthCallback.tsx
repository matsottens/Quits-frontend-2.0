import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { getParam } from '../utils/url';
import { api } from '../services/api';
import styled from 'styled-components';
import { setLogin } from '../reducers/authSlice';
import { useDispatch } from 'react-redux';

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  padding: 0 20px;
`;

const Spinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #09f;
  animation: spin 1s linear infinite;
  margin: 20px 0;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const ErrorContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  background-color: #f8d7da;
  color: #721c24;
  max-width: 600px;
`;

const RetryButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  margin-top: 15px;
  cursor: pointer;
  font-weight: bold;

  &:hover {
    background-color: #0069d9;
  }
`;

const DebugContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f8f9fa;
  color: #212529;
  max-width: 800px;
  text-align: left;
  overflow-x: auto;
  font-family: monospace;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
`;

// Function to extract token from HTML response
function extractTokenFromHtml(html: string): string | null {
  console.log('Attempting to extract token from HTML response');
  
  try {
    // Look for a token pattern in the HTML
    // This pattern matches a token being assigned to a variable or as a string
    const tokenPatterns = [
      /const token = ['"]([^'"]+)['"]/,
      /token = ['"]([^'"]+)['"]/,
      /['"]token['"]:\s*['"]([^'"]+)['"]/,
      /['"]([A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+)['"]/
    ];
    
    // Try each pattern
    for (const pattern of tokenPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const token = match[1];
        console.log(`Found token in HTML (${pattern}), length: ${token.length}`);
        // Verify it looks like a JWT (xxx.yyy.zzz format)
        if (/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+$/.test(token)) {
          console.log('Token appears to be a valid JWT format');
          return token;
        }
        console.log('Token does not match JWT format, continuing search');
      }
    }
    
    // If no direct token find, search for a JSON object containing a token
    const jsonMatch = html.match(/(\{[\s\S]*?"token"[\s\S]*?\})/);
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1].replace(/'/g, '"');
        const parsed = JSON.parse(jsonStr);
        if (parsed.token) {
          console.log(`Found token in JSON object, length: ${parsed.token.length}`);
          return parsed.token;
        }
      } catch (e) {
        console.log('Failed to parse JSON object:', e);
      }
    }
    
    console.log('No token found in HTML response');
    return null;
  } catch (e) {
    console.error('Error extracting token from HTML:', e);
    return null;
  }
}

const AuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const dispatch = useDispatch();
  const [isProcessing, setIsProcessing] = useState(true);

  const addDebugInfo = (info: string) => {
    console.log(`[Auth Debug] ${info}`);
    setDebugInfo((prev) => [...prev, info]);
  };

  const handleCallback = async () => {
    addDebugInfo('Starting auth callback processing');
    setIsProcessing(true);
    
    try {
      // Extract code from URL
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const error = params.get('error');
      
      if (error) {
        addDebugInfo(`Auth error from Google: ${error}`);
        const reason = params.get('error_reason') || '';
        
        // Handle specific error types
        if (error === 'access_denied') {
          throw new Error('You denied the authentication request. Please try again and allow access.');
        } else {
          throw new Error(`Authentication failed: ${error}${reason ? ` (${reason})` : ''}`);
        }
      }
      
      if (!code) {
        addDebugInfo('No authorization code found in URL');
        throw new Error('No authorization code received. Please try logging in again.');
      }
      
      addDebugInfo(`Got authorization code: ${code.substring(0, 5)}...`);
      
      // Exchange code for token
      try {
        addDebugInfo('Attempting to exchange code for token');
        const response = await api.post('/auth/google/callback', { code });
        
        if (response.data && response.data.token) {
          addDebugInfo('Successfully received token as JSON');
          
          // Store the token, user data, and redirect
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('userData', JSON.stringify(response.data.user || {}));
          
          // Update Redux store
          dispatch(setLogin({
            isLoggedIn: true,
            userData: response.data.user || {}
          }));
          
          // If this is a popup, communicate back to opener and close
          if (window.opener && !window.opener.closed) {
            addDebugInfo('Sending success message to opener window');
            window.opener.postMessage({ type: 'AUTH_SUCCESS', token: response.data.token, user: response.data.user }, '*');
            setTimeout(() => window.close(), 1000);
          } else {
            // Otherwise redirect to dashboard
            addDebugInfo('Redirecting to dashboard');
            navigate('/dashboard');
          }
          return;
        }
      } catch (err: any) {
        // Handle JSON parsing error - the response might be HTML
        addDebugInfo(`Error with JSON response: ${err.message}`);
        
        if (err.response && typeof err.response.data === 'string') {
          addDebugInfo('Response is HTML, attempting to extract token');
          const token = extractTokenFromHtml(err.response.data);
          
          if (token) {
            addDebugInfo('Successfully extracted token from HTML');
            
            // Try to get user info with the token
            try {
              api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
              const userResponse = await api.get('/auth/me');
              
              if (userResponse.data) {
                // Store the token, user data, and redirect
                localStorage.setItem('token', token);
                localStorage.setItem('userData', JSON.stringify(userResponse.data));
                
                // Update Redux store
                dispatch(setLogin({
                  isLoggedIn: true,
                  userData: userResponse.data
                }));
                
                // If this is a popup, communicate back to opener and close
                if (window.opener && !window.opener.closed) {
                  addDebugInfo('Sending success message to opener window');
                  window.opener.postMessage({ type: 'AUTH_SUCCESS', token, user: userResponse.data }, '*');
                  setTimeout(() => window.close(), 1000);
                } else {
                  // Otherwise redirect to dashboard
                  addDebugInfo('Redirecting to dashboard');
                  navigate('/dashboard');
                }
                return;
              }
            } catch (userErr) {
              addDebugInfo(`Failed to get user info with token: ${userErr}`);
            }
          }
        }
        
        // If we couldn't extract a token from HTML or there's some other issue
        throw new Error(err.response?.data?.message || err.message || 'Failed to exchange code for token');
      }
    } catch (error: any) {
      console.error('Auth callback error:', error);
      setError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // Clear any stale auth data
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    
    handleCallback();
    
    // Listen for messages from other windows (if this is the opener)
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'AUTH_SUCCESS') {
        console.log('Received auth success message from popup');
        
        // Store the token and user data
        localStorage.setItem('token', event.data.token);
        if (event.data.user) {
          localStorage.setItem('userData', JSON.stringify(event.data.user));
        }
        
        // Update Redux store
        dispatch(setLogin({
          isLoggedIn: true,
          userData: event.data.user || {}
        }));
        
        // Redirect to dashboard
        navigate('/dashboard');
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [dispatch, location, navigate]);

  const handleRetry = () => {
    navigate('/login');
  };

  if (isProcessing) {
    return (
      <LoadingContainer>
        <h1>Authenticating...</h1>
        <Spinner />
        <p>Please wait while we complete the authentication process</p>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <LoadingContainer>
        <h1>Authentication Error</h1>
        <ErrorContainer>
          <p>{error}</p>
        </ErrorContainer>
        <p>We encountered an error while trying to log you in.</p>
        <div>
          <RetryButton onClick={handleRetry}>
            Return to Login
          </RetryButton>
        </div>
        <DebugContainer>
          <h4>Debug Information</h4>
          {debugInfo.map((info, index) => (
            <div key={index}>{info}</div>
          ))}
        </DebugContainer>
      </LoadingContainer>
    );
  }

  return (
    <LoadingContainer>
      <h1>Authentication Complete</h1>
      <p>Redirecting to dashboard...</p>
      <Spinner />
    </LoadingContainer>
  );
};

export default AuthCallback; 