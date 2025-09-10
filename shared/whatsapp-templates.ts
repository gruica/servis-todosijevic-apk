/**
 * FRIGO SISTEM TODOSIJEVIĆ - WHATSAPP BUSINESS TEMPLATES
 * Profesionalni template-i za WhatsApp Business komunikaciju
 * Montenegro (Crna Gora) - 2025
 */

// ========================================================================================
// 1. SERVISNI TEMPLATE-I
// ========================================================================================

export const SERVICE_TEMPLATES = {
  // Potvrda prijema zahteva za servis
  SERVICE_REQUEST_CONFIRMED: {
    id: 'service_request_confirmed',
    name: 'Potvrda zahteva za servis',
    message: `🔧 *FRIGO SISTEM TODOSIJEVIĆ*

Poštovani/a {{CLIENT_NAME}},

Vaš zahtev za servis je uspešno primljen:

📋 *Detalji servisa:*
• Uređaj: {{APPLIANCE_TYPE}} {{BRAND}}
• Problem: {{ISSUE_DESCRIPTION}}
• Adresa: {{ADDRESS}}
• Broj zahteva: #{{SERVICE_ID}}

👨‍🔧 Naš tehničar će Vas kontaktirati u roku od 2 radna sata radi zakazivanja termina.

📞 Za hitne slučajeve: +382 67 051 141
🌐 www.frigosistemtodosijevic.me

Hvala Vam na poverenju! 🙏`,
    variables: ['CLIENT_NAME', 'APPLIANCE_TYPE', 'BRAND', 'ISSUE_DESCRIPTION', 'ADDRESS', 'SERVICE_ID']
  },

  // Zakazivanje termina
  APPOINTMENT_SCHEDULED: {
    id: 'appointment_scheduled',
    name: 'Potvrda zakazanog termina',
    message: `📅 *TERMIN ZAKAZAN*

Poštovani/a {{CLIENT_NAME}},

Vaš termin za servis je zakazan:

🗓️ *Datum:* {{DATE}}
⏰ *Vreme:* {{TIME}}
👨‍🔧 *Tehničar:* {{TECHNICIAN_NAME}}
📍 *Adresa:* {{ADDRESS}}

📋 *Servis:* {{APPLIANCE_TYPE}} - {{ISSUE_DESCRIPTION}}

⚠️ *Molimo Vas da budete dostupni na navedenom terminu.*

Za izmene termina kontaktirajte nas:
📞 +382 67 051 141

*FRIGO SISTEM TODOSIJEVIĆ*`,
    variables: ['CLIENT_NAME', 'DATE', 'TIME', 'TECHNICIAN_NAME', 'ADDRESS', 'APPLIANCE_TYPE', 'ISSUE_DESCRIPTION']
  },

  // Tehničar je na putu
  TECHNICIAN_ON_WAY: {
    id: 'technician_on_way',
    name: 'Tehničar je na putu',
    message: `🚐 *TEHNIČAR JE NA PUTU*

Poštovani/a {{CLIENT_NAME}},

Naš tehničar {{TECHNICIAN_NAME}} je na putu ka Vašoj adresi.

⏱️ *Očekivano vreme dolaska:* {{ESTIMATED_ARRIVAL}}
📍 *Vaša adresa:* {{ADDRESS}}

👨‍🔧 Tehničar će Vas kontaktirati kada stigne ispred zgrade.

*FRIGO SISTEM TODOSIJEVIĆ*
📞 +382 67 051 141`,
    variables: ['CLIENT_NAME', 'TECHNICIAN_NAME', 'ESTIMATED_ARRIVAL', 'ADDRESS']
  },

  // Servis je završen
  SERVICE_COMPLETED: {
    id: 'service_completed',
    name: 'Servis je završen',
    message: `✅ *SERVIS USPEŠNO ZAVRŠEN*

Poštovani/a {{CLIENT_NAME}},

Vaš uređaj je uspešno popravljen:

🔧 *Izvršeni radovi:*
{{WORK_PERFORMED}}

💰 *Ukupna cena:* {{TOTAL_COST}} EUR
💳 *Način plaćanja:* {{PAYMENT_METHOD}}

📝 *Garancija:* {{WARRANTY_PERIOD}} meseci na izvršene radove

⭐ Molimo Vas da ocenite našu uslugu na Google-u.

Hvala Vam na poverenju!

*FRIGO SISTEM TODOSIJEVIĆ*
📞 +382 67 051 141`,
    variables: ['CLIENT_NAME', 'WORK_PERFORMED', 'TOTAL_COST', 'PAYMENT_METHOD', 'WARRANTY_PERIOD']
  },

  // Potrebni su rezervni delovi
  PARTS_NEEDED: {
    id: 'parts_needed',
    name: 'Potrebni rezervni delovi',
    message: `🔧 *POTREBNI REZERVNI DELOVI*

Poštovani/a {{CLIENT_NAME}},

Nakon dijagnostike Vašeg {{APPLIANCE_TYPE}}, ustanovljeno je:

🔍 *Problem:* {{DIAGNOSIS}}

🛠️ *Potrebni delovi:*
{{PARTS_LIST}}

💰 *Procenjena cena delova:* {{PARTS_COST}} EUR
💳 *Cena rada:* {{LABOR_COST}} EUR
💵 *UKUPNO:* {{TOTAL_COST}} EUR

⏳ *Vreme nabavke:* {{DELIVERY_TIME}}

Da li želite da nastavimo sa popravkom?
Odgovorite sa DA ili NE.

*FRIGO SISTEM TODOSIJEVIĆ*`,
    variables: ['CLIENT_NAME', 'APPLIANCE_TYPE', 'DIAGNOSIS', 'PARTS_LIST', 'PARTS_COST', 'LABOR_COST', 'TOTAL_COST', 'DELIVERY_TIME']
  },

  // Klijent odbija popravku
  SERVICE_REFUSED: {
    id: 'service_refused',
    name: 'Klijent odbija popravku',
    message: `❌ *POPRAVKA OTKAZANA*

Poštovani/a {{CLIENT_NAME}},

Razumemo Vašu odluku da ne nastavite sa popravkom.

📋 *Detalji:*
• Uređaj: {{APPLIANCE_TYPE}}
• Dijagnoza: {{DIAGNOSIS}}
• Razlog otkazivanja: {{REFUSAL_REASON}}

💰 *Naplaćujemo samo:*
• Izlazak i dijagnostiku: {{DIAGNOSTIC_FEE}} EUR

💳 *Način plaćanja:* {{PAYMENT_METHOD}}

📝 *Napomene:*
• Uređaj ostaje u istom stanju
• Dijagnoza važi 30 dana
• Možete se predomisliti u roku od 7 dana

Hvala Vam na razumevanju.

*FRIGO SISTEM TODOSIJEVIĆ*
📞 +382 67 051 141`,
    variables: ['CLIENT_NAME', 'APPLIANCE_TYPE', 'DIAGNOSIS', 'REFUSAL_REASON', 'DIAGNOSTIC_FEE', 'PAYMENT_METHOD']
  },

  // Upload fotografija
  PHOTOS_UPLOADED: {
    id: 'photos_uploaded',
    name: 'Fotografije uploaded',
    message: `📸 *FOTOGRAFIJE POSLATE*

Poštovani/a {{CLIENT_NAME}},

Naš tehničar {{TECHNICIAN_NAME}} je poslao fotografije Vašeg {{APPLIANCE_TYPE}}:

🔍 *Status:* {{REPAIR_STATUS}}
📷 *Broj fotografija:* {{PHOTO_COUNT}}

Možete pogledati fotografije na linku koji će biti poslat putem email-a.

{{ADDITIONAL_MESSAGE}}

*FRIGO SISTEM TODOSIJEVIĆ*`,
    variables: ['CLIENT_NAME', 'TECHNICIAN_NAME', 'APPLIANCE_TYPE', 'REPAIR_STATUS', 'PHOTO_COUNT', 'ADDITIONAL_MESSAGE']
  }
};

