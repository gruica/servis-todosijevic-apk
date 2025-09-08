import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import BusinessLayout from "@/components/layout/business-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, Settings, Plus, Package, User, Phone, Mail, MapPin, Wrench } from "lucide-react";

// Com Plus brendovi
const COM_PLUS_BRANDS = [
  { id: 1, name: "Electrolux" },
  { id: 2, name: "Elica" },
  { id: 3, name: "Candy" },
  { id: 4, name: "Hoover" },
  { id: 5, name: "Turbo Air" }
];

// Kategorije aparata
const APPLIANCE_CATEGORIES = [
  { id: 1, name: "Frižider" },
  { id: 2, name: "Veš mašina" },
  { id: 3, name: "Sudo mašina" },
  { id: 4, name: "Šporet" },
  { id: 5, name: "Aspirator" },
  { id: 6, name: "Mikrotalasna" },
  { id: 7, name: "Klima uređaj" }
];

interface FormData {
  // Client data
  clientId?: string;
  clientFullName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  
  // Appliance data
  applianceId?: string;
  categoryId: string;
  manufacturerId: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  applianceNotes: string;
  
  // Service data
  description: string;
}

export default function BusinessComplus() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    clientFullName: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
    clientCity: "",
    categoryId: "",
    manufacturerId: "",
    model: "",
    serialNumber: "",
    purchaseDate: "",
    applianceNotes: "",
    description: ""
  });

  // Dohvatanje postojećih klijenata
  const { data: existingClients = [] } = useQuery<any[]>({
    queryKey: ["/api/business/clients"],
    enabled: !!user?.id,
  });

  // Dohvatanje postojećih aparata
  const { data: existingAppliances = [] } = useQuery<any[]>({
    queryKey: ["/api/appliances"],
    enabled: !!user?.id,
  });

  // Mutation za kreiranje Com Plus servisa
  const createComplusServiceMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // ComPlus service creation initiated
      
      return await apiRequest("/api/complus/services", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (response) => {
      // Service successfully created
      toast({
        title: "Uspešno!",
        description: "Com Plus servis je prosleđen Teodori Todosijević",
      });
      
      // Reset form
      setFormData({
        clientFullName: "",
        clientPhone: "",
        clientEmail: "",
        clientAddress: "",
        clientCity: "",
        categoryId: "",
        manufacturerId: "",
        model: "",
        serialNumber: "",
        purchaseDate: "",
        applianceNotes: "",
        description: ""
      });
      
      // Navigate to main business page
      navigate("/business");
    },
    onError: (error: any) => {
      // Error handled by toast notification
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri kreiranju Com Plus servisa",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.description.trim()) {
      toast({
        title: "Greška",
        description: "Opis servisa je obavezan",
        variant: "destructive",
      });
      return;
    }

    if (!formData.clientFullName.trim() || !formData.clientPhone.trim()) {
      toast({
        title: "Greška", 
        description: "Ime klijenta i telefon su obavezni",
        variant: "destructive",
      });
      return;
    }

    if (!formData.categoryId || !formData.manufacturerId) {
      toast({
        title: "Greška",
        description: "Kategorija aparata i proizvođač su obavezni",
        variant: "destructive",
      });
      return;
    }

    createComplusServiceMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/business")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Settings className="h-6 w-6 text-blue-600" />
                Com Plus servisni zahtev
              </h2>
              <p className="text-muted-foreground">
                Kreiranje servisa za Com Plus brendove (Electrolux, Elica, Candy, Hoover, Turbo Air)
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/business/spare-parts")}
            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
          >
            <Wrench className="h-4 w-4 mr-2" />
            Rezervni delovi
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Podaci o klijentu */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Podaci o klijentu
              </CardTitle>
              <CardDescription>
                Unesite kontakt podatke klijenta za Com Plus servis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientFullName">Ime i prezime *</Label>
                  <Input
                    id="clientFullName"
                    value={formData.clientFullName}
                    onChange={(e) => handleInputChange("clientFullName", e.target.value)}
                    placeholder="Unesite ime i prezime klijenta"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="clientPhone">Telefon *</Label>
                  <Input
                    id="clientPhone"
                    value={formData.clientPhone}
                    onChange={(e) => handleInputChange("clientPhone", e.target.value)}
                    placeholder="067123456"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => handleInputChange("clientEmail", e.target.value)}
                    placeholder="klijent@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="clientCity">Grad</Label>
                  <Input
                    id="clientCity"
                    value={formData.clientCity}
                    onChange={(e) => handleInputChange("clientCity", e.target.value)}
                    placeholder="Kotor, Tivat, Budva..."
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="clientAddress">Adresa</Label>
                <Input
                  id="clientAddress"
                  value={formData.clientAddress}
                  onChange={(e) => handleInputChange("clientAddress", e.target.value)}
                  placeholder="Unesite adresu klijenta"
                />
              </div>
            </CardContent>
          </Card>

          {/* Podaci o aparatu */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Podaci o aparatu
              </CardTitle>
              <CardDescription>
                Specifikacije Com Plus aparata koji zahteva servis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoryId">Kategorija aparata *</Label>
                  <Select value={formData.categoryId} onValueChange={(value) => handleInputChange("categoryId", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite kategoriju" />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLIANCE_CATEGORIES.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="manufacturerId">Com Plus brend *</Label>
                  <Select value={formData.manufacturerId} onValueChange={(value) => handleInputChange("manufacturerId", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite brend" />
                    </SelectTrigger>
                    <SelectContent>
                      {COM_PLUS_BRANDS.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model">Model aparata</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange("model", e.target.value)}
                    placeholder="EWF1287HDW"
                  />
                </div>
                <div>
                  <Label htmlFor="serialNumber">Serijski broj</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => handleInputChange("serialNumber", e.target.value)}
                    placeholder="S/N broj aparata"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseDate">Datum kupovine</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => handleInputChange("purchaseDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="applianceNotes">Napomene o aparatu</Label>
                  <Input
                    id="applianceNotes"
                    value={formData.applianceNotes}
                    onChange={(e) => handleInputChange("applianceNotes", e.target.value)}
                    placeholder="Dodatne informacije"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Opis servisa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Opis servisa
              </CardTitle>
              <CardDescription>
                Detaljan opis problema i zahteva za servis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="description">Opis problema *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Detaljno opišite problem sa aparatom, simptome kvara, i ostale važne informacije..."
                  rows={4}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Dugmad */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/business")}
            >
              Otkaži
            </Button>
            <Button
              type="submit"
              disabled={createComplusServiceMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createComplusServiceMutation.isPending ? (
                "Šalje se..."
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Pošalji Com Plus zahtev
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </BusinessLayout>
  );
}