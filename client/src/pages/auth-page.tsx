import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

// Define login and registration schemas
const loginSchema = z.object({
  username: z.string().email({ message: "Molimo unesite validnu email adresu" }),
  password: z.string().min(1, { message: "Lozinka je obavezna" }),
  rememberMe: z.boolean().optional(),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, { message: "Lozinka mora imati najmanje 6 karaktera" }),
  confirmPassword: z.string(),
  phone: z.string().min(1, { message: "Broj telefona je obavezan" }),
  address: z.string().min(1, { message: "Adresa je obavezna" }),
  city: z.string().min(1, { message: "Grad je obavezan" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Lozinke se ne podudaraju",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      // Redirect to different pages based on user role
      if (user.role === "technician") {
        navigate("/tech");
      } else if (user.role === "customer") {
        navigate("/customer");
      } else if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
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
      phone: "",
      address: "",
      city: "",
      role: "customer", // Postavljamo role na customer za registraciju
    },
  });

  function onLoginSubmit(values: LoginValues) {
    loginMutation.mutate({
      username: values.username,
      password: values.password,
    });
  }

  function onRegisterSubmit(values: RegisterValues) {
    registerMutation.mutate({
      username: values.username,
      password: values.password,
      fullName: values.fullName,
      phone: values.phone,
      address: values.address,
      city: values.city,
      role: "customer", // Uvek postavljamo rolu na customer
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
              Aplikacija za vođenje servisa bele tehnike
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
                            <Input placeholder="vasa@adresa.com" {...field} />
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
                            <Input type="password" placeholder="********" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center justify-between">
                      <FormField
                        control={loginForm.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Zapamti me
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <a href="#" className="text-sm text-primary hover:underline">
                        Zaboravili ste lozinku?
                      </a>
                    </div>
                    {loginMutation.isError && (
                      <div className="bg-red-50 p-3 rounded-md text-red-500 text-sm mb-2">
                        <p>Neispravno korisničko ime ili lozinka. Pokušajte ponovo.</p>
                      </div>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Prijavljivanje..." : "Prijavi se"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Registration Form */}
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ime i prezime</FormLabel>
                          <FormControl>
                            <Input placeholder="Petar Petrović" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email adresa</FormLabel>
                          <FormControl>
                            <Input placeholder="vasa@adresa.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Broj telefona</FormLabel>
                          <FormControl>
                            <Input placeholder="+38269123456" {...field} />
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
                            <Input placeholder="Ulica i broj" {...field} />
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
                            <Input placeholder="Podgorica" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lozinka</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="********" {...field} />
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
                          <FormLabel>Potvrdite lozinku</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="********" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {registerMutation.isError && (
                      <div className="bg-red-50 p-3 rounded-md text-red-500 text-sm mb-2">
                        <p>Greška pri registraciji. Korisničko ime možda već postoji.</p>
                      </div>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Registracija..." : "Registruj se"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Hero section */}
      <div className="w-full md:w-3/5 bg-primary text-white hidden md:flex md:flex-col md:justify-center md:items-center p-10">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Frigo Sistem Todosijević</h1>
          <p className="text-xl mb-6">
            Aplikacija za vođenje servisa bele tehnike u Crnoj Gori sa sistemom autentifikacije i praćenjem servisa.
          </p>
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-semibold mb-4">Funkcionalnosti:</h2>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="material-icons mr-2">check_circle</span>
                <span>Praćenje servisa i njihovih statusa</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons mr-2">check_circle</span>
                <span>Unos i ažuriranje podataka o klijentima</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons mr-2">check_circle</span>
                <span>Evidencija bele tehnike po tipu i proizvođaču</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons mr-2">check_circle</span>
                <span>Pretraga servisa i klijenata</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
