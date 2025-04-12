import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isMobileOpen: boolean;
  closeMobileMenu: () => void;
}

export function Sidebar({ isMobileOpen, closeMobileMenu }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  // Define menu items based on user role
  const adminMenuItems = [
    { path: "/", label: "Kontrolna tabla", icon: "dashboard" },
    { path: "/clients", label: "Klijenti", icon: "person" },
    { path: "/admin/services", label: "Servisi", icon: "build" },
    { path: "/technician-services", label: "Servisi po serviserima", icon: "group" },
    { path: "/appliances", label: "Bela tehnika", icon: "kitchen" },
    { path: "/users", label: "Korisnici", icon: "group" },
    { path: "/admin/user-verification", label: "Verifikacija korisnika", icon: "verified_user" },
    { path: "/email-settings", label: "Email postavke", icon: "mail" },
    { path: "/email-test", label: "Testiranje email-a", icon: "mail" },
    { path: "/sql-admin", label: "SQL upravljač", icon: "storage" },
    { path: "/excel", label: "Excel izvoz", icon: "download" },
    { path: "/profile", label: "Moj profil", icon: "person" },
  ];
  
  const technicianMenuItems = [
    { path: "/tech", label: "Moji servisi", icon: "build" },
    { path: "/tech/profile", label: "Moj profil", icon: "person" },
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
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <h1 className="text-xl font-medium text-primary">Frigo Sistem Todosijević</h1>
      </div>
      <div className="py-4 flex-1">
        <div className="px-4 mb-6">
          {user && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                <span className="font-medium">
                  {getInitials(user.fullName)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-800">{user.fullName}</p>
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
        <nav>
          <ul>
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  onClick={() => closeMobileMenu()}
                >
                  <div 
                    className={cn(
                      "flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100",
                      location === item.path 
                        ? "bg-blue-50 border-l-4 border-primary text-primary" 
                        : ""
                    )}
                  >
                    {item.icon && (
                      <span className="material-symbols-outlined mr-3">{item.icon}</span>
                    )}
                    <span>{item.label}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          
          {/* Posebna sekcija za verifikaciju korisnika (prikazuje se samo za admin) */}
          {user?.role === "admin" && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="px-4 text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">
                ADMINISTRACIJA
              </h3>
              <ul>
                <li>
                  <Link href="/admin/user-verification" onClick={() => closeMobileMenu()}>
                    <div className={cn(
                      "flex items-center px-4 py-3 text-blue-700 font-medium hover:bg-blue-50",
                      location === "/admin/user-verification" 
                        ? "bg-blue-100 border-l-4 border-blue-600 text-blue-800" 
                        : "border-l-4 border-transparent"
                    )}>
                      <span className="material-symbols-outlined mr-3">verified_user</span>
                      <span>Verifikacija korisnika</span>
                    </div>
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </nav>
      </div>
      
      {/* Logout button at the bottom */}
      <div className="p-4 border-t border-gray-200">
        <LogoutButton />
      </div>
    </div>
  );
}

function LogoutButton() {
  const { logoutMutation } = useAuth();
  
  return (
    <button 
      onClick={() => logoutMutation.mutate()}
      className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
      disabled={logoutMutation.isPending}
    >
      <span>Odjavi se</span>
    </button>
  );
}
