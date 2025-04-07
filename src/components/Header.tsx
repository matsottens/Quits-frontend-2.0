import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/quits-logo.svg" alt="Quits" className="h-8 w-8" />
            <span className="text-xl font-bold text-primary-600">Quits</span>
          </Link>
          {!isAuthenticated && (
            <nav className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900">Sign in</Link>
              <Link to="/signup" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
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