import { useState, useEffect } from "react";

// Mobilni breakpoint (u skladu sa Tailwind md breakpoint)
const MOBILE_BREAKPOINT = 768;

export function useMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Handler funkcija
    const updateScreenSize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Inicijalno postavljanje
    updateScreenSize();
    
    // Dodavanje listenera
    mediaQuery.addEventListener("change", updateScreenSize);
    
    // Čišćenje
    return () => mediaQuery.removeEventListener("change", updateScreenSize);
  }, []);

  return { isMobile };
}

// Alternativni export za podršku legacy koda
export const useIsMobile = useMobile;