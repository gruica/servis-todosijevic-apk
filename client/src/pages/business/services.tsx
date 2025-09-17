import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import BusinessLayout from "@/components/layout/business-layout";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/contexts/notification-context";
import { 
  Loader2, 
  PlusCircle, 
  Search, 
  Clock, 
  Wrench, 
  CheckCircle, 
  XCircle,
  Info,
  Calendar,
  Tag,
  AlertTriangle,
  UserX,
  PhoneOff,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

interface ServiceItem {
  id: number;
  clientId: number;
  applianceId: number;
  technicianId: number | null;
  description: string;
  status: string;
  createdAt: string;
  scheduledDate: string | null;
  completedDate: string | null;
  technicianNotes: string | null;
  cost: string | null;
  isCompletelyFixed: boolean | null;
  businessPartnerId: number | null;
  partnerCompanyName: string | null;
  warrantyStatus?: string; // DODATO: warranty status field
  client?: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
  };
  appliance?: {
    model: string;
    serialNumber: string;
    categoryId: number;
    manufacturerId: number;
  };
  category?: {
    name: string;
    icon: string;
  };
  manufacturer?: {
    name: string;
  };
  technician?: {
    fullName: string;
    specialization: string;
  };
  spareParts?: Array<{
    partName: string;
    quantity?: number;
    status: string;
    orderDate?: string;
    estimatedDeliveryDate?: string;
  }>;
}



// Helper funkcija za prevod statusa
function translateStatus(status: string) {
  const statusMap: Record<string, string> = {
    pending: "Na čekanju",
    assigned: "Dodeljen",
    scheduled: "Zakazan",
    in_progress: "U toku",
    waiting_parts: "Čeka delove",
    completed: "Završen",
    cancelled: "Otkazan",
    repair_failed: "Neuspešan servis",
    customer_refused_repair: "Odbio servis",
    client_not_home: "Klijent nije kod kuće",
    client_not_answering: "Klijent se ne javlja"
  };
  return statusMap[status] || status;
}

// Helper funkcija za dobijanje boje bedža statusa
function getStatusBadgeVariant(status: string) {
  const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    assigned: "secondary",
    scheduled: "secondary", 
    in_progress: "secondary",
    waiting_parts: "outline",
    completed: "default",
    cancelled: "destructive",
    repair_failed: "destructive",
    customer_refused_repair: "outline",
    client_not_home: "outline",
    client_not_answering: "outline"
  };
  return statusVariantMap[status] || "default";
}

// Komponenta za prikaz status bedža
function StatusBadge({ status }: { status: string }) {
  const variant = getStatusBadgeVariant(status);
  const statusText = translateStatus(status);
  
  let Icon = Info;
  if (status === "pending") Icon = Clock;
  if (status === "assigned" || status === "in_progress" || status === "scheduled") Icon = Wrench;
  if (status === "completed") Icon = CheckCircle;
  if (status === "cancelled") Icon = XCircle;
  if (status === "repair_failed") Icon = AlertTriangle;
  if (status === "customer_refused_repair") Icon = UserX;
  if (status === "client_not_home" || status === "client_not_answering") Icon = PhoneOff;
  
  return (
    <Badge variant={variant} className="flex items-center gap-1 font-normal">
      <Icon className="h-3 w-3" />
      {statusText}
    </Badge>
  );
}

// NOVA KOMPONENTA za prikaz warranty status bedža  
function WarrantyBadge({ warrantyStatus }: { warrantyStatus?: string }) {
  if (!warrantyStatus) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 font-normal bg-gray-50 text-gray-500">
        <AlertTriangle className="h-3 w-3" />
        Nepoznato
      </Badge>
    );
  }
  
  const isInWarranty = warrantyStatus === "u garanciji" || warrantyStatus === "u_garanciji";
  
  return (
    <Badge 
      variant={isInWarranty ? "default" : "secondary"} 
      className={`flex items-center gap-1 font-normal ${
        isInWarranty 
          ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' 
          : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
      }`}
    >
      <CheckCircle className={`h-3 w-3 ${isInWarranty ? 'text-green-600' : 'text-red-600'}`} />
      {isInWarranty ? "U garanciji" : "Van garancije"}
    </Badge>
  );
}

