import React, { useState } from 'react';
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { 
  DownloadCloud, 
  UploadCloud, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation } from '@tanstack/react-query';

type ImportResult = {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
  summary?: {
    clientsCreated: number;
    appliancesCreated: number;
    servicesCreated: number;
  };
};

export default function ExcelImportExport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('export');
  const [selectedImportType, setSelectedImportType] = useState<'clients' | 'appliances' | 'services' | 'legacy-complete'>('clients');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Funkcija za preuzimanje Excel fajla
  const downloadExcel = async (type: string) => {
    try {
      const response = await fetch(`/api/excel/${type}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      // Kreiraj blob iz odgovora i preuzmi fajl
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${type}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Preuzimanje uspešno',
        description: `Excel fajl za "${getTypeName(type)}" je uspešno preuzet.`,
        variant: 'default',
      });
    } catch (error) {
      console.error(`Error downloading Excel file:`, error);
      toast({
        title: 'Greška pri preuzimanju',
        description: `Došlo je do greške prilikom preuzimanja Excel fajla. ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
    }
  };

  // Funkcija za dobijanje imena tipa resursa
  const getTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      'clients': 'Klijenti',
      'technicians': 'Serviseri',
      'appliances': 'Uređaji',
      'services': 'Servisi',
      'maintenance': 'Planovi održavanja'
    };
    return typeMap[type] || type;
  };

  // Dropzone za uvoz fajlova
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileUpload(acceptedFiles[0]);
      }
    },
  });

  // Mutacija za uvoz Excel datoteke
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/excel/import/${selectedImportType}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Greška ${response.status}: ${response.statusText}`);
      }
      
      return await response.json() as ImportResult;
    },
    onMutate: () => {
      setIsUploading(true);
      setImportResult(null);
    },
    onSuccess: (data) => {
      setImportResult(data);
      toast({
        title: 'Uvoz završen',
        description: `Uspešno uvezeno ${data.imported} od ${data.total} zapisa.`,
        variant: data.failed > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Greška pri uvozu',
        description: error instanceof Error ? error.message : 'Došlo je do greške prilikom uvoza fajla.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Postupa sa odabranom datotekom
  const handleFileUpload = (file: File) => {
    importMutation.mutate(file);
  };

  // Ako korisnik nije administrator, prikaži poruku o nedostatku dozvole
  if (user?.role !== 'admin') {
    return (
      <div className="flex h-screen">
        <Sidebar isMobileOpen={sidebarOpen} closeMobileMenu={() => setSidebarOpen(false)} />
        <div className="flex-1">
          <Header toggleSidebar={toggleSidebar} />
          <div className="container mx-auto py-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Pristup odbijen</AlertTitle>
              <AlertDescription>
                Nemate dozvolu za pristup ovoj stranici. Samo administratori mogu upravljati uvozom i izvozom podataka.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar isMobileOpen={sidebarOpen} closeMobileMenu={() => setSidebarOpen(false)} />
      <div className="flex-1 overflow-auto">
        <Header toggleSidebar={toggleSidebar} />
        <div className="container mx-auto py-6">
          <h1 className="text-3xl font-bold mb-6">Excel Uvoz/Izvoz Podataka</h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">🔄 Migracija iz starog sistema</h2>
            <p className="text-blue-800">
              Sistem automatski prepoznaje i mapira podatke iz starog sistema:
              <strong className="mx-2">TV → Tivat, KO → Kotor, BD → Budva</strong> |
              <strong className="mx-2">SM → Sudo mašina, VM → Veš mašina, VM KOMB → Kombinovana veš mašina, frižider komb → Kombinovan frižider</strong>
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="export">
                <DownloadCloud className="mr-2 h-4 w-4" />
                Izvoz podataka
              </TabsTrigger>
              <TabsTrigger value="import">
                <UploadCloud className="mr-2 h-4 w-4" />
                Uvoz podataka
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="export">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Klijenti */}
                <Card>
                  <CardHeader>
                    <CardTitle>Klijenti</CardTitle>
                    <CardDescription>Izvoz baze klijenata u Excel format</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Izvoz svih podataka o klijentima uključujući kontakt informacije i adrese.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => downloadExcel('clients')} className="w-full">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Preuzmi Excel
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Serviseri */}
                <Card>
                  <CardHeader>
                    <CardTitle>Serviseri</CardTitle>
                    <CardDescription>Izvoz baze servisera u Excel format</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Izvoz svih podataka o serviserima uključujući njihove specijalnosti i kontakt informacije.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => downloadExcel('technicians')} className="w-full">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Preuzmi Excel
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Uređaji */}
                <Card>
                  <CardHeader>
                    <CardTitle>Uređaji</CardTitle>
                    <CardDescription>Izvoz baze uređaja u Excel format</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Izvoz svih podataka o uređajima uključujući modele, serijske brojeve i vlasnike.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => downloadExcel('appliances')} className="w-full">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Preuzmi Excel
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Servisi */}
                <Card>
                  <CardHeader>
                    <CardTitle>Servisi</CardTitle>
                    <CardDescription>Izvoz baze servisa u Excel format</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Izvoz svih podataka o servisima uključujući statuse, dodeljene servisere i datume.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => downloadExcel('services')} className="w-full">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Preuzmi Excel
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Planovi održavanja */}
                <Card>
                  <CardHeader>
                    <CardTitle>Planovi održavanja</CardTitle>
                    <CardDescription>Izvoz planova održavanja u Excel format</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Izvoz svih podataka o planovima održavanja uključujući frekvencije i naredne datume.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => downloadExcel('maintenance')} className="w-full">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Preuzmi Excel
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="import">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Uvoz podataka iz Excel fajla</CardTitle>
                  <CardDescription className="text-sm">
                    Odaberite tip podataka i priložite Excel fajl. Sistem automatski prepoznaje nazive kolona i mapira skraćenice.
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[40vh] overflow-y-auto py-4">
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="import-type" className="text-sm">Tip podataka za uvoz</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Button 
                          variant={selectedImportType === 'legacy-complete' ? 'default' : 'outline'}
                          onClick={() => setSelectedImportType('legacy-complete')}
                          className="justify-start col-span-2 h-8 text-sm"
                        >
                          🔄 Kompletna migracija (stari sistem)
                        </Button>
                        {selectedImportType === 'legacy-complete' && (
                          <div className="col-span-2 mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              <strong>Kompletna migracija:</strong> Čita jednu Excel tabelu sa svim podacima. Prepoznaje TV→Tivat, BD→Budva, VM→Veš mašina, SM→Sudo mašina.
                            </p>
                          </div>
                        )}
                        <Button 
                          variant={selectedImportType === 'clients' ? 'default' : 'outline'}
                          onClick={() => setSelectedImportType('clients')}
                          className="justify-start h-8 text-sm"
                        >
                          Klijenti
                        </Button>
                        <Button 
                          variant={selectedImportType === 'appliances' ? 'default' : 'outline'}
                          onClick={() => setSelectedImportType('appliances')}
                          className="justify-start h-8 text-sm"
                        >
                          Uređaji
                        </Button>
                        <Button 
                          variant={selectedImportType === 'services' ? 'default' : 'outline'}
                          onClick={() => setSelectedImportType('services')}
                          className="justify-start h-8 text-sm"
                        >
                          Servisi
                        </Button>
                      </div>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div>
                      <Label className="text-sm">Učitaj Excel fajl</Label>
                      <div 
                        {...getRootProps()} 
                        className="border-2 border-dashed rounded-md p-3 mt-1 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <input {...getInputProps()} />
                        <UploadCloud className="h-6 w-6 mx-auto text-slate-400" />
                        <p className="mt-1 text-xs">Prevucite Excel fajl ovde ili kliknite za odabir</p>
                        <p className="text-xs text-muted-foreground">
                          Podržani formati: .xlsx, .xls
                        </p>
                      </div>
                    </div>
                    
                    {isUploading && (
                      <div className="space-y-1">
                        <p className="text-sm">Učitavanje i obrada fajla...</p>
                        <Progress value={undefined} className="h-2" />
                      </div>
                    )}
                    
                    {importResult && (
                      <div className="space-y-3">
                        <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertTitle>Rezultat uvoza</AlertTitle>
                          <AlertDescription className="text-sm">
                            Ukupno: {importResult.total} | Uspešno: {importResult.imported} | Neuspešno: {importResult.failed}
                            {importResult.summary && (
                              <>
                                <br />
                                <strong>Kreirani:</strong> {importResult.summary.clientsCreated} klijenata, {importResult.summary.appliancesCreated} uređaja, {importResult.summary.servicesCreated} servisa
                              </>
                            )}
                          </AlertDescription>
                        </Alert>
                        
                        {importResult.errors.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-1">Greške ({importResult.errors.length}):</h4>
                            <div className="max-h-40 overflow-y-auto rounded border p-2 bg-red-50 dark:bg-red-900/20">
                              {importResult.errors.map((error, index) => (
                                <div key={index} className="text-xs text-red-700 dark:text-red-300 mb-1">
                                  Red {error.row}: {error.error}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}