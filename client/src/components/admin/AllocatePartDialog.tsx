import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface AllocatePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: {
    id: number;
    partName: string;
    quantity: number;
    location: string;
  };
}

interface Service {
  id: number;
  clientName: string;
  deviceType: string;
  problemDescription: string;
  status: string;
}

interface Technician {
  id: number;
  fullName: string;
  phone: string;
  email: string;
}

export default function AllocatePartDialog({ open, onOpenChange, part }: AllocatePartDialogProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      fetchData();
      setQuantity(1);
      setSelectedServiceId("");
      setSelectedTechnicianId("");
    }
  }, [open]);

  const fetchData = async () => {
    try {
      // Fetch active services
      const servicesResponse = await fetch('/api/admin/services', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        const activeServices = servicesData.filter((service: any) => 
          ['pending', 'assigned', 'in_progress', 'waiting_parts'].includes(service.status)
        );
        setServices(activeServices);
      }

      // Fetch technicians
      const techniciansResponse = await fetch('/api/technicians', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (techniciansResponse.ok) {
        const techniciansData = await techniciansResponse.json();
        setTechnicians(techniciansData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Greška",
        description: "Greška pri učitavanju podataka",
        variant: "destructive"
      });
    }
  };

  const handleAllocate = async () => {
    if (!selectedServiceId || !selectedTechnicianId || quantity <= 0) {
      toast({
        title: "Greška",
        description: "Molimo izaberite servis, servisera i unesite validnu količinu",
        variant: "destructive"
      });
      return;
    }

    if (quantity > part.quantity) {
      toast({
        title: "Greška",
        description: `Maksimalna količina je ${part.quantity}`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest(`/api/admin/available-parts/${part.id}/allocate`, {
        method: 'POST',
        body: JSON.stringify({
          serviceId: parseInt(selectedServiceId),
          technicianId: parseInt(selectedTechnicianId),
          quantity
        })
      });

      if (response.success) {
        toast({
          title: "Uspeh",
          description: `Deo je uspešno dodeljen serviseru. Preostala količina: ${response.remainingQuantity}`,
          variant: "default"
        });

        // Refresh parts data
        queryClient.invalidateQueries({ queryKey: ['/api/admin/available-parts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts/activity'] });
        
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error allocating part:', error);
      toast({
        title: "Greška",
        description: error.message || "Greška pri dodeli dela serviseru",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedService = services.find(s => s.id.toString() === selectedServiceId);
  const selectedTechnician = technicians.find(t => t.id.toString() === selectedTechnicianId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Dodeli deo serviseru</DialogTitle>
          <DialogDescription>
            Dodelite deo "{part.partName}" serviseru za određeni servis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Part Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Informacije o delu:</h4>
            <p><strong>Naziv:</strong> {part.partName}</p>
            <p><strong>Dostupna količina:</strong> {part.quantity}</p>
            <p><strong>Lokacija:</strong> {part.location}</p>
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">Izaberite servis:</Label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Izaberite servis..." />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    #{service.id} - {service.clientName} ({service.deviceType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Technician Selection */}
          <div className="space-y-2">
            <Label htmlFor="technician">Izaberite servisera:</Label>
            <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
              <SelectTrigger>
                <SelectValue placeholder="Izaberite servisera..." />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((technician) => (
                  <SelectItem key={technician.id} value={technician.id.toString()}>
                    {technician.fullName} ({technician.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Količina:</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={part.quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="Unesite količinu..."
            />
          </div>

          {/* Summary */}
          {selectedService && selectedTechnician && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Pregled dodele:</h4>
              <p><strong>Servis:</strong> #{selectedService.id} - {selectedService.clientName}</p>
              <p><strong>Uređaj:</strong> {selectedService.deviceType}</p>
              <p><strong>Serviser:</strong> {selectedTechnician.fullName}</p>
              <p><strong>Količina:</strong> {quantity} x {part.partName}</p>
              <p><strong>SMS obaveštenja:</strong> Klijent, serviser i administratori</p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Otkaži
          </Button>
          <Button onClick={handleAllocate} disabled={loading || !selectedServiceId || !selectedTechnicianId}>
            {loading ? "Dodeljujem..." : "Dodeli deo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}