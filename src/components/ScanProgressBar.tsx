import React, { useEffect, useState } from 'react';

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const poll = async () => {
      try {
        const res = await fetch(`/api/scan-status?user_id=${userId}`);
        if (!res.ok) throw new Error('Failed to fetch scan status');
        const data = await res.json();
        setStatus(data.status);
        setScanId(data.scan_id);
        if (data.status === 'completed' && data.scan_id) {
          onComplete(data.scan_id);
        }
      } catch (e) {
        setStatus('error');
      }
    };
    poll();
    interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
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

// Add some basic styles (or use your own CSS framework)
// .progress-bar { width: 80%; height: 8px; background: #eee; border-radius: 4px; margin: 0 auto; }
// .progress-bar-inner { height: 100%; background: #0070f3; border-radius: 4px; transition: width 0.5s; } 