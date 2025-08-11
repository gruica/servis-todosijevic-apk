import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, UserIcon, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatRelativeDate } from "@/lib/date-utils";

type UnverifiedUser = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  registeredAt: string;
  isVerified: boolean;
};

const UserVerificationPanel: React.FC = () => {
  const [unverifiedUsers, setUnverifiedUsers] = useState<UnverifiedUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyingUser, setVerifyingUser] = useState<number | null>(null);
  const { toast } = useToast();

  // Funkcija za dobavljanje neverifikovanih korisnika
  const fetchUnverifiedUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest("/api/users/unverified", { method: "GET" });
      const data = await response.json();
      setUnverifiedUsers(data || []);
    } catch (err: any) {
      // Parse error message from the thrown error
      let errorMessage = "Došlo je do greške pri učitavanju neverifikovanih korisnika";
      
      if (err.message) {
        // Extract meaningful error message from response
        if (err.message.includes("401")) {
          errorMessage = "Nemate dozvolu za pristup ovim podacima";
        } else if (err.message.includes("500")) {
          errorMessage = "Greška na serveru";
        } else if (err.message.includes("Unexpected token") && err.message.includes("<!DOCTYPE")) {
          errorMessage = "Server je vratio HTML umesto podataka - molim vas osveži stranicu";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast({
        title: "Greška",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcija za verifikaciju korisnika
  const verifyUser = async (userId: number) => {
    setVerifyingUser(userId);
    
    try {
      const response = await apiRequest(`/api/users/${userId}/verify`, { method: "POST" });
      const data = await response.json();
      
      // User verification successful
      
      // Ukloni korisnika iz liste neverifikovanih
      setUnverifiedUsers(prev => prev.filter(user => user.id !== userId));
      
      toast({
        title: "Korisnik verifikovan",
        description: `Korisnik ${data.user?.fullName || "Korisnik"} je uspešno verifikovan`,
        variant: "default",
      });
    } catch (err: any) {
      // Error handling for user verification
      
      let errorMessage = "Nije moguće verifikovati korisnika";
      
      if (err.message) {
        if (err.message.includes("401:")) {
          errorMessage = "Nemate dozvolu za verifikaciju korisnika";
        } else if (err.message.includes("404:")) {
          errorMessage = "Korisnik nije pronađen";
        } else if (err.message.includes("500:")) {
          errorMessage = "Greška na serveru";
        } else {
          errorMessage = err.message;
        }
      }
      
      toast({
        title: "Greška",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setVerifyingUser(null);
    }
  };

  // Učitaj neverifikovane korisnike kada se komponenta montira
  useEffect(() => {
    fetchUnverifiedUsers();
  }, []);

  // Funkcija za prikaz rola na srpskom jeziku
  const getRoleName = (role: string): string => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "technician":
        return "Serviser";
      case "business_partner":
        return "Poslovni korisnik";
      case "customer":
        return "Klijent";
      default:
        return "Nepoznata uloga";
    }
  };

  // Funkcija za stilizovanje bedža uloge
  const getRoleVariant = (role: string): "default" | "outline" | "secondary" | "destructive" => {
    switch (role) {
      case "admin":
        return "destructive";
      case "technician":
        return "default";
      case "business_partner":
        return "secondary";
      case "customer":
        return "outline";
      default:
        return "outline";
    }
  };

  // Prikaži poruku o učitavanju ako se podaci učitavaju
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Verifikacija korisnika</CardTitle>
          <CardDescription>Učitavanje neverifikovanih korisnika...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Prikaži poruku o grešci ako postoji greška
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Verifikacija korisnika</CardTitle>
          <CardDescription>Došlo je do greške pri učitavanju korisnika</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nije moguće učitati neverifikovane korisnike</h3>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={fetchUnverifiedUsers} className="w-full">
            Pokušaj ponovo
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Prikaži poruku ako nema neverifikovanih korisnika
  if (unverifiedUsers.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Verifikacija korisnika</CardTitle>
          <CardDescription>Svi korisnici su verifikovani</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nema neverifikovanih korisnika</h3>
          <p className="text-muted-foreground">Svi korisnici u sistemu su verifikovani.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={fetchUnverifiedUsers} variant="outline" className="w-full">
            Osveži
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Prikaži listu neverifikovanih korisnika
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Verifikacija korisnika</CardTitle>
            <CardDescription>Korisnici koji čekaju verifikaciju ({unverifiedUsers.length})</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchUnverifiedUsers}
            className="hidden sm:flex items-center gap-1"
          >
            <span>Osveži</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {unverifiedUsers.map((user) => (
            <div
              key={user.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{user.fullName}</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground mt-1">
                    <span>@{user.username}</span>
                    {user.email && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span>{user.email}</span>
                      </>
                    )}
                    <span className="hidden sm:inline">•</span>
                    <span>Registrovan {formatRelativeDate(new Date(user.registeredAt))}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-row items-center justify-between w-full sm:w-auto gap-2">
                <Badge variant={getRoleVariant(user.role)}>
                  {getRoleName(user.role)}
                </Badge>
                <Button
                  onClick={() => verifyUser(user.id)}
                  disabled={verifyingUser === user.id}
                  size="sm"
                >
                  {verifyingUser === user.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifikacija...
                    </>
                  ) : (
                    "Verifikuj"
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="sm:hidden">
        <Button onClick={fetchUnverifiedUsers} variant="outline" className="w-full">
          Osveži
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UserVerificationPanel;