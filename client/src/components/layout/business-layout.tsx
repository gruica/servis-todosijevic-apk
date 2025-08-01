import { ReactNode, useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Home, 
  ClipboardList, 
  User, 
  LogOut, 
  Menu, 
  X,
  Building,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
// REMOVED: import { NotificationsDropdown } from "@/components/notifications-dropdown";

interface BusinessLayoutProps {
  children: ReactNode;
}

export default function BusinessLayout({ children }: BusinessLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Ručna detekcija mobilnog uređaja
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Inicijalno postavljanje
    handleResize();
    
    // Dodavanje event listenera
    window.addEventListener("resize", handleResize);
    
    // Čišćenje
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  const navigation = [
    {
      name: "Početna",
      href: "/business",
      icon: Home,
      current: location === "/business",
    },
    {
      name: "Servisni zahtevi",
      href: "/business/services",
      icon: ClipboardList,
      current: location === "/business/services",
    },
    {
      name: "Kontakt Admin",
      href: "/business/messages",
      icon: MessageCircle,
      current: location === "/business/messages",
    },
    {
      name: "Moj profil",
      href: "/business/profile",
      icon: User,
      current: location === "/business/profile",
    },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <div className="px-4 py-5 flex justify-between items-center border-b">
          <div className="flex items-center space-x-2">
            <Building className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold">Frigo Sistem</h2>
              <p className="text-xs text-gray-500">{user?.companyName || "Poslovni partner"}</p>
            </div>
          </div>
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <nav className="px-2 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md hover:bg-blue-50 hover:text-blue-700 transition-colors",
                    item.current
                      ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                      : "text-gray-700"
                  )}
                  onClick={() => isMobile && setIsSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="px-2 pb-4 border-t pt-4">
        <div className="px-3 py-1 mb-3">
          <p className="text-sm font-medium text-gray-700">{user?.fullName}</p>
          <p className="text-xs text-gray-500 truncate">{user?.username}</p>
        </div>
        <Button
          variant="outline"
          className="w-full flex items-center justify-center text-sm"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Odjavi se
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header (always visible) */}
      <header className="bg-white border-b border-gray-200 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Building className="h-5 w-5 text-blue-600 mr-2" />
            <h1 className="text-lg font-semibold">Frigo Sistem</h1>
            <span className="ml-2 text-sm text-gray-500">| Poslovni partner</span>
          </div>
          <div className="flex items-center gap-2">
            {/* TEMPORARILY REMOVED: <NotificationsDropdown /> */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Odjavi se
            </Button>
            {isMobile && (
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[280px]">
                  <SidebarContent />
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
            <SidebarContent />
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}