import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Potpuno nova i jednostavna implementacija stranice servisa
 * Bez TanStack Query, bez referenci na druge entitete, samo osnovni podaci
 */
export default function ServicesSafe() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dohvatanje servisa direktno preko fetch API-ja
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true);
        console.log("Učitavanje servisa...");
        
        const response = await fetch('/api/services');
        console.log("Status kod:", response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP greška: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Primljeni podaci:", typeof data, Array.isArray(data) ? data.length : "nije niz");
        
        // Obrada podataka
        const safeData = Array.isArray(data) ? data.map(service => ({
          id: service.id || 0,
          description: service.description || "Bez opisa",
          status: service.status || "pending",
          createdAt: service.createdAt || service.created_at || new Date().toISOString(),
        })) : [];
        
        console.log("Obrađeni podaci:", safeData.length);
        setServices(safeData);
        setError(null);
      } catch (err) {
        console.error("Greška pri učitavanju servisa:", err);
        setError(err instanceof Error ? err.message : "Nepoznata greška");
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Formatiranje datuma
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("sr-ME");
    } catch (error) {
      console.error("Greška pri formatiranju datuma:", dateString, error);
      return "Nevažeći datum";
    }
  };

  // Jednostavan prikaz statusa
  const getStatusBadge = (status: string) => {
    let variant = "outline";
    let label = status;
    
    switch(status) {
      case "pending": 
        label = "Na čekanju"; 
        break;
      case "scheduled": 
        variant = "secondary"; 
        label = "Zakazano"; 
        break;
      case "in_progress": 
        variant = "default"; 
        label = "U procesu"; 
        break;
      case "waiting_parts": 
        variant = "destructive"; 
        label = "Čeka delove"; 
        break;
      case "completed": 
        label = "Završeno"; 
        break;
      case "cancelled": 
        variant = "destructive"; 
        label = "Otkazano"; 
        break;
    }
    
    return (
      <Badge variant={variant as any}>
        {label}
      </Badge>
    );
  };

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
              <h1 className="text-2xl font-medium text-gray-800">Servisi (SIGURNA verzija)</h1>
              <p className="text-gray-600 mt-1">
                Ovo je ekstremno pojednostavljena verzija stranice servisa koja prikazuje samo najosnovnije podatke.
              </p>
            </div>
            
            {/* Debug informacije */}
            <Card className="mb-6 bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Dijagnostičke informacije</CardTitle>
              </CardHeader>
              <CardContent className="text-sm font-mono">
                <div className="bg-gray-100 p-3 rounded">
                  <p><strong>Učitano servisa:</strong> {services.length}</p>
                  <p><strong>Status učitavanja:</strong> {isLoading ? "U toku..." : "Završeno"}</p>
                  <p><strong>Greška:</strong> {error || "Nema"}</p>
                </div>
              </CardContent>
            </Card>
            
            {/* Display error message if exists */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
                <h3 className="font-medium">Greška pri učitavanju servisa</h3>
                <p className="mt-1">{error}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="destructive" 
                  className="mt-2"
                >
                  Osveži stranicu
                </Button>
              </div>
            )}
            
            {/* Services table */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-lg font-medium">Lista servisa</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="p-4">
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Opis</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {services.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                              Nema servisa za prikaz
                            </TableCell>
                          </TableRow>
                        ) : (
                          services.map((service) => (
                            <TableRow key={service.id}>
                              <TableCell className="font-medium">#{service.id}</TableCell>
                              <TableCell>{getStatusBadge(service.status)}</TableCell>
                              <TableCell>{formatDate(service.createdAt)}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {service.description || "Bez opisa"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="mt-6 text-center">
              <p className="text-gray-600 mb-2">
                Opcije za navigaciju:
              </p>
              <div className="flex justify-center space-x-4">
                <Button variant="outline" onClick={() => window.location.href = "/"}>
                  Početna stranica
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/simplified-services"}>
                  Pojednostavljeni servisi
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Osveži stranicu
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}