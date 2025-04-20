import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import authService from './services/authService'

// Root wrapper component to initialize services and handle global errors
const Root: React.FC = () => {
  useEffect(() => {
    // Initialize auth service
    try {
      console.log('Initializing auth service...');
      authService.setupAxiosInterceptors();
      console.log('Auth service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
    }
  }, []);

  return (
    <React.StrictMode>
      <AuthProvider>
        <HelmetProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </HelmetProvider>
      </AuthProvider>
    </React.StrictMode>
  );
};

// Error boundary for the root DOM element
const renderApp = () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error('Root element not found!');
      return;
    }
    
    console.log('Rendering app to root element');
    ReactDOM.createRoot(rootElement).render(<Root />);
  } catch (error) {
    console.error('Failed to render app:', error);
    // Display a basic error message if rendering fails
    document.body.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif;">
        <h1 style="color: #e53e3e;">Something went wrong</h1>
        <p>We're sorry, but the application failed to load properly.</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 8px 16px; background-color: #3182ce; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload the page
        </button>
      </div>
    `;
  }
};

// Initialize the app
renderApp();

// Conditionally register service worker only in development
// In production, it should be handled by the hosting platform
if (process.env.NODE_ENV === 'development' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service worker registered:', registration.scope);
      })
      .catch(error => {
        console.error('Service worker registration failed:', error);
      });
  });
}
