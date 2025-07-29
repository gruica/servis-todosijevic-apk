import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  HelpCircle
} from "lucide-react";
import { formatDate } from "@/lib/utils";
// TEMPORARILY DISABLED: import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Service status map
const statusConfig = {
  pending: { color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50", label: "Na čekanju" },
  assigned: { color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50", label: "Dodeljen" },
  in_progress: { color: "bg-orange-500", textColor: "text-orange-700", bgColor: "bg-orange-50", label: "U toku" },
  scheduled: { color: "bg-purple-500", textColor: "text-purple-700", bgColor: "bg-purple-50", label: "Zakazan" },
  completed: { color: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50", label: "Završen" },
  cancelled: { color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50", label: "Otkazan" },
  waiting_parts: { color: "bg-amber-500", textColor: "text-amber-700", bgColor: "bg-amber-50", label: "Čeka delove" }
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

  // Professional service action mutations
  const startWorkMutation = useMutation({
    mutationFn: (serviceId: number) => 
      apiRequest(`/api/services/${serviceId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'in_progress' })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-services'] });
      toast({
        title: "Rad započet",
        description: "Status servisa promenjen na 'U toku'",
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

  // Handler functions
  const handleStartWork = (serviceId: number) => {
    startWorkMutation.mutate(serviceId);
  };

  const handleRequestParts = (serviceId: number) => {
    requestPartsMutation.mutate(serviceId);
  };

  const handleClientIssue = (serviceId: number) => {
    toast({
      title: "Prijavi problem",
      description: "Kontaktiraj administratora telefonom za hitne probleme",
    });
  };

  const handleCompleteService = (serviceId: number) => {
    completeServiceMutation.mutate(serviceId);
  };

  const handlePartsReceived = (serviceId: number) => {
    partsReceivedMutation.mutate(serviceId);
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
          <Badge className={`${statusInfo.bgColor} ${statusInfo.textColor} border-0 px-3 py-1`}>
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
          {/* Start Work Action */}
          {service.status === 'assigned' && (
            <Button 
              onClick={() => handleStartWork(service.id)}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <Play className="h-4 w-4 mr-2" />
              Počni rad na servisu
            </Button>
          )}

          {/* In Progress Actions */}
          {service.status === 'in_progress' && (
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
                onClick={() => handleClientIssue(service.id)}
                variant="outline"
                className="h-12 border-red-200 text-red-700 hover:bg-red-50"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Problem
              </Button>
            </div>
          )}

          {/* Complete Service Action */}
          {service.status === 'in_progress' && (
            <Button 
              onClick={() => handleCompleteService(service.id)}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Završi servis
            </Button>
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
        </div>
      </CardContent>
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
                <button className="w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Moj profil</p>
                    <p className="text-sm text-gray-500">Pregled i izmena podataka</p>
                  </div>
                </button>

                {/* Notifications */}
                <button className="w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Obaveštenja</p>
                    <p className="text-sm text-gray-500">7 nepročitanih poruka</p>
                  </div>
                </button>

                {/* Settings */}
                <button className="w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Postavke</p>
                    <p className="text-sm text-gray-500">Konfiguracija aplikacije</p>
                  </div>
                </button>

                {/* Help */}
                <button className="w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Pomoć</p>
                    <p className="text-sm text-gray-500">Uputstva i podrška</p>
                  </div>
                </button>

                {/* Contact */}
                <button className="w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Kontakt</p>
                    <p className="text-sm text-gray-500">067 077 092</p>
                  </div>
                </button>

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