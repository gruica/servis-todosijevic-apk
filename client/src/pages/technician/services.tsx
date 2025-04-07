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
import { Phone, ClipboardCheck, Clock, Calendar, Package, ClipboardList, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { TechnicianProfileWidget } from "@/components/technician/profile-widget";

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
  const [activeTab, setActiveTab] = useState<string>("active");
  const [selectedService, setSelectedService] = useState<TechnicianService | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ServiceStatus | null>(null);
  const [technicianNotes, setTechnicianNotes] = useState<string>("");

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
    mutationFn: async ({ serviceId, status, notes }: { serviceId: number; status: string; notes: string }) => {
      const res = await apiRequest("PUT", `/api/services/${serviceId}/status`, { status, technicianNotes: notes });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
      toast({
        title: "Status uspješno ažuriran",
        description: "Status servisa je uspješno promijenjen.",
      });
      setStatusDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri ažuriranju statusa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = () => {
    if (!selectedService || !newStatus) return;
    
    updateStatusMutation.mutate({
      serviceId: selectedService.id,
      status: newStatus,
      notes: technicianNotes,
    });
  };

  const openStatusDialog = (service: TechnicianService, status: ServiceStatus) => {
    setSelectedService(service);
    setNewStatus(status);
    setTechnicianNotes(service.technicianNotes || "");
    setStatusDialogOpen(true);
  };

  // Filter services based on active tab
  const filteredServices = services.filter((service) => {
    if (activeTab === "active") {
      return service.status === "pending" || service.status === "scheduled" || service.status === "in_progress";
    } else if (activeTab === "completed") {
      return service.status === "completed";
    } else {
      return service.status === "waiting_parts" || service.status === "cancelled";
    }
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  // Function to call client
  const callClient = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
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
                <div className="space-y-4 pr-4">
                  {filteredServices.map((service) => (
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
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => callClient(service.client?.phone || "")}
                          disabled={!service.client?.phone}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Pozovi klijenta
                        </Button>

                        {(service.status === "pending" || service.status === "scheduled") && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => openStatusDialog(service, "in_progress")}
                          >
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            Započni servis
                          </Button>
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
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Status update dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newStatus === "in_progress" ? "Započni servis" : "Završi servis"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-4">
              {newStatus === "in_progress" 
                ? "Da li ste sigurni da želite da označite servis kao započet?" 
                : "Da li ste sigurni da želite da označite servis kao završen?"}
            </p>
            
            <div className="space-y-2">
              <label htmlFor="technicianNotes" className="text-sm font-medium">
                Napomena servisera:
              </label>
              <Textarea
                id="technicianNotes"
                value={technicianNotes}
                onChange={(e) => setTechnicianNotes(e.target.value)}
                placeholder="Unesite napomenu o servisu..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Otkaži
            </Button>
            <Button 
              onClick={handleStatusChange}
              disabled={updateStatusMutation.isPending}
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
    </div>
  );
}