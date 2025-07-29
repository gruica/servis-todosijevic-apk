import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ComplusAuthPage() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Prijavi se preko standardne JWT autentifikacije
      const response = await apiRequest("/api/jwt-login", {
        method: "POST",
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Neispravni kredencijali" }));
        throw new Error(errorData.error || "Neispravni kredencijali");
      }

      const data = await response.json() as { user?: any, token?: string };

      // Proveri da li je korisnik complus_admin ili admin
      if (data?.user && (data.user.role === 'complus_admin' || data.user.role === 'admin') && data?.token) {
        localStorage.setItem("auth_token", data.token);
        // Postavi flag da je Com Plus login
        localStorage.setItem("complus_login", "true");
        navigate("/complus");
      } else {
        setError("Nemate dozvolu za pristup Com Plus panelu. Potrebna je complus_admin ili admin uloga.");
      }
    } catch (error: any) {
      console.error("Com Plus login error:", error);
      setError(error.message || "Greška pri povezivanju sa Com Plus panelom");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <Package className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              Com Plus Admin Panel
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Administrativni pristup za Com Plus brendove
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Email adresa</Label>
                <Input
                  id="username"
                  type="email"
                  placeholder="Unesite vaš email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Lozinka</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Unesite Com Plus lozinku"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Povezivanje...
                  </>
                ) : (
                  "Pristupi Com Plus panelu"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-center text-sm text-gray-600">
                <p className="font-medium">Com Plus brendovi:</p>
                <p className="mt-1">Electrolux • Elica • Candy • Hoover • Turbo Air</p>
              </div>
            </div>

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Nazad na početnu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}