import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Edit, Eye } from "lucide-react";

type Client = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes?: string;
};

export default function BusinessClientsSimple() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  // Form fields state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    notes: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["/api/business/clients"],
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log("🔥 STARTING UPDATE MUTATION");
      console.log("🔥 Client ID:", id);
      console.log("🔥 Update data:", data);
      
      const response = await apiRequest(`/api/business/clients/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      
      console.log("🔥 API response:", response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/clients"] });
      setIsEditDialogOpen(false);
      setEditingClient(null);
      toast({
        title: "Uspeh",
        description: "Podaci klijenta su uspešno ažurirani",
      });
    },
    onError: (error: Error) => {
      console.error("🔥 Mutation error:", error);
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredClients = clients.filter((client: Client) =>
    client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (client: Client) => {
    console.log("🔧 Opening edit for:", client);
    setEditingClient(client);
    setFormData({
      fullName: client.fullName,
      email: client.email || "",
      phone: client.phone,
      address: client.address,
      city: client.city,
      notes: client.notes || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    console.log("🔥 SAVE BUTTON CLICKED!");
    console.log("🔥 Form data:", formData);
    console.log("🔥 Editing client:", editingClient);
    
    if (!editingClient) {
      console.error("🔥 No editing client!");
      return;
    }

    updateClientMutation.mutate({
      id: editingClient.id,
      data: formData
    });
  };

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setIsViewDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-6">Učitavanje klijenata...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Klijenti</h1>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pretraži klijente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredClients.map((client: Client) => (
          <Card key={client.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{client.fullName}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(client)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Pogledaj
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(client)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Uredi
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Telefon:</strong> {client.phone}
                </div>
                <div>
                  <strong>Email:</strong> {client.email}
                </div>
                <div>
                  <strong>Adresa:</strong> {client.address}
                </div>
                <div>
                  <strong>Grad:</strong> {client.city}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uredi klijenta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Ime i prezime</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="address">Adresa</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="city">Grad</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Otkaži
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateClientMutation.isPending}
              >
                {updateClientMutation.isPending ? "Čuvam..." : "Sačuvaj izmene"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalji klijenta</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-2">
              <div><strong>Ime:</strong> {selectedClient.fullName}</div>
              <div><strong>Email:</strong> {selectedClient.email}</div>
              <div><strong>Telefon:</strong> {selectedClient.phone}</div>
              <div><strong>Adresa:</strong> {selectedClient.address}</div>
              <div><strong>Grad:</strong> {selectedClient.city}</div>
              {selectedClient.notes && (
                <div><strong>Napomene:</strong> {selectedClient.notes}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}