// ========================================================================================
// 2. AUTOMATSKI ODGOVORI ZA ČESTA PITANJA
// ========================================================================================

export const AUTO_REPLIES = {
  // Radno vreme
  BUSINESS_HOURS: {
    keywords: ['radno vreme', 'radimo', 'otvoreno', 'zatvoreno', 'kada radite'],
    message: `🕒 *RADNO VREME*

📅 *Ponedeljak - Petak:* 08:00 - 17:00h
📅 *Subota:* 08:00 - 14:00h  
📅 *Nedelja:* ZATVORENO

🚨 *Hitni servis (24/7):*
📞 +382 67 051 141

📍 *Adresa:*
Podgorica, Crna Gora

*FRIGO SISTEM TODOSIJEVIĆ*`
  },

  // Cenovnik
  PRICING_INFO: {
    keywords: ['cena', 'cene', 'cenovnik', 'koliko košta', 'tarifa'],
    message: `💰 *CENOVNIK USLUGA*

🔧 *Osnovne usluge:*
• Izlazak i dijagnostika: 15 EUR
• Čišćenje klima uređaja: 25-40 EUR
• Popravka frižidera: 30-80 EUR
• Popravka veš mašine: 35-90 EUR

⚡ *Hitni servis (van radnog vremena):*
• Dodatno +50% na cenu usluge

📋 *Rezervni delovi:*
• Po fabrižkome cenovniku
• Garancija 12 meseci

📞 Za tačnu procenu kontaktirajte:
+382 67 051 141

*FRIGO SISTEM TODOSIJEVIĆ*`
  },

  // Brendovi koje servisiramo
  SUPPORTED_BRANDS: {
    keywords: ['brendovi', 'marka', 'marke', 'koju marku', 'servis marka'],
    message: `🏭 *BRENDOVI KOJE SERVISIRAMO*

❄️ *Frižideri & Zamrzivaći:*
Samsung, LG, Gorenje, Beko, Bosch, Siemens, Whirlpool, Electrolux

🌪️ *Klima uređaji:*
Mitsubishi, Daikin, Samsung, LG, Gree, Hisense, Panasonic

👕 *Veš mašine:*
Bosch, Samsung, LG, Gorenje, Beko, Whirlpool, Miele

🍽️ *Sudmašine:*
Bosch, Siemens, Gorenje, Beko, Samsung

🔥 *Šporeti & Rerne:*
Gorenje, Beko, Bosch, Samsung, Electrolux

📞 Za ostale brendove kontaktirajte: +382 67 051 141

*FRIGO SISTEM TODOSIJEVIĆ*`
  },

  // Kontakt informacije
  CONTACT_INFO: {
    keywords: ['kontakt', 'telefon', 'broj', 'adresa', 'gde se nalazite'],
    message: `📞 *KONTAKT INFORMACIJE*

🏢 *FRIGO SISTEM TODOSIJEVIĆ*

📱 *Telefon/WhatsApp:* +382 67 051 141
📧 *Email:* info@frigosistemtodosijevic.me
🌐 *Website:* www.frigosistemtodosijevic.me

📍 *Adresa:*
Podgorica, Crna Gora

🕒 *Radno vreme:*
Pon-Pet: 08:00-17:00h
Subota: 08:00-14:00h

🚨 *Hitni servis: 24/7*

Kontaktirajte nas bilo kada! 💬`
  },

  // Generička pomoć
  HELP: {
    keywords: ['help', 'pomoć', 'pomoc', 'pomagaj', 'šta mogu', 'opcije'],
    message: `🤖 *FRIGO SISTEM TODOSIJEVIĆ - POMOĆ*

Evo šta možete da radite:

📋 *Zakazivanje servisa:*
Pošaljite "SERVIS" + opis problema

💰 *Informacije o cenama:*
Pošaljite "CENE" ili "CENOVNIK"

🏭 *Brendovi koje servisiramo:*
Pošaljite "BRENDOVI" ili "MARKE"

📞 *Kontakt informacije:*
Pošaljite "KONTAKT"

🕒 *Radno vreme:*
Pošaljite "RADNO VREME"

👨‍💼 Za direktan razgovor sa operaterom:
📞 +382 67 051 141

*Hvala što ste izabrali naše usluge!* 🙏`
  }
};

