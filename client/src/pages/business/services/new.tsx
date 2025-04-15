import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BusinessLayout from "@/components/layout/business-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Tip za kategoriju uređaja
interface ApplianceCategory {
  id: number;
  name: string;
  icon: string;
}

// Tip za proizvođača
interface Manufacturer {
  id: number;
  name: string;
}

// Validaciona šema za novi zahtev za servis
const newServiceSchema = z.object({
  // Podaci o klijentu
  clientFullName: z.string().min(3, "Ime i prezime klijenta je obavezno (min. 3 karaktera)")
    .regex(/^[a-zA-ZčćžšđČĆŽŠĐ\s-]+$/, "Unesite ispravno ime i prezime (samo slova, razmaci i crtice)"),
  clientPhone: z.string()
    .min(6, "Telefon klijenta je obavezan (min. 6 cifara)")
    .regex(/^[0-9+\s()-]{6,20}$/, "Unesite ispravan format telefona, npr. '067123456' ili '+382 67 123 456'"),
  clientEmail: z.string()
    .email("Unesite važeću email adresu, npr. 'klijent@example.com'")
    .optional()
    .or(z.literal("")),
  clientAddress: z.string()
    .min(5, "Adresa klijenta je obavezna (min. 5 karaktera)")
    .max(100, "Adresa je predugačka (maks. 100 karaktera)")
    .refine(val => val.trim().length > 0, "Adresa ne može sadržati samo prazan prostor"),
  clientCity: z.string()
    .min(2, "Grad klijenta je obavezan (min. 2 karaktera)")
    .max(50, "Ime grada je predugačko")
    .regex(/^[a-zA-ZčćžšđČĆŽŠĐ\s-]+$/, "Unesite ispravno ime grada (samo slova, razmaci i crtice)"),
  
  // Podaci o uređaju
  categoryId: z.string().min(1, "Izaberite kategoriju uređaja"),
  manufacturerId: z.string().min(1, "Izaberite proizvođača"),
  model: z.string()
    .min(2, "Model uređaja je obavezan (min. 2 karaktera)")
    .max(100, "Naziv modela je predugačak")
    .refine(val => val.trim().length > 0, "Model ne može sadržati samo prazan prostor"),
  serialNumber: z.string()
    .regex(/^[a-zA-Z0-9-]*$/, "Serijski broj može sadržati samo slova, brojeve i crtice")
    .optional()
    .or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  
  // Podaci o servisu
  description: z.string()
    .min(10, "Opis problema je obavezan (min. 10 karaktera)")
    .max(1000, "Opis problema je predugačak (maks. 1000 karaktera)")
    .refine(val => val.trim().length > 0, "Opis problema ne može sadržati samo prazan prostor"),
  saveClientData: z.boolean().default(true),
});

type NewServiceFormValues = z.infer<typeof newServiceSchema>;

