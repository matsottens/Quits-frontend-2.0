import { useAuth } from '../../context/AuthContext';

const AccountSettings = () => {
  const { logout } = useAuth();

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold mb-4">Account</h2>
      <div className="space-y-4">
        <button
          onClick={logout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default AccountSettings; 