// SmsMobile API Service - Novi SMS servis za SmsMobile aplikaciju
// Zamenjuje stari iPhone SMS Gateway servis
import fetch from 'node-fetch';

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

export class SmsMobileAPIService {
  private config: {
    apiKey: string;
    baseURL: string;
    timeout: number;
    gatewayName: string;
  };

  constructor(config: {
    apiKey: string;
    baseURL?: string;
    timeout?: number;
    gatewayName?: string;
  }) {
    this.config = {
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://api.smsmobile.rs/api/v1',
      timeout: config.timeout || 10000,
      gatewayName: config.gatewayName || 'default'
    };
    
    console.log(`[SMS MOBILE API] 🚀 SMS servis inicijalizovan`);
    console.log(`[SMS MOBILE API] 🔑 API Key: ${this.config.apiKey.substring(0, 8)}...`);
    console.log(`[SMS MOBILE API] 🌐 Base URL: ${this.config.baseURL}`);
    console.log(`[SMS MOBILE API] ⏱️ Timeout: ${this.config.timeout}ms`);
  }

  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`[SMS MOBILE API] 📤 Slanje SMS-a na: ${message.phoneNumber}`);
      console.log(`[SMS MOBILE API] 📋 Sadržaj: ${message.message.substring(0, 100)}...`);

      // SmsMobile API endpoint za slanje SMS-a
      const url = `${this.config.baseURL}/send`;

      // Priprema podataka za SmsMobile API
      const requestBody = {
        api_key: this.config.apiKey,
        to: message.phoneNumber,
        text: message.message,
        gateway: this.config.gatewayName
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Frigo-Sistem-SMS-Mobile/1.0'
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json() as any;
      const duration = Date.now() - startTime;

      if (response.ok && responseData.success) {
        console.log(`[SMS MOBILE API] ✅ SMS uspešno poslat u ${duration}ms`);
        console.log(`[SMS MOBILE API] 📱 Message ID: ${responseData.message_id || 'N/A'}`);
        
        return {
          success: true,
          messageId: responseData.message_id,
          timestamp: new Date().toISOString()
        };
      } else {
        const error = responseData.error || responseData.message || `HTTP ${response.status}: ${response.statusText}`;
        console.log(`[SMS MOBILE API] ❌ Greška pri slanju SMS-a: ${error}`);
        
        return {
          success: false,
          error: error,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`[SMS MOBILE API] 💥 Mrežna greška nakon ${duration}ms: ${error.message}`);
      
      return {
        success: false,
        error: `Greška mreže: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResponse[]> {
    console.log(`[SMS MOBILE API] 📬 Grupno slanje ${messages.length} SMS poruka`);
    
    const results: SMSResponse[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      console.log(`[SMS MOBILE API] 📱 Slanje ${i + 1}/${messages.length}: ${message.phoneNumber}`);
      
      const result = await this.sendSMS(message);
      results.push(result);
      
      // Kratka pauza između poruka da ne opteretimo API
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`[SMS MOBILE API] 📊 Grupno slanje završeno: ${successCount}/${messages.length} uspešno`);
    
    return results;
  }

  async testConnection(): Promise<{ connected: boolean; error?: string; apiInfo?: any }> {
    return this.checkAPIStatus();
  }

  async checkAPIStatus(): Promise<{ connected: boolean; error?: string; apiInfo?: any }> {
    try {
      console.log(`[SMS MOBILE API] 🔍 Proverava status API-ja...`);
      console.log(`[SMS MOBILE API] 📡 Testiranje dostupnosti SmsMobile API servisa...`);

      // Test API status endpoint
      const url = `${this.config.baseURL}/status`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'Frigo-Sistem-SMS-Mobile/1.0'
        }
      });

      const data = await response.json() as any;

      if (response.ok) {
        console.log(`[SMS MOBILE API] ✅ API je dostupan`);
        console.log(`[SMS MOBILE API] 📊 Status: ${data.status || 'OK'}`);
        
        return {
          connected: true,
          apiInfo: {
            status: data.status,
            version: data.version,
            credits: data.credits,
            gateways: data.gateways
          }
        };
      } else {
        console.log(`[SMS MOBILE API] ❌ API nije dostupan: ${response.status}`);
        return {
          connected: false,
          error: `API Status ${response.status}: ${data.error || data.message || 'Nepoznata greška'}`
        };
      }
    } catch (error: any) {
      console.log(`[SMS MOBILE API] 💥 Greška pri testiranju API-ja: ${error.message}`);
      return {
        connected: false,
        error: `Greška konekcije: ${error.message}`
      };
    }
  }

  async getCredits(): Promise<{ success: boolean; credits?: number; error?: string }> {
    try {
      console.log(`[SMS MOBILE API] 💰 Dohvatanje broja kredita...`);

      const url = `${this.config.baseURL}/credits`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json() as any;

      if (response.ok) {
        console.log(`[SMS MOBILE API] ✅ Krediti: ${data.credits}`);
        return {
          success: true,
          credits: data.credits
        };
      } else {
        return {
          success: false,
          error: data.error || data.message || 'Greška pri dohvatanju kredita'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Greška: ${error.message}`
      };
    }
  }

  async getGateways(): Promise<{ success: boolean; gateways?: any[]; error?: string }> {
    try {
      console.log(`[SMS MOBILE API] 📱 Dohvatanje liste gateway-a...`);

      const url = `${this.config.baseURL}/gateways`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json() as any;

      if (response.ok) {
        console.log(`[SMS MOBILE API] ✅ Pronađeno ${data.gateways?.length || 0} gateway-a`);
        return {
          success: true,
          gateways: data.gateways
        };
      } else {
        return {
          success: false,
          error: data.error || data.message || 'Greška pri dohvatanju gateway-a'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Greška: ${error.message}`
      };
    }
  }
}