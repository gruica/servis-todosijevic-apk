import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  Filter,
  BarChart3,
  Download,
  Upload,
  Eye,
  ExternalLink
} from "lucide-react";

// Types
interface PartsCatalog {
  id: number;
  partNumber: string;
  partName: string;
  description?: string;
  category: string;
  manufacturerId: number;
  compatibleModels?: string;
  priceEur?: number;
  priceGbp?: number;
  supplierName?: string;
  supplierUrl?: string;
  imageUrls?: string;
  availability: string;
  stockLevel: number;
  minStockLevel: number;
  dimensions?: string;
  weight?: string;
  technicalSpecs?: string;
  installationNotes?: string;
  warrantyPeriod?: string;
  isOemPart: boolean;
  alternativePartNumbers?: string;
  sourceType: string;
  lastUpdated: string;
  isActive: boolean;
  createdAt: string;
}

interface CatalogStats {
  totalParts: number;
  availableParts: number;
  outOfStockParts: number;
  categoriesCount: Record<string, number>;
}

const partFormSchema = z.object({
  partNumber: z.string().min(1, "Broj dela je obavezan"),
  partName: z.string().min(1, "Naziv dela je obavezan"),
  description: z.string().optional(),
  category: z.string().min(1, "Kategorija je obavezna"),
  manufacturerId: z.number().min(1, "Proizvođač je obavezan"),
  compatibleModels: z.string().optional(),
  priceEur: z.number().optional(),
  priceGbp: z.number().optional(),
  supplierName: z.string().optional(),
  supplierUrl: z.string().optional(),
  availability: z.string().default("available"),
  stockLevel: z.number().default(0),
  minStockLevel: z.number().default(0),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  technicalSpecs: z.string().optional(),
  installationNotes: z.string().optional(),
  warrantyPeriod: z.string().optional(),
  isOemPart: z.boolean().default(true),
  sourceType: z.string().default("manual"),
});

type PartFormData = z.infer<typeof partFormSchema>;

const CATEGORIES = [
  { value: "washing-machine", label: "Mašina za pranje veša" },
  { value: "tumble-dryer", label: "Sušara za veš" },
  { value: "oven", label: "Rerna" },
  { value: "fridge-freezer", label: "Frižider/Zamrzivač" },
  { value: "microwave", label: "Mikrotalasna" },
  { value: "dishwasher", label: "Mašina za sudove" },
  { value: "cooker-hood", label: "Aspirator" },
  { value: "universal", label: "Univerzalni delovi" }
];

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Dostupno", color: "bg-green-500" },
  { value: "out_of_stock", label: "Nema na stanju", color: "bg-red-500" },
  { value: "discontinued", label: "Ukinuto", color: "bg-gray-500" },
  { value: "on_order", label: "U poruci", color: "bg-yellow-500" }
];

