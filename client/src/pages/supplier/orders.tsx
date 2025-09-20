import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ArrowLeft, Package, Clock, CheckCircle, Truck, User, Phone, Calendar, FileText, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Interface za supplier porudžbine
interface SupplierOrder {
  id: number;
  partName: string;
  partNumber?: string;
  quantity: number;
  status: string;
  requestedDate: string;
  clientName?: string;
  clientPhone?: string;
  serviceId?: number;
  businessPartnerName?: string;
  priority?: string;
  notes?: string;
  supplierNotes?: string;
  estimatedDelivery?: string;
}

// Funkcija za prevod statusa
function translateOrderStatus(status: string) {
  const statusMap: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
    'pending': { text: 'Na čekanju', variant: 'outline', color: 'text-orange-600 bg-orange-50' },
    'confirmed': { text: 'Potvrđeno', variant: 'default', color: 'text-blue-600 bg-blue-50' },
    'shipped': { text: 'Poslano', variant: 'secondary', color: 'text-purple-600 bg-purple-50' },
    'delivered': { text: 'Isporučeno', variant: 'default', color: 'text-green-600 bg-green-50' },
    'cancelled': { text: 'Otkazano', variant: 'destructive', color: 'text-red-600 bg-red-50' }
  };
  return statusMap[status] || { text: status, variant: 'outline' as const, color: 'text-gray-600 bg-gray-50' };
}

export default function SupplierOrders() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [supplierNotes, setSupplierNotes] = useState<string>("");
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>("");
  
  // Dohvatanje supplier porudžbina
  const { data: orders = [], isLoading } = useQuery<SupplierOrder[]>({
    queryKey: ["/api/supplier/orders"],
    queryFn: async () => {
      const response = await fetch("/api/supplier/orders", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch supplier orders");
      }
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 sekundi cache
    refetchOnWindowFocus: false,
  });

  // Mutation za ažuriranje status porudžbine
  const updateOrderMutation = useMutation({
    mutationFn: async (data: { orderId: number; status: string; supplierNotes?: string; estimatedDelivery?: string }) => {
      return apiRequest(`/api/supplier/order/${data.orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: data.status,
          supplierNotes: data.supplierNotes,
          estimatedDelivery: data.estimatedDelivery
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/orders"] });
      toast({
        title: "Uspješno ažuriranje",
        description: "Status porudžbine je ažuriran.",
      });
      setSelectedOrder(null);
      setNewStatus("");
      setSupplierNotes("");
      setEstimatedDelivery("");
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće ažurirati status porudžbine.",
        variant: "destructive",
      });
    },
  });

  const handleOrderSelect = (order: SupplierOrder) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setSupplierNotes(order.supplierNotes || "");
    setEstimatedDelivery(order.estimatedDelivery || "");
  };

  const handleUpdateOrder = () => {
    if (selectedOrder && newStatus) {
      updateOrderMutation.mutate({
        orderId: selectedOrder.id,
        status: newStatus,
        supplierNotes: supplierNotes,
        estimatedDelivery: estimatedDelivery
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Učitavanje porudžbina...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/supplier")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Nazad na dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="h-6 w-6 text-orange-600" />
                  Porudžbine rezervnih delova
                </h1>
                <p className="text-sm text-gray-500">
                  Upravljajte vašim porudžbinama
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Lista porudžbina</CardTitle>
                <CardDescription>
                  Kliknite na porudžbinu da biste videli detalje ili ažurirali status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Nema porudžbina
                    </h3>
                    <p className="text-gray-500">
                      Trenutno nemate dodeljenih porudžbina.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const statusInfo = translateOrderStatus(order.status);
                      const isSelected = selectedOrder?.id === order.id;
                      
                      return (
                        <div 
                          key={order.id} 
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => handleOrderSelect(order)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900">
                              {order.partName}
                            </h3>
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.text}
                            </Badge>
                          </div>
                          
                          {order.partNumber && (
                            <p className="text-sm text-gray-600 mb-1">
                              Šifra: {order.partNumber}
                            </p>
                          )}
                          
                          <div className="flex items-center text-sm text-gray-500 space-x-4">
                            <span>Količina: {order.quantity}</span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(order.requestedDate).toLocaleDateString('sr-RS')}
                            </span>
                          </div>
                          
                          {order.businessPartnerName && (
                            <p className="text-sm text-gray-600 mt-1 flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {order.businessPartnerName}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Details & Update */}
          <div className="lg:col-span-1">
            {selectedOrder ? (
              <Card>
                <CardHeader>
                  <CardTitle>Detalji porudžbine</CardTitle>
                  <CardDescription>
                    Porudžbina #{selectedOrder.id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">{selectedOrder.partName}</h4>
                    {selectedOrder.partNumber && (
                      <p className="text-sm text-gray-600">Šifra: {selectedOrder.partNumber}</p>
                    )}
                    <p className="text-sm text-gray-600">Količina: {selectedOrder.quantity}</p>
                  </div>

                  {selectedOrder.clientName && (
                    <div>
                      <h5 className="font-medium text-gray-700 flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Klijent
                      </h5>
                      <p className="text-sm text-gray-600">{selectedOrder.clientName}</p>
                      {selectedOrder.clientPhone && (
                        <p className="text-sm text-gray-600 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {selectedOrder.clientPhone}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedOrder.notes && (
                    <div>
                      <h5 className="font-medium text-gray-700 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Napomene
                      </h5>
                      <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status porudžbine
                      </label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberite status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Na čekanju</SelectItem>
                          <SelectItem value="confirmed">Potvrđeno</SelectItem>
                          <SelectItem value="shipped">Poslano</SelectItem>
                          <SelectItem value="delivered">Isporučeno</SelectItem>
                          <SelectItem value="cancelled">Otkazano</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Procenjeni datum isporuke
                      </label>
                      <input
                        type="date"
                        value={estimatedDelivery}
                        onChange={(e) => setEstimatedDelivery(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Napomene dobavljača
                      </label>
                      <Textarea
                        value={supplierNotes}
                        onChange={(e) => setSupplierNotes(e.target.value)}
                        placeholder="Dodajte napomene o porudžbini..."
                        rows={3}
                      />
                    </div>

                    <Button 
                      onClick={handleUpdateOrder}
                      disabled={updateOrderMutation.isPending || !newStatus}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      {updateOrderMutation.isPending ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2">⏳</span> Ažuriranje...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Save className="mr-2 h-4 w-4" /> Sačuvaj promene
                        </span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Izaberite porudžbinu
                    </h3>
                    <p className="text-gray-500">
                      Kliknite na porudžbinu sa leve strane da vidite detalje i ažurirate status.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}