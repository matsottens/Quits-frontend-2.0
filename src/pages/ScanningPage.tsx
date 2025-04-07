import { useState, useEffect } from 'react';
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
  const [scanningStatus, setScanningStatus] = useState<'initial' | 'scanning' | 'analyzing' | 'complete'>('initial');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SubscriptionSuggestion[]>([]);

  useEffect(() => {
    const startScanning = async () => {
      try {
        setScanningStatus('scanning');
        await api.email.scanEmails();
        
        // Poll for scanning status
        const statusInterval = setInterval(async () => {
          const status = await api.email.getScanningStatus();
          
          if (status.error) {
            clearInterval(statusInterval);
            setError(status.error);
            return;
          }
          
          setProgress(status.progress);
          
          if (status.status === 'analyzing') {
            setScanningStatus('analyzing');
          }
          
          if (status.status === 'complete') {
            clearInterval(statusInterval);
            setScanningStatus('complete');
            const suggestionsResponse = await api.email.getSubscriptionSuggestions();
            setSuggestions(suggestionsResponse.suggestions);
          }
        }, 2000);

        return () => clearInterval(statusInterval);
      } catch (err) {
        setError('Failed to start email scanning. Please try again.');
        console.error('Scanning error:', err);
      }
    };

    startScanning();
  }, []);

  const handleSuggestionAction = async (suggestionId: string, confirmed: boolean) => {
    try {
      await api.email.confirmSubscriptionSuggestion(suggestionId, confirmed);
      setSuggestions(suggestions.filter(s => s.id !== suggestionId));
      
      // If no more suggestions, redirect to dashboard
      if (suggestions.length === 1) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Failed to process suggestion. Please try again.');
      console.error('Suggestion action error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          {error ? (
            <div className="bg-red-50 border border-red-400 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {scanningStatus !== 'complete' && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanningPage; 