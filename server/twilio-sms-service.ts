/**
 * Twilio SMS Service
 * Reliable cloud-based SMS service for Montenegro market
 */

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
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

export class TwilioSMSService {
  private config: TwilioConfig | null = null;
  private isConfigured: boolean = false;

  constructor() {
    // Initialize from environment variables if available
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      this.config = {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
      };
      this.isConfigured = true;
    }
  }

  /**
   * Configure Twilio SMS service
   */
  async configure(config: TwilioConfig): Promise<boolean> {
    try {
      this.config = config;
      
      // Test Twilio credentials with a validation request
      const testResult = await this.testCredentials();
      if (testResult) {
        this.isConfigured = true;
        console.log(`[TWILIO SMS] Uspešno konfigurisan: ${config.phoneNumber}`);
        return true;
      } else {
        this.isConfigured = false;
        console.error(`[TWILIO SMS] Nevažeći podaci za pristup`);
        return false;
      }
    } catch (error) {
      console.error('[TWILIO SMS] Greška pri konfiguraciji:', error);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Test Twilio credentials
   */
  private async testCredentials(): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      // Create basic auth header
      const auth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64');
      
      // Test by fetching account info
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}.json`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.ok) {
        console.log('[TWILIO SMS] Podaci za pristup su validni');
        return true;
      } else {
        const errorData = await response.text();
        console.error('[TWILIO SMS] Nevaljan odgovor:', response.status, errorData);
        return false;
      }
    } catch (error) {
      console.error('[TWILIO SMS] Greška pri testiranju podataka:', error);
      return false;
    }
  }

  /**
   * Send SMS message via Twilio
   */
  async sendSms(message: SMSMessage): Promise<SMSResponse> {
    if (!this.isConfigured || !this.config) {
      console.error('[TWILIO SMS] Servis nije konfigurisan');
      return {
        success: false,
        error: 'Twilio SMS servis nije konfigurisan'
      };
    }

    try {
      console.log(`[TWILIO SMS] Šaljem SMS na ${message.to}: ${message.body.substring(0, 50)}...`);
      
      // Create form data for Twilio API
      const formData = new URLSearchParams();
      formData.append('To', message.to);
      formData.append('From', this.config.phoneNumber);
      formData.append('Body', message.body);
      
      const auth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64');
      
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[TWILIO SMS] SMS uspešno poslat, SID: ${result.sid}`);
        return {
          success: true,
          messageId: result.sid
        };
      } else {
        const errorData = await response.json();
        console.error(`[TWILIO SMS] HTTP greška ${response.status}:`, errorData);
        return {
          success: false,
          error: `Twilio greška: ${errorData.message || response.statusText}`
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nepoznata greška';
      console.error('[TWILIO SMS] Greška pri slanju SMS-a:', errorMessage);
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
      console.warn('[TWILIO SMS] Klijent nema broj telefona');
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
      provider: 'Twilio SMS',
      phoneNumber: this.config?.phoneNumber,
      accountSid: this.config?.accountSid ? `${this.config.accountSid.substring(0, 8)}...` : undefined
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
export const twilioSmsService = new TwilioSMSService();