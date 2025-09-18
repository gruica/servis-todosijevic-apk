import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { UserRole, isSupplierRole, hasAdminAccess, hasTechnicianAccess, hasSupplierAccess, hasBusinessPartnerAccess } from "@shared/types";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ user: SelectUser; token: string }, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<any, Error, InsertUser>;
  clearAuthUser: () => void; // Nova funkcija za čišćenje korisničkih podataka
  isAdmin: boolean; // Provera da li je korisnik administrator
  isTechnician: boolean; // Provera da li je korisnik serviser
  isBusinessPartner: boolean; // Provera da li je korisnik poslovni partner
  isClient: boolean; // Provera da li je korisnik klijent
  // Supplier role convenience methods
  isSupplier: boolean; // Da li je korisnik dobavljač (bilo koji tip)
  isSupplierComplus: boolean; // Da li je ComPlus dobavljač
  isSupplierBeko: boolean; // Da li je Beko dobavljač
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/jwt-user"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return null;
      }
      
      const response = await fetch("/api/jwt-user", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          return null;
        }
        throw new Error('Failed to fetch user');
      }
      
      const userData = await response.json();
      console.log('[useAuth] JWT User data received:', userData);
      return userData;
    },
    enabled: !!localStorage.getItem('auth_token'),
    staleTime: 10 * 60 * 1000, // PERFORMANCE OPTIMIZATION: 10 minutes (from 2 minutes)
    refetchOnWindowFocus: false, // Disable focus refetching for better performance
    refetchOnMount: false, // Only refetch if data is stale
    retry: (failureCount, error: any) => {
      // Don't retry auth errors (401)
      if (error?.status === 401 || error?.response?.status === 401) {
        return false;
      }
      // Max 2 retries for other errors
      return failureCount < 2;
    },
  });
  

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      
      const res = await fetch("/api/jwt-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Login failed" }));
        throw new Error(errorData.error || "Neispravno korisničko ime ili lozinka");
      }
      
      return await res.json();
    },
    onSuccess: (response: { user: SelectUser; token: string }) => {
      // Store token first
      localStorage.setItem('auth_token', response.token);
      
      // PRELOAD STRATEGY: Cache user data immediately to avoid DB hit
      queryClient.setQueryData(["/api/jwt-user"], response.user);
      console.log('🚀 [LOGIN-PRELOAD] User data cached immediately on login');
      
      // Don't call refetch since we already have fresh data
      toast({
        title: "Uspešna prijava",
        description: `Dobrodošli, ${response.user.fullName}!`,
      });
    },
    onError: (error: Error) => {
      // Proveri da li je greška o neverifikovanom nalogu
      const errorMessage = error.message || "";
      const isVerificationError = errorMessage.includes("nije verifikovan") || 
                                 errorMessage.includes("nije još verifikovan") ||
                                 errorMessage.includes("sačekajte potvrdu");
      
      toast({
        title: "Greška pri prijavi",
        description: isVerificationError 
          ? "Vaš nalog još nije verifikovan. Molimo sačekajte da administrator odobri vaš nalog."
          : "Neispravno korisničko ime ili lozinka",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Registration failed" }));
        throw new Error(errorData.error || "Registration failed");
      }
      const data = await res.json();
      return data;
    },
    onSuccess: (data: any) => {
      // Ako je korisnik poslovni partner, ne postavljamo ga u queryClient
      // jer mora biti verifikovan pre pristupa
      if (data.role === "business_partner") {
        toast({
          title: "Uspešna registracija",
          description: data.message || "Zahtev za registraciju je uspešno poslat. Administrator će uskoro verifikovati vaš nalog.",
        });
      } else {
        // Za ostale tipove korisnika, postavljamo podatke u queryClient
        queryClient.setQueryData(["/api/jwt-user"], data);
        toast({
          title: "Uspešna registracija",
          description: `Dobrodošli, ${data.fullName}!`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri registraciji",
        description: error.message || "Korisničko ime već postoji",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Send server-side cache invalidation request if user exists
      if (user?.id) {
        try {
          await fetch('/api/jwt-user/invalidate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ userId: user.id })
          });
          console.log('🗑️ [LOGOUT-INVALIDATION] Server-side cache invalidated');
        } catch (error) {
          console.warn('⚠️ [LOGOUT-INVALIDATION] Failed to invalidate server cache:', error);
          // Don't fail logout if cache invalidation fails
        }
      }
      
      localStorage.removeItem('auth_token');
      localStorage.removeItem("lastAuthRedirect");
      return Promise.resolve();
    },
    onSuccess: () => {
      // SMART CACHE INVALIDATION: Only remove JWT user query, not all queries
      queryClient.removeQueries({ queryKey: ["/api/jwt-user"] });
      console.log('🧹 [LOGOUT-CACHE] Client-side JWT cache cleared');
      
      toast({
        title: "Uspešno ste se odjavili",
        description: "Vidimo se ponovo!",
      });
    },
  });

  const clearAuthUser = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem("lastAuthRedirect");
    queryClient.setQueryData(["/api/jwt-user"], null);
    queryClient.invalidateQueries({queryKey: ["/api/jwt-user"]});
  };

  // Provera uloge korisnika
  const isAdmin = user?.role === "admin";
  const isTechnician = user?.role === "technician";
  const isBusinessPartner = user?.role === "business_partner";
  const isClient = user?.role === "client";
  
  // Supplier role checks
  const isSupplier = user ? isSupplierRole(user.role) : false;
  const isSupplierComplus = user?.role === "supplier_complus";
  const isSupplierBeko = user?.role === "supplier_beko";

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        clearAuthUser,
        // Prosleđujemo booleane za proveru uloge
        isAdmin: isAdmin || false,
        isTechnician: isTechnician || false,
        isBusinessPartner: isBusinessPartner || false,
        isClient: isClient || false,
        // Supplier role methods
        isSupplier: isSupplier || false,
        isSupplierComplus: isSupplierComplus || false,
        isSupplierBeko: isSupplierBeko || false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
