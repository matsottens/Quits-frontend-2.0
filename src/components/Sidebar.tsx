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
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r border-gray-100">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <Link to="/dashboard" className="flex items-center">
            <img src="/quits-logo.svg" alt="Quits" className="h-8 w-8" />
          </Link>
        </div>
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-4 space-y-2">
            {/* Dashboard Link */}
            <Link
              to="/dashboard"
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/dashboard')
                  ? 'bg-[#26457A] text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#26457A]'
              }`}
            >
              <svg
                className={`mr-3 flex-shrink-0 h-5 w-5 ${
                  isActive('/dashboard') ? 'text-white' : 'text-gray-400 group-hover:text-[#26457A]'
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
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/calendar')
                  ? 'bg-[#26457A] text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#26457A]'
              }`}
            >
              <svg
                className={`mr-3 flex-shrink-0 h-5 w-5 ${
                  isActive('/calendar') ? 'text-white' : 'text-gray-400 group-hover:text-[#26457A]'
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
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/scanning')
                  ? 'bg-[#26457A] text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#26457A]'
              }`}
            >
              <svg
                className={`mr-3 flex-shrink-0 h-5 w-5 ${
                  isActive('/scanning') ? 'text-white' : 'text-gray-400 group-hover:text-[#26457A]'
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
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-[#26457A]"
            >
              <svg
                className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-[#26457A]"
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
      <div className="flex-shrink-0 flex border-t border-gray-100 p-4">
        <Link to="/settings" className="flex-shrink-0 w-full group block">
          <div className="flex items-center">
            <div>
              <img
                className="inline-block h-9 w-9 rounded-full"
                src={user?.picture || 'https://ui-avatars.com/api/?name=User&background=26457A&color=fff'}
                alt="Profile"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 group-hover:text-[#26457A]">
                {user?.name || user?.email || 'User'}
              </p>
              <p className="text-xs font-medium text-gray-500 group-hover:text-[#26457A]">
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