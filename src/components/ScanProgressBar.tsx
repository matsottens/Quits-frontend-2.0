import React, { useEffect, useRef, useState } from 'react';

interface ScanProgressBarProps {
  userId: string;
  onComplete: (scanId: string) => void;
}

const statusMessages: Record<string, string> = {
  in_progress: 'Reading emails from Gmail...',
  ready_for_analysis: 'Emails read! Analyzing subscriptions with AI...',
  analyzing: 'Analyzing subscriptions with AI...',
  completed: 'Analysis complete! Fetching subscriptions...',
  error: 'An error occurred during analysis.'
};

export const ScanProgressBar: React.FC<ScanProgressBarProps> = ({ userId, onComplete }) => {
  const [status, setStatus] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const stoppedRef = useRef<boolean>(false);

  useEffect(() => {
    stoppedRef.current = false;
    let completeTimeout: NodeJS.Timeout | null = null;

    async function pollScanStatus() {
      try {
        const res = await fetch(`/api/scan-status?user_id=${userId}`);
        if (!res.ok) {
          setStatus('error');
          return;
        }
        const data = await res.json();
        const currentStatus = data.status;
        setStatus(currentStatus);
        setScanId(data.scan_id);

        // Step-based progress logic
        if (currentStatus === 'in_progress') {
          setProgress(30);
        } else if (currentStatus === 'ready_for_analysis') {
          setProgress(40);
          // Only trigger Gemini analysis when status is 'ready_for_analysis'
          try {
            await fetch('/api/trigger-gemini-scan', { method: 'POST' });
          } catch (error) {
            console.error('Error triggering Gemini analysis:', error);
          }
        } else if (currentStatus === 'analyzing') {
          setProgress(70);
        } else if (currentStatus === 'completed') {
          setProgress(100);
          setShowComplete(true);
          stoppedRef.current = true;
          // Show 100% for 1 second before redirecting
          completeTimeout = setTimeout(() => {
            setShowComplete(false);
            onComplete(data.scan_id);
          }, 1000);
        }
      } catch (error) {
        console.error('Error polling scan status:', error);
        setStatus('error');
      }
    }

    const loop = async () => {
      while (!stoppedRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        await pollScanStatus();
        if (stoppedRef.current) break;
        if (status === 'analyzing') {
          await new Promise(r => setTimeout(r, 2000));
        } else if (elapsed < 30000) {
          await new Promise(r => setTimeout(r, 3000));
        } else {
          await new Promise(r => setTimeout(r, 60000));
        }
      }
    };
    loop();
    return () => {
      stoppedRef.current = true;
      if (completeTimeout) clearTimeout(completeTimeout);
    };
  }, [userId, onComplete]);

  const getPhaseMessage = () => {
    if (progress < 40) {
      return 'Reading emails from your Gmail account...';
    } else if (progress < 100) {
      return 'Using AI to analyze subscription details...';
    } else {
      return 'Complete!';
    }
  };

  return (
    <div style={{ margin: '2em 0', textAlign: 'center' }}>
      {status && status !== 'error' && (
        <div>
          <div className="progress-bar">
            <div 
              className="progress-bar-inner" 
              style={{ 
                width: `${progress}%`,
                backgroundColor: progress < 100 ? '#3B82F6' : '#10B981'
              }} 
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="font-semibold">{getPhaseMessage()}</div>
            <div className="text-sm text-gray-600 mt-1">
              {statusMessages[status] || 'Processing...'}
            </div>
          </div>
        </div>
      )}
      {status === 'error' && <div style={{ color: 'red' }}>{statusMessages.error}</div>}
      {showComplete && (
        <div style={{ marginTop: 16, fontWeight: 600, color: '#10B981' }}>
          Analysis complete! Redirecting to your dashboard...
        </div>
      )}
    </div>
  );
};

// .progress-bar { width: 80%; height: 8px; background: #eee; border-radius: 4px; margin: 0 auto; }
// .progress-bar-inner { height: 100%; background: #0070f3; border-radius: 4px; transition: width 0.5s; } 