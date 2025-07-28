import { useState } from 'react';
import { Link } from 'react-router-dom';

const scanFrequencies = [
  { id: 'realtime', label: 'Real-time' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'manual', label: 'Manual only' },
] as const;

const EmailAccountsSettings = () => {
  const [selectedFrequency, setSelectedFrequency] = useState('daily');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    subscriptions: true,
    newsletters: false,
    invoices: false,
    receipts: false,
    expenses: false,
    donations: false,
  });

  const togglePermission = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* Connected accounts */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Connected Accounts</h2>
        <div className="border rounded-md p-4 space-y-2 bg-white">
          {/* Placeholder list */}
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700">example@gmail.com</span>
            <button className="text-sm text-red-600 hover:underline" title="Remove account">
              Disconnect
            </button>
          </div>
          {/* Add new */}
          <div className="pt-2">
            <Link
              to="/settings/connect-account" /* placeholder route */
              className="text-blue-600 hover:underline text-sm"
            >
              + Add new account
            </Link>
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
                onChange={() => setSelectedFrequency(f.id)}
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
              <input
                type="checkbox"
                className="form-checkbox"
                checked={value}
                onChange={() => togglePermission(key)}
              />
              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
            </label>
          ))}
        </div>
      </section>
    </div>
  );
};

export default EmailAccountsSettings; 