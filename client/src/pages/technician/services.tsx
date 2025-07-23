import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Service, ServiceStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, ClipboardCheck, Clock, Calendar, Package, ClipboardList, LogOut, User, MapPin, Truck, AlertCircle, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { TechnicianProfileWidget } from "@/components/technician/profile-widget";
import { CallClientButton } from "@/components/ui/call-client-button";
import { ServiceDetailsFloat } from "@/components/technician/service-details-float";
import { QuickActionsFloat } from "@/components/technician/quick-actions-float";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { callPhoneNumber, openMapWithAddress, isMobileEnvironment } from "@/lib/mobile-utils";
import SparePartsOrderForm from "@/components/spare-parts-order-form";
import { WaitingForPartsFolder } from "@/components/technician/WaitingForPartsFolder";
import { useNotification } from "@/contexts/notification-context";
import { SupplementGeneraliFormSimple } from "@/components/technician/supplement-generali-form-simple";
import { RemovedPartsForm } from "@/components/technician/removed-parts-form";

type TechnicianService = Service & {
  client?: {
    id: number;
    fullName: string;
    phone: string;
    address: string | null;
    email: string | null;
    city: string | null;
  };
  appliance?: {
    id: number;
    model: string | null;
    serialNumber: string | null;
    category?: {
      id: number;
      name: string;
      icon: string;
    };
  };
  devicePickedUp?: boolean;
  pickupDate?: string | null;
  pickupNotes?: string | null;
};

