import axios from 'axios';

export interface SmsConfig {
  provider: 'messaggio' | 'plivo' | 'budgetsms' | 'viber' | 'twilio';
  apiKey: string;
  authToken?: string;
  senderId?: string;
  baseUrl?: string;
}

export interface SmsMessage {
  to: string;
  message: string;
  type?: 'transactional' | 'promotional' | 'appointment' | 'status_update';
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  cost?: number;
  error?: string;
  deliveryStatus?: 'sent' | 'delivered' | 'failed' | 'pending';
}

/**
 * Univerzalni SMS servis koji podržava različite provajdere za Crnu Goru
 */
export class SmsService {
  private static instance: SmsService;
  private config: SmsConfig | null = null;
  private isConfigured = false;

  private constructor() {}

  public static getInstance(): SmsService {
    if (!SmsService.instance) {
      SmsService.instance = new SmsService();
    }
    return SmsService.instance;
  }

  /**
   * Konfiguracija SMS servisa
   */
  public configure(config: SmsConfig): void {
    this.config = config;
    this.isConfigured = true;
    console.log(`[SMS] Konfigurisan provajder: ${config.provider}`);
  }



  /**
   * Slanje SMS poruke kroz odabrani provajder
   */
  public async sendSms(message: SmsMessage): Promise<SmsResult> {
    if (!this.isConfigured || !this.config) {
      return {
        success: false,
        error: 'SMS servis nije konfigurisan'
      };
    }

    try {
      // Normalizacija broja telefona za Crnu Goru
      const phoneNumber = this.normalizePhoneNumber(message.to);
      
      console.log(`[SMS] Slanje ${message.type || 'generic'} poruke na ${phoneNumber} preko ${this.config.provider}`);
      
      switch (this.config.provider) {
        case 'messaggio':
          return await this.sendViaMessaggio(phoneNumber, message.message);
        case 'plivo':
          return await this.sendViaPlivo(phoneNumber, message.message);
        case 'budgetsms':
          return await this.sendViaBudgetSms(phoneNumber, message.message);
        case 'viber':
          return await this.sendViaViberWithFallback(phoneNumber, message.message);
        case 'twilio':
          return await this.sendViaTwilio(phoneNumber, message.message);
        default:
          return {
            success: false,
            error: `Nepodržan provajder: ${this.config.provider}`
          };
      }
    } catch (error) {
      console.error('[SMS] Greška pri slanju poruke:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nepoznata greška'
      };
    }
  }

  /**
   * Normalizacija telefona za crnogorski format (+382)
   */
  private normalizePhoneNumber(phone: string): string {
    // Ukloni sve što nije cifra ili +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Ako počinje sa 0, zameni sa +382
    if (normalized.startsWith('0')) {
      normalized = '+382' + normalized.substring(1);
    }
    
    // Ako nema koda zemlje, dodaj +382
    if (!normalized.startsWith('+382') && !normalized.startsWith('+')) {
      normalized = '+382' + normalized;
    }
    
    return normalized;
  }

