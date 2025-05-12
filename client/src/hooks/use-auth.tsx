import { createContext, ReactNode, useContext } from "react";
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
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Uvek sveži podaci
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login with username:", credentials.username);
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include"
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Login error:", res.status, errorText);
          throw new Error(errorText || "Neispravno korisničko ime ili lozinka");
        }
        
        return await res.json();
      } catch (err) {
        console.error("Login fetch error:", err);
        throw err;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Login successful, user:", user.username);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Uspešna prijava",
        description: `Dobrodošli, ${user.fullName}!`,
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
      const res = await apiRequest("POST", "/api/register", credentials);
      const data = await res.json();
      console.log("Odgovor nakon registracije:", data);
      return data;
    },
    onSuccess: (data: any) => {
      // Ako je korisnik poslovni partner, ne postavljamo ga u queryClient
      // jer mora biti verifikovan pre pristupa
      if (data.role === "business") {
        toast({
          title: "Uspešna registracija",
          description: data.message || "Zahtev za registraciju je uspešno poslat. Administrator će uskoro verifikovati vaš nalog.",
        });
      } else {
        // Za ostale tipove korisnika, postavljamo podatke u queryClient
        queryClient.setQueryData(["/api/user"], data);
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
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Uspešno ste se odjavili",
        description: "Vidimo se ponovo!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri odjavljivanju",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Nova funkcija za čišćenje auth korisnika
  const clearAuthUser = () => {
    console.log("Čišćenje korisničkih podataka za novi login");
    queryClient.setQueryData(["/api/user"], null);
    localStorage.removeItem("lastAuthRedirect");
  };

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
