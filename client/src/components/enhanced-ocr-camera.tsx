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
        height: 1080,
        quality: 0.9
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
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Napredni skener generalija
              {config.manufacturerFocus !== 'generic' && (
                <Badge variant="secondary">{config.manufacturerFocus}</Badge>
              )}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
          <DialogDescription>
            Skenirajte serijski broj, model ili druge podatke sa generalne nalepnice aparata. Pozicionirajte kameru tako da tekst bude u okviru i kliknite "Skeniraj".
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 grid w-auto grid-cols-3">
            <TabsTrigger value="camera">Kamera</TabsTrigger>
            <TabsTrigger value="settings">Podešavanja</TabsTrigger>
            <TabsTrigger value="results">Rezultati</TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="flex-1 relative bg-black mt-2 overflow-hidden">
            {/* Kamera */}
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover"
            />

            {/* Napredni overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Fokusni okvir sa grid linijama */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-40 border-2 border-blue-400 rounded-lg">
                {/* Grid linije za bolje pozicioniranje */}
                <div className="absolute inset-2 border border-blue-300 opacity-50">
                  <div className="absolute top-1/3 left-0 right-0 border-t border-blue-300"></div>
                  <div className="absolute top-2/3 left-0 right-0 border-t border-blue-300"></div>
                  <div className="absolute left-1/3 top-0 bottom-0 border-l border-blue-300"></div>
                  <div className="absolute left-2/3 top-0 bottom-0 border-l border-blue-300"></div>
                </div>
                
                <div className="absolute -top-8 left-0 right-0 text-center">
                  <Badge variant="secondary" className="bg-blue-500 text-white">
                    Fokusiraj na nalepnicu - držite stabilno
                  </Badge>
                </div>
                
                {/* Status indikatori */}
                <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2">
                  <Badge variant={isInitialized ? "default" : "secondary"}>
                    {isInitialized ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                    OCR
                  </Badge>
                  <Badge variant={config.preprocessImage ? "default" : "outline"}>
                    Pre-obrada
                  </Badge>
                  <Badge variant={config.multipleAttempts ? "default" : "outline"}>
                    Više pokušaja
                  </Badge>
                </div>
              </div>

              {/* Zatamnjenje oko okvira */}
              <div className="absolute inset-0 bg-black bg-opacity-40">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-40 bg-transparent border-2 border-transparent rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
              </div>
            </div>

            {/* Progress bar */}
            {scanProgress > 0 && (
              <div className="absolute bottom-20 left-4 right-4">
                <Progress value={scanProgress} className="h-3" />
                <p className="text-white text-sm text-center mt-2">
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

            {/* Kontrole kamere - pozicionirane za bolju vidljivost na mobilnim uređajima */}
            <div className="absolute bottom-4 md:bottom-4 left-4 right-4 pb-safe">
              <div className="flex justify-center gap-3">
                <Button 
                  onClick={captureAndScan} 
                  disabled={isScanning || !isInitialized}
                  className="px-6 md:px-8 py-2.5 md:py-3"
                  size="lg"
                >
                  {isScanning ? (
                    <>
                      <Zap className="mr-2 h-4 md:h-5 w-4 md:w-5 animate-spin" />
                      Skeniram...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 md:h-5 w-4 md:w-5" />
                      Skeniraj
                    </>
                  )}
                </Button>
                <Button onClick={handleClose} variant="outline" size="lg" className="px-4 md:px-6">
                  <X className="h-4 md:h-5 w-4 md:w-5" />
                </Button>
              </div>
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
      </DialogContent>
    </Dialog>
  );
}