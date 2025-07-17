import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CustomerLayout from "@/components/layout/customer-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApplianceCategory, Manufacturer } from "@shared/schema";

// Definisanje šeme za validaciju forme
const serviceRequestSchema = z.object({
  categoryId: z.string().min(1, { message: "Molimo izaberite tip uređaja" }),
  manufacturerId: z.string().min(1, { message: "Molimo izaberite proizvođača" }),
  model: z.string().min(1, { message: "Molimo unesite model uređaja" }),
  serialNumber: z.string().min(1, { message: "Molimo unesite serijski broj uređaja" }),
  purchaseDate: z.string().min(1, { message: "Molimo unesite datum kupovine" }),
  purchasePlace: z.string().min(1, { message: "Molimo unesite mesto kupovine" }),
  description: z.string().min(10, { message: "Opis kvara mora imati minimum 10 karaktera" }),
});

type ServiceRequestFormValues = z.infer<typeof serviceRequestSchema>;

export default function CustomerServiceRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
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
  
  // Filtriranje samo Beko i Candy proizvođača
  const filteredManufacturers = manufacturers?.filter(m => 
    m.name.toLowerCase() === "beko" || m.name.toLowerCase() === "candy"
  ) || [];
  
  // Inicijalizacija forme
  const form = useForm<ServiceRequestFormValues>({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      categoryId: "",
      manufacturerId: "",
      model: "",
      serialNumber: "",
      purchaseDate: "",
      purchasePlace: "",
      description: "",
    },
  });
  
  // Mutacija za slanje zahteva za servis
  const serviceRequestMutation = useMutation({
    mutationFn: async (data: ServiceRequestFormValues) => {
      setIsSubmitting(true);
      
      // Koristimo direktno /api/customer/services endpoint koji ima integrisanu logiku
      const serviceData = {
        categoryId: parseInt(data.categoryId),
        manufacturerId: parseInt(data.manufacturerId),
        model: data.model,
        serialNumber: data.serialNumber,
        purchaseDate: data.purchaseDate,
        purchasePlace: data.purchasePlace,
        description: data.description,
      };
      
      const serviceResponse = await apiRequest("POST", "/api/customer/services", serviceData);
      return await serviceResponse.json();
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      setIsSubmitting(false);
      toast({
        title: "Uspešno prijavljen kvar",
        description: "Vaš zahtev za servis je uspešno poslat. Dobićete email potvrdu.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      form.reset();
    },
    onError: (error: Error) => {
      setIsSubmitting(false);
      toast({
        title: "Greška pri prijavi kvara",
        description: error.message || "Došlo je do greške pri slanju zahteva za servis.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: ServiceRequestFormValues) => {
    serviceRequestMutation.mutate(values);
  };
  
  if (isLoadingCategories || isLoadingManufacturers) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-gray-500">Učitavanje podataka...</p>
        </div>
      </CustomerLayout>
    );
  }
  
  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Prijava kvara</CardTitle>
            <CardDescription>
              Popunite formular za prijavu kvara na vašem uređaju
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitSuccess ? (
              <Alert className="bg-green-50 border-green-200 mb-6">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <AlertTitle>Uspešno prijavljen kvar!</AlertTitle>
                <AlertDescription>
                  Vaš zahtev za servis je uspešno poslat. Naši operateri će vas kontaktirati u najkraćem mogućem roku. Takođe, dobićete email potvrdu.
                </AlertDescription>
                <div className="mt-4">
                  <Button onClick={() => setSubmitSuccess(false)}>
                    Prijavi novi kvar
                  </Button>
                </div>
              </Alert>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                    <AlertTitle>Napomena</AlertTitle>
                    <AlertDescription>
                      Sva polja su obavezna. Molimo popunite tačne podatke o uređaju za koji prijavljujete kvar.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tip uređaja</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Izaberite tip uređaja" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
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
                      name="manufacturerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proizvođač</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Izaberite proizvođača" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredManufacturers?.map((manufacturer) => (
                                <SelectItem key={manufacturer.id} value={manufacturer.id.toString()}>
                                  {manufacturer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model uređaja</FormLabel>
                          <FormControl>
                            <Input placeholder="Npr. WRN 54001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="serialNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serijski broj</FormLabel>
                          <FormControl>
                            <Input placeholder="Serijski broj uređaja" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="purchaseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Datum kupovine</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="purchasePlace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mesto kupovine</FormLabel>
                          <FormControl>
                            <Input placeholder="Grad gde je uređaj kupljen" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opis kvara</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detaljno opišite problem sa uređajem" 
                            rows={5} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full md:w-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Slanje zahteva...
                      </>
                    ) : (
                      "Prijavi kvar"
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}