import { createContext, ReactNode, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  clearAuthUser: () => void; // Nova funkcija za čišćenje korisničkih podataka
  isAdmin: boolean; // Provera da li je korisnik administrator
  isTechnician: boolean; // Provera da li je korisnik serviser
  isBusinessPartner: boolean; // Provera da li je korisnik poslovni partner
  isClient: boolean; // Provera da li je korisnik klijent
  isComplusAdmin: boolean; // Provera da li je korisnik Com Plus administrator
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
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
      
      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
  
  // Debug auth stanje
  console.log("🔐 Auth Debug:", { 
    user: user ? `${user.username} (${user.role})` : null, 
    isLoading, 
    error: error?.message,
    hasUser: !!user 
  });



  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("JWT Login attempt for:", credentials.username);
      
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
      console.log("JWT Login successful for:", response.user.username);
      localStorage.setItem('auth_token', response.token);
      queryClient.setQueryData(["/api/jwt-user"], response.user);
      refetch();
      toast({
        title: "Uspešna prijava",
        description: `Dobrodošli, ${response.user.fullName}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error);
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
      const res = await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify(credentials)
      });
      const data = await res.json();
      console.log("Odgovor nakon registracije:", data);
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
      console.error("Greška pri registraciji:", error);
      toast({
        title: "Greška pri registraciji",
        description: error.message || "Korisničko ime već postoji",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem("lastAuthRedirect");
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/jwt-user"], null);
      queryClient.clear();
      
      toast({
        title: "Uspešno ste se odjavili",
        description: "Vidimo se ponovo!",
      });
    },
  });

  const clearAuthUser = () => {
    console.log("JWT: Čišćenje korisničkih podataka");
    localStorage.removeItem('auth_token');
    localStorage.removeItem("lastAuthRedirect");
    queryClient.setQueryData(["/api/jwt-user"], null);
    queryClient.invalidateQueries({queryKey: ["/api/jwt-user"]});
  };

  // Provera uloge korisnika
  const isAdmin = user?.role === "admin";
  const isTechnician = user?.role === "technician";
  const isBusinessPartner = user?.role === "business_partner";
  const isClient = user?.role === "customer";


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
