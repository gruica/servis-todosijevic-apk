import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Client, 
  Appliance,
  ApplianceCategory, 
  Manufacturer,
  insertApplianceSchema,
  Service
} from "@shared/schema";

// Prošireni interfejs za servise sa imenom servisera
interface ExtendedService extends Service {
  technicianName?: string;
  appliance?: {
    id: number;
    model?: string;
    serialNumber?: string;
    category?: {
      id: number;
      name: string;
    };
    manufacturer?: {
      id: number;
      name: string;
    };
  };
  technician?: {
    id: number;
    fullName: string;
    specialization?: string;
    phone?: string;
  };
  statusHistory?: Array<{
    id: number;
    serviceId: number;
    oldStatus: string;
    newStatus: string;
    createdAt: string;
    notes?: string;
  }>;
}

import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Pencil, 
  AlarmClock, 
  Calendar, 
  Tag,
  AlertCircle,
  Banknote
} from "lucide-react";

// Form schema za dodavanje novog uređaja
const applianceFormSchema = insertApplianceSchema.extend({
  clientId: z.number().min(1, "Obavezno polje"),
  categoryId: z.number().min(1, "Obavezno polje"),
  manufacturerId: z.number().min(1, "Obavezno polje"),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
});

type ApplianceFormValues = z.infer<typeof applianceFormSchema>;

