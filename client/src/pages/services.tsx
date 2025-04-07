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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Service, 
  Client, 
  Appliance, 
  ApplianceCategory, 
  Technician,
  insertServiceSchema, 
  serviceStatusEnum 
} from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Search, Eye, Filter } from "lucide-react";

const serviceFormSchema = insertServiceSchema.extend({
  clientId: z.coerce.number().min(1, "Obavezno polje"),
  applianceId: z.coerce.number().min(1, "Obavezno polje"),
  description: z.string().min(1, "Obavezno polje"),
  status: z.string(),
  createdAt: z.string(),
  technicianId: z.coerce.number().optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

// Get badge variant based on status
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

export default function Services() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const { toast } = useToast();
  
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  const { data: appliances } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances"],
  });
  
  const { data: technicians } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });
  
  const { data: categories } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"],
  });
  
  // Filter appliances by selected client
  const filteredAppliances = appliances?.filter(appliance => 
    !selectedClient || appliance.clientId === selectedClient
  );
  
  // Enrich services with client and appliance data
  const enrichedServices = services?.map(service => {
    const client = clients?.find(c => c.id === service.clientId);
    const appliance = appliances?.find(a => a.id === service.applianceId);
    const category = categories?.find(c => c.id === appliance?.categoryId);
    
    return {
      ...service,
      clientName: client?.fullName || "Nepoznato",
      applianceName: category?.name || "Nepoznat uređaj",
      icon: category?.icon || "devices",
    };
  });
  
  // Filter services based on search query and status filter
  const filteredServices = enrichedServices?.filter(service => {
    const matchesSearch = 
      service.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.applianceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || service.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Get status options for select component
  const statusOptions = [
    { value: "all", label: "Svi statusi" },
    { value: "pending", label: "Na čekanju" },
    { value: "scheduled", label: "Zakazano" },
    { value: "in_progress", label: "U procesu" },
    { value: "waiting_parts", label: "Čeka delove" },
    { value: "completed", label: "Završeno" },
    { value: "cancelled", label: "Otkazano" },
  ];
  
  // Service form
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      clientId: 0,
      applianceId: 0,
      description: "",
      status: "pending",
      technicianId: undefined,
      createdAt: new Date().toISOString().split('T')[0],
      scheduledDate: "",
      completedDate: "",
      technicianNotes: "",
      cost: "",
    },
  });
  
  // Create/Update service mutation
  const serviceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      if (selectedService) {
        // Update service
        const res = await apiRequest("PUT", `/api/services/${selectedService.id}`, data);
        return await res.json();
      } else {
        // Create new service
        const res = await apiRequest("POST", "/api/services", data);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: selectedService 
          ? "Servis uspešno ažuriran" 
          : "Servis uspešno dodat",
        description: "Podaci o servisu su sačuvani",
      });
      setIsDialogOpen(false);
      form.reset();
      setSelectedService(null);
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
  
  // Open dialog for adding new service
  const handleAddService = () => {
    setSelectedService(null);
    setSelectedClient(null);
    form.reset({
      clientId: 0,
      applianceId: 0,
      description: "",
      status: "pending",
      technicianId: undefined,
      createdAt: new Date().toISOString().split('T')[0],
      scheduledDate: "",
      completedDate: "",
      technicianNotes: "",
      cost: "",
    });
    setIsDialogOpen(true);
  };
  
  // Open dialog for editing service
  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setSelectedClient(service.clientId);
    form.reset({
      clientId: service.clientId,
      applianceId: service.applianceId,
      description: service.description,
      status: service.status,
      technicianId: service.technicianId,
      createdAt: service.createdAt,
      scheduledDate: service.scheduledDate || "",
      completedDate: service.completedDate || "",
      technicianNotes: service.technicianNotes || "",
      cost: service.cost || "",
    });
    setIsDialogOpen(true);
  };
  
  // Handle client change in form
  const handleClientChange = (clientId: string) => {
    setSelectedClient(parseInt(clientId));
    form.setValue("applianceId", 0);
  };
  
  // Submit service form
  const onSubmit = (data: ServiceFormValues) => {
    serviceMutation.mutate(data);
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
                <h2 className="text-2xl font-medium text-gray-800">Servisi</h2>
                <p className="text-gray-600">Upravljanje servisnim intervencijama</p>
              </div>
              <Button onClick={handleAddService}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj servis
              </Button>
            </div>
            
            {/* Search and filter */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Pretraga po klijentu, uređaju, opisu..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="pl-9">
                        <SelectValue placeholder="Filter po statusu" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
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
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Klijent</TableHead>
                          <TableHead>Uređaj</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Datum prijave</TableHead>
                          <TableHead>Opis</TableHead>
                          <TableHead className="text-right">Akcije</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredServices?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                              {searchQuery || statusFilter !== "all"
                                ? "Nema rezultata za vašu pretragu" 
                                : "Nema servisa za prikaz"}
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {filteredServices?.map((service) => (
                          <TableRow key={service.id}>
                            <TableCell className="font-medium">#{service.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full ${getAvatarColor(service.clientName)} text-white flex items-center justify-center mr-3`}>
                                  <span className="text-xs font-medium">{getUserInitials(service.clientName)}</span>
                                </div>
                                <span>{service.clientName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="material-icons text-primary mr-2">{service.icon}</span>
                                <span>{service.applianceName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(service.status)}</TableCell>
                            <TableCell>{formatDate(service.createdAt)}</TableCell>
                            <TableCell className="max-w-xs truncate">{service.description}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEditService(service)}
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEditService(service)}
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
      
      {/* Add/Edit Service Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedService ? "Izmeni servis" : "Dodaj novi servis"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Klijent</FormLabel>
                      <Select 
                        onValueChange={(value) => handleClientChange(value)} 
                        defaultValue={field.value.toString()}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite klijenta" />
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
                
                <FormField
                  control={form.control}
                  name="applianceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uređaj</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value.toString()}
                        value={field.value.toString()}
                        disabled={!selectedClient}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedClient ? "Izaberite uređaj" : "Prvo izaberite klijenta"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredAppliances?.map(appliance => {
                            const category = categories?.find(c => c.id === appliance.categoryId);
                            return (
                              <SelectItem key={appliance.id} value={appliance.id.toString()}>
                                {category?.name || "Uređaj"} {appliance.model ? `- ${appliance.model}` : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis problema</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detaljno opišite problem..." 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Na čekanju</SelectItem>
                          <SelectItem value="scheduled">Zakazano</SelectItem>
                          <SelectItem value="in_progress">U procesu</SelectItem>
                          <SelectItem value="waiting_parts">Čeka delove</SelectItem>
                          <SelectItem value="completed">Završeno</SelectItem>
                          <SelectItem value="cancelled">Otkazano</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="technicianId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviser</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite servisera" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nije dodeljeno</SelectItem>
                          {technicians?.map(technician => (
                            <SelectItem key={technician.id} value={technician.id.toString()}>
                              {technician.fullName}
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
                  name="createdAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum prijave</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zakazani datum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="completedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum završetka</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="technicianNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Napomene servisera</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Napomene..." 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena servisa</FormLabel>
                      <FormControl>
                        <Input placeholder="npr. 50 €" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={serviceMutation.isPending}>
                  {serviceMutation.isPending ? "Čuvanje..." : "Sačuvaj"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
