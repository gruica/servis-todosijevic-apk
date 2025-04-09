import { useAuth } from "@/hooks/use-auth";
import BusinessLayout from "@/components/layout/business-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PlusCircle, Wrench, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

// Tip za servisni zahtev
interface ServiceItem {
  id: number;
  status: string;
  description: string;
  createdAt: string;
}

// Funkcija za prevod statusa
function translateStatus(status: string) {
  const statusMap: Record<string, string> = {
    pending: "Na čekanju",
    assigned: "Dodeljen serviseru",
    scheduled: "Zakazan",
    in_progress: "U toku",
    waiting_parts: "Čeka delove",
    completed: "Završen",
    cancelled: "Otkazan"
  };
  return statusMap[status] || status;
}

export default function BusinessDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // Dohvatanje servisnih zahteva za poslovnog partnera
  const { data: services, isLoading } = useQuery<ServiceItem[]>({
    queryKey: ["/api/business/services/summary", user?.id],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/business/services?partnerId=${user?.id}`);
        if (!response.ok) {
          throw new Error('Greška pri dohvatanju servisa');
        }
        return await response.json();
      } catch (error) {
        console.error("Greška pri dohvatanju servisa:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });
  
  // Brojanje servisa po statusima
  const statusCounts = services?.reduce((acc, service) => {
    acc[service.status] = (acc[service.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  // Ukupan broj servisa
  const totalServices = services?.length || 0;
  // Broj aktivnih servisa (svi osim completed i cancelled)
  const activeServices = services?.filter(s => !['completed', 'cancelled'].includes(s.status)).length || 0;
  // Broj završenih servisa
  const completedServices = statusCounts['completed'] || 0;
  // Broj servisa na čekanju
  const pendingServices = statusCounts['pending'] || 0;
  
  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Dobrodošli, {user?.fullName || user?.companyName || "Poslovni partner"}
            </h2>
            <p className="text-muted-foreground">
              Pregled vaših servisnih zahteva i aktivnosti
            </p>
          </div>
          <Button 
            className="mt-4 md:mt-0" 
            onClick={() => navigate("/business/services/new")}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Novi servisni zahtev
          </Button>
        </div>
        
        {/* Kartice sa statistikama */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Ukupno zahteva</CardTitle>
              <Wrench className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalServices}</div>
              <p className="text-xs text-muted-foreground">
                Svi servisni zahtevi
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Aktivni zahtevi</CardTitle>
              <Wrench className="h-4 w-4 text-green-500 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeServices}</div>
              <p className="text-xs text-muted-foreground">
                Zahtevi u obradi
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Na čekanju</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingServices}</div>
              <p className="text-xs text-muted-foreground">
                Zahtevi koji čekaju obradu
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Završeni</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedServices}</div>
              <p className="text-xs text-muted-foreground">
                Uspešno završeni zahtevi
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Aktivnosti */}
        <Card>
          <CardHeader>
            <CardTitle>Aktivnosti</CardTitle>
            <CardDescription>
              Pregled vaših nedavnih aktivnosti i važnih obaveštenja
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Ako nema zahteva, prikažemo obaveštenje */}
            {totalServices === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="bg-blue-50 p-4 rounded-full">
                  <AlertCircle className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="mt-4 text-lg font-medium">Nema aktivnosti</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-sm">
                  Nemate aktivnih servisnih zahteva. Kreirajte novi zahtev klikom na dugme "Novi servisni zahtev".
                </p>
                <Button
                  className="mt-4"
                  onClick={() => navigate("/business/services/new")}
                >
                  Kreiraj prvi zahtev
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 font-medium text-sm">
                    Nedavni zahtevi
                  </div>
                  <div className="divide-y">
                    {services?.slice(0, 5).map(service => (
                      <div key={service.id} className="flex justify-between items-center p-4 hover:bg-gray-50">
                        <div>
                          <div className="font-medium text-sm">Servis #{service.id}</div>
                          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                            {service.description}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                            service.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            service.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {translateStatus(service.status)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(service.createdAt).toLocaleDateString('sr-RS')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {services && services.length > 5 && (
                    <div className="bg-gray-50 px-4 py-2 text-center">
                      <Button 
                        variant="link" 
                        onClick={() => navigate("/business/services")}
                      >
                        Pogledaj sve zahteve
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
                  <div className="rounded-full bg-blue-100 p-2 mr-3">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800">Obaveštenje</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Kao poslovni partner možete kreirati servisne zahteve za vaše klijente. 
                      Svi kreirani zahtevi dobijaju status "Na čekanju" i biće obrađeni od strane 
                      naših administratora.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BusinessLayout>
  );
}