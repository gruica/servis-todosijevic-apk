import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import BusinessLayout from "@/components/layout/business-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ServiceData {
  id: number;
  clientId: number;
  applianceId: number;
  description: string;
  status: string;
  scheduledDate: string | null;
  technicianNotes: string | null;
  cost: string | null;
  client?: {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
  };
  appliance?: {
    id: number;
    model: string;
    serialNumber: string;
    categoryId: number;
    manufacturerId: number;
  };
  category?: {
    name: string;
  };
  manufacturer?: {
    name: string;
  };
}

interface ApplianceCategory {
  id: number;
  name: string;
  icon: string;
}

interface Manufacturer {
  id: number;
  name: string;
}

// Schema za validaciju
const editServiceSchema = z.object({
  description: z.string().min(1, "Opis problema je obavezan"),
  scheduledDate: z.string().optional(),
  clientFullName: z.string().min(1, "Ime klijenta je obavezno"),
  clientEmail: z.string().email("Neispravna email adresa"),
  clientPhone: z.string().min(1, "Telefon je obavezan"),
  clientAddress: z.string().min(1, "Adresa je obavezna"),
  clientCity: z.string().min(1, "Grad je obavezan"),
  applianceModel: z.string().min(1, "Model aparata je obavezan"),
  applianceSerialNumber: z.string().optional(),
  categoryId: z.number().min(1, "Kategorija aparata je obavezna"),
  manufacturerId: z.number().min(1, "Proizvođač je obavezan"),
});

type EditServiceFormData = z.infer<typeof editServiceSchema>;

