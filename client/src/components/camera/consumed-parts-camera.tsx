import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, AlertCircle, Zap, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Tesseract from 'tesseract.js';

interface ConsumedPartsCamera {
  isOpen: boolean;
  onClose: () => void;
  serviceId: number;
  technicianId: number;
  onPartScanned: (partData: any) => void;
}

interface OCRResult {
  text: string;
  confidence: number;
  timestamp: Date;
  processedWords: string[];
  detectedManufacturer?: string;
  detectedPartNumber?: string;
  detectedModelNumber?: string;
}

interface MatchedPart {
  id: number;
  partNumber: string;
  partName: string;
  manufacturer: string;
  priceEur?: string;
  supplierName?: string;
  confidence: number;
  matchType: 'exact' | 'partial' | 'similar';
}

const MANUFACTURER_PATTERNS = {
  beko: ['beko', 'blomberg', 'grundig'],
  candy: ['candy', 'hoover', 'zerowatt'],
  electrolux: ['electrolux', 'aeg', 'zanussi', 'frigidaire'],
  bosch: ['bosch', 'siemens', 'neff', 'gaggenau'],
  whirlpool: ['whirlpool', 'bauknecht', 'indesit', 'hotpoint'],
  lg: ['lg electronics', 'lg', 'goldstar'],
  samsung: ['samsung'],
  miele: ['miele'],
  gorenje: ['gorenje', 'asko'],
  smeg: ['smeg']
};

const PART_NUMBER_PATTERNS = [
  /\b[A-Z]{2,4}[\d]{4,8}[A-Z]?\b/g, // Standard part numbers like AB123456
  /\b[\d]{8,12}\b/g, // Numeric part numbers
  /\b[A-Z][\d]{3,}-?[A-Z\d]{3,}\b/g, // Mixed patterns
  /\b[\d]{3,4}[-\s]?[\d]{3,4}[-\s]?[\d]{2,4}\b/g, // Hyphenated numbers
];

const MODEL_NUMBER_PATTERNS = [
  /\bModel:?\s*([A-Z\d\-\s]{4,20})\b/gi,
  /\bTip:?\s*([A-Z\d\-\s]{4,20})\b/gi,
  /\b([A-Z]{2,4}[\d\-]{4,12}[A-Z]?)\b/g,
];

