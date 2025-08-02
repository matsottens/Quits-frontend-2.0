import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getParam } from '../utils/url';
import api from '../services/api';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { setLogin } from '../reducers/authSlice';
import axios from 'axios';

// Global debug info array for use in utility functions
let debugInfoArray: string[] = [];
// Function to add debug info that can be used by both component and utility functions
const addDebugInfo = (message: string) => {
  const timestamp = new Date().toISOString();
  debugInfoArray.push(`${timestamp}: ${message}`);
  // If the component's state setter is available, update it
  if (typeof updateDebugState === 'function') {
    updateDebugState(`${timestamp}: ${message}`);
  }
};

// Reference to the component's setState function for debug info
let updateDebugState: ((message: string) => void) | null = null;

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

function extractTokenFromHtml(htmlContent: string): string | null {
  addDebugInfo('Attempting to extract token from HTML');
  
  if (!htmlContent) {
    addDebugInfo('Empty HTML content received');
    return null;
  }
  
  // First attempt: Try to find JSON format in script tags
  try {
    const jsonMatch = htmlContent.match(/<script[^>]*>\s*({[^<]+})\s*<\/script>/);
    if (jsonMatch && jsonMatch[1]) {
      const jsonData = JSON.parse(jsonMatch[1]);
      if (jsonData.token) {
        addDebugInfo('Token found in JSON format');
        return jsonData.token;
      }
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    addDebugInfo(`JSON extraction failed: ${errorMessage}`);
  }

  // Second attempt: Direct token format
  try {
    const tokenRegex = /"token"\s*:\s*"([^"]+)"/;
    const tokenMatch = htmlContent.match(tokenRegex);
    if (tokenMatch && tokenMatch[1]) {
      addDebugInfo('Token found via regex');
      return tokenMatch[1];
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    addDebugInfo(`Regex extraction failed: ${errorMessage}`);
  }

  // Third attempt: Look for JWT-like strings
  try {
    const jwtRegex = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/;
    const jwtMatch = htmlContent.match(jwtRegex);
    if (jwtMatch && jwtMatch[0]) {
      addDebugInfo('JWT-like token found');
      return jwtMatch[0];
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    addDebugInfo(`JWT extraction failed: ${errorMessage}`);
  }

  // Fourth attempt: Look for localstorage code
  try {
    const localStorageRegex = /localStorage\.setItem\(['"]token['"],\s*['"]([^'"]+)['"]\)/;
    const localStorageMatch = htmlContent.match(localStorageRegex);
    if (localStorageMatch && localStorageMatch[1]) {
      addDebugInfo('Token found in localStorage code');
      return localStorageMatch[1];
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    addDebugInfo(`localStorage extraction failed: ${errorMessage}`);
  }
  
  // Fifth attempt: Look for any string that resembles a base64-encoded JWT
  try {
    const base64Regex = /["']([A-Za-z0-9-_=]{40,})["']/g;
    const matches = [...htmlContent.matchAll(base64Regex)];
    
    for (const match of matches) {
      const possibleToken = match[1];
      // Check if it looks like a JWT (3 parts separated by dots)
      if (possibleToken.split('.').length === 3) {
        addDebugInfo('Potential JWT found in base64 pattern');
        return possibleToken;
      }
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    addDebugInfo(`Base64 extraction failed: ${errorMessage}`);
  }

  addDebugInfo('Failed to extract token from HTML');
  return null;
}

// Function to verify and process the token with retry logic
async function verifyAndProcessToken(token: string, maxRetries = 3, dispatch: any, login: ((token: string) => Promise<boolean>) | undefined): Promise<boolean> {
  addDebugInfo(`Verifying token with ${maxRetries} retries available`);
  
  let retries = 0;
  while (retries <= maxRetries) {
    try {
      // Store the token in localStorage
      localStorage.setItem('token', token);
      addDebugInfo(`Token stored in localStorage (attempt ${retries + 1})`);
      
      // Verify the token is stored correctly
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        throw new Error('Token storage verification failed');
      }
      
      // Update Redux store with proper object format
      dispatch(setLogin({ 
        isLoggedIn: true,
        userData: { token }
      }));
      
      // Update AuthContext
      if (login) {
        const loginSuccess = await login(token);
        if (loginSuccess) {
          addDebugInfo('Auth context updated successfully');
        } else {
          addDebugInfo('Auth context login returned false');
        }
      } else {
        addDebugInfo('Warning: login function not available');
      }
      
      // Verify token with API
      try {
        // Use the root-level verifyToken method for compatibility
        const response = await api.verifyToken(token);
        if (response && response.success) {
          addDebugInfo('Token verified with API');
          return true;
        } else {
          throw new Error('Token verification failed with API');
        }
      } catch (apiError: unknown) {
        const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        addDebugInfo(`API verification error: ${errorMessage}`);
        // Continue with navigation if API verification fails but we have a token
        // This allows offline mode to work in case API is down
        return true;
      }
    } catch (error: unknown) {
      retries++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDebugInfo(`Token verification attempt ${retries} failed: ${errorMessage}`);
      
      if (retries > maxRetries) {
        addDebugInfo('Max retries reached, verification failed');
        return false;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
    }
  }
  
  return false;
}

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [isProcessingToken, setIsProcessingToken] = useState(false);
  const [authStatus, setAuthStatus] = useState('loading');

  // Set up the debug info updater
  useEffect(() => {
    // Set the global debug state updater reference
    updateDebugState = (message: string) => {
      setDebugInfo(prev => [...prev, message]);
    };
    
    // Initialize the global debug array
    debugInfoArray = [];
    
    // Clean up
    return () => {
      updateDebugState = null;
    };
  }, []);

  // Local debug info adder for the component
  const componentAddDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    // Also update the global array
    debugInfoArray.push(`${new Date().toISOString()}: ${message}`);
  };

  useEffect(() => {
    const processAuthCode = async () => {
      // Skip if already processing or processed
      if (isProcessingToken || authStatus !== 'loading') {
        return;
      }
      
      try {
        setIsProcessingToken(true);
        const urlSearchParams = new URLSearchParams(location.search);
        const code = urlSearchParams.get('code');
        const state = urlSearchParams.get('state');
        
        // Validate state parameter if possible
        const storedState = localStorage.getItem('oauth_state');
        if (storedState && state !== storedState) {
          setError('OAuth state mismatch. This could be a CSRF attack.');
          setAuthStatus('error');
          localStorage.removeItem('oauth_state');
          return;
        }
        
        // Clear the saved state
        localStorage.removeItem('oauth_state');
        
        if (!code) {
          setError('No authorization code found in the callback URL.');
          setAuthStatus('error');
          return;
        }
        
        // Add debug info
        componentAddDebugInfo(`Extracted token: ${code.substring(0, 10)}...`);
        
        // Process the authorization code only once
        const response = await api.auth.handleGoogleCallback(code, state);
        
        if (!response.success) {
          setError(`Error during authentication: ${response.message || 'Unknown error'}`);
          setAuthStatus('error');
          return;
        }
        
        // Extract the token from the response
        const token = response.token;
        if (!token) {
          setError('No token received from the server.');
          setAuthStatus('error');
          return;
        }
        
        // Store the token and user info
        localStorage.setItem('token', token);
        
        // Verify the token with the backend and get user info
        const verifyResult = await api.auth.verifyToken(token);
        
        if (verifyResult.success) {
          // Authentication successful, set the user's authentication state
          // First update Redux store
          dispatch(setLogin({ 
            isLoggedIn: true,
            userData: { token, ...response.user }
          }));
          
          // Then use the AuthContext login function
          if (login) {
            await login(token);
          }
          
          // Redirect the user to the scanning page
          navigate('/scanning');
        } else {
          setError(`Token verification failed: ${verifyResult.error || 'Unknown error'}`);
          setAuthStatus('error');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(`Authentication error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setAuthStatus('error');
      } finally {
        setIsProcessingToken(false);
      }
    };
    
    processAuthCode();
  }, [authStatus, dispatch, location.search, navigate, isProcessingToken]);

  const handleRetry = () => {
    navigate('/login');
  };

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
        <div className="flex space-x-4 mt-4">
          <RetryButton onClick={handleRetry}>
            Return to Login
          </RetryButton>
          <RetryButton onClick={() => window.location.reload()}>
            Try Again
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
      <p>Redirecting to scanning...</p>
      <Spinner />
    </LoadingContainer>
  );
};

export default AuthCallback; 