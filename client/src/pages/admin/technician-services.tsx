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

// Format date helper
function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("sr-ME");
}

export default function TechnicianServicesAdmin() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch technicians
  const { data: technicians, isLoading: loadingTechnicians } = useQuery({
    queryKey: ["/api/technicians"],
  });
  
  // Fetch services
  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ["/api/services"],
  });
  
  // Simple filtering function
  const filteredServices = services?.filter((service: any) => {
    // Filter by technician
    if (selectedTechnicianId && service.technicianId !== parseInt(selectedTechnicianId)) {
      return false;
    }
    
    // Filter by status
    if (statusFilter !== "all" && service.status !== statusFilter) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        (service.description?.toLowerCase().includes(query)) || 
        (service.id.toString().includes(query))
      );
    }
    
    return true;
  });

  // Get technician name helper
  const getTechnicianName = (id: number | null) => {
    if (!id) return "Nije dodeljen";
    const tech = technicians?.find((t: any) => t.id === id);
    return tech ? tech.fullName : "Nije dodeljen";
  };
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        closeMobileMenu={() => setSidebarOpen(false)} 
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold mb-1">Servisi po serviserima</h1>
            <p className="text-gray-500 mb-6">Pregled servisa dodeljenih određenom serviseru</p>
            
            {/* Filters */}
            <Card className="mb-6">
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
                        {technicians?.map((tech: any) => (
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
                        <SelectItem value="in_progress">U toku</SelectItem>
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
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Services Table */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle>
                  {selectedTechnicianId 
                    ? `Servisi za: ${getTechnicianName(parseInt(selectedTechnicianId))}` 
                    : "Svi servisi"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(loadingServices || loadingTechnicians) ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Serviser</TableHead>
                        <TableHead>Opis</TableHead>
                        <TableHead className="text-right">Akcije</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!filteredServices || filteredServices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                            Nema pronađenih servisa
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredServices.map((service: any) => (
                          <TableRow key={service.id}>
                            <TableCell className="font-medium">#{service.id}</TableCell>
                            <TableCell>
                              <StatusBadge status={service.status} />
                            </TableCell>
                            <TableCell>{formatDate(service.createdAt)}</TableCell>
                            <TableCell>{getTechnicianName(service.technicianId)}</TableCell>
                            <TableCell className="max-w-md truncate">
                              {service.description}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => console.log("Details", service.id)}
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
                )}
              </CardContent>
              {filteredServices && filteredServices.length > 0 && (
                <CardFooter className="border-t p-2 text-sm text-gray-500">
                  Ukupno: {filteredServices.length} servisa
                </CardFooter>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}