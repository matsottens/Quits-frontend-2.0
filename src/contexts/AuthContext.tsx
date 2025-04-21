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