export default function ClientDetails() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAppliance, setSelectedAppliance] = useState<Appliance | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const params = useParams<{ id: string }>();
  const clientId = parseInt(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Dobavljanje podataka o klijentu sa svim detaljima
  const { data: clientDetails, isLoading: isClientLoading, error } = useQuery<any, Error>({
    queryKey: ["/api/clients/details", clientId],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/clients/${clientId}/details`);
        if (!res.ok) {
          throw new Error("Klijent nije pronađen");
        }
        const data = await res.json();
        console.log("Detalji klijenta učitani:", data);
        return data;
      } catch (err) {
        console.error("Greška pri dobavljanju detalja klijenta:", err);
        throw err;
      }
    },
    retry: 1,
  });
  
  // Izdvajamo osnovne podatke klijenta za lakši pristup
  const client = clientDetails;
  
  // Upravljanje greškama i preusmeravanje
  useEffect(() => {
    if (error) {
      toast({
        title: "Greška",
        description: "Klijent nije pronađen",
        variant: "destructive",
      });
      navigate("/clients");
    }
  }, [error, toast, navigate]);

  // Koristimo uređaje iz clientDetails
  const appliances = clientDetails?.appliances || [];
  const isAppliancesLoading = isClientLoading;

  // Dobavljanje kategorija uređaja
  const { data: categories } = useQuery<ApplianceCategory[], Error>({
    queryKey: ["/api/categories"],
  });

  // Dobavljanje proizvođača
  const { data: manufacturers } = useQuery<Manufacturer[], Error>({
    queryKey: ["/api/manufacturers"],
  });

  // Direktno koristimo servise iz clientDetails-a umesto posebnog API poziva
  const services = clientDetails?.services || [];
  const isServicesLoading = isClientLoading;

  // Forma za dodavanje/izmenu uređaja
  const applianceForm = useForm<ApplianceFormValues>({
    resolver: zodResolver(applianceFormSchema),
    defaultValues: {
      clientId: clientId,
      categoryId: 0,
      manufacturerId: 0,
      model: "",
      serialNumber: "",
      purchaseDate: "",
      notes: "",
    },
  });

  // Mutacija za dodavanje/izmenu uređaja
  const applianceMutation = useMutation({
    mutationFn: async (data: ApplianceFormValues) => {
      if (selectedAppliance) {
        // Izmena uređaja
        const res = await apiRequest(`/api/appliances/${selectedAppliance.id}`, { method: "PUT", body: JSON.stringify(data) });
        return await res.json();
      } else {
        // Dodavanje novog uređaja
        const res = await apiRequest("/api/appliances", { method: "POST", body: JSON.stringify(data) });
        return await res.json();
      }
    },
    onSuccess: () => {
      // Osvežavamo podatke o klijentu da bi se prikazali novi uređaji
      queryClient.invalidateQueries({ queryKey: ["/api/clients/details", clientId] });
      toast({
        title: selectedAppliance 
          ? "Uređaj uspešno ažuriran" 
          : "Uređaj uspešno dodat",
        description: "Podaci o uređaju su sačuvani",
      });
      setIsDialogOpen(false);
      applianceForm.reset({
        clientId: clientId,
        categoryId: 0,
        manufacturerId: 0,
        model: "",
        serialNumber: "",
        purchaseDate: "",
        notes: "",
      });
      setSelectedAppliance(null);
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: `Neuspešno čuvanje uređaja: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Priprema forme za dodavanje novog uređaja
  const handleAddAppliance = () => {
    setSelectedAppliance(null);
    applianceForm.reset({
      clientId: clientId,
      categoryId: 0,
      manufacturerId: 0,
      model: "",
      serialNumber: "",
      purchaseDate: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  // Priprema forme za izmenu uređaja
  const handleEditAppliance = (appliance: Appliance) => {
    setSelectedAppliance(appliance);
    applianceForm.reset({
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

  // Submit forme za uređaj
  const onApplianceSubmit = (data: ApplianceFormValues) => {
    applianceMutation.mutate(data);
  };

  // Funkcija za dobijanje naziva kategorije
  const getCategoryName = (categoryId: number) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.name || "Nepoznato";
  };

  // Funkcija za dobijanje naziva proizvođača
  const getManufacturerName = (manufacturerId: number) => {
    const manufacturer = manufacturers?.find(m => m.id === manufacturerId);
    return manufacturer?.name || "Nepoznato";
  };

  // Funkcija za formatiranje datuma
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Nije definisano";
    return new Date(dateString).toLocaleDateString('sr-RS');
  };

  // State za filter servisa i prikaz detalja
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [isServiceDetailsOpen, setIsServiceDetailsOpen] = useState(false);
  const [selectedServiceDetails, setSelectedServiceDetails] = useState<ExtendedService | null>(null);

  // Filtriranje servisa po statusu
  const filteredServices = services ? 
    (serviceFilter === "all" ? 
      services : 
      services.filter((service: any) => service.status === serviceFilter)) : 
    [];

  // Priprema samo 5 najnovijih servisa za prikaz u tabeli "Nedavni servisi"
  const recentServices = services?.slice(0, 5).sort((a: any, b: any) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  // Funkcija za dobijanje stilova statusa servisa
  const getStatusStyles = (status: string): string => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "waiting_parts": return "bg-amber-100 text-amber-800";
      case "scheduled": return "bg-purple-100 text-purple-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800"; // pending i ostalo
    }
  };
  
  // Funkcija za prevod statusa servisa
  const translateStatus = (status: string): string => {
    switch (status) {
      case "pending": return "Na čekanju";
      case "scheduled": return "Zakazano";
      case "in_progress": return "U procesu";
      case "waiting_parts": return "Čeka delove";
      case "completed": return "Završeno";
      case "cancelled": return "Otkazano";
      default: return status;
    }
  };
  
  // Otvaranje dijaloga za detalje servisa
  const handleViewServiceDetails = (service: ExtendedService) => {
    setSelectedServiceDetails(service);
    setIsServiceDetailsOpen(true);
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
            {/* Back button and title */}
            <div className="flex items-center mb-6">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/clients")}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Nazad
              </Button>
              
              <div>
                <h2 className="text-2xl font-medium text-gray-800">
                  {isClientLoading ? <Skeleton className="h-8 w-64" /> : (client as Client)?.fullName}
                </h2>
                <p className="text-gray-600">Detalji klijenta</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Client info card */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Informacije o klijentu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isClientLoading ? (
                    <>
                      <Skeleton className="h-6 w-full mb-2" />
                      <Skeleton className="h-6 w-full mb-2" />
                      <Skeleton className="h-6 w-full mb-2" />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-4">
                          <span className="text-xl font-medium">{(client as Client)?.fullName.charAt(0)}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">{(client as Client)?.fullName}</h3>
                          <p className="text-gray-500">Klijent</p>
                        </div>
                      </div>
                      
                      <div className="pt-4 space-y-3">
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-500 mr-2" />
                          <span>{(client as Client)?.phone || "Nije dostupno"}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-500 mr-2" />
                          <span>{(client as Client)?.email || "Nije dostupno"}</span>
                        </div>
                        
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                          <span>
                            {(client as Client)?.address ? (client as Client).address : "Adresa nije dostupna"}
                            {(client as Client)?.city && `, ${(client as Client).city}`}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Appliances with service history */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>Uređaji klijenta</CardTitle>
                    <CardDescription>Pregled svih uređaja sa istorijom servisa</CardDescription>
                  </div>
                  <Button onClick={handleAddAppliance}>
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj uređaj
                  </Button>
                </CardHeader>
                <CardContent>
                  {isClientLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {clientDetails?.appliances?.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          Nema uređaja za prikaz
                        </div>
                      ) : (
                        clientDetails?.appliances?.map((appliance: any) => (
                          <div key={appliance.id} className="mb-8 border rounded-lg overflow-hidden">
                            {/* Kartica uređaja */}
                            <div className="bg-blue-50 p-4 border-b flex justify-between items-center">
                              <div>
                                <h3 className="text-lg font-semibold text-blue-800">
                                  {appliance.category?.name || "Nepoznata kategorija"} 
                                  {appliance.model && <span className="ml-2 font-normal">({appliance.model})</span>}
                                </h3>
                                <p className="text-sm text-blue-600">
                                  {appliance.manufacturer?.name || "Nepoznat proizvođač"}
                                  {appliance.serialNumber && <span className="ml-2">S/N: {appliance.serialNumber}</span>}
                                </p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8"
                                onClick={() => handleEditAppliance(appliance)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Izmeni
                              </Button>
                            </div>
                            
                            {/* Servisi ovog uređaja */}
                            {appliance.services && appliance.services.length > 0 ? (
                              <div className="p-4">
                                <h4 className="text-sm font-medium mb-3 text-gray-700">Istorija servisa</h4>
                                <div className="space-y-4">
                                  {appliance.services.map((service: any) => (
                                    <div key={service.id} className="border rounded-md p-3 bg-white">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusStyles(service.status)}`}>
                                            {translateStatus(service.status)}
                                          </span>
                                          <span className="text-sm text-gray-500 ml-2">
                                            {formatDate(service.createdAt)}
                                          </span>
                                        </div>
                                        {service.cost && (
                                          <div className="text-sm font-medium">
                                            <Banknote className="h-3 w-3 inline mr-1" />
                                            {service.cost}€
                                          </div>
                                        )}
                                      </div>
                                      
                                      <p className="text-sm text-gray-700 mb-2">{service.description}</p>
                                      
                                      {service.technician && (
                                        <div className="flex items-center mt-3 text-sm text-gray-600">
                                          <div className="bg-gray-100 rounded-full h-6 w-6 flex items-center justify-center mr-2">
                                            <span className="text-xs">{service.technician.fullName.charAt(0)}</span>
                                          </div>
                                          <div>
                                            <p className="font-medium">{service.technician.fullName}</p>
                                            {service.technician.specialization && (
                                              <p className="text-xs">{service.technician.specialization}</p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Status timeline */}
                                      {service.statusHistory && service.statusHistory.length > 0 && (
                                        <div className="mt-3 pt-3 border-t">
                                          <p className="text-xs font-medium text-gray-500 mb-2">Istorija statusa:</p>
                                          <div className="space-y-2">
                                            {service.statusHistory.map((history: any, index: number) => (
                                              <div key={index} className="flex items-start">
                                                <div className="mr-2 mt-0.5">
                                                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                                                  {index < service.statusHistory.length - 1 && (
                                                    <div className="h-6 w-0.5 bg-blue-200 ml-1.5"></div>
                                                  )}
                                                </div>
                                                <div className="flex-1">
                                                  <p className="text-xs font-medium">
                                                    {translateStatus(history.newStatus)} 
                                                    <span className="font-normal text-gray-500 ml-1">
                                                      ({formatDate(history.createdAt)})
                                                    </span>
                                                  </p>
                                                  {history.notes && (
                                                    <p className="text-xs text-gray-500">{history.notes}</p>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 text-center text-gray-500 text-sm">
                                Nema servisa za ovaj uređaj
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Svi servisi klijenta */}
              <Card className="lg:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>Istorija servisa</CardTitle>
                    <CardDescription>Pregled svih servisa klijenta</CardDescription>
                  </div>
                  <Select defaultValue="all" onValueChange={(value) => setServiceFilter(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter statusa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Svi servisi</SelectItem>
                      <SelectItem value="pending">Na čekanju</SelectItem>
                      <SelectItem value="scheduled">Zakazano</SelectItem>
                      <SelectItem value="in_progress">U procesu</SelectItem>
                      <SelectItem value="waiting_parts">Čeka delove</SelectItem>
                      <SelectItem value="completed">Završeno</SelectItem>
                      <SelectItem value="cancelled">Otkazano</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  {isServicesLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Datum</TableHead>
                            <TableHead>Uređaj</TableHead>
                            <TableHead>Opis</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Serviser</TableHead>
                            <TableHead>Cena</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(!filteredServices || filteredServices.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                                Nema servisa za prikaz
                              </TableCell>
                            </TableRow>
                          )}
                          
                          {filteredServices?.map((service: any) => {
                            // Koristi detalje o uređajima i serviserima iz clientDetails
                            const appliance = service.appliance;
                            
                            return (
                              <TableRow 
                                key={service.id} 
                                className="hover:bg-blue-50 transition-colors cursor-pointer"
                                onClick={() => handleViewServiceDetails(service as ExtendedService)}
                              >
                                <TableCell>
                                  {formatDate(service.createdAt)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{appliance?.category?.name || "Nepoznata kategorija"}</span>
                                    {appliance?.manufacturer?.name && (
                                      <span className="text-xs text-gray-500">{appliance?.manufacturer?.name}{appliance?.model ? ` (${appliance.model})` : ''}</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">
                                  {service.description}
                                </TableCell>
                                <TableCell>
                                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(service.status)}`}>
                                    {translateStatus(service.status)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {service.technician ? (
                                    <div className="flex items-center">
                                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2">
                                        <span className="text-xs">{service.technician.fullName.charAt(0)}</span>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium">{service.technician.fullName}</span>
                                        {service.technician.specialization && (
                                          <p className="text-xs text-gray-500">{service.technician.specialization}</p>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">Nije dodeljen</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {service.cost ? (
                                    <div className="font-medium">
                                      <Banknote className="h-3 w-3 inline mr-1 text-green-600" />
                                      {service.cost}€
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
          
          <Form {...applianceForm}>
            <form onSubmit={applianceForm.handleSubmit(onApplianceSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={applianceForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategorija</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : "0"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite kategoriju" />
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
                  control={applianceForm.control}
                  name="manufacturerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proizvođač</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : "0"}
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
                      <Textarea 
                        placeholder="Dodatne informacije o uređaju..." 
                        rows={3}
                        value={field.value || ""} 
                        onChange={field.onChange} 
                      />
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
      
      {/* Service Details Dialog */}
      <Dialog open={isServiceDetailsOpen} onOpenChange={setIsServiceDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Detalji servisa
            </DialogTitle>
          </DialogHeader>
          
          {selectedServiceDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyles(selectedServiceDetails.status)}`}>
                    {translateStatus(selectedServiceDetails.status)}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Datum</h4>
                  <p className="text-sm">{formatDate(selectedServiceDetails.createdAt)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Opis problema</h4>
                <p className="text-sm">{selectedServiceDetails.description}</p>
              </div>
              
              {selectedServiceDetails.appliance && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Uređaj</h4>
                  <div className="text-sm">
                    <p><b>Kategorija:</b> {selectedServiceDetails.appliance.category?.name}</p>
                    <p><b>Proizvođač:</b> {selectedServiceDetails.appliance.manufacturer?.name}</p>
                    {selectedServiceDetails.appliance.model && (
                      <p><b>Model:</b> {selectedServiceDetails.appliance.model}</p>
                    )}
                    {selectedServiceDetails.appliance.serialNumber && (
                      <p><b>Serijski broj:</b> {selectedServiceDetails.appliance.serialNumber}</p>
                    )}
                  </div>
                </div>
              )}
              
              {selectedServiceDetails.technician && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Serviser</h4>
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2">
                      <span className="text-xs">{selectedServiceDetails.technician.fullName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium">{selectedServiceDetails.technician.fullName}</p>
                      {selectedServiceDetails.technician.specialization && (
                        <p className="text-xs text-gray-600">{selectedServiceDetails.technician.specialization}</p>
                      )}
                      {selectedServiceDetails.technician.phone && (
                        <p className="text-xs text-gray-600">
                          <Phone className="h-3 w-3 inline mr-1" />
                          {selectedServiceDetails.technician.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {selectedServiceDetails.cost && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Cena servisa</h4>
                  <p className="text-lg font-bold">
                    <Banknote className="h-4 w-4 inline mr-1 text-green-600" />
                    {selectedServiceDetails.cost}€
                  </p>
                </div>
              )}
              
              {selectedServiceDetails.technicianNotes && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Napomene servisera</h4>
                  <p className="text-sm">{selectedServiceDetails.technicianNotes}</p>
                </div>
              )}
              
              {/* Status Timeline */}
              {selectedServiceDetails?.statusHistory && selectedServiceDetails.statusHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Istorija statusa</h4>
                  <div className="border rounded-md p-3 bg-gray-50">
                    <div className="space-y-3">
                      {selectedServiceDetails.statusHistory.map((history: any, index: number) => (
                        <div key={index} className="flex items-start">
                          <div className="mr-3 mt-1">
                            <div className="h-4 w-4 rounded-full bg-blue-500"></div>
                            {index < (selectedServiceDetails.statusHistory?.length || 0) - 1 && (
                              <div className="h-8 w-0.5 bg-blue-200 ml-2"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">
                              {translateStatus(history.newStatus)} 
                            </p>
                            <p className="text-xs text-gray-600 mb-1">
                              {formatDate(history.createdAt)}
                            </p>
                            {history.notes && (
                              <p className="text-sm text-gray-700">{history.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsServiceDetailsOpen(false)}>
              Zatvori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}