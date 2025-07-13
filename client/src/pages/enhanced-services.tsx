import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { srLatn } from "date-fns/locale";
import { 
  Service, 
  Client, 
  Appliance, 
  ApplianceCategory, 
  Technician,
  insertServiceSchema, 
  serviceStatusEnum 
} from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Pencil, 
  Plus, 
  Search, 
  Eye, 
  Filter, 
  Calendar as CalendarIcon,
  FileText,
  Clock,
  MessageSquare,
  User,
  Wrench,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CalendarClock,
  MoreHorizontal,
  Loader2
} from "lucide-react";

const serviceFormSchema = insertServiceSchema.extend({
  clientId: z.coerce.number().min(1, "Obavezno polje"),
  applianceId: z.coerce.number().min(1, "Obavezno polje"),
  description: z.string().min(1, "Obavezno polje"),
  status: z.string(),
  createdAt: z.string(),
  technicianId: z.coerce.number().optional(),
  scheduledDate: z.string().optional().nullable(),
  completedDate: z.string().optional().nullable(),
  technicianNotes: z.string().optional().nullable(),
  cost: z.string().optional().nullable(),
  usedParts: z.string().optional().nullable(),
  machineNotes: z.string().optional().nullable(),
  isCompletelyFixed: z.boolean().optional().nullable(),
  businessPartnerId: z.coerce.number().optional().nullable(),
  partnerCompanyName: z.string().optional().nullable(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

// Get badge variant based on status
function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success", icon: React.ReactNode }> = {
    pending: { 
      label: "Na čekanju", 
      variant: "outline", 
      icon: <Clock className="h-3 w-3 mr-1" />
    },
    scheduled: { 
      label: "Zakazano", 
      variant: "secondary", 
      icon: <CalendarClock className="h-3 w-3 mr-1" />
    },
    in_progress: { 
      label: "U procesu", 
      variant: "default", 
      icon: <Wrench className="h-3 w-3 mr-1" />
    },
    waiting_parts: { 
      label: "Čeka delove", 
      variant: "destructive", 
      icon: <AlertCircle className="h-3 w-3 mr-1" />
    },
    completed: { 
      label: "Završeno", 
      variant: "success", 
      icon: <Check className="h-3 w-3 mr-1" />
    },
    cancelled: { 
      label: "Otkazano", 
      variant: "destructive", 
      icon: <X className="h-3 w-3 mr-1" />
    },
  };

  const config = statusConfig[status] || { label: status, variant: "outline", icon: null };
  
  return (
    <Badge variant={config.variant as any} className="flex items-center">
      {config.icon}
      {config.label}
    </Badge>
  );
}

// Format date to local format
function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return format(date, "dd.MM.yyyy", { locale: srLatn });
  } catch (error) {
    console.error("Greška pri formatiranju datuma:", error);
    return dateString;
  }
}

// Format datetime with time
function formatDateTime(dateString: string | null | undefined) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return format(date, "dd.MM.yyyy HH:mm", { locale: srLatn });
  } catch (error) {
    console.error("Greška pri formatiranju datuma/vremena:", error);
    return dateString;
  }
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

// Truncate text if needed
function truncateText(text: string, maxLength: number = 50) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// Get available status options based on current service state and user role
function getAvailableStatusOptions(currentStatus?: string, isCreating: boolean = false) {
  // Ako kreiramo novi servis, dozvoljen je samo početni status
  if (isCreating) {
    return ["pending"];
  }
  
  // Logičan redosled statusa na osnovu trenutnog stanja
  switch (currentStatus) {
    case "pending":
      return ["pending", "scheduled", "cancelled"];
    case "scheduled":
      return ["scheduled", "in_progress", "cancelled"];
    case "in_progress":
      return ["in_progress", "waiting_parts", "completed", "cancelled"];
    case "waiting_parts":
      return ["waiting_parts", "in_progress", "completed", "cancelled"];
    case "completed":
      return ["completed"]; // Završeni servisi se ne mogu menjati
    case "cancelled":
      return ["cancelled", "pending"]; // Otkazani se mogu vratiti na čekanje
    default:
      return ["pending"];
  }
}

