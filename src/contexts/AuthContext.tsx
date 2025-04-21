import axios from 'axios';

// Define API base URL
const AUTH_API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://api.quits.cc';

const validateToken = async (token: string) => {
  try {
    const response = await axios.get('/api/auth/me', {
      baseURL: AUTH_API_URL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Rest of the method...
  } catch (error) {
    // Error handling...
  }
}; 