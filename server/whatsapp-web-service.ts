import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
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
}

// Singleton instanca
export const whatsappWebService = new WhatsAppWebService();