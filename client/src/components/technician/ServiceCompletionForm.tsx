import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Clock, Wrench, FileText, Star, Plus, Minus, Package } from "lucide-react";

// Schema za service completion report
const serviceCompletionSchema = z.object({
  serviceId: z.number(),
  workDescription: z.string().min(10, "Opis rada mora biti detaljniji (min 10 karaktera)").max(1000, "Opis rada je predugačak"),
  problemDiagnosis: z.string().min(10, "Dijagnoza mora biti detaljnija (min 10 karaktera)").max(500, "Dijagnoza je predugačka"),
  solutionDescription: z.string().min(10, "Opis rešenja mora biti detaljniji (min 10 karaktera)").max(500, "Opis rešenja je predugačak"),
  warrantyStatus: z.enum(["u_garanciji", "van_garancije"]),
  warrantyPeriod: z.string().optional(),
  laborTime: z.number().min(1).max(1440).optional(),
  totalCost: z.string().optional(),
  clientSatisfaction: z.number().min(1).max(5).optional(),
  additionalNotes: z.string().max(1000).optional(),
  techniciansSignature: z.string().max(100).optional(),
  usedSpareParts: z.array(z.object({
    partName: z.string(),
    partNumber: z.string().optional(),
    quantity: z.number().min(1),
    price: z.string().optional(),
    isWarranty: z.boolean().default(false)
  })).default([])
});

type ServiceCompletionFormData = z.infer<typeof serviceCompletionSchema>;

interface ServiceCompletionFormProps {
  service: any;
  isOpen: boolean;
  onClose: () => void;
}

