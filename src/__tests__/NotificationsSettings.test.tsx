import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';
import { SettingsProvider } from '../context/SettingsContext';
import NotificationsSettings from '../components/settings/NotificationsSettings';

const updateMock = vi.fn(async (patch: any) => patch);

vi.mock('../services/settingsService', () => {
  return {
    default: {
      getSettings: vi.fn().mockResolvedValue({ notifications: { priceAlertsEnabled: false } }),
      updateSettings: updateMock,
    },
  };
});

describe('NotificationsSettings interactions', () => {
  beforeEach(() => {
    updateMock.mockClear();
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
    userEvent.click(switches[0]);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ notifications: expect.objectContaining({ priceAlertsEnabled: true }) })
      );
    });
  });
}); 