export default function TechnicianServices() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const { highlightedServiceId, shouldAutoOpen, setHighlightedServiceId, setShouldAutoOpen, clearHighlight } = useNotification();
  const isMobile = useIsMobile();
  // Mobile environment detection
  const isMobileDevice = isMobileEnvironment();
  const [activeTab, setActiveTab] = useState<string>("active");
  const [selectedService, setSelectedService] = useState<TechnicianService | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ServiceStatus | null>(null);
  const [technicianNotes, setTechnicianNotes] = useState<string>("");
  const [usedParts, setUsedParts] = useState<string>("");
  const [machineNotes, setMachineNotes] = useState<string>("");
  const [cost, setCost] = useState<string>("");
  const [isCompletelyFixed, setIsCompletelyFixed] = useState<boolean>(true);
  const [warrantyStatus, setWarrantyStatus] = useState<string>("in_warranty");
  
  // State za označavanje klijenta kao nedostupnog
  const [clientUnavailableDialogOpen, setClientUnavailableDialogOpen] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string>("");
  const [reschedulingNotes, setReschedulingNotes] = useState<string>("");
  

  
  // State za preuzimanje uređaja
  const [devicePickupDialogOpen, setDevicePickupDialogOpen] = useState(false);
  const [pickupNotes, setPickupNotes] = useState<string>("");
  
  // State za plutajuće prozore
  const [floatingServiceOpen, setFloatingServiceOpen] = useState(false);
  const [floatingSelectedService, setFloatingSelectedService] = useState<TechnicianService | null>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("Svi gradovi");
  
  // State za zahtev rezervnih delova
  const [sparePartsOrderOpen, setSparePartsOrderOpen] = useState(false);
  const [sparePartsService, setSparePartsService] = useState<TechnicianService | null>(null);
  
  // State za dopunjavanje Generali servisa
  const [supplementGeneraliOpen, setSupplementGeneraliOpen] = useState(false);
  const [supplementGeneraliService, setSupplementGeneraliService] = useState<TechnicianService | null>(null);
  




  // Fetch services assigned to the logged-in technician using JWT
  const { data: services = [], isLoading, error, refetch } = useQuery<TechnicianService[]>({
    queryKey: ["/api/my-services"],
    queryFn: async ({ signal }) => {
      console.log("🔄 JWT: Pozivam /api/my-services...");
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }
      
      const response = await fetch(`/api/my-services?${Date.now()}`, { 
        signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log("📡 JWT Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ JWT API greška:", response.status, errorText);
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
        }
        throw new Error(`Greška pri dobijanju servisa: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      console.log("✅ JWT: Dobio servise:", data?.length || 0, "servisa");
      return data;
    },
    enabled: !!user, // Pozovi query samo ako je korisnik prijavljen
    refetchInterval: user ? 10000 : false,
    refetchIntervalInBackground: !!user,
    staleTime: 0, // No stale time - always fresh
    gcTime: 0, // No cache time
  });
  
  // Debug logging
  console.log("🔍 Debug stanje:", {
    isLoading,
    error: error?.message,
    servicesCount: services?.length || 0,
    services: services?.slice(0, 3).map(s => ({ id: s.id, status: s.status, client: s.client?.fullName })),
    hasService106: services?.some(s => s.id === 106),
    service106Details: services?.find(s => s.id === 106)
  });

  // Debug filter logic
  console.log("📊 Filter debug:", {
    activeTab,
    servicesCount: services?.length || 0,
    filteredServicesCount: "prije filtera",
    sampleServices: services?.slice(0, 2).map(s => ({ id: s.id, status: s.status, devicePickedUp: s.devicePickedUp }))
  });

  const filteredServices = services.filter((service) => {
    if (activeTab === "active") {
      return service.status === "pending" || service.status === "scheduled" || service.status === "in_progress" || service.status === "assigned";
    } else if (activeTab === "completed") {
      return service.status === "completed";
    } else if (activeTab === "picked_up") {
      return service.devicePickedUp === true;
    } else if (activeTab === "problematic") {
      return service.status === "client_not_home" || service.status === "client_not_answering";
    } else {
      return service.status === "waiting_parts" || service.status === "cancelled" || 
             service.status === "client_not_home" || service.status === "client_not_answering";
    }
  });

  // Debug filter results
  console.log("🎯 Filter rezultati:", {
    filteredServicesCount: filteredServices?.length || 0,
    statusSpread: services?.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  });

  // Automatski otvara detalje servisa kada se dolazi sa notifikacije
  useEffect(() => {
    if (highlightedServiceId && shouldAutoOpen && services.length > 0) {
      console.log("🔔 Notification Effect: Tražim servis", {
        highlightedServiceId,
        shouldAutoOpen,
        servicesCount: services.length,
        serviceIds: services.map(s => s.id)
      });
      
      const targetService = services.find(service => service.id === highlightedServiceId);
      if (targetService) {
        console.log("✅ Notification: Pronašao servis, otvaramo floating dialog", targetService.id);
        
        // Automatski otvara floating servis prozor za highlighted servis
        setFloatingSelectedService(targetService);
        setFloatingServiceOpen(true);
        
        // Čisti notification state posle otvaranja
        clearHighlight();
      } else {
        console.log("❌ Notification: Servis nije pronađen u listi servisa tehničara", {
          highlightedServiceId,
          availableServices: services.map(s => ({ id: s.id, status: s.status }))
        });
        
        // Čisti notification state ako servis nije pronađen
        clearHighlight();
      }
    }
  }, [services, highlightedServiceId, shouldAutoOpen, clearHighlight]);

  // Mutation for updating service status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      serviceId, 
      status, 
      notes, 
      usedParts, 
      machineNotes, 
      cost, 
      isCompletelyFixed,
      warrantyStatus,
      clientUnavailableReason,
      needsRescheduling,
      reschedulingNotes
    }: { 
      serviceId: number; 
      status: string; 
      notes: string;
      usedParts?: string;
      machineNotes?: string;
      cost?: string;
      isCompletelyFixed?: boolean;
      warrantyStatus?: string;
      clientUnavailableReason?: string;
      needsRescheduling?: boolean;
      reschedulingNotes?: string;
    }) => {
      console.log(`[MUTATION] Pozivam API za servis ${serviceId} sa statusom: ${status}`);
      
      const res = await apiRequest("PUT", `/api/services/${serviceId}/status`, { 
        status, 
        technicianNotes: notes,
        usedParts,
        machineNotes,
        cost,
        isCompletelyFixed,
        warrantyStatus,
        clientUnavailableReason,
        needsRescheduling,
        reschedulingNotes
      });
      
      const result = await res.json();
      console.log(`[MUTATION] API odgovor za servis ${serviceId}:`, result);
      
      return result;
    },
    onSuccess: (data) => {
      // Jedina cache invalidacija - uklanjamo duplu cache invalidaciju
      queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
      
      // Zatvaramo dijalog za sve korisnike
      setStatusDialogOpen(false);
      
      // Prikazujemo poruku o uspešnosti
      if (data?.emailSent) {
        toast({
          title: "✅ Status uspješno ažuriran",
          description: `Status servisa je uspješno promijenjen. 📧 Email obaveštenje je poslato klijentu ${data.clientName || 'i serviseru'}. ${data.emailDetails || ''}`,
          variant: "default",
          duration: 5000,
        });
      } else {
        toast({
          title: data?.emailError ? "⚠️ Status ažuriran, slanje email-a nije uspelo" : "✅ Status uspješno ažuriran",
          description: "Status servisa je uspješno promijenjen. " + 
            (data?.emailError ? `⚠️ Email obaveštenje NIJE poslato: ${data.emailError}` : "📧 Email obaveštenja nisu konfigurisana."),
          variant: data?.emailError ? "destructive" : "default",
          duration: 7000,
        });
      }
    },
    onError: (error: Error) => {
      // Za greške uvek prikazujemo toast poruku
      toast({
        title: "Greška pri ažuriranju statusa",
        description: error.message,
        variant: "destructive",
      });
      
      // Zatvaramo dijalog u slučaju greške
      setStatusDialogOpen(false);
    },
  });

  const handleStatusChange = () => {
    if (!selectedService || !newStatus) return;
    
    // Jednostavno pozivamo mutaciju - cache invalidacija se automatski poziva u onSuccess callback-u
    updateStatusMutation.mutate({
      serviceId: selectedService.id,
      status: newStatus,
      notes: technicianNotes,
      usedParts: usedParts,
      machineNotes: machineNotes,
      cost: cost,
      isCompletelyFixed: isCompletelyFixed,
      warrantyStatus: warrantyStatus
    });
  };

  const openStatusDialog = (service: TechnicianService, status: ServiceStatus) => {
    setSelectedService(service);
    setNewStatus(status);
    setTechnicianNotes(service.technicianNotes || "");
    
    // Uvek inicijalizujemo sva polja bez obzira na status (za mobile web)
    setUsedParts(service.usedParts || "");
    setMachineNotes(service.machineNotes || "");
    setCost(service.cost || "");
    setIsCompletelyFixed(service.isCompletelyFixed !== false);
    setWarrantyStatus(service.warrantyStatus || "in_warranty");
    
    setStatusDialogOpen(true);
  };

  const openClientUnavailableDialog = (service: TechnicianService) => {
    setSelectedService(service);
    setUnavailableReason("");
    setReschedulingNotes("");
    setClientUnavailableDialogOpen(true);
  }

  const openSupplementGeneraliDialog = (service: TechnicianService) => {
    setSupplementGeneraliService(service);
    setSupplementGeneraliOpen(true);
  };

  const openSparePartsOrder = (service: TechnicianService) => {
    console.log("🔧 openSparePartsOrder pozvan sa servisom:", service.id);
    setSparePartsService(service);
    setSparePartsOrderOpen(true);
    console.log("🔧 State postavljen - sparePartsOrderOpen:", true);
  };

  const handleClientUnavailable = (status: "client_not_home" | "client_not_answering") => {
    if (!selectedService) return;
    
    updateStatusMutation.mutate({
      serviceId: selectedService.id,
      status: status,
      notes: selectedService.technicianNotes || "",
      clientUnavailableReason: unavailableReason,
      needsRescheduling: true,
      reschedulingNotes: reschedulingNotes
    });
    
    setClientUnavailableDialogOpen(false);
  };

  const openDevicePickupDialog = (service: TechnicianService) => {
    setSelectedService(service);
    setPickupNotes("");
    setDevicePickupDialogOpen(true);
  };

  const handleDevicePickup = () => {
    if (!selectedService) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    updateStatusMutation.mutate({
      serviceId: selectedService.id,
      status: selectedService.status, // Zadržava trenutni status
      notes: selectedService.technicianNotes || "",
      devicePickedUp: true,
      pickupDate: today,
      pickupNotes: pickupNotes
    });
    
    setDevicePickupDialogOpen(false);
  };

  // Mutation za vraćanje servisa administratoru
  const returnToAdminMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const res = await apiRequest("PUT", `/api/services/${serviceId}`, {
        status: "pending",
        technicianId: null,
        technicianNotes: `Servis vraćen administratoru zbog problema sa klijentom`
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
      toast({
        title: "Servis vraćen",
        description: "Servis je uspešno vraćen administratoru zbog problema sa klijentom.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Funkcija za vraćanje servisa administratoru
  const handleReturnToAdmin = (service: TechnicianService) => {
    returnToAdminMutation.mutate(service.id);
  };





  // Filter services based on active tab - moved up to avoid duplication

  // Group services by city for better organization
  const groupedServices = filteredServices.reduce((groups, service) => {
    const city = service.client?.city || "Nepoznat grad";
    if (!groups[city]) {
      groups[city] = [];
    }
    groups[city].push(service);
    return groups;
  }, {} as Record<string, TechnicianService[]>);

  // Debug UI state after grouping
  console.log("✅ UI Debug: Servisi se prikazuju uspešno!", {
    totalServices: services?.length,
    filteredServices: filteredServices?.length,
    cities: Object.keys(groupedServices),
    servicesPerCity: Object.entries(groupedServices).map(([city, servs]) => `${city}: ${servs.length}`)
  });

  // Sort cities alphabetically and services within each city by date
  const sortedCities = Object.keys(groupedServices).sort();
  sortedCities.forEach(city => {
    groupedServices[city].sort((a, b) => {
      const dateA = new Date(a.scheduledDate || a.createdAt);
      const dateB = new Date(b.scheduledDate || b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
  });

  // Function to get status badge
  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Čekanje</Badge>;
      case "scheduled":
        return <Badge variant="secondary">Zakazano</Badge>;
      case "in_progress":
        return <Badge variant="default">U procesu</Badge>;
      case "waiting_parts":
        return <Badge className="bg-amber-500">Čeka delove</Badge>;
      case "completed":
        return <Badge className="bg-green-600">Završeno</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Otkazano</Badge>;
      case "client_not_home":
        return <Badge className="bg-orange-500">Klijent nije kući</Badge>;
      case "client_not_answering":
        return <Badge className="bg-red-500">Klijent se ne javlja</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  // Funkcija za otvaranje mape sa lokacijom klijenta
  const openClientLocation = async (address: string, city: string | null) => {
    try {
      const success = await openMapWithAddress(address, city);
      if (success) {
        toast({
          title: "Otvaranje mape",
          description: "Lokacija klijenta se otvara u Google Maps aplikaciji",
        });
      } else {
        toast({
          title: "Greška pri otvaranju mape",
          description: "Nije moguće otvoriti lokaciju. Proverite dozvole aplikacije.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Greška pri otvaranju mape:", error);
      toast({
        title: "Greška pri otvaranju mape",
        description: "Došlo je do neočekivane greške pri otvaranju mape.",
        variant: "destructive",
      });
    }
  };

  // Funkcija za otvaranje plutajućeg prozora sa detaljima servisa
  const openFloatingService = (service: TechnicianService) => {
    setFloatingSelectedService(service);
    setFloatingServiceOpen(true);
  };

  // Funkcija za ažuriranje statusa iz plutajućeg prozora
  const handleFloatingStatusUpdate = async (serviceId: number, status: string, data: any) => {
    try {
      await updateStatusMutation.mutateAsync({
        serviceId,
        status,
        notes: data.technicianNotes,
        usedParts: data.usedParts,
        machineNotes: data.machineNotes,
        cost: data.cost?.toString(),
        isCompletelyFixed: true,
        warrantyStatus: data.warrantyStatus || "in_warranty"
      });
      
      // Eksplicitno invalidiramo cache jer mutateAsync ne poziva onSuccess callback
      await queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
      
      setFloatingServiceOpen(false);
    } catch (error) {
      console.error("Greška pri ažuriranju statusa iz plutajućeg prozora:", error);
      toast({
        title: "Greška pri ažuriranju statusa",
        description: "Pokušajte ponovo",
        variant: "destructive",
      });
    }
  };

  // Funkcija za otvaranje brzih akcija
  const openQuickActions = (city: string = "Svi gradovi") => {
    setSelectedCity(city);
    setQuickActionsOpen(true);
  };

  // Funkcija za brzu promenu statusa
  const handleQuickStatusUpdate = async (serviceId: number, status: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        serviceId,
        status,
        notes: `Brza akcija: ${status === "in_progress" ? "Započet" : "Završen"} servis`,
        usedParts: "",
        machineNotes: "",
        cost: "",
        isCompletelyFixed: status === "completed",
        warrantyStatus: "in_warranty"
      });
      
      // Eksplicitno invalidiramo cache jer mutateAsync ne poziva onSuccess callback
      await queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
      
      toast({
        title: "✅ Status uspešno ažuriran",
        description: "Status servisa je uspešno promenjen.",
        variant: "default",
      });
    } catch (error) {
      console.error("Greška pri brzom ažuriranju statusa:", error);
      toast({
        title: "Greška pri ažuriranju statusa",
        description: "Pokušajte ponovo",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-primary rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Moji servisi</h1>
        <div className="flex gap-2 items-center">
          <Button 
            variant="outline" 
            onClick={() => openQuickActions()}
            className="hidden sm:flex"
          >
            <Package className="mr-2 h-4 w-4" />
            Brze akcije
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setActiveTab("picked_up")}
            className="hidden sm:flex"
          >
            <Truck className="mr-2 h-4 w-4" />
            Preuzeti
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setActiveTab("problematic")}
            className="hidden sm:flex"
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Problematični
          </Button>
          <NotificationsDropdown />
          <TechnicianProfileWidget />
          <Button 
            variant="destructive" 
            onClick={() => {
              logoutMutation.mutate(undefined, {
                onSuccess: () => {
                  toast({
                    title: "Odjava uspješna",
                    description: "Uspješno ste se odjavili.",
                  });
                },
                onError: (error: Error) => {
                  toast({
                    title: "Greška pri odjavi",
                    description: error.message,
                    variant: "destructive",
                  });
                },
              });
            }}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></div>
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Odjavi se
          </Button>
        </div>
      </div>

      {/* Mobile prečice za filtriranje */}
      <div className="sm:hidden mb-4">
        <div className="flex gap-2 justify-center">
          <Button 
            variant={activeTab === "picked_up" ? "default" : "outline"}
            onClick={() => setActiveTab("picked_up")}
            className="flex-1"
            size="sm"
          >
            <Truck className="mr-2 h-4 w-4" />
            Preuzeti
          </Button>
          <Button 
            variant={activeTab === "problematic" ? "default" : "outline"}
            onClick={() => setActiveTab("problematic")}
            className="flex-1"
            size="sm"
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Problematični
          </Button>
        </div>
        {/* Povratak na osnovne tab-ove */}
        {(activeTab === "picked_up" || activeTab === "problematic") && (
          <div className="flex justify-center mt-2">
            <Button 
              variant="ghost"
              onClick={() => setActiveTab("active")}
              size="sm"
            >
              ← Nazad na osnovne servise
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="active" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="active">Aktivni</TabsTrigger>
          <TabsTrigger value="waiting_parts">Čeka delove</TabsTrigger>
          <TabsTrigger value="completed">Završeni</TabsTrigger>
          <TabsTrigger value="other">Ostalo</TabsTrigger>
        </TabsList>

        {/* Waiting Parts Tab */}
        <TabsContent value="waiting_parts" className="space-y-4">
          <WaitingForPartsFolder />
        </TabsContent>

        {["active", "completed", "other"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {filteredServices.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500">Nema servisa u ovoj kategoriji</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-220px)]">
                <div className="space-y-6 pr-2 pb-4">
                  {sortedCities.map((city) => {
                    console.log(`📍 Rendering city ${city} with services:`, groupedServices[city].map(s => ({ id: s.id, client: s.client?.fullName, description: s.description })));
                    return (
                      <div key={city} className="space-y-3">
                      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 border-b">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-lg text-primary">{city}</h3>
                          <Badge variant="outline" className="ml-2">
                            {groupedServices[city].length} servis{groupedServices[city].length === 1 ? '' : 'a'}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openQuickActions(city)}
                          className="h-8 px-2"
                        >
                          <Package className="h-3 w-3" />
                        </Button>
                      </div>
                      {groupedServices[city].map((service) => (
                        <Card 
                          key={service.id} 
                          className={`overflow-hidden mb-4 ${
                            highlightedServiceId === service.id 
                              ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50/50 border-blue-200' 
                              : ''
                          }`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg font-semibold leading-tight">
                                  {service.client?.fullName}
                                </CardTitle>
                                <CardDescription className="text-sm mt-1">
                                  {service.appliance?.category?.name} {service.appliance?.model}
                                </CardDescription>
                              </div>
                              <div className="flex-shrink-0">
                                {getStatusBadge(service.status)}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="space-y-2">
                              {/* Opis problema */}
                              <div className="flex items-start">
                                <ClipboardList className="h-4 w-4 mr-2 mt-0.5 opacity-70 flex-shrink-0" />
                                <span className="text-sm">{service.description}</span>
                              </div>

                              {/* Kontakt klijenta */}
                              {service.client?.phone && (
                                <div className="flex items-center">
                                  <Phone className="h-4 w-4 mr-2 opacity-70" />
                                  <span className="text-sm font-medium">{service.client.phone}</span>
                                </div>
                              )}

                              {/* Adresa klijenta */}
                              {service.client?.address && (
                                <div className="flex items-start">
                                  <MapPin className="h-4 w-4 mr-2 mt-0.5 opacity-70 flex-shrink-0" />
                                  <span className="text-sm">{service.client.address}, {service.client.city}</span>
                                </div>
                              )}

                              {/* Datum kreiranja */}
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 opacity-70" />
                                <span className="text-sm">Kreiran: {formatDate(service.createdAt)}</span>
                              </div>

                              {/* Zakazan datum */}
                              {service.scheduledDate && (
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2 opacity-70" />
                                  <span className="text-sm">Zakazan: {formatDate(service.scheduledDate)}</span>
                                </div>
                              )}

                              {/* Napomene servisera ako postoje */}
                              {service.technicianNotes && (
                                <div className="flex items-start">
                                  <User className="h-4 w-4 mr-2 mt-0.5 opacity-70 flex-shrink-0" />
                                  <span className="text-sm text-muted-foreground">
                                    <strong>Napomena:</strong> {service.technicianNotes}
                                  </span>
                                </div>
                              )}

                              {/* Cena ako je definisana */}
                              {service.cost && (
                                <div className="flex items-center">
                                  <Package className="h-4 w-4 mr-2 opacity-70" />
                                  <span className="text-sm font-medium text-green-600">
                                    Cena: {service.cost}€
                                  </span>
                                </div>
                              )}

                              {/* Indikator da je uređaj preuzet */}
                              {service.devicePickedUp && (
                                <div className="flex items-center">
                                  <Truck className="h-4 w-4 mr-2 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-600">
                                    Uređaj preuzet {service.pickupDate ? `(${formatDate(service.pickupDate)})` : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="flex flex-col gap-3 pt-3">
                            {/* Prva grupa - Kontakt i informacije */}
                            <div className="flex gap-2 w-full">
                              <CallClientButton 
                                phoneNumber={service.client?.phone || ""}
                                clientName={service.client?.fullName}
                                variant="secondary" 
                                size="default"
                                disabled={!service.client?.phone}
                                className="flex-1 h-10"
                              />
                              
                              {service.client?.address && (
                                <Button 
                                  variant="outline" 
                                  size="default"
                                  onClick={() => openClientLocation(service.client?.address || "", service.client?.city || null)}
                                  className="flex-1 h-10"
                                >
                                  <MapPin className="h-4 w-4 mr-1" />
                                  Mapa
                                </Button>
                              )}
                              
                              <Button 
                                variant="outline" 
                                size="default"
                                onClick={() => openFloatingService(service)}
                                className="flex-1 h-10"
                              >
                                <Package className="h-4 w-4 mr-1" />
                                Detalji
                              </Button>
                            </div>
                            
                            {/* Generali servis dopunjavanje */}
                            <div className="flex gap-2 w-full mt-2">
                              <Button 
                                variant="outline" 
                                size="default"
                                onClick={() => openSupplementGeneraliDialog(service)}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 flex-1 h-10"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Dopuni Generali podatke
                              </Button>
                            </div>

                            {/* Evidencija uklonjenih delova i rezervni delovi */}
                            {(service.status === "assigned" || service.status === "in_progress" || service.status === "scheduled") && (
                              <div className="flex gap-2 w-full mt-2">
                                <RemovedPartsForm 
                                  serviceId={service.id}
                                  technicianId={service.technicianId || 0}
                                  onSuccess={() => refetch()}
                                />
                                
                                <Button 
                                  variant="outline" 
                                  size="default"
                                  onClick={() => {
                                    console.log("🔧 DUGME KLIKNUTO! Pozivam openSparePartsOrder za servis:", service.id);
                                    openSparePartsOrder(service);
                                  }}
                                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 flex-1 h-10"
                                >
                                  <Package className="h-4 w-4 mr-1" />
                                  Poruči rezervni deo
                                </Button>
                              </div>
                            )}
                            {/* Debug: Proverava da li se dugme renderuje */}
                            {console.log("🎯 DEBUG: Za servis", service.id, "status je", service.status, "- dugme se renderuje:", (service.status === "assigned" || service.status === "in_progress" || service.status === "scheduled"))}

                            {/* Druga grupa - Status akcije */}
                            {/* Servisi sa statusom assigned, pending ili scheduled */}
                            {(service.status === "assigned" || service.status === "pending" || service.status === "scheduled") && (
                              <div className="flex flex-col gap-2 w-full">
                                <div className="flex gap-2 w-full">
                                  <Button 
                                    variant="default" 
                                    size="default"
                                    onClick={() => openStatusDialog(service, "in_progress")}
                                    className="flex-1 h-12 text-base font-medium"
                                  >
                                    <ClipboardCheck className="h-5 w-5 mr-2" />
                                    Započni servis
                                  </Button>
                                  
                                  <Button 
                                    variant="outline" 
                                    size="default"
                                    onClick={() => openStatusDialog(service, "completed")}
                                    className="flex-1 h-12 text-base font-medium bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                  >
                                    <ClipboardCheck className="h-5 w-5 mr-2" />
                                    Završi servis
                                  </Button>
                                </div>
                                
                                {/* Quick buttons for client issues */}
                                <div className="flex gap-2 w-full">
                                  <Button 
                                    variant="outline" 
                                    size="default"
                                    onClick={() => openClientUnavailableDialog(service)}
                                    className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 flex-1 h-11"
                                  >
                                    <MapPin className="h-4 w-4 mr-1" />
                                    Klijent nedostupan
                                  </Button>
                                  
                                  {!service.devicePickedUp && (
                                    <Button 
                                      variant="outline" 
                                      size="default"
                                      onClick={() => openDevicePickupDialog(service)}
                                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 flex-1 h-11"
                                    >
                                      <Truck className="h-4 w-4 mr-1" />
                                      Preuzmi uređaj
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Servisi u toku - samo dugme za završetak */}
                            {service.status === "in_progress" && (
                              <Button 
                                variant="default" 
                                size="default"
                                onClick={() => openStatusDialog(service, "completed")}
                                className="w-full h-12 text-base font-medium bg-green-600 hover:bg-green-700"
                              >
                                <ClipboardCheck className="h-5 w-5 mr-2" />
                                Završi servis
                              </Button>
                            )}
                            
                            {/* Opcija za vraćanje problematičnih servisa */}
                            {(service.status === "client_not_home" || service.status === "client_not_answering") && (
                              <Button 
                                variant="outline" 
                                size="default"
                                onClick={() => handleReturnToAdmin(service)}
                                className="w-full h-12 text-base font-medium border-red-200 text-red-700 hover:bg-red-50"
                              >
                                <AlertCircle className="h-5 w-5 mr-2" />
                                Vrati administratoru
                              </Button>
                            )}
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Status update dialog - optimizovan za mobilne uređaje */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {newStatus === "in_progress" ? "Započni servis" : 
               newStatus === "completed" ? "Završi servis" :
               newStatus === "client_not_home" ? "Klijent nije kući" :
               newStatus === "client_not_answering" ? "Klijent se ne javlja" :
               "Ažuriraj status"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-2 sm:py-4">
            <p className="mb-2 sm:mb-4 text-sm sm:text-base">
              {newStatus === "in_progress" 
                ? "Da li ste sigurni da želite da označite servis kao započet? Možete odmah uneti i podatke za završetak servisa ili sačekati da ih unesete pri završetku." 
                : newStatus === "completed"
                  ? "Da li ste sigurni da želite da označite servis kao završen? Molimo popunite sledeća polja:"
                  : newStatus === "client_not_home"
                    ? "Prijavite da klijent nije bio kući na adresi. Dodajte napomenu sa detaljima:"
                    : newStatus === "client_not_answering"
                      ? "Prijavite da se klijent ne javlja na telefon. Dodajte napomenu sa detaljima:"
                      : "Ažurirajte status servisa:"}
            </p>
            {newStatus === "in_progress" && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-3 text-blue-700 text-xs sm:text-sm">
                <p>Napomena: Polja ispod su obavezna samo pri završetku servisa. Ako samo započinjete servis, možete ih popuniti kasnije.</p>
              </div>
            )}
            
            {(newStatus === "client_not_home" || newStatus === "client_not_answering") && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-2 mb-3 text-orange-700 text-xs sm:text-sm">
                <p>Ova prijava će obavestiti administratora da klijent nije dostupan. Servis će biti označen kao privremeno zaustavljen.</p>
              </div>
            )}
            
            <div className="space-y-3 sm:space-y-4">
              <div className={`space-y-1 sm:space-y-2 ${newStatus === "in_progress" ? "border-l-4 border-l-primary pl-2" : ""}`}>
                <label htmlFor="technicianNotes" className="text-sm font-medium flex items-center">
                  Napomena servisera: <span className="text-red-500 ml-1">*</span>
                </label>
                <Textarea
                  id="technicianNotes"
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  placeholder={
                    newStatus === "in_progress" ? "Unesite napomenu o početku servisa..." :
                    newStatus === "completed" ? "Unesite napomenu o servisu i izvršenim radovima..." :
                    newStatus === "client_not_home" ? "Npr. Pozvonio sam na adresu, nema nikoga. Proverio sam sa komšijama..." :
                    newStatus === "client_not_answering" ? "Npr. Pozvao sam tri puta, telefon zvoni ali se ne javlja..." :
                    "Unesite napomenu o servisu..."
                  }
                  className="min-h-[70px] sm:min-h-[80px] text-sm sm:text-base"
                  required
                />
              </div>

              {/* Prikazujemo ostala polja samo ako nije brza prijava problema sa klijentom */}
              {(newStatus !== "client_not_home" && newStatus !== "client_not_answering") && (
                <div className="space-y-3 sm:space-y-4">
                <div className="space-y-1 sm:space-y-2">
                  <label htmlFor="usedParts" className="text-sm font-medium flex items-center justify-between">
                    <span>
                      Ugrađeni rezervni delovi: 
                      <span className={newStatus === "completed" ? "text-red-500 ml-1" : "text-gray-400 ml-1"}>
                        {newStatus === "completed" ? "*" : "(opciono)"}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedService) {
                          openSparePartsOrder(selectedService);
                        }
                      }}
                      className="flex items-center gap-1 h-8"
                    >
                      <Package className="h-3 w-3" />
                      Naruči delove
                    </Button>
                  </label>
                  <Textarea
                    id="usedParts"
                    value={usedParts}
                    onChange={(e) => setUsedParts(e.target.value)}
                    placeholder="Navedite sve delove koje ste zamenili ili ugradili..."
                    className={`min-h-[70px] sm:min-h-[80px] text-sm sm:text-base ${newStatus === "in_progress" ? "bg-gray-50" : ""}`}
                    required={newStatus === "completed"}
                  />
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  <label htmlFor="machineNotes" className="text-sm font-medium flex items-center">
                    Napomene o stanju uređaja: 
                    <span className={newStatus === "completed" ? "text-red-500 ml-1" : "text-gray-400 ml-1"}>
                      {newStatus === "completed" ? "*" : "(opciono)"}
                    </span>
                  </label>
                  <Textarea
                    id="machineNotes"
                    value={machineNotes}
                    onChange={(e) => setMachineNotes(e.target.value)}
                    placeholder="Unesite napomene o zatečenom stanju uređaja i stanju nakon servisa..."
                    className={`min-h-[70px] sm:min-h-[80px] text-sm sm:text-base ${newStatus === "in_progress" ? "bg-gray-50" : ""}`}
                    required={newStatus === "completed"}
                  />
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  <label htmlFor="cost" className="text-sm font-medium flex items-center">
                    Cena servisa (€): 
                    <span className={newStatus === "completed" ? "text-red-500 ml-1" : "text-gray-400 ml-1"}>
                      {newStatus === "completed" ? "*" : "(opciono)"}
                    </span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    id="cost"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="Unesite iznos naplate..."
                    className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:text-base ${newStatus === "in_progress" ? "bg-gray-50" : ""}`}
                    required={newStatus === "completed"}
                  />
                </div>
                
                <div className={`flex items-center space-x-2 border p-2 sm:p-3 rounded-md border-input ${newStatus === "in_progress" ? "bg-gray-50" : ""}`}>
                  <input 
                    type="checkbox" 
                    id="isCompletelyFixed"
                    checked={isCompletelyFixed}
                    onChange={(e) => setIsCompletelyFixed(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="isCompletelyFixed" className="text-sm font-medium flex items-center">
                    Servis je uspešno završen i uređaj radi ispravno
                    <span className={newStatus === "completed" ? "text-red-500 ml-1" : "text-gray-400 ml-1"}>
                      {newStatus === "completed" ? "*" : "(opciono)"}
                    </span>
                  </label>
                </div>

                {newStatus === "completed" && (
                  <div className="space-y-3 border p-3 sm:p-4 rounded-md border-orange-200 bg-orange-50">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                      <label className="text-sm font-semibold text-orange-800">
                        Status garancije
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <input 
                          type="radio" 
                          id="warranty_in"
                          name="warrantyStatus"
                          value="in_warranty"
                          checked={warrantyStatus === "in_warranty"}
                          onChange={(e) => setWarrantyStatus(e.target.value)}
                          className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                        />
                        <label htmlFor="warranty_in" className="text-sm font-medium text-green-700 flex items-center">
                          <span className="mr-2">🛡️</span>
                          U garanciji - garanciski uslovi
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input 
                          type="radio" 
                          id="warranty_out"
                          name="warrantyStatus"
                          value="out_of_warranty"
                          checked={warrantyStatus === "out_of_warranty"}
                          onChange={(e) => setWarrantyStatus(e.target.value)}
                          className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                        />
                        <label htmlFor="warranty_out" className="text-sm font-medium text-red-700 flex items-center">
                          <span className="mr-2">💰</span>
                          Van garancije - naplatiti servis
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setStatusDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Otkaži
            </Button>
            <Button 
              onClick={handleStatusChange}
              disabled={updateStatusMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateStatusMutation.isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-background rounded-full"></div>
                  Učitavanje...
                </>
              ) : (
                "Potvrdi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plutajući prozor za detalje servisa */}
      <ServiceDetailsFloat
        isOpen={floatingServiceOpen}
        onClose={() => setFloatingServiceOpen(false)}
        service={floatingSelectedService}
        onStatusUpdate={handleFloatingStatusUpdate}
        getStatusBadge={getStatusBadge}
      />

      {/* Plutajući prozor za brze akcije */}
      <QuickActionsFloat
        isOpen={quickActionsOpen}
        onClose={() => setQuickActionsOpen(false)}
        services={selectedCity === "Svi gradovi" ? filteredServices : groupedServices[selectedCity] || []}
        onServiceSelect={openFloatingService}
        onStatusUpdate={handleQuickStatusUpdate}
        getStatusBadge={getStatusBadge}
        activeCity={selectedCity}
      />

      {/* Dialog za označavanje klijenta kao nedostupnog */}
      <Dialog open={clientUnavailableDialogOpen} onOpenChange={setClientUnavailableDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Klijent nedostupan</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Razlog nedostupnosti:</Label>
              <Textarea
                value={unavailableReason}
                onChange={(e) => setUnavailableReason(e.target.value)}
                placeholder="Opišite razlog zašto klijent nije dostupan..."
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Napomene za ponovno zakazivanje:</Label>
              <Textarea
                value={reschedulingNotes}
                onChange={(e) => setReschedulingNotes(e.target.value)}
                placeholder="Dodatne napomene za administratora o ponovnom zakazivanju..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setClientUnavailableDialogOpen(false)}
              className="flex-1"
            >
              Otkaži
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleClientUnavailable("client_not_home")}
              disabled={!unavailableReason.trim()}
              className="flex-1"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Nije kući
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleClientUnavailable("client_not_answering")}
              disabled={!unavailableReason.trim()}
              className="flex-1"
            >
              <Phone className="h-4 w-4 mr-2" />
              Ne javlja se
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog za preuzimanje uređaja */}
      <Dialog open={devicePickupDialogOpen} onOpenChange={setDevicePickupDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preuzimanje uređaja</DialogTitle>
          </DialogHeader>
          
          <div className="py-2 sm:py-4">
            <p className="mb-4 text-sm sm:text-base text-gray-700">
              Označite da je uređaj preuzet za popravku. Ovo će omogućiti lakše praćenje stanja servisa.
            </p>
            
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Klijent:</strong> {selectedService?.client?.fullName}<br />
                <strong>Uređaj:</strong> {selectedService?.appliance?.category?.name} {selectedService?.appliance?.model}<br />
                <strong>Problem:</strong> {selectedService?.description}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="pickup-notes" className="text-sm font-medium">
                  Napomene o preuzimanju (opciono)
                </Label>
                <Textarea
                  id="pickup-notes"
                  placeholder="Opišite stanje uređaja, kako je preuzet, ili bilo koje druge važne napomene..."
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  className="mt-1 text-sm resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setDevicePickupDialogOpen(false)}
              className="flex-1"
            >
              Otkaži
            </Button>
            <Button 
              variant="default" 
              onClick={handleDevicePickup}
              className="flex-1"
            >
              <Truck className="h-4 w-4 mr-2" />
              Potvrdi preuzimanje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog za naručivanje rezervnih delova */}
      {sparePartsService && (
        <SparePartsOrderForm
          isOpen={sparePartsOrderOpen}
          onClose={() => {
            setSparePartsOrderOpen(false);
            setSparePartsService(null);
          }}
          serviceId={sparePartsService.id}
          clientName={sparePartsService.client?.fullName || ""}
          applianceModel={sparePartsService.appliance?.model || ""}
          applianceManufacturer={sparePartsService.appliance?.manufacturer?.name || ""}
          applianceCategory={sparePartsService.appliance?.category?.name || ""}
          technicianId={sparePartsService.technicianId || 0}
        />
      )}

      {/* Dialog za dopunjavanje Generali servisa */}
      {supplementGeneraliService && (
        <SupplementGeneraliFormSimple
          isOpen={supplementGeneraliOpen}
          onClose={() => {
            setSupplementGeneraliOpen(false);
            setSupplementGeneraliService(null);
          }}
          serviceId={supplementGeneraliService.id}
          serviceName={`Servis #${supplementGeneraliService.id}`}
          currentClientEmail={supplementGeneraliService.client?.email}
          currentClientAddress={supplementGeneraliService.client?.address}
          currentClientCity={supplementGeneraliService.client?.city}
          currentSerialNumber={supplementGeneraliService.appliance?.serialNumber}
          currentModel={supplementGeneraliService.appliance?.model}
          currentPurchaseDate={supplementGeneraliService.appliance?.purchaseDate}
          manufacturerName={supplementGeneraliService.appliance?.manufacturer?.name}
          onSuccess={() => {
            refetch();
          }}
        />
      )}


    </div>
  );
}