export default function ConsumedPartsCamera({ 
  isOpen, 
  onClose, 
  serviceId, 
  technicianId,
  onPartScanned 
}: ConsumedPartsCamera) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [results, setResults] = useState<OCRResult[]>([]);
  const [matchedParts, setMatchedParts] = useState<MatchedPart[]>([]);
  const [sparePartsCatalog, setSparePartsCatalog] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanMode, setScanMode] = useState<'part_label' | 'appliance_label'>('part_label');
  const [hasCamera, setHasCamera] = useState(false);

  // Forma za finalizovanje potrošenog dela
  const [formData, setFormData] = useState({
    partNumber: '',
    partName: '',
    manufacturer: '',
    quantity: 1,
    unitCost: '',
    supplierName: '',
    installationNotes: '',
    scannedFromLabel: true,
    ocrConfidence: 0,
    associatedCatalogPartId: null as number | null,
    notes: ''
  });

  // Pokretanje kamere
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Koristi zadnju kameru
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Greška kamere",
        description: "Nije moguće pristupiti kameri. Proverite dozvole.",
        variant: "destructive",
      });
    }
  };

  // Zaustavljanje kamere
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setHasCamera(false);
  };

  // Preuzimanje kataloga rezervnih delova
  const loadSparePartsCatalog = async () => {
    try {
      const response = await fetch('/api/admin/spare-parts-catalog', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const catalog = await response.json();
        setSparePartsCatalog(catalog);
        console.log(`Učitan katalog sa ${catalog.length} rezervnih delova`);
      }
    } catch (error) {
      console.error('Error loading spare parts catalog:', error);
      toast({
        title: "Greška",
        description: "Nije moguće učitati katalog rezervnih delova",
        variant: "destructive",
      });
    }
  };

  // Pokretanje kamere kada se dialog otvori
  useEffect(() => {
    if (isOpen) {
      startCamera();
      loadSparePartsCatalog();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Prepoznavanje proizvođača iz teksta
  const detectManufacturer = (text: string): string | undefined => {
    const normalizedText = text.toLowerCase();
    
    for (const [manufacturer, patterns] of Object.entries(MANUFACTURER_PATTERNS)) {
      for (const pattern of patterns) {
        if (normalizedText.includes(pattern)) {
          return manufacturer;
        }
      }
    }
    return undefined;
  };

  // Prepoznavanje kataloških brojeva iz teksta
  const extractPartNumbers = (text: string): string[] => {
    const partNumbers: string[] = [];
    
    for (const pattern of PART_NUMBER_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        partNumbers.push(...matches);
      }
    }
    
    // Uklanjanje duplikata i filtriranje kratkih brojeva
    return [...new Set(partNumbers)].filter(num => num.length >= 4);
  };

  // Prepoznavanje model brojeva iz teksta
  const extractModelNumbers = (text: string): string[] => {
    const modelNumbers: string[] = [];
    
    for (const pattern of MODEL_NUMBER_PATTERNS) {
      const matches = [...text.matchAll(pattern)];
      if (matches) {
        modelNumbers.push(...matches.map(match => match[1] || match[0]).filter(Boolean));
      }
    }
    
    return [...new Set(modelNumbers)].filter(num => num.length >= 4);
  };

  // Pretraganje kataloga na osnovu OCR rezultata
  const searchCatalogParts = (ocrResult: OCRResult): MatchedPart[] => {
    const matches: MatchedPart[] = [];
    const { text, detectedPartNumber, detectedManufacturer } = ocrResult;
    
    // Pretraži po kataloške brojeve
    const partNumbers = extractPartNumbers(text);
    
    for (const catalogPart of sparePartsCatalog) {
      let confidence = 0;
      let matchType: 'exact' | 'partial' | 'similar' = 'similar';
      
      // Exact match po part number
      if (detectedPartNumber && catalogPart.partNumber === detectedPartNumber) {
        confidence = 95;
        matchType = 'exact';
      }
      // Partial match po part number
      else if (partNumbers.some(pn => catalogPart.partNumber.includes(pn) || pn.includes(catalogPart.partNumber))) {
        confidence = 75;
        matchType = 'partial';
      }
      // Match po alternativnim brojevima
      else if (catalogPart.alternativePartNumbers && Array.isArray(catalogPart.alternativePartNumbers)) {
        const altMatches = catalogPart.alternativePartNumbers.some((alt: string) => 
          partNumbers.some(pn => alt.includes(pn) || pn.includes(alt))
        );
        if (altMatches) {
          confidence = 70;
          matchType = 'partial';
        }
      }
      // Match po proizvođaču
      else if (detectedManufacturer && catalogPart.manufacturer.toLowerCase().includes(detectedManufacturer)) {
        const nameMatch = text.toLowerCase().includes(catalogPart.partName.toLowerCase().substring(0, 8));
        if (nameMatch) {
          confidence = 60;
          matchType = 'similar';
        }
      }
      
      if (confidence > 50) {
        matches.push({
          id: catalogPart.id,
          partNumber: catalogPart.partNumber,
          partName: catalogPart.partName,
          manufacturer: catalogPart.manufacturer,
          priceEur: catalogPart.priceEur,
          supplierName: catalogPart.supplierName,
          confidence,
          matchType
        });
      }
    }
    
    // Sortiranje po pouzdanosti
    return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  };

  // Glavna OCR funkcija
  const performOCR = async (imageData: string): Promise<OCRResult> => {
    return new Promise((resolve, reject) => {
      Tesseract.recognize(imageData, 'eng+srp', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setScanProgress(Math.round(m.progress * 100));
          }
        }
      }).then(({ data }) => {
        const text = data.text;
        const confidence = data.confidence;
        const processedWords = data.words.map(w => w.text).filter(w => w.length > 2);
        
        const detectedManufacturer = detectManufacturer(text);
        const partNumbers = extractPartNumbers(text);
        const modelNumbers = extractModelNumbers(text);
        
        const result: OCRResult = {
          text,
          confidence,
          timestamp: new Date(),
          processedWords,
          detectedManufacturer,
          detectedPartNumber: partNumbers[0],
          detectedModelNumber: modelNumbers[0]
        };
        
        resolve(result);
      }).catch(reject);
    });
  };

  // Skeniranje fotografije
  const scanImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    setIsProcessing(true);
    setScanProgress(0);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      const ocrResult = await performOCR(imageData);
      
      setResults(prev => [ocrResult, ...prev].slice(0, 10)); // Čuvamo poslednih 10 rezultata
      
      // Pretraži katalog za poklapanja
      const matches = searchCatalogParts(ocrResult);
      setMatchedParts(matches);
      
      // Automatski popuni formu ako je pronađen dobar match
      if (matches.length > 0 && matches[0].confidence > 80) {
        const bestMatch = matches[0];
        setFormData(prev => ({
          ...prev,
          partNumber: bestMatch.partNumber,
          partName: bestMatch.partName,
          manufacturer: bestMatch.manufacturer,
          unitCost: bestMatch.priceEur || '',
          supplierName: bestMatch.supplierName || '',
          ocrConfidence: Math.round(ocrResult.confidence),
          associatedCatalogPartId: bestMatch.id,
          notes: `OCR skeniranje - ${ocrResult.confidence.toFixed(1)}% pouzdanost`
        }));
        
        toast({
          title: "Deo prepoznat!",
          description: `Pronađen: ${bestMatch.partName} (${bestMatch.confidence}% poklapanje)`,
        });
      }
      
    } catch (error) {
      console.error('Error during OCR processing:', error);
      toast({
        title: "Greška OCR-a",
        description: "Došlo je do greške tokom prepoznavanja teksta",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
      setIsProcessing(false);
      setScanProgress(0);
    }
  };

  // Korišćenje odabranog dela iz poklapanja
  const useMatchedPart = (part: MatchedPart) => {
    setFormData(prev => ({
      ...prev,
      partNumber: part.partNumber,
      partName: part.partName,
      manufacturer: part.manufacturer,
      unitCost: part.priceEur || '',
      supplierName: part.supplierName || '',
      associatedCatalogPartId: part.id,
      notes: `Odabran iz kataloga - ${part.confidence}% poklapanje`
    }));
    
    toast({
      title: "Deo odabran",
      description: `${part.partName} je dodana u formu`,
    });
  };

  // Čuvanje potrošenog dela
  const saveConsumedPart = async () => {
    if (!formData.partNumber || !formData.partName) {
      toast({
        title: "Nedostaju podaci",
        description: "Kataloški broj i naziv dela su obavezni",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const consumedPartData = {
        serviceId,
        technicianId,
        ...formData,
        totalCost: formData.unitCost ? 
          (parseFloat(formData.unitCost) * formData.quantity).toString() : 
          undefined
      };
      
      const response = await fetch('/api/consumed-parts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(consumedPartData)
      });
      
      if (response.ok) {
        const savedPart = await response.json();
        onPartScanned(savedPart);
        
        toast({
          title: "Deo sačuvan!",
          description: `${formData.partName} je uspešno evidiran`,
        });
        
        // Resetuj formu
        setFormData({
          partNumber: '',
          partName: '',
          manufacturer: '',
          quantity: 1,
          unitCost: '',
          supplierName: '',
          installationNotes: '',
          scannedFromLabel: true,
          ocrConfidence: 0,
          associatedCatalogPartId: null,
          notes: ''
        });
        
        onClose();
      } else {
        throw new Error('Failed to save consumed part');
      }
    } catch (error) {
      console.error('Error saving consumed part:', error);
      toast({
        title: "Greška",
        description: "Nije moguće sačuvati potrošeni deo",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            OCR Kamera za Rezervne Delove
          </DialogTitle>
          <DialogDescription>
            Skenirajte nalepnice rezervnih delova ili aparata za automatsko prepoznavanje i evidenciju
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="camera" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="camera">Kamera</TabsTrigger>
            <TabsTrigger value="results">Rezultati ({results.length})</TabsTrigger>
            <TabsTrigger value="form">Forma za unos</TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
            <div className="flex gap-2 justify-center">
              <Button
                variant={scanMode === 'part_label' ? 'default' : 'outline'}
                onClick={() => setScanMode('part_label')}
                size="sm"
              >
                Nalepnica rezervnog dela
              </Button>
              <Button
                variant={scanMode === 'appliance_label' ? 'default' : 'outline'}
                onClick={() => setScanMode('appliance_label')}
                size="sm"
              >
                Nalepnica aparata
              </Button>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {!hasCamera && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                  <p className="text-white">Pokretanje kamere...</p>
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">OCR obrada u toku...</span>
                </div>
                <Progress value={scanProgress} className="w-full" />
                <p className="text-xs text-gray-500">Napredak: {scanProgress}%</p>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button 
                onClick={scanImage} 
                disabled={!hasCamera || isProcessing}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                {isProcessing ? 'Obrađuje...' : 'Skeniraj'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={startCamera}
                disabled={hasCamera}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Pronađena poklapanja */}
            {matchedParts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Pronađena poklapanja ({matchedParts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {matchedParts.map((part, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{part.partNumber}</span>
                          <Badge variant={
                            part.matchType === 'exact' ? 'default' : 
                            part.matchType === 'partial' ? 'secondary' : 'outline'
                          }>
                            {part.confidence}%
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{part.partName}</p>
                        <p className="text-xs text-gray-500">{part.manufacturer}</p>
                        {part.priceEur && (
                          <p className="text-xs font-medium text-green-600">{part.priceEur} EUR</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => useMatchedPart(part)}
                      >
                        Koristi
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>OCR Rezultati</CardTitle>
                <CardDescription>
                  Poslednji rezultati prepoznavanja teksta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Još nema rezultata skeniranja
                  </p>
                ) : (
                  results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          {result.confidence.toFixed(1)}% pouzdanost
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {result.detectedManufacturer && (
                        <div>
                          <strong>Proizvođač:</strong> {result.detectedManufacturer}
                        </div>
                      )}
                      
                      {result.detectedPartNumber && (
                        <div>
                          <strong>Kataloški broj:</strong> {result.detectedPartNumber}
                        </div>
                      )}
                      
                      {result.detectedModelNumber && (
                        <div>
                          <strong>Model:</strong> {result.detectedModelNumber}
                        </div>
                      )}
                      
                      <div className="text-sm bg-gray-50 p-2 rounded">
                        <strong>Tekst:</strong> {result.text.substring(0, 200)}
                        {result.text.length > 200 && '...'}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="form" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Podaci o potrošenom delu</CardTitle>
                <CardDescription>
                  Popunite ili proverite podatke o rezervnom delu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="partNumber">Kataloški broj *</Label>
                    <Input
                      id="partNumber"
                      value={formData.partNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, partNumber: e.target.value }))}
                      placeholder="AB123456"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="manufacturer">Proizvođač</Label>
                    <Input
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                      placeholder="Beko, Candy, Electrolux..."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="partName">Naziv dela *</Label>
                  <Input
                    id="partName"
                    value={formData.partName}
                    onChange={(e) => setFormData(prev => ({ ...prev, partName: e.target.value }))}
                    placeholder="Pumpa za vodu, Grejač, Filter..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quantity">Količina</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="unitCost">Cena po komadu (EUR)</Label>
                    <Input
                      id="unitCost"
                      value={formData.unitCost}
                      onChange={(e) => setFormData(prev => ({ ...prev, unitCost: e.target.value }))}
                      placeholder="25.50"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="totalCost">Ukupno</Label>
                    <Input
                      value={formData.unitCost ? 
                        (parseFloat(formData.unitCost) * formData.quantity).toFixed(2) + ' EUR' : 
                        ''
                      }
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="supplierName">Dobavljač</Label>
                  <Input
                    id="supplierName"
                    value={formData.supplierName}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
                    placeholder="Com Plus, Eurotehnika..."
                  />
                </div>

                <div>
                  <Label htmlFor="installationNotes">Napomene za ugradnju</Label>
                  <Textarea
                    id="installationNotes"
                    value={formData.installationNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, installationNotes: e.target.value }))}
                    placeholder="Posebne instrukcije za ugradnju..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Dodatne napomene</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Dodatne informacije..."
                    rows={2}
                  />
                </div>

                {formData.ocrConfidence > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      OCR pouzdanost: {formData.ocrConfidence}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Otkaži
          </Button>
          
          <Button onClick={saveConsumedPart} disabled={!formData.partNumber || !formData.partName}>
            <Check className="h-4 w-4 mr-2" />
            Sačuvaj potrošeni deo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}