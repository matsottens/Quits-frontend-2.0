import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import ConfirmModal from '../ConfirmModal';
import accountService from '../../services/accountService';

const AccountSettings = () => {
  const { logout } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const handleDelete = async () => {
    try {
      await accountService.deleteAccount();
      logout();
    } catch (err) {
      alert('Failed to delete account');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold mb-4">Account</h2>
      <div className="space-y-4">
        <button
          onClick={logout}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
        >
          Sign Out
        </button>

        <button
          onClick={() => setShowDelete(true)}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Delete Account
        </button>
      </div>

      <ConfirmModal
        isOpen={showDelete}
        title="Delete Account"
        message="This will permanently remove your account and all associated data. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
};

export default AccountSettings; 