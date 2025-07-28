import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import { SettingsProvider, useSettings } from '../context/SettingsContext';

// Mock settingsService
vi.mock('../services/settingsService', () => {
  return {
    default: {
      getSettings: vi.fn().mockResolvedValue({ personalization: { theme: 'dark' } }),
      updateSettings: vi.fn().mockImplementation(async (patch) => ({ personalization: { theme: patch.theme || 'dark' } })),
    },
  };
});

const TestComponent = () => {
  const { settings, loading } = useSettings();
  if (loading) return <div>loading</div>;
  return <div data-testid="theme">{settings?.personalization?.theme}</div>;
};

describe('SettingsContext', () => {
  it('loads settings from service', async () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('dark'));
  });
}); 