function ServiceCompletionForm({ service, isOpen, onClose }: ServiceCompletionFormProps) {
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [showReturnConfirmation, setShowReturnConfirmation] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");
  const [isReturning, setIsReturning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ServiceCompletionFormData>({
    resolver: zodResolver(serviceCompletionSchema),
    defaultValues: {
      serviceId: service?.id || 0,
      workDescription: "",
      problemDiagnosis: "",
      solutionDescription: "",
      warrantyStatus: "van_garancije",
      warrantyPeriod: "",
      laborTime: undefined,
      totalCost: "",
      clientSatisfaction: 5,
      additionalNotes: "",
      techniciansSignature: "",
      usedSpareParts: []
    }
  });

  const createReportMutation = useMutation({
    mutationFn: async (data: ServiceCompletionFormData) => {
      // Konvertuj spare parts array u JSON string
      const reportData = {
        ...data,
        usedSpareParts: JSON.stringify(data.usedSpareParts)
      };
      
      // Kreiraj completion report
      const reportResponse = await apiRequest("/api/service-completion-reports", {
        method: "POST",
        body: JSON.stringify(reportData)
      });

      // Automatski završi servis sa statusom "completed"
      await apiRequest(`/api/services/${service.id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: "completed",
          technicianNotes: data.workDescription,
          cost: data.totalCost || "0"
        })
      });

      return reportResponse;
    },
    onSuccess: () => {
      toast({
        title: "Servis uspešno završen",
        description: "Detaljni izveštaj je kreiran i servis je označen kao završen."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri završetku servisa.",
        variant: "destructive"
      });
    }
  });

  const addSparePart = () => {
    const newPart = {
      partName: "",
      partNumber: "",
      quantity: 1,
      price: "",
      isWarranty: false
    };
    setSpareParts([...spareParts, newPart]);
  };

  const removeSparePart = (index: number) => {
    const updatedParts = spareParts.filter((_, i) => i !== index);
    setSpareParts(updatedParts);
  };

  const updateSparePart = (index: number, field: string, value: any) => {
    const updatedParts = spareParts.map((part, i) => 
      i === index ? { ...part, [field]: value } : part
    );
    setSpareParts(updatedParts);
  };

  const onSubmit = (data: ServiceCompletionFormData) => {
    const finalData = {
      ...data,
      usedSpareParts: spareParts
    };
    createReportMutation.mutate(finalData);
  };

  const handleReturnDevice = async () => {
    if (!returnNotes.trim()) {
      toast({
        title: "Greška",
        description: "Molim vas unesite napomenu o vraćanju aparata",
        variant: "destructive"
      });
      return;
    }

    setIsReturning(true);
    
    try {
      const response = await fetch(`/api/services/${service.id}/return-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          returnNotes: returnNotes.trim()
        })
      });

      if (response.ok) {
        toast({
          title: "Uspešno",
          description: "Aparat je uspešno vraćen klijentu"
        });
        setShowReturnConfirmation(false);
        setReturnNotes("");
        queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
        onClose();
      } else {
        const error = await response.json();
        toast({
          title: "Greška",
          description: error.error || "Greška pri vraćanju aparata",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error returning device:', error);
      toast({
        title: "Greška",
        description: "Greška pri vraćanju aparata",
        variant: "destructive"
      });
    } finally {
      setIsReturning(false);
    }
  };

  if (!service) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Izveštaj o završetku servisa #{service.id}
          </DialogTitle>
          <DialogDescription>
            Popunite detaljne informacije o izvršenom servisu i korišćenim delovima
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Informacije o servisu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Klijent:</span> {service.client?.fullName}
                </div>
                <div>
                  <span className="font-medium">Telefon:</span> {service.client?.phone}
                </div>
                <div>
                  <span className="font-medium">Uređaj:</span> {service.appliance?.category?.name} - {service.appliance?.manufacturer?.name}
                </div>
                <div>
                  <span className="font-medium">Model:</span> {service.appliance?.model}
                </div>
              </div>
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Work Description */}
              <FormField
                control={form.control}
                name="workDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Detaljni opis izvršenih radova
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Opišite sve radove koje ste izvršili na aparatu..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Problem Diagnosis */}
              <FormField
                control={form.control}
                name="problemDiagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dijagnoza problema</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Objasnite uzrok kvara ili problema..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Solution Description */}
              <FormField
                control={form.control}
                name="solutionDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis primenjenog rešenja</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Objasnite kako ste rešili problem..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Warranty Status */}
                <FormField
                  control={form.control}
                  name="warrantyStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Garanciski status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="u_garanciji">U garanciji</SelectItem>
                          <SelectItem value="van_garancije">Van garancije</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Warranty Period */}
                <FormField
                  control={form.control}
                  name="warrantyPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Garancijski period</FormLabel>
                      <FormControl>
                        <Input placeholder="npr. 12 meseci" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Labor Time */}
                <FormField
                  control={form.control}
                  name="laborTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Vreme rada (min)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="120"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Total Cost */}
                <FormField
                  control={form.control}
                  name="totalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ukupna cena (€)</FormLabel>
                      <FormControl>
                        <Input placeholder="150.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Client Satisfaction */}
                <FormField
                  control={form.control}
                  name="clientSatisfaction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Zadovoljstvo (1-5)
                      </FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Ocena" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(rating => (
                            <SelectItem key={rating} value={rating.toString()}>
                              {rating} - {rating === 5 ? "Odličan" : rating === 4 ? "Vrlo dobar" : rating === 3 ? "Dobar" : rating === 2 ? "Zadovoljavajući" : "Potrebno poboljšanje"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Used Spare Parts */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Korišćeni rezervni delovi</h3>
                  <Button type="button" onClick={addSparePart} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj deo
                  </Button>
                </div>

                {spareParts.map((part, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-5 gap-3 items-end">
                      <div>
                        <label className="text-sm font-medium">Naziv dela</label>
                        <Input
                          value={part.partName}
                          onChange={(e) => updateSparePart(index, 'partName', e.target.value)}
                          placeholder="Elektronika"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Kataloški broj</label>
                        <Input
                          value={part.partNumber}
                          onChange={(e) => updateSparePart(index, 'partNumber', e.target.value)}
                          placeholder="ELX123"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Količina</label>
                        <Input
                          type="number"
                          value={part.quantity}
                          onChange={(e) => updateSparePart(index, 'quantity', Number(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Cena (€)</label>
                        <Input
                          value={part.price}
                          onChange={(e) => updateSparePart(index, 'price', e.target.value)}
                          placeholder="25.00"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={part.isWarranty}
                            onChange={(e) => updateSparePart(index, 'isWarranty', e.target.checked)}
                          />
                          Garancijski
                        </label>
                        <Button 
                          type="button" 
                          onClick={() => removeSparePart(index)}
                          variant="outline" 
                          size="sm"
                          className="ml-2"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Additional Notes */}
              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dodatne napomene</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Dodatne informacije, preporuke za klijenta..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Technician Signature */}
              <FormField
                control={form.control}
                name="techniciansSignature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Potpis servisera</FormLabel>
                    <FormControl>
                      <Input placeholder="Ime i prezime servisera" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Otkaži
                </Button>
                <Button 
                  type="button"
                  onClick={() => setShowReturnConfirmation(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isReturning}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Vrati aparat
                </Button>
                <Button 
                  type="submit" 
                  disabled={createReportMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {createReportMutation.isPending ? "Čuva se..." : "Sačuvaj izveštaj"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Dialog za potvrdu vraćanja aparata */}
    {showReturnConfirmation && (
      <Dialog open={showReturnConfirmation} onOpenChange={setShowReturnConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vrati aparat klijentu</DialogTitle>
            <DialogDescription>
              Molim vas unesite napomenu o vraćanju aparata klijentu.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Napomena o vraćanju aparata: <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Unesite napomenu o stanju aparata, razlogu vraćanja ili druge važne informacije..."
                className="min-h-[100px] resize-none"
                required
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowReturnConfirmation(false);
                  setReturnNotes("");
                }}
                disabled={isReturning}
              >
                Otkaži
              </Button>
              <Button
                onClick={handleReturnDevice}
                disabled={isReturning || !returnNotes.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isReturning ? (
                  <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full" />
                ) : (
                  <Package className="h-4 w-4 mr-2" />
                )}
                {isReturning ? "Vraćam..." : "Vrati aparat"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}

export default ServiceCompletionForm;