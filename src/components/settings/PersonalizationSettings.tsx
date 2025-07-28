import { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';

const themes = [
  { id: 'auto', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
] as const;

const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];

const dateFormats = [
  { id: 'mdy', label: 'MM/DD/YYYY' },
  { id: 'dmy', label: 'DD/MM/YYYY' },
  { id: 'iso', label: 'YYYY-MM-DD' },
] as const;

const PersonalizationSettings = () => {
  const { settings, update, loading } = useSettings();

  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto');
  const [currency, setCurrency] = useState<string>('USD');
  const [dateFormat, setDateFormat] = useState<'mdy' | 'dmy' | 'iso'>('mdy');

  // Load saved settings
  useEffect(() => {
    if (!loading && settings?.personalization) {
      const p = settings.personalization;
      setTheme((p.theme as any) ?? 'auto');
      setCurrency(p.currency ?? 'USD');
      setDateFormat((p.dateFormat as any) ?? 'mdy');
    }
  }, [loading, settings]);

  const push = (patch: Partial<Record<string, any>>) => {
    update({ personalization: { ...(settings?.personalization || {}), ...patch } });
  };

  return (
    <div className="max-w-3xl space-y-8">
      <h2 className="text-xl font-semibold mb-4">Personalization &amp; UI</h2>

      {/* Theme */}
      <section className="space-y-2 bg-white border rounded p-4">
        <p className="font-medium">Theme</p>
        <div className="flex gap-4">
          {themes.map((t) => (
            <label key={t.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="theme"
                className="form-radio"
                checked={theme === t.id}
                onChange={() => {
                  setTheme(t.id);
                  push({ theme: t.id });
                }}
              />
              {t.label}
            </label>
          ))}
        </div>
      </section>

      {/* Primary currency */}
      <section className="space-y-2 bg-white border rounded p-4">
        <p className="font-medium">Primary Currency</p>
        <select
          className="border rounded px-3 py-2"
          value={currency}
          onChange={(e) => {
            const val = e.target.value;
            setCurrency(val);
            push({ currency: val });
          }}
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </section>

      {/* Date format */}
      <section className="space-y-2 bg-white border rounded p-4">
        <p className="font-medium">Date Format</p>
        <div className="flex gap-4">
          {dateFormats.map((d) => (
            <label key={d.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="dateFormat"
                className="form-radio"
                checked={dateFormat === d.id}
                onChange={() => {
                  setDateFormat(d.id as any);
                  push({ dateFormat: d.id });
                }}
              />
              {d.label}
            </label>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PersonalizationSettings; 