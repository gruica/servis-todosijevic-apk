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
import { Loader2, User, Package, FileText, AlertTriangle, CheckCircle2, Search, Plus } from "lucide-react";
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
  categoryId: z.string().min(1, "Izaberite kategoriju uređaja"),
  manufacturerId: z.string().min(1, "Izaberite proizvođača"),
  model: z.string().min(1, "Model uređaja je obavezan"),
  serialNumber: z.string().optional().or(z.literal("")),
  
  // Service details
  description: z.string().min(5, "Opis problema mora biti detaljniji (min. 5 karaktera)"),
  warrantyStatus: warrantyStatusStrictEnum,
});

// Schema for admin mode (selects existing client and appliance)
const adminServiceSchema = z.object({
  clientId: z.string().min(1, "Klijent je obavezan"),
  applianceId: z.string().min(1, "Uređaj je obavezan"),
  description: z.string().min(5, "Opis problema mora biti detaljniji (min. 5 karaktera)"),
  warrantyStatus: warrantyStatusStrictEnum,
  technicianId: z.string().optional(),
  scheduledDate: z.string().optional(),
  priority: z.string().default("medium"),
  notes: z.string().optional(),
});

type BusinessServiceFormData = z.infer<typeof businessServiceSchema>;
type AdminServiceFormData = z.infer<typeof adminServiceSchema>;

interface QuickServiceEntryProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'admin' | 'business';
  defaultClientId?: number;
  onServiceCreated?: (serviceId: number) => void;
}

