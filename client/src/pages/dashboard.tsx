import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { ApplianceCategory, Client, Service } from "@shared/schema";
import { WaitingForPartsSection } from "@/components/admin/WaitingForPartsSection";
import { 
  Activity, 
  Users, 
  Settings, 
  Package, 
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart,
  TrendingUp,
  Home
} from "lucide-react";

// Get icon for service status
function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Na čekanju", variant: "outline" },
    scheduled: { label: "Zakazano", variant: "secondary" },
    in_progress: { label: "U procesu", variant: "default" },
    waiting_parts: { label: "Čeka delove", variant: "destructive" },
    completed: { label: "Završeno", variant: "outline" },
    cancelled: { label: "Otkazano", variant: "destructive" },
  };

  const config = statusConfig[status] || { label: status, variant: "outline" };
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}

// Format date to local format
function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("sr-ME");
}

// Get user initials from name
function getUserInitials(name: string) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word[0]?.toUpperCase() || '')
    .join('');
}

type DashboardStats = {
  activeCount: number;
  completedCount: number;
  pendingCount: number;
  clientCount: number;
  recentServices: (Service & { client?: Client, appliance?: { category?: ApplianceCategory } })[];
  recentClients: Client[];
  applianceStats: { categoryId: number, count: number, name?: string, icon?: string }[];
};

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setLocation] = useLocation();
  
  console.log("Dashboard komponenta se renderuje");
  
  // Koristimo refetch opciju za osvežavanje statistike
  const { 
    data: stats, 
    isLoading,
    error,
    refetch: refetchStats
  } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"]
  });

  // Handler za pregled detalja servisa
  const handleServiceDetails = (serviceId: number) => {
    setLocation(`/admin/services?serviceId=${serviceId}`);
  };

  // Handler za izmenu servisa
  const handleServiceEdit = (serviceId: number) => {
    setLocation(`/admin/services?edit=${serviceId}`);
  };

  // Handler za pregled detalja klijenta
  const handleClientDetails = (clientId: number) => {
    setLocation(`/clients/${clientId}`);
  };
  
  // Dohvatamo kategorije
  const { data: categories, error: categoriesError } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"]
  });
  
  // Dodajemo useEffect da osvežimo podatke kada se komponenta montira
  useEffect(() => {
    console.log("Dashboard useEffect se pokreće");
    
    try {
      // Osvežimo statistiku kada se prikaže dashboard
      refetchStats();
      
      // Postavimo interval za osvežavanje na svakih 5 sekundi
      const intervalId = setInterval(() => {
        refetchStats();
      }, 5000);
      
      // Čistimo interval pri demontiranju
      return () => clearInterval(intervalId);
    } catch (err) {
      console.error("Greška u useEffect:", err);
    }
  }, [refetchStats]);
  
  // Enrich appliance stats with category data
  const enrichedApplianceStats = stats?.applianceStats?.map(stat => {
    const category = categories?.find(c => c.id === stat.categoryId);
    return {
      ...stat,
      name: category?.name || "Nepoznato",
      icon: category?.icon || "devices"
    };
  })?.sort((a, b) => b.count - a.count) || [];
  
  // Calculate total for percentages
  const totalAppliances = enrichedApplianceStats?.reduce((sum, stat) => sum + stat.count, 0) || 1;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        closeMobileMenu={() => setSidebarOpen(false)} 
      />
      
      {/* Main content wrapper */}
      <div className="flex flex-col flex-1 overflow-hidden ml-0 lg:ml-64">
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 shadow-xl">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Home className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Glavni Administrativni Panel</h1>
                  <p className="text-blue-100">Upravljanje celim sistemom servisa</p>
                </div>
              </div>
              <div className="hidden md:flex space-x-3">
                <Button 
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => setLocation('/admin/services')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Upravljanje
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => refetchStats()}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Osvežiti
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Dashboard Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {isLoading ? (
                <>
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                </>
              ) : (
                <>
                  {/* Ukupno Servisa Card */}
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-sm font-medium">Aktivni Servisi</p>
                          <p className="text-3xl font-bold text-white">{stats?.activeCount || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                          <Activity className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Pending Servisi Card */}
                  <Card className="bg-gradient-to-br from-amber-500 to-orange-500 border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-amber-100 text-sm font-medium">Na Čekanju</p>
                          <p className="text-3xl font-bold text-white">{stats?.pendingCount || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                          <Clock className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Završeni Servisi Card */}
                  <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-sm font-medium">Završeni Servisi</p>
                          <p className="text-3xl font-bold text-white">{stats?.completedCount || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Klijenti Card */}
                  <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm font-medium">Ukupno Klijenata</p>
                          <p className="text-3xl font-bold text-white">{stats?.clientCount || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Recent Services */}
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BarChart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-800">Nedavni Servisi</CardTitle>
                      <p className="text-sm text-gray-600">Poslednji dodani servisi u sistem</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => setLocation('/admin/services')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Svi servisi
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6">
                    <Skeleton className="h-12 w-full mb-3" />
                    <Skeleton className="h-12 w-full mb-3" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-100 hover:bg-gray-50/50">
                          <TableHead className="font-semibold text-gray-700">ID</TableHead>
                          <TableHead className="font-semibold text-gray-700">Klijent</TableHead>
                          <TableHead className="font-semibold text-gray-700">Uređaj</TableHead>
                          <TableHead className="font-semibold text-gray-700">Status</TableHead>
                          <TableHead className="font-semibold text-gray-700">Datum</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700">Akcije</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(!stats?.recentServices || stats.recentServices.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              <div className="flex flex-col items-center space-y-2">
                                <Package className="w-8 h-8 text-gray-300" />
                                <span>Nema servisa za prikaz</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {stats?.recentServices?.map((service) => (
                          <TableRow key={service.id} className="hover:bg-blue-50/50 transition-colors">
                            <TableCell className="font-semibold text-blue-600">#{service.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                {service.client && (
                                  <>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-sm">
                                      <span className="text-xs font-medium">{getUserInitials(service.client.fullName)}</span>
                                    </div>
                                    <span className="font-medium text-gray-800">{service.client.fullName}</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-gray-700 font-medium">{service.appliance?.category?.name || "Nepoznat uređaj"}</span>
                            </TableCell>
                            <TableCell>{getStatusBadge(service.status)}</TableCell>
                            <TableCell className="text-gray-600">{formatDate(service.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                                  onClick={() => handleServiceDetails(service.id)}
                                  title="Pogledaj detalje"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8 w-8 p-0 border-gray-200 text-gray-600 hover:bg-gray-50"
                                  onClick={() => handleServiceEdit(service.id)}
                                  title="Izmeni servis"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Two Column Layout for Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Clients */}
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-800">Nedavni Klijenti</CardTitle>
                        <p className="text-sm text-gray-600">Poslednji registrovani klijenti</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-green-200 text-green-600 hover:bg-green-50"
                      onClick={() => setLocation('/clients')}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Svi klijenti
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-6">
                      <Skeleton className="h-12 w-full mb-3" />
                      <Skeleton className="h-12 w-full mb-3" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-100 hover:bg-gray-50/50">
                            <TableHead className="font-semibold text-gray-700">Ime</TableHead>
                            <TableHead className="font-semibold text-gray-700">Kontakt</TableHead>
                            <TableHead className="text-right font-semibold text-gray-700">Akcije</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(!stats?.recentClients || stats.recentClients.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                <div className="flex flex-col items-center space-y-2">
                                  <Users className="w-8 h-8 text-gray-300" />
                                  <span>Nema klijenata za prikaz</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          
                          {stats?.recentClients?.map((client) => (
                            <TableRow key={client.id} className="hover:bg-green-50/50 transition-colors">
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center shadow-sm">
                                    <span className="text-xs font-medium">{getUserInitials(client.fullName)}</span>
                                  </div>
                                  <span className="font-medium text-gray-800">{client.fullName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col space-y-1">
                                  <span className="text-gray-700 font-medium">{client.phone}</span>
                                  {client.email && <span className="text-sm text-gray-500">{client.email}</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8 w-8 p-0 border-green-200 text-green-600 hover:bg-green-50"
                                  onClick={() => handleClientDetails(client.id)}
                                  title="Pogledaj detalje klijenta"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Appliance Stats */}
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-800">Najčešći Uređaji</CardTitle>
                        <p className="text-sm text-gray-600">Statistike po kategorijama uređaja</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-purple-200 text-purple-600 hover:bg-purple-50"
                      onClick={() => setLocation('/admin/services')}
                    >
                      <BarChart className="w-4 h-4 mr-2" />
                      Detaljnije
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {enrichedApplianceStats.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <div className="flex flex-col items-center space-y-2">
                            <Package className="w-8 h-8 text-gray-300" />
                            <span>Nema podataka o uređajima</span>
                          </div>
                        </div>
                      )}
                      
                      {enrichedApplianceStats.map((stat, index) => (
                        <div key={stat.categoryId} className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <span className="text-xs font-bold">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-gray-800 font-semibold">{stat.name}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-600">{stat.count}</span>
                                <span className="text-sm text-gray-500">
                                  ({totalAppliances ? Math.round((stat.count / totalAppliances) * 100) : 0}%)
                                </span>
                              </div>
                            </div>
                            <Progress value={(stat.count / totalAppliances) * 100} className="h-3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Waiting for Parts Section */}
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-800">Servisi koji čekaju delove</CardTitle>
                    <p className="text-sm text-gray-600">Pregled servisa u stanju čekanja rezervnih delova</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <WaitingForPartsSection />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
