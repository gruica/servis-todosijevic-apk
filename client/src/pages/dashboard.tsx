import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ApplianceCategory, Client, Service } from "@shared/schema";

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
      
      // Ne postavljamo automatsko osvežavanje jer može da prouzrokuje nestabilnost
      // Korisnik može ručno osvežiti stranicu ako je potrebno
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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        closeMobileMenu={() => setSidebarOpen(false)} 
      />
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="container mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-medium text-gray-800">Kontrolna tabla</h2>
              <p className="text-gray-600">Pregled servisa i statistika</p>
            </div>

            {/* Stats Cards */}
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="mb-2 sm:mb-0">
                  <h3 className="text-blue-800 font-medium">Administrativni alati</h3>
                  <p className="text-blue-600 text-sm">Koristite brze linkove za pristup administrativnim funkcijama</p>
                </div>
                <div className="flex gap-2">
                  <Link href="/services/new">
                    <Button size="sm" className="text-sm bg-green-600 hover:bg-green-700 text-white">
                      <span className="material-symbols-outlined mr-2">add</span>
                      Napravi servis
                    </Button>
                  </Link>
                  <Link href="/admin/user-verification">
                    <Button size="sm" className="text-sm bg-blue-600 hover:bg-blue-700 text-white">
                      <span className="material-symbols-outlined mr-2">verified_user</span>
                      Verifikacija korisnika
                    </Button>
                  </Link>
                  <Link href="/users">
                    <Button variant="outline" size="sm" className="text-sm text-blue-600 border-blue-300">
                      <span className="material-symbols-outlined mr-2">group</span>
                      Upravljanje korisnicima
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
                
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {isLoading ? (
                <>
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </>
              ) : (
                <>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <div className="rounded-full bg-blue-100 p-3 mr-4">
                          <span className="text-primary">Alat</span>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Aktivni servisi</p>
                          <p className="text-2xl font-medium text-gray-800">{stats?.activeCount || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <div className="rounded-full bg-amber-100 p-3 mr-4">
                          <span className="text-amber-500">Osoba</span>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Klijenti</p>
                          <p className="text-2xl font-medium text-gray-800">{stats?.clientCount || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <div className="rounded-full bg-green-100 p-3 mr-4">
                          <span className="text-green-500">Završeno</span>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Završeni servisi</p>
                          <p className="text-2xl font-medium text-gray-800">{stats?.completedCount || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <div className="rounded-full bg-amber-100 p-3 mr-4">
                          <span className="text-amber-500">Na čekanju</span>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Na čekanju</p>
                          <p className="text-2xl font-medium text-gray-800">{stats?.pendingCount || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Recent Services */}
            <Card className="mb-6">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-lg font-medium text-gray-800">Nedavni servisi</h3>
                <Link href="/services" className="text-primary text-sm hover:underline flex items-center">
                  Svi servisi
                  <span className="ml-1 text-sm">→</span>
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-4">
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Klijent</TableHead>
                        <TableHead>Uređaj</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">Akcije</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!stats?.recentServices || stats.recentServices.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                            Nema servisa za prikaz
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {stats?.recentServices?.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">#{service.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {service.client && (
                                <>
                                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-3">
                                    <span className="text-xs font-medium">{getUserInitials(service.client.fullName)}</span>
                                  </div>
                                  <span className="text-gray-800">{service.client.fullName}</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{service.appliance?.category?.name || "Nepoznat uređaj"}</TableCell>
                          <TableCell>{getStatusBadge(service.status)}</TableCell>
                          <TableCell>{formatDate(service.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="mr-2">
                              Detalji
                            </Button>
                            <Button variant="ghost" size="sm">
                              Izmeni
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>

            {/* Two Column Layout for Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Clients */}
              <Card>
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <h3 className="text-lg font-medium text-gray-800">Nedavni klijenti</h3>
                  <Link href="/clients" className="text-primary text-sm hover:underline flex items-center">
                    Svi klijenti
                    <span className="ml-1 text-sm">→</span>
                  </Link>
                </div>
                
                <div className="overflow-hidden">
                  {isLoading ? (
                    <div className="p-4">
                      <Skeleton className="h-12 w-full mb-2" />
                      <Skeleton className="h-12 w-full mb-2" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ime</TableHead>
                          <TableHead>Kontakt</TableHead>
                          <TableHead className="text-right">Akcije</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(!stats?.recentClients || stats.recentClients.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                              Nema klijenata za prikaz
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {stats?.recentClients?.map((client) => (
                          <TableRow key={client.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center mr-3">
                                  <span className="text-xs font-medium">{getUserInitials(client.fullName)}</span>
                                </div>
                                <span className="text-gray-800">{client.fullName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{client.phone}</span>
                                {client.email && <span className="text-xs">{client.email}</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                Detalji
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </Card>

              {/* Appliance Stats */}
              <Card>
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <h3 className="text-lg font-medium text-gray-800">Najčešći uređaji</h3>
                  <Link href="/appliances" className="text-primary text-sm hover:underline flex items-center">
                    Svi uređaji
                    <span className="ml-1 text-sm">→</span>
                  </Link>
                </div>
                
                <CardContent className="p-4">
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
                        <div className="text-center py-4 text-gray-500">
                          Nema podataka o uređajima
                        </div>
                      )}
                      
                      {enrichedApplianceStats.map((stat) => (
                        <div key={stat.categoryId} className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-primary flex items-center justify-center mr-3">
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-800 font-medium">{stat.name}</span>
                              <span className="text-gray-500">
                                {totalAppliances ? Math.round((stat.count / totalAppliances) * 100) : 0}%
                              </span>
                            </div>
                            <Progress value={(stat.count / totalAppliances) * 100} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
