import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';

// Define the ScanningStatus type
type ScanningStatus = 'idle' | 'initial' | 'scanning' | 'analyzing' | 'complete' | 'error';

interface SubscriptionSuggestion {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_frequency: string;
  confidence: number;
  email_subject: string;
  email_from: string;
  email_date: string;
  next_billing_date: string | null;
}

const ScanningPage = () => {
  const navigate = useNavigate();
  const [scanningStatus, setScanningStatus] = useState<ScanningStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SubscriptionSuggestion[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [statusCheckFailures, setStatusCheckFailures] = useState(0);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [scanId, setScanId] = useState<string | null>(() => {
    // Try to get scanId from localStorage on initial load
    return localStorage.getItem('current_scan_id');
  });
  const scanInitiatedRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  const MAX_STATUS_CHECK_FAILURES = 5;

  // Add these new state variables near the top
  const [scanStats, setScanStats] = useState<{
    emails_found: number;
    emails_to_process: number;
    emails_processed: number;
    subscriptions_found: number;
  }>({
    emails_found: 0,
    emails_to_process: 0,
    emails_processed: 0,
    subscriptions_found: 0
  });

  // Clear any active polling when component unmounts
  useEffect(() => {
    // Debug logging for scanId
    console.log('Initial scanId state:', scanId);
    console.log('Initial localStorage scanId:', localStorage.getItem('current_scan_id'));
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Start email scanning process
  const startScanning = async () => {
    if (scanInitiatedRef.current) {
      console.log('Scan already initiated, skipping');
      return;
    }

    try {
      setError(null);
      setScanningStatus('scanning');
      scanInitiatedRef.current = true;
      console.log('Starting email scanning process');
      
      const response = await api.email.scanEmails();
      
      // Check for mock response (indicating connection issues)
      if (response.mock) {
        console.log('Received mock response, indicating connectivity issues');
        setError('Could not connect to the scanning service. Please check your internet connection and try again.');
        setScanningStatus('error');
        scanInitiatedRef.current = false;
        return;
      }
      
      if (response.error) {
        throw new Error(response.message || 'Failed to start scanning');
      }
      
      // Store the scan ID for status checks
      if (response.scanId) {
        const newScanId = response.scanId;
        setScanId(newScanId);
        // Save scanId to localStorage
        localStorage.setItem('current_scan_id', newScanId);
        console.log('Scan started with ID:', newScanId);
        
        // Start polling for status updates with the new ID
        pollScanStatus(newScanId);
      } else {
        console.warn('No scan ID returned from API');
      }
    } catch (err: any) {
      console.error('Error starting scan:', err);
      
      // Handle authentication-specific errors
      if (err.message?.includes('Authentication') || 
          err.message?.includes('token') || 
          err.message?.includes('Gmail access')) {
        // Don't show an error here since we're redirecting to login
        // The window.location redirect in the API service will handle this
        setScanningStatus('error');
        setError('Authentication error. Redirecting to login...');
        return;
      }
      
      // For other errors, allow retries
      setError('Failed to start email scanning. Please try again or check if Gmail API access is properly authorized.');
      setScanningStatus('error');
      
      // Only allow manual retries after multiple automatic attempts fail
      if (retryCount >= maxRetries) {
        console.log(`Maximum retry attempts (${maxRetries}) reached. Waiting for manual retry.`);
        scanInitiatedRef.current = false;
        return;
      }
      
      // Increment retry count
      const currentRetryCount = retryCount + 1;
      setRetryCount(currentRetryCount);
      console.log(`Retrying scan initiation... Attempt ${currentRetryCount}/${maxRetries}`);
      
      // Use exponential backoff for retries (2s, 4s, 8s)
      const delay = Math.pow(2, currentRetryCount) * 1000;
      setTimeout(() => {
        scanInitiatedRef.current = false; // Allow retry
        startScanning();
      }, delay);
    }
  };

  // Poll for scan status
  const pollScanStatus = (currentScanId = scanId) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Set initial poll immediately with the current scan ID
    if (currentScanId) {
      checkScanStatus(currentScanId);
      
      // Then poll every 3 seconds
      pollingIntervalRef.current = setInterval(() => checkScanStatus(currentScanId), 3000);
    } else {
      console.warn('Cannot start polling: No scan ID available');
    }
  };

  // Check the scanning status
  const checkScanStatus = async (currentScanId = scanId) => {
    try {
      if (!currentScanId) {
        console.warn('No scan ID available for status check');
        // Debug info
        console.log('  → scanId state:', scanId);
        console.log('  → localStorage scanId:', localStorage.getItem('current_scan_id'));
        return;
      }
      
      const statusResponse = await api.email.getScanStatus(currentScanId);
      
      // Handle the case where the scan ID isn't recognized
      if (statusResponse.error === 'scan_not_found') {
        console.warn('Scan ID not found or expired:', currentScanId);
        // Clear the scanId state
        setScanId(null);
        setError('Previous scan data not found. Starting a new scan...');
        setScanningStatus('error');
        scanInitiatedRef.current = false;
        
        // Wait a moment and initiate a new scan
        setTimeout(() => {
          handleRetry();
        }, 2000);
        return;
      }
      
      // Reset status check failure counter on success
      setStatusCheckFailures(0);
      
      if (statusResponse.error) {
        throw new Error(statusResponse.error);
      }
      
      const { status, progress: scanProgress, stats } = statusResponse;
      
      // Update state based on status
      setScanningStatus(status);
      setProgress(scanProgress || 0);
      
      // Update scan stats if available
      if (stats) {
        setScanStats(stats);
      }
      
      // If complete, stop polling and get suggestions
      if (status === 'complete') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        try {
          // Get subscription suggestions
          const suggestionsResponse = await api.email.getSubscriptionSuggestions();
          
          if (suggestionsResponse.error) {
            console.warn('Error in suggestions response:', suggestionsResponse.error);
            setSuggestions([]); // Set empty array as fallback
          } else {
            setSuggestions(suggestionsResponse.suggestions || []);
          }
        } catch (suggestionError) {
          console.error('Error fetching suggestions:', suggestionError);
          setError('Scanning completed, but there was a problem retrieving your subscription suggestions.');
          setSuggestions([]); // Set empty array as fallback
        }
      }
      
      // If error, stop polling
      if (status === 'error') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setError('An error occurred during email scanning.');
      }
    } catch (err) {
      console.error('Error checking scan status:', err);
      
      // Increment failure counter
      const newFailures = statusCheckFailures + 1;
      setStatusCheckFailures(newFailures);
      
      // After 5 consecutive failures, stop polling and show error
      if (newFailures >= 5) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setScanningStatus('error');
        setError('Lost connection to the scanning service. Please try again.');
        scanInitiatedRef.current = false;
      }
      // Otherwise, continue polling
    }
  };

  // Handle manual retry
  const handleRetry = () => {
    console.log('Manual retry requested');
    setIsRetrying(true);
    setRetryCount(0);
    setProgress(0);
    setReconnectAttempt(0);
    setStatusCheckFailures(0);
    // Clear the current scanId from localStorage
    localStorage.removeItem('current_scan_id');
    scanInitiatedRef.current = false;
    
    // Stop any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setTimeout(() => {
      setIsRetrying(false);
      startScanning();
    }, 500);
  };

  // Start scanning when component mounts, only once
  useEffect(() => {
    const initiateScanning = () => {
      if (scanningStatus === 'idle') {
        // If we have a scanId from localStorage but no active scanning
        if (scanId && !scanInitiatedRef.current) {
          console.log(`Found existing scan ID ${scanId} in localStorage, resuming polling`);
          setScanningStatus('scanning');
          scanInitiatedRef.current = true;
          pollScanStatus(scanId);
        } 
        // Otherwise start a new scan
        else if (!scanInitiatedRef.current) {
          startScanning();
        }
      }
    };
    
    initiateScanning();
    
    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

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

  // Add a debug function
  const checkGmailToken = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }

      const response = await fetch('https://api.quits.cc/api/debug-google-token', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        setError(`Token check failed: ${response.status}`);
        return;
      }

      const data = await response.json();
      if (data.tokenInfo.gmail_token_present) {
        setError(null);
        console.log('Gmail token is present:', data.tokenInfo);
        alert(`Gmail token is present! Length: ${data.tokenInfo.gmail_token_length}, Prefix: ${data.tokenInfo.gmail_token_prefix}`);
      } else {
        setError('Gmail token is missing from your JWT. Please re-authenticate with Gmail permissions.');
      }
    } catch (err) {
      console.error('Error checking Gmail token:', err);
      setError(`Error checking token: ${err instanceof Error ? err.message : String(err)}`);
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
                  <div className="mt-4 flex gap-2 justify-center">
                    <button 
                      onClick={handleRetry}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      disabled={isRetrying}
                    >
                      {isRetrying ? 'Retrying...' : 'Try Again'}
                    </button>
                    <button 
                      onClick={checkGmailToken}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Check Gmail Token
                    </button>
                  </div>
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
                  
                  {/* Show scan stats when emails are being processed */}
                  {scanningStatus === 'scanning' && scanStats.emails_found > 0 && (
                    <div className="mt-4 text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      <p>Found <strong>{scanStats.emails_found}</strong> emails</p>
                      <p>Processing <strong>{scanStats.emails_to_process}</strong> recent emails</p>
                      <p>Processed <strong>{scanStats.emails_processed}</strong> so far</p>
                      {scanStats.subscriptions_found > 0 && (
                        <p className="text-green-600 font-medium">
                          Found <strong>{scanStats.subscriptions_found}</strong> subscription{scanStats.subscriptions_found !== 1 ? 's' : ''}!
                        </p>
                      )}
                    </div>
                  )}
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
                  We detected these subscriptions in your emails. Review and confirm them to add to your dashboard.
                </p>
                <div className="mt-8 space-y-6">
                  {suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="bg-white shadow rounded-lg p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">{suggestion.name}</h3>
                            {suggestion.confidence > 0.8 && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                High Confidence
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p className="font-medium">
                              {suggestion.price} {suggestion.currency} / {suggestion.billing_frequency}
                            </p>
                            {suggestion.next_billing_date && (
                              <p>
                                Next billing: {new Date(suggestion.next_billing_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>
                              <span className="font-medium">From:</span> {suggestion.email_from}
                            </p>
                            <p>
                              <span className="font-medium">Subject:</span> {suggestion.email_subject}
                            </p>
                            <p>
                              <span className="font-medium">Date:</span> {new Date(suggestion.email_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 md:mt-0 flex flex-row md:flex-col space-x-3 md:space-x-0 md:space-y-3">
                          <button
                            onClick={() => handleSuggestionAction(suggestion.id, true)}
                            className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            Add Subscription
                          </button>
                          <button
                            onClick={() => handleSuggestionAction(suggestion.id, false)}
                            className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            Ignore
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