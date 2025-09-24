import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { runtimeHelpers } from "@shared/runtime-config";

/**
 * UNIFIED API GATEWAY ZA WEB I MOBILNU APLIKACIJU
 * 
 * Ovaj modul upravlja svim API pozivima sa inteligentnom 
 * base URL detekcijom, retry mehanizmima i error handling-om
 * za stabilno funkcionisanje na svim platformama.
 */

interface ApiRequestOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
  retries?: number;
  timeout?: number;
}

interface ApiResponse<T = any> extends Response {
  json(): Promise<T>;
}

/**
 * Error klasa za API greške sa dodatnim kontekstom
 */
class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    message?: string
  ) {
    super(message || `${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

/**
 * Network timeout wrapper
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

/**
 * Exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
}

/**
 * Proverava da li je response uspešan i baca grešku ako nije
 */
async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let errorMessage: string;
    try {
      const text = await res.text();
      errorMessage = text || res.statusText;
    } catch (e) {
      errorMessage = res.statusText;
    }
    
    throw new ApiError(res.status, res.statusText, res.url, errorMessage);
  }
}

/**
 * Dobija authentication headers (JWT token)
 */
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Pravi kompletnu URL sa proper base URL resolution
 */
function buildFullUrl(endpoint: string): string {
  // Već kompletna URL (http/https)
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  
  // Relativna URL - koristi runtime config za base URL
  return runtimeHelpers.buildApiUrl(endpoint);
}

/**
 * GLAVNA API REQUEST FUNKCIJA SA RETRY LOGIKOM
 * 
 * Koristi se za sve HTTP pozive sa inteligentnim
 * base URL resolution-om i error handling-om
 */
export async function apiRequest(
  url: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const {
    method = 'GET',
    body,
    headers: userHeaders = {},
    retries = runtimeHelpers.isNative() ? 3 : 1,
    timeout = 15000
  } = options;
  
  // Build complete URL
  const fullUrl = buildFullUrl(url);
  
  // Prepare headers
  const authHeaders = getAuthHeaders();
  const headers: Record<string, string> = {
    ...userHeaders,
    ...authHeaders,
  };
  
  // Add content type for JSON requests
  if (body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Retry loop
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🌐 [API Request] ${method} ${fullUrl} (attempt ${attempt + 1}/${retries + 1})`);
      
      const fetchPromise = fetch(fullUrl, {
        method,
        headers,
        body,
        credentials: "include",
      });
      
      const res = await withTimeout(fetchPromise, timeout);
      await throwIfResNotOk(res);
      
      console.log(`✅ [API Request] Success: ${method} ${fullUrl}`);
      return res;
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ [API Request] Failed: ${method} ${fullUrl}`, error);
      
      // Ne retry-uj authentication greške ili client errors (4xx)
      if (error instanceof ApiError && (error.status === 401 || error.status === 403 || (error.status >= 400 && error.status < 500))) {
        console.log(`🚫 [API Request] No retry for ${error.status} error`);
        throw error;
      }
      
      // Poslednji pokušaj - baci grešku
      if (attempt === retries) {
        console.error(`❌ [API Request] Final failure: ${method} ${fullUrl}`, error);
        throw error;
      }
      
      // Wait before retry
      const delay = getRetryDelay(attempt);
      console.log(`⏳ [API Request] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Fallback (ovo nikad neće biti dosegnuto, ali TypeScript traži)
  throw lastError || new Error('Unknown API error');
}

/**
 * Alias za apiRequest sa eksplicitnim auth header-ima
 */
export async function apiRequestWithAuth(
  method: string,
  url: string,
  data?: any
): Promise<Response> {
  return apiRequest(url, {
    method,
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Specialized file upload request sa multipart support
 */
export async function apiFileUpload(
  url: string,
  formData: FormData,
  options: { onProgress?: (progress: number) => void } = {}
): Promise<Response> {
  const fullUrl = buildFullUrl(url);
  const authHeaders = getAuthHeaders();
  
  console.log(`📤 [File Upload] ${fullUrl}`);
  
  // Ne dodavaj Content-Type header - browser će ga automatski postaviti za FormData
  const headers: Record<string, string> = {
    ...authHeaders,
  };
  
  try {
    const res = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: formData,
      credentials: "include",
    });
    
    await throwIfResNotOk(res);
    console.log(`✅ [File Upload] Success: ${fullUrl}`);
    return res;
    
  } catch (error) {
    console.error(`❌ [File Upload] Failed: ${fullUrl}`, error);
    throw error;
  }
}

/**
 * Query function za React Query sa error handling
 */
type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    const endpoint = queryKey[0] as string;
    const fullUrl = buildFullUrl(endpoint);
    
    console.log(`🔍 [Query] ${fullUrl}`);
    
    const authHeaders = getAuthHeaders();
    
    try {
      const res = await fetch(fullUrl, {
        headers: authHeaders,
        credentials: "include",
        signal, // Support za query cancellation
      });

      // Handle 401 based na behavior
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`🔒 [Query] Unauthorized - returning null: ${fullUrl}`);
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`✅ [Query] Success: ${fullUrl}`);
      return data;
      
    } catch (error) {
      console.error(`❌ [Query] Failed: ${fullUrl}`, error);
      throw error;
    }
  };

/**
 * React Query client sa optimizovanim default postavkama
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: runtimeHelpers.isNative() ? 10 * 60 * 1000 : 5 * 60 * 1000, // 10min native, 5min web
      gcTime: runtimeHelpers.isNative() ? 20 * 60 * 1000 : 10 * 60 * 1000, // 20min native, 10min web
      retry: (failureCount, error) => {
        // Ne retry-uj authentication greške
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          return false;
        }
        
        // Native aplikacije imaju više pokušaja
        const maxRetries = runtimeHelpers.isNative() ? 3 : 1;
        return failureCount < maxRetries;
      },
      retryDelay: (attemptIndex) => getRetryDelay(attemptIndex),
      networkMode: 'online', // Automatska online/offline detekcija
    },
    mutations: {
      retry: (failureCount, error) => {
        // Mutations se ne retry-uju za client errors
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        
        return failureCount < 2; // Max 2 pokušaja za mutations
      },
      retryDelay: (attemptIndex) => getRetryDelay(attemptIndex),
    },
  },
});

/**
 * Helper funkcije za common API patterns
 */
export const apiHelpers = {
  /** GET request sa type safety */
  get: async <T = any>(endpoint: string): Promise<T> => {
    const res = await apiRequest(endpoint);
    return res.json();
  },
  
  /** POST request sa type safety */
  post: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    const res = await apiRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return res.json();
  },
  
  /** PUT request sa type safety */
  put: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    const res = await apiRequest(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    return res.json();
  },
  
  /** DELETE request */
  delete: async (endpoint: string): Promise<void> => {
    await apiRequest(endpoint, { method: 'DELETE' });
  },
  
  /** File upload sa progress tracking */
  uploadFile: async (endpoint: string, file: File | Blob, fileName?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file, fileName);
    
    const res = await apiFileUpload(endpoint, formData);
    return res.json();
  },
};

// Initialize runtime config logging
console.log('🚀 [Query Client] Initialized with runtime config:', {
  apiBaseUrl: runtimeHelpers.getApiBaseUrl(),
  isNative: runtimeHelpers.isNative(),
  isDevelopment: runtimeHelpers.isDevelopment(),
  platform: runtimeHelpers.getPlatform(),
});