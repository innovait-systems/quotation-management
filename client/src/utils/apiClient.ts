const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  tenantId?: string;
  token?: string;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { tenantId, token, headers, ...rest } = options;

  const resolvedHeaders = new Headers(headers);
  resolvedHeaders.set('Content-Type', 'application/json');

  if (tenantId) {
    resolvedHeaders.set('x-tenant-id', tenantId);
  }

  // Get token from localStorage if not explicitly passed
  const resolvedToken = token || (typeof window !== 'undefined' ? localStorage.getItem('innovait-auth-token') : null);
  if (resolvedToken) {
    resolvedHeaders.set('Authorization', `Bearer ${resolvedToken}`);
  }

  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const response = await fetch(url, {
    headers: resolvedHeaders,
    ...rest,
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errBody = await response.json();
      errorMessage = errBody.message || errorMessage;
    } catch (_) {}
    
    // Auto-logout if unauthorized
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('innovait-auth-token');
      window.location.href = '/';
    }
    
    throw new Error(errorMessage);
  }

  // Handle empty responses or delete/created cases where response may be empty
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
