import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Users, 
  Wrench, 
  Settings, 
  RefreshCw,
  Eye,
  ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { srLatn } from "date-fns/locale";

interface OrphanedData {
  clientsWithoutData: Array<{
    id: number;
    fullName: string;
    phone: string;
    email?: string;
    city?: string;
  }>;
  servicesWithoutClients: Array<{
    id: number;
    description: string;
    createdAt: string;
    status: string;
    clientId: number;
  }>;
  appliancesWithoutClients: Array<{
    id: number;
    model: string;
    serialNumber?: string;
    clientId: number;
  }>;
  expiredServices: Array<{
    id: number;
    description: string;
    createdAt: string;
    status: string;
    clientId: number;
  }>;
}

export default function AdminCleanup() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedAppliances, setSelectedAppliances] = useState<number[]>([]);
  const [selectedExpiredServices, setSelectedExpiredServices] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<string>("");
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch orphaned data
  const { data: orphanedData, isLoading, refetch } = useQuery<OrphanedData>({
    queryKey: ["/api/admin/orphaned-data"],
    enabled: user?.role === "admin"
  });

  // Delete mutations
  const deleteMutation = useMutation({
    mutationFn: async ({ type, ids }: { type: string; ids: number[] }) => {
      if (type === "bulk") {
        return apiRequest("POST", "/api/admin/bulk-delete", { type: deleteType, ids });
      } else {
        return apiRequest("DELETE", `/api/admin/${type}/${ids[0]}`);
      }
    },
    onSuccess: () => {
      toast({
        title: "Uspešno obrisano",
        description: "Nevažeći podaci su uspešno obrisani",
      });
      refetch();
      setDeleteDialogOpen(false);
      setSelectedClients([]);
      setSelectedServices([]);
      setSelectedAppliances([]);
      setSelectedExpiredServices([]);
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri brisanju",
        description: error.message || "Došlo je do greške pri brisanju podataka",
        variant: "destructive",
      });
    },
  });

  const handleBulkDelete = (type: string) => {
    let ids: number[] = [];
    let typeName = "";
    
    switch (type) {
      case "clients":
        ids = selectedClients;
        typeName = "klijenti";
        break;
      case "services":
        ids = [...selectedServices, ...selectedExpiredServices];
        typeName = "servisi";
        break;
      case "appliances":
        ids = selectedAppliances;
        typeName = "uređaji";
        break;
    }
    
    if (ids.length === 0) {
      toast({
        title: "Nema odabranih stavki",
        description: "Molimo odaberite stavke koje želite obrisati",
        variant: "destructive",
      });
      return;
    }
    
    setDeleteType(type);
    setDeleteIds(ids);
    setDeleteDialogOpen(true);
  };

  const handleSingleDelete = (type: string, id: number) => {
    setDeleteType(type);
    setDeleteIds([id]);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate({ type: "bulk", ids: deleteIds });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd.MM.yyyy", { locale: srLatn });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Na čekanju", variant: "outline" as const },
      assigned: { label: "Dodeljen", variant: "secondary" as const },
      scheduled: { label: "Zakazan", variant: "outline" as const },
      in_progress: { label: "U toku", variant: "default" as const },
      completed: { label: "Završen", variant: "secondary" as const },
      cancelled: { label: "Otkazan", variant: "destructive" as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: "outline" as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex h-screen bg-gray-100">
        <div className="flex-1 flex items-center justify-center">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Nemate dozvolu za pristup ovoj stranici.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Čišćenje baze podataka</h1>
                <p className="text-gray-600">Upravljanje neispravnim i isteklim podacima</p>
              </div>
              <Button onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Osveži
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Summary Cards */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Klijenti bez podataka
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {orphanedData?.clientsWithoutData.length || 0}
                    </div>
                    <p className="text-sm text-gray-600">
                      Klijenti bez telefona ili imena
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Servisi bez klijenata
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {orphanedData?.servicesWithoutClients.length || 0}
                    </div>
                    <p className="text-sm text-gray-600">
                      Servisi sa nepostojećim klijentima
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Uređaji bez klijenata
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {orphanedData?.appliancesWithoutClients.length || 0}
                    </div>
                    <p className="text-sm text-gray-600">
                      Uređaji sa nepostojećim klijentima
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                      <Wrench className="h-4 w-4 mr-2" />
                      Istekli servisi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {orphanedData?.expiredServices.length || 0}
                    </div>
                    <p className="text-sm text-gray-600">
                      Završeni servisi stariji od 2 godine
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Clients without data */}
            {orphanedData?.clientsWithoutData && orphanedData.clientsWithoutData.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Klijenti bez podataka ({orphanedData.clientsWithoutData.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allIds = orphanedData.clientsWithoutData.map(c => c.id);
                          setSelectedClients(selectedClients.length === allIds.length ? [] : allIds);
                        }}
                      >
                        {selectedClients.length === orphanedData.clientsWithoutData.length ? "Odznači sve" : "Označi sve"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleBulkDelete("clients")}
                        disabled={selectedClients.length === 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Obriši odabrane
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {orphanedData.clientsWithoutData.map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedClients.includes(client.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedClients([...selectedClients, client.id]);
                              } else {
                                setSelectedClients(selectedClients.filter(id => id !== client.id));
                              }
                            }}
                          />
                          <div>
                            <div className="font-medium">
                              {client.fullName || "Bez imena"} (ID: {client.id})
                            </div>
                            <div className="text-sm text-gray-600">
                              Telefon: {client.phone || "Nema"} | Email: {client.email || "Nema"}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSingleDelete("clients", client.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services without clients */}
            {orphanedData?.servicesWithoutClients && orphanedData.servicesWithoutClients.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <ClipboardList className="h-5 w-5 mr-2" />
                      Servisi bez klijenata ({orphanedData.servicesWithoutClients.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allIds = orphanedData.servicesWithoutClients.map(s => s.id);
                          setSelectedServices(selectedServices.length === allIds.length ? [] : allIds);
                        }}
                      >
                        {selectedServices.length === orphanedData.servicesWithoutClients.length ? "Odznači sve" : "Označi sve"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleBulkDelete("services")}
                        disabled={selectedServices.length === 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Obriši odabrane
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {orphanedData.servicesWithoutClients.map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedServices.includes(service.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedServices([...selectedServices, service.id]);
                              } else {
                                setSelectedServices(selectedServices.filter(id => id !== service.id));
                              }
                            }}
                          />
                          <div>
                            <div className="font-medium">
                              Servis #{service.id} - {service.description}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-2">
                              <span>Kreiran: {formatDate(service.createdAt)}</span>
                              {getStatusBadge(service.status)}
                              <span>Klijent ID: {service.clientId} (ne postoji)</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSingleDelete("services", service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appliances without clients */}
            {orphanedData?.appliancesWithoutClients && orphanedData.appliancesWithoutClients.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Uređaji bez klijenata ({orphanedData.appliancesWithoutClients.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allIds = orphanedData.appliancesWithoutClients.map(a => a.id);
                          setSelectedAppliances(selectedAppliances.length === allIds.length ? [] : allIds);
                        }}
                      >
                        {selectedAppliances.length === orphanedData.appliancesWithoutClients.length ? "Odznači sve" : "Označi sve"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleBulkDelete("appliances")}
                        disabled={selectedAppliances.length === 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Obriši odabrane
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {orphanedData.appliancesWithoutClients.map((appliance) => (
                      <div key={appliance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedAppliances.includes(appliance.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAppliances([...selectedAppliances, appliance.id]);
                              } else {
                                setSelectedAppliances(selectedAppliances.filter(id => id !== appliance.id));
                              }
                            }}
                          />
                          <div>
                            <div className="font-medium">
                              {appliance.model || "Bez modela"} (ID: {appliance.id})
                            </div>
                            <div className="text-sm text-gray-600">
                              Serijski broj: {appliance.serialNumber || "Nema"} | Klijent ID: {appliance.clientId} (ne postoji)
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSingleDelete("appliances", appliance.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expired services */}
            {orphanedData?.expiredServices && orphanedData.expiredServices.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Wrench className="h-5 w-5 mr-2" />
                      Istekli servisi ({orphanedData.expiredServices.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allIds = orphanedData.expiredServices.map(s => s.id);
                          setSelectedExpiredServices(selectedExpiredServices.length === allIds.length ? [] : allIds);
                        }}
                      >
                        {selectedExpiredServices.length === orphanedData.expiredServices.length ? "Odznači sve" : "Označi sve"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleBulkDelete("services")}
                        disabled={selectedExpiredServices.length === 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Obriši odabrane
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {orphanedData.expiredServices.map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedExpiredServices.includes(service.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedExpiredServices([...selectedExpiredServices, service.id]);
                              } else {
                                setSelectedExpiredServices(selectedExpiredServices.filter(id => id !== service.id));
                              }
                            }}
                          />
                          <div>
                            <div className="font-medium">
                              Servis #{service.id} - {service.description}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-2">
                              <span>Kreiran: {formatDate(service.createdAt)}</span>
                              {getStatusBadge(service.status)}
                              <span className="text-orange-600">Stariji od 2 godine</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSingleDelete("services", service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No data message */}
            {orphanedData && 
             orphanedData.clientsWithoutData.length === 0 &&
             orphanedData.servicesWithoutClients.length === 0 &&
             orphanedData.appliancesWithoutClients.length === 0 &&
             orphanedData.expiredServices.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Baza podataka je čista
                    </h3>
                    <p className="text-gray-600">
                      Nema neispravnih ili isteklih podataka za čišćenje.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Potvrda brisanja
            </DialogTitle>
            <DialogDescription>
              Da li ste sigurni da želite obrisati {deleteIds.length === 1 ? "ovu stavku" : `${deleteIds.length} stavki`}?
              Ova akcija se ne može poništiti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Otkaži
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Briše se..." : "Obriši"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}