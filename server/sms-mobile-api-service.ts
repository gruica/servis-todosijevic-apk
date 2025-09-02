import axios from 'axios';

export interface SMSMobileAPIConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface SendSMSRequest {
  recipients: string;
  message: string;
  sendername?: string; // Sender ID - ime firme koje će se prikazati umesto broja
  url_media?: string; // URL do media fajla (slike, dokumenti) za WhatsApp
  whatsappOnly?: boolean; // Pošalji samo preko WhatsApp-a
}

export interface SendSMSResponse {
  error?: number;
  sent?: number;
  message_id?: string;
  details?: string;
}

export class SMSMobileAPIService {
  private config: SMSMobileAPIConfig;

  constructor(config: SMSMobileAPIConfig) {
    this.config = {
      baseUrl: 'https://api.smsmobileapi.com',
      timeout: 10000,
      ...config
    };
  }

  /**
   * Pošalje SMS poruku preko SMS Mobile API
   */
  async sendSMS(request: SendSMSRequest): Promise<SendSMSResponse> {
    try {
      // VALIDACIJA: SMS ne sme biti duži od 160 karaktera (samo za SMS, WhatsApp može duže)
      if (!request.whatsappOnly && request.message.length > 160) {
        const truncatedMessage = request.message.substring(0, 160);
        console.log(`⚠️ SMS skraćen sa ${request.message.length} na 160 karaktera`);
        request.message = truncatedMessage;
      }
      
      // Log tip poruke
      const messageType = request.whatsappOnly 
        ? (request.url_media ? '📷 WhatsApp Media' : '💬 WhatsApp') 
        : '📱 SMS';
      console.log(`${messageType}: Šaljem na ${request.recipients} (${request.message.length} karaktera)`);
      
      // SMS Mobile API zahteva application/x-www-form-urlencoded format
      const formData = new URLSearchParams();
      formData.append('recipients', request.recipients);
      formData.append('message', request.message);
      formData.append('apikey', this.config.apiKey);
      
      // ISPRAVKA: WhatsApp only mode ide u form data, ne u URL
      if (request.whatsappOnly) {
        formData.append('waonly', 'yes');
        console.log(`💬 WhatsApp Only Mode aktiviran`);
      }
      
      // Dodavanje Sender ID (ime firme) ako je specificirano - SAMO za SMS
      if (request.sendername && request.sendername.trim() && !request.whatsappOnly) {
        formData.append('sendername', request.sendername.trim());
        console.log(`📤 Sender ID: ${request.sendername.trim()}`);
      }

      // Dodavanje media URL-a za WhatsApp
      if (request.url_media && request.url_media.trim()) {
        formData.append('url_media', request.url_media.trim());
        console.log(`📷 Media URL: ${request.url_media.trim()}`);
      }

      // ISPRAVKA: Endpoint SA završnim slash-om (SMS Mobile API zahtijeva)
      const apiUrl = `${this.config.baseUrl}/sendsms/`;

      const response = await axios.post(
        apiUrl,
        formData,
        {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log(`📱 SMS Mobile API Response:`, response.data);
      
      // Proverava odgovor - ako je response.data.result, koristimo taj format
      if (response.data.result) {
        return {
          error: response.data.result.error,
          sent: response.data.result.sent,
          message_id: response.data.result.id,
          details: response.data.result.note
        };
      }
      
      // Inače koristimo direktan format
      return response.data;
    } catch (error: any) {
      console.error('❌ SMS Mobile API Error:', error.message);
      if (error.response) {
        console.error('❌ Response data:', error.response.data);
        return {
          error: 1,
          details: error.response.data?.message || error.message
        };
      }
      return {
        error: 1,
        details: error.message
      };
    }
  }

  /**
   * Testira konekciju sa SMS Mobile API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Šaljemo test SMS na prazan broj da vidimo da li API ključ radi  
      const formData = new URLSearchParams();
      formData.append('recipients', '38267000000'); // Test broj
      formData.append('message', 'Test konekcije');
      formData.append('apikey', this.config.apiKey);

      const response = await axios.post(
        `${this.config.baseUrl}/sendsms/`,
        formData,
        {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Proverava response format
      const result = response.data.result || response.data;
      
      if (result.error === 0 || result.error === "0") {
        return {
          success: true,
          message: 'SMS Mobile API je uspešno povezan'
        };
      } else {
        return {
          success: false,
          message: result.details || result.note || 'Nepoznata greška'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Formatira broj telefona za SMS Mobile API
   * ISPRAVKA: 067051141 → 38267051141 (bez dodavanja nule)
   */
  formatPhoneNumber(phone: string): string {
    // Ukloni sve što nije broj
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Ako počinje sa 067, 068, 069 - ukloni početnu nulu i dodaj 382
    if (cleanPhone.match(/^0(67|68|69)/)) {
      return `382${cleanPhone.substring(1)}`; // Uklanja početnu nulu
    }
    
    // Ako počinje sa 67, 68, 69 (bez nule) dodaj 382
    if (cleanPhone.match(/^(67|68|69)/)) {
      return `382${cleanPhone}`;
    }
    
    // Ako počinje sa +382, ukloni +
    if (cleanPhone.startsWith('382')) {
      return cleanPhone;
    }
    
    // Ako počinje sa 00382, ukloni 00
    if (cleanPhone.startsWith('00382')) {
      return cleanPhone.substring(2);
    }
    
    return cleanPhone;
  }

  /**
   * Bulk slanje SMS poruka
   */
  async sendBulkSMS(recipients: string[], message: string): Promise<SendSMSResponse[]> {
    const results: SendSMSResponse[] = [];
    
    for (const recipient of recipients) {
      const formattedPhone = this.formatPhoneNumber(recipient);
      const result = await this.sendSMS({
        recipients: formattedPhone,
        message
      });
      results.push(result);
      
      // Kratka pauza između slanja
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}