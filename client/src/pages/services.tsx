import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Service, 
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
import { Pencil, Plus, Search, Eye, Filter } from "lucide-react";
import { AppIcons, getApplianceIcon, getBrandIcon, getStatusIcon } from "@/lib/app-icons";

// PAŽNJA: Stranica je privremeno pojednostavljena zbog problema sa belim ekranom

const serviceFormSchema = insertServiceSchema.extend({
  clientId: z.coerce.number().min(1, "Obavezno polje"),
  applianceId: z.coerce.number().min(1, "Obavezno polje"),
  description: z.string().min(1, "Obavezno polje"),
  status: z.string(),
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

// Get badge variant based on status
function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Na čekanju", variant: "outline" },
    scheduled: { label: "Zakazano", variant: "secondary" },
    in_progress: { label: "U procesu", variant: "default" },
    waiting_parts: { label: "Čeka delove", variant: "destructive" },
    completed: { label: "Završeno", variant: "outline" },
    cancelled: { label: "Otkazano", variant: "destructive" },
  };

  const config = statusConfig[status] || { label: status, variant: "outline" };
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}

// Format date to local format
function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("sr-ME");
}

// Get user initials from name
function getUserInitials(name: string) {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(word => word && word[0] ? word[0].toUpperCase() : '')
    .filter(Boolean)
    .join('');
}

// Generate random color based on name
function getAvatarColor(name: string) {
  if (!name) return "bg-gray-500";
  
  const colors = ["bg-blue-500", "bg-green-500", "bg-amber-500", "bg-red-500", "bg-purple-500", "bg-pink-500"];
  
  try {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  } catch (error) {
    console.error("Greška pri generisanju boje avatara:", error);
    return "bg-gray-500";
  }
}

