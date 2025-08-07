import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Upload, Download, Package, Edit2, Trash2, Database } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Zod schema za PartKeepr katalog unos
const catalogEntrySchema = z.object({
  partNumber: z.string().min(1, "Kataloški broj je obavezan"),
  partName: z.string().min(1, "Naziv dela je obavezan"),
  description: z.string().optional(),
  category: z.enum(["washing-machine", "dishwasher", "oven", "cooker-hood", "tumble-dryer", "fridge-freezer", "microwave", "universal"]),
  manufacturer: z.string().min(1, "Proizvođač je obavezan"),
  compatibleModels: z.string().min(1, "Kompatibilni modeli su obavezni"),
  priceEur: z.number().optional(),
  priceGbp: z.number().optional(),
  supplierName: z.string().optional(),
  supplierUrl: z.string().optional(),
  imageUrls: z.string().optional(),
  availability: z.enum(["available", "out_of_stock", "discontinued", "special_order"]).default("available"),
  stockLevel: z.number().optional(),
  minStockLevel: z.number().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  technicalSpecs: z.string().optional(),
  installationNotes: z.string().optional(),
  warrantyPeriod: z.string().optional(),
  isOemPart: z.boolean().default(false),
  alternativePartNumbers: z.string().optional(),
  sourceType: z.enum(["manual", "partkeepr_import", "web_scraping", "supplier_api"]).default("manual")
});

type CatalogEntry = {
  id: number;
  partNumber: string;
  partName: string;
  description?: string;
  category: string;
  manufacturer: string;
  compatibleModels: string[];
  priceEur?: number;
  priceGbp?: number;
  supplierName?: string;
  supplierUrl?: string;
  imageUrls: string[];
  availability: string;
  stockLevel?: number;
  minStockLevel?: number;
  dimensions?: string;
  weight?: string;
  technicalSpecs?: string;
  installationNotes?: string;
  warrantyPeriod?: string;
  isOemPart: boolean;
  alternativePartNumbers: string[];
  sourceType: string;
  createdAt: string;
  lastUpdated: string;
};

const categoryLabels = {
  "washing-machine": "Mašina za veš",
  "dishwasher": "Sudopera", 
  "oven": "Šporet/pećnica",
  "cooker-hood": "Aspirator",
  "tumble-dryer": "Sušilica",
  "fridge-freezer": "Frižider/zamrzivač",
  "microwave": "Mikrotalasna",
  "universal": "Univerzalni delovi"
};

const availabilityLabels = {
  "available": "Dostupno",
  "out_of_stock": "Nema na stanju", 
  "discontinued": "Prestalo da se proizvodi",
  "special_order": "Specijalna porudžbina"
};

const availabilityColors = {
  "available": "bg-green-100 text-green-800",
  "out_of_stock": "bg-yellow-100 text-yellow-800",
  "discontinued": "bg-red-100 text-red-800", 
  "special_order": "bg-blue-100 text-blue-800"
};

function SparePartsCatalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CatalogEntry | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form za kreiranje/uređivanje dela
  const form = useForm({
    resolver: zodResolver(catalogEntrySchema),
    defaultValues: {
      partNumber: '',
      partName: '',
      description: '',
      category: 'universal' as const,
      manufacturer: '',
      compatibleModels: '',
      priceEur: undefined,
      priceGbp: undefined,
      supplierName: '',
      supplierUrl: '',
      imageUrls: '',
      availability: 'available' as const,
      stockLevel: undefined,
      minStockLevel: undefined,
      dimensions: '',
      weight: '',
      technicalSpecs: '',
      installationNotes: '',
      warrantyPeriod: '',
      isOemPart: false,
      alternativePartNumbers: '',
      sourceType: 'manual' as const
    }
  });

  // Učitaj katalog
  const { data: catalog = [], isLoading, error } = useQuery<CatalogEntry[]>({
    queryKey: ['/api/admin/spare-parts-catalog'],
    enabled: true
  });

  // Učitaj statistike
  const { data: stats } = useQuery<{
    totalParts: number;
    availableParts: number;
    categoriesCount: number;
    manufacturersCount: number;
    byCategory: Record<string, number>;
    byManufacturer: Record<string, number>;
  }>({
    queryKey: ['/api/admin/spare-parts-catalog/stats'],
    enabled: true
  });

  // Kreiraj katalog unos
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/spare-parts-catalog', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts-catalog/stats'] });
      form.reset();
      setIsCreateDialogOpen(false);
      toast({
        title: "Uspeh",
        description: "Katalog unos je uspešno kreiran"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.details?.[0]?.message || "Greška pri kreiranju katalog unosa",
        variant: "destructive"
      });
    }
  });

  // Ažuriraj katalog unos
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => apiRequest(`/api/admin/spare-parts-catalog/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts-catalog/stats'] });
      form.reset();
      setEditingEntry(null);
      toast({
        title: "Uspeh",
        description: "Katalog unos je uspešno ažuriran"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: "Greška pri ažuriranju katalog unosa",
        variant: "destructive"
      });
    }
  });

  // Obriši katalog unos
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/spare-parts-catalog/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts-catalog/stats'] });
      toast({
        title: "Uspeh",
        description: "Katalog unos je uspešno uklonjen"
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri brisanju katalog unosa",
        variant: "destructive"
      });
    }
  });

  // CSV Import
  const importCsvMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      return fetch('/api/admin/spare-parts-catalog/import-csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts-catalog/stats'] });
      setCsvFile(null);
      setIsImporting(false);
      toast({
        title: "CSV Uvoz završen",
        description: data.message
      });
    },
    onError: (error: any) => {
      setIsImporting(false);
      toast({
        title: "Greška pri uvozu",
        description: error.error || "Neočekivana greška pri uvozu CSV datoteke",
        variant: "destructive"
      });
    }
  });

  // Filtriraj katalog
  const filteredCatalog = catalog.filter((entry: CatalogEntry) => {
    const matchesSearch = searchTerm === '' || 
      entry.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
    const matchesManufacturer = selectedManufacturer === 'all' || entry.manufacturer === selectedManufacturer;
    
    return matchesSearch && matchesCategory && matchesManufacturer;
  });

  // Jedinstveni proizvođači za filter
  const uniqueManufacturers = Array.from(new Set(catalog.map((entry: CatalogEntry) => entry.manufacturer))).sort();

  const handleCreateOrUpdate = (data: any) => {
    // Transform string polja u array-e
    const transformedData = {
      ...data,
      compatibleModels: data.compatibleModels.split(',').map((s: string) => s.trim()).filter(Boolean),
      imageUrls: data.imageUrls ? data.imageUrls.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      alternativePartNumbers: data.alternativePartNumbers ? data.alternativePartNumbers.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: transformedData });
    } else {
      createMutation.mutate(transformedData);
    }
  };

  const handleEdit = (entry: CatalogEntry) => {
    setEditingEntry(entry);
    form.reset({
      partNumber: entry.partNumber,
      partName: entry.partName,
      description: entry.description || '',
      category: entry.category as any,
      manufacturer: entry.manufacturer,
      compatibleModels: entry.compatibleModels.join(', '),
      priceEur: entry.priceEur ? entry.priceEur : undefined,
      priceGbp: entry.priceGbp ? entry.priceGbp : undefined,
      supplierName: entry.supplierName || '',
      supplierUrl: entry.supplierUrl || '',
      imageUrls: entry.imageUrls.join(', '),
      availability: entry.availability as any,
      stockLevel: entry.stockLevel ? entry.stockLevel : undefined,
      minStockLevel: entry.minStockLevel ? entry.minStockLevel : undefined,
      dimensions: entry.dimensions || '',
      weight: entry.weight || '',
      technicalSpecs: entry.technicalSpecs || '',
      installationNotes: entry.installationNotes || '',
      warrantyPeriod: entry.warrantyPeriod || '',
      isOemPart: entry.isOemPart,
      alternativePartNumbers: entry.alternativePartNumbers.join(', '),
      sourceType: entry.sourceType as any
    });
    setIsCreateDialogOpen(true);
  };

  const handleCsvImport = () => {
    if (!csvFile) return;
    setIsImporting(true);
    importCsvMutation.mutate(csvFile);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/spare-parts-catalog/export-csv', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spare-parts-catalog-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Uspeh",
        description: "Katalog je uspešno eksportovan"
      });
    } catch (error) {
      toast({
        title: "Greška",
        description: "Greška pri eksportu kataloga",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Učitavanje kataloga...</div>;
  }

  if (error) {
    return (
      <div className="flex justify-center p-8 text-red-600">
        Greška pri učitavanju kataloga rezervnih delova
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">PartKeepr Katalog Rezervnih Delova</h1>
          <p className="text-muted-foreground">
            Upravljanje katalogom rezervnih delova sa CSV uvozom/izvozom
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Izvezi CSV
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingEntry(null); form.reset(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj Deo
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Statistike */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Ukupno delova</p>
                  <p className="text-2xl font-bold">{stats.totalParts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Dostupno</p>
                  <p className="text-2xl font-bold">{stats.availableParts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Kategorije</p>
                <p className="text-2xl font-bold">{stats.categoriesCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Proizvođači</p>
                <p className="text-2xl font-bold">{stats.manufacturersCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CSV Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            CSV Uvoz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="flex-1"
            />
            <Button 
              onClick={handleCsvImport}
              disabled={!csvFile || isImporting}
            >
              {isImporting ? 'Uvozi...' : 'Uvezi CSV'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Podržani formati: CSV sa header redovima. Potrebne kolone: Part Number, Part Name, Category, Manufacturer
          </p>
        </CardContent>
      </Card>

      {/* Filteri */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pretraži po nazivu, kataloške broju, proizvođaču..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Kategorija" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sve kategorije</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Proizvođač" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi proizvođači</SelectItem>
                {uniqueManufacturers.map((manufacturer) => (
                  <SelectItem key={manufacturer} value={manufacturer}>{manufacturer}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Katalog tabela */}
      <Card>
        <CardHeader>
          <CardTitle>
            Katalog ({filteredCatalog.length} {filteredCatalog.length === 1 ? 'deo' : 'delova'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kataloški broj</TableHead>
                <TableHead>Naziv</TableHead>
                <TableHead>Kategorija</TableHead>
                <TableHead>Proizvođač</TableHead>
                <TableHead>Dostupnost</TableHead>
                <TableHead>Cena EUR</TableHead>
                <TableHead>Stanje</TableHead>
                <TableHead>Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCatalog.map((entry: CatalogEntry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.partNumber}</TableCell>
                  <TableCell>{entry.partName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {categoryLabels[entry.category as keyof typeof categoryLabels]}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.manufacturer}</TableCell>
                  <TableCell>
                    <Badge className={availabilityColors[entry.availability as keyof typeof availabilityColors]}>
                      {availabilityLabels[entry.availability as keyof typeof availabilityLabels]}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.priceEur ? `€${entry.priceEur}` : '-'}</TableCell>
                  <TableCell>{entry.stockLevel ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(entry)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Uredi Katalog Unos' : 'Dodaj Novi Katalog Unos'}
            </DialogTitle>
            <DialogDescription>
              {editingEntry ? 'Ažuriraj informacije o rezervnom delu' : 'Kreiraj novi unos u katalog rezervnih delova'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateOrUpdate)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="partNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kataloški broj *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="NPR123456" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="partName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Naziv dela *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Pumpa za vodu" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategorija *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberi kategoriju" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proizvođač *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Candy" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="priceEur"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena EUR</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          placeholder="49.99" 
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="availability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dostupnost</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(availabilityLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="compatibleModels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kompatibilni modeli *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="CS44 128TXME, CS34 102TXME (odvojena zarezom)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Detaljni opis rezervnog dela..." rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dobavljač</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="eSpares.co.uk" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="stockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stanje</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="10"
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Otkaži
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? 'Čuva...' 
                    : editingEntry ? 'Ažuriraj' : 'Kreiraj'
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SparePartsCatalog;