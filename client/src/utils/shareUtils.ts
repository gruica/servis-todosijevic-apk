// Web Share API utility funkcije
export interface ShareData {
  title: string;
  text: string;
  url?: string;
}

// Funkcija za dobavljanje production URL-a
function getProductionUrl(): string {
  // Ako je development (replit.dev), koristi production URL
  if (window.location.origin.includes('replit.dev')) {
    return 'https://tehnikamne.me'; // Production domen
  }
  // Inače koristi trenutni origin (već je production)
  return window.location.origin;
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
    
    // Prikaži detaljnu notifikaciju sa preview-om
    const previewLength = 200;
    const preview = textToCopy.length > previewLength ? 
      textToCopy.substring(0, previewLength) + '...' : textToCopy;
    
    const confirmed = confirm(`✅ SADRŽAJ KOPIRAN U CLIPBOARD!\n\nPreview sadržaja:\n"${preview}"\n\n💡 INSTRUKCIJE:\n1. Otvorite Viber/WhatsApp/Email\n2. Pritisnite Ctrl+V (Windows) ili Cmd+V (Mac)\n3. Poslati će se kompletan sadržaj sa svim detaljima\n\nKliknite OK za zatvaranje`);
    
    if (!confirmed) {
      // Ako korisnik klikne Cancel, pokušaj sa share dialog-om
      openShareDialog(data);
    }
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
  // Izvuci informacije o servisu, klijentu i aparatu iz povezanih objekata
  const service = order.service;
  const client = service?.client;
  const appliance = service?.appliance;
  const technician = order.technician || service?.technician;
  
  // Formiraj kompletan opis za dobavljača
  const applianceInfo = appliance ? 
    `${appliance.manufacturer?.name || 'Nepoznat proizvodjac'} ${appliance.model || 'Nepoznat model'}` : 
    'Nepoznat uređaj';
  
  const serialNumber = appliance?.serialNumber || 'Nepoznat S/N';
  const warrantyStatus = service?.warrantyStatus || 'Nepoznato';
  const clientInfo = client ? 
    `${client.fullName}${client.address ? `, ${client.address}` : ''}${client.city ? `, ${client.city}` : ''}` : 
    'Nepoznat klijent';
  
  const shareData: ShareData = {
    title: '🔧 ZAHTEV ZA REZERVNI DEO - Frigo Sistem',
    text: `📋 DEO: ${order.partName}${order.partNumber ? ` (${order.partNumber})` : ''}

🏠 KLIJENT: ${clientInfo}
📱 Telefon: ${client?.phone || 'N/A'}

🔧 UREĐAJ: ${applianceInfo}
📟 S/N: ${serialNumber}
⚖️ GARANCIJA: ${warrantyStatus}

👨‍🔧 TEHNIKER: ${technician?.fullName || technician?.name || 'N/A'}
📞 Tel: ${technician?.phone || 'N/A'}

📦 KOLIČINA: ${order.quantity}
⚠️ PRIORITET: ${getUrgencyText(order.urgency)}
⏰ STATUS: ${getStatusEmoji(order.status)} ${getStatusText(order.status)}

💰 PROCJENA: ${order.estimatedCost || 'N/A'} EUR
💵 STVARNA: ${order.actualCost || 'N/A'} EUR
🏪 DOBAVLJAČ: ${order.supplierName || 'N/A'}

📝 OPIS: ${order.description || 'Nema dodatnog opisa'}

🆔 Porudžbina #${order.id}${service ? ` | Servis #${service.id}` : ''}

🔗 Detalji: ${getProductionUrl()}/admin/spare-parts?order=${order.id}`
  };
  
  return shareContent(shareData);
}

export function shareServiceInfo(service: any): Promise<boolean> {
  // Izvuci informacije o klijentu i aparatu iz povezanih objekata
  const client = service.client;
  const appliance = service.appliance;
  const technician = service.technician;
  
  // Formiraj detaljne informacije o aparatu
  const applianceInfo = appliance ? 
    `${appliance.manufacturer?.name || 'Nepoznat proizvodjac'} ${appliance.model || 'Nepoznat model'}` : 
    'Nepoznat uređaj';
  
  const serialNumber = appliance?.serialNumber || 'Nepoznat S/N';
  const category = appliance?.category?.name || 'Nepoznata kategorija';
  
  // Formiraj informacije o klijentu  
  const clientInfo = client ? 
    `${client.fullName}${client.address ? `, ${client.address}` : ''}${client.city ? `, ${client.city}` : ''}` : 
    'Nepoznat klijent';
  
  // Formatiranje datuma
  const createdDate = service.createdAt ? new Date(service.createdAt).toLocaleDateString('sr-Cyrl-ME') : 'N/A';
  const scheduledDate = service.scheduledDate ? new Date(service.scheduledDate).toLocaleDateString('sr-Cyrl-ME') : 'Nije zakazano';
  const completedDate = service.status === 'completed' && service.updatedAt ? 
    new Date(service.updatedAt).toLocaleDateString('sr-Cyrl-ME') : 'N/A';
  
  // Status sa emoji
  const statusWithEmoji = getServiceStatusEmoji(service.status) + ' ' + getServiceStatusText(service.status);
  
  const shareData: ShareData = {
    title: '🔧 SERVIS INFORMACIJE - Frigo Sistem',
    text: `📋 SERVIS #${service.id} - ${statusWithEmoji}

🏠 KLIJENT: ${clientInfo}
📱 Telefon: ${client?.phone || 'N/A'}
📧 Email: ${client?.email || 'N/A'}
${client?.companyName ? `🏢 Kompanija: ${client.companyName}` : ''}

🔧 UREĐAJ: ${applianceInfo}
📦 Kategorija: ${category}
📟 S/N: ${serialNumber}

👨‍🔧 SERVISER: ${technician?.fullName || 'Nije dodeljen'}
📞 Tel. servisera: ${technician?.phone || 'N/A'}
🔧 Specijalizacija: ${technician?.specialization || 'N/A'}

📅 DATUM KREIRANJA: ${createdDate}
⏰ DATUM ZAKAZIVANJA: ${scheduledDate}
${service.status === 'completed' ? `✅ DATUM ZAVRŠETKA: ${completedDate}` : ''}

📋 PROBLEM: ${service.description || 'Nema opisa'}
${service.technicianNotes ? `👨‍🔧 NAPOMENE SERVISERA: ${service.technicianNotes}` : ''}
${service.usedParts ? `🔧 KORIŠĆENI DIJELOVI: ${service.usedParts}` : ''}
${service.machineNotes ? `⚙️ NAPOMENE O APARATU: ${service.machineNotes}` : ''}
${service.cost ? `💰 TROŠKOVI: ${service.cost} EUR` : ''}
${service.isCompletelyFixed !== undefined ? (service.isCompletelyFixed ? '✅ POTPUNO ISPRAVLJEN' : '⚠️ DJELOMIČNO ISPRAVLJEN') : ''}

⚠️ PRIORITET: ${service.priority ? service.priority.toUpperCase() : 'NORMALAN'}
${service.devicePickedUp ? `📦 UREĐAJ PREUZET: ${service.pickupDate ? new Date(service.pickupDate).toLocaleDateString('sr-Cyrl-ME') : 'Da'}` : '🏠 UREĐAJ KOD KLIJENTA'}
${service.isWarrantyService ? '🛡️ GARANTNI SERVIS' : '💰 VANGARANTNI SERVIS'}

🔗 Detalji: ${getProductionUrl()}/admin/services?service=${service.id}`
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

🆔 Klijent #${client.id}

🔗 Detalji: ${getProductionUrl()}/admin/clients/${client.id}`
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

function getUrgencyText(urgency: string): string {
  const urgencyTexts: Record<string, string> = {
    'normal': 'Normalno',
    'high': 'Visoko',
    'urgent': 'Hitno'
  };
  return urgencyTexts[urgency] || urgency;
}

// Service status helper funkcije
function getServiceStatusEmoji(status: string): string {
  const statusEmojis: Record<string, string> = {
    'pending': '⏳',
    'in_progress': '🔧',
    'completed': '✅',
    'cancelled': '❌',
    'waiting_parts': '📦',
    'scheduled': '📅'
  };
  return statusEmojis[status] || '📋';
}

function getServiceStatusText(status: string): string {
  const statusTexts: Record<string, string> = {
    'pending': 'Na čekanju',
    'in_progress': 'U toku',
    'completed': 'Završen',
    'cancelled': 'Otkazan',
    'waiting_parts': 'Čeka dijelove',
    'scheduled': 'Zakazan'
  };
  return statusTexts[status] || status;
}