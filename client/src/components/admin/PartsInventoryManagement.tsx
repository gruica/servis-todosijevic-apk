import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, CheckCircle, ArrowRight, Search, MapPin, User, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Types for inventory management
interface PartsInventoryItem {
  id: number;
  partName: string;
  partNumber: string;
  quantity: number;
  status: 'received' | 'allocated' | 'dispatched' | 'installed' | 'returned';
  currentLocation: string;
  actualCost: string;
  supplierInvoiceNumber: string;
  warehouseLocation: string;
  batchNumber: string;
  allocatedToServiceId?: number;
  allocatedToTechnicianId?: number;
  dispatchedAt?: string;
  installedAt?: string;
  receivingNotes?: string;
  dispatchNotes?: string;
  installationNotes?: string;
  returnNotes?: string;
}

interface SparePartOrder {
  id: number;
  partName: string;
  partNumber: string;
  quantity: number;
  status: string;
  urgency: string;
  description: string;
  orderDate: string;
  supplierName: string;
}

const statusColors = {
  received: 'bg-blue-100 text-blue-800',
  allocated: 'bg-yellow-100 text-yellow-800',
  dispatched: 'bg-orange-100 text-orange-800',
  installed: 'bg-green-100 text-green-800',
  returned: 'bg-gray-100 text-gray-800'
};

const statusLabels = {
  received: 'Primljen',
  allocated: 'Dodeljen',
  dispatched: 'Otpremljen',
  installed: 'Ugrađen',
  returned: 'Vraćen'
};

