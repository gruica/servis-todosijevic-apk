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
import { FileText, Calendar, Mail, MapPin, Hash, Package, X } from "lucide-react";

interface SupplementGeneraliFormProps {
  serviceId: number;
  serviceName?: string;
  currentClientEmail?: string | null;
  currentClientAddress?: string | null;
  currentClientCity?: string | null;
  currentSerialNumber?: string | null;
  currentModel?: string | null;
  currentPurchaseDate?: string | null;
  manufacturerName?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SupplementGeneraliFormSimple({
  serviceId,
  serviceName = "Generali servis",
  currentClientEmail,
  currentClientAddress,
  currentClientCity,
  currentSerialNumber,
  currentModel,
  currentPurchaseDate,
  manufacturerName,
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
        if (error.message.includes("400:")) {
          errorMessage = "Neispravni podaci - proverite da li su sva polja popunjena ispravno";
        } else if (error.message.includes("403:")) {
          errorMessage = "Nemate dozvolu za dopunjavanje ovog servisa";
        } else if (error.message.includes("404:")) {
          errorMessage = "Servis nije pronađen";
        } else if (error.message.includes("500:")) {
          errorMessage = "Greška na serveru - pokušajte ponovo";
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
    setIsSubmitting(true);
    try {
      await supplementMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasAnyFieldToSupplement = () => {
    const values = form.getValues();
    return (
      values.clientEmail ||
      values.clientAddress ||
      values.clientCity ||
      values.serialNumber ||
      values.model ||
      values.purchaseDate ||
      values.supplementNotes
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dopuni {serviceName}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 md:hidden"
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Dopunite nedostajuće podatke o klijentu i aparatu za Generali servis.
            Popunite samo polja koja želite da dodate ili ažurirate.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Klijent podaci */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Podaci o klijentu
              </h3>

              {/* Email klijenta */}
              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email klijenta</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email"
                        placeholder={currentClientEmail || "primer@email.com"}
                        className="w-full"
                        style={{ fontSize: '16px' }}
                        inputMode="email"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormDescription>
                      {currentClientEmail 
                        ? `Trenutno: ${currentClientEmail}` 
                        : "Dodajte email adresu klijenta"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Adresa klijenta */}
              <FormField
                control={form.control}
                name="clientAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresa klijenta</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={currentClientAddress || "Unesite adresu..."}
                        className="w-full"
                        style={{ fontSize: '16px' }}
                      />
                    </FormControl>
                    <FormDescription>
                      {currentClientAddress 
                        ? `Trenutno: ${currentClientAddress}` 
                        : "Dodajte adresu klijenta"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Grad klijenta */}
              <FormField
                control={form.control}
                name="clientCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grad/Mesto</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={currentClientCity || "Unesite grad..."}
                        className="w-full"
                        style={{ fontSize: '16px' }}
                      />
                    </FormControl>
                    <FormDescription>
                      {currentClientCity 
                        ? `Trenutno: ${currentClientCity}` 
                        : "Dodajte grad/mesto klijenta"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Aparat podaci */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Podaci o aparatu
              </h3>

              {/* Serijski broj */}
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serijski broj</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={currentSerialNumber || "Unesite serijski broj..."}
                        className="w-full"
                        style={{ fontSize: '16px' }}
                      />
                    </FormControl>
                    <FormDescription>
                      {currentSerialNumber 
                        ? `Trenutno: ${currentSerialNumber}` 
                        : "Dodajte serijski broj aparata"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Model aparata */}
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model aparata</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={currentModel || "Unesite model aparata..."}
                        className="w-full"
                        style={{ fontSize: '16px' }}
                      />
                    </FormControl>
                    <FormDescription>
                      {currentModel 
                        ? `Trenutno: ${currentModel}` 
                        : "Dodajte model aparata"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Datum kupovine */}
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
                        className="w-full"
                        style={{ fontSize: '16px' }}
                      />
                    </FormControl>
                    <FormDescription>
                      {currentPurchaseDate 
                        ? `Trenutno: ${currentPurchaseDate}` 
                        : "Dodajte datum kupovine aparata"}
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
                      style={{ fontSize: '16px' }}
                    />
                  </FormControl>
                  <FormDescription>
                    Opcionalne napomene o razlogu dopune podataka
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="sticky bottom-0 bg-white border-t pt-4 z-10">
              <div className="flex flex-col md:flex-row gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full md:w-auto"
                >
                  Otkaži
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !hasAnyFieldToSupplement()}
                  className="w-full md:w-auto min-w-24"
                >
                  {isSubmitting ? "Čuva..." : "Dopuni servis"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}