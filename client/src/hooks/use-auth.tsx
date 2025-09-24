import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest, queryClient } from '../lib/queryClient';
import { runtimeHelpers } from '@shared/runtime-config';
import { useToast } from '@/hooks/use-toast';

/**
 * ENVIRONMENT-AWARE AUTHENTICATION SYSTEM
 * 
 * Ova implementacija pruža robusan auth sistem koji radi
 * identično na web i mobilnim platformama sa intelligent
 * token management-om i offline support-om.
 */

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  email: string;
  phone?: string;
  technicianId?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Platform-aware token storage
 * Native apps mogu koristiti Capacitor Preferences, web koristi localStorage
 */
const tokenStorage = {
  async get(): Promise<string | null> {
    try {
      if (runtimeHelpers.isNative()) {
        // Za native aplikacije - koristi Capacitor Preferences ako je dostupan
        const { storage } = await import('@/capacitor');
        return await storage.get('auth_token');
      } else {
        // Za web aplikacije - koristi localStorage
        return localStorage.getItem('auth_token');
      }
    } catch (error) {
      console.warn('⚠️ [Auth] Token storage get failed, falling back to localStorage:', error);
      return localStorage.getItem('auth_token');
    }
  },
  
  async set(token: string): Promise<void> {
    try {
      if (runtimeHelpers.isNative()) {
        // Za native aplikacije
        const { storage } = await import('@/capacitor');
        await storage.set('auth_token', token);
      } else {
        // Za web aplikacije
        localStorage.setItem('auth_token', token);
      }
    } catch (error) {
      console.warn('⚠️ [Auth] Token storage set failed, falling back to localStorage:', error);
      localStorage.setItem('auth_token', token);
    }
  },
  
  async remove(): Promise<void> {
    try {
      if (runtimeHelpers.isNative()) {
        // Za native aplikacije
        const { storage } = await import('@/capacitor');
        await storage.remove('auth_token');
      } else {
        // Za web aplikacije
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.warn('⚠️ [Auth] Token storage remove failed, falling back to localStorage:', error);
      localStorage.removeItem('auth_token');
    }
  }
};

/**
 * Hook za pristupanje JWT user podacima sa environment awareness
 */
function useJwtUser() {
  return useQuery({
    queryKey: ['/api/jwt-user'],
    enabled: true, // Uvek pokreni query
    retry: (failureCount, error: any) => {
      // Ne retry-uj 401 errors (unauthorized)
      if (error?.status === 401) {
        return false;
      }
      
      // Native aplikacije imaju više pokušaja zbog network issues
      const maxRetries = runtimeHelpers.isNative() ? 3 : 1;
      return failureCount < maxRetries;
    },
    staleTime: runtimeHelpers.isNative() ? 10 * 60 * 1000 : 5 * 60 * 1000, // 10min native, 5min web
    gcTime: runtimeHelpers.isNative() ? 20 * 60 * 1000 : 10 * 60 * 1000, // 20min native, 10min web
  });
}

/**
 * Main Auth Provider komponenta
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isInitializing, setIsInitializing] = useState(true);
  
  // JWT user query
  const { 
    data: user, 
    isLoading: userQueryLoading, 
    error: userError 
  } = useJwtUser();
  
  // Inicijalizacija auth state-a
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await tokenStorage.get();
        
        if (token) {
          console.log('🔐 [Auth] Token found, validating user...');
          // Token postoji, query će automatski pokušati da učita korisnika
        } else {
          console.log('🔓 [Auth] No token found, user not authenticated');
        }
      } catch (error) {
        console.error('❌ [Auth] Initialization failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeAuth();
  }, []);
  
  // Login mutation sa environment-aware error handling
  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: LoginRequest): Promise<LoginResponse> => {
      console.log('🔐 [Auth] Starting login process...');
      
      try {
        const response = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
        
        const data: LoginResponse = await response.json();
        console.log('✅ [Auth] Login successful:', { 
          success: data.success, 
          user: data.user?.username 
        });
        
        return data;
      } catch (error) {
        console.error('❌ [Auth] Login failed:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      if (data.success && data.token && data.user) {
        // Sačuvaj token
        await tokenStorage.set(data.token);
        console.log('💾 [Auth] Token saved successfully');
        
        // Invaliduj JWT user query da učita nove podatke
        queryClient.invalidateQueries({ queryKey: ['/api/jwt-user'] });
        
        // Na native platformama možda treba reload da bi se token propagirao
        if (runtimeHelpers.isNative()) {
          console.log('📱 [Auth] Native platform - refreshing queries...');
          queryClient.invalidateQueries();
        }
      }
    },
    onError: (error) => {
      console.error('❌ [Auth] Login mutation failed:', error);
    },
    retry: false, // Ne retry-uj login attempts
  });
  
  // Logout funkcija sa comprehensive cleanup
  const logout = async () => {
    try {
      console.log('🚪 [Auth] Starting logout process...');
      
      // API poziv za logout (optional, ali dobra praksa)
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
        console.log('✅ [Auth] Server logout successful');
      } catch (error) {
        console.warn('⚠️ [Auth] Server logout failed (proceeding anyway):', error);
      }
      
      // Ukloni token iz storage-a
      await tokenStorage.remove();
      console.log('🗑️ [Auth] Token removed from storage');
      
      // Očisti query cache
      queryClient.clear();
      console.log('🧹 [Auth] Query cache cleared');
      
      // Redirect na login page (ako je potrebno)
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      
    } catch (error) {
      console.error('❌ [Auth] Logout failed:', error);
    }
  };
  
  // Token refresh funkcija
  const refreshToken = async () => {
    try {
      console.log('🔄 [Auth] Refreshing token...');
      
      const response = await apiRequest('/api/auth/refresh', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        await tokenStorage.set(data.token);
        console.log('✅ [Auth] Token refreshed successfully');
        
        // Invaliduj queries da se učitaju sa novim token-om
        queryClient.invalidateQueries({ queryKey: ['/api/jwt-user'] });
      }
    } catch (error) {
      console.error('❌ [Auth] Token refresh failed:', error);
      // Ako refresh ne uspe, logout korisnika
      await logout();
    }
  };
  
  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<User>) => {
      return apiRequest('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
    },
    onSuccess: () => {
      console.log('✅ [Auth] Profile updated successfully');
      // Invaliduj user data da se refresh-uje
      queryClient.invalidateQueries({ queryKey: ['/api/jwt-user'] });
    },
    onError: (error) => {
      console.error('❌ [Auth] Profile update failed:', error);
    },
  });
  
  // Computed values
  const isAuthenticated = !!user && !userError;
  const isLoading = isInitializing || userQueryLoading || loginMutation.isPending;
  
  // Auth context value
  const authValue: AuthContextType = {
    user: user || null,
    isAuthenticated,
    isLoading,
    login: async (username: string, password: string) => {
      await loginMutation.mutateAsync({ username, password });
    },
    logout,
    refreshToken,
    updateProfile: async (profileData: Partial<User>) => {
      await updateProfileMutation.mutateAsync(profileData);
    },
  };
  
  // Debug logging (samo u development)
  useEffect(() => {
    if (runtimeHelpers.isDevelopment()) {
      console.log('🔍 [Auth] State debug:', {
        isAuthenticated,
        isLoading,
        hasUser: !!user,
        userError: userError?.message,
        platform: runtimeHelpers.getPlatform(),
        apiBaseUrl: runtimeHelpers.getApiBaseUrl(),
      });
    }
  }, [isAuthenticated, isLoading, user, userError]);
  
  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook za korišćenje Auth konteksta
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Utility funkcije za auth
 */
export const authHelpers = {
  /** Proverava da li je korisnik admin */
  isAdmin: (user: User | null): boolean => user?.role === 'admin',
  
  /** Proverava da li je korisnik tehničar */
  isTechnician: (user: User | null): boolean => user?.role === 'technician',
  
  /** Proverava da li je korisnik business partner */
  isBusinessPartner: (user: User | null): boolean => user?.role === 'business_partner',
  
  /** Proverava da li je korisnik customer */
  isCustomer: (user: User | null): boolean => user?.role === 'customer',
  
  /** Dobija trenutni token iz storage-a */
  getCurrentToken: async (): Promise<string | null> => {
    return await tokenStorage.get();
  },
  
  /** Proverava da li token postoji */
  hasToken: async (): Promise<boolean> => {
    const token = await tokenStorage.get();
    return !!token;
  },
};

// Automatic authentication debugging za development
if (runtimeHelpers.isDevelopment() && typeof window !== 'undefined') {
  // @ts-ignore - dodaj debug helper na window objekat
  window.authDebug = {
    getToken: authHelpers.getCurrentToken,
    refreshToken: () => console.log('Use refreshToken() from useAuth hook'),
    clearStorage: tokenStorage.remove,
    runtimeConfig: () => console.log({
      apiBaseUrl: runtimeHelpers.getApiBaseUrl(),
      isNative: runtimeHelpers.isNative(),
      platform: runtimeHelpers.getPlatform(),
    }),
  };
  
  console.log('🛠️ [Auth] Debug helpers available at window.authDebug');
}