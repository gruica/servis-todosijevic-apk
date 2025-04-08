import { isNativeMobile } from "@/capacitor";

/**
 * Poziva klijenta kroz nativni Android intent
 * @param phoneNumber - Broj telefona koji će biti pozvan
 * @returns Boolean da li je poziv uspešan
 */
export async function callPhoneNumber(phoneNumber: string): Promise<boolean> {
  if (!isNativeMobile) {
    // U web okruženju prikazujemo link za pozivanje
    window.location.href = `tel:${phoneNumber}`;
    return true;
  }

  // U mobilnom okruženju koristimo Capacitor API
  try {
    // Kreiramo URL za telefonski poziv
    const callUrl = `tel:${phoneNumber}`;
    
    // Koristimo window.open jer Capacitor to automatski konvertuje u nativni poziv
    window.open(callUrl, '_system');
    return true;
  } catch (error) {
    console.error('Greška pri pozivu broja:', error);
    return false;
  }
}

/**
 * Otvara mapu sa lokacijom klijenta kroz nativni Android intent
 * @param address - Adresa koja će biti prikazana na mapi
 * @param city - Opcioni grad za bolju pretragu
 * @returns Boolean da li je otvaranje uspešno
 */
export async function openMapWithAddress(address: string, city: string | null = null): Promise<boolean> {
  try {
    // Formiramo punu adresu
    const fullAddress = city ? `${address}, ${city}` : address;
    
    // Formatiramo adresu za Google Maps
    const encodedAddress = encodeURIComponent(fullAddress);
    const mapUrl = `https://maps.google.com/maps?q=${encodedAddress}`;
    
    // Koristimo window.open jer Capacitor to automatski konvertuje u nativni intent
    window.open(mapUrl, '_system');
    
    // Vraćamo uspeh
    return true;
  } catch (error) {
    console.error('Greška pri otvaranju mape:', error);
    return false;
  }
}

/**
 * Proverava da li je aplikacija pokrenuta u mobilnom okruženju (native ili web)
 * Korisno za prikazivanje/sakrivanje funkcionalnosti specifičnih za mobilni uređaj
 * Prepoznaje i mobile web i native mobilne aplikacije
 */
export function isMobileEnvironment(): boolean {
  // Prvo proverimo da li je nativna Android/iOS aplikacija
  if (isNativeMobile) {
    return true;
  }
  
  // Ako nije native, proverimo da li je mobilni web browser
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  // Regularni izraz za prepoznavanje mobilnih uređaja
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  
  // Proveravamo i širinu ekrana kao dodatni indikator
  const isMobileWidth = window.innerWidth < 768;
  
  return mobileRegex.test(userAgent.toLowerCase()) || isMobileWidth;
}