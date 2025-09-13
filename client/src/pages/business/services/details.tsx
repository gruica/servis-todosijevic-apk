import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Clock, Wrench, Calendar, Phone, Mail, MapPin, Building, MessageSquare, ClipboardCheck, Package, Settings, Truck, XCircle } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import BusinessLayout from "@/components/layout/business-layout";

// Tip za detalje servisa
interface ServiceDetails {
  id: number;
  description: string;
  problem: string;
  status: string;
  createdAt: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  technicianNotes?: string;
  cost?: string;
  clientId: number;
  applianceId?: number;
  technicianId?: number;
  categoryId?: number;
  manufacturerId?: number;
  businessPartnerId?: number;
  // Dodati nova polja za kompletne informacije
  isCompletelyFixed?: boolean;
  warrantyStatus?: string;
  usedParts?: string;
  machineNotes?: string;
  devicePickedUp?: boolean;
  pickupDate?: string;
  pickupNotes?: string;
  customerRefusalReason?: string;
  // Arrays for detailed information
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
    id: number;
    fullName: string;
    phone?: string;
    email?: string;
  };
  category?: {
    id: number;
    name: string;
  };
  manufacturer?: {
    id: number;
    name: string;
  };
  statusHistory?: {
    id: number;
    serviceId: number;
    oldStatus: string;
    newStatus: string;
    notes?: string;
    createdAt: string;
    createdBy?: string;
  }[];
}

// Helper funkcija za prevod statusa na srpski
function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Na čekanju",
    scheduled: "Zakazano",
    in_progress: "U procesu",
    waiting_parts: "Čeka delove",
    completed: "Završeno",
    cancelled: "Otkazano"
  };
  return statusMap[status] || status;
}

