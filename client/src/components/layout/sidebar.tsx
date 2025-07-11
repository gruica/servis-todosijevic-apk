import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
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
  X,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isMobileOpen: boolean;
  closeMobileMenu: () => void;
}

export function Sidebar({ isMobileOpen, closeMobileMenu }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  // Define menu items based on user role
  const adminMenuItems = [
    { path: "/", label: "Kontrolna tabla", icon: Home, highlight: true },
    { path: "/clients", label: "Klijenti", icon: Users },
    { path: "/admin/services", label: "Servisi", icon: Wrench },
    { path: "/technician-services", label: "Servisi po serviserima", icon: Users },
    { path: "/appliances", label: "Bela tehnika", icon: Settings },
    { path: "/users", label: "Korisnici", icon: Users },
    { path: "/admin/user-verification", label: "Verifikacija korisnika", icon: Shield },
    { path: "/admin/sms", label: "SMS poruke", icon: MessageSquare, highlight: true },
    { path: "/email-settings", label: "Email postavke", icon: Mail },
    { path: "/email-test", label: "Testiranje email-a", icon: Mail },
    { path: "/sql-admin", label: "SQL upravljač", icon: Database },
    { path: "/excel", label: "Excel izvoz", icon: Download },
    { path: "/profile", label: "Moj profil", icon: User },
  ];
  
  const technicianMenuItems = [
    { path: "/tech", label: "Moji servisi", icon: Wrench },
    { path: "/tech/profile", label: "Moj profil", icon: User },
  ];
  
  // Use the appropriate menu based on user role
  const menuItems = user?.role === "technician" ? technicianMenuItems : adminMenuItems;

  // Generate initials from user fullName
  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '';
    
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0]?.toUpperCase() || '')
      .join('');
  };

  return (
    <div 
      className={cn(
        "bg-white shadow-lg w-64 h-full overflow-y-auto flex-shrink-0 transition-all duration-300 transform",
        "flex flex-col",
        isMobileOpen 
          ? "fixed inset-y-0 left-0 z-50" 
          : "hidden md:flex md:relative"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <h1 className="text-lg font-medium text-primary">Frigo Sistem</h1>
        {isMobileOpen && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={closeMobileMenu}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      <div className="py-4 flex-1">
        <div className="px-4 mb-6">
          {user && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                <span className="font-medium text-sm">
                  {getInitials(user.fullName)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{user.fullName}</p>
                <p className="text-sm text-gray-500">
                  {user.role === "admin" 
                    ? "Administrator" 
                    : user.role === "technician" 
                      ? "Serviser" 
                      : "Korisnik"}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <nav className="flex-1">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onClick={() => closeMobileMenu()}
                  >
                    <div 
                      className={cn(
                        "flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg mx-2 transition-colors",
                        location === item.path 
                          ? "bg-blue-50 border-l-4 border-primary text-primary" 
                          : "",
                        (item as any).highlight
                          ? "font-medium text-blue-700"
                          : ""
                      )}
                    >
                      <IconComponent className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      
      {/* Logout button at the bottom */}
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={() => logoutMutation.mutate()}
          className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span>Odjava</span>
        </button>
      </div>
    </div>
  );
}