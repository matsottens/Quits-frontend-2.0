import { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import Toggle from '../ui/Toggle';

const options = [
  { id: 'googleCalendar', label: 'Google Calendar Sync' },
  { id: 'slack', label: 'Slack Notifications' },
  { id: 'notion', label: 'Notion Export' },
  { id: 'zapier', label: 'Zapier Webhooks' },
] as const;

const IntegrationsSettings = () => {
  const { settings, update, loading } = useSettings();

  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    googleCalendar: false,
    slack: false,
    notion: false,
    zapier: false,
  });

  useEffect(() => {
    if (!loading && settings?.integrations) {
      setEnabled({ ...enabled, ...settings.integrations });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const toggle = (key: string) => {
    const newVal = { ...enabled, [key]: !enabled[key] };
    setEnabled(newVal);
    update({ integrations: newVal });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold mb-4">Integrations</h2>

      {options.map((opt) => (
        <div key={opt.id} className="flex items-center justify-between border rounded p-4 bg-white">
          <span>{opt.label}</span>
          <Toggle checked={!!enabled[opt.id]} onChange={() => toggle(opt.id)} />
        </div>
      ))}
    </div>
  );
};

export default IntegrationsSettings; 