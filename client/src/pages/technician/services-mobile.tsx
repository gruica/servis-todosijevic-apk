import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Service, ServiceStatus } from "@shared/schema";
import { useMobile, useMobileEnvironment } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import MobileAppLayout from "@/components/mobile/MobileAppLayout";
import MobileServiceManager from "@/components/mobile/MobileServiceManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Phone, ClipboardCheck, Clock, Calendar, Package, ClipboardList, LogOut, User, MapPin, Camera, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { TechnicianProfileWidget } from "@/components/technician/profile-widget";
import { CallClientButton } from "@/components/ui/call-client-button";
import { callPhoneNumber, openMapWithAddress } from "@/lib/mobile-utils";
import { ApplianceLabelScanner } from "@/components/technician/ApplianceLabelScanner";

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

export default function TechnicianServicesMobile() {
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  const isMobile = useMobile();
  const isMobileDevice = useMobileEnvironment();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("active");
  const [selectedService, setSelectedService] = useState<TechnicianService | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ServiceStatus | null>(null);
  const [technicianNotes, setTechnicianNotes] = useState<string>("");
  const [usedParts, setUsedParts] = useState<string>("");
  const [machineNotes, setMachineNotes] = useState<string>("");
  const [cost, setCost] = useState<string>("");
  const [isCompletelyFixed, setIsCompletelyFixed] = useState<boolean>(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedServiceForScanner, setSelectedServiceForScanner] = useState<TechnicianService | null>(null);

  // Handler funkcija za prepoznavanje nalepnica
  const handleApplianceScanned = (data: { 
    model?: string; 
    serialNumber?: string; 
    manufacturer?: string; 
    confidence: number; 
    rawText?: string; 
  }) => {
    if (!selectedServiceForScanner) return;
    
    toast({
      title: "Podaci prepoznati",
      description: `Model: ${data.model || 'Nije prepoznat'}, Serijski broj: ${data.serialNumber || 'Nije prepoznat'}`,
      variant: "default"
    });
    
    console.log("Prepoznati podaci:", data);
    
    setScannerOpen(false);
    setSelectedServiceForScanner(null);
  };

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
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
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
      const res = await apiRequest("PUT", `/api/services/${serviceId}/status`, { 
        status, 
        technicianNotes: notes,
        usedParts,
        machineNotes,
        cost,
        isCompletelyFixed
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
      
      if (isMobileDevice) {
        console.log("Mobilni korisnik: status servisa uspešno ažuriran");
      } else {
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
        
        setStatusDialogOpen(false);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri ažuriranju statusa",
        description: error.message,
        variant: "destructive",
      });
      
      if (!isMobileDevice && statusDialogOpen) {
        setStatusDialogOpen(false);
      }
    },
  });

  // Funkcija za ažuriranje servisa
  const handleUpdateService = (serviceId: number, updates: any) => {
    updateStatusMutation.mutate({
      serviceId,
      status: updates.status,
      notes: updates.technicianNotes,
      usedParts: updates.usedParts,
      machineNotes: updates.machineNotes,
      cost: updates.cost,
      isCompletelyFixed: updates.isCompletelyFixed
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Mobilni interfejs - uvek koristiti za mobilne uređaje
  if (isMobile || isMobileDevice) {
    return (
      <MobileAppLayout
        title="Moji servisi"
        rightAction={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
        floatingActionButton={
          <Button
            size="sm"
            onClick={() => setScannerOpen(true)}
            className="rounded-full w-12 h-12"
          >
            <Camera className="h-5 w-5" />
          </Button>
        }
      >
        <MobileServiceManager
          services={services}
          onUpdateService={handleUpdateService}
          userRole="technician"
          onRefresh={refetch}
        />
        
        {/* Appliance Label Scanner */}
        <ApplianceLabelScanner 
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onDataScanned={handleApplianceScanned}
          title="Skeniraj nalepnicu uređaja"
        />
      </MobileAppLayout>
    );
  }

  // Desktop interfejs - samo za desktop
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        closeMobileMenu={() => setSidebarOpen(false)} 
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Moji servisi</h1>
                <p className="text-gray-600">Pregled i upravljanje dodeljenim servisima</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Osveži
                </Button>
                <TechnicianProfileWidget />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Servisi</CardTitle>
                <CardDescription>
                  Pregled svih dodeljenih servisa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {services.map((service) => (
                    <Card key={service.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            {service.client?.fullName || 'Nepoznat klijent'}
                          </CardTitle>
                          <Badge variant="outline">
                            Servis #{service.id}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-2">
                          {service.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>📅 {formatDate(service.createdAt)}</span>
                          {service.client?.phone && (
                            <span>📞 {service.client.phone}</span>
                          )}
                          {service.client?.address && (
                            <span>📍 {service.client.address}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      
      {/* Appliance Label Scanner */}
      <ApplianceLabelScanner 
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDataScanned={handleApplianceScanned}
        title="Skeniraj nalepnicu uređaja"
      />
    </div>
  );
}