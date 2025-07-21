import fetch from 'node-fetch';

export interface MobileGatewaySMSConfig {
  gatewayIP: string;
  gatewayPort: number;
  apiKey?: string;
  timeout: number;
}

export interface SMSMessage {
  phoneNumber: string;
  message: string;
  priority?: 'normal' | 'high';
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export class MobileGatewaySMSService {
  private config: MobileGatewaySMSConfig;

  constructor(config: MobileGatewaySMSConfig) {
    this.config = config;
  }

  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`[MOBILE SMS] 📱 Slanje SMS-a na ${message.phoneNumber} preko mobile gateway-a`);
      console.log(`[MOBILE SMS] Gateway: ${this.config.gatewayIP}:${this.config.gatewayPort}`);
      
      const url = `http://${this.config.gatewayIP}:${this.config.gatewayPort}/api/send-sms`;
      
      const requestBody = {
        phone: message.phoneNumber,
        message: message.message,
        priority: message.priority || 'normal',
        timestamp: new Date().toISOString()
      };

      // Dodaj API key ako postoji
      if (this.config.apiKey) {
        (requestBody as any).apiKey = this.config.apiKey;
      }

      console.log(`[MOBILE SMS] 📤 Slanje zahteva na: ${url}`);
      console.log(`[MOBILE SMS] 📋 Sadržaj: ${message.message.substring(0, 100)}...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Frigo-Sistem-SMS-Gateway/1.0'
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json() as any;
      const duration = Date.now() - startTime;

      if (response.ok && responseData.success) {
        console.log(`[MOBILE SMS] ✅ SMS uspešno poslat u ${duration}ms`);
        console.log(`[MOBILE SMS] 📱 Message ID: ${responseData.messageId || 'N/A'}`);
        
        return {
          success: true,
          messageId: responseData.messageId,
          timestamp: new Date().toISOString()
        };
      } else {
        const error = responseData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.log(`[MOBILE SMS] ❌ Greška pri slanju SMS-a: ${error}`);
        
        return {
          success: false,
          error: error,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`[MOBILE SMS] 💥 Mrežna greška nakon ${duration}ms: ${error.message}`);
      
      return {
        success: false,
        error: `Greška mreže: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResponse[]> {
    console.log(`[MOBILE SMS] 📬 Grupno slanje ${messages.length} SMS poruka`);
    
    const results: SMSResponse[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      console.log(`[MOBILE SMS] 📱 Slanje ${i + 1}/${messages.length}: ${message.phoneNumber}`);
      
      const result = await this.sendSMS(message);
      results.push(result);
      
      // Kratka pauza između poruka da ne opteretimo gateway
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`[MOBILE SMS] 📊 Grupno slanje završeno: ${successCount}/${messages.length} uspešno`);
    
    return results;
  }

  async testConnection(): Promise<{ connected: boolean; error?: string; gatewayInfo?: any }> {
    try {
      console.log(`[MOBILE SMS] 🔍 Testiranje konekcije sa gateway-om`);
      
      const url = `http://${this.config.gatewayIP}:${this.config.gatewayPort}/api/status`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Frigo-Sistem-SMS-Gateway/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json() as any;
        console.log(`[MOBILE SMS] ✅ Gateway je dostupan`);
        console.log(`[MOBILE SMS] 📱 Info: ${JSON.stringify(data, null, 2)}`);
        
        return {
          connected: true,
          gatewayInfo: data
        };
      } else {
        const error = `HTTP ${response.status}: ${response.statusText}`;
        console.log(`[MOBILE SMS] ❌ Gateway nedostupan: ${error}`);
        
        return {
          connected: false,
          error: error
        };
      }
    } catch (error: any) {
      console.log(`[MOBILE SMS] 💥 Greška pri testiranju konekcije: ${error.message}`);
      
      return {
        connected: false,
        error: error.message
      };
    }
  }

  // Helper metoda za formatiranje srpskih brojeva telefona
  static formatSerbianPhoneNumber(phone: string): string {
    // Ukloni sve što nije broj
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Ako počinje sa 381, ostavi kako jeste
    if (cleanPhone.startsWith('381')) {
      return `+${cleanPhone}`;
    }
    
    // Ako počinje sa 0, zameni sa 381
    if (cleanPhone.startsWith('0')) {
      return `+381${cleanPhone.substring(1)}`;
    }
    
    // Ako je 8 ili 9 cifara, dodaj 381
    if (cleanPhone.length === 8 || cleanPhone.length === 9) {
      return `+381${cleanPhone}`;
    }
    
    // Inače vrati kako jeste sa +
    return cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
  }
}

// Factory funkcija za kreiranje servi
export function createMobileGatewaySMSService(config: MobileGatewaySMSConfig): MobileGatewaySMSService {
  return new MobileGatewaySMSService(config);
}