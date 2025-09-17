import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building2, Package, Users, TrendingUp, Filter, Search, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Truck, Eye, MessageSquare, RefreshCw, FileText, BarChart } from "lucide-react";
import { useState, useMemo } from "react";
import type { SupplierOrder, SupplierOrderEvent } from "@shared/schema";

// Types for API responses
type SupplierOrderWithDetails = SupplierOrder & {
  sparePartOrder?: {
    id: number;
    partName: string;
    partNumber?: string;
    quantity: number;
    description?: string;
    urgency: string;
    serviceId?: number;
  };
  supplier?: {
    name: string;
    companyName: string;
  };
};

type DashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  urgentOrders: number;
  recentActivity: {
    id: number;
    description: string;
    timestamp: string;
  }[];
};

// Status mapping for display
const statusLabels: Record<string, string> = {
  pending: "Na čekanju",
  sent: "Poslano",
  confirmed: "Potvrđeno",
  shipped: "Poslano",
  delivered: "Isporučeno",
  cancelled: "Otkazano"
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

const urgencyColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  normal: "bg-gray-100 text-gray-800"
};

export default function SupplierDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  
  // State for filters and UI
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [newEventText, setNewEventText] = useState("");
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Data fetching
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['/api/suppliers/orders', statusFilter],
    enabled: !!user?.supplierId
  });

  const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/suppliers/dashboard'],
    enabled: !!user?.supplierId
  });

  const { data: orderEvents = [], isLoading: eventsLoading } = useQuery<SupplierOrderEvent[]>({
    queryKey: [`/api/suppliers/orders/${selectedOrderId}/events`],
    enabled: !!selectedOrderId
  });

  // Mutations
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: number; data: any }) => {
      return await apiRequest(`/api/suppliers/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers/dashboard'] });
      toast({ title: "Uspešno", description: "Porudžbina je ažurirana" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Greška", 
        description: error.message || "Greška pri ažuriranju porudžbine",
        variant: "destructive"
      });
    }
  });

  const addEventMutation = useMutation({
    mutationFn: async ({ orderId, event }: { orderId: number; event: { eventDescription: string; eventNotes?: string } }) => {
      return await apiRequest(`/api/suppliers/orders/${orderId}/events`, {
        method: 'POST',
        body: JSON.stringify({
          eventType: 'communication',
          eventDescription: event.eventDescription,
          eventNotes: event.eventNotes
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/suppliers/orders/${selectedOrderId}/events`] });
      setNewEventText("");
      setIsAddingEvent(false);
      toast({ title: "Uspešno", description: "Komentar je dodat" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Greška", 
        description: error.message || "Greška pri dodavanju komentara",
        variant: "destructive"
      });
    }
  });

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let filtered = orders as SupplierOrderWithDetails[];
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(order => 
        order.id.toString().includes(searchTerm) ||
        order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.sparePartOrder?.partName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [orders, statusFilter, searchTerm]);

  // Helper functions
  const handleStatusUpdate = (orderId: number, status: string) => {
    updateOrderMutation.mutate({ 
      orderId, 
      data: { status }
    });
  };

  const handleAddEvent = () => {
    if (!selectedOrderId || !newEventText.trim()) return;
    
    addEventMutation.mutate({
      orderId: selectedOrderId,
      event: {
        eventDescription: newEventText.trim()
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'sent': return <MessageSquare className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const canUpdateStatus = (currentStatus: string, newStatus: string): boolean => {
    const statusFlow: Record<string, string[]> = {
      'pending': ['sent', 'confirmed', 'cancelled'],
      'sent': ['confirmed', 'cancelled'],
      'confirmed': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [],
      'cancelled': []
    };
    return statusFlow[currentStatus]?.includes(newStatus) || false;
  };

  if (!user || (user.role !== "supplier_complus" && user.role !== "supplier_beko")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Nemate dozvolu</CardTitle>
            <CardDescription>
              Nemate dozvolu za pristup ovoj stranici.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/suppliers/login"}>
              Prijavite se
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Greška</CardTitle>
            <CardDescription>
              Greška pri učitavanju podataka. Molimo pokušajte ponovo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => queryClient.invalidateQueries()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Pokušaj ponovo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supplierType = user.role === "supplier_complus" ? "ComPlus" : "Beko";
  const supplierColor = user.role === "supplier_complus" ? "blue" : "green";

  // Statistics with fallback values
  const stats = dashboardStats || {
    totalOrders: filteredOrders.length,
    pendingOrders: filteredOrders.filter(o => o.status === 'pending').length,
    inProgressOrders: filteredOrders.filter(o => ['sent', 'confirmed', 'shipped'].includes(o.status)).length,
    completedOrders: filteredOrders.filter(o => o.status === 'delivered').length,
    urgentOrders: filteredOrders.filter(o => o.sparePartOrder?.urgency === 'urgent').length,
    recentActivity: []
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {supplierType} Portal
                </h1>
                <p className="text-sm text-gray-600">Dobradošli, {user.fullName}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              {logoutMutation.isPending ? "Odjavljivanje..." : "Odjavi se"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {supplierType} Supplier Dashboard
          </h2>
          <p className="text-gray-600">
            Upravljajte vašim inventarom i pratite narudžbine
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ukupno porudžbina
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? '...' : stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                Sve porudžbine
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Na čekanju
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{statsLoading ? '...' : stats.pendingOrders}</div>
              <p className="text-xs text-muted-foreground">
                Zahtevaju akciju
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                U toku
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statsLoading ? '...' : stats.inProgressOrders}</div>
              <p className="text-xs text-muted-foreground">
                Aktivne porudžbine
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Završene
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statsLoading ? '...' : stats.completedOrders}</div>
              <p className="text-xs text-muted-foreground">
                Isporučene porudžbine
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Hitne
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{statsLoading ? '...' : stats.urgentOrders}</div>
              <p className="text-xs text-muted-foreground">
                Visoka prioriteta
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart className="h-4 w-4 mr-2" />
              Pregled
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <Package className="h-4 w-4 mr-2" />
              Porudžbine
            </TabsTrigger>
            <TabsTrigger value="account" data-testid="tab-account">
              <Users className="h-4 w-4 mr-2" />
              Nalog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Poslednja aktivnost</CardTitle>
                  <CardDescription>
                    Nedavne izmene na porudžbinama
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ) : stats.recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {stats.recentActivity.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                          <div className="flex-1">
                            <p className="text-sm">{activity.description}</p>
                            <p className="text-xs text-gray-500">{activity.timestamp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nema nedavnih aktivnosti</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Brze akcije</CardTitle>
                  <CardDescription>
                    Najčešće korišćene funkcije
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab("orders")}
                    data-testid="button-view-orders"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Pregled porudžbina
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setStatusFilter("pending")}
                    data-testid="button-pending-orders"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Porudžbine na čekanju
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => {
                      setStatusFilter("all");
                      setSearchTerm("");
                      setActiveTab("orders");
                    }}
                    data-testid="button-all-orders"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Sve porudžbine
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="orders" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pretraživanje i filteri</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setStatusFilter("all");
                      setSearchTerm("");
                    }}
                    data-testid="button-clear-filters"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Obriši filtere
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Pretraživanje</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="ID porudžbine, broj praćenja..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-orders"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger data-testid="select-status-filter">
                        <SelectValue placeholder="Izaberite status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Svi statusi</SelectItem>
                        <SelectItem value="pending">Na čekanju</SelectItem>
                        <SelectItem value="sent">Poslano</SelectItem>
                        <SelectItem value="confirmed">Potvrđeno</SelectItem>
                        <SelectItem value="shipped">Otpremljeno</SelectItem>
                        <SelectItem value="delivered">Isporučeno</SelectItem>
                        <SelectItem value="cancelled">Otkazano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Ukupno rezultata</Label>
                    <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-gray-50">
                      <span className="text-sm font-medium">{filteredOrders.length} porudžbina</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
              <CardHeader>
                <CardTitle>Porudžbine</CardTitle>
                <CardDescription>
                  Lista svih porudžbina rezervnih delova
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nema porudžbina</h3>
                    <p className="text-gray-500">Trenutno nema porudžbina koje odgovaraju filterima.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Deo</TableHead>
                          <TableHead>Količina</TableHead>
                          <TableHead>Prioritet</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Datum kreiranja</TableHead>
                          <TableHead>Akcije</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                            <TableCell className="font-mono">{order.id}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{order.sparePartOrder?.partName || 'N/A'}</div>
                                {order.sparePartOrder?.partNumber && (
                                  <div className="text-sm text-gray-500">{order.sparePartOrder.partNumber}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{order.sparePartOrder?.quantity || 1}</TableCell>
                            <TableCell>
                              <Badge className={urgencyColors[order.sparePartOrder?.urgency || 'normal']}>
                                {order.sparePartOrder?.urgency === 'urgent' ? 'Hitno' : 
                                 order.sparePartOrder?.urgency === 'high' ? 'Visoko' : 'Normalno'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[order.status]}>
                                {getStatusIcon(order.status)}
                                <span className="ml-1">{statusLabels[order.status]}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString('sr-RS') : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setSelectedOrderId(order.id)}
                                      data-testid={`button-view-order-${order.id}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl">
                                    <DialogHeader>
                                      <DialogTitle>Detalji porudžbine #{order.id}</DialogTitle>
                                      <DialogDescription>
                                        Kompletan pregled porudžbine i event istorije
                                      </DialogDescription>
                                    </DialogHeader>
                                    
                                    {/* Order Details */}
                                    <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-4">
                                        <div>
                                          <Label className="font-medium">Osnovno informacije</Label>
                                          <div className="mt-2 space-y-2">
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">ID porudžbine:</span>
                                              <span className="text-sm font-mono">{order.id}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Status:</span>
                                              <Badge className={statusColors[order.status]}>
                                                {statusLabels[order.status]}
                                              </Badge>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Broj porudžbine:</span>
                                              <span className="text-sm">{order.orderNumber || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Broj praćenja:</span>
                                              <span className="text-sm">{order.trackingNumber || 'N/A'}</span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <Label className="font-medium">Informacije o delu</Label>
                                          <div className="mt-2 space-y-2">
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Naziv:</span>
                                              <span className="text-sm font-medium">{order.sparePartOrder?.partName || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Kataloški broj:</span>
                                              <span className="text-sm">{order.sparePartOrder?.partNumber || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Količina:</span>
                                              <span className="text-sm">{order.sparePartOrder?.quantity || 1}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Prioritet:</span>
                                              <Badge className={urgencyColors[order.sparePartOrder?.urgency || 'normal']}>
                                                {order.sparePartOrder?.urgency === 'urgent' ? 'Hitno' : 
                                                 order.sparePartOrder?.urgency === 'high' ? 'Visoko' : 'Normalno'}
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Quick Status Updates */}
                                        <div>
                                          <Label className="font-medium">Brze akcije</Label>
                                          <div className="mt-2 grid grid-cols-2 gap-2">
                                            {order.status === 'pending' && (
                                              <Button 
                                                size="sm" 
                                                onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                                                disabled={updateOrderMutation.isPending}
                                                data-testid={`button-confirm-order-${order.id}`}
                                              >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Potvrdi
                                              </Button>
                                            )}
                                            {order.status === 'confirmed' && (
                                              <Button 
                                                size="sm" 
                                                onClick={() => handleStatusUpdate(order.id, 'shipped')}
                                                disabled={updateOrderMutation.isPending}
                                                data-testid={`button-ship-order-${order.id}`}
                                              >
                                                <Truck className="h-4 w-4 mr-1" />
                                                Otpremi
                                              </Button>
                                            )}
                                            {order.status === 'shipped' && (
                                              <Button 
                                                size="sm" 
                                                onClick={() => handleStatusUpdate(order.id, 'delivered')}
                                                disabled={updateOrderMutation.isPending}
                                                data-testid={`button-deliver-order-${order.id}`}
                                              >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Dostavi
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Event Timeline */}
                                      <div className="space-y-4">
                                        <div>
                                          <Label className="font-medium">Istorija eventi</Label>
                                          <div className="mt-2 max-h-60 overflow-y-auto space-y-3">
                                            {eventsLoading ? (
                                              <div className="space-y-2">
                                                {[...Array(3)].map((_, i) => (
                                                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                                                ))}
                                              </div>
                                            ) : orderEvents.length > 0 ? (
                                              orderEvents.map((event) => (
                                                <div key={event.id} className="border-l-2 border-blue-200 pl-4 pb-3">
                                                  <div className="font-medium text-sm">{event.eventDescription}</div>
                                                  <div className="text-xs text-gray-500">
                                                    {event.performedByName} • {new Date(event.createdAt).toLocaleString('sr-RS')}
                                                  </div>
                                                  {event.eventNotes && (
                                                    <div className="text-sm text-gray-600 mt-1">{event.eventNotes}</div>
                                                  )}
                                                </div>
                                              ))
                                            ) : (
                                              <p className="text-sm text-gray-500">Nema zabeleženih eventi</p>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Add Event */}
                                        <div>
                                          <Label className="font-medium">Dodaj komentar</Label>
                                          <div className="mt-2 space-y-2">
                                            <Textarea
                                              placeholder="Dodajte komentar ili napomenu..."
                                              value={newEventText}
                                              onChange={(e) => setNewEventText(e.target.value)}
                                              className="min-h-[80px]"
                                              data-testid={`textarea-add-event-${order.id}`}
                                            />
                                            <Button 
                                              size="sm" 
                                              onClick={handleAddEvent}
                                              disabled={!newEventText.trim() || addEventMutation.isPending}
                                              data-testid={`button-add-event-${order.id}`}
                                            >
                                              <MessageSquare className="h-4 w-4 mr-1" />
                                              {addEventMutation.isPending ? 'Dodajem...' : 'Dodaj komentar'}
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informacije o nalogu</CardTitle>
                <CardDescription>
                  Vaši podaci i kontakt informacije
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Tip dobavljača:</span>
                      <Badge className={supplierType === 'ComPlus' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                        {supplierType}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Email:</span>
                      <span className="text-sm text-gray-600">{user.email || user.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Korisničko ime:</span>
                      <span className="text-sm text-gray-600">{user.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Ime i prezime:</span>
                      <span className="text-sm text-gray-600">{user.fullName}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Kompanija:</span>
                      <span className="text-sm text-gray-600">{user.companyName || supplierType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Status naloga:</span>
                      <Badge className="bg-green-100 text-green-800">
                        Aktivan
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">ID dobavljača:</span>
                      <span className="text-sm text-gray-600">{user.supplierId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Datum registracije:</span>
                      <span className="text-sm text-gray-600">
                        {user.registeredAt ? new Date(user.registeredAt).toLocaleDateString('sr-RS') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}