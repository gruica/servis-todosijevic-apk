import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

interface DirectSparePartsOrderFormProps {
  serviceId?: number | null;
  orderId?: number; // ID postojeće porudžbine koju treba ažurirati
  prefilledData?: {
    partName?: string;
    partNumber?: string;
    quantity?: string;
    description?: string;
    urgency?: string;
    warrantyStatus?: string;
    deviceModel?: string;
    applianceCategory?: string;
  };
  onSuccess?: () => void;
}

interface FormData {
  selectedBrand: 'beko' | 'complus' | null;
  deviceModel: string;
  productCode: string;
  applianceCategory: string;
  partName: string;
  quantity: number;
  description: string;
  warrantyStatus: 'u garanciji' | 'van garancije';
  urgency: 'normal' | 'high' | 'urgent';
}

export default function DirectSparePartsOrderForm({ serviceId, orderId, prefilledData, onSuccess }: DirectSparePartsOrderFormProps) {
  const [formData, setFormData] = useState<FormData>({
    selectedBrand: null,
    deviceModel: prefilledData?.deviceModel || '',
    productCode: prefilledData?.partNumber || '',
    applianceCategory: prefilledData?.applianceCategory || '',
    partName: prefilledData?.partName || '',
    quantity: prefilledData?.quantity ? parseInt(prefilledData.quantity) : 1,
    description: prefilledData?.description || '',
    warrantyStatus: (prefilledData?.warrantyStatus as 'u garanciji' | 'van garancije') || 'u garanciji',
    urgency: (prefilledData?.urgency as 'normal' | 'high' | 'urgent') || 'normal'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateFormField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData & { serviceId?: number | null }) => {
      // Ako imamo orderId, ažuriramo postojeću porudžbinu
      if (orderId) {
        const response = await apiRequest(`/api/admin/spare-parts/${orderId}/order`, {
          method: 'PATCH',
          body: JSON.stringify({
            supplierName: data.selectedBrand === 'beko' ? 'Eurotehnika' : 'ComPlus',
            estimatedDelivery: null,
            adminNotes: `Poručen kroz direktni sistem - ${data.selectedBrand?.toUpperCase()} brend`
          })
        });
        return response.json();
      } else {
        // Inače kreiramo novu porudžbinu
        const response = await apiRequest('/api/spare-parts/order', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        return response.json();
      }
    },
    onSuccess: (result) => {
      toast({
        title: "Rezervni deo uspešno poručen",
        description: orderId 
          ? "Status porudžbine je automatski ažuriran na 'Poručeno' i poslat je email dobavljaču."
          : "Email je poslat dobavljaču sa detaljima o rezervnom delu.",
      });
      // Ažuriranje cache-a
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts/pending'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri poručivanju",
        description: error.message || "Molimo pokušajte ponovo.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.selectedBrand) {
      toast({
        title: "Brend je obavezan",
        description: "Molimo odaberite brend aparata.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.partName.trim()) {
      toast({
        title: "Naziv dela je obavezan",
        description: "Molimo unesite naziv rezervnog dela.",
        variant: "destructive",
      });
      return;
    }
    
    mutation.mutate({ 
      ...formData, 
      serviceId,
      brand: formData.selectedBrand,
      emailTarget: formData.selectedBrand === 'beko' ? 'servis@eurotehnikamn.me' : 'servis@complus.me'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Brand Selection */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <Label className="text-sm font-medium text-blue-900 mb-3 block">
          Brend aparata *
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className={`cursor-pointer transition-all ${
              formData.selectedBrand === 'beko' 
                ? 'ring-2 ring-blue-500 bg-blue-100' 
                : 'hover:shadow-md hover:bg-gray-50'
            }`}
            onClick={() => updateFormField('selectedBrand', 'beko')}
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
              formData.selectedBrand === 'complus' 
                ? 'ring-2 ring-green-500 bg-green-100' 
                : 'hover:shadow-md hover:bg-gray-50'
            }`}
            onClick={() => updateFormField('selectedBrand', 'complus')}
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
          Email će biti poslat na: {formData.selectedBrand === 'beko' ? 'servis@eurotehnikamn.me' : formData.selectedBrand === 'complus' ? 'servis@complus.me' : 'odaberite brend'}
        </p>
      </div>

      {/* Form Fields */}
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
          <Label htmlFor="productCode">Kataloški broj</Label>
          <Input
            id="productCode"
            value={formData.productCode}
            onChange={(e) => updateFormField('productCode', e.target.value)}
            placeholder="npr. 481936078337"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="applianceCategory">Kategorija uređaja</Label>
        <Select value={formData.applianceCategory} onValueChange={(value) => updateFormField('applianceCategory', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Izaberite kategoriju uređaja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="veš mašina">Veš mašina</SelectItem>
            <SelectItem value="mašina za sudove">Mašina za sudove</SelectItem>
            <SelectItem value="šporet">Šporet</SelectItem>
            <SelectItem value="rerna">Rerna</SelectItem>
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

      <div className="flex justify-end pt-4">
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