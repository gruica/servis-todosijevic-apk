import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, User, Settings, Calendar, FileText } from "lucide-react";
import { useLocation } from "wouter";

// Form schema
const createServiceSchema = z.object({
  clientId: z.string().min(1, "Klijent je obavezan"),
  applianceId: z.string().min(1, "Uređaj je obavezan"),
  description: z.string().min(1, "Opis problema je obavezan"),
  status: z.string().default("pending"),
  technicianId: z.string().optional(),
  scheduledDate: z.string().optional(),
  priority: z.string().default("medium"),
  notes: z.string().optional(),
});

type CreateServiceFormData = z.infer<typeof createServiceSchema>;

interface Client {
  id: number;
  fullName: string;
  email: string | null;
  phone: string;
  address: string | null;
  city: string | null;
}

interface Appliance {
  id: number;
  clientId: number;
  model: string | null;
  serialNumber: string | null;
  category: {
    id: number;
    name: string;
    icon: string;
  };
  manufacturer: {
    id: number;
    name: string;
  };
}

interface Technician {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  active: boolean;
}

export default function CreateService() {
  const [, setLocation] = useLocation();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateServiceFormData>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      clientId: "",
      applianceId: "",
      description: "",
      status: "pending",
      priority: "medium",
      technicianId: "",
      scheduledDate: "",
      notes: "",
    },
  });

  const watchedClientId = watch("clientId") || "";

  // Debug logging
  console.log("CreateService Debug:", {
    watchedClientId,
    clientIdType: typeof watchedClientId,
    watchedClientIdEmpty: !watchedClientId,
  });

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch appliances for selected client
  const { data: appliances = [], isLoading: appliancesLoading } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances", watchedClientId],
    queryFn: async () => {
      if (!watchedClientId) return [];
      const response = await apiRequest("GET", `/api/clients/${watchedClientId}/appliances`);
      return response.json();
    },
    enabled: !!watchedClientId,
  });

  // More debug logging
  console.log("CreateService Appliances Debug:", {
    appliances,
    appliancesLength: appliances.length,
    appliancesLoading,
    watchedClientId,
  });

  // Fetch technicians
  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: CreateServiceFormData) => {
      console.log("🔍 Mutation starting with data:", data);
      
      // Validate required fields
      if (!data.clientId || !data.applianceId) {
        throw new Error("Klijent i uređaj su obavezni");
      }

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

      console.log("🔍 Sending service data to API:", serviceData);

      try {
        const response = await apiRequest("POST", "/api/services", serviceData);
        console.log("🔍 API Response status:", response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("🔍 API Error response:", errorData);
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log("🔍 API Success response:", result);
        return result;
      } catch (error) {
        console.error("🔍 API Request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("🔍 Mutation success:", data);
      toast({
        title: "Servis kreiran",
        description: "Novi servis je uspešno kreiran.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      setLocation("/admin/services");
    },
    onError: (error: any) => {
      console.error("🔍 Mutation error:", error);
      toast({
        title: "Greška",
        description: error.message || "Greška pri kreiranju servisa.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateServiceFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Mutation state:", { 
      isPending: createServiceMutation.isPending, 
      isError: createServiceMutation.isError,
      error: createServiceMutation.error
    });
    
    // Dodatna validacija
    if (!data.clientId || !data.applianceId) {
      toast({
        title: "Greška",
        description: "Klijent i uređaj moraju biti odabrani",
        variant: "destructive",
      });
      return;
    }
    
    createServiceMutation.mutate(data);
  };

  const selectedClient = clients.find(c => c.id.toString() === watchedClientId);

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/admin/services")}
            className="mr-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nazad
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Kreiranje novog servisa</h1>
            <p className="text-muted-foreground mt-1">
              Dodajte novi servis u sistem
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    onValueChange={(value) => {
                      setValue("clientId", value);
                      setValue("applianceId", ""); // Reset appliance when client changes
                      setSelectedClientId(value); // Update local state too
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite klijenta..." />
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
                    disabled={!watchedClientId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite uređaj..." />
                    </SelectTrigger>
                    <SelectContent>
                      {appliances.map((appliance) => (
                        <SelectItem key={appliance.id} value={appliance.id.toString()}>
                          {appliance.category.name} - {appliance.manufacturer.name}
                          {appliance.model && ` (${appliance.model})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.applianceId && (
                    <p className="text-sm text-red-500 mt-1">{errors.applianceId.message}</p>
                  )}
                </div>
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
                  <Label htmlFor="technicianId">Serviser</Label>
                  <Select
                    value={watch("technicianId") || ""}
                    onValueChange={(value) => setValue("technicianId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite servisera..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Bez servisera</SelectItem>
                      {technicians.filter(t => t.active).map((tech) => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>
                          {tech.fullName} - {tech.specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="scheduledDate">Zakazano za</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    {...register("scheduledDate")}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Opis problema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Opis problema *</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Detaljno opišite problem sa uređajem..."
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Dodatne napomene</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Dodatne napomene ili specifične zahteve..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/admin/services")}
            >
              Otkaži
            </Button>
            <Button
              type="submit"
              disabled={createServiceMutation.isPending}
            >
              {createServiceMutation.isPending ? "Kreiranje..." : "Kreiraj servis"}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}