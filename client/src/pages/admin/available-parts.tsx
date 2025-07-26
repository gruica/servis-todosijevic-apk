import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Package, Search, Edit, Trash2, Plus, Check, MapPin, Euro, Calendar, User, UserCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AvailablePart {
  id: number;
  partName: string;
  partNumber?: string;
  quantity: number;
  description?: string;
  supplierName?: string;
  unitCost?: string;
  location?: string;
  warrantyStatus: string;
  categoryId?: number;
  manufacturerId?: number;
  originalOrderId?: number;
  addedDate: string;
  addedBy: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PendingSparePartOrder {
  id: number;
  partName: string;
  partNumber?: string;
  quantity: number;
  description?: string;
  supplierName?: string;
  estimatedCost?: string;
  actualCost?: string;
  warrantyStatus: string;
  status: string;
  urgency: string;
  orderDate?: string;
  expectedDelivery?: string;
  receivedDate?: string;
  adminNotes?: string;
  createdAt: string;
}

export default function AvailableParts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [markReceivedDialog, setMarkReceivedDialog] = useState<{ open: boolean; orderId?: number }>({ open: false });
  const [actualCost, setActualCost] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  
  // Dodela dela serviseru state
  const [allocateDialog, setAllocateDialog] = useState<{ open: boolean; partId?: number }>({ open: false });
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [allocateQuantity, setAllocateQuantity] = useState("1");
  const [allocateNotes, setAllocateNotes] = useState("");
  
  const queryClient = useQueryClient();

  // Query za dostupne delove
  const { data: availableParts = [], isLoading: loadingParts } = useQuery<AvailablePart[]>({
    queryKey: ["/api/admin/available-parts"],
  });

  // Query za pending spare parts orders
  const { data: pendingOrders = [], isLoading: loadingOrders } = useQuery<PendingOrder[]>({
    queryKey: ["/api/admin/spare-parts/pending"],
  });

  // Query za servisere
  const { data: technicians = [] } = useQuery<{ id: number; fullName: string; phone: string; email: string }[]>({
    queryKey: ["/api/technicians"],
  });

  // Mutation za označavanje dela kao primljenog
  const markReceivedMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: number; data: { actualCost?: string; location?: string; notes?: string } }) => {
      return apiRequest(`/api/admin/spare-parts/${orderId}/mark-received`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspeh",
        description: "Rezervni deo je uspešno označen kao primljen i dodatan u skladište",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/available-parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/spare-parts/pending"] });
      setMarkReceivedDialog({ open: false });
      setActualCost("");
      setLocation("");
      setNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri označavanju dela kao primljenog",
        variant: "destructive",
      });
    },
  });

  // Mutation za brisanje dostupnog dela
  const deletePartMutation = useMutation({
    mutationFn: async (partId: number) => {
      return apiRequest(`/api/admin/available-parts/${partId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspeh",
        description: "Dostupan deo je uspešno obrisan",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/available-parts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri brisanju dostupnog dela",
        variant: "destructive",
      });
    },
  });

  // Mutation za dodelu dela serviseru
  const allocatePartMutation = useMutation({
    mutationFn: async ({ partId, technicianId, quantity, notes }: { 
      partId: number; 
      technicianId: number; 
      quantity: number; 
      notes?: string; 
    }) => {
      return apiRequest(`/api/admin/available-parts/${partId}/allocate`, {
        method: "POST",
        body: JSON.stringify({
          technicianId,
          allocatedQuantity: quantity,
          allocationNotes: notes,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspeh",
        description: "Rezervni deo je uspešno dodeljen serviseru",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/available-parts"] });
      setAllocateDialog({ open: false });
      setSelectedTechnicianId("");
      setAllocateQuantity("1");
      setAllocateNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri dodeljivanju dela serviseru",
        variant: "destructive",
      });
    },
  });

  const handleMarkReceived = (orderId: number) => {
    markReceivedMutation.mutate({
      orderId,
      data: {
        actualCost: actualCost || undefined,
        location: location || undefined,
        notes: notes || undefined,
      },
    });
  };

  const handleDeletePart = (partId: number) => {
    if (confirm("Da li ste sigurni da želite da obrišete ovaj dostupan deo?")) {
      deletePartMutation.mutate(partId);
    }
  };

  const handleAllocatePart = (partId: number) => {
    setAllocateDialog({ open: true, partId });
  };

  const handleAllocateSubmit = () => {
    if (!allocateDialog.partId || !selectedTechnicianId) {
      toast({
        title: "Greška",
        description: "Molimo izaberite servisera",
        variant: "destructive",
      });
      return;
    }

    allocatePartMutation.mutate({
      partId: allocateDialog.partId,
      technicianId: parseInt(selectedTechnicianId),
      quantity: parseInt(allocateQuantity),
      notes: allocateNotes || undefined,
    });
  };

  const filteredParts = availableParts.filter((part: AvailablePart) =>
    part.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dostupni djelovi</h1>
          <p className="text-muted-foreground">Upravljanje dostupnim rezervnim delovima u skladištu</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno dostupnih delova</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableParts.length}</div>
            <p className="text-xs text-muted-foreground">Delovi u skladištu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending porudžbine</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders.length}</div>
            <p className="text-xs text-muted-foreground">Na čekanju</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">U garanciji</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {availableParts.filter((part: AvailablePart) => part.warrantyStatus === "u garanciji").length}
            </div>
            <p className="text-xs text-muted-foreground">Garancijski delovi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Van garancije</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {availableParts.filter((part: AvailablePart) => part.warrantyStatus === "van garancije").length}
            </div>
            <p className="text-xs text-muted-foreground">Komercijalni delovi</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Orders Section */}
      {pendingOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Porudžbine na čekanju</CardTitle>
            <CardDescription>Rezervni delovi koji čekaju da stignu u skladište</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingOrders.map((order: PendingSparePartOrder) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{order.partName}</div>
                    <div className="text-sm text-muted-foreground">
                      Količina: {order.quantity} | Dobavljač: {order.supplierName || "N/A"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={order.warrantyStatus === "u garanciji" ? "default" : "secondary"}>
                        {order.warrantyStatus === "u garanciji" ? "🛡️ U garanciji" : "💰 Van garancije"}
                      </Badge>
                      <Badge variant={order.urgency === "high" ? "destructive" : "outline"}>
                        {order.urgency === "high" ? "HITNO" : order.urgency}
                      </Badge>
                    </div>
                  </div>
                  <Dialog 
                    open={markReceivedDialog.open && markReceivedDialog.orderId === order.id}
                    onOpenChange={(open) => setMarkReceivedDialog({ open, orderId: open ? order.id : undefined })}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Check className="w-4 h-4 mr-2" />
                        Označiti kao stigao
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Označiti deo kao stigao</DialogTitle>
                        <DialogDescription>
                          Deo će biti premešten iz pending porudžbina u dostupne delove
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="actualCost">Stvarna cena (opciono)</Label>
                          <Input
                            id="actualCost"
                            value={actualCost}
                            onChange={(e) => setActualCost(e.target.value)}
                            placeholder="npr. 25.50"
                          />
                        </div>
                        <div>
                          <Label htmlFor="location">Lokacija u skladištu (opciono)</Label>
                          <Input
                            id="location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="npr. Polica A-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="notes">Napomene (opciono)</Label>
                          <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Dodatne napomene o delu..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setMarkReceivedDialog({ open: false })}
                        >
                          Otkaži
                        </Button>
                        <Button
                          onClick={() => handleMarkReceived(order.id)}
                          disabled={markReceivedMutation.isPending}
                        >
                          {markReceivedMutation.isPending ? "Označava..." : "Označiti kao stigao"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog za dodeljivanje dela serviseru */}
      <Dialog 
        open={allocateDialog.open} 
        onOpenChange={(open) => setAllocateDialog({ open, partId: open ? allocateDialog.partId : undefined })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodeli rezervni deo serviseru</DialogTitle>
            <DialogDescription>
              Izaberite servisera kome želite da dodelite rezervni deo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="technician">Serviser</Label>
              <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Izaberite servisera" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech: any) => (
                    <SelectItem key={tech.id} value={tech.id.toString()}>
                      {tech.fullName} - {tech.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Količina</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={allocateQuantity}
                onChange={(e) => setAllocateQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="allocateNotes">Napomene (opciono)</Label>
              <Textarea
                id="allocateNotes"
                value={allocateNotes}
                onChange={(e) => setAllocateNotes(e.target.value)}
                placeholder="Dodatne napomene o dodeljivanju..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAllocateDialog({ open: false })}
            >
              Otkaži
            </Button>
            <Button
              onClick={handleAllocateSubmit}
              disabled={allocatePartMutation.isPending}
            >
              {allocatePartMutation.isPending ? "Dodeljivanje..." : "Dodeli deo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Available Parts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Dostupni rezervni delovi</CardTitle>
          <CardDescription>Delovi koji su trenutno dostupni u skladištu</CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pretraži delove po nazivu, katalogu, opisu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loadingParts ? (
            <div className="text-center py-8">Učitava delove...</div>
          ) : filteredParts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Nema delova koji odgovaraju pretrazi" : "Nema dostupnih delova u skladištu"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naziv dela</TableHead>
                  <TableHead>Kataloški broj</TableHead>
                  <TableHead>Količina</TableHead>
                  <TableHead>Cena</TableHead>
                  <TableHead>Lokacija</TableHead>
                  <TableHead>Garancija</TableHead>
                  <TableHead>Dobavljač</TableHead>
                  <TableHead>Datum dodavanja</TableHead>
                  <TableHead>Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part: AvailablePart) => (
                  <TableRow key={part.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{part.partName}</div>
                        {part.description && (
                          <div className="text-sm text-muted-foreground">{part.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{part.partNumber || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{part.quantity}</Badge>
                    </TableCell>
                    <TableCell>{part.unitCost ? `${part.unitCost} €` : "N/A"}</TableCell>
                    <TableCell>
                      {part.location ? (
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {part.location}
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={part.warrantyStatus === "u garanciji" ? "default" : "secondary"}>
                        {part.warrantyStatus === "u garanciji" ? "🛡️ U garanciji" : "💰 Van garancije"}
                      </Badge>
                    </TableCell>
                    <TableCell>{part.supplierName || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(part.addedDate).toLocaleDateString("sr-RS")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAllocatePart(part.id)}
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <UserCheck className="w-3 h-3 mr-1" />
                          Dodeli za servis
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePart(part.id)}
                          disabled={deletePartMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}