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
import { Package, Clock, CheckCircle, ArrowRight, Truck, ShoppingCart, Wrench, User, Phone, MapPin, Settings, Share2 } from 'lucide-react';
import { shareSparePartOrder } from '@/utils/shareUtils';

interface SparePartOrder {
  id: number;
  serviceId?: number;
  technicianId?: number;
  applianceId?: number;
  partName: string;
  partNumber?: string;
  quantity: number;
  description?: string;
  urgency: string;
  status: string;
  warrantyStatus?: 'u garanciji' | 'van garancije';
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
  // Related enriched data
  service?: {
    id: number;
    status: string;
    description: string;
    createdAt: string;
    scheduledDate?: string;
    client?: {
      fullName: string;
      phone: string;
      email?: string;
      address?: string;
      city?: string;
    } | null;
    appliance?: {
      model?: string;
      serialNumber?: string;
      category?: { name: string };
      manufacturer?: { name: string };
    } | null;
  };
  technician?: {
    name: string;
    phone: string;
    email: string;
    specialization: string;
  };
}

interface WorkflowActionDialogProps {
  order: SparePartOrder;
  action: 'order' | 'receive' | 'make-available' | 'consume' | 'approve-pending';
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

function SparePartCard({ order, onAction }: { order: any; onAction: (order: any, action: string) => void }) {
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

        {/* OSNOVNI PODACI - KOMPAKTNO */}
        <div className="flex flex-wrap gap-4 text-sm mb-3">
          <div className="bg-blue-50 px-2 py-1 rounded">
            <span className="text-blue-700 font-medium">Količina:</span> <span className="text-blue-900">{order.quantity}</span>
          </div>
          <div className="bg-purple-50 px-2 py-1 rounded">
            <span className="text-purple-700 font-medium">Hitnost:</span> <span className="text-purple-900">{order.urgency}</span>
          </div>
        </div>

        {/* SERVISNE INFORMACIJE - KARTICE */}
        <div className="space-y-3 mb-3">
          {(order.technician?.fullName || order.serviceId) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h5 className="font-semibold text-green-800 mb-2 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Servisne informacije
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {order.technician?.fullName && (
                  <div><span className="text-green-700 font-medium">Serviser:</span> {order.technician.fullName}</div>
                )}
                {order.serviceId && (
                  <div><span className="text-green-700 font-medium">Servis ID:</span> #{order.serviceId}</div>
                )}
              </div>
            </div>
          )}

