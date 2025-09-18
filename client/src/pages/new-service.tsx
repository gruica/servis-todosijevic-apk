import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, ArrowLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Client, 
  Appliance, 
  ApplianceCategory, 
  Technician,
  insertServiceSchema, 
  serviceStatusEnum,
  warrantyStatusEnum
} from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schema - same as in services.tsx
const serviceFormSchema = insertServiceSchema.extend({
  clientId: z.coerce.number().min(1, "Obavezno polje"),
  applianceId: z.coerce.number().min(1, "Obavezno polje"),
  description: z.string().min(1, "Obavezno polje"),
  status: serviceStatusEnum,
  warrantyStatus: warrantyStatusEnum.refine(val => val, {
    message: "Status garancije je obavezan - odaberite 'u garanciji', 'van garancije' ili 'nepoznato'"
  }),
  createdAt: z.string(),
  technicianId: z.coerce.number().optional(),
  scheduledDate: z.string().optional().nullable(),
  completedDate: z.string().optional().nullable(),
  technicianNotes: z.string().optional().nullable(),
  cost: z.string().optional().nullable(),
  businessPartnerId: z.number().optional().nullable(),
  partnerCompanyName: z.string().optional().nullable(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function NewServicePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Sidebar state management
  const closeMobileMenu = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  // Data queries
  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  const { data: appliances, isLoading: appliancesLoading } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances"],
  });
  
  const { data: technicians, isLoading: techniciansLoading } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });
  
  const { data: categories, isLoading: categoriesLoading } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"],
  });
  
  // Service form
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      clientId: 0,
      applianceId: 0,
      description: "",
      status: "pending",
      warrantyStatus: "nepoznato" as const,
      technicianId: 0,
      createdAt: new Date().toISOString().split('T')[0],
      scheduledDate: "",
      completedDate: "",
      technicianNotes: "",
      cost: "",
      businessPartnerId: null,
      partnerCompanyName: null,
    },
  });
  
  // Watch clientId from form for filtering appliances
  const clientId = form.watch('clientId');
  const applianceId = form.watch('applianceId');
  const description = form.watch('description');
  
  // Filter appliances by selected client from form
  const filteredAppliances = appliances?.filter(appliance => 
    !clientId || clientId === 0 || appliance.clientId === clientId
  );
  
  // Check if form is valid for submission
  const isFormValid = clientId && clientId > 0 && applianceId && applianceId > 0 && description && description.length > 0;
  
  // Check if any data is loading
  const isLoading = clientsLoading || appliancesLoading || techniciansLoading || categoriesLoading;
  
  // Filtered clients for the form combo box
  const filteredClientsForForm = useMemo(() => {
    if (!clients) return [];
    if (!clientSearchQuery) return clients.filter(client => client.id && client.id > 0);
    
    const query = clientSearchQuery.toLowerCase();
    return clients.filter(client => {
      if (!client.id || client.id <= 0) return false;
      
      const fullNameMatch = client.fullName?.toLowerCase().includes(query);
      const phoneMatch = client.phone?.toLowerCase().includes(query);
      const addressMatch = client.address?.toLowerCase().includes(query);
      
      return fullNameMatch || phoneMatch || addressMatch;
    });
  }, [clients, clientSearchQuery]);
  
  // Create service mutation
  const serviceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      console.log("Podaci za slanje:", data);
      const res = await apiRequest("/api/services", { method: "POST", body: JSON.stringify(data) });
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Uspešno sačuvan servis:", data);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/stats"],
        refetchType: 'all'
      });
      
      // Show success message
      if (data?.emailSent) {
        toast({
          title: "✅ Servis uspešno dodat",
          description: `Podaci o servisu su sačuvani. 📧 Email obaveštenje je poslato klijentu ${data.clientName || 'i/ili serviseru'}. ${data.emailDetails || ''}`,
          duration: 6000,
        });
      } else if (data?.emailError) {
        toast({
          title: "⚠️ Servis sačuvan, ali email nije poslat",
          description: `Podaci o servisu su sačuvani, ali nije bilo moguće poslati email obaveštenje. Razlog: ${data.emailError}`,
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "✅ Servis uspešno dodat",
          description: "Podaci o servisu su sačuvani. Obaveštenja nisu poslata jer nema konfigurisanih email adresa.",
          duration: 4000,
        });
      }
      
      // Navigate back to services
      setLocation("/services");
    },
    onError: (error) => {
      console.error("Greška pri čuvanju servisa:", error);
      toast({
        title: "Greška",
        description: "Došlo je do greške pri čuvanju servisa. Pokušajte ponovo.",
        variant: "destructive",
      });
    },
  });
  
  // Unified busy state for all loading scenarios
  const isBusy = isLoading || serviceMutation.isPending;
  
  // Handle form submission
  const onSubmit = (data: ServiceFormValues) => {
    // Convert numeric values
    const processedData = {
      ...data,
      clientId: data.clientId || 0,
      applianceId: data.applianceId || 0,
      technicianId: data.technicianId || undefined,
    };
    
    console.log("Podaci pre slanja:", processedData);
    serviceMutation.mutate(processedData);
  };

  // Handle client selection
  const handleClientSelect = (selectedClientId: number) => {
    form.setValue("clientId", selectedClientId);
    setClientComboOpen(false);
    
    // Reset appliance selection when client changes
    form.setValue("applianceId", 0);
  };

  // Get selected client for display
  const selectedClientData = clients?.find(c => c.id === clientId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isMobileOpen={sidebarOpen} closeMobileMenu={closeMobileMenu} />
      <div className="lg:pl-72">
        <Header toggleSidebar={toggleSidebar} />
        
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/services")}
                  className="flex items-center gap-2"
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Nazad
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Novi servis</h1>
                  <p className="text-gray-600">Kreirajte novi servisni zahtev</p>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  Podaci o servisu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Client Selection */}
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Klijent *</FormLabel>
                          <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  disabled={isBusy}
                                  className={cn(
                                    "w-full justify-between",
                                    (!clientId || clientId === 0) && "text-muted-foreground"
                                  )}
                                  data-testid="button-client-select"
                                >
                                  {selectedClientData
                                    ? `${selectedClientData.fullName} - ${selectedClientData.phone}`
                                    : "Odaberite klijenta..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder={isLoading ? "Učitavanje..." : "Pretražite klijente..."}
                                  value={clientSearchQuery}
                                  onValueChange={setClientSearchQuery}
                                  disabled={isBusy}
                                  data-testid="input-client-search"
                                />
                                <CommandEmpty>Nema rezultata.</CommandEmpty>
                                <CommandGroup>
                                  {filteredClientsForForm.map((client) => (
                                    <CommandItem
                                      value={client.id?.toString()}
                                      key={client.id}
                                      onSelect={() => handleClientSelect(client.id!)}
                                      data-testid={`item-client-${client.id}`}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          clientId === client.id
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{client.fullName}</span>
                                        <span className="text-sm text-gray-500">{client.phone}</span>
                                        {client.address && (
                                          <span className="text-xs text-gray-400">{client.address}</span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Appliance Selection */}
                    <FormField
                      control={form.control}
                      name="applianceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Uređaj *</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            defaultValue={field.value?.toString()}
                            disabled={!clientId || clientId === 0 || appliancesLoading || categoriesLoading || isBusy}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-appliance">
                                <SelectValue placeholder={
                                  appliancesLoading || categoriesLoading ? "Učitavanje..." :
                                  (!clientId || clientId === 0) ? "Prvo odaberite klijenta" : "Odaberite uređaj"
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredAppliances?.map((appliance) => {
                                const category = categories?.find(c => c.id === appliance.categoryId);
                                return (
                                  <SelectItem key={appliance.id} value={appliance.id.toString()}>
                                    {category?.name} - {appliance.model}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opis problema *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={isLoading || isMutationLoading ? "Učitavanje..." : "Opišite problem koji treba da bude rešen..."}
                              className="resize-none"
                              rows={4}
                              disabled={isLoading || isMutationLoading}
                              {...field}
                              data-testid="textarea-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Status */}
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isMutationLoading}>
                              <FormControl>
                                <SelectTrigger data-testid="select-status">
                                  <SelectValue placeholder={isLoading || isMutationLoading ? "Učitavanje..." : "Odaberite status"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {serviceStatusEnum.options.map((status) => {
                                  const statusLabels: Record<string, string> = {
                                    "pending": "Na čekanju",
                                    "scheduled": "Zakazano", 
                                    "in_progress": "U procesu",
                                    "waiting_parts": "Čeka delove",
                                    "device_parts_removed": "Delovi uklonjeni sa uređaja",
                                    "completed": "Završeno",
                                    "delivered": "Isporučen aparat klijentu", 
                                    "device_returned": "Aparat vraćen",
                                    "cancelled": "Otkazano",
                                    "client_not_home": "Klijent nije kući",
                                    "client_not_answering": "Klijent se ne javlja", 
                                    "customer_refuses_repair": "Kupac odbija popravku",
                                    "customer_refused_repair": "Kupac je odbio popravku",
                                    "repair_failed": "Servis neuspešan"
                                  };
                                  return (
                                    <SelectItem key={status} value={status}>
                                      {statusLabels[status] || status}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Warranty Status */}
                      <FormField
                        control={form.control}
                        name="warrantyStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status garancije *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isMutationLoading}>
                              <FormControl>
                                <SelectTrigger data-testid="select-warranty-status">
                                  <SelectValue placeholder={isLoading || isMutationLoading ? "Učitavanje..." : "Odaberite status garancije"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="u garanciji">U garanciji</SelectItem>
                                <SelectItem value="van garancije">Van garancije</SelectItem>
                                <SelectItem value="nepoznato">Nepoznato</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Technician */}
                    <FormField
                      control={form.control}
                      name="technicianId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serviser</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                            defaultValue={field.value?.toString()}
                            disabled={isLoading || isMutationLoading || techniciansLoading}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-technician">
                                <SelectValue placeholder={isLoading || isMutationLoading || techniciansLoading ? "Učitavanje..." : "Odaberite servisera (opciono)"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Bez servisera</SelectItem>
                              {technicians?.filter(t => t.active).map((technician) => (
                                <SelectItem key={technician.id} value={technician.id.toString()}>
                                  {technician.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Scheduled Date */}
                      <FormField
                        control={form.control}
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zakazan datum</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                disabled={isLoading || isMutationLoading}
                                {...field}
                                value={field.value || ""}
                                data-testid="input-scheduled-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Completed Date */}
                      <FormField
                        control={form.control}
                        name="completedDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Datum završetka</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                disabled={isLoading || isMutationLoading}
                                {...field}
                                value={field.value || ""}
                                data-testid="input-completed-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Cost */}
                      <FormField
                        control={form.control}
                        name="cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Troškovi</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={isLoading || isMutationLoading ? "Učitavanje..." : "0.00"}
                                disabled={isLoading || isMutationLoading}
                                {...field}
                                value={field.value || ""}
                                data-testid="input-cost"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Technician Notes */}
                    <FormField
                      control={form.control}
                      name="technicianNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Napomene servisera</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={isLoading || isMutationLoading ? "Učitavanje..." : "Dodatne napomene..."}
                              className="resize-none"
                              rows={3}
                              disabled={isLoading || isMutationLoading}
                              {...field}
                              value={field.value || ""}
                              data-testid="textarea-technician-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <div className="flex justify-end gap-4 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLocation("/services")}
                        data-testid="button-cancel"
                      >
                        Otkaži
                      </Button>
                      <Button
                        type="submit"
                        disabled={serviceMutation.isPending || !isFormValid || isLoading}
                        className="flex items-center gap-2"
                        data-testid="button-submit"
                      >
                        {serviceMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Čuvam...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Sačuvaj servis
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}