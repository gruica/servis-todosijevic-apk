import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Phone, 
  MapPin, 
  User, 
  Wrench, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Camera,
  QrCode,
  Save,
  Edit,
  X,
  Maximize2,
  Minimize2,
  Move,
  Settings,
  Calendar,
  DollarSign,
  FileText,
  Tool,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  id: number;
  description: string;
  status: string;
  createdAt: string;
  scheduledDate?: string;
  technicianNotes?: string;
  cost?: number;
  usedParts?: string;
  machineNotes?: string;
  isCompletelyFixed?: boolean;
  client?: {
    id: number;
    fullName: string;
    phone: string;
    address: string;
    email: string;
    city: string;
  };
  appliance?: {
    id: number;
    model: string;
    serialNumber: string;
    category?: {
      name: string;
      icon: string;
    };
  };
}

interface MobileServiceManagerProps {
  services: Service[];
  onUpdateService: (serviceId: number, updates: any) => void;
  userRole: 'admin' | 'technician' | 'customer' | 'business_partner';
  onRefresh?: () => void;
}

export default function MobileServiceManager({ 
  services, 
  onUpdateService, 
  userRole, 
  onRefresh 
}: MobileServiceManagerProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const [floatingPosition, setFloatingPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [activeTab, setActiveTab] = useState("details");

  // Status konfiguracija
  const statusConfig = {
    pending: { label: "Na čekanju", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    assigned: { label: "Dodeljen", color: "bg-blue-100 text-blue-800", icon: User },
    scheduled: { label: "Zakazan", color: "bg-purple-100 text-purple-800", icon: Calendar },
    in_progress: { label: "U toku", color: "bg-green-100 text-green-800", icon: Wrench },
    waiting_parts: { label: "Čeka delove", color: "bg-orange-100 text-orange-800", icon: AlertCircle },
    completed: { label: "Završen", color: "bg-green-100 text-green-800", icon: CheckCircle },
    cancelled: { label: "Otkazan", color: "bg-red-100 text-red-800", icon: X },
  };

  // Pripremi form podatke kada se selektuje servis
  useEffect(() => {
    if (selectedService) {
      setFormData({
        status: selectedService.status,
        technicianNotes: selectedService.technicianNotes || '',
        cost: selectedService.cost || '',
        usedParts: selectedService.usedParts || '',
        machineNotes: selectedService.machineNotes || '',
        isCompletelyFixed: selectedService.isCompletelyFixed || false,
      });
    }
  }, [selectedService]);

  // Drag funkcionalnost za floating panel
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isFloating) {
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        setFloatingPosition({
          x: moveEvent.clientX - offsetX,
          y: moveEvent.clientY - offsetY,
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  // Sačuvaj izmene
  const handleSave = () => {
    if (selectedService) {
      onUpdateService(selectedService.id, formData);
      setEditMode(false);
    }
  };

  // Renderuj badge za status
  const renderStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const IconComponent = config.icon;
    return (
      <Badge className={cn("flex items-center gap-1", config.color)}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Renderuj listu servisa
  const renderServicesList = () => (
    <div className="space-y-3">
      {services.map((service) => (
        <Card 
          key={service.id} 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            selectedService?.id === service.id && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedService(service)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-lg">#{service.id}</span>
                {renderStatusBadge(service.status)}
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(service.createdAt).toLocaleDateString('sr-RS')}
              </div>
            </div>
            
            {service.client && (
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{service.client.fullName}</span>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {service.description}
            </p>
            
            {service.appliance && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wrench className="h-4 w-4" />
                <span>{service.appliance.category?.name} - {service.appliance.model}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Renderuj detalje servisa
  const renderServiceDetails = () => {
    if (!selectedService) return null;

    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Detalji</TabsTrigger>
          <TabsTrigger value="client">Klijent</TabsTrigger>
          <TabsTrigger value="work">Rad</TabsTrigger>
          <TabsTrigger value="parts">Delovi</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Servis #{selectedService.id}</h3>
            {renderStatusBadge(selectedService.status)}
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Opis problema</Label>
              <p className="text-sm text-muted-foreground mt-1">{selectedService.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Datum kreiranja</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedService.createdAt).toLocaleString('sr-RS')}
                </p>
              </div>
              
              {selectedService.scheduledDate && (
                <div>
                  <Label className="text-sm font-medium">Zakazan za</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedService.scheduledDate).toLocaleString('sr-RS')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="client" className="space-y-4">
          {selectedService.client && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{selectedService.client.fullName}</h4>
                    <p className="text-sm text-muted-foreground">{selectedService.client.city}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedService.client.phone}</span>
                    <Button size="sm" variant="outline" className="ml-auto">
                      Pozovi
                    </Button>
                  </div>
                  
                  {selectedService.client.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedService.client.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="work" className="space-y-4">
          {userRole === 'technician' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Status servisa</Label>
                <Button size="sm" variant="outline" onClick={() => setEditMode(!editMode)}>
                  <Edit className="h-4 w-4 mr-1" />
                  {editMode ? 'Otkaži' : 'Uredi'}
                </Button>
              </div>
              
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_progress">U toku</SelectItem>
                        <SelectItem value="waiting_parts">Čeka delove</SelectItem>
                        <SelectItem value="completed">Završen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="technicianNotes">Napomene servisera</Label>
                    <Textarea
                      id="technicianNotes"
                      value={formData.technicianNotes}
                      onChange={(e) => setFormData({...formData, technicianNotes: e.target.value})}
                      placeholder="Unesite napomene o radu..."
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cost">Cena (€)</Label>
                    <Input
                      id="cost"
                      type="number"
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isCompletelyFixed"
                      checked={formData.isCompletelyFixed}
                      onCheckedChange={(checked) => setFormData({...formData, isCompletelyFixed: checked})}
                    />
                    <Label htmlFor="isCompletelyFixed">Potpuno popravljen</Label>
                  </div>
                  
                  <Button onClick={handleSave} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Sačuvaj izmene
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedService.technicianNotes && (
                    <div>
                      <Label className="text-sm font-medium">Napomene servisera</Label>
                      <p className="text-sm text-muted-foreground mt-1">{selectedService.technicianNotes}</p>
                    </div>
                  )}
                  
                  {selectedService.cost && (
                    <div>
                      <Label className="text-sm font-medium">Cena</Label>
                      <p className="text-sm text-muted-foreground mt-1">{selectedService.cost} €</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          {userRole === 'technician' && editMode ? (
            <div>
              <Label htmlFor="usedParts">Korišćeni delovi</Label>
              <Textarea
                id="usedParts"
                value={formData.usedParts}
                onChange={(e) => setFormData({...formData, usedParts: e.target.value})}
                placeholder="Unesite korišćene delove..."
                className="min-h-[100px]"
              />
            </div>
          ) : (
            selectedService.usedParts && (
              <div>
                <Label className="text-sm font-medium">Korišćeni delovi</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedService.usedParts}</p>
              </div>
            )
          )}
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="relative h-full">
      {/* Glavna lista servisa - uvek full screen na mobilnom */}
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h2 className="text-lg font-semibold">Moji servisi</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onRefresh}>
              <Zap className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFloating(!isFloating)}
            >
              {isFloating ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Lista servisa */}
        <ScrollArea className="flex-1 p-4">
          {renderServicesList()}
        </ScrollArea>
      </div>

      {/* Floating/Sheet panel za detalje */}
      {selectedService && (
        <>
          {isFloating ? (
            <div
              className={cn(
                "fixed bg-white border rounded-lg shadow-lg z-50 w-96 max-h-[80vh] overflow-hidden",
                isDragging ? "cursor-grabbing" : "cursor-grab"
              )}
              style={{
                left: floatingPosition.x,
                top: floatingPosition.y,
              }}
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                  <Move className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Servis #{selectedService.id}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setIsFloating(false)}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setSelectedService(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="max-h-[60vh] p-4">
                {renderServiceDetails()}
              </ScrollArea>
            </div>
          ) : (
            <Sheet open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Servis #{selectedService.id}</SheetTitle>
                  <SheetDescription>
                    Detalji servisa i upravljanje
                  </SheetDescription>
                </SheetHeader>
                
                <ScrollArea className="h-full mt-4">
                  {renderServiceDetails()}
                </ScrollArea>
              </SheetContent>
            </Sheet>
          )}
        </>
      )}
    </div>
  );
}