import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getParam } from '../utils/url';
import api from '../services/api';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { setLogin } from '../reducers/authSlice';

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

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    console.log(`[Auth Debug] ${info}`);
    setDebugInfo((prev) => [...prev, info]);
  };

  const handleCallback = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Extract the authorization code from the URL
      const code = getParam(location.search, 'code');
      
      if (!code) {
        throw new Error('No authorization code found in the URL');
      }
      
      addDebugInfo(`Authorization code received: ${code.substring(0, 5)}...`);
      
      // Check if we have a token in localStorage (could be from a previous direct HTML response)
      const existingToken = localStorage.getItem('token') || localStorage.getItem('quits_auth_token');
      if (existingToken) {
        addDebugInfo('Found existing token in localStorage, attempting to use it');
        try {
          const loginResult = await login(existingToken);
          addDebugInfo(`Login with existing token ${loginResult ? 'succeeded' : 'failed'}`);
          if (loginResult) {
            addDebugInfo('Authentication successful with existing token, redirecting to dashboard');
            navigate('/dashboard');
            return;
          } else {
            // Token didn't work, remove it
            localStorage.removeItem('token');
            localStorage.removeItem('quits_auth_token');
            addDebugInfo('Existing token was invalid, removed from localStorage');
          }
        } catch (e) {
          addDebugInfo(`Error using existing token: ${e instanceof Error ? e.message : String(e)}`);
          // Continue with regular code flow
        }
      }

      // Try to get a token from the API
      addDebugInfo('Requesting token from API with authorization code');
      
      try {
        // Use the auth.handleGoogleCallback method from the API service
        const result = await api.auth.handleGoogleCallback(code);
        
        addDebugInfo(`API response: ${JSON.stringify(result)}`);
        
        if (result.success && result.token) {
          addDebugInfo(`Token received from API, length: ${result.token.length}`);
          
          // Store the token
          localStorage.setItem('token', result.token);
          
          // Try to login with the token
          const loginSuccess = await login(result.token);
          
          if (loginSuccess) {
            // Update Redux state if available
            if (result.user) {
              dispatch(setLogin({
                isLoggedIn: true,
                userData: result.user
              }));
            }
            
            addDebugInfo('Login successful!');
            navigate('/dashboard');
            return;
          } else {
            throw new Error('Failed to login with the received token');
          }
        } else if (result.error === 'invalid_grant') {
          throw new Error('Authorization code has expired or already been used');
        } else if ('pending' in result && result.pending) {
          addDebugInfo('Authentication pending, redirecting to pending page');
          navigate('/auth/pending', { state: { email: result.email } });
          return;
        } else {
          throw new Error(result.message || 'Invalid response format: no token found');
        }
      } catch (apiError) {
        addDebugInfo(`API error: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
        
        // Try direct approach with the callback endpoint
        addDebugInfo('Trying direct callback endpoint');
        const response = await fetch(`https://api.quits.cc/auth/google/callback?code=${encodeURIComponent(code)}`);
        
        const contentType = response.headers.get('content-type');
        addDebugInfo(`Direct API response: ${response.status}, content-type: ${contentType}`);
        
        if (contentType && contentType.includes('text/html')) {
          addDebugInfo('Response contains HTML, attempting to extract token');
          const html = await response.text();
          
          // Try to extract token from HTML
          const extractedToken = extractTokenFromHtml(html);
          
          if (extractedToken) {
            addDebugInfo(`Successfully extracted token from HTML, length: ${extractedToken.length}`);
            
            // Try to login with the extracted token
            const loginSuccess = await login(extractedToken);
            
            if (loginSuccess) {
              addDebugInfo('Login successful with extracted token!');
              navigate('/dashboard');
              return;
            } else {
              throw new Error('Failed to login with extracted token');
            }
          } else {
            throw new Error('Received HTML but could not extract token');
          }
        } else if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          
          if (data.token) {
            addDebugInfo(`Token received in JSON response, length: ${data.token.length}`);
            
            // Try to login with the token
            const loginSuccess = await login(data.token);
            
            if (loginSuccess) {
              addDebugInfo('Login successful with JSON token!');
              navigate('/dashboard');
              return;
            } else {
              throw new Error('Failed to login with token from JSON response');
            }
          } else {
            throw new Error('No token in JSON response');
          }
        } else {
          throw new Error(`Unexpected content type from direct API: ${contentType}`);
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      setError(errorMessage);
      addDebugInfo(`Authentication error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    navigate('/login');
  };

  useEffect(() => {
    handleCallback();
  }, []);

  if (isLoading) {
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
        <RetryButton onClick={handleRetry}>
          Return to Login
        </RetryButton>
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