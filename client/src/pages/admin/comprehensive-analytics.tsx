import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  Users, 
  Wrench, 
  Smartphone,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Calendar,
  Database,
  Loader2,
  RefreshCw
} from "lucide-react";

interface ComprehensiveAnalytics {
  reportMetadata: {
    generatedAt: string;
    executionTime: string;
    reportVersion: string;
    coverage: string;
  };
  serviceAnalysis: {
    totalServices: number;
    statusBreakdown: Record<string, number>;
    warrantyBreakdown: {
      inWarranty: number;
      outOfWarranty: number;
    };
    monthlyStats: {
      thisMonth: number;
      completedThisMonth: number;
    };
    averageCompletionTime: number;
    businessPartnerServices: number;
  };
  clientAnalysis: {
    totalClients: number;
    activeClients: number;
    clientsWithMultipleServices: number;
    dataQuality: {
      withPhone: number;
      withEmail: number;
      withAddress: number;
    };
  };
  technicianAnalysis: {
    totalTechnicians: number;
    workloadDistribution: Array<{
      technicianId: number;
      name: string;
      activeServices: number;
      completedServices: number;
      efficiency: number;
    }>;
    averageServicesPerTechnician: number;
  };
  applianceAnalysis: {
    totalAppliances: number;
    categoryBreakdown: Array<{
      categoryName: string;
      count: number;
      serviceFrequency: number;
    }>;
    manufacturerBreakdown: Array<{
      manufacturerName: string;
      count: number;
      serviceFrequency: number;
    }>;
  };
  financialAnalysis: {
    revenue: {
      totalCompleted: number;
      thisMonth: number;
      warrantyServices: number;
      paidServices: number;
    };
    sparePartsCosts: {
      totalOrders: number;
      pendingOrders: number;
      deliveredOrders: number;
    };
  };
  performanceAnalysis: {
    averageCompletionDays: number;
    completionRate: number;
    pendingServicesOlderThan30Days: number;
  };
  trendAnalysis: {
    monthlyTrends: Record<string, {
      total: number;
      completed: number;
      warranty: number;
      paid: number;
    }>;
    growthRate: number;
    seasonalPatterns: Record<string, {
      total: number;
      months: number;
      average: number;
    }>;
  };
  billingAnalysis: {
    complus: {
      totalServices: number;
      estimatedValue: number;
      services: any[];
    };
    beko: {
      totalServices: number;
      estimatedValue: number;
      services: any[];
    };
    others: {
      totalServices: number;
      estimatedValue: number;
      services: any[];
    };
  };
  systemHealth: {
    database: {
      healthy: boolean;
      responseTime: number;
      activeConnections: number;
    };
    server: {
      uptime: number;
      memoryUsage: number;
      nodeVersion: string;
    };
  };
}

