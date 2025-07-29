import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package, Plus, Minus, Truck, Clock, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface SparePartItem {
  id: number;
  partNumber: string;
  description: string;
  specificPart?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface SparePartsOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: number;
  clientName: string;
  applianceModel: string;
  applianceManufacturer?: string;
  applianceCategory?: string;
  technicianId: number;
}

export default function SparePartsOrderForm({
  isOpen,
  onClose,
  serviceId,
  clientName,
  applianceModel,
  applianceManufacturer = "",
  applianceCategory = "",
  technicianId
}: SparePartsOrderFormProps) {
  const [parts, setParts] = useState<SparePartItem[]>([]);
  const [newPart, setNewPart] = useState({
    partNumber: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    specificPart: ""
  });
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [supplierNotes, setSupplierNotes] = useState("");
  const [warrantyStatus, setWarrantyStatus] = useState<"u garanciji" | "van garancije">("u garanciji");
  const queryClient = useQueryClient();

  // Brand detection logika
  const detectBrand = (manufacturer: string): "beko" | "other" => {
    const manufacturerLower = manufacturer.toLowerCase();
    if (manufacturerLower.includes("beko")) {
      return "beko";
    }
    // Electrolux, Elica, Candy, Hoover, Turbo Air idu na Complus
    if (manufacturerLower.includes("electrolux") || 
        manufacturerLower.includes("elica") || 
        manufacturerLower.includes("candy") || 
        manufacturerLower.includes("hoover") || 
        manufacturerLower.includes("turbo air")) {
      return "other";
    }
    // Default na ostale brendove za nepoznate brendove
    return "other";
  };

  const submitOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest("POST", "/api/spare-parts", orderData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts"] });
      toast({
        title: "Zahtev poslat",
        description: "Zahtev za rezervne delove je uspešno poslat administratoru.",
      });
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const addPart = () => {
    if (!newPart.partNumber || !newPart.description) {
      toast({
        title: "Greška",
        description: "Šifra dela i opis su obavezni",
        variant: "destructive",
      });
      return;
    }

    const totalPrice = newPart.quantity * newPart.unitPrice;
    const part: SparePartItem = {
      id: Date.now(), // Temporary ID
      partNumber: newPart.partNumber,
      description: newPart.description,
      specificPart: newPart.specificPart,
      quantity: newPart.quantity,
      unitPrice: newPart.unitPrice,
      totalPrice
    };

    setParts([...parts, part]);
    setNewPart({
      partNumber: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      specificPart: ""
    });
  };

  const removePart = (id: number) => {
    setParts(parts.filter(part => part.id !== id));
  };

  const updatePartQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setParts(parts.map(part => 
      part.id === id 
        ? { ...part, quantity: newQuantity, totalPrice: newQuantity * part.unitPrice }
        : part
    ));
  };

  const getTotalOrderValue = () => {
    return parts.reduce((sum, part) => sum + part.totalPrice, 0);
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "high":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Hitno</Badge>;
      case "medium":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Srednje</Badge>;
      case "low":
        return <Badge variant="outline"><Package className="h-3 w-3 mr-1" />Nisko</Badge>;
      default:
        return null;
    }
  };

  const handleSubmit = () => {
    if (parts.length === 0) {
      toast({
        title: "Greška",
        description: "Dodajte bar jedan rezervni deo u zahtev",
        variant: "destructive",
      });
      return;
    }

    // Koristi prvi deo za osnovne informacije (pojednostavljena logika)
    const firstPart = parts[0];
    const brand = detectBrand(applianceManufacturer);
    
    // Kreiraj detaljni opis koji uključuje specifikacije
    let detailedDescription = parts.map(part => {
      let partDesc = `${part.partNumber}: ${part.description} (${part.quantity}x)`;
      if (part.specificPart) {
        partDesc += `\n  Specifikacija: ${part.specificPart}`;
      }
      return partDesc;
    }).join('\n');
    
    if (supplierNotes) {
      detailedDescription += `\n\nNapomene: ${supplierNotes}`;
    }

    const orderData = {
      serviceId,
      technicianId,
      partName: firstPart.description,
      partNumber: firstPart.partNumber,
      specificPart: firstPart.specificPart || "",
      quantity: parts.reduce((sum, part) => sum + part.quantity, 0),
      description: detailedDescription,
      urgency: urgency === "high" ? "high" : urgency === "low" ? "low" : "normal",
      warrantyStatus,
      brand,
      deviceModel: applianceModel,
      productCode: firstPart.partNumber,
      applianceCategory: applianceCategory || "Nespecifikovano"
    };

    submitOrderMutation.mutate(orderData);
  };

  const resetForm = () => {
    setParts([]);
    setNewPart({
      partNumber: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      specificPart: ""
    });
    setUrgency("medium");
    setSupplierNotes("");
    setWarrantyStatus("u garanciji");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Zahtev za rezervne delove
          </DialogTitle>
          <DialogDescription>
            Dodajte potrebne rezervne delove u listu, odaberite nivo hitnosti i pošaljite zahtev administratoru.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informacije o servisu */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Informacije o servisu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Klijent:</span>
                <span className="text-sm font-medium">{clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Uređaj:</span>
                <span className="text-sm font-medium">{applianceModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Servis ID:</span>
                <span className="text-sm font-medium">#{serviceId}</span>
              </div>
            </CardContent>
          </Card>

          {/* Dodaj novi deo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Dodaj rezervni deo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="partNumber" className="text-xs">Šifra dela</Label>
                  <Input
                    id="partNumber"
                    value={newPart.partNumber}
                    onChange={(e) => setNewPart({...newPart, partNumber: e.target.value})}
                    placeholder="npr. W10348269"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity" className="text-xs">Količina</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={newPart.quantity}
                    onChange={(e) => setNewPart({...newPart, quantity: parseInt(e.target.value) || 1})}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description" className="text-xs">Opis dela</Label>
                <Input
                  id="description"
                  value={newPart.description}
                  onChange={(e) => setNewPart({...newPart, description: e.target.value})}
                  placeholder="npr. Pumpa za pranje sudova"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="specificPart" className="text-xs">Specifikacija dela (opcionalno)</Label>
                <Textarea
                  id="specificPart"
                  value={newPart.specificPart}
                  onChange={(e) => setNewPart({...newPart, specificPart: e.target.value})}
                  placeholder="Specificirajte tačno koji deo vam treba - npr: elektronska kartica glavna sa kondenzatorom, motor za centrifugu, grejač donji sa senzorom temperature, itd."
                  className="mt-1 min-h-[60px]"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="unitPrice" className="text-xs">Jedinična cena (€)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPart.unitPrice}
                  onChange={(e) => setNewPart({...newPart, unitPrice: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
              <Button onClick={addPart} className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Dodaj deo
              </Button>
            </CardContent>
          </Card>

          {/* Lista delova */}
          {parts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Rezervni delovi ({parts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {parts.map((part) => (
                    <div key={part.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{part.partNumber}</div>
                        <div className="text-xs text-gray-600">{part.description}</div>
                        {part.specificPart && (
                          <div className="text-xs text-blue-600 mt-1 italic">
                            Specifikacija: {part.specificPart}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {part.quantity} × {part.unitPrice.toFixed(2)}€ = {part.totalPrice.toFixed(2)}€
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updatePartQuantity(part.id, part.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="mx-2 text-sm">{part.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updatePartQuantity(part.id, part.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removePart(part.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between items-center font-medium">
                  <span>Ukupno:</span>
                  <span>{getTotalOrderValue().toFixed(2)}€</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prioritet i napomene */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Detalji zahteva</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="warrantyStatus" className="text-xs">Status garancije</Label>
                <Select value={warrantyStatus} onValueChange={(value: "u garanciji" | "van garancije") => setWarrantyStatus(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="u garanciji">
                      <div className="flex items-center gap-2">
                        <span>🛡️</span>
                        <span className="text-green-700">U garanciji</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="van garancije">
                      <div className="flex items-center gap-2">
                        <span>💰</span>
                        <span className="text-red-700">Van garancije</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="urgency" className="text-xs">Prioritet</Label>
                <Select value={urgency} onValueChange={(value: "low" | "medium" | "high") => setUrgency(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Nisko</SelectItem>
                    <SelectItem value="medium">Srednje</SelectItem>
                    <SelectItem value="high">Hitno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="supplierNotes" className="text-xs">Napomene za dobavljača</Label>
                <Textarea
                  id="supplierNotes"
                  value={supplierNotes}
                  onChange={(e) => setSupplierNotes(e.target.value)}
                  placeholder="Dodatne informacije o potrebnim delovima..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Otkaži
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={parts.length === 0 || submitOrderMutation.isPending}
            className="flex items-center gap-2"
          >
            {submitOrderMutation.isPending ? (
              <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full" />
            ) : (
              <Truck className="h-4 w-4" />
            )}
            Pošalji zahtev ({parts.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}