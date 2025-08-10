import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, User, Settings, Calendar, AlertTriangle } from "lucide-react";

// Types
interface Client {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}

interface Appliance {
  id: number;
  clientId: number;
  model: string;
  serialNumber: string;
  category: { id: number; name: string; icon: string };
  manufacturer: { id: number; name: string };
}

interface Technician {
  id: number;
  fullName: string;
  email: string;
  phone: string;
}

// Form schema
const createServiceSchema = z.object({
  clientId: z.string().min(1, "Klijent je obavezan"),
  applianceId: z.string().min(1, "Uređaj je obavezan"),
  description: z.string().min(10, "Opis mora imati najmanje 10 karaktera"),
  status: z.string().default("pending"),
  technicianId: z.string().optional(),
  scheduledDate: z.string().optional(),
  priority: z.string().default("medium"),
  notes: z.string().optional(),
});

type CreateServiceFormData = z.infer<typeof createServiceSchema>;

export default function CreateService() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateServiceFormData>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      clientId: "",
      applianceId: "",
      description: "",
      status: "pending",
      technicianId: "",
      scheduledDate: "",
      priority: "medium",
      notes: "",
    },
  });

  // Watch client selection
  const watchedClientId = watch("clientId");

  // State for appliances
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loadingAppliances, setLoadingAppliances] = useState(false);

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch technicians
  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  // Effect to fetch appliances when client changes
  useEffect(() => {
    if (!watchedClientId || watchedClientId === "") {
      setAppliances([]);
      setValue("applianceId", "");
      return;
    }

    const fetchAppliances = async () => {
      console.log("🔧 Fetching appliances for client:", watchedClientId);
      setLoadingAppliances(true);
      
      try {
        const response = await apiRequest(`/api/clients/${watchedClientId}/appliances`);
        console.log("🔧 Appliances response:", response);
        
        if (Array.isArray(response)) {
          setAppliances(response);
          console.log("🔧 Set appliances:", response.length, "items");
        } else {
          console.log("🔧 Response is not array, setting empty array");
          setAppliances([]);
        }
      } catch (error) {
        console.error("🔧 Error fetching appliances:", error);
        setAppliances([]);
        toast({
          title: "Greška",
          description: "Greška pri učitavanju aparata",
          variant: "destructive",
        });
      } finally {
        setLoadingAppliances(false);
      }
    };

    fetchAppliances();
  }, [watchedClientId, setValue, toast]);

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: CreateServiceFormData) => {
      const serviceData = {
        clientId: parseInt(data.clientId),
        applianceId: parseInt(data.applianceId),
        description: data.description,
        status: data.status,
        technicianId: data.technicianId && data.technicianId !== "" && data.technicianId !== "none" ? parseInt(data.technicianId) : null,
        scheduledDate: data.scheduledDate || null,
        priority: data.priority,
        notes: data.notes || null,
      };

      return await apiRequest("/api/services", {
        method: "POST",
        body: JSON.stringify(serviceData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspeh",
        description: "Servis je uspešno kreiran",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      setLocation("/admin/services");
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri kreiranju servisa",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateServiceFormData) => {
    createServiceMutation.mutate(data);
  };

  const selectedClient = clients.find(c => c.id.toString() === watchedClientId);

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kreiraj novi servis</h1>
            <p className="text-gray-600">Dodaj novi servisni zahtev za klijenta</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Klijent i uređaj
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="clientId">Klijent *</Label>
                <Select
                  value={watchedClientId || ""}
                  onValueChange={(value) => setValue("clientId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberite klijenta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.fullName} - {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && (
                  <p className="text-sm text-red-500 mt-1">{errors.clientId.message}</p>
                )}
              </div>

              {selectedClient && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">{selectedClient.fullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedClient.phone}</p>
                  {selectedClient.address && (
                    <p className="text-sm text-muted-foreground">
                      {selectedClient.address}, {selectedClient.city}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="applianceId">Uređaj *</Label>
                <Select
                  value={watch("applianceId") || ""}
                  onValueChange={(value) => setValue("applianceId", value)}
                  disabled={!watchedClientId || loadingAppliances}
                >
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        !watchedClientId 
                          ? "Prvo odaberite klijenta..." 
                          : loadingAppliances 
                          ? "Učitavanje aparata..." 
                          : appliances.length === 0
                          ? "Nema registrovanih aparata"
                          : "Odaberite uređaj..."
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingAppliances ? (
                      <SelectItem value="loading" disabled>
                        Učitavanje aparata...
                      </SelectItem>
                    ) : appliances.length > 0 ? (
                      appliances.map((appliance) => (
                        <SelectItem key={appliance.id} value={appliance.id.toString()}>
                          {appliance.category?.name || "Nepoznata kategorija"} - {appliance.manufacturer?.name || "Nepoznat proizvođač"}
                          {appliance.model && ` (${appliance.model})`}
                        </SelectItem>
                      ))
                    ) : watchedClientId ? (
                      <SelectItem value="no-appliances" disabled>
                        Nema registrovanih aparata
                      </SelectItem>
                    ) : (
                      <SelectItem value="no-client" disabled>
                        Odaberite klijenta
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.applianceId && (
                  <p className="text-sm text-red-500 mt-1">{errors.applianceId.message}</p>
                )}
              </div>

              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <p>Debug: Client ID = {watchedClientId || "none"}</p>
                  <p>Debug: Appliances count = {appliances.length}</p>
                  <p>Debug: Loading = {loadingAppliances.toString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Detalji servisa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Opis problema *</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Opišite problem sa uređajem..."
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch("status") || "pending"}
                  onValueChange={(value) => setValue("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Na čekanju</SelectItem>
                    <SelectItem value="assigned">Dodeljeno</SelectItem>
                    <SelectItem value="scheduled">Zakazano</SelectItem>
                    <SelectItem value="in_progress">U toku</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Prioritet</Label>
                <Select
                  value={watch("priority") || "medium"}
                  onValueChange={(value) => setValue("priority", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Nizak</SelectItem>
                    <SelectItem value="medium">Srednji</SelectItem>
                    <SelectItem value="high">Visok</SelectItem>
                    <SelectItem value="urgent">Hitno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="technicianId">Tehničar</Label>
                <Select
                  value={watch("technicianId") || ""}
                  onValueChange={(value) => setValue("technicianId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberite tehničara (opciono)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Bez dodeljenog tehničara</SelectItem>
                    {technicians.map((technician) => (
                      <SelectItem key={technician.id} value={technician.id.toString()}>
                        {technician.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="scheduledDate">Zakazani datum</Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  {...register("scheduledDate")}
                />
              </div>

              <div>
                <Label htmlFor="notes">Napomene</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Dodatne napomene..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={createServiceMutation.isPending}
              className="flex-1"
            >
              {createServiceMutation.isPending ? "Kreiranje..." : "Kreiraj servis"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/admin/services")}
            >
              Otkaži
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}