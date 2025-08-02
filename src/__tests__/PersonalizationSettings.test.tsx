import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SettingsProvider } from '../context/SettingsContext';
import PersonalizationSettings from '../components/settings/PersonalizationSettings';
import '@testing-library/jest-dom';
import settingsService from '../services/settingsService';

// Mock the settings service
jest.mock('../services/settingsService', () => ({
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
}));

const mockSettingsService = settingsService as jest.Mocked<typeof settingsService>;

describe('PersonalizationSettings interactions', () => {
  beforeEach(() => {
    // Reset mocks and set default implementations
    jest.clearAllMocks();
    mockSettingsService.getSettings.mockResolvedValue({
      personalization: { theme: 'auto', currency: 'USD', dateFormat: 'mdy' },
    });
    mockSettingsService.updateSettings.mockImplementation(async (patch: any) => patch);
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
    await userEvent.click(screen.getByLabelText('Dark'));

    await waitFor(() => {
      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith(
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

    await userEvent.selectOptions(screen.getByRole('combobox'), 'EUR');

    await waitFor(() => {
      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ personalization: expect.objectContaining({ currency: 'EUR' }) })
      );
    });
  });
}); 