  /**
   * Messaggio API - Najbolja opcija za Crnu Goru
   */
  private async sendViaMessaggio(to: string, message: string): Promise<SmsResult> {
    try {
      const response = await axios.post('https://api.messaggio.com/v1/send', {
        to: to,
        message: message,
        sender_id: this.config?.senderId || 'Frigo Sistem',
        channel: 'sms'
      }, {
        headers: {
          'Authorization': `Bearer ${this.config?.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        messageId: response.data.message_id,
        cost: response.data.cost,
        deliveryStatus: 'sent'
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Messaggio greška: ${error.response?.data?.message || error.message}`
      };
    }
  }

  /**
   * Plivo API
   */
  private async sendViaPlivo(to: string, message: string): Promise<SmsResult> {
    try {
      const authString = Buffer.from(`${this.config?.apiKey}:${this.config?.authToken}`).toString('base64');
      
      const response = await axios.post(`https://api.plivo.com/v1/Account/${this.config?.apiKey}/Message/`, {
        src: this.config?.senderId || 'Frigo Sistem',
        dst: to,
        text: message
      }, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        messageId: response.data.message_uuid[0],
        deliveryStatus: 'sent'
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Plivo greška: ${error.response?.data?.error || error.message}`
      };
    }
  }

  /**
   * BudgetSMS API - Najjeftiniji
   */
  private async sendViaBudgetSms(to: string, message: string): Promise<SmsResult> {
    try {
      const response = await axios.post('https://api.budgetsms.net/sendsms/', {
        username: this.config?.apiKey,
        userid: this.config?.authToken,
        handle: Math.random().toString(36).substring(7),
        msg: message,
        to: to,
        from: this.config?.senderId || 'Frigo Sistem'
      });

      const result = response.data.split('|');
      if (result[0] === 'OK') {
        return {
          success: true,
          messageId: result[1],
          deliveryStatus: 'sent'
        };
      } else {
        return {
          success: false,
          error: `BudgetSMS greška: ${result[1]}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `BudgetSMS greška: ${error.message}`
      };
    }
  }

  /**
   * Viber Business API sa SMS fallback
   */
  private async sendViaViberWithFallback(to: string, message: string): Promise<SmsResult> {
    try {
      // Prvo pokušaj Viber
      const viberResponse = await axios.post('https://chatapi.viber.com/pa/send_message', {
        receiver: to,
        type: 'text',
        text: message,
        sender: {
          name: this.config?.senderId || 'Frigo Sistem'
        }
      }, {
        headers: {
          'X-Viber-Auth-Token': this.config?.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (viberResponse.data.status === 0) {
        return {
          success: true,
          messageId: viberResponse.data.message_token,
          cost: 0.0025, // Viber je jeftiniji
          deliveryStatus: 'sent'
        };
      } else {
        // Fallback na SMS
        console.log('[SMS] Viber failed, falling back to SMS');
        return await this.sendViaMessaggio(to, message);
      }
    } catch (error: any) {
      // Fallback na SMS
      console.log('[SMS] Viber error, falling back to SMS:', error.message);
      return await this.sendViaMessaggio(to, message);
    }
  }

  /**
   * Twilio (zadržano za kompatibilnost)
   */
  private async sendViaTwilio(to: string, message: string): Promise<SmsResult> {
    try {
      const authString = Buffer.from(`${this.config?.apiKey}:${this.config?.authToken}`).toString('base64');
      
      const response = await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${this.config?.apiKey}/Messages.json`, 
        new URLSearchParams({
          To: to,
          From: this.config?.senderId || '+19472106783',
          Body: message
        }), {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        success: true,
        messageId: response.data.sid,
        deliveryStatus: 'sent'
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Twilio greška: ${error.response?.data?.message || error.message}`
      };
    }
  }

  /**
   * Provera statusa isporuke
   */
  public async checkDeliveryStatus(messageId: string): Promise<string> {
    if (!this.isConfigured || !this.config) {
      return 'unknown';
    }

    try {
      switch (this.config.provider) {
        case 'messaggio':
          const response = await axios.get(`https://api.messaggio.com/v1/status/${messageId}`, {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`
            }
          });
          return response.data.status;
        case 'plivo':
          // Plivo status API poziv
          return 'sent'; // Placeholder
        default:
          return 'sent';
      }
    } catch (error) {
      console.error('[SMS] Greška pri proveri statusa:', error);
      return 'unknown';
    }
  }

  /**
   * Test konfiguracije
   */
  public async testConfiguration(): Promise<boolean> {
    if (!this.isConfigured || !this.config) {
      return false;
    }

    try {
      // Pošalji test poruku na test broj
      const testResult = await this.sendSms({
        to: '+38269123456', // Test broj
        message: 'Test poruka iz Frigo Sistema - ignoriši',
        type: 'transactional'
      });

      return testResult.success;
    } catch (error) {
      console.error('[SMS] Test konfiguracije neuspešan:', error);
      return false;
    }
  }

  /**
   * Dobijanje informacija o konfiguraciji
   */
  public getConfigInfo(): { provider: string; configured: boolean } | null {
    if (!this.isConfigured || !this.config) {
      return null;
    }

    return {
      provider: this.config.provider,
      configured: true
    };
  }
}

// Kreiraj singleton instancu
export const smsService = SmsService.getInstance();