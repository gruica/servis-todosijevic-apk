import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Service } from "@shared/schema";
import { useMobile, useMobileEnvironment } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import MobileAppLayout from "@/components/mobile/MobileAppLayout";
import MobileServiceManager from "@/components/mobile/MobileServiceManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, RefreshCw, Phone, MapPin, Calendar, User, Wrench, Settings, Users, Shield } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";

type AdminService = Service & {
  technician?: {
    id: number;
    fullName: string;
    phone: string;
  };
  client?: {
    id: number;
    fullName: string;
    phone: string;
    address: string | null;
    email: string | null;
    city: string | null;
  };
  appliance?: {
    id: number;
    model: string | null;
    serialNumber: string | null;
    category?: {
      id: number;
      name: string;
      icon: string;
    };
  };
};

export default function AdminServicesMobile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useMobile();
  const isMobileDevice = useMobileEnvironment();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch all services for admin
  const { data: services = [], isLoading, refetch } = useQuery<AdminService[]>({
    queryKey: ["/api/services"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/services", { signal });
      if (!response.ok) {
        throw new Error("Greška pri dobijanju servisa");
      }
      return response.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Fetch technicians for assignment
  const { data: technicians = [] } = useQuery<any[]>({
    queryKey: ["/api/technicians"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/technicians", { signal });
      if (!response.ok) {
        throw new Error("Greška pri dobijanju servisera");
      }
      return response.json();
    },
  });

  // Mutation for admin service management
  const updateServiceMutation = useMutation({
    mutationFn: async ({ 
      serviceId, 
      status,
      technicianId,
      scheduledDate,
      adminNotes
    }: { 
      serviceId: number; 
      status?: string;
      technicianId?: number;
      scheduledDate?: string;
      adminNotes?: string;
    }) => {
      const res = await apiRequest("PUT", `/api/services/${serviceId}`, { 
        status,
        technicianId,
        scheduledDate,
        adminNotes
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Servis ažuriran",
        description: "Promene su uspešno sačuvane",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri ažuriranju",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for assigning technician
  const assignTechnicianMutation = useMutation({
    mutationFn: async ({ 
      serviceId, 
      technicianId
    }: { 
      serviceId: number; 
      technicianId: number;
    }) => {
      const res = await apiRequest("POST", `/api/services/${serviceId}/assign-technician`, { 
        technicianId
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Serviser dodeljen",
        description: "Serviser je uspešno dodeljen servisu",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri dodeljivanju servisera",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Funkcija za ažuriranje servisa
  const handleUpdateService = (serviceId: number, updates: any) => {
    if (updates.technicianId) {
      assignTechnicianMutation.mutate({
        serviceId,
        technicianId: updates.technicianId
      });
    } else {
      updateServiceMutation.mutate({
        serviceId,
        status: updates.status,
        scheduledDate: updates.scheduledDate,
        adminNotes: updates.adminNotes
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Mobilni interfejs - uvek koristiti za mobilne uređaje
  if (isMobile || isMobileDevice) {
    return (
      <MobileAppLayout
        title="Upravljanje servisima"
        rightAction={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
        floatingActionButton={
          <Link href="/admin/service-management">
            <Button
              size="sm"
              className="rounded-full w-12 h-12"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
        }
      >
        <MobileServiceManager
          services={services}
          onUpdateService={handleUpdateService}
          userRole="admin"
          onRefresh={refetch}
        />
      </MobileAppLayout>
    );
  }

  // Desktop interfejs
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        closeMobileMenu={() => setSidebarOpen(false)} 
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Upravljanje servisima</h1>
                <p className="text-gray-600">Pregled i upravljanje svim servisima</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Osveži
                </Button>
                <Link href="/admin/service-management">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novi servis
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ukupno servisa</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{services.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktivni servisi</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {services.filter(s => ['pending', 'assigned', 'scheduled', 'in_progress'].includes(s.status)).length}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Završeni servisi</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {services.filter(s => s.status === 'completed').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Servisi</CardTitle>
                <CardDescription>
                  Pregled svih servisa u sistemu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {services.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Wrench className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Nema servisa u sistemu</p>
                      <Link href="/admin/service-management">
                        <Button className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          Kreirajte novi servis
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    services.map((service) => (
                      <Card key={service.id} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              Servis #{service.id}
                            </CardTitle>
                            <Badge variant="outline">
                              {service.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 mb-2">
                            {service.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>📅 {formatDate(service.createdAt)}</span>
                            {service.client && (
                              <span>👤 {service.client.fullName}</span>
                            )}
                            {service.technician && (
                              <span>👨‍🔧 {service.technician.fullName}</span>
                            )}
                            {service.appliance && (
                              <span>🔧 {service.appliance.category?.name} - {service.appliance.model}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}