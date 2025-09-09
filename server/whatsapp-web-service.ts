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
}

// Singleton instanca
export const whatsappWebService = new WhatsAppWebService();