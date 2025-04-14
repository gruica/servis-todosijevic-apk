import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Building, UserPlus, LogIn } from "lucide-react";

// Šema za validaciju forme za prijavu
const loginSchema = z.object({
  username: z.string().min(1, "Korisničko ime je obavezno").email("Unesite važeću email adresu"),
  password: z.string().min(1, "Lozinka je obavezna"),
  rememberMe: z.boolean().optional(),
});

// Šema za validaciju forme za registraciju
const registerSchema = z.object({
  username: z.string().min(1, "Email je obavezan").email("Unesite važeću email adresu"),
  password: z.string().min(6, "Lozinka mora imati najmanje 6 karaktera"),
  confirmPassword: z.string().min(1, "Molimo potvrdite lozinku"),
  fullName: z.string().min(1, "Ime i prezime je obavezno"),
  companyName: z.string().min(1, "Naziv kompanije je obavezan"),
  phone: z.string().min(1, "Kontakt telefon je obavezan"),
  address: z.string().min(1, "Adresa je obavezna"),
  city: z.string().min(1, "Grad je obavezan"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Lozinke se ne podudaraju",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function BusinessPartnerAuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      // Redirect to different pages based on user role
      if (user.role === "business") {
        navigate("/business");
      } else if (user.role === "admin") {
        navigate("/"); // Admin always goes to dashboard
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

  // Registration form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      companyName: "",
      phone: "",
      address: "",
      city: "",
    },
  });

  function onLoginSubmit(values: LoginValues) {
    loginMutation.mutate({
      username: values.username,
      password: values.password,
    });
  }

  function onRegisterSubmit(values: RegisterValues) {
    // Dodajemo ulogu poslovnog partnera
    console.log("Poslovni partner - podaci za registraciju:", values);
    
    registerMutation.mutate({
      username: values.username,
      password: values.password,
      fullName: values.fullName,
      companyName: values.companyName,
      phone: values.phone,
      address: values.address,
      city: values.city,
      role: "business", // Postavljamo role na business
      companyId: values.companyName.toLowerCase().replace(/[^a-z0-9]/g, ""), // Generišemo companyId iz imena kompanije
      email: values.username, // Koristimo username kao email jer je već validiran kao email
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Left side - Auth Form */}
      <div className="w-full md:w-2/5 flex items-center justify-center p-4 md:p-10">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Frigo Sistem Todosijević</CardTitle>
            <CardDescription className="text-center">
              Portal za poslovne partnere
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Prijava</TabsTrigger>
                <TabsTrigger value="register">Registracija</TabsTrigger>
              </TabsList>
              
              {/* Login Form */}
              <TabsContent value="login">
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
                              placeholder="vas@kompanija.com" 
                              {...field} 
                              type="email"
                              autoComplete="username" 
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
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2">⏳</span> Prijavljivanje...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <LogIn className="mr-2 h-4 w-4" /> Prijavi se
                        </span>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              {/* Register Form */}
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-md mb-4 text-sm text-blue-700 border border-blue-200">
                      <p className="font-medium flex items-center">
                        <Building className="mr-2 h-4 w-4" />
                        Registracija za poslovne partnere
                      </p>
                      <p className="mt-1 text-xs">
                        Nakon registracije, vaš nalog će biti pregledan od strane administratora. Dobićete email obaveštenje kada nalog bude aktiviran.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ime i prezime</FormLabel>
                            <FormControl>
                              <Input placeholder="Vaše ime i prezime" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Naziv kompanije</FormLabel>
                            <FormControl>
                              <Input placeholder="Naziv vaše kompanije" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email adresa</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="poslovni@partner.com" 
                              {...field} 
                              type="email"
                              autoComplete="username" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lozinka</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Kreirajte lozinku" 
                                type="password" 
                                {...field} 
                                autoComplete="new-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Potvrda lozinke</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Potvrdite lozinku" 
                                type="password" 
                                {...field} 
                                autoComplete="new-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kontakt telefon</FormLabel>
                          <FormControl>
                            <Input placeholder="Vaš kontakt telefon" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresa</FormLabel>
                          <FormControl>
                            <Input placeholder="Adresa kompanije" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grad</FormLabel>
                          <FormControl>
                            <Input placeholder="Grad" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2">⏳</span> Registracija...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <UserPlus className="mr-2 h-4 w-4" /> Registruj se
                        </span>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Right side - Hero Banner */}
      <div className="w-full md:w-3/5 bg-blue-600 text-white flex items-center justify-center p-10 hidden md:flex">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Portal za poslovne partnere</h1>
          <p className="text-xl mb-6">
            Dobrodošli u poslovni portal Frigo Sistema Todosijević. Kao naš poslovni partner, 
            možete efikasno upravljati servisnim zahtevima i pratiti njihov status.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="mr-4 bg-white rounded-full p-2 text-blue-600">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold">Upravljanje servisnim zahtevima</h3>
                <p className="text-blue-100">Kreirajte i pratite servisne zahteve za vaše klijente.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="mr-4 bg-white rounded-full p-2 text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-bold">Bezbednost i poverljivost</h3>
                <p className="text-blue-100">Vaši podaci su zaštićeni, a pristup imaju samo ovlašćene osobe.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}