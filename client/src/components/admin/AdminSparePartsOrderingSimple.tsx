import React, { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useDebounce } from '@/hooks/use-debounce';

interface FormData {
  deviceModel: string;
  productCode: string;
  applianceCategory: string;
  partName: string;
  quantity: number;
  description: string;
  warrantyStatus: string;
  urgency: string;
}

interface Props {
  serviceId?: number;
  onSuccess?: () => void;
}

export function AdminSparePartsOrderingSimple({ serviceId, onSuccess }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<'beko' | 'complus' | null>(null);
  const [serviceNumber, setServiceNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [formData, setFormData] = useState<FormData>({
    deviceModel: '',
    productCode: '',
    applianceCategory: '',
    partName: '',
    quantity: 1,
    description: '',
    warrantyStatus: 'van garancije',
    urgency: 'normal'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const debouncedServiceNumber = useDebounce(serviceNumber, 500);

  useEffect(() => {
    if (serviceId) {
      setServiceNumber(serviceId.toString());
    }
  }, [serviceId]);

  const { data: serviceData } = useQuery({
    queryKey: ['service-simple', debouncedServiceNumber || serviceId],
    queryFn: async () => {
      const targetId = debouncedServiceNumber || serviceId;
      if (!targetId) return null;
      const id = parseInt(targetId.toString());
      if (isNaN(id) || id <= 0) return null;
      const response = await apiRequest('GET', `/api/admin/services/${id}`);
      return response.json();
    },
    enabled: !!(debouncedServiceNumber || serviceId) && !isNaN(parseInt((debouncedServiceNumber || serviceId || '').toString())) && parseInt((debouncedServiceNumber || serviceId || '').toString()) > 0
  });

  const mutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest('POST', '/api/admin/spare-parts-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno poslato",
        description: "Porudžbina rezervnog dela je uspešno poslata.",
      });
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] });
      setIsDialogOpen(false);
      setSelectedBrand(null);
      setFormData({
        deviceModel: '',
        productCode: '',
        applianceCategory: '',
        partName: '',
        quantity: 1,
        description: '',
        warrantyStatus: 'van garancije',
        urgency: 'normal'
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške prilikom slanja porudžbine.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBrand) {
      toast({
        title: "Greška",
        description: "Molimo odaberite brend aparata.",
        variant: "destructive",
      });
      return;
    }

    const finalServiceId = serviceNumber ? parseInt(serviceNumber) : serviceId;
    
    const orderData = {
      serviceId: finalServiceId || null,
      applianceSerialNumber: serialNumber || null,
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

    mutation.mutate(orderData);
  }, [selectedBrand, formData, serviceNumber, serialNumber, serviceId, mutation, toast, onSuccess]);

  const updateFormField = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Brand Selection Component
  const BrandSelection = () => (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <Label className="text-sm font-medium text-blue-900 mb-3 block">
        Brend aparata *
      </Label>
      <div className="grid grid-cols-2 gap-3">
        <Card 
          className={`cursor-pointer transition-all ${
            selectedBrand === 'beko' 
              ? 'ring-2 ring-blue-500 bg-blue-100' 
              : 'hover:shadow-md hover:bg-gray-50'
          }`}
          onClick={() => setSelectedBrand('beko')}
        >
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              Beko
            </CardTitle>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            selectedBrand === 'complus' 
              ? 'ring-2 ring-green-500 bg-green-100' 
              : 'hover:shadow-md hover:bg-gray-50'
          }`}
          onClick={() => setSelectedBrand('complus')}
        >
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              Electrolux/Elica/Candy/Hoover/Turbo Air
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Email će biti poslat na: {selectedBrand === 'beko' ? 'servis@eurotehnikamn.me' : selectedBrand === 'complus' ? 'servis@complus.me' : 'odaberite brend'}
      </p>
    </div>
  );

  // Form Fields Component
  const FormFields = () => (
    <>
      {!serviceId && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="serviceNumber">Broj servisa</Label>
            <Input
              id="serviceNumber"
              value={serviceNumber}
              onChange={(e) => setServiceNumber(e.target.value)}
              placeholder="npr. 59"
              type="number"
            />
          </div>
          
          <div>
            <Label htmlFor="serialNumber">Serijski broj aparata</Label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="npr. ABC123456789"
            />
          </div>
        </div>
      )}

      {serviceData && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Podaci o servisu #{serviceData.id}</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">Klijent:</span> {serviceData.clientName}</div>
            <div><span className="font-medium">Telefon:</span> {serviceData.clientPhone}</div>
            <div><span className="font-medium">Uređaj:</span> {serviceData.categoryName} - {serviceData.manufacturerName}</div>
            <div><span className="font-medium">Model:</span> {serviceData.model}</div>
            <div><span className="font-medium">Status:</span> {serviceData.status}</div>
            <div><span className="font-medium">Serviser:</span> {serviceData.technicianName}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="deviceModel">Model uređaja *</Label>
          <Input
            id="deviceModel"
            value={formData.deviceModel}
            onChange={(e) => updateFormField('deviceModel', e.target.value)}
            placeholder="npr. WMB 61001 M+"
            required
          />
        </div>
        <div>
          <Label htmlFor="productCode">Šifra proizvoda *</Label>
          <Input
            id="productCode"
            value={formData.productCode}
            onChange={(e) => updateFormField('productCode', e.target.value)}
            placeholder="npr. 7135543000"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="applianceCategory">Kategorija aparata *</Label>
          <Select value={formData.applianceCategory} onValueChange={(value) => updateFormField('applianceCategory', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Odaberite kategoriju" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="veš mašina">Veš mašina</SelectItem>
              <SelectItem value="sudo mašina">Sudo mašina</SelectItem>
              <SelectItem value="frižider">Frižider</SelectItem>
              <SelectItem value="šporet">Šporet</SelectItem>
              <SelectItem value="aspirator">Aspirator</SelectItem>
              <SelectItem value="mikrotalasna">Mikrotalasna</SelectItem>
              <SelectItem value="kombinovan frižider">Kombinovan frižider</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="partName">Naziv dela *</Label>
          <Input
            id="partName"
            value={formData.partName}
            onChange={(e) => updateFormField('partName', e.target.value)}
            placeholder="npr. Pumpa za vodu"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="quantity">Količina</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => updateFormField('quantity', parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <Label htmlFor="warrantyStatus">Status garancije</Label>
          <Select value={formData.warrantyStatus} onValueChange={(value) => updateFormField('warrantyStatus', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="u garanciji">🛡️ U garanciji</SelectItem>
              <SelectItem value="van garancije">💰 Van garancije</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="urgency">Hitnost</Label>
          <Select value={formData.urgency} onValueChange={(value) => updateFormField('urgency', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normalno</SelectItem>
              <SelectItem value="high">Visoko</SelectItem>
              <SelectItem value="urgent">Hitno</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Dodatni opis</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormField('description', e.target.value)}
          placeholder="Dodatne informacije o potrebnom delu..."
          rows={3}
        />
      </div>
    </>
  );

  // If serviceId is provided, render just the form (for embedding in services.tsx)
  if (serviceId) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <BrandSelection />
        <FormFields />
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {mutation.isPending ? 'Poručujem...' : 'Poruči deo'}
          </Button>
        </div>
      </form>
    );
  }

  // Standalone mode with dialog (when no serviceId)
  if (!isDialogOpen) {
    return (
      <Button
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
      >
        <Package className="h-4 w-4" />
        Poruči rezervni deo
      </Button>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Poruči rezervni deo</DialogTitle>
          <DialogDescription>
            Popunite podatke o rezervnom delu koji trebate. Prvo odaberite brend aparata.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <BrandSelection />
          <FormFields />
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              Otkaži
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {mutation.isPending ? 'Poručujem...' : 'Poruči deo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}