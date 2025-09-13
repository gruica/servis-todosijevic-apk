import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Package, 
  Wrench, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  Settings,
  Truck,
  AlertTriangle,
  MessageSquare,
  Receipt,
  Shield
} from "lucide-react";

// Tip za proširene podatke servisa sa svim detaljima
interface EnhancedServiceData {
  id: number;
  description: string;
  problem?: string;
  status: string;
  createdAt: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  technicianNotes?: string;
  cost?: string;
  isCompletelyFixed?: boolean;
  warrantyStatus?: string;
  usedParts?: string;
  machineNotes?: string;
  devicePickedUp?: boolean;
  pickupDate?: string;
  pickupNotes?: string;
  customerRefusalReason?: string;
  
  // Vezani objekti
  client?: {
    id: number;
    fullName: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
  };
  appliance?: {
    id: number;
    model: string;
    serialNumber?: string;
  };
  technician?: {
    id?: number;
    fullName: string;
    phone?: string;
    email?: string;
    specialization?: string;
  };
  category?: {
    id: number;
    name: string;
  };
  manufacturer?: {
    id: number;
    name: string;
  };
  
  // Prošireni detalji
  spareParts?: Array<{
    partName: string;
    quantity?: number;
    productCode?: string;
    urgency?: string;
    warrantyStatus?: string;
    status: string;
    orderDate?: string;
    estimatedDeliveryDate?: string;
    actualDeliveryDate?: string;
  }>;
  removedParts?: Array<{
    partName: string;
    removalReason: string;
    currentLocation?: string;
    removalDate: string;
    returnDate?: string;
    status: string;
    repairCost?: string;
  }>;
  workTimeline?: Array<{
    date: string;
    event: string;
    status: string;
  }>;
  statusHistory?: Array<{
    id: number;
    oldStatus: string;
    newStatus: string;
    notes?: string;
    createdAt: string;
    createdBy?: string;
  }>;
}

interface EnhancedServiceDialogProps {
  service: EnhancedServiceData | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  showActions?: boolean;
}

// Helper funkcija za prevod statusa
function translateStatus(status: string) {
  const statusMap: Record<string, string> = {
    pending: "Na čekanju",
    assigned: "Dodeljen",
    scheduled: "Zakazan",
    in_progress: "U toku",
    waiting_parts: "Čeka delove",
    completed: "Završen",
    cancelled: "Otkazan",
    customer_refused_repair: "Klijent odbio popravku"
  };
  return statusMap[status] || status;
}

// Status badge komponenta
function StatusBadge({ status }: { status: string }) {
  let bgColor = "";
  
  switch (status) {
    case "pending":
      bgColor = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      break;
    case "assigned":
      bgColor = "bg-blue-100 text-blue-800 hover:bg-blue-200";
      break;
    case "scheduled":
      bgColor = "bg-purple-100 text-purple-800 hover:bg-purple-200";
      break;
    case "in_progress":
      bgColor = "bg-indigo-100 text-indigo-800 hover:bg-indigo-200";
      break;
    case "waiting_parts":
      bgColor = "bg-orange-100 text-orange-800 hover:bg-orange-200";
      break;
    case "completed":
      bgColor = "bg-green-100 text-green-800 hover:bg-green-200";
      break;
    case "cancelled":
      bgColor = "bg-red-100 text-red-800 hover:bg-red-200";
      break;
    case "customer_refused_repair":
      bgColor = "bg-gray-100 text-gray-800 hover:bg-gray-200";
      break;
    default:
      bgColor = "bg-gray-100 text-gray-800 hover:bg-gray-200";
      break;
  }
  
  return (
    <Badge variant="outline" className={`${bgColor} border-0 py-1 px-3`}>
      {translateStatus(status)}
    </Badge>
  );
}

