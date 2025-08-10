import { useState, useEffect, useCallback } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Client, 
  insertClientSchema, 
  ApplianceCategory, 
  Manufacturer, 
  insertApplianceSchema
} from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Pencil, Plus, Search, User, AlertCircle, ArrowRight, ExternalLink, Eye, Trash2 } from "lucide-react";

const clientFormSchema = insertClientSchema.extend({
  fullName: z.string().min(1, "Obavezno polje"),
  phone: z.string().min(1, "Obavezno polje"),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

// Form schema za dodavanje novog uređaja
const applianceFormSchema = insertApplianceSchema.extend({
  clientId: z.coerce.number(),
  categoryId: z.coerce.number(),
  manufacturerId: z.coerce.number(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
});

type ApplianceFormValues = z.infer<typeof applianceFormSchema>;

export default function Clients() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showAddAppliancePrompt, setShowAddAppliancePrompt] = useState(false);
  const [newClientId, setNewClientId] = useState<number | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const { toast } = useToast();
  

  
  // Dodajemo error handling i logging za dijagnostiku
  const { data: clients, isLoading, error: clientsError } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });
  

  
  // Filter clients based on search query
  const filteredClients = clients?.filter((client: Client) => {
    // Implementiramo null provjere za sva polja koja koristimo
    if (!client) return false;
    
    try {
      // Provera imena klijenta uz sigurnosne provere
      const nameMatch = client.fullName ? 
        client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        
      // Provera emaila uz sigurnosne provere
      const emailMatch = client.email ? 
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        
      // Provera telefona uz sigurnosne provere  
      const phoneMatch = client.phone ? 
        client.phone.includes(searchQuery) : false;
      
      return nameMatch || emailMatch || phoneMatch;
    } catch (error) {
      console.error("Greška pri filtriranju klijenta:", error, client);
      return false; // U slučaju greške, klijent neće biti prikazan
    }
  });
  
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
        const res = await apiRequest(`/api/clients/${selectedClient.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
          headers: { "Content-Type": "application/json" }
        });
        return await res.json();
      } else {
        // Create new client
        const res = await apiRequest("/api/clients", {
          method: "POST",
          body: JSON.stringify(data),
          headers: { "Content-Type": "application/json" }
        });
        return await res.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: selectedClient 
          ? "Klijent uspešno ažuriran" 
          : "Klijent uspešno dodat",
        description: "Podaci o klijentu su sačuvani",
      });
      setIsDialogOpen(false);
      form.reset();
      
      // Ako je novi klijent, prikaži prompt za dodavanje uređaja
      if (!selectedClient && data && data.data) {

        setNewClientId(data.data.id);
        setShowAddAppliancePrompt(true);
      }
      
      setSelectedClient(null);
    },
    onError: (error) => {
      console.error("🚨 Greška pri čuvanju klijenta:", error);
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri čuvanju podataka",
        variant: "destructive",
      });
    },
  });

  // Delete client mutation
  const deleteMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest(`/api/clients/${clientId}`, {
        method: "DELETE"
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Klijent uspešno obrisan",
        description: "Klijent je uklonjen iz sistema",
      });
      setClientToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri brisanju klijenta",
        variant: "destructive",
      });
    },
  });
  
  // Open dialog for adding new client
  const handleAddClient = () => {
    console.log("🆕 handleAddClient pozvan - dodavanje novog klijenta");
    form.reset();
    setSelectedClient(null);
    setIsDialogOpen(true);
  };
  
  // Open dialog for editing client
  const handleEditClient = (client: Client) => {
    console.log("🔧 handleEditClient pozvan sa klijentom:", {
      id: client.id,
      fullName: client.fullName,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city
    });
    
    setSelectedClient(client);
    
    const formData = {
      fullName: client.fullName,
      email: client.email || "",
      phone: client.phone,
      address: client.address || "",
      city: client.city || "",
    };
    
    console.log("🔧 Form data za reset:", formData);
    form.reset(formData);
    
    console.log("🔧 Postavljam isDialogOpen na true, trenutna vrednost:", isDialogOpen);
    setIsDialogOpen(true);
    
    console.log("🔧 selectedClient postavljen na:", client.id, client.fullName);
  };

  // Handle delete client
  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
  };

  // Confirm delete client
  const confirmDeleteClient = () => {
    if (clientToDelete) {
      deleteMutation.mutate(clientToDelete.id);
    }
  };
  
  // Submit client form
  const onSubmit = (data: ClientFormValues) => {
    clientMutation.mutate(data);
  };
  
  // Get user initials from name
  function getUserInitials(name: string | null | undefined) {
    if (!name) return "?";
    
    try {
      return name
        .split(' ')
        .map(word => word?.[0]?.toUpperCase() || "")
        .join('') || "?";
    } catch (error) {
      console.error(`Greška pri dobijanju inicijala za ime: ${name}`, error);
      return "?";
    }
  }
  
  // Get color for avatar based on name
  function getAvatarColor(name: string | null | undefined) {
    if (!name) return "bg-gray-400"; // Sigurna boja za slučaj da nema imena
    
    try {
      // Algoritam za dobijanje konzistentne boje za različita imena
      const colors = [
        "bg-blue-500", "bg-green-500", "bg-yellow-500", 
        "bg-indigo-500", "bg-purple-500", "bg-pink-500", 
        "bg-red-500", "bg-orange-500", "bg-teal-500"
      ];
      
      const nameSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const colorIndex = nameSum % colors.length;
      return colors[colorIndex];
    } catch (error) {
      console.error(`Greška pri dobijanju boje za ime: ${name}`, error);
      return "bg-gray-400"; // Sigurna boja u slučaju greške
    }
  }

  // Get manufacturer and category data
  const { data: categories, error: categoriesError } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"]
  });
  
  const { data: manufacturers, error: manufacturersError } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"]
  });
  
  // Form za dodavanje uređaja
  const applianceForm = useForm<ApplianceFormValues>({
    resolver: zodResolver(applianceFormSchema),
    defaultValues: {
      clientId: 0,
      categoryId: 0,
      manufacturerId: 0,
      model: "",
      serialNumber: "",
      purchaseDate: "",
      notes: "",
    },
  });
  
  // Mutation za dodavanje novog uređaja
  const applianceMutation = useMutation({
    mutationFn: async (data: ApplianceFormValues) => {
      const res = await apiRequest("/api/appliances", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
      const result = await res.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appliances"] });
      toast({
        title: "Uređaj uspešno dodat",
        description: "Podaci o uređaju su sačuvani",
      });
      setShowAddAppliancePrompt(false);
      applianceForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri čuvanju podataka",
        variant: "destructive",
      });
    },
  });
  
  // Navigacija na stranicu uređaja
  const [_, navigate] = useLocation();
  
  // Resetuje prikaz dijaloga za dodavanje uređaja
  const handleDismissAppliancePrompt = () => {
    setShowAddAppliancePrompt(false);
    setNewClientId(null);
  };
  
  // Priprema formu za dodavanje uređaja za novog klijenta
  const handleAddApplianceForNewClient = useCallback(() => {
    if (newClientId) {
      applianceForm.reset({
        clientId: newClientId,
        categoryId: 0,
        manufacturerId: 0,
        model: "",
        serialNumber: "",
        purchaseDate: "",
        notes: "",
      });
    }
  }, [applianceForm, newClientId]);
  
  // Efekat za inicijalizaciju forme za uređaj kada se otvori dialog
  useEffect(() => {
    if (showAddAppliancePrompt && newClientId) {
      handleAddApplianceForNewClient();
    }
  }, [showAddAppliancePrompt, newClientId, handleAddApplianceForNewClient]);
  
  // Submit forme za uređaj
  const onApplianceSubmit = (data: ApplianceFormValues) => {
    // Proveri da li su obavezna polja popunjena
    if (!data.categoryId || data.categoryId === 0) {
      toast({
        title: "Greška",
        description: "Morate izabrati kategoriju uređaja",
        variant: "destructive",
      });
      return;
    }
    if (!data.manufacturerId || data.manufacturerId === 0) {
      toast({
        title: "Greška", 
        description: "Morate izabrati proizvođača",
        variant: "destructive",
      });
      return;
    }
    
    applianceMutation.mutate(data);
  };
  
  // Funkcija je prethodno definisana, ne treba nam duplikat
  
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
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Pretraži po imenu, email-u ili telefonu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4"
                    />
                    {searchQuery && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-0 h-9 w-9"
                        onClick={() => setSearchQuery("")}
                        aria-label="Obriši pretragu"
                      >
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70">
                          <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor"></path>
                        </svg>
                      </Button>
                    )}
                  </div>
                  {searchQuery && (
                    <p className="mt-2 text-sm text-gray-500">
                      Pronađeno {filteredClients?.length || 0} klijenata koji odgovaraju pretrazi "{searchQuery}"
                    </p>
                  )}
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
                              <div className="flex justify-end space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log("👁️ EYE DUGME KLIKNUTO za client ID:", client.id, "fullName:", client.fullName);
                                    console.log("👁️ Pozivam navigate sa putanjom:", `/clients/${client.id}`);
                                    
                                    // Immediately navigate and return false to prevent other handlers
                                    setTimeout(() => navigate(`/clients/${client.id}`), 0);
                                    console.log("👁️ Navigate pozvan uspešno");
                                    return false;
                                  }}
                                  title="Detalji klijenta"
                                >
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => {
                                    console.log("🔧 KLIK na Edit dugme za klijenta:", client.fullName, "ID:", client.id);
                                    handleEditClient(client);
                                  }}
                                  title="Izmeni"
                                >
                                  <Pencil className="h-4 w-4 text-primary" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleDeleteClient(client)}
                                  title="Obriši"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
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
          </div>
        </main>
      </div>
      
      {/* Add/Edit Client Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        console.log("🔧 Dialog onOpenChange pozvan sa:", open, "selectedClient:", selectedClient?.fullName || "null");
        
        if (!open) {
          console.log("🔧 Dialog se zatvara - resetujem selectedClient");
          setSelectedClient(null);
        }
        
        setIsDialogOpen(open);
      }}>
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
                <Button type="submit" disabled={clientMutation.isPending}>
                  {clientMutation.isPending ? "Čuvanje..." : "Sačuvaj"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog za dodavanje uređaja odmah nakon kreiranja klijenta */}
      <Dialog 
        open={showAddAppliancePrompt} 
        onOpenChange={setShowAddAppliancePrompt}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Dodaj uređaj za novog klijenta</DialogTitle>
          </DialogHeader>
          
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Da li želite da dodate uređaj za novog klijenta?</AlertTitle>
            <AlertDescription>
              Odmah dodajte uređaj za klijenta kojeg ste upravo kreirali.
            </AlertDescription>
          </Alert>
          
          <Form {...applianceForm}>
            <form onSubmit={applianceForm.handleSubmit(onApplianceSubmit)} className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={applianceForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tip uređaja</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value > 0 ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite tip" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.length ? (
                            categories.map((category: ApplianceCategory) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="loading" disabled>
                              Učitavanje kategorija...
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={applianceForm.control}
                  name="manufacturerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proizvođač</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value > 0 ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite proizvođača" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {manufacturers?.length ? (
                            manufacturers.map((manufacturer: Manufacturer) => (
                              <SelectItem key={manufacturer.id} value={manufacturer.id.toString()}>
                                {manufacturer.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="loading" disabled>
                              Učitavanje proizvođača...
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={applianceForm.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="Model uređaja" value={field.value || ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={applianceForm.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serijski broj</FormLabel>
                      <FormControl>
                        <Input placeholder="Serijski broj" value={field.value || ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={applianceForm.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum kupovine</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={applianceForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Napomene</FormLabel>
                    <FormControl>
                      <Input placeholder="Dodatne informacije" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDismissAppliancePrompt}
                >
                  Odustani
                </Button>
                <Button 
                  type="submit" 
                  disabled={applianceMutation.isPending}
                >
                  {applianceMutation.isPending ? "Čuvanje..." : "Sačuvaj"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Brisanje klijenta</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Da li ste sigurni da želite da obrišete klijenta "{clientToDelete?.fullName}"?</p>
            <p className="text-sm text-gray-500 mt-2">
              Ova akcija je nepovratna. Klijent će biti uklonjen iz sistema.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClientToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Odustani
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteClient}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Brisanje..." : "Obriši"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
