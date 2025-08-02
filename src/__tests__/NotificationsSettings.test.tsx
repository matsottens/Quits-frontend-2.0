import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SettingsProvider } from '../context/SettingsContext';
import NotificationsSettings from '../components/settings/NotificationsSettings';
import '@testing-library/jest-dom';
import settingsService from '../services/settingsService';

// Mock the settings service
jest.mock('../services/settingsService', () => ({
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
}));

const mockSettingsService = settingsService as jest.Mocked<typeof settingsService>;

describe('NotificationsSettings interactions', () => {
  beforeEach(() => {
    // Reset mocks and set default implementations
    jest.clearAllMocks();
    mockSettingsService.getSettings.mockResolvedValue({
      notifications: { priceAlertsEnabled: false },
    });
    mockSettingsService.updateSettings.mockImplementation(async (patch: any) => patch);
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