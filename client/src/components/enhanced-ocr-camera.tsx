import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, RotateCcw, Zap, Settings, CheckCircle, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { enhancedOCRService, ScannedData, OCRConfig } from '@/services/enhanced-ocr-service';

interface EnhancedOCRCameraProps {
  isOpen: boolean;
  onClose: () => void;
  onDataScanned: (data: ScannedData) => void;
  manufacturerHint?: string;
}

export function EnhancedOCRCamera({ isOpen, onClose, onDataScanned, manufacturerHint }: EnhancedOCRCameraProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScannedData, setLastScannedData] = useState<ScannedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScannedData[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('camera');
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const autoScanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // OCR konfiguracija
  const [config, setConfig] = useState<OCRConfig>({
    preprocessImage: true,
    multipleAttempts: true,
    manufacturerFocus: manufacturerHint || 'generic'
  });

  const videoConstraints = {
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    facingMode: { ideal: "environment" },
    focusMode: { ideal: "continuous" },
    zoom: { ideal: 1.0 }
  };

  const initializeOCR = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      setScanProgress(10);
      await enhancedOCRService.initialize(config);
      setIsInitialized(true);
      setScanProgress(0);
    } catch (err) {
      console.error('Enhanced OCR initialization error:', err);
      setError('Greška pri inicijalizaciji naprednog skenera');
      setScanProgress(0);
    }
  }, [isInitialized, config]);

  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeOCR();
    }
  }, [isOpen, initializeOCR, isInitialized]);

  const captureAndScan = useCallback(async () => {
    console.log('captureAndScan called', { isScanning, webcamRef: !!webcamRef.current });
    if (!webcamRef.current || isScanning) return;

    try {
      setIsScanning(true);
      setError(null);
      setScanProgress(20);

      if (!isInitialized) {
        await initializeOCR();
      }

      setScanProgress(40);

      const imageSrc = webcamRef.current.getScreenshot({
        width: 1920,
        height: 1080
      });
      
      if (!imageSrc) {
        throw new Error('Nije moguće uhvatiti sliku sa kamere');
      }

      setScanProgress(60);

      // Skeniraj sa naprednim podešavanjima
      const scannedData = await enhancedOCRService.scanImage(imageSrc, config);
      
      setScanProgress(80);
      setLastScannedData(scannedData);
      setScanHistory(prev => [scannedData, ...prev.slice(0, 4)]); // Drži poslednje 5 skenova
      setScanProgress(100);

      // Automatski prihvati ako je pouzdanost visoka i ima dovoljno podataka
      const score = calculateDataScore(scannedData);
      if (score > 100) {
        setTimeout(() => {
          onDataScanned(scannedData);
          setActiveTab('results');
        }, 1500);
      } else {
        setActiveTab('results');
      }

    } catch (err) {
      console.error('Enhanced scanning error:', err);
      setError('Greška pri skeniranju. Pokušajte sa boljim osvetljenjem ili držite kameru stabilno.');
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanProgress(0), 2000);
    }
  }, [isScanning, isInitialized, initializeOCR, config, onDataScanned]);

  // Funkcija za brzu detekciju nalepnice (light OCR bez kompletnog skeniranja)
  const detectLabelInFrame = useCallback(async () => {
    if (!webcamRef.current || isScanning || isAutoScanning) return false;

    try {
      const imageSrc = webcamRef.current.getScreenshot({
        width: 640, // Manja rezolucija za brzu detekciju
        height: 480
      });
      
      if (!imageSrc) return false;

      // Brza analiza slike - tražimo karakteristike nalepnica
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      return new Promise<boolean>((resolve) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          // Analiza piksela - tražimo bele/svetle oblasti (tipične za nalepnice)
          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          if (!imageData) {
            resolve(false);
            return;
          }
          
          let lightPixels = 0;
          let darkPixels = 0;
          const centerX = Math.floor(canvas.width / 2);
          const centerY = Math.floor(canvas.height / 2);
          const checkRadius = 100; // Oblast oko centra slike
          
          // Analiziraj oblast u centru slike
          for (let y = centerY - checkRadius; y < centerY + checkRadius; y += 4) {
            for (let x = centerX - checkRadius; x < centerX + checkRadius; x += 4) {
              if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                const index = (y * canvas.width + x) * 4;
                const r = imageData.data[index];
                const g = imageData.data[index + 1];
                const b = imageData.data[index + 2];
                const brightness = (r + g + b) / 3;
                
                if (brightness > 200) lightPixels++; // Svetli piksel (nalepnica)
                else if (brightness < 100) darkPixels++; // Tamni piksel (tekst)
              }
            }
          }
          
          // Ako imamo dovoljno kontrasta (svetla nalepnica sa tamnim tekstom)
          const contrastRatio = lightPixels > 0 ? darkPixels / lightPixels : 0;
          const hasEnoughLightArea = lightPixels > 100;
          const hasGoodContrast = contrastRatio > 0.1 && contrastRatio < 2.0;
          
          resolve(hasEnoughLightArea && hasGoodContrast);
        };
        
        img.onerror = () => resolve(false);
        img.src = imageSrc;
      });
      
    } catch (err) {
      console.error('Label detection error:', err);
      return false;
    }
  }, [webcamRef, isScanning, isAutoScanning]);

  // Automatsko skeniranje kada se detektuje nalepnica
  const startAutoScan = useCallback(async () => {
    if (!autoScanEnabled || isScanning || isAutoScanning) return;
    
    setIsAutoScanning(true);
    
    try {
      const labelDetected = await detectLabelInFrame();
      
      if (labelDetected) {
        // Čekaj 2 sekunde da korisnik stabilizuje kameru
        if (autoScanTimeoutRef.current) {
          clearTimeout(autoScanTimeoutRef.current);
        }
        
        autoScanTimeoutRef.current = setTimeout(async () => {
          // Ponovo proveri da li je nalepnica još uvek tu
          const stillThere = await detectLabelInFrame();
          if (stillThere && autoScanEnabled && !isScanning) {
            captureAndScan();
          }
          setIsAutoScanning(false);
        }, 2000);
      } else {
        setIsAutoScanning(false);
      }
    } catch (err) {
      console.error('Auto scan error:', err);
      setIsAutoScanning(false);
    }
  }, [autoScanEnabled, isScanning, isAutoScanning, detectLabelInFrame, captureAndScan]);

  // Kontinuirani auto-scan kada je kamera aktivna
  useEffect(() => {
    if (activeTab === 'camera' && autoScanEnabled && isInitialized && !isScanning) {
      const interval = setInterval(() => {
        startAutoScan();
      }, 1500); // Proveri svakih 1.5 sekundi
      
      return () => clearInterval(interval);
    }
  }, [activeTab, autoScanEnabled, isInitialized, isScanning, startAutoScan]);

  // Cleanup auto-scan timeout na unmount
  useEffect(() => {
    return () => {
      if (autoScanTimeoutRef.current) {
        clearTimeout(autoScanTimeoutRef.current);
      }
    };
  }, []);

  const calculateDataScore = (data: ScannedData): number => {
    let score = data.confidence;
    if (data.model) score += 30;
    if (data.serialNumber) score += 40;
    if (data.productNumber) score += 20;
    if (data.manufacturerCode) score += 10;
    return score;
  };

  const acceptScannedData = (data: ScannedData) => {
    onDataScanned(data);
    onClose();
  };

  const resetScan = () => {
    setLastScannedData(null);
    setError(null);
    setScanProgress(0);
    setActiveTab('camera');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleClose = () => {
    resetScan();
    setScanHistory([]);
    onClose();
  };

  const getDataQualityColor = (score: number) => {
    if (score > 100) return 'text-green-600';
    if (score > 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDataQualityText = (score: number) => {
    if (score > 100) return 'Odličo';
    if (score > 70) return 'Dobro';
    return 'Slabo';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-full h-full' : 'max-w-4xl h-[85vh] md:h-[90vh]'} p-0 overflow-hidden flex flex-col`}>
        <DialogHeader className="p-2 pb-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            Skener
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 grid w-auto grid-cols-3">
            <TabsTrigger value="camera">Kamera</TabsTrigger>
            <TabsTrigger value="settings">Podešavanja</TabsTrigger>
            <TabsTrigger value="results">Rezultati</TabsTrigger>
          </TabsList>
            <TabsContent value="camera" className="flex-1 flex flex-col relative bg-black mt-2">
              {/* Kontrole iznad kamere - uvek dostupne */}
              <div className="bg-white/90 backdrop-blur border-b p-3">
                <div className="flex items-center justify-center gap-3">
                  {/* Toggle za auto skeniranje */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Auto:</span>
                    <Switch
                      checked={autoScanEnabled}
                      onCheckedChange={setAutoScanEnabled}
                    />
                  </div>
                  
                  {/* Glavno dugme za skeniranje */}
                  <Button 
                    onClick={captureAndScan} 
                    disabled={isScanning}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                    size="default"
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

                  {/* Status auto skeniranja */}
                  {isAutoScanning && (
                    <Badge variant="secondary" className="bg-orange-500 text-white animate-pulse text-xs">
                      Detektujem...
                    </Badge>
                  )}
                </div>
              </div>

              {/* Kamera kontejner sa flex-1 da zauzme prostor */}
              <div className="flex-1 relative overflow-hidden min-h-0" style={{ minHeight: '65vh' }}>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  className="w-full h-full object-cover"
                  onUserMedia={() => {
                    console.log('Kamera inicijalizovana');
                    setIsInitialized(true);
                  }}
                  onUserMediaError={(err) => {
                    console.error('Greška prilikom pristupa kameri:', err);
                    setError('Greška prilikom pristupa kameri. Molimo proverite dozvolje.');
                  }}
                />

                {/* Napredni overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Fokusni okvir sa grid linijama */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 md:w-80 h-32 md:h-40 border-2 border-blue-400 rounded-lg">
                    {/* Grid linije za bolje pozicioniranje */}
                    <div className="absolute inset-2 border border-blue-300 opacity-50">
                      <div className="absolute top-1/3 left-0 right-0 border-t border-blue-300"></div>
                      <div className="absolute top-2/3 left-0 right-0 border-t border-blue-300"></div>
                      <div className="absolute left-1/3 top-0 bottom-0 border-l border-blue-300"></div>
                      <div className="absolute left-2/3 top-0 bottom-0 border-l border-blue-300"></div>
                    </div>
                    
                    <div className="absolute -top-8 left-0 right-0 text-center">
                      <Badge variant="secondary" className={`${isAutoScanning ? 'bg-orange-500 animate-pulse' : autoScanEnabled ? 'bg-green-500' : 'bg-blue-500'} text-white text-xs md:text-sm`}>
                        {isAutoScanning ? '🔍 Detektujem nalepnicu...' : 
                         autoScanEnabled ? '⚡ Auto-skeniranje aktivno' : 
                         'Fokusiraj na nalepnicu - držite stabilno'}
                      </Badge>
                    </div>
                    
                    {/* Status indikatori */}
                    <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-1 md:gap-2">
                      <Badge variant={isInitialized ? "default" : "secondary"} className="text-xs">
                        {isInitialized ? <CheckCircle className="h-2.5 w-2.5 mr-1" /> : <AlertCircle className="h-2.5 w-2.5 mr-1" />}
                        OCR
                      </Badge>
                      <Badge variant={config.preprocessImage ? "default" : "outline"} className="text-xs">
                        Pre-obrada
                      </Badge>
                      <Badge variant={config.multipleAttempts ? "default" : "outline"} className="text-xs">
                        Više pokušaja
                      </Badge>
                      <Badge variant={autoScanEnabled ? "default" : "outline"} className={`text-xs ${isAutoScanning ? 'animate-pulse bg-orange-500' : ''}`}>
                        <Zap className="h-2.5 w-2.5 mr-1" />
                        Auto
                      </Badge>
                    </div>
                  </div>

                  {/* Zatamnjenje oko okvira */}
                  <div className="absolute inset-0 bg-black bg-opacity-40">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 md:w-80 h-32 md:h-40 bg-transparent border-2 border-transparent rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                  </div>
                </div>

                {/* Progress bar */}
                {scanProgress > 0 && (
                  <div className="absolute bottom-20 left-4 right-4">
                    <Progress value={scanProgress} className="h-3" />
                    <p className="text-white text-xs md:text-sm text-center mt-2">
                      {scanProgress < 40 ? 'Inicijalizujem skener...' :
                       scanProgress < 60 ? 'Hvatam visoko-rezolucijsku sliku...' :
                       scanProgress < 80 ? 'Analiziram sa naprednim algoritmima...' :
                       'Završavam analizu...'}
                    </p>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="absolute bottom-20 left-4 right-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">{error}</AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </TabsContent>

          <TabsContent value="settings" className="p-4 space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Pre-obrada slike</h4>
                  <p className="text-sm text-gray-600">Poboljšava kontrast i čitkost teksta</p>
                </div>
                <Switch
                  checked={config.preprocessImage}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, preprocessImage: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Više pokušaja</h4>
                  <p className="text-sm text-gray-600">Koristi različite metode za bolju detekciju</p>
                </div>
                <Switch
                  checked={config.multipleAttempts}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, multipleAttempts: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Automatsko skeniranje</h4>
                  <p className="text-sm text-gray-600">Automatski počinje skeniranje kada detektuje nalepnicu</p>
                </div>
                <Switch
                  checked={autoScanEnabled}
                  onCheckedChange={setAutoScanEnabled}
                />
              </div>

              {autoScanEnabled && (
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Auto-skeniranje aktivno! Samo usmerite kameru na nalepnicu i sačekajte 2 sekunde.
                    {isAutoScanning && <span className="text-blue-600 font-medium"> Detektujem...</span>}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <h4 className="font-medium">Proizvođač aparata</h4>
                <Select
                  value={config.manufacturerFocus}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, manufacturerFocus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Izaberite proizvođača" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generic">Automatska detekcija</SelectItem>
                    <SelectItem value="beko">Beko</SelectItem>
                    <SelectItem value="electrolux">Electrolux</SelectItem>
                    <SelectItem value="samsung">Samsung</SelectItem>
                    <SelectItem value="lg">LG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="p-4 space-y-4">
            {lastScannedData && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Poslednji rezultat</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getDataQualityColor(calculateDataScore(lastScannedData))}>
                        {getDataQualityText(calculateDataScore(lastScannedData))}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {Math.round(lastScannedData.confidence)}% pouzdanost
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {lastScannedData.model && (
                      <div><strong>Model:</strong> {lastScannedData.model}</div>
                    )}
                    {lastScannedData.serialNumber && (
                      <div><strong>Serijski broj:</strong> {lastScannedData.serialNumber}</div>
                    )}
                    {lastScannedData.productNumber && (
                      <div><strong>Product broj:</strong> {lastScannedData.productNumber}</div>
                    )}
                    {lastScannedData.manufacturerCode && (
                      <div><strong>Proizvođač:</strong> {lastScannedData.manufacturerCode}</div>
                    )}
                    {lastScannedData.year && (
                      <div><strong>Godina:</strong> {lastScannedData.year}</div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => acceptScannedData(lastScannedData)} className="flex-1">
                      Koristi podatke
                    </Button>
                    <Button onClick={resetScan} variant="outline">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Ponovi
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {scanHistory.length > 1 && (
              <div className="space-y-2">
                <h4 className="font-medium">Istorija skeniranja</h4>
                {scanHistory.slice(1).map((scan, index) => (
                  <div key={index} className="bg-gray-50 rounded p-3 text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Sken #{scanHistory.length - index - 1}</span>
                      <Badge variant="outline" className={getDataQualityColor(calculateDataScore(scan))}>
                        {Math.round(scan.confidence)}%
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {scan.model && <div>Model: {scan.model}</div>}
                      {scan.serialNumber && <div>SN: {scan.serialNumber}</div>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => acceptScannedData(scan)}
                    >
                      Koristi
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Jednostavno dugme za zatvaranje na dnu */}
        <div className="bg-white border-t p-3">
          <div className="flex justify-center">
            <Button onClick={handleClose} variant="outline" size="lg" className="px-6">
              <X className="h-4 w-4 mr-2" />
              Zatvori
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}