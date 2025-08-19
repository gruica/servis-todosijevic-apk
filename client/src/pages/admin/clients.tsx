import React, { useState, useMemo, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Users, 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  Edit,
  Trash2,
  Eye,
  Building,
  Calendar,
  FileText,
  BarChart3
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Client } from "@shared/schema";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Schema za editovanje klijenta
const editClientSchema = z.object({
  fullName: z.string().min(2, "Ime i prezime mora imati najmanje 2 karaktera").max(100, "Ime je predugačko"),
  email: z.string().email("Unesite validnu email adresu").or(z.literal("")).optional(),
  phone: z.string().min(6, "Broj telefona mora imati najmanje 6 brojeva")
    .regex(/^[+]?[\d\s()/-]{6,25}$/, "Broj telefona mora sadržati samo brojeve, razmake i znakove +()/-"),
  address: z.string().min(3, "Adresa mora imati najmanje 3 karaktera").or(z.literal("")).optional(),
  city: z.string().min(2, "Grad mora imati najmanje 2 karaktera").or(z.literal("")).optional(),
});

// Schema za kreiranje novog klijenta sa uređajem
const newClientSchema = z.object({
  fullName: z.string().min(2, "Ime i prezime mora imati najmanje 2 karaktera").max(100, "Ime je predugačko"),
  email: z.string().email("Unesite validnu email adresu").or(z.literal("")).optional(),
  phone: z.string().min(6, "Broj telefona mora imati najmanje 6 brojeva")
    .regex(/^[+]?[\d\s()/-]{6,25}$/, "Broj telefona mora sadržati samo brojeve, razmake i znakove +()/-"),
  address: z.string().min(3, "Adresa mora imati najmanje 3 karaktera").or(z.literal("")).optional(),
  city: z.string().min(2, "Grad mora imati najmanje 2 karaktera").or(z.literal("")).optional(),
  // Podaci o uređaju
  categoryId: z.number().int().positive("Kategorija je obavezna"),
  manufacturerId: z.number().int().positive("Proizvođač je obavezan"),
  model: z.string().min(1, "Model je obavezan").max(100, "Model je predugačak"),
  serialNumber: z.string().max(50, "Serijski broj je predugačak").or(z.literal("")).optional(),
  purchaseDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .or(z.literal(""))
    .optional()
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime()) && date <= new Date();
    }, "Datum kupovine ne može biti u budućnosti"),
  notes: z.string().max(500, "Napomene su predugačke").or(z.literal("")).optional(),
});

type EditClientFormValues = z.infer<typeof editClientSchema>;
type NewClientFormValues = z.infer<typeof newClientSchema>;

