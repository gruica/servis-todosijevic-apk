import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Package2, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Eye, 
  Edit, 
  Send, 
  Download,
  Calendar,
  Building,
  Phone,
  Mail,
  ExternalLink,
  TrendingUp,
  FileText,
  Plus
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { procurementRequestSchema, type ProcurementRequest } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { z } from "zod";

interface SupplierOrder {
  id: number;
  supplierId: number;
  sparePartOrderId: number | null;
  orderNumber?: string;
  status: 'pending' | 'sent' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  sentAt?: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  trackingNumber?: string;
  totalCost?: number;
  currency: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  emailContent?: string;
  supplierResponse?: string;
  priority?: 'normal' | 'high' | 'urgent';
  requestDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Related data from joins
  supplier?: {
    id: number;
    name: string;
    companyName: string;
    email: string;
    phone?: string;
    integrationMethod: string;
    supportedBrands: string;
  };
  
  sparePartOrder?: {
    id: number;
    serviceId: number;
    partName: string;
    partNumber?: string;
    quantity: number;
    urgency: string;
    status: string;
  };
  
  service?: {
    id: number;
    serviceNumber: string;
    client?: {
      fullName: string;
      phone: string;
    };
  };
}

interface ProcurementStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalValue: number;
  averageDeliveryDays: number;
}

interface NewProcurementRequest {
  supplierId: number;
  partName: string;
  partNumber?: string;
  quantity: number;
  description?: string;
  urgency: 'normal' | 'high' | 'urgent';
  expectedDelivery?: string;
  notes?: string;
}

