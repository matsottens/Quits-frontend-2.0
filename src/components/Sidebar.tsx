import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-[#26457A]">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <div className="flex flex-shrink-0 items-center px-4">
            <img className="h-8 w-auto" src="/logo.svg" alt="Quits" />
          </div>
          <nav className="mt-5 flex-1 space-y-1 px-2">
            <Link
              to="/dashboard"
              className="text-gray-300 hover:bg-[#1B3359] hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              Dashboard
            </Link>
            <Link
              to="/settings"
              className="text-gray-300 hover:bg-[#1B3359] hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              Settings
            </Link>
            <button
              onClick={logout}
              className="text-gray-300 hover:bg-[#1B3359] hover:text-white group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              Sign out
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 