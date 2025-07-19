import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SupplementGeneraliService, supplementGeneraliServiceSchema } from "@shared/schema";
import { FileText, Calendar, Mail, MapPin, Hash, Package } from "lucide-react";

interface SupplementGeneraliFormProps {
  serviceId: number;
  serviceName?: string;
  currentClientEmail?: string | null;
  currentClientAddress?: string | null;
  currentClientCity?: string | null;
  currentSerialNumber?: string | null;
  currentModel?: string | null;
  currentPurchaseDate?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SupplementGeneraliForm({
  serviceId,
  serviceName = "Generali servis",
  currentClientEmail,
  currentClientAddress,
  currentClientCity,
  currentSerialNumber,
  currentModel,
  currentPurchaseDate,
  isOpen,
  onClose,
  onSuccess
}: SupplementGeneraliFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SupplementGeneraliService>({
    resolver: zodResolver(supplementGeneraliServiceSchema),
    defaultValues: {
      serviceId,
      clientEmail: currentClientEmail || "",
      clientAddress: currentClientAddress || "",
      clientCity: currentClientCity || "",
      serialNumber: currentSerialNumber || "",
      model: currentModel || "",
      purchaseDate: currentPurchaseDate || "",
      supplementNotes: ""
    }
  });

  const supplementMutation = useMutation({
    mutationFn: async (data: SupplementGeneraliService) => {
      const { serviceId: _, ...supplementData } = data;
      const response = await apiRequest("PATCH", `/api/services/${serviceId}/supplement-generali`, supplementData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspeh",
        description: "Generali servis je uspešno dopunjen"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
      form.reset();
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      console.error("🔴 Greška pri dopunjavanju Generali servisa:", error);
      let errorMessage = "Greška pri dopunjavanju servisa";
      
      if (error.message) {
        // Parse API error responses
        if (error.message.includes("400:")) {
          errorMessage = "Neispravni podaci - proverite da li su sva polja popunjena ispravno";
        } else if (error.message.includes("403:")) {
          errorMessage = "Nemate dozvolu za dopunjavanje ovog servisa";
        } else if (error.message.includes("404:")) {
          errorMessage = "Servis nije pronađen";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Greška",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const onSubmit = async (data: SupplementGeneraliService) => {
    console.log("🔄 Počinje slanje Generali dopune:", data);
    setIsSubmitting(true);
    try {
      const result = await supplementMutation.mutateAsync(data);
      console.log("✅ Uspešno dopunjen Generali servis:", result);
    } catch (error) {
      console.error("❌ Greška pri slanju dopune:", error);
      // Error se već rešava u onError callback-u
    } finally {
      setIsSubmitting(false);
    }
  };

  // Proverava da li ima barem jedan unos koji se dopunjuje
  const hasAnyFieldToSupplement = () => {
    const values = form.getValues();
    return Boolean(
      values.clientEmail || 
      values.clientAddress || 
      values.clientCity || 
      values.serialNumber || 
      values.model || 
      values.purchaseDate ||
      values.supplementNotes
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dopuni {serviceName}
          </DialogTitle>
          <DialogDescription>
            Dopunite nedostajuće podatke o klijentu i aparatu za Generali servis.
            Popunite samo polja koja želite da dodate ili ažurirate.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Podaci o klijentu */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Podaci o klijentu
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email adresa</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email"
                          placeholder={currentClientEmail || "primer@email.com"}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        {currentClientEmail ? "Trenutno: " + currentClientEmail : "Dodaj email adresu"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grad</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={currentClientCity || "Podgorica"}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        {currentClientCity ? "Trenutno: " + currentClientCity : "Dodaj grad"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="clientAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresa</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={currentClientAddress || "Ulica i broj"}
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      {currentClientAddress ? "Trenutno: " + currentClientAddress : "Dodaj adresu"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Podaci o aparatu */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Podaci o aparatu
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serijski broj</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={currentSerialNumber || "SN123456789"}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        {currentSerialNumber ? "Trenutno: " + currentSerialNumber : "Dodaj serijski broj"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model aparata</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={currentModel || "Samsung WF1234"}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        {currentModel ? "Trenutno: " + currentModel : "Dodaj model aparata"}
                      </FormDescription>
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
                      <Input 
                        {...field} 
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      {currentPurchaseDate ? 
                        "Trenutno: " + new Date(currentPurchaseDate).toLocaleDateString('sr-RS') : 
                        "Dodaj datum kupovine aparata"
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dodatne napomene */}
            <FormField
              control={form.control}
              name="supplementNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Napomene o dopuni</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Dodajte napomene o razlogu dopune ili dodatne informacije..."
                      rows={3}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    Opcionalne napomene o razlogu dopune podataka
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Otkaži
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !hasAnyFieldToSupplement()}
                className="min-w-24"
              >
                {isSubmitting ? "Čuva..." : "Dopuni servis"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}