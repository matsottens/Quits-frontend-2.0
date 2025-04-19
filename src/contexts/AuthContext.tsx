import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import api, { supabase } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  validateToken: (token: string) => boolean;
}

// Function to validate a JWT token
const validateToken = (token: string): boolean => {
  if (!token) return false;
  
  try {
    // Split the token and get the payload
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Decode the payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.log('Token has expired');
      return false;
    }
    
    // Check creation time if available and make sure it's not too old (7 days)
    if (payload.createdAt) {
      const createdTime = new Date(payload.createdAt).getTime();
      const weekInMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - createdTime > weekInMs) {
        console.log('Token is too old (> 7 days)');
        return false;
      }
    }
    
    return true;
  } catch (e) {
    console.error('Error validating token:', e);
    return false;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing token in various localStorage keys
    const storedToken = localStorage.getItem('token') || localStorage.getItem('quits_auth_token');
    
    if (storedToken && validateToken(storedToken)) {
      console.log('Found existing valid auth token, setting authenticated state');
      setToken(storedToken);
      setIsAuthenticated(true);
      
      // Copy token to both storage locations for consistency
      localStorage.setItem('token', storedToken);
      localStorage.setItem('quits_auth_token', storedToken);
    } else if (storedToken) {
      console.log('Found invalid token, clearing it');
      localStorage.removeItem('token');
      localStorage.removeItem('quits_auth_token');
      setToken(null);
      setIsAuthenticated(false);
    } else {
      console.log('No existing auth token found');
    }
  }, []);

  const login = async (newToken: string) => {
    if (!validateToken(newToken)) {
      console.error('Attempted to login with invalid token');
      return;
    }
    
    console.log('Logging in with token:', newToken.substring(0, 10) + '...');
    
    // Store in both locations for maximum compatibility
    localStorage.setItem('token', newToken);
    localStorage.setItem('quits_auth_token', newToken);
    
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    console.log('Logging out, clearing auth tokens');
    localStorage.removeItem('token');
    localStorage.removeItem('quits_auth_token');
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout, validateToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 