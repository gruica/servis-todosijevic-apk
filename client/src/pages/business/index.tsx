import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import BusinessLayout from "@/components/layout/business-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import EnhancedServiceDialog from "@/components/business/enhanced-service-dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Wrench, Clock, CheckCircle, AlertCircle, Eye, Phone, Mail, Calendar, Package, Settings, MapPin, User, Receipt, Activity, Building2, TrendingUp, BarChart3, FileText, Users, Award } from "lucide-react";
import { AppIcons, getApplianceIcon, getBrandIcon, getStatusIcon } from "@/lib/app-icons";
import { useLocation } from "wouter";

// Enhanced service interface with detailed information
interface ServiceItem {
  id: number;
  status: string;
  description: string;
  createdAt: string;
  client?: {
    fullName: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
  };
  appliance?: {
    model?: string;
    serialNumber?: string;
    category?: { name: string };
    manufacturer?: { name: string };
  };
  technician?: {
    fullName: string;
    phone?: string;
    email?: string;
    specialization?: string;
  };
  spareParts: Array<{
    partName: string;
    quantity: number;
    productCode?: string;
    urgency: string;
    warrantyStatus: string;
    status: string;
    orderDate: string;
    estimatedDeliveryDate?: string;
    actualDeliveryDate?: string;
  }>;
  removedParts: Array<{
    partName: string;
    removalReason: string;
    currentLocation: string;
    removalDate: string;
    returnDate?: string;
    status: string;
    repairCost?: number;
  }>;
  workTimeline: Array<{
    date: string;
    event: string;
    status: string;
  }>;
  isCompleted: boolean;
  totalCost: number;
  partsCount: number;
  removedPartsCount: number;
  technicianNotes?: string;
}

// Funkcija za prevod statusa
function translateStatus(status: string) {
  const statusMap: Record<string, string> = {
    pending: "Na čekanju",
    assigned: "Dodeljen serviseru",
    scheduled: "Zakazan",
    in_progress: "U toku",
    waiting_parts: "Čeka delove",
    completed: "Završen",
    cancelled: "Otkazan"
  };
  return statusMap[status] || status;
}

