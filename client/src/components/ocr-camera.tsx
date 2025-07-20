import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ocrService, ScannedData } from '@/services/ocr-service';

interface OCRCameraProps {
  isOpen: boolean;
  onClose: () => void;
  onDataScanned: (data: ScannedData) => void;
}

export function OCRCamera({ isOpen, onClose, onDataScanned }: OCRCameraProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScannedData, setLastScannedData] = useState<ScannedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: { ideal: "environment" } // Zadnja kamera na mobilnim uređajima
  };

  const initializeOCR = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      setScanProgress(10);
      await ocrService.initialize();
      setIsInitialized(true);
      setScanProgress(0);
    } catch (err) {
      console.error('OCR initialization error:', err);
      setError('Greška pri inicijalizaciji skenera');
      setScanProgress(0);
    }
  }, [isInitialized]);

  const captureAndScan = useCallback(async () => {
    if (!webcamRef.current || isScanning) return;

    try {
      setIsScanning(true);
      setError(null);
      setScanProgress(20);

      // Inicijalizuj OCR ako nije već
      if (!isInitialized) {
        await initializeOCR();
      }

      setScanProgress(40);

      // Uhvati sliku sa kamere
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Nije moguće uhvatiti sliku sa kamere');
      }

      setScanProgress(60);

      // Skeniraj sliku
      const scannedData = await ocrService.scanImage(imageSrc);
      
      setScanProgress(80);
      setLastScannedData(scannedData);
      setScanProgress(100);

      // Automatski prihvati ako je pouzdanost visoka
      if (scannedData.confidence > 70 && (scannedData.model || scannedData.serialNumber)) {
        setTimeout(() => {
          onDataScanned(scannedData);
          onClose();
        }, 1000);
      }

    } catch (err) {
      console.error('Scanning error:', err);
      setError('Greška pri skeniranju. Pokušajte ponovo.');
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanProgress(0), 2000);
    }
  }, [isScanning, isInitialized, initializeOCR, onDataScanned, onClose]);

  const acceptScannedData = () => {
    if (lastScannedData) {
      onDataScanned(lastScannedData);
      onClose();
    }
  };

  const resetScan = () => {
    setLastScannedData(null);
    setError(null);
    setScanProgress(0);
  };

  const handleClose = () => {
    resetScan();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Skeniraj generalije aparata
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative bg-black">
          {/* Kamera */}
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="w-full h-full object-cover"
          />

          {/* Overlay za fokus */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Okvir za fokus na nalepnicu */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-32 border-2 border-blue-400 rounded-lg">
              <div className="absolute -top-8 left-0 right-0 text-center">
                <Badge variant="secondary" className="bg-blue-500 text-white">
                  Fokusiraj na nalepnicu sa podacima
                </Badge>
              </div>
            </div>

            {/* Zatamnjenje oko okvira */}
            <div className="absolute inset-0 bg-black bg-opacity-40">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-32 bg-transparent border-2 border-transparent rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
            </div>
          </div>

          {/* Progress bar */}
          {scanProgress > 0 && (
            <div className="absolute bottom-20 left-4 right-4">
              <Progress value={scanProgress} className="h-2" />
              <p className="text-white text-sm text-center mt-2">
                {scanProgress < 40 ? 'Inicijalizujem skener...' :
                 scanProgress < 60 ? 'Hvatam sliku...' :
                 scanProgress < 80 ? 'Skeniram podatke...' :
                 'Završavam...'}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="absolute bottom-20 left-4 right-4">
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Rezultat skeniranja */}
          {lastScannedData && (
            <div className="absolute bottom-20 left-4 right-4 bg-white rounded-lg p-3 shadow-lg">
              <div className="text-sm font-medium mb-2">Pronađeni podaci:</div>
              <div className="space-y-1 text-xs">
                {lastScannedData.model && (
                  <div><strong>Model:</strong> {lastScannedData.model}</div>
                )}
                {lastScannedData.serialNumber && (
                  <div><strong>Serijski broj:</strong> {lastScannedData.serialNumber}</div>
                )}
                {lastScannedData.productNumber && (
                  <div><strong>Product broj:</strong> {lastScannedData.productNumber}</div>
                )}
                <div className="text-gray-500">
                  Pouzdanost: {Math.round(lastScannedData.confidence)}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Kontrole */}
        <div className="p-4 space-y-3">
          {!lastScannedData ? (
            <div className="flex gap-2">
              <Button 
                onClick={captureAndScan} 
                disabled={isScanning}
                className="flex-1"
                size="lg"
              >
                {isScanning ? (
                  <>
                    <Zap className="mr-2 h-4 w-4 animate-spin" />
                    Skeniram...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Skeniraj
                  </>
                )}
              </Button>
              <Button onClick={handleClose} variant="outline" size="lg">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={acceptScannedData} className="flex-1" size="lg">
                Koristi podatke
              </Button>
              <Button onClick={resetScan} variant="outline" size="lg">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button onClick={handleClose} variant="outline" size="lg">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <p className="text-xs text-gray-500 text-center">
            Pozicioniraj kameru tako da nalepnica sa podacima bude u okviru. 
            Najbolji rezultati se postižu pri dobrom osvetljenju.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}