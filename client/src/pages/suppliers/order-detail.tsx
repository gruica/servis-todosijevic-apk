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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { 
  ArrowLeft, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Truck, 
  MessageSquare, 
  RefreshCw, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  User,
  FileText,
  Plus,
  Send,
  Eye,
  Edit,
  Copy,
  ExternalLink,
  Building2,
  Hash,
  DollarSign,
  Flag
} from "lucide-react";
import { useState, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";
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
    applianceModel?: string;
    applianceManufacturer?: string;
    clientName?: string;
    clientPhone?: string;
    address?: string;
  };
  supplier?: {
    id: number;
    name: string;
    companyName: string;
    email: string;
    phone: string;
    partnerType: string;
  };
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
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  sent: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200"
};

const urgencyColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  normal: "bg-gray-100 text-gray-800 border-gray-200",
  low: "bg-green-100 text-green-800 border-green-200"
};

const eventTypeLabels: Record<string, string> = {
  status_change: "Promena statusa",
  note_added: "Dodana napomena",
  update: "Ažuriranje",
  communication: "Komunikacija",
  delivery_update: "Ažuriranje dostave"
};

const eventTypeIcons: Record<string, React.ReactNode> = {
  status_change: <RefreshCw className="h-4 w-4" />,
  note_added: <FileText className="h-4 w-4" />,
  update: <Edit className="h-4 w-4" />,
  communication: <MessageSquare className="h-4 w-4" />,
  delivery_update: <Truck className="h-4 w-4" />
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

export default function SupplierOrderDetail() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const [, navigate] = useLocation();
  
  const orderId = params.id ? parseInt(params.id) : null;
  
  // State for new events and UI
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventType, setNewEventType] = useState<string>("communication");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventNotes, setNewEventNotes] = useState("");
  const [newEventPriority, setNewEventPriority] = useState<string>("normal");

  // Data fetching
  const { data: order, isLoading: orderLoading, error: orderError } = useQuery<SupplierOrderWithDetails>({
    queryKey: [`/api/suppliers/orders/${orderId}`],
    enabled: !!orderId && !!user?.supplierId
  });

  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery<SupplierOrderEvent[]>({
    queryKey: [`/api/suppliers/orders/${orderId}/events`],
    enabled: !!orderId
  });

  // Mutations
  const updateOrderMutation = useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      return await apiRequest(`/api/suppliers/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/suppliers/orders/${orderId}`] });
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
    mutationFn: async ({ event }: { event: any }) => {
      return await apiRequest(`/api/suppliers/orders/${orderId}/events`, {
        method: 'POST',
        body: JSON.stringify(event)
      });
    },
    onSuccess: () => {
      refetchEvents();
      setNewEventDescription("");
      setNewEventNotes("");
      setNewEventType("communication");
      setNewEventPriority("normal");
      setIsAddingEvent(false);
      toast({ title: "Uspešno", description: "Događaj je uspešno dodat" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Greška", 
        description: error.message || "Greška pri dodavanju događaja",
        variant: "destructive"
      });
    }
  });

  // Helper functions
  const handleStatusUpdate = (status: string) => {
    updateOrderMutation.mutate({ 
      data: { status }
    });
  };

  const handleAddEvent = () => {
    if (!newEventDescription.trim()) return;
    
    addEventMutation.mutate({
      event: {
        eventType: newEventType,
        eventDescription: newEventDescription.trim(),
        eventNotes: newEventNotes.trim() || undefined,
        priority: newEventPriority
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return format(date, 'dd.MM.yyyy HH:mm', { locale: sr });
    } catch {
      return dateStr;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true, locale: sr });
    } catch {
      return dateStr;
    }
  };

  // Authorization check
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
            <Button onClick={() => navigate("/suppliers/login")} data-testid="button-login">
              Prijavite se
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (orderLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-96 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (orderError || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Greška</CardTitle>
            <CardDescription>
              Porudžbina nije pronađena ili imate greška pri učitavanju.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate("/suppliers/dashboard")} variant="outline" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad na pregled
            </Button>
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
  const availableStatuses = order.status === 'pending' ? ['sent', 'confirmed', 'cancelled'] :
                          order.status === 'sent' ? ['confirmed', 'cancelled'] :
                          order.status === 'confirmed' ? ['shipped', 'cancelled'] :
                          order.status === 'shipped' ? ['delivered'] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost" 
                onClick={() => navigate("/suppliers/dashboard")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Nazad
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center">
                <Building2 className="h-6 w-6 text-primary mr-2" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {supplierType} Portal - Detalji porudžbine
                  </h1>
                  <nav className="text-sm text-gray-600">
                    <span>Dashboard</span> 
                    <span className="mx-2">›</span> 
                    <span>Porudžbine</span>
                    <span className="mx-2">›</span> 
                    <span className="text-gray-900">#{order.id}</span>
                  </nav>
                </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Order Overview */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">Porudžbina #{order.id}</CardTitle>
                    <CardDescription className="mt-1">
                      {order.orderNumber && (
                        <>Broj: {order.orderNumber} • </>
                      )}
                      Kreirana {formatRelativeTime(order.createdAt)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[order.status]}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{statusLabels[order.status]}</span>
                    </Badge>
                    {order.sparePartOrder?.urgency && (
                      <Badge className={urgencyColors[order.sparePartOrder.urgency]}>
                        <Flag className="h-3 w-3 mr-1" />
                        {order.sparePartOrder.urgency}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Key Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">ID porudžbine:</span>
                      <span className="text-sm text-gray-900">#{order.id}</span>
                    </div>
                    
                    {order.orderNumber && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Broj narudžbe:</span>
                        <span className="text-sm text-gray-900">{order.orderNumber}</span>
                      </div>
                    )}
                    
                    {order.trackingNumber && (
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Broj praćenja:</span>
                        <span className="text-sm text-gray-900">{order.trackingNumber}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Kreirana:</span>
                      <span className="text-sm text-gray-900">{formatDate(order.createdAt)}</span>
                    </div>
                    
                    {order.estimatedDelivery && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Očekivana dostava:</span>
                        <span className="text-sm text-gray-900">{formatDate(order.estimatedDelivery)}</span>
                      </div>
                    )}
                    
                    {order.totalCost && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Ukupan iznos:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {order.totalCost} {order.currency || 'EUR'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parts Information */}
                {order.sparePartOrder && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Informacije o delu</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Naziv dela</Label>
                          <p className="text-sm text-gray-900 mt-1">{order.sparePartOrder.partName}</p>
                        </div>
                        
                        {order.sparePartOrder.partNumber && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Broj dela</Label>
                            <p className="text-sm text-gray-900 mt-1">{order.sparePartOrder.partNumber}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Količina</Label>
                          <p className="text-sm text-gray-900 mt-1">{order.sparePartOrder.quantity}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Hitnost</Label>
                          <Badge className={urgencyColors[order.sparePartOrder.urgency]} size="sm">
                            {order.sparePartOrder.urgency}
                          </Badge>
                        </div>
                      </div>
                      
                      {order.sparePartOrder.description && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Opis</Label>
                          <p className="text-sm text-gray-900 mt-1">{order.sparePartOrder.description}</p>
                        </div>
                      )}
                      
                      {order.sparePartOrder.applianceModel && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Model uređaja</Label>
                            <p className="text-sm text-gray-900 mt-1">{order.sparePartOrder.applianceModel}</p>
                          </div>
                          
                          {order.sparePartOrder.applianceManufacturer && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Proizvođač</Label>
                              <p className="text-sm text-gray-900 mt-1">{order.sparePartOrder.applianceManufacturer}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Event Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Istorija događaja</CardTitle>
                    <CardDescription>
                      Kompletna istorija promena i komunikacije
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setIsAddingEvent(true)} 
                    size="sm"
                    data-testid="button-add-event"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Dodaj događaj
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <ScrollArea className="h-96">
                  {eventsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : events.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">Nema događaja za prikaz</p>
                      <p className="text-sm text-gray-500">Dodajte prvi događaj da počnete praćenje</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {events
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((event, index) => (
                        <div key={event.id} className="flex space-x-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {eventTypeIcons[event.eventType] || <FileText className="h-4 w-4" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {eventTypeLabels[event.eventType] || event.eventType}
                                  </Badge>
                                  {event.priority !== 'normal' && (
                                    <Badge className={`${priorityColors[event.priority]} text-xs`}>
                                      {event.priority}
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm text-gray-900 font-medium">
                                  {event.eventDescription}
                                </p>
                                
                                {event.eventNotes && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {event.eventNotes}
                                  </p>
                                )}
                                
                                {event.eventStatus && (
                                  <div className="mt-2">
                                    <Badge className={statusColors[event.eventStatus]}>
                                      Novi status: {statusLabels[event.eventStatus] || event.eventStatus}
                                    </Badge>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {event.performedByName}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatRelativeTime(event.createdAt)}
                                  </div>
                                  {event.communicationChannel && (
                                    <div className="flex items-center gap-1">
                                      {event.communicationChannel === 'email' ? <Mail className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                                      {event.communicationChannel}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upravljanje statusom</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Trenutni status</Label>
                  <div className="mt-1">
                    <Badge className={statusColors[order.status]}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{statusLabels[order.status]}</span>
                    </Badge>
                  </div>
                </div>

                {availableStatuses.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Promeni status</Label>
                    <div className="mt-2 space-y-2">
                      {availableStatuses.map((status) => (
                        <Button
                          key={status}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleStatusUpdate(status)}
                          disabled={updateOrderMutation.isPending}
                          data-testid={`button-status-${status}`}
                        >
                          {getStatusIcon(status)}
                          <span className="ml-2">{statusLabels[status]}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Brze akcije</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => queryClient.invalidateQueries()}
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Osveži podatke
                </Button>
                
                {order.trackingNumber && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => window.open(`https://track.dhl.com/results?search=${order.trackingNumber}`, '_blank')}
                    data-testid="button-track-package"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Prati paket
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    const orderInfo = `Porudžbina #${order.id}\nStatus: ${statusLabels[order.status]}\nDeo: ${order.sparePartOrder?.partName || 'N/A'}`;
                    navigator.clipboard.writeText(orderInfo);
                    toast({ title: "Kopirano", description: "Informacije o porudžbini su kopirane" });
                  }}
                  data-testid="button-copy-info"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Kopiraj info
                </Button>
              </CardContent>
            </Card>

            {/* Contact Information */}
            {order.sparePartOrder?.clientName && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informacije o klijentu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-900">{order.sparePartOrder.clientName}</span>
                    </div>
                    
                    {order.sparePartOrder.clientPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-900">{order.sparePartOrder.clientPhone}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <Phone className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {order.sparePartOrder.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <span className="text-sm text-gray-900">{order.sparePartOrder.address}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={isAddingEvent} onOpenChange={setIsAddingEvent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj novi događaj</DialogTitle>
            <DialogDescription>
              Dodajte novi događaj za praćenje porudžbine
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-type">Tip događaja</Label>
              <Select value={newEventType} onValueChange={setNewEventType}>
                <SelectTrigger id="event-type" data-testid="select-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="communication">Komunikacija</SelectItem>
                  <SelectItem value="update">Ažuriranje</SelectItem>
                  <SelectItem value="note_added">Dodana napomena</SelectItem>
                  <SelectItem value="delivery_update">Ažuriranje dostave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="event-description">Opis događaja</Label>
              <Textarea
                id="event-description"
                placeholder="Unesite opis događaja..."
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                rows={3}
                data-testid="textarea-event-description"
              />
            </div>
            
            <div>
              <Label htmlFor="event-notes">Dodatne napomene (opciono)</Label>
              <Textarea
                id="event-notes"
                placeholder="Dodatne informacije..."
                value={newEventNotes}
                onChange={(e) => setNewEventNotes(e.target.value)}
                rows={2}
                data-testid="textarea-event-notes"
              />
            </div>
            
            <div>
              <Label htmlFor="event-priority">Prioritet</Label>
              <Select value={newEventPriority} onValueChange={setNewEventPriority}>
                <SelectTrigger id="event-priority" data-testid="select-event-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Nizak</SelectItem>
                  <SelectItem value="normal">Normalan</SelectItem>
                  <SelectItem value="high">Visok</SelectItem>
                  <SelectItem value="urgent">Hitan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddingEvent(false)}
                data-testid="button-cancel-event"
              >
                Otkaži
              </Button>
              <Button
                onClick={handleAddEvent}
                disabled={addEventMutation.isPending || !newEventDescription.trim()}
                data-testid="button-save-event"
              >
                {addEventMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Čuvanje...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Dodaj događaj
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}