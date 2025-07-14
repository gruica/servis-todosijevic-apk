import { useState, useEffect } from "react";
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
  Filter
} from "lucide-react";
import { formatDate } from "@/lib/utils";

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

export default function AdminServices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [selectedService, setSelectedService] = useState<AdminService | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const { toast } = useToast();

  // Fetch services
  const { data: services = [], isLoading: loadingServices, refetch, error } = useQuery<AdminService[]>({
    queryKey: ["/api/admin/services"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Log services data for debugging
  console.log("Admin Services Debug:", {
    services,
    isLoading: loadingServices,
    error,
    servicesCount: services.length
  });

  // Fetch technicians
  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<AdminService> }) => {
      const response = await apiRequest("PUT", `/api/admin/services/${data.id}`, data.updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno ažuriran",
        description: "Servis je uspešno ažuriran.",
      });
      refetch();
      setIsEditOpen(false);
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
      await apiRequest("DELETE", `/api/admin/services/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Uspešno obrisano",
        description: "Servis je uspešno obrisan.",
      });
      refetch();
      setIsDeleteOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri brisanju servisa.",
        variant: "destructive",
      });
    },
  });

  // Assign technician mutation
  const assignTechnicianMutation = useMutation({
    mutationFn: async (data: { serviceId: number; technicianId: number }) => {
      const response = await apiRequest("PUT", `/api/admin/services/${data.serviceId}/assign-technician`, {
        technicianId: data.technicianId,
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

  // Filter services with safe property access
  const filteredServices = services.filter((service) => {
    try {
      const matchesSearch = searchQuery === "" || 
        service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.client?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.appliance?.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.id?.toString().includes(searchQuery);
      
      const matchesStatus = statusFilter === "all" || service.status === statusFilter;
      const matchesTechnician = technicianFilter === "all" || 
        (technicianFilter === "unassigned" && !service.technicianId) ||
        service.technicianId?.toString() === technicianFilter;
      
      return matchesSearch && matchesStatus && matchesTechnician;
    } catch (error) {
      console.error("Error filtering service:", service.id, error);
      return false;
    }
  });

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
  const handleViewDetails = (service: AdminService) => {
    console.log("handleViewDetails called for service:", service.id);
    setSelectedService(service);
    setIsDetailsOpen(true);
    console.log("isDetailsOpen set to true");
  };

  // Handle edit service
  const handleEditService = (service: AdminService) => {
    setSelectedService(service);
    setIsEditOpen(true);
  };

  // Handle delete service
  const handleDeleteService = (service: AdminService) => {
    setSelectedService(service);
    setIsDeleteOpen(true);
  };

  // Handle assign technician
  const handleAssignTechnician = (serviceId: number, technicianId: number) => {
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
          <Button 
            onClick={() => window.location.href = '/admin/create-service'} 
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj novi servis
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ukupno</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Wrench className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Na čekanju</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">U toku</p>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                </div>
                <Play className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Završeno</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nedodeljena</p>
                  <p className="text-2xl font-bold">{stats.unassigned}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filteri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Pretraga</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pretraži servise..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Svi statusi</SelectItem>
                    <SelectItem value="pending">Na čekanju</SelectItem>
                    <SelectItem value="assigned">Dodeljeno</SelectItem>
                    <SelectItem value="scheduled">Zakazano</SelectItem>
                    <SelectItem value="in_progress">U toku</SelectItem>
                    <SelectItem value="completed">Završeno</SelectItem>
                    <SelectItem value="cancelled">Otkazano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Serviser</Label>
                <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Svi serviseri</SelectItem>
                    <SelectItem value="unassigned">Nedodeljena</SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id.toString()}>
                        {tech.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Rezultati</Label>
                <p className="text-sm text-muted-foreground pt-2">
                  Prikazano {filteredServices.length} od {services.length} servisa
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Table */}
        <Card>
          <CardHeader>
            <CardTitle>Servisi</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingServices ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {filteredServices.map((service) => (
                    <Card key={service.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline">#{service.id}</Badge>
                            {getStatusBadge(service.status)}
                            {getPriorityBadge(service.priority)}
                            {service.scheduledDate && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(service.scheduledDate)}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div>
                              <h4 className="font-semibold mb-1">Klijent</h4>
                              <p className="text-sm">{service.client.fullName}</p>
                              {service.client.phone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {service.client.phone}
                                </p>
                              )}
                              {service.client.city && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {service.client.city}
                                </p>
                              )}
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-1">Uređaj</h4>
                              <p className="text-sm">{service.appliance.category.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {service.appliance.manufacturer.name} {service.appliance.model}
                              </p>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-1">Serviser</h4>
                              {service.technician ? (
                                <div>
                                  <p className="text-sm">{service.technician.fullName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {service.technician.specialization}
                                  </p>
                                </div>
                              ) : (
                                <Select
                                  value=""
                                  onValueChange={(value) => handleAssignTechnician(service.id, parseInt(value))}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Dodeli servisera..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {technicians.map((tech) => (
                                      <SelectItem key={tech.id} value={tech.id.toString()}>
                                        {tech.fullName} - {tech.specialization}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <h4 className="font-semibold mb-1">Opis problema</h4>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Kreiran: {formatDate(service.createdAt)}</span>
                            <span>•</span>
                            <span>Ažuriran: {formatDate(service.updatedAt)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            onClick={() => {
                              console.log("Native button clicked for service:", service.id);
                              setSelectedService(service);
                              setIsDetailsOpen(true);
                            }}
                          >
                            👁️ Detalji
                          </button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditService(service)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Izmeni
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteService(service)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Obriši
                          </Button>
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
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalji servisa #{selectedService?.id}</DialogTitle>
              <DialogDescription>
                Pregledajte kompletne detalje o servisu uključujući informacije o klijentu, uređaju i statusu.
              </DialogDescription>
            </DialogHeader>
            
            {selectedService && (
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="general">Opšte informacije</TabsTrigger>
                  <TabsTrigger value="client">Klijent</TabsTrigger>
                  <TabsTrigger value="technician">Serviser</TabsTrigger>
                  <TabsTrigger value="technical">Tehnički detalji</TabsTrigger>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Ime i prezime</Label>
                      <p className="mt-1 text-sm">{selectedService.client.fullName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Telefon</Label>
                      <p className="mt-1 text-sm">{selectedService.client.phone}</p>
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
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Potvrda brisanja</DialogTitle>
              <DialogDescription>
                Da li ste sigurni da želite da obrišete ovaj servis? Ova akcija se ne može poništiti.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
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
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
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
                      onValueChange={(value) => setSelectedService({...selectedService, status: value})}
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
                      onValueChange={(value) => setSelectedService({...selectedService, technicianId: value === "none" ? null : parseInt(value)})}
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
                    onChange={(e) => setSelectedService({...selectedService, description: e.target.value})}
                    placeholder="Opis problema..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="technicianNotes">Napomene servisera</Label>
                  <Textarea 
                    id="technicianNotes"
                    value={selectedService.technicianNotes || ""}
                    onChange={(e) => setSelectedService({...selectedService, technicianNotes: e.target.value})}
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
                      onChange={(e) => setSelectedService({...selectedService, cost: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="scheduledDate">Zakazano za</Label>
                    <Input 
                      id="scheduledDate"
                      type="datetime-local"
                      value={selectedService.scheduledDate?.slice(0, 16) || ""}
                      onChange={(e) => setSelectedService({...selectedService, scheduledDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="usedParts">Korišćeni delovi</Label>
                  <Textarea 
                    id="usedParts"
                    value={selectedService.usedParts || ""}
                    onChange={(e) => setSelectedService({...selectedService, usedParts: e.target.value})}
                    placeholder="Lista korišćenih delova..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="machineNotes">Napomene o uređaju</Label>
                  <Textarea 
                    id="machineNotes"
                    value={selectedService.machineNotes || ""}
                    onChange={(e) => setSelectedService({...selectedService, machineNotes: e.target.value})}
                    placeholder="Napomene o uređaju..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isCompletelyFixed"
                    checked={selectedService.isCompletelyFixed}
                    onChange={(e) => setSelectedService({...selectedService, isCompletelyFixed: e.target.checked})}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isCompletelyFixed">Potpuno ispravljen</Label>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
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
      </div>
    </AdminLayout>
  );
}