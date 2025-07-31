import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BusinessPartnerNotifications } from "@/components/admin/business-partner-notifications";
import BusinessPartnerMessages from "@/components/admin/business-partner-messages";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Calendar,
  Phone,
  Mail,
  MapPin,
  Package,
  User,
  Wrench,
  Timer,
  UserCheck,
  MessageSquare,
  Eye,
  Star,
  BarChart3,
  Activity,
  Zap,
  Filter,
  Search,
  ArrowUpRight,
  Briefcase,
  Target
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Interfaces
interface BusinessPartnerService {
  id: number;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedCompletion?: string;
  businessPartnerCompany: string;
  client: {
    id: number;
    fullName: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
  };
  appliance: {
    id: number;
    model?: string;
    serialNumber?: string;
    category: { name: string; icon: string };
    manufacturer: { name: string };
  };
  technician?: {
    id: number;
    fullName: string;
    phone?: string;
    email?: string;
    specialization?: string;
  };
  responseTime?: number; // in hours
  isOverdue: boolean;
  businessPartner: {
    id: number;
    fullName: string;
    companyName: string;
    phone?: string;
    email?: string;
  };
}

interface BusinessPartnerStats {
  totalRequests: number;
  pendingRequests: number;
  activeRequests: number;
  completedRequests: number;
  averageResponseTime: number;
  overdueRequests: number;
  partnerCount: number;
  thisMonthRequests: number;
  topPartners: Array<{
    companyName: string;
    requestCount: number;
    avgResponseTime: number;
    satisfactionScore: number;
  }>;
}

// Status translation
const statusTranslations: Record<string, string> = {
  pending: "Na čekanju",
  assigned: "Dodeljen",
  scheduled: "Zakazan", 
  in_progress: "U toku",
  waiting_parts: "Čeka delove",
  completed: "Završen",
  cancelled: "Otkazan",
  on_hold: "Pauziran"
};

// Priority colors
const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 border-gray-300",
  medium: "bg-blue-100 text-blue-700 border-blue-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  urgent: "bg-red-100 text-red-700 border-red-300"
};

const priorityTranslations: Record<string, string> = {
  low: "Nizak",
  medium: "Srednji", 
  high: "Visok",
  urgent: "Hitno"
};

