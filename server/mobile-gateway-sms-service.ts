import fetch from 'node-fetch';

/**
 * SMS PROVAJDER: SMSGateway Android aplikacija
 * 
 * SMS poruke se šalju preko SMSGateway aplikacije instaliraje na Gruica telefonu.
 * Aplikacija prima HTTP POST zahteve i šalje SMS poruke sa SIM kartice u telefonu.
 * 
 * Gateway: 77.222.25.100:8080 (Gruica telefon sa SMSGateway aplikacijom)
 * SMS se šalju sa broja SIM kartice koja je u telefonu
 */

export interface MobileGatewaySMSConfig {
  gatewayIP: string;
  gatewayPort: number;
  username: string;
  password: string;
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
      
      const url = `http://${this.config.gatewayIP}:${this.config.gatewayPort}`;
      
      // Formatiranje prema parametrima aplikacije sa slike
      const requestBody = {
        tel: message.phoneNumber,        // Phone number parameter key
        message: message.message,        // Text parameter key  
        user: this.config.username,      // User parameter key
        password: this.config.password   // Password parameter key
      };

      console.log(`[MOBILE SMS] 📤 Slanje zahteva na: ${url}`);
      console.log(`[MOBILE SMS] 📋 Sadržaj: ${message.message.substring(0, 100)}...`);

      // iPhone SMS Gateway aplikacija očekuje application/x-www-form-urlencoded
      // Koristi parameter keys iz iPhone aplikacije (prema slici)
      const formData = new URLSearchParams();
      formData.append('067028666', message.phoneNumber);     // Phone number parameter key
      formData.append('message', message.message);           // Text parameter key  
      formData.append('gruica', this.config.username);       // User parameter key
      formData.append('AdamEva230723@', this.config.password); // Password parameter key

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Frigo-Sistem-SMS-Gateway/1.0'
        },
        body: formData.toString(),
        timeout: this.config.timeout
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
    return this.checkGatewayStatus();
  }

  async checkGatewayStatus(): Promise<{ connected: boolean; error?: string; gatewayInfo?: any }> {
    try {
      console.log(`[MOBILE SMS] 🔍 Proverava status gateway-a na ${this.config.gatewayIP}:${this.config.gatewayPort}`);
      console.log(`[MOBILE SMS] 📡 Testiranje mrežne dostupnosti iPhone SMS Gateway aplikacije...`);
      
      // Prvo pokušaj sa /status endpoint-om
      const statusUrl = `http://${this.config.gatewayIP}:${this.config.gatewayPort}/status`;
      
      try {
        const response = await fetch(statusUrl, {
          method: 'GET',
          timeout: 3000, // Kratki timeout za status check
          headers: {
            'User-Agent': 'Frigo-Sistem-SMS-Gateway/1.0'
          }
        });

        if (response.ok) {
          const data = await response.text();
          console.log(`[MOBILE SMS] ✅ Gateway dostupan preko /status`);
          return {
            connected: true,
            gatewayInfo: {
              status: 'online',
              response: data,
              endpoint: '/status'
            }
          };
        }
      } catch (statusError) {
        console.log(`[MOBILE SMS] ℹ️ /status endpoint nije dostupan na ${statusUrl}`);
        console.log(`[MOBILE SMS] 🔄 Pokušavam osnovni endpoint na http://${this.config.gatewayIP}:${this.config.gatewayPort}/`);
      }

      // Ako /status ne radi, pokušaj osnovni endpoint
      const baseUrl = `http://${this.config.gatewayIP}:${this.config.gatewayPort}`;
      
      const response = await fetch(baseUrl, {
        method: 'GET',
        timeout: 3000,
        headers: {
          'User-Agent': 'Frigo-Sistem-SMS-Gateway/1.0'
        }
      });

      if (response.ok) {
        const data = await response.text();
        console.log(`[MOBILE SMS] ✅ Gateway dostupan preko osnovnog endpoint-a`);
        return {
          connected: true,
          gatewayInfo: {
            status: 'online',
            response: data,
            endpoint: 'base'
          }
        };
      } else {
        console.log(`[MOBILE SMS] ❌ Gateway odgovorio sa statusom ${response.status}`);
        return {
          connected: false,
          error: `Gateway odgovorio sa HTTP ${response.status}. Proverite da li je iPhone SMS Gateway aplikacija pokrenuta i aktivna.`
        };
      }
    } catch (error: any) {
      console.log(`[MOBILE SMS] 💥 Greška pri testiranju konekcije: ${error.message}`);
      console.log(`[MOBILE SMS] 🟡 Gateway nije dostupan: ${error.message}`);
      
      let errorMessage = error.message;
      
      if (error.message.includes('ETIMEDOUT') || error.message.includes('Connection timed out')) {
        errorMessage = `Connection timeout - iPhone SMS Gateway aplikacija nije pokrenuta ili nije dostupna na ${this.config.gatewayIP}:${this.config.gatewayPort}`;
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = `Connection refused - Port ${this.config.gatewayPort} nije otvoren na ${this.config.gatewayIP}. Proverite SMS Gateway aplikaciju.`;
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = `Host not found - IP adresa ${this.config.gatewayIP} nije dostupna u mreži.`;
      }
      
      return {
        connected: false,
        error: errorMessage
      };
    }
  }

  // Helper metoda za formatiranje crnogorskih brojeva telefona  
  static formatMontenegrinPhoneNumber(phone: string): string {
    // Ukloni sve što nije broj
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Ako počinje sa 382, ostavi kako jeste
    if (cleanPhone.startsWith('382')) {
      return `+${cleanPhone}`;
    }
    
    // Ako počinje sa 0, zameni sa 382
    if (cleanPhone.startsWith('0')) {
      return `+382${cleanPhone.substring(1)}`;
    }
    
    // Ako je 8 cifara (crnogorski brojevi), dodaj 382
    if (cleanPhone.length === 8 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('7'))) {
      return `+382${cleanPhone}`;
    }
    
    // Inače vrati kako jeste sa +
    return cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
  }

  // Alias za kompatibilnost - koristi crnogorsko formatiranje
  static formatSerbianPhoneNumber(phone: string): string {
    return MobileGatewaySMSService.formatMontenegrinPhoneNumber(phone);
  }
}

// Factory funkcija za kreiranje servi
export function createMobileGatewaySMSService(config: MobileGatewaySMSConfig): MobileGatewaySMSService {
  return new MobileGatewaySMSService(config);
}