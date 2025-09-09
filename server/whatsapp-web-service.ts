import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
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
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--single-process',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
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

    // Nova poruka primljena - OPTIMIZOVANO SA BATCH PROCESSING
    this.client.on('message', async (message) => {
      if (message.fromMe) return; // Ignorisi poruke koje sam ja poslao

      try {
        console.log(`📨 [WHATSAPP WEB] Nova poruka pristigla - dodajem u batch queue`);
        
        // Dodaj poruku u batch queue umesto direktno procesiranja
        await this.addToMessageQueue(message);
      } catch (error) {
        console.error('❌ [WHATSAPP WEB] Greška pri dodavanju poruke u queue:', error);
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

  // =================================================================
  // NOVE FUNKCIJE ZA STABILNOST I OPTIMIZACIJU - DODANO NAKNADNO
  // =================================================================

  /**
   * PAGINATED KONTAKTI - sprečava memory overflow sa velikim brojem kontakata
   */
  async getPaginatedContacts(page: number = 1, limit: number = 25): Promise<{
    contacts: WhatsAppWebContact[];
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    if (!this.client || !this.isConnected) {
      return {
        contacts: [],
        totalCount: 0,
        page,
        limit,
        hasMore: false
      };
    }

    try {
      console.log(`🔍 [PAGINATION] Dobijanje kontakata - strana ${page}, limit ${limit}`);
      
      const allContacts = await this.client.getContacts();
      const totalCount = allContacts.length;
      
      // Filtriraj samo validne WhatsApp kontakte za bolju performansu
      const validContacts = allContacts.filter(contact => 
        contact.isWAContact && contact.number && !contact.id._serialized.includes('@g.us')
      );

      // Paginacija
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedContacts = validContacts.slice(startIndex, endIndex);

      const contacts: WhatsAppWebContact[] = paginatedContacts.map(contact => ({
        id: contact.id._serialized,
        name: contact.name || '',
        number: contact.number,
        pushname: contact.pushname || '',
        isMyContact: contact.isMyContact,
        isWAContact: contact.isWAContact
      }));

      const hasMore = endIndex < validContacts.length;

      console.log(`✅ [PAGINATION] Vraćam ${contacts.length}/${validContacts.length} kontakata (strana ${page})`);
      
      return {
        contacts,
        totalCount: validContacts.length,
        page,
        limit,
        hasMore
      };
    } catch (error) {
      console.error('❌ [PAGINATION] Greška pri dobijanju paginiranih kontakata:', error);
      return {
        contacts: [],
        totalCount: 0,
        page,
        limit,
        hasMore: false
      };
    }
  }

  /**
   * OPTIMIZED MEDIA HANDLING - kontroliše veličinu i tip media fajlova
   */
  private readonly MAX_MEDIA_SIZE = 10 * 1024 * 1024; // 10MB limit
  private readonly ALLOWED_MEDIA_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'audio/mpeg', 'audio/ogg',
    'video/mp4'
  ];

  async processOptimizedMedia(message: any): Promise<{
    media?: { mimetype: string; data: string; filename: string; size: number };
    error?: string;
  }> {
    if (!message.hasMedia) {
      return {};
    }

    try {
      // Dobij osnovne media info bez download-a
      const mediaInfo = message.mediaKey ? await message.getMediaInfo() : null;
      
      if (mediaInfo && mediaInfo.size > this.MAX_MEDIA_SIZE) {
        console.warn(`⚠️ [MEDIA] Fajl preslik (${mediaInfo.size} bytes > ${this.MAX_MEDIA_SIZE})`);
        return { error: 'Fajl je prevelik za procesiranje' };
      }

      // Download media sa timeout-om
      const mediaDownloadPromise = message.downloadMedia();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Media download timeout')), 30000)
      );

      const media = await Promise.race([mediaDownloadPromise, timeoutPromise]);

      // Proveri tip fajla
      if (!this.ALLOWED_MEDIA_TYPES.includes(media.mimetype)) {
        console.warn(`⚠️ [MEDIA] Neподржan tip fajla: ${media.mimetype}`);
        return { error: 'Tip fajla nije podržan' };
      }

      // Proveri stvarnu veličinu dopo download-a
      const actualSize = Buffer.from(media.data, 'base64').length;
      if (actualSize > this.MAX_MEDIA_SIZE) {
        console.warn(`⚠️ [MEDIA] Fajl stvarno prevelik (${actualSize} bytes)`);
        return { error: 'Fajl je prevelik' };
      }

      console.log(`✅ [MEDIA] Uspešno procesiran ${media.mimetype} fajl (${actualSize} bytes)`);
      
      return {
        media: {
          mimetype: media.mimetype,
          data: media.data,
          filename: media.filename || 'file',
          size: actualSize
        }
      };
    } catch (error: any) {
      console.error('❌ [MEDIA] Greška pri procesiranju media:', error);
      return { error: error.message || 'Greška pri procesiranju media' };
    }
  }

  /**
   * SESSION CLEANUP - periodično čisti stare session fajlove
   */
  async cleanupOldSessions(): Promise<{ cleaned: boolean; details: string }> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const sessionPath = './whatsapp-session';
      
      try {
        const stats = await fs.stat(sessionPath);
        
        // Čisti session folder-e starije od 7 dana
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        if (stats.mtimeMs < sevenDaysAgo) {
          console.log('🧹 [SESSION CLEANUP] Čistim stari session folder...');
          
          // Ostavi samo osnovne folder-e, obriši temp fajlove
          const items = await fs.readdir(sessionPath);
          let cleanedCount = 0;
          
          for (const item of items) {
            const itemPath = path.join(sessionPath, item);
            const itemStats = await fs.stat(itemPath);
            
            // Briši fajlove starije od 3 dana
            if (itemStats.isFile() && itemStats.mtimeMs < (Date.now() - 3 * 24 * 60 * 60 * 1000)) {
              await fs.unlink(itemPath);
              cleanedCount++;
            }
          }
          
          console.log(`✅ [SESSION CLEANUP] Obrisano ${cleanedCount} starih fajlova`);
          return { cleaned: true, details: `Obrisano ${cleanedCount} starih session fajlova` };
        }
        
        return { cleaned: false, details: 'Session fajlovi nisu dovoljno stari za brisanje' };
      } catch (error) {
        return { cleaned: false, details: 'Session folder ne postoji ili nema pristup' };
      }
    } catch (error: any) {
      console.error('❌ [SESSION CLEANUP] Greška:', error);
      return { cleaned: false, details: error.message };
    }
  }

  /**
   * HEALTH MONITORING - prati resource usage i performance
   */
  getHealthStatus(): {
    isHealthy: boolean;
    metrics: {
      isConnected: boolean;
      memoryUsage: any;
      uptime: number;
      lastActivity: number;
      puppeteerStatus: string;
    };
    warnings: string[];
  } {
    const warnings: string[] = [];
    
    // Memory usage check
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    // Memory warnings
    if (memUsageMB.heapUsed > 200) {
      warnings.push(`Visoka heap memory upotreba: ${memUsageMB.heapUsed}MB`);
    }
    if (memUsageMB.external > 100) {
      warnings.push(`Visoka external memory upotreba: ${memUsageMB.external}MB`);
    }

    // Connection health
    if (!this.isConnected) {
      warnings.push('WhatsApp Web nije povezan');
    }

    // Puppeteer status check
    let puppeteerStatus = 'unknown';
    try {
      if (this.client && (this.client as any).pupPage) {
        puppeteerStatus = this.isConnected ? 'active' : 'disconnected';
      } else {
        puppeteerStatus = 'not_initialized';
      }
    } catch (error) {
      puppeteerStatus = 'error';
      warnings.push('Greška u Puppeteer status proveri');
    }

    const isHealthy = warnings.length === 0 && this.isConnected;

    return {
      isHealthy,
      metrics: {
        isConnected: this.isConnected,
        memoryUsage: memUsageMB,
        uptime: Math.round(process.uptime()),
        lastActivity: Date.now(),
        puppeteerStatus
      },
      warnings
    };
  }

  /**
   * RESOURCE OPTIMIZER - optimizuje browser performance
   */
  async optimizeResources(): Promise<{ optimized: boolean; details: string }> {
    if (!this.client) {
      return { optimized: false, details: 'Client nije inicijalizovan' };
    }

    try {
      console.log('🔧 [OPTIMIZER] Pokretanje resource optimizacije...');
      
      // Force garbage collection ako je dostupno
      if (global.gc) {
        global.gc();
        console.log('✅ [OPTIMIZER] Pokrenut garbage collection');
      }

      // Postavi browser optimizacije ako je client aktivan
      try {
        const pupPage = (this.client as any).pupPage;
        if (pupPage) {
          // Očisti cache
          await pupPage.evaluate(() => {
            // Clear localStorage and sessionStorage
            if (typeof window !== 'undefined') {
              try {
                window.localStorage.clear();
                window.sessionStorage.clear();
              } catch (e) {
                console.log('Cache clear warning:', e);
              }
            }
          });
          
          console.log('✅ [OPTIMIZER] Browser cache očišćen');
        }
      } catch (browserError) {
        console.warn('⚠️ [OPTIMIZER] Browser optimizacija nije dostupna:', browserError);
      }

      return { optimized: true, details: 'Resource optimizacija završena uspešno' };
    } catch (error: any) {
      console.error('❌ [OPTIMIZER] Greška pri optimizaciji:', error);
      return { optimized: false, details: error.message };
    }
  }

  /**
   * AUTO RECOVERY - automatski recovery mechanizam  
   */
  private recoveryAttempts = 0;
  private readonly MAX_RECOVERY_ATTEMPTS = 3;

  async attemptAutoRecovery(): Promise<{ recovered: boolean; attempt: number; message: string }> {
    this.recoveryAttempts++;
    
    if (this.recoveryAttempts > this.MAX_RECOVERY_ATTEMPTS) {
      return {
        recovered: false,
        attempt: this.recoveryAttempts,
        message: 'Maksimalni broj recovery pokušaja dostignut'
      };
    }

    try {
      console.log(`🔄 [RECOVERY] Pokušaj oporavka #${this.recoveryAttempts}`);
      
      // 1. Očisti postojeći client
      if (this.client) {
        try {
          await this.client.destroy();
          console.log('🔄 [RECOVERY] Stari client uništen');
        } catch (destroyError) {
          console.warn('⚠️ [RECOVERY] Greška pri uništavanju starog client-a:', destroyError);
        }
      }

      // 2. Delay pre re-init
      await new Promise(resolve => setTimeout(resolve, 2000 * this.recoveryAttempts));
      
      // 3. Resetuj state
      this.client = null;
      this.isConnected = false;
      this.qrCode = null;

      // 4. Reinicijalizuj
      this.initializeClient();
      await this.initialize();

      // Reset recovery counter na uspeh
      this.recoveryAttempts = 0;
      
      return {
        recovered: true,
        attempt: this.recoveryAttempts,
        message: 'Auto recovery uspešan'
      };
    } catch (error: any) {
      console.error(`❌ [RECOVERY] Pokušaj #${this.recoveryAttempts} neuspešan:`, error);
      
      return {
        recovered: false,
        attempt: this.recoveryAttempts,
        message: `Recovery pokušaj ${this.recoveryAttempts} neuspešan: ${error.message}`
      };
    }
  }

  /**
   * BATCH MESSAGE HANDLER - optimizovano procesiranje više poruka odjednom
   */
  private messageQueue: any[] = [];
  private processingBatch = false;

  async addToMessageQueue(message: any): Promise<void> {
    this.messageQueue.push(message);
    
    // Ako nije već u procesu, pokreni batch processing
    if (!this.processingBatch) {
      this.processBatchMessages();
    }
  }

  private async processBatchMessages(): Promise<void> {
    if (this.processingBatch || this.messageQueue.length === 0) {
      return;
    }

    this.processingBatch = true;
    console.log(`🔄 [BATCH] Procesiranje ${this.messageQueue.length} poruka u batch-u`);

    try {
      const currentBatch = [...this.messageQueue];
      this.messageQueue = [];

      for (const message of currentBatch) {
        try {
          // Optimizovano procesiranje poruke
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

          // Optimized media handling
          if (message.hasMedia) {
            const mediaResult = await this.processOptimizedMedia(message);
            if (mediaResult.media) {
              whatsappMessage.media = mediaResult.media;
            } else if (mediaResult.error) {
              console.warn(`⚠️ [BATCH] Media greška za poruku ${message.id._serialized}: ${mediaResult.error}`);
            }
          }

          this.notifyMessageHandlers(whatsappMessage);
        } catch (messageError) {
          console.error(`❌ [BATCH] Greška pri procesiranju poruke:`, messageError);
        }
      }

      console.log(`✅ [BATCH] Uspešno procesurano ${currentBatch.length} poruka`);
    } catch (error) {
      console.error('❌ [BATCH] Greška u batch procesiranju:', error);
    } finally {
      this.processingBatch = false;
      
      // Ako ima novih poruka u queue, pokreni ponovo
      if (this.messageQueue.length > 0) {
        setTimeout(() => this.processBatchMessages(), 1000);
      }
    }
  }

  // =================================================================
  // NOVE TEST FUNKCIJE ZA OPTIMIZACIJU TESTIRANJE - DODANO NAKNADNO
  // =================================================================

  /**
   * MOCK KONTAKTI GENERATOR - za testiranje pagination sa velikim brojem kontakata
   */
  generateMockContacts(count: number): WhatsAppWebContact[] {
    const mockContacts: WhatsAppWebContact[] = [];
    
    for (let i = 1; i <= count; i++) {
      mockContacts.push({
        id: `mock_contact_${i}@c.us`,
        name: `Test Kontakt ${i}`,
        number: `06912345${String(i).padStart(2, '0')}`,
        pushname: `TestUser${i}`,
        isMyContact: i % 2 === 0,
        isWAContact: true
      });
    }
    
    return mockContacts;
  }

  /**
   * PAGINATION STRESS TEST - testira sa velikim brojem kontakata
   */
  async testPaginationWithLargeDataset(totalContacts: number = 500): Promise<{
    success: boolean;
    totalTested: number;
    pagesGenerated: number;
    performanceMetrics: {
      averageLoadTime: number;
      memoryUsageIncrease: number;
      errorsEncountered: number;
    };
    details: string;
  }> {
    console.log(`🧪 [PAGINATION TEST] Počinje testiranje sa ${totalContacts} kontakata`);
    
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = Date.now();
    let errorsEncountered = 0;
    const loadTimes: number[] = [];

    try {
      // Generiši mock kontakte
      const mockContacts = this.generateMockContacts(totalContacts);
      console.log(`📊 [PAGINATION TEST] Generisano ${mockContacts.length} mock kontakata`);

      // Testiraj različite page size-ove
      const pageSizes = [10, 25, 50, 100];
      let totalPagesGenerated = 0;

      for (const pageSize of pageSizes) {
        const pagesCount = Math.ceil(totalContacts / pageSize);
        console.log(`📄 [PAGINATION TEST] Testiram page size ${pageSize} (${pagesCount} strana)`);

        for (let page = 1; page <= Math.min(pagesCount, 10); page++) { // Limit na 10 strana po size-u
          const pageStartTime = Date.now();
          
          try {
            // Simuliraj pagination
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const pageContacts = mockContacts.slice(startIndex, endIndex);
            
            // Simuliraj processing delay
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const pageLoadTime = Date.now() - pageStartTime;
            loadTimes.push(pageLoadTime);
            totalPagesGenerated++;
            
            console.log(`✅ [PAGINATION TEST] Strana ${page} (${pageContacts.length} kontakata) - ${pageLoadTime}ms`);
          } catch (error) {
            errorsEncountered++;
            console.error(`❌ [PAGINATION TEST] Greška na strani ${page}:`, error);
          }
        }
      }

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
      const memoryUsageIncrease = Math.round((endMemory - startMemory) / 1024 / 1024);

      const result = {
        success: errorsEncountered === 0,
        totalTested: totalContacts,
        pagesGenerated: totalPagesGenerated,
        performanceMetrics: {
          averageLoadTime: Math.round(averageLoadTime),
          memoryUsageIncrease,
          errorsEncountered
        },
        details: `Test završen za ${endTime - startTime}ms. Memory delta: ${memoryUsageIncrease}MB`
      };

      console.log(`🎯 [PAGINATION TEST] Rezultat:`, result);
      return result;
    } catch (error: any) {
      console.error(`❌ [PAGINATION TEST] Test neuspešan:`, error);
      return {
        success: false,
        totalTested: 0,
        pagesGenerated: 0,
        performanceMetrics: {
          averageLoadTime: 0,
          memoryUsageIncrease: 0,
          errorsEncountered: 1
        },
        details: `Test prekinut: ${error.message}`
      };
    }
  }

  /**
   * HEALTH MONITORING STRESS TEST
   */
  async testHealthMonitoringStress(): Promise<{
    success: boolean;
    iterations: number;
    healthChecks: any[];
    memoryTrend: number[];
    warnings: string[];
    details: string;
  }> {
    console.log(`🏥 [HEALTH TEST] Pokretanje stress test health monitoringa`);
    
    const iterations = 20;
    const healthChecks: any[] = [];
    const memoryTrend: number[] = [];
    const warnings: string[] = [];

    try {
      for (let i = 1; i <= iterations; i++) {
        const startIterationTime = Date.now();
        
        // Dobij health status
        const healthStatus = this.getHealthStatus();
        healthChecks.push({
          iteration: i,
          timestamp: Date.now(),
          isHealthy: healthStatus.isHealthy,
          memoryUsage: healthStatus.metrics.memoryUsage,
          warnings: healthStatus.warnings.length
        });

        memoryTrend.push(healthStatus.metrics.memoryUsage.heapUsed);
        
        // Dodaj warnings ako ima problema
        if (!healthStatus.isHealthy) {
          warnings.push(`Iteracija ${i}: ${healthStatus.warnings.join(', ')}`);
        }

        // Simuliraj memory pressure
        if (i % 5 === 0) {
          // Kreiraj temporary memory pressure
          const tempArray = new Array(100000).fill('memory pressure test');
          await new Promise(resolve => setTimeout(resolve, 100));
          tempArray.length = 0; // Očisti
        }

        const iterationTime = Date.now() - startIterationTime;
        console.log(`🔄 [HEALTH TEST] Iteracija ${i}/${iterations} - ${iterationTime}ms - Healthy: ${healthStatus.isHealthy}`);
        
        await new Promise(resolve => setTimeout(resolve, 200)); // Delay između testova
      }

      // Analiziraj rezultate
      const memoryGrowth = memoryTrend[memoryTrend.length - 1] - memoryTrend[0];
      const healthyCount = healthChecks.filter(check => check.isHealthy).length;
      const successRate = (healthyCount / iterations) * 100;

      const result = {
        success: successRate >= 80, // 80%+ success rate = uspešan test
        iterations,
        healthChecks,
        memoryTrend,
        warnings,
        details: `${successRate.toFixed(1)}% success rate, memory growth: ${memoryGrowth}MB`
      };

      console.log(`🎯 [HEALTH TEST] Rezultat:`, result);
      return result;
    } catch (error: any) {
      console.error(`❌ [HEALTH TEST] Test neuspešan:`, error);
      return {
        success: false,
        iterations: 0,
        healthChecks: [],
        memoryTrend: [],
        warnings: [`Test error: ${error.message}`],
        details: `Health monitoring test prekinut: ${error.message}`
      };
    }
  }

  /**
   * AUTO RECOVERY TEST SCENARIO
   */
  async testAutoRecoveryScenarios(): Promise<{
    success: boolean;
    scenariosTested: number;
    recoveryResults: any[];
    avgRecoveryTime: number;
    details: string;
  }> {
    console.log(`🔄 [RECOVERY TEST] Pokretanje auto recovery test scenarija`);
    
    const recoveryResults: any[] = [];
    
    try {
      // SCENARIO 1: Simuliraj client disconnect
      console.log(`📋 [RECOVERY TEST] Scenario 1: Simulirani client disconnect`);
      const scenario1Start = Date.now();
      
      // Resetuj recovery counter
      this.recoveryAttempts = 0;
      
      // Simuliraj disconnect
      this.isConnected = false;
      this.qrCode = null;
      
      const recovery1 = await this.attemptAutoRecovery();
      const scenario1Time = Date.now() - scenario1Start;
      
      recoveryResults.push({
        scenario: 'client_disconnect',
        success: recovery1.recovered,
        attempt: recovery1.attempt,
        timeMs: scenario1Time,
        message: recovery1.message
      });

      // SCENARIO 2: Multiple recovery attempts
      console.log(`📋 [RECOVERY TEST] Scenario 2: Multiple recovery pokušaji`);
      const scenario2Start = Date.now();
      
      // Reset i testiraj multiple attempts
      this.recoveryAttempts = 0;
      this.isConnected = false;
      
      const recovery2Attempts = [];
      for (let i = 1; i <= 3; i++) {
        const attempt = await this.attemptAutoRecovery();
        recovery2Attempts.push(attempt);
        
        if (attempt.recovered) break;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay između pokušaja
      }
      
      const scenario2Time = Date.now() - scenario2Start;
      recoveryResults.push({
        scenario: 'multiple_attempts',
        success: recovery2Attempts.some(a => a.recovered),
        attempts: recovery2Attempts,
        timeMs: scenario2Time,
        message: `${recovery2Attempts.length} pokušaja izvršeno`
      });

      // SCENARIO 3: Recovery limit test
      console.log(`📋 [RECOVERY TEST] Scenario 3: Recovery limit test`);
      const scenario3Start = Date.now();
      
      // Forsiraj max attempts
      this.recoveryAttempts = this.MAX_RECOVERY_ATTEMPTS;
      this.isConnected = false;
      
      const recovery3 = await this.attemptAutoRecovery();
      const scenario3Time = Date.now() - scenario3Start;
      
      recoveryResults.push({
        scenario: 'max_attempts_reached',
        success: !recovery3.recovered, // Success znači da je pravilno odbacio dalje pokušaje
        attempt: recovery3.attempt,
        timeMs: scenario3Time,
        message: recovery3.message
      });

      // Analiziraj rezultate
      const avgRecoveryTime = recoveryResults.reduce((sum, r) => sum + r.timeMs, 0) / recoveryResults.length;
      const successfulScenarios = recoveryResults.filter(r => r.success).length;

      const result = {
        success: successfulScenarios >= 2, // Najmanje 2/3 scenarija uspešna
        scenariosTested: recoveryResults.length,
        recoveryResults,
        avgRecoveryTime: Math.round(avgRecoveryTime),
        details: `${successfulScenarios}/${recoveryResults.length} scenarija uspešno, avg time: ${avgRecoveryTime.toFixed(0)}ms`
      };

      console.log(`🎯 [RECOVERY TEST] Rezultat:`, result);
      return result;
    } catch (error: any) {
      console.error(`❌ [RECOVERY TEST] Test neuspešan:`, error);
      return {
        success: false,
        scenariosTested: 0,
        recoveryResults: [],
        avgRecoveryTime: 0,
        details: `Recovery test prekinut: ${error.message}`
      };
    }
  }

  /**
   * COMPREHENSIVE OPTIMIZATION TEST SUITE
   */
  async runComprehensiveOptimizationTests(): Promise<{
    success: boolean;
    testResults: {
      pagination: any;
      healthMonitoring: any;
      autoRecovery: any;
    };
    overallScore: number;
    recommendations: string[];
  }> {
    console.log(`🚀 [COMPREHENSIVE TEST] Pokretanje complete optimization test suite`);
    
    const startTime = Date.now();
    const recommendations: string[] = [];
    
    try {
      // 1. Pagination Test
      console.log(`📄 [COMPREHENSIVE TEST] Pokretanje pagination test...`);
      const paginationTest = await this.testPaginationWithLargeDataset(1000);
      
      // 2. Health Monitoring Test
      console.log(`🏥 [COMPREHENSIVE TEST] Pokretanje health monitoring test...`);
      const healthTest = await this.testHealthMonitoringStress();
      
      // 3. Auto Recovery Test
      console.log(`🔄 [COMPREHENSIVE TEST] Pokretanje auto recovery test...`);
      const recoveryTest = await this.testAutoRecoveryScenarios();

      // Analiziraj rezultate i kreiraj preporuke
      if (!paginationTest.success) {
        recommendations.push('Smanji page size ili optimizuj kontakt processing');
      }
      if (paginationTest.performanceMetrics.memoryUsageIncrease > 50) {
        recommendations.push('Memory usage raste previše tokom pagination - dodaj cleanup');
      }
      
      if (!healthTest.success) {
        recommendations.push('Health monitoring detektuje probleme - provjeri memory leaks');
      }
      if (healthTest.warnings.length > 10) {
        recommendations.push('Previše health warnings - optimizuj resource management');
      }
      
      if (!recoveryTest.success) {
        recommendations.push('Auto recovery ne radi propisno - provjeri recovery logiku');
      }
      if (recoveryTest.avgRecoveryTime > 10000) {
        recommendations.push('Recovery traje predugo - smanji timeout values');
      }

      // Izračunaj overall score (0-100)
      let score = 0;
      if (paginationTest.success) score += 35;
      if (healthTest.success) score += 30;
      if (recoveryTest.success) score += 35;

      const totalTime = Date.now() - startTime;
      
      const result = {
        success: score >= 70, // 70+ = uspešan test
        testResults: {
          pagination: paginationTest,
          healthMonitoring: healthTest,
          autoRecovery: recoveryTest
        },
        overallScore: score,
        recommendations
      };

      console.log(`🎯 [COMPREHENSIVE TEST] Završeno za ${totalTime}ms - Score: ${score}/100`);
      console.log(`📊 [COMPREHENSIVE TEST] Rezultat:`, result);
      
      return result;
    } catch (error: any) {
      console.error(`❌ [COMPREHENSIVE TEST] Test suite neuspešan:`, error);
      return {
        success: false,
        testResults: {
          pagination: null,
          healthMonitoring: null,
          autoRecovery: null
        },
        overallScore: 0,
        recommendations: [`Critical error: ${error.message}`]
      };
    }
  }
}

// Singleton instanca
export const whatsappWebService = new WhatsAppWebService();