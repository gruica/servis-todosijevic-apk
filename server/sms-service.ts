/**
 * Twilio SMS Service
 * Standard SMS servis koji koristi Twilio API
 */

import twilio from 'twilio';
import { storage } from './storage';

export interface SMSServiceConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface SMSServiceStatus {
  isConfigured: boolean;
  provider: string;
  phoneNumber: string;
  lastError?: string;
  lastSentAt?: Date;
}

class SMSService {
  private client: any | null = null;
  private config: SMSServiceConfig | null = null;
  private isConfigured = false;
  private lastError: string | null = null;
  private lastSentAt: Date | null = null;

  constructor() {
    console.log('[SMS SERVICE] Inicijalizovanje Twilio SMS servisa');
  }

  async initialize(): Promise<void> {
    console.log('[SMS SERVICE] Učitavanje Twilio konfiguracije...');
    
    try {
      // Pokušaj da učitaš konfiguraciju iz environment varijabli
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (accountSid && authToken && fromNumber) {
        await this.configure({
          accountSid,
          authToken,
          fromNumber
        });
        console.log('[SMS SERVICE] Twilio konfiguracija uspešno učitana iz environment varijabli');
      } else {
        // Pokušaj da učitaš iz baze podataka
        const settings = await storage.getSystemSettings();
        const twilioSid = settings.find(s => s.key === 'twilio_account_sid')?.value;
        const twilioToken = settings.find(s => s.key === 'twilio_auth_token')?.value;
        const twilioPhone = settings.find(s => s.key === 'twilio_phone_number')?.value;

        if (twilioSid && twilioToken && twilioPhone) {
          await this.configure({
            accountSid: twilioSid,
            authToken: twilioToken,
            fromNumber: twilioPhone
          });
          console.log('[SMS SERVICE] Twilio konfiguracija uspešno učitana iz baze podataka');
        } else {
          console.log('[SMS SERVICE] Twilio nije konfigurisan - potrebne su postavke');
        }
      }
    } catch (error) {
      console.error('[SMS SERVICE] Greška pri učitavanju konfiguracije:', error);
      this.lastError = error instanceof Error ? error.message : 'Nepoznata greška';
    }
  }

  async configure(config: SMSServiceConfig): Promise<boolean> {
    try {
      console.log('[SMS SERVICE] Konfiguriranje Twilio klijenta...');
      
      this.config = config;
      this.client = twilio(config.accountSid, config.authToken);
      
      // Test konekcije
      const account = await this.client.api.accounts(config.accountSid).fetch();
      console.log('[SMS SERVICE] Twilio konekcija uspešna:', account.friendlyName);
      
      this.isConfigured = true;
      this.lastError = null;
      
      // Sačuvaj konfiguraciju u bazu
      await storage.setSystemSetting('twilio_account_sid', config.accountSid);
      await storage.setSystemSetting('twilio_auth_token', config.authToken);
      await storage.setSystemSetting('twilio_phone_number', config.fromNumber);
      await storage.setSystemSetting('sms_configured', 'true');
      await storage.setSystemSetting('sms_provider', 'twilio');
      
      return true;
    } catch (error) {
      console.error('[SMS SERVICE] Greška pri konfiguraciji Twilio:', error);
      this.lastError = error instanceof Error ? error.message : 'Nepoznata greška';
      this.isConfigured = false;
      return false;
    }
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    if (!this.isConfigured || !this.client || !this.config) {
      console.error('[SMS SERVICE] SMS servis nije konfigurisan');
      this.lastError = 'SMS servis nije konfigurisan';
      return false;
    }

    try {
      console.log(`[SMS SERVICE] Šaljem SMS na ${to}: ${message}`);
      
      const messageResponse = await this.client.messages.create({
        body: message,
        from: this.config.fromNumber,
        to: to
      });

      console.log(`[SMS SERVICE] SMS uspešno poslat, SID: ${messageResponse.sid}`);
      this.lastSentAt = new Date();
      this.lastError = null;
      
      return true;
    } catch (error) {
      console.error('[SMS SERVICE] Greška pri slanju SMS-a:', error);
      this.lastError = error instanceof Error ? error.message : 'Nepoznata greška';
      return false;
    }
  }

  async getStatus(): Promise<SMSServiceStatus> {
    return {
      isConfigured: this.isConfigured,
      provider: 'twilio',
      phoneNumber: this.config?.fromNumber || '',
      lastError: this.lastError || undefined,
      lastSentAt: this.lastSentAt || undefined
    };
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.client || !this.config) {
      console.error('[SMS SERVICE] SMS servis nije konfigurisan za testiranje');
      return false;
    }

    try {
      const account = await this.client.api.accounts(this.config.accountSid).fetch();
      console.log('[SMS SERVICE] Test konekcije uspešan:', account.friendlyName);
      return true;
    } catch (error) {
      console.error('[SMS SERVICE] Test konekcije neuspešan:', error);
      this.lastError = error instanceof Error ? error.message : 'Nepoznata greška';
      return false;
    }
  }

  async sendTestSMS(to: string): Promise<boolean> {
    const testMessage = `Test SMS - Frigo Sistem Todosijević\nVreme: ${new Date().toLocaleString('sr-RS')}`;
    return await this.sendSMS(to, testMessage);
  }
}

export const smsService = new SMSService();