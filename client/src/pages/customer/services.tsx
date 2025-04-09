import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import CustomerLayout from "@/components/layout/customer-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings, Calendar, Clock } from "lucide-react";
import { Service, Appliance, Manufacturer, ApplianceCategory } from "@shared/schema";
import { formatDate } from "@/lib/utils";

// Tip koji kombinuje servis sa detaljima o uređaju
type ServiceWithDetails = Service & {
  appliance?: Appliance;
  manufacturer?: Manufacturer;
  category?: ApplianceCategory;
};

// Funkcija za mapiranje statusa servisa na srpski jezik i boju bedža
function getStatusInfo(status: string) {
  const statusMap: Record<string, { label: string; color: string }> = {
    "pending": { label: "Na čekanju", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
    "scheduled": { label: "Zakazano", color: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
    "in_progress": { label: "U toku", color: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
    "waiting_parts": { label: "Čeka delove", color: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
    "completed": { label: "Završeno", color: "bg-green-100 text-green-800 hover:bg-green-100" },
    "cancelled": { label: "Otkazano", color: "bg-red-100 text-red-800 hover:bg-red-100" },
  };
  
  return statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800 hover:bg-gray-100" };
}

export default function CustomerServices() {
  const { user } = useAuth();
  
  // Dohvatanje svih servisa korisnika
  const { data: services, isLoading: isLoadingServices } = useQuery<ServiceWithDetails[]>({
    queryKey: ["/api/services/user"],
    queryFn: async () => {
      const res = await fetch(`/api/services/user/${user?.id}`);
      if (!res.ok) throw new Error("Greška pri dohvatanju servisa");
      return await res.json();
    },
    enabled: !!user,
  });
  
  // Dohvatanje dodatnih podataka o uređajima i kategorijama
  const { data: appliances } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances"],
    enabled: !!user,
  });
  
  const { data: manufacturers } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"],
    enabled: !!user,
  });
  
  const { data: categories } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"],
    enabled: !!user,
  });
  
  // Kombinovanje podataka za prikaz
  const enrichedServices = services?.map(service => {
    const appliance = appliances?.find(a => a.id === service.applianceId);
    const manufacturer = appliance && manufacturers?.find(m => m.id === appliance.manufacturerId);
    const category = appliance && categories?.find(c => c.id === appliance.categoryId);
    
    return {
      ...service,
      appliance,
      manufacturer,
      category,
    };
  }) || [];
  
  // Sortiranje servisa - najnoviji prvo
  const sortedServices = [...enrichedServices].sort((a, b) => {
    const dateA = new Date(a.createdAt || "");
    const dateB = new Date(b.createdAt || "");
    return dateB.getTime() - dateA.getTime();
  });
  
  if (isLoadingServices) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-gray-500">Učitavanje servisa...</p>
        </div>
      </CustomerLayout>
    );
  }
  
  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Moji servisi
            </CardTitle>
            <CardDescription>
              Pregledajte status vaših servisa i detalje o njima
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedServices.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">Nemate aktivnih servisa</h3>
                <p className="text-gray-500">
                  Trenutno nemate prijavljenih servisa. Možete prijaviti novi kvar na stranici "Prijava kvara".
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedServices.map((service) => {
                  const statusInfo = getStatusInfo(service.status);
                  return (
                    <div 
                      key={service.id} 
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                        <div>
                          <h3 className="font-medium">
                            {service.category?.name} {service.manufacturer?.name} {service.appliance?.model}
                          </h3>
                          <p className="text-sm text-gray-500">
                            SN: {service.appliance?.serialNumber || "Nije unet"}
                          </p>
                        </div>
                        <Badge className={`mt-2 sm:mt-0 ${statusInfo.color}`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-3 mt-4">
                        <div className="flex flex-col sm:flex-row sm:space-x-4">
                          <div className="flex items-center text-sm text-gray-600 mb-2 sm:mb-0">
                            <Calendar className="h-4 w-4 mr-1.5" />
                            <span>Prijavljeno: {formatDate(service.createdAt || "")}</span>
                          </div>
                          {service.scheduledDate && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="h-4 w-4 mr-1.5" />
                              <span>Zakazano: {formatDate(service.scheduledDate)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-sm">
                          <span className="font-medium">Opis problema: </span>
                          <span className="text-gray-600">{service.description}</span>
                        </div>
                        
                        {service.technicianNotes && (
                          <div className="text-sm mt-1">
                            <span className="font-medium">Napomena servisera: </span>
                            <span className="text-gray-600">{service.technicianNotes}</span>
                          </div>
                        )}
                        
                        {service.completedDate && (
                          <div className="text-sm text-green-600 mt-1 flex items-center">
                            <span className="font-medium mr-1">Servisirano: </span>
                            <span>{formatDate(service.completedDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}