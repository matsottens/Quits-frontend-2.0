// API base URL - Use a relative path for local dev to use the proxy
const API_URL = window.location.hostname === 'localhost' 
  ? '/api' 
  : 'https://api.quits.cc';

// Auth-specific API URL (also use relative path for local dev)
const AUTH_API_URL = window.location.hostname === 'localhost'
  ? '/api'
  : 'https://api.quits.cc'; 