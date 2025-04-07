import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileUp, CheckCircle2, AlertCircle, FileX, FileSpreadsheet, Upload, FileText, AlertTriangle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";

type ImportResult = {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
};

type FileImportState = {
  isLoading: boolean;
  isDone: boolean;
  file: File | null;
  result: ImportResult | null;
  error: string | null;
};

export default function ExcelImportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("clients");
  
  const initialState: FileImportState = {
    isLoading: false,
    isDone: false,
    file: null,
    result: null,
    error: null
  };
  
  const [clientsImport, setClientsImport] = useState<FileImportState>({...initialState});
  const [appliancesImport, setAppliancesImport] = useState<FileImportState>({...initialState});
  const [servicesImport, setServicesImport] = useState<FileImportState>({...initialState});
  
  // Uvoz klijenata
  const clientsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/excel/import/clients', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Greška: ${response.status} ${response.statusText}`);
      }
      
      return await response.json() as ImportResult;
    },
    onSuccess: (data) => {
      setClientsImport(prev => ({
        ...prev,
        isLoading: false,
        isDone: true,
        result: data,
        error: null
      }));
      
      toast({
        title: "Klijenti uvezeni",
        description: `Uspješno uvezeno ${data.imported} od ${data.total} zapisa.`,
        variant: data.failed > 0 ? "destructive" : "default"
      });
    },
    onError: (error: Error) => {
      setClientsImport(prev => ({
        ...prev,
        isLoading: false,
        isDone: true,
        result: null,
        error: error.message
      }));
      
      toast({
        title: "Greška",
        description: `Greška pri uvozu: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Uvoz uređaja
  const appliancesMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/excel/import/appliances', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Greška: ${response.status} ${response.statusText}`);
      }
      
      return await response.json() as ImportResult;
    },
    onSuccess: (data) => {
      setAppliancesImport(prev => ({
        ...prev,
        isLoading: false,
        isDone: true,
        result: data,
        error: null
      }));
      
      toast({
        title: "Uređaji uvezeni",
        description: `Uspješno uvezeno ${data.imported} od ${data.total} zapisa.`,
        variant: data.failed > 0 ? "destructive" : "default"
      });
    },
    onError: (error: Error) => {
      setAppliancesImport(prev => ({
        ...prev,
        isLoading: false,
        isDone: true,
        result: null,
        error: error.message
      }));
      
      toast({
        title: "Greška",
        description: `Greška pri uvozu: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Uvoz servisa
  const servicesMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/excel/import/services', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Greška: ${response.status} ${response.statusText}`);
      }
      
      return await response.json() as ImportResult;
    },
    onSuccess: (data) => {
      setServicesImport(prev => ({
        ...prev,
        isLoading: false,
        isDone: true,
        result: data,
        error: null
      }));
      
      toast({
        title: "Servisi uvezeni",
        description: `Uspješno uvezeno ${data.imported} od ${data.total} zapisa.`,
        variant: data.failed > 0 ? "destructive" : "default"
      });
    },
    onError: (error: Error) => {
      setServicesImport(prev => ({
        ...prev,
        isLoading: false,
        isDone: true,
        result: null,
        error: error.message
      }));
      
      toast({
        title: "Greška",
        description: `Greška pri uvozu: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Dropzone za klijente
  const clientsDropzone = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: clientsImport.isLoading,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      
      const file = acceptedFiles[0];
      setClientsImport({
        ...initialState,
        file
      });
    }
  });
  
  // Dropzone za uređaje
  const appliancesDropzone = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: appliancesImport.isLoading,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      
      const file = acceptedFiles[0];
      setAppliancesImport({
        ...initialState,
        file
      });
    }
  });
  
  // Dropzone za servise
  const servicesDropzone = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: servicesImport.isLoading,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      
      const file = acceptedFiles[0];
      setServicesImport({
        ...initialState,
        file
      });
    }
  });
  
  // Uvoz klijenata
  const handleImportClients = () => {
    if (!clientsImport.file) return;
    
    setClientsImport(prev => ({
      ...prev,
      isLoading: true,
      isDone: false,
      result: null,
      error: null
    }));
    
    clientsMutation.mutate(clientsImport.file);
  };
  
  // Uvoz uređaja
  const handleImportAppliances = () => {
    if (!appliancesImport.file) return;
    
    setAppliancesImport(prev => ({
      ...prev,
      isLoading: true,
      isDone: false,
      result: null,
      error: null
    }));
    
    appliancesMutation.mutate(appliancesImport.file);
  };
  
  // Uvoz servisa
  const handleImportServices = () => {
    if (!servicesImport.file) return;
    
    setServicesImport(prev => ({
      ...prev,
      isLoading: true,
      isDone: false,
      result: null,
      error: null
    }));
    
    servicesMutation.mutate(servicesImport.file);
  };
  
  // Reset stanja za klijente
  const resetClientsImport = () => {
    setClientsImport({...initialState});
  };
  
  // Reset stanja za uređaje
  const resetAppliancesImport = () => {
    setAppliancesImport({...initialState});
  };
  
  // Reset stanja za servise
  const resetServicesImport = () => {
    setServicesImport({...initialState});
  };
  
  if (user?.role !== "admin") {
    return (
      <AdminLayout>
        <div className="container py-10">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pristup zabranjen</AlertTitle>
            <AlertDescription>
              Nemate dozvolu za pristup ovoj stranici. Samo administratori mogu uvoziti Excel fajlove.
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/">Nazad na početnu</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Uvoz podataka</h2>
            <p className="text-muted-foreground">
              Uvezite podatke iz Excel fajlova u sistem
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/excel-export">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Izvoz podataka
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">
                Nazad na kontrolnu tablu
              </Link>
            </Button>
          </div>
        </div>
        
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="mt-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clients">Klijenti</TabsTrigger>
            <TabsTrigger value="appliances">Uređaji</TabsTrigger>
            <TabsTrigger value="services">Servisi</TabsTrigger>
          </TabsList>
          
          {/* Uvoz klijenata */}
          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle>Uvoz klijenata</CardTitle>
                <CardDescription>
                  Uvezite klijente iz Excel fajla. Potrebni podaci: fullName (ime i prezime), phone (telefon), email, address, city.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientsImport.error ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Greška</AlertTitle>
                    <AlertDescription>
                      {clientsImport.error}
                    </AlertDescription>
                  </Alert>
                ) : null}
                
                {clientsImport.isLoading ? (
                  <div className="space-y-3 py-8">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-medium">Uvoz klijenata u toku...</h3>
                      <p className="text-muted-foreground">Molimo sačekajte dok se fajl obradi</p>
                    </div>
                    <Progress value={50} className="w-full" />
                  </div>
                ) : clientsImport.isDone && clientsImport.result ? (
                  <div className="space-y-6 py-6">
                    <div className="text-center">
                      {clientsImport.result.failed > 0 ? (
                        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                      ) : (
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      )}
                      <h3 className="text-lg font-medium">Uvoz završen</h3>
                      <p className="text-muted-foreground">
                        Ukupno: {clientsImport.result.total} zapisa
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-green-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg text-green-600">Uspješno</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-4xl font-bold text-green-600">{clientsImport.result.imported}</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-red-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg text-red-600">Neuspješno</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-4xl font-bold text-red-600">{clientsImport.result.failed}</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {clientsImport.result.errors.length > 0 ? (
                      <div>
                        <h4 className="text-lg font-medium mb-2">Greške</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Red</TableHead>
                              <TableHead>Greška</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clientsImport.result.errors.map((error, index) => (
                              <TableRow key={index}>
                                <TableCell>{error.row}</TableCell>
                                <TableCell>{error.error}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div 
                    {...clientsDropzone.getRootProps()} 
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      clientsDropzone.isDragActive 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50 hover:bg-background"
                    }`}
                  >
                    <input {...clientsDropzone.getInputProps()} />
                    
                    <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    
                    {clientsImport.file ? (
                      <>
                        <p className="text-lg font-medium">Odabran fajl:</p>
                        <p className="text-muted-foreground mb-2">{clientsImport.file.name}</p>
                        <Badge variant="outline" className="mb-4">
                          {(clientsImport.file.size / 1024).toFixed(2)} KB
                        </Badge>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium">Prevucite Excel fajl ovdje ili kliknite za odabir</p>
                        <p className="text-muted-foreground">Podržani formati: .xlsx, .xls, .csv</p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                {!clientsImport.isLoading && clientsImport.file && !clientsImport.isDone ? (
                  <>
                    <Button variant="outline" onClick={resetClientsImport}>
                      Otkaži
                    </Button>
                    <Button onClick={handleImportClients}>
                      <Upload className="mr-2 h-4 w-4" />
                      Uvezi klijente
                    </Button>
                  </>
                ) : !clientsImport.isLoading && clientsImport.isDone ? (
                  <>
                    <Button variant="outline" onClick={resetClientsImport}>
                      Novi uvoz
                    </Button>
                    <Button asChild>
                      <Link href="/admin/clients">
                        Prikaži klijente
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div></div> // Prazan div za loading stanje
                )}
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Uvoz uređaja */}
          <TabsContent value="appliances">
            <Card>
              <CardHeader>
                <CardTitle>Uvoz uređaja</CardTitle>
                <CardDescription>
                  Uvezite uređaje iz Excel fajla. Obavezni podaci: client (ime klijenta), model, manufacturerId, categoryId.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appliancesImport.error ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Greška</AlertTitle>
                    <AlertDescription>
                      {appliancesImport.error}
                    </AlertDescription>
                  </Alert>
                ) : null}
                
                {appliancesImport.isLoading ? (
                  <div className="space-y-3 py-8">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-medium">Uvoz uređaja u toku...</h3>
                      <p className="text-muted-foreground">Molimo sačekajte dok se fajl obradi</p>
                    </div>
                    <Progress value={50} className="w-full" />
                  </div>
                ) : appliancesImport.isDone && appliancesImport.result ? (
                  <div className="space-y-6 py-6">
                    <div className="text-center">
                      {appliancesImport.result.failed > 0 ? (
                        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                      ) : (
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      )}
                      <h3 className="text-lg font-medium">Uvoz završen</h3>
                      <p className="text-muted-foreground">
                        Ukupno: {appliancesImport.result.total} zapisa
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-green-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg text-green-600">Uspješno</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-4xl font-bold text-green-600">{appliancesImport.result.imported}</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-red-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg text-red-600">Neuspješno</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-4xl font-bold text-red-600">{appliancesImport.result.failed}</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {appliancesImport.result.errors.length > 0 ? (
                      <div>
                        <h4 className="text-lg font-medium mb-2">Greške</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Red</TableHead>
                              <TableHead>Greška</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {appliancesImport.result.errors.map((error, index) => (
                              <TableRow key={index}>
                                <TableCell>{error.row}</TableCell>
                                <TableCell>{error.error}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div 
                    {...appliancesDropzone.getRootProps()} 
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      appliancesDropzone.isDragActive 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50 hover:bg-background"
                    }`}
                  >
                    <input {...appliancesDropzone.getInputProps()} />
                    
                    <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    
                    {appliancesImport.file ? (
                      <>
                        <p className="text-lg font-medium">Odabran fajl:</p>
                        <p className="text-muted-foreground mb-2">{appliancesImport.file.name}</p>
                        <Badge variant="outline" className="mb-4">
                          {(appliancesImport.file.size / 1024).toFixed(2)} KB
                        </Badge>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium">Prevucite Excel fajl ovdje ili kliknite za odabir</p>
                        <p className="text-muted-foreground">Podržani formati: .xlsx, .xls, .csv</p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                {!appliancesImport.isLoading && appliancesImport.file && !appliancesImport.isDone ? (
                  <>
                    <Button variant="outline" onClick={resetAppliancesImport}>
                      Otkaži
                    </Button>
                    <Button onClick={handleImportAppliances}>
                      <Upload className="mr-2 h-4 w-4" />
                      Uvezi uređaje
                    </Button>
                  </>
                ) : !appliancesImport.isLoading && appliancesImport.isDone ? (
                  <>
                    <Button variant="outline" onClick={resetAppliancesImport}>
                      Novi uvoz
                    </Button>
                    <Button asChild>
                      <Link href="/admin/appliances">
                        Prikaži uređaje
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div></div> // Prazan div za loading stanje
                )}
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Uvoz servisa */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle>Uvoz servisa</CardTitle>
                <CardDescription>
                  Uvezite servise iz Excel fajla. Obavezni podaci: client (ime klijenta), appliance (serijski broj uređaja), description.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {servicesImport.error ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Greška</AlertTitle>
                    <AlertDescription>
                      {servicesImport.error}
                    </AlertDescription>
                  </Alert>
                ) : null}
                
                {servicesImport.isLoading ? (
                  <div className="space-y-3 py-8">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-medium">Uvoz servisa u toku...</h3>
                      <p className="text-muted-foreground">Molimo sačekajte dok se fajl obradi</p>
                    </div>
                    <Progress value={50} className="w-full" />
                  </div>
                ) : servicesImport.isDone && servicesImport.result ? (
                  <div className="space-y-6 py-6">
                    <div className="text-center">
                      {servicesImport.result.failed > 0 ? (
                        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                      ) : (
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      )}
                      <h3 className="text-lg font-medium">Uvoz završen</h3>
                      <p className="text-muted-foreground">
                        Ukupno: {servicesImport.result.total} zapisa
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-green-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg text-green-600">Uspješno</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-4xl font-bold text-green-600">{servicesImport.result.imported}</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-red-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg text-red-600">Neuspješno</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-4xl font-bold text-red-600">{servicesImport.result.failed}</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {servicesImport.result.errors.length > 0 ? (
                      <div>
                        <h4 className="text-lg font-medium mb-2">Greške</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Red</TableHead>
                              <TableHead>Greška</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {servicesImport.result.errors.map((error, index) => (
                              <TableRow key={index}>
                                <TableCell>{error.row}</TableCell>
                                <TableCell>{error.error}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div 
                    {...servicesDropzone.getRootProps()} 
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      servicesDropzone.isDragActive 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50 hover:bg-background"
                    }`}
                  >
                    <input {...servicesDropzone.getInputProps()} />
                    
                    <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    
                    {servicesImport.file ? (
                      <>
                        <p className="text-lg font-medium">Odabran fajl:</p>
                        <p className="text-muted-foreground mb-2">{servicesImport.file.name}</p>
                        <Badge variant="outline" className="mb-4">
                          {(servicesImport.file.size / 1024).toFixed(2)} KB
                        </Badge>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium">Prevucite Excel fajl ovdje ili kliknite za odabir</p>
                        <p className="text-muted-foreground">Podržani formati: .xlsx, .xls, .csv</p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                {!servicesImport.isLoading && servicesImport.file && !servicesImport.isDone ? (
                  <>
                    <Button variant="outline" onClick={resetServicesImport}>
                      Otkaži
                    </Button>
                    <Button onClick={handleImportServices}>
                      <Upload className="mr-2 h-4 w-4" />
                      Uvezi servise
                    </Button>
                  </>
                ) : !servicesImport.isLoading && servicesImport.isDone ? (
                  <>
                    <Button variant="outline" onClick={resetServicesImport}>
                      Novi uvoz
                    </Button>
                    <Button asChild>
                      <Link href="/admin/services">
                        Prikaži servise
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div></div> // Prazan div za loading stanje
                )}
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-2">Uputstvo za uvoz podataka</h3>
          <Alert className="mb-4">
            <FileText className="h-4 w-4" />
            <AlertTitle>Prije uvoza</AlertTitle>
            <AlertDescription>
              <p>Priprema Excel fajla za uvoz:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Prvi red mora sadržati nazive kolona</li>
                <li>Imena kolona trebaju biti na engleskom (fullName, phone, model, itd.) ili na srpskom (ime_prezime, telefon, itd.)</li>
                <li>Za uvoz klijenata: obavezna polja su fullName (ime i prezime) i phone (telefon)</li>
                <li>Za uvoz uređaja: obavezna polja su clientId (ili ime klijenta), categoryId (ili naziv kategorije), manufacturerId (ili naziv proizvođača)</li>
                <li>Za uvoz servisa: obavezna polja su clientId (ili ime klijenta), applianceId (ili serijski broj uređaja) i description (opis problema)</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </AdminLayout>
  );
}