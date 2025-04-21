import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
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

  const login = async (token: string): Promise<boolean> => {
    try {
      // Decode the token to get user info
      const decoded: any = jwtDecode(token);
      
      if (!decoded || !decoded.id || !decoded.email) {
        console.error('Invalid token format');
        return false;
      }
      
      // Check token expiration
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.error('Token expired');
        return false;
      }
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      // Set user and auth state
      const userData: User = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture
      };
      
      setUser(userData);
      setIsAuthenticated(true);
      
      // Validate token with backend
      try {
        // Set token in Axios default headers
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await api.get('/auth/me');
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
    setUser(null);
    setIsAuthenticated(false);
    delete api.defaults.headers.common['Authorization'];
    
    // Navigate to login page
    window.location.href = '/login';
  };

  const value = {
    user,
    isAuthenticated,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext; 