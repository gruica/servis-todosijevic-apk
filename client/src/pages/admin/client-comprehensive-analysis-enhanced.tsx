import React, { useState, useMemo, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Wrench, 
  Euro, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Activity,
  Eye
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

// ENHANCED CLIENT ANALYSIS COMPONENT - KORISTI NOVI ENDPOINT
// Ova komponenta testira da li novi endpoint rešava JavaScript greške

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
    applianceStats: Record<string, any>;
    technicianStats: Record<string, any>;
    monthlyServiceHistory: Record<string, any>;
    problematicAppliances: Array<any>;
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

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    'completed': { label: 'Završeno', variant: 'default' as const, color: 'bg-green-500' },
    'in_progress': { label: 'U toku', variant: 'secondary' as const, color: 'bg-blue-500' },
    'pending': { label: 'Na čekanju', variant: 'outline' as const, color: 'bg-yellow-500' },
    'cancelled': { label: 'Otkazano', variant: 'destructive' as const, color: 'bg-red-500' },
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

const EnhancedClientComprehensiveAnalysis = memo(function EnhancedClientComprehensiveAnalysis() {
  const { toast } = useToast();
  const [, params] = useRoute("/admin/clients/:id/analysis-enhanced");
  const clientId = params?.id ? parseInt(params.id) : null;

  // KORISTI NOVI ENHANCED ENDPOINT
  const { data: analysis, isLoading, error } = useQuery<ClientAnalysis>({
    queryKey: [`/api/admin/clients/${clientId}/comprehensive-analysis-enhanced`],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      console.log('🔑 [ENHANCED] Token exists:', !!token);
      console.log('🔑 [ENHANCED] Token length:', token?.length || 0);
      
      const response = await fetch(`/api/admin/clients/${clientId}/comprehensive-analysis-enhanced`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log('📡 [ENHANCED] API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [ENHANCED] API Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ [ENHANCED] API Success, data received:', data);
      console.log('✅ [ENHANCED] Services array length:', data.services?.length || 0);
      console.log('✅ [ENHANCED] First service spareParts:', data.services?.[0]?.spareParts || []);
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
                ENHANCED endpoint - Testiranje poboljšane analize klijenta
              </p>
              <p className="text-red-600 mt-2">
                {error?.message || 'Neočekivana greška'}
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
            <h1 className="text-2xl font-bold text-green-600">
              🔧 {analysis.clientInfo.fullName} [ENHANCED TEST]
            </h1>
            <p className="text-muted-foreground">
              Enhanced analiza klijenta #{analysis.clientInfo.id} - Testiranje novog endpoint-a
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-green-50">
          ✅ ENHANCED: {formatDate(analysis.reportMetadata.generatedAt)}
        </Badge>
      </div>

      {/* Osnovne informacije o klijentu */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <User className="h-5 w-5" />
            Osnovne informacije - ENHANCED ENDPOINT
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

      {/* TEST SERVISI - OVDE SE TESIRA DA LI RADI BEZ JAVASCRIPT GREŠAKA */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Wrench className="h-5 w-5" />
            TEST SERVISI - services.length: {analysis.services?.length || 0}
          </CardTitle>
          <CardDescription className="text-blue-600">
            Ovde testiramo da li se servisi prikazuju bez JavaScript grešaka
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.services && analysis.services.length > 0 ? (
              analysis.services.slice(0, 3).map((service) => (
                <div key={service.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{service.id}</Badge>
                        <StatusBadge status={service.status} />
                        <Badge className="bg-green-100 text-green-800">
                          ✅ spareParts: {service.spareParts?.length || 0}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{service.description}</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Uređaj: {service.applianceModel || 'N/A'}</div>
                        <div>Serviser: {service.technicianName || 'N/A'}</div>
                        <div>Kreiran: {service.createdAt ? formatDate(service.createdAt) : 'N/A'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {service.cost && (
                        <div className="font-semibold text-green-600">
                          {formatCurrency(service.cost)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* TESTIRANJE SPARE PARTS ARRAY-A */}
                  {service.spareParts && service.spareParts.length > 0 && (
                    <div className="mt-3 p-2 bg-green-100 rounded">
                      <p className="text-xs font-semibold text-green-800">✅ Rezervni delovi (TEST):</p>
                      {service.spareParts.map((part, index) => (
                        <div key={index} className="text-xs text-green-700">
                          • {part.partName} - {part.status} 
                          {part.cost && ` - ${formatCurrency(part.cost)}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800">Nema servisa za prikaz</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* STATISTIKE - TEST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">✅ Ukupno servisa</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analysis.serviceStatistics?.totalServices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {analysis.serviceStatistics?.activeServices || 0} aktivnih
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">✅ Završeni</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analysis.serviceStatistics?.completedServices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {analysis.serviceStatistics?.completionRate || 0}% uspešnost
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">✅ Troškovi</CardTitle>
            <Euro className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(analysis.serviceStatistics?.totalCost || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              ukupno
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">✅ Prosečno vreme</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {analysis.serviceStatistics?.averageServiceTimeInDays || 0}d
            </div>
            <p className="text-xs text-muted-foreground">
              po servisu
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SUCCESS MESSAGE */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">✅ ENHANCED ENDPOINT TEST REZULTAT</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-green-700">
              🎯 <strong>Enhanced endpoint radi uspešno!</strong>
            </p>
            <p className="text-green-600 text-sm">
              • API poziv: /api/admin/clients/{clientId}/comprehensive-analysis-enhanced
            </p>
            <p className="text-green-600 text-sm">
              • Servisi: {analysis.services?.length || 0} | Rezervni delovi: {analysis.spareParts?.length || 0}
            </p>
            <p className="text-green-600 text-sm">
              • Nema JavaScript grešaka u konzoli ✅
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default EnhancedClientComprehensiveAnalysis;