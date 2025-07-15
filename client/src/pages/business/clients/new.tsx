import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BusinessLayout from "@/components/layout/business-layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

// Validaciona šema za novog klijenta
const newClientSchema = z.object({
  fullName: z.string()
    .min(3, "Ime i prezime klijenta je obavezno - minimum 3 karaktera")
    .max(100, "Ime i prezime je predugačko - maksimum 100 karaktera")
    .regex(/^[a-zA-ZčćžšđČĆŽŠĐ\s-]+$/, "Ime i prezime može sadržavati samo slova, razmake i crtice"),
  phone: z.string()
    .min(6, "Telefon klijenta je obavezan - minimum 6 cifara")
    .regex(/^[0-9+\s()-]{6,20}$/, "Unesite ispravan format telefona"),
  email: z.string()
    .email("Unesite važeću email adresu")
    .optional()
    .or(z.literal("")),
  address: z.string()
    .min(5, "Adresa klijenta je obavezna - minimum 5 karaktera")
    .max(100, "Adresa je predugačka - maksimum 100 karaktera")
    .refine(val => val.trim().length > 0, "Adresa ne može biti prazna"),
  city: z.string()
    .min(2, "Grad klijenta je obavezan - minimum 2 karaktera")
    .max(50, "Ime grada je predugačko - maksimum 50 karaktera")
    .regex(/^[a-zA-ZčćžšđČĆŽŠĐ\s-]+$/, "Grad može sadržavati samo slova, razmake i crtice"),
  notes: z.string().max(500, "Napomene su predugačke - maksimum 500 karaktera").optional().or(z.literal(""))
});

type NewClientFormValues = z.infer<typeof newClientSchema>;

export default function NewBusinessClient() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdClient, setCreatedClient] = useState<any>(null);
  
  // Inicijalizacija forme
  const form = useForm<NewClientFormValues>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      notes: ""
    },
  });
  
  // Mutacija za kreiranje klijenta
  const createClientMutation = useMutation({
    mutationFn: async (values: NewClientFormValues) => {
      const response = await apiRequest("POST", "/api/business/clients", values);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData && (errorData.message || errorData.error)) {
          throw new Error(errorData.message || errorData.error);
        } else {
          throw new Error("Greška prilikom kreiranja klijenta. Proverite podatke i pokušajte ponovo.");
        }
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setCreatedClient(data);
      setSubmitSuccess(true);
      toast({
        title: "Klijent uspešno kreiran",
        description: "Novi klijent je uspešno dodat u sistem.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri kreiranju klijenta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: NewClientFormValues) => {
    createClientMutation.mutate(values);
  };
  
  if (submitSuccess) {
    return (
      <BusinessLayout>
        <div className="max-w-md mx-auto text-center py-12">
          <div className="bg-green-100 rounded-full p-3 inline-flex mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Klijent uspešno kreiran</h2>
          <p className="text-gray-600 mb-8">
            Klijent {createdClient?.fullName} je uspešno dodat u bazu podataka.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate(`/business/services/new?clientId=${createdClient?.id}`)}>
              Kreiraj servis za ovog klijenta
            </Button>
            <Button variant="outline" onClick={() => {
              form.reset();
              setSubmitSuccess(false);
              setCreatedClient(null);
            }}>
              Dodaj novog klijenta
            </Button>
          </div>
        </div>
      </BusinessLayout>
    );
  }
  
  return (
    <BusinessLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-20">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/business")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Novi klijent</h2>
            <p className="text-muted-foreground">
              Dodajte novog klijenta u sistem
            </p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Podaci o klijentu</CardTitle>
            <CardDescription>
              Unesite osnovne podatke o klijentu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ime i prezime klijenta</FormLabel>
                      <FormControl>
                        <Input placeholder="npr. Marko Petrović" {...field} />
                      </FormControl>
                      <FormDescription>
                        Obavezno polje - unesite puno ime i prezime (min. 3 karaktera)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input placeholder="npr. 067123456 ili +382 67 123 456" {...field} />
                        </FormControl>
                        <FormDescription>
                          Obavezno polje - unesite važeći broj telefona
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (opciono)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="npr. klijent@example.com" 
                            type="email" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Opcionalno polje - unesite validnu email adresu
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresa</FormLabel>
                        <FormControl>
                          <Input placeholder="npr. Ulica Slobode 25" {...field} />
                        </FormControl>
                        <FormDescription>
                          Obavezno polje - unesite punu adresu klijenta
                        </FormDescription>
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
                          <Input placeholder="npr. Podgorica" {...field} />
                        </FormControl>
                        <FormDescription>
                          Obavezno polje - unesite grad klijenta
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Napomene (opciono)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Unesite dodatne napomene o klijentu..." 
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Opcionalno polje - unesite dodatne informacije o klijentu
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button type="submit" className="w-full md:w-auto" disabled={createClientMutation.isPending}>
                    {createClientMutation.isPending ? "Kreiranje..." : "Kreiraj klijenta"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </BusinessLayout>
  );
}