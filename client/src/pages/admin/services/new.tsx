import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, User, Phone, MapPin, Settings, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AdminLayout } from "@/components/layout/admin-layout";

// Schema za kreiranje novog klijenta
const newClientSchema = z.object({
  fullName: z.string().min(2, "Ime mora imati najmanje 2 karaktera"),
  email: z.string().email("Nevažeća email adresa").optional().or(z.literal("")),
  phone: z.string().min(8, "Broj telefona mora imati najmanje 8 cifara"),
  address: z.string().optional(),
  city: z.string().optional(),
});

// Schema za kreiranje novog uređaja
const newApplianceSchema = z.object({
  model: z.string().min(2, "Model mora imati najmanje 2 karaktera"),
  serialNumber: z.string().optional(),
  categoryId: z.number().min(1, "Kategorija je obavezna"),
  manufacturerId: z.number().optional(),
  purchaseDate: z.string().optional(),
});

// Schema za kreiranje servisa
const serviceSchema = z.object({
  clientId: z.number().min(1, "Klijent je obavezan"),
  applianceId: z.number().min(1, "Uređaj je obavezan"),
  technicianId: z.number().optional(),
  description: z.string().min(10, "Opis mora imati najmanje 10 karaktera"),
  scheduledDate: z.string().optional(),
  businessPartnerId: z.number().optional(),
  partnerCompanyName: z.string().optional(),
});

type NewClientFormValues = z.infer<typeof newClientSchema>;
type NewApplianceFormValues = z.infer<typeof newApplianceSchema>;
type ServiceFormValues = z.infer<typeof serviceSchema>;

