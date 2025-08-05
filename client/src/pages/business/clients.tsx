import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Client, insertClientSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Pencil, Plus, Search, User, Users } from "lucide-react";
import BusinessLayout from "@/components/layout/business-layout";

// Form schema for client editing
const clientFormSchema = insertClientSchema.pick({
  fullName: true,
  email: true,
  phone: true,
  address: true,
  city: true,
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function BusinessClients() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get all clients for business partner
  const { data: clients, isLoading, error } = useQuery<Client[]>({
    queryKey: ["/api/business/clients"],
  });

  // Filtered clients based on search
  const filteredClients = clients?.filter(client => {
    if (!searchQuery.trim()) return true;
    
    const searchTerm = searchQuery.toLowerCase();
    return (
      client.fullName.toLowerCase().includes(searchTerm) ||
      client.phone.toLowerCase().includes(searchTerm) ||
      (client.email && client.email.toLowerCase().includes(searchTerm)) ||
      (client.address && client.address.toLowerCase().includes(searchTerm)) ||
      (client.city && client.city.toLowerCase().includes(searchTerm))
    );
  });

  // Form for editing client
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

  // Edit client mutation
  const editClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      if (!selectedClient) return;

      const res = await apiRequest("PUT", `/api/business/clients/${selectedClient.id}`, data);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Greška pri ažuriranju klijenta");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/clients"] });
      toast({
        title: "Klijent uspešno ažuriran",
        description: "Podaci o klijentu su uspešno sačuvani",
      });
      setIsDialogOpen(false);
      setSelectedClient(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri ažuriranju klijenta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle edit client
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

  // Form submit
  const onSubmit = (data: ClientFormValues) => {
    editClientMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <BusinessLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight">Klijenti</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </BusinessLayout>
    );
  }

  if (error) {
    return (
      <BusinessLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight">Klijenti</h2>
          </div>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-600">Greška pri učitavanju klijenata</p>
            </CardContent>
          </Card>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Klijenti</h2>
            <p className="text-muted-foreground">
              Upravljanje podacima klijenata
            </p>
          </div>
          <Button onClick={() => navigate("/business/clients/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Novi klijent
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pretraži klijente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Clients Grid */}
        {filteredClients && filteredClients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{client.fullName}</CardTitle>
                        <p className="text-sm text-gray-600">{client.phone}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClient(client)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    {client.email && (
                      <p className="text-gray-600">
                        <span className="font-medium">Email:</span> {client.email}
                      </p>
                    )}
                    {client.address && (
                      <p className="text-gray-600">
                        <span className="font-medium">Adresa:</span> {client.address}
                      </p>
                    )}
                    {client.city && (
                      <p className="text-gray-600">
                        <span className="font-medium">Grad:</span> {client.city}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "Nema rezultata pretrage" : "Nema klijenata"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery 
                  ? "Promenite kriterijum pretrage ili dodajte novog klijenta"
                  : "Počnite sa dodavanjem klijenata u sistem"
                }
              </p>
              <Button onClick={() => navigate("/business/clients/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj prvog klijenta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Client Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Izmeni podatke klijenta</DialogTitle>
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
                          <Input placeholder="ime@domen.com" value={field.value || ""} onChange={field.onChange} />
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
                        <Input placeholder="Ulica i broj" value={field.value || ""} onChange={field.onChange} />
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
                        <Input placeholder="Grad" value={field.value || ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={editClientMutation.isPending}>
                    {editClientMutation.isPending ? "Čuvanje..." : "Sačuvaj izmene"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </BusinessLayout>
  );
}