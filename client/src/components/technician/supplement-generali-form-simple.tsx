import { useState, useEffect } from "react";

// Hook za mobilno pozicioniranje dialoga
function useMobileDialogPosition() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      // Detect keyboard on mobile by checking viewport height change
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.screen.height;
      const keyboardThreshold = windowHeight * 0.75; // 75% of screen height
      
      setIsKeyboardOpen(viewportHeight < keyboardThreshold);
    };
    
    // Modern browsers support visual viewport
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  return { isKeyboardOpen };
}
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
  const { isKeyboardOpen } = useMobileDialogPosition();

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
      const response = await apiRequest(`/api/services/${serviceId}/supplement-generali`, { 
        method: "PATCH", 
        body: JSON.stringify(supplementData) 
      });
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

  const handleScannedData = (scannedData: ScannedData) => {
    console.log("📷 Napredni skaner - pronađeni podaci:", scannedData);
    
    // Automatski popuni polja sa skeniranim podacima
    if (scannedData.model && scannedData.model.length >= 3) {
      form.setValue("model", scannedData.model);
    }
    if (scannedData.serialNumber && scannedData.serialNumber.length >= 6) {
      form.setValue("serialNumber", scannedData.serialNumber);
    }
    
    // Dodaj dodatne informacije u napomene ako postoje
    let additionalInfo = [];
    if (scannedData.productNumber) {
      additionalInfo.push(`Product broj: ${scannedData.productNumber}`);
    }
    if (scannedData.manufacturerCode && scannedData.manufacturerCode !== 'generic') {
      additionalInfo.push(`Detektovan proizvođač: ${scannedData.manufacturerCode}`);
    }
    if (scannedData.year) {
      additionalInfo.push(`Godina: ${scannedData.year}`);
    }
    
    if (additionalInfo.length > 0) {
      const currentNotes = form.getValues("supplementNotes") || "";
      const newNotes = currentNotes + (currentNotes ? "\n" : "") + 
        `Skenirani podaci: ${additionalInfo.join(", ")}`;
      form.setValue("supplementNotes", newNotes);
    }
    
    // Prikaži detaljnu informaciju
    const scannedFields = [];
    if (scannedData.model) scannedFields.push("model");
    if (scannedData.serialNumber) scannedFields.push("serijski broj");
    if (scannedData.productNumber) scannedFields.push("product broj");
    if (scannedData.manufacturerCode && scannedData.manufacturerCode !== 'generic') scannedFields.push("proizvođač");
    
    if (scannedFields.length > 0) {
      toast({
        title: `Napredni skaner - ${scannedFields.length} podataka pronađeno`,
        description: `Uspešno detektovani: ${scannedFields.join(", ")}. Pouzdanost: ${Math.round(scannedData.confidence)}%`,
      });
    } else {
      toast({
        title: "Skeniranje završeno",
        description: "Nisu pronađeni jasni podaci. Pokušajte sa boljim osvetljenjem ili pozicioniranjem.",
        variant: "destructive"
      });
    }
    
    setIsCameraOpen(false);
  };

  const onSubmit = async (data: SupplementGeneraliService) => {
    setIsSubmitting(true);
    try {
      await supplementMutation.mutateAsync(data);
    } catch (error) {
      console.error("Form submit error:", error);
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

  const handleDialogClose = () => {
    try {
      onClose();
    } catch (error) {
      console.error("Dialog close error:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent 
        className={`mobile-centered-dialog max-w-[95vw] sm:max-w-[500px] p-4 sm:p-6 overflow-y-auto ${isKeyboardOpen ? 'keyboard-open' : ''}`}
        style={{
          position: 'fixed',
          top: isKeyboardOpen ? '30%' : '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          maxHeight: isKeyboardOpen ? '60vh' : '80vh',
          overflowY: 'auto',
          width: '95vw',
          maxWidth: '500px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          transition: 'top 0.3s ease, max-height 0.3s ease'
        }}>
        <DialogHeader className="dialog-header">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dopuni {serviceName}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDialogClose}
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Podaci o aparatu
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCameraOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700 hover:text-blue-800"
                  disabled={isSubmitting}
                >
                  <Scan className="h-4 w-4" />
                  Napredni skener
                </Button>
              </div>

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

            <DialogFooter className="dialog-footer">
              <div className="flex flex-col md:flex-row gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
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
        
        {/* Napredna OCR Kamera komponenta */}
        <EnhancedOCRCamera
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onDataScanned={handleScannedData}
          manufacturerHint={manufacturerName ? 
            manufacturerName.toLowerCase().includes('beko') ? 'beko' :
            manufacturerName.toLowerCase().includes('electrolux') ? 'electrolux' :
            manufacturerName.toLowerCase().includes('samsung') ? 'samsung' :
            manufacturerName.toLowerCase().includes('lg') ? 'lg' :
            'generic'
            : 'generic'
          }
        />
      </DialogContent>
    </Dialog>
  );
}