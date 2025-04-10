import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye } from "lucide-react";
import { Service, Technician, ApplianceCategory } from "@shared/schema";

// Format date to local format
function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("sr-ME");
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Na čekanju", variant: "outline" },
    assigned: { label: "Dodeljen", variant: "outline" },
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

export default function TechnicianServicesList() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch all technicians
  const { data: technicians, isLoading: technicianLoading } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });
  
  // Fetch all services
  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  
  // Filter services based on selected technician and status
  const filteredServices = services?.filter(service => {
    // Filter by technician
    if (selectedTechnicianId && service.technicianId !== parseInt(selectedTechnicianId)) {
      return false;
    }
    
    // Filter by status
    if (statusFilter !== "all" && service.status !== statusFilter) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const description = service.description.toLowerCase();
      const serviceId = service.id.toString();
      return description.includes(query) || serviceId.includes(query);
    }
    
    return true;
  });
  
  // Get technician name by ID
  const getTechnicianName = (id: number | null) => {
    if (id === null) return "Nije dodeljen";
    const technician = technicians?.find(t => t.id === id);
    return technician ? technician.fullName : "Nije dodeljen";
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
          <div className="container mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Servisi po serviserima</h2>
              <p className="text-muted-foreground">
                Pregled servisa dodeljenih određenom serviseru
              </p>
            </div>
            
            {/* Filters */}
            <Card>
              <CardContent className="p-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Select
                      value={selectedTechnicianId}
                      onValueChange={setSelectedTechnicianId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Serviser" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Svi serviseri</SelectItem>
                        {technicians?.map(tech => (
                          <SelectItem key={tech.id} value={tech.id.toString()}>
                            {tech.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Svi statusi</SelectItem>
                        <SelectItem value="pending">Na čekanju</SelectItem>
                        <SelectItem value="assigned">Dodeljen</SelectItem>
                        <SelectItem value="scheduled">Zakazan</SelectItem>
                        <SelectItem value="in_progress">U procesu</SelectItem>
                        <SelectItem value="waiting_parts">Čeka delove</SelectItem>
                        <SelectItem value="completed">Završen</SelectItem>
                        <SelectItem value="cancelled">Otkazan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Input
                      placeholder="Pretraga"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Results */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle>
                  {selectedTechnicianId 
                    ? `Servisi za: ${getTechnicianName(parseInt(selectedTechnicianId))}` 
                    : "Svi servisi"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(servicesLoading || technicianLoading) ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Kreiran</TableHead>
                          <TableHead>Serviser</TableHead>
                          <TableHead>Opis</TableHead>
                          <TableHead className="text-right">Akcije</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!filteredServices || filteredServices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                              Nema pronađenih servisa
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredServices.map(service => (
                            <TableRow key={service.id}>
                              <TableCell className="font-medium">#{service.id}</TableCell>
                              <TableCell>
                                <StatusBadge status={service.status} />
                              </TableCell>
                              <TableCell>{formatDate(service.createdAt)}</TableCell>
                              <TableCell>{getTechnicianName(service.technicianId)}</TableCell>
                              <TableCell className="max-w-sm truncate">
                                {service.description}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => console.log("View details", service.id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Detalji
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t p-2 text-xs text-muted-foreground">
                {filteredServices && filteredServices.length > 0 && (
                  <p>Ukupno pronađeno: {filteredServices.length} servisa</p>
                )}
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}