/**
 * Hybrid SMS Service
 * Kombinuje GSM modem (fizička SIM kartica) sa Twilio fallback sistemom
 */

import gsmModemService, { SMSResult as GSMSMSResult } from './gsm-modem-service';
import { storage } from './storage';

// Importuj postojeći Twilio SMS servis
class TwilioSMSService {
  private client: any | null = null;
  private config: any | null = null;
  private isConfigured = false;

  async initialize(): Promise<void> {
    try {
      const settings = await storage.getSystemSettings();
      const accountSid = settings.find(s => s.key === 'twilio_account_sid')?.value;
      const authToken = settings.find(s => s.key === 'twilio_auth_token')?.value;
      const fromNumber = settings.find(s => s.key === 'twilio_phone_number')?.value;

      if (accountSid && authToken && fromNumber) {
        const twilio = await import('twilio');
        this.client = twilio.default(accountSid, authToken);
        this.config = { accountSid, authToken, fromNumber };
        this.isConfigured = true;
        console.log('[TWILIO FALLBACK] Twilio fallback konfigurisan');
      }
    } catch (error) {
      console.error('[TWILIO FALLBACK] Greška pri konfiguraciji:', error);
    }
  }

  async sendSMS(phoneNumber: string, message: string): Promise<GSMSMSResult> {
    if (!this.isConfigured || !this.client || !this.config) {
      return {
        success: false,
        error: 'Twilio fallback nije konfigurisan'
      };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.config.fromNumber,
        to: phoneNumber
      });

      return {
        success: true,
        messageId: result.sid,
        deliveryStatus: 'sent'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Twilio greška'
      };
    }
  }
}

export interface HybridSMSConfig {
  primaryProvider: 'gsm' | 'twilio';
  enableFallback: boolean;
  fallbackDelay: number; // milisekunde
  maxRetries: number;
}

export interface HybridSMSStatus {
  primaryProvider: 'gsm' | 'twilio';
  gsmStatus: any;
  twilioStatus: boolean;
  lastProvider?: 'gsm' | 'twilio';
  totalSent: number;
  successRate: number;
  lastError?: string;
}

class HybridSMSService {
  private config: HybridSMSConfig = {
    primaryProvider: 'gsm',
    enableFallback: true,
    fallbackDelay: 5000,
    maxRetries: 2
  };
  
  private twilioService = new TwilioSMSService();
  private stats = {
    totalSent: 0,
    successfulSent: 0,
    gsmSent: 0,
    twilioSent: 0,
    lastProvider: null as 'gsm' | 'twilio' | null,
    lastError: null as string | null
  };

  constructor() {
    console.log('[HYBRID SMS] Inicijalizovanje hibridnog SMS servisa');
  }

  async initialize(): Promise<void> {
    console.log('[HYBRID SMS] Učitavanje hibridne SMS konfiguracije...');
    
    try {
      // Učitaj konfiguraciju iz baze
      const settings = await storage.getSystemSettings();
      const primaryProvider = settings.find(s => s.key === 'sms_primary_provider')?.value as 'gsm' | 'twilio' || 'gsm';
      const enableFallback = settings.find(s => s.key === 'sms_enable_fallback')?.value === 'true';
      const fallbackDelay = parseInt(settings.find(s => s.key === 'sms_fallback_delay')?.value || '5000');
      const maxRetries = parseInt(settings.find(s => s.key === 'sms_max_retries')?.value || '2');

      this.config = {
        primaryProvider,
        enableFallback,
        fallbackDelay,
        maxRetries
      };

      console.log(`[HYBRID SMS] Konfiguracija: primary=${primaryProvider}, fallback=${enableFallback}`);

      // Inicijalizuj oba servisa
      await gsmModemService.initialize();
      await this.twilioService.initialize();

      console.log('[HYBRID SMS] Hibridni SMS servis uspešno inicijalizovan');
    } catch (error) {
      console.error('[HYBRID SMS] Greška pri inicijalizaciji:', error);
      this.stats.lastError = error instanceof Error ? error.message : 'Nepoznata greška';
    }
  }

