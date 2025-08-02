import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import '@testing-library/jest-dom';

// Mock settingsService
jest.mock('../services/settingsService', () => {
  return {
    getSettings: jest.fn().mockResolvedValue({ personalization: { theme: 'dark' } }),
    updateSettings: jest.fn().mockImplementation(async (patch: any) => ({ personalization: { theme: patch.theme || 'dark' } })),
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