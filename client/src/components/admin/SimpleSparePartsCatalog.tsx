import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, TrendingUp, Archive, Download } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CatalogEntry {
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
}

interface StatsData {
  totalParts: number;
  availableParts: number;
  categoriesCount: number;
  manufacturersCount: number;
  byCategory: Record<string, number>;
  byManufacturer: Record<string, number>;
}

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

export default function SimpleSparePartsCatalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Učitavanje statistika
  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ['/api/admin/spare-parts-catalog/stats']
  });

  // Učitavanje kataloga
  const { data: catalog, isLoading: catalogLoading } = useQuery<CatalogEntry[]>({
    queryKey: ['/api/admin/spare-parts-catalog']
  });

  if (statsLoading || catalogLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg">Učitavam katalog rezervnih delova...</span>
        </div>
      </div>
    );
  }

  if (!catalog || !stats) {
    return (
      <div className="space-y-6">
        <div className="text-center text-gray-500">
          Greška pri učitavanju kataloga rezervnih delova.
        </div>
      </div>
    );
  }

  // Filtriranje kataloga
  const filteredCatalog = catalog.filter((entry: CatalogEntry) => {
    const matchesSearch = !searchTerm || 
      entry.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.compatibleModels.some(model => model.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
    const matchesManufacturer = selectedManufacturer === 'all' || entry.manufacturer === selectedManufacturer;
    
    return matchesSearch && matchesCategory && matchesManufacturer;
  });

  // Jedinstveni proizvođači za filter
  const uniqueManufacturers = Array.from(new Set(catalog.map((entry: CatalogEntry) => entry.manufacturer))).sort();

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/spare-parts-catalog/export-csv', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rezervni-delovi-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Uspešno",
        description: "Katalog je izvezen u CSV format",
      });
    } catch (error) {
      toast({
        title: "Greška",
        description: "Neuspešan izvoz kataloga",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistike */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno delova</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dostupno</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableParts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kategorije</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categoriesCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proizvođači</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.manufacturersCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filteri i pretraga */}
      <Card>
        <CardHeader>
          <CardTitle>Katalog rezervnih delova</CardTitle>
          <CardDescription>
            Upravljanje katalogom rezervnih delova za Complus brendove
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pretražite po broju dela, nazivu, proizvođaču ili modelu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
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
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Proizvođač" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi proizvođači</SelectItem>
                  {uniqueManufacturers.map((manufacturer) => (
                    <SelectItem key={manufacturer} value={manufacturer}>{manufacturer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Izvezi CSV
              </Button>
            </div>
          </div>

          {/* Tabela rezultata */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broj dela</TableHead>
                  <TableHead>Naziv</TableHead>
                  <TableHead>Kategorija</TableHead>
                  <TableHead>Proizvođač</TableHead>
                  <TableHead>Cena EUR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stanje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCatalog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.partNumber}</TableCell>
                    <TableCell>{entry.partName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {categoryLabels[entry.category as keyof typeof categoryLabels] || entry.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.manufacturer}</TableCell>
                    <TableCell>
                      {entry.priceEur ? `€${entry.priceEur.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={availabilityColors[entry.availability as keyof typeof availabilityColors]}>
                        {availabilityLabels[entry.availability as keyof typeof availabilityLabels] || entry.availability}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.stockLevel !== undefined ? entry.stockLevel : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredCatalog.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nema rezultata za zadatu pretragu.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}