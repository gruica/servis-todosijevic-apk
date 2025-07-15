import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Package, ShoppingCart, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SparePartsOrderFormProps {
  serviceId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const urgencyOptions = [
  { value: 'low', label: 'Niska', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Srednja', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'Visoka', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Hitno', color: 'bg-red-100 text-red-800' },
];

export function SparePartsOrderForm({ serviceId, onSuccess, onCancel }: SparePartsOrderFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    partName: '',
    partNumber: '',
    quantity: 1,
    urgency: 'medium',
    notes: ''
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest('/api/spare-parts/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...orderData,
          serviceId
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Uspešno',
        description: 'Porudžbina rezervnog dela je poslata',
      });
      
      // Reset form
      setFormData({
        partName: '',
        partNumber: '',
        quantity: 1,
        urgency: 'medium',
        notes: ''
      });
      
      setIsOpen(false);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'] });
      
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: 'Greška',
        description: 'Došlo je do greške prilikom slanja porudžbine',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.partName.trim()) {
      toast({
        title: 'Greška',
        description: 'Molimo unesite naziv rezervnog dela',
        variant: 'destructive',
      });
      return;
    }

    createOrderMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const selectedUrgency = urgencyOptions.find(opt => opt.value === formData.urgency);

  return (
    <Card className="mt-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Poruči rezervni deo</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  Opciono
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
            <CardDescription>
              Ako je potreban rezervni deo za ovaj servis, možete ga poručiti ovde
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="partName">Naziv rezervnog dela *</Label>
                  <Input
                    id="partName"
                    placeholder="Npr. Kompresor, Termostat, Filter..."
                    value={formData.partName}
                    onChange={(e) => handleInputChange('partName', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="partNumber">Broj dela (opciono)</Label>
                  <Input
                    id="partNumber"
                    placeholder="Kataloski broj ako je poznat"
                    value={formData.partNumber}
                    onChange={(e) => handleInputChange('partNumber', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Količina</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="urgency">Hitnost</Label>
                  <Select value={formData.urgency} onValueChange={(value) => handleInputChange('urgency', value)}>
                    <SelectTrigger>
                      <SelectValue>
                        {selectedUrgency && (
                          <div className="flex items-center space-x-2">
                            <Badge className={selectedUrgency.color}>
                              {selectedUrgency.label}
                            </Badge>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {urgencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center space-x-2">
                            <Badge className={option.color}>
                              {option.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Napomene</Label>
                <Textarea
                  id="notes"
                  placeholder="Dodatne informacije o rezervnom delu..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-700">
                  Porudžbina će biti poslata administratoru koji će je obraditi u najkraćem roku.
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                >
                  Otkaži
                </Button>
                <Button 
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full" />
                      Šalje se...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Pošalji porudžbinu
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}