import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { warrantyStatusStrictEnum } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FloatingSheet } from "@/components/ui/floating-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Package, FileText, AlertTriangle, CheckCircle2, Search, Plus, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types for data
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

interface ApplianceCategory {
  id: number;
  name: string;
  icon: string;
}

interface Manufacturer {
  id: number;
  name: string;
}

interface Technician {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  active: boolean;
}

// Schema for business mode (creates client and appliance)
const businessServiceSchema = z.object({
  // Client creation
  clientFullName: z.string().min(1, "Ime i prezime klijenta je obavezno"),
  clientPhone: z.string().min(1, "Telefon klijenta je obavezan"),
  clientEmail: z.string().optional().or(z.literal("")),
  clientAddress: z.string().optional().or(z.literal("")),
  clientCity: z.string().optional().or(z.literal("")),
  
  // Appliance creation
  categoryId: z.coerce.number().min(1, "Kategorija je obavezna"),
  manufacturerId: z.coerce.number().min(1, "Proizvodjač je obavezan"),
  model: z.string().min(1, "Model uređaja je obavezan"),
  serialNumber: z.string().optional().or(z.literal("")),
  
  // Service details
  description: z.string().min(1, "Opis problema je obavezan"),
  warrantyStatus: warrantyStatusStrictEnum.refine(val => val, {
    message: "Status garancije je obavezan - odaberite 'u garanciji' ili 'van garancije'"
  }),
});

// Schema for admin mode (selects existing client/appliance)
const adminServiceSchema = z.object({
  clientId: z.string().min(1, "Odabir klijenta je obavezan"),
  applianceId: z.string().min(1, "Odabir uređaja je obavezan"),
  description: z.string().min(1, "Opis problema je obavezan"),
  warrantyStatus: warrantyStatusStrictEnum.refine(val => val, {
    message: "Status garancije je obavezan - odaberite 'u garanciji' ili 'van garancije'"
  }),
  technicianId: z.string().optional(),
  scheduledDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().optional(),
});

type BusinessServiceFormData = z.infer<typeof businessServiceSchema>;
type AdminServiceFormData = z.infer<typeof adminServiceSchema>;

interface QuickServiceEntryProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "business" | "admin";
  onServiceCreated?: (serviceId: number) => void;
  defaultClientId?: number;
}

