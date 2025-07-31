import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Wrench, Package } from 'lucide-react';

interface SimpleSparePartsDialogProps {
  serviceId?: number;
  onSuccess?: () => void;
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

export function SimpleSparePartsDialog({ serviceId, onSuccess }: SimpleSparePartsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<'beko' | 'complus' | null>(null);
  const [deviceModel, setDeviceModel] = useState('');
  const [productCode, setProductCode] = useState('');
  const [applianceCategory, setApplianceCategory] = useState('');
  const [partName, setPartName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [warrantyStatus, setWarrantyStatus] = useState<'u garanciji' | 'van garancije'>('u garanciji');
  const [urgency, setUrgency] = useState<'low' | 'normal' | 'high'>('normal');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const orderSparePartMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest('/api/admin/spare-parts/order', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno poručeno",
        description: `Rezervni deo je uspešno poručen. Email je poslat ${selectedBrand === 'beko' ? 'Beko servisu' : 'Complus servisu'}.`,
      });
      handleClose();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri poručivanju",
        description: error.message || "Došlo je do greške pri poručivanju rezervnog dela.",
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    setIsOpen(false);
    setSelectedBrand(null);
    setDeviceModel('');
    setProductCode('');
    setApplianceCategory('');
    setPartName('');
    setQuantity(1);
    setDescription('');
    setWarrantyStatus('u garanciji');
    setUrgency('normal');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trim whitespace from all string fields
    const trimmedDeviceModel = deviceModel.trim();
    const trimmedProductCode = productCode.trim();
    const trimmedApplianceCategory = applianceCategory.trim();
    const trimmedPartName = partName.trim();
    
    // Debug logging
    console.log('🔧 ADMIN FORM VALIDATION DEBUG:', {
      selectedBrand,
      deviceModel: `"${deviceModel}" -> "${trimmedDeviceModel}"`,
      productCode: `"${productCode}" -> "${trimmedProductCode}"`,
      applianceCategory: `"${applianceCategory}" -> "${trimmedApplianceCategory}"`,
      partName: `"${partName}" -> "${trimmedPartName}"`
    });
    
    if (!selectedBrand) {
      console.log('❌ VALIDATION FAILED: selectedBrand je prazan');
      toast({
        title: "Greška",
        description: "Molimo odaberite brend aparata.",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedDeviceModel || !trimmedProductCode || !trimmedApplianceCategory || !trimmedPartName) {
      const emptyFields = [];
      if (!trimmedDeviceModel) emptyFields.push('Model aparata');
      if (!trimmedProductCode) emptyFields.push('Produkt kod');
      if (!trimmedApplianceCategory) emptyFields.push('Tip aparata');
      if (!trimmedPartName) emptyFields.push('Naziv dela');
      
      console.log('❌ VALIDATION FAILED: Prazna polja:', emptyFields);
      toast({
        title: "Greška",
        description: `Molimo popunite sva obavezna polja: ${emptyFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ VALIDATION PASSED: Svi podaci su OK, šaljem porudžbinu...');

    const orderData = {
      serviceId: serviceId || null,
      brand: selectedBrand,
      deviceModel: trimmedDeviceModel,
      productCode: trimmedProductCode,
      applianceCategory: trimmedApplianceCategory,
      partName: trimmedPartName,
      quantity,
      description: description.trim(),
      warrantyStatus,
      urgency,
      emailTarget: selectedBrand === 'beko' ? 'servis@eurotehnikamn.me' : 'servis@complus.me'
    };

    orderSparePartMutation.mutate(orderData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button 
          className="bg-green-600 hover:bg-green-700"
        >
          <Package className="h-4 w-4 mr-2" />
          Nova porudžbina
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {!selectedBrand ? (
          <>
            <DialogHeader>
              <DialogTitle>Odaberite brend aparata</DialogTitle>
              <DialogDescription>
                Izaberite proizvođača aparata za koji naručujete rezervni deo. Svaki brend ima svoju email adresu za dostavu narudžbine.
              </DialogDescription>
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
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                Poruči {selectedBrand === 'beko' ? 'Beko' : 'Electrolux/Elica/Candy/Hoover/Turbo Air'} rezervni deo
              </DialogTitle>
              <DialogDescription>
                Popunite podatke o rezervnom delu koji trebate. Narudžbina će biti poslata na odgovarajući email servisa.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deviceModel">Model aparata *</Label>
                  <Input
                    id="deviceModel"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    placeholder="npr. WMB 71643 PTE"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="productCode">Produkt kod *</Label>
                  <Input
                    id="productCode"
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    placeholder="npr. 481281729632"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="applianceCategory">Tip aparata *</Label>
                <Select value={applianceCategory} onValueChange={setApplianceCategory}>
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
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
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
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  placeholder="1"
                />
              </div>

              <div>
                <Label>Status garancije *</Label>
                <RadioGroup value={warrantyStatus} onValueChange={(value: any) => setWarrantyStatus(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="u garanciji" id="u_garanciji" />
                    <Label htmlFor="u_garanciji" className="flex items-center gap-1">
                      🛡️ U garanciji
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="van garancije" id="van_garancije" />
                    <Label htmlFor="van_garancije" className="flex items-center gap-1">
                      💰 Van garancije
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Hitnost *</Label>
                <RadioGroup value={urgency} onValueChange={(value: any) => setUrgency(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="low" />
                    <Label htmlFor="low" className="text-green-600">Niska</Label>
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Dodatne informacije o delu..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}