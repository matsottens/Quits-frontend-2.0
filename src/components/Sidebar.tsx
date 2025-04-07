import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  // Don't show sidebar on these pages
  const hideSidebarPages = ['/', '/login', '/signup', '/auth/callback', '/scanning'];
  
  if (hideSidebarPages.includes(location.pathname)) {
    return null;
  }
  
  // Only show sidebar when authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Check if the current path matches the given path
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r border-gray-200">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-2xl font-bold text-blue-600">Quits</h1>
        </div>
        <div className="mt-5 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1">
            {/* Dashboard Link */}
            <Link
              to="/dashboard"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/dashboard')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg
                className={`mr-3 flex-shrink-0 h-6 w-6 ${
                  isActive('/dashboard') ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Dashboard
            </Link>

            {/* Calendar Link */}
            <Link
              to="/calendar"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/calendar')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg
                className={`mr-3 flex-shrink-0 h-6 w-6 ${
                  isActive('/calendar') ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Calendar
            </Link>

            {/* Scan Emails Link */}
            <Link
              to="/scanning"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/scanning')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg
                className={`mr-3 flex-shrink-0 h-6 w-6 ${
                  isActive('/scanning') ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Scan Emails
            </Link>

            {/* Add Subscription Link */}
            <Link
              to="/dashboard?add=true"
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <svg
                className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Subscription
            </Link>
          </nav>
        </div>
      </div>
      
      {/* User profile */}
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <Link to="/settings" className="flex-shrink-0 w-full group block">
          <div className="flex items-center">
            <div>
              <img
                className="inline-block h-9 w-9 rounded-full"
                src={user?.avatar_url || 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff'}
                alt="Profile"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {user?.name || user?.email || 'User'}
              </p>
              <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                Settings
              </p>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar; 