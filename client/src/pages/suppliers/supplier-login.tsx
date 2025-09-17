import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Building2, LogIn, Truck, Package } from "lucide-react";

// Schema for supplier login validation
const supplierLoginSchema = z.object({
  username: z.string().min(1, "Korisničko ime je obavezno").email("Unesite važeću email adresu"),
  password: z.string().min(1, "Lozinka je obavezna"),
  rememberMe: z.boolean().optional(),
});

type SupplierLoginValues = z.infer<typeof supplierLoginSchema>;

export default function SupplierLoginPage() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Create supplier-specific login mutation using the correct endpoint
  const supplierLoginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await fetch("/api/suppliers/login", {
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
    onSuccess: (response: { user: any; token: string }) => {
      localStorage.setItem('auth_token', response.token);
      queryClient.setQueryData(["/api/jwt-user"], response.user);
      queryClient.invalidateQueries({queryKey: ["/api/jwt-user"]});
      
      toast({
        title: "Uspešna prijava",
        description: `Dobrodošli, ${response.user.fullName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri prijavi",
        description: error.message || "Neispravno korisničko ime ili lozinka",
        variant: "destructive",
      });
    },
  });

  // Redirect based on supplier role after successful login
  useEffect(() => {
    if (user) {
      if (user.role === "supplier_complus" || user.role === "supplier_beko") {
        navigate("/suppliers/dashboard");
      } else if (user.role === "admin") {
        // Don't redirect admin - show logout option instead
        console.log("Admin korisnik pokušava pristup supplier stranici");
      } else {
        // Other user types should go to their respective areas
        const redirectPath = 
          user.role === "technician" ? "/tech" :
          user.role === "customer" ? "/customer" :
          user.role === "business_partner" ? "/business" :
          "/auth";
        navigate(redirectPath);
      }
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<SupplierLoginValues>({
    resolver: zodResolver(supplierLoginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  function onLoginSubmit(values: SupplierLoginValues) {
    console.log("Submitting supplier login with username:", values.username);
    
    supplierLoginMutation.mutate({
      username: values.username,
      password: values.password,
    });
  }

  // If admin user is already logged in, show logout option
  if (user && user.role === "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Portal za dobavljače
            </CardTitle>
            <CardDescription className="text-center">
              Već ste ulogovani kao administrator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Ulogovani ste kao:</strong> {user.fullName} ({user.role})
              </p>
              <p className="text-sm text-blue-600 mt-2">
                Da biste pristupili kao dobavljač, molimo izlogujte se iz admin naloga.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
                className="flex-1"
              >
                Nazad na admin panel
              </Button>
              <Button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="flex-1"
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
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Left side - Login Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-4 lg:p-10">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Frigo Sistem Todosijević
            </CardTitle>
            <CardDescription className="text-center">
              Portal za dobavljače rezervnih delova
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email adresa</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="dobavljac@kompanija.com" 
                          {...field} 
                          type="email"
                          autoComplete="username"
                          data-testid="input-email"
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
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-remember"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Zapamti me
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {supplierLoginMutation.isError && (
                  <div className="bg-red-50 p-3 rounded-md text-red-500 text-sm">
                    <p>Neispravno korisničko ime ili lozinka. Pokušajte ponovo.</p>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={supplierLoginMutation.isPending}
                  data-testid="button-login"
                >
                  {supplierLoginMutation.isPending ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2">⏳</span> Prijavljivanje...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <LogIn className="mr-2 h-4 w-4" /> Prijavi se
                    </span>
                  )}
                </Button>

                <div className="text-center text-sm text-gray-600">
                  <p>Nemate pristup?</p>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary"
                    onClick={() => navigate("/contact")}
                    data-testid="link-contact"
                  >
                    Kontaktirajte administratora
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      {/* Right side - Supplier Portal Hero */}
      <div className="w-full lg:w-3/5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center p-10 hidden lg:flex">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Portal za dobavljače</h1>
          <p className="text-xl mb-8">
            Dobrodošli u portal za dobavljače rezervnih delova. Upravljajte inventarom, 
            pratite narudžbine i komunicirajte sa našim timom.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="mr-4 bg-white rounded-full p-3 text-blue-600">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Upravljanje inventarom</h3>
                <p className="text-blue-100">
                  Pratite stanje zaliha rezervnih delova u realnom vremenu.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-4 bg-white rounded-full p-3 text-blue-600">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Logistika i dostava</h3>
                <p className="text-blue-100">
                  Koordinirajte dostave i pratite status narudžbina.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-4 bg-white rounded-full p-3 text-blue-600">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Partnerska saradnja</h3>
                <p className="text-blue-100">
                  Efikasna komunikacija sa našim servisnim timom.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
            <h4 className="font-semibold mb-2">Pristup za:</h4>
            <div className="flex space-x-4 text-sm">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                ComPlus dobavljače
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                Beko dobavljače
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}