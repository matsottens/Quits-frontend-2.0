import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import api, { supabase } from '../services/api';
import authService from '../services/authService';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  validateToken: (token: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('useAuth must be used within an AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Function to validate a JWT token
  const validateToken = (token: string): boolean => {
    if (!token) return false;
    
    try {
      // Basic check - parse the token and check expiration
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('Invalid token format');
        return false;
      }
      
      // Decode JWT payload
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // Check if token is expired
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        console.warn('Token expired');
        return false;
      }
      
      // Check required fields
      if (!payload.id || !payload.email) {
        console.warn('Token missing required fields');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Initializing authentication context...');
        const storedToken = localStorage.getItem('token') || localStorage.getItem('quits_auth_token');
        
        if (storedToken && validateToken(storedToken)) {
          console.log('Found valid token in storage');
          // Token is valid, parse user info
          await login(storedToken);
        } else if (storedToken) {
          console.warn('Found invalid token in storage, clearing');
          localStorage.removeItem('token');
          localStorage.removeItem('quits_auth_token');
        } else {
          console.log('No token found in storage');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown authentication error');
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = async (newToken: string): Promise<void> => {
    try {
      console.log('Setting auth token and user info');
      // Store token
      localStorage.setItem('token', newToken);
      localStorage.setItem('quits_auth_token', newToken);
      setToken(newToken);
      
      // Extract user info from token
      const userData = authService.getCurrentUser();
      if (userData) {
        setUser({
          id: userData.id,
          email: userData.email
        });
        setIsAuthenticated(true);
        console.log('Authentication successful:', userData.email);
      } else {
        throw new Error('Failed to extract user data from token');
      }
    } catch (error) {
      console.error('Login error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('quits_auth_token');
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      throw error;
    }
  };

  // Logout function
  const logout = (): void => {
    console.log('Logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('quits_auth_token');
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  };

  // Show a loading state or error while initializing
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md">
          <strong className="font-bold">Authentication Error</strong>
          <p className="block sm:inline mt-1">{initError}</p>
          <p className="mt-4">
            <button 
              onClick={() => window.location.href = '/login'} 
              className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded"
            >
              Go to Login
            </button>
          </p>
        </div>
      </div>
    );
  }

  const value = {
    isAuthenticated,
    user,
    token,
    login,
    logout,
    validateToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 