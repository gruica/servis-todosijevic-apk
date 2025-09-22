import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, ArrowRight, Clock, User, MapPin, Phone, Mail, Wrench } from "lucide-react";
import { Service } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

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

export function WaitingForPartsSection() {
  const [selectedService, setSelectedService] = useState<WaitingService | null>(null);
  const [newStatus, setNewStatus] = useState<string>('in_progress');
  const [adminNotes, setAdminNotes] = useState('');
  const { toast } = useToast();

  const { data: waitingServices = [], isLoading } = useQuery<WaitingService[]>({
    queryKey: ['/api/admin/waitingforparts'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const returnServiceMutation = useMutation({
    mutationFn: async ({ serviceId, newStatus, adminNotes }: { serviceId: number; newStatus: string; adminNotes: string }) => {
      const response = await apiRequest(`/api/admin/services/${serviceId}/return-from-waiting`, {
        method: 'POST',
        body: JSON.stringify({ newStatus, adminNotes })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/waitingforparts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      toast({
        title: "Servis vraćen u realizaciju",
        description: "Servis je uspešno vraćen u realizaciju. Serviser je obavešten.",
      });
      setSelectedService(null);
      setAdminNotes('');
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Greška pri vraćanju servisa u realizaciju.",
        variant: "destructive",
      });
    },
  });

  const handleReturnService = () => {
    if (!selectedService) return;

    returnServiceMutation.mutate({
      serviceId: selectedService.id,
      newStatus,
      adminNotes
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('sr-RS', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Servisi koji čekaju rezervne delove
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Servisi koji čekaju rezervne delove
          {waitingServices && waitingServices.length > 0 && (
            <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
              {waitingServices.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!waitingServices || waitingServices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Nema servisa koji čekaju rezervne delove</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {waitingServices.map((service) => (
              <div
                key={service.id}
                className="border rounded-lg p-4 bg-orange-50 border-orange-200 hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        Servis #{service.id}
                      </h3>
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                        {getDaysWaiting(service.createdAt)} dana čeka
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{service.clientName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span>{service.clientPhone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{service.clientCity}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-gray-500" />
                          <span>{service.applianceName} ({service.applianceCategory})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>Serviser: {service.technicianName}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Problem:</strong> {service.description}
                    </div>
                    
                    {service.technicianNotes && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>Napomene:</strong> {service.technicianNotes}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => setSelectedService(service)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Vrati u realizaciju
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Vraćanje servisa u realizaciju</DialogTitle>
                          <DialogDescription>
                            Servis će biti vraćen u aktivnu realizaciju nakon što su potrebni rezervni delovi dostupni.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Novi status servisa
                            </label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in_progress">U toku</SelectItem>
                                <SelectItem value="scheduled">Zakazano</SelectItem>
                                <SelectItem value="assigned">Dodeljeno</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Napomena o rezervnom delu (opciono)
                            </label>
                            <Textarea
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              placeholder="Npr. Deo je stigao od dobavljača XYZ..."
                              className="min-h-[80px]"
                            />
                          </div>
                          
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline"
                              onClick={() => setSelectedService(null)}
                            >
                              Odustani
                            </Button>
                            <Button 
                              onClick={handleReturnService}
                              disabled={returnServiceMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {returnServiceMutation.isPending ? "Vraćam..." : "Vrati u realizaciju"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}