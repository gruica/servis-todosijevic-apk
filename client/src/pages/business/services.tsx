import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import BusinessLayout from "@/components/layout/business-layout";
import { useAuth } from "@/hooks/use-auth";
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
  Tag
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
}

// Helper funkcija za formatiranje datuma
function formatDate(dateString: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("sr-ME", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
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
    cancelled: "Otkazan"
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
    cancelled: "destructive"
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
  
  return (
    <Badge variant={variant} className="flex items-center gap-1 font-normal">
      <Icon className="h-3 w-3" />
      {statusText}
    </Badge>
  );
}

export default function BusinessServices() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isMobile, setIsMobile] = useState(false);
  
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
  const { data: services, isLoading } = useQuery<ServiceItem[]>({
    queryKey: ["/api/business/services", user?.id],
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
  
  // Filtriranje servisa po statusu i pretrazi
  const filteredServices = services?.filter(service => {
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
  });
  
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
            </SelectContent>
          </Select>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-gray-500">Učitavanje servisa...</span>
          </div>
        ) : filteredServices && filteredServices.length > 0 ? (
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">ID</TableHead>
                      <TableHead>Klijent</TableHead>
                      <TableHead>Uređaj</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Kreiran</TableHead>
                      <TableHead>Serviser</TableHead>
                      <TableHead className="text-right">Akcije</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.map((service) => (
                      <TableRow key={service.id}>
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
                          <StatusBadge status={service.status} />
                        </TableCell>
                        <TableCell>
                          {formatDate(service.createdAt)}
                        </TableCell>
                        <TableCell>
                          {service.technician?.fullName || "Nije dodeljen"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/business/services/${service.id}`)}
                          >
                            Detalji
                          </Button>
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
          {filteredServices && filteredServices.length > 0 ? filteredServices.map((service) => (
            <Card key={service.id} className="overflow-hidden">
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
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-sm text-gray-500">Klijent:</div>
                    <div className="text-sm font-medium">{service.client?.fullName || "Nepoznat"}</div>
                    
                    <div className="text-sm text-gray-500">Uređaj:</div>
                    <div className="text-sm font-medium">
                      {service.manufacturer?.name} {service.appliance?.model}
                    </div>
                    
                    <div className="text-sm text-gray-500">Kategorija:</div>
                    <div className="text-sm font-medium">{service.category?.name}</div>
                    
                    <div className="text-sm text-gray-500">Kreiran:</div>
                    <div className="text-sm font-medium">{formatDate(service.createdAt)}</div>
                    
                    <div className="text-sm text-gray-500">Serviser:</div>
                    <div className="text-sm font-medium">
                      {service.technician?.fullName || "Nije dodeljen"}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 border-t">
                  <Button 
                    className="w-full" 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/business/services/${service.id}`)}
                  >
                    Detaljno
                  </Button>
                </div>
              </CardContent>
            </Card>
          )) : null}
        </div>
      </div>
    </BusinessLayout>
  );
}