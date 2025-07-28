import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';
import { SettingsProvider } from '../context/SettingsContext';
import PersonalizationSettings from '../components/settings/PersonalizationSettings';

const updateMock = vi.fn(async (patch: any) => patch);

vi.mock('../services/settingsService', () => {
  return {
    default: {
      getSettings: vi.fn().mockResolvedValue({ personalization: { theme: 'auto', currency: 'USD', dateFormat: 'mdy' } }),
      updateSettings: updateMock,
    },
  };
});

describe('PersonalizationSettings interactions', () => {
  beforeEach(() => {
    updateMock.mockClear();
  });

  it('changes theme to Dark and triggers update', async () => {
    render(
      <SettingsProvider>
        <PersonalizationSettings />
      </SettingsProvider>
    );

    // Wait for initial load
    await waitFor(() => screen.getByText(/Theme/i));

    // Select Dark
    userEvent.click(screen.getByLabelText('Dark'));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ personalization: expect.objectContaining({ theme: 'dark' }) })
      );
    });
  });

  it('changes currency to EUR and triggers update', async () => {
    render(
      <SettingsProvider>
        <PersonalizationSettings />
      </SettingsProvider>
    );

    await waitFor(() => screen.getByRole('combobox'));

    userEvent.selectOptions(screen.getByRole('combobox'), 'EUR');

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ personalization: expect.objectContaining({ currency: 'EUR' }) })
      );
    });
  });
}); 