import React, { useEffect, useRef, useState } from 'react';

interface ScanProgressBarProps {
  userId: string;
  onComplete: (scanId: string) => void;
}

const statusMessages: Record<string, string> = {
  in_progress: 'Fetching subscriptions from your Gmail account...',
  ready_for_analysis:' Analyzing subscriptions...',
  analyzing: 'Analyzing subscriptions...',
  completed: 'Analysis complete! Fetching subscriptions...',
  error: 'An error occurred during analysis.'
};

export const ScanProgressBar: React.FC<ScanProgressBarProps> = ({ userId, onComplete }) => {
  const [status, setStatus] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'reading' | 'analyzing' | 'complete'>('reading');
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const stoppedRef = useRef<boolean>(false);

  useEffect(() => {
    stoppedRef.current = false;
    
    async function pollScanStatus() {
      try {
        // Don't trigger the Edge Function immediately - wait for email scan to complete first
        // The email scan will set the status to 'ready_for_analysis' when it's done
        
        // Poll for scan status
        const res = await fetch(`/api/email/status?user_id=${userId}`);
        if (!res.ok) {
          setStatus('error');
          return;
        }
        
        const data = await res.json();
        const currentStatus = data.status;
        setStatus(currentStatus);
        setScanId(data.scan_id);
        
        // Map statuses to stepped progress values for smoother UX
        switch (currentStatus) {
          case 'in_progress':
            setPhase('reading');
            setProgress(10);
            break;
          case 'ready_for_analysis':
            setPhase('analyzing');
            setProgress(30);
            break;
          case 'analyzing':
            setPhase('analyzing');
            // Use the server-reported progress (fallback to 60 if missing)
            setProgress(Math.max(60, data.progress ?? 60));
            break;
          case 'completed':
            setPhase('complete');
            setProgress(100);
            // Allow the progress bar to show 100% for 1s before redirect
            setTimeout(() => {
              if (!stoppedRef.current) {
                stoppedRef.current = true;
                onComplete(data.scan_id);
              }
            }, 1000);
            break;
          default:
            break;
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
        
        // Poll more frequently during analysis phase
        if (phase === 'analyzing') {
          await new Promise(r => setTimeout(r, 2000)); // Every 2s during analysis
        } else if (elapsed < 30000) {
          await new Promise(r => setTimeout(r, 3000)); // Every 3s for first 30s
        } else {
          await new Promise(r => setTimeout(r, 60000)); // Every 60s after
        }
      }
    };
    
    loop();
    return () => { stoppedRef.current = true; };
  }, [userId, onComplete, phase]);

  const getPhaseMessage = () => {
    if (phase === 'reading') {
      return 'Fetching emails...';
    } else if (phase === 'analyzing') {
      return 'Analyzing subscriptions...';
    } else {
      return 'Complete!';
    }
  };

  return (
    <div style={{ margin: '2em 0', textAlign: 'center' }}>
      {status && status !== 'completed' && status !== 'error' && (
        <div>
          <div className="progress-bar">
            <div 
              className="progress-bar-inner" 
              style={{ 
                width: `${progress}%`,
                backgroundColor: phase === 'reading' ? '#3B82F6' : '#10B981'
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
      {status === 'completed' && <div>Analysis complete!</div>}
      {status === 'error' && <div style={{ color: 'red' }}>{statusMessages.error}</div>}
    </div>
  );
};

// .progress-bar { width: 80%; height: 8px; background: #eee; border-radius: 4px; margin: 0 auto; }
// .progress-bar-inner { height: 100%; background: #0070f3; border-radius: 4px; transition: width 0.5s; } 