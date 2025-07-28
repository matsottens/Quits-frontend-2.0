import axios from 'axios';

const apiBase = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://api.quits.cc/api';

export default {
  async deleteAccount() {
    await axios.delete(`${apiBase}/account`);
  },
}; 