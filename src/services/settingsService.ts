import axios from 'axios';

const apiBase = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://api.quits.cc/api';

const settingsService = {
  async getSettings() {
    try {
      const res = await axios.get(`${apiBase}/settings`);
      return res.data;
    } catch (err) {
      console.error('[settingsService] GET failed', err);
      return null;
    }
  },

  async updateSettings(patch: Record<string, any>) {
    try {
      console.log('[settingsService] Sending update request with patch:', patch);
      const res = await axios.put(`${apiBase}/settings`, patch);
      console.log('[settingsService] Received response:', res.data);
      return res.data;
    } catch (err) {
      console.error('[settingsService] UPDATE failed', err);
      throw err;
    }
  },
};

export default settingsService; 