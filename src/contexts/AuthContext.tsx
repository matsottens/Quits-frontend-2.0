import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import api, { supabase } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing token in various localStorage keys
    const storedToken = localStorage.getItem('token') || localStorage.getItem('quits_auth_token');
    
    if (storedToken) {
      console.log('Found existing auth token, setting authenticated state');
      setToken(storedToken);
      setIsAuthenticated(true);
      
      // Copy token to both storage locations for consistency
      localStorage.setItem('token', storedToken);
      localStorage.setItem('quits_auth_token', storedToken);
    } else {
      console.log('No existing auth token found');
    }
  }, []);

  const login = async (newToken: string) => {
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
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 