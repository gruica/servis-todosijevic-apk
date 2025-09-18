import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Service, 
  Client, 
  Appliance, 
  ApplianceCategory
} from "@shared/schema";
import { Plus, Search, Eye } from "lucide-react";

// Services list page - dialog creation functionality moved to /services/new

// Get badge variant based on status
function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Na čekanju", variant: "outline" },
    scheduled: { label: "Zakazano", variant: "secondary" },
    in_progress: { label: "U procesu", variant: "default" },
    waiting_parts: { label: "Čeka delove", variant: "destructive" },
    device_parts_removed: { label: "Delovi uklonjeni", variant: "destructive" },
    completed: { label: "Završeno", variant: "outline" },
    delivered: { label: "Isporučen", variant: "secondary" },
    device_returned: { label: "Vraćen", variant: "secondary" },
    cancelled: { label: "Otkazano", variant: "destructive" },
    client_not_home: { label: "Klijent nije kući", variant: "destructive" },
    client_not_answering: { label: "Klijent se ne javlja", variant: "destructive" },
    customer_refuses_repair: { label: "Kupac odbija", variant: "destructive" },
    customer_refused_repair: { label: "Kupac odbio", variant: "destructive" },
    repair_failed: { label: "Servis neuspešan", variant: "destructive" },
  };

  const config = statusConfig[status] || { label: status, variant: "outline" };
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}

// Format date to local format
function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("sr-ME");
}

// Get user initials from name
function getUserInitials(name: string) {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(word => word && word[0] ? word[0].toUpperCase() : '')
    .filter(Boolean)
    .join('');
}

// Generate random color based on name
function getAvatarColor(name: string) {
  if (!name) return "bg-gray-500";
  
  const colors = ["bg-blue-500", "bg-green-500", "bg-amber-500", "bg-red-500", "bg-purple-500", "bg-pink-500"];
  
  try {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  } catch (error) {
    console.error("Greška pri generisanju boje avatara:", error);
    return "bg-gray-500";
  }
}

export default function Services() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, setLocation] = useLocation();
  
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  const { data: appliances } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances"],
  });
  
  const { data: categories } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"],
  });
  
  // Enrich services with client and appliance data
  const enrichedServices = services?.map(service => {
    try {
      if (!service.clientId || !service.applianceId) {
        console.warn(`Servis #${service.id} ima nevažeći clientId:${service.clientId} ili applianceId:${service.applianceId}`);
      }
      
      const client = clients?.find(c => c.id === service.clientId);
      const appliance = appliances?.find(a => a.id === service.applianceId);
      const category = appliance?.categoryId ? categories?.find(c => c.id === appliance.categoryId) : null;
      
      if (!client) {
        console.warn(`Nije pronađen klijent za servis #${service.id}, clientId:${service.clientId}`);
      }
      
      if (!appliance) {
        console.warn(`Nije pronađen uređaj za servis #${service.id}, applianceId:${service.applianceId}`);
      }
      
      return {
        ...service,
        clientName: client?.fullName || "Nepoznato",
        applianceName: category?.name || "Nepoznat uređaj",
        icon: category?.icon || "devices",
      };
    } catch (error) {
      console.error(`Greška pri obogaćivanju servisa #${service.id}:`, error);
      return {
        ...service,
        clientName: "Greška u podacima",
        applianceName: "Nepoznato",
        icon: "error",
      };
    }
  });
  
  // Filter services based on search query and status filter
  const filteredServices = enrichedServices?.filter(service => {
    const matchesSearch = 
      (service.clientName && service.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.applianceName && service.applianceName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || service.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Get status options for select component
  const statusOptions = [
    { value: "all", label: "Svi statusi" },
    { value: "pending", label: "Na čekanju" },
    { value: "scheduled", label: "Zakazano" },
    { value: "in_progress", label: "U procesu" },
    { value: "waiting_parts", label: "Čeka delove" },
    { value: "device_parts_removed", label: "Delovi uklonjeni" },
    { value: "completed", label: "Završeno" },
    { value: "delivered", label: "Isporučen" },
    { value: "device_returned", label: "Vraćen" },
    { value: "cancelled", label: "Otkazano" },
    { value: "client_not_home", label: "Klijent nije kući" },
    { value: "client_not_answering", label: "Klijent se ne javlja" },
    { value: "customer_refuses_repair", label: "Kupac odbija" },
    { value: "customer_refused_repair", label: "Kupac odbio" },
    { value: "repair_failed", label: "Servis neuspešan" },
  ];
  
  // Navigate to service details (for future implementation)
  const handleViewService = (service: Service) => {
    console.log("Pregled servisa:", service);
    // TODO: Navigate to service detail page when implemented
    // setLocation(`/services/${service.id}`);
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        closeMobileMenu={() => setSidebarOpen(false)} 
      />
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-medium text-gray-800">Servisi</h2>
                <p className="text-gray-600">Upravljanje servisnim intervencijama</p>
              </div>
              <Button 
                onClick={() => setLocation("/services/new")}
                data-testid="button-new-service"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novi servis
              </Button>
            </div>
            
            {/* Search and filter */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative md:col-span-2">
                    <Input
                      placeholder="Pretraga po klijentu, uređaju ili opisu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search"
                    />
                  </div>
                  <div className="relative">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger data-testid="select-status-filter">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Services table */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-lg font-medium">Lista servisa</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="p-4">
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Klijent</TableHead>
                          <TableHead>Mjesto (grad)</TableHead>
                          <TableHead>Uređaj</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Kreirao</TableHead>
                          <TableHead>Datum prijave</TableHead>
                          <TableHead>Opis</TableHead>
                          <TableHead className="text-right">Akcije</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredServices?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                              {searchQuery || statusFilter !== "all"
                                ? "Nema rezultata za vašu pretragu" 
                                : "Nema servisa za prikaz"}
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {filteredServices?.map((service) => (
                          <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                            <TableCell className="font-medium">#{service.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full ${getAvatarColor(service.clientName)} text-white flex items-center justify-center mr-3`}>
                                  <span className="text-xs font-medium">{getUserInitials(service.clientName)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span>{service.clientName}</span>
                                  {service.businessPartnerId && service.partnerCompanyName && (
                                    <span className="text-xs text-blue-600 font-medium mt-1">
                                      Via: {service.partnerCompanyName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{"Nepoznato"}</span>
                                <span className="text-xs text-gray-500 mt-1">{"Adresa nepoznata"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {service.icon ? (
                                  <span className="text-primary mr-2 flex items-center justify-center w-6 h-6">
                                    {service.icon === "sudopera" && "🍽️"}
                                    {service.icon === "ves_masina" && "👕"}
                                    {service.icon === "frizider" && "❄️"}
                                    {service.icon === "sporet" && "🔥"}
                                    {service.icon === "bojler" && "♨️"}
                                    {service.icon === "devices" && "📱"}
                                    {!["sudopera", "ves_masina", "frizider", "sporet", "bojler", "devices"].includes(service.icon) && "🔧"}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 mr-2">📦</span>
                                )}
                                <span>{service.applianceName || "Nepoznat uređaj"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(service.status)}</TableCell>
                            <TableCell>
                              {service.businessPartnerId ? (
                                <Badge variant="outline" className="font-normal">
                                  {service.partnerCompanyName || "Poslovni partner"}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="font-normal">Admin</Badge>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(service.createdAt)}</TableCell>
                            <TableCell className="max-w-xs truncate">{service.description}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleViewService(service)}
                                data-testid={`button-view-service-${service.id}`}
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}