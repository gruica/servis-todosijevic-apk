import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Package, LogIn, Truck, Shield } from "lucide-react";

// Šema za validaciju forme za prijavu
const loginSchema = z.object({
  username: z.string().min(1, "Email ili korisničko ime je obavezno"),
  password: z.string().min(1, "Lozinka je obavezna"),
  rememberMe: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function SupplierAuthPage() {
  const { user, loginMutation, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      // Redirect suppliers to their dashboard
      if (user.role === "supplier_beko" || user.role === "supplier_complus") {
        navigate("/suppliers/dashboard");
      } else if (user.role === "admin") {
        // Don't redirect admin - show logout option instead
        console.log("Admin korisnik pokušava pristup supplier stranici");
      } else {
        navigate("/auth"); // Others go to regular auth
      }
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  function onLoginSubmit(values: LoginValues) {
    console.log("Supplier login attempt:", values.username);
    
    loginMutation.mutate({
      username: values.username,
      password: values.password,
    });
  }

  // Handle login success with proper validation
  useEffect(() => {
    if (loginMutation.isSuccess && user) {
      // Check if user has supplier role
      if (user.role === "supplier_beko" || user.role === "supplier_complus") {
        navigate("/suppliers/dashboard");
      } else {
        // User doesn't have supplier role - show error and logout
        toast({
          title: "Nemate dozvolu za pristup",
          description: "Ovaj portal je namenjen samo dobavljačima. Molimo koristite odgovarajući portal za vašu ulogu.",
          variant: "destructive",
        });
        logoutMutation.mutate();
      }
    }
  }, [loginMutation.isSuccess, user, navigate, toast, logoutMutation]);

  // Handle login error
  useEffect(() => {
    if (loginMutation.isError) {
      const errorMessage = loginMutation.error?.message || "";
      const isRoleError = errorMessage.includes("pristup") || errorMessage.includes("dozvolu");
      
      if (isRoleError) {
        toast({
          title: "Nemate dozvolu za pristup",
          description: "Ovaj portal je namenjen samo dobavljačima Beko i ComPlus.",
          variant: "destructive",
        });
      }
    }
  }, [loginMutation.isError, loginMutation.error, toast]);

  // Ako je admin korisnik već ulogovan, prikaži logout opciju
  if (user && user.role === "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Supplier Portal - Dobavljači Rezervnih Delova
            </CardTitle>
            <CardDescription className="text-center">
              Već ste ulogovani kao administrator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-teal-50 p-4 rounded-lg">
              <p className="text-sm text-teal-800">
                <strong>Ulogovani ste kao:</strong> {user.fullName} ({user.role})
              </p>
              <p className="text-sm text-teal-600 mt-2">
                Da biste pristupili kao dobavljač, molimo izlogujte se iz admin naloga.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1"
              >
                Nazad na admin panel
              </Button>
              <Button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                {logoutMutation.isPending ? "Izlogovanje..." : "Izloguj se"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Left side - Auth Form */}
      <div className="w-full md:w-2/5 flex items-center justify-center p-4 md:p-10">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Supplier Portal - Dobavljači Rezervnih Delova</CardTitle>
            <CardDescription className="text-center">
              Prijavite se da pristupite portalu za dobavljače
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Only Login - No Registration */}
            <div className="w-full">
              <div className="bg-teal-50 p-3 rounded-md mb-6 text-sm text-teal-700 border border-teal-200">
                <p className="font-medium flex items-center">
                  <Package className="mr-2 h-4 w-4" />
                  Portal za dobavljače
                </p>
                <p className="mt-1 text-xs">
                  Ovaj portal je namenjen samo verifikovanim dobavljačima Beko i ComPlus.
                </p>
              </div>
              
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email adresa ili korisničko ime</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="dobavljac@beko.com" 
                            {...field} 
                            autoComplete="username" 
                            data-testid="input-supplier-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lozinka</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Vaša lozinka" 
                            type="password" 
                            {...field} 
                            autoComplete="current-password"
                            data-testid="input-supplier-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {loginMutation.isError && (
                    <div className="bg-red-50 p-3 rounded-md text-red-500 text-sm border border-red-200">
                      <p>Neispravno korisničko ime ili lozinka. Proverite vaše kredencijale.</p>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-teal-600 hover:bg-teal-700" 
                    disabled={loginMutation.isPending}
                    data-testid="button-supplier-login"
                  >
                    {loginMutation.isPending ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">⏳</span> Prijavljivanje...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <LogIn className="mr-2 h-4 w-4" /> Prijavi se kao dobavljač
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Right side - Hero Banner */}
      <div className="w-full md:w-3/5 bg-teal-600 text-white flex items-center justify-center p-10 hidden md:flex">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Portal za dobavljače rezervnih delova</h1>
          <p className="text-xl mb-6">
            Dobrodošli u portal za dobavljače Frigo Sistema Todosijević. Kao verifikovani dobavljač, 
            možete efikasno upravljati zahtevima za rezervnim delovima i pratiti status porudžbina.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="mr-4 bg-white rounded-full p-2 text-teal-600">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold">Upravljanje rezervnim delovima</h3>
                <p className="text-teal-100">Pristupite katalogu rezervnih delova i upravljajte zahtevima.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="mr-4 bg-white rounded-full p-2 text-teal-600">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold">Praćenje dostave</h3>
                <p className="text-teal-100">Pratite status porudžbina i dostava u realnom vremenu.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="mr-4 bg-white rounded-full p-2 text-teal-600">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold">Bezbednost i poverljivost</h3>
                <p className="text-teal-100">Vaši podaci su zaštićeni, a pristup imaju samo ovlašćene osobe.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}