export function PartsInventoryManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SparePartOrder | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<PartsInventoryItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending orders
  const { data: pendingOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/admin/spare-parts/pending'],
    queryFn: () => apiRequest('/api/admin/spare-parts/pending') as Promise<SparePartOrder[]>
  });

  // Fetch all inventory
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['/api/admin/parts-inventory'],
    queryFn: () => apiRequest('/api/admin/parts-inventory') as Promise<PartsInventoryItem[]>
  });

  // Receive parts mutation
  const receiveParts = useMutation({
    mutationFn: async (data: { orderId: number; receiveData: any }) => {
      return apiRequest(`/api/admin/parts-inventory/receive/${data.orderId}`, {
        method: 'POST',
        body: JSON.stringify(data.receiveData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/parts-inventory'] });
      toast({
        title: "Uspešno primljen deo",
        description: "Deo je uspešno primljen u magacin"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri primanju dela",
        variant: "destructive"
      });
    }
  });

  // Allocate parts mutation  
  const allocateParts = useMutation({
    mutationFn: async (data: { inventoryId: number; serviceId: number; technicianId: number }) => {
      return apiRequest(`/api/admin/parts-inventory/${data.inventoryId}/allocate`, {
        method: 'POST',
        body: JSON.stringify({ serviceId: data.serviceId, technicianId: data.technicianId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/parts-inventory'] });
      toast({
        title: "Uspešno dodeljen deo",
        description: "Deo je uspešno dodeljen servisu"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri dodeli dela",
        variant: "destructive"
      });
    }
  });

  // Dispatch parts mutation
  const dispatchParts = useMutation({
    mutationFn: async (data: { inventoryId: number; dispatchNotes: string }) => {
      return apiRequest(`/api/admin/parts-inventory/${data.inventoryId}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({ dispatchNotes: data.dispatchNotes })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/parts-inventory'] });
      toast({
        title: "Uspešno otpremljen deo",
        description: "Deo je uspešno otpremljen serviseru"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri otpremanju dela",
        variant: "destructive"
      });
    }
  });

  const handleReceiveParts = (order: SparePartOrder) => {
    const receiveData = {
      actualCost: '15000.00',
      supplierInvoiceNumber: `INV-${order.id}-${Date.now()}`,
      warehouseLocation: 'Glavni magacin - Polica A',
      batchNumber: `BATCH-2025-${order.id}`,
      receivingNotes: `Primljen deo: ${order.partName}`
    };

    receiveParts.mutate({ orderId: order.id, receiveData });
  };

  const handleAllocateParts = (item: PartsInventoryItem) => {
    // Test allocation to service #1 and technician #1
    allocateParts.mutate({ 
      inventoryId: item.id, 
      serviceId: 1, 
      technicianId: 1 
    });
  };

  const handleDispatchParts = (item: PartsInventoryItem) => {
    dispatchParts.mutate({ 
      inventoryId: item.id, 
      dispatchNotes: `Deo otpremljen serviseru za servis #${item.allocatedToServiceId}` 
    });
  };

  // Filter inventory based on status
  const filteredInventory = inventory.filter(item => 
    !selectedStatus || item.status === selectedStatus
  );

  // Search functionality
  const searchedInventory = filteredInventory.filter(item =>
    item.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Upravljanje inventarom rezervnih delova</h2>
        <p className="text-muted-foreground">
          Profesionalni sistem za praćenje rezervnih delova kroz kompletan workflow: poručeno → stigao → dodeljen → otpremljen → ugrađen
        </p>
      </div>

      <Tabs defaultValue="workflow" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflow">Workflow Processing</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Overview</TabsTrigger>
          <TabsTrigger value="search">Pretraga i filteri</TabsTrigger>
          <TabsTrigger value="analytics">Analitika</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Orders - Ready for Receiving */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Porudžbine za prijem ({pendingOrders.length})
                </CardTitle>
                <CardDescription>
                  Poručeni delovi koji čekaju prijem u magacin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div>Učitavanje...</div>
                ) : pendingOrders.length === 0 ? (
                  <p className="text-muted-foreground">Nema porudžbina za prijem</p>
                ) : (
                  <div className="space-y-3">
                    {pendingOrders.map(order => (
                      <div key={order.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{order.partName}</h4>
                          <Badge variant="outline">{order.urgency}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          PN: {order.partNumber} | Qty: {order.quantity}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          {order.description}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleReceiveParts(order)}
                          disabled={receiveParts.isPending}
                          className="w-full"
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Primi u magacin
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Received Parts - Ready for Allocation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Primljeni delovi ({inventory.filter(i => i.status === 'received').length})
                </CardTitle>
                <CardDescription>
                  Delovi u magacinu spremni za dodeljivanje
                </CardDescription>
              </CardHeader>
              <CardContent>
                {inventoryLoading ? (
                  <div>Učitavanje...</div>
                ) : (
                  <div className="space-y-3">
                    {inventory.filter(i => i.status === 'received').map(item => (
                      <div key={item.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{item.partName}</h4>
                          <Badge className={statusColors[item.status]}>
                            {statusLabels[item.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Lokacija: {item.currentLocation}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleAllocateParts(item)}
                          disabled={allocateParts.isPending}
                          className="w-full"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Dodeli servisu
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Allocated Parts - Ready for Dispatch */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dodeljeni delovi ({inventory.filter(i => i.status === 'allocated').length})
                </CardTitle>
                <CardDescription>
                  Delovi dodeljeni servisima, spremni za otpremu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inventory.filter(i => i.status === 'allocated').map(item => (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{item.partName}</h4>
                        <Badge className={statusColors[item.status]}>
                          {statusLabels[item.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Servis: #{item.allocatedToServiceId} | Serviser: #{item.allocatedToTechnicianId}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => handleDispatchParts(item)}
                        disabled={dispatchParts.isPending}
                        className="w-full"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Otpremi serviseru
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dispatched & Installed Parts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Aktivni delovi ({inventory.filter(i => ['dispatched', 'installed'].includes(i.status)).length})
                </CardTitle>
                <CardDescription>
                  Otpremljeni i ugrađeni delovi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inventory.filter(i => ['dispatched', 'installed'].includes(i.status)).map(item => (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{item.partName}</h4>
                        <Badge className={statusColors[item.status]}>
                          {statusLabels[item.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.status === 'dispatched' 
                          ? `Otpremljen serviseru #${item.allocatedToTechnicianId}`
                          : `Ugrađen ${item.installedAt ? new Date(item.installedAt).toLocaleDateString('sr-RS') : ''}`
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kompletan inventar ({inventory.length} stavki)</CardTitle>
              <CardDescription>
                Pregled svih delova u inventory sistemu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventory.map(item => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium">{item.partName}</h4>
                      <Badge className={statusColors[item.status]}>
                        {statusLabels[item.status]}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>PN: {item.partNumber}</p>
                      <p>Qty: {item.quantity}</p>
                      <p>Lokacija: {item.currentLocation}</p>
                      <p>Cena: {item.actualCost} RSD</p>
                      {item.allocatedToServiceId && (
                        <p>Servis: #{item.allocatedToServiceId}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pretraga i filteri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Pretraži po nazivu ili broju dela..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedStatus === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus(null)}
                >
                  Svi statusi
                </Button>
                {Object.entries(statusLabels).map(([status, label]) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus(status)}
                  >
                    {label} ({inventory.filter(i => i.status === status).length})
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchedInventory.map(item => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium">{item.partName}</h4>
                      <Badge className={statusColors[item.status]}>
                        {statusLabels[item.status]}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>PN: {item.partNumber}</p>
                      <p>Lokacija: {item.currentLocation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ukupan inventar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventory.length}</div>
                <p className="text-xs text-muted-foreground">ukupno delova</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Čeka prijem</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingOrders.length}</div>
                <p className="text-xs text-muted-foreground">porudžbina</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">U magacinu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inventory.filter(i => i.status === 'received').length}
                </div>
                <p className="text-xs text-muted-foreground">dostupno za dodeljivanje</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ugrađeno</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inventory.filter(i => i.status === 'installed').length}
                </div>
                <p className="text-xs text-muted-foreground">završeno</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}