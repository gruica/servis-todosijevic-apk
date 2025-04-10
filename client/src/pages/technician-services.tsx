import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { sr } from "date-fns/locale/sr";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Jednostavna komponenta za status servisa
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    pending: { label: "Na čekanju", variant: "outline" },
    assigned: { label: "Dodeljen", variant: "secondary" },
    scheduled: { label: "Zakazan", variant: "secondary" },
    in_progress: { label: "U toku", variant: "default" },
    waiting_parts: { label: "Čeka delove", variant: "destructive" },
    completed: { label: "Završen", variant: "outline" },
    cancelled: { label: "Otkazan", variant: "destructive" },
  };

  const config = statusConfig[status] || { label: status, variant: "outline" };
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};

// Glavni komponent
export default function TechnicianServicesList() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dateString, setDateString] = useState<string>("");
  const [totalAmountForDay, setTotalAmountForDay] = useState<number>(0);

  // Učitavanje servisera
  const { data: technicians } = useQuery<any[]>({
    queryKey: ["/api/technicians"],
  });

  // Učitavanje servisa
  const { data: services } = useQuery<any[]>({
    queryKey: ["/api/services"],
  });

  // Konvertuj string datum u Date objekat ako je izabran
  useEffect(() => {
    if (date) {
      setDateString(format(date, 'yyyy-MM-dd'));
    } else {
      setDateString('');
    }
  }, [date]);

  // Filtriranje servisa
  const filteredServices = services?.filter((service) => {
    // Filter po serviseru
    if (selectedTechnicianId && selectedTechnicianId !== "all" && service.technicianId !== parseInt(selectedTechnicianId)) {
      return false;
    }
    
    // Filter po statusu
    if (statusFilter !== "all" && service.status !== statusFilter) {
      return false;
    }
    
    // Filter po datumu
    if (dateString && service.createdAt) {
      // Konvertujemo i poredimo samo datum (bez vremena)
      const serviceDate = new Date(service.createdAt).toISOString().split('T')[0];
      if (serviceDate !== dateString) {
        return false;
      }
    }
    
    // Pretraga
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const description = service.description?.toLowerCase() || "";
      const id = service.id.toString();
      return description.includes(query) || id.includes(query);
    }
    
    return true;
  });

  // Izračunavanje ukupnog iznosa za dan i servisera
  useEffect(() => {
    if (!services || services.length === 0 || !dateString) {
      setTotalAmountForDay(0);
      return;
    }

    let total = 0;
    const techId = selectedTechnicianId !== "all" ? parseInt(selectedTechnicianId) : null;
    
    services.forEach(service => {
      // Provera da li je servis odgovarajući za dati datum
      const serviceDate = new Date(service.createdAt).toISOString().split('T')[0];
      if (serviceDate === dateString) {
        // Ako je filter po serviseru aktivan, saberi samo njegove servise
        if (techId && service.technicianId === techId) {
          const cost = service.cost ? parseFloat(service.cost) : 0;
          if (!isNaN(cost)) {
            total += cost;
          }
        } 
        // Ako nema filtera po serviseru, saberi sve servise za taj dan
        else if (!techId) {
          const cost = service.cost ? parseFloat(service.cost) : 0;
          if (!isNaN(cost)) {
            total += cost;
          }
        }
      }
    });

    setTotalAmountForDay(total);
  }, [services, dateString, selectedTechnicianId]);

  // Funkcija za formatiranje datuma
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("sr-ME");
  };

  // Dobijanje imena servisera
  const getTechnicianName = (id: number | null) => {
    if (!id) return "Nije dodeljen";
    const tech = technicians?.find((t) => t.id === id);
    return tech ? tech.fullName : "Nije dodeljen";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        closeMobileMenu={() => setSidebarOpen(false)} 
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4">
          <div className="container mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Servisi po serviserima</h1>
              <p className="text-muted-foreground">
                Pregled servisa dodeljenih serviserima
              </p>
            </div>

            {/* Filteri */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Select
                      value={selectedTechnicianId}
                      onValueChange={setSelectedTechnicianId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Serviser" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Svi serviseri</SelectItem>
                        {technicians?.map((tech) => (
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
                    {/* Datum selector */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "dd.MM.yyyy") : "Izaberi datum"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          locale={sr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Input
                      placeholder="Pretraga"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Prikaz ukupnog iznosa za izabrani dan */}
                {dateString && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Izabrani datum: </span>
                        <span>{date ? format(date, "dd.MM.yyyy") : ""}</span>
                      </div>
                      <div>
                        <span className="font-medium">Ukupno naplaćeno: </span>
                        <span className="text-lg font-bold">{totalAmountForDay.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabela servisa */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedTechnicianId && selectedTechnicianId !== "all"
                    ? `Servisi za: ${getTechnicianName(parseInt(selectedTechnicianId))}`
                    : "Svi servisi"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
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
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          Nema pronađenih servisa
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredServices.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">#{service.id}</TableCell>
                          <TableCell>
                            <StatusBadge status={service.status} />
                          </TableCell>
                          <TableCell>{formatDate(service.createdAt)}</TableCell>
                          <TableCell>{getTechnicianName(service.technicianId)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {service.description}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
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
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}