// ========================================================================================
// 3. TEMPLATE-I ZA BUSINESS PARTNERE
// ========================================================================================

export const BUSINESS_PARTNER_TEMPLATES = {
  SERVICE_ASSIGNED: {
    id: 'bp_service_assigned',
    name: 'Servis dodeljen partneru',
    message: `🤝 *NOVI SERVIS ZAHTEV*

Poštovani partneru,

Dodeljen Vam je novi servis:

📋 *Detalji:*
• ID: #{{SERVICE_ID}}
• Klijent: {{CLIENT_NAME}}
• Telefon: {{CLIENT_PHONE}}
• Adresa: {{ADDRESS}}
• Uređaj: {{APPLIANCE_TYPE}} {{BRAND}}
• Problem: {{ISSUE_DESCRIPTION}}

⏰ *Rok:* {{DEADLINE}}

Molimo potvrdite prijem zahteva.

*FRIGO SISTEM TODOSIJEVIĆ*`,
    variables: ['SERVICE_ID', 'CLIENT_NAME', 'CLIENT_PHONE', 'ADDRESS', 'APPLIANCE_TYPE', 'BRAND', 'ISSUE_DESCRIPTION', 'DEADLINE']
  }
};

// ========================================================================================
// 4. EMERGENCY & SPECIAL TEMPLATES
// ========================================================================================

