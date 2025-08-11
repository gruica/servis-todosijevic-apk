import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Package, Clock, CheckCircle2, AlertCircle } from "lucide-react";

// Schema za validaciju form podataka
const removedPartFormSchema = z.object({
  serviceId: z.number().int().positive(),
  partName: z.string().min(2, "Naziv dela mora imati najmanje 2 karaktera").max(100),
  partDescription: z.string().max(500).optional(),
  removalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD"),
  removalReason: z.string().min(5, "Razlog uklanjanja mora biti detaljniji").max(300),
  currentLocation: z.enum(["workshop", "external_repair", "returned"]),
  expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  technicianNotes: z.string().max(500).optional(),
  createdBy: z.number().int().positive(),
});

type RemovedPartFormData = z.infer<typeof removedPartFormSchema>;

interface RemovedPartsFormProps {
  serviceId: number;
  technicianId: number;
  onSuccess?: () => void;
}

export function RemovedPartsForm({ serviceId, technicianId, onSuccess }: RemovedPartsFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<RemovedPartFormData>({
    resolver: zodResolver(removedPartFormSchema),
    defaultValues: {
      serviceId,
      createdBy: technicianId,
      removalDate: new Date().toISOString().split('T')[0],
      currentLocation: "workshop",
    },
  });

  const createRemovedPartMutation = useMutation({
    mutationFn: (data: RemovedPartFormData) => 
      apiRequest("/api/removed-parts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({
        title: "Uspešno evidentirano",
        description: "Uklonjeni deo je uspešno evidentiran u sistemu.",
      });
      form.reset();
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/removed-parts"] });
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/removed-parts`] });
      onSuccess?.();
    },
    onError: (error: any) => {
      // Parts removal error handled by toast
      toast({
        title: "Greška",
        description: error?.message || "Greška pri evidenciji uklonjenog dela",
        variant: "destructive",
      });
    },
  });

  const updateServiceStatusMutation = useMutation({
    mutationFn: () => 
      apiRequest(`/api/services/${serviceId}/parts-removed`, { method: "PATCH", body: JSON.stringify({}) }),
    onSuccess: () => {
      toast({
        title: "Status ažuriran",
        description: "Status servisa je ažuriran na 'Delovi uklonjeni sa uređaja'.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}`] });
    },
    onError: (error: any) => {
      // Status update error handled
      toast({
        title: "Greška",
        description: "Greška pri ažuriranju statusa servisa",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: RemovedPartFormData) => {
    try {
      await createRemovedPartMutation.mutateAsync(data);
      
      // Automatski ažuriraj status servisa na "device_parts_removed"
      await updateServiceStatusMutation.mutateAsync();
    } catch (error) {
      // Process error handled by error boundary
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full bg-red-50 hover:bg-red-100 text-red-700 border-red-200 h-10"
        >
          <Settings className="h-4 w-4 mr-2" />
          Evidentiraj uklonjene delove
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evidencija uklonjenih delova</DialogTitle>
          <DialogDescription>
            Evidentirajte delove uklonjene sa uređaja tokom servisiranja.
            Status servisa će automatski biti ažuriran.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="partName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naziv dela *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="npr. Motor, Pumpa, Elektronika..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="removalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum uklanjanja *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="partDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detaljan opis dela</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detaljnije opisati deo, proizvođač, model, itd..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="removalReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razlog uklanjanja *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Objasniti zašto je deo uklonjen (popravka, zamena, dijagnostika, itd.)" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trenutna lokacija *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberite lokaciju" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="workshop">🔧 Radionica</SelectItem>
                        <SelectItem value="external_repair">🏭 Spoljašnja popravka</SelectItem>
                        <SelectItem value="returned">↩️ Vraćeno</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expectedReturnDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Očekivani datum vraćanja</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="technicianNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Napomene servisera</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Dodatne napomene o procesu uklanjanja ili stanju dela..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={createRemovedPartMutation.isPending || updateServiceStatusMutation.isPending}
                className="flex-1"
              >
                {(createRemovedPartMutation.isPending || updateServiceStatusMutation.isPending) ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Evidentiram...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Evidentiraj deo
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={createRemovedPartMutation.isPending || updateServiceStatusMutation.isPending}
              >
                Otkaži
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Komponenta za prikaz postojećih uklonjenih delova
interface RemovedPart {
  id: number;
  partName: string;
  partDescription?: string;
  removalDate: string;
  removalReason: string;
  currentLocation: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  partStatus: string;
  technicianNotes?: string;
  isReinstalled: boolean;
}

interface RemovedPartsListProps {
  serviceId: number;
}

export function RemovedPartsList({ serviceId }: RemovedPartsListProps) {
  const queryClient = useQueryClient();

  const markAsReturnedMutation = useMutation({
    mutationFn: ({ partId, returnDate, notes }: { partId: number; returnDate: string; notes?: string }) =>
      apiRequest(`/api/removed-parts/${partId}/return`, { method: "PATCH", body: JSON.stringify({ returnDate, notes }) }),
    onSuccess: () => {
      toast({
        title: "Deo označen kao vraćen",
        description: "Deo je uspešno označen kao vraćen u uređaj.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/removed-parts`] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: "Greška pri označavanju dela kao vraćenog",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      removed: { label: "Uklonjen", variant: "secondary" as const, icon: Settings },
      in_repair: { label: "U popravci", variant: "destructive" as const, icon: AlertCircle },
      repaired: { label: "Popravljen", variant: "default" as const, icon: CheckCircle2 },
      returned: { label: "Vraćen", variant: "default" as const, icon: CheckCircle2 },
      replaced: { label: "Zamenjen", variant: "outline" as const, icon: Package },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.removed;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Uklonjeni delovi
        </CardTitle>
        <CardDescription>
          Pregled delova uklonjenih sa uređaja tokom servisiranja
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Trenutno nema evidencije uklonjenih delova</p>
          <p className="text-sm">Koristite dugme iznad za dodavanje evidencije</p>
        </div>
      </CardContent>
    </Card>
  );
}