import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

// Define the structure of the auth context
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  tokens: any | null;
  login: (userData: any, tokenData: any) => void;
  logout: () => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  tokens: null,
  login: () => {},
  logout: () => {},
});

// Create the provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any | null>(null);
  const [tokens, setTokens] = useState<any | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const storedTokens = localStorage.getItem('tokens');
      
      if (storedUser && storedTokens) {
        try {
          const userData = JSON.parse(storedUser);
          const tokenData = JSON.parse(storedTokens);
          
          setUser(userData);
          setTokens(tokenData);
          setIsAuthenticated(true);
          
          // Validate tokens by trying to fetch user info
          // This is commented out for now since we're using a test server
          // const response = await api.auth.getMe();
          // if (!response || response.error) {
          //   throw new Error('Invalid token');
          // }
        } catch (error) {
          // Invalid stored data, clear everything
          localStorage.removeItem('user');
          localStorage.removeItem('tokens');
          setUser(null);
          setTokens(null);
          setIsAuthenticated(false);
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Login handler
  const login = (userData: any, tokenData: any) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tokens', JSON.stringify(tokenData));
    setUser(userData);
    setTokens(tokenData);
    setIsAuthenticated(true);
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('tokens');
    setUser(null);
    setTokens(null);
    setIsAuthenticated(false);
    
    // Optional: Call logout API endpoint
    // api.auth.logout().catch(console.error);
  };

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    tokens,
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