export const EMERGENCY_TEMPLATES = {
  AFTER_HOURS: {
    id: 'after_hours',
    name: 'Van radnog vremena',
    message: `🌙 *VAN RADNOG VREMENA*

Trenutno je van našeg radnog vremena.

🕒 *Radno vreme:*
• Pon-Pet: 08:00-17:00h
• Subota: 08:00-14:00h
• Nedelja: ZATVORENO

🚨 *Za hitne slučajeve (24/7):*
📞 +382 67 051 141

💬 Možete nam poslati poruku, odgovoriće mo čim budemo dostupni.

*FRIGO SISTEM TODOSIJEVIĆ*`
  },

  WEEKEND_EMERGENCY: {
    id: 'weekend_emergency',
    name: 'Vikend hitni slučaj',
    message: `🆘 *VIKEND HITNI SERVIS*

Za hitne kvarove tokom vikenda:

⚡ *Hitni broj: +382 67 051 141*

💰 *Vikend tarifa:*
• Izlazak: 25 EUR
• Rad: +50% na standardnu cenu

⏰ *Vreme odziva: 2-4 sata*

🚨 Hitni servis je dostupan za:
• Kvar frižidera/zamrzivača
• Kvar klima uređaja (leto)
• Curenje vode
• Kratki spoj

*FRIGO SISTEM TODOSIJEVIĆ*`
  }
};

// ========================================================================================
// 5. TEMPLATE UTILITY FUNCTIONS
// ========================================================================================

export interface WhatsAppTemplate {
  id: string;
  name: string;
  message: string;
  variables?: string[];
}

export interface AutoReply {
  keywords: string[];
  message: string;
}

/**
 * Replaces template variables with actual values
 */
export function fillTemplate(template: WhatsAppTemplate, variables: Record<string, string>): string {
  let message = template.message;
  
  if (template.variables) {
    template.variables.forEach(variable => {
      const value = variables[variable] || `{{${variable}}}`;
      message = message.replace(new RegExp(`{{${variable}}}`, 'g'), value);
    });
  }
  
  return message;
}

/**
 * Finds auto-reply based on keywords in user message
 */
export function findAutoReply(userMessage: string): string | null {
  const normalizedMessage = userMessage.toLowerCase();
  
  for (const reply of Object.values(AUTO_REPLIES)) {
    if (reply.keywords.some(keyword => normalizedMessage.includes(keyword))) {
      return reply.message;
    }
  }
  
  return null;
}

/**
 * Gets all available templates
 */
export function getAllTemplates(): WhatsAppTemplate[] {
  return [
    ...Object.values(SERVICE_TEMPLATES),
    ...Object.values(BUSINESS_PARTNER_TEMPLATES),
    ...Object.values(EMERGENCY_TEMPLATES)
  ];
}

/**
 * Gets template by ID
 */
export function getTemplateById(templateId: string): WhatsAppTemplate | null {
  const allTemplates = getAllTemplates();
  return allTemplates.find(template => template.id === templateId) || null;
}

// ========================================================================================
// 6. MONTENEGRO SPECIFIC FORMATTING
// ========================================================================================

export const MONTENEGRO_FORMATTING = {
  /**
   * Formats Montenegro phone number for WhatsApp
   */
  formatPhoneNumber: (phone: string): string => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle Montenegro numbers
    if (cleaned.startsWith('382')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('67') || cleaned.startsWith('68') || cleaned.startsWith('69')) {
      return `+382${cleaned}`;
    } else if (cleaned.startsWith('067') || cleaned.startsWith('068') || cleaned.startsWith('069')) {
      return `+382${cleaned.substring(1)}`;
    }
    
    return phone; // Return original if format not recognized
  },

  /**
   * Formats date for Montenegro locale
   */
  formatDate: (date: Date): string => {
    return date.toLocaleDateString('sr-Latn-ME', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  },

  /**
   * Formats time for Montenegro locale
   */
  formatTime: (date: Date): string => {
    return date.toLocaleTimeString('sr-Latn-ME', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Formats currency for Montenegro (EUR)
   */
  formatCurrency: (amount: number): string => {
    return `${amount.toFixed(2)} EUR`;
  }
};

export default {
  SERVICE_TEMPLATES,
  AUTO_REPLIES,
  BUSINESS_PARTNER_TEMPLATES,
  EMERGENCY_TEMPLATES,
  fillTemplate,
  findAutoReply,
  getAllTemplates,
  getTemplateById,
  MONTENEGRO_FORMATTING
};