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
  private baseUrl = 'https://api.messaggio.com/api/v1';

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
        recipients: [formattedPhone],
        text: options.message,
        sender: this.senderId,
        country: "ME"
      };

      console.log(`[MESSAGGIO DEBUG] URL: ${this.baseUrl}/messages`);
      console.log(`[MESSAGGIO DEBUG] Payload:`, JSON.stringify(payload, null, 2));
      console.log(`[MESSAGGIO DEBUG] Headers: Authorization: Bearer ${this.apiKey.substring(0, 10)}...`);

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
      
      // Pokušaj sa različitim endpoint-ima i base URL-ovima
      const testConfigs = [
        { baseUrl: 'https://api.messaggio.com/api/v1', endpoint: '/balance' },
        { baseUrl: 'https://api.messaggio.com/api/v1', endpoint: '/account/balance' },
        { baseUrl: 'https://api.messaggio.com/api/v1', endpoint: '/user/balance' },
        { baseUrl: 'https://api.messaggio.com', endpoint: '/api/v1/balance' },
        { baseUrl: 'https://api.messaggio.com', endpoint: '/balance' },
        { baseUrl: 'https://api.messaggio.com', endpoint: '/account' },
        { baseUrl: 'https://messaggio.com/api', endpoint: '/balance' },
        { baseUrl: 'https://messaggio.com/api/v1', endpoint: '/balance' },
      ];

      for (const config of testConfigs) {
        try {
          const url = `${config.baseUrl}${config.endpoint}`;
          console.log(`[MESSAGGIO] Testiranje: ${url}`);
          
          // Pokušaj sa različitim formatima autentifikacije
          const authConfigs = [
            { 'Authorization': `Bearer ${this.apiKey}` },
            { 'Authorization': `API-Key ${this.apiKey}` },
            { 'Authorization': this.apiKey },
            { 'X-API-Key': this.apiKey },
            { 'apikey': this.apiKey },
            { 'token': this.apiKey },
            { 'Authorization': `Token ${this.apiKey}` },
            { 'api-key': this.apiKey }
          ];

          for (const authConfig of authConfigs) {
            try {
              const response = await axios.get(url, {
                headers: {
                  ...authConfig,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                timeout: 10000
              });

              if (response.status === 200) {
                console.log(`[MESSAGGIO] ✅ Konekcija uspešna sa ${url} i auth:`, Object.keys(authConfig)[0]);
                console.log(`[MESSAGGIO] Balans:`, response.data);
                // Ažuriraj base URL za buduće pozive
                this.baseUrl = config.baseUrl;
                return true;
              }
            } catch (authError: any) {
              if (authError.response?.status !== 403) {
                console.log(`[MESSAGGIO] ${url} sa ${Object.keys(authConfig)[0]} - Status: ${authError.response?.status}, Error: ${authError.message}`);
              }
              continue;
            }
          }

        } catch (error: any) {
          console.log(`[MESSAGGIO] ${config.baseUrl}${config.endpoint} - Svi auth metodi neuspešni`);
          continue;
        }
      }

      console.error('[MESSAGGIO] ❌ Svi endpoint-i neuspešni');
      return false;

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

      const response = await axios.get(`${this.baseUrl}/balance`, {
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