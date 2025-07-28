import React, { createContext, useContext, useEffect, useState } from 'react';
import settingsService from '../services/settingsService';

export interface Settings {
  // This is a flexible shape for now; narrow as the schema stabilizes
  notifications?: Record<string, any>;
  personalization?: Record<string, any>;
  privacy?: Record<string, any>;
  email?: Record<string, any>;
  integrations?: Record<string, any>;
  data?: Record<string, any>;
  [key: string]: any;
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  refresh: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data || {});
    } catch (err) {
      console.error('[SettingsContext] Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const update = async (patch: Partial<Settings>) => {
    try {
      const updated = await settingsService.updateSettings(patch);
      setSettings(updated);
    } catch (err) {
      console.error('[SettingsContext] Failed to update settings', err);
    }
  };

  const value: SettingsContextType = {
    settings,
    loading,
    refresh: fetchSettings,
    update,
  };

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
};

export default SettingsContext; 