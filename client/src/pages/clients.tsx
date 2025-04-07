import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Client, insertClientSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Search, User } from "lucide-react";

const clientFormSchema = insertClientSchema.extend({
  fullName: z.string().min(1, "Obavezno polje"),
  phone: z.string().min(1, "Obavezno polje"),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function Clients() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  // Filter clients based on search query
  const filteredClients = clients?.filter(client => 
    client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    client.phone.includes(searchQuery)
  );
  
  // Add new client form
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
    },
  });
  
  // Create/Update client mutation
  const clientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      if (selectedClient) {
        // Update client
        const res = await apiRequest("PUT", `/api/clients/${selectedClient.id}`, data);
        return await res.json();
      } else {
        // Create new client
        const res = await apiRequest("POST", "/api/clients", data);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: selectedClient 
          ? "Klijent uspešno ažuriran" 
          : "Klijent uspešno dodat",
        description: "Podaci o klijentu su sačuvani",
      });
      setIsDialogOpen(false);
      form.reset();
      setSelectedClient(null);
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri čuvanju podataka",
        variant: "destructive",
      });
    },
  });
  
  // Open dialog for adding new client
  const handleAddClient = () => {
    form.reset();
    setSelectedClient(null);
    setIsDialogOpen(true);
  };
  
  // Open dialog for editing client
  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    form.reset({
      fullName: client.fullName,
      email: client.email || "",
      phone: client.phone,
      address: client.address || "",
      city: client.city || "",
    });
    setIsDialogOpen(true);
  };
  
  // Submit client form
  const onSubmit = (data: ClientFormValues) => {
    clientMutation.mutate(data);
  };
  
  // Get user initials from name
  function getUserInitials(name: string) {
    return name
      .split(' ')
      .map(word => word[0].toUpperCase())
      .join('');
  }
  
  // Generate random color based on name
  function getAvatarColor(name: string) {
    const colors = ["bg-blue-500", "bg-green-500", "bg-amber-500", "bg-red-500", "bg-purple-500", "bg-pink-500"];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-medium text-gray-800">Klijenti</h2>
                <p className="text-gray-600">Upravljanje klijentima</p>
              </div>
              <Button onClick={handleAddClient}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj klijenta
              </Button>
            </div>
            
            {/* Search and filter */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Pretraga klijenata po imenu, e-mailu ili telefonu..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Clients table */}
            <Card>
              <CardHeader className="pb-0">
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
                        
                        {filteredClients?.map((client) => (
                          <TableRow key={client.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full ${getAvatarColor(client.fullName)} text-white flex items-center justify-center mr-3`}>
                                  <span className="text-xs font-medium">{getUserInitials(client.fullName)}</span>
                                </div>
                                <span className="font-medium">{client.fullName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{client.phone}</span>
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
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEditClient(client)}
                              >
                                <Pencil className="h-4 w-4 text-primary" />
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
        </main>
      </div>
      
      {/* Add/Edit Client Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedClient ? "Izmeni klijenta" : "Dodaj novog klijenta"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ime i prezime</FormLabel>
                    <FormControl>
                      <Input placeholder="Marko Petrović" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="069 123 456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="ime@domen.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Ulica i broj" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grad</FormLabel>
                    <FormControl>
                      <Input placeholder="Grad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={clientMutation.isPending}>
                  {clientMutation.isPending ? "Čuvanje..." : "Sačuvaj"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
