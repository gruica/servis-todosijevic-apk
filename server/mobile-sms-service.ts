/**
 * SMS Mobile API Service
 * Integrates with SMS Mobile API Android app for sending SMS messages
 * The app transforms mobile phone into SMS Gateway accessible via HTTP API
 */

interface SMSMobileConfig {
  baseUrl: string; // e.g., "http://192.168.1.100:8080" or phone's IP
  apiKey?: string; // Optional API key if configured in app
}

interface SMSMessage {
  to: string;
  body: string;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class MobileSMSService {
  private config: SMSMobileConfig;
  private isConfigured: boolean = false;

  constructor() {
    this.config = {
      baseUrl: process.env.SMS_MOBILE_BASE_URL || '',
      apiKey: process.env.SMS_MOBILE_API_KEY || undefined
    };
    this.isConfigured = !!this.config.baseUrl;
  }

  /**
   * Configure SMS Mobile API service
   */
  async configure(config: SMSMobileConfig): Promise<boolean> {
    try {
      this.config = config;
      
      // Test connection to mobile app
      const testResult = await this.testConnection();
      if (testResult) {
        this.isConfigured = true;
        console.log(`[SMS MOBILE] Uspešno konfigurisan SMS Mobile API: ${config.baseUrl}`);
        return true;
      } else {
        this.isConfigured = false;
        console.error(`[SMS MOBILE] Neuspešna konfiguracija SMS Mobile API: ${config.baseUrl}`);
        return false;
      }
    } catch (error) {
      console.error('[SMS MOBILE] Greška pri konfiguraciji:', error);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Test connection to SMS Mobile API app
   */
  async testConnection(): Promise<boolean> {
    if (!this.config.baseUrl) {
      console.error('[SMS MOBILE] Base URL nije konfigurisan');
      return false;
    }

    try {
      console.log(`[SMS MOBILE] Testiram konekciju sa ${this.config.baseUrl}`);
      
      const response = await fetch(`${this.config.baseUrl}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Frigo-Sistem-SMS-Client/1.0'
        },
        timeout: 10000
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[SMS MOBILE] Konekcija uspešna:', data);
        return true;
      } else {
        console.error(`[SMS MOBILE] HTTP greška: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error('[SMS MOBILE] Greška konekcije:', error instanceof Error ? error.message : 'Nepoznata greška');
      return false;
    }
  }

  /**
   * Send SMS message via Mobile SMS API
   */
  async sendSms(message: SMSMessage): Promise<SMSResponse> {
    if (!this.isConfigured) {
      console.error('[SMS MOBILE] Servis nije konfigurisan');
      return { success: false, error: 'SMS Mobile API nije konfigurisan' };
    }

    try {
      console.log(`[SMS MOBILE] Šaljem SMS na ${message.to}: ${message.body.substring(0, 50)}...`);

      const payload = {
        phone: message.to,
        message: message.body,
        ...(this.config.apiKey && { key: this.config.apiKey })
      };

      const response = await fetch(`${this.config.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[SMS MOBILE] SMS uspešno poslat:', result);
        return {
          success: true,
          messageId: result.messageId || result.id || 'unknown'
        };
      } else {
        const errorText = await response.text();
        console.error(`[SMS MOBILE] HTTP greška ${response.status}: ${errorText}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nepoznata greška';
      console.error('[SMS MOBILE] Greška pri slanju SMS-a:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Send test SMS message
   */
  async sendTestSMS(phoneNumber: string): Promise<boolean> {
    const testMessage = `Test poruka iz Frigo Sistem Todosijević aplikacije. Vreme: ${new Date().toLocaleString('sr-RS')}`;
    
    const result = await this.sendSms({
      to: phoneNumber,
      body: testMessage
    });

    return result.success;
  }

  /**
   * Send service status update SMS to client
   */
  async sendServiceStatusUpdate(client: any, serviceId: number, status: string, additionalInfo?: string): Promise<boolean> {
    if (!client.phone) {
      console.warn('[SMS MOBILE] Klijent nema broj telefona');
      return false;
    }

    const message = [
      `Frigo Sistem Todosijević`,
      `Servis #${serviceId} - Status: ${status}`,
      client.fullName ? `Poštovani ${client.fullName},` : 'Poštovani,',
      additionalInfo || 'Vaš servis je ažuriran.',
      `Kontakt: 069/123-456`
    ].join('\n');

    const result = await this.sendSms({
      to: client.phone,
      body: message
    });

    return result.success;
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<any> {
    return {
      configured: this.isConfigured,
      provider: 'SMS Mobile API',
      baseUrl: this.config.baseUrl,
      hasApiKey: !!this.config.apiKey
    };
  }

  /**
   * Check if service is configured and ready
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const mobileSmsService = new MobileSMSService();