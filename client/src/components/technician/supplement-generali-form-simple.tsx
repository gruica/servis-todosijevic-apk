import { useState, useEffect } from "react";
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
import { FileText, Calendar, Mail, MapPin, Hash, Package, Camera, Scan, X } from "lucide-react";
import { EnhancedOCRCamera } from "@/components/enhanced-ocr-camera";
import { ScannedData } from "@/services/enhanced-ocr-service";

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
  const [isCameraOpen, setIsCameraOpen] = useState(false);

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
      const response = await apiRequest(`/api/services/${data.serviceId}/supplement-generali`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Generali dopuna uspešna",
        description: "Podaci o servisu su uspešno dopunjeni"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/my-services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      onSuccess?.();
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      console.error("❌ Generali dopuna greška:", error);
      let errorMessage = "Greška pri dopuni servisa";
      if (error?.message) {
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
      await supplementMutation.mutateAsync(data);
      console.log("✅ Uspešno dopunjen Generali servis");
    } catch (error) {
      console.error("❌ Greška pri slanju dopune:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OCR scan results with advanced processing
  const handleScanResult = (scannedData: ScannedData) => {
    console.log('📱 Napredni OCR rezultat dobijen:', scannedData);
    
    // Auto-populate form fields with scanned data
    if (scannedData.model && scannedData.model.length >= 2) {
      form.setValue("model", scannedData.model);
      console.log('✅ Model automatski popunjen:', scannedData.model);
    }
    if (scannedData.serialNumber && scannedData.serialNumber.length >= 4) {
      form.setValue("serialNumber", scannedData.serialNumber);
      console.log('✅ Serijski broj automatski popunjen:', scannedData.serialNumber);
    }
    
    // Add additional information to notes if available
    let additionalInfo = [];
    if (scannedData.productNumber) {
      additionalInfo.push(`Product kod: ${scannedData.productNumber}`);
    }
    if (scannedData.manufacturerCode && scannedData.manufacturerCode !== 'generic') {
      const brandNames: Record<string, string> = {
        'beko': 'Beko',
        'candy': 'Candy', 
        'electrolux': 'Electrolux',
        'samsung': 'Samsung',
        'lg': 'LG'
      };
      additionalInfo.push(`Brend: ${brandNames[scannedData.manufacturerCode] || scannedData.manufacturerCode}`);
    }
    if (scannedData.year) {
      additionalInfo.push(`Godina: ${scannedData.year}`);
    }
    
    if (additionalInfo.length > 0) {
      const currentNotes = form.getValues("supplementNotes") || "";
      const newNotes = currentNotes + (currentNotes ? "\n" : "") + 
        `Napredni OCR skener: ${additionalInfo.join(", ")}`;
      form.setValue("supplementNotes", newNotes);
    }
    
    // Show detailed feedback
    const scannedFields = [];
    if (scannedData.model) scannedFields.push("model");
    if (scannedData.serialNumber) scannedFields.push("serijski broj");
    if (scannedData.productNumber) scannedFields.push("product broj");
    if (scannedData.manufacturerCode && scannedData.manufacturerCode !== 'generic') scannedFields.push("proizvođač");
    
    setIsCameraOpen(false);
    
    if (scannedFields.length > 0) {
      toast({
        title: `Napredni camera skaner - ${scannedFields.length} podataka`,
        description: `Detektovano: ${scannedFields.join(", ")}. Pouzdanost: ${Math.round(scannedData.confidence || 0)}%`,
      });
    } else {
      toast({
        title: "Skeniranje završeno",
        description: "Nisu pronađeni jasni podaci. Pokušajte sa boljim osvetljenjem ili pozicioniranjem.",
        variant: "destructive"
      });
    }
  };

  const handleDialogClose = () => {
    try {
      onClose();
    } catch (error) {
      console.error("Greška pri zatvaranju dijaloga:", error);
    }
  };

  // Check if we have at least one field to supplement
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

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="w-full max-w-[500px] mx-auto p-4 top-[30%] max-h-[60vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-white z-10 pb-4">
            <DialogTitle className="text-lg md:text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dopuni {serviceName}
            </DialogTitle>
            <DialogDescription>
              Dodaj nedostajuće podatke za {manufacturerName || 'Generali'} servis #{serviceId}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Client information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Podaci o klijentu
                </h3>
                
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
                          style={{ fontSize: '16px' }}
                          inputMode="email"
                        />
                      </FormControl>
                      <FormDescription>
                        {currentClientEmail ? "Trenutno: " + currentClientEmail : "Dodaj email adresu"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            style={{ fontSize: '16px' }}
                          />
                        </FormControl>
                        <FormDescription>
                          {currentClientCity ? "Trenutno: " + currentClientCity : "Dodaj grad"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            style={{ fontSize: '16px' }}
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
              </div>

              {/* Appliance information with camera scanner */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Podaci o aparatu
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCameraOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                  >
                    <Camera className="h-4 w-4" />
                    <Scan className="h-4 w-4" />
                    Napredni skaner
                  </Button>
                </div>
                
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
                            placeholder={currentSerialNumber || "12345678901"}
                            className="w-full"
                            style={{ fontSize: '16px' }}
                          />
                        </FormControl>
                        <FormDescription>
                          {currentSerialNumber ? "Trenutno: " + currentSerialNumber : "Skeniraj ili unesi ručno"}
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
                            placeholder={currentModel || "WMB61432"}
                            className="w-full"
                            style={{ fontSize: '16px' }}
                          />
                        </FormControl>
                        <FormDescription>
                          {currentModel ? "Trenutno: " + currentModel : "Skeniraj ili unesi ručno"}
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
                          placeholder={currentPurchaseDate || ""}
                          className="w-full"
                          style={{ fontSize: '16px' }}
                        />
                      </FormControl>
                      <FormDescription>
                        {currentPurchaseDate ? "Trenutno: " + currentPurchaseDate : "Dodaj datum kupovine"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional notes */}
              <FormField
                control={form.control}
                name="supplementNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dodatne napomene</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Dodaj dodatne informacije ili napomene..."
                        className="w-full"
                        style={{ fontSize: '16px' }}
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Opcionalne napomene o servisu ili aparatu
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="sticky bottom-0 bg-white pt-4">
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleDialogClose}
                    className="w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Otkaži
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || supplementMutation.isPending || !hasAnyFieldToSupplement()}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting || supplementMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Čuva se...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Dopuni servis
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Enhanced OCR Camera Dialog */}
      {isCameraOpen && (
        <EnhancedOCRCamera
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onScanComplete={handleScanResult}
          manufacturerName={manufacturerName || 'generic'}
          title="Skeniraj nalepnicu aparata"
          description="Pozicioniraj kameru na nalepnicu aparata da automatski detektujem serijski broj i model"
        />
      )}
    </>
  );
}