import React, { useState } from 'react';
import { Camera, FileText, Zap, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EnhancedOCRCamera } from '@/components/enhanced-ocr-camera';
import { ScannedData } from '@/services/enhanced-ocr-service';

export default function OCRTestPage() {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [testResults, setTestResults] = useState<ScannedData[]>([]);
  const [currentManufacturer, setCurrentManufacturer] = useState<string>('generic');

  const handleScannedData = (data: ScannedData) => {
    console.log('🔬 OCR Test rezultat:', data);
    setTestResults(prev => [data, ...prev.slice(0, 9)]); // Drži poslednje 10 testova
    setIsCameraOpen(false);
  };

  const startTest = (manufacturer: string) => {
    setCurrentManufacturer(manufacturer);
    setIsCameraOpen(true);
  };

  const calculateScore = (data: ScannedData): number => {
    let score = data.confidence;
    if (data.model) score += 30;
    if (data.serialNumber) score += 40;
    if (data.productNumber) score += 20;
    if (data.manufacturerCode) score += 10;
    return score;
  };

  const getScoreColor = (score: number) => {
    if (score > 100) return 'bg-green-500';
    if (score > 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreText = (score: number) => {
    if (score > 100) return 'Odličo';
    if (score > 70) return 'Dobro';
    return 'Potrebno poboljšanje';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Camera className="h-8 w-8 text-blue-600" />
            Napredni OCR Test Centar
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Testirajte naprednu kamera funkcionalnost za automatsko čitanje generalija aparata. 
            Sistem koristi AI za detekciju modela, serijskog broja i drugih podataka.
          </p>
        </div>

        {/* Funkcionalnosti */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Napredne funkcije
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>✅ Pre-obrada slike</div>
              <div>✅ Više OCR pokušaja</div>
              <div>✅ Manufacturer-specific pattern</div>
              <div>✅ Automatska detekcija proizvođača</div>
              <div>✅ Pouzdanost scoring</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Detektovani podaci
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>📱 Model aparata</div>
              <div>🔢 Serijski broj</div>
              <div>📦 Product broj</div>
              <div>🏭 Kod proizvođača</div>
              <div>📅 Godina proizvodnje</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Podržani proizvođači
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>🔧 Beko</div>
              <div>⚡ Electrolux</div>
              <div>📱 Samsung</div>
              <div>🏠 LG</div>
              <div>🔧 Generalna detekcija</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Optimizacija
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>💡 Dobro osvetljenje</div>
              <div>📐 Stabilno držanje</div>
              <div>🎯 Fokus na nalepnicu</div>
              <div>🔍 Čist objektiv</div>
              <div>📏 Optimalna udaljenost</div>
            </CardContent>
          </Card>
        </div>

        {/* Test dugmad */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Testiranje po proizvođačima</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => startTest('generic')}
              className="flex items-center gap-2"
              variant="outline"
            >
              <Camera className="h-4 w-4" />
              Automatska detekcija
            </Button>
            <Button
              onClick={() => startTest('beko')}
              className="flex items-center gap-2"
              style={{ backgroundColor: '#e74c3c', color: 'white' }}
            >
              <Camera className="h-4 w-4" />
              Beko test
            </Button>
            <Button
              onClick={() => startTest('electrolux')}
              className="flex items-center gap-2"
              style={{ backgroundColor: '#3498db', color: 'white' }}
            >
              <Camera className="h-4 w-4" />
              Electrolux test
            </Button>
            <Button
              onClick={() => startTest('samsung')}
              className="flex items-center gap-2"
              style={{ backgroundColor: '#1f4788', color: 'white' }}
            >
              <Camera className="h-4 w-4" />
              Samsung test
            </Button>
            <Button
              onClick={() => startTest('lg')}
              className="flex items-center gap-2"
              style={{ backgroundColor: '#a50034', color: 'white' }}
            >
              <Camera className="h-4 w-4" />
              LG test
            </Button>
          </div>
        </div>

        {/* Rezultati testova */}
        {testResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Rezultati testiranja</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testResults.map((result, index) => {
                const score = calculateScore(result);
                return (
                  <Card key={index} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Test #{testResults.length - index}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getScoreColor(score)} text-white`}>
                            {getScoreText(score)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {Math.round(result.confidence)}%
                          </span>
                        </div>
                      </div>
                      {result.manufacturerCode && result.manufacturerCode !== 'generic' && (
                        <Badge variant="outline">{result.manufacturerCode}</Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {result.model && (
                        <div className="flex justify-between">
                          <span className="font-medium">Model:</span>
                          <span className="text-sm">{result.model}</span>
                        </div>
                      )}
                      {result.serialNumber && (
                        <div className="flex justify-between">
                          <span className="font-medium">SN:</span>
                          <span className="text-sm font-mono">{result.serialNumber}</span>
                        </div>
                      )}
                      {result.productNumber && (
                        <div className="flex justify-between">
                          <span className="font-medium">P/N:</span>
                          <span className="text-sm font-mono">{result.productNumber}</span>
                        </div>
                      )}
                      {result.year && (
                        <div className="flex justify-between">
                          <span className="font-medium">Godina:</span>
                          <span className="text-sm">{result.year}</span>
                        </div>
                      )}
                      
                      {/* Skor analiza */}
                      <div className="pt-2 border-t">
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex justify-between">
                            <span>Osnovna pouzdanost:</span>
                            <span>{Math.round(result.confidence)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ukupan skor:</span>
                            <span className="font-medium">{Math.round(score)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Napomene o korišćenju */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Saveti za optimalne rezultate:</strong> Držite kameru stabilno, obezbedite dobro osvetljenje, 
            fokusirajte na nalepnicu sa podacima aparata, i sačekajte da se kamera stabilizuje pre skeniranja. 
            Sistem koristi napredne algoritme za prepoznavanje različitih formata generalija.
          </AlertDescription>
        </Alert>

        {/* Enhanced OCR Camera */}
        <EnhancedOCRCamera
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onDataScanned={handleScannedData}
          manufacturerHint={currentManufacturer}
        />
      </div>
    </div>
  );
}