import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";
import { Link } from "wouter";

// Define the form schema
const technicianUserSchema = z.object({
  technicianId: z.string().min(1, { message: "Serviser je obavezan" }),
  username: z.string().email({ message: "Unesite validnu email adresu" }),
  password: z.string().min(6, { message: "Lozinka mora imati najmanje 6 karaktera" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Lozinke se ne podudaraju",
  path: ["confirmPassword"],
});

type TechnicianUserValues = z.infer<typeof technicianUserSchema>;

export default function CreateTechnicianUser() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);

  // Get technicians list
  const { data: technicians = [], isLoading: isLoadingTechnicians } = useQuery({
    queryKey: ["/api/technicians"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/technicians", { signal });
      if (!response.ok) {
        throw new Error("Greška pri dobijanju servisera");
      }
      return response.json();
    },
  });

  // Form
  const form = useForm<TechnicianUserValues>({
    resolver: zodResolver(technicianUserSchema),
    defaultValues: {
      technicianId: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Create technician user mutation
  const createTechnicianUserMutation = useMutation({
    mutationFn: async (data: TechnicianUserValues) => {
      const res = await apiRequest("POST", "/api/technician-users", {
        technicianId: parseInt(data.technicianId),
        username: data.username,
        password: data.password,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Korisnik kreiran",
        description: "Nalog za servisera je uspješno kreiran.",
      });
      setSuccess(true);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri kreiranju korisnika",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: TechnicianUserValues) {
    setSuccess(false);
    createTechnicianUserMutation.mutate(values);
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Pristup odbijen</CardTitle>
            <CardDescription>
              Nemate dozvolu za pristup ovoj stranici.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/">Natrag na početnu</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Kreiranje korisničkog naloga za servisera</CardTitle>
          <CardDescription>
            Ovaj formular omogućava kreiranje korisničkih naloga za postojeće servisere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h2 className="text-xl font-semibold text-center">Nalog uspješno kreiran!</h2>
              <p className="text-center text-gray-500">
                Korisnički nalog za servisera je uspješno kreiran.
              </p>
              <div className="flex space-x-4 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSuccess(false)}
                >
                  Kreiraj novi
                </Button>
                <Button asChild>
                  <Link href="/">Idi na početnu</Link>
                </Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="technicianId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviser</FormLabel>
                      <Select
                        disabled={isLoadingTechnicians}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite servisera" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {technicians.map((technician: any) => (
                            <SelectItem 
                              key={technician.id} 
                              value={technician.id.toString()}
                            >
                              {technician.fullName} {technician.specialization ? `(${technician.specialization})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email adresa</FormLabel>
                      <FormControl>
                        <Input placeholder="serviser@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lozinka</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potvrdite lozinku</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createTechnicianUserMutation.isPending}
                  >
                    {createTechnicianUserMutation.isPending ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-background rounded-full"></div>
                        Učitavanje...
                      </>
                    ) : (
                      "Kreiraj nalog"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}