export default function AdminProcurementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Dialog states
  const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
  const [isOrderDetailsDialogOpen, setIsOrderDetailsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for new procurement request
  const newRequestForm = useForm<NewProcurementRequest>({
    resolver: zodResolver(procurementRequestSchema.extend({
      supplierId: z.number().int().positive("Molimo odaberite dobavljača"),
    })),
    defaultValues: {
      supplierId: 0,
      partName: "",
      partNumber: "",
      quantity: 1,
      description: "",
      urgency: "normal",
      expectedDelivery: "",
      notes: "",
    }
  });

  // Fetch supplier orders with comprehensive data
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<SupplierOrder[]>({
    queryKey: ['/api/admin/supplier-orders'],
  });

  // Fetch suppliers for dropdown
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/suppliers'],
  });

  // Fetch procurement statistics
  const { data: stats = {} as ProcurementStats } = useQuery<ProcurementStats>({
    queryKey: ['/api/admin/procurement/stats'],
  });

  // Create new procurement request mutation
  const createRequestMutation = useMutation({
    mutationFn: (data: NewProcurementRequest) => apiRequest('/api/admin/procurement/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/procurement/stats'] });
      setIsNewRequestDialogOpen(false);
      newRequestForm.reset();
      toast({
        title: "Uspeh",
        description: "Zahtev za nabavku je uspešno poslat dobavljaču",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Greška pri slanju zahteva za nabavku",
        variant: "destructive",
      });
    },
  });

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/admin/supplier-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/procurement/stats'] });
      toast({
        title: "Uspeh",
        description: "Status porudžbine je uspešno ažuriran",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Greška pri ažuriranju statusa porudžbine",
        variant: "destructive",
      });
    },
  });

  // Filter and sort orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = !searchTerm || 
      order.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sparePartOrder?.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sparePartOrder?.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSupplier = supplierFilter === "all" || order.supplierId.toString() === supplierFilter;
    const matchesUrgency = urgencyFilter === "all" || order.priority === urgencyFilter || order.sparePartOrder?.urgency === urgencyFilter;
    
    let matchesDateRange = true;
    if (dateRangeFilter !== "all") {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateRangeFilter) {
        case "today":
          matchesDateRange = daysDiff === 0;
          break;
        case "week":
          matchesDateRange = daysDiff <= 7;
          break;
        case "month":
          matchesDateRange = daysDiff <= 30;
          break;
        case "quarter":
          matchesDateRange = daysDiff <= 90;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesSupplier && matchesUrgency && matchesDateRange;
  }).sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case "createdAt":
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "urgency":
        const urgencyOrder = { urgent: 3, high: 2, normal: 1 };
        aValue = urgencyOrder[a.priority as keyof typeof urgencyOrder] || urgencyOrder[a.sparePartOrder?.urgency as keyof typeof urgencyOrder] || 0;
        bValue = urgencyOrder[b.priority as keyof typeof urgencyOrder] || urgencyOrder[b.sparePartOrder?.urgency as keyof typeof urgencyOrder] || 0;
        break;
      case "supplier":
        aValue = a.supplier?.name || "";
        bValue = b.supplier?.name || "";
        break;
      case "estimatedDelivery":
        aValue = a.estimatedDelivery ? new Date(a.estimatedDelivery).getTime() : 0;
        bValue = b.estimatedDelivery ? new Date(b.estimatedDelivery).getTime() : 0;
        break;
      default:
        aValue = a.createdAt;
        bValue = b.createdAt;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: { variant: "outline" as const, icon: Clock, color: "text-yellow-600" },
      sent: { variant: "secondary" as const, icon: Send, color: "text-blue-600" },
      confirmed: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      shipped: { variant: "default" as const, icon: Truck, color: "text-purple-600" },
      delivered: { variant: "default" as const, icon: Package2, color: "text-green-700" },
      cancelled: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
    };
    
    const style = styles[status as keyof typeof styles] || styles.pending;
    const Icon = style.icon;
    
    return (
      <Badge variant={style.variant} className="flex items-center gap-1" data-testid={`status-badge-${status}`}>
        <Icon className={`h-3 w-3 ${style.color}`} />
        {status === 'pending' && 'Na čekanju'}
        {status === 'sent' && 'Poslato'}
        {status === 'confirmed' && 'Potvrđeno'}
        {status === 'shipped' && 'Otpremljeno'}
        {status === 'delivered' && 'Isporučeno'}
        {status === 'cancelled' && 'Otkazano'}
      </Badge>
    );
  };

  // Get urgency badge styling
  const getUrgencyBadge = (urgency: string) => {
    const styles = {
      normal: { variant: "outline" as const, color: "text-gray-600" },
      high: { variant: "secondary" as const, color: "text-orange-600" },
      urgent: { variant: "destructive" as const, color: "text-red-600" },
    };
    
    const style = styles[urgency as keyof typeof styles] || styles.normal;
    
    return (
      <Badge variant={style.variant} className={style.color} data-testid={`urgency-badge-${urgency}`}>
        {urgency === 'normal' && 'Normalna'}
        {urgency === 'high' && 'Visoka'}
        {urgency === 'urgent' && 'Hitno'}
      </Badge>
    );
  };

  // Handle order status update
  const handleStatusUpdate = (orderId: number, newStatus: string) => {
    updateOrderMutation.mutate({
      id: orderId,
      data: { status: newStatus }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
              Upravljanje nabavkama
            </h1>
            <p className="text-gray-600 mt-2" data-testid="page-description">
              Pregled svih porudžbina dobavljača i zahteva za nabavku delova
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => refetchOrders()} 
              variant="outline" 
              className="flex items-center gap-2"
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
              Osveži
            </Button>
            <Button 
              onClick={() => setIsNewRequestDialogOpen(true)}
              className="flex items-center gap-2"
              data-testid="button-new-request"
            >
              <Plus className="h-4 w-4" />
              Novi zahtev
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card data-testid="stats-card-total">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ukupno porudžbina</CardTitle>
              <Package2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-orders">{stats.totalOrders || 0}</div>
            </CardContent>
          </Card>
          
          <Card data-testid="stats-card-pending">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Na čekanju</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-orders">{stats.pendingOrders || 0}</div>
            </CardContent>
          </Card>
          
          <Card data-testid="stats-card-shipped">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Otpremljeno</CardTitle>
              <Truck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600" data-testid="text-shipped-orders">{stats.shippedOrders || 0}</div>
            </CardContent>
          </Card>
          
          <Card data-testid="stats-card-delivered">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Isporučeno</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-delivered-orders">{stats.deliveredOrders || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card data-testid="filters-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filteri i pretraga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Pretraži delove, dobavljače..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi statusi</SelectItem>
                  <SelectItem value="pending">Na čekanju</SelectItem>
                  <SelectItem value="sent">Poslato</SelectItem>
                  <SelectItem value="confirmed">Potvrđeno</SelectItem>
                  <SelectItem value="shipped">Otpremljeno</SelectItem>
                  <SelectItem value="delivered">Isporučeno</SelectItem>
                  <SelectItem value="cancelled">Otkazano</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Supplier Filter */}
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger data-testid="select-supplier-filter">
                  <SelectValue placeholder="Dobavljač" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi dobavljači</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Urgency Filter */}
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger data-testid="select-urgency-filter">
                  <SelectValue placeholder="Hitnost" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sve hitnosti</SelectItem>
                  <SelectItem value="normal">Normalna</SelectItem>
                  <SelectItem value="high">Visoka</SelectItem>
                  <SelectItem value="urgent">Hitno</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Date Range Filter */}
              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger data-testid="select-date-filter">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi datumi</SelectItem>
                  <SelectItem value="today">Danas</SelectItem>
                  <SelectItem value="week">Ova nedelja</SelectItem>
                  <SelectItem value="month">Ovaj mesec</SelectItem>
                  <SelectItem value="quarter">Ovaj kvartal</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger data-testid="select-sort">
                  <SelectValue placeholder="Sortiraj po" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Datum kreiranja</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="urgency">Hitnost</SelectItem>
                  <SelectItem value="supplier">Dobavljač</SelectItem>
                  <SelectItem value="estimatedDelivery">Rok isporuke</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600" data-testid="text-results-count">
                Prikazano {filteredOrders.length} od {orders.length} porudžbina
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                data-testid="button-sort-order"
              >
                {sortOrder === 'asc' ? '↑ Uzlazno' : '↓ Silazno'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card data-testid="orders-table-card">
          <CardHeader>
            <CardTitle>Porudžbine dobavljača</CardTitle>
            <CardDescription>
              Pregled i upravljanje svim porudžbinama delova
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="flex justify-center items-center h-64" data-testid="loading-spinner">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <span className="ml-2">Učitavanje...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12" data-testid="no-orders-message">
                <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nema porudžbina</h3>
                <p className="text-gray-600">
                  {orders.length === 0 
                    ? "Još uvek nema kreiranih porudžbina." 
                    : "Nema porudžbina koje odgovaraju trenutnim filterima."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="orders-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Deo</TableHead>
                      <TableHead>Dobavljač</TableHead>
                      <TableHead>Količina</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hitnost</TableHead>
                      <TableHead>Kreirana</TableHead>
                      <TableHead>Rok isporuke</TableHead>
                      <TableHead>Akcije</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                        <TableCell className="font-mono" data-testid={`order-id-${order.id}`}>
                          #{order.id}
                        </TableCell>
                        <TableCell data-testid={`order-part-${order.id}`}>
                          <div>
                            <div className="font-medium">
                              {order.sparePartOrder?.partName || "N/A"}
                            </div>
                            {order.sparePartOrder?.partNumber && (
                              <div className="text-sm text-gray-500">
                                {order.sparePartOrder.partNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`order-supplier-${order.id}`}>
                          <div>
                            <div className="font-medium">
                              {order.supplier?.name || "N/A"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.supplier?.companyName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`order-quantity-${order.id}`}>
                          {order.sparePartOrder?.quantity || "N/A"}
                        </TableCell>
                        <TableCell data-testid={`order-status-${order.id}`}>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell data-testid={`order-urgency-${order.id}`}>
                          {getUrgencyBadge(order.priority || order.sparePartOrder?.urgency || 'normal')}
                        </TableCell>
                        <TableCell data-testid={`order-created-${order.id}`}>
                          <div className="text-sm">
                            {format(parseISO(order.createdAt), 'dd.MM.yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(parseISO(order.createdAt), 'HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`order-delivery-${order.id}`}>
                          {order.estimatedDelivery ? (
                            <div className="text-sm">
                              {format(parseISO(order.estimatedDelivery), 'dd.MM.yyyy')}
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell data-testid={`order-actions-${order.id}`}>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsOrderDetailsDialogOpen(true);
                              }}
                              data-testid={`button-view-details-${order.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {order.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusUpdate(order.id, 'sent')}
                                data-testid={`button-mark-sent-${order.id}`}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {order.status === 'sent' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                                data-testid={`button-mark-confirmed-${order.id}`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
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

        {/* New Procurement Request Dialog */}
        <Dialog open={isNewRequestDialogOpen} onOpenChange={setIsNewRequestDialogOpen}>
          <DialogContent className="max-w-2xl" data-testid="dialog-new-request">
            <DialogHeader>
              <DialogTitle>Novi zahtev za nabavku</DialogTitle>
              <DialogDescription>
                Pošaljite zahtev za nabavku delas direktno dobavljaču
              </DialogDescription>
            </DialogHeader>
            
            <Form {...newRequestForm}>
              <form onSubmit={newRequestForm.handleSubmit((data) => createRequestMutation.mutate(data))} className="space-y-4">
                
                <FormField
                  control={newRequestForm.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dobavljač *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger data-testid="select-new-request-supplier">
                            <SelectValue placeholder="Odaberite dobavljača" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.filter(s => s.isActive).map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id.toString()}>
                              {supplier.name} - {supplier.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={newRequestForm.control}
                    name="partName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naziv dela *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Unesite naziv dela" data-testid="input-part-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newRequestForm.control}
                    name="partNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Broj dela</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Opciono" data-testid="input-part-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={newRequestForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Količina *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="1" 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newRequestForm.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hitnost *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-urgency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="normal">Normalna</SelectItem>
                            <SelectItem value="high">Visoka</SelectItem>
                            <SelectItem value="urgent">Hitno</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={newRequestForm.control}
                  name="expectedDelivery"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Očekivani datum isporuke</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-expected-delivery" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newRequestForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opis</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Dodatne informacije o delu..." data-testid="textarea-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newRequestForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Napomene</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Interne napomene..." data-testid="textarea-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewRequestDialogOpen(false)}
                    data-testid="button-cancel-request"
                  >
                    Otkaži
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRequestMutation.isPending}
                    data-testid="button-submit-request"
                  >
                    {createRequestMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Šalje se...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Pošalji zahtev
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Order Details Dialog */}
        <Dialog open={isOrderDetailsDialogOpen} onOpenChange={setIsOrderDetailsDialogOpen}>
          <DialogContent className="max-w-4xl" data-testid="dialog-order-details">
            <DialogHeader>
              <DialogTitle>Detalji porudžbine #{selectedOrder?.id}</DialogTitle>
              <DialogDescription>
                Pregled kompletnih informacija o porudžbini
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                
                {/* Order Status and Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Status porudžbine</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {getStatusBadge(selectedOrder.status)}
                      {selectedOrder.trackingNumber && (
                        <div>
                          <Label className="text-sm font-medium">Broj za praćenje</Label>
                          <p className="text-sm font-mono" data-testid="text-tracking-number">{selectedOrder.trackingNumber}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Informacije o delu</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Naziv</Label>
                        <p className="text-sm" data-testid="text-part-name">{selectedOrder.sparePartOrder?.partName || "N/A"}</p>
                      </div>
                      {selectedOrder.sparePartOrder?.partNumber && (
                        <div>
                          <Label className="text-sm font-medium">Broj dela</Label>
                          <p className="text-sm font-mono" data-testid="text-part-number">{selectedOrder.sparePartOrder.partNumber}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium">Količina</Label>
                        <p className="text-sm" data-testid="text-part-quantity">{selectedOrder.sparePartOrder?.quantity || "N/A"}</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Dobavljač</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Naziv</Label>
                        <p className="text-sm" data-testid="text-supplier-name">{selectedOrder.supplier?.name || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Kompanija</Label>
                        <p className="text-sm" data-testid="text-supplier-company">{selectedOrder.supplier?.companyName || "N/A"}</p>
                      </div>
                      {selectedOrder.supplier?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a href={`mailto:${selectedOrder.supplier.email}`} className="text-sm text-blue-600 hover:underline" data-testid="link-supplier-email">
                            {selectedOrder.supplier.email}
                          </a>
                        </div>
                      )}
                      {selectedOrder.supplier?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a href={`tel:${selectedOrder.supplier.phone}`} className="text-sm text-blue-600 hover:underline" data-testid="link-supplier-phone">
                            {selectedOrder.supplier.phone}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Vremenska linija
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">Porudžbina kreirana</p>
                          <p className="text-xs text-gray-500" data-testid="text-created-at">
                            {format(parseISO(selectedOrder.createdAt), 'dd.MM.yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      
                      {selectedOrder.sentAt && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                          <Send className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium">Poslato dobavljaču</p>
                            <p className="text-xs text-gray-500" data-testid="text-sent-at">
                              {format(parseISO(selectedOrder.sentAt), 'dd.MM.yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {selectedOrder.confirmedAt && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium">Potvrđeno od dobavljača</p>
                            <p className="text-xs text-gray-500" data-testid="text-confirmed-at">
                              {format(parseISO(selectedOrder.confirmedAt), 'dd.MM.yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {selectedOrder.shippedAt && (
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                          <Truck className="h-4 w-4 text-purple-600" />
                          <div>
                            <p className="text-sm font-medium">Otpremljeno</p>
                            <p className="text-xs text-gray-500" data-testid="text-shipped-at">
                              {format(parseISO(selectedOrder.shippedAt), 'dd.MM.yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {selectedOrder.deliveredAt && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <Package2 className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium">Isporučeno</p>
                            <p className="text-xs text-gray-500" data-testid="text-delivered-at">
                              {format(parseISO(selectedOrder.deliveredAt), 'dd.MM.yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Additional Information */}
                {(selectedOrder.notes || selectedOrder.emailContent || selectedOrder.supplierResponse) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Dodatne informacije
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedOrder.notes && (
                        <div>
                          <Label className="text-sm font-medium">Napomene</Label>
                          <p className="text-sm mt-1 p-3 bg-gray-50 rounded-lg" data-testid="text-order-notes">{selectedOrder.notes}</p>
                        </div>
                      )}
                      
                      {selectedOrder.emailContent && (
                        <div>
                          <Label className="text-sm font-medium">Sadržaj emaila</Label>
                          <p className="text-sm mt-1 p-3 bg-blue-50 rounded-lg" data-testid="text-email-content">{selectedOrder.emailContent}</p>
                        </div>
                      )}
                      
                      {selectedOrder.supplierResponse && (
                        <div>
                          <Label className="text-sm font-medium">Odgovor dobavljača</Label>
                          <p className="text-sm mt-1 p-3 bg-green-50 rounded-lg" data-testid="text-supplier-response">{selectedOrder.supplierResponse}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsOrderDetailsDialogOpen(false)}
                data-testid="button-close-details"
              >
                Zatvori
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}