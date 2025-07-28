import { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import axios from 'axios';

const freqOptions = [
  { id: 'off', label: 'Off' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
] as const;

const DataExportSettings = () => {
  const { settings, update, loading } = useSettings();

  const [autoBackup, setAutoBackup] = useState('off');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!loading && settings?.data) {
      setAutoBackup(settings.data.autoBackup || 'off');
    }
  }, [loading, settings]);

  const push = (val: string) => {
    setAutoBackup(val);
    update({ data: { ...(settings?.data || {}), autoBackup: val } });
  };

  const triggerExport = async () => {
    setExporting(true);
    try {
      const apiBase = window.location.hostname === 'localhost'
        ? 'http://localhost:3000/api'
        : 'https://api.quits.cc/api';
      const res = await axios.get(`${apiBase}/settings/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'quits-data.json');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold mb-4">Data & Export</h2>

      {/* Auto Backup */}
      <div className="space-y-2 bg-white border rounded p-4">
        <p className="font-medium">Automatic Backup</p>
        <div className="flex gap-4">
          {freqOptions.map((f) => (
            <label key={f.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="autoBackup"
                className="form-radio"
                checked={autoBackup === f.id}
                onChange={() => push(f.id)}
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      {/* Manual export */}
      <div className="bg-white border rounded p-4 space-y-4">
        <p className="font-medium">Download your data</p>
        <button
          onClick={triggerExport}
          className="px-4 py-2 rounded bg-[#26457A] text-white hover:bg-[#1B3359] disabled:opacity-50"
          disabled={exporting}
        >
          {exporting ? 'Preparing...' : 'Export as JSON'}
        </button>
      </div>
    </div>
  );
};

export default DataExportSettings; 