export function QuickServiceEntry({ 
  isOpen, 
  onClose, 
  mode = "admin",
  onServiceCreated,
  defaultClientId 
}: QuickServiceEntryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);

  const isBusinessMode = mode === "business";
  const isAdminMode = mode === "admin";

  // Forms for different modes
  const businessForm = useForm<BusinessServiceFormData>({
    resolver: zodResolver(businessServiceSchema),
    defaultValues: {
      clientFullName: "",
      clientPhone: "",
      clientEmail: "",
      clientAddress: "",
      clientCity: "",
      categoryId: undefined,
      manufacturerId: undefined,
      model: "",
      serialNumber: "",
      description: "",
      warrantyStatus: undefined,
    },
  });

  const adminForm = useForm<AdminServiceFormData>({
    resolver: zodResolver(adminServiceSchema),
    defaultValues: {
      clientId: "",
      applianceId: "",
      description: "",
      warrantyStatus: undefined,
      technicianId: "",
      scheduledDate: "",
      priority: "medium",
      notes: "",
    },
  });

  // Use appropriate form based on mode
  const form = isBusinessMode ? businessForm : adminForm;
  const watchedClientId = isAdminMode ? adminForm.watch("clientId") || "" : "";

  // Data queries
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAdminMode,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"],
    enabled: isBusinessMode,
  });

  const { data: manufacturers = [], isLoading: manufacturersLoading } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"],
    enabled: isBusinessMode,
  });

  const { data: appliances = [], isLoading: appliancesLoading } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances", watchedClientId],
    queryFn: async () => {
      if (!watchedClientId || isNaN(parseInt(watchedClientId))) return [];
      try {
        const response = await apiRequest(`/api/clients/${watchedClientId}/appliances`, { method: "GET" });
        if (!response.ok) throw new Error(`Failed to fetch appliances: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching appliances:", error);
        return [];
      }
    },
    enabled: isAdminMode && !!watchedClientId && !isNaN(parseInt(watchedClientId)),
    retry: 1,
  });

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
    enabled: isAdminMode,
  });

  // Filter clients for search - show all when no query
  const filteredClients = useMemo(() => {
    // Always show all clients initially
    if (!clientSearchQuery || !clientSearchQuery.trim()) {
      return clients.slice(0, 100); // Show first 100 clients to avoid performance issues
    }
    const query = clientSearchQuery.toLowerCase().trim();
    return clients.filter(client => 
      client.fullName.toLowerCase().includes(query) ||
      client.phone.includes(query) ||
      (client.email && client.email.toLowerCase().includes(query)) ||
      (client.city && client.city.toLowerCase().includes(query))
    );
  }, [clients, clientSearchQuery]);

  // Selected client data for display
  const selectedClient = clients.find(c => c.id.toString() === watchedClientId);

  // Business service creation mutation
  const businessServiceMutation = useMutation({
    mutationFn: async (data: BusinessServiceFormData) => {
      setIsSubmitting(true);
      try {
        console.log("Creating business service:", data);
        
        const response = await apiRequest("/api/business/services-jwt", {
          method: "POST",
          body: JSON.stringify({
            clientFullName: data.clientFullName.trim(),
            clientPhone: data.clientPhone.trim(),
            clientEmail: data.clientEmail?.trim() || "",
            clientAddress: data.clientAddress?.trim() || "",
            clientCity: data.clientCity?.trim() || "",
            categoryId: data.categoryId,
            manufacturerId: data.manufacturerId,
            model: data.model.trim(),
            serialNumber: data.serialNumber?.trim() || "",
            description: data.description.trim(),
            warrantyStatus: data.warrantyStatus,
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || errorData?.error || "Greška prilikom kreiranja servisa");
        }
        
        return await response.json();
      } catch (error) {
        console.error("Business service creation error:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (data) => {
      setSubmitSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/business/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Servis kreiran",
        description: "Novi servis je uspešno kreiran.",
        duration: 3000,
      });
      if (onServiceCreated) onServiceCreated(data.id);
      setTimeout(() => {
        onClose();
        setSubmitSuccess(false);
        businessForm.reset();
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri kreiranju servisa.",
        variant: "destructive",
      });
    },
  });

  // Admin service creation mutation
  const adminServiceMutation = useMutation({
    mutationFn: async (data: AdminServiceFormData) => {
      setIsSubmitting(true);
      try {
        const response = await apiRequest("/api/services", {
          method: "POST",
          body: JSON.stringify({
            clientId: parseInt(data.clientId),
            applianceId: parseInt(data.applianceId),
            description: data.description.trim(),
            warrantyStatus: data.warrantyStatus,
            technicianId: data.technicianId ? parseInt(data.technicianId) : null,
            scheduledDate: data.scheduledDate || null,
            priority: data.priority,
            notes: data.notes || null,
            status: "pending",
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || errorData?.error || "Greška prilikom kreiranja servisa");
        }
        
        return await response.json();
      } catch (error) {
        console.error("Admin service creation error:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (data) => {
      setSubmitSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Servis kreiran",
        description: "Novi servis je uspešno kreiran.",
        duration: 3000,
      });
      if (onServiceCreated) onServiceCreated(data.id);
      setTimeout(() => {
        onClose();
        setSubmitSuccess(false);
        adminForm.reset();
        setClientSearchQuery("");
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri kreiranju servisa.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = () => {
    if (isBusinessMode) {
      businessForm.handleSubmit((data) => businessServiceMutation.mutate(data))();
    } else {
      adminForm.handleSubmit((data) => adminServiceMutation.mutate(data))();
    }
  };

  // Reset form when mode changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSubmitSuccess(false);
      if (defaultClientId && isAdminMode) {
        adminForm.setValue("clientId", defaultClientId.toString());
      }
    } else {
      businessForm.reset();
      adminForm.reset();
      setClientSearchQuery("");
    }
  }, [isOpen, mode, defaultClientId, businessForm, adminForm]);

  if (submitSuccess) {
    if (isAdminMode) {
      // Full screen success for admin mode
      return (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-semibold">Servis kreiran</h1>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Zatvori
            </Button>
          </div>
          <div 
            className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] space-y-4" 
            data-testid="success-message"
          >
            <CheckCircle2 className="h-12 w-12 text-green-600" data-testid="success-icon" />
            <h3 className="text-lg font-semibold" data-testid="success-title">
              Servis uspešno kreiran!
            </h3>
            <p className="text-sm text-muted-foreground text-center" data-testid="success-description">
              Novi servis zahtev je kreiran i dodeljen odgovarajućem serviseru.
            </p>
          </div>
        </div>
      );
    } else {
      // Floating sheet for business mode
      return (
        <FloatingSheet
          isOpen={isOpen}
          onClose={onClose}
          title="Servis kreiran"
          defaultSize={{ width: 400, height: 300 }}
          minSize={{ width: 350, height: 250 }}
          defaultPosition={{ x: 100, y: 100 }}
        >
          <div 
            className="flex flex-col items-center justify-center h-full space-y-4" 
            data-testid="success-message"
          >
            <CheckCircle2 className="h-12 w-12 text-green-600" data-testid="success-icon" />
            <h3 className="text-lg font-semibold" data-testid="success-title">
              Servis uspešno kreiran!
            </h3>
            <p className="text-sm text-muted-foreground text-center" data-testid="success-description">
              Novi servis zahtev je kreiran i dodeljen odgovarajućem serviseru.
            </p>
          </div>
        </FloatingSheet>
      );
    }
  }

  const title = isBusinessMode ? "Novi servis - Poslovni partner" : "Novi servis - Admin";

  if (isAdminMode) {
    // Full screen layout for admin mode - fixed position to prevent floating
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <h1 className="text-xl font-semibold">{title}</h1>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Zatvori
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto p-6">
              <div className="space-y-6" data-testid="quick-service-form">
                
                {/* Mode indicator */}
                <div className="flex items-center gap-2" data-testid="mode-indicator">
                  <Badge variant="default" data-testid="mode-badge">
                    Administrator
                  </Badge>
                  {user && (
                    <span className="text-sm text-muted-foreground" data-testid="user-info">
                      {user.fullName}
                    </span>
                  )}
                </div>

                {/* Admin Mode Form */}
                <Form {...adminForm}>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }} className="space-y-6" data-testid="service-form">
                  
                  {/* Client Selection Card */}
                  <Card data-testid="client-selection-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" data-testid="client-section-title">
                        <User className="h-4 w-4" />
                        Odabir klijenta
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={adminForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem data-testid="client-field">
                            <FormLabel data-testid="client-label">Klijent *</FormLabel>
                            <Popover open={isClientSelectorOpen} onOpenChange={setIsClientSelectorOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                    data-testid="client-selector-trigger"
                                  >
                                    {selectedClient 
                                      ? `${selectedClient.fullName} (${selectedClient.phone})`
                                      : "Odaberite klijenta..."
                                    }
                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0" data-testid="client-selector-popover">
                                <Command>
                                  <CommandInput
                                    placeholder="Pretražite klijente..."
                                    value={clientSearchQuery}
                                    onValueChange={setClientSearchQuery}
                                    data-testid="client-search-input"
                                  />
                                  <CommandEmpty data-testid="no-clients-found">
                                    {clientsLoading ? "Učitavanje..." : "Nema rezultata za pretragu."}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    <ScrollArea className="h-[300px]">
                                      {filteredClients.map((client) => (
                                        <CommandItem
                                          key={client.id}
                                          value={client.id.toString()}
                                          onSelect={() => {
                                            field.onChange(client.id.toString());
                                            setIsClientSelectorOpen(false);
                                            setClientSearchQuery("");
                                            adminForm.setValue("applianceId", ""); // Reset appliance selection
                                          }}
                                          className="cursor-pointer"
                                          data-testid={`client-option-${client.id}`}
                                        >
                                          <div className="flex flex-col">
                                            <span className="font-medium">{client.fullName}</span>
                                            <span className="text-sm text-muted-foreground">{client.phone}</span>
                                            {client.city && (
                                              <span className="text-xs text-muted-foreground">{client.city}</span>
                                            )}
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </ScrollArea>
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage data-testid="client-error" />
                          </FormItem>
                        )}
                      />

                      {/* Show selected client info */}
                      {selectedClient && (
                        <div className="p-3 bg-muted rounded-lg space-y-1" data-testid="selected-client-info">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{selectedClient.fullName}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Telefon: {selectedClient.phone}
                            {selectedClient.email && ` | Email: ${selectedClient.email}`}
                            {selectedClient.city && ` | Grad: ${selectedClient.city}`}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Appliance Selection Card */}
                  <Card data-testid="appliance-selection-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" data-testid="appliance-section-title">
                        <Package className="h-4 w-4" />
                        Odabir uređaja
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={adminForm.control}
                        name="applianceId"
                        render={({ field }) => (
                          <FormItem data-testid="appliance-field">
                            <FormLabel data-testid="appliance-label">Uređaj *</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              disabled={!watchedClientId || appliancesLoading}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="appliance-selector">
                                  <SelectValue placeholder={
                                    !watchedClientId 
                                      ? "Prvo odaberite klijenta" 
                                      : appliancesLoading 
                                        ? "Učitavanje..."
                                        : "Odaberite uređaj..."
                                  } />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent data-testid="appliance-options">
                                {appliances.map((appliance) => (
                                  <SelectItem 
                                    key={appliance.id} 
                                    value={appliance.id.toString()}
                                    data-testid={`appliance-option-${appliance.id}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Package className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <span className="font-medium">
                                          {appliance.category?.name} - {appliance.manufacturer?.name}
                                        </span>
                                        <span className="ml-2 text-sm text-muted-foreground">
                                          {appliance.model}
                                          {appliance.serialNumber && ` (SN: ${appliance.serialNumber})`}
                                        </span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage data-testid="appliance-error" />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Service Details Card */}
                  <Card data-testid="service-details-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" data-testid="service-details-title">
                        <FileText className="h-4 w-4" />
                        Detalji servisa
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={adminForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem data-testid="description-field">
                            <FormLabel data-testid="description-label">Opis problema *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Detaljno opišite problem sa uređajem..."
                                className="min-h-[100px]"
                                {...field}
                                data-testid="description-input"
                              />
                            </FormControl>
                            <FormMessage data-testid="description-error" />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={adminForm.control}
                          name="warrantyStatus"
                          render={({ field }) => (
                            <FormItem data-testid="warranty-field">
                              <FormLabel data-testid="warranty-label">Status garancije *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="warranty-selector">
                                    <SelectValue placeholder="Odaberite status garancije..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent data-testid="warranty-options">
                                  <SelectItem value="u garanciji" data-testid="warranty-option-in">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      U garanciji
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="van garancije" data-testid="warranty-option-out">
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                                      Van garancije
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage data-testid="warranty-error" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={adminForm.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem data-testid="priority-field">
                              <FormLabel data-testid="priority-label">Prioritet</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="priority-selector">
                                    <SelectValue placeholder="Odaberite prioritet..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent data-testid="priority-options">
                                  <SelectItem value="low" data-testid="priority-low">Nizak</SelectItem>
                                  <SelectItem value="medium" data-testid="priority-medium">Srednji</SelectItem>
                                  <SelectItem value="high" data-testid="priority-high">Visok</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage data-testid="priority-error" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={adminForm.control}
                          name="technicianId"
                          render={({ field }) => (
                            <FormItem data-testid="technician-field">
                              <FormLabel data-testid="technician-label">Dodijeljeni serviser</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="technician-selector">
                                    <SelectValue placeholder="Odaberite servisera..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent data-testid="technician-options">
                                  {technicians
                                    .filter(t => t.active)
                                    .map((tech) => (
                                      <SelectItem 
                                        key={tech.id} 
                                        value={tech.id.toString()}
                                        data-testid={`technician-option-${tech.id}`}
                                      >
                                        {tech.fullName} - {tech.specialization}
                                      </SelectItem>
                                    ))
                                  }
                                </SelectContent>
                              </Select>
                              <FormMessage data-testid="technician-error" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={adminForm.control}
                          name="scheduledDate"
                          render={({ field }) => (
                            <FormItem data-testid="scheduled-date-field">
                              <FormLabel data-testid="scheduled-date-label">Planirani datum</FormLabel>
                              <FormControl>
                                <Input
                                  type="datetime-local"
                                  {...field}
                                  data-testid="scheduled-date-input"
                                />
                              </FormControl>
                              <FormMessage data-testid="scheduled-date-error" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={adminForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem data-testid="notes-field">
                            <FormLabel data-testid="notes-label">Dodatne napomene</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Dodatne napomene o servisu..."
                                {...field}
                                data-testid="notes-input"
                              />
                            </FormControl>
                            <FormMessage data-testid="notes-error" />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Submit Button - Admin Mode */}
                  <div className="flex justify-end gap-3" data-testid="form-actions">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose}
                      data-testid="cancel-button"
                    >
                      Otkaži
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      data-testid="submit-button"
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Kreiraj servis
                    </Button>
                  </div>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Business mode - Floating sheet
  return (
    <FloatingSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      defaultSize={{ width: 600, height: 700 }}
      minSize={{ width: 500, height: 600 }}
      defaultPosition={{ x: 100, y: 50 }}
    >
      <div className="space-y-6" data-testid="quick-service-form">
        
        {/* Mode indicator */}
        <div className="flex items-center gap-2" data-testid="mode-indicator">
          <Badge variant="secondary" data-testid="mode-badge">
            Poslovni partner
          </Badge>
          {user && (
            <span className="text-sm text-muted-foreground" data-testid="user-info">
              {user.fullName}
            </span>
          )}
        </div>

        {/* Business Mode Form */}
        <Form {...businessForm}>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }} className="space-y-6" data-testid="service-form">
            
            {/* Client Creation */}
            <Card data-testid="client-creation-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="client-creation-title">
                  <User className="h-4 w-4" />
                  Podaci o klijentu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={businessForm.control}
                    name="clientFullName"
                    render={({ field }) => (
                      <FormItem data-testid="client-fullname-field">
                        <FormLabel data-testid="client-fullname-label">Ime i prezime *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Marko Petrović" 
                            {...field} 
                            data-testid="client-fullname-input"
                          />
                        </FormControl>
                        <FormMessage data-testid="client-fullname-error" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={businessForm.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem data-testid="client-phone-field">
                        <FormLabel data-testid="client-phone-label">Telefon *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="069 123 456" 
                            {...field} 
                            data-testid="client-phone-input"
                          />
                        </FormControl>
                        <FormMessage data-testid="client-phone-error" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={businessForm.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem data-testid="client-email-field">
                      <FormLabel data-testid="client-email-label">Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="email@example.com"
                          {...field} 
                          data-testid="client-email-input"
                        />
                      </FormControl>
                      <FormMessage data-testid="client-email-error" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={businessForm.control}
                    name="clientAddress"
                    render={({ field }) => (
                      <FormItem data-testid="client-address-field">
                        <FormLabel data-testid="client-address-label">Adresa</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ulica i broj"
                            {...field} 
                            data-testid="client-address-input"
                          />
                        </FormControl>
                        <FormMessage data-testid="client-address-error" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={businessForm.control}
                    name="clientCity"
                    render={({ field }) => (
                      <FormItem data-testid="client-city-field">
                        <FormLabel data-testid="client-city-label">Grad</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Podgorica"
                            {...field} 
                            data-testid="client-city-input"
                          />
                        </FormControl>
                        <FormMessage data-testid="client-city-error" />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appliance Creation */}
            <Card data-testid="appliance-creation-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="appliance-creation-title">
                  <Package className="h-4 w-4" />
                  Podaci o uređaju
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={businessForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem data-testid="category-field">
                        <FormLabel data-testid="category-label">Kategorija *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="category-selector">
                              <SelectValue placeholder="Odaberite kategoriju..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent data-testid="category-options">
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()} data-testid={`category-option-${cat.id}`}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage data-testid="category-error" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={businessForm.control}
                    name="manufacturerId"
                    render={({ field }) => (
                      <FormItem data-testid="manufacturer-field">
                        <FormLabel data-testid="manufacturer-label">Proizvođač *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="manufacturer-selector">
                              <SelectValue placeholder="Odaberite proizvođača..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent data-testid="manufacturer-options">
                            {manufacturers.map((mfr) => (
                              <SelectItem key={mfr.id} value={mfr.id.toString()} data-testid={`manufacturer-option-${mfr.id}`}>
                                {mfr.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage data-testid="manufacturer-error" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={businessForm.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem data-testid="model-field">
                        <FormLabel data-testid="model-label">Model *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="WM1234AB"
                            {...field} 
                            data-testid="model-input"
                          />
                        </FormControl>
                        <FormMessage data-testid="model-error" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={businessForm.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem data-testid="serial-number-field">
                        <FormLabel data-testid="serial-number-label">Serijski broj</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="SN123456789"
                            {...field} 
                            data-testid="serial-number-input"
                          />
                        </FormControl>
                        <FormMessage data-testid="serial-number-error" />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card data-testid="service-info-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="service-info-title">
                  <FileText className="h-4 w-4" />
                  Opis servisa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={businessForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem data-testid="description-field">
                      <FormLabel data-testid="description-label">Opis problema *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detaljno opišite problem sa uređajem..."
                          className="min-h-[80px]"
                          {...field}
                          data-testid="description-input"
                        />
                      </FormControl>
                      <FormMessage data-testid="description-error" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={businessForm.control}
                  name="warrantyStatus"
                  render={({ field }) => (
                    <FormItem data-testid="warranty-field">
                      <FormLabel data-testid="warranty-label">Status garancije *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="warranty-selector">
                            <SelectValue placeholder="Odaberite status garancije..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent data-testid="warranty-options">
                          <SelectItem value="u garanciji" data-testid="warranty-option-in">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              U garanciji
                            </div>
                          </SelectItem>
                          <SelectItem value="van garancije" data-testid="warranty-option-out">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              Van garancije
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage data-testid="warranty-error" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button - Business Mode */}
            <div className="flex justify-end gap-3" data-testid="form-actions">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="cancel-button"
              >
                Otkaži
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                data-testid="submit-button"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kreiraj servis
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </FloatingSheet>
  );
}