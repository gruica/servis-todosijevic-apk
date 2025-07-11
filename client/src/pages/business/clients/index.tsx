import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import BusinessLayout from "@/components/layout/business-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Eye, User } from "lucide-react";

interface Client {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
}

export default function BusinessClientsIndex() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dobijanje klijenata preko business API-ja
  const { data: clients, isLoading, error } = useQuery<Client[]>({
    queryKey: ["/api/business/clients"],
  });
  
  // Filtriranje klijenata na osnovu pretrage
  const filteredClients = clients?.filter((client: Client) => {
    if (!client) return false;
    
    const nameMatch = client.fullName ? 
      client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const emailMatch = client.email ? 
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const phoneMatch = client.phone ? 
      client.phone.includes(searchQuery) : false;
    
    return nameMatch || emailMatch || phoneMatch;
  });
  
  // Funkcija za dobijanje inicijala
  function getUserInitials(name: string | null | undefined) {
    if (!name) return "?";
    
    return name
      .split(' ')
      .map(word => word?.[0]?.toUpperCase() || "")
      .join('') || "?";
  }
  
  // Funkcija za dobijanje boje avatara
  function getAvatarColor(name: string | null | undefined) {
    if (!name) return "bg-gray-400";
    
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-yellow-500", 
      "bg-indigo-500", "bg-purple-500", "bg-pink-500", 
      "bg-red-500", "bg-orange-500", "bg-teal-500"
    ];
    
    const nameSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const colorIndex = nameSum % colors.length;
    return colors[colorIndex];
  }
  
  if (error) {
    return (
      <BusinessLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-600">
                <h3 className="text-lg font-semibold mb-2">Greška prilikom učitavanja klijenata</h3>
                <p>Molimo pokušajte ponovo kasnije.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </BusinessLayout>
    );
  }
  
  return (
    <BusinessLayout>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Klijenti</h2>
            <p className="text-gray-600">Pregled i upravljanje klijentima</p>
          </div>
          <Button onClick={() => navigate("/business/clients/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj novog klijenta
          </Button>
        </div>
        
        {/* Pretraga */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Pretraži po imenu, email-u ili telefonu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-gray-500">
                Pronađeno {filteredClients?.length || 0} klijenata koji odgovaraju pretrazi "{searchQuery}"
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Tabela klijenata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Lista klijenata</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="p-4">
                <Skeleton className="h-12 w-full mb-2" />
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
                      <TableHead>Ime i prezime</TableHead>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Adresa</TableHead>
                      <TableHead className="text-right">Akcije</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                          {searchQuery 
                            ? "Nema rezultata za vašu pretragu" 
                            : "Nema klijenata za prikaz"}
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {filteredClients?.map((client: Client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full ${getAvatarColor(client.fullName)} text-white flex items-center justify-center mr-3`}>
                              <span className="text-xs font-medium">{getUserInitials(client.fullName)}</span>
                            </div>
                            <span className="font-medium">{client.fullName || "Nepoznat klijent"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {client.phone ? (
                              <span>{client.phone}</span>
                            ) : (
                              <span className="text-gray-400">Telefon nije unet</span>
                            )}
                            {client.email && <span className="text-xs text-gray-500">{client.email}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.address && client.city ? (
                            `${client.address}, ${client.city}`
                          ) : client.address || client.city || (
                            <span className="text-gray-400">Nije definisano</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/business/services/new?clientId=${client.id}`)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Kreiraj servis
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
      </div>
    </BusinessLayout>
  );
}