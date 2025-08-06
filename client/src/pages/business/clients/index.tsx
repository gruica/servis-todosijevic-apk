import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, apiRequestWithAuth } from "@/lib/queryClient";
import BusinessLayout from "@/components/layout/business-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Phone, 
  Mail, 
  MapPin,
  User,
  Calendar,
  Building2
} from "lucide-react";

// Types
interface Client {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Edit client schema
const editClientSchema = z.object({
  fullName: z.string()
    .min(3, "Ime i prezime klijenta je obavezno - minimum 3 karaktera")
    .max(100, "Ime i prezime je predugačko - maksimum 100 karaktera")
    .regex(/^[a-zA-ZčćžšđČĆŽŠĐ\s-]+$/, "Ime i prezime može sadržavati samo slova, razmake i crtice"),
  phone: z.string()
    .min(6, "Telefon klijenta je obavezan - minimum 6 cifara")
    .regex(/^[0-9+\s()-]{6,20}$/, "Unesite ispravan format telefona"),
  email: z.string()
    .email("Unesite važeću email adresu")
    .optional()
    .or(z.literal("")),
  address: z.string()
    .min(5, "Adresa klijenta je obavezna - minimum 5 karaktera")
    .max(100, "Adresa je predugačka - maksimum 100 karaktera")
    .refine(val => val.trim().length > 0, "Adresa ne može biti prazna"),
  city: z.string()
    .min(2, "Grad klijenta je obavezan - minimum 2 karaktera")
    .max(50, "Ime grada je predugačko - maksimum 50 karaktera")
    .regex(/^[a-zA-ZčćžšđČĆŽŠĐ\s-]+$/, "Grad može sadržavati samo slova, razmake i crtice"),
  notes: z.string().max(500, "Napomene su predugačke - maksimum 500 karaktera").optional().or(z.literal(""))
});

type EditClientFormValues = z.infer<typeof editClientSchema>;

export default function BusinessClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Fetch clients
  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/business/clients"],
    enabled: true,
  });

  // Edit form
  const editForm = useForm<EditClientFormValues>({
    resolver: zodResolver(editClientSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      notes: ""
    },
  });

  // Update mutation
  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EditClientFormValues }) => {
      console.log("🔄 Business Partner - pokušavam ažuriranje klijenta:", { id, data });
      console.log("🔄 Podaci koji se šalju:", JSON.stringify(data, null, 2));
      
      try {
        const response = await apiRequest(`/api/business/clients/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        
        console.log("📡 API Response status:", response.status);
        console.log("📡 API Response statusText:", response.statusText);
        console.log("📡 API Response ok:", response.ok);
        
        if (!response.ok) {
          console.error("❌ Response status:", response.status);
          console.error("❌ Response statusText:", response.statusText);
          
          // Pokušavam da dohvatim error response kao text prvo
          const responseText = await response.text();
          console.error("❌ Raw response text:", responseText);
          
          let errorData;
          try {
            errorData = JSON.parse(responseText);
            console.error("❌ Parsed error data:", errorData);
          } catch (parseError) {
            console.error("❌ JSON parse error:", parseError);
            console.error("❌ Response is not valid JSON:", responseText);
            throw new Error(`Server vrateo invalid response: ${responseText}`);
          }
          
          throw new Error(errorData?.message || `Greška ${response.status}: ${response.statusText}`);
        }
        
        const responseText = await response.text();
        console.log("✅ Raw success response:", responseText);
        
        let result;
        try {
          result = JSON.parse(responseText);
          console.log("✅ Parsed success response:", result);
        } catch (parseError) {
          console.error("❌ Success response JSON parse error:", parseError);
          throw new Error(`Server vrateo invalid JSON: ${responseText}`);
        }
        
        return result;
      } catch (error) {
        console.error("❌ Mutation error:", error);
        throw error;
      }
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
      toast({
        title: "Greška pri ažuriranju",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter clients based on search
  const filteredClients = (clients as Client[]).filter((client: Client) =>
    client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (client: Client) => {
    console.log("🔧 Opening edit dialog for client:", client);
    setEditingClient(client);
    const formData = {
      fullName: client.fullName,
      phone: client.phone,
      email: client.email || "",
      address: client.address,
      city: client.city,
      notes: client.notes || ""
    };
    console.log("🔧 Setting form data:", formData);
    editForm.reset(formData);
    setIsEditDialogOpen(true);
  };

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setIsViewDialogOpen(true);
  };

  const onEditSubmit = (values: EditClientFormValues) => {
    console.log("🟢🟢🟢 onEditSubmit FUNCTION CALLED! 🟢🟢🟢");
    console.log("📝 Form values:", values);
    console.log("👤 Editing client:", editingClient);
    console.log("🔧 Mutation isPending:", updateClientMutation.isPending);
    
    if (editingClient) {
      console.log("🚀🚀🚀 POZIVAM updateClientMutation.mutate 🚀🚀🚀");
      updateClientMutation.mutate({ id: editingClient.id, data: values });
    } else {
      console.error("❌❌❌ NEMA editingClient objekta! ❌❌❌");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Moji klijenti</h1>
            <p className="text-muted-foreground">
              Pregled i upravljanje klijentima
            </p>
          </div>
          <Button onClick={() => navigate("/business/clients/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Dodaj klijenta
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Pretraži klijente po imenu, telefonu, email-u ili adresi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            Osveži
          </Button>
        </div>

        {/* Clients List */}
        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">Učitavanje klijenata...</div>
              </CardContent>
            </Card>
          ) : filteredClients.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  {searchTerm ? "Nema klijenata koji odgovaraju pretragi" : "Nemate unesene klijente"}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredClients.map((client: Client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <User className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold">{client.fullName}</h3>
                        <Badge variant="outline">
                          <Building2 className="w-3 h-3 mr-1" />
                          Klijent
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-green-600" />
                          <span className="font-medium">{client.phone}</span>
                        </div>
                        
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-blue-600" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-600" />
                          <span>{client.address}, {client.city}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-600" />
                          <span>Kreiran: {formatDate(client.createdAt)}</span>
                        </div>
                      </div>
                      
                      {client.notes && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                          <strong>Napomene:</strong> {client.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(client)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(client)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* View Client Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Detalji klijenta</DialogTitle>
              <DialogDescription>
                Pregled podataka o klijentu
              </DialogDescription>
            </DialogHeader>
            
            {selectedClient && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Ime i prezime</label>
                  <p className="text-base">{selectedClient.fullName}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Telefon</label>
                  <p className="text-base">{selectedClient.phone}</p>
                </div>
                
                {selectedClient.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-base">{selectedClient.email}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Adresa</label>
                  <p className="text-base">{selectedClient.address}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Grad</label>
                  <p className="text-base">{selectedClient.city}</p>
                </div>
                
                {selectedClient.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Napomene</label>
                    <p className="text-base">{selectedClient.notes}</p>
                  </div>
                )}
                
                <div className="border-t pt-3 text-xs text-gray-500">
                  <p>Kreiran: {formatDate(selectedClient.createdAt)}</p>
                  <p>Poslednja izmena: {formatDate(selectedClient.updatedAt)}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Client Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Izmeni podatke klijenta</DialogTitle>
              <DialogDescription>
                Ažuriraj podatke o klijentu
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((values) => {
                console.log("🎯 FORM SUBMIT EVENT TRIGGERED!");
                console.log("📋 Form valid:", editForm.formState.isValid);
                console.log("📋 Form errors:", editForm.formState.errors);
                console.log("📝 Form values from handleSubmit:", values);
                onEditSubmit(values);
              })} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ime i prezime *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Marko Petrović" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+381 63 123 4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email adresa</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="marko.petrovic@email.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresa *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Kralja Petra 15" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grad *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Novi Sad" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Napomene</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Dodatne informacije o klijentu..."
                          className="min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Otkaži
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateClientMutation.isPending}
                    onClick={async (e) => {
                      console.log("🔴🔴🔴 SUBMIT BUTTON CLICKED! 🔴🔴🔴");
                      console.log("🔴 Form errors:", editForm.formState.errors);
                      console.log("🔴 Form is valid:", editForm.formState.isValid);
                      console.log("🔴 Form values:", editForm.getValues());
                      console.log("🔴 editingClient:", editingClient);
                      
                      // Force trigger form submission manually ako se automatski ne pokreće
                      e.preventDefault();
                      const isValid = await editForm.trigger();
                      console.log("🔴 Manual trigger result:", isValid);
                      if (isValid) {
                        const values = editForm.getValues();
                        console.log("🔴 Manual submit with values:", values);
                        onEditSubmit(values);
                      } else {
                        console.log("🔴 Form is not valid:", editForm.formState.errors);
                      }
                    }}
                  >
                    {updateClientMutation.isPending ? "Čuvam..." : "Sačuvaj izmene"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </BusinessLayout>
  );
}