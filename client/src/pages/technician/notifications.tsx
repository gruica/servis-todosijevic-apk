import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  ArrowLeft, 
  CheckCheck, 
  AlertCircle, 
  User, 
  Settings, 
  Package,
  Clock,
  Filter
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  relatedServiceId?: number;
  relatedSparePartId?: number;
  isRead: boolean;
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  readAt?: string;
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  normal: "bg-blue-100 text-blue-800", 
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const typeIcons = {
  service_assigned: User,
  service_status_changed: Settings,
  spare_part_ordered: Package,
  spare_part_received: Package,
  service_has_pending_parts: AlertCircle,
  admin_notification: Bell,
};

const typeNames = {
  service_assigned: "Dodeljen servis",
  service_status_changed: "Promena statusa",
  spare_part_ordered: "Rezervni deo naručen",
  spare_part_received: "Rezervni deo stigao",
  service_has_pending_parts: "Čekaju se delovi",
  admin_notification: "Admin poruka",
};

export default function TechnicianNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/notifications/mark-all-read", {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Uspešno",
        description: "Sva obaveštenja su označena kao pročitana"
      });
    }
  });

  const filteredNotifications = notifications.filter((notification: Notification) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "unread") return !notification.isRead;
    if (selectedFilter === "urgent") return notification.priority === "urgent" || notification.priority === "high";
    return notification.type === selectedFilter;
  });

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const IconComponent = typeIcons[notification.type as keyof typeof typeIcons] || Bell;
    
    return (
      <Card 
        className={`mb-3 transition-all hover:shadow-md ${
          !notification.isRead ? "border-l-4 border-l-blue-500 bg-blue-50/30" : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${
              notification.priority === "urgent" ? "bg-red-100" :
              notification.priority === "high" ? "bg-orange-100" :
              notification.priority === "normal" ? "bg-blue-100" : "bg-gray-100"
            }`}>
              <IconComponent className={`h-4 w-4 ${
                notification.priority === "urgent" ? "text-red-600" :
                notification.priority === "high" ? "text-orange-600" :
                notification.priority === "normal" ? "text-blue-600" : "text-gray-600"
              }`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-gray-900 truncate">
                  {notification.title}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {notification.priority !== "normal" && (
                    <Badge 
                      variant="secondary" 
                      className={priorityColors[notification.priority]}
                    >
                      {notification.priority === "urgent" ? "HITNO" :
                       notification.priority === "high" ? "VAŽNO" : "NISKO"}
                    </Badge>
                  )}
                  {!notification.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                      className="h-6 px-2"
                    >
                      <CheckCheck className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {notification.message}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(notification.createdAt), { 
                    addSuffix: true, 
                    locale: sr 
                  })}
                </span>
                
                <Badge variant="outline" className="text-xs">
                  {typeNames[notification.type as keyof typeof typeNames] || notification.type}
                </Badge>
              </div>
              
              {notification.relatedServiceId && (
                <div className="mt-2">
                  <Link href={`/tech`}>
                    <Button size="sm" variant="outline" className="h-6 text-xs">
                      Pogledaj servis #{notification.relatedServiceId}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 p-4">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-yellow-600" />
            <p className="text-gray-600">Učitavam obaveštenja...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link href="/tech">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Nazad
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bell className="h-6 w-6 text-yellow-600" />
                Obaveštenja
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </h1>
              <p className="text-gray-600">
                {notifications.length} obaveštenja, {unreadCount} nepročitano
              </p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              size="sm"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Označi sve kao pročitano
            </Button>
          )}
        </div>

        {/* Filters */}
        <Tabs value={selectedFilter} onValueChange={setSelectedFilter} className="mb-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all" className="text-xs">
              Sve ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Nepročitano ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="urgent" className="text-xs">
              Hitno
            </TabsTrigger>
            <TabsTrigger value="service_assigned" className="text-xs">
              Servisi
            </TabsTrigger>
            <TabsTrigger value="spare_part_ordered" className="text-xs">
              Delovi
            </TabsTrigger>
            <TabsTrigger value="admin_notification" className="text-xs">
              Admin
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nema obaveštenja
              </h3>
              <p className="text-gray-600">
                {selectedFilter === "all" 
                  ? "Trenutno nemate obaveštenja."
                  : "Nema obaveštenja za izabrani filter."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-3">
              {filteredNotifications.map((notification: Notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}