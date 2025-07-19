import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Wrench, Package } from 'lucide-react';

interface AdminSparePartsOrderingProps {
  serviceId?: number;
}

const APPLIANCE_CATEGORIES = [
  "Mašina za veš",
  "Sudo mašina", 
  "Frižider",
  "Kombinovan frižider",
  "Šporet",
  "Rerna",
  "Mikrotalasna",
  "Bojler",
  "Klima uređaj",
  "Ostalo"
];

const BEKO_MANUFACTURERS = ["Beko"];
const COMPLUS_MANUFACTURERS = ["Electrolux", "Elica", "Candy", "Hoover", "Turbo Air"];

export function AdminSparePartsOrdering({ serviceId }: AdminSparePartsOrderingProps) {
  const [selectedBrand, setSelectedBrand] = useState<'beko' | 'complus' | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    deviceModel: '',
    productCode: '',
    applianceCategory: '',
    partName: '',
    quantity: 1,
    description: '',
    warrantyStatus: 'u garanciji' as 'u garanciji' | 'van garancije',
    urgency: 'normal' as 'low' | 'normal' | 'high'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get service details if serviceId is provided
  const { data: service } = useQuery({
    queryKey: ['/api/admin/services', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      const response = await apiRequest('GET', `/api/admin/services/${serviceId}`);
      return response.json();
    },
    enabled: !!serviceId
  });

  const orderSparePartMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest('POST', '/api/admin/spare-parts/order', orderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno poručeno",
        description: `Rezervni deo je uspešno poručen. Email je poslat ${selectedBrand === 'beko' ? 'Beko servisu' : 'Complus servisu'}.`,
      });
      setIsDialogOpen(false);
      setSelectedBrand(null);
      setFormData({
        deviceModel: '',
        productCode: '',
        applianceCategory: '',
        partName: '',
        quantity: 1,
        description: '',
        warrantyStatus: 'u garanciji',
        urgency: 'normal'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri poručivanju",
        description: error.message || "Došlo je do greške pri poručivanju rezervnog dela.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBrand) {
      toast({
        title: "Greška",
        description: "Molimo odaberite brend aparata.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.deviceModel || !formData.productCode || !formData.applianceCategory || !formData.partName) {
      toast({
        title: "Greška",
        description: "Molimo popunite sva obavezna polja.",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      serviceId: serviceId || null,
      brand: selectedBrand,
      deviceModel: formData.deviceModel,
      productCode: formData.productCode,
      applianceCategory: formData.applianceCategory,
      partName: formData.partName,
      quantity: formData.quantity,
      description: formData.description,
      warrantyStatus: formData.warrantyStatus,
      urgency: formData.urgency,
      emailTarget: selectedBrand === 'beko' ? 'servis@eurotehnikamn.me' : 'servis@complus.me'
    };

    orderSparePartMutation.mutate(orderData);
  };

  const BrandSelectionDialog = () => (
    <Dialog open={isDialogOpen && !selectedBrand} onOpenChange={(open) => {
      if (!open) {
        setIsDialogOpen(false);
        setSelectedBrand(null);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Odaberite brend aparata</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedBrand('beko')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Beko rezervni deo
              </CardTitle>
              <CardDescription>
                Email će biti poslat na: servis@eurotehnikamn.me
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedBrand('complus')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                Electrolux/Elica/Candy/Hoover/Turbo Air
              </CardTitle>
              <CardDescription>
                Email će biti poslat na: servis@complus.me
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );

  const OrderFormDialog = () => (
    <Dialog open={isDialogOpen && !!selectedBrand} onOpenChange={(open) => {
      if (!open) {
        setIsDialogOpen(false);
        setSelectedBrand(null);
      }
    }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Poruči {selectedBrand === 'beko' ? 'Beko' : 'Electrolux/Elica/Candy/Hoover/Turbo Air'} rezervni deo
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {service && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Servis:</strong> {service.clientName} - {service.applianceModel}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deviceModel">Model aparata *</Label>
              <Input
                id="deviceModel"
                value={formData.deviceModel}
                onChange={(e) => setFormData(prev => ({ ...prev, deviceModel: e.target.value }))}
                placeholder="npr. WMB 71643 PTE"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="productCode">Produkt kod *</Label>
              <Input
                id="productCode"
                value={formData.productCode}
                onChange={(e) => setFormData(prev => ({ ...prev, productCode: e.target.value }))}
                placeholder="npr. 481281729632"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="applianceCategory">Tip aparata *</Label>
            <Select value={formData.applianceCategory} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, applianceCategory: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Odaberite tip aparata" />
              </SelectTrigger>
              <SelectContent>
                {APPLIANCE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="partName">Naziv dela *</Label>
            <Input
              id="partName"
              value={formData.partName}
              onChange={(e) => setFormData(prev => ({ ...prev, partName: e.target.value }))}
              placeholder="npr. Pumpa za vodu, Filter, Grejač"
              required
            />
          </div>

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
            <Label>Garancijski status *</Label>
            <RadioGroup 
              value={formData.warrantyStatus} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, warrantyStatus: value as any }))}
              className="flex flex-row space-x-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="u garanciji" id="warranty" />
                <Label htmlFor="warranty" className="text-green-700">🛡️ U garanciji</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="van garancije" id="no-warranty" />
                <Label htmlFor="no-warranty" className="text-red-700">💰 Van garancije</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Hitnost</Label>
            <RadioGroup 
              value={formData.urgency} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value as any }))}
              className="flex flex-row space-x-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low">Niska</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal">Normalna</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="text-red-600">Hitno</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="description">Dodatne napomene</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Dodatne informacije o delu..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedBrand(null);
              }}
            >
              Otkaži
            </Button>
            <Button 
              type="submit" 
              disabled={orderSparePartMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {orderSparePartMutation.isPending ? 'Poručujem...' : 'Poruči deo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
      >
        <Package className="h-4 w-4" />
        Poruči rezervni deo
      </Button>

      <BrandSelectionDialog />
      <OrderFormDialog />
    </>
  );
}