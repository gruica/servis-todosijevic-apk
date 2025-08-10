import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Appliance, ApplianceCategory, Client, Manufacturer, insertApplianceSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

const applianceFormSchema = insertApplianceSchema.extend({
  clientId: z.coerce.number().min(1, "Obavezno polje"),
  categoryId: z.coerce.number().min(1, "Obavezno polje"),
  manufacturerId: z.coerce.number().min(1, "Obavezno polje"),
});

type ApplianceFormValues = z.infer<typeof applianceFormSchema>;

export default function Appliances() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppliance, setSelectedAppliance] = useState<Appliance | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: appliances, isLoading } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances"],
  });
  
  const { data: categories } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"],
  });
  
  const { data: manufacturers } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"],
  });
  
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  // Get category, manufacturer, and client data for each appliance
  const enrichedAppliances = appliances?.map(appliance => {
    const category = categories?.find(c => c.id === appliance.categoryId);
    const manufacturer = manufacturers?.find(m => m.id === appliance.manufacturerId);
    const client = clients?.find(c => c.id === appliance.clientId);
    
    return {
      ...appliance,
      categoryName: category?.name || "Nepoznato",
      manufacturerName: manufacturer?.name || "Nepoznato",
      clientName: client?.fullName || "Nepoznato",
    };
  });
  
  // Filter appliances based on search query
  const filteredAppliances = enrichedAppliances?.filter(appliance => 
    appliance.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    appliance.manufacturerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    appliance.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (appliance.model && appliance.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (appliance.serialNumber && appliance.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Add new appliance form
  const form = useForm<ApplianceFormValues>({
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
  
  // Create/Update appliance mutation
  const applianceMutation = useMutation({
    mutationFn: async (data: ApplianceFormValues) => {
      if (selectedAppliance) {
        // Update appliance
        const res = await apiRequest(`/api/appliances/${selectedAppliance.id}`, { method: "PUT", body: JSON.stringify(data) });
        return await res.json();
      } else {
        // Create new appliance
        const res = await apiRequest("/api/appliances", { method: "POST", body: JSON.stringify(data) });
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appliances"] });
      toast({
        title: selectedAppliance 
          ? "Uređaj uspešno ažuriran" 
          : "Uređaj uspešno dodat",
        description: "Podaci o uređaju su sačuvani",
      });
      setIsDialogOpen(false);
      form.reset();
      setSelectedAppliance(null);
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri čuvanju podataka",
        variant: "destructive",
      });
    },
  });

  // Delete appliance mutation
  const deleteApplianceMutation = useMutation({
    mutationFn: async (applianceId: number) => {
      const res = await apiRequest(`/api/appliances/${applianceId}`, { method: "DELETE" });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appliances"] });
      toast({
        title: "Uređaj uspešno obrisan",
        description: "Uređaj je uklonjen iz sistema",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri brisanju uređaja",
        variant: "destructive",
      });
    },
  });
  
  // Open dialog for adding new appliance
  const handleAddAppliance = () => {
    form.reset({
      clientId: 0,
      categoryId: 0,
      manufacturerId: 0,
      model: "",
      serialNumber: "",
      purchaseDate: "",
      notes: "",
    });
    setSelectedAppliance(null);
    setIsDialogOpen(true);
  };
  
  // Open dialog for editing appliance
  const handleEditAppliance = (appliance: Appliance) => {
    setSelectedAppliance(appliance);
    form.reset({
      clientId: appliance.clientId,
      categoryId: appliance.categoryId,
      manufacturerId: appliance.manufacturerId,
      model: appliance.model || "",
      serialNumber: appliance.serialNumber || "",
      purchaseDate: appliance.purchaseDate || "",
      notes: appliance.notes || "",
    });
    setIsDialogOpen(true);
  };

  // Handle deleting appliance
  const handleDeleteAppliance = (appliance: Appliance) => {
    if (window.confirm(`Da li ste sigurni da želite da obrišete uređaj "${appliance.model || appliance.categoryName}"?`)) {
      deleteApplianceMutation.mutate(appliance.id);
    }
  };
  
  // Submit appliance form
  const onSubmit = (data: ApplianceFormValues) => {
    applianceMutation.mutate(data);
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-medium text-gray-800">Bijela tehnika</h2>
                <p className="text-gray-600">Upravljanje uređajima</p>
              </div>
              <Button onClick={handleAddAppliance}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj uređaj
              </Button>
            </div>
            
            {/* Search and filter */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Pretraga uređaja po tipu, proizvođaču, modelu..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Appliances table */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-lg font-medium">Lista uređaja</CardTitle>
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
                          <TableHead>Tip uređaja</TableHead>
                          <TableHead>Proizvođač</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Serijski broj</TableHead>
                          <TableHead>Vlasnik</TableHead>
                          <TableHead className="text-right">Akcije</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAppliances?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                              {searchQuery 
                                ? "Nema rezultata za vašu pretragu" 
                                : "Nema uređaja za prikaz"}
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {filteredAppliances?.map((appliance) => (
                          <TableRow key={appliance.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="flex items-center">
                                  <span className="material-icons text-primary mr-2">
                                    {categories?.find(c => c.id === appliance.categoryId)?.icon || "devices"}
                                  </span>
                                  <span>{appliance.categoryName}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{appliance.manufacturerName}</TableCell>
                            <TableCell>{appliance.model || <span className="text-gray-400">Nije definisano</span>}</TableCell>
                            <TableCell>{appliance.serialNumber || <span className="text-gray-400">Nije definisano</span>}</TableCell>
                            <TableCell>{appliance.clientName}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleEditAppliance(appliance)}
                                >
                                  <Pencil className="h-4 w-4 text-primary" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleDeleteAppliance(appliance)}
                                  disabled={deleteApplianceMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
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
      
      {/* Add/Edit Appliance Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {selectedAppliance ? "Izmeni uređaj" : "Dodaj novi uređaj"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vlasnik</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberite vlasnika" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map(client => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tip uređaja</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite tip" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map(category => (
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
                  control={form.control}
                  name="manufacturerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proizvođač</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite proizvođača" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {manufacturers?.map(manufacturer => (
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
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="Model uređaja" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serijski broj</FormLabel>
                      <FormControl>
                        <Input placeholder="Serijski broj" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum kupovine</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Napomene</FormLabel>
                    <FormControl>
                      <Input placeholder="Dodatne informacije" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={applianceMutation.isPending}>
                  {applianceMutation.isPending ? "Čuvanje..." : "Sačuvaj"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
