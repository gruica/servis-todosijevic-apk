import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

const BEKO_MANUFACTURERS = ["Beko"];
const COMPLUS_MANUFACTURERS = ["Electrolux", "Elica", "Candy", "Hoover", "Turbo Air"];

function AdminSparePartsOrderingComponent({ serviceId, onSuccess }: AdminSparePartsOrderingProps) {
  const [selectedBrand, setSelectedBrand] = useState<'beko' | 'complus' | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [enteredServiceId, setEnteredServiceId] = useState(serviceId?.toString() || '');
  const [debouncedServiceId, setDebouncedServiceId] = useState(serviceId?.toString() || '');
  const [applianceSerialNumber, setApplianceSerialNumber] = useState('');
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

  // Debounce effect for service ID input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedServiceId(enteredServiceId);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [enteredServiceId]);

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

  // Get service details for entered service ID (debounced)
  const { data: enteredService, isLoading: isLoadingEnteredService } = useQuery({
    queryKey: ['/api/admin/services', debouncedServiceId],
    queryFn: async () => {
      if (!debouncedServiceId || debouncedServiceId === '') return null;
      const response = await apiRequest('GET', `/api/admin/services/${debouncedServiceId}`);
      return response.json();
    },
    enabled: !!debouncedServiceId && debouncedServiceId !== ''
  });

  // Use entered service data if available, otherwise use passed serviceId data
  const currentService = enteredService || service;

  const orderSparePartMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest('POST', '/api/admin/spare-parts/order', orderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno poručeno",
        description: `Rezervni deo je uspešno poručen${enteredServiceId ? ` za servis #${enteredServiceId}` : ''}. Email je poslat ${selectedBrand === 'beko' ? 'Beko servisu' : 'Complus servisu'}.`,
      });
      handleDialogClose(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts/pending'] });
      
      // Call parent onSuccess callback if provided
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

  // Individual form handlers
  const handleDeviceModelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, deviceModel: e.target.value }));
  }, []);

  const handleProductCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, productCode: e.target.value }));
  }, []);

  const handlePartNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, partName: e.target.value }));
  }, []);

  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }));
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }));
  }, []);

  const handleApplianceCategoryChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, applianceCategory: value }));
  }, []);

  const handleWarrantyStatusChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, warrantyStatus: value as any }));
  }, []);

  const handleUrgencyChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, urgency: value as any }));
  }, []);

  // Stable handlers for service ID and serial number inputs
  const handleServiceIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredServiceId(e.target.value);
  }, []);

  const handleSerialNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setApplianceSerialNumber(e.target.value);
  }, []);

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

    const finalServiceId = enteredServiceId ? parseInt(enteredServiceId) : serviceId;
    const finalSerialNumber = applianceSerialNumber || null;
    
    const orderData = {
      serviceId: finalServiceId || null,
      applianceSerialNumber: finalSerialNumber,
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

  const resetFormData = useCallback(() => {
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
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setIsDialogOpen(false);
      setSelectedBrand(null);
      resetFormData();
    }
  }, [resetFormData]);

  const handleBekoSelection = useCallback(() => {
    setSelectedBrand('beko');
  }, []);

  const handleComplusSelection = useCallback(() => {
    setSelectedBrand('complus');
  }, []);

  const handleCancelClick = useCallback(() => {
    handleDialogClose(false);
  }, [handleDialogClose]);

  const handleBrandSelectionDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setIsDialogOpen(false);
      setSelectedBrand(null);
    }
  }, []);

  const BrandSelectionDialog = useCallback(() => (
    <Dialog open={isDialogOpen && !selectedBrand} onOpenChange={handleBrandSelectionDialogChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Odaberite brend aparata</DialogTitle>
          <DialogDescription>
            Izaberite proizvođača aparata za koji naručujete rezervni deo. Svaki brend ima svoju email adresu za dostavu narudžbine.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleBekoSelection}
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
            onClick={handleComplusSelection}
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
  ), [isDialogOpen, selectedBrand, handleBrandSelectionDialogChange, handleBekoSelection, handleComplusSelection]);

  const OrderFormDialog = useCallback(() => (
    <Dialog open={isDialogOpen && !!selectedBrand} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" key={`order-form-${selectedBrand}`}>
        <DialogHeader>
          <DialogTitle>
            Poruči {selectedBrand === 'beko' ? 'Beko' : 'Electrolux/Elica/Candy/Hoover/Turbo Air'} rezervni deo
          </DialogTitle>
          <DialogDescription>
            Popunite podatke o rezervnom delu koji trebate. Narudžbina će biti poslata na odgovarajući email servisa.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service ID and Appliance Serial Number Input */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="enteredServiceId">Broj servisa</Label>
              <Input
                id="enteredServiceId"
                value={enteredServiceId}
                onChange={handleServiceIdChange}
                placeholder="npr. 59"
                type="number"
              />
            </div>
            
            <div>
              <Label htmlFor="applianceSerialNumber">Serijski broj aparata</Label>
              <Input
                id="applianceSerialNumber"
                value={applianceSerialNumber}
                onChange={handleSerialNumberChange}
                placeholder="npr. ABC123456789"
              />
            </div>
          </div>

          {/* Service Information Display */}
          {currentService && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Podaci o servisu #{currentService.id}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Klijent:</strong> {currentService.clientName}</p>
                  <p><strong>Telefon:</strong> {currentService.clientPhone}</p>
                  <p><strong>Email:</strong> {currentService.clientEmail}</p>
                  <p><strong>Adresa:</strong> {currentService.clientAddress}, {currentService.clientCity}</p>
                </div>
                <div>
                  <p><strong>Aparat:</strong> {currentService.manufacturerName} {currentService.applianceModel}</p>
                  <p><strong>Kategorija:</strong> {currentService.categoryName}</p>
                  <p><strong>Serijski broj:</strong> {currentService.applianceSerialNumber || 'Nije unet'}</p>
                  <p><strong>Status servisa:</strong> {currentService.status}</p>
                </div>
              </div>
              {currentService.description && (
                <p className="mt-2"><strong>Opis problema:</strong> {currentService.description}</p>
              )}
              {currentService.technicianNotes && (
                <p className="mt-1"><strong>Napomene tehničara:</strong> {currentService.technicianNotes}</p>
              )}
            </div>
          )}

          {isLoadingEnteredService && debouncedServiceId && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800">Učitavam podatke o servisu...</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deviceModel">Model aparata *</Label>
              <Input
                id="deviceModel"
                value={formData.deviceModel}
                onChange={handleDeviceModelChange}
                placeholder="npr. WMB 71643 PTE"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="productCode">Produkt kod *</Label>
              <Input
                id="productCode"
                value={formData.productCode}
                onChange={handleProductCodeChange}
                placeholder="npr. 481281729632"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="applianceCategory">Tip aparata *</Label>
            <Select value={formData.applianceCategory} onValueChange={handleApplianceCategoryChange}>
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
              onChange={handlePartNameChange}
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
              onChange={handleQuantityChange}
            />
          </div>

          <div>
            <Label>Garancijski status *</Label>
            <RadioGroup 
              value={formData.warrantyStatus} 
              onValueChange={handleWarrantyStatusChange}
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
              onValueChange={handleUrgencyChange}
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
              onChange={handleDescriptionChange}
              placeholder="Dodatne informacije o delu..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancelClick}
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
  ), [isDialogOpen, selectedBrand, handleDialogClose, service, formData, handleDeviceModelChange, handleProductCodeChange, handleApplianceCategoryChange, handlePartNameChange, handleQuantityChange, handleDescriptionChange, handleWarrantyStatusChange, handleUrgencyChange, handleSubmit, handleCancelClick, orderSparePartMutation.isPending]);

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

export const AdminSparePartsOrdering = memo(AdminSparePartsOrderingComponent);