import axios from 'axios';

export interface SMSMobileAPIConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface SendSMSRequest {
  recipients: string;
  message: string;
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
      console.log(`📱 SMS Mobile API: Šaljem SMS na ${request.recipients}`);
      
      const response = await axios.post(
        `${this.config.baseUrl}/sendsms/`,
        {
          recipients: request.recipients,
          message: request.message,
          apikey: this.config.apiKey
        },
        {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`📱 SMS Mobile API Response:`, response.data);
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
      const response = await axios.post(
        `${this.config.baseUrl}/sendsms/`,
        {
          recipients: '38267000000', // Test broj
          message: 'Test konekcije',
          apikey: this.config.apiKey
        },
        {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.error === 0) {
        return {
          success: true,
          message: 'SMS Mobile API je uspešno povezan'
        };
      } else {
        return {
          success: false,
          message: response.data.details || 'Nepoznata greška'
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
   */
  formatPhoneNumber(phone: string): string {
    // Ukloni sve što nije broj
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Ako počinje sa 067, 068, 069 dodaj 382
    if (cleanPhone.match(/^(067|068|069)/)) {
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