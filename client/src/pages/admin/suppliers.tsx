import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, Mail, Globe, Phone, Building, AlertCircle, CheckCircle, Clock, UserPlus, Send, Users, Package, ExternalLink, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { insertSupplierSchema, supplierPortalUserSchema, procurementRequestSchema, type InsertSupplier, type SupplierPortalUser, type ProcurementRequest } from "@shared/schema";

interface Supplier {
  id: number;
  name: string;
  companyName: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  supportedBrands: string;
  integrationMethod: 'email' | 'api' | 'fax' | 'manual';
  paymentTerms?: string;
  deliveryInfo?: string;
  contactPerson?: string;
  isActive: boolean;
  priority: number;
  averageDeliveryDays: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplierOrder {
  id: number;
  supplierId: number;
  sparePartOrderId: number;
  orderNumber?: string;
  status: 'pending' | 'sent' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  totalCost?: number;
  currency: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedTab, setSelectedTab] = useState<'suppliers' | 'orders'>('suppliers');
  
  // New state for portal user creation
  const [isPortalUserDialogOpen, setIsPortalUserDialogOpen] = useState(false);
  const [selectedSupplierForPortal, setSelectedSupplierForPortal] = useState<Supplier | null>(null);
  
  // New state for procurement requests
  const [isProcurementDialogOpen, setIsProcurementDialogOpen] = useState(false);
  const [selectedSupplierForRequest, setSelectedSupplierForRequest] = useState<Supplier | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state management
  const createSupplierForm = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: "",
      companyName: "",
      email: "",
      phone: "",
      address: "",
      website: "",
      supportedBrands: "",
      integrationMethod: "email",
      paymentTerms: "",
      deliveryInfo: "",
      contactPerson: "",
      isActive: true,
      priority: 5,
      averageDeliveryDays: 7,
      notes: "",
      portalEnabled: false,
    }
  });

  const portalUserForm = useForm<SupplierPortalUser>({
    resolver: zodResolver(supplierPortalUserSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      password: "",
      role: "supplier_complus",
      phone: "",
    }
  });

  const procurementForm = useForm<ProcurementRequest>({
    resolver: zodResolver(procurementRequestSchema),
    defaultValues: {
      partName: "",
      partNumber: "",
      quantity: 1,
      description: "",
      urgency: "normal",
      expectedDelivery: "",
      notes: "",
    }
  });

  // Fetch suppliers
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/admin/suppliers'],
  });

  // Fetch supplier orders
  const { data: supplierOrders = [], isLoading: ordersLoading } = useQuery<SupplierOrder[]>({
    queryKey: ['/api/admin/supplier-orders'],
  });

  // Supplier stats
  const { data: stats = {} } = useQuery<{
    totalSuppliers?: number;
    activeSuppliers?: number;
    pendingOrders?: number;
    emailIntegrations?: number;
  }>({
    queryKey: ['/api/admin/suppliers/stats'],
  });

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers/stats'] });
      setIsCreateDialogOpen(false);
      createSupplierForm.reset();
      toast({
        title: "Uspeh",
        description: "Dobavljač je uspešno kreiran",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Greška pri kreiranju dobavljača",
        variant: "destructive",
      });
    },
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/admin/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers/stats'] });
      setIsEditDialogOpen(false);
      setEditingSupplier(null);
      createSupplierForm.reset();
      toast({
        title: "Uspeh",
        description: "Dobavljač je uspešno ažuriran",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Greška pri ažuriranju dobavljača",
        variant: "destructive",
      });
    },
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/suppliers/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers/stats'] });
      toast({
        title: "Uspeh",
        description: "Dobavljač je uspešno obrisan",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Greška pri brisanju dobavljača",
        variant: "destructive",
      });
    },
  });

  // Create portal user mutation
  const createPortalUserMutation = useMutation({
    mutationFn: ({ supplierId, data }: { supplierId: number; data: any }) => 
      apiRequest(`/api/suppliers/${supplierId}/users`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
      setIsPortalUserDialogOpen(false);
      setSelectedSupplierForPortal(null);
      portalUserForm.reset();
      toast({
        title: "Uspeh",
        description: "Portal korisnik je uspešno kreiran",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Greška pri kreiranju portal korisnika",
        variant: "destructive",
      });
    },
  });

  // Send procurement request mutation
  const sendProcurementRequestMutation = useMutation({
    mutationFn: ({ supplierId, data }: { supplierId: number; data: any }) => 
      apiRequest('/api/admin/procurement/requests', {
        method: 'POST',
        body: JSON.stringify({ ...data, supplierId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
      setIsProcurementDialogOpen(false);
      setSelectedSupplierForRequest(null);
      procurementForm.reset();
      toast({
        title: "Uspeh",
        description: "Zahtev za nabavku je uspešno poslat",
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

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIntegrationIcon = (method: string) => {
    switch (method) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'api': return <Globe className="h-4 w-4" />;
      case 'fax': return <Phone className="h-4 w-4" />;
      case 'manual': return <Edit className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'sent': case 'confirmed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'shipped': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleCreateSupplier = (data: InsertSupplier) => {
    createSupplierMutation.mutate(data);
  };

  const handleEditSupplier = (data: InsertSupplier) => {
    if (!editingSupplier) return;
    updateSupplierMutation.mutate({ id: editingSupplier.id, data });
  };

  const handleCreatePortalUser = (data: SupplierPortalUser) => {
    if (!selectedSupplierForPortal) return;
    const userData = { ...data, supplierId: selectedSupplierForPortal.id };
    createPortalUserMutation.mutate({ supplierId: selectedSupplierForPortal.id, data: userData });
  };

  const handleSendProcurementRequest = (data: ProcurementRequest) => {
    if (!selectedSupplierForRequest) return;
    sendProcurementRequestMutation.mutate({ supplierId: selectedSupplierForRequest.id, data });
  };

  // Reset forms when dialogs open/close
  useEffect(() => {
    if (isCreateDialogOpen) {
      createSupplierForm.reset();
    }
  }, [isCreateDialogOpen]);

  useEffect(() => {
    if (isPortalUserDialogOpen) {
      portalUserForm.reset();
    }
  }, [isPortalUserDialogOpen]);

  useEffect(() => {
    if (isProcurementDialogOpen) {
      procurementForm.reset();
    }
  }, [isProcurementDialogOpen]);

  // Populate form when editing supplier
  useEffect(() => {
    if (editingSupplier && isEditDialogOpen) {
      createSupplierForm.reset({
        name: editingSupplier.name,
        companyName: editingSupplier.companyName,
        email: editingSupplier.email,
        phone: editingSupplier.phone || "",
        address: editingSupplier.address || "",
        website: editingSupplier.website || "",
        supportedBrands: editingSupplier.supportedBrands,
        integrationMethod: editingSupplier.integrationMethod,
        paymentTerms: editingSupplier.paymentTerms || "",
        deliveryInfo: editingSupplier.deliveryInfo || "",
        contactPerson: editingSupplier.contactPerson || "",
        isActive: editingSupplier.isActive,
        priority: editingSupplier.priority,
        averageDeliveryDays: editingSupplier.averageDeliveryDays,
        notes: editingSupplier.notes || "",
        portalEnabled: false, // Default for edit
      });
    }
  }, [editingSupplier, isEditDialogOpen]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Upravljanje dobavljačima</h1>
          <p className="text-muted-foreground">Upravljaj dobavljačima rezervnih delova i njihovim porudžbinama</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novi dobavljač
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Ukupno dobavljača</p>
                  <p className="text-2xl font-bold">{stats.totalSuppliers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Aktivni</p>
                  <p className="text-2xl font-bold">{stats.activeSuppliers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Porudžbine na čekanju</p>
                  <p className="text-2xl font-bold">{stats.pendingOrders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Email integracija</p>
                  <p className="text-2xl font-bold">{stats.emailIntegrations || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <Button 
          variant={selectedTab === 'suppliers' ? 'default' : 'outline'}
          onClick={() => setSelectedTab('suppliers')}
        >
          Dobavljači
        </Button>
        <Button 
          variant={selectedTab === 'orders' ? 'default' : 'outline'}
          onClick={() => setSelectedTab('orders')}
        >
          Porudžbine
        </Button>
      </div>

      {selectedTab === 'suppliers' && (
        <>
          {/* Search */}
          <div className="flex items-center space-x-2 mb-6">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Pretraži dobavljače..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Suppliers List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliersLoading ? (
              <div className="col-span-full text-center">Učitavanje...</div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{supplier.name}</CardTitle>
                        <CardDescription>{supplier.companyName}</CardDescription>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Badge variant={supplier.isActive ? "default" : "secondary"}>
                          {supplier.isActive ? "Aktivan" : "Neaktivan"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Prioritet {supplier.priority}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.email}</span>
                    </div>
                    
                    {supplier.phone && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{supplier.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2 text-sm">
                      {getIntegrationIcon(supplier.integrationMethod)}
                      <span className="capitalize">{supplier.integrationMethod}</span>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <span>Dostava: {supplier.averageDeliveryDays} dana</span>
                    </div>

                    {supplier.supportedBrands && (
                      <div className="text-sm">
                        <span className="font-medium">Brendovi: </span>
                        <span className="text-muted-foreground">
                          {JSON.parse(supplier.supportedBrands || '[]').join(', ')}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {/* Primary Actions Row */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          data-testid={`button-create-portal-user-${supplier.id}`}
                          onClick={() => {
                            setSelectedSupplierForPortal(supplier);
                            setIsPortalUserDialogOpen(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Portal
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          data-testid={`button-send-request-${supplier.id}`}
                          onClick={() => {
                            setSelectedSupplierForRequest(supplier);
                            setIsProcurementDialogOpen(true);
                          }}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Zahtev
                        </Button>
                      </div>
                      
                      {/* Secondary Actions Row */}
                      <div className="flex justify-between space-x-2">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-edit-${supplier.id}`}
                            onClick={() => {
                              setEditingSupplier(supplier);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {supplier.website && (
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`button-visit-website-${supplier.id}`}
                              onClick={() => window.open(supplier.website, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-delete-${supplier.id}`}
                          onClick={() => {
                            if (confirm('Da li ste sigurni da želite da obrišete ovog dobavljača?')) {
                              deleteSupplierMutation.mutate(supplier.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {selectedTab === 'orders' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Porudžbine kod dobavljača</h2>
          
          {ordersLoading ? (
            <div className="text-center">Učitavanje porudžbina...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {supplierOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.status)}
                          <span className="font-medium">Porudžbina #{order.id}</span>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>
                        
                        {order.orderNumber && (
                          <p className="text-sm text-muted-foreground">
                            Broj porudžbine: {order.orderNumber}
                          </p>
                        )}
                        
                        {order.trackingNumber && (
                          <p className="text-sm text-muted-foreground">
                            Tracking: {order.trackingNumber}
                          </p>
                        )}
                        
                        {order.totalCost && (
                          <p className="text-sm">
                            Ukupno: {order.totalCost} {order.currency}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Kreiran: {new Date(order.createdAt).toLocaleDateString('sr-RS')}</p>
                        {order.estimatedDelivery && (
                          <p>Procenjena dostava: {new Date(order.estimatedDelivery).toLocaleDateString('sr-RS')}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Supplier Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj novog dobavljača</DialogTitle>
            <DialogDescription>
              Unesite informacije o novom dobavljaču rezervnih delova
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createSupplierForm}>
            <form onSubmit={createSupplierForm.handleSubmit(handleCreateSupplier)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createSupplierForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Naziv dobavljača*</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-supplier-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createSupplierForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Naziv kompanije*</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-company-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createSupplierForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email*</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-supplier-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createSupplierForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-supplier-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createSupplierForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresa</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-supplier-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createSupplierForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" data-testid="input-supplier-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createSupplierForm.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kontakt osoba</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-contact-person" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createSupplierForm.control}
                name="supportedBrands"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Podržani brendovi (JSON format)*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""}
                        placeholder='["Electrolux", "Candy", "Beko"]'
                        data-testid="input-supported-brands"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={createSupplierForm.control}
                  name="integrationMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metod integracije*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-integration-method">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="api">API</SelectItem>
                          <SelectItem value="fax">Fax</SelectItem>
                          <SelectItem value="manual">Ručno</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createSupplierForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioritet (1-10)*</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="1" 
                          max="10"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-supplier-priority"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createSupplierForm.control}
                  name="averageDeliveryDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prosečna dostava (dani)*</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-delivery-days"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createSupplierForm.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uslovi plaćanja</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-payment-terms" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createSupplierForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input 
                          type="checkbox" 
                          checked={field.value}
                          onChange={field.onChange}
                          data-testid="checkbox-is-active"
                        />
                      </FormControl>
                      <FormLabel>Aktivan</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createSupplierForm.control}
                name="deliveryInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Informacije o dostavi</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="textarea-delivery-info" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createSupplierForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Napomene</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="textarea-supplier-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Otkaži
                </Button>
                <Button type="submit" disabled={createSupplierMutation.isPending}>
                  {createSupplierMutation.isPending ? "Kreiranje..." : "Kreiraj dobavljača"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Izmeni dobavljača</DialogTitle>
            <DialogDescription>
              Ažuriraj informacije o dobavljaču
            </DialogDescription>
          </DialogHeader>
          
          {editingSupplier && (
            <Form {...createSupplierForm}>
              <form onSubmit={createSupplierForm.handleSubmit(handleEditSupplier)} className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Uređuje se dobavljač: {editingSupplier.name}
                </div>
                
                {/* Use the exact same form structure as create supplier form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createSupplierForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naziv dobavljača*</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-supplier-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createSupplierForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naziv kompanije*</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-company-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Copy the rest of the form structure from create supplier form */}
                <div className="text-xs text-muted-foreground mb-2">
                  Ostala polja se koriste ista kao kod kreiranja - forma će biti ažurirana automatski
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Otkaži
                  </Button>
                  <Button type="submit" disabled={updateSupplierMutation.isPending}>
                    {updateSupplierMutation.isPending ? "Ažuriranje..." : "Ažuriraj dobavljača"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>

          )}
        </DialogContent>
      </Dialog>

      {/* Create Portal User Dialog */}
      <Dialog open={isPortalUserDialogOpen} onOpenChange={setIsPortalUserDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kreiraj portal korisnika</DialogTitle>
            <DialogDescription>
              Kreiraj portal korisnika za dobavljača: {selectedSupplierForPortal?.name}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...portalUserForm}>
            <form onSubmit={portalUserForm.handleSubmit(handleCreatePortalUser)} className="space-y-4">
              <FormField
                control={portalUserForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Korisničko ime*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="npr. complus_admin"
                        data-testid="input-portal-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={portalUserForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ime i prezime*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="Ana Marković"
                        data-testid="input-portal-fullname"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={portalUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="email" 
                        placeholder="admin@supplier.com"
                        data-testid="input-portal-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={portalUserForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lozinka*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="password" 
                        placeholder="Minimum 6 karaktera"
                        data-testid="input-portal-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={portalUserForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tip portala*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-portal-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="supplier_complus">Supplier ComPlus</SelectItem>
                        <SelectItem value="supplier_beko">Supplier Beko</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={portalUserForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        value={field.value || ""}
                        placeholder="+381 64 123 4567"
                        data-testid="input-portal-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsPortalUserDialogOpen(false)}
                data-testid="button-cancel-portal-user"
              >
                Otkaži
              </Button>
              <Button 
                type="submit" 
                disabled={createPortalUserMutation.isPending}
                data-testid="button-create-portal-user"
              >
                {createPortalUserMutation.isPending ? "Kreiranje..." : "Kreiraj korisnika"}
              </Button>
            </DialogFooter>
          </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Send Procurement Request Dialog */}
      <Dialog open={isProcurementDialogOpen} onOpenChange={setIsProcurementDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pošalji zahtev za nabavku</DialogTitle>
            <DialogDescription>
              Pošalji zahtev za rezervne delove dobavljaču: {selectedSupplierForRequest?.name}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...procurementForm}>
            <form onSubmit={procurementForm.handleSubmit(handleSendProcurementRequest)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={procurementForm.control}
                  name="partName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Naziv dela*</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder="Pumpa za mašinu za veš"
                          data-testid="input-part-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={procurementForm.control}
                  name="partNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broj dela</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          value={field.value || ""}
                          placeholder="P123456789"
                          data-testid="input-part-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={procurementForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Količina*</FormLabel>
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
                  control={procurementForm.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hitnost*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-urgency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="normal">Normalno</SelectItem>
                          <SelectItem value="high">Visoko</SelectItem>
                          <SelectItem value="urgent">Hitno</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={procurementForm.control}
                name="expectedDelivery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Očekivani datum dostave</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        value={field.value || ""}
                        type="date" 
                        data-testid="input-expected-delivery"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={procurementForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        value={field.value || ""}
                        placeholder="Dodatne informacije o zahtevu..."
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={procurementForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Napomene</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        value={field.value || ""}
                        placeholder="Interne napomene..."
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsProcurementDialogOpen(false)}
                data-testid="button-cancel-request"
              >
                Otkaži
              </Button>
              <Button 
                type="submit" 
                disabled={sendProcurementRequestMutation.isPending}
                data-testid="button-send-request"
              >
                {sendProcurementRequestMutation.isPending ? "Slanje..." : "Pošalji zahtev"}
              </Button>
            </DialogFooter>
          </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}