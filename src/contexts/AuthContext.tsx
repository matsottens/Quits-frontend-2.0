import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Define the structure of the auth context
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: any | null;
  login: (token: string) => void;
  logout: () => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  token: null,
  user: null,
  login: () => {},
  logout: () => {},
});

// API configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create the provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  // Configure axios defaults
  const configureAxios = (newToken: string | null) => {
    if (newToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      
      if (storedToken) {
        setToken(storedToken);
        configureAxios(storedToken);
        
        try {
          // Validate token by fetching user data
          const response = await axios.get(`${API_URL}/auth/me`);
          
          if (response.data && response.data.user) {
            setUser(response.data.user);
            setIsAuthenticated(true);
          } else {
            // Invalid token, clear everything
            localStorage.removeItem('auth_token');
            setToken(null);
            configureAxios(null);
          }
        } catch (error) {
          // Token validation failed, clear everything
          localStorage.removeItem('auth_token');
          setToken(null);
          configureAxios(null);
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Login handler
  const login = (newToken: string) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    configureAxios(newToken);
    setIsAuthenticated(true);
    
    // We'll fetch user info when needed using the token
    // This avoids an extra request here
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    configureAxios(null);
  };

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    token,
    user,
    login,
    logout,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 