import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Service } from "@shared/schema";

/**
 * Pojednostavljena verzija stranice servisa za rešavanje problema bijelog ekrana
 * Ovo je privremeno rešenje koje samo prikazuje osnovne podatke o servisima
 */
export default function SimplifiedServices() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Dohvati samo podatke o servisima
  const { data: services, isLoading, error } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  
  function getStatusBadge(status: string) {
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
  }
  
  function formatDate(dateString: string | null) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("sr-ME");
  }
  
  // Provera grešaka i ispisivanje u konzoli
  if (error) {
    console.error("Greška pri dohvatanju servisa:", error);
  }

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
              <h1 className="text-2xl font-medium text-gray-800">Servisi (Pojednostavljen prikaz)</h1>
              <p className="text-gray-600 mt-1">
                Ovo je privremena pojednostavljena verzija stranice servisa zbog problema sa prikazom.
                Prikazani su samo osnovni podaci.
              </p>
            </div>
            
            {/* Display error message if exists */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
                <h3 className="font-medium">Greška pri učitavanju servisa</h3>
                <p className="mt-1">{(error as any).message || "Nije moguće dohvatiti podatke o servisima."}</p>
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
                          <TableHead>Datum prijave</TableHead>
                          <TableHead>Opis</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!services || services.length === 0 ? (
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
            
            <div className="mt-8 text-center p-4 bg-blue-50 rounded-md">
              <p className="text-blue-700">
                Puna verzija stranice servisa je trenutno nedostupna i radi se na popravci.
              </p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => window.location.href = "/"}
              >
                Povratak na početnu stranicu
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}