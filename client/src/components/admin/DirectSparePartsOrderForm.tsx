import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DirectSparePartsOrderFormProps {
  serviceId?: number | null;
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
  deviceModel: string;
  productCode: string;
  applianceCategory: string;
  partName: string;
  quantity: number;
  description: string;
  warrantyStatus: 'u garanciji' | 'van garancije';
  urgency: 'normal' | 'high' | 'urgent';
}

export default function DirectSparePartsOrderForm({ serviceId, prefilledData, onSuccess }: DirectSparePartsOrderFormProps) {
  const [formData, setFormData] = useState<FormData>({
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
      const response = await apiRequest('/api/admin/spare-parts/order', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rezervni deo uspešno poručen",
        description: "Email je poslat dobavljaču sa detaljima o rezervnom delu.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'] });
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
    if (!formData.partName.trim()) {
      toast({
        title: "Naziv dela je obavezan",
        description: "Molimo unesite naziv rezervnog dela.",
        variant: "destructive",
      });
      return;
    }
    
    mutation.mutate({ ...formData, serviceId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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