const AdminClientsPage = memo(function AdminClientsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Query za sve klijente
  const { data: clients = [], isLoading, error, refetch } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    staleTime: 5 * 60 * 1000, // 5 minuta
    gcTime: 10 * 60 * 1000, // 10 minuta
  });

  // Query za kategorije i proizvođače
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    staleTime: 30 * 60 * 1000, // 30 minuta
  });

  const { data: manufacturers = [] } = useQuery<any[]>({
    queryKey: ["/api/manufacturers"],
    staleTime: 30 * 60 * 1000, // 30 minuta
  });

  // Form za editovanje klijenta
  const form = useForm<EditClientFormValues>({
    resolver: zodResolver(editClientSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
    },
  });

  // Form za kreiranje novog klijenta sa uređajem
  const addForm = useForm<NewClientFormValues>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      categoryId: 0,
      manufacturerId: 0,
      model: "",
      serialNumber: "",
      purchaseDate: "",
      notes: "",
    },
  });

  // Mutacija za ažuriranje klijenta
  const updateClientMutation = useMutation({
    mutationFn: async (data: { id: number; client: EditClientFormValues }) => {
      const response = await fetch(`/api/clients/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.client),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Greška pri ažuriranju klijenta');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Klijent ažuriran",
        description: "Podaci o klijentu su uspešno ažurirani.",
      });
      setEditingClient(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutacija za kreiranje novog klijenta sa uređajem
  const addClientMutation = useMutation({
    mutationFn: async (data: NewClientFormValues) => {
      console.log("🔧 Kreiranje klijenta sa podacima:", data);
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Greška pri kreiranju klijenta');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Klijent kreiran",
        description: `Klijent ${data.fullName} je uspešno kreiran sa uređajem.`,
      });
      setShowAddDialog(false);
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutacija za brisanje klijenta
  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Greška pri brisanju klijenta');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Klijent obrisan",
        description: "Klijent je uspešno uklonjen iz sistema.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filtrirani klijenti
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    
    const query = searchQuery.toLowerCase().trim();
    return clients.filter(client => 
      client.fullName.toLowerCase().includes(query) ||
      client.phone.toLowerCase().includes(query) ||
      (client.email && client.email.toLowerCase().includes(query)) ||
      (client.address && client.address.toLowerCase().includes(query)) ||
      (client.city && client.city.toLowerCase().includes(query))
    );
  }, [clients, searchQuery]);

  // Funkcija za otvaranje edit dialoga
  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    form.reset({
      fullName: client.fullName,
      email: client.email || "",
      phone: client.phone,
      address: client.address || "",
      city: client.city || "",
    });
  };

  // Funkcija za submitovanje edit forme
  const onEditSubmit = (values: EditClientFormValues) => {
    if (!editingClient) return;
    
    updateClientMutation.mutate({
      id: editingClient.id,
      client: values
    });
  };

  // Funkcija za submitovanje add forme
  const onAddSubmit = (values: NewClientFormValues) => {
    addClientMutation.mutate(values);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Klijenti</h2>
            <p className="text-muted-foreground">Upravljanje klijentima sistema</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Klijenti</h2>
            <p className="text-muted-foreground">Upravljanje klijentima sistema</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Greška pri učitavanju klijenata</h3>
              <p className="text-muted-foreground mb-4">
                Došlo je do greške pri učitavanju klijenata.
              </p>
              <Button onClick={() => refetch()}>
                Pokušaj ponovo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Klijenti</h2>
          <p className="text-muted-foreground">
            Upravljanje klijentima sistema ({filteredClients.length} od {clients.length})
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novi klijent
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Pretražite klijente po imenu, telefonu, email-u ili adresi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? "Nema pronađenih klijenata" : "Nema klijenata"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? "Pokušajte sa drugačijim pretragom."
                  : "Dodajte prvog klijenta u sistem."
                }
              </p>
              {!searchQuery && (
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Dodaj klijenta
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="relative group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{client.fullName}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-3 w-3 mr-1" />
                      {client.phone}
                    </div>
                  </div>
                  <Badge variant="secondary">ID: {client.id}</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-2">
                {client.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-3 w-3 mr-2" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                
                {client.address && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 mr-2" />
                    <span className="truncate">
                      {client.address}{client.city ? `, ${client.city}` : ""}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-end gap-2 pt-2">
                  <Link href={`/admin/clients/${client.id}/analysis`}>
                    <Button
                      variant="outline"
                      size="sm"
                      title="Kompletna analiza klijenta"
                    >
                      <BarChart3 className="h-3 w-3" />
                    </Button>
                  </Link>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingClient(client)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClient(client)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Potvrdi brisanje klijenta</AlertDialogTitle>
                        <AlertDialogDescription>
                          Da li ste sigurni da želite da obrišete klijenta "{client.fullName}"? 
                          Ova akcija se ne može poništiti.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Otkaži</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteClientMutation.mutate(client.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={deleteClientMutation.isPending}
                        >
                          {deleteClientMutation.isPending ? "Briše..." : "Obriši"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Client Dialog */}
      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Izmeni klijenta</DialogTitle>
            <DialogDescription>
              Izmenite podatke o klijentu {editingClient?.fullName}.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ime i prezime</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                        <Input {...field} />
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
                      <FormLabel>Email (opciono)</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresa (opciono)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
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
                      <FormLabel>Grad (opciono)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingClient(null)}
                >
                  Otkaži
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateClientMutation.isPending}
                >
                  {updateClientMutation.isPending ? "Čuva..." : "Sačuvaj promene"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Client Details Dialog */}
      <Dialog open={!!viewingClient} onOpenChange={(open) => !open && setViewingClient(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalji klijenta</DialogTitle>
            <DialogDescription>
              Pregled svih podataka o klijentu {viewingClient?.fullName}.
            </DialogDescription>
          </DialogHeader>
          
          {viewingClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Osnovi podaci</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                      {viewingClient.fullName}
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      {viewingClient.phone}
                    </div>
                    {viewingClient.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        {viewingClient.email}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Lokacija</h4>
                  <div className="space-y-2 text-sm">
                    {viewingClient.address && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        {viewingClient.address}
                      </div>
                    )}
                    {viewingClient.city && (
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                        {viewingClient.city}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">System Information</h4>
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    ID klijenta: {viewingClient.id}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add New Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj novog klijenta sa uređajem</DialogTitle>
            <DialogDescription>
              Unesite podatke o klijentu i prvom uređaju koji će biti registrovan.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-6">
              {/* Podaci o klijentu */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Podaci o klijentu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ime i prezime *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Marko Petrović" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+381 60 123 4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (opciono)</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} value={field.value || ""} placeholder="marko@example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grad (opciono)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Beograd" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={addForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresa (opciono)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Kneza Miloša 10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Podaci o uređaju */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Podaci o uređaju</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategorija uređaja *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Izaberite kategoriju" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="manufacturerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proizvođač *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Izaberite proizvođača" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {manufacturers.map((manufacturer) => (
                              <SelectItem key={manufacturer.id} value={manufacturer.id.toString()}>
                                {manufacturer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="WAW28560EU" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serijski broj (opciono)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="12345678901234" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Datum kupovine (opciono)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={addForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Napomene o uređaju (opciono)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Dodatne informacije o uređaju..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Otkaži
                </Button>
                <Button 
                  type="submit" 
                  disabled={addClientMutation.isPending}
                >
                  {addClientMutation.isPending ? "Kreira..." : "Kreiraj klijenta"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default AdminClientsPage;