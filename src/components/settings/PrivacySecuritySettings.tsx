import { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import Toggle from '../ui/Toggle';

const PrivacySecuritySettings = () => {
  const { settings, update, loading } = useSettings();

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [analyticsOptOut, setAnalyticsOptOut] = useState(false);
  const [autoDeleteEmails, setAutoDeleteEmails] = useState<number | ''>('');

  // Load existing
  useEffect(() => {
    if (!loading && settings?.privacy) {
      const p = settings.privacy;
      setTwoFactorEnabled(!!p.twoFactorEnabled);
      setAnalyticsOptOut(!!p.analyticsOptOut);
      setAutoDeleteEmails(p.autoDeleteEmails ?? '');
    }
  }, [loading, settings]);

  const push = (patch: Partial<Record<string, any>>) => {
    update({ privacy: { ...(settings?.privacy || {}), ...patch } });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold mb-4">Privacy & Security</h2>

      {/* Two-Factor Authentication Toggle */}
      <div className="flex items-center justify-between border rounded p-4 bg-white">
        <div>
          <p className="font-medium">Two-Factor Authentication</p>
          <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
        </div>
        <Toggle
          checked={twoFactorEnabled}
          onChange={(val) => {
            setTwoFactorEnabled(val);
            push({ twoFactorEnabled: val });
          }}
        />
      </div>

      {/* Analytics Opt-out */}
      <div className="flex items-center justify-between border rounded p-4 bg-white">
        <div>
          <p className="font-medium">Opt-out of Usage Analytics</p>
          <p className="text-sm text-gray-500">Stop sending anonymised usage data</p>
        </div>
        <Toggle
          checked={analyticsOptOut}
          onChange={(val) => {
            setAnalyticsOptOut(val);
            push({ analyticsOptOut: val });
          }}
        />
      </div>

      {/* Auto-delete scanned email data */}
      <div className="border rounded p-4 bg-white space-y-3">
        <p className="font-medium">Auto-delete scanned email data</p>
        <div className="flex items-center gap-2">
          <span className="text-sm">Delete after</span>
          <input
            type="number"
            min={0}
            className="w-20 border rounded px-2 py-1"
            value={autoDeleteEmails}
            onChange={(e) => {
              const v = e.target.value === '' ? '' : Number(e.target.value);
              setAutoDeleteEmails(v);
              push({ autoDeleteEmails: v === '' ? null : v });
            }}
          />
          <span className="text-sm">days (0 = never)</span>
        </div>
      </div>
    </div>
  );
};

export default PrivacySecuritySettings; 