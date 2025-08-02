import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './reducers/authSlice'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import authService from './services/authService'

// Configure the Redux store
const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add other reducers as needed
  }
})

// Export type for the RootState
export type RootState = ReturnType<typeof store.getState>

// Setup axios interceptors for global authentication error handling
authService.setupAxiosInterceptors();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <HelmetProvider>
          <AuthProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </AuthProvider>
        </HelmetProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)

// Conditionally register service worker only in production
// In production, it should be handled by the hosting platform
if (import.meta.env.MODE === 'production' && 'serviceWorker' in navigator) {
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
