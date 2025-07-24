import { useAuth } from "@/hooks/use-auth";
import BusinessLayout from "@/components/layout/business-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Wrench, Clock, CheckCircle, AlertCircle, Eye, Phone, Mail, Calendar, Package, Settings, MapPin, User, Receipt, Activity } from "lucide-react";
import { useLocation } from "wouter";

// Enhanced service interface with detailed information
interface ServiceItem {
  id: number;
  status: string;
  description: string;
  createdAt: string;
  client?: {
    fullName: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
  };
  appliance?: {
    model?: string;
    serialNumber?: string;
    category?: { name: string };
    manufacturer?: { name: string };
  };
  technician?: {
    fullName: string;
    phone?: string;
    email?: string;
    specialization?: string;
  };
  spareParts: Array<{
    partName: string;
    quantity: number;
    productCode?: string;
    urgency: string;
    warrantyStatus: string;
    status: string;
    orderDate: string;
    estimatedDeliveryDate?: string;
    actualDeliveryDate?: string;
  }>;
  removedParts: Array<{
    partName: string;
    removalReason: string;
    currentLocation: string;
    removalDate: string;
    returnDate?: string;
    status: string;
    repairCost?: number;
  }>;
  workTimeline: Array<{
    date: string;
    event: string;
    status: string;
  }>;
  isCompleted: boolean;
  totalCost: number;
  partsCount: number;
  removedPartsCount: number;
  technicianNotes?: string;
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
    queryKey: ["/api/business/services"],
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
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button 
              variant="outline"
              onClick={() => navigate("/business/clients/new")}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Novi klijent
            </Button>
            <Button 
              onClick={() => navigate("/business/services/new")}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Novi servisni zahtev
            </Button>
          </div>
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
                      <div key={service.id} className="p-4 hover:bg-gray-50 border-l-4 border-blue-500">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-base">Servis #{service.id}</h4>
                              <Badge variant={service.isCompleted ? "default" : "secondary"}>
                                {translateStatus(service.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                            
                            {/* Client info */}
                            {service.client && (
                              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {service.client.fullName}
                                </div>
                                {service.client.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {service.client.phone}
                                  </div>
                                )}
                                {service.client.city && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {service.client.city}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Device info */}
                            {service.appliance && (
                              <div className="text-xs text-gray-500 mb-2">
                                <span className="font-medium">Uređaj:</span> {service.appliance.category?.name} 
                                {service.appliance.manufacturer?.name && ` (${service.appliance.manufacturer.name})`}
                                {service.appliance.model && ` - ${service.appliance.model}`}
                              </div>
                            )}
                            
                            {/* Work summary */}
                            <div className="flex items-center gap-4 text-xs">
                              {service.technician && (
                                <div className="flex items-center gap-1 text-blue-600">
                                  <Wrench className="h-3 w-3" />
                                  {service.technician.fullName}
                                </div>
                              )}
                              {service.partsCount > 0 && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <Package className="h-3 w-3" />
                                  {service.partsCount} delova
                                </div>
                              )}
                              {service.totalCost > 0 && (
                                <div className="flex items-center gap-1 text-orange-600">
                                  <Receipt className="h-3 w-3" />
                                  {service.totalCost}€
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-xs text-gray-500">
                              {new Date(service.createdAt).toLocaleDateString('sr-RS')}
                            </div>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 px-3">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Detalji
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh]">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Wrench className="h-5 w-5" />
                                    Servis #{service.id} - Detaljne Informacije
                                  </DialogTitle>
                                  <DialogDescription>
                                    Kompletne informacije o radu na servisu
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <ScrollArea className="h-[70vh] pr-4">
                                  <div className="space-y-6">
                                    {/* Service Status & Timeline */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                          <Activity className="h-4 w-4" />
                                          Tok servisa
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="space-y-3">
                                          {service.workTimeline.map((item, index) => (
                                            <div key={index} className="flex items-center gap-3">
                                              <div className={`w-3 h-3 rounded-full ${
                                                item.status === 'completed' ? 'bg-green-500' :
                                                item.status === 'in_progress' ? 'bg-blue-500' :
                                                item.status === 'assigned' ? 'bg-yellow-500' : 'bg-gray-300'
                                              }`} />
                                              <div className="flex-1">
                                                <div className="font-medium text-sm">{item.event}</div>
                                                <div className="text-xs text-gray-500">
                                                  {new Date(item.date).toLocaleDateString('sr-RS')}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </CardContent>
                                    </Card>

                                    {/* Technician Info */}
                                    {service.technician && (
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="flex items-center gap-2 text-lg">
                                            <User className="h-4 w-4" />
                                            Serviser
                                          </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <div className="font-medium">{service.technician.fullName}</div>
                                              {service.technician.specialization && (
                                                <div className="text-sm text-gray-600">{service.technician.specialization}</div>
                                              )}
                                            </div>
                                            <div className="space-y-1">
                                              {service.technician.phone && (
                                                <div className="flex items-center gap-2 text-sm">
                                                  <Phone className="h-3 w-3" />
                                                  {service.technician.phone}
                                                </div>
                                              )}
                                              {service.technician.email && (
                                                <div className="flex items-center gap-2 text-sm">
                                                  <Mail className="h-3 w-3" />
                                                  {service.technician.email}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )}

                                    {/* Spare Parts */}
                                    {service.spareParts.length > 0 && (
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="flex items-center gap-2 text-lg">
                                            <Package className="h-4 w-4" />
                                            Rezervni delovi ({service.spareParts.length})
                                          </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="space-y-3">
                                            {service.spareParts.map((part, index) => (
                                              <div key={index} className="border rounded-lg p-3">
                                                <div className="flex justify-between items-start mb-2">
                                                  <div className="font-medium">{part.partName}</div>
                                                  <Badge variant={part.status === 'received' ? 'default' : 'secondary'}>
                                                    {part.status === 'pending' ? 'Na čekanju' :
                                                     part.status === 'ordered' ? 'Poručen' :
                                                     part.status === 'received' ? 'Pristigao' : part.status}
                                                  </Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                                  <div>Količina: {part.quantity}</div>
                                                  <div>Hitnost: {part.urgency}</div>
                                                  <div>Garancija: {part.warrantyStatus}</div>
                                                  {part.productCode && <div>Kod: {part.productCode}</div>}
                                                </div>
                                                {part.actualDeliveryDate && (
                                                  <div className="text-sm text-green-600 mt-2">
                                                    Pristigao: {new Date(part.actualDeliveryDate).toLocaleDateString('sr-RS')}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )}

                                    {/* Removed Parts */}
                                    {service.removedParts.length > 0 && (
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="flex items-center gap-2 text-lg">
                                            <Settings className="h-4 w-4" />
                                            Uklonjeni delovi ({service.removedParts.length})
                                          </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="space-y-3">
                                            {service.removedParts.map((part, index) => (
                                              <div key={index} className="border rounded-lg p-3">
                                                <div className="flex justify-between items-start mb-2">
                                                  <div className="font-medium">{part.partName}</div>
                                                  <Badge variant={part.status === 'returned' ? 'default' : 'secondary'}>
                                                    {part.status === 'workshop' ? 'U radionici' :
                                                     part.status === 'external_repair' ? 'Na popravci' :
                                                     part.status === 'returned' ? 'Vraćen' : part.status}
                                                  </Badge>
                                                </div>
                                                <div className="text-sm text-gray-600 space-y-1">
                                                  <div>Razlog: {part.removalReason}</div>
                                                  <div>Lokacija: {part.currentLocation}</div>
                                                  <div>Uklonjeno: {new Date(part.removalDate).toLocaleDateString('sr-RS')}</div>
                                                  {part.returnDate && (
                                                    <div className="text-green-600">
                                                      Vraćeno: {new Date(part.returnDate).toLocaleDateString('sr-RS')}
                                                    </div>
                                                  )}
                                                  {part.repairCost && (
                                                    <div>Troškovi popravke: {part.repairCost}€</div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )}

                                    {/* Service Summary */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                          <Receipt className="h-4 w-4" />
                                          Rezime servisa
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <div className="text-sm text-gray-600">Status</div>
                                            <div className="font-medium">{translateStatus(service.status)}</div>
                                          </div>
                                          <div>
                                            <div className="text-sm text-gray-600">Ukupni troškovi</div>
                                            <div className="font-medium">{service.totalCost}€</div>
                                          </div>
                                          <div>
                                            <div className="text-sm text-gray-600">Rezervni delovi</div>
                                            <div className="font-medium">{service.partsCount}</div>
                                          </div>
                                          <div>
                                            <div className="text-sm text-gray-600">Uklonjeni delovi</div>
                                            <div className="font-medium">{service.removedPartsCount}</div>
                                          </div>
                                        </div>
                                        
                                        {service.technicianNotes && (
                                          <div className="mt-4">
                                            <div className="text-sm text-gray-600 mb-1">Napomene servisera</div>
                                            <div className="text-sm bg-gray-50 p-3 rounded-lg">
                                              {service.technicianNotes}
                                            </div>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
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