  async sendSMS(phoneNumber: string, message: string): Promise<GSMSMSResult> {
    this.stats.totalSent++;
    console.log(`[HYBRID SMS] Slanje SMS na ${phoneNumber} (pokušaj ${this.stats.totalSent})`);

    let result: GSMSMSResult;
    let usedProvider: 'gsm' | 'twilio';

    // Pokušaj sa primarnim provajderom
    if (this.config.primaryProvider === 'gsm') {
      console.log('[HYBRID SMS] Pokušavam sa GSM modemom (primarni)...');
      result = await gsmModemService.sendSMS(phoneNumber, message);
      usedProvider = 'gsm';
    } else {
      console.log('[HYBRID SMS] Pokušavam sa Twilio (primarni)...');
      result = await this.twilioService.sendSMS(phoneNumber, message);
      usedProvider = 'twilio';
    }

    // Ako je primarni neuspešan i fallback je omogućen
    if (!result.success && this.config.enableFallback) {
      console.log(`[HYBRID SMS] Primarni provajder (${usedProvider}) neuspešan, prebacujem na fallback...`);
      
      // Čekaj pre fallback-a
      await this.delay(this.config.fallbackDelay);
      
      // Pokušaj sa fallback provajderom
      if (this.config.primaryProvider === 'gsm') {
        console.log('[HYBRID SMS] Pokušavam sa Twilio (fallback)...');
        result = await this.twilioService.sendSMS(phoneNumber, message);
        usedProvider = 'twilio';
      } else {
        console.log('[HYBRID SMS] Pokušavam sa GSM modemom (fallback)...');
        result = await gsmModemService.sendSMS(phoneNumber, message);
        usedProvider = 'gsm';
      }
    }

    // Ažuriraj statistike
    this.stats.lastProvider = usedProvider;
    
    if (result.success) {
      this.stats.successfulSent++;
      if (usedProvider === 'gsm') {
        this.stats.gsmSent++;
      } else {
        this.stats.twilioSent++;
      }
      console.log(`[HYBRID SMS] SMS uspešno poslat preko ${usedProvider}`);
    } else {
      this.stats.lastError = result.error || 'Nepoznata greška';
      console.error(`[HYBRID SMS] SMS slanje neuspešno: ${result.error}`);
    }

    return result;
  }

  async getStatus(): Promise<HybridSMSStatus> {
    const gsmStatus = await gsmModemService.getStatus();
    const twilioStatus = this.twilioService['isConfigured'] || false;
    
    return {
      primaryProvider: this.config.primaryProvider,
      gsmStatus,
      twilioStatus,
      lastProvider: this.stats.lastProvider || undefined,
      totalSent: this.stats.totalSent,
      successRate: this.stats.totalSent > 0 ? (this.stats.successfulSent / this.stats.totalSent) * 100 : 0,
      lastError: this.stats.lastError || undefined
    };
  }

  async configure(config: Partial<HybridSMSConfig>): Promise<boolean> {
    try {
      this.config = { ...this.config, ...config };
      
      // Sačuvaj u bazu podataka
      await storage.updateSystemSetting('sms_primary_provider', this.config.primaryProvider);
      await storage.updateSystemSetting('sms_enable_fallback', this.config.enableFallback.toString());
      await storage.updateSystemSetting('sms_fallback_delay', this.config.fallbackDelay.toString());
      await storage.updateSystemSetting('sms_max_retries', this.config.maxRetries.toString());
      
      console.log('[HYBRID SMS] Konfiguracija ažurirana:', this.config);
      return true;
    } catch (error) {
      console.error('[HYBRID SMS] Greška pri konfiguraciji:', error);
      return false;
    }
  }

  getStatistics() {
    return {
      totalSent: this.stats.totalSent,
      successfulSent: this.stats.successfulSent,
      failedSent: this.stats.totalSent - this.stats.successfulSent,
      successRate: this.stats.totalSent > 0 ? (this.stats.successfulSent / this.stats.totalSent) * 100 : 0,
      gsmSent: this.stats.gsmSent,
      twilioSent: this.stats.twilioSent,
      lastProvider: this.stats.lastProvider,
      lastError: this.stats.lastError
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const hybridSMSService = new HybridSMSService();

export { hybridSMSService };
export default hybridSMSService;