export function QuickServiceEntry({
  isOpen,
  onClose,
  mode,
  defaultClientId,
  onServiceCreated
}: QuickServiceEntryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);

  // Choose schema based on mode
  const schema = mode === 'business' ? businessServiceSchema : adminServiceSchema;
  const isBusinessMode = mode === 'business';
  const isAdminMode = mode === 'admin';

  // Form setup with appropriate schema
  const businessForm = useForm<BusinessServiceFormData>({
    resolver: zodResolver(businessServiceSchema),
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
      description: "",
      warrantyStatus: undefined,
    },
  });

  const adminForm = useForm<AdminServiceFormData>({
    resolver: zodResolver(adminServiceSchema),
    defaultValues: {
      clientId: defaultClientId ? defaultClientId.toString() : "",
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

  // Filter clients for search
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const query = clientSearchQuery.toLowerCase().trim();
    return clients.filter(client => 
      client.fullName.toLowerCase().includes(query) ||
      client.phone.includes(query) ||
      (client.email && client.email.toLowerCase().includes(query))
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
        console.log("Creating admin service:", data);
        
        if (!data.clientId || !data.applianceId) {
          throw new Error("Klijent i uređaj su obavezni");
        }
        
        if (!data.warrantyStatus) {
          throw new Error("Status garancije je obavezan - molimo odaberite opciju");
        }

        const serviceData = {
          clientId: parseInt(data.clientId),
          applianceId: parseInt(data.applianceId),
          description: data.description,
          status: "pending",
          warrantyStatus: data.warrantyStatus,
          technicianId: data.technicianId && data.technicianId !== "" && data.technicianId !== "none" ? parseInt(data.technicianId) : null,
          scheduledDate: data.scheduledDate || null,
          priority: data.priority || "medium",
          notes: data.notes || null,
        };

        const response = await apiRequest("/api/services", { 
          method: "POST", 
          body: JSON.stringify(serviceData) 
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}`);
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
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

  const title = isBusinessMode ? "Novi servis - Poslovni partner" : "Novi servis - Admin";

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
          <Badge variant={isBusinessMode ? "secondary" : "default"} data-testid="mode-badge">
            {isBusinessMode ? "Poslovni partner" : "Administrator"}
          </Badge>
          {user && (
            <span className="text-sm text-muted-foreground" data-testid="user-info">
              {user.fullName}
            </span>
          )}
        </div>

        {/* Business Mode Form */}
        {isBusinessMode && (
          <Form {...businessForm}>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }} className="space-y-6" data-testid="service-form">
              {/* Business Mode Content */}
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
                              placeholder="063 123 456" 
                              {...field} 
                              data-testid="client-phone-input"
                            />
                          </FormControl>
                          <FormMessage data-testid="client-phone-error" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={businessForm.control}
                      name="clientEmail"
                      render={({ field }) => (
                        <FormItem data-testid="client-email-field">
                          <FormLabel data-testid="client-email-label">Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="marko@example.com" 
                              {...field} 
                              data-testid="client-email-input"
                            />
                          </FormControl>
                          <FormMessage data-testid="client-email-error" />
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
                              placeholder="Beograd" 
                              {...field} 
                              data-testid="client-city-input"
                            />
                          </FormControl>
                          <FormMessage data-testid="client-city-error" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={businessForm.control}
                    name="clientAddress"
                    render={({ field }) => (
                      <FormItem data-testid="client-address-field">
                        <FormLabel data-testid="client-address-label">Adresa</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Kneza Miloša 10" 
                            {...field} 
                            data-testid="client-address-input"
                          />
                        </FormControl>
                        <FormMessage data-testid="client-address-error" />
                      </FormItem>
                    )}
                  />
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="category-selector">
                                <SelectValue placeholder="Odaberite kategoriju..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent data-testid="category-options">
                              {categories.map((category) => (
                                <SelectItem 
                                  key={category.id} 
                                  value={category.id.toString()}
                                  data-testid={`category-option-${category.id}`}
                                >
                                  {category.name}
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="manufacturer-selector">
                                <SelectValue placeholder="Odaberite proizvođača..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent data-testid="manufacturer-options">
                              {manufacturers.map((manufacturer) => (
                                <SelectItem 
                                  key={manufacturer.id} 
                                  value={manufacturer.id.toString()}
                                  data-testid={`manufacturer-option-${manufacturer.id}`}
                                >
                                  {manufacturer.name}
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
                              placeholder="ABC-123" 
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
                        <FormItem data-testid="serial-field">
                          <FormLabel data-testid="serial-label">Serijski broj</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123456789" 
                              {...field} 
                              data-testid="serial-input"
                            />
                          </FormControl>
                          <FormMessage data-testid="serial-error" />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Service Details - Business Mode */}
              <Card data-testid="service-details-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" data-testid="service-details-title">
                    <FileText className="h-4 w-4" />
                    Podaci o servisu
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
        )}

        {/* Admin Mode Form */}
        {isAdminMode && (
          <Form {...adminForm}>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }} className="space-y-6" data-testid="service-form">
            
            {/* Admin Mode - Client Selection */}
            {isAdminMode && (
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
                                Nema rezultata.
                              </CommandEmpty>
                              <CommandGroup>
                                <ScrollArea className="h-[200px]">
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

                  {/* Appliance Selection - Only show when client is selected */}
                  {watchedClientId && (
                    <FormField
                      control={adminForm.control}
                      name="applianceId"
                      render={({ field }) => (
                        <FormItem data-testid="appliance-field">
                          <FormLabel data-testid="appliance-label">Uređaj *</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={appliancesLoading}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="appliance-selector">
                                <SelectValue placeholder="Odaberite uređaj..." />
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
                                    <Package className="h-4 w-4" />
                                    <div className="flex flex-col text-left">
                                      <span className="font-medium">
                                        {appliance.manufacturer.name} {appliance.model}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {appliance.category.name}
                                        {appliance.serialNumber && ` • SN: ${appliance.serialNumber}`}
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
                  )}
                </CardContent>
              </Card>
            )}

            {/* Service Details - Admin Mode */}
            <Card data-testid="service-details-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="service-details-title">
                  <FileText className="h-4 w-4" />
                  Podaci o servisu
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={adminForm.control}
                    name="technicianId"
                    render={({ field }) => (
                      <FormItem data-testid="technician-field">
                        <FormLabel data-testid="technician-label">Serviser</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="technician-selector">
                              <SelectValue placeholder="Dodeliti serviseru..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent data-testid="technician-options">
                            <SelectItem value="none" data-testid="technician-option-none">
                              Bez dodele
                            </SelectItem>
                            {technicians.filter(t => t.active).map((technician) => (
                              <SelectItem 
                                key={technician.id} 
                                value={technician.id.toString()}
                                data-testid={`technician-option-${technician.id}`}
                              >
                                {technician.fullName}
                                {technician.specialization && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({technician.specialization})
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage data-testid="technician-error" />
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
                            <SelectItem value="low" data-testid="priority-option-low">Nizak</SelectItem>
                            <SelectItem value="medium" data-testid="priority-option-medium">Srednji</SelectItem>
                            <SelectItem value="high" data-testid="priority-option-high">Visok</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage data-testid="priority-error" />
                      </FormItem>
                    )}
                  />
                </div>

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
        )}
      </div>
    </FloatingSheet>
  );
}
