import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

import api from '../services/api';
import Header from '../components/Header';
import ShapeScan from '../components/HexScan';
import SubscriptionList from '../components/SubscriptionList';
import LoadingSpinner from '../components/LoadingSpinner';

// Define the ScanningStatus type
type ScanningStatus = 'idle' | 'initial' | 'scanning' | 'in_progress' | 'analyzing' | 'ready_for_analysis' | 'complete' | 'completed' | 'error' | 'quota_exhausted';

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

// Removed obsolete ScanStats interface

interface ScanStatus {
  status: ScanningStatus;
  progress: number;
  is_test_data?: boolean;
}

const ScanningPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();

  const [scanId, setScanId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [totalEmails, setTotalEmails] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing scan...');
  const [isTestScan, setIsTestScan] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [statusCheckFailures, setStatusCheckFailures] = useState(0);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);


  const scanInitiatedRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentScanIdRef = useRef<string | null>(null);
  const analysisPhaseStartRef = useRef<number | null>(null);
  const maxRetries = 3;

  const addDebugLog = useCallback((message: string) => {
    setDebugLog(prev => [`${new Date().toISOString()}: ${message}`, ...prev]);
  }, []);

  // Helper to get user-specific localStorage key for the scan ID
  const getScanIdKey = () => {
    if (!user || !user.id) return null;
    return `current_scan_id_${user.id}`;
  };

  const getToken = () => localStorage.getItem('token');

  const MAX_STATUS_CHECK_FAILURES = 5;

  // Removed obsolete scanStats state
  const [isTestData, setIsTestData] = useState<boolean>(false);

  // Add a timer ref to track scan duration
  const scanStartTimeRef = useRef<number | null>(null);
  const MIN_SCAN_DURATION_MS = 5000; // Minimum expected scan duration (5 seconds)

  // Add these new state variables near the top where the others are defined
  const [lastProgressUpdate, setLastProgressUpdate] = useState<number>(Date.now());
  const [lastProgress, setLastProgress] = useState<number>(0);
  const MAX_PROGRESS_STALL_TIME = 20000; // 20 seconds without progress change before auto-forcing completion

  // Constants
  const MAX_ERROR_RETRY_COUNT = 3;
  const ERROR_RETRY_DELAY_MS = 3000;
  const POLLING_INTERVAL_MS = 2000;
  const INITIAL_POLLING_INTERVAL_MS = 1000;
  const PROGRESS_COMPLETE = 100;

  // Add these new constants at the top with other constants
  const MAX_SCAN_DURATION_MS = 10 * 60 * 1000; // Extended to 10 minutes to give Edge Function time
  const MAX_POLLING_COUNT = 200; // Maximum number of times to poll (at 3 second intervals = 10 minutes)

  // Add a new state variable to track polling count
  const [pollingCount, setPollingCount] = useState(0);
  
  // Add a flag to prevent multiple Gemini triggers
  const geminiTriggeredRef = useRef(false);

  // Add a new function to check if the scan has timed out
  const checkScanTimeout = useCallback(() => {
    const hasTimedOut = pollingCount >= MAX_POLLING_COUNT || 
      (scanStartTimeRef.current && (Date.now() - scanStartTimeRef.current > MAX_SCAN_DURATION_MS));
    
    if (hasTimedOut && scanStatus !== 'completed' && scanStatus !== 'error') {
      console.log('Scan timed out after too many polling attempts or maximum duration');
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setScanStatus('error');
      setError('The scan is taking longer than expected. This may be due to Gmail API limitations or server issues. Please try again later.');
      const scanIdKey = getScanIdKey();
      if (scanIdKey) {
        localStorage.removeItem(scanIdKey);
      }
      return true;
    }
    return false;
  }, [pollingCount, scanStatus]);

  // Clear any active polling when component unmounts
  useEffect(() => {
    // Debug logging for scanId
    console.log('Initial scanId state:', scanId);
    const key = getScanIdKey();
    console.log('Initial localStorage scanId:', key ? localStorage.getItem(key) : null);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Start email scanning process
  const startScanning = async () => {
    const scanIdKey = getScanIdKey();
    if (!scanIdKey) {
      setError("Cannot start scan: user is not authenticated.");
      return;
    }
    console.log('SCAN-DEBUG: startScanning called');
    console.log('SCAN-DEBUG: scanInitiatedRef.current:', scanInitiatedRef.current);
    console.log('SCAN-DEBUG: Current scanId state:', scanId);
    console.log('SCAN-DEBUG: localStorage scanId:', localStorage.getItem(scanIdKey!));
    
    // Prevent multiple simultaneous scans
    if (scanInitiatedRef.current) {
      console.log('SCAN-DEBUG: Scan already initiated, skipping');
      return;
    }

    try {
      console.log('SCAN-DEBUG: Starting email scanning process');
      setError(null);
      setScanStatus('scanning');
      scanInitiatedRef.current = true;
      geminiTriggeredRef.current = false; // Reset Gemini trigger flag
      scanStartTimeRef.current = Date.now(); // Record scan start time
      console.log('SCAN-DEBUG: Set scanInitiatedRef.current to true');
      console.log('Starting email scanning process');
      
      console.log('SCAN-DEBUG: About to call api.email.scanEmails()');
      const response = await api.email.scanEmails();
      
      if (!response || !response.scanId) {
        console.error('SCAN-DEBUG: Scan initiation failed, no scanId received.');
        setError('Failed to start the email scan. The server did not return a valid scan ID. Please try again.');
        setScanStatus('error');
        localStorage.removeItem(scanIdKey);
        scanInitiatedRef.current = false; // Reset the flag
        return;
      }
      
      console.log('SCAN-DEBUG: api.email.scanEmails() response:', response);

      // If backend already completed the processing (development mock), skip polling
      if (response.processingCompleted) {
        console.log('SCAN-DEBUG: Scan processing already completed – skipping status polling');
        setProgress(100);
        setScanStatus('completed');
        navigate('/dashboard', { state: { justScanned: true, subscriptionsFound: response?.subscriptions?.length || 0 } });
        return;
      }
      
      // Check for mock response (indicating connection issues)
      if (response.mock) {
        console.log('Received mock response, indicating connectivity issues');
        setError('Could not connect to the scanning service. Please check your internet connection and try again.');
        setScanStatus('error');
        scanInitiatedRef.current = false; // Reset the flag
        return;
      }
      
      if (response.error) {
        throw new Error(response.message || 'Failed to start scanning');
      }
      
      // Store the scan ID for status checks
      if (response.scanId) {
        const newScanId = response.scanId;
        console.log('SCAN-DEBUG: Received scanId from API:', newScanId);
        console.log('SCAN-DEBUG: Previous scanId state:', scanId);
        console.log('SCAN-DEBUG: Previous localStorage scanId:', localStorage.getItem(scanIdKey!));
        
        setScanId(newScanId);
        // Save scanId to localStorage
        localStorage.setItem(scanIdKey, newScanId);
        // Keep a live ref for use inside polling interval closures
        currentScanIdRef.current = newScanId;
        console.log('SCAN-DEBUG: Updated scanId state to:', newScanId);
        console.log('SCAN-DEBUG: Updated localStorage to:', localStorage.getItem(scanIdKey!));
        console.log('Scan started with ID:', newScanId);
        
        // Start polling for status updates with the new ID
        pollScanStatus(newScanId);
      } else {
        console.warn('No scan ID returned from API');
        scanInitiatedRef.current = false; // Reset if no scan ID returned
      }
    } catch (err: any) {
      console.error('Error starting scan:', err);
      
      // Always reset the flag on error
      scanInitiatedRef.current = false;
      
      // Handle authentication-specific errors
      if (err.message?.includes('Authentication') || 
          err.message?.includes('token') || 
          err.message?.includes('Gmail access') ||
          err.response?.status === 401 ||
          err.response?.status === 403) {
        
        setScanStatus('error');
        setError('Session expired. Please log in again.');
        
        // Clear any stored scan data
        const scanIdKey = getScanIdKey();
        if (scanIdKey) {
          localStorage.removeItem(scanIdKey);
        }
        
        // Wait 3 seconds to show the message, then log out
        setTimeout(() => {
          logout();
        }, 3000);
        
        return;
      }
      
      // For other errors, allow retries
      setError('Failed to start email scanning. Please try again or check if Gmail API access is properly authorized.');
      setScanStatus('error');
      
      // Only allow manual retries after multiple automatic attempts fail
      if (retryCount >= maxRetries) {
        console.log(`Maximum retry attempts (${maxRetries}) reached. Waiting for manual retry.`);
        return;
      }
      
      // Increment retry count
      const currentRetryCount = retryCount + 1;
      setRetryCount(currentRetryCount);
      console.log(`Retrying scan initiation... Attempt ${currentRetryCount}/${maxRetries}`);
      
      // Use exponential backoff for retries (2s, 4s, 8s)
      const delay = Math.pow(2, currentRetryCount) * 1000;
      setTimeout(() => {
        startScanning();
      }, delay);
    }
  };

  // Poll for scan status
  const pollScanStatus = (initialScanId: string | null) => {
    if (!initialScanId) {
      console.warn('Cannot start polling: No scan ID provided');
      return;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setPollingCount(0); // Reset polling count
    
    // Update the live ref immediately
    currentScanIdRef.current = initialScanId;
    const scanIdToUse = initialScanId; // It's guaranteed to be a string here
    
    if (scanIdToUse) {
      // Set initial poll immediately with the current scan ID
      checkScanStatus(scanIdToUse);
      
      // Set up the polling interval
      pollingIntervalRef.current = setInterval(() => {
        setPollingCount(prev => {
          const newCount = prev + 1;
          // Check for timeout on each polling increment
          if (newCount >= MAX_POLLING_COUNT) {
            checkScanTimeout();
          }
          return newCount;
        });
        // Always poll with the latest known scan ID to avoid stale closures
        const key = getScanIdKey();
        const latest = currentScanIdRef.current || (key ? localStorage.getItem(key) : null);
        if (latest) {
          checkScanStatus(latest);
        }
      }, 3000);
    } else {
      console.warn('Cannot start polling: No scan ID available');
    }
  };

  // Check the scanning status
  const checkScanStatus = async (providedScanId?: string) => {
    try {
      const scanIdKey = getScanIdKey();
      if (!scanIdKey) {
        console.warn("Scan status check skipped: no user ID found.");
        return;
      }
      // Determine which scan ID to query using a live ref to avoid stale closures
      const currentScanId = providedScanId || currentScanIdRef.current || localStorage.getItem(scanIdKey!);
      
      console.log('SCAN-DEBUG: Checking scan status for scanId:', currentScanId);
      console.log('SCAN-DEBUG: Provided scanId:', providedScanId);
      console.log('SCAN-DEBUG: Current scanId state:', scanId);
      console.log('SCAN-DEBUG: localStorage scanId:', localStorage.getItem(scanIdKey!));
      
      if (!currentScanId) {
        console.log('SCAN-DEBUG: No scanId available, cannot check status');
        return;
      }
      
      // Accept any non-empty scan ID; backend now uses UUIDs directly
      if (currentScanId.trim().length === 0) {
        console.error('SCAN-DEBUG: Empty scan ID');
        setError('Invalid scan ID. Please try again.');
        localStorage.removeItem(scanIdKey);
        return;
      }
      
      // Use the API service instead of fetch to go through authentication interceptors
      const data = await api.email.getScanStatus(currentScanId);
      
      // Handle scan not found or pending state gracefully
      if (data && (data.status === 'pending' || data.error === 'scan_not_found')) {
        // Keep polling; do not clear scan ID or set error
        return;
      }
      
      const { status: uiStatus, progress, stats, scan_id: returnedScanId, warning, completed_count } = data;
      
      // Log warning if present
      if (warning) {
        console.log('SCAN-DEBUG: API warning:', warning);
      }
      
      // Update scan ID if the API returned a different one (e.g., latest scan)
      if (returnedScanId && returnedScanId !== currentScanId) {
        console.log('SCAN-DEBUG: API returned different scan ID:', returnedScanId, 'updating from:', currentScanId);
        setScanId(returnedScanId);
        const scanIdKey = getScanIdKey();
        if (scanIdKey) {
          localStorage.setItem(scanIdKey, returnedScanId);
        }
        currentScanIdRef.current = returnedScanId;
        
        // Show a brief message to the user about the scan ID change
        if (warning) {
          setError(warning);
          // Clear the warning after 3 seconds
          setTimeout(() => setError(null), 3000);
        }
        
        // Restart polling with the new scan ID
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        pollScanStatus(returnedScanId);
        return; // Exit early to avoid processing with old scan ID
      }
      
      // Update scanning status - ensure we don't lose the scanning state
      if (uiStatus && uiStatus !== 'error') {
        setScanStatus(uiStatus);
      }
      
      // Removed obsolete scanStats update logic
      
      // Use the progress from the API (which now handles two-phase calculation)
      // Remove this block from checkScanStatus:
      // if (progress !== undefined && progress !== null) {
      //   // Only update progress if it's a valid number and not 100 (which is handled by step-based effect)
      //   if (progress < 100) {
      //     setProgress(progress);
      //   }
      // }
      
      // Handle different scan statuses
      if (uiStatus === 'completed' || uiStatus === 'complete') {
        analysisPhaseStartRef.current = null;
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setScanStatus('completed');
        
        // Ensure future scans are not blocked by a stale scan_id from this run.
        const scanIdKeyForRemoval = getScanIdKey();
        if (scanIdKeyForRemoval) {
          localStorage.removeItem(scanIdKeyForRemoval);
        }
        
        // Show 100% for a brief moment so users perceive completion, then
        // take them to their updated dashboard.
        setTimeout(() => {
          navigate('/dashboard', { state: { justScanned: true } });
        }, 1000);

      } else if (uiStatus === 'error' || uiStatus === 'failed') {
        analysisPhaseStartRef.current = null;
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setScanStatus('error');
        setError(data.error || 'An error occurred during scanning');
        // Clear scan ID from localStorage on error
        const scanIdKey = getScanIdKey();
        if (scanIdKey) {
          localStorage.removeItem(scanIdKey);
        }
      } else if (uiStatus === 'quota_exhausted') {
        analysisPhaseStartRef.current = null;
        // Handle quota exhaustion - if subscriptions were found, consider it complete
        const subscriptionsFound = stats?.subscriptionsFound || 0;
        
        if (subscriptionsFound > 0) {
          console.log(`Quota exhausted but ${subscriptionsFound} subscriptions found via pattern matching - treating as complete`);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setScanStatus('completed');
          // Show 100% for 1s before redirecting
          setTimeout(() => {
            navigate('/dashboard', { state: { justScanned: true } });
          }, 1000);
        } else {
          // No subscriptions found, continue polling for quota reset
          setScanStatus('analyzing'); // Keep showing progress bar
          setError('AI analysis quota temporarily exhausted. Analysis will resume automatically when quota resets.');
          // Continue polling but with longer intervals
          const pollInterval = 10000; // 10 seconds for quota exhausted scans
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = setInterval(() => {
              setPollingCount(prev => {
                const newCount = prev + 1;
                if (newCount >= MAX_POLLING_COUNT) {
                  checkScanTimeout();
                }
                return newCount;
              });
              checkScanStatus();
            }, pollInterval);
          }
        }
      } else {
        // Local-dev fast path: if we're in analysis phase for too long locally, mark as complete
        if ((uiStatus === 'ready_for_analysis' || uiStatus === 'analyzing') && window.location.hostname === 'localhost') {
          if (analysisPhaseStartRef.current == null) {
            analysisPhaseStartRef.current = Date.now();
          } else if (Date.now() - analysisPhaseStartRef.current > 7000) {
            // Consider complete in local dev to avoid being stuck at 80%
            analysisPhaseStartRef.current = null;
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setScanStatus('completed');
            setTimeout(() => {
              navigate('/dashboard', { state: { justScanned: true } });
            }, 500);
            return;
          }
        } else {
          analysisPhaseStartRef.current = null;
        }
        // Continue scanning - let the cron job handle Gemini analysis triggering
        // The cron job runs every minute; as fallback, if analysis is already detecting results we can redirect early
        // Removed premature redirect during 'analyzing' phase. The UI will now wait
        // until the scan history status is strictly 'completed' before navigating to
        // the dashboard. This ensures the Edge Function has finalized all subscription
        // analyses and results are fully written to the database before redirecting.
        
        // Continue polling - more frequently during analysis phase
        const pollInterval = (uiStatus === 'ready_for_analysis' || uiStatus === 'analyzing') ? 2000 : 3000;
        
        // Update the polling interval if needed
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = setInterval(() => {
            setPollingCount(prev => {
              const newCount = prev + 1;
              // Check for timeout on each polling increment
              if (newCount >= MAX_POLLING_COUNT) {
                checkScanTimeout();
              }
              return newCount;
            });
            const key = getScanIdKey();
            const latest = currentScanIdRef.current || (key ? localStorage.getItem(key) : null);
            if (latest) {
              checkScanStatus(latest);
            }
          }, pollInterval);
        }
      }
    } catch (error: any) {
      console.error('Error checking scan status:', error);
      
      // Handle authentication-specific errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Authentication error detected in checkScanStatus');
        setScanStatus('error');
        setError('Session expired. Please log in again.');
        
        // Clear any stored scan data
        const scanIdKey = getScanIdKey();
        if (scanIdKey) {
          localStorage.removeItem(scanIdKey);
        }
        
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // Wait 3 seconds to show the message, then log out
        setTimeout(() => {
          logout();
        }, 3000);
        
        return;
      }
      
      setError('Failed to check scan status. Please try again.');
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
    geminiTriggeredRef.current = false; // Reset Gemini trigger flag
    // Clear the current scanId from localStorage
    const scanIdKey = getScanIdKey();
    if (scanIdKey) {
      localStorage.removeItem(scanIdKey);
    }
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

  // --- SCAN FREQUENCY AWARE SCAN FLOW --------------------------------------
  // Check user's scan frequency setting and only start scans when appropriate
  useEffect(() => {
    console.log('SCAN-DEBUG: useEffect triggered');
    console.log('SCAN-DEBUG: authLoading:', authLoading);
    console.log('SCAN-DEBUG: user:', user);
    console.log('SCAN-DEBUG: isAuthenticated:', isAuthenticated);

    if (authLoading) {
      console.log('SCAN-DEBUG: Auth is loading, waiting...');
      return;
    }

    if (!isAuthenticated) {
      const stored = localStorage.getItem('token');
      if (!stored) {
        console.log('SCAN-DEBUG: No auth token, redirecting to login');
        navigate('/login');
      } else {
        console.log('SCAN-DEBUG: Token present but auth not ready – waiting');
      }
      return;
    }
 
    if (!user) {
      console.log('SCAN-DEBUG: Authenticated but user object not yet available, waiting');
      return; // Wait until AuthContext provides user details
    }

    const scanIdKey = getScanIdKey();
    console.log('SCAN-DEBUG: scanIdKey:', scanIdKey);
    
    if (scanIdKey) {
      // Remove any stale scan reference so the backend will create a new row
      localStorage.removeItem(scanIdKey);
    }

    // Ensure we start from a clean state (do not reset scanInitiatedRef here to avoid double-starts in React StrictMode)
    setScanId(null);
    setScanStatus('idle');
    setProgress(0);

    // Start the scan automatically only if not already initiated
    if (!scanInitiatedRef.current) {
      console.log('SCAN-DEBUG: Starting scan automatically');
      startScanning();
    } else {
      console.log('SCAN-DEBUG: Scan already initiated, skipping auto-start');
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isAuthenticated, navigate]);

  // Add a debugging effect to log state changes
  useEffect(() => {
    console.log('ScanningStatus changed to:', scanStatus);
  }, [scanStatus]);

  // Add redirect when status completes (additional safety)
  useEffect(() => {
    if (scanStatus === 'completed' || scanStatus === 'complete') {
      const timer = setTimeout(() => navigate('/dashboard', { state: { justScanned: true } }), 1000);
      return () => clearTimeout(timer);
    }
  }, [scanStatus, navigate]);

  // --- STEP-BASED PROGRESS CONFIGURATION -------------------------------------
  // Map every status that can appear in the scan_history table to a percentage
  // shown on the progress bar.  This keeps the UI in sync with backend state and
  // works for both new and returning users.
  const STATUS_PROGRESS_MAP: Record<ScanningStatus, number> = {
    idle: 0,
    initial: 0,
    scanning: 10,
    in_progress: 30,
    ready_for_analysis: 70,
    analyzing: 80,
    complete: 100,     // some legacy flows use "complete"
    completed: 100,
    error: 0,          // keep at 0 – the error banner will be shown instead
    quota_exhausted: 90
  };

  // Step-based progress bar logic – whenever the status coming from the backend
  // changes, look up the corresponding percentage and apply it.  This gives a
  // deterministic "jump" between clearly defined steps rather than a smooth
  // incremental bar.  The mapping is defined in STATUS_PROGRESS_MAP above.
  useEffect(() => {
    const mapped = STATUS_PROGRESS_MAP[scanStatus as ScanningStatus];
    if (mapped !== undefined && mapped !== progress) {
      setProgress(mapped);
    }
  }, [scanStatus, progress]);

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
      
      // Handle authentication-specific errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('Authentication error detected in handleSuggestionAction');
        setError('Session expired. Please log in again.');
        
        // Let the axios interceptor handle the logout and redirect
        return;
      }
      
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
      const token = getToken();
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }

      const response = await axios.get('https://api.quits.cc/api/debug-google-token', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const data = response.data;
      if (data.tokenInfo.gmail_token_present) {
        setError(null);
        console.log('Gmail token is present:', data.tokenInfo);
        alert(`Gmail token is present! Length: ${data.tokenInfo.gmail_token_length}, Prefix: ${data.tokenInfo.gmail_token_prefix}`);
      } else {
        setError('Gmail token is missing from your JWT. Please re-authenticate with Gmail permissions.');
      }
    } catch (err: any) {
      console.error('Error checking Gmail token:', err);
      
      // Handle authentication-specific errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('Authentication error detected in checkGmailToken');
        setError('Session expired. Please log in again.');
        return;
      }
      
      setError(`Error checking token: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Add a debug function
  const testGmailConnection = async () => {
    try {
      setError('Testing Gmail API connection...');
      const token = getToken();
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }

      const response = await axios.get('https://api.quits.cc/api/debug-gmail', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const data = response.data;
      setError(null);
      console.log('Gmail API test:', data);
      alert(`Gmail API test results:\n- Connected: ${data.connected}\n- Messages: ${data.messageCount}\n- Error: ${data.error || 'None'}`);
    } catch (err: any) {
      console.error('Error testing Gmail API:', err);
      
      // Handle authentication-specific errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('Authentication error detected in testGmailConnection');
        setError('Session expired. Please log in again.');
        return;
      }
      
      setError(`Error testing Gmail API: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Add a new diagnostic function 
  const diagnoseScan = async () => {
    try {
      setError('Running diagnostic checks...');
      const token = getToken();
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }

      const key = getScanIdKey();
      const currentScanId = scanId || (key ? localStorage.getItem(key) : null);
      if (!currentScanId) {
        setError('No scan ID available for diagnostics.');
        return;
      }

      const response = await axios.get(`https://api.quits.cc/api/debug-gmail?scanId=${currentScanId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const data = response.data;
      console.log('Diagnostic results:', data);
      
      // Format diagnostic info for display
      let diagnosticMessage = `Scan Diagnostics for ID: ${currentScanId}\n\n`;
      
      // Check Gmail connection
      diagnosticMessage += `Gmail Connection: ${data.gmail.connected ? '✅ Connected' : '❌ Not Connected'}\n`;
      if (data.gmail.error) {
        diagnosticMessage += `Gmail Error: ${data.gmail.error}\n`;
      }
      
      // Check database connection and scan
      diagnosticMessage += `\nDatabase Connection: ${data.database.connected ? '✅ Connected' : '❌ Not Connected'}\n`;
      if (data.database.error) {
        diagnosticMessage += `Database Error: ${data.database.error}\n`;
      }
      
      // Check scan status if found
      if (data.database.scan && data.database.scan.found) {
        const scanData = data.database.scan.scan_data;
        diagnosticMessage += `\nScan Status: ${scanData.status}\n`;
        diagnosticMessage += `Progress: ${scanData.progress}%\n`;
        diagnosticMessage += `Emails Found: ${scanData.emails_found}\n`;
        diagnosticMessage += `Emails Processed: ${scanData.emails_processed} / ${scanData.emails_to_process}\n`;
        diagnosticMessage += `Last Updated: ${new Date(scanData.updated_at).toLocaleString()}\n`;
      } else if (data.database.scan && data.database.scan.found_in_legacy_table) {
        diagnosticMessage += `\nScan found in legacy table\n`;
      } else {
        diagnosticMessage += `\nScan not found in database\n`;
      }
      
      // Show diagnostic info to user
      alert(diagnosticMessage);
      
      // Update error message with a summary
      if (!data.gmail.connected) {
        setError(`Gmail connection issue: ${data.gmail.error}. Please reconnect your Gmail account.`);
      } else if (data.database.error) {
        setError(`Database issue: ${data.database.error}. Please try again later.`);
      } else if (!data.database.scan || (!data.database.scan.found && !data.database.scan.found_in_legacy_table)) {
        setError(`Scan record not found in database. Please try again.`);
      } else {
        setError(`Diagnostic completed. Check console for details.`);
      }
    } catch (err: any) {
      console.error('Error running diagnostics:', err);
      
      // Handle authentication-specific errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('Authentication error detected in diagnoseScan');
        setError('Session expired. Please log in again.');
        return;
      }
      
      setError(`Error running diagnostics: ${err instanceof Error ? err.message : String(err)}`);
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
                {scanStatus === 'error' && (
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
                    <button 
                      onClick={testGmailConnection}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Test Gmail API
                    </button>
                    <button 
                      onClick={diagnoseScan}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      Diagnose Scan
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <>

            {(scanStatus === 'idle' || scanStatus === 'initial' || scanStatus === 'scanning' || scanStatus === 'analyzing' || scanStatus === 'in_progress' || scanStatus === 'ready_for_analysis' || scanStatus === 'quota_exhausted') && (
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                  {scanStatus === 'initial' && 'Preparing to scan your emails'}
                  {(scanStatus === 'scanning' || scanStatus === 'in_progress') && 'Fetching emails'}
                  {(scanStatus === 'analyzing' || scanStatus === 'ready_for_analysis') && 'Analyzing subscriptions'}
                  {scanStatus === 'quota_exhausted' && 'AI Analysis Paused'}
                  {scanStatus === 'idle' && 'Starting scan...'}
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  {scanStatus === 'initial' && 'Getting ready to find your subscriptions...'}
                  {(scanStatus === 'scanning' || scanStatus === 'in_progress') && 'Please wait while we fetch your emails...'}
                  {(scanStatus === 'analyzing' || scanStatus === 'ready_for_analysis') && 'Extracting subscription details...'}
                  {scanStatus === 'quota_exhausted' && 'AI quota temporarily exhausted. Analysis will resume automatically...'}
                  {scanStatus === 'idle' && 'Initializing scan process...'}
                </p>
                <div className="mt-8">
                  {/* Hexagon Scan Animation */}
                  <div className="w-full max-w-md mx-auto mb-6 flex flex-col items-center">
                    <ShapeScan size={128} sides={6} />
                    <div className="mt-4 text-sm text-gray-600 text-center">
                      {progress}% Complete
                    </div>
                  </div>
                  
                  {/* Phase indicator */}
                  <div className="mt-8 text-sm text-gray-700 space-y-4">
                    {(scanStatus === 'scanning' || scanStatus === 'in_progress') && (
                      <div className="bg-blue-50 p-4 rounded border-2 border-primary-600">
                        <p className="font-medium text-primary-700">Phase 1: Reading Emails</p>
                        <p className="text-primary-600">Searching your Gmail for subscription emails...</p>
                      </div>
                    )}
                    {(scanStatus === 'ready_for_analysis' || scanStatus === 'analyzing') && (
                      <div className="bg-gray-50 p-4 rounded border-2 border-primary-600">
                        <p className="font-medium text-primary-700">Phase 2: AI Analysis</p>
                      </div>
                    )}
                    {scanStatus === 'quota_exhausted' && (
                      <div className="bg-yellow-50 p-3 rounded">
                        <p className="font-medium text-yellow-800">Phase 2: AI Analysis (Paused)</p>
                        <p className="text-yellow-600">AI quota temporarily exhausted. Analysis will resume automatically when quota resets...</p>
                      </div>
                    )}
                  </div>

                  {/* Removed obsolete email processing stats */}

                  {/* Info sentence */}
                  <p className="text-gray-600 text-center">Please wait, this might take a few minutes.</p>
                </div>
              </div>
            )}

            {scanStatus === 'error' && !isRetrying && (
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
                  <button
                    onClick={diagnoseScan}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Run Diagnostics
                  </button>
                </div>
              </div>
            )}

            {scanStatus === 'completed' && suggestions.length > 0 && (
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
          </>
        </div>
      </div>
    </div>
  );
};

export default ScanningPage; 
