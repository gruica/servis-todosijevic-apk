import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  Menu, 
  Home, 
  Users, 
  Settings, 
  MessageSquare, 
  Mail, 
  Database, 
  Download, 
  User,
  Wrench,
  Shield,
  LogOut,
  ClipboardList,
  Phone,
  Bell,
  Search,
  Filter,
  Plus,
  MoreVertical
} from "lucide-react";

interface MobileAppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  showBottomNav?: boolean;
  floatingActionButton?: React.ReactNode;
}

export function MobileAppLayout({
  children,
  title = "Frigo Sistem",
  showBackButton = false,
  onBack,
  rightAction,
  showBottomNav = true,
  floatingActionButton
}: MobileAppLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Definiši menu stavke na osnovu uloge
  const getMenuItems = () => {
    if (!user) return [];

    const baseItems = [
      { path: "/", label: "Početna", icon: Home },
      { path: "/profile", label: "Profil", icon: User },
    ];

    switch (user.role) {
      case 'administrator':
        return [
          ...baseItems,
          { path: "/clients", label: "Klijenti", icon: Users },
          { path: "/admin/services", label: "Servisi", icon: Wrench },
          { path: "/admin/service-management", label: "Upravljanje", icon: ClipboardList },
          { path: "/technician-services", label: "Serviseri", icon: Users },
          { path: "/appliances", label: "Bela tehnika", icon: Settings },
          { path: "/users", label: "Korisnici", icon: Users },
          { path: "/admin/sms", label: "SMS", icon: MessageSquare },
          { path: "/email-settings", label: "Email", icon: Mail },
          { path: "/admin/website-security", label: "Bezbednost", icon: Shield },
          { path: "/sql-admin", label: "SQL", icon: Database },
          { path: "/excel", label: "Excel", icon: Download },
        ];
      case 'serviser':
        return [
          ...baseItems,
          { path: "/tech", label: "Moji servisi", icon: Wrench },
          { path: "/tech/profile", label: "Moj profil", icon: User },
        ];
      case 'klijent':
        return [
          ...baseItems,
          { path: "/customer", label: "Moji servisi", icon: Wrench },
          { path: "/customer/new-service", label: "Novi servis", icon: Plus },
        ];
      case 'poslovni_partner':
        return [
          ...baseItems,
          { path: "/business", label: "Servisi", icon: Wrench },
          { path: "/business/new-service", label: "Novi zahtev", icon: Plus },
        ];
      default:
        return baseItems;
    }
  };

  // Generiši inicijale korisnika
  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Osnovni bottom navigation items
  const getBottomNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'admin':
        return [
          { path: "/", label: "Početna", icon: Home },
          { path: "/admin/services", label: "Servisi", icon: Wrench },
          { path: "/clients", label: "Klijenti", icon: Users },
          { path: "/admin/service-management", label: "Upravljanje", icon: ClipboardList },
        ];
      case 'technician':
        return [
          { path: "/tech", label: "Servisi", icon: Wrench },
          { path: "/tech/profile", label: "Profil", icon: User },
        ];
      case 'customer':
        return [
          { path: "/customer", label: "Servisi", icon: Wrench },
          { path: "/customer/new-service", label: "Novi", icon: Plus },
        ];
      case 'business_partner':
        return [
          { path: "/business", label: "Servisi", icon: Wrench },
          { path: "/business/new-service", label: "Novi", icon: Plus },
        ];
      default:
        return [{ path: "/", label: "Početna", icon: Home }];
    }
  };

  const menuItems = getMenuItems();
  const bottomNavItems = getBottomNavItems();

  // Funkcija za logout
  const handleLogout = () => {
    logoutMutation.mutate();
    setIsMenuOpen(false);
  };

  // Toggle full screen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <div className={cn(
      "flex flex-col h-screen bg-gray-50 overflow-hidden",
      isFullScreen && "h-screen"
    )}>
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {showBackButton ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="p-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
          ) : (
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <div className="flex flex-col h-full">
                  {/* Profile Section */}
                  <div className="p-6 bg-primary text-primary-foreground">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 bg-white/20">
                        <AvatarFallback className="text-primary font-semibold">
                          {getUserInitials(user?.fullName || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{user?.fullName}</h3>
                        <p className="text-sm opacity-90">
                          {user?.role === 'admin' ? 'Administrator' : 
                           user?.role === 'technician' ? 'Serviser' :
                           user?.role === 'customer' ? 'Klijent' : 'Poslovni partner'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <ScrollArea className="flex-1 px-4 py-2">
                    <div className="space-y-1">
                      {menuItems.map((item) => (
                        <Button
                          key={item.path}
                          variant="ghost"
                          className="w-full justify-start h-12 text-left"
                          onClick={() => {
                            window.location.href = item.path;
                            setIsMenuOpen(false);
                          }}
                        >
                          <item.icon className="h-5 w-5 mr-3" />
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Logout Button */}
                  <div className="p-4 border-t">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Odjavi se
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
          
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rightAction}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullScreen}
            className="p-2"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-hidden",
        isFullScreen ? "pb-0" : showBottomNav ? "pb-16" : "pb-0"
      )}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && !isFullScreen && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-30">
          <div className="flex items-center justify-around">
            {bottomNavItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                className="flex flex-col items-center gap-1 h-12 px-2 py-1 min-w-0"
                onClick={() => window.location.href = item.path}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs truncate">{item.label}</span>
              </Button>
            ))}
          </div>
        </nav>
      )}

      {/* Floating Action Button */}
      {floatingActionButton && (
        <div className="fixed bottom-20 right-4 z-40">
          {floatingActionButton}
        </div>
      )}
    </div>
  );
}

export default MobileAppLayout;