import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Package, Search, Bell, Edit, Trash2, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';

const urgencyLabels = {
  low: 'Niska',
  medium: 'Srednja',
  high: 'Visoka',
  urgent: 'Hitno'
};

const urgencyColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const statusLabels = {
  pending: 'Na čekanju',
  ordered: 'Poručeno',
  delivered: 'Dostavljeno',
  cancelled: 'Otkazano'
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  ordered: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export function SparePartsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: '',
    notes: ''
  });

  // Fetch all spare part orders
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['/api/admin/spare-parts'],
    queryFn: () => apiRequest('/api/admin/spare-parts'),
  });

  // Fetch pending orders count for notification
  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['/api/admin/spare-parts/pending'],
    queryFn: () => apiRequest('/api/admin/spare-parts/pending'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/admin/spare-parts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Uspešno',
        description: 'Porudžbina je ažurirana',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts/pending'] });
      setShowUpdateDialog(false);
      setSelectedOrder(null);
    },
    onError: (error) => {
      toast({
        title: 'Greška',
        description: 'Došlo je do greške prilikom ažuriranja porudžbine',
        variant: 'destructive',
      });
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/spare-parts/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Uspešno',
        description: 'Porudžbina je obrisana',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts/pending'] });
    },
    onError: (error) => {
      toast({
        title: 'Greška',
        description: 'Došlo je do greške prilikom brisanja porudžbine',
        variant: 'destructive',
      });
    },
  });

  // Filter orders based on search and filters
  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = order.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.technician?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' || order.urgency === urgencyFilter;
    
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const handleUpdateOrder = (order: any) => {
    setSelectedOrder(order);
    setUpdateData({
      status: order.status,
      notes: order.notes || ''
    });
    setShowUpdateDialog(true);
  };

  const handleSaveUpdate = () => {
    if (selectedOrder) {
      updateOrderMutation.mutate({
        id: selectedOrder.id,
        data: updateData
      });
    }
  };

  const handleDeleteOrder = (id: number) => {
    if (confirm('Da li ste sigurni da želite da obrišete ovu porudžbinu?')) {
      deleteOrderMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2">Učitavanje...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Greška pri učitavanju porudžbina rezervnih delova</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with notification */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Package className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Rezervni delovi</h2>
          {pendingOrders.length > 0 && (
            <Badge className="bg-red-100 text-red-800 animate-pulse">
              <Bell className="h-4 w-4 mr-1" />
              {pendingOrders.length} novih porudžbina
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filteri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Pretraga</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Naziv dela, broj, serviser..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi statusi</SelectItem>
                  <SelectItem value="pending">Na čekanju</SelectItem>
                  <SelectItem value="ordered">Poručeno</SelectItem>
                  <SelectItem value="delivered">Dostavljeno</SelectItem>
                  <SelectItem value="cancelled">Otkazano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="urgency">Hitnost</Label>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sve hitnosti</SelectItem>
                  <SelectItem value="low">Niska</SelectItem>
                  <SelectItem value="medium">Srednja</SelectItem>
                  <SelectItem value="high">Visoka</SelectItem>
                  <SelectItem value="urgent">Hitno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nema porudžbina koje odgovaraju filterima</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order: any) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-lg">{order.partName}</h3>
                      <Badge className={urgencyColors[order.urgency as keyof typeof urgencyColors]}>
                        {urgencyLabels[order.urgency as keyof typeof urgencyLabels]}
                      </Badge>
                      <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                        {statusLabels[order.status as keyof typeof statusLabels]}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      {order.partNumber && (
                        <p><strong>Broj dela:</strong> {order.partNumber}</p>
                      )}
                      <p><strong>Količina:</strong> {order.quantity}</p>
                      <p><strong>Serviser:</strong> {order.technician?.fullName || 'N/A'}</p>
                      <p><strong>Servis ID:</strong> #{order.serviceId}</p>
                      <p><strong>Datum porudžbine:</strong> {formatDate(order.createdAt)}</p>
                      {order.notes && (
                        <p><strong>Napomene:</strong> {order.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateOrder(order)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Ažuriraj
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteOrder(order.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Obriši
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ažuriraj porudžbinu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={updateData.status} 
                onValueChange={(value) => setUpdateData({...updateData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Na čekanju</SelectItem>
                  <SelectItem value="ordered">Poručeno</SelectItem>
                  <SelectItem value="delivered">Dostavljeno</SelectItem>
                  <SelectItem value="cancelled">Otkazano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="notes">Napomene</Label>
              <Textarea
                id="notes"
                placeholder="Dodatne napomene..."
                value={updateData.notes}
                onChange={(e) => setUpdateData({...updateData, notes: e.target.value})}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowUpdateDialog(false)}
              >
                Otkaži
              </Button>
              <Button 
                onClick={handleSaveUpdate}
                disabled={updateOrderMutation.isPending}
              >
                {updateOrderMutation.isPending ? 'Ažurira...' : 'Sačuvaj'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}