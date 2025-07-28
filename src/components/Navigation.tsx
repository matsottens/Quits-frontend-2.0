import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  
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
    <nav className="bg-white shadow-lg fixed bottom-0 left-0 right-0 z-10 md:hidden border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          <div className="flex-1 flex items-center justify-evenly">
            {/* Dashboard Link */}
            <Link
              to="/dashboard"
              className={`flex flex-col items-center py-2 px-4 text-sm ${
                isActive('/dashboard') ? 'text-[#26457A]' : 'text-gray-500 hover:text-[#26457A]'
              }`}
            >
              <svg className={`h-5 w-5 ${isActive('/dashboard') ? 'text-[#26457A]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span className="mt-1">Home</span>
            </Link>

            {/* Calendar Link */}
            <Link
              to="/calendar"
              className={`flex flex-col items-center py-2 px-4 text-sm ${
                isActive('/calendar') ? 'text-[#26457A]' : 'text-gray-500 hover:text-[#26457A]'
              }`}
            >
              <svg className={`h-5 w-5 ${isActive('/calendar') ? 'text-[#26457A]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="mt-1">Calendar</span>
            </Link>

            {/* Add Subscription */}
            <Link
              to="/dashboard?add=true"
              className="flex flex-col items-center py-2 px-4 text-sm"
            >
              <div className="bg-[#26457A] rounded-full p-2">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="mt-1 text-[#26457A]">Add</span>
            </Link>

            {/* Scan Emails Link */}
            <Link
              to="/scanning"
              className={`flex flex-col items-center py-2 px-4 text-sm ${
                isActive('/scanning') ? 'text-[#26457A]' : 'text-gray-500 hover:text-[#26457A]'
              }`}
            >
              <svg className={`h-5 w-5 ${isActive('/scanning') ? 'text-[#26457A]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span className="mt-1">Scan</span>
            </Link>

            {/* Settings Link */}
            <Link
              to="/settings"
              className={`flex flex-col items-center py-2 px-4 text-sm ${
                isActive('/settings') ? 'text-[#26457A]' : 'text-gray-500 hover:text-[#26457A]'
              }`}
            >
              <svg className={`h-5 w-5 ${isActive('/settings') ? 'text-[#26457A]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <span className="mt-1">Settings</span>
            </Link>

            {/* Menu/More Button */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex flex-col items-center py-2 px-4 text-sm text-gray-500 hover:text-[#26457A]"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <span className="mt-1">More</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden">
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200">
            <div className="p-4 space-y-2">
              <button
                onClick={logout}
                className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-md flex items-center"
              >
                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
          <div className="absolute inset-0" onClick={() => setShowMenu(false)} />
        </div>
      )}
    </nav>
  );
};

export default Navigation; 