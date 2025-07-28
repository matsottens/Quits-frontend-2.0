import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import GetStarted from './pages/GetStarted';
import AuthCallback from './pages/AuthCallback';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import LoadingSpinner from './components/LoadingSpinner';
import Sidebar from './components/Sidebar';
import ScanningPage from './pages/ScanningPage';
import Settings from './pages/Settings';
import Calendar from './pages/Calendar';
import SubscriptionDetails from './pages/SubscriptionDetails';
import Navigation from './components/Navigation';
import AddPhoneNumber from './pages/AddPhoneNumber';
import { useEffect, useState } from 'react';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Welcome from './pages/Welcome';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, validateToken } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isValid, setIsValid] = useState(false);
  
  useEffect(() => {
    // Double-check the token is valid on each protected route access
    const verifyAuthentication = async () => {
      try {
        const token = localStorage.getItem('token');
        let valid = false;
        
        if (token && validateToken(token)) {
          valid = true;
        } else if (token) {
          // If token exists but is invalid, clear it
          console.log('Invalid token found in localStorage, clearing it');
          localStorage.removeItem('token');
        }
        
        setIsValid(valid);
      } finally {
        setIsChecking(false);
      }
    };
    
    verifyAuthentication();
  }, [validateToken]);
  
  // Show loading while checking token
  if (isChecking) {
    return <LoadingSpinner />;
  }

  // Use our validated state rather than just the isAuthenticated context value
  if (!isValid) {
    console.log('Authentication validation failed, redirecting to login');
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100">
      {isAuthenticated && <Sidebar />}
      <div className="flex-1 overflow-auto pb-16 md:pb-0">
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route
            path="/add-phone"
            element={
              <ProtectedRoute>
                <AddPhoneNumber />
              </ProtectedRoute>
            }
          />
          <Route
            path="/get-started"
            element={
              <ProtectedRoute>
                <GetStarted />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scanning"
            element={
              <ProtectedRoute>
                <ScanningPage />
              </ProtectedRoute>
            }
          />
          {/* Settings page with optional section parameter */}
          <Route
            path="/settings/:section?"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription/:id"
            element={
              <ProtectedRoute>
                <SubscriptionDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/welcome"
            element={
              <ProtectedRoute>
                <Welcome />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
      <Navigation />
    </div>
  );
};

export default App;
