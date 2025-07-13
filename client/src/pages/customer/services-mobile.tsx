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
import { Plus, RefreshCw, Phone, MapPin, Calendar, User, Wrench } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";

type CustomerService = Service & {
  technician?: {
    id: number;
    fullName: string;
    phone: string;
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

export default function CustomerServicesMobile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useMobile();
  const isMobileDevice = useMobileEnvironment();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch customer services
  const { data: services = [], isLoading, refetch } = useQuery<CustomerService[]>({
    queryKey: ["/api/customer/services"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/customer/services", { signal });
      if (!response.ok) {
        throw new Error("Greška pri dobijanju servisa");
      }
      return response.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Mutation for updating service feedback
  const updateServiceMutation = useMutation({
    mutationFn: async ({ 
      serviceId, 
      feedback
    }: { 
      serviceId: number; 
      feedback: string;
    }) => {
      const res = await apiRequest("PUT", `/api/customer/services/${serviceId}/feedback`, { 
        feedback
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/services"] });
      toast({
        title: "Feedback poslat",
        description: "Vaš feedback je uspešno poslat",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri slanju feedback-a",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Funkcija za ažuriranje servisa (samo feedback za customer)
  const handleUpdateService = (serviceId: number, updates: any) => {
    if (updates.feedback) {
      updateServiceMutation.mutate({
        serviceId,
        feedback: updates.feedback
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
        title="Moji servisi"
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
          <Link href="/customer/new-service">
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
          userRole="customer"
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
                <h1 className="text-2xl font-bold text-gray-900">Moji servisi</h1>
                <p className="text-gray-600">Pregled vaših servisnih zahteva</p>
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
                <Link href="/customer/new-service">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novi servis
                  </Button>
                </Link>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Servisi</CardTitle>
                <CardDescription>
                  Pregled svih vaših servisnih zahteva
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {services.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Wrench className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Nemate servise</p>
                      <Link href="/customer/new-service">
                        <Button className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          Kreirajte novi servis
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    services.map((service) => (
                      <Card key={service.id} className="border-l-4 border-l-green-500">
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