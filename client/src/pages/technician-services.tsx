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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, Calendar as CalendarIcon, User, Phone, Mail, MapPin, Wrench, CheckCircle, XCircle } from "lucide-react";
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
  const [selectedService, setSelectedService] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Učitavanje servisera
  const { data: technicians } = useQuery<any[]>({
    queryKey: ["/api/technicians"],
  });

  // Učitavanje servisa dodeljenih trenutnom serviseru
  const { data: services } = useQuery<any[]>({
    queryKey: ["/api/my-services"],
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

  const handleViewDetails = (service: any) => {
    setSelectedService(service);
    setIsDetailsOpen(true);
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
                              onClick={() => handleViewDetails(service)}
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

      {/* Dialog za detalje servisa */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl technician-dialog-mobile">
          <DialogHeader>
            <DialogTitle>Detalji servisa #{selectedService?.id}</DialogTitle>
            <DialogDescription>
              Kompletne informacije o servisu
            </DialogDescription>
          </DialogHeader>
          
          {selectedService && (
            <div className="space-y-6 service-details-mobile">
              {/* Status i osnovne informacije */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">Status</h3>
                  <StatusBadge status={selectedService.status} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">Datum kreiranja</h3>
                  <p className="text-sm">{formatDate(selectedService.createdAt)}</p>
                </div>
              </div>

              {/* Opis problema */}
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2">Opis problema</h3>
                <p className="text-sm bg-gray-50 p-3 rounded">{selectedService.description}</p>
              </div>

              {/* Informacije o klijentu */}
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2">Informacije o klijentu</h3>
                <div className="bg-blue-50 p-3 rounded space-y-2">
                  <p className="text-sm"><strong>Ime:</strong> {selectedService.clientName || "N/A"}</p>
                  <p className="text-sm"><strong>Telefon:</strong> {selectedService.clientPhone || "N/A"}</p>
                  <p className="text-sm"><strong>Email:</strong> {selectedService.clientEmail || "N/A"}</p>
                  <p className="text-sm"><strong>Adresa:</strong> {selectedService.clientAddress || "N/A"}</p>
                </div>
              </div>

              {/* Informacije o serviseru */}
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2">Dodeljeni serviser</h3>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm"><strong>Serviser:</strong> {getTechnicianName(selectedService.technicianId)}</p>
                </div>
              </div>

              {/* Napomene servisera */}
              {selectedService.technicianNotes && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">Napomene servisera</h3>
                  <p className="text-sm bg-yellow-50 p-3 rounded">{selectedService.technicianNotes}</p>
                </div>
              )}

              {/* Troškovi */}
              {selectedService.cost && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">Troškovi</h3>
                  <p className="text-sm font-semibold text-green-600">{selectedService.cost} €</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}