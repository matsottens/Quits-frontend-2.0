import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

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

interface ScanStats {
  emailsFound: number;
  emailsToProcess: number;
  emailsProcessed: number;
  subscriptionsFound: number;
}

interface ScanStatus {
  status: ScanningStatus;
  progress: number;
  stats: ScanStats;
  is_test_data?: boolean;
}

const ScanningPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { settings } = useSettings();
  const [scanningStatus, setScanningStatus] = useState<ScanningStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SubscriptionSuggestion[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [statusCheckFailures, setStatusCheckFailures] = useState(0);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [scanId, setScanId] = useState<string | null>(null);
  // user already destructured above; remove duplicate

  // Refs to manage polling and scan state
  const scanInitiatedRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  // Helper to get user-specific localStorage key for the scan ID
  const getScanIdKey = () => {
    if (!user || !user.id) return null;
    return `current_scan_id_${user.id}`;
  };

  const getToken = () => localStorage.getItem('token');

  const MAX_STATUS_CHECK_FAILURES = 5;

  // Add these new state variables near the top
  const [scanStats, setScanStats] = useState<ScanStats | null>(null);
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
    
    if (hasTimedOut && scanningStatus !== 'completed' && scanningStatus !== 'error') {
      console.log('Scan timed out after too many polling attempts or maximum duration');
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setScanningStatus('error');
      setError('The scan is taking longer than expected. This may be due to Gmail API limitations or server issues. Please try again later.');
      const scanIdKey = getScanIdKey();
      if (scanIdKey) {
        localStorage.removeItem(scanIdKey);
      }
      return true;
    }
    return false;
  }, [pollingCount, scanningStatus]);

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
    
    if (scanInitiatedRef.current) {
      console.log('SCAN-DEBUG: Scan already initiated, skipping');
      return;
    }

    // Additional check: if there's a scan ID in localStorage, don't start a new scan
    const storedScanId = localStorage.getItem(scanIdKey);
    if (storedScanId && storedScanId.startsWith('scan_')) {
      console.log('SCAN-DEBUG: Found existing scan ID in localStorage, not starting new scan');
      return;
    }

    try {
      console.log('SCAN-DEBUG: Starting email scanning process');
      setError(null);
      setScanningStatus('scanning');
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
        setScanningStatus('error');
        localStorage.removeItem(scanIdKey);
        scanInitiatedRef.current = false;
        return;
      }
      
      console.log('SCAN-DEBUG: api.email.scanEmails() response:', response);
      
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
        console.log('SCAN-DEBUG: Received scanId from API:', newScanId);
        console.log('SCAN-DEBUG: Previous scanId state:', scanId);
        console.log('SCAN-DEBUG: Previous localStorage scanId:', localStorage.getItem(scanIdKey!));
        
        setScanId(newScanId);
        // Save scanId to localStorage
        localStorage.setItem(scanIdKey, newScanId);
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
  const pollScanStatus = (currentScanId: string | null) => {
    if (!currentScanId) {
      console.warn('Cannot start polling: No scan ID provided');
      return;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setPollingCount(0); // Reset polling count
    
    // Use the provided scan ID or fall back to localStorage only if no state
    const scanIdToUse = currentScanId; // It's guaranteed to be a string here
    
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
        checkScanStatus(scanIdToUse);
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
      // Determine which scan ID to query.
      // Priority:
      //   1) Explicit function argument
      //   2) Value stored in localStorage (authoritative, written right after the scan starts)
      //   3) React state (may be stale inside closures)
      const currentScanId = providedScanId || localStorage.getItem(scanIdKey!) || scanId;
      
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
      
      // Ensure we don't end up with duplicated '/api/api' in production where API_URL may already include '/api'
      const apiBase = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;
      const statusUrl = currentScanId.startsWith('scan_')
        ? `${apiBase}/email/status?scanId=${currentScanId}`
        : `${apiBase}/email/status/${currentScanId}`;
      console.log('SCAN-DEBUG: Making request to:', statusUrl);
      const response = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to check scan status');
      }
      
      const data = await response.json();
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
        setScanningStatus(uiStatus);
      }
      
      // Update scan stats if available
      if (stats) {
        setScanStats({
          emailsFound: stats.emails_found || 0,
          emailsToProcess: stats.emails_to_process || 0,
          emailsProcessed: stats.emails_processed || 0,
          subscriptionsFound: stats.subscriptions_found || 0
        });
      }
      
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
        // Only redirect when at least one subscription has been discovered. This guarantees
        // that the Edge Function had time to write results into the subscriptions table and that
        // the dashboard will show meaningful data straight away.

        // API returns stats with snake_case (subscriptions_found). The component's mapping later converts
        // to camelCase, but here we are still dealing with the raw `stats` object coming from the API.
        const subsFound = (stats as any)?.subscriptions_found ?? (stats as any)?.subscriptionsFound ?? 0;
        const analysisCompleted = completed_count ?? 0;
        const totalDetected = subsFound + analysisCompleted;

        if (totalDetected > 0) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setScanningStatus('completed');

          // Ensure future scans are not blocked by a stale scan_id from this run.
          const scanIdKeyForRemoval = getScanIdKey();
          if (scanIdKeyForRemoval) {
            localStorage.removeItem(scanIdKeyForRemoval);
          }

          // Show 100 % for a brief moment so users perceive completion, then
          // take them to their updated dashboard.
          setTimeout(() => {
            navigate('/dashboard', { state: { justScanned: true } });
          }, 1000);
        } else {
          console.log('SCAN-DEBUG: Scan marked completed but subscriptions_found = 0 – waiting…');
          // Force an extra poll every 2 s until subscriptions appear or we hit the max polling count.
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          pollingIntervalRef.current = setInterval(() => {
            setPollingCount(prev => {
              const newCount = prev + 1;
              if (newCount >= MAX_POLLING_COUNT) {
                checkScanTimeout();
              }
              return newCount;
            });
            checkScanStatus();
          }, 2000);
        }
      } else if (uiStatus === 'error' || uiStatus === 'failed') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setScanningStatus('error');
        setError(data.error || 'An error occurred during scanning');
        // Clear scan ID from localStorage on error
        const scanIdKey = getScanIdKey();
        if (scanIdKey) {
          localStorage.removeItem(scanIdKey);
        }
      } else if (uiStatus === 'quota_exhausted') {
        // Handle quota exhaustion - if subscriptions were found, consider it complete
        const subscriptionsFound = stats?.subscriptionsFound || 0;
        
        if (subscriptionsFound > 0) {
          console.log(`Quota exhausted but ${subscriptionsFound} subscriptions found via pattern matching - treating as complete`);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setScanningStatus('completed');
          // Show 100% for 1s before redirecting
          setTimeout(() => {
            navigate('/dashboard', { state: { justScanned: true } });
          }, 1000);
        } else {
          // No subscriptions found, continue polling for quota reset
          setScanningStatus('analyzing'); // Keep showing progress bar
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
            checkScanStatus();
          }, pollInterval);
        }
      }
    } catch (error) {
      console.error('Error checking scan status:', error);
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
    if (!user) return; // Wait until AuthContext provides user details

    const scanIdKey = getScanIdKey();
    if (scanIdKey) {
      // Remove any stale scan reference so the backend will create a new row
      localStorage.removeItem(scanIdKey);
    }

    // Ensure we start from a clean state
    scanInitiatedRef.current = false;
    setScanId(null);
    setScanningStatus('idle');
    setProgress(0);

    // Check scan frequency setting
    const scanFrequency = settings?.email?.scanFrequency || 'manual';
    
    // Only start scan automatically if frequency is not 'manual'
    if (scanFrequency !== 'manual') {
      console.log(`Auto-scan enabled with frequency: ${scanFrequency}`);
      startScanning();
    } else {
      console.log('Manual scan mode - waiting for user to initiate scan');
      setScanningStatus('idle');
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, settings]);

  // Add a debugging effect to log state changes
  useEffect(() => {
    console.log('ScanningStatus changed to:', scanningStatus);
  }, [scanningStatus]);

  // Add redirect when status completes (additional safety)
  useEffect(() => {
    if (scanningStatus === 'completed' || scanningStatus === 'complete') {
      const timer = setTimeout(() => navigate('/dashboard', { state: { justScanned: true } }), 1000);
      return () => clearTimeout(timer);
    }
  }, [scanningStatus, navigate]);

  // --- STEP-BASED PROGRESS CONFIGURATION -------------------------------------
  // Map every status that can appear in the scan_history table to a percentage
  // shown on the progress bar.  This keeps the UI in sync with backend state and
  // works for both new and returning users.
  const STATUS_PROGRESS_MAP: Record<ScanningStatus, number> = {
    idle: 0,
    initial: 0,
    scanning: 10,
    in_progress: 30,
    ready_for_analysis: 60,
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
    const mapped = STATUS_PROGRESS_MAP[scanningStatus];
    if (mapped !== undefined && mapped !== progress) {
      setProgress(mapped);
    }
  }, [scanningStatus, progress]);

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
      const token = getToken();
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

  // Add a debug function
  const testGmailConnection = async () => {
    try {
      setError('Testing Gmail API connection...');
      const token = getToken();
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }

      const response = await fetch('https://api.quits.cc/api/debug-gmail', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        setError(`Gmail API test failed: ${response.status} - ${text}`);
        return;
      }

      const data = await response.json();
      setError(null);
      console.log('Gmail API test:', data);
      alert(`Gmail API test results:\n- Connected: ${data.connected}\n- Messages: ${data.messageCount}\n- Error: ${data.error || 'None'}`);
    } catch (err) {
      console.error('Error testing Gmail API:', err);
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

      const response = await fetch(`https://api.quits.cc/api/debug-gmail?scanId=${currentScanId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        setError(`Diagnostic check failed: ${response.status} - ${text}`);
        return;
      }

      const data = await response.json();
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
    } catch (err) {
      console.error('Error running diagnostics:', err);
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
            {/* Manual scan button for manual mode */}
            {scanningStatus === 'idle' && settings?.email?.scanFrequency === 'manual' && (
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-4">
                  Manual Scan Mode
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Your scan frequency is set to manual. Click the button below to start a new scan.
                </p>
                <button
                  onClick={startScanning}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Start Email Scan
                </button>
              </div>
            )}

            {(scanningStatus === 'idle' || scanningStatus === 'initial' || scanningStatus === 'scanning' || scanningStatus === 'analyzing' || scanningStatus === 'in_progress' || scanningStatus === 'ready_for_analysis' || scanningStatus === 'quota_exhausted') && (
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                  {scanningStatus === 'initial' && 'Preparing to scan your emails'}
                  {(scanningStatus === 'scanning' || scanningStatus === 'in_progress') && 'Fetching emails'}
                  {(scanningStatus === 'analyzing' || scanningStatus === 'ready_for_analysis') && 'Analyzing subscriptions'}
                  {scanningStatus === 'quota_exhausted' && 'AI Analysis Paused'}
                  {scanningStatus === 'idle' && 'Starting scan...'}
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  {scanningStatus === 'initial' && 'Getting ready to find your subscriptions...'}
                  {(scanningStatus === 'scanning' || scanningStatus === 'in_progress') && 'Please wait while we fetch your emails...'}
                  {(scanningStatus === 'analyzing' || scanningStatus === 'ready_for_analysis') && 'Extracting subscription details...'}
                  {scanningStatus === 'quota_exhausted' && 'AI quota temporarily exhausted. Analysis will resume automatically...'}
                  {scanningStatus === 'idle' && 'Initializing scan process...'}
                </p>
                <div className="mt-8">
                  {/* Main Progress Bar */}
                  <div className="w-full max-w-md mx-auto mb-6">
                    <div className="bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-primary-600 h-3 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 text-center">
                      {progress}% Complete
                    </div>
                  </div>
                  
                  {/* Phase indicator */}
                  <div className="mt-4 text-sm text-gray-700">
                    {(scanningStatus === 'scanning' || scanningStatus === 'in_progress') && (
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="font-medium text-blue-800">Phase 1: Reading Emails</p>
                        <p className="text-blue-600">Searching your Gmail for subscription emails...</p>
                      </div>
                    )}
                    {(scanningStatus === 'ready_for_analysis' || scanningStatus === 'analyzing') && (
                      <div className="bg-green-50 p-3 rounded">
                        <p className="font-medium text-green-800">Phase 2: AI Analysis</p>
                       
                      </div>
                    )}
                    {scanningStatus === 'quota_exhausted' && (
                      <div className="bg-yellow-50 p-3 rounded">
                        <p className="font-medium text-yellow-800">Phase 2: AI Analysis (Paused)</p>
                        <p className="text-yellow-600">AI quota temporarily exhausted. Analysis will resume automatically when quota resets...</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Add scan stats when emails are being processed */}
                  {scanStats && scanStats.emailsToProcess > 0 && (
                    <div className="mt-4 text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      <p>Found <strong>{scanStats.emailsFound}</strong> emails in your inbox</p>
                      <p>Processing <strong>{scanStats.emailsToProcess}</strong> recent emails</p>
                      <p>Processed <strong>{scanStats.emailsProcessed}</strong> so far</p>
                      {scanStats.subscriptionsFound > 0 && (
                        <p className="text-green-600 font-medium">
                          Found <strong>{scanStats.subscriptionsFound}</strong> confirmed subscription{scanStats.subscriptionsFound !== 1 ? 's' : ''}!
                        </p>
                      )}
                      {scanStats.emailsToProcess > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 my-2">
                          <div 
                            className="bg-green-500 h-2.5 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(100, (scanStats.emailsProcessed / scanStats.emailsToProcess) * 100)}%` }}
                          ></div>
                        </div>
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
                  <button
                    onClick={diagnoseScan}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Run Diagnostics
                  </button>
                </div>
              </div>
            )}

            {scanningStatus === 'completed' && suggestions.length > 0 && (
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
