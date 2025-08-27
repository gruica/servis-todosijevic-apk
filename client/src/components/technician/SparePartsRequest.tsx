import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Package, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface SparePartOrder {
  id: number;
  partName: string;
  partNumber?: string;
  quantity: number;
  description?: string;
  urgency: string;
  status: string;
  supplierName?: string;
  estimatedCost?: string;
  actualCost?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface RequestPartFormData {
  partName: string;
  partNumber: string;
  quantity: number;
  description: string;
  urgency: 'normal' | 'high' | 'urgent';
  serviceId?: number;
  warrantyStatus: 'u garanciji' | 'van garancije';
}

function RequestPartDialog({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState<RequestPartFormData>({
    partName: '',
    partNumber: '',
    quantity: 1,
    description: '',
    urgency: 'normal',
    serviceId: undefined,
    warrantyStatus: 'van garancije'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: RequestPartFormData) => {
      return await apiRequest('/api/technician/spare-parts/request', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: "Zahtev poslat",
        description: "Vaš zahtev za rezervni deo je uspešno poslat administratoru",
      });
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['/api/technician/spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/technician/spare-parts/available'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri slanju zahteva za rezervni deo",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partName.trim()) {
      toast({
        title: "Greška",
        description: "Naziv dela je obavezan",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Zahtevaj rezervni deo</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="partName">Naziv dela *</Label>
          <Input
            id="partName"
            value={formData.partName}
            onChange={(e) => setFormData({...formData, partName: e.target.value})}
            placeholder="npr. Kompresor za frižider"
            required
          />
        </div>

        <div>
          <Label htmlFor="partNumber">Kataloški broj (opciono)</Label>
          <Input
            id="partNumber"
            value={formData.partNumber}
            onChange={(e) => setFormData({...formData, partNumber: e.target.value})}
            placeholder="npr. COMP-123-ABC"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quantity">Količina</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
            />
          </div>
          
          <div>
            <Label htmlFor="urgency">Hitnost</Label>
            <Select value={formData.urgency} onValueChange={(value: any) => setFormData({...formData, urgency: value})}>
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
          <Label htmlFor="serviceId">ID servisa (opciono)</Label>
          <Input
            id="serviceId"
            type="number"
            value={formData.serviceId || ''}
            onChange={(e) => setFormData({...formData, serviceId: e.target.value ? parseInt(e.target.value) : undefined})}
            placeholder="Za koji servis je potreban deo"
          />
        </div>

        <div>
          <Label htmlFor="warrantyStatus">Status garancije</Label>
          <Select value={formData.warrantyStatus} onValueChange={(value: any) => setFormData({...formData, warrantyStatus: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="u garanciji">U garanciji</SelectItem>
              <SelectItem value="van garancije">Van garancije</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="description">Opis potrebe</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Opišite zašto je potreban ovaj deo, simptome kvara, itd."
            rows={3}
          />
        </div>

        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? 'Šalje se...' : 'Pošalji zahtev'}
        </Button>
      </form>
    </DialogContent>
  );
}

function MyRequestsCard({ order }: { order: SparePartOrder }) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      requested: { label: 'Zahtevano', variant: 'secondary' as const, icon: Package },
      admin_ordered: { label: 'Poručeno', variant: 'default' as const, icon: Clock },
      waiting_delivery: { label: 'Na čekanju', variant: 'outline' as const, icon: Clock },
      available: { label: 'Dostupno', variant: 'default' as const, icon: CheckCircle },
      consumed: { label: 'Potrošeno', variant: 'secondary' as const, icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const, icon: Package };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-lg">{order.partName}</h4>
            {order.partNumber && (
              <p className="text-sm text-muted-foreground">Kataloški br: {order.partNumber}</p>
            )}
          </div>
          {getStatusBadge(order.status)}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">Količina:</span> {order.quantity}
          </div>
          <div className={getUrgencyColor(order.urgency)}>
            <span className="text-muted-foreground">Hitnost:</span> {order.urgency}
          </div>
          {order.supplierName && (
            <div>
              <span className="text-muted-foreground">Dobavljač:</span> {order.supplierName}
            </div>
          )}
          {order.actualCost && (
            <div>
              <span className="text-muted-foreground">Cena:</span> {order.actualCost}
            </div>
          )}
        </div>

        {order.description && (
          <p className="text-sm text-muted-foreground mb-3">{order.description}</p>
        )}

        {order.adminNotes && (
          <div className="bg-muted p-2 rounded text-sm mb-3">
            <strong>Napomene administratora:</strong> {order.adminNotes}
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Zahtevano: {new Date(order.createdAt).toLocaleDateString()}
          </span>
          
          {order.status === 'available' && (
            <Badge variant="default" className="flex items-center gap-1 bg-green-600">
              <CheckCircle className="w-3 h-3" />
              Spreman za preuzimanje
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AvailablePartsCard({ order, onConsume }: { order: SparePartOrder; onConsume: (orderId: number) => void }) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-lg">{order.partName}</h4>
            {order.partNumber && (
              <p className="text-sm text-muted-foreground">Kataloški br: {order.partNumber}</p>
            )}
          </div>
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle className="w-3 h-3" />
            Dostupno
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">Količina:</span> {order.quantity}
          </div>
          {order.actualCost && (
            <div>
              <span className="text-muted-foreground">Cena:</span> {order.actualCost}
            </div>
          )}
          {order.supplierName && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Dobavljač:</span> {order.supplierName}
            </div>
          )}
        </div>

        {order.description && (
          <p className="text-sm text-muted-foreground mb-3">{order.description}</p>
        )}

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Dostupan od: {new Date(order.updatedAt).toLocaleDateString()}
          </span>
          
          <Button size="sm" onClick={() => onConsume(order.id)}>
            <CheckCircle className="w-4 h-4 mr-1" />
            Preuzmi deo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SparePartsRequest() {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch my requests
  const { data: myRequests = [], isLoading: myRequestsLoading } = useQuery({
    queryKey: ['/api/technician/spare-parts'],
    queryFn: () => apiRequest('/api/technician/spare-parts'),
  });

  // Fetch available parts
  const { data: availableParts = [], isLoading: availableLoading } = useQuery({
    queryKey: ['/api/technician/spare-parts/available'],
    queryFn: () => apiRequest('/api/technician/spare-parts/available'),
  });

  // Consume part mutation
  const consumeMutation = useMutation({
    mutationFn: async ({ orderId, serviceId }: { orderId: number; serviceId?: number }) => {
      return await apiRequest(`/api/technician/spare-parts/${orderId}/consume`, {
        method: 'PATCH',
        body: { consumedForServiceId: serviceId }
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspešno preuzet deo",
        description: "Rezervni deo je označen kao potrošen",
      });
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['/api/technician/spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/technician/spare-parts/available'] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri preuzimanju rezervnog dela",
        variant: "destructive",
      });
    }
  });

  const handleConsumePart = (orderId: number) => {
    // For now, consume without service ID, but could add dialog to enter service ID
    consumeMutation.mutate({ orderId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Rezervni delovi</h2>
        </div>
        
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Zahtevaj deo
            </Button>
          </DialogTrigger>
          <RequestPartDialog onClose={() => setShowRequestDialog(false)} />
        </Dialog>
      </div>

      <Tabs defaultValue="my-requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-requests" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Moji zahtevi ({Array.isArray(myRequests) ? myRequests.length : 0})
          </TabsTrigger>
          <TabsTrigger value="available" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Dostupno ({Array.isArray(availableParts) ? availableParts.length : 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-requests" className="mt-6">
          {myRequestsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Učitavanje...</p>
            </div>
          ) : !Array.isArray(myRequests) || myRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nemate zahteva za rezervne delove</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowRequestDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Zahtevaj prvi deo
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {myRequests.map((order: SparePartOrder) => (
                <MyRequestsCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-6">
          {availableLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Učitavanje...</p>
            </div>
          ) : !Array.isArray(availableParts) || availableParts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Trenutno nema dostupnih rezervnih delova</p>
              <p className="text-sm">Delovi će se pojaviti ovde kada administrator označi da su stigli i dostupni za preuzimanje</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {availableParts.map((order: SparePartOrder) => (
                <AvailablePartsCard 
                  key={order.id} 
                  order={order} 
                  onConsume={handleConsumePart}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}