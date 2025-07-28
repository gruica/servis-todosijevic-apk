import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  User, 
  Package, 
  Truck, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  LogOut,
  Bell
} from "lucide-react";
// TEMPORARILY DISABLED: import NotificationsDropdown from "@/components/notifications-dropdown";

interface Service {
  id: number;
  description: string;
  status: string;
  scheduledDate: string;
  createdAt: string;
  client: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
  };
  appliance: {
    category: { name: string };
    manufacturer: { name: string };
    model: string;
    serialNumber: string;
  };
}

export default function TechnicianServices() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("active");

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      toast({
        title: "Odjava uspešna",
        description: "Uspešno ste se odjavili.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri odjavi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch services
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["/api/my-services"],
    enabled: !!user,
  });

  // Service status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ serviceId, status, notes }: { serviceId: number; status: string; notes?: string }) => {
      return apiRequest(`/api/services/${serviceId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status, technicianNotes: notes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
      toast({
        title: "Status ažuriran",
        description: "Status servisa je uspešno promenjen.",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri ažuriranju statusa.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Na čekanju", className: "bg-yellow-100 text-yellow-800" },
      assigned: { label: "Dodeljen", className: "bg-blue-100 text-blue-800" },
      in_progress: { label: "U toku", className: "bg-purple-100 text-purple-800" },
      completed: { label: "Završen", className: "bg-green-100 text-green-800" },
      cancelled: { label: "Otkazan", className: "bg-red-100 text-red-800" },
      waiting_parts: { label: "Čeka delove", className: "bg-amber-100 text-amber-800" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleQuickStatusUpdate = async (serviceId: number, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ serviceId, status: newStatus });
    } catch (error) {
      console.error("Greška pri brzom ažuriranju statusa:", error);
    }
  };

  // Filter services based on active tab
  const filteredServices = services.filter((service: Service) => {
    if (activeTab === "active") {
      return ["assigned", "in_progress", "waiting_parts"].includes(service.status);
    }
    if (activeTab === "completed") {
      return service.status === "completed";
    }
    if (activeTab === "picked_up") {
      return service.status === "device_picked_up";
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-primary rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Mobile-First Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 shadow-xl">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Moji Servisi</h1>
                <p className="text-blue-100 text-sm">{user?.fullName || user?.username}</p>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              {/* TEMPORARILY DISABLED: <NotificationsDropdown /> */}
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              {/* VELIKI TEXT LINK ZA LOGOUT */}
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="text-white underline text-lg font-bold"
              >
                {logoutMutation.isPending ? "Odjavljujem..." : ">>> ODJAVI SE <<<"}
              </button>
            </div>
          </div>
        </div>
        
        {/* DODATNI LOGOUT LINK NA VRHU STRANICE */}
        <div className="bg-red-600 text-center py-3">
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="text-white text-xl font-bold underline"
          >
            {logoutMutation.isPending ? "ODJAVLJUJEM..." : "*** KLIKNITE OVDE DA SE ODJAVITE ***"}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 pb-6">
        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Aktivni</TabsTrigger>
            <TabsTrigger value="completed">Završeni</TabsTrigger>
            <TabsTrigger value="picked_up">Preuzeti</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="space-y-4">
              {filteredServices.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">Nema servisa u ovoj kategoriji.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredServices.map((service: Service) => (
                  <Card key={service.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Servis #{service.id}</CardTitle>
                        {getStatusBadge(service.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="font-medium text-gray-900">{service.client.fullName}</p>
                        <p className="text-sm text-gray-600">{service.client.phone}</p>
                        <p className="text-sm text-gray-600">{service.client.city}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {service.appliance.category.name} - {service.appliance.manufacturer.name}
                        </p>
                        <p className="text-sm text-gray-600">{service.appliance.model}</p>
                      </div>

                      <p className="text-sm text-gray-600">{service.description}</p>

                      {/* Quick action buttons for active services */}
                      {["assigned", "in_progress", "waiting_parts"].includes(service.status) && (
                        <div className="flex gap-2 mt-4">
                          {service.status === "assigned" && (
                            <Button
                              size="sm"
                              onClick={() => handleQuickStatusUpdate(service.id, "in_progress")}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Počni rad
                            </Button>
                          )}
                          
                          {service.status === "in_progress" && (
                            <Button
                              size="sm"
                              onClick={() => handleQuickStatusUpdate(service.id, "completed")}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Završi servis
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickStatusUpdate(service.id, "waiting_parts")}
                            className="border-amber-500 text-amber-700 hover:bg-amber-50"
                          >
                            Poruči delove
                          </Button>

                          {service.status === "waiting_parts" && (
                            <Button
                              size="sm"
                              onClick={() => handleQuickStatusUpdate(service.id, "in_progress")}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Nastavi rad
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}