import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, X, AlertCircle, User, Settings, Clock, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";
import { useLocation } from "wouter";
import { useNotification } from "@/contexts/notification-context";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  relatedServiceId?: number;
  relatedUserId?: number;
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
  service_created_by_partner: AlertCircle,
  service_status_changed: Settings,
  spare_part_ordered: Settings,
  spare_part_requested: Package,
  spare_part_received: Package,
  spare_part_status_changed: Package,
  admin_spare_part_ordered: Package,
};

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { setHighlightedServiceId, setShouldAutoOpen } = useNotification();
  
  // Dobijanje korisničkih podataka iz query cache-a
  const { data: user } = useQuery({
    queryKey: ["/api/jwt-user"],
    enabled: false, // Ne treba da se izvršava automatski
  });

  // Dobijanje notifikacija
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: isOpen, // Učitava samo kad je dropdown otvoren
  });

  // Dobijanje broja nepročitanih notifikacija
  const { data: unreadCount = { count: 0 } } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000, // Osvežava svakih 30 sekundi
  });

  // Označavanje notifikacije kao pročitane
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest("POST", `/api/notifications/${notificationId}/mark-read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Označavanje svih notifikacija kao pročitane
  const markAllAsReadMutation = useMutation({
    mutationFn: () => 
      apiRequest("POST", "/api/notifications/mark-all-read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Funkcija za navigaciju na detalje notifikacije
  const handleNotificationClick = (notification: Notification) => {
    console.log("🔔 Notification click:", {
      notificationId: notification.id,
      userRole: user?.role,
      relatedServiceId: notification.relatedServiceId,
      title: notification.title
    });
    
    // Označava notifikaciju kao pročitanu
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Navigacija na osnovu tipa notifikacije i korisničke uloge
    if (user && notification.relatedServiceId) {
      // Posebno rukovanje admin spare parts notifikacija
      if (notification.type === 'admin_spare_part_ordered' && user.role === 'admin') {
        console.log("📦 Admin spare parts notification - navigating to spare parts management");
        // Za admin spare parts notifikacije - navigacija na spare parts management
        navigate('/admin/spare-parts');
        setIsOpen(false);
        return;
      }
      
      console.log("🎯 Setting notification context:", {
        serviceId: notification.relatedServiceId,
        shouldAutoOpen: true
      });
      
      // Postavi highlighted service u context
      setHighlightedServiceId(notification.relatedServiceId);
      setShouldAutoOpen(true);
      
      switch (user.role) {
        case 'technician':
          console.log("👨‍🔧 Navigating technician to /tech");
          // Za tehničare - navigacija na stranicu servisa sa fokusiranim servisom
          navigate('/tech');
          break;
        case 'admin':
          console.log("👨‍💼 Navigating admin to /admin/services");
          // Za adminiastratore - navigacija na admin servise sa fokusiranim servisom
          navigate('/admin/services');
          break;
        case 'customer':
          console.log("👤 Navigating customer to /customer/services");
          // Za klijente - navigacija na svoje servise
          navigate('/customer/services');
          break;
        case 'business_partner':
          console.log("🤝 Navigating business partner to /business/services");
          // Za poslovne partnere - navigacija na svoje servise
          navigate('/business/services');
          break;
        default:
          console.log("❓ Unknown role, navigating to /");
          navigate('/');
      }
    } else {
      console.log("⚠️ No user or no related service ID");
      // Fallback navigacija bez specifičnog servisa
      if (user) {
        switch (user.role) {
          case 'technician':
            navigate('/tech');
            break;
          case 'admin':
            navigate('/admin');
            break;
          case 'customer':
            navigate('/customer');
            break;
          case 'business_partner':
            navigate('/business');
            break;
          default:
            navigate('/');
        }
      } else {
        navigate('/');
      }
    }
    
    // Zatvaranje dropdown-a
    setIsOpen(false);
  };

  const getRelativeTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: sr });
    } catch {
      return "nedavno";
    }
  };

  const getNotificationIcon = (type: string) => {
    const IconComponent = typeIcons[type as keyof typeof typeIcons] || Bell;
    return <IconComponent className="h-4 w-4" />;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount.count > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount.count > 99 ? "99+" : unreadCount.count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifikacije</span>
          {unreadCount.count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Označi sve
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Učitavanje notifikacija...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nema novih notifikacija
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {notifications.map((notification: Notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center mt-2 space-x-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {getRelativeTime(notification.createdAt)}
                        </span>
                        {notification.priority !== "normal" && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${priorityColors[notification.priority]}`}
                          >
                            {notification.priority === "high" ? "Visok" : 
                             notification.priority === "urgent" ? "Hitan" : "Nizak"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}