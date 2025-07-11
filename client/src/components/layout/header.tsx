import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, Search } from "lucide-react";
import { AdminProfileWidget } from "@/components/admin/profile-widget";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  return (
    <header className="bg-white shadow-sm flex-shrink-0 sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className={`text-xl font-medium text-primary ${isMobile ? 'text-sm' : ''}`}>
            {isMobile ? 'Frigo Sistem' : 'Frigo Sistem Todosijević'}
          </h1>
        </div>
        
        {!isMobile && (
          <div className="flex-1 max-w-3xl mx-4">
            <div className="relative">
              <Search className="absolute inset-y-0 left-0 flex items-center pl-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Pretraga"
                className="w-full pl-10 pr-4 bg-gray-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          {isMobile && (
            <Button variant="ghost" size="icon" className="md:hidden">
              <Search className="h-5 w-5" />
            </Button>
          )}
          <AdminProfileWidget />
        </div>
      </div>
    </header>
  );
}
