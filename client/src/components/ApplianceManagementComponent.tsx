import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { 
  Appliance, 
  ApplianceCategory, 
  Manufacturer,
  insertApplianceSchema
} from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package } from "lucide-react";

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

interface ApplianceManagementComponentProps {
  clientId: number;
  clientName: string;
  onClose: () => void;
}

export function ApplianceManagementComponent({ 
  clientId, 
  clientName, 
  onClose 
}: ApplianceManagementComponentProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<Appliance | null>(null);
  const [applianceToDelete, setApplianceToDelete] = useState<Appliance | null>(null);
  const { toast } = useToast();

  // Fetch client's appliances
  const { data: appliances, isLoading: appliancesLoading } = useQuery<Appliance[]>({
    queryKey: [`/api/clients/${clientId}/appliances`]
  });

  // Fetch categories and manufacturers
  const { data: categories } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"]
  });

  const { data: manufacturers } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"]
  });

  // Form for adding/editing appliances
  const form = useForm<ApplianceFormValues>({
    resolver: zodResolver(applianceFormSchema),
    defaultValues: {
      clientId: clientId,
      categoryId: 0,
      manufacturerId: 0,
      model: "",
      serialNumber: "",
      purchaseDate: "",
      notes: ""
    }
  });

  // Add appliance mutation
  const addApplianceMutation = useMutation({
    mutationFn: (data: ApplianceFormValues) => 
      apiRequest("/api/appliances", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/appliances`] });
      toast({ title: "Uspeh", description: "Aparat je uspešno dodat" });
      setShowAddDialog(false);
      form.reset({
        clientId: clientId,
        categoryId: 0,
        manufacturerId: 0,
        model: "",
        serialNumber: "",
        purchaseDate: "",
        notes: ""
      });
    },
    onError: () => {
      toast({ 
        variant: "destructive", 
        title: "Greška", 
        description: "Greška pri dodavanju aparata" 
      });
    }
  });

  // Edit appliance mutation
  const editApplianceMutation = useMutation({
    mutationFn: (data: ApplianceFormValues & { id: number }) => 
      apiRequest(`/api/appliances/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/appliances`] });
      toast({ title: "Uspeh", description: "Aparat je uspešno ažuriran" });
      setEditingAppliance(null);
    },
    onError: () => {
      toast({ 
        variant: "destructive", 
        title: "Greška", 
        description: "Greška pri ažuriranju aparata" 
      });
    }
  });

  // Delete appliance mutation
  const deleteApplianceMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/appliances/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/appliances`] });
      toast({ title: "Uspeh", description: "Aparat je uspešno obrisan" });
      setApplianceToDelete(null);
    },
    onError: () => {
      toast({ 
        variant: "destructive", 
        title: "Greška", 
        description: "Greška pri brisanju aparata" 
      });
    }
  });

  const handleAddAppliance = () => {
    form.reset({
      clientId: clientId,
      categoryId: 0,
      manufacturerId: 0,
      model: "",
      serialNumber: "",
      purchaseDate: "",
      notes: ""
    });
    setShowAddDialog(true);
  };

  const handleEditAppliance = (appliance: Appliance) => {
    form.reset({
      clientId: clientId,
      categoryId: appliance.categoryId,
      manufacturerId: appliance.manufacturerId,
      model: appliance.model || "",
      serialNumber: appliance.serialNumber || "",
      purchaseDate: appliance.purchaseDate || "",
      notes: appliance.notes || ""
    });
    setEditingAppliance(appliance);
  };

  const onSubmit = (data: ApplianceFormValues) => {
    if (editingAppliance) {
      editApplianceMutation.mutate({ ...data, id: editingAppliance.id });
    } else {
      addApplianceMutation.mutate(data);
    }
  };

  const getCategoryName = (categoryId: number) => {
    return categories?.find(cat => cat.id === categoryId)?.name || "Nepoznata kategorija";
  };

  const getManufacturerName = (manufacturerId: number) => {
    return manufacturers?.find(man => man.id === manufacturerId)?.name || "Nepoznat proizvođač";
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Aparati klijenta</h3>
          <p className="text-sm text-gray-500">
            {appliances?.length || 0} registrovanih aparata
          </p>
        </div>
        <Button onClick={handleAddAppliance}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj aparat
        </Button>
      </div>

      {/* Appliances List */}
      {appliancesLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : appliances?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h4 className="text-lg font-medium mb-2">Nema registrovanih aparata</h4>
            <p className="text-gray-500 mb-4">
              Ovaj klijent nema registrovane aparate u sistemu.
            </p>
            <Button onClick={handleAddAppliance}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj prvi aparat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista aparata</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategorija</TableHead>
                  <TableHead>Proizvođač</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serijski broj</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appliances?.map((appliance) => (
                  <TableRow key={appliance.id}>
                    <TableCell className="font-medium">
                      {getCategoryName(appliance.categoryId)}
                    </TableCell>
                    <TableCell>
                      {getManufacturerName(appliance.manufacturerId)}
                    </TableCell>
                    <TableCell>
                      {appliance.model || <span className="text-gray-400">Nije specificiran</span>}
                    </TableCell>
                    <TableCell>
                      {appliance.serialNumber || <span className="text-gray-400">Nije specificiran</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEditAppliance(appliance)}
                          title="Izmeni aparat"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => setApplianceToDelete(appliance)}
                          title="Obriši aparat"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Appliance Dialog */}
      <Dialog open={showAddDialog || !!editingAppliance} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingAppliance(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingAppliance ? "Izmeni aparat" : "Dodaj novi aparat"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategorija aparata</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value > 0 ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite kategoriju" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category) => (
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
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value > 0 ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite proizvođača" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {manufacturers?.map((manufacturer) => (
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
                        <Input placeholder="Model aparata" {...field} />
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
                      <Input placeholder="Dodatne informacije o aparatu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setEditingAppliance(null);
                  }}
                >
                  Odustani
                </Button>
                <Button 
                  type="submit" 
                  disabled={addApplianceMutation.isPending || editApplianceMutation.isPending}
                >
                  {addApplianceMutation.isPending || editApplianceMutation.isPending 
                    ? "Čuvanje..." 
                    : editingAppliance ? "Ažuriraj" : "Dodaj"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!applianceToDelete} onOpenChange={() => setApplianceToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Brisanje aparata</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Da li ste sigurni da želite da obrišete ovaj aparat?</p>
            {applianceToDelete && (
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <p className="font-medium">{getCategoryName(applianceToDelete.categoryId)}</p>
                <p className="text-sm text-gray-600">
                  {getManufacturerName(applianceToDelete.manufacturerId)}
                  {applianceToDelete.model && ` - ${applianceToDelete.model}`}
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Ova akcija je nepovratna. Aparat će biti uklonjen iz sistema.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApplianceToDelete(null)}
              disabled={deleteApplianceMutation.isPending}
            >
              Odustani
            </Button>
            <Button
              variant="destructive"
              onClick={() => applianceToDelete && deleteApplianceMutation.mutate(applianceToDelete.id)}
              disabled={deleteApplianceMutation.isPending}
            >
              {deleteApplianceMutation.isPending ? "Brisanje..." : "Obriši"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}