import React, { useState, useEffect } from 'react';
import api from '../api';

const TestAuth: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [selectedApiUrl, setSelectedApiUrl] = useState<string>(api.defaults.baseURL ?? 'https://api.quits.cc');

  // List of potential API URLs to try
  const apiUrls = [
    api.defaults.baseURL ?? 'https://api.quits.cc',
    'https://api.quits.cc',
    'https://api.quits.cc/api',
    'https://quits-backend-2-0-mahy1vpr6-mats-ottens-hotmailcoms-projects.vercel.app',
    'https://quits-backend-2-0-mahy1vpr6-mats-ottens-hotmailcoms-projects.vercel.app/api'
  ];

  useEffect(() => {
    checkAuthConfig();
  }, [selectedApiUrl]);

  const checkAuthConfig = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${selectedApiUrl}/debug?type=auth`);
      const data = await response.json();
      console.log('Auth config:', data);
      setAuthConfig(data);
      
      addTestResult('Auth config check', true, 'Successfully fetched auth configuration');
    } catch (err: any) {
      console.error('Error checking auth config:', err);
      setError(err.message || 'Failed to check auth configuration');
      addTestResult('Auth config check', false, `Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnectionToAllApis = async () => {
    addTestResult('Testing Multiple API URLs', true, 'Starting test of multiple API endpoints...');
    
    for (const url of apiUrls) {
      try {
        const response = await fetch(`${url}/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          mode: 'cors'
        });
        
        if (response.ok) {
          const responseText = await response.text();
          addTestResult(`API URL: ${url}`, true, `Connected successfully! Response: ${responseText.substring(0, 50)}...`);
        } else {
          addTestResult(`API URL: ${url}`, false, `Failed with status: ${response.status} ${response.statusText}`);
        }
      } catch (err: any) {
        addTestResult(`API URL: ${url}`, false, `Error: ${err.message}`);
      }
    }
  };

  const testGoogleAuthUrl = async () => {
    try {
      addTestResult('Google Auth URL', true, 'Generating auth URL...');
      const timestamp = Date.now();
      const clientId = '82730443897-ji64k4jhk02lonkps5vu54e1q5opoq3g.apps.googleusercontent.com';
      const redirectUri = encodeURIComponent('https://www.quits.cc/auth/callback');
      const scope = encodeURIComponent('email profile https://www.googleapis.com/auth/gmail.readonly openid');
      const state = Math.random().toString(36).substring(2, 15);
      
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&prompt=select_account+consent&access_type=offline`;
      
      console.log('Google Auth URL:', url);
      addTestResult('Google Auth URL', true, `Generated URL: ${url.substring(0, 50)}...`);
      return url;
    } catch (err: any) {
      console.error('Error generating Google auth URL:', err);
      addTestResult('Google Auth URL', false, `Error: ${err.message}`);
      return null;
    }
  };

  const openGoogleAuth = async () => {
    const url = await testGoogleAuthUrl();
    if (url) {
      window.open(url, '_blank');
    }
  };

  const testEnvironmentVars = async () => {
    try {
      addTestResult('Test Environment Variables', true, 'Fetching environment data...');
      const response = await fetch(`${selectedApiUrl}/debug?type=env`);
      const data = await response.json();
      console.log('Environment variables:', data);
      addTestResult('Test Environment Variables', true, JSON.stringify(data.env, null, 2));
    } catch (err: any) {
      console.error('Error testing environment variables:', err);
      addTestResult('Test Environment Variables', false, `Error: ${err.message}`);
    }
  };

  const testAuthEndpoint = async () => {
    try {
      addTestResult('Direct Auth Endpoint', true, 'Testing direct auth endpoint...');
      const response = await fetch(`${selectedApiUrl}/auth/google/callback?test=true`);
      const data = await response.text();
      console.log('Auth endpoint response:', data.substring(0, 200) + '...');
      addTestResult('Direct Auth Endpoint', true, 'Endpoint is accessible');
    } catch (err: any) {
      console.error('Error testing auth endpoint:', err);
      addTestResult('Direct Auth Endpoint', false, `Error: ${err.message}`);
    }
  };

  const addTestResult = (name: string, success: boolean, message: string) => {
    setTestResults(prev => [
      {
        name,
        success,
        message,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Auth Configuration Test</h1>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API URL:
          </label>
          <div className="flex space-x-2">
            <select 
              className="flex-1 p-2 border border-gray-300 rounded-md"
              value={selectedApiUrl}
              onChange={(e) => setSelectedApiUrl(e.target.value)}
            >
              {apiUrls.map(url => (
                <option key={url} value={url}>{url}</option>
              ))}
            </select>
            <button
              onClick={testConnectionToAllApis}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Test All API URLs
            </button>
          </div>
        </div>
        
        <div className="mb-6 flex flex-wrap gap-3">
          <button 
            onClick={checkAuthConfig}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Check Auth Config'}
          </button>
          
          <button 
            onClick={testGoogleAuthUrl}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Test Google Auth URL
          </button>
          
          <button 
            onClick={openGoogleAuth}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Open Google Auth
          </button>
          
          <button 
            onClick={testEnvironmentVars}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Test Env Variables
          </button>
          
          <button 
            onClick={testAuthEndpoint}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Test Auth Endpoint
          </button>
          
          <a 
            href="/login" 
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Go to Login
          </a>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        {authConfig && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Auth Configuration</h2>
            <div className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(authConfig, null, 2)}
              </pre>
            </div>
          </div>
        )}
        
        <div>
          <h2 className="text-xl font-semibold mb-3">Test Results</h2>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-md ${
                  result.success ? 'bg-green-100 border-l-4 border-green-500' : 'bg-red-100 border-l-4 border-red-500'
                }`}
              >
                <div className="flex justify-between">
                  <p className="font-bold">{result.name}</p>
                  <span className="text-xs text-gray-500">{new Date(result.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                  {result.message}
                </p>
              </div>
            ))}
            
            {testResults.length === 0 && (
              <p className="text-gray-500 italic">No tests run yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestAuth; 