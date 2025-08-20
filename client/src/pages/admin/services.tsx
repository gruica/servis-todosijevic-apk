import { useState, useEffect, memo, useReducer, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useNotification } from "@/contexts/notification-context";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  Calendar,
  Clock,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  MapPin,
  User,
  Package,
  Wrench,
  FileText,
  DollarSign,
  CheckSquare,
  Play,
  Pause,
  Filter,
  Building
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { AdminSparePartsOrderingSimple } from "@/components/admin/AdminSparePartsOrderingSimple";
import { ServicePhotos } from "@/components/ServicePhotos";

import { PhotoDebugTest } from "@/components/PhotoDebugTest";

interface AdminService {
  id: number;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  scheduledDate: string | null;
  technicianId: number | null;
  clientId: number;
  applianceId: number;
  priority: string;
  notes: string | null;
  technicianNotes: string | null;
  usedParts: string | null;
  machineNotes: string | null;
  cost: string | null;
  isCompletelyFixed: boolean;
  businessPartnerId: number | null;
  partnerCompanyName: string | null;
  devicePickedUp?: boolean;
  pickupDate?: string | null;
  pickupNotes?: string | null;
  isWarrantyService?: boolean;
  client: {
    id: number;
    fullName: string;
    phone: string;
    email: string | null;
    address: string | null;
    city: string | null;
    companyName: string | null;
  };
  appliance: {
    id: number;
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
  };
  technician: {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    specialization: string;
  } | null;
}

interface Technician {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
}

// Service folder system - organizovan po kategorijama
interface ServiceFolder {
  id: string;
  title: string;
  description: string;
  icon: any;
  badgeColor: string;
  filter: (service: AdminService) => boolean;
  count?: number;
}

// Optimized state management with useReducer
interface FilterState {
  searchQuery: string;
  activeFolder: string;
}

interface DialogState {
  selectedService: AdminService | null;
  isDetailsOpen: boolean;
  isEditOpen: boolean;
  isDeleteOpen: boolean;
  isReturnOpen: boolean;
  isSparePartsOpen: boolean;
  returnReason: string;
  returnNotes: string;
}

type FilterAction = 
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_ACTIVE_FOLDER'; payload: string }
  | { type: 'RESET_FILTERS' };

type DialogAction =
  | { type: 'SET_SELECTED_SERVICE'; payload: AdminService | null }
  | { type: 'OPEN_DETAILS'; payload: AdminService }
  | { type: 'OPEN_EDIT'; payload: AdminService }
  | { type: 'OPEN_DELETE'; payload: AdminService }
  | { type: 'OPEN_RETURN'; payload: AdminService }
  | { type: 'OPEN_SPARE_PARTS'; payload: AdminService }
  | { type: 'CLOSE_ALL' }
  | { type: 'SET_RETURN_REASON'; payload: string }
  | { type: 'SET_RETURN_NOTES'; payload: string };

const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_ACTIVE_FOLDER':
      return { ...state, activeFolder: action.payload };
    case 'RESET_FILTERS':
      return {
        searchQuery: "",
        activeFolder: "active"
      };
    default:
      return state;
  }
};

const dialogReducer = (state: DialogState, action: DialogAction): DialogState => {
  switch (action.type) {
    case 'SET_SELECTED_SERVICE':
      return { ...state, selectedService: action.payload };
    case 'OPEN_DETAILS':
      return { ...state, selectedService: action.payload, isDetailsOpen: true };
    case 'OPEN_EDIT':
      return { ...state, selectedService: action.payload, isEditOpen: true };
    case 'OPEN_DELETE':
      return { ...state, selectedService: action.payload, isDeleteOpen: true };
    case 'OPEN_RETURN':
      return { ...state, selectedService: action.payload, isReturnOpen: true };
    case 'OPEN_SPARE_PARTS':
      return { ...state, selectedService: action.payload, isSparePartsOpen: true };
    case 'CLOSE_ALL':
      return {
        ...state,
        isDetailsOpen: false,
        isEditOpen: false,
        isDeleteOpen: false,
        isReturnOpen: false,
        isSparePartsOpen: false,
        returnReason: "",
        returnNotes: ""
      };
    case 'SET_RETURN_REASON':
      return { ...state, returnReason: action.payload };
    case 'SET_RETURN_NOTES':
      return { ...state, returnNotes: action.payload };
    default:
      return state;
  }
};