export default function EditBusinessService() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Učitavanje podataka o servisu
  const { data: service, isLoading: serviceLoading, error: serviceError } = useQuery<ServiceData>({
    queryKey: [`/api/business/services/${id}`],
    enabled: !!id,
  });

  // Učitavanje kategorija
  const { data: categories } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"],
  });

  // Učitavanje proizvođača
  const { data: manufacturers } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"],
  });

  const form = useForm<EditServiceFormData>({
    resolver: zodResolver(editServiceSchema),
    defaultValues: {
      description: "",
      scheduledDate: "",
      clientFullName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      clientCity: "",
      applianceModel: "",
      applianceSerialNumber: "",
      categoryId: 0,
      manufacturerId: 0,
    },
  });

  // Popunjavanje forme kada se učitaju podaci
  useEffect(() => {
    if (service) {
      form.reset({
        description: service.description || "",
        scheduledDate: service.scheduledDate ? service.scheduledDate.split('T')[0] : "",
        clientFullName: service.client?.fullName || "",
        clientEmail: service.client?.email || "",
        clientPhone: service.client?.phone || "",
        clientAddress: service.client?.address || "",
        clientCity: service.client?.city || "",
        applianceModel: service.appliance?.model || "",
        applianceSerialNumber: service.appliance?.serialNumber || "",
        categoryId: service.appliance?.categoryId || 0,
        manufacturerId: service.appliance?.manufacturerId || 0,
      });
    }
  }, [service, form]);

  // Mutacija za ažuriranje servisa
  const updateServiceMutation = useMutation({
    mutationFn: async (data: EditServiceFormData) => {
      const response = await fetch(`/api/business/services/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          serviceData: {
            description: data.description,
            scheduledDate: data.scheduledDate || null,
          },
          clientData: {
            fullName: data.clientFullName,
            email: data.clientEmail,
            phone: data.clientPhone,
            address: data.clientAddress,
            city: data.clientCity,
          },
          applianceData: {
            model: data.applianceModel,
            serialNumber: data.applianceSerialNumber || null,
            categoryId: data.categoryId,
            manufacturerId: data.manufacturerId,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno ažurirano",
        description: "Servisni zahtev je uspešno ažuriran.",
      });
      
      // Invalidacija cache-a
      queryClient.invalidateQueries({ queryKey: ["/api/business/services"] });
      queryClient.invalidateQueries({ queryKey: [`/api/business/services/${id}`] });
      
      // Vraćamo se na listu servisa
      navigate("/business/services");
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške prilikom ažuriranja.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditServiceFormData) => {
    updateServiceMutation.mutate(data);
  };

  // Status badge
  function translateStatus(status: string) {
    const statusMap: Record<string, string> = {
      pending: "Na čekanju",
      assigned: "Dodeljen",
      scheduled: "Zakazan",
      in_progress: "U toku",
      waiting_parts: "Čeka delove",
      completed: "Završen",
      cancelled: "Otkazan"
    };
    return statusMap[status] || status;
  }

  if (serviceLoading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Učitavanje servisa...</span>
        </div>
      </BusinessLayout>
    );
  }

  if (serviceError) {
    return (
      <BusinessLayout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-red-50 p-4 rounded-full">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="mt-4 text-lg font-medium">Greška prilikom učitavanja</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-sm">
            Došlo je do greške prilikom učitavanja servisa. Pokušajte ponovo.
          </p>
          <Button
            className="mt-4"
            onClick={() => navigate("/business/services")}
          >
            Nazad na listu
          </Button>
        </div>
      </BusinessLayout>
    );
  }

  if (!service) {
    return (
      <BusinessLayout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-gray-100 p-4 rounded-full">
            <AlertCircle className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium">Servis nije pronađen</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-sm">
            Servis sa datim ID-jem ne postoji ili nemate dozvolu za pristup.
          </p>
          <Button
            className="mt-4"
            onClick={() => navigate("/business/services")}
          >
            Nazad na listu
          </Button>
        </div>
      </BusinessLayout>
    );
  }

  // Proverava da li se servis može editovati
  const canEdit = service.status === 'pending' || service.status === 'scheduled';

  if (!canEdit) {
    return (
      <BusinessLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Izmena servisa #{service.id}</h2>
              <p className="text-muted-foreground">
                Servis se ne može menjati u trenutnom statusu
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate("/business/services")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nazad
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Status servisa: 
                <Badge variant="secondary">
                  {translateStatus(service.status)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Servis se može menjati samo kada je u statusu "Na čekanju" ili "Zakazan". 
                Trenutni status servisa ne dozvoljava izmene.
              </p>
            </CardContent>
          </Card>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Izmena servisa #{service.id}</h2>
            <p className="text-muted-foreground">
              Ažurirajte podatke o zakazanom servisu
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate("/business/services")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nazad
            </Button>
            <Badge variant="secondary">
              {translateStatus(service.status)}
            </Badge>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informacije o servisu */}
            <Card>
              <CardHeader>
                <CardTitle>Informacije o servisu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opis problema *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Opišite problem koji treba rešiti..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum zakazivanja</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Informacije o klijentu */}
            <Card>
              <CardHeader>
                <CardTitle>Informacije o klijentu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientFullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ime i prezime *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ime i prezime klijenta" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon *</FormLabel>
                        <FormControl>
                          <Input placeholder="067 123 456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input placeholder="klijent@email.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grad *</FormLabel>
                        <FormControl>
                          <Input placeholder="Podgorica" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="clientAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresa *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ulica i broj" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Informacije o aparatu */}
            <Card>
              <CardHeader>
                <CardTitle>Informacije o aparatu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategorija aparata *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Izaberite kategoriju" />
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
                        <FormLabel>Proizvođač *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Izaberite proizvođača" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {manufacturers?.map((manufacturer) => (
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

                  <FormField
                    control={form.control}
                    name="applianceModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model *</FormLabel>
                        <FormControl>
                          <Input placeholder="Model aparata" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applianceSerialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serijski broj</FormLabel>
                        <FormControl>
                          <Input placeholder="Serijski broj aparata" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dugmad */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/business/services")}
              >
                Otkaži
              </Button>
              <Button 
                type="submit" 
                disabled={updateServiceMutation.isPending}
              >
                {updateServiceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ažuriranje...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Sačuvaj izmene
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </BusinessLayout>
  );
}