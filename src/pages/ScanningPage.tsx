import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';

interface SubscriptionSuggestion {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingFrequency: string;
  confidence: number;
  emailSubject: string;
  emailDate: string;
}

const ScanningPage = () => {
  const navigate = useNavigate();
  const [scanningStatus, setScanningStatus] = useState<'initial' | 'scanning' | 'analyzing' | 'complete' | 'error'>('initial');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SubscriptionSuggestion[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [statusCheckFailures, setStatusCheckFailures] = useState(0);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Memoize the status polling function to prevent unnecessary recreations
  const pollScanningStatus = useCallback(async (intervalId: NodeJS.Timeout) => {
    try {
      const status = await api.email.getScanningStatus();
      console.log('Scan status update:', status);
      
      // Reset failure counter on successful response
      if (statusCheckFailures > 0) {
        setStatusCheckFailures(0);
      }
      
      if (status.error) {
        if (statusCheckFailures > 5) {
          clearInterval(intervalId);
          setError(status.error);
          setScanningStatus('error');
          return;
        }
        
        console.warn(`Status check returned error: ${status.error}. Continuing polling.`);
        setStatusCheckFailures(prev => prev + 1);
        return;
      }
      
      setProgress(status.progress || 0);
      
      if (status.status === 'analyzing') {
        setScanningStatus('analyzing');
      }
      
      if (status.status === 'complete') {
        clearInterval(intervalId);
        setScanningStatus('complete');
        
        try {
          const suggestionsResponse = await api.email.getSubscriptionSuggestions();
          console.log('Suggestions received:', suggestionsResponse);
          
          if (suggestionsResponse.error) {
            throw new Error(suggestionsResponse.error);
          }
          
          setSuggestions(suggestionsResponse.suggestions || []);
        } catch (suggestionErr) {
          console.error('Error fetching suggestions:', suggestionErr);
          setError('Failed to retrieve subscription suggestions. Please try again.');
          setScanningStatus('error');
        }
      }
    } catch (statusErr) {
      console.error('Error checking scan status:', statusErr);
      setStatusCheckFailures(prev => prev + 1);
      
      // After several failures, stop and show error
      if (statusCheckFailures > 5) {
        clearInterval(intervalId);
        setError('Failed to communicate with the server. Please check your internet connection and try again.');
        setScanningStatus('error');
      }
    }
  }, [statusCheckFailures]);

  useEffect(() => {
    let statusInterval: NodeJS.Timeout;

    const startScanning = async () => {
      try {
        setError(null);
        setScanningStatus('scanning');
        setStatusCheckFailures(0);
        console.log('Starting email scanning process');
        
        // Try to initiate email scanning
        try {
          const scanResponse = await api.email.scanEmails();
          console.log('Scan initiated response:', scanResponse);
          
          if (scanResponse.error) {
            throw new Error(scanResponse.error);
          }
        } catch (scanErr: any) {
          console.error('Initial scan request failed:', scanErr);
          
          // Specific handling for common errors
          if (scanErr.message?.includes('Authentication')) {
            throw new Error('Authentication failed. Please log out and log in again to reconnect your Google account.');
          } else if (scanErr.message?.includes('permission') || scanErr.message?.includes('scope')) {
            throw new Error('Gmail access permission is required. Please log out and log in again with full permissions.');
          } else if (scanErr.message?.includes('Network')) {
            throw new Error('Network connection error. Please check your internet connection and try again.');
          } else {
            // Retry once for general errors
            if (reconnectAttempt === 0) {
              console.log('Retrying scan initiation...');
              setReconnectAttempt(1);
              const retryResponse = await api.email.scanEmails();
              if (retryResponse.error) {
                throw new Error(retryResponse.error);
              }
            } else {
              throw scanErr;
            }
          }
        }
        
        // Poll for scanning status
        statusInterval = setInterval(() => {
          pollScanningStatus(statusInterval);
        }, 2000);

      } catch (err: any) {
        console.error('Scanning error:', err);
        
        let errorMessage = 'Failed to start email scanning';
        
        // More user-friendly error messages
        if (err.message?.includes('Network')) {
          errorMessage = 'Network connection error. Please check your internet connection and try again.';
        } else if (err.message?.includes('Authentication')) {
          errorMessage = 'Authentication failed. Please log out and log in again.';
        } else if (err.message?.includes('permission') || err.message?.includes('scope')) {
          errorMessage = 'Missing Gmail access permission. Please log in again with required permissions.';
        } else if (err.message?.includes('timeout')) {
          errorMessage = 'Request timed out. The server might be busy, please try again.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        setScanningStatus('error');
      }
    };

    startScanning();

    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [isRetrying, pollScanningStatus, reconnectAttempt]);

  const handleRetry = () => {
    setIsRetrying(true);
    setRetryCount(0);
    setProgress(0);
    setReconnectAttempt(0);
    setStatusCheckFailures(0);
    setTimeout(() => setIsRetrying(false), 100); // This triggers the useEffect to run again
  };

  const handleSuggestionAction = async (suggestionId: string, confirmed: boolean) => {
    try {
      setError(null);
      const result = await api.email.confirmSubscriptionSuggestion(suggestionId, confirmed);
      console.log('Suggestion action result:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Remove the processed suggestion from the list
      setSuggestions(prevSuggestions => prevSuggestions.filter(s => s.id !== suggestionId));
      
      // If this was the last suggestion, redirect to dashboard
      if (suggestions.length <= 1) {
        setTimeout(() => navigate('/dashboard'), 500);
      }
    } catch (err: any) {
      console.error('Suggestion action error:', err);
      
      // More specific error message
      let errorMessage = 'Failed to process subscription suggestion';
      if (err.message?.includes('Network')) {
        errorMessage = 'Network error while processing suggestion. Please try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          {error && (
            <div className="bg-red-50 border border-red-400 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-grow">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
                {scanningStatus === 'error' && (
                  <button 
                    onClick={handleRetry}
                    className="ml-3 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}

          <>
            {(scanningStatus === 'initial' || scanningStatus === 'scanning' || scanningStatus === 'analyzing') && (
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                  {scanningStatus === 'initial' && 'Preparing to scan your emails'}
                  {scanningStatus === 'scanning' && 'Scanning your emails'}
                  {scanningStatus === 'analyzing' && 'Analyzing subscription data'}
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  {scanningStatus === 'initial' && 'Getting ready to find your subscriptions...'}
                  {scanningStatus === 'scanning' && 'Looking for subscription confirmation emails...'}
                  {scanningStatus === 'analyzing' && 'Using AI to extract subscription details...'}
                </p>
                <div className="mt-8">
                  <div className="relative">
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                      <div 
                        style={{ width: `${progress}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500 transition-all duration-500"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-600">{progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {scanningStatus === 'error' && !isRetrying && (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Scanning Error</h2>
                <p className="mt-4 text-base text-gray-600">
                  We encountered a problem while scanning your emails. Please try again or go to the dashboard.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}

            {scanningStatus === 'complete' && suggestions.length > 0 && (
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                  Found {suggestions.length} subscription{suggestions.length === 1 ? '' : 's'}
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  Please confirm these subscriptions we found in your emails.
                </p>
                <div className="mt-8 space-y-6">
                  {suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="bg-white shadow rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{suggestion.name}</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {suggestion.price} {suggestion.currency} / {suggestion.billingFrequency}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            Found in email: {suggestion.emailSubject}
                            <br />
                            Date: {new Date(suggestion.emailDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleSuggestionAction(suggestion.id, false)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            Ignore
                          </button>
                          <button
                            onClick={() => handleSuggestionAction(suggestion.id, true)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scanningStatus === 'complete' && suggestions.length === 0 && (
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                  No subscriptions found
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  We couldn't find any subscription confirmation emails. You can add subscriptions manually from your dashboard.
                </p>
                <div className="mt-8">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
};

export default ScanningPage; 