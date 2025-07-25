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

    // Validacija Com Plus kredencijala
    if (username !== "teodora@frigosistemtodosijevic.com" || password !== "Teodora123") {
      setError("Neispravni Com Plus kredencijali");
      setIsLoading(false);
      return;
    }

    try {
      // Prijavi se sa Teodorinim kredencijalima preko JWT auth
      const response = await apiRequest("POST", "/api/jwt-login", {
        username: username,
        password: password
      });

      const data = await response.json() as { token?: string };

      if (data?.token) {
        localStorage.setItem("auth_token", data.token);
        navigate("/complus");
      } else {
        setError("Greška pri prijavi na Com Plus panel");
      }
    } catch (error) {
      console.error("Com Plus login error:", error);
      setError("Greška pri povezivanju sa Com Plus panelom");
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
                  placeholder="teodora@frigosistemtodosijevic.com"
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