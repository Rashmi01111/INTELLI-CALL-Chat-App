// Secure API utility for authenticated requests
export interface SecureApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

export const secureApi = async (url: string, options: SecureApiOptions = {}): Promise<Response> => {
  // Get user data from localStorage
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  
  // Get token from URL params (for Google OAuth) or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || localStorage.getItem('authToken');
  
  if (!user && !token) {
    // Only redirect if not already on login page to prevent infinite loops
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Authentication required');
  }

  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authentication headers
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (user) {
    headers['X-User-ID'] = user._id;
    headers['X-User-Name'] = user.name;
    headers['X-User-Email'] = user.email || '';
  }

  // Make the request
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Handle 403 responses - redirect to login
  if (response.status === 403) {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    // Only redirect if not already on login page to prevent infinite loops
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Authentication failed');
  }

  return response;
};

// Helper methods for common operations
export const secureGet = (url: string, headers?: Record<string, string>) => 
  secureApi(url, { method: 'GET', headers });

export const securePost = (url: string, body: any, headers?: Record<string, string>) => 
  secureApi(url, { method: 'POST', body, headers });

export const securePut = (url: string, body: any, headers?: Record<string, string>) => 
  secureApi(url, { method: 'PUT', body, headers });

export const secureDelete = (url: string, headers?: Record<string, string>) => 
  secureApi(url, { method: 'DELETE', headers });