export default function ComprehensiveAnalytics() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/analytics/comprehensive', refreshKey],
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 60000, // Consider data stale after 1 minute
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Generisanje kompletne analize podataka...</p>
          <p className="text-sm text-muted-foreground mt-2">Ovo može potrajati nekoliko sekundi</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Greška pri učitavanju analize
            </CardTitle>
            <CardDescription className="text-red-600">
              Došlo je do greške prilikom generisanja kompletne analize podataka.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Pokušaj ponovo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return <div>Nema podataka za analizu</div>;
  }

  const getStatusIcon = (status: string, count: number) => {
    if (count === 0) return <div className="w-4 h-4" />;
    
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'inProgress': return <Activity className="h-4 w-4 text-blue-600" />;
      case 'cancelled': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'waitingParts': return <Wrench className="h-4 w-4 text-orange-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('sr-RS');
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Kompletna Analiza Podataka</h1>
          <p className="text-muted-foreground mt-1">
            Detaljana analiza svih aspekata aplikacije sa real-time podacima
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Osveži analizu
          </Button>
        </div>
      </div>

      {/* Report Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Metadata izveštaja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Generisan</p>
              <p className="font-medium">{formatDate(analytics.reportMetadata.generatedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vreme izvršavanja</p>
              <p className="font-medium">{analytics.reportMetadata.executionTime}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Verzija</p>
              <p className="font-medium">{analytics.reportMetadata.reportVersion}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pokrivenost</p>
              <p className="font-medium text-green-600">100%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Zdravlje sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${analytics.systemHealth.database.healthy ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <p className="text-sm text-muted-foreground">Baza podataka</p>
                <p className="font-medium">{analytics.systemHealth.database.healthy ? 'Zdravo' : 'Problem'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">DB vreme odgovora</p>
              <p className="font-medium">{analytics.systemHealth.database.responseTime}ms</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Server uptime</p>
              <p className="font-medium">{formatUptime(analytics.systemHealth.server.uptime)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Memorija</p>
              <p className="font-medium">{analytics.systemHealth.server.memoryUsage}MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="services" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="services">Servisi</TabsTrigger>
          <TabsTrigger value="clients">Klijenti</TabsTrigger>
          <TabsTrigger value="technicians">Serviseri</TabsTrigger>
          <TabsTrigger value="appliances">Uređaji</TabsTrigger>
          <TabsTrigger value="financial">Finansije</TabsTrigger>
          <TabsTrigger value="trends">Trendovi</TabsTrigger>
        </TabsList>

        {/* Services Analysis */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ukupno servisa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.serviceAnalysis.totalServices}</div>
                <p className="text-xs text-muted-foreground">Svi servisi u sistemu</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ovaj mjesec</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{analytics.serviceAnalysis.monthlyStats.thisMonth}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.serviceAnalysis.monthlyStats.completedThisMonth} završeno
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Prosječno vrijeme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analytics.serviceAnalysis.averageCompletionTime}h</div>
                <p className="text-xs text-muted-foreground">Do završetka servisa</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Poslovni partneri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{analytics.serviceAnalysis.businessPartnerServices}</div>
                <p className="text-xs text-muted-foreground">Servisi od partnera</p>
              </CardContent>
            </Card>
          </div>

          {/* Service Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Raspored po statusu</CardTitle>
              <CardDescription>Trenutno stanje svih servisa u sistemu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(analytics.serviceAnalysis.statusBreakdown).map(([status, count]) => {
                const percentage = (count / analytics.serviceAnalysis.totalServices) * 100;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status, count)}
                      <span className="capitalize">
                        {status === 'pending' && 'Na čekanju'}
                        {status === 'assigned' && 'Dodeljen'}
                        {status === 'inProgress' && 'U toku'}
                        {status === 'completed' && 'Završen'}
                        {status === 'cancelled' && 'Otkazan'}
                        {status === 'waitingParts' && 'Čeka delove'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={percentage} className="w-20" />
                      <span className="text-sm font-medium w-12 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Warranty Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Garancijski status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>U garanciji</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {analytics.serviceAnalysis.warrantyBreakdown.inWarranty}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Van garancije</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {analytics.serviceAnalysis.warrantyBreakdown.outOfWarranty}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performanse</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Stopa završetka</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {analytics.performanceAnalysis.completionRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Prosečno dana</span>
                    <Badge variant="secondary">
                      {analytics.performanceAnalysis.averageCompletionDays}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Stari servisi (30+ dana)</span>
                    <Badge variant={analytics.performanceAnalysis.pendingServicesOlderThan30Days > 0 ? "destructive" : "secondary"}>
                      {analytics.performanceAnalysis.pendingServicesOlderThan30Days}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clients Analysis */}
        <TabsContent value="clients" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ukupno klijenata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.clientAnalysis.totalClients}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Aktivni klijenti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analytics.clientAnalysis.activeClients}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Verni klijenti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{analytics.clientAnalysis.clientsWithMultipleServices}</div>
                <p className="text-xs text-muted-foreground">Više servisa</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Kvalitet podataka</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((analytics.clientAnalysis.dataQuality.withPhone / analytics.clientAnalysis.totalClients) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">Sa telefonom</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Kvalitet kontakt podataka</CardTitle>
              <CardDescription>Kompletnost kontakt informacija klijenata</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Telefon</span>
                    <span>{analytics.clientAnalysis.dataQuality.withPhone}/{analytics.clientAnalysis.totalClients}</span>
                  </div>
                  <Progress value={(analytics.clientAnalysis.dataQuality.withPhone / analytics.clientAnalysis.totalClients) * 100} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Email</span>
                    <span>{analytics.clientAnalysis.dataQuality.withEmail}/{analytics.clientAnalysis.totalClients}</span>
                  </div>
                  <Progress value={(analytics.clientAnalysis.dataQuality.withEmail / analytics.clientAnalysis.totalClients) * 100} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Adresa</span>
                    <span>{analytics.clientAnalysis.dataQuality.withAddress}/{analytics.clientAnalysis.totalClients}</span>
                  </div>
                  <Progress value={(analytics.clientAnalysis.dataQuality.withAddress / analytics.clientAnalysis.totalClients) * 100} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technicians Analysis */}
        <TabsContent value="technicians" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ukupno servisera</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.technicianAnalysis.totalTechnicians}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Prosek po tehniciaru</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.technicianAnalysis.averageServicesPerTechnician.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">Servisa po serviseru</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Najbolji serviser</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-green-600">
                  {analytics.technicianAnalysis.workloadDistribution
                    .sort((a, b) => b.efficiency - a.efficiency)[0]?.efficiency || 0}%
                </div>
                <p className="text-xs text-muted-foreground">Efikasnost</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribucija opterećenja servisera</CardTitle>
              <CardDescription>Aktivni i završeni servisi po serviseru</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.technicianAnalysis.workloadDistribution.map((tech) => (
                  <div key={tech.technicianId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{tech.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {tech.activeServices} aktivni • {tech.completedServices} završeni
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={tech.efficiency >= 80 ? "default" : tech.efficiency >= 60 ? "secondary" : "destructive"}>
                        {tech.efficiency}% efikasnost
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appliances Analysis */}
        <TabsContent value="appliances" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ukupno uređaja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.applianceAnalysis.totalAppliances}</div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Kategorije uređaja</CardTitle>
                <CardDescription>Broj uređaja i učestalost servisa po kategoriji</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.applianceAnalysis.categoryBreakdown
                    .sort((a, b) => b.serviceFrequency - a.serviceFrequency)
                    .slice(0, 10)
                    .map((category) => (
                    <div key={category.categoryName} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{category.categoryName}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{category.count} uređaja</Badge>
                        <Badge variant="secondary">{category.serviceFrequency} servisa</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proizvođači</CardTitle>
                <CardDescription>Broj uređaja i učestalost servisa po proizvođaču</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.applianceAnalysis.manufacturerBreakdown
                    .sort((a, b) => b.serviceFrequency - a.serviceFrequency)
                    .slice(0, 10)
                    .map((manufacturer) => (
                    <div key={manufacturer.manufacturerName} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{manufacturer.manufacturerName}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{manufacturer.count} uređaja</Badge>
                        <Badge variant="secondary">{manufacturer.serviceFrequency} servisa</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Analysis */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Završeni servisi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.financialAnalysis.revenue.totalCompleted}</div>
                <p className="text-xs text-muted-foreground">Ukupno</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ovaj mjesec</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analytics.financialAnalysis.revenue.thisMonth}</div>
                <p className="text-xs text-muted-foreground">Završeno servisa</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Garancijski</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{analytics.financialAnalysis.revenue.warrantyServices}</div>
                <p className="text-xs text-muted-foreground">U garanciji</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Plaćeni</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{analytics.financialAnalysis.revenue.paidServices}</div>
                <p className="text-xs text-muted-foreground">Van garancije</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rezervni delovi</CardTitle>
                <CardDescription>Status porudžbina rezervnih dijelova</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Ukupno porudžbina</span>
                    <Badge variant="secondary">{analytics.financialAnalysis.sparePartsCosts.totalOrders}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Na čekanju</span>
                    <Badge variant="outline">{analytics.financialAnalysis.sparePartsCosts.pendingOrders}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Isporučeno</span>
                    <Badge variant="default">{analytics.financialAnalysis.sparePartsCosts.deliveredOrders}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing partneri</CardTitle>
                <CardDescription>Servisi po billing partnerima</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>ComPlus</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{analytics.billingAnalysis.complus.totalServices} servisa</Badge>
                      <Badge variant="outline">{analytics.billingAnalysis.complus.estimatedValue}€</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Beko</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{analytics.billingAnalysis.beko.totalServices} servisa</Badge>
                      <Badge variant="outline">{analytics.billingAnalysis.beko.estimatedValue}€</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Ostali</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{analytics.billingAnalysis.others.totalServices} servisa</Badge>
                      <Badge variant="outline">{analytics.billingAnalysis.others.estimatedValue}€</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Analysis */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stopa rasta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {analytics.trendAnalysis.growthRate >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                  <div className={`text-2xl font-bold ${analytics.trendAnalysis.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.trendAnalysis.growthRate > 0 ? '+' : ''}{analytics.trendAnalysis.growthRate}%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Najaktivnija sezona</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {Object.entries(analytics.trendAnalysis.seasonalPatterns)
                    .sort(([,a], [,b]) => b.average - a.average)[0]?.[0] || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Object.entries(analytics.trendAnalysis.seasonalPatterns)
                    .sort(([,a], [,b]) => b.average - a.average)[0]?.[1].average || 0} servisa/mjesec
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sezonski obrasci</CardTitle>
              <CardDescription>Prosečan broj servisa po sezonama</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analytics.trendAnalysis.seasonalPatterns)
                  .sort(([,a], [,b]) => b.average - a.average)
                  .map(([season, data]) => (
                  <div key={season} className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">{season}</h4>
                    <div className="text-2xl font-bold text-primary">{data.average}</div>
                    <p className="text-xs text-muted-foreground">servisa/mjesec</p>
                    <p className="text-xs text-muted-foreground mt-1">Ukupno: {data.total}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mesečni trendovi</CardTitle>
              <CardDescription>Servisi po mesecima (poslednih 12 meseci)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analytics.trendAnalysis.monthlyTrends)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 12)
                  .map(([month, data]) => (
                  <div key={month} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{month}</span>
                      <div className="text-sm text-muted-foreground">
                        {data.completed}/{data.total} završeno
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{data.warranty} garantni</Badge>
                      <Badge variant="secondary">{data.paid} plaćeni</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}