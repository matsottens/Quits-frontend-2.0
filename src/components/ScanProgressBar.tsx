import React, { useEffect, useRef, useState } from 'react';

interface ScanProgressBarProps {
  userId: string;
  onComplete: (scanId: string) => void;
}

const statusMessages: Record<string, string> = {
  in_progress: 'Reading emails…',
  ready_for_analysis: 'Analyzing subscriptions…',
  analyzing: 'Analyzing subscriptions…',
  completed: 'Analysis complete! Fetching subscriptions…',
  error: 'An error occurred during analysis.'
};

export const ScanProgressBar: React.FC<ScanProgressBarProps> = ({ userId, onComplete }) => {
  const [status, setStatus] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const stoppedRef = useRef<boolean>(false);

  useEffect(() => {
    stoppedRef.current = false;
    async function triggerAndPoll() {
      // Aggressively trigger the scan
      await fetch('/api/trigger-gemini-scan', { method: 'POST' });
      // Poll scan status
      const res = await fetch(`/api/scan-status?user_id=${userId}`);
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data = await res.json();
      setStatus(data.status);
      setScanId(data.scan_id);
      if (data.status === 'completed' && data.scan_id) {
        stoppedRef.current = true;
        onComplete(data.scan_id);
      }
    }

    let timeout: NodeJS.Timeout;
    const loop = async () => {
      while (!stoppedRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        await triggerAndPoll();
        if (stoppedRef.current) break;
        if (elapsed < 30000) {
          await new Promise(r => setTimeout(r, 3000)); // every 3s for first 30s
        } else {
          await new Promise(r => setTimeout(r, 60000)); // every 60s after
        }
      }
    };
    loop();
    return () => { stoppedRef.current = true; clearTimeout(timeout); };
  }, [userId, onComplete]);

  return (
    <div style={{ margin: '2em 0', textAlign: 'center' }}>
      {status && status !== 'completed' && status !== 'error' && (
        <div>
          <div className="progress-bar">
            <div className="progress-bar-inner" style={{ width: status === 'ready_for_analysis' ? '60%' : '30%' }} />
          </div>
          <div style={{ marginTop: 8 }}>{statusMessages[status] || 'Processing…'}</div>
        </div>
      )}
      {status === 'completed' && <div>Analysis complete!</div>}
      {status === 'error' && <div style={{ color: 'red' }}>{statusMessages.error}</div>}
    </div>
  );
};

// .progress-bar { width: 80%; height: 8px; background: #eee; border-radius: 4px; margin: 0 auto; }
// .progress-bar-inner { height: 100%; background: #0070f3; border-radius: 4px; transition: width 0.5s; } 