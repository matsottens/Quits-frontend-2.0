import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Don't show navigation on these pages
  const hideNavPages = ['/', '/login', '/signup', '/auth/callback', '/scanning'];
  
  if (hideNavPages.includes(location.pathname)) {
    return null;
  }
  
  // Only show navigation when authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Check if the current path matches the given path
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow fixed bottom-0 left-0 right-0 z-10 md:hidden">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          <div className="flex-1 flex items-center justify-evenly">
            {/* Dashboard Link */}
            <Link
              to="/dashboard"
              className={`flex flex-col items-center py-2 px-4 text-sm ${
                isActive('/dashboard') ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span>Home</span>
            </Link>

            {/* Calendar Link */}
            <Link
              to="/calendar"
              className={`flex flex-col items-center py-2 px-4 text-sm ${
                isActive('/calendar') ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Calendar</span>
            </Link>

            {/* Add Subscription */}
            <Link
              to="/dashboard?add=true"
              className={`flex flex-col items-center py-2 px-4 text-sm text-gray-500 hover:text-gray-900`}
            >
              <div className="bg-blue-600 rounded-full p-2">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span>Add</span>
            </Link>

            {/* Scan Emails Link */}
            <Link
              to="/scanning"
              className={`flex flex-col items-center py-2 px-4 text-sm ${
                isActive('/scanning') ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span>Scan</span>
            </Link>

            {/* Settings Link */}
            <Link
              to="/settings"
              className={`flex flex-col items-center py-2 px-4 text-sm ${
                isActive('/settings') ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 