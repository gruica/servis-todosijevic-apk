import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Truck, Package, Clock, CheckCircle, AlertCircle, User, Eye, LogOut } from "lucide-react";

// Interface za supplier porudžbine
interface SupplierOrder {
  id: number;
  partName: string;
  partNumber?: string;
  quantity: number;
  status: string;
  requestedDate: string;
  clientName?: string;
  serviceId?: number;
  businessPartnerName?: string;
  priority?: string;
  notes?: string;
}

// Funkcija za prevod statusa
function translateOrderStatus(status: string) {
  const statusMap: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    'pending': { text: 'Na čekanju', variant: 'outline' },
    'confirmed': { text: 'Potvrđeno', variant: 'default' },
    'shipped': { text: 'Poslano', variant: 'secondary' },
    'delivered': { text: 'Isporučeno', variant: 'default' },
    'cancelled': { text: 'Otkazano', variant: 'destructive' }
  };
  return statusMap[status] || { text: status, variant: 'outline' as const };
}

export default function SupplierDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
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

  // Statistike
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const confirmedOrders = orders.filter(order => order.status === 'confirmed').length;
  const shippedOrders = orders.filter(order => order.status === 'shipped').length;
  const deliveredOrders = orders.filter(order => order.status === 'delivered').length;

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
              <div className="flex items-center space-x-2">
                <Truck className="h-8 w-8 text-orange-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Dobavljač Portal
                  </h1>
                  <p className="text-sm text-gray-500">
                    Dobrodošli, {user?.fullName}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate("/supplier/orders")}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Package className="h-4 w-4 mr-2" />
                Sve porudžbine
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  logoutMutation.mutate(undefined, {
                    onSuccess: () => {
                      toast({
                        title: "Odjava uspješna",
                        description: "Uspješno ste se odjavili.",
                      });
                      navigate("/supplier-auth");
                    },
                    onError: (error: Error) => {
                      toast({
                        title: "Greška pri odjavi",
                        description: error.message,
                        variant: "destructive",
                      });
                    },
                  });
                }}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? (
                  <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></div>
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Odjavi se
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ukupno porudžbina</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Na čekanju</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{pendingOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Potvrđeno</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{confirmedOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Poslano</CardTitle>
                <Truck className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{shippedOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Isporučeno</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{deliveredOrders}</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Najnovije porudžbine
              </CardTitle>
              <CardDescription>
                Pregled najnovijih porudžbina koje zahtevaju vašu pažnju
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
                  {orders.slice(0, 5).map((order) => {
                    const statusInfo = translateOrderStatus(order.status);
                    return (
                      <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {order.partName}
                            </p>
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.text}
                            </Badge>
                          </div>
                          {order.partNumber && (
                            <p className="text-sm text-gray-500">
                              Šifra: {order.partNumber}
                            </p>
                          )}
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <span>Količina: {order.quantity}</span>
                            {order.businessPartnerName && (
                              <>
                                <span className="mx-2">•</span>
                                <User className="h-3 w-3 mr-1" />
                                <span>{order.businessPartnerName}</span>
                              </>
                            )}
                            <span className="mx-2">•</span>
                            <span>{new Date(order.requestedDate).toLocaleDateString('sr-RS')}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/supplier/orders")}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Detaljno
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {orders.length > 5 && (
                    <div className="text-center pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => navigate("/supplier/orders")}
                      >
                        Prikaži sve porudžbine ({orders.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}