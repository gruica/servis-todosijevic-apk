const WhatsAppWeb = require('whatsapp-web.js');
const { Client, LocalAuth, MessageMedia } = WhatsAppWeb;
import QRCode from 'qrcode';

export interface WhatsAppWebMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  type: string;
  timestamp: number;
  isGroup: boolean;
  contact: {
    id: string;
    name: string;
    number: string;
    pushname: string;
  };
  media?: {
    mimetype: string;
    data: string;
    filename: string;
  };
}

export interface WhatsAppWebContact {
  id: string;
  name: string;
  number: string;
  pushname: string;
  isMyContact: boolean;
  isWAContact: boolean;
}

export class WhatsAppWebService {
  private client: Client | null = null;
  private isConnected = false;
  private qrCode: string | null = null;
  private messageHandlers: ((message: WhatsAppWebMessage) => void)[] = [];
  private connectionHandlers: ((status: string) => void)[] = [];

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    // Kreiraj WhatsApp Web klijent sa LocalAuth (session storage)
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'frigo-sistem-todosijevic',
        dataPath: './whatsapp-session'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.client) return;

    // QR kod event - treba skenirati da se poveže
    this.client.on('qr', async (qr) => {
      try {
        this.qrCode = await QRCode.toDataURL(qr);
        console.log('📱 [WHATSAPP WEB] QR kod generisan - skeniraj ga sa telefona');
        this.notifyConnectionHandlers('qr_ready');
      } catch (error) {
        console.error('❌ [WHATSAPP WEB] Greška pri generisanju QR koda:', error);
      }
    });

    // Uspešno povezan
    this.client.on('ready', () => {
      this.isConnected = true;
      this.qrCode = null;
      console.log('✅ [WHATSAPP WEB] Klijent je spreman - WhatsApp Web povezan!');
      this.notifyConnectionHandlers('connected');
    });

    // Disconnected
    this.client.on('disconnected', (reason) => {
      this.isConnected = false;
      this.qrCode = null;
      console.log('❌ [WHATSAPP WEB] Klijent je otkačen:', reason);
      this.notifyConnectionHandlers('disconnected');
    });

    // Nova poruka primljena
    this.client.on('message', async (message) => {
      if (message.fromMe) return; // Ignorisi poruke koje sam ja poslao

      try {
        const contact = await message.getContact();
        const chat = await message.getChat();

        const whatsappMessage: WhatsAppWebMessage = {
          id: message.id._serialized,
          from: message.from,
          to: message.to || '',
          body: message.body,
          type: message.type,
          timestamp: message.timestamp,
          isGroup: chat.isGroup,
          contact: {
            id: contact.id._serialized,
            name: contact.name || contact.pushname || '',
            number: contact.number,
            pushname: contact.pushname || ''
          }
        };

        // Ako je media poruka, dodaj media podatke
        if (message.hasMedia) {
          const media = await message.downloadMedia();
          whatsappMessage.media = {
            mimetype: media.mimetype,
            data: media.data,
            filename: media.filename || 'file'
          };
        }

        console.log(`📨 [WHATSAPP WEB] Nova poruka od ${contact.name || contact.number}: ${message.body}`);
        this.notifyMessageHandlers(whatsappMessage);
      } catch (error) {
        console.error('❌ [WHATSAPP WEB] Greška pri obradi poruke:', error);
      }
    });

    // Greška
    this.client.on('auth_failure', (msg) => {
      console.error('❌ [WHATSAPP WEB] Autentifikacija neuspešna:', msg);
      this.notifyConnectionHandlers('auth_failure');
    });
  }

  async initialize(): Promise<void> {
    if (!this.client) return;
    
    try {
      console.log('🚀 [WHATSAPP WEB] Pokretanje WhatsApp Web klijenta...');
      await this.client.initialize();
    } catch (error) {
      console.error('❌ [WHATSAPP WEB] Greška pri inicijalizaciji:', error);
      throw error;
    }
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.error('❌ [WHATSAPP WEB] Klijent nije povezan');
      return false;
    }

    try {
      // Formatiraj broj telefona
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const chatId = formattedNumber + '@c.us';

      await this.client.sendMessage(chatId, message);
      console.log(`✅ [WHATSAPP WEB] Poruka poslata na ${phoneNumber}: ${message}`);
      return true;
    } catch (error) {
      console.error('❌ [WHATSAPP WEB] Greška pri slanju poruke:', error);
      return false;
    }
  }

  async sendMediaMessage(phoneNumber: string, message: string, mediaPath: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.error('❌ [WHATSAPP WEB] Klijent nije povezan');
      return false;
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const chatId = formattedNumber + '@c.us';

      const media = MessageMedia.fromFilePath(mediaPath);
      await this.client.sendMessage(chatId, media, { caption: message });
      
      console.log(`✅ [WHATSAPP WEB] Media poruka poslata na ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error('❌ [WHATSAPP WEB] Greška pri slanju media poruke:', error);
      return false;
    }
  }

  async getContacts(): Promise<WhatsAppWebContact[]> {
    if (!this.client || !this.isConnected) {
      return [];
    }

    try {
      const contacts = await this.client.getContacts();
      return contacts.map(contact => ({
        id: contact.id._serialized,
        name: contact.name || '',
        number: contact.number,
        pushname: contact.pushname || '',
        isMyContact: contact.isMyContact,
        isWAContact: contact.isWAContact
      }));
    } catch (error) {
      console.error('❌ [WHATSAPP WEB] Greška pri dobijanju kontakata:', error);
      return [];
    }
  }

  async getChats(): Promise<any[]> {
    if (!this.client || !this.isConnected) {
      return [];
    }

    try {
      const chats = await this.client.getChats();
      return chats.map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        timestamp: chat.timestamp,
        unreadCount: chat.unreadCount
      }));
    } catch (error) {
      console.error('❌ [WHATSAPP WEB] Greška pri dobijanju chat-ova:', error);
      return [];
    }
  }

  getConnectionStatus(): { isConnected: boolean; qrCode: string | null } {
    return {
      isConnected: this.isConnected,
      qrCode: this.qrCode
    };
  }

  onMessage(handler: (message: WhatsAppWebMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  onConnectionChange(handler: (status: string) => void): void {
    this.connectionHandlers.push(handler);
  }

  private notifyMessageHandlers(message: WhatsAppWebMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('❌ [WHATSAPP WEB] Greška u message handler-u:', error);
      }
    });
  }

  private notifyConnectionHandlers(status: string): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error('❌ [WHATSAPP WEB] Greška u connection handler-u:', error);
      }
    });
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Ukloni sve što nije broj
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Ako počinje sa 0, zameni sa 381
    if (cleaned.startsWith('0')) {
      cleaned = '381' + cleaned.substring(1);
    }
    
    // Ako ne počinje sa zemljom, dodaj 381
    if (!cleaned.startsWith('381')) {
      cleaned = '381' + cleaned;
    }
    
    return cleaned;
  }

  async destroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy();
        console.log('🔄 [WHATSAPP WEB] Klijent je uništen');
      } catch (error) {
        console.error('❌ [WHATSAPP WEB] Greška pri uništavanju klijenta:', error);
      }
    }
    this.client = null;
    this.isConnected = false;
    this.qrCode = null;
  }

  // FIKSNI BROJEVI ZA OBAVEZNE NOTIFIKACIJE
  private readonly MANDATORY_PHONE_NUMBERS = [
    '067077002', // Jelena Maksimović
    '067077092'  // Jelena Todosijević
  ];

  // TEMPLATE FUNKCIJE ZA AUTOMATSKA OBAVEŠTENJA
  
  /**
   * Pošalje obaveštenje klijentu o završenom servisu - BOGATIJI SADRŽAJ
   */
  async notifyServiceCompleted(serviceData: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    deviceModel: string;
    technicianName: string;
    completedDate: string;
    usedParts?: string;
    machineNotes?: string;
    cost?: string;
    isCompletelyFixed: boolean;
    warrantyStatus: string;
  }): Promise<boolean> {
    const message = `🎉 *SERVIS ZAVRŠEN*

Poštovani ${serviceData.clientName},
Vaš servis je uspešno završen!

📋 *Detalji servisa:*
• Servis ID: #${serviceData.serviceId}
• Uređaj: ${serviceData.deviceType} - ${serviceData.deviceModel}
• Datum završetka: ${serviceData.completedDate}
• Serviser: ${serviceData.technicianName}
• Status: ${serviceData.isCompletelyFixed ? '✅ Potpuno popravljen' : '⚠️ Delimično popravljen'}
• Garancija: ${serviceData.warrantyStatus}

${serviceData.usedParts ? `🔧 *Korišćeni delovi:*\n${serviceData.usedParts}\n\n` : ''}${serviceData.machineNotes ? `📝 *Napomene:*\n${serviceData.machineNotes}\n\n` : ''}${serviceData.cost ? `💰 *Troškovi:* ${serviceData.cost} RSD\n\n` : ''}Hvala što ste odabrali Frigo Sistem Todosijević!
📞 Za dodatne informacije: 067051141`;

    return await this.sendMessage(serviceData.clientPhone, message);
  }

  /**
   * Pošalje admin obaveštenje o završenom servisu
   */
  async notifyAdminServiceCompleted(serviceData: {
    serviceId: string;
    clientName: string;
    clientPhone: string;
    deviceType: string;
    deviceModel: string;
    technicianName: string;
    completedDate: string;
    usedParts?: string;
    cost?: string;
    isCompletelyFixed: boolean;
    warrantyStatus: string;
  }): Promise<boolean> {
    const adminPhone = '067051141'; // Admin broj
    
    const message = `🎯 *SERVIS ZAVRŠEN - ADMIN OBAVEŠTENJE*

Serviser ${serviceData.technicianName} je završio servis.

📋 *Detalji:*
• ID: #${serviceData.serviceId}
• Klijent: ${serviceData.clientName} (${serviceData.clientPhone})
• Uređaj: ${serviceData.deviceType} - ${serviceData.deviceModel}
• Serviser: ${serviceData.technicianName}
• Status: ${serviceData.isCompletelyFixed ? 'Potpuno popravljen' : 'Delimično popravljen'}
• Garancija: ${serviceData.warrantyStatus}
${serviceData.cost ? `• Troškovi: ${serviceData.cost} RSD` : ''}
${serviceData.usedParts ? `• Delovi: ${serviceData.usedParts}` : ''}

⏰ Završeno: ${serviceData.completedDate}`;

    return await this.sendMessage(adminPhone, message);
  }

  /**
   * Pošalje obaveštenje business partner-u o završenom servisu
   */
  async notifyBusinessPartnerServiceCompleted(serviceData: {
    partnerPhone: string;
    partnerName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    deviceModel: string;
    technicianName: string;
    completedDate: string;
    cost?: string;
    isCompletelyFixed: boolean;
  }): Promise<boolean> {
    const message = `📋 *SERVIS ZAVRŠEN - PARTNER OBAVEŠTENJE*

Poštovani ${serviceData.partnerName},
Servis koji ste prosledili je završen.

📋 *Detalji:*
• Servis ID: #${serviceData.serviceId}
• Klijent: ${serviceData.clientName}
• Uređaj: ${serviceData.deviceType} - ${serviceData.deviceModel}
• Serviser: ${serviceData.technicianName}
• Status: ${serviceData.isCompletelyFixed ? '✅ Uspešno popravljen' : '⚠️ Delimično popravljen'}
${serviceData.cost ? `• Troškovi: ${serviceData.cost} RSD` : ''}

⏰ Završeno: ${serviceData.completedDate}

Hvala na saradnji!
*Frigo Sistem Todosijević*`;

    return await this.sendMessage(serviceData.partnerPhone, message);
  }

  /**
   * Pošalje potvrdu tehnician-u o završenom servisu
   */
  async notifyTechnicianServiceCompleted(serviceData: {
    technicianPhone: string;
    technicianName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    completedDate: string;
  }): Promise<boolean> {
    const message = `✅ *POTVRDA ZAVRŠETKA SERVISA*

Poštovani ${serviceData.technicianName},
Vaš servis je uspešno zabeležen kao završen.

📋 *Potvrda:*
• Servis ID: #${serviceData.serviceId}
• Klijent: ${serviceData.clientName}
• Uređaj: ${serviceData.deviceType}
• Završeno: ${serviceData.completedDate}

Odličan posao! 👏
*Frigo Sistem Todosijević*`;

    return await this.sendMessage(serviceData.technicianPhone, message);
  }

  /**
   * NOVA FUNKCIJA - Pošalje obaveštenje o završenom servisu na SVE OBAVEZNE BROJEVE
   * (Klijent + 2 fiksna broja: Jelena Maksimović i Jelena Todosijević)
   */
  async notifyAllMandatoryNumbers(serviceData: {
    serviceId: string;
    clientName: string;
    clientPhone?: string;
    deviceType: string;
    deviceModel: string;
    technicianName: string;
    completedDate: string;
    usedParts?: string;
    machineNotes?: string;
    cost?: string;
    isCompletelyFixed: boolean;
    warrantyStatus: string;
  }): Promise<{
    client?: { success: boolean, error: string | null },
    jelena_maksimovic: { success: boolean, error: string | null },
    jelena_todosijevic: { success: boolean, error: string | null }
  }> {
    const results: any = {
      jelena_maksimovic: { success: false, error: null },
      jelena_todosijevic: { success: false, error: null }
    };

    // Univerzalna poruka za sve obavezne brojeve
    const message = `🎉 *SERVIS ZAVRŠEN - OBAVEŠTENJE*

📋 *Detalji servisa:*
• Servis ID: #${serviceData.serviceId}
• Klijent: ${serviceData.clientName}
• Telefon: ${serviceData.clientPhone || 'Nepoznat'}
• Uređaj: ${serviceData.deviceType} - ${serviceData.deviceModel}
• Serviser: ${serviceData.technicianName}
• Status: ${serviceData.isCompletelyFixed ? '✅ Potpuno popravljen' : '⚠️ Delimično popravljen'}
• Garancija: ${serviceData.warrantyStatus}
• Datum završetka: ${serviceData.completedDate}

${serviceData.usedParts ? `🔧 *Korišćeni delovi:*\n${serviceData.usedParts}\n\n` : ''}${serviceData.machineNotes ? `📝 *Napomene serviser-a:*\n${serviceData.machineNotes}\n\n` : ''}${serviceData.cost ? `💰 *Troškovi:* ${serviceData.cost} RSD\n\n` : ''}*Frigo Sistem Todosijević*
📞 Kontakt: 067051141`;

    // 1. OBAVEŠTENJE KLIJENTU (ako postoji broj)
    if (serviceData.clientPhone) {
      try {
        const success = await this.sendMessage(serviceData.clientPhone, message);
        results.client = { success, error: success ? null : 'Slanje neuspešno' };
        console.log(`📱 [MANDATORY] Klijent (${serviceData.clientPhone}): ${success ? 'USPEŠNO' : 'NEUSPEŠNO'}`);
      } catch (error: any) {
        results.client = { success: false, error: error.message };
        console.error(`❌ [MANDATORY] Greška klijent (${serviceData.clientPhone}):`, error);
      }
    }

    // 2. OBAVEŠTENJE JELENA MAKSIMOVIĆ (067077002)
    try {
      const success = await this.sendMessage(this.MANDATORY_PHONE_NUMBERS[0], message);
      results.jelena_maksimovic = { success, error: success ? null : 'Slanje neuspešno' };
      console.log(`📱 [MANDATORY] Jelena Maksimović (067077002): ${success ? 'USPEŠNO' : 'NEUSPEŠNO'}`);
    } catch (error: any) {
      results.jelena_maksimovic = { success: false, error: error.message };
      console.error(`❌ [MANDATORY] Greška Jelena Maksimović:`, error);
    }

    // 3. OBAVEŠTENJE JELENA TODOSIJEVIĆ (067077092)
    try {
      const success = await this.sendMessage(this.MANDATORY_PHONE_NUMBERS[1], message);
      results.jelena_todosijevic = { success, error: success ? null : 'Slanje neuspešno' };
      console.log(`📱 [MANDATORY] Jelena Todosijević (067077092): ${success ? 'USPEŠNO' : 'NEUSPEŠNO'}`);
    } catch (error: any) {
      results.jelena_todosijevic = { success: false, error: error.message };
      console.error(`❌ [MANDATORY] Greška Jelena Todosijević:`, error);
    }

    return results;
  }
}

// Singleton instanca
export const whatsappWebService = new WhatsAppWebService();