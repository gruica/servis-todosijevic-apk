import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Wrench, 
  AlertCircle, 
  Calendar,
  FileText 
} from "lucide-react";
import { Service } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface WaitingService extends Service {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  applianceName: string;
  applianceCategory: string;
  technicianName: string;
}

export function WaitingForPartsFolder() {
  const { user } = useAuth();

  const { data: waitingServices, isLoading } = useQuery({
    queryKey: ['/api/my-services', 'waiting_parts'],
    queryFn: async () => {
      const response = await fetch('/api/my-services');
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      const allServices = await response.json() as WaitingService[];
      return allServices.filter(service => service.status === 'waiting_parts');
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('sr-RS', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getDaysWaiting = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getWaitingPriority = (daysWaiting: number) => {
    if (daysWaiting <= 1) return { color: "bg-yellow-100 text-yellow-800", label: "Novo" };
    if (daysWaiting <= 3) return { color: "bg-orange-100 text-orange-800", label: "Pažnja" };
    return { color: "bg-red-100 text-red-800", label: "Hitno" };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-orange-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-orange-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-orange-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!waitingServices || waitingServices.length === 0) {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Nema servisa koji čekaju rezervne delove
          </h3>
          <p className="text-gray-500">
            Kada zatražite rezervni deo, servis će se automatski premestiti ovde.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <h2 className="text-xl font-semibold text-gray-800">
          Servisi koji čekaju rezervne delove
        </h2>
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          {waitingServices.length}
        </Badge>
      </div>

      {waitingServices.map((service) => {
        const daysWaiting = getDaysWaiting(service.createdAt);
        const priorityStyle = getWaitingPriority(daysWaiting);

        return (
          <Card
            key={service.id}
            className="border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Servis #{service.id}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={priorityStyle.color}>
                    {priorityStyle.label}
                  </Badge>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                    {daysWaiting} {daysWaiting === 1 ? 'dan' : 'dana'} čeka
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-800">{service.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">{service.clientPhone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">{service.clientCity}</span>
                  </div>
                  {service.clientEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700 text-sm">{service.clientEmail}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">{service.applianceName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700 text-sm">
                      Kreiran: {formatDate(service.createdAt)}
                    </span>
                  </div>
                  {service.scheduledDate && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700 text-sm">
                        Zakazano: {formatDate(service.scheduledDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Opis problema
                  </h4>
                  <p className="text-gray-700 text-sm bg-white p-2 rounded border">
                    {service.description}
                  </p>
                </div>
                
                {service.technicianNotes && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-1 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Napomene servisera
                    </h4>
                    <div className="text-gray-700 text-sm bg-white p-2 rounded border whitespace-pre-wrap">
                      {service.technicianNotes}
                    </div>
                  </div>
                )}
              </div>
              
              <Separator className="my-3" />
              
              <div className="bg-orange-100 p-3 rounded-lg border border-orange-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-orange-800 mb-1">
                      Servis čeka rezervni deo
                    </h4>
                    <p className="text-orange-700 text-sm">
                      Ovaj servis je pauziran jer je zahtevana rezervna deo. Administrator će vas obavestiti kada deo bude dostupan i servis će biti vraćen u realizaciju.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}