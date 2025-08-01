import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SidebarProps {
  isMobileOpen: boolean;
  closeMobileMenu: () => void;
}

export function Sidebar({ isMobileOpen, closeMobileMenu }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  // Fetch pending spare parts orders count for admin users
  const { data: pendingSparePartsCount = 0 } = useQuery({
    queryKey: ['/api/admin/spare-parts/pending'],
    enabled: user?.role === 'admin',
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
    select: (data: any[]) => Array.isArray(data) ? data.length : 0,
  });

  // Fetch pending business partner requests count for admin users
  const { data: pendingBusinessPartnerCount = 0 } = useQuery({
    queryKey: ['/api/admin/business-partner-pending-count'],
    enabled: user?.role === 'admin',
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
    select: (data: any) => data?.count || 0,
  });

  // Define menu items based on user role
  // Verzija 2 - Samo najbitnije opcije
  const adminMenuItems = [
    { path: "/", label: "Kontrolna tabla", icon: "dashboard", highlight: true },
    { path: "/clients", label: "Klijenti", icon: "person" },
    { path: "/admin/services", label: "Servisi", icon: "build" },
    { path: "/admin/services?filter=picked_up", label: "Preuzeti aparati", icon: "package", highlight: true },
    { path: "/technician-services", label: "Servisi po serviserima", icon: "groups" },
    { path: "/admin/business-partners", label: "Poslovni partneri", icon: "business", highlight: true, badge: pendingBusinessPartnerCount },
    { path: "/admin/spare-parts", label: "Rezervni delovi", icon: "inventory", highlight: true },
    { path: "/admin/available-parts", label: "Dostupni delovi", icon: "warehouse", highlight: true },
    { path: "/admin/spare-parts-catalog", label: "PartKeepr Katalog", icon: "category", highlight: true },
    { path: "/admin/web-scraping", label: "Web Scraping", icon: "travel_explore", highlight: true },
    { path: "/appliances", label: "Bela tehnika", icon: "home_repair_service" },
    { path: "/users", label: "Upravljaj korisnicima", icon: "admin_panel_settings" },
    { path: "/admin/user-verification", label: "Verifikuj korisnike", icon: "verified_user" },
    { path: "/admin/sms-mobile-api-config", label: "SMS Mobile API", icon: "smartphone", highlight: true },
    { path: "/admin/sms-bulk", label: "Masovno SMS", icon: "message", highlight: true },
    { path: "/email-settings", label: "Email postavke", icon: "mail" },
    { path: "/email-test", label: "Testiranje email-a", icon: "mail_outline" },
    { path: "/sql-admin", label: "SQL upravljač", icon: "storage" },
    { path: "/excel", label: "Excel uvoz/izvoz", icon: "import_export" },
    { path: "/admin/data-export", label: "Izvoz podataka", icon: "download", highlight: true },
    { path: "/admin/cleanup", label: "Čišćenje baze", icon: "cleaning_services", highlight: true },
    { path: "/admin/complus-billing", label: "Complus fakturisanje", icon: "euro", highlight: true },
    { path: "/profile", label: "Moj profil", icon: "account_circle" },
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
                  onClick={() => closeMobileMenu && closeMobileMenu()}
                >
                  <div 
                    className={cn(
                      "flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100",
                      location === item.path 
                        ? "bg-blue-50 border-l-4 border-primary text-primary" 
                        : "",
                      (item as any).highlight
                        ? "font-medium text-blue-700"
                        : ""
                    )}
                  >
                    {item.icon && (
                      <span className="material-icons mr-3" style={{fontSize: '20px'}}>{item.icon}</span>
                    )}
                    <span>{item.label}</span>
                    {(item.path === "/admin/services" || item.path === "/admin/user-verification" || item.path === "/admin/sms" || item.path === "/admin/cleanup") && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Novo</span>
                    )}
                    {item.path === "/admin/spare-parts" && pendingSparePartsCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded animate-pulse">
                        {pendingSparePartsCount}
                      </span>
                    )}
                    {item.path === "/admin/business-partners" && pendingBusinessPartnerCount > 0 && (
                      <span className="ml-2 bg-purple-500 text-white text-xs px-2 py-1 rounded animate-pulse">
                        {pendingBusinessPartnerCount}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          

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
