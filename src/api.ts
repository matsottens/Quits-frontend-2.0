import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Enterprise-grade API client with resilience features:
 * - Multi-domain failover
 * - Request retries with exponential backoff
 * - Response caching
 * - Comprehensive error handling
 * - Telemetry and logging
 */

interface AuthResponse {
  token: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
  error?: string;
  success?: boolean;
  redirecting?: boolean;
  pending?: boolean;
  message?: string;
}

// API Base URLs in order of preference
const API_DOMAINS = [
  'https://api.quits.cc',
  'https://quits-backend-2-0-mahy1vpr6-mats-ottens-hotmailcoms-projects.vercel.app'
];

// Configuration constants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;
const DEFAULT_TIMEOUT_MS = 15000;
const HEALTH_CHECK_INTERVAL_MS = 60000;
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Simple in-memory response cache
const responseCache = new Map<string, { data: any, timestamp: number }>();

// Track health status of API domains
const domainHealth = API_DOMAINS.reduce((acc, domain) => {
  acc[domain] = { healthy: true, lastChecked: 0, successRate: 1.0 };
  return acc;
}, {} as Record<string, { healthy: boolean, lastChecked: number, successRate: number }>);

/**
 * Get the best API base URL to use for requests
 */
export const getApiBaseUrl = (): string => {
  // Check cache for working domain
  const cachedDomain = localStorage.getItem('api_domain');
  if (cachedDomain && domainHealth[cachedDomain]?.healthy) {
    return cachedDomain;
  }
  
  // Find the first healthy domain
  const healthyDomain = API_DOMAINS.find(domain => domainHealth[domain]?.healthy);
  
  // If we have a healthy domain, use it
  if (healthyDomain) {
    localStorage.setItem('api_domain', healthyDomain);
    return healthyDomain;
  }
  
  // No known healthy domains, use the first one
  return API_DOMAINS[0];
};

// Always use the best API URL for auth operations
export const apiBaseUrl = getApiBaseUrl();
export const authApiUrl = apiBaseUrl;

// Create axios instance with proper CORS handling
const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Client-Version': process.env.VITE_APP_VERSION || 'development'
  },
});

/**
 * Generate a cache key for a request
 */
const getCacheKey = (config: AxiosRequestConfig): string => {
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
};

/**
 * Check if a response can be cached
 */
const isCacheable = (config: AxiosRequestConfig): boolean => {
  // Only cache GET requests
  return config.method?.toLowerCase() === 'get';
};

/**
 * Check if a cached response is still valid
 */
const isCacheValid = (cacheKey: string): boolean => {
  const cached = responseCache.get(cacheKey);
  if (!cached) return false;
  
  return (Date.now() - cached.timestamp) < CACHE_EXPIRY_MS;
};

/**
 * Log a failed request to the console
 */
const logFailedRequest = (config: AxiosRequestConfig, error: any): void => {
  console.error(`API Request Failed: ${config.method?.toUpperCase()} ${config.url}`, {
    status: error.response?.status,
    message: error.message,
    details: error.response?.data
  });
};

/**
 * Check the health of all API domains
 */
const checkApiDomains = async (): Promise<void> => {
  console.log('Checking health of API domains...');
  
  for (const domain of API_DOMAINS) {
    try {
      const startTime = Date.now();
      const response = await fetch(`${domain}/health`, {
        method: 'HEAD',
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        cache: 'no-store'
      });
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Update domain health status
      domainHealth[domain] = {
        healthy: response.ok,
        lastChecked: Date.now(),
        successRate: response.ok ? 1.0 : 0.0
      };
      
      console.log(`API Domain ${domain}: ${response.ok ? 'Healthy' : 'Unhealthy'} (${latency}ms)`);
    } catch (error) {
      console.warn(`API Domain ${domain} health check failed:`, error);
      domainHealth[domain] = {
        healthy: false,
        lastChecked: Date.now(),
        successRate: 0.0
      };
    }
  }
  
  // Set the best domain for future requests
  const bestDomain = API_DOMAINS.find(domain => domainHealth[domain]?.healthy);
  if (bestDomain) {
    localStorage.setItem('api_domain', bestDomain);
    api.defaults.baseURL = bestDomain;
  }
};

