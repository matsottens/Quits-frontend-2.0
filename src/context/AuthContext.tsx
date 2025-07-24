import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Define API service type
interface ApiService {
  auth: {
    getGoogleAuthUrl: (emailHint?: string) => string;
    handleGoogleCallback: (code: string) => Promise<any>;
    getMe: () => Promise<any>;
    logout: () => Promise<any>;
    clearAuthData: () => void;
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  validateToken: (token: string) => boolean;
}

interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const success = await login(token);
          if (!success) {
            // If login fails, clear token
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Error validating token:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Function to validate a JWT token structure and expiration
  const validateToken = (token: string): boolean => {
    if (!token) return false;
    
    try {
      // Decode the token to verify its structure
      const decoded: any = jwtDecode(token);
      
      // Check if token has the required fields (support legacy `userId`)
      if (!decoded || (!(decoded.id || decoded.userId)) || !decoded.email) {
        console.error('Token missing required fields');
        return false;
      }
      
      // Check token expiration
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.error('Token has expired');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  const login = async (token: string): Promise<boolean> => {
    try {
      // First validate the token structure
      if (!validateToken(token)) {
        return false;
      }
      
      // Decode the token to get user info
      const decoded: any = jwtDecode(token);
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      // Decode the token to get user info
      const userData: User = {
        id: decoded.id || decoded.userId,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture
      };

      // Store user ID separately for namespacing local storage
      localStorage.setItem('user_id', userData.id);
      
      setUser(userData);
      setIsAuthenticated(true);
      
      // Validate token with backend
      try {
        // Set token in Axios default headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Make a request to verify the token
        const apiUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:3000/api'
          : 'https://api.quits.cc';
          
        await axios.get(`${apiUrl}/auth/me`);
      } catch (error) {
        console.error('Token validation error:', error);
        // Continue anyway since we validated the token structure
      }
      
      return true;
    } catch (error) {
      console.error('Error logging in:', error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    setUser(null);
    setIsAuthenticated(false);
    delete axios.defaults.headers.common['Authorization'];
    
    // Navigate to login page
    window.location.href = '/login';
  };

  const value = {
    user,
    isAuthenticated,
    login,
    logout,
    loading,
    validateToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext; 