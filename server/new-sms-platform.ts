import axios from 'axios';

export interface NewSmsOptions {
  to: string;
  message: string;
  from?: string;
  type?: 'appointment' | 'status_update' | 'reminder' | 'custom';
}

export interface NewSmsResult {
  success: boolean;
  messageId?: string;
  cost?: number;
  error?: string;
  details?: any;
  method?: string;
}

/**
 * Infobip SMS servis - profesionalna SMS platforma
 */
export class NewSmsService {
  private apiKey: string;
  private apiUrl: string;
  private senderId: string;
  private baseUrl: string;

  constructor() {
    // Konfiguracija za Infobip SMS platformu
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
  private async sendViaInfobipApi(options: NewSmsOptions): Promise<NewSmsResult> {
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
            text: options.message,
            notifyUrl: undefined, // Možete dodati webhook URL za status
            notifyContentType: "application/json",
            callbackData: options.type || "custom"
          }
        ]
      };

      console.log(`[INFOBIP] Šalje SMS na ${options.to}: ${options.message.substring(0, 50)}...`);

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      console.log(`[INFOBIP] API odgovor:`, response.data);

      const message = response.data.messages[0];
      
      return {
        success: message.status.groupId === 1, // 1 = PENDING/ACCEPTED
        messageId: message.messageId,
        cost: message.status.price,
        method: 'Infobip API',
        details: {
          messageId: message.messageId,
          status: message.status,
          to: message.to,
          from: message.from
        }
      };

    } catch (error: any) {
      console.error(`[INFOBIP] API greška:`, error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.requestError?.serviceException?.text || error.message,
        method: 'Infobip API',
        details: error.response?.data
      };
    }
  }

  /**
   * Šalje SMS preko vaše nove platforme - Method 2: Username/Password API
   */
  private async sendViaCredentials(options: NewSmsOptions): Promise<NewSmsResult> {
    try {
      const payload = {
        username: this.username,
        password: this.password,
        to: this.formatPhoneNumber(options.to),
        message: options.message,
        from: options.from || this.senderId,
      };

      const response = await axios.post(`${this.apiUrl}/send`, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log(`[NEW SMS] Credentials API odgovor:`, response.data);

      return {
        success: true,
        messageId: response.data.messageId || response.data.id,
        cost: response.data.cost,
        method: 'Credentials API',
        details: response.data
      };

    } catch (error: any) {
      console.error(`[NEW SMS] Credentials API greška:`, error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        method: 'Credentials API',
        details: error.response?.data
      };
    }
  }

  /**
   * Šalje SMS preko vaše nove platforme - Method 3: GET Request
   */
  private async sendViaGetRequest(options: NewSmsOptions): Promise<NewSmsResult> {
    try {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        to: this.formatPhoneNumber(options.to),
        message: options.message,
        from: options.from || this.senderId,
      });

      const response = await axios.get(`${this.apiUrl}/sms?${params.toString()}`, {
        timeout: 30000
      });

      console.log(`[NEW SMS] GET API odgovor:`, response.data);

      return {
        success: true,
        messageId: response.data.messageId || response.data.id,
        cost: response.data.cost,
        method: 'GET API',
        details: response.data
      };

    } catch (error: any) {
      console.error(`[NEW SMS] GET API greška:`, error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        method: 'GET API',
        details: error.response?.data
      };
    }
  }

  /**
   * Glavna metoda za slanje SMS-a preko Infobip-a
   */
  async sendSms(options: NewSmsOptions): Promise<NewSmsResult> {
    console.log(`[INFOBIP] Pokušava slanje SMS-a na ${options.to}: ${options.message.substring(0, 50)}...`);

    if (!this.apiKey) {
      console.error(`[INFOBIP] API ključ nije konfigurisan`);
      return {
        success: false,
        error: 'Infobip API ključ nije konfigurisan',
        method: 'Infobip API'
      };
    }

    // Pokušaj slanja preko Infobip API-ja
    const result = await this.sendViaInfobipApi(options);
    if (result.success) {
      console.log(`[INFOBIP] ✅ SMS uspešno poslat sa ${this.senderId} na ${options.to}`);
      return result;
    }

    console.error(`[INFOBIP] ❌ Slanje SMS-a neuspešno: ${result.error}`);
    return result;
  }

  /**
   * Testira konekciju sa Infobip platformom
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.error(`[INFOBIP] API ključ nije konfigurisan`);
        return false;
      }

      // Pokušaj osnovnu proveru - account balance endpoint
      const response = await axios.get(`${this.baseUrl}/account/1/balance`, {
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      console.log(`[INFOBIP] Test konekcije: ${response.status}`);
      return response.status === 200;

    } catch (error: any) {
      console.error(`[INFOBIP] Test konekcije neuspešan:`, error.message);
      return false;
    }
  }

  /**
   * Vraća informacije o balansu/kreditu sa Infobip-a
   */
  async getBalance(): Promise<{ balance?: number; currency?: string; error?: string }> {
    try {
      if (!this.apiKey) {
        return {
          error: 'Infobip API ključ nije konfigurisan'
        };
      }

      const response = await axios.get(`${this.baseUrl}/account/1/balance`, {
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      console.log(`[INFOBIP] Balans odgovor:`, response.data);

      return {
        balance: response.data.balance,
        currency: response.data.currency || 'EUR'
      };

    } catch (error: any) {
      console.error(`[INFOBIP] Greška pri dobijanju balansa:`, error.message);
      return {
        error: error.response?.data?.requestError?.serviceException?.text || error.message
      };
    }
  }
}

// Eksportuj instancu
export const newSmsService = new NewSmsService();