const AdminServices = memo(function AdminServices() {
  const [location, navigate] = useLocation();
  
  // Optimized state management with useReducer - default to active services
  const [filterState, dispatchFilter] = useReducer(filterReducer, {
    searchQuery: "",
    activeFolder: "active"  // Default se prikazuju aktivni servisi
  });
  
  const [dialogState, dispatchDialog] = useReducer(dialogReducer, {
    selectedService: null,
    isDetailsOpen: false,
    isEditOpen: false,
    isDeleteOpen: false,
    isReturnOpen: false,
    isSparePartsOpen: false,
    returnReason: "",
    returnNotes: ""
  });

  // Destructure state for easier access
  const { searchQuery, activeFolder } = filterState;
  const { selectedService, isDetailsOpen, isEditOpen, isDeleteOpen, isReturnOpen, isSparePartsOpen, returnReason, returnNotes } = dialogState;
  
  // Koristi notification context
  const { highlightedServiceId, setHighlightedServiceId, clearHighlight, shouldAutoOpen, setShouldAutoOpen } = useNotification();
  
  // Definicija service foldera - organizovani po nameni
  const serviceFolders: ServiceFolder[] = [
    {
      id: "active",
      title: "Aktivni servisi",
      description: "Servisi u toku, zakazani i čekaju rezervne delove",
      icon: Play,
      badgeColor: "bg-blue-500",
      filter: (service) => ["pending", "scheduled", "in_progress", "waiting_parts", "device_parts_removed"].includes(service.status)
    },
    {
      id: "business_partners",
      title: "Poslovni partneri",
      description: "Servisi inicirani od strane poslovnih partnera",
      icon: Building,
      badgeColor: "bg-purple-500",
      filter: (service) => service.businessPartnerId !== null && service.businessPartnerId !== undefined
    },
    {
      id: "beko_billing",
      title: "Beko Fakturisanje",
      description: "Beko uređaji servisirani u garantnom roku - za fakturisanje",
      icon: DollarSign,
      badgeColor: "bg-red-600",
      filter: (service) => {
        // Proveri da li je servis za Beko uređaj
        const isBekoService = service.appliance?.manufacturer?.name?.toLowerCase().includes('beko');
        // Proveri da li je garantni servis 
        const isWarrantyService = (service as any).isWarrantyService === true;
        // Filtriranje samo završenih servisa
        const isCompleted = ["completed", "delivered", "device_returned"].includes(service.status);
        

        
        return isBekoService && isWarrantyService && isCompleted;
      }
    },
    {
      id: "completed",
      title: "Završeni servisi",
      description: "Kompletno završeni i dostavljeni servisi",
      icon: CheckCircle,
      badgeColor: "bg-green-500",
      filter: (service) => ["completed", "delivered", "device_returned"].includes(service.status)
    },
    {
      id: "cancelled",
      title: "Otkazani/Problematični",
      description: "Otkazani servisi, kupac odbija, neuspešni servisi",
      icon: XCircle,
      badgeColor: "bg-red-500",
      filter: (service) => ["cancelled", "customer_refuses_repair", "customer_refused_repair", "repair_failed", "client_not_home", "client_not_answering"].includes(service.status)
    },
    {
      id: "all",
      title: "Svi servisi",
      description: "Kompletan pregled svih servisa u sistemu",
      icon: FileText,
      badgeColor: "bg-gray-500",
      filter: () => true
    }
  ];

  // Check URL parameters for automatic filtering
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const folderParam = params.get('folder');
    
    if (folderParam && serviceFolders.find(f => f.id === folderParam)) {
      dispatchFilter({ type: 'SET_ACTIVE_FOLDER', payload: folderParam });
    }
  }, []);
  

  
  const { toast } = useToast();

  // Transform flat API response to nested AdminService structure
  const transformApiService = (apiService: any): AdminService => {
    return {
      id: apiService.id,
      status: apiService.status,
      description: apiService.description,
      createdAt: apiService.createdAt,
      updatedAt: apiService.updatedAt || apiService.createdAt,
      scheduledDate: apiService.scheduledDate,
      technicianId: apiService.technicianId,
      clientId: apiService.clientId,
      applianceId: apiService.applianceId,
      priority: apiService.priority || 'normal',
      notes: apiService.notes,
      technicianNotes: apiService.technicianNotes,
      usedParts: apiService.usedParts,
      machineNotes: apiService.machineNotes,
      cost: apiService.cost,
      isCompletelyFixed: apiService.isCompletelyFixed,
      businessPartnerId: apiService.businessPartnerId,
      partnerCompanyName: apiService.partnerCompanyName,
      devicePickedUp: apiService.devicePickedUp,
      pickupDate: apiService.pickupDate,
      pickupNotes: apiService.pickupNotes,
      isWarrantyService: apiService.isWarrantyService,
      client: {
        id: apiService.clientId,
        fullName: apiService.clientName || 'Nepoznat klijent',
        phone: apiService.clientPhone || '',
        email: apiService.clientEmail || null,
        address: apiService.clientAddress || null,
        city: apiService.clientCity || null,
        companyName: apiService.clientCompanyName || null
      },
      appliance: {
        id: apiService.applianceId,
        model: apiService.applianceName || null,
        serialNumber: apiService.applianceSerialNumber || null,
        category: {
          id: 0, // API ne vraća category ID
          name: apiService.categoryName || 'Nepoznat uređaj',
          icon: 'device'
        },
        manufacturer: {
          id: 0, // API ne vraća manufacturer ID
          name: apiService.manufacturerName || 'Nepoznat proizvođač'
        }
      },
      technician: apiService.technicianId ? {
        id: apiService.technicianId,
        fullName: apiService.technicianName || 'Nepoznat serviser',
        email: '',
        phone: '',
        specialization: ''
      } : null
    };
  };

  // Optimized React Query with selective invalidation and data transformation
  const { data: rawServices = [], isLoading: loadingServices, refetch, error } = useQuery<any[]>({
    queryKey: ["/api/services"],
    staleTime: 10 * 60 * 1000, // Extended to 10 minutes for better performance
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  // Transform raw API data to AdminService format
  const services: AdminService[] = rawServices.map(transformApiService);

  // Automatski otvara detalje servisa kada se dolazi sa notifikacije
  useEffect(() => {
    if (highlightedServiceId && shouldAutoOpen && services.length > 0) {
      const targetService = services.find(service => service.id === highlightedServiceId);
      if (targetService) {
        // Automatski otvara servis detalje
        dispatchDialog({ type: 'OPEN_DETAILS', payload: targetService });
        
        // Čisti state posle otvaranja da se izbegnu duplikati
        setShouldAutoOpen(false);
        history.replaceState(null, '', '/admin/services');
      }
    }
  }, [services, highlightedServiceId, shouldAutoOpen, setShouldAutoOpen]);



  // Fetch technicians
  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<AdminService> }) => {
      const response = await apiRequest(`/api/services/${data.id}`, { 
        method: "PUT",
        body: JSON.stringify(data.updates)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno ažuriran",
        description: "Servis je uspešno ažuriran.",
      });
      // Optimized: Single targeted invalidation
      queryClient.invalidateQueries({ queryKey: ["/api/services"], exact: true });
      dispatchDialog({ type: 'CLOSE_ALL' });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri ažuriranju servisa.",
        variant: "destructive",
      });
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/services/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({
        title: "Uspešno obrisano",
        description: "Servis je uspešno obrisan.",
      });
      // Optimized: Single targeted invalidation
      queryClient.invalidateQueries({ queryKey: ["/api/services"], exact: true });
      dispatchDialog({ type: 'CLOSE_ALL' });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri brisanju servisa.",
        variant: "destructive",
      });
    },
  });

  const returnServiceMutation = useMutation({
    mutationFn: async (data: { serviceId: number; reason: string; notes: string }) => {
      await apiRequest(`/api/services/${data.serviceId}/return-from-technician`, {
        method: "POST",
        body: JSON.stringify({
          reason: data.reason,
          notes: data.notes
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspešno vraćeno",
        description: "Servis je uspešno vraćen od tehnčara u admin bazu.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      dispatchDialog({ type: 'CLOSE_ALL' });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri vraćanju servisa.",
        variant: "destructive",
      });
    },
  });

  // Assign technician mutation
  const assignTechnicianMutation = useMutation({
    mutationFn: async (data: { serviceId: number; technicianId: number }) => {
      const response = await apiRequest(`/api/services/${data.serviceId}/assign-technician`, {
        method: "PUT",
        body: JSON.stringify({
          technicianId: data.technicianId,
        })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno dodeljeno",
        description: "Serviser je uspešno dodeljen servisu.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri dodeli servisera.",
        variant: "destructive",
      });
    },
  });

  // Folder-based filtering - organizovani servisi po kategorijama
  const getCurrentFolder = () => serviceFolders.find(f => f.id === activeFolder) || serviceFolders[0];
  
  const filteredServices = services.filter((service) => {
    try {
      // Prvo primeni folder filter (glavna kategorija)
      const currentFolder = getCurrentFolder();
      const matchesFolder = currentFolder.filter(service);
      
      // Zatim primeni pretragu unutar foldera
      const matchesSearch = searchQuery === "" || 
        service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.client?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.appliance?.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.id?.toString().includes(searchQuery);
      
      return matchesFolder && matchesSearch;
    } catch (error) {
      // Error handled silently
      return false;
    }
  });

  // Update folder counts
  const foldersWithCounts = serviceFolders.map(folder => ({
    ...folder,
    count: services.filter(service => folder.filter(service)).length
  }));

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Na čekanju", variant: "secondary" as const, icon: Clock },
      assigned: { label: "Dodeljeno", variant: "default" as const, icon: User },
      scheduled: { label: "Zakazano", variant: "outline" as const, icon: Calendar },
      in_progress: { label: "U toku", variant: "default" as const, icon: Play },
      completed: { label: "Završeno", variant: "default" as const, icon: CheckCircle },
      cancelled: { label: "Otkazano", variant: "destructive" as const, icon: XCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: "Nizak", variant: "secondary" as const },
      medium: { label: "Srednji", variant: "default" as const },
      high: { label: "Visok", variant: "destructive" as const },
      urgent: { label: "Hitno", variant: "destructive" as const },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  // Handle service details
  const handleViewDetails = useCallback((service: AdminService) => {
    dispatchDialog({ type: 'OPEN_DETAILS', payload: service });
  }, []);

  // Handle edit service
  const handleEditService = (service: AdminService) => {
    dispatchDialog({ type: 'OPEN_EDIT', payload: service });
  };

  // Handle delete service
  const handleDeleteService = (service: AdminService) => {
    dispatchDialog({ type: 'OPEN_DELETE', payload: service });
  };

  // Handle return service from technician
  const handleReturnService = (service: AdminService) => {
    dispatchDialog({ type: 'OPEN_RETURN', payload: service });
  };

  // Handle assign technician
  const handleAssignTechnician = (serviceId: number, technicianId: number) => {
    // Don't assign if placeholder value is selected
    if (technicianId === 0) return;
    assignTechnicianMutation.mutate({ serviceId, technicianId });
  };

  // Handle loading state
  if (loadingServices) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Učitavanje servisa...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Handle error state
  if (error) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-red-600 mb-2">Greška pri učitavanju servisa</p>
              <p className="text-muted-foreground mb-4">Molimo pokušajte ponovo.</p>
              <Button onClick={() => refetch()} variant="outline">
                Pokušaj ponovo
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Statistics
  const stats = {
    total: services.length,
    pending: services.filter(s => s.status === "pending").length,
    inProgress: services.filter(s => s.status === "in_progress").length,
    completed: services.filter(s => s.status === "completed").length,
    unassigned: services.filter(s => !s.technicianId).length,
    pickedUp: services.filter(s => s.devicePickedUp).length,
    businessPartner: services.filter(s => s.businessPartnerId).length,
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Upravljanje servisima</h1>
            <p className="text-muted-foreground mt-1">
              Kompletan pregled i upravljanje svim servisima
            </p>
          </div>
          <div className="flex gap-3">
            <AdminSparePartsOrderingSimple />
            <Button 
              onClick={() => window.location.href = '/admin/create-service'} 
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj novi servis
            </Button>
          </div>
        </div>

        {/* Service Folders - Tab Navigation System */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Folderi servisa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeFolder} onValueChange={(value) => {
              // Specijalnan handling za Beko Fakturisanje folder
              if (value === 'beko_billing') {
                window.location.href = '/admin/beko-billing';
                return;
              }
              dispatchFilter({ type: 'SET_ACTIVE_FOLDER', payload: value });
            }}>
              <TabsList className="grid w-full grid-cols-5 mb-4">
                {foldersWithCounts.map((folder) => {
                  const IconComponent = folder.icon;
                  return (
                    <TabsTrigger key={folder.id} value={folder.id} className="flex items-center gap-2 text-xs">
                      <IconComponent className="h-3 w-3" />
                      <span className="hidden sm:inline">{folder.title}</span>
                      <Badge variant="secondary" className={`ml-1 ${folder.badgeColor} text-white text-xs`}>
                        {folder.count}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              
              {/* Current Folder Description */}
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const IconComponent = getCurrentFolder().icon;
                    return <IconComponent className="h-4 w-4 text-primary" />;
                  })()}
                  <h3 className="font-medium">{getCurrentFolder().title}</h3>
                  <Badge variant="outline">{filteredServices.length} servisa</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{getCurrentFolder().description}</p>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Simple Search within Current Folder */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Pretraži unutar foldera "${getCurrentFolder().title}"...`}
                    value={searchQuery}
                    onChange={(e) => dispatchFilter({ type: 'SET_SEARCH', payload: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Prikazano {filteredServices.length} servisa
              </div>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => dispatchFilter({ type: 'SET_SEARCH', payload: '' })}
                >
                  Obriši pretragu
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kompaktni Services Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Servisi</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingServices ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ScrollArea className="h-[700px]">
                <div className="space-y-2">
                  {filteredServices.map((service) => (
                    <Card 
                      key={service.id} 
                      className={cn(
                        "p-3 hover:bg-gray-50 transition-all duration-500",
                        highlightedServiceId === service.id && "bg-blue-50 ring-2 ring-blue-200 animate-pulse"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        {/* Kompaktni prikaz osnovnih informacija */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                          {/* ID i Status */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">#{service.id}</Badge>
                            {getStatusBadge(service.status)}
                            {service.devicePickedUp && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300 text-xs">
                                <Package className="h-3 w-3 mr-1" />
                                Preuzet
                              </Badge>
                            )}
                          </div>
                          
                          {/* Klijent */}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{service.client?.fullName || 'Nepoznat klijent'}</p>
                            {service.client?.city && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {service.client.city}
                              </p>
                            )}
                          </div>
                          
                          {/* Poslovni partner */}
                          <div className="min-w-0">
                            {service.businessPartnerId ? (
                              <div>
                                <p className="text-sm truncate font-medium text-blue-600">
                                  {service.partnerCompanyName || "Poslovni partner"}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  Partner ID: {service.businessPartnerId}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm text-muted-foreground">Direktan zahtev</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Admin kreiran
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Uređaj */}
                          <div className="min-w-0">
                            <p className="text-sm truncate">{service.appliance?.category?.name || 'Nepoznat uređaj'}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {service.appliance?.manufacturer?.name || 'Nepoznat proizvođač'} {service.appliance?.model || ''}
                            </p>
                          </div>
                          
                          {/* Serviser */}
                          <div className="min-w-0">
                            {service.technician ? (
                              <div>
                                <p className="text-sm truncate">{service.technician?.fullName || 'Nepoznat serviser'}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {service.technician?.specialization || 'Bez specijalizacije'}
                                </p>
                              </div>
                            ) : (
                              <Select
                                value=""
                                onValueChange={(value) => handleAssignTechnician(service.id, parseInt(value))}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue placeholder="Dodeli..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">Dodeli servisera...</SelectItem>
                                  {technicians.map((tech) => (
                                    <SelectItem key={tech.id} value={tech.id.toString()}>
                                      {tech.fullName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          
                          {/* Opis problema - skraćeno */}
                          <div className="min-w-0">
                            <p className="text-sm truncate">{service.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(service.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Kompaktni action buttons */}
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            onClick={() => handleViewDetails(service)}
                            title="Pogledaj detalje"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                          <button
                            className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                            onClick={() => handleEditService(service)}
                            title="Uredi servis"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            onClick={() => handleDeleteService(service)}
                            title="Obriši servis"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          {service.technicianId && (
                            <button
                              className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                              onClick={() => handleReturnService(service)}
                              title="Vrati servis od tehnčara"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Service Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={(open) => open ? null : dispatchDialog({ type: 'CLOSE_ALL' })}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalji servisa #{selectedService?.id}</DialogTitle>
              <DialogDescription>
                Pregledajte kompletne detalje o servisu uključujući informacije o klijentu, uređaju i statusu.
              </DialogDescription>
            </DialogHeader>
            
            {selectedService && (
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="general">Opšte informacije</TabsTrigger>
                  <TabsTrigger value="client">Klijent</TabsTrigger>
                  <TabsTrigger value="technician">Serviser</TabsTrigger>
                  <TabsTrigger value="technical">Tehnički detalji</TabsTrigger>
                  <TabsTrigger value="photos">Fotografije</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <div className="mt-1">
                        {getStatusBadge(selectedService.status)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Prioritet</Label>
                      <div className="mt-1">
                        {getPriorityBadge(selectedService.priority)}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Opis problema</Label>
                    <p className="mt-1 text-sm">{selectedService.description}</p>
                  </div>
                  
                  {/* Informacije o poslovnom partneru */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Kreiran od strane</Label>
                      <div className="mt-1">
                        {selectedService.businessPartnerId ? (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-600">
                              {selectedService.partnerCompanyName || "Poslovni partner"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-600" />
                            <span className="text-sm text-gray-600">Direktan admin zahtev</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedService.businessPartnerId && (
                      <div>
                        <Label className="text-sm font-medium">Partner ID</Label>
                        <p className="mt-1 text-sm">{selectedService.businessPartnerId}</p>
                      </div>
                    )}
                  </div>
                  
                  {selectedService.notes && (
                    <div>
                      <Label className="text-sm font-medium">Napomene</Label>
                      <p className="mt-1 text-sm">{selectedService.notes}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Kreiran</Label>
                      <p className="mt-1 text-sm">{formatDate(selectedService.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Ažuriran</Label>
                      <p className="mt-1 text-sm">{formatDate(selectedService.updatedAt)}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="client" className="space-y-4">
                  {selectedService.client ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Ime i prezime</Label>
                          <p className="mt-1 text-sm">{selectedService.client.fullName || "Nije specificiran"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Telefon</Label>
                          <p className="mt-1 text-sm">{selectedService.client.phone || "Nije specificiran"}</p>
                        </div>
                      </div>
                      
                      {selectedService.client.email && (
                        <div>
                          <Label className="text-sm font-medium">Email</Label>
                          <p className="mt-1 text-sm">{selectedService.client.email}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Grad</Label>
                          <p className="mt-1 text-sm">{selectedService.client.city || "Nije specificiran"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Adresa</Label>
                          <p className="mt-1 text-sm">{selectedService.client.address || "Nije specificirana"}</p>
                        </div>
                      </div>
                      
                      {selectedService.client.companyName && (
                        <div>
                          <Label className="text-sm font-medium">Firma</Label>
                          <p className="mt-1 text-sm">{selectedService.client.companyName}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Podaci o klijentu nisu dostupni</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="technician" className="space-y-4">
                  {selectedService.technician ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Ime i prezime</Label>
                          <p className="mt-1 text-sm">{selectedService.technician.fullName}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Specijalizacija</Label>
                          <p className="mt-1 text-sm">{selectedService.technician.specialization}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Email</Label>
                          <p className="mt-1 text-sm">{selectedService.technician.email}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Telefon</Label>
                          <p className="mt-1 text-sm">{selectedService.technician.phone}</p>
                        </div>
                      </div>
                      
                      {selectedService.technicianNotes && (
                        <div>
                          <Label className="text-sm font-medium">Napomene servisera</Label>
                          <p className="mt-1 text-sm">{selectedService.technicianNotes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Serviser nije dodeljen ovom servisu</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="technical" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Kategorija uređaja</Label>
                      <p className="mt-1 text-sm">{selectedService.appliance.category.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Proizvođač</Label>
                      <p className="mt-1 text-sm">{selectedService.appliance.manufacturer.name}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Model</Label>
                      <p className="mt-1 text-sm">{selectedService.appliance.model || "Nije specificiran"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Serijski broj</Label>
                      <p className="mt-1 text-sm">{selectedService.appliance.serialNumber || "Nije specificiran"}</p>
                    </div>
                  </div>
                  
                  {selectedService.usedParts && (
                    <div>
                      <Label className="text-sm font-medium">Iskorišćeni delovi</Label>
                      <p className="mt-1 text-sm">{selectedService.usedParts}</p>
                    </div>
                  )}
                  
                  {selectedService.machineNotes && (
                    <div>
                      <Label className="text-sm font-medium">Napomene o uređaju</Label>
                      <p className="mt-1 text-sm">{selectedService.machineNotes}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Cena</Label>
                      <p className="mt-1 text-sm">{selectedService.cost ? `${selectedService.cost} €` : "Nije specificirana"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Potpuno ispravljen</Label>
                      <p className="mt-1 text-sm">{selectedService.isCompletelyFixed ? "Da" : "Ne"}</p>
                    </div>
                  </div>
                  
                  {/* Dugme za poručivanje rezervnih delova */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Rezervni delovi</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Poručite rezervne delove direktno za ovaj servis
                        </p>
                      </div>
                      <Button
                        onClick={() => dispatchDialog({ type: 'OPEN_SPARE_PARTS', payload: selectedService })}
                        variant="outline"
                        size="sm"
                        className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Poruči delove
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="photos" className="space-y-4">
                  {/* FORSIRANI DEBUG ZA SERVIS 217 */}
                  {selectedService.id === 217 && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded">
                      <h3 className="font-bold text-red-800">🚨 KRITIČNI DEBUG ZA SERVIS 217</h3>
                      <p className="text-red-700">ServiceId: {selectedService.id}</p>
                      <p className="text-red-700">Type: {typeof selectedService.id}</p>
                      <p className="text-red-700">Bool check: {!!selectedService.id && selectedService.id > 0 ? 'TRUE' : 'FALSE'}</p>
                      {(() => {
                        console.log('🚨 ADMIN PHOTOS TAB - SERVIS 217 OPENED');
                        console.log('🚨 selectedService.id:', selectedService.id);
                        console.log('🚨 Type:', typeof selectedService.id);
                        console.log('🚨 Boolean condition:', !!selectedService.id && selectedService.id > 0);
                        return null;
                      })()}
                    </div>
                  )}
                  
                  {/* Debug test komponenta */}
                  {selectedService.id === 217 && (
                    <div className="mb-4">
                      <PhotoDebugTest serviceId={selectedService.id} />
                    </div>
                  )}
                  
                  {/* Debug info za fotografije tab */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">🔧 Debug Info za Servis {selectedService.id}</h4>
                    <p className="text-sm text-blue-700">ServiceId: {selectedService.id}</p>
                    <p className="text-sm text-blue-700">Status: {selectedService.status}</p>
                    <p className="text-sm text-blue-700">Client: {selectedService.client?.fullName || 'N/A'}</p>
                    <p className="text-sm text-blue-600 mt-2">👀 Proverite console (F12) za detaljne debug logove!</p>
                  </div>
                  
                  <ServicePhotos 
                    serviceId={selectedService.id}
                    readOnly={false}
                    showUpload={true}
                  />
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={(open) => open ? null : dispatchDialog({ type: 'CLOSE_ALL' })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Potvrda brisanja</DialogTitle>
              <DialogDescription>
                Da li ste sigurni da želite da obrišete ovaj servis? Ova akcija se ne može poništiti.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => dispatchDialog({ type: 'CLOSE_ALL' })}>
                Otkaži
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => selectedService && deleteServiceMutation.mutate(selectedService.id)}
                disabled={deleteServiceMutation.isPending}
              >
                {deleteServiceMutation.isPending ? "Brisanje..." : "Obriši"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Service Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => open ? null : dispatchDialog({ type: 'CLOSE_ALL' })}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Izmeni servis #{selectedService?.id}</DialogTitle>
              <DialogDescription>
                Ažurirajte informacije o servisu uključujući status, dodeljenog servisera i tehnički detalje.
              </DialogDescription>
            </DialogHeader>
            
            {selectedService && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={selectedService.status} 
                      onValueChange={(value) => dispatchDialog({ type: 'SET_SELECTED_SERVICE', payload: {...selectedService, status: value} })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Na čekanju</SelectItem>
                        <SelectItem value="assigned">Dodeljeno</SelectItem>
                        <SelectItem value="scheduled">Zakazano</SelectItem>
                        <SelectItem value="in_progress">U toku</SelectItem>
                        <SelectItem value="completed">Završeno</SelectItem>
                        <SelectItem value="cancelled">Otkazano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="technician">Serviser</Label>
                    <Select 
                      value={selectedService.technicianId?.toString() || "none"} 
                      onValueChange={(value) => dispatchDialog({ type: 'SET_SELECTED_SERVICE', payload: {...selectedService, technicianId: value === "none" ? null : parseInt(value)} })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Izaberi servisera..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Bez servisera</SelectItem>
                        {technicians.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id.toString()}>
                            {tech.fullName} - {tech.specialization}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Opis problema</Label>
                  <Textarea 
                    id="description"
                    value={selectedService.description}
                    onChange={(e) => dispatchDialog({ type: 'SET_SELECTED_SERVICE', payload: {...selectedService, description: e.target.value} })}
                    placeholder="Opis problema..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="technicianNotes">Napomene servisera</Label>
                  <Textarea 
                    id="technicianNotes"
                    value={selectedService.technicianNotes || ""}
                    onChange={(e) => dispatchDialog({ type: 'SET_SELECTED_SERVICE', payload: {...selectedService, technicianNotes: e.target.value} })}
                    placeholder="Napomene servisera..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cost">Cena (€)</Label>
                    <Input 
                      id="cost"
                      type="number"
                      value={selectedService.cost || ""}
                      onChange={(e) => dispatchDialog({ type: 'SET_SELECTED_SERVICE', payload: {...selectedService, cost: e.target.value} })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="scheduledDate">Zakazano za</Label>
                    <Input 
                      id="scheduledDate"
                      type="datetime-local"
                      value={selectedService.scheduledDate?.slice(0, 16) || ""}
                      onChange={(e) => dispatchDialog({ type: 'SET_SELECTED_SERVICE', payload: {...selectedService, scheduledDate: e.target.value} })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="usedParts">Korišćeni delovi</Label>
                  <Textarea 
                    id="usedParts"
                    value={selectedService.usedParts || ""}
                    onChange={(e) => dispatchDialog({ type: 'SET_SELECTED_SERVICE', payload: {...selectedService, usedParts: e.target.value} })}
                    placeholder="Lista korišćenih delova..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="machineNotes">Napomene o uređaju</Label>
                  <Textarea 
                    id="machineNotes"
                    value={selectedService.machineNotes || ""}
                    onChange={(e) => dispatchDialog({ type: 'SET_SELECTED_SERVICE', payload: {...selectedService, machineNotes: e.target.value} })}
                    placeholder="Napomene o uređaju..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isCompletelyFixed"
                    checked={selectedService.isCompletelyFixed}
                    onChange={(e) => dispatchDialog({ type: 'SET_SELECTED_SERVICE', payload: {...selectedService, isCompletelyFixed: e.target.checked} })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isCompletelyFixed">Potpuno ispravljen</Label>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => dispatchDialog({ type: 'CLOSE_ALL' })}>
                Otkaži
              </Button>
              <Button 
                onClick={() => selectedService && updateServiceMutation.mutate({
                  id: selectedService.id,
                  updates: selectedService
                })}
                disabled={updateServiceMutation.isPending}
              >
                {updateServiceMutation.isPending ? "Čuvanje..." : "Sačuvaj"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Return Service Dialog */}
        <Dialog open={isReturnOpen} onOpenChange={(open) => open ? null : dispatchDialog({ type: 'CLOSE_ALL' })}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Vrati servis od tehnčara</DialogTitle>
              <DialogDescription>
                Da li ste sigurni da želite da vratite servis #{selectedService?.id} od tehnčara nazad u admin bazu? 
                Servis će biti postavljen u "pending" status i uklonjen iz lista tehnčara.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="return-reason">Razlog vraćanja</Label>
                <Select value={returnReason} onValueChange={(value) => dispatchDialog({ type: 'SET_RETURN_REASON', payload: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Izaberite razlog..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technician_busy">Tehnčar je zauzet</SelectItem>
                    <SelectItem value="wrong_assignment">Pogrešna dodela</SelectItem>
                    <SelectItem value="priority_change">Promena prioriteta</SelectItem>
                    <SelectItem value="client_request">Zahtev klijenta</SelectItem>
                    <SelectItem value="technical_issue">Tehnčki problem</SelectItem>
                    <SelectItem value="other">Ostalo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="return-notes">Dodatne napomene (opciono)</Label>
                <Textarea 
                  id="return-notes"
                  value={returnNotes}
                  onChange={(e) => dispatchDialog({ type: 'SET_RETURN_NOTES', payload: e.target.value })}
                  placeholder="Unesite dodatne napomene o razlogu vraćanja..."
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => dispatchDialog({ type: 'CLOSE_ALL' })}>
                Otkaži
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => selectedService && returnServiceMutation.mutate({
                  serviceId: selectedService.id,
                  reason: returnReason,
                  notes: returnNotes
                })}
                disabled={returnServiceMutation.isPending || !returnReason}
              >
                {returnServiceMutation.isPending ? "Vraćam..." : "Vrati servis"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Spare Parts Ordering Dialog */}
        <Dialog open={isSparePartsOpen} onOpenChange={(open) => open ? null : dispatchDialog({ type: 'CLOSE_ALL' })}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Poruči rezervne delove - Servis #{selectedService?.id}</DialogTitle>
              <DialogDescription>
                Poručite rezervne delove direktno za ovaj servis. Svi podaci o servisu će biti automatski popunjeni.
              </DialogDescription>
            </DialogHeader>
            
            {selectedService && (
              <div className="space-y-4">
                {/* Service Info Card */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Informacije o servisu</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Klijent:</span> {selectedService.client.fullName}
                    </div>
                    <div>
                      <span className="font-medium">Telefon:</span> {selectedService.client.phone}
                    </div>
                    <div>
                      <span className="font-medium">Uređaj:</span> {selectedService.appliance.category.name}
                    </div>
                    <div>
                      <span className="font-medium">Proizvođač:</span> {selectedService.appliance.manufacturer.name}
                    </div>
                    {selectedService.appliance.model && (
                      <div>
                        <span className="font-medium">Model:</span> {selectedService.appliance.model}
                      </div>
                    )}
                    {selectedService.appliance.serialNumber && (
                      <div>
                        <span className="font-medium">Serijski broj:</span> {selectedService.appliance.serialNumber}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Spare Parts Form */}
                <AdminSparePartsOrderingSimple 
                  serviceId={selectedService.id}
                  onSuccess={() => {
                    dispatchDialog({ type: 'CLOSE_ALL' });
                    toast({
                      title: "Uspešno poručeno",
                      description: "Rezervni deo je uspešno poručen.",
                    });
                  }}
                />
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => dispatchDialog({ type: 'CLOSE_ALL' })}>
                Zatvori
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
});

export default AdminServices;