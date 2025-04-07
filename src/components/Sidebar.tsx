import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User } from '@supabase/supabase-js';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const getUserDisplayName = (user: User | null) => {
  if (!user) return 'User';
  if (user.user_metadata?.name) return user.user_metadata.name;
  if (user.user_metadata?.full_name) return user.user_metadata.full_name;
  return user.email || 'User';
};

const getUserAvatar = (user: User | null) => {
  if (!user) return `https://ui-avatars.com/api/?name=User&background=26457A&color=fff`;
  if (user.user_metadata?.avatar_url) return user.user_metadata.avatar_url;
  if (user.user_metadata?.picture) return user.user_metadata.picture;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName(user))}&background=26457A&color=fff`;
};

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100 ease-out duration-300' : 'opacity-0 ease-in duration-200 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>

      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white transform transition ease-in-out duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1">
            <div className="flex items-center justify-between h-16 px-4 bg-[#26457A] text-white">
              <Link to="/" className="flex items-center space-x-3">
                <img src="/quits-logo.svg" alt="Quits" className="h-8 w-8" />
              </Link>
              <button
                onClick={onClose}
                className="lg:hidden -mr-2 p-2 rounded-md hover:bg-[#1c345c] focus:outline-none focus:ring-2 focus:ring-white"
              >
                <span className="sr-only">Close sidebar</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <nav className="mt-5 flex-1 px-2 space-y-1">
              <Link
                to="/dashboard"
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  location.pathname === '/dashboard'
                    ? 'bg-[#26457A] text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <svg
                  className={`mr-3 h-6 w-6 ${
                    location.pathname === '/dashboard'
                      ? 'text-white'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Dashboard
              </Link>

              <Link
                to="/get-started"
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  location.pathname === '/get-started'
                    ? 'bg-[#26457A] text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <svg
                  className={`mr-3 h-6 w-6 ${
                    location.pathname === '/get-started'
                      ? 'text-white'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Get Started
              </Link>
            </nav>
          </div>

          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div>
                  <img
                    className="inline-block h-9 w-9 rounded-full"
                    src={getUserAvatar(user)}
                    alt={getUserDisplayName(user)}
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {getUserDisplayName(user)}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="text-xs font-medium text-gray-500 group-hover:text-gray-700"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 