export default function NewBusinessServiceRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Dohvatanje kategorija uređaja
  const { data: categories, isLoading: isLoadingCategories } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"],
  });
  
  // Dohvatanje proizvođača
  const { data: manufacturers, isLoading: isLoadingManufacturers } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"],
  });
  
  // Inicijalizacija forme
  const form = useForm<NewServiceFormValues>({
    resolver: zodResolver(newServiceSchema),
    defaultValues: {
      clientFullName: "",
      clientPhone: "",
      clientEmail: "",
      clientAddress: "",
      clientCity: "",
      categoryId: "",
      manufacturerId: "",
      model: "",
      serialNumber: "",
      purchaseDate: "",
      description: "",
      saveClientData: true,
    },
  });
  
  // Mutacija za kreiranje servisa
  const createServiceMutation = useMutation({
    mutationFn: async (data: NewServiceFormValues) => {
      setIsSubmitting(true);
      
      try {
        // Prvo, kreiramo klijenta
        const clientResponse = await apiRequest("POST", "/api/clients", {
          fullName: data.clientFullName,
          email: data.clientEmail || "", // Koristimo prazan string umesto null
          phone: data.clientPhone,
          address: data.clientAddress,
          city: data.clientCity,
        });
        
        if (!clientResponse.ok) {
          // Pokušajmo dobiti detaljniju poruku o grešci
          const errorData = await clientResponse.json().catch(() => null);
          if (errorData && (errorData.message || errorData.error)) {
            throw new Error(errorData.message || errorData.error);
          } else {
            throw new Error("Greška prilikom kreiranja klijenta. Proverite podatke i pokušajte ponovo.");
          }
        }
        
        const client = await clientResponse.json();
        
        // Zatim, kreiramo uređaj za klijenta
        const applianceResponse = await apiRequest("POST", "/api/appliances", {
          clientId: client.id,
          categoryId: parseInt(data.categoryId),
          manufacturerId: parseInt(data.manufacturerId),
          model: data.model,
          serialNumber: data.serialNumber || "", // Koristimo prazan string umesto null
          purchaseDate: data.purchaseDate || "", // Koristimo prazan string umesto null
        });
        
        if (!applianceResponse.ok) {
          // Pokušajmo dobiti detaljniju poruku o grešci
          const errorData = await applianceResponse.json().catch(() => null);
          if (errorData && (errorData.message || errorData.error)) {
            throw new Error(errorData.message || errorData.error);
          } else {
            throw new Error("Greška prilikom kreiranja uređaja. Proverite podatke i pokušajte ponovo.");
          }
        }
        
        const appliance = await applianceResponse.json();
        
        // Konačno, kreiramo servis
        const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
        
        const serviceResponse = await apiRequest("POST", "/api/services", {
          clientId: client.id,
          applianceId: appliance.id,
          description: data.description,
          status: "pending", // Poslovni partneri mogu kreirati samo servise sa statusom "pending"
          createdAt: today,
          // Dodajemo podatke o poslovnom partneru
          businessPartnerId: user?.id ? Number(user.id) : undefined,
          partnerCompanyName: user?.companyName || "",
        });
        
        if (!serviceResponse.ok) {
          // Pokušajmo dobiti detaljniju poruku o grešci
          const errorData = await serviceResponse.json().catch(() => null);
          if (errorData && (errorData.message || errorData.error)) {
            throw new Error(errorData.message || errorData.error);
          } else {
            throw new Error("Greška prilikom kreiranja servisa. Proverite podatke i pokušajte ponovo.");
          }
        }
        
        return await serviceResponse.json();
      } catch (error) {
        console.error("Greška pri kreiranju servisa:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      toast({
        title: "Zahtev uspešno kreiran",
        description: "Vaš zahtev za servis je uspešno kreiran i biće uskoro obrađen.",
      });
    },
    onError: (error: Error) => {
      console.error("Detalji greške:", error);
      
      // Pokušaj da izvučeš više informacija iz greške ako postoje
      let errorMessage = error.message || "Došlo je do greške prilikom kreiranja zahteva za servis.";
      
      // Pokušaj da parsiraš poruku greške ako je JSON string
      try {
        if (error.message && error.message.includes('{')) {
          const jsonStartIndex = error.message.indexOf('{');
          const jsonString = error.message.substring(jsonStartIndex);
          const errorData = JSON.parse(jsonString);
          
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' 
              ? errorData.error 
              : "Nevažeći podaci. Proverite sve unete informacije.";
          }
        }
      } catch (parseError) {
        console.error("Greška pri parsiranju poruke greške:", parseError);
      }
      
      toast({
        title: "Greška pri kreiranju zahteva",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: NewServiceFormValues) => {
    createServiceMutation.mutate(values);
  };
  
  if (submitSuccess) {
    return (
      <BusinessLayout>
        <div className="max-w-md mx-auto text-center py-12">
          <div className="bg-green-100 rounded-full p-3 inline-flex mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Zahtev uspešno kreiran</h2>
          <p className="text-gray-600 mb-8">
            Vaš zahtev za servis je uspešno kreiran i prosleđen našem timu. Možete pratiti status zahteva u sekciji servisni zahtevi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate("/business/services")}>
              Pregledaj zahteve
            </Button>
            <Button variant="outline" onClick={() => {
              form.reset();
              setSubmitSuccess(false);
            }}>
              Kreiraj novi zahtev
            </Button>
          </div>
        </div>
      </BusinessLayout>
    );
  }
  
  return (
    <BusinessLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-20"> {/* Dodat padding na dnu za mobilne uređaje */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/business/services")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Novi servisni zahtev</h2>
            <p className="text-muted-foreground">
              Kreirajte zahtev za servis u ime klijenta
            </p>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Podaci o klijentu */}
            <Card>
              <CardHeader>
                <CardTitle>Podaci o klijentu</CardTitle>
                <CardDescription>
                  Unesite informacije o klijentu za koga se kreira servisni zahtev
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientFullName"
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon klijenta</FormLabel>
                        <FormControl>
                          <Input placeholder="npr. 067123456 ili +382 67 123 456" {...field} />
                        </FormControl>
                        <FormDescription>
                          Obavezno polje - unesite važeći broj telefona (najmanje 6 cifara)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email klijenta (opciono)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="npr. klijent@example.com" 
                            type="email" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Opcionalno polje - unesite validnu email adresu za kontakt
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresa klijenta</FormLabel>
                        <FormControl>
                          <Input placeholder="npr. Ulica Slobode 25" {...field} />
                        </FormControl>
                        <FormDescription>
                          Obavezno polje - unesite punu adresu (min. 5 karaktera)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="clientCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grad klijenta</FormLabel>
                        <FormControl>
                          <Input placeholder="npr. Podgorica" {...field} />
                        </FormControl>
                        <FormDescription>
                          Obavezno polje - unesite grad klijenta (min. 2 karaktera)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="saveClientData"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Sačuvaj podatke o klijentu</FormLabel>
                        <FormDescription>
                          Čekirajte ovo polje ako želite da sačuvate podatke o klijentu za buduće zahteve
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            {/* Podaci o uređaju */}
            <Card>
              <CardHeader>
                <CardTitle>Podaci o uređaju</CardTitle>
                <CardDescription>
                  Unesite informacije o uređaju koji treba servisirati
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategorija uređaja</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Izaberite kategoriju uređaja" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingCategories ? (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span>Učitavanje kategorija...</span>
                              </div>
                            ) : (
                              categories?.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id.toString()}
                                >
                                  {category.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="manufacturerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proizvođač</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Izaberite proizvođača" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingManufacturers ? (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span>Učitavanje proizvođača...</span>
                              </div>
                            ) : (
                              manufacturers?.map((manufacturer) => (
                                <SelectItem
                                  key={manufacturer.id}
                                  value={manufacturer.id.toString()}
                                >
                                  {manufacturer.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model uređaja</FormLabel>
                        <FormControl>
                          <Input placeholder="npr. WV60-1860" {...field} />
                        </FormControl>
                        <FormDescription>
                          Obavezno polje - unesite tačan model uređaja (min. 2 karaktera)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serijski broj (opciono)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="npr. SN-12345678" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Opcionalno polje - unesite serijski broj ako je dostupan
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum kupovine (opciono)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Opcionalno polje - unesite približan datum kupovine ako je poznat
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            {/* Opis problema */}
            <Card>
              <CardHeader>
                <CardTitle>Opis problema</CardTitle>
                <CardDescription>
                  Opišite problem sa uređajem koji treba servisirati
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detaljan opis problema</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="npr. Frižider ne hladi dovoljno, čuje se glasno zujanje iz zadnjeg dela uređaja. Problem je počeo pre dva dana." 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        <p>Obavezno polje - opišite problem što detaljnije (min. 10 karaktera)</p>
                        <p className="mt-2 text-muted-foreground">Uključite informacije kao što su:</p>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground">
                          <li>Kako se problem manifestuje</li>
                          <li>Kada je problem primećen</li>
                          <li>Da li postoje specifični zvukovi ili simptomi</li>
                          <li>Prethodne opravke (ako ih je bilo)</li>
                        </ul>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-sm text-gray-500">
                  * Sva polja označena kao obavezna moraju biti popunjena
                </div>
                <Button 
                  type="submit" 
                  className="w-full md:w-auto"
                  disabled={isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kreiranje zahteva...
                    </span>
                  ) : "Kreiraj servisni zahtev"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </BusinessLayout>
  );
}