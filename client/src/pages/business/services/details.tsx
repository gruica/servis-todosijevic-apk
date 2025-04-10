import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Clock, Wrench, Calendar, Phone, Mail, MapPin, Building, MessageSquare, ClipboardCheck } from "lucide-react";
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
        const response = await fetch(`/api/business/services/${serviceId}?partnerId=${user?.id}`);
        if (!response.ok) {
          throw new Error('Greška pri dohvatanju detalja servisa');
        }
        return await response.json();
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