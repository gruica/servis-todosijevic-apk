import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { sr } from "date-fns/locale";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle, Edit, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { insertMaintenanceScheduleSchema, maintenanceFrequencyEnum, type MaintenanceFrequency } from "@shared/schema";

// Tipovi
type Appliance = {
  id: number;
  clientId: number;
  modelName: string;
  serialNumber: string;
  installationDate: string | null;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  status: string;
  notes: string | null;
  categoryId: number;
  manufacturerId: number;
};

type MaintenanceSchedule = {
  id: number;
  applianceId: number;
  name: string;
  nextMaintenanceDate: string;
  frequency: MaintenanceFrequency;
  description: string | null;
  lastMaintenanceDate: string | null;
  customIntervalDays?: number | null;
  isActive: boolean;
  createdAt: string;
  appliance?: Appliance;
};

// Šema za validaciju forme
const maintenanceScheduleFormSchema = insertMaintenanceScheduleSchema.extend({
  nextMaintenanceDate: z.string().min(1, "Datum održavanja je obavezan"),
});

const MaintenanceSchedulesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  // Dohvati sve planove održavanja
  const {
    data: maintenanceSchedules = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/maintenance-schedules"],
    queryFn: async () => {
      const response = await fetch("/api/maintenance-schedules");
      if (!response.ok) {
        throw new Error("Greška pri dobijanju planova održavanja");
      }
      return response.json();
    },
  });

  // Dohvati sve uređaje
  const { data: appliances = [] } = useQuery({
    queryKey: ["/api/appliances"],
    queryFn: async () => {
      const response = await fetch("/api/appliances");
      if (!response.ok) {
        throw new Error("Greška pri dobijanju uređaja");
      }
      return response.json();
    },
  });

  // Forma za dodavanje/izmenu plana održavanja
  const form = useForm<z.infer<typeof maintenanceScheduleFormSchema>>({
    resolver: zodResolver(maintenanceScheduleFormSchema),
    defaultValues: {
      applianceId: undefined,
      name: "",
      nextMaintenanceDate: "",
      frequency: "monthly",
      description: "",
      isActive: true
    },
  });

  // Mutacija za kreiranje plana održavanja
  const createMaintenanceScheduleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof maintenanceScheduleFormSchema>) => {
      const response = await apiRequest("POST", "/api/maintenance-schedules", data);
      if (!response.ok) {
        throw new Error("Greška pri kreiranju plana održavanja");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno",
        description: "Plan održavanja je uspešno kreiran",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      setIsDialogOpen(false);
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

  // Mutacija za ažuriranje plana održavanja
  const updateMaintenanceScheduleMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: z.infer<typeof maintenanceScheduleFormSchema>;
    }) => {
      const response = await apiRequest("PATCH", `/api/maintenance-schedules/${id}`, data);
      if (!response.ok) {
        throw new Error("Greška pri ažuriranju plana održavanja");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno",
        description: "Plan održavanja je uspešno ažuriran",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      setIsDialogOpen(false);
      setSelectedSchedule(null);
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

  // Mutacija za brisanje plana održavanja
  const deleteMaintenanceScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/maintenance-schedules/${id}`);
      if (!response.ok) {
        throw new Error("Greška pri brisanju plana održavanja");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno",
        description: "Plan održavanja je uspešno obrisan",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      setIsDeleteDialogOpen(false);
      setSelectedSchedule(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Podnošenje forme
  const onSubmit = (values: z.infer<typeof maintenanceScheduleFormSchema>) => {
    if (selectedSchedule) {
      updateMaintenanceScheduleMutation.mutate({
        id: selectedSchedule.id,
        data: values,
      });
    } else {
      createMaintenanceScheduleMutation.mutate(values);
    }
  };

  // Otvaranje dijaloga za izmenu
  const handleEditSchedule = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    form.reset({
      applianceId: schedule.applianceId,
      name: schedule.name,
      nextMaintenanceDate: schedule.nextMaintenanceDate.split("T")[0],
      frequency: schedule.frequency,
      description: schedule.description || "",
      isActive: schedule.isActive
    });
    setIsDialogOpen(true);
  };

  // Otvaranje dijaloga za brisanje
  const handleDeleteSchedule = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setIsDeleteDialogOpen(true);
  };

  // Resetovanje forme pri otvaranju dijaloga za kreiranje
  const handleOpenCreateDialog = () => {
    setSelectedSchedule(null);
    form.reset({
      applianceId: undefined,
      name: "",
      nextMaintenanceDate: "",
      frequency: "monthly",
      description: "",
      isActive: true
    });
    setIsDialogOpen(true);
  };

  // Formatiranje datuma
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "d. MMMM yyyy.", { locale: sr });
    } catch {
      return "N/A";
    }
  };

  // Dobijanje naziva uređaja
  const getApplianceName = (applianceId: number) => {
    const appliance = appliances.find((a: Appliance) => a.id === applianceId);
    return appliance ? appliance.modelName : "Nepoznat uređaj";
  };

  // Dobijanje boje za značku frekvencije
  const getFrequencyBadgeVariant = (frequency: MaintenanceFrequency): "default" | "destructive" | "secondary" | "outline" => {
    switch (frequency) {
      case "monthly":
        return "default";
      case "quarterly":
        return "secondary";
      case "biannual":
        return "outline";
      case "annual":
        return "outline";
      case "custom":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Prevod frekvencije održavanja
  const translateFrequency = (frequency: MaintenanceFrequency) => {
    switch (frequency) {
      case "monthly":
        return "Mesečno";
      case "quarterly":
        return "Kvartalno";
      case "biannual":
        return "Polugodišnje";
      case "annual":
        return "Godišnje";
      case "custom":
        return "Prilagođeno";
      default:
        return frequency;
    }
  };

  // Filtriranje planova održavanja
  const upcomingSchedules = maintenanceSchedules.filter(
    (schedule: MaintenanceSchedule) => {
      const nextDate = new Date(schedule.nextMaintenanceDate);
      return nextDate >= new Date();
    }
  );

  const pastSchedules = maintenanceSchedules.filter(
    (schedule: MaintenanceSchedule) => {
      const nextDate = new Date(schedule.nextMaintenanceDate);
      return nextDate < new Date();
    }
  );

  const displayedSchedules = 
    activeTab === "upcoming" ? upcomingSchedules : 
    activeTab === "past" ? pastSchedules : 
    maintenanceSchedules;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Planovi održavanja</h1>
        <Button onClick={handleOpenCreateDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj novi plan
        </Button>
      </div>

      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            Predstojeće održavanje ({upcomingSchedules.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Prošlo održavanje ({pastSchedules.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Svi planovi ({maintenanceSchedules.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Učitavanje...</span>
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-red-500">
              <p>Greška pri učitavanju planova održavanja.</p>
            </div>
          ) : displayedSchedules.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p>Nema planova održavanja za prikaz.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uređaj</TableHead>
                  <TableHead>Datum održavanja</TableHead>
                  <TableHead>Frekvencija</TableHead>
                  <TableHead>Opis</TableHead>
                  <TableHead>Poslednje održavanje</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSchedules.map((schedule: MaintenanceSchedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {getApplianceName(schedule.applianceId)}
                    </TableCell>
                    <TableCell>{formatDate(schedule.nextMaintenanceDate)}</TableCell>
                    <TableCell>
                      <Badge variant={getFrequencyBadgeVariant(schedule.frequency)}>
                        {translateFrequency(schedule.frequency)}
                      </Badge>
                    </TableCell>
                    <TableCell>{schedule.description}</TableCell>
                    <TableCell>
                      {schedule.lastMaintenanceDate
                        ? formatDate(schedule.lastMaintenanceDate)
                        : "Nije održavano"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditSchedule(schedule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSchedule(schedule)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog za dodavanje/izmenu plana održavanja */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedSchedule ? "Izmeni plan održavanja" : "Novi plan održavanja"}
            </DialogTitle>
            <DialogDescription>
              {selectedSchedule
                ? "Ažurirajte podatke o planu održavanja"
                : "Unesite podatke o novom planu održavanja"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="applianceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uređaj</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberite uređaj" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {appliances.map((appliance: Appliance) => (
                          <SelectItem key={appliance.id} value={appliance.id.toString()}>
                            {appliance.modelName} (S/N: {appliance.serialNumber})
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naziv plana</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextMaintenanceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum održavanja</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frekvencija</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberite frekvenciju" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(maintenanceFrequencyEnum.Values).map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {translateFrequency(freq)}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Otkaži
                </Button>
                <Button type="submit">
                  {createMaintenanceScheduleMutation.isPending ||
                  updateMaintenanceScheduleMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Učitavanje...
                    </>
                  ) : selectedSchedule ? (
                    "Sačuvaj izmene"
                  ) : (
                    "Kreiraj plan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog za brisanje plana održavanja */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Potvrda brisanja</DialogTitle>
            <DialogDescription>
              Da li ste sigurni da želite da obrišete ovaj plan održavanja?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Otkaži
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => selectedSchedule && deleteMaintenanceScheduleMutation.mutate(selectedSchedule.id)}
            >
              {deleteMaintenanceScheduleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Brisanje...
                </>
              ) : (
                "Obriši"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaintenanceSchedulesPage;