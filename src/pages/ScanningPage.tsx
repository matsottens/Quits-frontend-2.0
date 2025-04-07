import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ScanningPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'initializing' | 'scanning' | 'processing' | 'complete' | 'error'>('initializing');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    const scanEmails = async () => {
      try {
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 95) {
              clearInterval(progressInterval);
              return prev;
            }
            return Math.min(prev + Math.random() * 10, 95);
          });
        }, 1000);

        // Start scanning process
        setStatus('scanning');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate initial delay
        
        setStatus('processing');
        const response = await api.email.scanEmails();
        
        // Complete progress bar
        clearInterval(progressInterval);
        setProgress(100);
        
        setStatus('complete');
        
        if (response && response.subscriptions) {
          setSubscriptions(response.subscriptions);
          
          // Wait a moment to show 100% progress before redirecting
          setTimeout(() => {
            navigate('/dashboard', { 
              state: { 
                newScan: true,
                subscriptionsFound: response.subscriptions.length,
                subscriptions: response.subscriptions
              } 
            });
          }, 1500);
        } else {
          setTimeout(() => {
            navigate('/dashboard', { 
              state: { 
                newScan: true,
                subscriptionsFound: 0
              } 
            });
          }, 1500);
        }
      } catch (err) {
        console.error('Scan error:', err);
        setError('Failed to scan emails. Please try again.');
        setStatus('error');
      }
    };

    scanEmails();

    return () => {
      // Cleanup any intervals or processes
    };
  }, [navigate]);

  const renderContent = () => {
    if (status === 'error') {
      return (
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">
            <svg className="h-12 w-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-semibold">Scanning Failed</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      );
    }

    let message = 'Connecting to your email...';
    let subMessage = 'This may take a moment';
    
    if (status === 'scanning') {
      message = 'Scanning your inbox for subscriptions...';
      subMessage = 'We\'re looking for confirmation emails and receipts';
    } else if (status === 'processing') {
      message = 'Analyzing subscription details...';
      subMessage = 'Our AI is extracting key information from your emails';
    } else if (status === 'complete') {
      message = `Scan complete! Found ${subscriptions.length} subscriptions`;
      subMessage = 'Redirecting to dashboard...';
    }

    return (
      <div className="text-center">
        <div className="mb-8">
          <div className="w-24 h-24 mb-4 mx-auto relative">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div 
              className="absolute inset-0 border-4 border-blue-600 rounded-full animate-spin"
              style={{ 
                borderRightColor: 'transparent',
                borderBottomColor: 'transparent'
              }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-bold">
              {Math.round(progress)}%
            </div>
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">{message}</h2>
        <p className="text-gray-600">{subMessage}</p>
        
        <div className="w-full max-w-md mx-auto mt-6 bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full bg-white p-8 rounded-lg shadow-md">
        {renderContent()}
      </div>
    </div>
  );
};

export default ScanningPage; 