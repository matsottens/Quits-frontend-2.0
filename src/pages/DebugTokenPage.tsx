import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const DebugTokenPage: React.FC = () => {
  const [tokenData, setTokenData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkToken = async () => {
      try {
        setLoading(true);
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No token found in localStorage');
          setLoading(false);
          return;
        }
        
        // Make request to debug endpoint
        const response = await fetch('https://api.quits.cc/api/debug-google-token', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        setTokenData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    checkToken();
  }, []);
  
  const decodeToken = (token: string | null) => {
    if (!token) return null;
    
    try {
      // Split the token to get the payload
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      // Decode the payload (second part)
      const payload = atob(parts[1]);
      return JSON.parse(payload);
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }
  };
  
  const handleClearToken = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };
  
  const token = localStorage.getItem('token');
  const decodedToken = decodeToken(token);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Token Debug Information</h1>
        
        <div className="mb-4">
          <Link to="/dashboard" className="text-blue-500 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>
        
        {loading ? (
          <div className="p-4 bg-gray-100 rounded">Loading token data...</div>
        ) : error ? (
          <div className="p-4 bg-red-100 text-red-800 rounded">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
              <p className="text-sm">
                This page shows details about your authentication token. It's useful for debugging authentication issues.
              </p>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Token Status</h2>
              <div className="bg-white shadow overflow-hidden rounded-md">
                <ul className="divide-y divide-gray-200">
                  <li className="px-4 py-3">
                    <span className="font-semibold">Token Present:</span> {token ? 'Yes' : 'No'}
                  </li>
                  <li className="px-4 py-3">
                    <span className="font-semibold">Token Length:</span> {token?.length || 0} characters
                  </li>
                  <li className="px-4 py-3">
                    <span className="font-semibold">Gmail Token Present:</span> {' '}
                    {tokenData?.tokenInfo?.gmail_token_present ? (
                      <span className="text-green-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-red-600 font-medium">No</span>
                    )}
                  </li>
                  {tokenData?.tokenInfo?.gmail_token_present && (
                    <li className="px-4 py-3">
                      <span className="font-semibold">Gmail Token Length:</span> {tokenData?.tokenInfo?.gmail_token_length} characters
                    </li>
                  )}
                  {tokenData?.tokenInfo?.gmail_token_present && (
                    <li className="px-4 py-3">
                      <span className="font-semibold">Gmail Token Prefix:</span> {tokenData?.tokenInfo?.gmail_token_prefix}
                    </li>
                  )}
                  <li className="px-4 py-3">
                    <span className="font-semibold">Token Issued At:</span> {tokenData?.tokenInfo?.iat}
                  </li>
                  <li className="px-4 py-3">
                    <span className="font-semibold">Token Expires At:</span> {tokenData?.tokenInfo?.exp}
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Token User Data</h2>
              <div className="bg-white shadow overflow-hidden rounded-md">
                <ul className="divide-y divide-gray-200">
                  <li className="px-4 py-3">
                    <span className="font-semibold">User ID:</span> {tokenData?.tokenInfo?.id}
                  </li>
                  <li className="px-4 py-3">
                    <span className="font-semibold">Email:</span> {tokenData?.tokenInfo?.email}
                  </li>
                  <li className="px-4 py-3">
                    <span className="font-semibold">Name:</span> {tokenData?.tokenInfo?.name || 'Not available'}
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Local Parsed Token (Client-side)</h2>
              <div className="bg-white shadow overflow-hidden rounded-md">
                <div className="px-4 py-3">
                  <pre className="text-xs overflow-auto max-h-60">
                    {decodedToken ? JSON.stringify(decodedToken, null, 2) : 'Could not decode token'}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleClearToken}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Clear Token & Logout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DebugTokenPage; 