export default function BusinessServices() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isMobile, setIsMobile] = useState(false);
  const { highlightedServiceId, shouldAutoOpen, setShouldAutoOpen } = useNotification();
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Detekcija mobilnog uređaja
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Inicijalno postavljanje
    handleResize();
    
    // Dodavanje event listenera
    window.addEventListener("resize", handleResize);
    
    // Čišćenje
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Dohvatanje servisa za poslovnog partnera
  const { data: businessData, isLoading, error } = useQuery({
    queryKey: ["/api/business/services"],
    enabled: !!user && user.role === 'business_partner',
    refetchOnMount: true,
    staleTime: 30000, // 30 sekundi cache
    gcTime: 300000, // 5 minuta cache
  });

  // Izvuci services iz API response - API vraća objekat sa services propertijem
  const services: ServiceItem[] = (businessData as any)?.services || [];



  // Auto-open handling za notification navigaciju
  useEffect(() => {
    if (highlightedServiceId && shouldAutoOpen && services && services.length > 0) {
      const targetService = services.find(service => service.id === highlightedServiceId);
      if (targetService) {
        setSelectedService(targetService);
        setIsDetailsOpen(true);
        setShouldAutoOpen(false);
      }
    }
  }, [services, highlightedServiceId, shouldAutoOpen, setShouldAutoOpen]);
  
  // Filtriranje servisa po statusu i pretrazi
  const filteredServices = (services && Array.isArray(services)) ? services.filter((service: ServiceItem) => {
    // Filter po statusu
    if (statusFilter !== "all" && service.status !== statusFilter) {
      return false;
    }
    
    // Filter po pretrazi
    if (searchQuery.trim() !== "") {
      const searchTerms = searchQuery.toLowerCase().trim();
      const client = service.client?.fullName.toLowerCase() || "";
      const description = service.description.toLowerCase();
      const appliance = service.appliance?.model.toLowerCase() || "";
      const category = service.category?.name.toLowerCase() || "";
      const manufacturer = service.manufacturer?.name.toLowerCase() || "";
      
      return (
        client.includes(searchTerms) ||
        description.includes(searchTerms) ||
        appliance.includes(searchTerms) ||
        category.includes(searchTerms) ||
        manufacturer.includes(searchTerms)
      );
    }
    
    return true;
  }) : [];
  
  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Servisni zahtevi</h2>
            <p className="text-muted-foreground">
              Pregled i upravljanje servisnim zahtevima
            </p>
          </div>
          {/* Dugme za kreiranje novog servisnog zahteva - uvek vidljivo na svakom ekranu */}
          <Button 
            className="fixed bottom-5 right-5 z-50 shadow-lg" 
            size="lg"
            onClick={() => navigate("/business/services/new")}
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            <span className="font-medium">Novi servisni zahtev</span>
          </Button>
        </div>
        
        {/* Filteri i pretraga */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Input
              placeholder="Pretraga"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi statusi</SelectItem>
              <SelectItem value="pending">Na čekanju</SelectItem>
              <SelectItem value="assigned">Dodeljeni</SelectItem>
              <SelectItem value="scheduled">Zakazani</SelectItem>
              <SelectItem value="in_progress">U toku</SelectItem>
              <SelectItem value="waiting_parts">Čeka delove</SelectItem>
              <SelectItem value="completed">Završeni</SelectItem>
              <SelectItem value="cancelled">Otkazani</SelectItem>
              <SelectItem value="repair_failed">Neuspešan servis</SelectItem>
              <SelectItem value="customer_refused_repair">Odbio servis</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-gray-500">Učitavanje servisa...</span>
          </div>
        ) : (services && services.length > 0 && filteredServices && filteredServices.length > 0) ? (
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">ID</TableHead>
                      <TableHead>Klijent</TableHead>
                      <TableHead>Uređaj</TableHead>
                      <TableHead>Garancija</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Kreiran</TableHead>
                      <TableHead>Serviser</TableHead>
                      <TableHead>Djelovi</TableHead>
                      <TableHead className="text-right">Akcije</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.map((service: ServiceItem) => (
                      <TableRow 
                        key={service.id} 
                        className={`cursor-pointer ${
                          service.id === highlightedServiceId ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onClick={() => {
                          setSelectedService(service);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{service.id}</TableCell>
                        <TableCell>
                          {service.client?.fullName || "Nepoznat"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>
                              {service.manufacturer?.name} {service.appliance?.model}
                            </span>
                            <span className="text-xs text-gray-500">
                              {service.category?.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <WarrantyBadge warrantyStatus={service.warrantyStatus} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={service.status} />
                        </TableCell>
                        <TableCell>
                          {formatDate(service.createdAt)}
                        </TableCell>
                        <TableCell>
                          {service.technician?.fullName || "Nije dodeljen"}
                        </TableCell>
                        <TableCell>
                          <SparePartsStatus service={service} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {(service.status !== 'completed' && service.status !== 'cancelled') && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/business/services/edit/${service.id}`);
                                }}
                              >
                                Izmeni
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedService(service);
                                setIsDetailsOpen(true);
                              }}
                            >
                              Detalji
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="border-t p-4 text-sm text-gray-500">
                Ukupno: {filteredServices.length} servisa
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-gray-100 p-4 rounded-full">
              <Wrench className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium">Nema servisnih zahteva</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              Nismo pronašli servisne zahteve. Kreirajte novi zahtev klikom na dugme iznad.
            </p>
          </div>
        )}
        
        {/* Responzivni prikaz za mobilne uređaje */}
        <div className="md:hidden space-y-4">
          {(services && services.length > 0 && filteredServices && filteredServices.length > 0) ? filteredServices.map((service: ServiceItem) => (
            <Card 
              key={service.id} 
              className={`overflow-hidden cursor-pointer ${
                service.id === highlightedServiceId ? 'border-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => {
                setSelectedService(service);
                setIsDetailsOpen(true);
              }}
            >
              <CardContent className="p-0">
                <div className="bg-gray-50 flex justify-between items-center p-4 border-b">
                  <div className="flex items-center">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-2">
                      <Tag className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Servis #{service.id}</span>
                  </div>
                  <StatusBadge status={service.status} />
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1">
                      <div className="text-sm text-gray-500">Klijent:</div>
                      <div className="text-sm font-medium">{service.client?.fullName || "Nepoznat"}</div>
                    </div>
                    
                    <div className="border-t pt-2">
                      <div className="text-sm text-gray-500 mb-1">Uređaj:</div>
                      <div className="text-sm font-medium">
                        {service.manufacturer?.name} {service.appliance?.model}
                      </div>
                      <div className="text-xs text-gray-500">{service.category?.name}</div>
                      {service.appliance?.serialNumber && (
                        <div className="text-xs text-gray-500">SN: {service.appliance.serialNumber}</div>
                      )}
                      <div className="mt-2">
                        <WarrantyBadge warrantyStatus={service.warrantyStatus} />
                      </div>
                    </div>
                    
                    <div className="border-t pt-2">
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-sm text-gray-500">Kreiran:</div>
                        <div className="text-sm font-medium">{formatDate(service.createdAt)}</div>
                        
                        <div className="text-sm text-gray-500">Serviser:</div>
                        <div className="text-sm font-medium">
                          {service.technician?.fullName || "Nije dodeljen"}
                        </div>
                      </div>
                    </div>
                    
                    {service.description && (
                      <div className="border-t pt-2">
                        <div className="text-sm text-gray-500 mb-1">Problem:</div>
                        <div className="text-sm text-gray-700 max-h-10 overflow-hidden">{service.description}</div>
                      </div>
                    )}
                    
                    {service.technicianNotes && (
                      <div className="border-t pt-2">
                        <div className="text-sm text-gray-500 mb-1">Napomena servisera:</div>
                        <div className="text-sm text-gray-700 max-h-10 overflow-hidden">{service.technicianNotes}</div>
                      </div>
                    )}
                    
                    {service.cost && (
                      <div className="border-t pt-2">
                        <div className="text-sm text-gray-500">Cena:</div>
                        <div className="text-sm font-medium text-green-600">{service.cost} €</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 border-t">
                  <div className="flex gap-2">
                    {(service.status !== 'completed' && service.status !== 'cancelled') && (
                      <Button 
                        className="flex-1" 
                        variant="default" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/business/services/edit/${service.id}`);
                        }}
                      >
                        Izmeni
                      </Button>
                    )}
                    <Button 
                      className="flex-1" 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedService(service);
                        setIsDetailsOpen(true);
                      }}
                    >
                      Detaljno
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : null}
        </div>
      </div>
      
      {/* Dialog za detalje servisa */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalji servisa #{selectedService?.id}</DialogTitle>
            <DialogDescription>
              Detaljne informacije o servisnom zahtevu i trenutnom statusu
            </DialogDescription>
          </DialogHeader>
          
          {selectedService && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Klijent</h4>
                  <p className="text-sm text-gray-600">{selectedService.client?.fullName || "Nepoznat"}</p>
                  <p className="text-sm text-gray-500">{selectedService.client?.email}</p>
                  <p className="text-sm text-gray-500">{selectedService.client?.phone}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Status</h4>
                  <StatusBadge status={selectedService.status} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Uređaj</h4>
                  <p className="text-sm text-gray-600">
                    {selectedService.manufacturer?.name} {selectedService.appliance?.model}
                  </p>
                  <p className="text-sm text-gray-500">{selectedService.category?.name}</p>
                  <p className="text-sm text-gray-500">
                    SN: {selectedService.appliance?.serialNumber || "Nije unet"}
                  </p>
                  <div className="mt-2">
                    <span className="text-sm text-gray-500">Garancija: </span>
                    <WarrantyBadge warrantyStatus={selectedService.warrantyStatus} />
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Serviser</h4>
                  <p className="text-sm text-gray-600">
                    {selectedService.technician?.fullName || "Nije dodeljen"}
                  </p>
                  {selectedService.technician?.specialization && (
                    <p className="text-sm text-gray-500">{selectedService.technician.specialization}</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Opis problema</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border">{selectedService.description}</p>
              </div>
              
              {selectedService.technicianNotes && (
                <div>
                  <h4 className="font-medium mb-2">Napomena servisera</h4>
                  <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md border border-blue-200">{selectedService.technicianNotes}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Kreiran</h4>
                  <p className="text-sm text-gray-600">{formatDate(selectedService.createdAt)}</p>
                </div>
                
                {selectedService.scheduledDate && (
                  <div>
                    <h4 className="font-medium mb-2">Zakazano</h4>
                    <p className="text-sm text-gray-600">{formatDate(selectedService.scheduledDate)}</p>
                  </div>
                )}
                
                {selectedService.completedDate && (
                  <div>
                    <h4 className="font-medium mb-2">Završeno</h4>
                    <p className="text-sm text-green-600">{formatDate(selectedService.completedDate)}</p>
                  </div>
                )}
              </div>
              
              {selectedService.cost && (
                <div>
                  <h4 className="font-medium mb-2">Cena servisa</h4>
                  <p className="text-lg font-medium text-green-600">{selectedService.cost} €</p>
                </div>
              )}
              
              {selectedService.isCompletelyFixed !== null && (
                <div>
                  <h4 className="font-medium mb-2">Status popravke</h4>
                  <p className={`text-sm font-medium ${selectedService.isCompletelyFixed ? 'text-green-600' : 'text-orange-600'}`}>
                    {selectedService.isCompletelyFixed ? 'Uređaj je potpuno popravljen' : 'Uređaj nije potpuno popravljen'}
                  </p>
                </div>
              )}
              
              {/* Akcije u dialogu */}
              {(selectedService.status !== 'completed' && selectedService.status !== 'cancelled') && (
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setIsDetailsOpen(false);
                      navigate(`/business/services/edit/${selectedService.id}`);
                    }}
                  >
                    Izmeni servis
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </BusinessLayout>
  );
}

// Component for displaying spare parts status
function SparePartsStatus({ service }: { service: ServiceItem }) {
  if (!service.spareParts || service.spareParts.length === 0) {
    return (
      <div className="flex items-center text-gray-400">
        <Package className="h-4 w-4 mr-1" />
        <span className="text-sm">Nema</span>
      </div>
    );
  }

  const totalParts = service.spareParts.length;
  const receivedParts = service.spareParts.filter(part => part.status === 'received').length;
  const orderedParts = service.spareParts.filter(part => part.status === 'ordered').length;

  const getStatusColor = () => {
    if (receivedParts === totalParts) return "text-green-600";
    if (orderedParts > 0) return "text-blue-600";
    return "text-gray-600";
  };

  const getStatusText = () => {
    if (receivedParts === totalParts) return "Stigli";
    if (orderedParts > 0) return "Naručeni";
    return "Potrebni";
  };

  return (
    <div className={`flex items-center ${getStatusColor()}`}>
      <Package className="h-4 w-4 mr-1" />
      <span className="text-sm font-medium">
        {receivedParts}/{totalParts}
      </span>
      <span className="text-xs ml-1">
        {getStatusText()}
      </span>
    </div>
  );
}