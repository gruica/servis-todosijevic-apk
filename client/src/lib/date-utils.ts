/**
 * Pomoćne funkcije za rad sa datumima
 */

/**
 * Formatira datum kao relativni datum (pre X dana, itd.)
 * @param date Datum koji treba formatirati
 * @returns Formatiran relativni datum
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Manje od minuta
  if (diffInSeconds < 60) {
    return "upravo sada";
  }
  
  // Manje od sata
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `pre ${minutes} ${minutes === 1 ? 'minut' : minutes < 5 ? 'minuta' : 'minuta'}`;
  }
  
  // Manje od dana
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `pre ${hours} ${hours === 1 ? 'sat' : hours < 5 ? 'sata' : 'sati'}`;
  }
  
  // Manje od nedelje
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `pre ${days} ${days === 1 ? 'dan' : 'dana'}`;
  }
  
  // Manje od mjeseca
  if (diffInSeconds < 2419200) { // ~4 nedelje
    const weeks = Math.floor(diffInSeconds / 604800);
    return `pre ${weeks} ${weeks === 1 ? 'nedelju' : 'nedelje'}`;
  }
  
  // Manje od godine
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2419200);
    return `pre ${months} ${months === 1 ? 'mjesec' : months < 5 ? 'mjeseca' : 'mjeseci'}`;
  }
  
  // Više od godine
  const years = Math.floor(diffInSeconds / 31536000);
  return `pre ${years} ${years === 1 ? 'godinu' : years < 5 ? 'godine' : 'godina'}`;
}

/**
 * Formatira datum u format dd.mm.yyyy.
 * @param date Datum koji treba formatirati
 * @returns Formatiran lokalni datum
 */
export function formatLocalDate(date: Date): string {
  return date.toLocaleDateString('sr-Latn-ME', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formatira datum i vrijeme u format dd.mm.yyyy. HH:MM:SS
 * @param date Datum koji treba formatirati
 * @returns Formatiran lokalni datum i vrijeme
 */
export function formatLocalDateTime(date: Date): string {
  return date.toLocaleDateString('sr-Latn-ME', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Formatira vrijeme u format HH:MM
 * @param date Datum koji treba formatirati
 * @returns Formatiran lokalni datum
 */
export function formatLocalTime(date: Date): string {
  return date.toLocaleTimeString('sr-Latn-ME', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}