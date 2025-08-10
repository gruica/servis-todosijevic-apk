import { useState, useEffect, useRef } from "react";
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

export function SupplementGeneraliForm({
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  // Removed all problematic refs that were causing freezing

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

  // Simplified mobile keyboard detection - only for visual feedback
  useEffect(() => {
    if (!isOpen) return;

    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    const handleViewportChange = () => {
      const originalHeight = window.innerHeight;
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = originalHeight - currentHeight;
      
      // Simple keyboard detection without DOM manipulation
      setKeyboardVisible(heightDifference > 150);
    };

    // Use only visualViewport for better compatibility
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    }
  }, [isOpen]);

  const supplementMutation = useMutation({
    mutationFn: async (data: SupplementGeneraliService) => {
      const { serviceId: _, ...supplementData } = data;
      const response = await apiRequest(`/api/services/${serviceId}/supplement-generali`, { method: "PATCH", body: JSON.stringify(supplementData) });
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

  const handleScannedData = (scannedData: ScannedData) => {
    console.log("📷 Napredni skaner - pronađeni podaci:", scannedData);
    
    // Automatski popuni polja sa skeniranim podacima
    if (scannedData.model && scannedData.model.length >= 2) {
      form.setValue("model", scannedData.model);
    }
    if (scannedData.serialNumber && scannedData.serialNumber.length >= 4) {
      form.setValue("serialNumber", scannedData.serialNumber);
    }
    
    // Dodaj dodatne informacije u napomene ako postoje
    let additionalInfo = [];
    if (scannedData.productNumber) {
      additionalInfo.push(`Product kod: ${scannedData.productNumber}`);
    }
    if (scannedData.manufacturerCode && scannedData.manufacturerCode !== 'generic') {
      const brandNames = {
        'beko': 'Beko',
        'candy': 'Candy', 
        'electrolux': 'Electrolux',
        'samsung': 'Samsung',
        'lg': 'LG'
      };
      additionalInfo.push(`Brend: ${brandNames[scannedData.manufacturerCode as keyof typeof brandNames] || scannedData.manufacturerCode}`);
    }
    if (scannedData.year) {
      additionalInfo.push(`Godina: ${scannedData.year}`);
    }
    
    if (additionalInfo.length > 0) {
      const currentNotes = form.getValues("supplementNotes") || "";
      const newNotes = currentNotes + (currentNotes ? "\n" : "") + 
        `OCR skener: ${additionalInfo.join(", ")}`;
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dopuni {serviceName}
            </DialogTitle>
            {/* Mobile close button - always visible */}
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
                          onFocus={(e) => {
                            // Prevent zoom on iOS
                            e.target.style.fontSize = '16px';
                          }}
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
                          onFocus={(e) => {
                            activeInputRef.current = e.target;
                            e.target.style.fontSize = '16px';
                          }}
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
                        onFocus={(e) => {
                          activeInputRef.current = e.target;
                          e.target.style.fontSize = '16px';
                        }}
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
                  Napredni skener
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
                          placeholder={currentSerialNumber || "SN123456789"}
                          className="w-full"
                          onFocus={(e) => {
                            activeInputRef.current = e.target;
                            e.target.style.fontSize = '16px';
                          }}
                          inputMode="text"
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
                          onFocus={(e) => {
                            activeInputRef.current = e.target;
                            e.target.style.fontSize = '16px';
                          }}
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
                        onFocus={(e) => {
                          activeInputRef.current = e.target;
                          e.target.style.fontSize = '16px';
                        }}
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
                      onFocus={(e) => {
                        activeInputRef.current = e.target;
                        e.target.style.fontSize = '16px';
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Opcionalne napomene o razlogu dopune podataka
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mobile-optimized footer - sticky positioned on mobile when keyboard is open */}
            <DialogFooter className={`gap-2 mt-6 ${keyboardVisible ? 'sticky bottom-0 bg-white border-t pt-4 z-10' : ''}`}>
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
            'generic' : 'generic'
          }
        />
      </DialogContent>
    </Dialog>
  );
}