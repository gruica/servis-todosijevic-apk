import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Lock, User, CheckCircle2, Phone, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { NotificationsDropdown } from "@/components/notifications-dropdown";

// Šema za validaciju promjene šifre
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Trenutna šifra je obavezna"),
  newPassword: z.string().min(6, "Nova šifra mora imati najmanje 6 karaktera"),
  confirmPassword: z.string().min(1, "Potvrda šifre je obavezna")
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Šifre se ne podudaraju",
  path: ["confirmPassword"]
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function TechnicianProfilePage() {
  const { user, isLoading, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  const [technicianData, setTechnicianData] = useState<any>(null);
  const [, navigate] = useLocation();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });
  
  // Dohvati podatke servisera
  useEffect(() => {
    const fetchTechnicianData = async () => {
      if (user && user.technicianId) {
        try {
          const res = await fetch(`/api/technicians/${user.technicianId}`);
          if (res.ok) {
            const data = await res.json();
            setTechnicianData(data);
          }
        } catch (error) {
          console.error("Greška pri dohvatanju podataka servisera:", error);
        }
      }
    };
    
    fetchTechnicianData();
  }, [user]);
  
  // Mutacija za promjenu šifre
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/change-password", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Šifra promijenjena",
        description: "Vaša šifra je uspješno promijenjena"
      });
      setSuccess(true);
      // Resetuj formu
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri promjeni šifre",
        variant: "destructive"
      });
    }
  });
  
  // Submit handler
  function onSubmit(data: ChangePasswordFormValues) {
    setSuccess(false);
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user || user.role !== "technician") {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Pristup odbijen</CardTitle>
            <CardDescription>
              Nemate dozvolu za pristup ovoj stranici. Ova stranica je namijenjena samo serviserima.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/auth")}>
              Nazad na prijavu
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-4 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Moj profil</h1>
        <div className="flex items-center gap-4">
          <NotificationsDropdown />
          <Button 
            variant="destructive" 
            onClick={() => {
              logoutMutation.mutate(undefined, {
                onSuccess: () => {
                  toast({
                    title: "Odjava uspješna",
                    description: "Uspješno ste se odjavili.",
                  });
                  navigate("/auth");
                },
                onError: (error: Error) => {
                  toast({
                    title: "Greška pri odjavi",
                    description: error.message,
                    variant: "destructive",
                  });
                },
              });
            }}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></div>
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Odjavi se
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Osnovne informacije */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Informacije o serviseru
            </CardTitle>
            <CardDescription>
              Vaši lični podaci i specijalizacija
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Korisničko ime:</h3>
                <p className="text-base">{user.username}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Ime i prezime:</h3>
                <p className="text-base">{user.fullName}</p>
              </div>
              {technicianData && (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Specijalizacija:</h3>
                    <p className="text-base">{technicianData.specialization}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Telefon:</h3>
                    <div className="flex items-center">
                      <p className="text-base mr-2">{technicianData.phone}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(`tel:${technicianData.phone}`, '_self')}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Pozovi
                      </Button>
                    </div>
                  </div>
                </>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email:</h3>
                <p className="text-base">{user.username}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/tech")} variant="outline" className="w-full">
              Nazad na servise
            </Button>
          </CardFooter>
        </Card>
        
        {/* Forma za promjenu šifre */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Promjena šifre
            </CardTitle>
            <CardDescription>
              Ovdje možete promijeniti svoju šifru za prijavu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center justify-center py-4">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">Šifra je uspješno promijenjena!</h3>
                <p className="text-gray-500 text-center mt-2">
                  Vaša nova šifra je sačuvana. Koristite je pri sljedećoj prijavi.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setSuccess(false)}
                >
                  Promijeni ponovo
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trenutna šifra</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Unesite trenutnu šifru" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova šifra</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Unesite novu šifru" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Šifra mora imati najmanje 6 karaktera
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potvrda nove šifre</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Potvrdite novu šifru" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-2"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mijenjam šifru...
                      </>
                    ) : "Promijeni šifru"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}