import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import BusinessLayout from "@/components/layout/business-layout";
import { useAuth } from "@/hooks/use-auth";
import { 
  Loader2, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Package, 
  User, 
  Phone, 
  MapPin, 
  Wrench,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
  DollarSign,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ServiceDetail {
  id: number;
  clientId: number;
  applianceId: number;
  technicianId: number | null;
  description: string;
  status: string;
  createdAt: string;
  scheduledDate: string | null;
  completedDate: string | null;
  technicianNotes: string | null;
  cost: string | null;
  isCompletelyFixed: boolean | null;
  businessPartnerId: number | null;
  partnerCompanyName: string | null;
  client?: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
  };
  appliance?: {
    model: string;
    serialNumber: string;
    categoryId: number;
    manufacturerId: number;
  };
  category?: {
    name: string;
    icon: string;
  };
  manufacturer?: {
    name: string;
  };
  technician?: {
    fullName: string;
    specialization: string;
    phone: string;
  };
}

// Komponenta za prikaz status bedža
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'waiting_parts': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Na čekanju';
      case 'assigned': return 'Dodeljen';
      case 'scheduled': return 'Zakazan';
      case 'in_progress': return 'U toku';
      case 'waiting_parts': return 'Čeka delove';
      case 'completed': return 'Završen';
      case 'cancelled': return 'Otkazan';
      default: return status;
    }
  };

  return (
    <Badge className={getStatusStyle(status)}>
      {getStatusText(status)}
    </Badge>
  );
};

// Funkcija za formatiranje datuma
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('sr-RS', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function BusinessServiceDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: service, isLoading, error } = useQuery<ServiceDetail>({
    queryKey: [`/api/business/services/${id}`],
    enabled: !!id && !!user?.id,
  });

  if (isLoading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Učitavanje detalja servisa...</span>
        </div>
      </BusinessLayout>
    );
  }

  if (error || !service) {
    return (
      <BusinessLayout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Greška pri učitavanju servisa
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Servis sa ID {id} nije pronađen ili nemate dozvolu za pristup.
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate("/business/services")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nazad na servise
          </Button>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/business/services")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Servis #{service.id}
              </h1>
              <p className="text-muted-foreground">
                Detalji servisnog zahteva
              </p>
            </div>
          </div>
          <StatusBadge status={service.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Osnovne informacije */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informacije o klijentu */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Informacije o klijentu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ime i prezime</label>
                    <p className="text-sm font-medium">{service.client?.fullName || "Nepoznato"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm">{service.client?.email || "Nije unet"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telefon</label>
                    <p className="text-sm flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {service.client?.phone || "Nije unet"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Adresa</label>
                    <p className="text-sm flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {service.client?.address && service.client?.city 
                        ? `${service.client.address}, ${service.client.city}`
                        : "Nije uneta"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informacije o uređaju */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Informacije o uređaju
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Proizvođač</label>
                    <p className="text-sm font-medium">{service.manufacturer?.name || "Nepoznato"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Model</label>
                    <p className="text-sm">{service.appliance?.model || "Nepoznato"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Kategorija</label>
                    <p className="text-sm">{service.category?.name || "Nepoznato"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Serijski broj</label>
                    <p className="text-sm">{service.appliance?.serialNumber || "Nije unet"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opis problema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Opis problema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{service.description}</p>
              </CardContent>
            </Card>

            {/* Napomene servisera */}
            {service.technicianNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Napomene servisera
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{service.technicianNotes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bočni panel */}
          <div className="space-y-6">
            {/* Status i datumi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Status i datumi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <StatusBadge status={service.status} />
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-gray-500">Kreiran</label>
                  <p className="text-sm flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(service.createdAt)}
                  </p>
                </div>
                {service.scheduledDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Zakazan termin</label>
                    <p className="text-sm flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(service.scheduledDate)}
                    </p>
                  </div>
                )}
                {service.completedDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Završen</label>
                    <p className="text-sm flex items-center mt-1">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {formatDate(service.completedDate)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informacije o serviseru */}
            {service.technician && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wrench className="h-5 w-5 mr-2" />
                    Dodeljeni serviser
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ime i prezime</label>
                    <p className="text-sm font-medium">{service.technician.fullName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Specijalizacija</label>
                    <p className="text-sm">{service.technician.specialization}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telefon</label>
                    <p className="text-sm flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {service.technician.phone}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Troškovi */}
            {service.cost && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Troškovi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {service.cost} €
                  </div>
                  {service.isCompletelyFixed !== null && (
                    <div className="mt-2 flex items-center text-sm">
                      {service.isCompletelyFixed ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                          Potpuno popravljen
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1 text-red-500" />
                          Delimično popravljen
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}