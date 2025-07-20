import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FloatingSheet } from "@/components/ui/floating-sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ClipboardCheck, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Package,
  Wrench,
  FileText,
  Euro
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CallClientButton } from "@/components/ui/call-client-button";
import { openMapWithAddress } from "@/lib/mobile-utils";
import { SparePartsOrderForm } from "@/components/spare-parts/SparePartsOrderForm";

type ServiceDetailsFloatProps = {
  isOpen: boolean;
  onClose: () => void;
  service: any;
  onStatusUpdate: (serviceId: number, status: string, data: any) => void;
  getStatusBadge: (status: string) => JSX.Element;
};

export function ServiceDetailsFloat({
  isOpen,
  onClose,
  service,
  onStatusUpdate,
  getStatusBadge
}: ServiceDetailsFloatProps) {
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [usedParts, setUsedParts] = useState("");
  const [machineNotes, setMachineNotes] = useState("");
  const [cost, setCost] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStartService = async () => {
    if (!technicianNotes.trim()) {
      alert("Molimo unesite napomenu servisera");
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusUpdate(service.id, "in_progress", {
        technicianNotes: technicianNotes.trim(),
        usedParts: usedParts.trim() || null,
        machineNotes: machineNotes.trim() || null,
        cost: cost ? parseFloat(cost) : null
      });
      onClose();
    } catch (error) {
      console.error("Greška pri početku servisa:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteService = async () => {
    if (!technicianNotes.trim() || !usedParts.trim() || !machineNotes.trim() || !cost) {
      alert("Molimo popunite sva obavezna polja za završetak servisa");
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusUpdate(service.id, "completed", {
        technicianNotes: technicianNotes.trim(),
        usedParts: usedParts.trim(),
        machineNotes: machineNotes.trim(),
        cost: parseFloat(cost)
      });
      onClose();
    } catch (error) {
      console.error("Greška pri završetku servisa:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClientNotHome = async () => {
    const note = technicianNotes.trim() || "Klijent nije bio kući na adresi";
    
    setIsUpdating(true);
    try {
      await onStatusUpdate(service.id, "client_not_home", {
        technicianNotes: note,
        usedParts: null,
        machineNotes: null,
        cost: null
      });
      onClose();
    } catch (error) {
      console.error("Greška pri prijavi:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClientNotAnswering = async () => {
    const note = technicianNotes.trim() || "Klijent se ne javlja na telefon";
    
    setIsUpdating(true);
    try {
      await onStatusUpdate(service.id, "client_not_answering", {
        technicianNotes: note,
        usedParts: null,
        machineNotes: null,
        cost: null
      });
      onClose();
    } catch (error) {
      console.error("Greška pri prijavi:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const openClientLocation = (address: string, city: string | null) => {
    const fullAddress = city ? `${address}, ${city}` : address;
    openMapWithAddress(fullAddress);
  };

  if (!service) return null;

  return (
    <FloatingSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Servis: ${service.client?.fullName || 'Nepoznat klijent'}`}
      defaultSize={{ width: 450, height: 600 }}
      minSize={{ width: 350, height: 500 }}
    >
      <div className="space-y-4">
        {/* Osnovne informacije */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{service.client?.fullName}</CardTitle>
              {getStatusBadge(service.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Uređaj */}
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {service.appliance?.category?.name} {service.appliance?.model}
              </span>
            </div>

            {/* Opis problema */}
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Opis problema:</p>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </div>
            </div>

            {/* Datumi */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Kreiran: {formatDate(service.createdAt)}</span>
              </div>
              {service.scheduledDate && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Zakazan: {formatDate(service.scheduledDate)}</span>
                </div>
              )}
            </div>

            {/* Kontakt informacije */}
            <div className="border-t pt-3 mt-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Kontakt informacije:</span>
                </div>
                
                {service.client?.phone && (
                  <div className="flex items-center gap-2 ml-6">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{service.client.phone}</span>
                  </div>
                )}
                
                {service.client?.address && (
                  <div className="flex items-center gap-2 ml-6">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{service.client.address}, {service.client.city}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brze akcije */}
        <div className="grid grid-cols-2 gap-2">
          <CallClientButton 
            phoneNumber={service.client?.phone || ""}
            clientName={service.client?.fullName}
            variant="outline"
            size="sm"
            disabled={!service.client?.phone}
            showIcon={true}
            fullWidth={true}
          />
          
          {service.client?.address && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => openClientLocation(service.client?.address || "", service.client?.city || null)}
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Mapa
            </Button>
          )}
        </div>

        {/* Forma za ažuriranje statusa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {service.status === "pending" || service.status === "scheduled" 
                ? "Započni servis" 
                : service.status === "in_progress" 
                  ? "Završi servis" 
                  : "Detalji servisa"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(service.status === "pending" || service.status === "scheduled" || service.status === "in_progress") && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    Napomena servisera: <span className="text-red-500 ml-1">*</span>
                  </label>
                  <Textarea
                    value={technicianNotes}
                    onChange={(e) => setTechnicianNotes(e.target.value)}
                    placeholder="Unesite napomenu o servisu..."
                    className="min-h-[60px] text-sm resize-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    Ugrađeni rezervni delovi: 
                    <span className={service.status === "in_progress" ? "text-red-500 ml-1" : "text-gray-400 ml-1"}>
                      {service.status === "in_progress" ? "*" : "(opciono)"}
                    </span>
                  </label>
                  <Textarea
                    value={usedParts}
                    onChange={(e) => setUsedParts(e.target.value)}
                    placeholder="Navedite sve delove koje ste zamenili..."
                    className="min-h-[60px] text-sm resize-none"
                    required={service.status === "in_progress"}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    Napomene o stanju uređaja: 
                    <span className={service.status === "in_progress" ? "text-red-500 ml-1" : "text-gray-400 ml-1"}>
                      {service.status === "in_progress" ? "*" : "(opciono)"}
                    </span>
                  </label>
                  <Textarea
                    value={machineNotes}
                    onChange={(e) => setMachineNotes(e.target.value)}
                    placeholder="Unesite napomene o stanju uređaja..."
                    className="min-h-[60px] text-sm resize-none"
                    required={service.status === "in_progress"}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    Cena servisa (€): 
                    <span className={service.status === "in_progress" ? "text-red-500 ml-1" : "text-gray-400 ml-1"}>
                      {service.status === "in_progress" ? "*" : "(opciono)"}
                    </span>
                  </label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      inputMode="decimal"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2 text-sm border border-input rounded-md bg-background"
                      required={service.status === "in_progress"}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {(service.status === "pending" || service.status === "scheduled") && (
                    <>
                      <Button 
                        onClick={handleStartService}
                        disabled={isUpdating}
                        className="w-full"
                      >
                        {isUpdating ? (
                          <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full" />
                        ) : (
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                        )}
                        Započni servis
                      </Button>
                      
                      {/* Quick client issue buttons */}
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleClientNotHome}
                          disabled={isUpdating}
                          variant="outline"
                          className="flex-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                        >
                          {isUpdating ? (
                            <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-orange-600 rounded-full" />
                          ) : (
                            <MapPin className="h-4 w-4 mr-2" />
                          )}
                          Nije kući
                        </Button>
                        
                        <Button 
                          onClick={handleClientNotAnswering}
                          disabled={isUpdating}
                          variant="outline"
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                        >
                          {isUpdating ? (
                            <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-red-600 rounded-full" />
                          ) : (
                            <Phone className="h-4 w-4 mr-2" />
                          )}
                          Ne javlja se
                        </Button>
                      </div>
                    </>
                  )}
                  
                  {service.status === "in_progress" && (
                    <Button 
                      onClick={handleCompleteService}
                      disabled={isUpdating}
                      className="w-full"
                    >
                      {isUpdating ? (
                        <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full" />
                      ) : (
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                      )}
                      Završi servis
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Spare Parts Order Form */}
        {(service.status === "pending" || service.status === "assigned" || service.status === "scheduled" || service.status === "in_progress") && (
          <SparePartsOrderForm
            serviceId={service.id}
            onSuccess={() => {
              // Optional: refresh service data or show success message
            }}
            onCancel={() => {
              // Optional: handle cancel action
            }}
          />
        )}
      </div>
    </FloatingSheet>
  );
}