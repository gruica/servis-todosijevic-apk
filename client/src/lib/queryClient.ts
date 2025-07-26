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
      staleTime: 30000, // 30 sekundi umesto Infinity
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
