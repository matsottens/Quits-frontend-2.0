import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';
import { SettingsProvider } from '../context/SettingsContext';
import NotificationsSettings from '../components/settings/NotificationsSettings';

// Mock the settings service
vi.mock('../services/settingsService', () => ({
  default: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

// Get the mocked service
const mockSettingsService = vi.mocked(await import('../services/settingsService')).default;

describe('NotificationsSettings interactions', () => {
  beforeEach(() => {
    // Reset mocks and set default implementations
    vi.clearAllMocks();
    mockSettingsService.getSettings.mockResolvedValue({ 
      notifications: { priceAlertsEnabled: false } 
    });
    mockSettingsService.updateSettings.mockImplementation(async (patch) => patch);
  });

  it('enables price alerts and triggers update', async () => {
    render(
      <SettingsProvider>
        <NotificationsSettings />
      </SettingsProvider>
    );

    // Wait for initial render
    await waitFor(() => screen.getByText(/Price Increase Alerts/i));

    // Click first switch (price alerts)
    const switches = screen.getAllByRole('switch');
    await userEvent.click(switches[0]);

    await waitFor(() => {
      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ notifications: expect.objectContaining({ priceAlertsEnabled: true }) })
      );
    });
  });
}); 