          {(order.service?.client?.fullName || order.service?.client?.phone) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Podaci o klijentu
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {order.service?.client?.fullName && (
                  <div><span className="text-blue-700 font-medium">Klijent:</span> {order.service.client.fullName}</div>
                )}
                {order.service?.client?.phone && (
                  <div><span className="text-blue-700 font-medium">Telefon:</span> {order.service.client.phone}</div>
                )}
              </div>
            </div>
          )}

          {order.service?.appliance && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <h5 className="font-semibold text-orange-800 mb-2 flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                Informacije o aparatu
              </h5>
              <div className="text-sm">
                <div><span className="text-orange-700 font-medium">Aparat:</span> {order.service.appliance.manufacturer?.name} {order.service.appliance.model}</div>
              </div>
            </div>
          )}

          {order.warrantyStatus && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2 flex items-center">
                <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                Garancijski status
              </h5>
              <div className="text-sm">
                <span className={order.warrantyStatus === 'u garanciji' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {order.warrantyStatus === 'u garanciji' ? '🛡️ U garanciji' : '💰 Van garancije'}
                </span>
              </div>
            </div>
          )}

          {(order.supplierName || order.actualCost) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h5 className="font-semibold text-yellow-800 mb-2 flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                Dobavljač i cena
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {order.supplierName && (
                  <div><span className="text-yellow-700 font-medium">Dobavljač:</span> {order.supplierName}</div>
                )}
                {order.actualCost && (
                  <div><span className="text-yellow-700 font-medium">Cena:</span> {order.actualCost}</div>
                )}
              </div>
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
      queryFn: async () => {
        const response = await apiRequest(`/api/admin/spare-parts/status/${status}`);
        return await response.json();
      },
    })
  }));

  const handleAction = (order: any, action: string) => {
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
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {query.data.map((order: any) => (
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

// ===== NOVA FUNKCIJA - ENHANCED WORKFLOW SA PENDING STATUSOM =====
// DODANO ZBOG PROBLEMA: Administrator ne vidi "pending" delove od servisera
// POŠTUJE PRAVILA: Ne mijenja postojeći kod, dodaje novu funkciju na kraj

function SparePartCardEnhanced({ order, onAction, onShare }: { order: SparePartOrder; onAction: (order: SparePartOrder, action: string) => void; onShare: (order: SparePartOrder) => void }) {
  const getStatusBadgeEnhanced = (status: string) => {
    const statusConfigEnhanced = {
      pending: { label: 'Na čekanju', variant: 'destructive' as const, icon: Clock },
      requested: { label: 'Zahtevano', variant: 'secondary' as const, icon: Package },
      admin_ordered: { label: 'Poručeno', variant: 'default' as const, icon: ShoppingCart },
      waiting_delivery: { label: 'Na čekanju', variant: 'outline' as const, icon: Truck },
      available: { label: 'Dostupno', variant: 'default' as const, icon: CheckCircle },
      consumed: { label: 'Potrošeno', variant: 'secondary' as const, icon: CheckCircle }
    };

    const config = statusConfigEnhanced[status as keyof typeof statusConfigEnhanced] || { label: status, variant: 'outline' as const, icon: Package };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getActionButtonEnhanced = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Button 
            size="sm" 
            onClick={() => onAction(order, 'approve-pending')}
            className="flex items-center gap-1"
          >
            <ArrowRight className="w-3 h-3" />
            Odobri zahtev
          </Button>
        );
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
    <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="font-bold text-xl text-gray-900 mb-1">{order.partName}</h4>
            {order.partNumber && (
              <p className="text-sm text-blue-600 font-medium">#{order.partNumber}</p>
            )}
          </div>
          {getStatusBadgeEnhanced(order.status)}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* OSNVNE INFORMACIJE */}
        <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span className="text-sm text-gray-500">Količina</span>
              <p className="font-semibold text-lg">{order.quantity}</p>
            </div>
          </div>
          
          <div className="text-right">
            <span className="text-sm text-gray-500">Hitnost</span>
            <div className="mt-1">
              <Badge variant={order.urgency === 'high' ? 'destructive' : order.urgency === 'medium' ? 'default' : 'secondary'} className="text-xs">
                {order.urgency === 'high' ? '🔥 Visoka' : order.urgency === 'medium' ? '⚡ Srednja' : '📅 Normalna'}
              </Badge>
            </div>
          </div>
        </div>

        {/* CONTEXT SERVIS/KLIJENT */}
        {order.service && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2" data-testid={`text-service-${order.service.id}`}>
              <Wrench className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-900">Servis #{order.service.id}</span>
            </div>
            
            {order.service?.appliance && (
              <div className="flex items-center gap-2 mb-2 text-sm" data-testid={`text-appliance-${order.id}`}>
                <Settings className="w-4 h-4 text-orange-600" />
                <span className="text-gray-700">
                  <span className="font-medium">{order.service.appliance.manufacturer?.name || "Nepoznat"}</span> • 
                  {order.service.appliance.category?.name} • 
                  <span className="italic">{order.service.appliance.model || "Model N/A"}</span>
                </span>
              </div>
            )}
            
            {order.service?.client && (
              <div className="flex items-center gap-2 text-sm" data-testid={`text-client-${order.id}`}>
                <User className="w-4 h-4 text-green-600" />
                <div className="flex items-center gap-4">
                  <span className="font-medium text-green-800">{order.service.client.fullName}</span>
                  {order.service.client.phone && (
                    <span className="text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {order.service.client.phone}
                    </span>
                  )}
                  {order.service.client.city && (
                    <span className="text-gray-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {order.service.client.city}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* OPIS */}
        {order.description && (
          <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-l-gray-400">
            <p className="text-sm text-gray-700 italic">{order.description}</p>
          </div>
        )}

        {/* FINANSIJSKI PODACI */}
        {(order.supplierName || order.estimatedCost || order.actualCost) && (
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              {order.supplierName && (
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Dobavljač</span>
                  <p className="font-medium text-amber-800">{order.supplierName}</p>
                </div>
              )}
              {order.estimatedCost && (
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Procenjena cena</span>
                  <p className="font-medium text-amber-800">{order.estimatedCost}</p>
                </div>
              )}
              {order.actualCost && (
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Stvarna cena</span>
                  <p className="font-semibold text-green-700">{order.actualCost}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOOTER - DATUM I ACTION */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">
              📅 {new Date(order.createdAt).toLocaleDateString('sr-RS')}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShare(order)}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            >
              <Share2 className="w-3 h-3 mr-1" />
              Podijeli
            </Button>
            {getActionButtonEnhanced(order.status)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowActionDialogEnhanced({ order, action, onClose }: WorkflowActionDialogProps) {
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const endpointMap: Record<string, string> = {
        'approve-pending': `/api/admin/spare-parts/${order.id}/approve-pending`,
        order: `/api/admin/spare-parts/${order.id}/order`,
        receive: `/api/admin/spare-parts/${order.id}/receive`,
        'make-available': `/api/admin/spare-parts/${order.id}/make-available`,
        consume: `/api/technician/spare-parts/${order.id}/consume`
      };

      const endpoint = endpointMap[action];
      if (!endpoint) {
        throw new Error(`Unknown action: ${action}`);
      }
      return await apiRequest(endpoint, {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined
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

  const getDialogContentEnhanced = () => {
    switch (action) {
      case 'approve-pending':
        return (
          <div className="space-y-4">
            <p>Da li ste sigurni da želite da odobrite ovaj zahtev za rezervnim delom?</p>
            <p className="text-sm text-muted-foreground">
              Zahtev će biti prebačen u status "requested" i bit će spreman za poručivanje.
            </p>
            <Button onClick={() => mutation.mutate(null)} disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Odobravam...' : 'Odobri zahtev'}
            </Button>
          </div>
        );
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

  const getDialogTitleEnhanced = () => {
    switch (action) {
      case 'approve-pending': return 'Odobri zahtev';
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
        <DialogTitle>{getDialogTitleEnhanced()}</DialogTitle>
      </DialogHeader>
      {getDialogContentEnhanced()}
    </DialogContent>
  );
}

export function SparePartsWorkflowEnhanced() {
  const [selectedAction, setSelectedAction] = useState<{ order: SparePartOrder; action: string } | null>(null);
  const queryClient = useQueryClient();

  // ENHANCED: Dodato "pending" na početak liste
  const statusesEnhanced = ['pending', 'requested', 'admin_ordered', 'waiting_delivery', 'available', 'consumed'];
  
  const queriesEnhanced = statusesEnhanced.map(status => ({
    status,
    query: useQuery({
      queryKey: ['/api/admin/spare-parts/status', status],
      queryFn: async () => {
        const response = await apiRequest(`/api/admin/spare-parts/status/${status}`);
        return await response.json();
      },
    })
  }));

  const handleActionEnhanced = (order: SparePartOrder, action: string) => {
    setSelectedAction({ order, action });
  };

  const closeDialogEnhanced = () => {
    setSelectedAction(null);
  };

  const { toast } = useToast();

  const handleShareOrder = async (order: SparePartOrder) => {
    try {
      await shareSparePartOrder(order);
      toast({
        title: "Sadržaj podeljen",
        description: "Informacije o rezervnom delu su uspešno podeljene.",
      });
    } catch (error) {
      console.error('Greška pri dijeljenju:', error);
      toast({
        title: "Greška pri dijeljenju",
        description: "Došlo je do greške pri dijeljenju sadržaja.",
        variant: "destructive",
      });
    }
  };

  const getTabCountEnhanced = (status: string) => {
    const query = queriesEnhanced.find(q => q.status === status);
    return Array.isArray(query?.query.data) ? query.query.data.length : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Workflow rezervnih delova</h2>
        <Badge variant="secondary" className="ml-2">Enhanced - sa pending statusom</Badge>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending ({getTabCountEnhanced('pending')})
          </TabsTrigger>
          <TabsTrigger value="requested" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Zahtevi ({getTabCountEnhanced('requested')})
          </TabsTrigger>
          <TabsTrigger value="admin_ordered" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Poručeno ({getTabCountEnhanced('admin_ordered')})
          </TabsTrigger>
          <TabsTrigger value="waiting_delivery" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Na čekanju ({getTabCountEnhanced('waiting_delivery')})
          </TabsTrigger>
          <TabsTrigger value="available" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Dostupno ({getTabCountEnhanced('available')})
          </TabsTrigger>
          <TabsTrigger value="consumed" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Potrošeno ({getTabCountEnhanced('consumed')})
          </TabsTrigger>
        </TabsList>

        {statusesEnhanced.map(status => {
          const query = queriesEnhanced.find(q => q.status === status)?.query;
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
                  {status === 'pending' ? 
                    'Nema novih zahteva za rezervne delove od servisera' : 
                    'Nema rezervnih delova u ovom statusu'}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {query.data.map((order: any) => (
                    <SparePartCardEnhanced 
                      key={order.id} 
                      order={order} 
                      onAction={handleActionEnhanced}
                      onShare={handleShareOrder}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={!!selectedAction} onOpenChange={closeDialogEnhanced}>
        {selectedAction && (
          <WorkflowActionDialogEnhanced
            order={selectedAction.order}
            action={selectedAction.action as WorkflowActionDialogProps['action']}
            onClose={closeDialogEnhanced}
          />
        )}
      </Dialog>
    </div>
  );
}