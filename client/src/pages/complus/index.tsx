import { useState } from "react";
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
  
  console.log("🔧 Tehnicians loaded:", technicians.length, technicians);
  console.log("🎯 Services data:", services.map(s => ({id: s.id, status: s.status, technicianId: s.technicianId, technicianName: s.technicianName})));

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
      setSelectedService(null);
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

  const handleAssignTechnician = () => {
    if (!selectedService || !selectedTechnician) {
      toast({
        title: "Greška",
        description: "Molimo izaberite servis i servisera.",
        variant: "destructive",
      });
      return;
    }

    assignTechnicianMutation.mutate({
      serviceId: selectedService.id,
      technicianId: parseInt(selectedTechnician)
    });
  };

  const handleRemoveTechnician = (serviceId: number) => {
    removeTechnicianMutation.mutate(serviceId);
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
      service.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.clientPhone.includes(searchTerm) ||
      service.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Com Plus Administrativni Panel</h1>
              <p className="text-gray-600">Upravljanje servisima za Electrolux, Elica, Candy, Hoover, Turbo Air</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Izvoz CSV
              </Button>
              <Button 
                className="flex items-center bg-blue-600 hover:bg-blue-700"
                onClick={() => window.location.href = '/business/services/new'}
              >
                <Package className="w-4 h-4 mr-2" />
                Novi servis
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Statistike */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ukupno servisa</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Com Plus brendovi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktivni servisi</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.active || 0}</div>
              <p className="text-xs text-muted-foreground">U toku i dodeljeni</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Završeni ovaj mesec</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completedThisMonth || 0}</div>
              <p className="text-xs text-muted-foreground">Tekući mesec</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Garancijski servisi</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.warranty || 0}</div>
              <p className="text-xs text-muted-foreground">U garanciji</p>
            </CardContent>
          </Card>
        </div>

        {/* Filteri */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filteri i pretraga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pretraži klijente, telefon, model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="Garancija" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sve garancije</SelectItem>
                  <SelectItem value="u garanciji">U garanciji</SelectItem>
                  <SelectItem value="van garancije">Van garancije</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setBrandFilter("all");
                setWarrantyFilter("all");
              }}>
                Resetuj filtere
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista servisa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Com Plus servisi ({filteredServices.length})</span>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{brandFilter === "all" ? "Svi brendovi" : brandFilter}</Badge>
                <Badge variant="outline">{statusFilter === "all" ? "Svi statusi" : getStatusText(statusFilter)}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Učitavanje Com Plus servisa...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nema Com Plus servisa koji odgovaraju filterima</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-fixed w-full min-w-[1400px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 w-16">ID</th>
                      <th className="text-left py-3 px-4 w-48">Klijent</th>
                      <th className="text-left py-3 px-4 w-32">Telefon</th>
                      <th className="text-left py-3 px-4 w-32">Grad</th>
                      <th className="text-left py-3 px-4 w-32">Brend</th>
                      <th className="text-left py-3 px-4 w-48">Model</th>
                      <th className="text-left py-3 px-4 w-32">Status</th>
                      <th className="text-left py-3 px-4 w-28">Garancija</th>
                      <th className="text-left py-3 px-4 w-32">Serviser</th>
                      <th className="text-left py-3 px-4 w-24">Cena</th>
                      <th className="text-left py-3 px-4 w-32">Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((service: Service) => (
                      <tr key={service.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">#{service.id}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{service.clientName}</div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-blue-600 p-0 h-auto font-normal"
                            onClick={() => handleEditClient(service)}
                          >
                            Izmeni podatke
                          </Button>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{service.clientPhone}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{service.clientCity}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {service.manufacturerName}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="font-medium">{service.model}</div>
                          <div className="text-gray-500 text-xs">{service.serialNumber}</div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-blue-600 p-0 h-auto font-normal mt-1"
                            onClick={() => handleEditAppliance(service)}
                          >
                            Izmeni aparat
                          </Button>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(service.status)}>
                            {getStatusText(service.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={service.warrantyStatus === "u garanciji" ? "default" : "secondary"}>
                            {service.warrantyStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {service.technicianName || "Nedodeljen"}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {service.cost ? `${service.cost}€` : "-"}
                        </td>
                        <td className="py-3 px-4 min-w-[120px] whitespace-nowrap">
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {/* Test ikone */}
                            <Button size="sm" variant="ghost" className="p-1 text-blue-600">
                              <UserCheck className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="p-1 text-orange-600">
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="p-1" 
                                  title="Pogledaj detalje"
                                  onClick={() => setViewingService(service)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
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
                            {service.status === "pending" && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="p-1 text-blue-600"
                                    title="Dodeli servisera"
                                    onClick={() => setSelectedService(service)}
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Dodeli servisera</DialogTitle>
                                    <DialogDescription>
                                      Izaberite servisera koji će biti odgovoran za ovaj Com Plus servis.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <p className="text-sm text-gray-600 mb-2">
                                        Servis #{selectedService?.id} - {selectedService?.clientName}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {selectedService?.manufacturerName} {selectedService?.model}
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
                                          setSelectedService(null);
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
                            )}
                            {service.technicianId && service.status !== "completed" && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="p-1 text-orange-600"
                                    title="Povuci od servisera"
                                    onClick={() => setSelectedService(service)}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Povuci servis od servisera</DialogTitle>
                                    <DialogDescription>
                                      Da li ste sigurni da želite da povučete ovaj servis od servisera?
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <p className="text-sm text-gray-600 mb-2">
                                        Servis #{service.id} - {service.clientName}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Trenutno dodeljen: <strong>{service.technicianName}</strong>
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {service.manufacturerName} {service.model}
                                      </p>
                                    </div>
                                    
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => setSelectedService(null)}
                                      >
                                        Otkaži
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleRemoveTechnician(service.id)}
                                        disabled={removeTechnicianMutation.isPending}
                                      >
                                        {removeTechnicianMutation.isPending ? "Povlačim..." : "Povuci servis"}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            {(service.status === "assigned" || service.status === "in_progress") && service.technicianId && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="p-1 text-green-600"
                                    title="Promeni servisera"
                                    onClick={() => setSelectedService(service)}
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Promeni servisera</DialogTitle>
                                    <DialogDescription>
                                      Izaberite novog servisera za ovaj Com Plus servis.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <p className="text-sm text-gray-600 mb-2">
                                        Servis #{service.id} - {service.clientName}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Trenutno: <strong>{service.technicianName}</strong>
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {service.manufacturerName} {service.model}
                                      </p>
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm font-medium mb-2">
                                        Novi serviser:
                                      </label>
                                      <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Izaberi novog servisera..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {technicians.filter(tech => tech.id !== service.technicianId).map((tech) => (
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
                                          setSelectedService(null);
                                          setSelectedTechnician("");
                                        }}
                                      >
                                        Otkaži
                                      </Button>
                                      <Button
                                        onClick={handleAssignTechnician}
                                        disabled={assignTechnicianMutation.isPending}
                                      >
                                        {assignTechnicianMutation.isPending ? "Promena..." : "Promeni servisera"}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="p-1" 
                                  title="Uredi servis"
                                  onClick={() => handleEditService(service)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
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

      {/* CLIENT EDITING DIALOG - Com Plus client data editing */}
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
    </div>
  );
}