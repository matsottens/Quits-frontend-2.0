import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  
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
            {/* Home */}
            <Link
              to="/dashboard"
              className={`flex flex-col items-center py-2 px-4 text-sm ${isActive('/dashboard') ? 'text-galaxy' : 'text-gray-500 hover:text-galaxy'}`}
            >
              <svg className={`h-5 w-5 ${isActive('/dashboard') ? 'text-galaxy' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="mt-1 small-label">Home</span>
            </Link>

            {/* Add (dropdown: Scan or Add Manually) */}
            <div className="relative flex flex-col items-center py-2 px-4 text-sm">
              <button
                type="button"
                onClick={() => setShowAddMenu((v) => !v)}
                className="focus:outline-none"
                aria-haspopup="true"
                aria-expanded={showAddMenu}
              >
                <div className="bg-galaxy rounded-full p-3 shadow-md">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="mt-1 text-galaxy small-label">Add</span>
              </button>

              {showAddMenu && (
                <>
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white border rounded-lg shadow-md overflow-hidden w-48 z-20">
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 small-label"
                      onClick={() => { setShowAddMenu(false); navigate('/scanning'); }}
                    >
                      Start New Scan
                    </button>
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 small-label"
                      onClick={() => { setShowAddMenu(false); navigate('/dashboard?add=true'); }}
                    >
                      Add Manually
                    </button>
                  </div>
                  {/* Click-away overlay */}
                  <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                </>
              )}
            </div>

            {/* Analytics placeholder */}
            <Link
              to="/dashboard#analytics"
              className={`flex flex-col items-center py-2 px-4 text-sm ${isActive('/analytics') ? 'text-galaxy' : 'text-gray-500 hover:text-galaxy'}`}
            >
              <svg className={`h-5 w-5 ${isActive('/analytics') ? 'text-galaxy' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3v18M5 13v8M17 8v13" />
              </svg>
              <span className="mt-1 small-label">Analytics</span>
            </Link>
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