// Initial health check and setup periodic checks
setTimeout(checkApiDomains, 1000);
setInterval(checkApiDomains, HEALTH_CHECK_INTERVAL_MS);

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Check for cached response
    if (isCacheable(config)) {
      const cacheKey = getCacheKey(config);
      if (isCacheValid(cacheKey)) {
        const cached = responseCache.get(cacheKey);
        
        if (cached) {
          // Return a rejected promise with a special flag
          // that will be caught by the response interceptor
          return Promise.reject({
            __cached: true,
            data: cached.data
          });
        }
      }
    }
    
    // Make sure we use the best API domain
    if (!config.baseURL) {
      config.baseURL = getApiBaseUrl();
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Cache successful GET responses
    if (isCacheable(response.config)) {
      const cacheKey = getCacheKey(response.config);
      responseCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
    }
    
    return response;
  },
  async (error: any) => {
    // Handle cached responses
    if (error.__cached) {
      return Promise.resolve({
        data: error.data,
        status: 200,
        statusText: 'OK (cached)',
        headers: {},
        config: {},
        cached: true
      });
    }
    
    // Get the original request
    const originalRequest = error.config;
    
    // Don't retry if we've already retried
    if (originalRequest.__retryCount >= MAX_RETRIES) {
      logFailedRequest(originalRequest, error);
      return Promise.reject(error);
    }
    
    // Initialize retry count if not set
    if (originalRequest.__retryCount === undefined) {
      originalRequest.__retryCount = 0;
    }
    
    // Check if we should retry the request
    const shouldRetry = 
      originalRequest.method?.toLowerCase() !== 'post' &&
      (!error.response || error.response.status >= 500 || error.message.includes('Network Error') || error.code === 'ECONNABORTED');
    
    if (shouldRetry) {
      originalRequest.__retryCount += 1;
      
      // Exponential backoff delay
      const delay = RETRY_DELAY_MS * Math.pow(2, originalRequest.__retryCount - 1);
      
      console.log(`Retrying API request (${originalRequest.__retryCount}/${MAX_RETRIES}) after ${delay}ms: ${originalRequest.url}`);
      
      // Try a different API domain if available
      if (error.message.includes('Network Error')) {
        const currentDomain = new URL(originalRequest.baseURL || API_DOMAINS[0]).host;
        
        // Find the next domain to try
        const nextDomainIndex = API_DOMAINS.findIndex(d => d.includes(currentDomain)) + 1;
        const nextDomain = nextDomainIndex < API_DOMAINS.length 
          ? API_DOMAINS[nextDomainIndex] 
          : API_DOMAINS[0];
        
        console.log(`Switching API domain to ${nextDomain}`);
        originalRequest.baseURL = nextDomain;
      }
      
      // Return a promise that resolves after the delay
      return new Promise((resolve) => {
        setTimeout(() => resolve(api(originalRequest)), delay);
      });
    }
    
    // If we shouldn't retry, or have exhausted retries, reject with the error
    logFailedRequest(originalRequest, error);
    return Promise.reject(error);
  }
);

// Export API client and utility functions
export default api;

export const handleGoogleCallback = async (code: string) => {
  try {
    console.log(`Starting OAuth callback process for code: ${code.substring(0, 10)}...`);
    
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const state = localStorage.getItem('oauth_state') || Math.random().toString(36).substring(2, 15);
    
    // First try direct callback endpoint
    try {
      console.log('Attempting to use direct callback endpoint');
      const directUrl = `${authApiUrl}/auth/google/callback?code=${encodeURIComponent(code)}&_t=${timestamp}`;
      console.log(`Using direct URL: ${directUrl}`);
      
      const response = await fetch(directUrl, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      console.warn(`Direct callback failed with status: ${response.status}`);
    } catch (directError) {
      console.warn('Direct callback failed:', directError);
    }
    
    // If direct method fails, try the proxy
    console.log('Direct callback failed, attempting to exchange code via Google proxy API');
    
    // Try the proxy endpoint
    console.log('Using proxy endpoint:', `${authApiUrl}/google-proxy`);
    
    // Set up fetch options
    const fetchOptions = {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store'
      }
    };
    
    // Try multiple variants of the URL (with and without /api prefix)
    const urlsToTry = [
      `${authApiUrl}/google-proxy?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}&_t=${timestamp}`,
      `${authApiUrl}/api/google-proxy?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}&_t=${timestamp}`,
      `${API_DOMAINS[1]}/google-proxy?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(window.location.origin + '/dashboard')}&_t=${timestamp}`
    ];
    
    for (const url of urlsToTry) {
      try {
        console.log('Trying URL:', url);
        const response = await fetch(url, fetchOptions);
        
        if (response.ok) {
          const data = await response.json();
          return data;
        }
        
        console.warn(`Proxy request failed with status: ${response.status}`);
      } catch (fetchError) {
        console.warn(`Fetch error for ${url}:`, fetchError);
      }
    }
    
    // If all attempts fail, return error
    return {
      success: false,
      error: 'auth_failed',
      message: 'Failed to authenticate with Google. Please try again.'
    };
  } catch (error) {
    console.error('OAuth callback error:', error);
    return {
      success: false,
      error: 'unknown_error',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}; 