export default function BusinessPartnersAdminPage() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterPartner, setFilterPartner] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch business partner services
  const { data: services = [], isLoading: servicesLoading } = useQuery<BusinessPartnerService[]>({
    queryKey: ["/api/admin/business-partner-services"],
  });

  // Fetch business partner statistics
  const { data: stats } = useQuery<BusinessPartnerStats>({
    queryKey: ["/api/admin/business-partner-stats"],
  });

  // Quick action mutations
  const assignTechnicianMutation = useMutation({
    mutationFn: async ({ serviceId, technicianId }: { serviceId: number; technicianId: number }) => {
      return apiRequest(`/api/admin/business-partner-services/${serviceId}/assign-technician`, {
        method: "PUT",
        body: JSON.stringify({ technicianId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-services"] });
      toast({ title: "Uspešno", description: "Serviser je dodeljen business partner zahtevu." });
    },
    onError: () => {
      toast({ 
        title: "Greška", 
        description: "Došlo je do greške pri dodeljivanju servisera.",
        variant: "destructive" 
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ serviceId, status }: { serviceId: number; status: string }) => {
      return apiRequest(`/api/admin/business-partner-services/${serviceId}/update-status`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-services"] });
      toast({ title: "Uspešno", description: "Status servisa je ažuriran." });
    },
    onError: () => {
      toast({ 
        title: "Greška", 
        description: "Došlo je do greške pri ažuriranju statusa.",
        variant: "destructive" 
      });
    }
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ serviceId, priority }: { serviceId: number; priority: string }) => {
      return apiRequest(`/api/admin/business-partner-services/${serviceId}/priority`, {
        method: "PUT",
        body: JSON.stringify({ priority })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-services"] });
      toast({ title: "Uspešno", description: "Prioritet je ažuriran." });
    },
    onError: () => {
      toast({ 
        title: "Greška", 
        description: "Došlo je do greške pri ažuriranju prioriteta.",
        variant: "destructive" 
      });
    }
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      return apiRequest(`/api/admin/business-partner-services/${serviceId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-services"] });
      toast({ title: "Uspešno", description: "Business partner servis je obrisan." });
    },
    onError: () => {
      toast({ 
        title: "Greška", 
        description: "Došlo je do greške pri brisanju servisa.",
        variant: "destructive" 
      });
    }
  });

  // Filter services
  const filteredServices = services.filter(service => {
    const matchesStatus = filterStatus === "all" || service.status === filterStatus;
    const matchesPriority = filterPriority === "all" || service.priority === filterPriority;
    const matchesPartner = filterPartner === "all" || service.businessPartner.companyName === filterPartner;
    const matchesSearch = searchQuery === "" || 
      service.client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.businessPartner.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesPartner && matchesSearch;
  });

  // Get unique partners for filter
  const uniquePartners = Array.from(new Set(services.map(s => s.businessPartner.companyName)));

  return (
    <AdminLayout>
      <div className="space-y-8 p-6">
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-800 -m-6 mb-8 p-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Business Partner Management</h1>
                <p className="text-purple-100 mt-1">Upravljanje zahtevima poslovnih partnera</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Activity className="mr-2 h-4 w-4" />
                Live Updates
              </Button>
              <Button 
                className="bg-white text-purple-600 hover:bg-gray-50"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/20" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-purple-900">Ukupno zahteva</CardTitle>
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-purple-900">{stats?.totalRequests || 0}</div>
              <p className="text-sm text-purple-700 mt-1">Svi BP zahtevi</p>
              <div className="text-xs text-purple-600 mt-2 font-medium">
                +{stats?.thisMonthRequests || 0} ovog meseca
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/20" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-orange-900">Na čekanju</CardTitle>
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-white animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-orange-900">{stats?.pendingRequests || 0}</div>
              <p className="text-sm text-orange-700 mt-1">Zahtevaju akciju</p>
              <div className="text-xs text-orange-600 mt-2 font-medium">
                Prosečno vreme: {stats?.averageResponseTime || 0}h
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/20" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-blue-900">Aktivni</CardTitle>
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-blue-900">{stats?.activeRequests || 0}</div>
              <p className="text-sm text-blue-700 mt-1">U obradi</p>
              <div className="text-xs text-blue-600 mt-2 font-medium">
                {stats?.partnerCount || 0} aktivnih partnera
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/20" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-red-900">Prekoračeni</CardTitle>
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white animate-bounce" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-red-900">{stats?.overdueRequests || 0}</div>
              <p className="text-sm text-red-700 mt-1">Prekoračen SLA</p>
              <div className="text-xs text-red-600 mt-2 font-medium">
                Zahtevaju hitnu akciju
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Pregled zahteva
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notifikacije
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Poruke
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-purple-100 text-purple-700 animate-pulse">
                Phase 3
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analitika
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filteri i pretraga
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <Label>Pretraga</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Pretraži zahteve..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Svi statusi</SelectItem>
                        <SelectItem value="pending">Na čekanju</SelectItem>
                        <SelectItem value="assigned">Dodeljen</SelectItem>
                        <SelectItem value="in_progress">U toku</SelectItem>
                        <SelectItem value="completed">Završen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Prioritet</Label>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Svi prioriteti</SelectItem>
                        <SelectItem value="urgent">Hitno</SelectItem>
                        <SelectItem value="high">Visok</SelectItem>
                        <SelectItem value="medium">Srednji</SelectItem>
                        <SelectItem value="low">Nizak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Partner</Label>
                    <Select value={filterPartner} onValueChange={setFilterPartner}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Svi partneri</SelectItem>
                        {uniquePartners.map(partner => (
                          <SelectItem key={partner} value={partner}>{partner}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFilterStatus("all");
                        setFilterPriority("all");
                        setFilterPartner("all");
                        setSearchQuery("");
                      }}
                    >
                      Resetui filtere
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Business Partner zahtevi ({filteredServices.length})
                  </div>
                  <Badge variant="outline" className="text-purple-600 border-purple-200">
                    Live Updates
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {filteredServices.map((service) => (
                      <Card key={service.id} className={`border-l-4 hover:shadow-lg transition-shadow ${
                        service.priority === 'urgent' ? 'border-l-red-500 bg-red-50/30' :
                        service.priority === 'high' ? 'border-l-orange-500 bg-orange-50/30' :
                        service.isOverdue ? 'border-l-yellow-500 bg-yellow-50/30' :
                        'border-l-blue-500'
                      }`}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-lg">Zahtev #{service.id}</h4>
                                <Badge className={priorityColors[service.priority]}>
                                  {priorityTranslations[service.priority]}
                                </Badge>
                                <Badge variant="outline">
                                  {statusTranslations[service.status] || service.status}
                                </Badge>
                                {service.isOverdue && (
                                  <Badge className="bg-red-100 text-red-700 border-red-300 animate-pulse">
                                    <Timer className="h-3 w-3 mr-1" />
                                    Prekoračen
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-gray-700 mb-3">{service.description}</p>
                              
                              {/* Business Partner Info */}
                              <div className="bg-purple-50 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Building2 className="h-4 w-4 text-purple-600" />
                                  <span className="font-medium text-purple-900">{service.businessPartner.companyName}</span>
                                </div>
                                <div className="text-sm text-purple-700">
                                  Kontakt: {service.businessPartner.fullName}
                                  {service.businessPartner.phone && ` • ${service.businessPartner.phone}`}
                                </div>
                              </div>

                              {/* Client & Device Info */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <User className="h-4 w-4 text-gray-600" />
                                    <span className="font-medium text-gray-900">{service.client.fullName}</span>
                                  </div>
                                  <div className="space-y-1 text-sm text-gray-600">
                                    {service.client.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-3 w-3" />
                                        {service.client.phone}
                                      </div>
                                    )}
                                    {service.client.city && (
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-3 w-3" />
                                        {service.client.city}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="bg-blue-50 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Package className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium text-blue-900">{service.appliance.category.name}</span>
                                  </div>
                                  <div className="text-sm text-blue-700">
                                    {service.appliance.manufacturer.name}
                                    {service.appliance.model && ` • ${service.appliance.model}`}
                                  </div>
                                </div>
                              </div>

                              {/* Response Time & Timeline */}
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Kreiran: {new Date(service.createdAt).toLocaleDateString()}
                                </div>
                                {service.responseTime && (
                                  <div className="flex items-center gap-1">
                                    <Timer className="h-4 w-4" />
                                    Vreme odgovora: {service.responseTime}h
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-col gap-2 ml-4">
                              {service.status === 'pending' && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    // Quick assign logic here
                                  }}
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Dodeli
                                </Button>
                              )}
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Eye className="h-4 w-4 mr-1" />
                                    Detalji
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Zahtev #{service.id} - Detalji</DialogTitle>
                                    <DialogDescription>
                                      Detaljne informacije o zahtevu poslovnog partnera
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    {/* Detailed service information would go here */}
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                      <h4 className="font-medium mb-2">Opis problema:</h4>
                                      <p>{service.description}</p>
                                    </div>
                                    
                                    {service.technician && (
                                      <div className="p-4 bg-blue-50 rounded-lg">
                                        <h4 className="font-medium mb-2">Dodeljeni serviser:</h4>
                                        <div className="flex items-center gap-2">
                                          <Wrench className="h-4 w-4 text-blue-600" />
                                          <span>{service.technician.fullName}</span>
                                          {service.technician.phone && (
                                            <span className="text-gray-600">• {service.technician.phone}</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-purple-600 border-purple-200 hover:bg-purple-50"
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Poruka
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <BusinessPartnerNotifications />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <BusinessPartnerMessages />
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Business Partner Analitika
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Analitika će biti implementirana u sledećoj fazi</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}