export default function PartsCatalogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<PartsCatalog | null>(null);
  const [viewingPart, setViewingPart] = useState<PartsCatalog | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch catalog data
  const { data: parts = [], isLoading: isLoadingParts, refetch } = useQuery({
    queryKey: ["/api/admin/parts-catalog", { search: searchTerm, category: selectedCategory }],
    enabled: true,
  });

  // Fetch statistics
  const { data: stats } = useQuery<CatalogStats>({
    queryKey: ["/api/admin/parts-catalog/stats"],
    enabled: true,
  });

  // Fetch manufacturers
  const { data: manufacturers = [] } = useQuery({
    queryKey: ["/api/admin/manufacturers"],
    enabled: true,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: PartFormData) => {
      return apiRequest("/api/admin/parts-catalog", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parts-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parts-catalog/stats"] });
      setIsAddDialogOpen(false);
      toast({ title: "Uspeh", description: "Deo je uspešno dodat u katalog" });
    },
    onError: (error: any) => {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PartFormData> }) => {
      return apiRequest(`/api/admin/parts-catalog/${id}`, { method: "PUT", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parts-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parts-catalog/stats"] });
      setEditingPart(null);
      toast({ title: "Uspeh", description: "Deo je uspešno ažuriran" });
    },
    onError: (error: any) => {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/parts-catalog/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parts-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parts-catalog/stats"] });
      toast({ title: "Uspeh", description: "Deo je uspešno uklonjen iz kataloga" });
    },
    onError: (error: any) => {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<PartFormData>({
    resolver: zodResolver(partFormSchema),
    defaultValues: {
      availability: "available",
      stockLevel: 0,
      minStockLevel: 0,
      isOemPart: true,
      sourceType: "manual",
    },
  });

  const handleSubmit = async (data: PartFormData) => {
    if (editingPart) {
      updateMutation.mutate({ id: editingPart.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (part: PartsCatalog) => {
    setEditingPart(part);
    form.reset({
      partNumber: part.partNumber,
      partName: part.partName,
      description: part.description || "",
      category: part.category,
      manufacturerId: part.manufacturerId,
      compatibleModels: part.compatibleModels || "",
      priceEur: part.priceEur || undefined,
      priceGbp: part.priceGbp || undefined,
      supplierName: part.supplierName || "",
      supplierUrl: part.supplierUrl || "",
      availability: part.availability,
      stockLevel: part.stockLevel,
      minStockLevel: part.minStockLevel,
      dimensions: part.dimensions || "",
      weight: part.weight || "",
      technicalSpecs: part.technicalSpecs || "",
      installationNotes: part.installationNotes || "",
      warrantyPeriod: part.warrantyPeriod || "",
      isOemPart: part.isOemPart,
      sourceType: part.sourceType,
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("Da li ste sigurni da želite da uklonite ovaj deo iz kataloga?")) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    form.reset({
      availability: "available",
      stockLevel: 0,
      minStockLevel: 0,
      isOemPart: true,
      sourceType: "manual",
    });
    setEditingPart(null);
  };

  const filteredParts = parts.filter((part: PartsCatalog) => {
    const matchesSearch = !searchTerm || 
      part.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || part.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getAvailabilityColor = (availability: string) => {
    const option = AVAILABILITY_OPTIONS.find(opt => opt.value === availability);
    return option?.color || "bg-gray-500";
  };

  const getAvailabilityLabel = (availability: string) => {
    const option = AVAILABILITY_OPTIONS.find(opt => opt.value === availability);
    return option?.label || availability;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Katalog rezervnih delova</h1>
          <p className="text-muted-foreground">Upravljanje master katalogom rezervnih delova</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj deo
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
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
              <div className="h-3 w-3 rounded-full bg-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.availableParts}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nema na stanju</CardTitle>
              <div className="h-3 w-3 rounded-full bg-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.outOfStockParts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kategorije</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats.categoriesCount).length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pretraži po nazivu, broju dela ili opisu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Sve kategorije" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sve kategorije</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => refetch()}>
          <Filter className="w-4 h-4 mr-2" />
          Osveži
        </Button>
      </div>

      {/* Parts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Rezervni delovi ({filteredParts.length})</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Izvezi
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Uvezi
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingParts ? (
            <div className="text-center py-8">Učitavanje...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Broj dela</th>
                    <th className="text-left p-2">Naziv</th>
                    <th className="text-left p-2">Kategorija</th>
                    <th className="text-left p-2">Cena (EUR)</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Stanje</th>
                    <th className="text-left p-2">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParts.map((part: PartsCatalog) => (
                    <tr key={part.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono text-sm">{part.partNumber}</td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{part.partName}</div>
                          {part.description && (
                            <div className="text-sm text-gray-500 truncate max-w-[200px]">
                              {part.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">
                          {CATEGORIES.find(c => c.value === part.category)?.label || part.category}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {part.priceEur ? `€${part.priceEur}` : "-"}
                      </td>
                      <td className="p-2">
                        <Badge className={`text-white ${getAvailabilityColor(part.availability)}`}>
                          {getAvailabilityLabel(part.availability)}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="text-sm">
                          <div>Stanje: {part.stockLevel}</div>
                          <div className="text-gray-500">Min: {part.minStockLevel}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setViewingPart(part)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEdit(part)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDelete(part.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredParts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nema pronađenih delova
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!editingPart} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setEditingPart(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPart ? 'Izmeni deo' : 'Dodaj novi deo'}</DialogTitle>
            <DialogDescription>
              {editingPart ? 'Izmeni podatke o rezervnom delu' : 'Dodaj novi rezervni deo u katalog'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Osnovni podaci</TabsTrigger>
                  <TabsTrigger value="details">Detalji</TabsTrigger>
                  <TabsTrigger value="supplier">Dobavljač</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="partNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Broj dela *</FormLabel>
                          <FormControl>
                            <Input placeholder="49004173" {...field} />
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
                            <Input placeholder="Filter perilica" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opis</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detaljan opis rezervnog dela..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kategorija *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Izaberite kategoriju" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CATEGORIES.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manufacturerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proizvođač *</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Izaberite proizvođača" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {manufacturers.map((manufacturer: any) => (
                                <SelectItem key={manufacturer.id} value={manufacturer.id.toString()}>
                                  {manufacturer.name}
                                </SelectItem>
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
                        <FormLabel>Kompatibilni modeli</FormLabel>
                        <FormControl>
                          <Input placeholder="AQUA 1142D1, CNE 109T, GO 1282" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="priceEur"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cena (EUR)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="15.90"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="priceGbp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cena (GBP)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="13.50"
                              {...field}
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
                              {AVAILABILITY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="stockLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trenutno stanje</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="minStockLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimalno stanje</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dimenzije</FormLabel>
                          <FormControl>
                            <Input placeholder="120x80x50mm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Težina</FormLabel>
                          <FormControl>
                            <Input placeholder="0.2kg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="technicalSpecs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tehnične specifikacije</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Plastični filter sa metalnom mrežom"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="installationNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Napomene za instalaciju</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Ukloniti stari filter pre instalacije"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="warrantyPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period garancije</FormLabel>
                          <FormControl>
                            <Input placeholder="12 meseci" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isOemPart"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Originalni (OEM) deo</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="supplier" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="supplierName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Naziv dobavljača</FormLabel>
                          <FormControl>
                            <Input placeholder="eSpares" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="supplierUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL dobavljača</FormLabel>
                          <FormControl>
                            <Input placeholder="https://www.espares.co.uk/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingPart(null);
                    resetForm();
                  }}
                >
                  Otkaži
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingPart ? 'Sačuvaj izmene' : 'Dodaj deo'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewingPart} onOpenChange={(open) => !open && setViewingPart(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalji rezervnog dela</DialogTitle>
            <DialogDescription>
              {viewingPart?.partNumber} - {viewingPart?.partName}
            </DialogDescription>
          </DialogHeader>
          
          {viewingPart && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Kategorija:</strong> 
                  <span className="ml-2">
                    {CATEGORIES.find(c => c.value === viewingPart.category)?.label}
                  </span>
                </div>
                <div>
                  <strong>Status:</strong>
                  <Badge className={`ml-2 text-white ${getAvailabilityColor(viewingPart.availability)}`}>
                    {getAvailabilityLabel(viewingPart.availability)}
                  </Badge>
                </div>
              </div>
              
              {viewingPart.description && (
                <div>
                  <strong>Opis:</strong>
                  <p className="mt-1 text-sm">{viewingPart.description}</p>
                </div>
              )}
              
              {viewingPart.compatibleModels && (
                <div>
                  <strong>Kompatibilni modeli:</strong>
                  <p className="mt-1 text-sm">{viewingPart.compatibleModels}</p>
                </div>
              )}
              
              {(viewingPart.priceEur || viewingPart.priceGbp) && (
                <div className="flex gap-4">
                  {viewingPart.priceEur && (
                    <div><strong>Cena EUR:</strong> €{viewingPart.priceEur}</div>
                  )}
                  {viewingPart.priceGbp && (
                    <div><strong>Cena GBP:</strong> £{viewingPart.priceGbp}</div>
                  )}
                </div>
              )}
              
              <div className="flex gap-4">
                <div><strong>Stanje:</strong> {viewingPart.stockLevel}</div>
                <div><strong>Min. stanje:</strong> {viewingPart.minStockLevel}</div>
              </div>
              
              {viewingPart.supplierUrl && (
                <div>
                  <strong>Dobavljač:</strong>
                  <a 
                    href={viewingPart.supplierUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline inline-flex items-center"
                  >
                    {viewingPart.supplierName || 'Link'}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              )}
              
              {viewingPart.technicalSpecs && (
                <div>
                  <strong>Tehnične specifikacije:</strong>
                  <p className="mt-1 text-sm">{viewingPart.technicalSpecs}</p>
                </div>
              )}
              
              {viewingPart.installationNotes && (
                <div>
                  <strong>Napomene za instalaciju:</strong>
                  <p className="mt-1 text-sm">{viewingPart.installationNotes}</p>
                </div>
              )}
              
              <div className="text-xs text-gray-500 pt-4 border-t">
                <div>Poslednje ažuriranje: {new Date(viewingPart.lastUpdated).toLocaleString('sr-RS')}</div>
                <div>Kreiran: {new Date(viewingPart.createdAt).toLocaleString('sr-RS')}</div>
                <div>Izvor: {viewingPart.sourceType}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}