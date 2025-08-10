import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
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
import CustomerLayout from "@/components/layout/customer-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, MapPin, Mail } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  fullName: z.string().min(1, { message: "Ime i prezime je obavezno" }),
  phone: z.string().min(1, { message: "Broj telefona je obavezan" }),
  address: z.string().min(1, { message: "Adresa je obavezna" }),
  city: z.string().min(1, { message: "Grad je obavezan" }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function CustomerProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Inicijalizacija forme
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      address: "",
      city: "",
    },
  });
  
  // Popunjavanje forme sa korisničkim podacima
  useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.fullName || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
      });
    }
  }, [user, form]);
  
  // Mutacija za ažuriranje profila
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      // Slanje ažuriranih podataka na server
      const response = await apiRequest(`/api/users/${user?.id}`, { method: "PATCH", body: JSON.stringify(data) });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profil ažuriran",
        description: "Vaši podaci su uspešno ažurirani.",
      });
      // Osvežavanje podataka o korisniku
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri ažuriranju profila.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };
  
  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Moj profil
            </CardTitle>
            <CardDescription>
              Pregledajte i ažurirajte svoje lične podatke
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Email adresa:</h3>
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-gray-500 mr-2" />
                <p className="text-base font-medium">{user?.username}</p>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Email adresa se koristi kao korisničko ime i ne može se menjati.
              </p>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broj telefona</FormLabel>
                      <FormControl>
                        <div className="flex items-center relative">
                          <Phone className="absolute left-3 h-4 w-4 text-gray-500" />
                          <Input className="pl-10" placeholder="+38269123456" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresa</FormLabel>
                      <FormControl>
                        <div className="flex items-center relative">
                          <MapPin className="absolute left-3 h-4 w-4 text-gray-500" />
                          <Input className="pl-10" placeholder="Ulica i broj" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
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
                
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? 
                    "Ažuriranje..." : 
                    "Sačuvaj promene"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}