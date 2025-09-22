import { useState, useCallback, memo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import DirectSparePartsOrderForm from './DirectSparePartsOrderForm';
import { 
  Package, 
  Wrench, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  DollarSign,
  Edit,
  Check,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  Building,
  Settings,
  Trash2,
  ShoppingCart
} from 'lucide-react';

interface SparePartOrder {
  id: number;
  serviceId?: number;
  technicianId?: number;
  applianceId?: number;
  partName: string;
  partNumber?: string;
  quantity: number;
  description?: string;
  urgency: 'normal' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'delivered' | 'cancelled' | 'removed_from_ordering';
  warrantyStatus: 'u garanciji' | 'van garancije';
  estimatedCost?: string;
  actualCost?: string;
  supplierName?: string;
  orderDate?: string;
  expectedDelivery?: string;
  receivedDate?: string;
  adminNotes?: string;
  isDelivered?: boolean;
  deliveryConfirmedAt?: string;
  deliveryConfirmedBy?: number;
  autoRemoveAfterDelivery?: boolean;
  removedFromOrderingAt?: string;
  createdAt: string;
  updatedAt: string;
  // Related data
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

const SparePartsOrders = memo(function SparePartsOrders() {
  const [selectedOrder, setSelectedOrder] = useState<SparePartOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDirectOrderOpen, setIsDirectOrderOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editFormData, setEditFormData] = useState({
    status: '',
    estimatedCost: '',
    actualCost: '',
    expectedDelivery: '',
    receivedDate: '',
    adminNotes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto-generate JWT token if not present
  useEffect(() => {
    const generateTokenIfNeeded = async () => {
      const existingToken = localStorage.getItem('auth_token');
      console.log('🔍 Checking for existing JWT token:', existingToken ? 'Found' : 'Not found');
      
      if (!existingToken) {
        try {
          console.log('🔑 Attempting to generate JWT token...');
          const response = await fetch('/api/generate-jwt-token', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          console.log('🔑 JWT token response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('auth_token', data.token);
            console.log('✅ JWT token automatski generisan za rezervne delove');
            
            // Refresh spare parts data after token is set
            queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'] });
          } else {
            const errorData = await response.json();
            console.error('❌ JWT token generation failed:', errorData);
          }
        } catch (error) {
          console.error('❌ Greška pri generisanju JWT tokena:', error);
        }
      } else {
        console.log('✅ JWT token već postoji u localStorage');
      }
    };
    
    generateTokenIfNeeded();
  }, [queryClient]);

  // Fetch all spare part orders
  const { data: orders = [], isLoading, error } = useQuery<SparePartOrder[]>({
    queryKey: ['/api/admin/spare-parts'],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });


  // Debug logging for TanStack Query v5
  useEffect(() => {
    if (orders && orders.length > 0) {
      console.log('✅ Spare parts data received:', orders.length, 'orders');
    }
    if (error) {
      console.error('❌ Spare parts query error:', error);
    }
  }, [orders, error]);

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<SparePartOrder> }) => {
      const response = await apiRequest(`/api/admin/spare-parts/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.updates)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno ažurirano",
        description: "Porudžbina rezervnog dela je uspešno ažurirana.",
      });
      setIsEditOpen(false);
      // Optimized: Single invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri ažuriranju",
        description: error.message || "Došlo je do greške pri ažuriranju porudžbine.",
        variant: "destructive",
      });
    }
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest(`/api/admin/spare-parts/${orderId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Uspešno obrisano",
        description: "Porudžbina rezervnog dela je uspešno obrisana.",
      });
      // Optimized: Single invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'] });
    },
    onError: (error: any) => {
      console.error('❌ [DELETE MUTATION] Greška pri brisanju:', error);
      toast({
        title: "Greška pri brisanju",
        description: error.message || "Nije moguće obrisati porudžbinu. Proverite da li ste prijavljeni.",
        variant: "destructive",
      });
    }
  });

  // Confirm delivery mutation (NOVA FUNKCIONALNOST)
  const confirmDeliveryMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest(`/api/admin/spare-parts/${orderId}/confirm-delivery`, {
        method: 'PATCH'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Isporuka potvrđena",
        description: "Isporuka rezervnog dela je uspešno potvrđena. Deo je automatski uklonjen iz sistema poručivanja.",
      });
      // Optimized: Single invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri potvrdi isporuke",
        description: error.message || "Došlo je do greške pri potvrdi isporuke.",
        variant: "destructive",
      });
    }
  });

  // Mark as received mutation - OPTIMIZED
  const markReceivedMutation = useMutation({
    mutationFn: async (order: SparePartOrder) => {
      const availablePartData = {
        partName: order.partName,
        partNumber: order.partNumber || '',
        quantity: order.quantity,
        description: order.description || '',
        warrantyStatus: order.warrantyStatus,
        supplierName: order.supplierName || '',
        actualCost: order.actualCost || '',
        location: 'Skladište',
        notes: `Prelazak iz porudžbine #${order.id}`,
        originalOrderId: order.id,
        serviceId: order.serviceId,
        technicianId: order.technicianId,
        applianceId: order.applianceId,
        receivedDate: new Date().toISOString()
      };

      const response = await apiRequest('/api/admin/available-parts', {
        method: 'POST',
        body: JSON.stringify(availablePartData)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deo označen kao primljen",
        description: "Rezervni deo je prebačen u dostupne delove.",
      });
      // Optimized: Targeted batch invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'], exact: true });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/available-parts'], exact: true });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri označavanju",
        description: error.message || "Došlo je do greške pri označavanju dela kao primljenog.",
        variant: "destructive",
      });
    }
  });

  // Filter orders based on status
  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Na čekanju", variant: "secondary" as const, icon: Clock },
      approved: { label: "Odobreno", variant: "default" as const, icon: Check },
      ordered: { label: "Poručeno", variant: "default" as const, icon: Package },
      received: { label: "Primljeno", variant: "default" as const, icon: CheckCircle },
      delivered: { label: "Isporučeno", variant: "default" as const, icon: CheckCircle },
      cancelled: { label: "Otkazano", variant: "destructive" as const, icon: X },
      removed_from_ordering: { label: "Uklonjen", variant: "outline" as const, icon: Trash2 }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Get urgency badge
  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig = {
      normal: { label: "Normalno", variant: "secondary" as const },
      high: { label: "Visoko", variant: "default" as const },
      urgent: { label: "HITNO", variant: "destructive" as const }
    };
    
    const config = urgencyConfig[urgency as keyof typeof urgencyConfig] || urgencyConfig.normal;
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  // Handle view details
  const handleViewDetails = (order: SparePartOrder) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  // Handle edit order
  const handleEditOrder = (order: SparePartOrder) => {
    setSelectedOrder(order);
    setEditFormData({
      status: order.status,
      estimatedCost: order.estimatedCost || '',
      actualCost: order.actualCost || '',
      expectedDelivery: order.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : '',
      receivedDate: order.receivedDate ? new Date(order.receivedDate).toISOString().split('T')[0] : '',
      adminNotes: order.adminNotes || ''
    });
    setIsEditOpen(true);
  };

  // Handle delete order
  const handleDeleteOrder = (order: SparePartOrder) => {
    console.log('Delete order clicked:', order.id, order.partName);
    if (window.confirm(`Da li ste sigurni da želite da obrišete porudžbinu #${order.id} - ${order.partName}?`)) {
      console.log('Mutation started for order ID:', order.id);
      deleteOrderMutation.mutate(order.id);
    }
  };

  // Handle direct order - open AdminSparePartsOrderingSimple dialog
  const handleDirectOrder = (order: SparePartOrder) => {
    setSelectedOrder(order);
    setIsDirectOrderOpen(true);
  };

  // Handle mark as received
  const handleMarkReceived = (order: SparePartOrder) => {
    if (window.confirm(`Da li ste sigurni da je deo ${order.partName} stigao i želite ga prebaciti u dostupne delove?`)) {
      markReceivedMutation.mutate(order);
    }
  };

  // Handle confirm delivery (NOVA FUNKCIONALNOST)
  const handleConfirmDelivery = (order: SparePartOrder) => {
    if (window.confirm(`Da li ste sigurni da želite da potvrdite isporuku dela "${order.partName}"? Ova akcija će automatski ukloniti deo iz sistema poručivanja.`)) {
      confirmDeliveryMutation.mutate(order.id);
    }
  };

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const updates: Partial<SparePartOrder> = {
      status: editFormData.status as any,
      estimatedCost: editFormData.estimatedCost || undefined,
      actualCost: editFormData.actualCost || undefined,
      expectedDelivery: editFormData.expectedDelivery ? new Date(editFormData.expectedDelivery).toISOString() : undefined,
      receivedDate: editFormData.receivedDate ? new Date(editFormData.receivedDate).toISOString() : undefined,
      adminNotes: editFormData.adminNotes || undefined
    };

    updateOrderMutation.mutate({ id: selectedOrder.id, updates });
  }, [selectedOrder, editFormData, updateOrderMutation]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Učitavanje porudžbina...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">Greška pri učitavanju porudžbina</p>
            <p className="text-muted-foreground">Molimo pokušajte ponovo.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Trenutne porudžbine rezervnih delova
              </CardTitle>
              <CardDescription>
                Pregled svih porudžbina rezervnih delova sa kompletnim detaljima
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter">Status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi statusi</SelectItem>
                  <SelectItem value="pending">Na čekanju</SelectItem>
                  <SelectItem value="approved">Odobreno</SelectItem>
                  <SelectItem value="ordered">Poručeno</SelectItem>
                  <SelectItem value="received">Primljeno</SelectItem>
                  <SelectItem value="delivered">Isporučeno</SelectItem>
                  <SelectItem value="cancelled">Otkazano</SelectItem>
                  <SelectItem value="removed_from_ordering">Uklonjen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Nema porudžbina
              </p>
              <p className="text-muted-foreground">
                {statusFilter === 'all' 
                  ? 'Trenutno nema registrovanih porudžbina rezervnih delova.'
                  : `Nema porudžbina sa statusom "${statusFilter}".`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-lg">
                            Porudžbina #{order.id} - {order.partName}
                          </h3>
                          {getStatusBadge(order.status)}
                          {getUrgencyBadge(order.urgency)}
                          <Badge variant="outline" className="flex items-center gap-1">
                            {order.warrantyStatus === 'u garanciji' ? '🛡️' : '💰'} 
                            {order.warrantyStatus}
                          </Badge>
                          {order.service && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              Servis #{order.service.id}
                            </Badge>
                          )}
                        </div>
                        
                        {/* OSNOVNI PODACI - KOMPAKTNO */}
                        <div className="flex flex-wrap gap-4 text-sm mb-3 mt-3">
                          <div className="bg-blue-50 px-2 py-1 rounded">
                            <span className="text-blue-700 font-medium">Količina:</span> <span className="text-blue-900">{order.quantity}</span>
                          </div>
                          {order.partNumber && (
                            <div className="bg-purple-50 px-2 py-1 rounded">
                              <span className="text-purple-700 font-medium">Kataloški:</span> <span className="text-purple-900">{order.partNumber}</span>
                            </div>
                          )}
                          <div className="bg-gray-50 px-2 py-1 rounded">
                            <span className="text-gray-700 font-medium">Kreiran:</span> <span className="text-gray-900">{formatDate(order.createdAt)}</span>
                          </div>
                        </div>

                        {/* ORGANIZOVANE KARTICE PO KATEGORIJAMA - GRID LAYOUT */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                          {/* OSNOVNI PODACI KARTICE */}
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <h5 className="font-semibold text-green-800 mb-2 flex items-center">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Osnovni podaci
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                              {order.supplierName && (
                                <div><span className="text-green-700 font-medium">Dobavljač:</span> {order.supplierName}</div>
                              )}
                              {order.estimatedCost && (
                                <div><span className="text-green-700 font-medium">Procenjena cena:</span> {order.estimatedCost}€</div>
                              )}
                              {order.actualCost && (
                                <div><span className="text-green-700 font-medium">Stvarna cena:</span> <span className="text-green-600 font-semibold">{order.actualCost}€</span></div>
                              )}
                            </div>
                          </div>
                          
                          {/* KLIJENT I SERVIS INFORMACIJE */}
                          {order.service ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                Servis #{order.service.id} - Klijent i aparat
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <div><span className="text-blue-700 font-medium">Klijent:</span> {order.service.client?.fullName || 'N/A'}</div>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Phone className="h-3 w-3 text-blue-600" />
                                    <span className="font-medium text-blue-600">{order.service.client?.phone || 'N/A'}</span>
                                  </div>
                                  {order.service.client?.email && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Mail className="h-3 w-3 text-blue-600" />
                                      <span className="text-blue-700">{order.service.client.email}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3 text-blue-600" />
                                    <span className="text-blue-700">{order.service.client?.city || 'N/A'}</span>
                                  </div>
                                </div>
                                <div>
                                  <div><span className="text-blue-700 font-medium">Aparat:</span></div>
                                  <div className="text-blue-800 font-medium">
                                    {order.service.appliance?.manufacturer?.name} {order.service.appliance?.model}
                                  </div>
                                  <div className="text-blue-600 text-xs">
                                    {order.service.appliance?.category?.name}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <h5 className="font-semibold text-orange-800 mb-2 flex items-center">
                                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                                Admin porudžbina
                              </h5>
                              <div className="text-sm text-orange-700">
                                <p>Porudžbina kreirana direktno od strane administratora</p>
                                <Badge variant="outline" className="text-xs mt-1 border-orange-300 text-orange-700">
                                  Bez vezanog servisa
                                </Badge>
                              </div>
                            </div>
                          )}
                          
                          {/* TEHNIKER INFORMACIJE */}
                          {order.technician ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <h5 className="font-semibold text-green-800 mb-2 flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                Servisər
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div><span className="text-green-700 font-medium">Ime:</span> {order.technician.name}</div>
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-green-600" />
                                  <span className="font-medium text-green-600">{order.technician.phone}</span>
                                </div>
                                {order.technician.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3 text-green-600" />
                                    <span className="text-green-700">{order.technician.email}</span>
                                  </div>
                                )}
                                <div className="text-green-600 text-xs">
                                  {order.technician.specialization}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <h5 className="font-semibold text-gray-700 mb-2 flex items-center">
                                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                Serviser
                              </h5>
                              <p className="text-sm text-gray-600">Nije dodeljen serviser</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(order)}
                        >
                          Detalji
                        </Button>
                        {order.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDirectOrder(order)}
                              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                            >
                              <ShoppingCart className="h-4 w-4 mr-1" />
                              Poruči direktno
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleMarkReceived(order)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Stigao
                            </Button>
                          </>
                        )}
                        
                        {/* NOVO DUGME: Potvrdi isporuku za status 'received' */}
                        {order.status === 'received' && !order.isDelivered && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleConfirmDelivery(order)}
                            disabled={confirmDeliveryMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {confirmDeliveryMutation.isPending ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Potvrdi isporuku
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOrder(order)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteOrder(order)}
                          disabled={deleteOrderMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deleteOrderMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalji porudžbine #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Kompletan pregled porudžbine rezervnog dela sa svim povezanim podacima
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">Osnovni podaci</TabsTrigger>
                <TabsTrigger value="service">Servis</TabsTrigger>
                <TabsTrigger value="financial">Finansijski</TabsTrigger>
                <TabsTrigger value="timeline">Vremenski tok</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Naziv dela</Label>
                    <p className="mt-1">{selectedOrder.partName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Količina</Label>
                    <p className="mt-1">{selectedOrder.quantity}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Hitnost</Label>
                    <div className="mt-1">{getUrgencyBadge(selectedOrder.urgency)}</div>
                  </div>
                </div>
                
                {selectedOrder.description && (
                  <div>
                    <Label className="text-sm font-medium">Opis</Label>
                    <p className="mt-1 text-sm">{selectedOrder.description}</p>
                  </div>
                )}
                
                {selectedOrder.adminNotes && (
                  <div>
                    <Label className="text-sm font-medium">Napomene administratora</Label>
                    <p className="mt-1 text-sm">{selectedOrder.adminNotes}</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="service" className="space-y-4">
                {selectedOrder.service ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Servis #{selectedOrder.service.id}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Status servisa</Label>
                          <p className="mt-1">{selectedOrder.service.status}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Opis problema</Label>
                          <p className="mt-1">{selectedOrder.service.description}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">Podaci o klijentu</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Ime i prezime</Label>
                          <p className="mt-1">{selectedOrder.service.client?.fullName || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Telefon</Label>
                          <p className="mt-1">{selectedOrder.service.client?.phone || 'N/A'}</p>
                        </div>
                        {selectedOrder.service.client?.email && (
                          <div>
                            <Label className="text-sm font-medium">Email</Label>
                            <p className="mt-1">{selectedOrder.service.client?.email}</p>
                          </div>
                        )}
                        {selectedOrder.service.client?.address && (
                          <div>
                            <Label className="text-sm font-medium">Adresa</Label>
                            <p className="mt-1">{selectedOrder.service.client?.address || 'N/A'}, {selectedOrder.service.client?.city || 'N/A'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">Podaci o uređaju</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Proizvođač</Label>
                          <p className="mt-1">{selectedOrder.service.appliance?.manufacturer?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Kategorija</Label>
                          <p className="mt-1">{selectedOrder.service.appliance?.category?.name || 'N/A'}</p>
                        </div>
                        {selectedOrder.service.appliance?.model && (
                          <div>
                            <Label className="text-sm font-medium">Model</Label>
                            <p className="mt-1">{selectedOrder.service.appliance?.model}</p>
                          </div>
                        )}
                        {selectedOrder.service.appliance?.serialNumber && (
                          <div>
                            <Label className="text-sm font-medium">Serijski broj</Label>
                            <p className="mt-1">{selectedOrder.service.appliance?.serialNumber}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">
                      Admin porudžbina
                    </p>
                    <p className="text-muted-foreground">
                      Ova porudžbina je kreirana direktno kroz admin panel i nije povezana sa specifičnim servisom.
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Garancijski status</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {selectedOrder.warrantyStatus === 'u garanciji' ? '🛡️' : '💰'} 
                        {selectedOrder.warrantyStatus}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Dobavljač</Label>
                    <p className="mt-1">{selectedOrder.supplierName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Procenjena cena</Label>
                    <p className="mt-1">{selectedOrder.estimatedCost ? `${selectedOrder.estimatedCost} €` : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Stvarna cena</Label>
                    <p className="mt-1">{selectedOrder.actualCost ? `${selectedOrder.actualCost} €` : 'N/A'}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="timeline" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Datum kreiranja</p>
                      <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.createdAt)}</p>
                    </div>
                  </div>
                  
                  {selectedOrder.orderDate && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Package className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Datum porudžbine</p>
                        <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.orderDate)}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedOrder.expectedDelivery && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Očekivana isporuka</p>
                        <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.expectedDelivery)}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedOrder.receivedDate && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Datum prijema</p>
                        <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.receivedDate)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Uredi porudžbinu #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Ažuriranje statusa i detalja porudžbine rezervnog dela
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={editFormData.status} 
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Na čekanju</SelectItem>
                    <SelectItem value="approved">Odobreno</SelectItem>
                    <SelectItem value="ordered">Poručeno</SelectItem>
                    <SelectItem value="received">Primljeno</SelectItem>
                    <SelectItem value="delivered">Isporučeno</SelectItem>
                    <SelectItem value="cancelled">Otkazano</SelectItem>
                    <SelectItem value="removed_from_ordering">Uklonjen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="estimatedCost">Procenjena cena (€)</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  step="0.01"
                  value={editFormData.estimatedCost}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, estimatedCost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="actualCost">Stvarna cena (€)</Label>
                <Input
                  id="actualCost"
                  type="number"
                  step="0.01"
                  value={editFormData.actualCost}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, actualCost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expectedDelivery">Očekivana isporuka</Label>
                <Input
                  id="expectedDelivery"
                  type="date"
                  value={editFormData.expectedDelivery}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, expectedDelivery: e.target.value }))}
                />
              </div>
              
              {editFormData.status === 'received' && (
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="receivedDate">Datum prijema</Label>
                  <Input
                    id="receivedDate"
                    type="date"
                    value={editFormData.receivedDate}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, receivedDate: e.target.value }))}
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminNotes">Napomene administratora</Label>
              <Textarea
                id="adminNotes"
                value={editFormData.adminNotes}
                onChange={(e) => setEditFormData(prev => ({ ...prev, adminNotes: e.target.value }))}
                placeholder="Dodatne napomene o porudžbini..."
                rows={3}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Otkaži
              </Button>
              <Button type="submit" disabled={updateOrderMutation.isPending}>
                {updateOrderMutation.isPending ? 'Ažuriranje...' : 'Sačuvaj izmene'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Direct Ordering Dialog */}
      <Dialog open={isDirectOrderOpen} onOpenChange={setIsDirectOrderOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Poruči direktno - Zahtev #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Poručite rezervni deo direktno na osnovu zahteva servisera. Svi podaci će biti automatski popunjeni.
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Request Info Card */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Informacije o zahtevu</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Deo:</span> {selectedOrder.partName}
                  </div>
                  <div>
                    <span className="font-medium">Količina:</span> {selectedOrder.quantity}
                  </div>
                  {selectedOrder.partNumber && (
                    <div>
                      <span className="font-medium">Kataloški br:</span> {selectedOrder.partNumber}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Urgentnost:</span> {selectedOrder.urgency}
                  </div>
                  {selectedOrder.service && (
                    <>
                      <div>
                        <span className="font-medium">Klijent:</span> {selectedOrder.service.client?.fullName}
                      </div>
                      <div>
                        <span className="font-medium">Telefon:</span> {selectedOrder.service.client?.phone}
                      </div>
                      {selectedOrder.service.appliance && (
                        <>
                          <div>
                            <span className="font-medium">Uređaj:</span> {selectedOrder.service.appliance.category?.name}
                          </div>
                          <div>
                            <span className="font-medium">Proizvođač:</span> {selectedOrder.service.appliance.manufacturer?.name}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Direct Ordering Form */}
              <DirectSparePartsOrderForm 
                serviceId={selectedOrder.serviceId}
                orderId={selectedOrder.id} // Proslijedi ID postojeće porudžbine
                prefilledData={{
                  partName: selectedOrder.partName,
                  partNumber: selectedOrder.partNumber || '',
                  quantity: selectedOrder.quantity.toString(),
                  description: selectedOrder.description || '',
                  urgency: selectedOrder.urgency,
                  warrantyStatus: selectedOrder.warrantyStatus,
                  deviceModel: selectedOrder.service?.appliance?.model || '',
                  applianceCategory: selectedOrder.service?.appliance?.category?.name || ''
                }}
                onSuccess={() => {
                  setIsDirectOrderOpen(false);
                  toast({
                    title: "Uspešno poručeno",
                    description: "Status je automatski ažuriran na 'Poručeno'.",
                  });
                  // Optimized: Single targeted invalidation
                  queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'], exact: true });
                }}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDirectOrderOpen(false)}>
              Zatvori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default SparePartsOrders;