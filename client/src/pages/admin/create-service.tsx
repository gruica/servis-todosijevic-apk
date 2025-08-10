import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, User, Settings, Calendar, FileText, Search, Phone, MapPin, Mail, UserPlus } from "lucide-react";
import { insertClientSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Form schema
const createServiceSchema = z.object({
  clientId: z.string().min(1, "Klijent je obavezan"),
  applianceId: z.string().min(1, "Uređaj je obavezan"),
  description: z.string().min(1, "Opis problema je obavezan"),
  status: z.string().default("pending"),
  technicianId: z.string().optional(),
  scheduledDate: z.string().optional(),
  priority: z.string().default("medium"),
  notes: z.string().optional(),
});

type CreateServiceFormData = z.infer<typeof createServiceSchema>;

// Schema za kreiranje novog klijenta
const createClientSchema = insertClientSchema.pick({
  fullName: true,
  email: true,
  phone: true,
  address: true,
  city: true,
});

type CreateClientFormData = z.infer<typeof createClientSchema>;

interface Client {
  id: number;
  fullName: string;
  email: string | null;
  phone: string;
  address: string | null;
  city: string | null;
}

interface Appliance {
  id: number;
  clientId: number;
  model: string | null;
  serialNumber: string | null;
  category: {
    id: number;
    name: string;
    icon: string;
  };
  manufacturer: {
    id: number;
    name: string;
  };
}

interface Technician {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  active: boolean;
}

export default function CreateService() {
  const [, setLocation] = useLocation();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateServiceFormData>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      clientId: "",
      applianceId: "",
      description: "",
      status: "pending",
      priority: "medium",
      technicianId: "",
      scheduledDate: "",
      notes: "",
    },
  });

  // Forma za kreiranje novog klijenta
  const newClientForm = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
    },
  });

  const watchedClientId = watch("clientId") || "";

  // Debug logging
  console.log("CreateService Debug:", {
    watchedClientId,
    clientIdType: typeof watchedClientId,
    watchedClientIdEmpty: !watchedClientId,
  });

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Mutacija za kreiranje novog klijenta
  const createClientMutation = useMutation({
    mutationFn: async (clientData: CreateClientFormData) => {
      console.log("Kreiranje novog klijenta:", clientData);
      const response = await apiRequest("/api/clients", {
        method: "POST",
        body: JSON.stringify(clientData),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Greška pri kreiranju klijenta");
      }

      const result = await response.json();
      return result.data; // API vraća { success: true, data: client }
    },
    onSuccess: (newClient) => {
      console.log("Klijent kreiran uspešno:", newClient);
      toast({
        title: "Klijent kreiran",
        description: `Klijent ${newClient.fullName} je uspešno kreiran.`,
      });
      
      // Invalidate clients query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      
      // Select the newly created client
      setValue("clientId", newClient.id.toString());
      setValue("applianceId", ""); // Reset appliance selection
      setSelectedClientId(newClient.id.toString());
      
      // Close dialog and reset form
      setIsNewClientDialogOpen(false);
      newClientForm.reset();
    },
    onError: (error: any) => {
      console.error("Greška pri kreiranju klijenta:", error);
      toast({
        title: "Greška",
        description: error.message || "Greška pri kreiranju klijenta.",
        variant: "destructive",
      });
    },
  });

  // Direct appliances fetch with useEffect
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [appliancesLoading, setAppliancesLoading] = useState(false);
  
  useEffect(() => {
    const fetchAppliances = async () => {
      if (!watchedClientId) {
        setAppliances([]);
        return;
      }
      
      console.log("🔍 Fetching appliances for client:", watchedClientId);
      setAppliancesLoading(true);
      
      try {
        const response = await apiRequest(`/api/clients/${watchedClientId}/appliances`);
        console.log("🔍 Appliances API response:", response);
        
        if (Array.isArray(response)) {
          console.log("🔍 Found appliances:", response.length, response);
          setAppliances(response as Appliance[]);
        } else {
          console.log("🔍 Response is not array:", response);
          setAppliances([]);
        }
      } catch (error) {
        console.error("🔍 Error fetching appliances:", error);
        setAppliances([]);
      } finally {
        setAppliancesLoading(false);
      }
    };

    fetchAppliances();
  }, [watchedClientId]);

  // Debug logging
  console.log("🔍 Current state - Client:", watchedClientId, "Appliances:", appliances.length);

  // Fetch technicians
  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: CreateServiceFormData) => {
      console.log("🔍 Mutation starting with data:", data);
      
      // Validate required fields
      if (!data.clientId || !data.applianceId) {
        throw new Error("Klijent i uređaj su obavezni");
      }

      const serviceData = {
        clientId: parseInt(data.clientId),
        applianceId: parseInt(data.applianceId),
        description: data.description,
        status: data.status,
        technicianId: data.technicianId && data.technicianId !== "" && data.technicianId !== "none" ? parseInt(data.technicianId) : null,
        scheduledDate: data.scheduledDate || null,
        priority: data.priority,
        notes: data.notes || null,
      };

      console.log("🔍 Sending service data to API:", serviceData);

      try {
        const result = await apiRequest("/api/services", {
          method: "POST",
          body: JSON.stringify(serviceData),
        });
        console.log("🔍 API Success response:", result);
        return result;
      } catch (error) {
        console.error("🔍 API Request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("🔍 Mutation success:", data);
      toast({
        title: "Servis kreiran",
        description: "Novi servis je uspešno kreiran.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      setLocation("/admin/services");
    },
    onError: (error: any) => {
      console.error("🔍 Mutation error:", error);
      toast({
        title: "Greška",
        description: error.message || "Greška pri kreiranju servisa.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateServiceFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Mutation state:", { 
      isPending: createServiceMutation.isPending, 
      isError: createServiceMutation.isError,
      error: createServiceMutation.error
    });
    
    // Dodatna validacija
    if (!data.clientId || !data.applianceId) {
      toast({
        title: "Greška",
        description: "Klijent i uređaj moraju biti odabrani",
        variant: "destructive",
      });
      return;
    }
    
    createServiceMutation.mutate(data);
  };

  const onNewClientSubmit = (data: CreateClientFormData) => {
    createClientMutation.mutate(data);
  };

  const selectedClient = clients.find(c => c.id.toString() === watchedClientId);
  
  // Filtriraj klijente na osnovu pretrage
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    
    const query = clientSearchQuery.toLowerCase().trim();
    return clients.filter(client => 
      client.fullName.toLowerCase().includes(query) ||
      client.phone.toLowerCase().includes(query) ||
      (client.email && client.email.toLowerCase().includes(query)) ||
      (client.address && client.address.toLowerCase().includes(query)) ||
      (client.city && client.city.toLowerCase().includes(query))
    );
  }, [clients, clientSearchQuery]);

  return (
    <AdminLayout>
      <div className="w-full h-full overflow-y-auto">
        <div className="container mx-auto py-6 px-4 max-w-4xl">
          {/* Header */}
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/admin/services")}
              className="mr-3"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Kreiranje novog servisa</h1>
              <p className="text-muted-foreground mt-1">
                Dodajte novi servis u sistem
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-20">
          <div className="grid grid-cols-1 gap-6">
            {/* Client Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Klijent i uređaj
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="clientId">Klijent *</Label>
                    <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Novi klijent
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Kreiranje novog klijenta</DialogTitle>
                        </DialogHeader>
                        <Form {...newClientForm}>
                          <form onSubmit={newClientForm.handleSubmit(onNewClientSubmit)} className="space-y-4">
                            <FormField
                              control={newClientForm.control}
                              name="fullName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ime i prezime *</FormLabel>
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
                                  <FormLabel>Telefon *</FormLabel>
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
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="Unesite email adresu" {...field} />
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
                                  <FormLabel>Adresa</FormLabel>
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
                                  <FormLabel>Grad</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Unesite grad" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex justify-end gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsNewClientDialogOpen(false);
                                  newClientForm.reset();
                                }}
                              >
                                Otkaži
                              </Button>
                              <Button
                                type="submit"
                                disabled={createClientMutation.isPending}
                              >
                                {createClientMutation.isPending ? "Kreiranje..." : "Kreiraj klijenta"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Popover open={isClientSelectorOpen} onOpenChange={setIsClientSelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isClientSelectorOpen}
                        className="w-full justify-between h-10"
                      >
                        {selectedClient ? (
                          <div className="flex items-center gap-2 truncate">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{selectedClient.fullName}</span>
                            <span className="text-muted-foreground">({selectedClient.phone})</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Search className="h-4 w-4" />
                            <span>Pretražite i izaberite klijenta...</span>
                          </div>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Pretražite po imenu, telefonu, adresi..." 
                          value={clientSearchQuery}
                          onValueChange={setClientSearchQuery}
                        />
                        <CommandEmpty>Nema pronađenih klijenata.</CommandEmpty>
                        <CommandGroup>
                          <ScrollArea className="h-[200px]">
                            {filteredClients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.fullName} ${client.phone} ${client.email || ''} ${client.address || ''} ${client.city || ''}`}
                                onSelect={() => {
                                  const clientIdString = client.id.toString();
                                  
                                  setValue("clientId", clientIdString);
                                  setValue("applianceId", ""); // Reset appliance when client changes
                                  setSelectedClientId(clientIdString);
                                  setIsClientSelectorOpen(false);
                                  setClientSearchQuery(""); // Reset search
                                }}
                                className="flex flex-col items-start gap-1 p-3"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium truncate">{client.fullName}</span>
                                      <div className="flex items-center gap-1 text-muted-foreground">
                                        <Phone className="h-3 w-3" />
                                        <span className="text-sm">{client.phone}</span>
                                      </div>
                                    </div>
                                    {client.email && (
                                      <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                        <Mail className="h-3 w-3" />
                                        <span className="text-xs truncate">{client.email}</span>
                                      </div>
                                    )}
                                    {client.address && (
                                      <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                        <MapPin className="h-3 w-3" />
                                        <span className="text-xs truncate">{client.address}, {client.city}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </ScrollArea>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.clientId && (
                    <p className="text-sm text-red-500 mt-1">{errors.clientId.message}</p>
                  )}
                </div>

                {selectedClient && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">{selectedClient.fullName}</p>
                    <p className="text-sm text-muted-foreground">{selectedClient.phone}</p>
                    {selectedClient.address && (
                      <p className="text-sm text-muted-foreground">
                        {selectedClient.address}, {selectedClient.city}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="applianceId">Uređaj *</Label>
                  <Select
                    value={watch("applianceId") || ""}
                    onValueChange={(value) => setValue("applianceId", value)}
                    disabled={!watchedClientId || appliancesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={
                          !watchedClientId 
                            ? "Prvo odaberite klijenta..." 
                            : appliancesLoading 
                            ? "Učitavanje aparata..." 
                            : "Izaberite uređaj..."
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {appliancesLoading ? (
                        <SelectItem value="loading" disabled>
                          Učitavanje aparata...
                        </SelectItem>
                      ) : Array.isArray(appliances) && appliances.length > 0 ? (
                        appliances.map((appliance) => (
                          <SelectItem key={appliance.id} value={appliance.id.toString()}>
                            {appliance.category?.name || "Nepoznata kategorija"} - {appliance.manufacturer?.name || "Nepoznat proizvođač"}
                            {appliance.model && ` (${appliance.model})`}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-appliances" disabled>
                          {watchedClientId ? "Nema registrovanih aparata" : "Odaberite klijenta"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.applianceId && (
                    <p className="text-sm text-red-500 mt-1">{errors.applianceId.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Detalji servisa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={watch("status") || "pending"}
                    onValueChange={(value) => setValue("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Na čekanju</SelectItem>
                      <SelectItem value="assigned">Dodeljeno</SelectItem>
                      <SelectItem value="scheduled">Zakazano</SelectItem>
                      <SelectItem value="in_progress">U toku</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Prioritet</Label>
                  <Select
                    value={watch("priority") || "medium"}
                    onValueChange={(value) => setValue("priority", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Nizak</SelectItem>
                      <SelectItem value="medium">Srednji</SelectItem>
                      <SelectItem value="high">Visok</SelectItem>
                      <SelectItem value="urgent">Hitno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="technicianId">Serviser</Label>
                  <Select
                    value={watch("technicianId") || ""}
                    onValueChange={(value) => setValue("technicianId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite servisera..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Bez servisera</SelectItem>
                      {technicians.filter(t => t.active).map((tech) => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>
                          {tech.fullName} - {tech.specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="scheduledDate">Zakazano za</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    {...register("scheduledDate")}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Opis problema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Opis problema *</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Detaljno opišite problem sa uređajem..."
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Dodatne napomene</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Dodatne napomene ili specifične zahteve..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions - Sticky button at the bottom */}
          <div className="sticky bottom-0 bg-white p-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/admin/services")}
            >
              Otkaži
            </Button>
            <Button
              type="submit"
              disabled={createServiceMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createServiceMutation.isPending ? "Kreiranje..." : "Kreiraj servis"}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </AdminLayout>
  );
}