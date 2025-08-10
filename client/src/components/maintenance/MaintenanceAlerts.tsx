import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bell, Check, Clock, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

type MaintenanceAlert = {
  id: number;
  scheduleId: number;
  title: string;
  message: string;
  alertDate: string;
  status: "pending" | "sent" | "acknowledged" | "completed";
  isRead: boolean;
  createdAt: string;
};

export function MaintenanceAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  
  // Dohvati nepročitana obaveštenja
  const { data: alerts = [], isLoading, isError } = useQuery({
    queryKey: ["/api/maintenance-alerts/unread"],
    queryFn: async () => {
      const res = await fetch("/api/maintenance-alerts/unread");
      if (!res.ok) throw new Error("Greška pri dobijanju obaveštenja");
      return await res.json() as MaintenanceAlert[];
    },
    refetchInterval: 60000, // Osveži svakih minut
  });
  
  // Mutacija za označavanje obaveštenja kao pročitanog
  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const res = await apiRequest(`/api/maintenance-alerts/${alertId}/mark-read`, { method: "POST" });
      if (!res.ok) throw new Error("Greška pri označavanju obaveštenja");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-alerts/unread"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleMarkAsRead = (alertId: number) => {
    markAsReadMutation.mutate(alertId);
  };
  
  const handleMarkAllAsRead = () => {
    // Označi sva obaveštenja kao pročitana
    alerts.forEach(alert => {
      markAsReadMutation.mutate(alert.id);
    });
    setIsOpen(false);
  };
  
  // Formatiranje datuma
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("sr-Latn-ME", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label="Obaveštenja o održavanju"
        >
          <Bell className="h-5 w-5" />
          {alerts.length > 0 && (
            <span className="absolute top-0 right-0 flex h-5 w-5 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {alerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b py-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Obaveštenja o održavanju</CardTitle>
            {alerts.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={handleMarkAllAsRead}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Označi sve
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin h-6 w-6 border-t-2 border-b-2 border-primary rounded-full"></div>
              </div>
            ) : isError ? (
              <div className="py-6 px-4 text-center text-red-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>Greška pri učitavanju obaveštenja</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-6 px-4 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p>Nema novih obaveštenja</p>
              </div>
            ) : (
              <ul className="divide-y">
                {alerts.map((alert) => (
                  <li key={alert.id} className="p-3 hover:bg-accent">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1.5 flex-shrink-0 text-blue-500" />
                        <h4 className="font-medium text-sm">{alert.title}</h4>
                      </div>
                      <Badge variant="outline" className="text-xs font-normal px-1.5 py-0">
                        {formatDate(alert.alertDate)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground ml-5.5 mb-2">
                      {alert.message}
                    </p>
                    <div className="flex justify-end">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-xs"
                        onClick={() => handleMarkAsRead(alert.id)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Zatvori
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}