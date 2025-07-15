import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useMobile } from "@/hooks/use-mobile";
import { AdminProfileWidget } from "@/components/admin/profile-widget";
import { useAuth } from "@/hooks/use-auth";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { LogOut } from "lucide-react";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useMobile();
  const { logoutMutation } = useAuth();
  
  return (
    <header className="bg-white shadow-sm flex-shrink-0">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden"
          >
            <span className="material-icons">menu</span>
          </Button>
          <h1 className="text-xl font-medium text-primary ml-2 md:hidden">Frigo Sistem Todosijević</h1>
        </div>
        
        <div className="flex-1 max-w-3xl mx-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="material-icons text-gray-400">search</span>
            </span>
            <Input
              type="text"
              placeholder="Pretraga"
              className="w-full pl-10 pr-4 bg-gray-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <NotificationsDropdown />
          <Button
            variant="outline"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Odjavi se
          </Button>
          <AdminProfileWidget />
        </div>
      </div>
    </header>
  );
}
