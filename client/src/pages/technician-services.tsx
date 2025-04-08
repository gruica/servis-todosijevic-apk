import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Service, 
  Technician,
  ApplianceCategory
} from "@shared/schema";

// Get badge variant based on status
function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Na čekanju", variant: "outline" },
    scheduled: { label: "Zakazano", variant: "secondary" },
    in_progress: { label: "U procesu", variant: "default" },
    waiting_parts: { label: "Čeka delove", variant: "destructive" },
    completed: { label: "Završeno", variant: "outline" },
    cancelled: { label: "Otkazano", variant: "destructive" },
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
  return name
    .split(' ')
    .map(word => word[0].toUpperCase())
    .join('');
}

// Generate random color based on name
function getAvatarColor(name: string) {
  const colors = ["bg-blue-500", "bg-green-500", "bg-amber-500", "bg-red-500", "bg-purple-500", "bg-pink-500"];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export default function TechnicianServices() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>(""); 
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch all technicians
  const { data: technicians, isLoading: technicianLoading } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });
  
  // Fetch services based on selected technician and status
  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services", selectedTechnicianId, statusFilter],
    queryFn: async ({ signal }) => {
      let url = "/api/services";
      
      // Build the query parameters
      const params = new URLSearchParams();
      
      if (selectedTechnicianId) {
        params.append("technicianId", selectedTechnicianId);
      }
      
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      // Append query parameters if they exist
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error("Greška pri dobijanju servisa");
      }
      return response.json();
    },
    // Only run the query if a technician is selected
    enabled: true,
  });
  
  // Fetch clients for displaying client names
  const { data: clients } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });
  
  // Fetch appliances for displaying appliance details
  const { data: appliances } = useQuery<any[]>({
    queryKey: ["/api/appliances"],
  });
  
  // Fetch categories for displaying appliance categories
  const { data: categories } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"],
  });
  
  // Enrich services with client and appliance data
  const enrichedServices = services?.map(service => {
    const client = clients?.find((c: any) => c.id === service.clientId);
    const appliance = appliances?.find((a: any) => a.id === service.applianceId);
    const category = categories?.find(c => c.id === appliance?.categoryId);
    
    return {
      ...service,
      clientName: client?.fullName || "Nepoznato",
      applianceName: category?.name || "Nepoznat uređaj",
      icon: category?.icon || "devices",
    };
  });
  
  // Filter services based on search query
  const filteredServices = enrichedServices?.filter(service => {
    const matchesSearch = 
      service.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.applianceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });
  
  // Get status options for select component
  const statusOptions = [
    { value: "all", label: "Svi statusi" },
    { value: "pending", label: "Na čekanju" },
    { value: "scheduled", label: "Zakazano" },
    { value: "in_progress", label: "U procesu" },
    { value: "waiting_parts", label: "Čeka delove" },
    { value: "completed", label: "Završeno" },
    { value: "cancelled", label: "Otkazano" },
  ];
  
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
            <div className="mb-6">
              <h2 className="text-2xl font-medium text-gray-800">Servisi po serviserima</h2>
              <p className="text-gray-600">Pregled servisa dodeljenih određenom serviseru</p>
            </div>
            
            {/* Technician and Status filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <UserRound className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Select 
                      value={selectedTechnicianId} 
                      onValueChange={setSelectedTechnicianId}
                    >
                      <SelectTrigger className="pl-9">
                        <SelectValue placeholder="Izaberite servisera" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Svi serviseri</SelectItem>
                        {technicians?.map((technician) => (
                          <SelectItem key={technician.id} value={technician.id.toString()}>
                            {technician.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="relative">
                    <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="pl-9">
                        <SelectValue placeholder="Filter po statusu" />
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
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Pretraga po klijentu, uređaju, opisu..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Services table */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-lg font-medium">
                  {selectedTechnicianId 
                    ? `Servisi za ${technicians?.find(t => t.id === parseInt(selectedTechnicianId))?.fullName || "servisera"}` 
                    : "Svi servisi"
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(servicesLoading || technicianLoading) ? (
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
                          <TableHead>Uređaj</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Datum prijave</TableHead>
                          <TableHead>Opis</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredServices?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                              {selectedTechnicianId 
                                ? `Nema ${searchQuery || statusFilter !== "all" 
                                    ? "rezultata za vašu pretragu" 
                                    : "servisa za odabranog servisera"}`
                                : "Odaberite servisera za prikaz servisa"}
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {filteredServices?.map((service) => (
                          <TableRow key={service.id}>
                            <TableCell className="font-medium">#{service.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full ${getAvatarColor(service.clientName)} text-white flex items-center justify-center mr-3`}>
                                  <span className="text-xs font-medium">{getUserInitials(service.clientName)}</span>
                                </div>
                                <span>{service.clientName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span>{service.applianceName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(service.status)}</TableCell>
                            <TableCell>{formatDate(service.createdAt)}</TableCell>
                            <TableCell className="max-w-xs truncate" title={service.description}>
                              {service.description}
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