import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DialogDescription } from '@/components/ui/dialog';
import { Camera, X, RotateCcw, Check } from 'lucide-react';
import { ScannedData } from '@/services/enhanced-ocr-service';

interface MobileSimpleCameraProps {
  isOpen: boolean;
  onClose: () => void;
  onDataScanned: (data: ScannedData) => void;
}

export function MobileSimpleCamera({ isOpen, onClose, onDataScanned }: MobileSimpleCameraProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const videoConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    facingMode: { ideal: "environment" },
    focusMode: { ideal: "continuous" },
    zoom: { ideal: 1.0 }
  };

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Greška pri pokretanju kamere:', err);
      setError('Nije moguće pristupiti kameri. Molim vas proverite dozvole.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const captureImage = useCallback(() => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Nije moguće kreirati canvas context');
      }

      ctx.drawImage(video, 0, 0);
      const imageSrc = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageSrc);
      
      console.log('📸 Slika uspešno uhvaćena za mobilni uređaj');
    } catch (err) {
      console.error('Greška pri hvatanju slike:', err);
      setError('Greška pri hvatanju slike sa kamere');
    }
  }, []);

  const processCapturedImage = useCallback(async () => {
    if (!capturedImage) return;

    setIsScanning(true);
    setError(null);

    try {
      console.log('📱 Obrađujem sliku za mobilni uređaj...');
      
      // Rezultat za mobilne uređaje - instrukcije za manuelni unos
      const scannedData: ScannedData = {
        confidence: 75,
        extractedText: 'Slika je uspešno uhvaćena!\n\nOCR skeniranje na mobilnim uređajima trenutno nije dostupno, molim vas da manuelno unesete podatke sa slike u formu.\n\nModel i serijski broj obično se nalaze na nalepnici aparata.',
        model: undefined,
        serialNumber: undefined
      };

      console.log('📱 Mobilni rezultat spreman za prikaz');
      onDataScanned(scannedData);
      
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Greška pri obradi slike:', err);
      setError('Greška pri obradi slike. Pokušajte ponovo.');
    } finally {
      setIsScanning(false);
    }
  }, [capturedImage, onDataScanned, onClose]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      <DialogDescription className="sr-only">
        Jednostavna kamera za mobilne uređaje - uhvatite sliku aparata i manuelno unesite podatke
      </DialogDescription>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 text-white">
        <h2 className="text-lg font-semibold">Kamera za mobilne</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Camera/Image Display */}
      <div className="flex-1 relative">
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white p-3 rounded-lg z-10">
            ⚠️ {error}
          </div>
        )}

        {!capturedImage ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full border-2 border-white/30 rounded-lg m-4">
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20"></div>
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20"></div>
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20"></div>
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20"></div>
              </div>
            </div>

            {/* Instruction text */}
            <div className="absolute bottom-20 left-4 right-4 bg-black/70 text-white p-4 rounded-lg">
              <p className="text-sm text-center">
                📱 Pozicionirajte kameru tako da nalepnica aparata bude u okviru i kliknite "Snimi"
              </p>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <img
              src={capturedImage}
              alt="Uhvaćena slika"
              className="max-w-full max-h-full object-contain"
            />
            
            {isScanning && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-white/90 text-black p-4 rounded-lg text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Obrađujem sliku...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-4 bg-black/80">
        {!capturedImage ? (
          <div className="flex justify-center">
            <Button
              onClick={captureImage}
              disabled={!stream}
              className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-full"
            >
              <Camera className="h-6 w-6 mr-2" />
              Snimi
            </Button>
          </div>
        ) : (
          <div className="flex justify-center gap-4">
            <Button
              onClick={retakePhoto}
              variant="outline"
              className="px-6 py-3 text-white border-white hover:bg-white/20"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Ponovi
            </Button>
            <Button
              onClick={processCapturedImage}
              disabled={isScanning}
              className="bg-green-600 hover:bg-green-700 px-6 py-3"
            >
              <Check className="h-5 w-5 mr-2" />
              Koristi
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}