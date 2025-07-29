import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Activity, 
  Users, 
  Settings, 
  Package, 
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

// Com Plus brendovi
const COM_PLUS_BRANDS = ["Electrolux", "Elica", "Candy", "Hoover", "Turbo Air"];

interface Service {
  id: number;
  clientName: string;
  clientPhone: string;
  clientCity: string;
  categoryName: string;
  manufacturerName: string;
  model: string;
  serialNumber: string;
  description: string;
  status: string;
  warrantyStatus: string;
  technicianName: string;
  technicianId: number | null;
  createdAt: string;
  scheduledDate: string;
  completedDate: string;
  cost: number;
}

interface Technician {
  id: number;
  fullName: string;
  phone: string;
  specialization: string;
}

export default function ComplusDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [warrantyFilter, setWarrantyFilter] = useState("all");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedServiceForAssign, setSelectedServiceForAssign] = useState<Service | null>(null);
  const [selectedServiceForRemove, setSelectedServiceForRemove] = useState<Service | null>(null);
  const [selectedServiceForDelete, setSelectedServiceForDelete] = useState<Service | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [viewingService, setViewingService] = useState<Service | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editFormData, setEditFormData] = useState({
    description: "",
    cost: "",
    status: ""
  });
  const [editingClient, setEditingClient] = useState<any>(null);
  const [clientEditFormData, setClientEditFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: ""
  });
  const [editingAppliance, setEditingAppliance] = useState<any>(null);
  const [applianceEditFormData, setApplianceEditFormData] = useState({
    model: "",
    serialNumber: "",
    purchaseDate: "",
    notes: ""
  });
  const { toast } = useToast();

  // Query za Com Plus servise
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/complus/services", statusFilter, brandFilter, warrantyFilter],
  });

  // Debug servisa sa useEffect
  useEffect(() => {
    if (services.length > 0) {
      console.log(`🔍 COM PLUS UČITAO ${services.length} servisa`);
      const pendingServices = services.filter(s => s.status === "pending");
      console.log(`📋 PENDING SERVISI: ${pendingServices.length}`, pendingServices.map(s => `#${s.id}`));
      
      // Ispituj servis #175 specifično
      const service175 = services.find(s => s.id === 175);
      if (service175) {
        console.log(`✅ SERVIS #175 PRONAĐEN:`, {
          id: service175.id,
          status: service175.status,
          technicianId: service175.technicianId,
          shouldShowAssignButton: service175.status === "pending",
          shouldShowRemoveButton: service175.technicianId && !["completed", "cancelled"].includes(service175.status),
          shouldShowDeleteButton: !["completed"].includes(service175.status)
        });
      } else {
        console.log(`❌ SERVIS #175 NIJE PRONAĐEN u services array`);
      }
    }
  }, [services]);

  // Query za Com Plus statistike
  const { data: stats = {} } = useQuery<{
    total: number;
    active: number;
    completedThisMonth: number;
    warranty: number;
  }>({
    queryKey: ["/api/complus/stats"],
  });

  // Query za tehnician-e
  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });


  // Mutation za dodelu servisa tehnician-u
  const assignTechnicianMutation = useMutation({
    mutationFn: async ({ serviceId, technicianId }: { serviceId: number; technicianId: number }) => {
      const response = await apiRequest(`/api/admin/services/${serviceId}/assign-technician`, {
        method: 'PUT',
        body: JSON.stringify({ technicianId })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno!",
        description: "Servis je uspešno dodeljen serviseru.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/complus/services"] });
      setSelectedService(null);
      setSelectedTechnician("");
    },
    onError: (error) => {
      console.error("Greška pri dodeli servisa:", error);
      toast({
        title: "Greška",
        description: "Došlo je do greške pri dodeli servisa serviseru.",
        variant: "destructive",
      });
    },
  });

  // Mutation za povlačenje servisa od servisera
  const removeTechnicianMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const response = await apiRequest(`/api/admin/services/${serviceId}/remove-technician`, {
        method: 'PUT'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno!",
        description: "Servis je uspešno povučen od servisera.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/complus/services"] });
      setSelectedServiceForRemove(null);
    },
    onError: (error) => {
      console.error("Greška pri povlačenju servisa:", error);
      toast({
        title: "Greška",
        description: "Došlo je do greške pri povlačenju servisa od servisera.",
        variant: "destructive",
      });
    },
  });

  // Mutation za brisanje servisa
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const response = await apiRequest(`/api/admin/services/${serviceId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno!",
        description: "Servis je uspešno obrisan.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/complus/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/complus/stats"] });
      setSelectedServiceForDelete(null);
    },
    onError: (error) => {
      console.error("Greška pri brisanju servisa:", error);
      toast({
        title: "Greška",
        description: "Došlo je do greške pri brisanju servisa.",
        variant: "destructive",
      });
    },
  });



  // Query za Com Plus aparate
  const { data: appliances = [] } = useQuery<any[]>({
    queryKey: ["/api/complus/appliances"],
  });

  // Query za Com Plus klijente
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/complus/clients"],
  });

  // Mutation za ažuriranje servisa - koristi Com Plus endpoint
  const updateServiceMutation = useMutation({
    mutationFn: async ({ serviceId, data }: { serviceId: number; data: any }) => {
      const response = await apiRequest(`/api/complus/services/${serviceId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno!",
        description: "Com Plus servis je uspešno ažuriran.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/complus/services"] });
      setEditingService(null);
      setEditFormData({ description: "", cost: "", status: "" });
    },
    onError: (error) => {
      console.error("Greška pri ažuriranju servisa:", error);
      toast({
        title: "Greška",
        description: "Greška pri ažuriranju Com Plus servisa.",
        variant: "destructive",
      });
    },
  });

  // Mutation za ažuriranje klijenta - COM PLUS client editing
  const updateClientMutation = useMutation({
    mutationFn: async ({ clientId, data }: { clientId: number; data: any }) => {
      const response = await apiRequest(`/api/complus/clients/${clientId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno!",
        description: "Podaci klijenta su uspešno ažurirani.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/complus/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/complus/clients"] });
      setEditingClient(null);
      setClientEditFormData({ fullName: "", phone: "", email: "", address: "", city: "" });
    },
    onError: (error) => {
      console.error("Greška pri ažuriranju klijenta:", error);
      toast({
        title: "Greška",
        description: "Greška pri ažuriranju Com Plus klijenta.",
        variant: "destructive",
      });
    },
  });

  // Mutation za ažuriranje aparata - COM PLUS appliance editing
  const updateApplianceMutation = useMutation({
    mutationFn: async ({ applianceId, data }: { applianceId: number; data: any }) => {
      const response = await apiRequest(`/api/complus/appliances/${applianceId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno!",
        description: "Podaci aparata su uspešno ažurirani.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/complus/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/complus/appliances"] });
      setEditingAppliance(null);
      setApplianceEditFormData({ model: "", serialNumber: "", purchaseDate: "", notes: "" });
    },
    onError: (error) => {
      console.error("Greška pri ažuriranju aparata:", error);
      toast({
        title: "Greška",
        description: "Greška pri ažuriranju Com Plus aparata.",
        variant: "destructive",
      });
    },
  });

  // Handler funkcije za servis akcije
  const handleAssignTechnician = () => {
    if (!selectedServiceForAssign || !selectedTechnician) {
      toast({
        title: "Greška",
        description: "Molimo izaberite servis i servisera.",
        variant: "destructive",
      });
      return;
    }

    assignTechnicianMutation.mutate({
      serviceId: selectedServiceForAssign.id,
      technicianId: parseInt(selectedTechnician)
    });
    
    // Resetuj state nakon mutation
    setSelectedServiceForAssign(null);
    setSelectedTechnician("");
  };

  const handleRemoveTechnician = () => {
    if (!selectedServiceForRemove) {
      toast({
        title: "Greška",
        description: "Servis nije izabran.",
        variant: "destructive",
      });
      return;
    }

    removeTechnicianMutation.mutate(selectedServiceForRemove.id);
    
    // Resetuj state nakon mutation
    setSelectedServiceForRemove(null);
  };

  const handleDeleteService = () => {
    if (!selectedServiceForDelete) {
      toast({
        title: "Greška",
        description: "Servis nije izabran.",
        variant: "destructive",
      });
      return;
    }

    deleteServiceMutation.mutate(selectedServiceForDelete.id);
    
    // Resetuj state nakon mutation
    setSelectedServiceForDelete(null);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setEditFormData({
      description: service.description || "",
      cost: service.cost?.toString() || "",
      status: service.status || ""
    });
  };

  const handleSaveChanges = () => {
    if (!editingService) return;

    const updateData: any = {};
    
    if (editFormData.description !== editingService.description) {
      updateData.description = editFormData.description;
    }
    
    if (editFormData.cost !== editingService.cost?.toString()) {
      updateData.cost = parseFloat(editFormData.cost) || 0;
    }
    
    if (editFormData.status !== editingService.status) {
      updateData.status = editFormData.status;
    }

    updateServiceMutation.mutate({
      serviceId: editingService.id,
      data: updateData
    });
  };

  // Handler funkcije za client editing
  const handleEditClient = (service: Service) => {
    // Izvlačimo client podatke iz service objekta
    setEditingClient({
      id: service.id, // We'll extract clientId from service
      clientName: service.clientName,
      clientPhone: service.clientPhone,
      clientCity: service.clientCity
    });
    setClientEditFormData({
      fullName: service.clientName || "",
      phone: service.clientPhone || "",
      email: "", // We'll need to fetch this
      address: "", // We'll need to fetch this  
      city: service.clientCity || ""
    });
  };

  const handleSaveClientChanges = () => {
    if (!editingClient) return;

    // Find the client from services
    const currentService = services.find(s => s.id === editingClient.id);
    if (!currentService) return;

    const updateData: any = {};
    
    if (clientEditFormData.fullName !== currentService.clientName) {
      updateData.fullName = clientEditFormData.fullName;
    }
    
    if (clientEditFormData.phone !== currentService.clientPhone) {
      updateData.phone = clientEditFormData.phone;
    }
    
    if (clientEditFormData.email) {
      updateData.email = clientEditFormData.email;
    }
    
    if (clientEditFormData.address) {
      updateData.address = clientEditFormData.address;
    }
    
    if (clientEditFormData.city !== currentService.clientCity) {
      updateData.city = clientEditFormData.city;
    }

    // Extract clientId from service (we'll need to add this to the Service interface)
    const clientId = (currentService as any).clientId || editingClient.id;

    updateClientMutation.mutate({
      clientId: clientId,
      data: updateData
    });
  };

  // Handler funkcije za appliance editing
  const handleEditAppliance = (service: Service) => {
    setEditingAppliance({
      id: service.id,
      model: service.model,
      serialNumber: service.serialNumber
    });
    setApplianceEditFormData({
      model: service.model || "",
      serialNumber: service.serialNumber || "",
      purchaseDate: "",
      notes: ""
    });
  };

  const handleSaveApplianceChanges = () => {
    if (!editingAppliance) return;

    const currentService = services.find(s => s.id === editingAppliance.id);
    if (!currentService) return;

    const updateData: any = {};
    
    if (applianceEditFormData.model !== currentService.model) {
      updateData.model = applianceEditFormData.model;
    }
    
    if (applianceEditFormData.serialNumber !== currentService.serialNumber) {
      updateData.serialNumber = applianceEditFormData.serialNumber;
    }
    
    if (applianceEditFormData.purchaseDate) {
      updateData.purchaseDate = applianceEditFormData.purchaseDate;
    }
    
    if (applianceEditFormData.notes) {
      updateData.notes = applianceEditFormData.notes;
    }

    // Extract applianceId from service
    const applianceId = (currentService as any).applianceId || editingAppliance.id;

    updateApplianceMutation.mutate({
      applianceId: applianceId,
      data: updateData
    });
  };

  // Filtriranje servisa
  const filteredServices = services.filter((service: Service) => {
    const matchesSearch = 
      (service.clientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.clientPhone || "").includes(searchTerm) ||
      (service.model || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.serialNumber || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || service.status === statusFilter;
    const matchesBrand = brandFilter === "all" || service.manufacturerName === brandFilter;
    const matchesWarranty = warrantyFilter === "all" || service.warrantyStatus === warrantyFilter;
    
    return matchesSearch && matchesStatus && matchesBrand && matchesWarranty;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "assigned": return "bg-yellow-100 text-yellow-800";
      case "pending": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Završen";
      case "in_progress": return "U toku";
      case "assigned": return "Dodeljen";
      case "pending": return "Na čekanju";
      case "cancelled": return "Otkazan";
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Com Plus Admin</h1>
                <p className="text-blue-100">Upravljanje servisima - Electrolux, Elica, Candy, Hoover, Turbo Air</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="secondary" className="flex items-center bg-white/10 hover:bg-white/20 text-white border-white/30">
                <Download className="w-4 h-4 mr-2" />
                Izvoz CSV
              </Button>
              <Button 
                className="flex items-center bg-white text-blue-600 hover:bg-gray-50 font-medium"
                onClick={() => window.location.href = '/business/services/new'}
              >
                <Package className="w-4 h-4 mr-2" />
                Novi servis
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Modern Dashboard Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">Ukupno servisa</p>
                  <p className="text-3xl font-bold text-blue-900">{stats?.total || 0}</p>
                  <p className="text-xs text-blue-600 mt-1">Com Plus brendovi</p>
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700 mb-1">Aktivni servisi</p>
                  <p className="text-3xl font-bold text-amber-900">{stats?.active || 0}</p>
                  <p className="text-xs text-amber-600 mt-1">U toku i dodeljeni</p>
                </div>
                <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">Završeni ovaj mesec</p>
                  <p className="text-3xl font-bold text-green-900">{stats?.completedThisMonth || 0}</p>
                  <p className="text-xs text-green-600 mt-1">Tekući mesec</p>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 mb-1">Garancijski servisi</p>
                  <p className="text-3xl font-bold text-purple-900">{stats?.warranty || 0}</p>
                  <p className="text-xs text-purple-600 mt-1">U garanciji</p>
                </div>
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modern Filters Panel */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
            <CardTitle className="flex items-center text-lg">
              <Filter className="w-5 h-5 mr-3 text-blue-600" />
              Filteri i pretraga
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pretraži klijente, telefon, model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 border-gray-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi statusi</SelectItem>
                  <SelectItem value="pending">Na čekanju</SelectItem>
                  <SelectItem value="assigned">Dodeljen</SelectItem>
                  <SelectItem value="in_progress">U toku</SelectItem>
                  <SelectItem value="completed">Završen</SelectItem>
                  <SelectItem value="cancelled">Otkazan</SelectItem>
                </SelectContent>
              </Select>

              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="h-11 border-gray-200">
                  <SelectValue placeholder="Brend" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi brendovi</SelectItem>
                  {COM_PLUS_BRANDS.map((brand) => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={warrantyFilter} onValueChange={setWarrantyFilter}>
                <SelectTrigger className="h-11 border-gray-200">
                  <SelectValue placeholder="Garancija" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sve garancije</SelectItem>
                  <SelectItem value="u garanciji">U garanciji</SelectItem>
                  <SelectItem value="van garancije">Van garancije</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                className="h-11 border-gray-200 hover:bg-gray-50"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setBrandFilter("all");
                  setWarrantyFilter("all");
                }}
              >
                Resetuj filtere
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modern Services Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg border-b">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Com Plus servisi ({filteredServices.length})</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                  {brandFilter === "all" ? "Svi brendovi" : brandFilter}
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  {statusFilter === "all" ? "Svi statusi" : getStatusText(statusFilter)}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 font-medium">Učitavanje Com Plus servisa...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">Nema Com Plus servisa koji odgovaraju filterima</p>
                <p className="text-gray-400 text-sm mt-2">Pokušajte da promenite filtere ili dodajte novi servis</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">ID</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Klijent</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Kontakt</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Uređaj</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Status</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Serviser</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Cena</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-700 text-sm">Akcije</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredServices.map((service: Service) => (
                      <tr key={service.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              #{service.id}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 text-sm">{service.clientName}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-blue-600 p-0 h-auto font-normal justify-start hover:text-blue-800"
                              onClick={() => handleEditClient(service)}
                            >
                              Izmeni podatke
                            </Button>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{service.clientPhone}</span>
                            <span className="text-xs text-gray-500">{service.clientCity}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {service.manufacturerName}
                              </Badge>
                              <Badge variant={service.warrantyStatus === "u garanciji" ? "default" : "secondary"} className="text-xs">
                                {service.warrantyStatus === "u garanciji" ? "Garancija" : "Van gar."}
                              </Badge>
                            </div>
                            <span className="text-sm font-medium text-gray-900 mt-1">{service.model}</span>
                            <span className="text-xs text-gray-500">S/N: {service.serialNumber}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={`${getStatusColor(service.status)} text-sm px-3 py-1 font-medium`}>
                            {getStatusText(service.status)}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-gray-900">
                            {service.technicianName || (
                              <span className="text-gray-400 italic">Nije dodeljen</span>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {service.cost ? `${service.cost}€` : (
                              <span className="text-gray-400">-</span>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center space-x-1">
                            {/* UPRAVLJANJE SERVISERA - pametno dugme koje menja funkciju */}
                            {!["completed", "cancelled"].includes(service.status) && (
                              <>
                                {!service.technicianId ? (
                                  // Dodeli servisera - za servise bez servisera
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                                    onClick={() => setSelectedServiceForAssign(service)}
                                    title="Dodeli servisera"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  // Povuci servisera - za servise sa dodeljenim serviserom
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
                                    onClick={() => setSelectedServiceForRemove(service)}
                                    title="Povuci servisera"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                )}
                              </>
                            )}

                            {/* Obriši servis - prikazuje se za sve servise osim završenih */}
                            {!["completed"].includes(service.status) && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                onClick={() => setSelectedServiceForDelete(service)}
                                title="Obriši servis"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 w-8 p-0 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300" 
                              title="Pogledaj detalje"
                              onClick={() => setViewingService(service)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {/* Uredi servis */}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300" 
                              title="Uredi servis"
                              onClick={() => handleEditService(service)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DIALOG ZA DODELU SERVISERA */}
      <Dialog open={!!selectedServiceForAssign} onOpenChange={(open) => !open && setSelectedServiceForAssign(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dodeli servisera</DialogTitle>
            <DialogDescription>
              Izaberite servisera koji će biti odgovoran za ovaj Com Plus servis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Servis #{selectedServiceForAssign?.id} - {selectedServiceForAssign?.clientName}
              </p>
              <p className="text-sm text-gray-600">
                {selectedServiceForAssign?.manufacturerName} {selectedServiceForAssign?.model}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Izaberi servisera:
              </label>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="Izaberi servisera..." />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id.toString()}>
                      {tech.fullName} - {tech.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedServiceForAssign(null);
                  setSelectedTechnician("");
                }}
              >
                Otkaži
              </Button>
              <Button
                onClick={handleAssignTechnician}
                disabled={assignTechnicianMutation.isPending}
              >
                {assignTechnicianMutation.isPending ? "Dodeljivanje..." : "Dodeli"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG ZA POVLAČENJE SERVISERA */}
      <Dialog open={!!selectedServiceForRemove} onOpenChange={(open) => !open && setSelectedServiceForRemove(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Povuci servis od servisera</DialogTitle>
            <DialogDescription>
              Da li ste sigurni da želite da povučete ovaj servis od servisera?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Servis #{selectedServiceForRemove?.id} - {selectedServiceForRemove?.clientName}
              </p>
              <p className="text-sm text-gray-600">
                Trenutno dodeljen: <strong>{selectedServiceForRemove?.technicianName}</strong>
              </p>
              <p className="text-sm text-gray-600">
                {selectedServiceForRemove?.manufacturerName} {selectedServiceForRemove?.model}
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSelectedServiceForRemove(null)}>
                Otkaži
              </Button>
              <Button 
                onClick={() => {
                  if (selectedServiceForRemove) {
                    removeTechnicianMutation.mutate(selectedServiceForRemove.id);
                  }
                }}
                disabled={removeTechnicianMutation.isPending}
                variant="destructive"
              >
                {removeTechnicianMutation.isPending ? "Povlačenje..." : "Povuci servisera"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG ZA PREGLED DETALJA SERVISA */}
      <Dialog open={!!viewingService} onOpenChange={(open) => !open && setViewingService(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalji servisa #{viewingService?.id}</DialogTitle>
            <DialogDescription>
              Kompletne informacije o Com Plus servisu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Osnovne informacije */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-2">KLIJENT</h4>
                <p className="font-medium">{viewingService?.clientName}</p>
                <p className="text-sm text-gray-600">{viewingService?.clientPhone}</p>
                <p className="text-sm text-gray-600">{viewingService?.clientCity}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-2">UREĐAJ</h4>
                <p className="font-medium">{viewingService?.manufacturerName}</p>
                <p className="text-sm text-gray-600">{viewingService?.model}</p>
                <p className="text-xs text-gray-500">S/N: {viewingService?.serialNumber}</p>
              </div>
            </div>
            
            {/* Status i garancija */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-2">STATUS</h4>
                <Badge className={getStatusColor(viewingService?.status || "")}>
                  {getStatusText(viewingService?.status || "")}
                </Badge>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-2">GARANCIJA</h4>
                <Badge variant={viewingService?.warrantyStatus === "u garanciji" ? "default" : "secondary"}>
                  {viewingService?.warrantyStatus}
                </Badge>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-2">CENA</h4>
                <p className="font-medium">{viewingService?.cost ? `${viewingService.cost}€` : "Nije definisana"}</p>
              </div>
            </div>

            {/* Serviser */}
            <div>
              <h4 className="font-semibold text-sm text-gray-600 mb-2">SERVISER</h4>
              <p className="font-medium">{viewingService?.technicianName || "Nije dodeljen"}</p>
            </div>

            {/* Opis */}
            <div>
              <h4 className="font-semibold text-sm text-gray-600 mb-2">OPIS PROBLEMA</h4>
              <p className="text-sm bg-gray-50 p-3 rounded">{viewingService?.description}</p>
            </div>

            {/* Datumi */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-2">KREIRAN</h4>
                <p className="text-sm">{viewingService?.createdAt ? format(new Date(viewingService.createdAt), 'dd.MM.yyyy') : '-'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-2">ZAVRŠEN</h4>
                <p className="text-sm">{viewingService?.completedDate ? format(new Date(viewingService.completedDate), 'dd.MM.yyyy HH:mm') : '-'}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG ZA UREĐIVANJE SERVISA */}
      <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Uredi Com Plus servis #{editingService?.id}</DialogTitle>
            <DialogDescription>
              Uredite osnovne informacije o servisu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Opis problema</label>
              <textarea 
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md"
                value={editFormData.description}
                onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                placeholder="Opišite problem sa uređajem..."
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Cena servisa (€)</label>
              <input 
                type="number"
                className="w-full px-3 py-2 text-sm border rounded-md"
                value={editFormData.cost}
                onChange={(e) => setEditFormData({...editFormData, cost: e.target.value})}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status servisa</label>
              <Select value={editFormData.status} onValueChange={(value) => setEditFormData({...editFormData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Na čekanju</SelectItem>
                  <SelectItem value="assigned">Dodeljen</SelectItem>
                  <SelectItem value="scheduled">Zakazan</SelectItem>
                  <SelectItem value="in_progress">U toku</SelectItem>
                  <SelectItem value="completed">Završen</SelectItem>
                  <SelectItem value="cancelled">Otkazan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setEditingService(null)}>
                Otkaži
              </Button>
              <Button onClick={handleSaveChanges} disabled={updateServiceMutation.isPending}>
                {updateServiceMutation.isPending ? "Snimam..." : "Sačuvaj izmene"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        {/* Com Plus aparate sekcija */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Com Plus aparati ({appliances.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appliances.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nema aparata Com Plus brendova</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {appliances.slice(0, 9).map((appliance: any) => (
                  <div key={appliance.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{appliance.categoryName}</h3>
                        <p className="text-sm text-blue-600 font-medium">{appliance.manufacturerName}</p>
                        <p className="text-sm text-gray-600">{appliance.model}</p>
                        {appliance.serialNumber && (
                          <p className="text-xs text-gray-500 mt-1">S/N: {appliance.serialNumber}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {appliance.manufacturerName}
                      </Badge>
                    </div>
                  </div>
                ))}
                {appliances.length > 9 && (
                  <div className="col-span-full text-center">
                    <Button variant="outline" size="sm">
                      Prikaži sve ({appliances.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Com Plus klijenti sekcija */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Com Plus klijenti ({clients.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nema klijenata sa Com Plus aparatima</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.slice(0, 6).map((client: any) => (
                  <div key={client.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{client.fullName}</h3>
                        <p className="text-sm text-gray-600">{client.phone}</p>
                        <p className="text-sm text-gray-500">{client.city}</p>
                        {client.address && (
                          <p className="text-xs text-gray-400 mt-1">{client.address}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                        Com Plus
                      </Badge>
                    </div>
                  </div>
                ))}
                {clients.length > 6 && (
                  <div className="col-span-full text-center">
                    <Button variant="outline" size="sm">
                      Prikaži sve ({clients.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog komponenti */}
      {/* CLIENT EDITING DIALOG */}
      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Izmeni podatke klijenta</DialogTitle>
            <DialogDescription>
              Ažurirajte kontakt podatke i informacije o klijentu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ime i prezime</label>
              <Input
                value={clientEditFormData.fullName}
                onChange={(e) => setClientEditFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Unesite ime i prezime"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefon</label>
              <Input
                value={clientEditFormData.phone}
                onChange={(e) => setClientEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Unesite broj telefona"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={clientEditFormData.email}
                onChange={(e) => setClientEditFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Unesite email adresu"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Adresa</label>
              <Input
                value={clientEditFormData.address}
                onChange={(e) => setClientEditFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Unesite adresu"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Grad</label>
              <Input
                value={clientEditFormData.city}
                onChange={(e) => setClientEditFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Unesite grad"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setEditingClient(null)}>
              Otkaži
            </Button>
            <Button onClick={handleSaveClientChanges} disabled={updateClientMutation.isPending}>
              {updateClientMutation.isPending ? "Čuva..." : "Sačuvaj"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* APPLIANCE EDITING DIALOG - Com Plus appliance data editing */}
      <Dialog open={!!editingAppliance} onOpenChange={(open) => !open && setEditingAppliance(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Izmeni podatke aparata</DialogTitle>
            <DialogDescription>
              Ažurirajte specifikacije i informacije o aparatu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Model</label>
              <Input
                value={applianceEditFormData.model}
                onChange={(e) => setApplianceEditFormData(prev => ({ ...prev, model: e.target.value }))}
                placeholder="Unesite model aparata"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Serijski broj</label>
              <Input
                value={applianceEditFormData.serialNumber}
                onChange={(e) => setApplianceEditFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                placeholder="Unesite serijski broj"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Datum kupovine</label>
              <Input
                type="date"
                value={applianceEditFormData.purchaseDate}
                onChange={(e) => setApplianceEditFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Napomene</label>
              <Input
                value={applianceEditFormData.notes}
                onChange={(e) => setApplianceEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Dodatne napomene o aparatu"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setEditingAppliance(null)}>
              Otkaži
            </Button>
            <Button onClick={handleSaveApplianceChanges} disabled={updateApplianceMutation.isPending}>
              {updateApplianceMutation.isPending ? "Čuva..." : "Sačuvaj"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>





      {/* DIALOG ZA BRISANJE SERVISA */}
      <Dialog open={!!selectedServiceForDelete} onOpenChange={(open) => !open && setSelectedServiceForDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Obriši servis</DialogTitle>
            <DialogDescription>
              Da li ste sigurni da želite da trajno obrišete servis #{selectedServiceForDelete?.id}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Klijent: <strong>{selectedServiceForDelete?.clientName}</strong></p>
              <p className="text-sm text-gray-600 mb-2">Uređaj: <strong>{selectedServiceForDelete?.manufacturerName} {selectedServiceForDelete?.model}</strong></p>
              <p className="text-sm text-gray-600 mb-4">Status: <strong>{getStatusText(selectedServiceForDelete?.status || "")}</strong></p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ Upozorenje: Ova akcija se ne može poništiti!
              </p>
              <p className="text-sm text-red-700 mt-1">
                Svi podaci o servisu će biti trajno obrisani iz sistema.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setSelectedServiceForDelete(null)}>
              Otkaži
            </Button>
            <Button 
              onClick={handleDeleteService} 
              disabled={deleteServiceMutation.isPending}
              variant="destructive"
            >
              {deleteServiceMutation.isPending ? "Brisanje..." : "Obriši servis"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}