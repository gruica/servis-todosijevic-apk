import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      // Pokušaj da dobijemo JSON odgovor za greške
      const clonedRes = res.clone();
      const errorData = await clonedRes.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Ako JSON parsing ne uspe, pokušaj sa text
      try {
        const clonedRes = res.clone();
        const text = await clonedRes.text();
        errorMessage = text || res.statusText;
      } catch {
        // Ako ni text ne uspe, koristi statusText
        errorMessage = res.statusText;
      }
    }
    throw new Error(`${res.status}: ${errorMessage}`);
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
    try {
      return await res.json();
    } catch (error) {
      console.error("JSON parsing greška:", error);
      throw new Error("Odgovor servera nije u validnom JSON formatu");
    }
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