export default function EnhancedServiceDialog({ 
  service, 
  isOpen, 
  onClose, 
  onEdit, 
  showActions = true 
}: EnhancedServiceDialogProps) {
  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Servis #{service.id}</span>
            <StatusBadge status={service.status} />
          </DialogTitle>
          <DialogDescription>
            Kompletne informacije o servisu i trenutnom statusu
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Osnovne informacije */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Klijent */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Klijent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-medium text-gray-900">{service.client?.fullName || "Nepoznat"}</div>
                {service.client?.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    {service.client.phone}
                  </div>
                )}
                {service.client?.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    {service.client.email}
                  </div>
                )}
                {service.client?.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {service.client.address}, {service.client.city}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Uređaj */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Uređaj
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-medium text-gray-900">
                  {service.manufacturer?.name} {service.appliance?.model}
                </div>
                <div className="text-sm text-gray-600">{service.category?.name}</div>
                {service.appliance?.serialNumber && (
                  <div className="text-sm text-gray-600">
                    SN: {service.appliance.serialNumber}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Opis problema */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-600" />
                Opis problema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-md border">
                {service.description}
              </p>
            </CardContent>
          </Card>

          {/* Serviser i radni detalji */}
          {service.technician && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-purple-600" />
                  Serviser
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-medium text-gray-900">{service.technician.fullName}</div>
                {service.technician.specialization && (
                  <div className="text-sm text-gray-600">{service.technician.specialization}</div>
                )}
                {service.technician.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    {service.technician.phone}
                  </div>
                )}
                {service.technician.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    {service.technician.email}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rezervni delovi */}
          {service.spareParts && service.spareParts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Rezervni delovi ({service.spareParts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {service.spareParts.map((part, index) => (
                    <div key={index} className="bg-blue-50 p-3 rounded-md border border-blue-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">{part.partName}</div>
                        <Badge variant="outline" className={
                          part.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          part.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }>
                          {part.status === 'delivered' ? 'Isporučen' :
                           part.status === 'ordered' ? 'Naručen' : 'Čeka se'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        {part.quantity && <div>Količina: {part.quantity}</div>}
                        {part.productCode && <div>Šifra: {part.productCode}</div>}
                        {part.warrantyStatus && <div>Garancija: {part.warrantyStatus}</div>}
                        {part.estimatedDeliveryDate && (
                          <div>Očekivana isporuka: {formatDate(part.estimatedDeliveryDate)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Uklonjeni delovi */}
          {Array.isArray(service.removedParts) && service.removedParts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-red-600" />
                  Uklonjeni delovi ({service.removedParts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {service.removedParts.map((part, index) => (
                    <div key={index} className="bg-red-50 p-3 rounded-md border border-red-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">{part.partName}</div>
                        <Badge variant="outline" className="bg-red-100 text-red-800">
                          {part.status || 'Uklojen'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Razlog: {part.removalReason}</div>
                        {part.currentLocation && <div>Lokacija: {part.currentLocation}</div>}
                        <div>Datum uklanjanja: {formatDate(part.removalDate)}</div>
                        {part.repairCost && <div>Troškovi popravke: {part.repairCost}€</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vremenska linija */}
          {service.workTimeline && service.workTimeline.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  Vremenska linija
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {service.workTimeline.map((event, index) => (
                    <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        event.status === 'completed' ? 'bg-green-500' :
                        event.status === 'in_progress' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{event.event}</div>
                        <div className="text-sm text-gray-500">{formatDate(event.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dodatni detalji */}
          {(service.usedParts || service.machineNotes || service.technicianNotes) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  Tehnički detalji
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {service.usedParts && (
                  <div>
                    <div className="font-medium text-gray-900 mb-1">Korišćeni delovi</div>
                    <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-md border border-green-200">
                      {service.usedParts}
                    </p>
                  </div>
                )}
                {service.machineNotes && (
                  <div>
                    <div className="font-medium text-gray-900 mb-1">Tehnička napomena</div>
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md border border-blue-200">
                      {service.machineNotes}
                    </p>
                  </div>
                )}
                {service.technicianNotes && (
                  <div>
                    <div className="font-medium text-gray-900 mb-1">Napomena servisera</div>
                    <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                      {service.technicianNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status završetka i preuzimanje */}
          {service.status === 'completed' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Status završetka
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {service.isCompletelyFixed !== null && (
                  <div className="flex items-center gap-2">
                    {service.isCompletelyFixed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    )}
                    <span className={`font-medium ${service.isCompletelyFixed ? 'text-green-600' : 'text-orange-600'}`}>
                      {service.isCompletelyFixed ? 'Uređaj je potpuno popravljen' : 'Uređaj nije potpuno popravljen'}
                    </span>
                  </div>
                )}
                {service.warrantyStatus && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700">Garancija: {service.warrantyStatus}</span>
                  </div>
                )}
                {service.devicePickedUp && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-purple-600" />
                    <span className="text-gray-700">
                      Uređaj preuzet {service.pickupDate ? `- ${formatDate(service.pickupDate)}` : ''}
                    </span>
                  </div>
                )}
                {service.cost && (
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-medium text-green-600">{service.cost}€</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Datumi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">Kreiran</div>
              <div className="text-sm text-gray-600">{formatDate(service.createdAt)}</div>
            </div>
            {service.scheduledDate && (
              <div className="bg-purple-50 p-3 rounded-md">
                <div className="text-sm font-medium text-purple-700 mb-1">Zakazano</div>
                <div className="text-sm text-purple-600">{formatDate(service.scheduledDate)}</div>
              </div>
            )}
            {service.completedDate && (
              <div className="bg-green-50 p-3 rounded-md">
                <div className="text-sm font-medium text-green-700 mb-1">Završeno</div>
                <div className="text-sm text-green-600">{formatDate(service.completedDate)}</div>
              </div>
            )}
          </div>

          {/* Akcije */}
          {showActions && onEdit && (service.status !== 'completed' && service.status !== 'cancelled') && (
            <div className="pt-4 border-t">
              <Button className="w-full" onClick={onEdit}>
                Izmeni servis
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}