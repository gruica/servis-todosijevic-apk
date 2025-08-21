import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Clock, 
  MapPin, 
  Phone, 
  Package, 
  User, 
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  Pause,
  Settings,
  Eye,
  Filter,
  ArrowLeft,
  Home,
  Wrench,
  Plus
} from "lucide-react";
import { formatDate } from "@/lib/utils";

// Service status configuration
const statusConfig = {
  pending: { color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50", label: "Na čekanju", icon: Clock },
  assigned: { color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50", label: "Dodeljen", icon: User },
  in_progress: { color: "bg-orange-500", textColor: "text-orange-700", bgColor: "bg-orange-50", label: "U toku", icon: Play },
  scheduled: { color: "bg-purple-500", textColor: "text-purple-700", bgColor: "bg-purple-50", label: "Zakazan", icon: Calendar },
  completed: { color: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50", label: "Završen", icon: CheckCircle },
  cancelled: { color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50", label: "Otkazan", icon: XCircle },
  waiting_parts: { color: "bg-amber-500", textColor: "text-amber-700", bgColor: "bg-amber-50", label: "Čeka delove", icon: Package },
  client_not_home: { color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50", label: "Klijent nije kod kuće", icon: MapPin },
  client_not_answering: { color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50", label: "Klijent se ne javlja", icon: Phone },
  customer_refused_repair: { color: "bg-gray-500", textColor: "text-gray-700", bgColor: "bg-gray-50", label: "Odbio servis", icon: XCircle }
};

interface Service {
  id: number;
  description: string;
  status: keyof typeof statusConfig;
  createdAt: string;
  scheduledDate?: string;
  cost?: string;
  technicianNotes?: string;
  client: {
    id: number;
    fullName: string;
    phone?: string;
    address?: string;
    city?: string;
  };
  appliance: {
    id: number;
    model?: string;
    serialNumber?: string;
    category: {
      name: string;
    };
  };
  priority: string;
  notes?: string;
}

export default function TechnicianServices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNotes, setStatusNotes] = useState("");

  // Debug user objekat
  console.log('[TEHNIČKI SERVISI] Current user:', user);
  console.log('[TEHNIČKI SERVISI] User technicianId:', user?.technicianId);
  console.log('[TEHNIČKI SERVISI] User role:', user?.role);

  // ENTERPRISE OPTIMIZED: Fetch technician services with performance monitoring
  const { data: services, isLoading, refetch } = useQuery<Service[]>({
    queryKey: ["/api/services/technician", user?.technicianId],
    queryFn: async () => {
      console.log('[TEHNIČKI SERVISI] Pozivam API za servisera:', user?.technicianId);
      console.log('[TEHNIČKI SERVISI] User objekat:', user);
      
      const startTime = Date.now();
      const response = await fetch(`/api/services/technician/${user?.technicianId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) {
        console.error('[TEHNIČKI SERVISI] API greška:', response.status, response.statusText);
        throw new Error("Failed to fetch services");
      }
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      console.log('[TEHNIČKI SERVISI] Dobijeno servisa:', data.length);
      
      return data;
    },
    enabled: !!user?.technicianId,
    staleTime: 30000, // 30 seconds cache
    refetchOnWindowFocus: false,
  });

  // Service status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ serviceId, status, notes }: { serviceId: number; status: string; notes?: string }) => {
      return apiRequest(`/api/services/${serviceId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, technicianNotes: notes }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Status ažuriran",
        description: "Status servisa je uspešno ažuriran."
      });
      setIsStatusUpdateOpen(false);
      setStatusNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/services/technician"] });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error?.message || "Greška pri ažuriranju statusa",
        variant: "destructive"
      });
    }
  });

  // Filter and search logic
  const filteredServices = services?.filter(service => {
    const matchesStatus = filterStatus === "all" || service.status === filterStatus;
    const matchesSearch = !searchTerm || 
      service.client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.appliance.model?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  // Status counts for tabs
  const statusCounts = services?.reduce((acc, service) => {
    acc[service.status] = (acc[service.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const activeServices = services?.filter(s => !['completed', 'cancelled'].includes(s.status)).length || 0;
  const completedToday = services?.filter(s => 
    s.status === 'completed' && 
    new Date(s.createdAt).toDateString() === new Date().toDateString()
  ).length || 0;

  const handleStatusUpdate = (service: Service) => {
    setSelectedService(service);
    setNewStatus(service.status);
    setIsStatusUpdateOpen(true);
  };

  const handleServiceDetails = (service: Service) => {
    setSelectedService(service);
    setIsDetailsOpen(true);
  };

  const submitStatusUpdate = () => {
    if (!selectedService) return;
    updateStatusMutation.mutate({
      serviceId: selectedService.id,
      status: newStatus,
      notes: statusNotes
    });
  };

  const getStatusBadge = (status: keyof typeof statusConfig) => {
    const config = statusConfig[status];
    const IconComponent = config.icon;
    return (
      <Badge className={`${config.bgColor} ${config.textColor} border-0`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      urgent: "bg-red-100 text-red-700",
      high: "bg-orange-100 text-orange-700", 
      normal: "bg-blue-100 text-blue-700",
      low: "bg-gray-100 text-gray-700"
    };
    return (
      <Badge className={priorityColors[priority as keyof typeof priorityColors] || priorityColors.normal}>
        {priority === 'urgent' ? 'Hitno' : priority === 'high' ? 'Visok' : priority === 'normal' ? 'Normalan' : 'Nizak'}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Settings className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Učitavam servise...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/tech">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Nazad
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Wrench className="h-6 w-6 text-blue-600" />
                Moji servisi
              </h1>
              <p className="text-gray-600">Upravljanje i praćenje servisnih zahteva</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {filteredServices.length} servis{filteredServices.length === 1 ? '' : 'a'}
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Play className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Aktivni</p>
                  <p className="text-2xl font-bold">{activeServices}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Završeni danas</p>
                  <p className="text-2xl font-bold">{completedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Čeka delove</p>
                  <p className="text-2xl font-bold">{statusCounts.waiting_parts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Zakazani</p>
                  <p className="text-2xl font-bold">{statusCounts.scheduled || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Pretraži servise</Label>
                <Input
                  id="search"
                  placeholder="Pretraži po klijentu, opisu ili modelu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="md:w-48">
                <Label htmlFor="status-filter">Filter po statusu</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Svi statusi</SelectItem>
                    {Object.entries(statusConfig).map(([status, config]) => (
                      <SelectItem key={status} value={status}>
                        {config.label} {statusCounts[status] ? `(${statusCounts[status]})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredServices.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{service.client.fullName}</CardTitle>
                  <div className="flex gap-2">
                    {getStatusBadge(service.status)}
                    {getPriorityBadge(service.priority)}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {service.appliance.category.name} - {service.appliance.model || 'Model nepoznat'}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{service.description}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(service.createdAt)}
                  </div>
                  {service.scheduledDate && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(service.scheduledDate)}
                    </div>
                  )}
                </div>

                {service.client.address && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {service.client.address}{service.client.city && `, ${service.client.city}`}
                  </div>
                )}

                {service.client.phone && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone className="h-3 w-3" />
                    {service.client.phone}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleServiceDetails(service)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Detalji
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleStatusUpdate(service)}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nema servisa</h3>
              <p className="text-gray-600">Trenutno nema servisa koji odgovaraju filteru.</p>
            </CardContent>
          </Card>
        )}

        {/* Service Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalji servisa #{selectedService?.id}</DialogTitle>
            </DialogHeader>
            {selectedService && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Klijent</Label>
                    <p className="font-medium">{selectedService.client.fullName}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedService.status)}</div>
                  </div>
                </div>

                <div>
                  <Label>Opis problema</Label>
                  <p className="mt-1 text-sm">{selectedService.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Uređaj</Label>
                    <p className="text-sm">{selectedService.appliance.category.name}</p>
                    <p className="text-sm text-gray-600">{selectedService.appliance.model}</p>
                  </div>
                  <div>
                    <Label>Prioritet</Label>
                    <div className="mt-1">{getPriorityBadge(selectedService.priority)}</div>
                  </div>
                </div>

                {selectedService.technicianNotes && (
                  <div>
                    <Label>Napomene servisera</Label>
                    <p className="mt-1 text-sm bg-gray-50 p-2 rounded">{selectedService.technicianNotes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Status Update Dialog */}
        <Dialog open={isStatusUpdateOpen} onOpenChange={setIsStatusUpdateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ažuriraj status servisa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Novi status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([status, config]) => (
                      <SelectItem key={status} value={status}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Napomene (opciono)</Label>
                <Textarea
                  placeholder="Dodajte napomene o statusu..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusUpdateOpen(false)}>
                Otkaži
              </Button>
              <Button 
                onClick={submitStatusUpdate}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? "Ažuriram..." : "Ažuriraj"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


      </div>
    </div>
  );
}