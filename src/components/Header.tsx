import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <header className="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-3">
            <img src="/assets/quits-logo.svg" alt="Quits" className="h-8 w-8" />
            <span className="text-xl font-bold text-white">Quits</span>
          </Link>
          {!isAuthenticated && (
            <nav className="flex items-center space-x-4">
              <Link to="/login" className="text-white/80 hover:text-white transition-colors duration-200">
                Sign in
              </Link>
              <Link 
                to="/signup" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-[#26457A] bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                Sign up
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 