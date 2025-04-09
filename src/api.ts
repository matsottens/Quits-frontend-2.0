import axios, { AxiosError } from 'axios';

interface AuthResponse {
  token: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

// Always use api.quits.cc for auth operations, regardless of environment
const API_BASE_URL = 'https://api.quits.cc';

// Create axios instance with proper CORS handling
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest' // Helps with CORS in some servers
  },
});

export const handleGoogleCallback = async (code: string): Promise<AuthResponse> => {
  try {
    console.log(`Attempting Google auth callback with code: ${code.substring(0, 10)}...`);
    
    // Using the window.postMessage approach which typically bypasses CORS restrictions
    return new Promise<AuthResponse>((resolve, reject) => {
      try {
        // Create a unique message ID to identify our response
        const messageId = 'auth_' + Math.random().toString(36).substring(2, 15);
        
        // Set up message listener
        const messageHandler = (event: MessageEvent) => {
          // Only accept messages from our domain or the API domain
          if (event.origin !== window.location.origin && 
              !event.origin.includes('api.quits.cc')) {
            return;
          }
          
          if (event.data && event.data.messageId === messageId) {
            window.removeEventListener('message', messageHandler);
            
            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              resolve(event.data.authResponse);
            }
            
            if (iframe && document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Create a hidden iframe to load our authentication
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        // Give the iframe a moment to initialize
        setTimeout(() => {
          try {
            if (!iframe.contentWindow) {
              throw new Error('Cannot access iframe content window');
            }
            
            // Create a form in the iframe and submit it
            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Authentication</title>
                  <script>
                    function handleAuth(authData) {
                      window.parent.postMessage({
                        messageId: '${messageId}',
                        authResponse: authData
                      }, '*');
                    }
                    
                    function handleError(error) {
                      window.parent.postMessage({
                        messageId: '${messageId}',
                        error: error
                      }, '*');
                    }
                  </script>
                </head>
                <body>
                  <form id="authForm" method="POST" action="${API_BASE_URL}/auth/google/callback/direct">
                    <input type="hidden" name="code" value="${encodeURIComponent(code)}">
                    <input type="hidden" name="origin" value="${window.location.origin}">
                    <input type="hidden" name="messageId" value="${messageId}">
                  </form>
                  <script>
                    document.getElementById('authForm').submit();
                  </script>
                </body>
              </html>
            `);
            doc.close();
          } catch (err) {
            reject(new Error(`Iframe setup error: ${err instanceof Error ? err.message : String(err)}`));
            window.removeEventListener('message', messageHandler);
            if (iframe && document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }
        }, 100);
        
        // Set timeout for the entire operation
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          if (iframe && document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          reject(new Error('Authentication request timed out'));
        }, 30000);
      } catch (err) {
        reject(new Error(`Auth setup error: ${err instanceof Error ? err.message : String(err)}`));
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error: string; details?: string }>;
      console.error('Google callback error:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message,
        code: axiosError.code,
        headers: axiosError.response?.headers
      });
      throw new Error(axiosError.response?.data?.error || 'Authentication failed');
    }
    throw error;
  }
};

// Add other API functions here...

export default api; 