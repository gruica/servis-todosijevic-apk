import axios from 'axios';

export interface SmsOptions {
  to: string;
  message: string;
  type?: 'appointment' | 'status_update' | 'reminder' | 'custom';
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  cost?: number;
  error?: string;
  details?: any;
}

/**
 * Infobip SMS servis - jedina SMS platforma u aplikaciji
 */
export class InfobipSmsService {
  private apiKey: string;
  private apiUrl: string;
  private senderId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.INFOBIP_API_KEY || '';
    this.baseUrl = process.env.INFOBIP_BASE_URL || 'https://api.infobip.com';
    this.apiUrl = `${this.baseUrl}/sms/2/text/advanced`;
    this.senderId = '+38267051141'; // Vaš Telekom broj
    
    if (!this.apiKey) {
      console.warn('[INFOBIP] API ključ nije konfigurisan');
    }
    
    console.log(`[INFOBIP] Inicijalizovan sa sender ID: ${this.senderId}`);
  }

  /**
   * Formatira broj telefona za Montenegro
   */
  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('382')) {
      return `+${cleaned}`;
    }
    
    if (cleaned.startsWith('0')) {
      return `+382${cleaned.substring(1)}`;
    }
    
    if (cleaned.startsWith('6') || cleaned.startsWith('7')) {
      return `+382${cleaned}`;
    }
    
    return phone.startsWith('+') ? phone : `+${cleaned}`;
  }

  /**
   * Šalje SMS preko Infobip REST API
   */
  public async sendSms(options: SmsOptions): Promise<SmsResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'INFOBIP_API_KEY nije konfigurisan'
      };
    }

    try {
      const payload = {
        messages: [
          {
            from: this.senderId,
            destinations: [
              {
                to: this.formatPhoneNumber(options.to)
              }
            ],
            text: options.message
          }
        ]
      };

      console.log(`[INFOBIP] Šalje SMS na ${options.to}: ${options.message}`);

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.messages && response.data.messages[0]) {
        const messageData = response.data.messages[0];
        
        if (messageData.status && messageData.status.name === 'PENDING_ACCEPTED') {
          return {
            success: true,
            messageId: messageData.messageId,
            cost: messageData.status.price?.pricePerMessage || 0,
            details: messageData
          };
        } else {
          return {
            success: false,
            error: `Infobip greška: ${messageData.status?.description || 'Nepoznata greška'}`,
            details: messageData
          };
        }
      }

      return {
        success: false,
        error: 'Neočekivan odgovor od Infobip API-ja',
        details: response.data
      };

    } catch (error: any) {
      console.error('[INFOBIP] Greška pri slanju SMS-a:', error.message);
      
      let errorMessage = 'Greška pri slanju SMS-a preko Infobip-a';
      
      if (error.response?.data?.requestError?.serviceException?.text) {
        errorMessage = error.response.data.requestError.serviceException.text;
      } else if (error.response?.status === 401) {
        errorMessage = 'Neispravni Infobip kredencijali';
      } else if (error.response?.status === 403) {
        errorMessage = 'Nemate dozvolu za slanje SMS-a';
      }
      
      return {
        success: false,
        error: errorMessage,
        details: error.response?.data || error.message
      };
    }
  }

  /**
   * Testira konekciju sa Infobip API-jem
   */
  public async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/account/1/balance`, {
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      return response.status === 200;
    } catch (error: any) {
      console.error('[INFOBIP] Greška pri testiranju konekcije:', error.message);
      return false;
    }
  }

  /**
   * Dobija balans sa Infobip računa
   */
  public async getBalance(): Promise<number> {
    if (!this.apiKey) {
      return 0;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/account/1/balance`, {
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      return response.data?.balance || 0;
    } catch (error: any) {
      console.error('[INFOBIP] Greška pri dobijanju balansa:', error.message);
      return 0;
    }
  }

  /**
   * Proverava da li je servis spreman za korišćenje
   */
  public isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Singleton instanca
export const infobipSms = new InfobipSmsService();