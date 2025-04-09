import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    // Ako je nevalidan datum, samo vrati originalni string
    return dateString;
  }
  
  // Format: DD.MM.YYYY.
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}.${month}.${year}.`;
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return dateString;
  }
  
  // Format: DD.MM.YYYY. HH:MM
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}.${month}.${year}. ${hours}:${minutes}`;
}

export function formatCurrency(amount: string | number): string {
  if (amount === null || amount === undefined) return '0,00 €';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return '0,00 €';
  
  return numericAmount.toLocaleString('sr-ME', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  });
}

// Format telefona u lepši oblik: +382 69 123 456
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Uklonimo sve osim brojeva i + znaka
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ako je crnogorski broj (+382)
  if (cleaned.startsWith('+382') && cleaned.length >= 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  
  // Ako počinje sa 0
  if (cleaned.startsWith('0') && cleaned.length >= 9) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  // Default format za ostale brojeve
  return cleaned.replace(/(\d{3})(\d{3})(\d{3,4})/, '$1 $2 $3');
}

// Pretvaranje statusa servisa u prevodljiv format
export function translateServiceStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Na čekanju',
    'scheduled': 'Zakazano',
    'in_progress': 'U procesu',
    'waiting_parts': 'Čeka delove',
    'completed': 'Završeno',
    'cancelled': 'Otkazano'
  };
  
  return statusMap[status] || status;
}