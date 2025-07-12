import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, User, MapPin, Phone, Mail, Settings, CheckCircle, XCircle, Search, Plus } from "lucide-react";
import { Service, Client, Technician, SelectUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { sr } from "date-fns/locale";
import { ClientSearchDialog } from "@/components/admin/ClientSearchDialog";
import { CreateClientDialog } from "@/components/admin/CreateClientDialog";

// Status descriptions
const STATUS_DESCRIPTIONS: Record<string, string> = {
  pending: "Na čekanju",
  scheduled: "Zakazano",
  in_progress: "U procesu",
  waiting_parts: "Čeka delove",
  completed: "Završeno",
  cancelled: "Otkazano"
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-green-100 text-green-800",
  waiting_parts: "bg-orange-100 text-orange-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800"
};

// City icons
const CITY_ICONS: Record<string, string> = {
  Budva: "🏖️",
  Kotor: "🏔️",
  Tivat: "✈️",
  Podgorica: "🏛️",
  Nikšić: "🏭",
  Bar: "⚓",
  Herceg_Novi: "🌊",
  Cetinje: "👑"
};

interface ServiceWithDetails extends Service {
  client: Client;
  technician?: Technician;
  appliance?: {
    category: {
      name: string;
    };
  };
}

interface GroupedServices {
  [city: string]: ServiceWithDetails[];
}

export default function ServiceManagementPage() {
  const [selectedService, setSelectedService] = useState<ServiceWithDetails | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [technicianNotes, setTechnicianNotes] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch services
  const { data: services, isLoading: servicesLoading } = useQuery<ServiceWithDetails[]>({
    queryKey: ["/api/services-with-details"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch technicians
  const { data: technicians } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  // Assign technician mutation
  const assignTechnicianMutation = useMutation({
    mutationFn: async (data: { serviceId: number; technicianId: number; scheduledDate?: string }) => {
      const response = await apiRequest("PUT", `/api/services/${data.serviceId}/assign-technician`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services-with-details"] });
      setAssignDialogOpen(false);
      toast({
        title: "Serviser dodeljen",
        description: "Serviser je uspešno dodeljen servisu.",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Dogodila se greška prilikom dodeljivanja servisera.",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { serviceId: number; status: string; notes?: string }) => {
      const response = await apiRequest("PUT", `/api/services/${data.serviceId}/update-status`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services-with-details"] });
      setStatusDialogOpen(false);
      toast({
        title: "Status ažuriran",
        description: "Status servisa je uspešno ažuriran.",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Dogodila se greška prilikom ažuriranja statusa.",
        variant: "destructive",
      });
    },
  });

  // Group services by city and status
  const groupedServices: GroupedServices = {};
  const unscheduledServices: ServiceWithDetails[] = [];

  if (services) {
    services.forEach(service => {
      if (service.status === "pending" || !service.scheduledDate) {
        unscheduledServices.push(service);
      } else {
        const city = service.client.city || "Nepoznato";
        if (!groupedServices[city]) {
          groupedServices[city] = [];
        }
        groupedServices[city].push(service);
      }
    });
  }

  // Sort cities by number of services
  const sortedCities = Object.keys(groupedServices).sort((a, b) => 
    groupedServices[b].length - groupedServices[a].length
  );

  const handleAssignTechnician = () => {
    if (!selectedService || !selectedTechnician) return;
    
    assignTechnicianMutation.mutate({
      serviceId: selectedService.id,
      technicianId: parseInt(selectedTechnician),
      scheduledDate: scheduledDate || undefined,
    });
  };

  const handleUpdateStatus = () => {
    if (!selectedService || !selectedStatus) return;
    
    updateStatusMutation.mutate({
      serviceId: selectedService.id,
      status: selectedStatus,
      notes: technicianNotes || undefined,
    });
  };

  const openAssignDialog = (service: ServiceWithDetails) => {
    setSelectedService(service);
    setSelectedTechnician("");
    setScheduledDate("");
    setAssignDialogOpen(true);
  };

  const openStatusDialog = (service: ServiceWithDetails) => {
    setSelectedService(service);
    setSelectedStatus("");
    setTechnicianNotes("");
    setStatusDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "dd.MM.yyyy", { locale: sr });
    } catch {
      return dateString;
    }
  };

  const getCityIcon = (city: string) => {
    return CITY_ICONS[city.replace(/\s+/g, "_")] || "🏙️";
  };

  if (servicesLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Upravljanje servisima</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Upravljanje servisima</h1>
            <p className="text-muted-foreground">
              Organizacija servisa po gradovima i statusima
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClientSearchOpen(true)}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Pretraži klijente
            </Button>
            <Badge variant="outline">
              Ukupno servisa: {services?.length || 0}
            </Badge>
            <Badge variant="secondary">
              Nezakazani: {unscheduledServices.length}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="unscheduled" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unscheduled">
              <XCircle className="h-4 w-4 mr-2" />
              Nezakazani servisi ({unscheduledServices.length})
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <CheckCircle className="h-4 w-4 mr-2" />
              Zakazani po gradovima ({services?.length ? services.length - unscheduledServices.length : 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unscheduled" className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Ovi servisi čekaju na pregled i dodelu tehničara. Prioritet je njihova organizacija.
              </AlertDescription>
            </Alert>

            {unscheduledServices.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Svi servisi su zakazani!</h3>
                  <p className="text-muted-foreground">
                    Trenutno nema servisa koji čekaju na pregled.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {unscheduledServices.map((service) => (
                  <Card key={service.id} className="border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">#{service.id}</Badge>
                            <Badge className={STATUS_COLORS[service.status]}>
                              {STATUS_DESCRIPTIONS[service.status]}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg mb-1">{service.client.fullName}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {service.client.city}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {service.client.phone}
                            </div>
                            {service.client.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {service.client.email}
                              </div>
                            )}
                          </div>
                          <p className="text-sm mb-2">{service.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Kreiran: {formatDate(service.createdAt)}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => openAssignDialog(service)}
                            className="whitespace-nowrap"
                          >
                            <User className="h-3 w-3 mr-1" />
                            Dodeli servisera
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStatusDialog(service)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Status
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Servisi grupisani po gradovima za lakše planiranje rute tehničara.
              </AlertDescription>
            </Alert>

            {sortedCities.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nema zakazanih servisa</h3>
                  <p className="text-muted-foreground">
                    Zakazajte servise iz liste nezakazanih servisa.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedCities.map((city) => (
                  <Card key={city} className="h-fit">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">{getCityIcon(city)}</span>
                        <div>
                          <div className="font-semibold">{city}</div>
                          <div className="text-sm text-muted-foreground font-normal">
                            {groupedServices[city].length} servis{groupedServices[city].length !== 1 ? 'a' : ''}
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {groupedServices[city].map((service) => (
                          <div key={service.id} className="p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-xs">
                                #{service.id}
                              </Badge>
                              <Badge className={`${STATUS_COLORS[service.status]} text-xs`}>
                                {STATUS_DESCRIPTIONS[service.status]}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-sm mb-1">{service.client.fullName}</h4>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {service.description}
                            </p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {service.scheduledDate ? formatDate(service.scheduledDate) : 'Nepoznato'}
                              </div>
                              {service.technician && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {service.technician.fullName}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs h-7"
                                onClick={() => openAssignDialog(service)}
                              >
                                Izmeni
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs h-7"
                                onClick={() => openStatusDialog(service)}
                              >
                                Status
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Assign Technician Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dodeli servisera</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedService && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Servis #{selectedService.id}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedService.client.fullName} - {selectedService.client.city}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="technician">Serviser</Label>
                <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                  <SelectTrigger>
                    <SelectValue placeholder="Izaberi servisera" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians?.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id.toString()}>
                        {tech.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Zakazani datum (opciono)</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAssignTechnician}
                  disabled={!selectedTechnician || assignTechnicianMutation.isPending}
                  className="flex-1"
                >
                  {assignTechnicianMutation.isPending ? "Dodeljuje..." : "Dodeli"}
                </Button>
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                  Otkaži
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Update Status Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ažuriraj status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedService && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Servis #{selectedService.id}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedService.client.fullName} - {selectedService.client.city}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Izaberi status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_DESCRIPTIONS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Napomene (opciono)</Label>
                <Textarea
                  id="notes"
                  placeholder="Dodaj napomene o servisu..."
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateStatus}
                  disabled={!selectedStatus || updateStatusMutation.isPending}
                  className="flex-1"
                >
                  {updateStatusMutation.isPending ? "Ažurira..." : "Ažuriraj"}
                </Button>
                <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                  Otkaži
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Client Search Dialog */}
        <ClientSearchDialog
          open={clientSearchOpen}
          onOpenChange={setClientSearchOpen}
          onClientSelect={(client) => {
            setSelectedClient(client);
            // Možda dodamo dodatnu logiku za kreiranje servisa
          }}
          onCreateNew={() => {
            setClientSearchOpen(false);
            setCreateClientOpen(true);
          }}
          title="Pretraži klijente"
        />

        {/* Create Client Dialog */}
        <CreateClientDialog
          open={createClientOpen}
          onOpenChange={setCreateClientOpen}
          onClientCreated={(client) => {
            setSelectedClient(client);
          }}
          title="Kreiraj novog klijenta"
        />
      </div>
    </AdminLayout>
  );
}