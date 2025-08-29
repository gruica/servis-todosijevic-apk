import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Calendar as CalendarIcon, User, Phone, Mail, MapPin, Wrench, CheckCircle, XCircle, Package, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { sr } from "date-fns/locale/sr";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotification } from "@/contexts/notification-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

// Jednostavna komponenta za status servisa
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    pending: { label: "Na čekanju", variant: "outline" },
    assigned: { label: "Dodeljen", variant: "secondary" },
    scheduled: { label: "Zakazan", variant: "secondary" },
    in_progress: { label: "U toku", variant: "default" },
    waiting_parts: { label: "Čeka delove", variant: "destructive" },
    completed: { label: "Završen", variant: "outline" },
    delivered: { label: "Isporučen", variant: "secondary" },
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
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dateString, setDateString] = useState<string>("");
  const [dateType, setDateType] = useState<"created" | "completed">("created"); // Tip datuma za filtriranje
  const [totalAmountForDay, setTotalAmountForDay] = useState<number>(0);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPullBackOpen, setIsPullBackOpen] = useState(false);
  const [showReturnConfirmation, setShowReturnConfirmation] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");
  const [isReturning, setIsReturning] = useState(false);
  const [pullBackReason, setPullBackReason] = useState("");
  const [pullBackNotes, setPullBackNotes] = useState("");
  
  // Koristi notification context
  const { highlightedServiceId, setHighlightedServiceId, clearHighlight, shouldAutoOpen, setShouldAutoOpen } = useNotification();
  
  // Toast notifications
  const { toast } = useToast();

  // Učitavanje servisera
  const { data: technicians } = useQuery<any[]>({
    queryKey: ["/api/technicians"],
  });

  // Učitavanje servisa - admin vidi sve servise, tehnićar samo svoje
  const { data: services, isLoading: servicesLoading, error: servicesError } = useQuery<any[]>({
    queryKey: ["/api/admin/services-by-technicians"],
  });

  // Mutation za brisanje servisa
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      return apiRequest(`/api/admin/services/${serviceId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspešno obrisano",
        description: "Servis je uspešno obrisan.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services-by-technicians"] });
      setIsDeleteOpen(false);
      setSelectedService(null);
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Neuspešno brisanje servisa.",
        variant: "destructive",
      });
    }
  });

  // Mutation za povlačenje servisa od servisera
  const pullBackServiceMutation = useMutation({
    mutationFn: async ({ serviceId, reason, notes }: { serviceId: number, reason: string, notes: string }) => {
      return apiRequest(`/api/admin/services/${serviceId}/return-from-technician`, {
        method: 'POST',
        body: JSON.stringify({ reason, notes })
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspešno povučeno",
        description: "Servis je uspešno povučen od servisera.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services-by-technicians"] });
      setIsPullBackOpen(false);
      setSelectedService(null);
      setPullBackReason("");
      setPullBackNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Neuspešno povlačenje servisa.",
        variant: "destructive",
      });
    }
  });



  // Proverava da li je stranica otvorena sa notifikacijom
  useEffect(() => {
    const state = history.state;
    // History state processed
    if (state && state.highlightServiceId) {
      // Service highlighting activated
      setHighlightedServiceId(state.highlightServiceId);
      setShouldAutoOpen(true);
      
      // Produžen timeout sa 5 na 15 sekundi
      const timer = setTimeout(() => {
        clearHighlight();
      }, 15000);
      
      return () => clearTimeout(timer);
    }
  }, [location, setHighlightedServiceId, setShouldAutoOpen, clearHighlight]);

  // Automatski otvara detalje servisa kada se dolazi sa notifikacije
  useEffect(() => {
    if (highlightedServiceId && shouldAutoOpen && services && services.length > 0) {
      const targetService = services.find(service => service.id === highlightedServiceId);
      if (targetService) {
        // Automatski otvara servis detalje
        setSelectedService(targetService);
        setIsDetailsOpen(true);
        
        // Čisti state posle otvaranja da se izbegnu duplikati
        setShouldAutoOpen(false);
        history.replaceState(null, '', '/tech');
      }
    }
  }, [services, highlightedServiceId, shouldAutoOpen, setShouldAutoOpen]);

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
    
    // Filter po datumu - fleksibilan po tipu datuma
    if (dateString) {
      let serviceDate = null;
      
      if (dateType === "created" && service.createdAt) {
        serviceDate = new Date(service.createdAt).toISOString().split('T')[0];
      } else if (dateType === "completed" && service.completedDate) {
        serviceDate = new Date(service.completedDate).toISOString().split('T')[0];
      }
      
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
      // Provera da li je servis odgovarajući za dati datum - fleksibilan po tipu datuma
      let serviceDate = null;
      
      if (dateType === "created" && service.createdAt) {
        serviceDate = new Date(service.createdAt).toISOString().split('T')[0];
      } else if (dateType === "completed" && service.completedDate) {
        serviceDate = new Date(service.completedDate).toISOString().split('T')[0];
      }
      
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
  }, [services, dateString, selectedTechnicianId, dateType]);

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

  const handleEditService = (service: any) => {
    setSelectedService(service);
    setIsEditOpen(true);
  };

  const handleDeleteService = (service: any) => {
    setSelectedService(service);
    setIsDeleteOpen(true);
  };

  const handlePullBackService = (service: any) => {
    setSelectedService(service);
    setIsPullBackOpen(true);
  };

  const confirmDeleteService = () => {
    if (selectedService) {
      deleteServiceMutation.mutate(selectedService.id);
    }
  };

  const confirmPullBackService = () => {
    if (selectedService && pullBackReason.trim()) {
      pullBackServiceMutation.mutate({
        serviceId: selectedService.id,
        reason: pullBackReason,
        notes: pullBackNotes
      });
    }
  };

  const handleReturnDevice = async () => {
    if (!selectedService || !returnNotes.trim()) {
      alert("Molim vas unesite napomenu o vraćanju aparata");
      return;
    }

    setIsReturning(true);
    
    try {
      const response = await fetch(`/api/services/${selectedService.id}/return-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          returnNotes: returnNotes.trim()
        })
      });

      if (response.ok) {
        alert('Aparat je uspešno vraćen klijentu');
        setShowReturnConfirmation(false);
        setReturnNotes("");
        setIsDetailsOpen(false);
        // Refresh services
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Greška: ${error.error}`);
      }
    } catch (error) {
      // Device return error handled
      alert('Greška pri vraćanju aparata');
    } finally {
      setIsReturning(false);
    }
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                    <Select
                      value={dateType}
                      onValueChange={setDateType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tip datuma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created">Datum kreiranja</SelectItem>
                        <SelectItem value="completed">Datum završetka</SelectItem>
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
                
                {/* Prikaz ukupnog iznosa za izabrani dan */}
                {dateString && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">
                          {dateType === "created" ? "Datum kreiranja: " : "Datum završetka: "}
                        </span>
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
                      <TableHead>Klijent</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Grad</TableHead>
                      <TableHead>Uređaj</TableHead>
                      <TableHead>Datum kreiranja</TableHead>
                      <TableHead>Datum završetka</TableHead>
                      <TableHead>Serviser</TableHead>
                      <TableHead>Opis</TableHead>
                      <TableHead className="text-right">Akcije</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!filteredServices || filteredServices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-6 text-muted-foreground">
                          Nema pronađenih servisa
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredServices.map((service) => (
                        <TableRow 
                          key={service.id}
                          className={cn(
                            "transition-all duration-500",
                            highlightedServiceId === service.id && "bg-blue-50 ring-2 ring-blue-200 animate-pulse"
                          )}
                        >
                          <TableCell className="font-medium">#{service.id}</TableCell>
                          <TableCell>
                            <StatusBadge status={service.status} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {service.clientName || "N/A"}
                          </TableCell>
                          <TableCell>
                            {service.clientPhone || "N/A"}
                          </TableCell>
                          <TableCell>
                            {service.clientCity || "N/A"}
                          </TableCell>
                          <TableCell>
                            {service.categoryName || "N/A"} - {service.manufacturerName || ""}
                          </TableCell>
                          <TableCell>{formatDate(service.createdAt)}</TableCell>
                          <TableCell>
                            {service.completedDate ? (
                              <span className="text-green-600 font-medium">
                                {formatDate(service.completedDate)}
                              </span>
                            ) : service.status === "completed" ? (
                              <span className="text-orange-600">Završen (bez datuma)</span>
                            ) : (
                              <span className="text-gray-500">U toku</span>
                            )}
                          </TableCell>
                          <TableCell>{service.technicianName || getTechnicianName(service.technicianId)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {service.description}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(service)}
                                className="p-1"
                                title="Pogledaj detalje"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditService(service)}
                                className="p-1 text-green-600 hover:text-green-700"
                                title="Uredi servis"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteService(service)}
                                className="p-1 text-red-600 hover:text-red-700"
                                title="Obriši servis"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {service.technicianId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePullBackService(service)}
                                  className="p-1 text-orange-600 hover:text-orange-700"
                                  title="Povuci servis od servisera"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
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

              {/* Datum završetka */}
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2">Datum završetka</h3>
                <div className="bg-gray-50 p-3 rounded">
                  {selectedService.completedDate ? (
                    <p className="text-sm font-medium text-green-600">
                      {formatDate(selectedService.completedDate)}
                    </p>
                  ) : selectedService.status === "completed" ? (
                    <p className="text-sm text-orange-600">Završen, ali datum nije evidentiran</p>
                  ) : (
                    <p className="text-sm text-gray-500">Servis još uvek nije završen</p>
                  )}
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
                  <p className="text-sm"><strong>Grad:</strong> {selectedService.clientCity || "N/A"}</p>
                </div>
              </div>

              {/* Informacije o uređaju */}
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2">Informacije o uređaju</h3>
                <div className="bg-purple-50 p-3 rounded space-y-2">
                  <p className="text-sm"><strong>Kategorija:</strong> {selectedService.categoryName || "N/A"}</p>
                  <p className="text-sm"><strong>Proizvođač:</strong> {selectedService.manufacturerName || "N/A"}</p>
                  <p className="text-sm"><strong>Model:</strong> {selectedService.applianceName || "N/A"}</p>
                  <p className="text-sm"><strong>Serijski broj:</strong> {selectedService.applianceSerialNumber || "N/A"}</p>
                </div>
              </div>

              {/* Informacije o serviseru */}
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2">Dodeljeni serviser</h3>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm"><strong>Serviser:</strong> {getTechnicianName(selectedService.technicianId)}</p>
                  {selectedService.technician && (
                    <>
                      <p className="text-sm"><strong>Telefon:</strong> {selectedService.technician.phone || "N/A"}</p>
                      <p className="text-sm"><strong>Email:</strong> {selectedService.technician.email || "N/A"}</p>
                      <p className="text-sm"><strong>Specijalizacija:</strong> {selectedService.technician.specialization || "N/A"}</p>
                    </>
                  )}
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

              {/* Akcije za servise u toku */}
              {selectedService.status === "in_progress" && (
                <div className="bg-blue-50 p-4 rounded-lg border-t-2 border-blue-200">
                  <h3 className="font-semibold text-sm text-gray-600 mb-3">Akcije</h3>
                  <Button
                    onClick={() => setShowReturnConfirmation(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isReturning}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Vrati aparat
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog za potvrdu vraćanja aparata */}
      <Dialog open={showReturnConfirmation} onOpenChange={setShowReturnConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vrati aparat klijentu</DialogTitle>
            <DialogDescription>
              Molim vas unesite napomenu o vraćanju aparata klijentu.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Napomena o vraćanju aparata: <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Unesite napomenu o stanju aparata, razlogu vraćanja ili druge važne informacije..."
                className="min-h-[100px] resize-none"
                required
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowReturnConfirmation(false);
                  setReturnNotes("");
                }}
                disabled={isReturning}
              >
                Otkaži
              </Button>
              <Button
                onClick={handleReturnDevice}
                disabled={isReturning || !returnNotes.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isReturning ? (
                  <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full" />
                ) : (
                  <Package className="h-4 w-4 mr-2" />
                )}
                {isReturning ? "Vraćam..." : "Vrati aparat"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Uredi servis</DialogTitle>
            <DialogDescription>
              Za kompleksno uređivanje servisa, koristite glavni Admin panel.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Funkcionalnost uređivanja servisa je dostupna u glavnom Admin panelu sa svim opcijama.
            </p>
            <Button 
              onClick={() => {
                setIsEditOpen(false);
                navigate(`/admin/services`);
              }}
              className="w-full"
            >
              Otvori u Admin panelu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Service Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Obriši servis</DialogTitle>
            <DialogDescription>
              Da li ste sigurni da želite da obrišete servis #{selectedService?.id}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-700">
                <strong>Upozorenje:</strong> Ova akcija je nepovratna. Servis će biti trajno obrisan iz sistema.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDeleteOpen(false)}
                disabled={deleteServiceMutation.isPending}
              >
                Otkaži
              </Button>
              <Button
                onClick={confirmDeleteService}
                disabled={deleteServiceMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {deleteServiceMutation.isPending ? "Brišem..." : "Obriši servis"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pull Back Service Dialog */}
      <Dialog open={isPullBackOpen} onOpenChange={setIsPullBackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Povuci servis od servisera</DialogTitle>
            <DialogDescription>
              Molim vas unesite razlog povlačenja servisa #{selectedService?.id}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Razlog povlačenja: <span className="text-red-500">*</span>
              </label>
              <Select value={pullBackReason} onValueChange={setPullBackReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Izaberite razlog" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nedostupnost_servisera">Nedostupnost servisera</SelectItem>
                  <SelectItem value="promena_prioriteta">Promena prioriteta</SelectItem>
                  <SelectItem value="tehnicke_poteskoce">Tehničke poteškoće</SelectItem>
                  <SelectItem value="zahtev_klijenta">Zahtev klijenta</SelectItem>
                  <SelectItem value="prerasporedivanje">Preraspoređivanje posla</SelectItem>
                  <SelectItem value="ostalo">Ostalo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Dodatne napomene:
              </label>
              <Textarea
                value={pullBackNotes}
                onChange={(e) => setPullBackNotes(e.target.value)}
                placeholder="Unesite dodatne informacije o razlogu povlačenja..."
                className="min-h-[100px] resize-none"
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsPullBackOpen(false);
                  setPullBackReason("");
                  setPullBackNotes("");
                }}
                disabled={pullBackServiceMutation.isPending}
              >
                Otkaži
              </Button>
              <Button
                onClick={confirmPullBackService}
                disabled={pullBackServiceMutation.isPending || !pullBackReason.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {pullBackServiceMutation.isPending ? "Povlačim..." : "Povuci servis"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}