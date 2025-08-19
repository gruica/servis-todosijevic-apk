import React, { useState, useMemo, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  User, 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Wrench, 
  TrendingUp, 
  Calendar, 
  Euro, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  BarChart3,
  FileText,
  ShoppingCart,
  Users,
  Activity,
  Target,
  Award,
  History,
  Eye
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

// Tipovi za kompletnu analizu klijenta
interface ClientAnalysis {
  reportMetadata: {
    generatedAt: string;
    reportId: string;
    clientId: number;
    reportType: string;
  };
  clientInfo: {
    id: number;
    fullName: string;
    email?: string;
    phone: string;
    address?: string;
    city?: string;
    totalAppliances: number;
    registrationDate: string;
  };
  serviceStatistics: {
    totalServices: number;
    completedServices: number;
    activeServices: number;
    warrantyServices: number;
    totalCost: number;
    averageServiceTimeInDays: number;
    completionRate: number;
    warrantyRate: number;
  };
  appliances: Array<{
    id: number;
    categoryName: string;
    manufacturerName: string;
    model: string;
    serialNumber: string;
    purchaseDate?: string;
    serviceCount: number;
    lastServiceDate: string | null;
  }>;
  services: Array<{
    id: number;
    description: string;
    status: string;
    warrantyStatus: string;
    createdAt: string;
    completedDate?: string;
    cost?: string;
    technicianName?: string;
    applianceModel?: string;
    manufacturerName?: string;
    spareParts: Array<{
      partName: string;
      status: string;
      cost?: string;
    }>;
  }>;
  analytics: {
    applianceStats: Record<string, { count: number; services: number; cost: number }>;
    technicianStats: Record<string, { services: number; completed: number; cost: number }>;
    monthlyServiceHistory: Record<string, { total: number; completed: number; warranty: number; cost: number }>;
    problematicAppliances: Array<{
      applianceId: number;
      model: string;
      manufacturer: string;
      category: string;
      serviceCount: number;
      lastService: string;
      totalCost: number;
    }>;
  };
  spareParts: Array<{
    partName: string;
    status: string;
    urgency: string;
    cost?: string;
    orderDate: string;
  }>;
  recommendations: {
    maintenanceAlerts: string;
    costOptimization: string;
    technicianPreference: string;
  };
}

const StatusBadge = memo(({ status }: { status: string }) => {
  const statusConfig = {
    'completed': { label: 'Završen', variant: 'default' as const, color: 'bg-green-500' },
    'in_progress': { label: 'U toku', variant: 'secondary' as const, color: 'bg-blue-500' },
    'pending': { label: 'Na čekanju', variant: 'outline' as const, color: 'bg-yellow-500' },
    'scheduled': { label: 'Zakazan', variant: 'secondary' as const, color: 'bg-purple-500' },
    'cancelled': { label: 'Otkazan', variant: 'destructive' as const, color: 'bg-red-500' },
    'waiting_parts': { label: 'Čeka delove', variant: 'outline' as const, color: 'bg-orange-500' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || 
    { label: status, variant: 'outline' as const, color: 'bg-gray-500' };

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      {config.label}
    </Badge>
  );
});

const AdminClientComprehensiveAnalysis = memo(function AdminClientComprehensiveAnalysis() {
  const { toast } = useToast();
  const [, params] = useRoute("/admin/clients/:id/analysis");
  const clientId = params?.id ? parseInt(params.id) : null;
  const [selectedService, setSelectedService] = useState<any>(null);

  // Query za kompletnu analizu klijenta sa custom fetch funkcijom
  const { data: analysis, isLoading, error } = useQuery<ClientAnalysis>({
    queryKey: [`/api/admin/clients/${clientId}/comprehensive-analysis`],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Token exists:', !!token);
      console.log('🔑 Token length:', token?.length || 0);
      
      const response = await fetch(`/api/admin/clients/${clientId}/comprehensive-analysis`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log('📡 API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ API Success, data received');
      return data;
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000, // 2 minuta
    gcTime: 5 * 60 * 1000, // 5 minuta
  });

  // Formatiranje datuma
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Formatiranje cene
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('sr-RS', { 
      style: 'currency', 
      currency: 'RSD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  if (!clientId) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/clients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad na klijente
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Nevaljan ID klijenta</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/clients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad na klijente
            </Button>
          </Link>
          <Skeleton className="h-8 w-64" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/clients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad na klijente
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Greška pri učitavanju analize</p>
              <p className="text-muted-foreground">
                Došlo je do greške pri učitavanju podataka o klijentu. 
                Pokušajte ponovo ili kontaktirajte administratora.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/clients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad na klijente
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{analysis.clientInfo.fullName}</h1>
            <p className="text-muted-foreground">
              Kompletna analiza klijenta #{analysis.clientInfo.id}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          Generisan: {formatDate(analysis.reportMetadata.generatedAt)}
        </Badge>
      </div>

      {/* Osnovne informacije o klijentu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Osnovne informacije
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analysis.clientInfo.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{analysis.clientInfo.phone}</span>
              </div>
            )}
            {analysis.clientInfo.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{analysis.clientInfo.email}</span>
              </div>
            )}
            {analysis.clientInfo.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {analysis.clientInfo.address}
                  {analysis.clientInfo.city && `, ${analysis.clientInfo.city}`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{analysis.clientInfo.totalAppliances} uređaj(a)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistike servisa */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno servisa</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.serviceStatistics.totalServices}</div>
            <p className="text-xs text-muted-foreground">
              {analysis.serviceStatistics.activeServices} aktivnih
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Završeni servisi</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.serviceStatistics.completedServices}</div>
            <p className="text-xs text-muted-foreground">
              {analysis.serviceStatistics.completionRate}% uspešnost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupni troškovi</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analysis.serviceStatistics.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analysis.serviceStatistics.warrantyServices} garantnih
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prosečno vreme</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analysis.serviceStatistics.averageServiceTimeInDays} d
            </div>
            <p className="text-xs text-muted-foreground">
              po servisu
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabovi sa detaljnim informacijama */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="services">Servisi</TabsTrigger>
          <TabsTrigger value="appliances">Uređaji</TabsTrigger>
          <TabsTrigger value="analytics">Analitika</TabsTrigger>
          <TabsTrigger value="parts">Rezervni delovi</TabsTrigger>
          <TabsTrigger value="recommendations">Preporuke</TabsTrigger>
        </TabsList>

        {/* Tab: Servisi */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Istorija servisa ({analysis.services.length})
              </CardTitle>
              <CardDescription>
                Kompletna istorija svih servisa za ovog klijenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.services.map((service) => (
                  <div key={service.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{service.id}</Badge>
                          <StatusBadge status={service.status} />
                          {service.warrantyStatus === 'u garanciji' && (
                            <Badge variant="secondary">Garancija</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{service.description}</p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>
                            Uređaj: {service.applianceModel} ({service.manufacturerName})
                          </div>
                          {service.technicianName && (
                            <div>Serviser: {service.technicianName}</div>
                          )}
                          <div>Kreiran: {formatDate(service.createdAt)}</div>
                          {service.completedDate && (
                            <div>Završen: {formatDate(service.completedDate)}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        {service.cost && (
                          <div className="font-semibold">{formatCurrency(service.cost)}</div>
                        )}
                        {service.spareParts.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {service.spareParts.length} deo(va)
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedService(service)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Uređaji */}
        <TabsContent value="appliances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Registrovani uređaji ({analysis.appliances.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.appliances.map((appliance) => (
                  <div key={appliance.id} className="border rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{appliance.categoryName}</Badge>
                        <Badge variant="secondary">
                          {appliance.serviceCount} servis(a)
                        </Badge>
                      </div>
                      <h4 className="font-semibold">
                        {appliance.manufacturerName} {appliance.model}
                      </h4>
                      {appliance.serialNumber && (
                        <p className="text-sm text-muted-foreground">
                          S/N: {appliance.serialNumber}
                        </p>
                      )}
                      {appliance.purchaseDate && (
                        <p className="text-sm text-muted-foreground">
                          Kupljen: {formatDate(appliance.purchaseDate)}
                        </p>
                      )}
                      {appliance.lastServiceDate && (
                        <p className="text-sm text-muted-foreground">
                          Poslednji servis: {formatDate(appliance.lastServiceDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Analitika */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Statistike po kategorijama */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Statistike po kategorijama
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analysis.analytics.applianceStats).map(([category, stats]) => (
                    <div key={category} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{category}</p>
                        <p className="text-sm text-muted-foreground">
                          {stats.count} uređaj(a) • {stats.services} servis(a)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(stats.cost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Statistike po serviserima */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Statistike po serviserima
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analysis.analytics.technicianStats).map(([technician, stats]) => (
                    <div key={technician} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{technician}</p>
                        <p className="text-sm text-muted-foreground">
                          {stats.services} servis(a) • {stats.completed} završeno
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(stats.cost)}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round((stats.completed / stats.services) * 100)}% uspešnost
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Problematični uređaji */}
          {analysis.analytics.problematicAppliances.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Uređaji sa čestim kvarovima
                </CardTitle>
                <CardDescription>
                  Uređaji koji zahtevaju češće servise (3+ servisa)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.analytics.problematicAppliances.map((appliance, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded border-orange-200 bg-orange-50">
                      <div>
                        <p className="font-medium">
                          {appliance.manufacturer} {appliance.model}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appliance.category} • Poslednji servis: {formatDate(appliance.lastService)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {appliance.serviceCount} servisa
                        </Badge>
                        <p className="text-sm font-semibold">{formatCurrency(appliance.totalCost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Rezervni delovi */}
        <TabsContent value="parts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Rezervni delovi ({analysis.spareParts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.spareParts.length > 0 ? (
                <div className="space-y-3">
                  {analysis.spareParts.map((part, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{part.partName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={part.status} />
                          <Badge variant={part.urgency === 'urgent' ? 'destructive' : 'outline'}>
                            {part.urgency === 'urgent' ? 'Hitno' : 'Standardno'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Naručen: {formatDate(part.orderDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        {part.cost && (
                          <p className="font-semibold">{formatCurrency(part.cost)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nema naručenih rezervnih delova</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Preporuke */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Održavanje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{analysis.recommendations.maintenanceAlerts}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Optimizacija troškova
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{analysis.recommendations.costOptimization}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-500" />
                  Preporučeni serviser
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{analysis.recommendations.technicianPreference}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog za detalje servisa */}
      {selectedService && (
        <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalji servisa #{selectedService.id}</DialogTitle>
              <DialogDescription>
                Kompletne informacije o servisu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">
                    <StatusBadge status={selectedService.status} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Garantni status</label>
                  <div className="mt-1">
                    <Badge variant={selectedService.warrantyStatus === 'u garanciji' ? 'secondary' : 'outline'}>
                      {selectedService.warrantyStatus}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Opis problema</label>
                <p className="mt-1 text-sm">{selectedService.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Uređaj</label>
                  <p className="mt-1 text-sm">{selectedService.applianceModel} ({selectedService.manufacturerName})</p>
                </div>
                {selectedService.technicianName && (
                  <div>
                    <label className="text-sm font-medium">Serviser</label>
                    <p className="mt-1 text-sm">{selectedService.technicianName}</p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Datum kreiranja</label>
                  <p className="mt-1 text-sm">{formatDate(selectedService.createdAt)}</p>
                </div>
                {selectedService.completedDate && (
                  <div>
                    <label className="text-sm font-medium">Datum završetka</label>
                    <p className="mt-1 text-sm">{formatDate(selectedService.completedDate)}</p>
                  </div>
                )}
              </div>
              
              {selectedService.cost && (
                <div>
                  <label className="text-sm font-medium">Troškovi</label>
                  <p className="mt-1 text-sm font-semibold">{formatCurrency(selectedService.cost)}</p>
                </div>
              )}
              
              {selectedService.spareParts.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Rezervni delovi</label>
                  <div className="mt-1 space-y-2">
                    {selectedService.spareParts.map((part: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{part.partName}</span>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={part.status} />
                          {part.cost && (
                            <span className="text-sm font-medium">{formatCurrency(part.cost)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});

export default AdminClientComprehensiveAnalysis;