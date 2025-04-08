import { Button } from "@/components/ui/button";
import { callPhoneNumber } from "@/lib/mobile-utils";
import { PhoneCall } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface CallClientButtonProps {
  phoneNumber: string;
  clientName?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
}

/**
 * Komponenta za pozivanje klijenta
 * 
 * @example
 * <CallClientButton 
 *   phoneNumber="069123456" 
 *   clientName="Marko Marković" 
 *   variant="outline" 
 *   size="sm"
 * />
 */
export function CallClientButton({ 
  phoneNumber, 
  clientName, 
  variant = "default", 
  size = "default",
  showIcon = true,
  fullWidth = false,
  disabled = false
}: CallClientButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleCall = async () => {
    setIsLoading(true);
    
    try {
      const success = await callPhoneNumber(phoneNumber);
      
      if (success) {
        const message = clientName 
          ? `Pozivanje klijenta ${clientName}`
          : `Pozivanje broja ${phoneNumber}`;
        
        toast({
          title: "Pozivanje u toku",
          description: message,
        });
      } else {
        toast({
          title: "Greška pri pozivu",
          description: "Nije moguće uspostaviti poziv. Proverite dozvole aplikacije.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Greška pri pozivu:", error);
      toast({
        title: "Greška pri pozivu",
        description: "Došlo je do neočekivane greške pri pozivu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      onClick={handleCall}
      variant={variant}
      size={size}
      disabled={isLoading || disabled}
      className={fullWidth ? "w-full" : ""}
    >
      {showIcon && <PhoneCall className="h-4 w-4 mr-2" />}
      {isLoading ? "Pozivanje..." : "Pozovi"}
    </Button>
  );
}