// Helper funkcija za formatiranje datuma
function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Stilizovani status badge
function StatusBadge({ status }: { status: string }) {
  let bgColor = "";
  
  switch (status) {
    case "pending":
      bgColor = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      break;
    case "scheduled":
      bgColor = "bg-blue-100 text-blue-800 hover:bg-blue-200";
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

export default function ServiceDetails() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const serviceId = parseInt(params.id, 10);
  
  // Fetch service details
  const { data: service, isLoading } = useQuery<ServiceDetails>({
    queryKey: ["/api/business/services/details", serviceId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/business/services/${serviceId}`);
        if (!response.ok) {
          throw new Error('Greška pri dohvatanju detalja servisa');
        }
        const data = await response.json();
        console.log("🔍 Business Partner Service Details Response:", data);
        return data;
      } catch (error) {
        console.error("Greška pri dohvatanju detalja servisa:", error);
        throw error;
      }
    },
    enabled: !!serviceId && !!user?.id,
  });

  if (isLoading) {
    return (
      <BusinessLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-gray-500">Učitavanje detalja servisa...</p>
        </div>
      </BusinessLayout>
    );
  }

  if (!service) {
    return (
      <BusinessLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="bg-red-100 text-red-800 p-4 rounded-md">
            <p className="font-medium">Servis nije pronađen</p>
            <p className="text-sm mt-1">Servis nije pronađen ili nemate pristup ovom servisu.</p>
          </div>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/business/services")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Nazad na listu servisa
          </Button>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header sa breadcrumb i nazad dugmetom */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/business/services")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Nazad
              </Button>
              <span className="text-gray-400 mx-2">/</span>
              <span className="text-gray-500">Detalji servisa #{service.id}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Servis #{service.id}</h2>
            <p className="text-muted-foreground">
              {service.description}
            </p>
          </div>
          
          <StatusBadge status={service.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Detalji servisa */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalji servisa</CardTitle>
                <CardDescription>Sve informacije o servisu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Osnovne informacije */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Osnovne informacije</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    <div className="flex">
                      <Clock className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Datum kreiranja</p>
                        <p className="font-medium">{formatDate(service.createdAt)}</p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <Wrench className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="font-medium">{translateStatus(service.status)}</p>
                      </div>
                    </div>
                    
                    {service.scheduledDate && (
                      <div className="flex">
                        <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Zakazano za</p>
                          <p className="font-medium">{formatDate(service.scheduledDate)}</p>
                        </div>
                      </div>
                    )}
                    
                    {service.completedDate && (
                      <div className="flex">
                        <ClipboardCheck className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Završeno</p>
                          <p className="font-medium">{formatDate(service.completedDate)}</p>
                        </div>
                      </div>
                    )}
                    
                    {service.cost && (
                      <div className="flex">
                        <div className="h-5 w-5 text-gray-400 mr-3 flex items-center justify-center">€</div>
                        <div>
                          <p className="text-sm text-gray-500">Cena servisa</p>
                          <p className="font-medium">{service.cost}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                {/* Opis problema */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Opis problema</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p>{service.problem || "Nije unet opis problema."}</p>
                  </div>
                </div>
                
                {/* Informacije o tehničaru */}
                {service.technician && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-medium mb-3">Dodeljen serviser</h3>
                      <div className="bg-blue-50 p-4 rounded-md flex items-start">
                        <div className="bg-blue-100 rounded-full p-2 mr-3">
                          <Wrench className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-blue-800">{service.technician.fullName}</p>
                          {service.technician.phone && (
                            <p className="text-sm text-blue-700 mt-1">
                              <span className="font-medium">Telefon:</span> {service.technician.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Napomene servisera - prikazati samo ako postoje */}
                {service.technicianNotes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-medium mb-3">Napomene servisera</h3>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p>{service.technicianNotes}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Izvršeni radovi - detaljan pregled */}
                {service.status === 'completed' && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center">
                        <Wrench className="h-5 w-5 text-green-600 mr-2" />
                        Izvršeni radovi i intervencije
                      </h3>
                      
                      {/* Osnovne informacije o završetku */}
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
                        <div className="flex items-start">
                          <div className="bg-green-100 rounded-full p-2 mr-3">
                            <ClipboardCheck className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-green-800 mb-2">Status završetka</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-green-700 font-medium">Datum završetka:</span>
                                <p className="text-green-800">{formatDate(service.completedDate)}</p>
                              </div>
                              {service.isCompletelyFixed !== undefined && (
                                <div>
                                  <span className="text-green-700 font-medium">Uređaj potpuno ispravan:</span>
                                  <p className="text-green-800">
                                    {service.isCompletelyFixed ? "Da, potpuno ispravljeno" : "Delimično/privremeno rešenje"}
                                  </p>
                                </div>
                              )}
                              {service.warrantyStatus && (
                                <div>
                                  <span className="text-green-700 font-medium">Status garancije:</span>
                                  <p className="text-green-800">{service.warrantyStatus}</p>
                                </div>
                              )}
                              {service.cost && (
                                <div>
                                  <span className="text-green-700 font-medium">Ukupan trošak:</span>
                                  <p className="text-green-800 font-semibold">{service.cost}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Izvršeni radovi - tehnički detalji */}
                      {(service.usedParts || service.machineNotes) && (
                        <div className="space-y-4">
                          {service.usedParts && (
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                              <h5 className="font-medium text-blue-800 mb-2 flex items-center">
                                <Package className="h-4 w-4 mr-2" />
                                Korišćeni delovi i materijali
                              </h5>
                              <div className="bg-white p-3 rounded border">
                                <p className="text-gray-700 whitespace-pre-line">{service.usedParts}</p>
                              </div>
                            </div>
                          )}
                          
                          {service.machineNotes && (
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                              <h5 className="font-medium text-orange-800 mb-2 flex items-center">
                                <Settings className="h-4 w-4 mr-2" />
                                Tehnički detalji intervencije
                              </h5>
                              <div className="bg-white p-3 rounded border">
                                <p className="text-gray-700 whitespace-pre-line">{service.machineNotes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Dodatne informacije za specifične statuse */}
                {service.devicePickedUp && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-medium mb-3 flex items-center">
                        <Truck className="h-5 w-5 text-blue-600 mr-2" />
                        Preuzimanje uređaja
                      </h3>
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {service.pickupDate && (
                            <div>
                              <span className="text-blue-700 font-medium">Datum preuzimanja:</span>
                              <p className="text-blue-800">{formatDate(service.pickupDate)}</p>
                            </div>
                          )}
                          {service.pickupNotes && (
                            <div className="md:col-span-2">
                              <span className="text-blue-700 font-medium">Napomene o preuzimanju:</span>
                              <p className="text-blue-800 mt-1">{service.pickupNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Informacije o odbačaju popravke */}
                {service.customerRefusalReason && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-medium mb-3 flex items-center">
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                        Odbačaj popravke
                      </h3>
                      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                        <p className="text-red-800"><span className="font-medium">Razlog odbačaja:</span> {service.customerRefusalReason}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Istorija statusa */}
            {service.statusHistory && service.statusHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Istorija statusa</CardTitle>
                  <CardDescription>Hronološki pregled promena statusa servisa</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative space-y-0">
                    {/* Linija vremena */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    {service.statusHistory.map((change, index) => (
                      <div key={change.id} className="flex items-start relative py-4">
                        <div className="absolute left-4 top-6 w-5 h-5 rounded-full bg-primary -ml-2.5 border-4 border-background"></div>
                        <div className="ml-10">
                          <div className="flex flex-col sm:flex-row sm:items-center text-sm">
                            <StatusBadge status={change.newStatus} />
                            <span className="mt-1 sm:mt-0 sm:ml-2 text-gray-500">
                              {formatDate(change.createdAt)}
                            </span>
                          </div>
                          {change.notes && (
                            <p className="mt-2 text-gray-700 text-sm">{change.notes}</p>
                          )}
                          {change.createdBy && (
                            <p className="text-xs text-gray-500 mt-1">Promenu izvršio: {change.createdBy}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rezervni delovi - detaljni pregled */}
            {service.spareParts && service.spareParts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    Rezervni delovi
                  </CardTitle>
                  <CardDescription>Delovi naručeni za ovaj servis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {service.spareParts.map((part, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{part.partName}</h4>
                          <Badge 
                            variant={
                              part.status === 'received' ? 'default' : 
                              part.status === 'ordered' ? 'secondary' : 
                              part.status === 'cancelled' ? 'destructive' : 'outline'
                            }
                          >
                            {part.status === 'received' ? 'Stigao' : 
                             part.status === 'ordered' ? 'Naručen' : 
                             part.status === 'cancelled' ? 'Otkazan' : part.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Količina:</span> {part.quantity || 1}
                          </div>
                          {part.productCode && (
                            <div>
                              <span className="font-medium">Šifra:</span> {part.productCode}
                            </div>
                          )}
                          {part.urgency && (
                            <div>
                              <span className="font-medium">Hitnost:</span> {part.urgency}
                            </div>
                          )}
                          {part.orderDate && (
                            <div>
                              <span className="font-medium">Naručeno:</span> {formatDate(part.orderDate)}
                            </div>
                          )}
                          {part.estimatedDeliveryDate && (
                            <div>
                              <span className="font-medium">Očekivano:</span> {formatDate(part.estimatedDeliveryDate)}
                            </div>
                          )}
                          {part.actualDeliveryDate && (
                            <div>
                              <span className="font-medium">Isporučeno:</span> {formatDate(part.actualDeliveryDate)}
                            </div>
                          )}
                        </div>
                        {part.warrantyStatus && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium text-gray-700">Garancija:</span> 
                            <span className="ml-1 text-gray-600">{part.warrantyStatus}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Uklonjeni delovi sa uređaja */}
            {service.removedParts && service.removedParts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    Uklonjeni delovi sa uređaja
                  </CardTitle>
                  <CardDescription>Delovi uklonjeni tokom servisa za popravku ili zamenu</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {service.removedParts.map((part, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-red-50 border-red-200">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{part.partName}</h4>
                          <Badge 
                            variant={
                              part.status === 'returned' ? 'default' : 
                              part.status === 'repaired' ? 'secondary' : 
                              part.status === 'replaced' ? 'outline' : 'destructive'
                            }
                          >
                            {part.status === 'returned' ? 'Vraćen' : 
                             part.status === 'repaired' ? 'Popravljen' : 
                             part.status === 'replaced' ? 'Zamenjen' : 
                             part.status === 'in_repair' ? 'U popravci' : 'Uklonjen'}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-gray-700">
                          <div>
                            <span className="font-medium">Razlog uklanjanja:</span> {part.removalReason}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <span className="font-medium">Datum uklanjanja:</span> {formatDate(part.removalDate)}
                            </div>
                            <div>
                              <span className="font-medium">Trenutna lokacija:</span> 
                              <span className="ml-1">
                                {part.currentLocation === 'workshop' ? 'U radionici' : 
                                 part.currentLocation === 'external_repair' ? 'Spoljašnja popravka' : 
                                 part.currentLocation === 'returned' ? 'Vraćen' : part.currentLocation}
                              </span>
                            </div>
                            {part.returnDate && (
                              <div>
                                <span className="font-medium">Datum vraćanja:</span> {formatDate(part.returnDate)}
                              </div>
                            )}
                            {part.repairCost && (
                              <div>  
                                <span className="font-medium">Troškovi popravke:</span> {part.repairCost}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vremenska linija rada */}
            {service.workTimeline && service.workTimeline.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Vremenska linija servisa
                  </CardTitle>
                  <CardDescription>Hronološki pregled svih aktivnosti na servisu</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative space-y-0">
                    {/* Linija vremena */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    {service.workTimeline.map((event, index) => (
                      <div key={index} className="flex items-start relative py-4">
                        <div className="absolute left-4 top-6 w-5 h-5 rounded-full bg-primary -ml-2.5 border-4 border-background"></div>
                        <div className="ml-10">
                          <div className="flex flex-col sm:flex-row sm:items-center text-sm">
                            <Badge variant="outline" className="mb-1 sm:mb-0">
                              {event.status === 'pending' ? 'Na čekanju' :
                               event.status === 'assigned' ? 'Dodeljeno' :
                               event.status === 'scheduled' ? 'Zakazano' :
                               event.status === 'in_progress' ? 'U toku' :
                               event.status === 'completed' ? 'Završeno' : event.status}
                            </Badge>
                            <span className="sm:ml-2 text-gray-500">
                              {formatDate(event.date)}
                            </span>
                          </div>
                          <p className="mt-1 text-gray-700 font-medium">{event.event}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Informacije o klijentu i uređaju */}
          <div className="space-y-6">
            {/* Informacije o klijentu */}
            {service.client && (
              <Card>
                <CardHeader>
                  <CardTitle>Klijent</CardTitle>
                  <CardDescription>Informacije o klijentu</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center">
                    <div className="bg-blue-100 rounded-full h-10 w-10 flex items-center justify-center mr-3">
                      <span className="font-semibold text-blue-700">
                        {service.client.fullName.split(' ').map(name => name[0]).join('').substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium">{service.client.fullName}</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex">
                      <Phone className="h-4 w-4 text-gray-400 mr-3" />
                      <span>{service.client.phone}</span>
                    </div>
                    
                    {service.client.email && (
                      <div className="flex">
                        <Mail className="h-4 w-4 text-gray-400 mr-3" />
                        <span>{service.client.email}</span>
                      </div>
                    )}
                    
                    {service.client.address && (
                      <div className="flex">
                        <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                        <span>{service.client.address}, {service.client.city || ""}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informacije o uređaju */}
            {(service.category || service.manufacturer || service.appliance) && (
              <Card>
                <CardHeader>
                  <CardTitle>Uređaj</CardTitle>
                  <CardDescription>Informacije o uređaju</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {service.category && (
                      <div className="flex">
                        <Building className="h-4 w-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Kategorija</p>
                          <p className="font-medium">{service.category.name}</p>
                        </div>
                      </div>
                    )}
                    
                    {service.manufacturer && (
                      <div className="flex">
                        <Building className="h-4 w-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Proizvođač</p>
                          <p className="font-medium">{service.manufacturer.name}</p>
                        </div>
                      </div>
                    )}
                    
                    {service.appliance && (
                      <div className="flex">
                        <Wrench className="h-4 w-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Model</p>
                          <p className="font-medium">{service.appliance.model}</p>
                        </div>
                      </div>
                    )}
                    
                    {service.appliance?.serialNumber && (
                      <div className="flex">
                        <MessageSquare className="h-4 w-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Serijski broj</p>
                          <p className="font-medium">{service.appliance.serialNumber}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}