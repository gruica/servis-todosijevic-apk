import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Package, Clock, CheckCircle, ArrowRight, Truck, ShoppingCart } from 'lucide-react';

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
  // Workflow fields
  requestedBy?: number;
  requestedAt?: string;
  orderedBy?: number;
  orderedAt?: string;
  receivedBy?: number;
  receivedAt?: string;
  consumedBy?: number;
  consumedAt?: string;
}

interface WorkflowActionDialogProps {
  order: SparePartOrder;
  action: 'order' | 'receive' | 'make-available' | 'consume';
  onClose: () => void;
}

function WorkflowActionDialog({ order, action, onClose }: WorkflowActionDialogProps) {
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = {
        order: `/api/admin/spare-parts/${order.id}/order`,
        receive: `/api/admin/spare-parts/${order.id}/receive`,
        'make-available': `/api/admin/spare-parts/${order.id}/make-available`,
        consume: `/api/technician/spare-parts/${order.id}/consume`
      }[action];

      return await apiRequest(endpoint, {
        method: 'PATCH',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspešno ažuriran workflow",
        description: "Status rezervnog dela je uspešno promenjen",
      });
      
      // Refresh all workflow tabs
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts/status'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri ažuriranju workflow-a",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const getDialogContent = () => {
    switch (action) {
      case 'order':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="supplierName">Dobavljač *</Label>
              <Input
                id="supplierName"
                value={formData.supplierName || ''}
                onChange={(e) => setFormData({...formData, supplierName: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="estimatedDelivery">Procenjen datum dostave</Label>
              <Input
                id="estimatedDelivery"
                type="date"
                value={formData.estimatedDelivery || ''}
                onChange={(e) => setFormData({...formData, estimatedDelivery: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="adminNotes">Napomene administratora</Label>
              <Textarea
                id="adminNotes"
                value={formData.adminNotes || ''}
                onChange={(e) => setFormData({...formData, adminNotes: e.target.value})}
                rows={3}
              />
            </div>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Poručujem...' : 'Poruči rezervni deo'}
            </Button>
          </form>
        );

      case 'receive':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="actualCost">Stvarna cena</Label>
              <Input
                id="actualCost"
                value={formData.actualCost || ''}
                onChange={(e) => setFormData({...formData, actualCost: e.target.value})}
                placeholder="npr. 2500 RSD"
              />
            </div>
            <div>
              <Label htmlFor="adminNotes">Napomene o prijemu</Label>
              <Textarea
                id="adminNotes"
                value={formData.adminNotes || ''}
                onChange={(e) => setFormData({...formData, adminNotes: e.target.value})}
                rows={3}
                placeholder="Stanje dela, kvalitet, dodatne informacije..."
              />
            </div>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Potvrđujem...' : 'Potvrdi prijem'}
            </Button>
          </form>
        );

      case 'make-available':
        return (
          <div className="space-y-4">
            <p>Da li ste sigurni da želite da prebacite ovaj rezervni deo u dostupno stanje?</p>
            <p className="text-sm text-muted-foreground">
              Deo će biti dostupan serviserima za korišćenje.
            </p>
            <Button onClick={() => mutation.mutate({})} disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Prebacujem...' : 'Prebaci u dostupno'}
            </Button>
          </div>
        );

      case 'consume':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="consumedForServiceId">ID servisa (opciono)</Label>
              <Input
                id="consumedForServiceId"
                type="number"
                value={formData.consumedForServiceId || ''}
                onChange={(e) => setFormData({...formData, consumedForServiceId: e.target.value})}
                placeholder="Za koji servis je korišćen deo"
              />
            </div>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Označavam...' : 'Označi kao potrošeno'}
            </Button>
          </form>
        );

      default:
        return null;
    }
  };

  const getDialogTitle = () => {
    switch (action) {
      case 'order': return 'Poruči rezervni deo';
      case 'receive': return 'Potvrdi prijem';
      case 'make-available': return 'Prebaci u dostupno';
      case 'consume': return 'Označi kao potrošeno';
      default: return '';
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{getDialogTitle()}</DialogTitle>
      </DialogHeader>
      {getDialogContent()}
    </DialogContent>
  );
}

function SparePartCard({ order, onAction }: { order: SparePartOrder; onAction: (order: SparePartOrder, action: string) => void }) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      requested: { label: 'Zahtevano', variant: 'secondary' as const, icon: Package },
      admin_ordered: { label: 'Poručeno', variant: 'default' as const, icon: ShoppingCart },
      waiting_delivery: { label: 'Na čekanju', variant: 'outline' as const, icon: Truck },
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

  const getActionButton = (status: string) => {
    switch (status) {
      case 'requested':
        return (
          <Button 
            size="sm" 
            onClick={() => onAction(order, 'order')}
            className="flex items-center gap-1"
          >
            <ShoppingCart className="w-3 h-3" />
            Poruči
          </Button>
        );
      case 'admin_ordered':
        return (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onAction(order, 'receive')}
            className="flex items-center gap-1"
          >
            <Truck className="w-3 h-3" />
            Potvrdi prijem
          </Button>
        );
      case 'waiting_delivery':
        return (
          <Button 
            size="sm" 
            onClick={() => onAction(order, 'make-available')}
            className="flex items-center gap-1"
          >
            <CheckCircle className="w-3 h-3" />
            U dostupno
          </Button>
        );
      case 'available':
        return (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onAction(order, 'consume')}
            className="flex items-center gap-1"
          >
            <CheckCircle className="w-3 h-3" />
            Potrošeno
          </Button>
        );
      default:
        return null;
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
          <div>
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
            <strong>Napomene:</strong> {order.adminNotes}
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Kreiran: {new Date(order.createdAt).toLocaleDateString()}
          </span>
          {getActionButton(order.status)}
        </div>
      </CardContent>
    </Card>
  );
}

export function SparePartsWorkflow() {
  const [selectedAction, setSelectedAction] = useState<{ order: SparePartOrder; action: string } | null>(null);
  const queryClient = useQueryClient();

  // Fetch data for each status
  const statuses = ['requested', 'admin_ordered', 'waiting_delivery', 'available', 'consumed'];
  
  const queries = statuses.map(status => ({
    status,
    query: useQuery({
      queryKey: ['/api/admin/spare-parts/status', status],
      queryFn: () => apiRequest(`/api/admin/spare-parts/status/${status}`),
    })
  }));

  const handleAction = (order: SparePartOrder, action: string) => {
    setSelectedAction({ order, action });
  };

  const closeDialog = () => {
    setSelectedAction(null);
  };

  const getTabCount = (status: string) => {
    const query = queries.find(q => q.status === status);
    return Array.isArray(query?.query.data) ? query.query.data.length : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Workflow rezervnih delova</h2>
      </div>

      <Tabs defaultValue="requested" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="requested" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Zahtevi ({getTabCount('requested')})
          </TabsTrigger>
          <TabsTrigger value="admin_ordered" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Poručeno ({getTabCount('admin_ordered')})
          </TabsTrigger>
          <TabsTrigger value="waiting_delivery" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Na čekanju ({getTabCount('waiting_delivery')})
          </TabsTrigger>
          <TabsTrigger value="available" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Dostupno ({getTabCount('available')})
          </TabsTrigger>
          <TabsTrigger value="consumed" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Potrošeno ({getTabCount('consumed')})
          </TabsTrigger>
        </TabsList>

        {statuses.map(status => {
          const query = queries.find(q => q.status === status)?.query;
          return (
            <TabsContent key={status} value={status} className="mt-6">
              {query?.isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Učitavanje...</p>
                </div>
              ) : query?.error ? (
                <div className="text-center py-8 text-red-600">
                  Greška pri učitavanju podataka
                </div>
              ) : !Array.isArray(query?.data) || query.data.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nema rezervnih delova u ovom statusu
                </div>
              ) : (
                <div className="grid gap-4">
                  {query.data.map((order: SparePartOrder) => (
                    <SparePartCard 
                      key={order.id} 
                      order={order} 
                      onAction={handleAction}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={!!selectedAction} onOpenChange={closeDialog}>
        {selectedAction && (
          <WorkflowActionDialog
            order={selectedAction.order}
            action={selectedAction.action as 'order' | 'receive' | 'make-available' | 'consume'}
            onClose={closeDialog}
          />
        )}
      </Dialog>
    </div>
  );
}