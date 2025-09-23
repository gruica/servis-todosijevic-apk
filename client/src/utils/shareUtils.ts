// Web Share API utility funkcije
export interface ShareData {
  title: string;
  text: string;
  url?: string;
}

// Glavna funkcija za dijeljenje sadržaja
export async function shareContent(data: ShareData): Promise<boolean> {
  // Proverava Web Share API podršku
  if (navigator.share && navigator.canShare && navigator.canShare(data)) {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('Greška pri dijeljenju:', error);
      // Fallback na custom dijeljenje
      return fallbackShare(data);
    }
  } else {
    // Fallback za browsere koji ne podržavaju Web Share API
    return fallbackShare(data);
  }
}

// Fallback funkcija za starije browsere
function fallbackShare(data: ShareData): boolean {
  try {
    // Copy to clipboard
    const textToCopy = `${data.title}\n\n${data.text}${data.url ? `\n\n${data.url}` : ''}`;
    navigator.clipboard.writeText(textToCopy);
    
    // Prikaži notifikaciju
    alert('Sadržaj kopiran u clipboard! Možete ga podijeliti u Viber, WhatsApp ili bilo kojoj aplikaciji.');
    return true;
  } catch (error) {
    console.error('Greška pri kopiranju:', error);
    
    // Poslednji fallback - otvori URL selektore
    openShareDialog(data);
    return true;
  }
}

// Custom share dialog za dodatne opcije
function openShareDialog(data: ShareData) {
  const encodedText = encodeURIComponent(`${data.title}\n\n${data.text}`);
  const encodedUrl = data.url ? encodeURIComponent(data.url) : '';
  
  // Kreiraj share opcije
  const shareOptions = [
    {
      name: 'Viber',
      url: `viber://forward?text=${encodedText}${encodedUrl ? '%0A' + encodedUrl : ''}`,
      fallback: () => window.open(`https://www.viber.com/en/`, '_blank')
    },
    {
      name: 'WhatsApp', 
      url: `https://wa.me/?text=${encodedText}${encodedUrl ? '%0A' + encodedUrl : ''}`,
      fallback: () => window.open(`https://web.whatsapp.com/`, '_blank')
    },
    {
      name: 'Telegram',
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      fallback: () => window.open(`https://web.telegram.org/`, '_blank')
    }
  ];
  
  // Pokušaj deep link-ove
  shareOptions.forEach(option => {
    const link = document.createElement('a');
    link.href = option.url;
    link.target = '_blank';
    link.style.display = 'none';
    document.body.appendChild(link);
    
    try {
      link.click();
    } catch (error) {
      option.fallback();
    }
    
    document.body.removeChild(link);
  });
}

// Specifične funkcije za dijeljenje različitih tipova sadržaja

export function shareSparePartOrder(order: any): Promise<boolean> {
  const shareData: ShareData = {
    title: '🔧 ZAHTEV ZA REZERVNI DEO - Frigo Sistem',
    text: `📋 Deo: ${order.partName}
🏠 Klijent: ${order.clientName || 'N/A'}
📍 Lokacija: ${order.clientAddress || 'N/A'}
👨‍🔧 Tehniker: ${order.technicianName || 'N/A'}
⏰ Status: ${getStatusEmoji(order.status)} ${getStatusText(order.status)}
💰 Cena: ${order.estimatedCost || order.actualCost || 'N/A'} RSD
📝 Opis: ${order.description || 'Nema opisa'}

🆔 Porudžbina #${order.id}`,
    url: window.location.origin + `/admin/spare-parts?order=${order.id}`
  };
  
  return shareContent(shareData);
}

export function shareServiceInfo(service: any): Promise<boolean> {
  const shareData: ShareData = {
    title: '🔧 SERVIS INFORMACIJE - Frigo Sistem',
    text: `🏠 Klijent: ${service.clientName}
📍 Adresa: ${service.address}
📱 Telefon: ${service.phone}
🔧 Uređaj: ${service.deviceType}
📋 Problem: ${service.description}
👨‍🔧 Tehniker: ${service.technicianName}
⏰ Status: ${service.status}
📅 Datum: ${new Date(service.createdAt).toLocaleDateString('sr-RS')}

🆔 Servis #${service.id}`,
    url: window.location.origin + `/admin/services/${service.id}`
  };
  
  return shareContent(shareData);
}

export function shareClientInfo(client: any): Promise<boolean> {
  const shareData: ShareData = {
    title: '👤 KLIJENT INFORMACIJE - Frigo Sistem',
    text: `🏠 Ime: ${client.name}
📍 Adresa: ${client.address}
📱 Telefon: ${client.phone}
📧 Email: ${client.email || 'N/A'}
💼 Tip: ${client.type || 'Fizičko lice'}

🆔 Klijent #${client.id}`,
    url: window.location.origin + `/admin/clients/${client.id}`
  };
  
  return shareContent(shareData);
}

// Helper funkcije
function getStatusEmoji(status: string): string {
  const statusEmojis: Record<string, string> = {
    'pending': '⏳',
    'requested': '📝', 
    'admin_ordered': '🛒',
    'received': '📦',
    'available': '✅',
    'consumed': '✅',
    'waiting_delivery': '🚚'
  };
  return statusEmojis[status] || '📋';
}

function getStatusText(status: string): string {
  const statusTexts: Record<string, string> = {
    'pending': 'Na čekanju',
    'requested': 'Zahtevano',
    'admin_ordered': 'Admin poručio',
    'received': 'Stigao',
    'available': 'Dostupan',
    'consumed': 'Iskorišćen',
    'waiting_delivery': 'Čeka dostavu'
  };
  return statusTexts[status] || status;
}