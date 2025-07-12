import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ScannedData {
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  confidence: number;
  rawText?: string;
}

interface ApplianceLabelScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataScanned: (data: ScannedData) => void;
  title?: string;
}

export function ApplianceLabelScanner({ 
  open, 
  onOpenChange, 
  onDataScanned,
  title = "Skeniraj nalepnicu uređaja"
}: ApplianceLabelScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Proveravamo da li je slika
    if (!file.type.startsWith('image/')) {
      setError('Molimo odaberite sliku (JPG, PNG, ili WEBP)');
      return;
    }

    // Proveravamo veličinu (maksimalno 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Slika je prevelika. Maksimalna veličina je 10MB.');
      return;
    }

    setError(null);
    
    // Kreiranje preview-a
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Procesiranje slike
    processImage(file);
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setScannedData(null);

    try {
      // Konvertujemo sliku u base64
      const base64Image = await convertToBase64(file);
      
      // Šaljemo na server za procesiranje
      const response = await apiRequest('POST', '/api/scan-appliance-label', {
        image: base64Image,
        mimeType: file.type
      });

      const result = await response.json();
      
      if (result.success) {
        setScannedData(result.data);
        toast({
          title: "Uspešno skenirano",
          description: "Podaci sa nalepnice su uspešno prepoznati",
        });
      } else {
        setError(result.message || 'Greška pri prepoznavanju nalepnice');
      }
    } catch (error) {
      console.error('Greška pri procesiranju slike:', error);
      setError('Došlo je do greške pri procesiranju slike. Molimo pokušajte ponovo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        // Uklanjamo data:image/jpeg;base64, deo
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUseData = () => {
    if (scannedData) {
      onDataScanned(scannedData);
      handleClose();
    }
  };

  const handleClose = () => {
    setPreviewImage(null);
    setScannedData(null);
    setError(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Fotografišite ili otpremite sliku nalepnice uređaja. Aplikacija će automatski prepoznati model i serijski broj.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload dugme */}
          <div className="flex gap-2">
            <Button onClick={triggerFileInput} className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Odaberi sliku
            </Button>
            {previewImage && (
              <Button variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Poništi
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Error prikaz */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview slike */}
          {previewImage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pregled slike</CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  src={previewImage} 
                  alt="Preview nalepnice" 
                  className="max-w-full max-h-64 mx-auto rounded border"
                />
              </CardContent>
            </Card>
          )}

          {/* Processing indikator */}
          {isProcessing && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mr-3" />
                <span>Prepoznavanje nalepnice...</span>
              </CardContent>
            </Card>
          )}

          {/* Rezultati skeniranja */}
          {scannedData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  Prepoznati podaci
                </CardTitle>
                <CardDescription>
                  Pouzdanost: {Math.round(scannedData.confidence * 100)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {scannedData.manufacturer && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Proizvođač:</label>
                    <p className="text-sm">{scannedData.manufacturer}</p>
                  </div>
                )}
                {scannedData.model && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Model:</label>
                    <p className="text-sm">{scannedData.model}</p>
                  </div>
                )}
                {scannedData.serialNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Serijski broj:</label>
                    <p className="text-sm">{scannedData.serialNumber}</p>
                  </div>
                )}
                {scannedData.rawText && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600">Prepoznati tekst</summary>
                    <p className="mt-2 p-2 bg-gray-50 rounded border text-xs">{scannedData.rawText}</p>
                  </details>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dugmad */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Zatvori
            </Button>
            {scannedData && (
              <Button onClick={handleUseData} className="flex-1">
                Koristi podatke
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}