export default function Services() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const { toast } = useToast();
  
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  const { data: appliances } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances"],
  });
  
  const { data: technicians } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });
  
  const { data: categories } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"],
  });
  
  // Filter appliances by selected client
  const filteredAppliances = appliances?.filter(appliance => 
    !selectedClient || appliance.clientId === selectedClient
  );
  
  // Enrich services with client and appliance data
  const enrichedServices = services?.map(service => {
    try {
      // Proveravamo da li su clientId i applianceId validni
      if (!service.clientId || !service.applianceId) {
        console.warn(`Servis #${service.id} ima nevažeći clientId:${service.clientId} ili applianceId:${service.applianceId}`);
      }
      
      const client = clients?.find(c => c.id === service.clientId);
      const appliance = appliances?.find(a => a.id === service.applianceId);
      const category = appliance?.categoryId ? categories?.find(c => c.id === appliance.categoryId) : null;
      
      // Dodajemo dodatne debug informacije
      if (!client) {
        console.warn(`Nije pronađen klijent za servis #${service.id}, clientId:${service.clientId}`);
      }
      
      if (!appliance) {
        console.warn(`Nije pronađen uređaj za servis #${service.id}, applianceId:${service.applianceId}`);
      }
      
      return {
        ...service,
        clientName: client?.fullName || "Nepoznato",
        applianceName: category?.name || "Nepoznat uređaj",
        icon: category?.icon || "devices",
      };
    } catch (error) {
      console.error(`Greška pri obogaćivanju servisa #${service.id}:`, error);
      // Vraćamo osnovni servis bez dodatnih podataka ako dođe do greške
      return {
        ...service,
        clientName: "Greška u podacima",
        applianceName: "Nepoznato",
        icon: "error",
      };
    }
  });
  
  // Filter services based on search query and status filter
  const filteredServices = enrichedServices?.filter(service => {
    // Bezbedno pretraživanje sa proverom na null/undefined
    const matchesSearch = 
      (service.clientName && service.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.applianceName && service.applianceName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || service.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Get status options for select component
  const statusOptions = [
    { value: "all", label: "Svi statusi" },
    { value: "pending", label: "Na čekanju" },
    { value: "scheduled", label: "Zakazano" },
    { value: "in_progress", label: "U procesu" },
    { value: "waiting_parts", label: "Čeka delove" },
    { value: "completed", label: "Završeno" },
    { value: "cancelled", label: "Otkazano" },
  ];
  
  // Service form
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      clientId: 0,
      applianceId: 0,
      description: "",
      status: "pending",
      warrantyStatus: "nepoznato" as const, // OBAVEZNA default vrednost
      technicianId: 0,
      createdAt: new Date().toISOString().split('T')[0],
      scheduledDate: "",
      completedDate: "",
      technicianNotes: "",
      cost: "",
      // Početne vrednosti za poslovno partnerstvo
      businessPartnerId: null,
      partnerCompanyName: null,
    },
  });
  
  // Create/Update service mutation
  const serviceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      console.log("Podaci za slanje:", data);
      if (selectedService) {
        // Update service
        const res = await apiRequest(`/api/services/${selectedService.id}`, { method: "PUT", body: JSON.stringify(data) });
        return await res.json();
      } else {
        // Create new service
        const res = await apiRequest("/api/services", { method: "POST", body: JSON.stringify(data) });
        return await res.json();
      }
    },
    onSuccess: (data) => {
      console.log("Uspešno sačuvan servis:", data);
      
      // Invalidiraj upite za servise i statistiku
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      
      // Posebno invalidiraj statistiku i obavezno odradi fetch
      queryClient.invalidateQueries({ 
        queryKey: ["/api/stats"],
        refetchType: 'all' // Prisilno odradi refetch
      });
      
      // Poboljšana i vizuelno uočljivija poruka sa informacijom o slanju obaveštenja
      if (data?.emailSent) {
        toast({
          title: "✅ " + (selectedService ? "Servis uspešno ažuriran" : "Servis uspešno dodat"),
          description: `Podaci o servisu su sačuvani. 📧 Email obaveštenje je poslato klijentu ${data.clientName || 'i/ili serviseru'}. ${data.emailDetails || ''}`,
          duration: 6000, // Duža poruka treba da ostane duže na ekranu
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
          title: "✅ " + (selectedService ? "Servis uspešno ažuriran" : "Servis uspešno dodat"),
          description: "Podaci o servisu su sačuvani. Obaveštenja nisu poslata jer nema konfigurisanih email adresa.",
          duration: 4000,
        });
      }
      
      setIsDialogOpen(false);
      form.reset();
      setSelectedService(null);
      setSelectedClient(null);
    },
    onError: (error) => {
      console.error("Greška pri čuvanju servisa:", error);
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri čuvanju podataka",
        variant: "destructive",
      });
    },
  });
  
  // Open dialog for adding new service
  const handleAddService = () => {
    console.log("Otvaranje dijaloga za dodavanje servisa");
    setSelectedService(null);
    setSelectedClient(null);
    
    const defaultValues = {
      clientId: 0,
      applianceId: 0,
      description: "",
      status: "pending",
      warrantyStatus: "nepoznato" as const, // OBAVEZNA default vrednost
      technicianId: 0,
      createdAt: new Date().toISOString().split('T')[0],
      scheduledDate: null,
      completedDate: null,
      technicianNotes: null,
      cost: null,
      // Početne vrednosti za poslovno partnerstvo
      businessPartnerId: null,
      partnerCompanyName: null,
    };
    
    form.reset(defaultValues);
    console.log("Forma resetovana sa:", defaultValues);
    
    setIsDialogOpen(true);
    console.log("Dialog otvoren:", isDialogOpen);
  };
  
  // Open dialog for editing service
  const handleEditService = (service: Service) => {
    console.log("Uređivanje servisa:", service);
    setSelectedService(service);
    setSelectedClient(service.clientId);
    
    const editValues = {
      clientId: service.clientId,
      applianceId: service.applianceId,
      description: service.description,
      status: service.status,
      warrantyStatus: ((service as any).warrantyStatus || "nepoznato") as const, // Dodaj warranty status ili default
      technicianId: service.technicianId || 0,
      createdAt: service.createdAt,
      scheduledDate: service.scheduledDate || null,
      completedDate: service.completedDate || null,
      technicianNotes: service.technicianNotes || null,
      cost: service.cost || null,
      // Dodajemo podatke o poslovnom partneru ako postoje
      businessPartnerId: service.businessPartnerId || null,
      partnerCompanyName: service.partnerCompanyName || null,
    };
    
    form.reset(editValues);
    console.log("Forma postavljena za uređivanje:", editValues);
    
    setIsDialogOpen(true);
  };
  
  // Handle client change in form
  const handleClientChange = (clientId: string) => {
    console.log("Klijent promijenjen u:", clientId);
    const clientIdNum = parseInt(clientId);
    setSelectedClient(clientIdNum);
    
    // Resetirajmo odabir uređaja
    form.setValue("applianceId", 0, { shouldValidate: false });
    
    // Postavimo klijenta u formu
    form.setValue("clientId", clientIdNum, { shouldValidate: true });
    
    console.log("Novi odabrani klijent:", clientIdNum);
    console.log("Forma nakon promjene klijenta:", form.getValues());
  };
  
  // Submit service form
  const onSubmit = (data: ServiceFormValues) => {
    serviceMutation.mutate(data);
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        closeMobileMenu={() => setSidebarOpen(false)} 
      />
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-medium text-gray-800">Servisi</h2>
                <p className="text-gray-600">Upravljanje servisnim intervencijama</p>
              </div>
              <Button onClick={handleAddService}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj servis
              </Button>
            </div>
            
            {/* Search and filter */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative md:col-span-2">
                    <Input
                      placeholder="Pretraga"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Services table */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-lg font-medium">Lista servisa</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="p-4">
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Klijent</TableHead>
                          <TableHead>Mjesto (grad)</TableHead>
                          <TableHead>Uređaj</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Kreirao</TableHead>
                          <TableHead>Datum prijave</TableHead>
                          <TableHead>Opis</TableHead>
                          <TableHead className="text-right">Akcije</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredServices?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                              {searchQuery || statusFilter !== "all"
                                ? "Nema rezultata za vašu pretragu" 
                                : "Nema servisa za prikaz"}
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {filteredServices?.map((service) => (
                          <TableRow key={service.id}>
                            <TableCell className="font-medium">#{service.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full ${getAvatarColor(service.clientName)} text-white flex items-center justify-center mr-3`}>
                                  <span className="text-xs font-medium">{getUserInitials(service.clientName)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span>{service.clientName}</span>
                                  {service.businessPartnerId && service.partnerCompanyName && (
                                    <span className="text-xs text-blue-600 font-medium mt-1">
                                      Via: {service.partnerCompanyName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{"Nepoznato"}</span>
                                <span className="text-xs text-gray-500 mt-1">{"Adresa nepoznata"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {/* Sigurniji prikaz ikone */}
                                {service.icon ? (
                                  <span className="text-primary mr-2 flex items-center justify-center w-6 h-6">
                                    {/* Umesto material-icons, koristimo predefinisane vrednosti */}
                                    {service.icon === "sudopera" && "🍽️"}
                                    {service.icon === "ves_masina" && "👕"}
                                    {service.icon === "frizider" && "❄️"}
                                    {service.icon === "sporet" && "🔥"}
                                    {service.icon === "bojler" && "♨️"}
                                    {service.icon === "devices" && "📱"}
                                    {!["sudopera", "ves_masina", "frizider", "sporet", "bojler", "devices"].includes(service.icon) && "🔧"}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 mr-2">📦</span>
                                )}
                                <span>{service.applianceName || "Nepoznat uređaj"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(service.status)}</TableCell>
                            <TableCell>
                              {service.businessPartnerId ? (
                                <Badge variant="outline" className="font-normal">
                                  {service.partnerCompanyName || "Poslovni partner"}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="font-normal">Admin</Badge>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(service.createdAt)}</TableCell>
                            <TableCell className="max-w-xs truncate">{service.description}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEditService(service)}
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEditService(service)}
                              >
                                <Pencil className="h-4 w-4 text-primary" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      
      {/* Add/Edit Service Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedService ? "Izmeni servis" : "Dodaj novi servis"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Klijent</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleClientChange(value);
                        }}
                        value={field.value ? String(field.value) : "0"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite klijenta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map(client => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.fullName}
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
                  name="applianceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uređaj</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        value={field.value ? String(field.value) : "0"}
                        disabled={!selectedClient}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedClient ? "Izaberite uređaj" : "Prvo izaberite klijenta"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredAppliances?.map(appliance => {
                            const category = categories?.find(c => c.id === appliance.categoryId);
                            return (
                              <SelectItem key={appliance.id} value={appliance.id.toString()}>
                                {category?.name || "Uređaj"} {appliance.model ? `- ${appliance.model}` : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
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
                    <FormLabel>Opis problema</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detaljno opišite problem..." 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        value={field.value || "pending"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Na čekanju</SelectItem>
                          <SelectItem value="scheduled">Zakazano</SelectItem>
                          <SelectItem value="in_progress">U procesu</SelectItem>
                          <SelectItem value="waiting_parts">Čeka delove</SelectItem>
                          <SelectItem value="completed">Završeno</SelectItem>
                          <SelectItem value="cancelled">Otkazano</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* OBAVEZNO WARRANTY STATUS POLJE */}
                <FormField
                  control={form.control}
                  name="warrantyStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-600 font-semibold">
                        Status garancije *
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        value={field.value || "nepoznato"}
                      >
                        <FormControl>
                          <SelectTrigger className="border-red-300 focus:border-red-500">
                            <SelectValue placeholder="OBAVEZAN IZBOR - odaberite status garancije" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="u garanciji">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-600">✓</span>
                              <span>U garanciji</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="van garancije">
                            <div className="flex items-center space-x-2">
                              <span className="text-red-600">✗</span>
                              <span>Van garancije</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="nepoznato">
                            <div className="flex items-center space-x-2">
                              <span className="text-amber-600">?</span>
                              <span>Nepoznato - treba proveriti</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      <p className="text-xs text-red-600 mt-1">
                        * Obavezno polje - servis se ne može kreirati bez odabira statusa garancije
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="technicianId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviser</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        value={field.value ? field.value.toString() : "0"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite servisera" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Nije dodeljeno</SelectItem>
                          {technicians?.map(technician => (
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
                
                <FormField
                  control={form.control}
                  name="createdAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum prijave</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zakazani datum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="completedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum završetka</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="technicianNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Napomene servisera</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Napomene..." 
                          className="min-h-[80px]"
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena servisa</FormLabel>
                      <FormControl>
                        <Input placeholder="npr. 50 €" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Prikaz podataka o klijentu i poslovnom partneru ako postoje */}
              {selectedService && selectedService.businessPartnerId && (
                <div className="bg-blue-50 p-4 rounded-md mt-2">
                  <h3 className="font-medium text-blue-800 mb-2">Informacije o naručiocu servisa</h3>
                  
                  {/* Detalji o klijentu */}
                  {clients && clients.find(c => c.id === selectedService.clientId) && (
                    <div className="mb-3">
                      <h4 className="font-medium text-sm text-blue-600">Podaci o klijentu:</h4>
                      {(() => {
                        const client = clients.find(c => c.id === selectedService.clientId);
                        return client ? (
                          <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                            <div><span className="font-medium">Ime i prezime:</span> {client.fullName}</div>
                            <div><span className="font-medium">Telefon:</span> {client.phone}</div>
                            <div><span className="font-medium">Email:</span> {client.email || "/"}</div>
                            <div><span className="font-medium">Adresa:</span> {client.address}</div>
                            <div><span className="font-medium">Grad:</span> {client.city}</div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                  
                  {/* Detalji o poslovnom partneru */}
                  <div>
                    <h4 className="font-medium text-sm text-blue-600">Zahtev kreirao poslovni partner:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                      <div><span className="font-medium">Kompanija:</span> {selectedService.partnerCompanyName || "/"}</div>
                      <div><span className="font-medium">ID partnera:</span> {selectedService.businessPartnerId}</div>
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter className="sticky bottom-0 bg-white pt-2 pb-2 border-t mt-4">
                <Button type="submit" size="lg" disabled={serviceMutation.isPending}>
                  {serviceMutation.isPending ? "Čuvanje..." : "Sačuvaj promene"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
