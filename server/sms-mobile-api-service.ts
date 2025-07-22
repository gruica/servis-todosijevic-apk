import fetch from 'node-fetch';
import { IStorage } from './storage';

export interface SMSMobileAPIConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  enabled: boolean;
}

export interface SMSMobileAPISendRequest {
  recipients: string;
  message: string;
  sendwa?: '1' | '0'; // Send via WhatsApp
  sendsms?: '1' | '0'; // Send via SMS
  apikey: string;
}

export interface SMSMobileAPIResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class SMSMobileAPIService {
  private config: SMSMobileAPIConfig;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.config = {
      apiKey: '',
      baseUrl: 'https://api.smsmobileapi.com',
      timeout: 30000,
      enabled: false
    };
  }

  async initialize(): Promise<void> {
    console.log('[SMS MOBILE API] Inicijalizujem SMS Mobile API servis...');
    
    try {
      await this.loadConfiguration();
      
      if (this.config.enabled && this.config.apiKey) {
        console.log('[SMS MOBILE API] Servis je omogućen i konfigurisan');
        await this.testConnection();
      } else {
        console.log('[SMS MOBILE API] Servis nije omogućen ili nije konfigurisan');
      }
    } catch (error) {
      console.error('[SMS MOBILE API] Greška pri inicijalizaciji:', error);
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const settings = await this.storage.getAllSystemSettings();
      
      this.config.apiKey = settings.find(s => s.key === 'sms_mobile_api_key')?.value || '';
      this.config.baseUrl = settings.find(s => s.key === 'sms_mobile_base_url')?.value || 'https://api.smsmobileapi.com';
      this.config.timeout = parseInt(settings.find(s => s.key === 'sms_mobile_timeout')?.value || '30000');
      this.config.enabled = settings.find(s => s.key === 'sms_mobile_enabled')?.value === 'true';
      
      console.log('[SMS MOBILE API] Konfiguracija učitana:', {
        enabled: this.config.enabled,
        hasApiKey: !!this.config.apiKey,
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout
      });
    } catch (error) {
      console.error('[SMS MOBILE API] Greška pri učitavanju konfiguracije:', error);
      throw error;
    }
  }

  async testConnection(): Promise<SMSMobileAPIResponse> {
    try {
      if (!this.config.enabled) {
        return {
          success: false,
          message: 'SMS Mobile API servis nije omogućen',
          error: 'SMS Mobile API servis nije omogućen'
        };
      }

      if (!this.config.apiKey) {
        return {
          success: false,
          message: 'SMS Mobile API ključ nije konfigurisan',
          error: 'SMS Mobile API ključ nije konfigurisan'
        };
      }

      const testData = new URLSearchParams();
      testData.append('recipients', '+38269123456');
      testData.append('message', 'Test poruka sa SMS Mobile API');
      testData.append('apikey', this.config.apiKey);
      testData.append('sendsms', '1');
      testData.append('test', '1');

      const response = await fetch(`${this.config.baseUrl}/sendsms/`, {
        method: 'POST',
        body: testData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FrigoSistemTodosijevic/1.0'
        }
      });

      const responseText = await response.text();
      
      if (response.ok) {
        console.log('[SMS MOBILE API] Test konekcije uspešan:', responseText);
        return {
          success: true,
          message: 'Konekcija sa SMS Mobile API je uspešna',
          data: responseText
        };
      } else {
        console.error('[SMS MOBILE API] Test konekcije neuspešan:', response.status, responseText);
        return {
          success: false,
          message: `HTTP ${response.status}: ${responseText}`,
          error: `HTTP ${response.status}: ${responseText}`
        };
      }
    } catch (error) {
      console.error('[SMS MOBILE API] Greška pri testiranju konekcije:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Nepoznata greška',
        error: error instanceof Error ? error.message : 'Nepoznata greška'
      };
    }
  }

  async sendSMS(phoneNumber: string, message: string, options: { sendWhatsApp?: boolean } = {}): Promise<SMSMobileAPIResponse> {
    try {
      if (!this.config.enabled) {
        return {
          success: false,
          message: 'SMS Mobile API servis nije omogućen',
          error: 'SMS Mobile API servis nije omogućen'
        };
      }

      if (!this.config.apiKey) {
        return {
          success: false,
          message: 'SMS Mobile API ključ nije konfigurisan',
          error: 'SMS Mobile API ključ nije konfigurisan'
        };
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      const requestData = new URLSearchParams();
      requestData.append('recipients', formattedPhone);
      requestData.append('message', message);
      requestData.append('apikey', this.config.apiKey);
      requestData.append('sendsms', '1');
      
      if (options.sendWhatsApp) {
        requestData.append('sendwa', '1');
      }

      console.log('[SMS MOBILE API] Šaljem poruku na:', formattedPhone);
      
      const response = await fetch(`${this.config.baseUrl}/sendsms/`, {
        method: 'POST',
        body: requestData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FrigoSistemTodosijevic/1.0'
        }
      });

      const responseText = await response.text();
      
      if (response.ok) {
        console.log('[SMS MOBILE API] Poruka uspešno poslana:', responseText);
        return {
          success: true,
          message: 'SMS poruka je uspešno poslana',
          data: responseText
        };
      } else {
        console.error('[SMS MOBILE API] Greška pri slanju poruke:', response.status, responseText);
        return {
          success: false,
          message: `HTTP ${response.status}: ${responseText}`,
          error: `HTTP ${response.status}: ${responseText}`
        };
      }
    } catch (error) {
      console.error('[SMS MOBILE API] Greška pri slanju SMS poruke:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Nepoznata greška',
        error: error instanceof Error ? error.message : 'Nepoznata greška'
      };
    }
  }

  async sendBulkSMS(recipients: string[], message: string, options: { sendWhatsApp?: boolean } = {}): Promise<SMSMobileAPIResponse> {
    try {
      if (!this.config.enabled) {
        return {
          success: false,
          message: 'SMS Mobile API servis nije omogućen',
          error: 'SMS Mobile API servis nije omogućen'
        };
      }

      if (!this.config.apiKey) {
        return {
          success: false,
          message: 'SMS Mobile API ključ nije konfigurisan',
          error: 'SMS Mobile API ključ nije konfigurisan'
        };
      }

      const formattedRecipients = recipients.map(phone => this.formatPhoneNumber(phone));
      
      const requestData = new URLSearchParams();
      requestData.append('recipients', formattedRecipients.join(','));
      requestData.append('message', message);
      requestData.append('apikey', this.config.apiKey);
      requestData.append('sendsms', '1');
      
      if (options.sendWhatsApp) {
        requestData.append('sendwa', '1');
      }

      console.log('[SMS MOBILE API] Šaljem bulk poruku na', formattedRecipients.length, 'brojeva');
      
      const response = await fetch(`${this.config.baseUrl}/sendsms/`, {
        method: 'POST',
        body: requestData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FrigoSistemTodosijevic/1.0'
        }
      });

      const responseText = await response.text();
      
      if (response.ok) {
        console.log('[SMS MOBILE API] Bulk poruke uspešno poslane:', responseText);
        return {
          success: true,
          message: `SMS poruke su uspešno poslane na ${formattedRecipients.length} brojeva`,
          data: responseText
        };
      } else {
        console.error('[SMS MOBILE API] Greška pri slanju bulk poruka:', response.status, responseText);
        return {
          success: false,
          message: `HTTP ${response.status}: ${responseText}`,
          error: `HTTP ${response.status}: ${responseText}`
        };
      }
    } catch (error) {
      console.error('[SMS MOBILE API] Greška pri slanju bulk SMS poruka:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Nepoznata greška',
        error: error instanceof Error ? error.message : 'Nepoznata greška'
      };
    }
  }

  async getApiStatus(): Promise<SMSMobileAPIResponse> {
    try {
      if (!this.config.apiKey) {
        return {
          success: false,
          message: 'SMS Mobile API ključ nije konfigurisan',
          error: 'SMS Mobile API ključ nije konfigurisan'
        };
      }

      // Koristimo pravi SMS Mobile API endpoint sa test pozivom
      const requestData = new URLSearchParams();
      requestData.append('recipients', '+38267123456'); // Test broj koji neće biti korišćen
      requestData.append('message', 'TEST_CONNECTION'); // Test poruka
      requestData.append('apikey', this.config.apiKey);
      requestData.append('sendsms', '0'); // Onemogući stvarno slanje
      requestData.append('test', '1'); // Test mode ako je podržan

      const response = await fetch(`${this.config.baseUrl}/sendsms/`, {
        method: 'POST',
        body: requestData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FrigoSistemTodosijevic/1.0'
        }
      });

      const responseText = await response.text();
      console.log('[SMS MOBILE API] Status test odgovor:', responseText);
      
      return {
        success: response.ok,
        message: response.ok ? 'SMS Mobile API je dostupan' : 'SMS Mobile API nije dostupan',
        data: responseText
      };
    } catch (error) {
      console.error('[SMS MOBILE API] Greška pri proveri statusa:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Nepoznata greška',
        error: error instanceof Error ? error.message : 'Nepoznata greška'
      };
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    let formatted = phoneNumber.replace(/[^\d+]/g, '');
    
    if (formatted.startsWith('067') || formatted.startsWith('068') || formatted.startsWith('069')) {
      formatted = '+382' + formatted;
    } else if (formatted.startsWith('67') || formatted.startsWith('68') || formatted.startsWith('69')) {
      formatted = '+3820' + formatted;
    } else if (!formatted.startsWith('+')) {
      formatted = '+382' + formatted;
    }
    
    return formatted;
  }

  async updateConfiguration(config: Partial<SMSMobileAPIConfig>): Promise<void> {
    try {
      if (config.apiKey !== undefined) {
        await this.storage.updateSystemSetting('sms_mobile_api_key', { value: config.apiKey });
        this.config.apiKey = config.apiKey;
      }
      
      if (config.baseUrl !== undefined) {
        await this.storage.updateSystemSetting('sms_mobile_base_url', { value: config.baseUrl });
        this.config.baseUrl = config.baseUrl;
      }
      
      if (config.timeout !== undefined) {
        await this.storage.updateSystemSetting('sms_mobile_timeout', { value: config.timeout.toString() });
        this.config.timeout = config.timeout;
      }
      
      if (config.enabled !== undefined) {
        await this.storage.updateSystemSetting('sms_mobile_enabled', { value: config.enabled.toString() });
        this.config.enabled = config.enabled;
      }
      
      console.log('[SMS MOBILE API] Konfiguracija ažurirana');
    } catch (error) {
      console.error('[SMS MOBILE API] Greška pri ažuriranju konfiguracije:', error);
      throw error;
    }
  }

  getConfiguration(): SMSMobileAPIConfig {
    return { ...this.config };
  }
}

export function createSMSMobileAPIService(storage: IStorage): SMSMobileAPIService {
  return new SMSMobileAPIService(storage);
}