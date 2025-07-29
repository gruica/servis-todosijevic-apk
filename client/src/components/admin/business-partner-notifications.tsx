import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, 
  BellRing, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  User, 
  Package, 
  Building2,
  Zap,
  Filter,
  Search,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Calendar,
  MessageSquare
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";

// Interfaces
interface BusinessPartnerNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  relatedServiceId?: number;
  relatedSparePartId?: number;
  relatedUserId?: number;
  isRead: boolean;
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  readAt?: string;
  businessPartnerCompany?: string;
  businessPartnerName?: string;
  clientName?: string;
  technicianName?: string;
  serviceDescription?: string;
}

// Notification type mappings
const notificationTypeIcons = {
  bp_service_created: Building2,
  bp_service_assigned: User,
  bp_service_completed: CheckCircle,
  bp_service_cancelled: AlertTriangle,
  bp_service_priority_changed: Zap,
  bp_service_overdue: Clock,
  bp_technician_assigned: User,
  bp_technician_removed: User,
  bp_spare_parts_requested: Package,
  bp_client_communication: MessageSquare,
  service_assigned: User,
  service_status_changed: Settings,
  spare_part_requested: Package,
  default: Bell
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800 border-gray-200",
  normal: "bg-blue-100 text-blue-800 border-blue-200", 
  high: "bg-orange-100 text-orange-800 border-orange-200",
  urgent: "bg-red-100 text-red-800 border-red-200",
};

export function BusinessPartnerNotifications() {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query za business partner notifikacije
  const { data: notifications = [], isLoading, refetch } = useQuery<BusinessPartnerNotification[]>({
    queryKey: ['/api/admin/business-partner-notifications'],
    refetchInterval: realTimeEnabled ? 3000 : false, // Real-time refresh every 3 seconds
  });

  // Query za unread count
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['/api/admin/business-partner-notifications/unread-count'],
    refetchInterval: realTimeEnabled ? 3000 : false,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest(`/api/admin/business-partner-notifications/${notificationId}/read`, {
        method: "PATCH"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/business-partner-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/business-partner-notifications/unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/admin/business-partner-notifications/mark-all-read', {
        method: "PATCH"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/business-partner-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/business-partner-notifications/unread-count'] });
      toast({
        title: "Uspešno",
        description: "Sve notifikacije su označene kao pročitane",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest(`/api/admin/business-partner-notifications/${notificationId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/business-partner-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/business-partner-notifications/unread-count'] });
      toast({
        title: "Uspešno",
        description: "Notifikacija je obrisana",
      });
    },
  });

  // Filter notifications
  const filteredNotifications = (notifications as BusinessPartnerNotification[]).filter((notification: BusinessPartnerNotification) => {
    if (filterType !== "all" && !notification.type.includes(filterType)) return false;
    if (filterPriority !== "all" && notification.priority !== filterPriority) return false;
    if (filterRead !== "all" && (filterRead === "read" ? !notification.isRead : notification.isRead)) return false;
    if (searchTerm && !notification.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Toggle real-time updates
  const toggleRealTime = () => {
    setRealTimeEnabled(!realTimeEnabled);
    toast({
      title: realTimeEnabled ? "Real-time onemogućen" : "Real-time omogućen",
      description: realTimeEnabled ? "Notifikacije se neće automatski ažurirati" : "Notifikacije se ažuriraju svake 3 sekunde",
    });
  };

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDeleteNotification = (notificationId: number) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    const IconComponent = notificationTypeIcons[type as keyof typeof notificationTypeIcons] || notificationTypeIcons.default;
    return IconComponent;
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: sr 
      });
    } catch {
      return "Nepoznato vreme";
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg font-semibold">
              Real-time Notifikacije
              {(unreadCount as number) > 0 && (
                <Badge variant="destructive" className="ml-2 animate-pulse">
                  {unreadCount as number}
                </Badge>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={realTimeEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleRealTime}
              className="gap-2"
            >
              <Zap className={`h-4 w-4 ${realTimeEnabled ? 'text-white' : 'text-gray-500'}`} />
              {realTimeEnabled ? 'Live' : 'Manual'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RotateCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {(unreadCount as number) > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCircle className="h-4 w-4" />
                Označi sve
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Pretraži notifikacije..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Tip" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi tipovi</SelectItem>
              <SelectItem value="bp_service">Servisi</SelectItem>
              <SelectItem value="bp_technician">Tehničari</SelectItem>
              <SelectItem value="bp_spare">Rezervni delovi</SelectItem>
              <SelectItem value="bp_client">Komunikacija</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger>
              <SelectValue placeholder="Prioritet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi prioriteti</SelectItem>
              <SelectItem value="urgent">Hitno</SelectItem>
              <SelectItem value="high">Visoko</SelectItem>
              <SelectItem value="normal">Normalno</SelectItem>
              <SelectItem value="low">Nisko</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterRead} onValueChange={setFilterRead}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sve</SelectItem>
              <SelectItem value="unread">Nepročitane</SelectItem>
              <SelectItem value="read">Pročitane</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nema notifikacija</p>
              <p className="text-sm">Filteri možda skrivaju dostupne notifikacije</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {filteredNotifications.map((notification: BusinessPartnerNotification, index: number) => {
                const IconComponent = getNotificationIcon(notification.type);
                
                return (
                  <div
                    key={notification.id}
                    className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                      notification.isRead 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-white border-purple-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-full ${
                          notification.isRead ? 'bg-gray-100' : 'bg-purple-100'
                        }`}>
                          <IconComponent className={`h-4 w-4 ${
                            notification.isRead ? 'text-gray-500' : 'text-purple-600'
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`text-sm font-semibold ${
                              notification.isRead ? 'text-gray-700' : 'text-gray-900'
                            }`}>
                              {notification.title}
                            </h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${priorityColors[notification.priority]}`}
                            >
                              {notification.priority === 'urgent' ? 'Hitno' : 
                               notification.priority === 'high' ? 'Visoko' :
                               notification.priority === 'normal' ? 'Normalno' : 'Nisko'}
                            </Badge>
                          </div>
                          
                          <p className={`text-sm mb-2 ${
                            notification.isRead ? 'text-gray-600' : 'text-gray-800'
                          }`}>
                            {notification.message}
                          </p>
                          
                          {/* Additional context */}
                          {(notification.businessPartnerCompany || notification.clientName || notification.technicianName) && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {notification.businessPartnerCompany && (
                                <Badge variant="secondary" className="text-xs">
                                  <Building2 className="h-3 w-3 mr-1" />
                                  {notification.businessPartnerCompany}
                                </Badge>
                              )}
                              {notification.clientName && (
                                <Badge variant="secondary" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  {notification.clientName}
                                </Badge>
                              )}
                              {notification.technicianName && (
                                <Badge variant="secondary" className="text-xs">
                                  <Settings className="h-3 w-3 mr-1" />
                                  {notification.technicianName}
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                            {notification.relatedServiceId && (
                              <span className="flex items-center gap-1">
                                Servis #{notification.relatedServiceId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markAsReadMutation.isPending}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNotification(notification.id)}
                          disabled={deleteNotificationMutation.isPending}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}