import axios from 'axios';

export interface MessaggioSmsOptions {
  to: string;
  message: string;
  type?: 'appointment' | 'status_update' | 'reminder' | 'custom';
}

export interface MessaggioSmsResult {
  success: boolean;
  messageId?: string;
  cost?: number;
  error?: string;
  details?: any;
}

export class MessaggioSmsService {
  private apiKey: string;
  private senderId: string;
  private baseUrl = 'https://api.messaggio.com/v1';

  constructor() {
    this.apiKey = process.env.MESSAGGIO_API_KEY || '';
    this.senderId = process.env.MESSAGGIO_SENDER_ID || 'Frigo Sistem';
    
    if (!this.apiKey) {
      console.warn('[MESSAGGIO] API key nije konfigurisan');
    }
  }

  /**
   * Formatira broj telefona za Messaggio (Montenegro format)
   */
  private formatPhoneNumber(phone: string): string {
    // Ukloni sve što nije broj
    let cleaned = phone.replace(/\D/g, '');
    
    // Ako počinje sa 382, ostavi tako
    if (cleaned.startsWith('382')) {
      return `+${cleaned}`;
    }
    
    // Ako počinje sa 0, zameni sa 382
    if (cleaned.startsWith('0')) {
      return `+382${cleaned.substring(1)}`;
    }
    
    // Ako počinje sa 6 ili 7 (Montenegro mobilni), dodaj 382
    if (cleaned.startsWith('6') || cleaned.startsWith('7')) {
      return `+382${cleaned}`;
    }
    
    // Inače, dodaj + ako već nije
    return phone.startsWith('+') ? phone : `+${cleaned}`;
  }

  /**
   * Šalje SMS preko Messaggio API-ja
   */
  async sendSms(options: MessaggioSmsOptions): Promise<MessaggioSmsResult> {
    try {
      if (!this.apiKey) {
        console.error('[MESSAGGIO] API key nije konfigurisan');
        return {
          success: false,
          error: 'API key nije konfigurisan'
        };
      }

      const formattedPhone = this.formatPhoneNumber(options.to);
      
      console.log(`[MESSAGGIO] Slanje SMS-a na ${formattedPhone}: ${options.message.substring(0, 50)}...`);

      const payload = {
        to: formattedPhone,
        message: options.message,
        from: this.senderId,
        type: 'sms'
      };

      const response = await axios.post(`${this.baseUrl}/messages`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 sekundi timeout
      });

      if (response.status === 200 || response.status === 201) {
        const result = response.data;
        console.log(`[MESSAGGIO] ✅ SMS uspešno poslat. ID: ${result.messageId || 'N/A'}`);
        
        return {
          success: true,
          messageId: result.messageId || result.id,
          cost: result.cost,
          details: result
        };
      } else {
        console.error(`[MESSAGGIO] ❌ Neočekivan status kod: ${response.status}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: response.data
        };
      }

    } catch (error: any) {
      console.error('[MESSAGGIO] ❌ Greška pri slanju SMS-a:', error.message);
      
      if (error.response) {
        // API je odgovorio sa error status kodom
        console.error('[MESSAGGIO] API response error:', error.response.data);
        return {
          success: false,
          error: `API greška: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`,
          details: error.response.data
        };
      } else if (error.request) {
        // Zahtev je poslat ali nema odgovora
        console.error('[MESSAGGIO] Nema odgovora od API-ja');
        return {
          success: false,
          error: 'Nema odgovora od Messaggio API-ja'
        };
      } else {
        // Greška u podešavanju zahteva
        console.error('[MESSAGGIO] Greška u konfiguraciji:', error.message);
        return {
          success: false,
          error: `Konfiguracija greška: ${error.message}`
        };
      }
    }
  }

  /**
   * Testira konekciju sa Messaggio API-jem
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.error('[MESSAGGIO] API key nije konfigurisan za test');
        return false;
      }

      console.log('[MESSAGGIO] Testiranje konekcije...');
      
      const response = await axios.get(`${this.baseUrl}/account/balance`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 10000
      });

      if (response.status === 200) {
        console.log('[MESSAGGIO] ✅ Konekcija uspešna. Balans:', response.data);
        return true;
      } else {
        console.error(`[MESSAGGIO] ❌ Test neuspešan: ${response.status}`);
        return false;
      }

    } catch (error: any) {
      console.error('[MESSAGGIO] ❌ Test konekcije neuspešan:', error.message);
      return false;
    }
  }

  /**
   * Vraća trenutni balans na nalogu
   */
  async getBalance(): Promise<{ success: boolean; balance?: number; currency?: string; error?: string }> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'API key nije konfigurisan'
        };
      }

      const response = await axios.get(`${this.baseUrl}/account/balance`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 10000
      });

      if (response.status === 200) {
        return {
          success: true,
          balance: response.data.balance,
          currency: response.data.currency || 'EUR'
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const messaggioSmsService = new MessaggioSmsService();