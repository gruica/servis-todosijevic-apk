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
import { Phone, ClipboardCheck, Clock, Calendar, Package, ClipboardList, LogOut, User, MapPin } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { TechnicianProfileWidget } from "@/components/technician/profile-widget";
import { CallClientButton } from "@/components/ui/call-client-button";
import { ServiceDetailsFloat } from "@/components/technician/service-details-float";
import { QuickActionsFloat } from "@/components/technician/quick-actions-float";
import { callPhoneNumber, openMapWithAddress, isMobileEnvironment } from "@/lib/mobile-utils";

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
};

export default function TechnicianServices() {
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  // Uvek proveriti mobilno okruženje (mobile web i APK)
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
  
  // State za plutajuće prozore
  const [floatingServiceOpen, setFloatingServiceOpen] = useState(false);
  const [floatingSelectedService, setFloatingSelectedService] = useState<TechnicianService | null>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("Svi gradovi");

  // Fetch services assigned to the logged-in technician
  const { data: services = [], isLoading, refetch } = useQuery<TechnicianService[]>({
    queryKey: ["/api/my-services"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/my-services", { signal });
      if (!response.ok) {
        throw new Error("Greška pri dobijanju servisa");
      }
      return response.json();
    },
    // Obavezno osvežavaj podatke svakih 10 sekundi
    refetchInterval: 10000,
    // Omogući osvežavanje podataka i kada browser nije u fokusu
    refetchIntervalInBackground: true,
    // Smanji staleTime da bi podaci bili ažurniji
    staleTime: 5000,
  });

  // Mutation for updating service status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      serviceId, 
      status, 
      notes, 
      usedParts, 
      machineNotes, 
      cost, 
      isCompletelyFixed 
    }: { 
      serviceId: number; 
      status: string; 
      notes: string;
      usedParts?: string;
      machineNotes?: string;
      cost?: string;
      isCompletelyFixed?: boolean;
    }) => {
      console.log(`[MUTATION] Pozivam API za servis ${serviceId} sa statusom: ${status}`);
      
      const res = await apiRequest("PUT", `/api/services/${serviceId}/status`, { 
        status, 
        technicianNotes: notes,
        usedParts,
        machineNotes,
        cost,
        isCompletelyFixed
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
      isCompletelyFixed: isCompletelyFixed
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
    
    setStatusDialogOpen(true);
  };

  // Filter services based on active tab
  const filteredServices = services.filter((service) => {
    if (activeTab === "active") {
      return service.status === "pending" || service.status === "scheduled" || service.status === "in_progress";
    } else if (activeTab === "completed") {
      return service.status === "completed";
    } else {
      return service.status === "waiting_parts" || service.status === "cancelled" || 
             service.status === "client_not_home" || service.status === "client_not_answering";
    }
  });

  // Group services by city for better organization
  const groupedServices = filteredServices.reduce((groups, service) => {
    const city = service.client?.city || "Nepoznat grad";
    if (!groups[city]) {
      groups[city] = [];
    }
    groups[city].push(service);
    return groups;
  }, {} as Record<string, TechnicianService[]>);

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
    await updateStatusMutation.mutateAsync({
      serviceId,
      status,
      notes: data.technicianNotes,
      usedParts: data.usedParts,
      machineNotes: data.machineNotes,
      cost: data.cost?.toString(),
      isCompletelyFixed: true
    });
    setFloatingServiceOpen(false);
  };

  // Funkcija za otvaranje brzih akcija
  const openQuickActions = (city: string = "Svi gradovi") => {
    setSelectedCity(city);
    setQuickActionsOpen(true);
  };

  // Funkcija za brzu promenu statusa
  const handleQuickStatusUpdate = async (serviceId: number, status: string) => {
    await updateStatusMutation.mutateAsync({
      serviceId,
      status,
      notes: `Brza akcija: ${status === "in_progress" ? "Započet" : "Završen"} servis`,
      usedParts: "",
      machineNotes: "",
      cost: "",
      isCompletelyFixed: status === "completed"
    });
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

      <Tabs defaultValue="active" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="active">Aktivni</TabsTrigger>
          <TabsTrigger value="completed">Završeni</TabsTrigger>
          <TabsTrigger value="other">Ostalo</TabsTrigger>
        </TabsList>

        {["active", "completed", "other"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {filteredServices.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500">Nema servisa u ovoj kategoriji</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-220px)]">
                <div className="space-y-6 pr-4">
                  {sortedCities.map((city) => (
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
                        <Card key={service.id} className="overflow-hidden">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">
                                  {service.client?.fullName}
                                </CardTitle>
                                <CardDescription>
                                  {service.appliance?.category?.name} {service.appliance?.model}
                                </CardDescription>
                              </div>
                              <div>{getStatusBadge(service.status)}</div>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <ClipboardList className="h-4 w-4 mr-2 opacity-70" />
                                <span className="text-sm">{service.description}</span>
                              </div>
                              {service.client?.address && (
                                <div className="flex items-center">
                                  <Package className="h-4 w-4 mr-2 opacity-70" />
                                  <span className="text-sm">{service.client.address}, {service.client.city}</span>
                                </div>
                              )}
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 opacity-70" />
                                <span className="text-sm">Kreiran: {formatDate(service.createdAt)}</span>
                              </div>
                              {service.scheduledDate && (
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2 opacity-70" />
                                  <span className="text-sm">Zakazan: {formatDate(service.scheduledDate)}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="flex justify-between pt-2">
                            <div className="flex gap-2">
                              <CallClientButton 
                                phoneNumber={service.client?.phone || ""}
                                clientName={service.client?.fullName}
                                variant="secondary" 
                                size="sm"
                                disabled={!service.client?.phone}
                              />
                              
                              {service.client?.address && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openClientLocation(service.client?.address || "", service.client?.city || null)}
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Mapa
                                </Button>
                              )}
                              
                              {/* Plutajući prozor dugme */}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openFloatingService(service)}
                              >
                                <Package className="h-4 w-4 mr-2" />
                                Detalji
                              </Button>
                            </div>

                            <div className="flex gap-2">
                              {(service.status === "pending" || service.status === "scheduled") && (
                                <>
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={() => openStatusDialog(service, "in_progress")}
                                  >
                                    <ClipboardCheck className="h-4 w-4 mr-2" />
                                    Započni servis
                                  </Button>
                                  
                                  {/* Quick buttons for client issues */}
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => openStatusDialog(service, "client_not_home")}
                                    className="bg-orange-50 hover:bg-orange-100 text-orange-700"
                                  >
                                    Nije kući
                                  </Button>
                                  
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => openStatusDialog(service, "client_not_answering")}
                                    className="bg-red-50 hover:bg-red-100 text-red-700"
                                  >
                                    Ne javlja se
                                  </Button>
                                </>
                              )}
                              
                              {service.status === "in_progress" && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => openStatusDialog(service, "completed")}
                                >
                                  <ClipboardCheck className="h-4 w-4 mr-2" />
                                  Završi servis
                                </Button>
                              )}
                            </div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ))}
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
                  <label htmlFor="usedParts" className="text-sm font-medium flex items-center">
                    Ugrađeni rezervni delovi: 
                    <span className={newStatus === "completed" ? "text-red-500 ml-1" : "text-gray-400 ml-1"}>
                      {newStatus === "completed" ? "*" : "(opciono)"}
                    </span>
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
    </div>
  );
}