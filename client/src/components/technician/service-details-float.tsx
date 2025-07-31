import { useState, useEffect } from "react";
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
  Euro,
  MessageSquare
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CallClientButton } from "@/components/ui/call-client-button";
import { openMapWithAddress } from "@/lib/mobile-utils";
import { SparePartsOrderForm } from "@/components/spare-parts/SparePartsOrderForm";
import { RemovedPartsForm, RemovedPartsList } from "@/components/technician/removed-parts-form";
import { ServiceCompletionForm } from "@/components/technician/ServiceCompletionForm";

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
  const [sendingSMS, setSendingSMS] = useState(false);
  const [customerRefusesRepair, setCustomerRefusesRepair] = useState(false);
  const [customerRefusalReason, setCustomerRefusalReason] = useState("");
  const [showCompletionForm, setShowCompletionForm] = useState(false);

  // Debug tracking za showCompletionForm state
  useEffect(() => {
    console.log("🎯 DEBUG: showCompletionForm state promenjen:", showCompletionForm);
  }, [showCompletionForm]);

  const handleSendSMS = async (smsType: string) => {
    setSendingSMS(true);
    try {
      const response = await fetch('/api/sms/send-technician-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          serviceId: service.id,
          smsType: smsType
        })
      });

      if (response.ok) {
        alert('SMS je uspešno poslat klijentu');
      } else {
        const error = await response.json();
        alert(`Greška pri slanju SMS-a: ${error.error}`);
      }
    } catch (error) {
      console.error('SMS Error:', error);
      alert('Greška pri slanju SMS-a');
    } finally {
      setSendingSMS(false);
    }
  };

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

  const handleCompleteService = () => {
    console.log("🎯 DEBUG: handleCompleteService pozvan, trenutno showCompletionForm:", showCompletionForm);
    // Otvori completion form dialog umesto direktno zatvaranja servisa
    setShowCompletionForm(true);
    console.log("🎯 DEBUG: setShowCompletionForm(true) pozvan");
  };

  const handleCustomerRefusesRepair = async () => {
    if (!technicianNotes.trim()) {
      alert("Molimo unesite napomenu servisera");
      return;
    }

    if (!customerRefusalReason.trim()) {
      alert("Molimo navedite razlog zašto kupac odbija popravku");
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusUpdate(service.id, "completed", {
        technicianNotes: technicianNotes.trim(),
        usedParts: usedParts.trim() || null,
        machineNotes: machineNotes.trim() || null,
        cost: cost ? parseFloat(cost) : null,
        customerRefusesRepair: true,
        customerRefusalReason: customerRefusalReason.trim()
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
    openMapWithAddress(address, city);
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
            variant="default"
            size="lg"
            disabled={!service.client?.phone}
            showIcon={true}
            fullWidth={true}
            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 font-semibold h-12"
          />
          
          {service.client?.address && (
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => openClientLocation(service.client?.address || "", service.client?.city || null)}
              className="w-full h-12 font-semibold"
            >
              <MapPin className="h-5 w-5 mr-2" />
              Mapa
            </Button>
          )}
        </div>

        {/* SMS Komunikacija sa klijentom */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS Komunikacija
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendSMS('client_not_available')}
                disabled={!service.client?.phone || sendingSMS}
                className="w-full text-xs"
              >
                {sendingSMS ? 'Šalje...' : 'Klijent se ne javlja'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendSMS('client_no_answer')}
                disabled={!service.client?.phone || sendingSMS}
                className="w-full text-xs"
              >
                {sendingSMS ? 'Šalje...' : 'Klijent ne odgovara'}
              </Button>
            </div>
            
            {!service.client?.phone && (
              <p className="text-xs text-muted-foreground text-center">
                Nema broj telefona klijenta
              </p>
            )}
          </CardContent>
        </Card>

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

                {/* Customer Refusal Section */}
                {service.status === "in_progress" && (
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="customerRefuses"
                        checked={customerRefusesRepair}
                        onChange={(e) => setCustomerRefusesRepair(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="customerRefuses" className="text-sm font-medium text-orange-700">
                        Kupac odbija popravku
                      </label>
                    </div>
                    
                    {customerRefusesRepair && (
                      <div className="space-y-2 ml-6">
                        <label className="text-sm font-medium flex items-center text-orange-700">
                          Razlog odbijanja popravke: <span className="text-red-500 ml-1">*</span>
                        </label>
                        <Textarea
                          value={customerRefusalReason}
                          onChange={(e) => setCustomerRefusalReason(e.target.value)}
                          placeholder="Navedite razlog zašto kupac odbija popravku..."
                          className="min-h-[60px] text-sm resize-none border-orange-200 focus:border-orange-400"
                          required={customerRefusesRepair}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    Cena servisa (€): 
                    <span className={service.status === "in_progress" && !customerRefusesRepair ? "text-red-500 ml-1" : "text-gray-400 ml-1"}>
                      {service.status === "in_progress" && !customerRefusesRepair ? "*" : "(opciono)"}
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
                      required={service.status === "in_progress" && !customerRefusesRepair}
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
                    <div className="space-y-2">
                      {customerRefusesRepair ? (
                        <Button 
                          onClick={handleCustomerRefusesRepair}
                          disabled={isUpdating}
                          className="w-full bg-orange-600 hover:bg-orange-700"
                        >
                          {isUpdating ? (
                            <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full" />
                          ) : (
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                          )}
                          Završi - kupac odbija popravku
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleCompleteService}
                          disabled={isUpdating}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Završi servis
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* NEW SPARE PARTS ORDER - BUTTON VERSION */}
        {(service.status === "pending" || service.status === "assigned" || service.status === "scheduled" || service.status === "in_progress") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rezervni delovi</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  // Otvori dialog iz services.tsx
                  const event = new CustomEvent('openSparePartsDialog', {
                    detail: { serviceId: service.id }
                  });
                  window.dispatchEvent(event);
                }}
              >
                <Package className="h-4 w-4 mr-2" />
                Poruči rezervni deo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Removed Parts Management */}
        {(service.status === "assigned" || service.status === "scheduled" || service.status === "in_progress" || service.status === "device_parts_removed") && (
          <div className="space-y-4">
            <RemovedPartsForm
              serviceId={service.id}
              technicianId={service.assignedTechnicianId || 1} // Fallback to 1 if not available
              onSuccess={() => {
                // Refresh service data after successful part removal
              }}
            />
            <RemovedPartsList serviceId={service.id} />
          </div>
        )}


      </div>

      {/* Service Completion Form Dialog */}
      <ServiceCompletionForm
        service={service}
        isOpen={showCompletionForm}
        onClose={() => {
          console.log("🎯 DEBUG: ServiceCompletionForm onClose pozvan");
          setShowCompletionForm(false);
        }}
      />
    </FloatingSheet>
  );
}