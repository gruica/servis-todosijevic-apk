import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, 
  MapPin, 
  Phone, 
  Package, 
  User, 
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Home,
  Bell,
  Play,
  Menu,
  X,
  LogOut,
  Settings,
  HelpCircle,
  UserX,
  Pause,
  PhoneOff
} from "lucide-react";
import { formatDate } from "@/lib/utils";
// TEMPORARILY DISABLED: import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SupplementGeneraliFormSimple } from "@/components/technician/supplement-generali-form-simple";

// Status ikone
import serviceTodoIcon from "@assets/generated_images/Servis_u_toku_ikona_7f9b93dc.png";
import serviceCompletedIcon from "@assets/generated_images/Završen_servis_ikona_82f0a1f3.png";
import servicePendingIcon from "@assets/generated_images/Čekanje_servis_ikona_6517986d.png";
import servicePartsIcon from "@assets/generated_images/Delovi_potrebni_ikona_168b4888.png";

// Service status map sa ikonama
const statusConfig = {
  pending: { color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50", label: "Na čekanju", icon: servicePendingIcon },
  assigned: { color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50", label: "Dodeljen", icon: servicePendingIcon },
  in_progress: { color: "bg-orange-500", textColor: "text-orange-700", bgColor: "bg-orange-50", label: "U toku", icon: serviceTodoIcon },
  scheduled: { color: "bg-purple-500", textColor: "text-purple-700", bgColor: "bg-purple-50", label: "Zakazan", icon: servicePendingIcon },
  completed: { color: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50", label: "Završen", icon: serviceCompletedIcon },
  cancelled: { color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50", label: "Otkazan", icon: XCircle },
  waiting_parts: { color: "bg-amber-500", textColor: "text-amber-700", bgColor: "bg-amber-50", label: "Čeka delove", icon: servicePartsIcon },
  client_not_home: { color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50", label: "Klijent nije kod kuće", icon: servicePendingIcon },
  client_not_answering: { color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50", label: "Klijent se ne javlja", icon: servicePendingIcon },
  customer_refused_repair: { color: "bg-gray-500", textColor: "text-gray-700", bgColor: "bg-gray-50", label: "Odbio servis", icon: UserX }
};

interface Service {
  id: number;
  description: string;
  status: keyof typeof statusConfig;
  createdAt: string;
  scheduledDate?: string;
  cost?: string;
  technicianNotes?: string;
  client?: {
    fullName: string;
    phone?: string;
    address?: string;
    city?: string;
    email?: string;
  };
  appliance?: {
    category?: { name: string };
    manufacturer?: { name: string };
    model?: string;
    serialNumber?: string;
  };
}

function ServiceCard({ service }: { service: Service }) {
  const statusInfo = statusConfig[service.status];
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // OPTIMIZED: Lightning-fast service start mutation
  const startWorkMutation = useMutation({
    mutationFn: (serviceId: number) => {
      const startTime = Date.now();
      // Ultra-fast service start initiated
      
      return apiRequest(`/api/services/${serviceId}/quick-start`, {
        method: 'PUT',
        body: JSON.stringify({ 
          technicianNotes: `Servis započet ${new Date().toLocaleString('sr-RS')}`
        })
      }).then(response => {
        const endTime = Date.now();
        const frontendDuration = endTime - startTime;
        // Service started successfully
        return response;
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-services'] });
      toast({
        title: "Rad započet ⚡",
        description: data._performance ? 
          `Status promenjen za ${data._performance.duration} (optimizovano)` : 
          "Status servisa promenjen na 'U toku'",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: "Greška pri pokretanju servisa",
        variant: "destructive"
      });
    }
  });

  const requestPartsMutation = useMutation({
    mutationFn: (serviceId: number) => 
      apiRequest(`/api/services/${serviceId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'waiting_parts' })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-services'] });
      toast({
        title: "Zahtev za delove poslat",
        description: "Administrator je obavešten o potrebnim rezervnim delovima",
      });
    }
  });

  const completeServiceMutation = useMutation({
    mutationFn: (serviceId: number) => 
      apiRequest(`/api/services/${serviceId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-services'] });
      toast({
        title: "Servis završen",
        description: "Klijent će biti obavešten o završetku servisa",
      });
    }
  });

  const partsReceivedMutation = useMutation({
    mutationFn: (serviceId: number) => 
      apiRequest(`/api/services/${serviceId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'in_progress' })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-services'] });
      toast({
        title: "Rad nastavljen",
        description: "Status servisa vraćen na 'U toku' - nastavi sa popravkom",
      });
    }
  });

  // New mutations for customer interactions
  const customerRefusalMutation = useMutation({
    mutationFn: ({ serviceId, reason }: { serviceId: number; reason: string }) => 
      apiRequest(`/api/services/${serviceId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: 'customer_refused_repair',
          customerRefusalReason: reason
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-services'] });
      toast({
        title: "Servis zatvorjen",
        description: "Klijent je obavešten o odbijanju servisa",
      });
    }
  });

  const customerUnavailableMutation = useMutation({
    mutationFn: ({ serviceId, reason }: { serviceId: number; reason: string }) => 
      apiRequest(`/api/services/${serviceId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: reason === 'not_home' ? 'client_not_home' : 'client_not_answering',
          clientUnavailableReason: reason
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-services'] });
      toast({
        title: "SMS poslat",
        description: "Klijent je obavešten SMS porukom o reschedule",
      });
    }
  });

  const returnDeviceMutation = useMutation({
    mutationFn: ({ serviceId, returnNotes }: { serviceId: number; returnNotes: string }) => 
      apiRequest(`/api/services/${serviceId}/return-device`, {
        method: 'POST',
        body: JSON.stringify({ returnNotes })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-services'] });
      toast({
        title: "Aparat vraćen",
        description: "Aparat je uspešno vraćen klijentu",
      });
      setShowReturnDeviceDialog(false);
      setReturnNotes('');
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: "Greška pri vraćanju aparata",
        variant: "destructive"
      });
    }
  });

  // Dialog state management
  const [showRefusalDialog, setShowRefusalDialog] = useState(false);
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);
  const [showSparePartsDialog, setShowSparePartsDialog] = useState(false);
  const [showGeneraliDialog, setShowGeneraliDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [showReturnDeviceDialog, setShowReturnDeviceDialog] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');
  const [unavailableReason, setUnavailableReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [sparePartsData, setSparePartsData] = useState({
    partName: '',
    catalogNumber: '',
    urgency: 'normal' as 'normal' | 'high' | 'urgent',
    description: ''
  });
  
  // Service completion form data
  const [completionData, setCompletionData] = useState({
    technicianNotes: '',
    workPerformed: '',
    usedParts: '',
    machineNotes: '',
    cost: '',
    warrantyInfo: '',
    clientSignature: false,
    workQuality: 5,
    clientSatisfaction: 5,
    isWarrantyService: false
  });

  // Handler functions
  const handleStartWork = (serviceId: number) => {
    startWorkMutation.mutate(serviceId);
  };

  const handleRequestParts = (serviceId: number) => {
    setShowSparePartsDialog(true);
  };

  const handleCompleteService = (serviceId: number) => {
    // Opening service completion dialog
    setShowCompletionDialog(true);
  };

  const handlePartsReceived = (serviceId: number) => {
    partsReceivedMutation.mutate(serviceId);
  };

  const handleCustomerRefusal = () => {
    setShowRefusalDialog(true);
  };

  const handleCustomerUnavailable = () => {
    setShowUnavailableDialog(true);
  };

  const handleGeneraliSupplement = () => {
    setShowGeneraliDialog(true);
  };

  const handleReturnDevice = () => {
    setShowReturnDeviceDialog(true);
  };

  const submitCustomerRefusal = () => {
    if (refusalReason.trim()) {
      customerRefusalMutation.mutate({ serviceId: service.id, reason: refusalReason });
      setShowRefusalDialog(false);
      setRefusalReason('');
    }
  };

  const submitCustomerUnavailable = () => {
    if (unavailableReason) {
      customerUnavailableMutation.mutate({ serviceId: service.id, reason: unavailableReason });
      setShowUnavailableDialog(false);
      setUnavailableReason('');
    }
  };

  const submitSparePartsRequest = () => {
    if (sparePartsData.partName.trim() && sparePartsData.catalogNumber.trim()) {
      // Call spare parts API endpoint
      apiRequest(`/api/services/${service.id}/spare-parts`, {
        method: 'POST',
        body: JSON.stringify(sparePartsData)
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/my-services'] });
        toast({
          title: "Rezervni deo naručen",
          description: "Administrator je obavešten o potrebnom rezervnom delu",
        });
        setShowSparePartsDialog(false);
        setSparePartsData({
          partName: '',
          catalogNumber: '',
          urgency: 'normal',
          description: ''
        });
      }).catch((error) => {
        toast({
          title: "Greška",
          description: "Greška pri naručivanju rezervnog dela",
          variant: "destructive"
        });
      });
    }
  };

  const submitServiceCompletion = () => {
    if (!completionData.technicianNotes.trim() || !completionData.workPerformed.trim()) {
      toast({
        title: "Greška",
        description: "Molimo unesite napomenu servisera i opis izvršenog rada",
        variant: "destructive"
      });
      return;
    }

    // Sending completion data
    
    // Call the service completion API with all the data
    apiRequest(`/api/services/${service.id}/complete`, {
      method: 'POST',
      body: JSON.stringify(completionData)
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-services'] });
      toast({
        title: "Servis završen",
        description: "Servis je uspešno završen sa kompletnom dokumentacijom",
      });
      setShowCompletionDialog(false);
      // Resetuj completion data
      setCompletionData({
        technicianNotes: '',
        workPerformed: '',
        usedParts: '',
        machineNotes: '',
        cost: '',
        warrantyInfo: '',
        clientSignature: false,
        workQuality: 5,
        clientSatisfaction: 5,
        isWarrantyService: false
      });
    }).catch((error) => {
      // Completion error handled by toast
      toast({
        title: "Greška",
        description: "Greška pri završavanju servisa",
        variant: "destructive"
      });
    });
  };

  const submitReturnDevice = () => {
    if (!returnNotes.trim()) {
      toast({
        title: "Greška",
        description: "Molimo unesite napomenu o vraćanju aparata",
        variant: "destructive"
      });
      return;
    }

    returnDeviceMutation.mutate({ serviceId: service.id, returnNotes });
  };
  
  const handleCallClient = () => {
    if (service.client?.phone) {
      window.open(`tel:${service.client.phone}`);
    }
  };
  
  const handleOpenLocation = () => {
    if (service.client?.address) {
      const query = encodeURIComponent(`${service.client.address}${service.client.city ? `, ${service.client.city}` : ''}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };
  
  return (
    <Card className="w-full shadow-lg border-0 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
            <span className="font-semibold text-lg">Servis #{service.id}</span>
          </div>
          <Badge className={`${statusInfo.bgColor} ${statusInfo.textColor} border-0 px-3 py-1 flex items-center gap-2`}>
            {statusInfo.icon && (
              typeof statusInfo.icon === 'string' ? (
                <img src={statusInfo.icon} alt="" className="w-4 h-4" />
              ) : (
                <statusInfo.icon className="w-4 h-4" />
              )
            )}
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Client Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{service.client?.fullName || 'Nepoznat klijent'}</span>
          </div>
          
          {service.client?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">{service.client.phone}</span>
            </div>
          )}
          
          {service.client?.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-600" />
              <span className="text-sm text-gray-600">
                {service.client.address}{service.client.city ? `, ${service.client.city}` : ''}
              </span>
            </div>
          )}
        </div>
        
        {/* Appliance Information */}
        {service.appliance && (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-600" />
            <span className="text-sm">
              {service.appliance.manufacturer?.name} {service.appliance.category?.name}
              {service.appliance.model && ` - ${service.appliance.model}`}
            </span>
          </div>
        )}
        
        {/* Service Description */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-700">{service.description}</p>
        </div>
        
        {/* Service Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Kreiran: {formatDate(service.createdAt)}</span>
          </div>
          
          {service.scheduledDate && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-600">Zakazan: {formatDate(service.scheduledDate)}</span>
            </div>
          )}
          
          {service.cost && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Cena: {service.cost}€</span>
            </div>
          )}
        </div>
        
        {/* Contact Buttons */}
        <div className="flex gap-2 mt-4">
          {service.client?.phone && (
            <Button 
              onClick={handleCallClient}
              className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              <Phone className="h-4 w-4 mr-2" />
              Pozovi
            </Button>
          )}
          
          {service.client?.address && (
            <Button 
              onClick={handleOpenLocation}
              variant="outline"
              className="flex-1 h-12 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Mapa
            </Button>
          )}
        </div>

        {/* Professional Service Actions */}
        <div className="mt-4 space-y-2">
          {/* Start Work Action - Available for pending, scheduled, assigned */}
          {(service.status === 'pending' || service.status === 'scheduled' || service.status === 'assigned') && (
            <Button 
              onClick={() => handleStartWork(service.id)}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <Play className="h-4 w-4 mr-2" />
              Počni rad na servisu
            </Button>
          )}

          {/* In Progress Actions - Available for in_progress and also for pending/scheduled/assigned */}
          {(service.status === 'in_progress' || service.status === 'pending' || service.status === 'scheduled' || service.status === 'assigned') && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => handleRequestParts(service.id)}
                  variant="outline"
                  className="h-12 border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <Package className="h-4 w-4 mr-1" />
                  Poruči deo
                </Button>
                <Button 
                  onClick={handleCustomerUnavailable}
                  variant="outline"
                  className="h-12 border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                >
                  <PhoneOff className="h-4 w-4 mr-1" />
                  Nedostupan
                </Button>
              </div>
              
              {/* Generali Data Supplement Button */}
              <Button 
                onClick={handleGeneraliSupplement}
                variant="outline"
                className="w-full h-12 border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Dopuni Generali podatke
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleCustomerRefusal}
                  variant="outline"
                  className="h-12 border-red-200 text-red-700 hover:bg-red-50"
                >
                  <UserX className="h-4 w-4 mr-1" />
                  Odbija servis
                </Button>
                <Button 
                  onClick={() => handleCompleteService(service.id)}
                  className="h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Završi
                </Button>
              </div>
            </>
          )}

          {/* Waiting for Parts Actions */}
          {service.status === 'waiting_parts' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Čekaju se rezervni delovi</span>
              </div>
              <Button 
                onClick={() => handlePartsReceived(service.id)}
                variant="outline"
                className="w-full h-10 border-green-200 text-green-700 hover:bg-green-50"
              >
                <Package className="h-4 w-4 mr-2" />
                Delovi stigli - nastavi rad
              </Button>
            </div>
          )}

          {/* Return Device for Completed Services */}
          {service.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Servis završen</span>
              </div>
              <Button 
                onClick={handleReturnDevice}
                variant="outline"
                className="w-full h-10 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Home className="h-4 w-4 mr-2" />
                Vrati aparat klijentu
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Generali Supplement Dialog */}
      <SupplementGeneraliFormSimple
        serviceId={service.id}
        serviceName={`Servis #${service.id}`}
        currentClientEmail={service.client?.email || null}
        currentClientAddress={service.client?.address || null}
        currentClientCity={service.client?.city || null}
        currentSerialNumber={service.appliance?.serialNumber || null}
        currentModel={service.appliance?.model || null}
        manufacturerName={service.appliance?.manufacturer?.name || null}
        isOpen={showGeneraliDialog}
        onClose={() => setShowGeneraliDialog(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/my-services'] });
          setShowGeneraliDialog(false);
        }}
      />
      
      {/* Customer Refusal Dialog */}
      <Dialog open={showRefusalDialog} onOpenChange={setShowRefusalDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Klijent odbija servis</DialogTitle>
            <DialogDescription>
              Unesite razlog zbog kog klijent odbija popravku aparata
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="refusal-reason">Razlog odbijanja</Label>
              <Textarea
                id="refusal-reason"
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                placeholder="Opišite razlog zbog kog klijent odbija popravku..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRefusalDialog(false)}
                className="flex-1"
              >
                Otkaži
              </Button>
              <Button
                onClick={submitCustomerRefusal}
                disabled={!refusalReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Potvrdi odbijanje
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Unavailable Dialog */}
      <Dialog open={showUnavailableDialog} onOpenChange={setShowUnavailableDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Klijent nedostupan</DialogTitle>
            <DialogDescription>
              Izaberite razlog zašto klijent nije dostupan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Razlog nedostupnosti</Label>
              <Select value={unavailableReason} onValueChange={setUnavailableReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Izaberite razlog..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_home">Nije kod kuće</SelectItem>
                  <SelectItem value="not_answering">Ne odgovara na pozive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUnavailableDialog(false)}
                className="flex-1"
              >
                Otkaži
              </Button>
              <Button
                onClick={submitCustomerUnavailable}
                disabled={!unavailableReason}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                Pošalji SMS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Spare Parts Request Dialog */}
      <Dialog open={showSparePartsDialog} onOpenChange={setShowSparePartsDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Naruči rezervni deo</DialogTitle>
            <DialogDescription>
              Unesite podatke o potrebnom rezervnom delu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="part-name">Naziv dela</Label>
              <Input
                id="part-name"
                value={sparePartsData.partName}
                onChange={(e) => setSparePartsData(prev => ({ ...prev, partName: e.target.value }))}
                placeholder="Naziv rezervnog dela..."
              />
            </div>
            <div>
              <Label htmlFor="catalog-number">Kataloški broj</Label>
              <Input
                id="catalog-number"
                value={sparePartsData.catalogNumber}
                onChange={(e) => setSparePartsData(prev => ({ ...prev, catalogNumber: e.target.value }))}
                placeholder="Kataloški broj dela..."
              />
            </div>
            <div>
              <Label>Hitnost</Label>
              <Select 
                value={sparePartsData.urgency} 
                onValueChange={(value: 'normal' | 'high' | 'urgent') => 
                  setSparePartsData(prev => ({ ...prev, urgency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normalno (7-10 dana)</SelectItem>
                  <SelectItem value="high">Brzo (5-7 dana)</SelectItem>
                  <SelectItem value="urgent">Hitno (3-5 dana)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={sparePartsData.description}
                onChange={(e) => setSparePartsData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Dodatni opis ili napomene..."
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSparePartsDialog(false)}
                className="flex-1"
              >
                Otkaži
              </Button>
              <Button
                onClick={submitSparePartsRequest}
                disabled={!sparePartsData.partName.trim() || !sparePartsData.catalogNumber.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                Naruči deo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-700">Završavanje servisa #{service.id}</DialogTitle>
            <DialogDescription>
              Unesite detaljne informacije o izvršenom radu pre završavanja servisa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="technician-notes">Napomena servisera *</Label>
              <Textarea
                id="technician-notes"
                value={completionData.technicianNotes}
                onChange={(e) => setCompletionData(prev => ({ ...prev, technicianNotes: e.target.value }))}
                placeholder="Opišite šta je urađeno, koje probleme ste identifikovali..."
                rows={3}
                className="resize-none"
              />
            </div>
            
            <div>
              <Label htmlFor="work-performed">Izvršeni rad *</Label>
              <Textarea
                id="work-performed"
                value={completionData.workPerformed}
                onChange={(e) => setCompletionData(prev => ({ ...prev, workPerformed: e.target.value }))}
                placeholder="Detaljno opišite koji rad je izvršen..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div>
              <Label htmlFor="used-parts">Korišćeni delovi</Label>
              <Textarea
                id="used-parts"
                value={completionData.usedParts}
                onChange={(e) => setCompletionData(prev => ({ ...prev, usedParts: e.target.value }))}
                placeholder="Lista korišćenih rezervnih delova..."
                rows={2}
                className="resize-none"
              />
            </div>

            <div>
              <Label htmlFor="machine-notes">Napomene o aparatu</Label>
              <Textarea
                id="machine-notes"
                value={completionData.machineNotes}
                onChange={(e) => setCompletionData(prev => ({ ...prev, machineNotes: e.target.value }))}
                placeholder="Stanje aparata, preporuke za održavanje..."
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="warranty-service"
                checked={completionData.isWarrantyService}
                onChange={(e) => setCompletionData(prev => ({ 
                  ...prev, 
                  isWarrantyService: e.target.checked,
                  // Resetuj cenu ako je garanciski servis
                  cost: e.target.checked ? '0' : prev.cost
                }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="warranty-service" className="text-sm font-medium">
                Servis u garanciji (besplatan)
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost">
                  Cena servisa (EUR) {completionData.isWarrantyService && <span className="text-green-600 text-xs">(Garanciski - 0€)</span>}
                </Label>
                <Input
                  id="cost"
                  type="number"
                  value={completionData.isWarrantyService ? '0' : completionData.cost}
                  onChange={(e) => setCompletionData(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0"
                  disabled={completionData.isWarrantyService}
                  className={completionData.isWarrantyService ? "bg-green-50 text-green-700" : ""}
                />
              </div>
              
              <div>
                <Label htmlFor="warranty">Garancija (meseci)</Label>
                <Input
                  id="warranty"
                  value={completionData.warrantyInfo}
                  onChange={(e) => setCompletionData(prev => ({ ...prev, warrantyInfo: e.target.value }))}
                  placeholder="6"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kvalitet rada (1-5)</Label>
                <Select 
                  value={completionData.workQuality.toString()} 
                  onValueChange={(value) => setCompletionData(prev => ({ ...prev, workQuality: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Loš</SelectItem>
                    <SelectItem value="2">2 - Slab</SelectItem>
                    <SelectItem value="3">3 - Dobar</SelectItem>
                    <SelectItem value="4">4 - Vrlo dobar</SelectItem>
                    <SelectItem value="5">5 - Odličan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Zadovoljstvo klijenta (1-5)</Label>
                <Select 
                  value={completionData.clientSatisfaction.toString()} 
                  onValueChange={(value) => setCompletionData(prev => ({ ...prev, clientSatisfaction: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Nezadovoljan</SelectItem>
                    <SelectItem value="2">2 - Malo zadovoljan</SelectItem>
                    <SelectItem value="3">3 - Zadovoljan</SelectItem>
                    <SelectItem value="4">4 - Vrlo zadovoljan</SelectItem>
                    <SelectItem value="5">5 - Izuzetno zadovoljan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="client-signature"
                checked={completionData.clientSignature}
                onChange={(e) => setCompletionData(prev => ({ ...prev, clientSignature: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="client-signature">Klijent je potvrdio izvršen rad</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCompletionDialog(false)}
                className="flex-1"
              >
                Otkaži
              </Button>
              <Button
                onClick={submitServiceCompletion}
                disabled={!completionData.technicianNotes.trim() || !completionData.workPerformed.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Završi servis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Device Dialog */}
      <Dialog open={showReturnDeviceDialog} onOpenChange={setShowReturnDeviceDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-700">Vraćanje aparata klijentu</DialogTitle>
            <DialogDescription>
              Servis #{service.id} - Potvrda vraćanja aparata
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="return-notes">Napomene o vraćanju *</Label>
              <Textarea
                id="return-notes"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Stanje aparata, instrukcije za klijenta, predate komponente..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowReturnDeviceDialog(false)}
                className="flex-1"
              >
                Otkaži
              </Button>
              <Button
                onClick={submitReturnDevice}
                disabled={!returnNotes.trim() || returnDeviceMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Home className="h-4 w-4 mr-2" />
                {returnDeviceMutation.isPending ? 'Obrađuje...' : 'Vrati aparat'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function TechnicianServicesMobile() {
  const [activeTab, setActiveTab] = useState("active");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Fetch services data with JWT authentication
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['/api/my-services'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }
      
      const response = await fetch('/api/my-services', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.status}`);
      }
      
      return response.json();
    }
  });
  
  // Filter services by status
  const activeServices = useMemo(() => 
    services.filter((s: Service) => ['pending', 'assigned', 'in_progress', 'scheduled', 'waiting_parts'].includes(s.status))
  , [services]);
  
  const completedServices = useMemo(() => 
    services.filter((s: Service) => ['completed'].includes(s.status))
  , [services]);
  
  const otherServices = useMemo(() => 
    services.filter((s: Service) => ['cancelled'].includes(s.status))
  , [services]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Serviser Panel</h1>
                <p className="text-blue-100 text-sm">Mobilna verzija</p>
              </div>
            </div>
            
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg border border-white/20 hover:bg-white/20 transition-all"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Hamburger Menu Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsMenuOpen(false)}>
            <div 
              className="absolute top-0 right-0 w-80 h-full bg-white shadow-2xl transform transition-transform duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Menu Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Gruica Serviser</h3>
                      <p className="text-blue-100 text-sm">Mobilni Tehnički Panel</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-6 space-y-4">
                {/* Profile */}
                <Link href="/tech/my-profile">
                  <button className="w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Moj profil</p>
                      <p className="text-sm text-gray-500">Pregled i izmena podataka</p>
                    </div>
                  </button>
                </Link>

                {/* Notifications */}
                <Link href="/tech/notifications">
                  <button className="w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Bell className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Obaveštenja</p>
                      <p className="text-sm text-gray-500">7 nepročitanih poruka</p>
                    </div>
                  </button>
                </Link>

                {/* Settings */}
                <Link href="/tech/settings">
                  <button className="w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Settings className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Postavke</p>
                      <p className="text-sm text-gray-500">Konfiguracija aplikacije</p>
                    </div>
                  </button>
                </Link>

                {/* Help */}
                <Link href="/tech/help">
                  <button className="w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Pomoć</p>
                      <p className="text-sm text-gray-500">Uputstva i podrška</p>
                    </div>
                  </button>
                </Link>

                {/* Contact */}
                <Link href="/tech/contact">
                  <button className="w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Kontakt</p>
                      <p className="text-sm text-gray-500">067 077 092</p>
                    </div>
                  </button>
                </Link>

                {/* Divider */}
                <hr className="my-6" />

                {/* Logout */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    // Add logout functionality here
                    localStorage.removeItem('auth_token');
                    window.location.href = '/';
                  }}
                  className="w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-red-50 transition-colors text-red-600"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Odjavi se</p>
                    <p className="text-sm text-red-400">Završi radnu sesiju</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-white shadow-sm p-1 h-12">
            <TabsTrigger 
              value="active" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium h-10"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Aktivni</span>
                <Badge className="bg-blue-100 text-blue-700 text-xs px-2">
                  {activeServices.length}
                </Badge>
              </div>
            </TabsTrigger>
            
            <TabsTrigger 
              value="completed" 
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white font-medium h-10"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Završeni</span>
                <Badge className="bg-green-100 text-green-700 text-xs px-2">
                  {completedServices.length}
                </Badge>
              </div>
            </TabsTrigger>
            
            <TabsTrigger 
              value="other" 
              className="data-[state=active]:bg-gray-600 data-[state=active]:text-white font-medium h-10"
            >
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                <span>Ostali</span>
                <Badge className="bg-gray-100 text-gray-700 text-xs px-2">
                  {otherServices.length}
                </Badge>
              </div>
            </TabsTrigger>
          </TabsList>
          
          {/* Tab Content */}
          <TabsContent value="active" className="space-y-4">
            {activeServices.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">Nema aktivnih servisa</p>
              </div>
            ) : (
              activeServices.map((service: Service) => (
                <ServiceCard key={service.id} service={service} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-4">
            {completedServices.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">Nema završenih servisa</p>
              </div>
            ) : (
              completedServices.map((service: Service) => (
                <ServiceCard key={service.id} service={service} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="other" className="space-y-4">
            {otherServices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">Nema ostalih servisa</p>
              </div>
            ) : (
              otherServices.map((service: Service) => (
                <ServiceCard key={service.id} service={service} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}