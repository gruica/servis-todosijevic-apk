import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import BusinessPartnerMessages from "@/components/admin/business-partner-messages";
import { 
  Users, 
  Building2, 
  TrendingUp, 
  Clock, 
  Filter,
  Search,
  Briefcase,
  Timer,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  User,
  Phone,
  MapPin,
  Package,
  Calendar,
  Trash2,
  MessageSquare
} from "lucide-react";

// Types with comprehensive null safety
interface BusinessPartnerService {
  id: number;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  businessPartner?: {
    fullName?: string;
    companyName?: string;
    phone?: string;
    email?: string;
  } | null;
  client?: {
    fullName?: string;
    phone?: string;
    city?: string;
    email?: string;
  } | null;
  appliance?: {
    category?: {
      name?: string;
    } | null;
    manufacturer?: {
      name?: string;
    } | null;
    model?: string;
  } | null;
  technician?: {
    fullName?: string;
    phone?: string;
  } | null;
  isOverdue?: boolean;
  responseTime?: number;
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

export default function BusinessPartnerManagementFixed() {
  const { toast } = useToast();
  
  // State for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterPartner, setFilterPartner] = useState("all");

  // Fetch business partner services with error handling
  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["/api/admin/business-partner-services"],
    queryFn: async () => {
      const response = await apiRequest("/api/admin/business-partner-services");
      return await response.json();
    }
  });

  // Fetch business partner stats
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/admin/business-partner-stats"],
    queryFn: async () => {
      const response = await apiRequest("/api/admin/business-partner-stats");
      return await response.json();
    }
  });

  // Fetch message stats for badge notification
  const { data: messageStats } = useQuery({
    queryKey: ["/api/admin/business-partner-messages/stats"],
    queryFn: async () => {
      const response = await apiRequest("/api/admin/business-partner-messages/stats");
      return await response.json();
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  console.log("📊 Business Partner Stats Raw Data:", statsData);

  const stats: BusinessPartnerStats = statsData || {
    totalRequests: 0,
    pendingRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    averageResponseTime: 0,
    overdueRequests: 0,
    partnerCount: 0,
    thisMonthRequests: 0,
    topPartners: []
  };

  console.log("📊 Business Partner Stats Processed:", stats);
  console.log("📋 Business Partner Services:", services?.length || 0, "total services");

  // Translations
  const statusTranslations: Record<string, string> = {
    pending: "Na čekanju",
    assigned: "Dodeljen",
    in_progress: "U toku",
    completed: "Završen",
    cancelled: "Otkazan"
  };

  const priorityTranslations: Record<string, string> = {
    urgent: "Hitno",
    high: "Visok",
    medium: "Srednji",
    low: "Nizak"
  };

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 border-red-300",
    high: "bg-orange-100 text-orange-700 border-orange-300",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
    low: "bg-green-100 text-green-700 border-green-300"
  };

  // Mutations for actions
  const assignTechnicianMutation = useMutation({
    mutationFn: async ({ serviceId, technicianId }: { serviceId: number; technicianId: number }) => {
      return apiRequest(`/api/admin/business-partner-services/${serviceId}/assign-technician`, {
        method: "PUT",
        body: JSON.stringify({ technicianId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-services"] });
      toast({ title: "Uspešno", description: "Serviser je uspešno dodeljen." });
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

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      return apiRequest(`/api/admin/business-partner-services/${serviceId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-services"] });
      toast({ title: "Uspešno", description: "Servis poslovnog partnera je obrisan." });
    },
    onError: () => {
      toast({ 
        title: "Greška", 
        description: "Došlo je do greške pri brisanju servisa.",
        variant: "destructive" 
      });
    }
  });

  // Safe filtering with null checks
  const servicesArray = Array.isArray(services) ? services : [];
  const filteredServices = servicesArray.filter((service: BusinessPartnerService) => {
    if (!service) return false;
    
    const matchesStatus = filterStatus === "all" || service.status === filterStatus;
    const matchesPriority = filterPriority === "all" || service.priority === filterPriority;
    const matchesPartner = filterPartner === "all" || (service.businessPartner?.companyName === filterPartner);
    const matchesSearch = searchQuery === "" || 
      (service.client?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.businessPartner?.companyName?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesPriority && matchesPartner && matchesSearch;
  });

  // Get unique partners for filter with null checks
  const uniquePartners = Array.from(new Set(
    servicesArray
      .map((s: BusinessPartnerService) => s.businessPartner?.companyName)
      .filter(Boolean)
  ));

  if (isLoadingServices || isLoadingStats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Učitavanje servisa poslovnih partnera...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 p-6">
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-800 -m-6 mb-8 p-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Upravljanje poslovnim partnerima</h1>
                <p className="text-purple-100 mt-1">Upravljanje zahtevima poslovnih partnera</p>
              </div>
            </div>
            <div className="text-right text-white">
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <div className="text-purple-200 text-sm">Ukupno zahteva</div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Ukupno zahteva</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalRequests}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 text-sm font-medium">Na čekanju</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.pendingRequests}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Aktivni</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.activeRequests}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Završeno</p>
                  <p className="text-2xl font-bold text-green-900">{stats.completedRequests}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Avg. odgovor</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.averageResponseTime}h</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Prekoračeni</p>
                  <p className="text-2xl font-bold text-red-900">{stats.overdueRequests}</p>
                </div>
                <Timer className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="messages" className="flex items-center gap-2 relative">
              <MessageSquare className="h-4 w-4" />
              📬 Poruke Partnera
              {messageStats?.unreadMessages > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {messageStats.unreadMessages}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Pregled zahteva
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Obaveštenja
            </TabsTrigger>
            <TabsTrigger value="analytics">
              Analytics
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
                        {uniquePartners.map((partner: string) => (
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
                    {filteredServices.map((service: BusinessPartnerService) => (
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
                              
                              <p className="text-gray-700 mb-3">{service.description || 'Nema opisa'}</p>
                              
                              {/* Business Partner Info */}
                              {service.businessPartner && (
                                <div className="bg-purple-50 rounded-lg p-3 mb-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="h-4 w-4 text-purple-600" />
                                    <span className="font-medium text-purple-900">
                                      {service.businessPartner.companyName || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="text-sm text-purple-700">
                                    Kontakt: {service.businessPartner.fullName || 'N/A'}
                                    {service.businessPartner.phone && ` • ${service.businessPartner.phone}`}
                                  </div>
                                </div>
                              )}

                              {/* Client & Device Info */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                {service.client && (
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <User className="h-4 w-4 text-gray-600" />
                                      <span className="font-medium text-gray-900">
                                        {service.client.fullName || 'N/A'}
                                      </span>
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
                                )}

                                {service.appliance && (
                                  <div className="bg-blue-50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Package className="h-4 w-4 text-blue-600" />
                                      <span className="font-medium text-blue-900">
                                        {service.appliance.category?.name || 'N/A'}
                                      </span>
                                    </div>
                                    <div className="text-sm text-blue-700">
                                      {service.appliance.manufacturer?.name || 'N/A'}
                                      {service.appliance.model && ` • ${service.appliance.model}`}
                                    </div>
                                  </div>
                                )}
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
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => updateStatusMutation.mutate({ serviceId: service.id, status: 'assigned' })}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Dodeli
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => updateStatusMutation.mutate({ serviceId: service.id, status: 'completed' })}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Završi
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => deleteServiceMutation.mutate(service.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Obriši
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {filteredServices.length === 0 && (
                      <div className="text-center py-12">
                        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nema zahteva poslovnih partnera</h3>
                        <p className="text-gray-600">Trenutno nema zahteva koji odgovaraju vašim filterima.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Obaveštenja</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Funkcionalnost obaveštenja će biti implementirana uskoro.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <BusinessPartnerMessages />
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analitika</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Funkcionalnost analitike će biti implementirana uskoro.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}