export default function BusinessDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isEnhancedDialogOpen, setIsEnhancedDialogOpen] = useState(false);
  
  // Dohvatanje servisnih zahteva za poslovnog partnera
  const { data: services, isLoading } = useQuery<ServiceItem[]>({
    queryKey: ["/api/business/services"],
    enabled: !!user?.id,
  });

  // Dohvatanje proširenih podataka za selektovan servis
  const { data: enhancedService, isLoading: enhancedLoading } = useQuery({
    queryKey: ["/api/business/services/details", selectedService?.id],
    queryFn: async () => {
      if (!selectedService?.id) return null;
      const response = await fetch(`/api/business/services/${selectedService.id}`);
      if (!response.ok) throw new Error('Greška pri dohvatanju detalja servisa');
      return response.json();
    },
    enabled: !!selectedService?.id && isEnhancedDialogOpen,
  });

  // Funkcija za otvaranje proširenog dijaloga
  const handleOpenEnhancedDialog = (service: ServiceItem) => {
    setSelectedService(service);
    setIsEnhancedDialogOpen(true);
  };

  // Funkcija za zatvaranje proširenog dijaloga
  const handleCloseEnhancedDialog = () => {
    setIsEnhancedDialogOpen(false);
    setSelectedService(null);
  };
  
  // Brojanje servisa po statusima
  const statusCounts = services?.reduce((acc, service) => {
    acc[service.status] = (acc[service.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  // Ukupan broj servisa
  const totalServices = services?.length || 0;
  // Broj aktivnih servisa (svi osim completed i cancelled)
  const activeServices = services?.filter(s => !['completed', 'cancelled'].includes(s.status)).length || 0;
  // Broj završenih servisa
  const completedServices = statusCounts['completed'] || 0;
  // Broj servisa na čekanju
  const pendingServices = statusCounts['pending'] || 0;
  
  // Dodatni metrije za korporativni dashboard
  const thisMonthServices = services?.filter(s => {
    const serviceDate = new Date(s.createdAt);
    const now = new Date();
    return serviceDate.getMonth() === now.getMonth() && serviceDate.getFullYear() === now.getFullYear();
  }).length || 0;
  
  const avgResponseTime = "2.4h"; // Ovo bi trebalo da bude kalkulacija iz realnih podataka
  const satisfactionRate = "98%"; // Ovo bi trebalo da bude kalkulacija iz realnih podataka
  
  return (
    <BusinessLayout>
      <div className="space-y-8">
        {/* Professional Header with Corporate Branding */}
        <div className="relative overflow-hidden rounded-xl">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
          
          {/* Header Content */}
          <div className="relative px-6 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                {/* Corporate Logo */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <img src={AppIcons.business.partner} alt="" className="w-8 h-8" />
                </div>
                
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Korporativni Portal
                  </h1>
                  <p className="text-lg text-gray-600 mt-1">
                    Dobrodošli, {user?.companyName || user?.fullName || "Poslovni partner"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Profesionalno upravljanje servisnim zahtevima i partnerskim odnosima
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline"
                  size="lg"
                  className="bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200 hover:border-gray-300"
                  onClick={() => navigate("/business/clients/new")}
                >
                  <Users className="mr-2 h-5 w-5" />
                  Novi klijent
                </Button>
                <Button 
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 shadow-lg"
                  onClick={() => navigate("/business/services/new")}
                >
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Nova zahtev
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
                  onClick={() => navigate("/business/complus")}
                >
                  <Award className="mr-2 h-5 w-5" />
                  Com Plus Premium
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced KPI Cards with Professional Design */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/20" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-blue-900">Ukupno zahteva</CardTitle>
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-blue-900">{totalServices}</div>
              <p className="text-sm text-blue-700 mt-1">
                Svi kreirani zahtevi
              </p>
              <div className="text-xs text-blue-600 mt-2 font-medium">
                +{thisMonthServices} ovog meseca
              </div>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-600/20" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-amber-900">Aktivni zahtevi</CardTitle>
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-amber-900">{activeServices}</div>
              <p className="text-sm text-amber-700 mt-1">
                Zahtevi u obradi
              </p>
              <div className="text-xs text-amber-600 mt-2 font-medium">
                Prosečno vreme: {avgResponseTime}
              </div>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/20" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-orange-900">Na čekanju</CardTitle>
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-orange-900">{pendingServices}</div>
              <p className="text-sm text-orange-700 mt-1">
                Čekaju obradu
              </p>
              <div className="text-xs text-orange-600 mt-2 font-medium">
                Prioritetno rešavanje
              </div>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/20" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-green-900">Završeni</CardTitle>
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-green-900">{completedServices}</div>
              <p className="text-sm text-green-700 mt-1">
                Uspešno završeni
              </p>
              <div className="text-xs text-green-600 mt-2 font-medium">
                Zadovoljstvo: {satisfactionRate}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Professional Activities Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <img src={AppIcons.business.tracking} alt="" className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Upravljanje zahtevima</CardTitle>
                <CardDescription className="text-gray-600">
                  Pregled i upravljanje vašim servisnim zahtevima
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Ako nema zahteva, prikažemo profesionalni empty state */}
            {totalServices === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6">
                  <FileText className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Započnite saradnju</h3>
                <p className="text-gray-600 max-w-md mb-8">
                  Kreirajte prvi servisni zahtev i iskoristite naše profesionalne usluge 
                  održavanja bele tehnike za vaše klijente.
                </p>
                <div className="flex gap-3">
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => navigate("/business/services/new")}
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Kreiraj zahtev
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate("/business/clients/new")}
                  >
                    <Users className="mr-2 h-5 w-5" />
                    Dodaj klijenta
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Recent Services with Professional Layout */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Nedavni zahtevi
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {services?.slice(0, 5).map(service => (
                      <div key={service.id} className="p-6 hover:bg-gray-50/50 transition-colors border-l-4 border-l-blue-500">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-lg text-gray-900">Zahtev #{service.id}</h4>
                              <Badge 
                                variant={service.isCompleted ? "default" : "secondary"}
                                className={`
                                  ${service.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                                  ${service.status === 'pending' ? 'bg-orange-100 text-orange-800 border-orange-200' : ''}
                                  ${service.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                                  ${service.status === 'assigned' ? 'bg-purple-100 text-purple-800 border-purple-200' : ''}
                                `}
                              >
                                {translateStatus(service.status)}
                              </Badge>
                            </div>
                            <p className="text-gray-700 mb-3 leading-relaxed">{service.description}</p>
                            
                            {/* Enhanced Client Info */}
                            {service.client && (
                              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium text-gray-900">{service.client.fullName}</span>
                                  </div>
                                  {service.client.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 text-gray-500" />
                                      <span className="text-gray-700">{service.client.phone}</span>
                                    </div>
                                  )}
                                  {service.client.city && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-gray-500" />
                                      <span className="text-gray-700">{service.client.city}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Enhanced Device Info */}
                            {service.appliance && (
                              <div className="text-sm text-gray-600 mb-3 bg-blue-50 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-blue-900">Uređaj:</span>
                                  <span>{service.appliance.category?.name}</span>
                                  {service.appliance.manufacturer?.name && (
                                    <span className="text-blue-800">({service.appliance.manufacturer.name})</span>
                                  )}
                                  {service.appliance.model && (
                                    <span className="text-blue-700">- {service.appliance.model}</span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Enhanced Work Summary */}
                            <div className="flex items-center gap-6 text-sm">
                              {service.technician && (
                                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                                  <Wrench className="h-4 w-4" />
                                  <span className="font-medium">{service.technician.fullName}</span>
                                </div>
                              )}
                              {service.partsCount > 0 && (
                                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded-full">
                                  <Package className="h-4 w-4" />
                                  <span>{service.partsCount} delova</span>
                                </div>
                              )}
                              {service.totalCost > 0 && (
                                <div className="flex items-center gap-2 text-orange-700 bg-orange-50 px-3 py-1 rounded-full">
                                  <Receipt className="h-4 w-4" />
                                  <span className="font-medium">{service.totalCost}€</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-3 ml-6">
                            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                              {new Date(service.createdAt).toLocaleDateString('sr-RS')}
                            </div>
                            
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={() => handleOpenEnhancedDialog(service)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Detalji
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {services && services.length > 5 && (
                    <div className="bg-gray-50 px-6 py-4 text-center border-t border-gray-200">
                      <Button 
                        variant="ghost" 
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => navigate("/business/services")}
                      >
                        Pogledaj sve zahteve ({totalServices})
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Professional Information Notice */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 text-lg mb-2">Korporativna saradnja</h4>
                      <p className="text-blue-800 leading-relaxed">
                        Kao poslovni partner imate priliku da kreirate servisne zahteve za vaše klijente. 
                        Svi zahtevi prolaze kroz naš profesionalni proces obrade sa garantovanim kvalitetom usluge. 
                        Naš tim će vas obaveštavati o svakom koraku realizacije.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Service Dialog */}
      <EnhancedServiceDialog 
        service={enhancedService || selectedService}
        isOpen={isEnhancedDialogOpen}
        onClose={handleCloseEnhancedDialog}
        onEdit={() => {
          if (selectedService) {
            setIsEnhancedDialogOpen(false);
            navigate(`/business/services/edit/${selectedService.id}`);
          }
        }}
        showActions={true}
      />
    </BusinessLayout>
  );
}