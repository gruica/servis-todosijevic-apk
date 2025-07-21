/**
 * Mobi Gateway SMS Service
 * Komunicira sa telefonom koji funkcioniše kao SMS gateway preko IP
 */

import fetch from 'node-fetch';
// AbortController is available globally in Node.js 16+

export interface MobiGatewayConfig {
  phoneIpAddress: string;
  port: number;
  username?: string;
  password?: string;
  timeout: number;
  retryAttempts: number;
}

export interface SMSMessage {
  recipient: string;
  message: string;
  senderId?: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export class MobiGatewayService {
  private config: MobiGatewayConfig;
  private baseUrl: string;

  constructor(config: MobiGatewayConfig) {
    this.config = config;
    this.baseUrl = `http://${config.phoneIpAddress}:${config.port}`;
    console.log(`[MOBI GATEWAY] Inicijalizovan sa IP: ${config.phoneIpAddress}:${config.port}`);
  }

  /**
   * Ažurira konfiguraciju gateway-a
   */
  public updateConfig(newConfig: Partial<MobiGatewayConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.baseUrl = `http://${this.config.phoneIpAddress}:${this.config.port}`;
    console.log(`[MOBI GATEWAY] Konfiguracija ažurirana: ${this.config.phoneIpAddress}:${this.config.port}`);
  }

  /**
   * Testira konekciju sa telefonom
   */
  public async testConnection(): Promise<{ success: boolean; error?: string; info?: any }> {
    try {
      console.log(`[MOBI GATEWAY] Testiram konekciju sa ${this.baseUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      const response = await fetch(`${this.baseUrl}/api/status`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.username && this.config.password ? {
            'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`
          } : {})
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      console.log(`[MOBI GATEWAY] ✅ Konekcija uspešna`);
      
      return {
        success: true,
        info: data
      };
    } catch (error) {
      console.error(`[MOBI GATEWAY] ❌ Test konekcije neuspešan:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nepoznata greška'
      };
    }
  }

  /**
   * Dobija status telefona (baterija, signal, itd.)
   */
  public async getPhoneStatus(): Promise<{ success: boolean; status?: any; error?: string }> {
    try {
      console.log(`[MOBI GATEWAY] Dobijam status telefona...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      const response = await fetch(`${this.baseUrl}/api/phone/status`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.username && this.config.password ? {
            'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`
          } : {})
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const status: any = await response.json();
      console.log(`[MOBI GATEWAY] Status telefona dobijen:`, status);
      
      return {
        success: true,
        status
      };
    } catch (error) {
      console.error(`[MOBI GATEWAY] Greška pri dobijanju statusa:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nepoznata greška'
      };
    }
  }

  /**
   * Šalje SMS poruku kroz telefon gateway
   */
  public async sendSMS(smsData: SMSMessage): Promise<SMSResponse> {
    const startTime = Date.now();
    let lastError: any = null;

    console.log(`[MOBI GATEWAY] Šaljem SMS na ${smsData.recipient}: "${smsData.message.substring(0, 50)}..."`);

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`[MOBI GATEWAY] Pokušaj #${attempt}/${this.config.retryAttempts}`);

        const requestData = {
          recipient: this.formatPhoneNumber(smsData.recipient),
          message: smsData.message,
          senderId: smsData.senderId || 'FrigoServis',
          timestamp: new Date().toISOString()
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        const response = await fetch(`${this.baseUrl}/api/sms/send`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.username && this.config.password ? {
              'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`
            } : {})
          },
          body: JSON.stringify(requestData)
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: any = await response.json();
        const duration = Date.now() - startTime;

        console.log(`[MOBI GATEWAY] ✅ SMS uspešno poslat u ${duration}ms`);
        console.log(`[MOBI GATEWAY] Message ID: ${result.messageId}`);

        return {
          success: true,
          messageId: result.messageId,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        lastError = error;
        const duration = Date.now() - startTime;
        console.error(`[MOBI GATEWAY] ❌ Pokušaj #${attempt} neuspešan nakon ${duration}ms:`, error);

        if (attempt < this.config.retryAttempts) {
          const waitTime = attempt * 2000; // Eksponencijalno čekanje
          console.log(`[MOBI GATEWAY] Čekam ${waitTime}ms pre sledećeg pokušaja...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    console.error(`[MOBI GATEWAY] ❌ Svi pokušaji neuspešni nakon ${totalDuration}ms`);

    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : 'Nepoznata greška',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Formatira broj telefona za slanje
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Ukloni sve što nije cifra
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Dodaj +382 ako počinje sa 6 (Crna Gora)
    if (cleaned.startsWith('6') && cleaned.length === 8) {
      cleaned = '382' + cleaned;
    }
    
    // Dodaj + na početak ako nema
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    console.log(`[MOBI GATEWAY] Formatiran broj: ${phoneNumber} → ${cleaned}`);
    return cleaned;
  }

  /**
   * Dobija listu poslanih SMS-ova
   */
  public async getSentMessages(limit: number = 10): Promise<{ success: boolean; messages?: any[]; error?: string }> {
    try {
      console.log(`[MOBI GATEWAY] Dobijam poslednje ${limit} poslanih poruka...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      const response = await fetch(`${this.baseUrl}/api/sms/sent?limit=${limit}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.username && this.config.password ? {
            'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`
          } : {})
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      console.log(`[MOBI GATEWAY] Dobijeno ${data.messages?.length || 0} poruka`);
      
      return {
        success: true,
        messages: data.messages || []
      };
    } catch (error) {
      console.error(`[MOBI GATEWAY] Greška pri dobijanju poruka:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nepoznata greška'
      };
    }
  }
}

// Globalni servis instance
let mobiGatewayService: MobiGatewayService | null = null;

/**
 * Inicijalizuje Mobi Gateway servis sa konfiguracijom
 */
export function initializeMobiGateway(config: MobiGatewayConfig): MobiGatewayService {
  mobiGatewayService = new MobiGatewayService(config);
  console.log(`[MOBI GATEWAY] Servis inicijalizovan sa IP: ${config.phoneIpAddress}:${config.port}`);
  return mobiGatewayService;
}

/**
 * Dobija trenutni Mobi Gateway servis
 */
export function getMobiGatewayService(): MobiGatewayService | null {
  return mobiGatewayService;
}

/**
 * Default konfiguracija
 */
export const DEFAULT_MOBI_CONFIG: MobiGatewayConfig = {
  phoneIpAddress: '192.168.1.100', // Placeholder - treba postaviti pravu IP adresu
  port: 8080,
  timeout: 30000,
  retryAttempts: 3
};