export function AdminServiceCreate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showNewApplianceDialog, setShowNewApplianceDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      clientId: 0,
      applianceId: 0,
      technicianId: undefined,
      description: "",
      scheduledDate: "",
      businessPartnerId: undefined,
      partnerCompanyName: "",
    },
  });

  const newClientForm = useForm<NewClientFormValues>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
    },
  });

  const newApplianceForm = useForm<NewApplianceFormValues>({
    resolver: zodResolver(newApplianceSchema),
    defaultValues: {
      model: "",
      serialNumber: "",
      categoryId: 0,
      manufacturerId: undefined,
      purchaseDate: "",
    },
  });

  // Fetch data
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients");
      if (!response.ok) throw new Error("Greška pri dobijanju klijenata");
      return response.json();
    },
  });

  const { data: appliances = [] } = useQuery({
    queryKey: ["/api/appliances"],
    queryFn: async () => {
      const response = await fetch("/api/appliances");
      if (!response.ok) throw new Error("Greška pri dobijanju uređaja");
      return response.json();
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Greška pri dobijanju kategorija");
      return response.json();
    },
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ["/api/technicians"],
    queryFn: async () => {
      const response = await fetch("/api/technicians");
      if (!response.ok) throw new Error("Greška pri dobijanju tehničara");
      return response.json();
    },
  });

  const { data: businessPartners = [] } = useQuery({
    queryKey: ["/api/business-partners"],
    queryFn: async () => {
      const response = await fetch("/api/business-partners");
      if (!response.ok) throw new Error("Greška pri dobijanju poslovnih partnera");
      return response.json();
    },
  });

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: async (values: NewClientFormValues) => {
      const response = await apiRequest("POST", "/api/clients", values);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Klijent kreiran",
        description: "Novi klijent je uspešno kreiran",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowNewClientDialog(false);
      newClientForm.reset();
      form.setValue("clientId", data.id);
      setSelectedClientId(data.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri kreiranju klijenta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createApplianceMutation = useMutation({
    mutationFn: async (values: NewApplianceFormValues) => {
      const applianceData = {
        ...values,
        clientId: selectedClientId || form.getValues("clientId"),
      };
      const response = await apiRequest("POST", "/api/appliances", applianceData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Uređaj kreiran",
        description: "Novi uređaj je uspešno kreiran",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appliances"] });
      setShowNewApplianceDialog(false);
      newApplianceForm.reset();
      form.setValue("applianceId", data.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri kreiranju uređaja",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (values: ServiceFormValues) => {
      const response = await apiRequest("POST", "/api/services", values);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Servis kreiran",
        description: "Novi servis je uspešno kreiran",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      navigate("/services");
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri kreiranju servisa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ServiceFormValues) => {
    createServiceMutation.mutate(values);
  };

  const onCreateClient = (values: NewClientFormValues) => {
    createClientMutation.mutate(values);
  };

  const onCreateAppliance = (values: NewApplianceFormValues) => {
    createApplianceMutation.mutate(values);
  };

  const filteredAppliances = selectedClientId 
    ? appliances.filter((appliance: any) => appliance.clientId === selectedClientId)
    : appliances;

  if (!user || user.role !== "admin") {
    return <div>Nemate dozvolu za pristup ovoj stranici</div>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Nazad
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kreiraj novi servis</h1>
              <p className="text-gray-600">Dodajte novi servisni zahtev u sistem</p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informacije o servisu</CardTitle>
            <CardDescription>
              Unesite sve potrebne informacije za kreiranje novog servisa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Client Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Klijent</Label>
                    <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Novi klijent
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Dodaj novog klijenta</DialogTitle>
                        </DialogHeader>
                        <Form {...newClientForm}>
                          <form onSubmit={newClientForm.handleSubmit(onCreateClient)} className="space-y-4">
                            <FormField
                              control={newClientForm.control}
                              name="fullName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ime i prezime</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Unesite ime i prezime" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={newClientForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Broj telefona</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Unesite broj telefona" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={newClientForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email (opciono)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Unesite email adresu" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={newClientForm.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Adresa (opciono)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Unesite adresu" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={newClientForm.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Grad (opciono)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Unesite grad" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setShowNewClientDialog(false)}>
                                Otkaži
                              </Button>
                              <Button type="submit" disabled={createClientMutation.isPending}>
                                {createClientMutation.isPending ? "Kreira se..." : "Kreiraj klijenta"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              setSelectedClientId(parseInt(value));
                            }}
                            value={field.value?.toString() || ""}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Izaberite klijenta" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map((client: any) => (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>{client.fullName}</span>
                                    {client.phone && (
                                      <span className="text-muted-foreground text-sm">
                                        • {client.phone}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Appliance Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Uređaj</Label>
                    <Dialog open={showNewApplianceDialog} onOpenChange={setShowNewApplianceDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={!selectedClientId}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Novi uređaj
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Dodaj novi uređaj</DialogTitle>
                        </DialogHeader>
                        <Form {...newApplianceForm}>
                          <form onSubmit={newApplianceForm.handleSubmit(onCreateAppliance)} className="space-y-4">
                            <FormField
                              control={newApplianceForm.control}
                              name="model"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Model</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Unesite model uređaja" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={newApplianceForm.control}
                              name="categoryId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Kategorija</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Izaberite kategoriju" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {categories.map((category: any) => (
                                          <SelectItem key={category.id} value={category.id.toString()}>
                                            {category.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={newApplianceForm.control}
                              name="serialNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Serijski broj (opciono)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Unesite serijski broj" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={newApplianceForm.control}
                              name="purchaseDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Datum kupovine (opciono)</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setShowNewApplianceDialog(false)}>
                                Otkaži
                              </Button>
                              <Button type="submit" disabled={createApplianceMutation.isPending}>
                                {createApplianceMutation.isPending ? "Kreira se..." : "Kreiraj uređaj"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <FormField
                    control={form.control}
                    name="applianceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Izaberite uređaj" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredAppliances.map((appliance: any) => (
                                <SelectItem key={appliance.id} value={appliance.id.toString()}>
                                  <div className="flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    <span>{appliance.model}</span>
                                    {appliance.serialNumber && (
                                      <span className="text-muted-foreground text-sm">
                                        • {appliance.serialNumber}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Service Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opis kvara</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detaljno opišite problem sa uređajem..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Technician Assignment */}
                <FormField
                  control={form.control}
                  name="technicianId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dodeljeni tehnič (opciono)</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite tehničara" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Bez dodeljenog tehničara</SelectItem>
                            {technicians.map((technician: any) => (
                              <SelectItem key={technician.id} value={technician.id.toString()}>
                                {technician.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Business Partner */}
                <FormField
                  control={form.control}
                  name="businessPartnerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poslovni partner (opciono)</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite poslovnog partnera" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Bez poslovnog partnera</SelectItem>
                            {businessPartners.map((partner: any) => (
                              <SelectItem key={partner.id} value={partner.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  <span>{partner.companyName}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Scheduled Date */}
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zakazan datum (opciono)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => navigate("/")}>
                    Otkaži
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createServiceMutation.isPending}
                  >
                    {createServiceMutation.isPending ? "Kreira se..." : "Kreiraj servis"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

export default AdminServiceCreate;