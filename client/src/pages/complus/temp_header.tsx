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
