import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, UserCheck, Trash2, Plus, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AllocatePartDialog from "./AllocatePartDialog";

const assignToTechnicianSchema = z.object({
  technicianId: z.string().min(1, "Molimo odaberite servisera"),
  quantity: z.number().min(1, "Količina mora biti najmanje 1"),
  assignmentNotes: z.string().max(500, "Napomene su predugačke").optional(),
});

type AssignToTechnicianForm = z.infer<typeof assignToTechnicianSchema>;

interface AvailablePart {
  id: number;
  partName: string;
  partNumber: string | null;
  quantity: number;
  description: string | null;
  supplierName: string | null;
  unitCost: string | null;
  location: string | null;
  warrantyStatus: string;
  categoryId: number | null;
  manufacturerId: number | null;
  originalOrderId: number | null;
  addedDate: string;
  addedBy: number;
  notes: string | null;
  category?: { name: string };
  manufacturer?: { name: string };
  addedByUser?: { fullName: string };
}

interface Technician {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  specialization: string | null;
  active: boolean;
}

const AvailablePartsManagementComponent = () => {
  const [selectedPart, setSelectedPart] = useState<AvailablePart | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAllocateDialogOpen, setIsAllocateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Memoize form configuration to prevent re-creation
  const formConfig = useMemo(() => ({
    resolver: zodResolver(assignToTechnicianSchema),
    defaultValues: {
      technicianId: "",
      quantity: 1,
      assignmentNotes: "",
    },
  }), []);

  const form = useForm<AssignToTechnicianForm>(formConfig);

  // Dohvati dostupne delove sa real-time refresh
  const { data: availableParts, isLoading: partsLoading, refetch: refetchParts, error: partsError } = useQuery({
    queryKey: ["/api/admin/available-parts"],
    refetchInterval: 5000, // Real-time refresh svakih 5 sekundi
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Debug informacije
  console.log("🔍 Available Parts Debug:", {
    availableParts,
    isLoading: partsLoading,
    error: partsError,
    partsLength: availableParts?.length,
    hasData: !!availableParts,
    isArray: Array.isArray(availableParts)
  });

  // Dodatni debug za pojedinačne delove
  if (availableParts && Array.isArray(availableParts) && availableParts.length > 0) {
    console.log("🔍 First available part:", availableParts[0]);
    console.log("🔍 All parts IDs:", availableParts.map(p => p.id));
  }

  // Dohvati servisere
  const { data: technicians } = useQuery({
    queryKey: ["/api/technicians"],
  });

  // Dodeli deo serviseru
  const assignToTechnicianMutation = useMutation({
    mutationFn: async (data: AssignToTechnicianForm & { partId: number }) => {
      return apiRequest("PUT", `/api/admin/available-parts/${data.partId}/allocate`, {
        technicianId: parseInt(data.technicianId),
        quantity: data.quantity,
        assignmentNotes: data.assignmentNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/available-parts"] });
      setIsAssignDialogOpen(false);
      setSelectedPart(null);
      form.reset();
      toast({
        title: "Uspešno dodeljeno",
        description: "Rezervni deo je uspešno dodeljen serviseru.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri dodeljivanju dela.",
        variant: "destructive",
      });
    },
  });

  // Obrisi deo sa stanja
  const deletePartMutation = useMutation({
    mutationFn: async (partId: number) => {
      return apiRequest("DELETE", `/api/admin/available-parts/${partId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/available-parts"] });
      toast({
        title: "Uspešno obrisano",
        description: "Rezervni deo je uspešno uklonjen sa stanja.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri brisanju dela.",
        variant: "destructive",
      });
    },
  });

  const handleAssignTechnician = (part: AvailablePart) => {
    setSelectedPart(part);
    form.setValue("quantity", Math.min(1, part.quantity));
    setIsAssignDialogOpen(true);
  };

  const handleAllocatePart = (part: AvailablePart) => {
    setSelectedPart(part);
    setIsAllocateDialogOpen(true);
  };

  const onSubmitAssign = (data: AssignToTechnicianForm) => {
    if (!selectedPart) return;
    assignToTechnicianMutation.mutate({
      ...data,
      partId: selectedPart.id,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-RS');
  };

  const getWarrantyBadge = (status: string) => {
    return status === 'u garanciji' ? (
      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
        🛡️ U garanciji
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
        💰 Van garancije
      </Badge>
    );
  };

  if (partsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Rezervni djelovi na stanju
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Učitavam rezervne delove...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Rezervni djelovi na stanju
          </CardTitle>
          <CardDescription>
            Upravljanje rezervnim delovima koji su dostupni u skladištu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {console.log("🔍 Rendering condition:", {
            availableParts,
            isArray: Array.isArray(availableParts),
            length: availableParts?.length,
            condition: availableParts && Array.isArray(availableParts) && availableParts.length > 0,
            loading: partsLoading
          })}
          {partsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Učitavaju se dostupni delovi...</p>
            </div>
          ) : availableParts && Array.isArray(availableParts) && availableParts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naziv dela</TableHead>
                    <TableHead>Kataloški broj</TableHead>
                    <TableHead>Količina</TableHead>
                    <TableHead>Garancija</TableHead>
                    <TableHead>Kategorija</TableHead>
                    <TableHead>Proizvođač</TableHead>
                    <TableHead>Lokacija</TableHead>
                    <TableHead>Dodato</TableHead>
                    <TableHead>Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(availableParts as AvailablePart[]).map((part: AvailablePart) => (
                    <TableRow key={part.id}>
                      <TableCell className="font-medium">{part.partName}</TableCell>
                      <TableCell>{part.partNumber || "Nepoznat"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{part.quantity} kom</Badge>
                      </TableCell>
                      <TableCell>{getWarrantyBadge(part.warrantyStatus)}</TableCell>
                      <TableCell>{part.category?.name || "Nepoznata"}</TableCell>
                      <TableCell>{part.manufacturer?.name || "Nepoznat"}</TableCell>
                      <TableCell>{part.location || "Glavno skladište"}</TableCell>
                      <TableCell>{formatDate(part.addedDate)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAllocatePart(part)}
                            className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          >
                            <UserCheck className="h-4 w-4" />
                            Dodeli za servis
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deletePartMutation.mutate(part.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Ukloni
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nema rezervnih delova na stanju
              </h3>
              <p className="text-gray-500">
                Rezervni delovi će se pojaviti ovde kada admin potvrdi njihovo prispeće.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog za dodeljivanje dela serviseru */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dodeli rezervni deo serviseru</DialogTitle>
            <DialogDescription>
              Izaberite servisera kome želite da dodelite rezervni deo
            </DialogDescription>
          </DialogHeader>
          
          {selectedPart && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium">{selectedPart.partName}</h4>
                <p className="text-sm text-gray-600">
                  Dostupno: {selectedPart.quantity} kom
                </p>
                {selectedPart.partNumber && (
                  <p className="text-sm text-gray-600">
                    Kataloški broj: {selectedPart.partNumber}
                  </p>
                )}
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitAssign)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="technicianId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serviser</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Izaberite servisera" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(technicians) ? technicians.filter((tech: Technician) => tech.active).map((tech: Technician) => (
                              <SelectItem key={tech.id} value={tech.id.toString()}>
                                {tech.fullName}
                                {tech.specialization && (
                                  <span className="text-gray-500 ml-2">
                                    ({tech.specialization})
                                  </span>
                                )}
                              </SelectItem>
                            )) : null}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Količina</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max={selectedPart.quantity}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignmentNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Napomene (opciono)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Dodatne napomene o dodeljivanju..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={assignToTechnicianMutation.isPending}
                      className="flex-1"
                    >
                      {assignToTechnicianMutation.isPending ? "Dodeljivanje..." : "Dodeli deo"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAssignDialogOpen(false)}
                    >
                      Otkaži
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog za alokaciju dela za servis */}
      {selectedPart && (
        <AllocatePartDialog
          open={isAllocateDialogOpen}
          onOpenChange={setIsAllocateDialogOpen}
          part={{
            id: selectedPart.id,
            partName: selectedPart.partName,
            quantity: selectedPart.quantity,
            location: selectedPart.location || "Glavno skladište"
          }}
        />
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const AvailablePartsManagement = React.memo(AvailablePartsManagementComponent);
export default AvailablePartsManagement;