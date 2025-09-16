import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export async function apiRequest(
  url: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<Response> {
  // Get JWT token from localStorage
  const token = localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {
    ...options.headers,
  };
  
  // Add JWT token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add content type if body is provided
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Nova funkcija za email endpoints sa JWT autentifikacijom
export async function apiRequestWithAuth(
  method: string,
  url: string,
  data?: any
): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('auth_token');
    
    const headers: Record<string, string> = {};
    
    // Add JWT token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000, // 5 minuta umesto 30s - PERFORMANCE BOOST
      gcTime: 10 * 60 * 1000, // 10 minuta cache - corrected property name
      retry: false,
      networkMode: 'online', // PERFORMANCE: Ne izvršavaj query-e offline
    },
    mutations: {
      retry: false,
    },
  },
});

// === MOBILE API FIX - fetch polyfill ===
// Problem: Capacitor APK koristi relative URLs koji ne rade
// Rešenje: Presretni fetch pozive i dodaj API_BASE prefix
const API_BASE = import.meta.env.VITE_API_BASE_URL || 
                 (typeof window !== 'undefined' && (window as any).CAPACITOR_API_BASE) || 
                 "";

// Alternative environment support for Capacitor builds
// Može biti postavljen u: 
// 1. VITE_API_BASE_URL environment varijabla
// 2. window.CAPACITOR_API_BASE runtime varijabla
// 3. Auto-detect Capacitor environment
const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;

if (API_BASE) {
  console.log('🔧 Fetch polyfill aktiviran sa API_BASE:', API_BASE);
  console.log('📱 Capacitor detected:', isCapacitor);
  
  const originalFetch = window.fetch;
  window.fetch = (url: RequestInfo | URL, options?: RequestInit) => {
    if (typeof url === 'string' && url.startsWith('/api/')) {
      const newUrl = `${API_BASE}${url}`;
      console.log(`🔄 API polyfill: ${url} → ${newUrl}`);
      url = newUrl;
    }
    return originalFetch(url, options);
  };
} else if (isCapacitor) {
  console.log('📱 Capacitor detected - no API_BASE configured');
  console.log('💡 Tip: Set window.CAPACITOR_API_BASE or VITE_API_BASE_URL');
} else {
  console.log('🌐 Web mod - fetch polyfill neaktivan');
}
