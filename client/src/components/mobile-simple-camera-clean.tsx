import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia nije podržana u ovom browser-u');
      }

      // Pokušaj sa osnovnim constraints
      let constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        // Fallback sa jednostavnijim constraints
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Nepoznata greška';
      
      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        setError('Pristup kameri je odbačen. Dozvolite pristup kameri u browser-u.');
      } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('DevicesNotFoundError')) {
        setError('Kamera nije pronađena na uređaju.');
      } else if (errorMsg.includes('NotReadableError') || errorMsg.includes('TrackStartError')) {
        setError('Kamera je već u upotrebi od strane druge aplikacije.');
      } else {
        setError(`Greška kamere: ${errorMsg}`);
      }
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

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !stream) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);
    stopCamera();
  }, [stream, stopCamera]);

  const processImage = useCallback(async () => {
    if (!capturedImage) return;

    try {
      setIsScanning(true);
      
      // Simuliramo OCR procesiranje
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vraćamo prazne podatke za manuelni unos
      const mockData: ScannedData = {
        model: '',
        serialNumber: '',
        additionalInfo: 'Podaci nisu automatski prepoznati. Molim unesite manuelno.'
      };

      onDataScanned(mockData);
      
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
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

  const cameraElement = (
    <div className="fixed inset-0 bg-black z-[99999] flex flex-col" style={{ zIndex: 99999 }}>
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
          <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white p-4 rounded-lg z-10">
            <div className="flex items-start gap-2">
              <div className="text-lg">⚠️</div>
              <div className="flex-1">
                <p className="font-medium text-sm">{error}</p>
                <div className="mt-2 text-xs space-y-1">
                  <p>📱 Dozvolite kameru:</p>
                  <p>1. Kliknite na 🔒 ili ⓘ levo od adrese</p>
                  <p>2. Pronađite "Camera" ili "Kamera"</p>
                  <p>3. Promenite na "Allow" ili "Dozvoli"</p>
                  <p>4. Osvežite stranicu (F5)</p>
                  <p>5. Kliknite dugme ispod</p>
                </div>
                <Button
                  onClick={startCamera}
                  size="sm"
                  className="mt-3 bg-white/20 hover:bg-white/30 text-white border-white/50 text-xs"
                >
                  🔄 Pokušaj ponovo
                </Button>
              </div>
            </div>
          </div>
        )}

        {!capturedImage ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        )}

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Obrađujem sliku...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-black/80">
        {!capturedImage ? (
          <div className="flex justify-center">
            <Button
              onClick={capturePhoto}
              disabled={!stream || !!error}
              size="lg"
              className="bg-white text-black hover:bg-gray-200 rounded-full h-16 w-16 p-0"
            >
              <Camera className="h-8 w-8" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center gap-4">
            <Button
              onClick={retakePhoto}
              variant="outline"
              className="text-white border-white/50 hover:bg-white/20"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Ponovo
            </Button>
            <Button
              onClick={processImage}
              disabled={isScanning}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-5 w-5 mr-2" />
              Koristi
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Render kao portal izvan trenutnog DOM tree-a
  return createPortal(cameraElement, document.body);
}