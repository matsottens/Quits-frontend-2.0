import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import Toggle from '../ui/Toggle';
import authService from '../../services/authService';

const scanFrequencies = [
  { id: 'realtime', label: 'Real-time' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'manual', label: 'Manual only' },
] as const;

const EmailAccountsSettings = () => {
  const { settings, update, loading, refresh } = useSettings();
  const { user } = useAuth();

  const [selectedFrequency, setSelectedFrequency] = useState('daily');

  // Store list of connected email addresses
  const [accounts, setAccounts] = useState<string[]>([]);

  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    subscriptions: true,
    newsletters: false,
    invoices: false,
    receipts: false,
    expenses: false,
    donations: false,
  });

  // Fetch latest settings whenever component mounts or user changes
  useEffect(() => {
    refresh();
  }, [user]);

  useEffect(() => {
    if (!loading && settings?.email) {
      const e = settings.email;
      setSelectedFrequency(e.scanFrequency || 'daily');
      setPermissions({ ...permissions, ...e.permissions });
      
      // Get connected accounts from settings or use authenticated user's email
      const savedAccounts = e.accounts || [];
      const userEmail = user?.email;
      
      // If user is authenticated and has an email, include it in connected accounts
      if (userEmail && !savedAccounts.includes(userEmail)) {
        setAccounts([userEmail, ...savedAccounts]);
      } else {
        setAccounts(savedAccounts);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const push = (patch: Partial<Record<string, any>>) => {
    update({ email: { ...(settings?.email || {}), ...patch } });
  };

  const togglePermission = (key: string) => {
    const newPerm = { ...permissions, [key]: !permissions[key] };
    setPermissions(newPerm);
    push({ permissions: newPerm });
  };

  const disconnectAccount = (email: string) => {
    // Don't allow disconnecting the primary authenticated user's email
    if (email === user?.email) {
      alert('You cannot disconnect your primary account email. This is the email you used to sign in.');
      return;
    }
    
    const filtered = accounts.filter((a) => a !== email);
    setAccounts(filtered);
    update({ email: { ...(settings?.email || {}), accounts: filtered } });
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* Connected accounts */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Connected Accounts</h2>
        <div className="border rounded-lg p-4 space-y-2 bg-white shadow-sm">
          {accounts.length === 0 && <p className="text-sm text-gray-500">No accounts connected yet.</p>}

          {accounts.map((email) => {
            const isPrimaryAccount = email === user?.email;
            return (
              <div
                key={email}
                className="flex justify-between items-center py-2 hover:bg-gray-50 px-2 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 break-all">{email}</span>
                  {isPrimaryAccount && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Primary
                    </span>
                  )}
                </div>
                {!isPrimaryAccount && (
                  <button
                    onClick={() => disconnectAccount(email)}
                    className="text-sm text-red-600 hover:underline"
                    title="Remove account"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            );
          })}

          {/* Add new */}
          <div className="pt-2">
            <button
              onClick={async () => {
                try {
                  const url = await authService.getGoogleAuthUrl();
                  window.location.href = url;
                } catch (err) {
                  console.error('Failed to initiate Google OAuth', err);
                  alert('Failed to start account linking. Please try again.');
                }
              }}
              className="text-blue-600 hover:underline text-sm"
            >
              + Add new Gmail account
            </button>
          </div>
        </div>
      </section>

      {/* Scan frequency */}
      <section>
        <h3 className="font-semibold mb-2">Scan Frequency</h3>
        <div className="flex flex-wrap gap-4">
          {scanFrequencies.map((f) => (
            <label key={f.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="frequency"
                className="form-radio"
                checked={selectedFrequency === f.id}
                onChange={() => {
                  setSelectedFrequency(f.id);
                  push({ scanFrequency: f.id });
                }}
              />
              {f.label}
            </label>
          ))}
        </div>
      </section>

      {/* Permissions */}
      <section>
        <h3 className="font-semibold mb-2">Scan Permissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(permissions).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2">
              <Toggle checked={value} onChange={() => togglePermission(key)} />
              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
            </label>
          ))}
        </div>
      </section>
    </div>
  );
};

export default EmailAccountsSettings; 