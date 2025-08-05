import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, Mail, Globe, Phone, Building, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const handleCreateSupplier = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      companyName: formData.get('companyName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || undefined,
      address: formData.get('address') as string || undefined,
      website: formData.get('website') as string || undefined,
      supportedBrands: formData.get('supportedBrands') as string,
      integrationMethod: formData.get('integrationMethod') as string,
      paymentTerms: formData.get('paymentTerms') as string || undefined,
      deliveryInfo: formData.get('deliveryInfo') as string || undefined,
      contactPerson: formData.get('contactPerson') as string || undefined,
      isActive: formData.get('isActive') === 'true',
      priority: parseInt(formData.get('priority') as string),
      averageDeliveryDays: parseInt(formData.get('averageDeliveryDays') as string),
      notes: formData.get('notes') as string || undefined,
    };

    createSupplierMutation.mutate(data);
  };

  const handleEditSupplier = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSupplier) return;

    const formData = new FormData(event.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      companyName: formData.get('companyName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || undefined,
      address: formData.get('address') as string || undefined,
      website: formData.get('website') as string || undefined,
      supportedBrands: formData.get('supportedBrands') as string,
      integrationMethod: formData.get('integrationMethod') as string,
      paymentTerms: formData.get('paymentTerms') as string || undefined,
      deliveryInfo: formData.get('deliveryInfo') as string || undefined,
      contactPerson: formData.get('contactPerson') as string || undefined,
      isActive: formData.get('isActive') === 'true',
      priority: parseInt(formData.get('priority') as string),
      averageDeliveryDays: parseInt(formData.get('averageDeliveryDays') as string),
      notes: formData.get('notes') as string || undefined,
    };

    updateSupplierMutation.mutate({ id: editingSupplier.id, data });
  };

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

                    <div className="flex justify-end space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Da li ste sigurni da želite da obrišete ovog dobavljača?')) {
                            deleteSupplierMutation.mutate(supplier.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
          
          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Naziv dobavljača*</Label>
                <Input id="create-name" name="name" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-companyName">Naziv kompanije*</Label>
                <Input id="create-companyName" name="companyName" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-email">Email*</Label>
                <Input id="create-email" name="email" type="email" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-phone">Telefon</Label>
                <Input id="create-phone" name="phone" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-address">Adresa</Label>
              <Input id="create-address" name="address" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-website">Website</Label>
                <Input id="create-website" name="website" type="url" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-contactPerson">Kontakt osoba</Label>
                <Input id="create-contactPerson" name="contactPerson" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-supportedBrands">Podržani brendovi (JSON format)*</Label>
              <Input 
                id="create-supportedBrands" 
                name="supportedBrands" 
                placeholder='["Electrolux", "Candy", "Beko"]'
                required 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-integrationMethod">Metod integracije*</Label>
                <Select name="integrationMethod" defaultValue="email">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="fax">Fax</SelectItem>
                    <SelectItem value="manual">Ručno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-priority">Prioritet (1-10)*</Label>
                <Input 
                  id="create-priority" 
                  name="priority" 
                  type="number" 
                  min="1" 
                  max="10" 
                  defaultValue="5"
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-averageDeliveryDays">Prosečna dostava (dani)*</Label>
                <Input 
                  id="create-averageDeliveryDays" 
                  name="averageDeliveryDays" 
                  type="number" 
                  min="1" 
                  defaultValue="7"
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-paymentTerms">Uslovi plaćanja</Label>
                <Input id="create-paymentTerms" name="paymentTerms" />
              </div>
              
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="create-isActive" 
                  name="isActive" 
                  value="true"
                  defaultChecked
                />
                <Label htmlFor="create-isActive">Aktivan</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-deliveryInfo">Informacije o dostavi</Label>
              <Textarea id="create-deliveryInfo" name="deliveryInfo" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-notes">Napomene</Label>
              <Textarea id="create-notes" name="notes" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Otkaži
              </Button>
              <Button type="submit" disabled={createSupplierMutation.isPending}>
                {createSupplierMutation.isPending ? "Kreiranje..." : "Kreiraj dobavljača"}
              </Button>
            </DialogFooter>
          </form>
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
            <form onSubmit={handleEditSupplier} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Naziv dobavljača*</Label>
                  <Input 
                    id="edit-name" 
                    name="name" 
                    defaultValue={editingSupplier.name}
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-companyName">Naziv kompanije*</Label>
                  <Input 
                    id="edit-companyName" 
                    name="companyName" 
                    defaultValue={editingSupplier.companyName}
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email*</Label>
                  <Input 
                    id="edit-email" 
                    name="email" 
                    type="email" 
                    defaultValue={editingSupplier.email}
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefon</Label>
                  <Input 
                    id="edit-phone" 
                    name="phone" 
                    defaultValue={editingSupplier.phone}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">Adresa</Label>
                <Input 
                  id="edit-address" 
                  name="address" 
                  defaultValue={editingSupplier.address}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input 
                    id="edit-website" 
                    name="website" 
                    type="url" 
                    defaultValue={editingSupplier.website}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-contactPerson">Kontakt osoba</Label>
                  <Input 
                    id="edit-contactPerson" 
                    name="contactPerson" 
                    defaultValue={editingSupplier.contactPerson}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-supportedBrands">Podržani brendovi*</Label>
                <Input 
                  id="edit-supportedBrands" 
                  name="supportedBrands" 
                  defaultValue={editingSupplier.supportedBrands}
                  required 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-integrationMethod">Metod integracije*</Label>
                  <Select name="integrationMethod" defaultValue={editingSupplier.integrationMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="fax">Fax</SelectItem>
                      <SelectItem value="manual">Ručno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Prioritet (1-10)*</Label>
                  <Input 
                    id="edit-priority" 
                    name="priority" 
                    type="number" 
                    min="1" 
                    max="10" 
                    defaultValue={editingSupplier.priority}
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-averageDeliveryDays">Prosečna dostava (dani)*</Label>
                  <Input 
                    id="edit-averageDeliveryDays" 
                    name="averageDeliveryDays" 
                    type="number" 
                    min="1" 
                    defaultValue={editingSupplier.averageDeliveryDays}
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-paymentTerms">Uslovi plaćanja</Label>
                  <Input 
                    id="edit-paymentTerms" 
                    name="paymentTerms" 
                    defaultValue={editingSupplier.paymentTerms}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="edit-isActive" 
                    name="isActive" 
                    value="true"
                    defaultChecked={editingSupplier.isActive}
                  />
                  <Label htmlFor="edit-isActive">Aktivan</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-deliveryInfo">Informacije o dostavi</Label>
                <Textarea 
                  id="edit-deliveryInfo" 
                  name="deliveryInfo" 
                  defaultValue={editingSupplier.deliveryInfo}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Napomene</Label>
                <Textarea 
                  id="edit-notes" 
                  name="notes" 
                  defaultValue={editingSupplier.notes}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Otkaži
                </Button>
                <Button type="submit" disabled={updateSupplierMutation.isPending}>
                  {updateSupplierMutation.isPending ? "Čuvanje..." : "Sačuvaj izmene"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}