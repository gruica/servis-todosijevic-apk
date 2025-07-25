import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  Settings,
  List,
  CheckCircle,
  Play
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CallClientButton } from "@/components/ui/call-client-button";
import { openMapWithAddress } from "@/lib/mobile-utils";

type QuickActionsFloatProps = {
  isOpen: boolean;
  onClose: () => void;
  services: any[];
  onServiceSelect: (service: any) => void;
  onStatusUpdate: (serviceId: number, status: string) => void;
  getStatusBadge: (status: string) => JSX.Element;
  activeCity?: string;
};

export function QuickActionsFloat({
  isOpen,
  onClose,
  services,
  onServiceSelect,
  onStatusUpdate,
  getStatusBadge,
  activeCity = "Svi gradovi"
}: QuickActionsFloatProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  const handleQuickStart = (serviceId: number) => {
    setSelectedServiceId(serviceId);
    onStatusUpdate(serviceId, "in_progress");
  };

  const handleQuickComplete = (serviceId: number) => {
    setSelectedServiceId(serviceId);
    onStatusUpdate(serviceId, "completed");
  };

  const openClientLocation = (address: string, city: string | null) => {
    const fullAddress = city ? `${address}, ${city}` : address;
    openMapWithAddress(fullAddress);
  };

  return (
    <FloatingSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Brze akcije - ${activeCity}`}
      defaultSize={{ width: 400, height: 600 }}
      minSize={{ width: 300, height: 400 }}
      defaultPosition={{ x: 100, y: 100 }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Dostupni servisi</span>
          </div>
          <Badge variant="outline">
            {services.length} servis{services.length === 1 ? '' : 'a'}
          </Badge>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {services.map((service) => (
            <Card 
              key={service.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedServiceId === service.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onServiceSelect(service)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {service.client?.fullName || 'Nepoznat klijent'}
                  </CardTitle>
                  {getStatusBadge(service.status)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {service.appliance?.category?.name} {service.appliance?.model}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate">{service.description}</span>
                  </div>
                  
                  {service.client?.city && (
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{service.client.city}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{formatDate(service.createdAt)}</span>
                  </div>
                </div>

                {/* Brze akcije */}
                <div className="flex gap-2 mt-3">
                  {service.client?.phone && (
                    <CallClientButton 
                      phoneNumber={service.client.phone}
                      clientName={service.client.fullName}
                      variant="default"
                      size="sm"
                      className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                    />
                  )}
                  
                  {service.client?.address && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openClientLocation(service.client?.address || "", service.client?.city || null);
                      }}
                      className="flex-1 text-xs"
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Mapa
                    </Button>
                  )}
                </div>

                {/* Status akcije */}
                <div className="flex gap-2 mt-2">
                  {(service.status === "pending" || service.status === "scheduled") && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickStart(service.id);
                      }}
                      className="flex-1 text-xs"
                      disabled={selectedServiceId === service.id}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Započni
                    </Button>
                  )}
                  
                  {service.status === "in_progress" && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickComplete(service.id);
                      }}
                      className="flex-1 text-xs"
                      disabled={selectedServiceId === service.id}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Završi
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {services.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nema dostupnih servisa</p>
          </div>
        )}
      </div>
    </FloatingSheet>
  );
}