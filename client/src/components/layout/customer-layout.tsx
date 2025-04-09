import { useState, ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings, Home, Menu, X, ClipboardCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface CustomerLayoutProps {
  children: ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Ručno detekcija mobilnog uređaja
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
      name: "Prijava kvara",
      href: "/customer",
      icon: Home,
      current: location === "/customer",
    },
    {
      name: "Moji servisi",
      href: "/customer/services",
      icon: ClipboardCheck,
      current: location === "/customer/services",
    },
    {
      name: "Moj profil",
      href: "/customer/profile",
      icon: User,
      current: location === "/customer/profile",
    },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <div className="px-4 py-5 flex justify-between items-center border-b">
          <h2 className="text-lg font-semibold">Frigo Sistem</h2>
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
                <Link href={item.href}>
                  <a
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
                  </a>
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
      {/* Mobile header */}
      {isMobile && (
        <header className="bg-white border-b border-gray-200">
          <div className="px-4 py-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Frigo Sistem</h1>
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[250px]">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
        </header>
      )}

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="w-56 bg-white border-r border-gray-200 flex-shrink-0">
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