export default function EnhancedServices() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [technicianFilter, setTechnicianFilter] = useState<number | "all">("all");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [selectedServiceForSms, setSelectedServiceForSms] = useState<Service | null>(null);
  const [smsMessage, setSmsMessage] = useState("");
  const { toast } = useToast();
  // Proveravamo ulogu korisnika kroz useAuth hook
  const { isAdmin, isTechnician, isBusinessPartner, isClient } = useAuth();
  
  const { data: services, isLoading: isServicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  
  const { data: clients, isLoading: isClientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  const { data: appliances, isLoading: isAppliancesLoading } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances"],
  });
  
  const { data: technicians, isLoading: isTechniciansLoading } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });
  
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/appliance-categories"],
  });
  
  const isDataLoading = 
    isServicesLoading || 
    isClientsLoading || 
    isAppliancesLoading || 
    isTechniciansLoading || 
    isCategoriesLoading;
  
  // Filter appliances by selected client
  const filteredAppliances = appliances?.filter(appliance => 
    !selectedClient || appliance.clientId === selectedClient
  );
  
  // Enrich services with client, appliance, and technician data
  const enrichedServices = services?.map(service => {
    try {
      const client = clients?.find(c => c.id === service.clientId);
      const appliance = appliances?.find(a => a.id === service.applianceId);
      const category = appliance?.categoryId ? categories?.find(c => c.id === appliance.categoryId) : null;
      const technician = service.technicianId ? technicians?.find(t => t.id === service.technicianId) : null;
      const creator = service.businessPartnerId 
        ? `Poslovni partner: ${service.partnerCompanyName || 'Nepoznato'}`
        : "Admin";
      
      // Add JSON parsing for usedParts if it exists
      let parsedUsedParts = [];
      try {
        if (service.usedParts) {
          parsedUsedParts = JSON.parse(service.usedParts);
        }
      } catch (e) {
        console.warn(`Nevalidan JSON za usedParts u servisu #${service.id}:`, e);
      }
      
      return {
        ...service,
        clientName: client?.fullName || "Nepoznato",
        clientPhone: client?.phone || "",
        clientEmail: client?.email || "",
        clientAddress: client?.address || "",
        clientCity: client?.city || "",
        applianceName: category?.name || "Nepoznat uređaj",
        icon: category?.icon || "devices",
        technicianName: technician?.fullName || "",
        categoryName: category?.name || "",
        manufacturerName: appliance?.manufacturerId ? "Proizvođač ID:" + appliance.manufacturerId : "",
        model: appliance?.model || "",
        serialNumber: appliance?.serialNumber || "",
        purchaseDate: appliance?.purchaseDate || "",
        parsedUsedParts,
        createdBy: creator,
      };
    } catch (error) {
      console.error(`Greška pri obogaćivanju servisa #${service.id}:`, error);
      // Return basic service without additional data if there's an error
      return {
        ...service,
        clientName: "Greška u podacima",
        clientPhone: "",
        clientEmail: "",
        clientAddress: "",
        clientCity: "",
        applianceName: "Nepoznato",
        icon: "error",
        technicianName: "",
        categoryName: "",
        manufacturerName: "",
        model: "",
        serialNumber: "",
        purchaseDate: "",
        parsedUsedParts: [],
      };
    }
  });
  
  // Filter services based on search query, status and tab
  const filteredServices = enrichedServices?.filter(service => {
    // Search filter
    const matchesSearch = searchQuery === "" || 
      (service.clientName && service.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.applianceName && service.applianceName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.technicianName && service.technicianName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.id && service.id.toString().includes(searchQuery));
    
    // Status filter
    const matchesStatus = statusFilter === "all" || service.status === statusFilter;
    
    // Technician filter
    const matchesTechnician = technicianFilter === "all" || 
      (technicianFilter === 0 && !service.technicianId) ||
      service.technicianId === technicianFilter;
    
    // Tab filter
    let matchesTab = true;
    if (activeTab === "pending") {
      matchesTab = service.status === "pending";
    } else if (activeTab === "scheduled") {
      matchesTab = service.status === "scheduled";
    } else if (activeTab === "in_progress") {
      matchesTab = service.status === "in_progress";
    } else if (activeTab === "completed") {
      matchesTab = service.status === "completed";
    } else if (activeTab === "unassigned") {
      matchesTab = service.technicianId === null || service.technicianId === 0;
    }
    
    return matchesSearch && matchesStatus && matchesTechnician && matchesTab;
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
  
  // Get technicians for filter
  const technicianOptions = technicians ? [
    { value: "all", label: "Svi serviseri" },
    { value: "0", label: "Nedodeljeni" },
    ...technicians.map(tech => ({
      value: tech.id.toString(),
      label: tech.fullName
    }))
  ] : [];
  
  // Service form
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      clientId: 0,
      applianceId: 0,
      description: "",
      status: "pending",
      technicianId: 0,
      createdAt: new Date().toISOString().split('T')[0],
      scheduledDate: "",
      completedDate: "",
      technicianNotes: "",
      cost: "",
      usedParts: "[]",
      machineNotes: "",
      isCompletelyFixed: false,
      businessPartnerId: null,
      partnerCompanyName: null,
    },
  });
  
  // Create/Update service mutation
  const serviceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      // Convert usedParts to JSON string if it's not already
      if (data.usedParts && typeof data.usedParts !== 'string') {
        data.usedParts = JSON.stringify(data.usedParts);
      }
      
      console.log("Podaci za slanje:", data);
      if (selectedService) {
        // Update service
        const res = await apiRequest("PUT", `/api/services/${selectedService.id}`, data);
        return await res.json();
      } else {
        // Create new service
        const res = await apiRequest("POST", "/api/services", data);
        return await res.json();
      }
    },
    onSuccess: (data) => {
      console.log("Uspešno sačuvan servis:", data);
      
      // Invalidate service queries
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      
      // Invalidate stats and force refetch
      queryClient.invalidateQueries({ 
        queryKey: ["/api/stats"],
        refetchType: 'all'
      });
      
      // Show success toast with email notification info
      if (data?.emailSent) {
        toast({
          title: "✅ " + (selectedService ? "Servis uspešno ažuriran" : "Servis uspešno dodat"),
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
          title: "✅ " + (selectedService ? "Servis uspešno ažuriran" : "Servis uspešno dodat"),
          description: "Podaci o servisu su sačuvani.",
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
  
  // Assign technician mutation
  const assignTechnicianMutation = useMutation({
    mutationFn: async ({ serviceId, technicianId }: { serviceId: number, technicianId: number }) => {
      const res = await apiRequest("PUT", `/api/services/${serviceId}/assign-technician`, { technicianId });
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Uspešno dodeljen serviser:", data);
      
      // Invalidate service queries
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      
      toast({
        title: "✅ Serviser dodeljen",
        description: data.message || "Servis je uspešno dodeljen serviseru",
      });
    },
    onError: (error) => {
      console.error("Greška pri dodeljivanju servisera:", error);
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri dodeljivanju servisera",
        variant: "destructive",
      });
    },
  });
  
  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ serviceId, status }: { serviceId: number, status: string }) => {
      const res = await apiRequest("PUT", `/api/services/${serviceId}/update-status`, { status });
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Uspešno ažuriran status:", data);
      
      // Invalidate service queries
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      
      toast({
        title: "✅ Status ažuriran",
        description: data.message || "Status servisa je uspešno ažuriran",
      });
    },
    onError: (error) => {
      console.error("Greška pri ažuriranju statusa:", error);
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri ažuriranju statusa",
        variant: "destructive",
      });
    },
  });
  
  // Send SMS mutation
  const sendSmsMutation = useMutation({
    mutationFn: async ({ serviceId, message }: { serviceId: number, message: string }) => {
      const res = await apiRequest("POST", `/api/services/${serviceId}/send-sms`, { 
        message, 
        type: 'custom' 
      });
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("SMS uspešno poslat:", data);
      
      toast({
        title: "✅ SMS poslat",
        description: data.message || "SMS obaveštenje je uspešno poslato klijentu",
      });
      
      // Zatvori SMS dialog
      setIsSmsDialogOpen(false);
      setSmsMessage("");
      setSelectedServiceForSms(null);
    },
    onError: (error) => {
      console.error("Greška pri slanju SMS-a:", error);
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri slanju SMS-a",
        variant: "destructive",
      });
    },
  });
  
  // Create new client mutation
  const createClientMutation = useMutation({
    mutationFn: async (clientData: { fullName: string; phone: string; email?: string; address?: string; city?: string }) => {
      const res = await apiRequest("POST", "/api/clients", clientData);
      return await res.json();
    },
    onSuccess: (newClient) => {
      console.log("Novi klijent kreiran:", newClient);
      
      // Invalidate clients query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      
      // Set the newly created client as selected
      form.setValue("clientId", newClient.id);
      setSelectedClient(newClient.id);
      
      // Close the new client dialog
      setIsNewClientDialogOpen(false);
      
      toast({
        title: "✅ Klijent dodat",
        description: `Klijent ${newClient.fullName} je uspešno dodat u sistem.`,
      });
    },
    onError: (error) => {
      console.error("Greška pri kreiranju klijenta:", error);
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri dodavanju klijenta",
        variant: "destructive",
      });
    },
  });
  
  // Open dialog for adding new service
  const handleAddService = () => {
    setSelectedService(null);
    setSelectedClient(null);
    
    const defaultValues = {
      clientId: 0,
      applianceId: 0,
      description: "",
      status: "pending",
      technicianId: 0,
      createdAt: new Date().toISOString().split('T')[0],
      scheduledDate: null,
      completedDate: null,
      technicianNotes: null,
      cost: null,
      usedParts: "[]",
      machineNotes: null,
      isCompletelyFixed: false,
      businessPartnerId: null,
      partnerCompanyName: null,
    };
    
    form.reset(defaultValues);
    setIsDialogOpen(true);
  };
  
  // Open dialog for editing service
  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setSelectedClient(service.clientId);
    
    const editValues = {
      clientId: service.clientId,
      applianceId: service.applianceId,
      description: service.description,
      status: service.status,
      technicianId: service.technicianId || 0,
      createdAt: service.createdAt,
      scheduledDate: service.scheduledDate || null,
      completedDate: service.completedDate || null,
      technicianNotes: service.technicianNotes || null,
      cost: service.cost || null,
      usedParts: service.usedParts || "[]",
      machineNotes: service.machineNotes || null,
      isCompletelyFixed: service.isCompletelyFixed || false,
      businessPartnerId: service.businessPartnerId || null,
      partnerCompanyName: service.partnerCompanyName || null,
    };
    
    form.reset(editValues);
    setIsDialogOpen(true);
  };
  
  // Open dialog for viewing service details
  const handleViewService = (service: typeof enrichedServices[0]) => {
    setSelectedService(service);
    setIsViewDialogOpen(true);
  };
  
  // Open SMS dialog
  const handleSendSms = (service: typeof enrichedServices[0]) => {
    setSelectedServiceForSms(service);
    setSmsMessage(`Frigo Sistem: Obaveštenje o servisu #${service.id}. Kontakt: 033 402 402`);
    setIsSmsDialogOpen(true);
  };
  
  // Handle SMS form submission
  const handleSmsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceForSms || !smsMessage.trim()) return;
    
    sendSmsMutation.mutate({
      serviceId: selectedServiceForSms.id,
      message: smsMessage.trim()
    });
  };

  // Handle client change in form
  const handleClientChange = (clientId: string) => {
    if (clientId === "new_client") {
      // Open new client dialog
      setIsNewClientDialogOpen(true);
      return;
    }
    
    const clientIdNum = parseInt(clientId);
    setSelectedClient(clientIdNum);
    
    // Reset appliance selection
    form.setValue("applianceId", 0, { shouldValidate: false });
    
    // Set client ID in form
    form.setValue("clientId", clientIdNum, { shouldValidate: true });
  };
  
  // Assign technician to service
  const handleAssignTechnician = (serviceId: number, technicianId: number) => {
    assignTechnicianMutation.mutate({ serviceId, technicianId });
  };
  
  // Update service status
  const handleUpdateStatus = (serviceId: number, status: string) => {
    updateStatusMutation.mutate({ serviceId, status });
  };
  
  // Submit service form
  const onSubmit = (data: ServiceFormValues) => {
    serviceMutation.mutate(data);
  };

  // Stats for service count per status
  const statusStats = services?.reduce((acc, service) => {
    const status = service.status as string;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const unassignedCount = services?.filter(s => !s.technicianId).length || 0;
  
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
            
            {/* Status tabs */}
            <Tabs defaultValue="all" className="mb-6" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full h-auto">
                <TabsTrigger value="all" className="text-xs sm:text-sm py-2 px-2">
                  Svi
                  {!isDataLoading && <Badge variant="outline" className="ml-2 text-xs">{services?.length || 0}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs sm:text-sm py-2 px-2">
                  Na čekanju
                  {!isDataLoading && <Badge variant="outline" className="ml-2 text-xs">{statusStats?.pending || 0}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="text-xs sm:text-sm py-2 px-2">
                  Zakazano
                  {!isDataLoading && <Badge variant="outline" className="ml-2 text-xs">{statusStats?.scheduled || 0}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="in_progress" className="text-xs sm:text-sm py-2 px-2">
                  U toku
                  {!isDataLoading && <Badge variant="outline" className="ml-2 text-xs">{statusStats?.in_progress || 0}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm py-2 px-2">
                  Završeno
                  {!isDataLoading && <Badge variant="outline" className="ml-2 text-xs">{statusStats?.completed || 0}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="unassigned" className="text-xs sm:text-sm py-2 px-2">
                  Nedodeljeni
                  {!isDataLoading && <Badge variant="outline" className="ml-2 text-xs">{unassignedCount}</Badge>}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Search and filter */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative md:col-span-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Pretraga (ID, klijent, opis...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <Filter className="h-4 w-4 mr-2" />
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
                  <div className="relative">
                    <Select 
                      value={typeof technicianFilter === "number" ? technicianFilter.toString() : technicianFilter} 
                      onValueChange={(value) => setTechnicianFilter(value === "all" ? "all" : parseInt(value))}
                    >
                      <SelectTrigger>
                        <User className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Serviser" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicianOptions.map((option) => (
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
                {isDataLoading ? (
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
                          <TableHead>Uređaj</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Serviser</TableHead>
                          <TableHead>Kreirao</TableHead>
                          <TableHead>Datum prijave</TableHead>
                          <TableHead>Akcije</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredServices?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                              {searchQuery || statusFilter !== "all" || technicianFilter !== "all" || activeTab !== "all"
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
                                  <span className="font-medium">{service.clientName}</span>
                                  <span className="text-xs text-gray-500">{service.clientPhone}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="mr-2">{service.applianceName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(service.status)}
                            </TableCell>
                            <TableCell>
                              {service.technicianName ? (
                                <div className="flex items-center">
                                  <div className={`w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mr-2`}>
                                    <span className="text-xs font-medium">{getUserInitials(service.technicianName)}</span>
                                  </div>
                                  <span>{service.technicianName}</span>
                                </div>
                              ) : (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <User className="h-3 w-3 mr-1" />
                                      Dodeli
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-56 p-0" align="start">
                                    <Command>
                                      <CommandList>
                                        <CommandGroup>
                                          {technicians?.map(tech => (
                                            <CommandItem
                                              key={tech.id}
                                              onSelect={() => handleAssignTechnician(service.id, tech.id)}
                                            >
                                              {tech.fullName}
                                              {tech.specialization && (
                                                <Badge variant="outline" className="ml-2 text-xs">
                                                  {tech.specialization}
                                                </Badge>
                                              )}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal">
                                {service.businessPartnerId 
                                  ? service.partnerCompanyName || "Poslovni partner" 
                                  : "Admin"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(service.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleViewService(service)}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  Detalji
                                </Button>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <ArrowRight className="h-3 w-3 mr-1" />
                                      Status
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-56 p-0" align="end">
                                    <Command>
                                      <CommandList>
                                        <CommandGroup>
                                          {serviceStatusEnum.options.map(status => (
                                            <CommandItem
                                              key={status}
                                              onSelect={() => handleUpdateStatus(service.id, status)}
                                              disabled={service.status === status}
                                            >
                                              {getStatusBadge(status)}
                                              {service.status === status && (
                                                <Check className="h-4 w-4 ml-auto" />
                                              )}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                <Button variant="outline" size="sm" onClick={() => handleEditService(service)}>
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Izmeni
                                </Button>
                                {service.clientPhone && (
                                  <Button variant="outline" size="sm" onClick={() => handleSendSms(service)}>
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    SMS
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-sm text-gray-500">
                  Prikazano {filteredServices?.length || 0} od {services?.length || 0} servisa
                </div>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
      
      {/* Service Edit/Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedService ? "Izmena servisa" : "Dodavanje novog servisa"}
            </DialogTitle>
            <DialogDescription>
              Popunite detalje servisa i kliknite na dugme "Sačuvaj" da biste sačuvali promene.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Client and Appliance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Klijent</FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={handleClientChange}
                        disabled={selectedService !== null}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberite klijenta" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          <SelectItem value="0">Izaberite klijenta</SelectItem>
                          <SelectItem value="new_client" className="text-blue-600 font-medium">
                            + Dodaj novog klijenta
                          </SelectItem>
                          {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.fullName} {client.phone && `(${client.phone})`}
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
                        value={field.value.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        disabled={!selectedClient || selectedService !== null}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberite uređaj" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          <SelectItem value="0">Izaberite uređaj</SelectItem>
                          {filteredAppliances?.map((appliance) => {
                            const category = categories?.find(c => c.id === appliance.categoryId);
                            return (
                              <SelectItem key={appliance.id} value={appliance.id.toString()}>
                                {category?.name || "Nepoznat tip"} - {appliance.model || "Bez modela"}
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
              
              {/* Status and Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberite status" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableStatusOptions(selectedService?.status, !selectedService).map((status) => (
                            <SelectItem key={status} value={status}>
                              {getStatusBadge(status)}
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Datum prijave</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full flex justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? formatDate(field.value) : "Izaberite datum"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                            locale={srLatn}
                            disabled={(date) => date > new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Dodela servisera - dostupno administratorima */}
                {isAdmin ? (
                  <FormField
                    control={form.control}
                    name="technicianId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serviser</FormLabel>
                        <Select
                          value={field.value ? field.value.toString() : "0"}
                          onValueChange={(value) => field.onChange(parseInt(value) || null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite servisera" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Nedodeljen</SelectItem>
                            {technicians?.map((tech) => (
                              <SelectItem key={tech.id} value={tech.id.toString()}>
                                {tech.fullName}
                                {tech.specialization && ` (${tech.specialization})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>
              
              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis problema</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detaljno opišite problem" 
                        {...field} 
                        className="min-h-24"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Datum zakazivanja - samo za administratore i zakazane servise */}
              {isAdmin && selectedService && selectedService.status === "scheduled" ? (
                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Datum zakazivanja</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full flex justify-start text-left font-normal"
                              >
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {field.value ? formatDate(field.value) : "Izaberite datum"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                              locale={srLatn}
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Datum kada je servis zakazan
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}

              {/* Datum završetka - samo za završene servise */}
              {selectedService && selectedService.status === "completed" ? (
                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="completedDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Datum završetka</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full flex justify-start text-left font-normal"
                              >
                                <Check className="mr-2 h-4 w-4" />
                                {field.value ? formatDate(field.value) : "Izaberite datum"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                              locale={srLatn}
                              disabled={(date) => date > new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Datum kada je servis završen
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}
              
              {/* Polja za servisera - dostupna samo serviseru i samo za postojeće servise */}
              {isTechnician && selectedService && ["in_progress", "waiting_parts", "completed"].includes(selectedService.status) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="technicianNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Napomene servisera</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Napomene servisera" 
                            {...field} 
                            value={field.value || ""}
                            className="min-h-20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cena</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Cena servisa" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  
                    {/* Polje "potpuno popravljeno" samo za završene servise */}
                    {selectedService?.status === "completed" && (
                      <FormField
                        control={form.control}
                        name="isCompletelyFixed"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-6">
                            <FormControl>
                              <Checkbox
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Potpuno popravljeno</FormLabel>
                              <FormDescription>
                                Označite ako je uređaj u potpunosti popravljen
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              ) : null}
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Otkaži
                </Button>
                <Button 
                  type="submit" 
                  disabled={serviceMutation.isPending}
                >
                  {serviceMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Sačuvaj
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Service View Dialog */}
      {selectedService && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Servis #{selectedService.id}
                <Badge className="ml-3">
                  {getStatusBadge(selectedService.status)}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Pregled detalja servisa
              </DialogDescription>
              {selectedService.businessPartnerId && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Kreirao: {selectedService.partnerCompanyName || "Poslovni partner"}
                  </Badge>
                </div>
              )}
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Client and Appliance Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Podaci o klijentu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <dl className="space-y-2 text-sm">
                      <div className="flex flex-col">
                        <dt className="text-gray-500">Ime</dt>
                        <dd className="font-medium">{selectedService.clientName}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-gray-500">Telefon</dt>
                        <dd>{selectedService.clientPhone || "-"}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-gray-500">Email</dt>
                        <dd>{selectedService.clientEmail || "-"}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-gray-500">Adresa</dt>
                        <dd>{selectedService.clientAddress || "-"}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-gray-500">Grad</dt>
                        <dd>{selectedService.clientCity || "-"}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Wrench className="h-4 w-4 mr-2" />
                      Podaci o uređaju
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <dl className="space-y-2 text-sm">
                      <div className="flex flex-col">
                        <dt className="text-gray-500">Tip uređaja</dt>
                        <dd className="font-medium">{selectedService.applianceName}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-gray-500">Proizvođač</dt>
                        <dd>{selectedService.manufacturerName || "-"}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-gray-500">Model</dt>
                        <dd>{selectedService.model || "-"}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-gray-500">Serijski broj</dt>
                        <dd>{selectedService.serialNumber || "-"}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-gray-500">Datum kupovine</dt>
                        <dd>{selectedService.purchaseDate ? formatDate(selectedService.purchaseDate) : "-"}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </div>
              
              {/* Service Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Wrench className="h-4 w-4 mr-2" />
                    Podaci o servisu
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div className="flex flex-col">
                        <dt className="text-gray-500 text-sm">Serviser</dt>
                        <dd className="font-medium">
                          {selectedService.technicianName ? (
                            <div className="flex items-center">
                              <div className={`w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mr-2`}>
                                <span className="text-xs font-medium">{getUserInitials(selectedService.technicianName)}</span>
                              </div>
                              <span>{selectedService.technicianName}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Nije dodeljen</span>
                          )}
                        </dd>
                      </div>
                      
                      <div className="flex flex-col">
                        <dt className="text-gray-500 text-sm">Datum prijave</dt>
                        <dd>{formatDate(selectedService.createdAt)}</dd>
                      </div>
                      
                      <div className="flex flex-col">
                        <dt className="text-gray-500 text-sm">Zakazano za</dt>
                        <dd>{selectedService.scheduledDate ? formatDate(selectedService.scheduledDate) : "-"}</dd>
                      </div>
                      
                      <div className="flex flex-col">
                        <dt className="text-gray-500 text-sm">Datum završetka</dt>
                        <dd>{selectedService.completedDate ? formatDate(selectedService.completedDate) : "-"}</dd>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-1">Opis problema</h3>
                        <div className="bg-gray-50 rounded-md p-3 text-sm">
                          {selectedService.description || "Nema opisa"}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-1">Napomene servisera</h3>
                        <div className="bg-gray-50 rounded-md p-3 text-sm">
                          {selectedService.technicianNotes || "Nema napomena"}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">Korišćeni delovi</h3>
                          <div className="bg-gray-50 rounded-md p-3 text-sm">
                            {selectedService.parsedUsedParts && selectedService.parsedUsedParts.length > 0 ? (
                              <ul className="list-disc list-inside space-y-1">
                                {selectedService.parsedUsedParts.map((part: string, index: number) => (
                                  <li key={index}>{part}</li>
                                ))}
                              </ul>
                            ) : (
                              "Nisu korišćeni rezervni delovi"
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">Cena</h3>
                          <div className="bg-gray-50 rounded-md p-3 text-sm font-semibold">
                            {selectedService.cost ? (
                              <>{selectedService.cost} €</>
                            ) : (
                              "Nije definisana"
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                {selectedService.businessPartnerId && (
                  <div className="px-6 pb-4">
                    <Separator className="mb-4" />
                    <div className="flex items-center">
                      <div className="text-sm text-yellow-600 font-medium">
                        <span className="mr-2">🏢</span>
                        Kreirao poslovni partner: {selectedService.partnerCompanyName || "Nepoznato"}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
            
            <DialogFooter className="pt-4 gap-2">
              <Button
                onClick={() => setIsViewDialogOpen(false)}
                variant="outline"
              >
                Zatvori
              </Button>
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEditService(selectedService);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Izmeni
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* New Client Dialog */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj novog klijenta</DialogTitle>
            <DialogDescription>
              Unesite podatke o novom klijentu. Polja označena sa * su obavezna.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const clientData = {
              fullName: formData.get('fullName') as string,
              phone: formData.get('phone') as string,
              email: formData.get('email') as string || undefined,
              address: formData.get('address') as string || undefined,
              city: formData.get('city') as string || undefined,
            };
            
            if (!clientData.fullName.trim() || !clientData.phone.trim()) {
              toast({
                title: "Greška",
                description: "Ime i telefon su obavezna polja",
                variant: "destructive",
              });
              return;
            }
            
            createClientMutation.mutate(clientData);
          }} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Ime i prezime *
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Unesite ime i prezime klijenta"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="067/123-456"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="klijent@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresa
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ulica i broj"
                />
              </div>
              
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  Grad
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Podgorica"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewClientDialogOpen(false)}
                disabled={createClientMutation.isPending}
              >
                Otkaži
              </Button>
              <Button
                type="submit"
                disabled={createClientMutation.isPending}
              >
                {createClientMutation.isPending ? "Dodavanje..." : "Dodaj klijenta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* SMS Dialog */}
      <SmsDialog
        isOpen={isSmsDialogOpen}
        onClose={() => {
          setIsSmsDialogOpen(false);
          setSmsMessage("");
          setSelectedServiceForSms(null);
        }}
        service={selectedServiceForSms}
        message={smsMessage}
        setMessage={setSmsMessage}
        onSend={handleSmsSubmit}
        isLoading={sendSmsMutation.isPending}
      />
    </div>
  );
}

// Command component for popover
const Command = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-gray-200">
      {children}
    </div>
  );
};

const CommandList = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="max-h-52 overflow-auto py-2">
      {children}
    </div>
  );
};

const CommandGroup = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="overflow-hidden">
      {children}
    </div>
  );
};

const CommandItem = ({ 
  children, 
  onSelect, 
  disabled 
}: { 
  children: React.ReactNode, 
  onSelect: () => void,
  disabled?: boolean 
}) => {
  return (
    <button
      className={`flex w-full items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onSelect}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// SMS Dialog Component
const SmsDialog = ({
  isOpen,
  onClose,
  service,
  message,
  setMessage,
  onSend,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
  message: string;
  setMessage: (message: string) => void;
  onSend: (e: React.FormEvent) => void;
  isLoading: boolean;
}) => {
  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pošaljite SMS</DialogTitle>
          <DialogDescription>
            Servis #{service.id} - {service.clientName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSend} className="space-y-4">
          <div>
            <label htmlFor="sms-message" className="block text-sm font-medium text-gray-700 mb-2">
              Poruka
            </label>
            <Textarea
              id="sms-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Unesite poruku..."
              className="min-h-[100px]"
              required
            />
            <div className="text-sm text-gray-500 mt-1">
              Maksimalno 160 karaktera
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Otkaži
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Šalje se...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Pošalji SMS
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



