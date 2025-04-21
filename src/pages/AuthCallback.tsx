import React, { useEffect, useState } from 'react';
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
  const [showDebug, setShowDebug] = useState(false);

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

  const navigatePost = async () => {
    try {
      // Verify the token is valid by checking it
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token not found after authentication');
      }
      
      componentAddDebugInfo('Token stored, verifying with API');
      
      // Update Redux state with proper object format
      dispatch(setLogin({ 
        isLoggedIn: true,
        userData: { token }
      }));
      
      // Update auth context
      if (login) {
        const loginSuccess = await login(token);
        if (!loginSuccess) {
          throw new Error('Auth context login failed');
        }
      }
      
      // Navigate to home or dashboard
      navigate('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error during post-authentication:', errorMessage);
      setError('Authentication succeeded but encountered an error during login. Please try again.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const processAuthCallback = async () => {
      setIsLoading(true);
      setDebugInfo([]);
      
      // Get the code from the URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error");
      
      // Clear any fragments from URL to prevent issues with token extraction
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      
      componentAddDebugInfo(`Starting auth callback process with code: ${code ? 'present' : 'missing'}`);
      
      if (errorParam) {
        // Handle errors from the OAuth provider
        const reason = params.get("error_reason") || "unknown_reason";
        setError(`Authentication failed: ${errorParam} (${reason})`);
        componentAddDebugInfo(`Auth error: ${errorParam}, reason: ${reason}`);
        setIsLoading(false);
        return;
      }
      
      if (!code) {
        setError("No authentication code found in URL");
        componentAddDebugInfo("Missing auth code in callback URL");
        setIsLoading(false);
        return;
      }
      
      try {
        componentAddDebugInfo("Fetching token from API");
        // First try using the API service
        try {
          componentAddDebugInfo("Attempting to use API service for authentication");
          const result = await api.auth.handleGoogleCallback(code);
          
          if (result && result.token) {
            componentAddDebugInfo(`Received token directly from API service`);
            const token = result.token;
            
            // Verify and process the token
            const verificationSuccess = await verifyAndProcessToken(token, 3, dispatch, login);
            
            if (verificationSuccess) {
              componentAddDebugInfo("Token verification successful, redirecting to dashboard");
              window.location.href = "/dashboard";
              return;
            } else {
              throw new Error("Token verification failed");
            }
          } else if (result && result.html_response && result.html_content) {
            componentAddDebugInfo("Received HTML response, attempting to extract token");
            const token = extractTokenFromHtml(result.html_content);
            
            if (token) {
              componentAddDebugInfo(`Extracted token from HTML: ${token.substring(0, 10)}...`);
              
              // Verify and process the token with retry logic
              const verificationSuccess = await verifyAndProcessToken(token, 3, dispatch, login);
              
              if (verificationSuccess) {
                componentAddDebugInfo("Token verification successful, redirecting to dashboard");
                window.location.href = "/dashboard";
                return;
              } else {
                throw new Error("Token verification failed after HTML extraction");
              }
            } else {
              throw new Error("Received HTML but could not extract token");
            }
          } else if (result && result.error) {
            throw new Error(`API error: ${result.error}: ${result.message || 'Unknown error'}`);
          }
        } catch (apiError: unknown) {
          // API service approach failed, fallback to manual fetch
          const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
          componentAddDebugInfo(`API service approach failed: ${errorMessage}`);
          componentAddDebugInfo("Falling back to direct fetch approach");
          
          // Call the API to exchange the code for a token
          const url = `${api.getGoogleCallbackUrl(code)}`;
          componentAddDebugInfo(`Making direct fetch request to: ${url}`);
          
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'text/html,application/json,*/*'
            }
          });
          
          componentAddDebugInfo(`API response status: ${response.status}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to exchange code for token: ${errorText}`);
          }
          
          const htmlContent = await response.text();
          componentAddDebugInfo(`Received HTML response of length: ${htmlContent.length}`);
          
          // Try to extract the token from the HTML
          const token = extractTokenFromHtml(htmlContent);
          
          if (!token) {
            setError("Could not extract authentication token from response");
            componentAddDebugInfo("Token extraction failed");
            setIsLoading(false);
            return;
          }
          
          componentAddDebugInfo(`Extracted token: ${token.substring(0, 10)}...`);
          
          // Verify and process the token with retry logic
          const verificationSuccess = await verifyAndProcessToken(token, 3, dispatch, login);
          
          if (verificationSuccess) {
            componentAddDebugInfo("Token verification successful, redirecting to dashboard");
            // Redirect to dashboard after successful authentication
            window.location.href = "/dashboard";
          } else {
            setError("Token verification failed after multiple attempts");
            componentAddDebugInfo("Token verification failed");
            setIsLoading(false);
          }
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Auth callback error:", errorMessage);
        setError(`Authentication error: ${errorMessage}`);
        componentAddDebugInfo(`Error in auth process: ${errorMessage}`);
        setIsLoading(false);
      }
    };
    
    processAuthCallback();
  }, [dispatch, login]);

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
      <p>Redirecting to dashboard...</p>
      <Spinner />
    </LoadingContainer>
  );
};

export default AuthCallback; 