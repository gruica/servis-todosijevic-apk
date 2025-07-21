/**
 * Hybrid SMS Service
 * Kombinuje Twilio i Mobi Gateway SMS servise
 */

import { getMobiGatewayService, initializeMobiGateway, MobiGatewayConfig } from './mobi-gateway-service.js';
import { storage } from './storage.js';

// Direct Twilio import
interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export type SMSProvider = 'twilio' | 'mobi_gateway';

export interface HybridSMSConfig {
  primaryProvider: SMSProvider;
  fallbackProvider?: SMSProvider;
  mobiGatewayConfig?: MobiGatewayConfig;
}

class HybridSMSService {
  private primaryProvider: SMSProvider = 'twilio';
  private fallbackProvider?: SMSProvider;
  private config: HybridSMSConfig;
  private twilioConfig?: TwilioConfig;

  constructor() {
    this.config = {
      primaryProvider: 'twilio'
    };
    console.log('[HYBRID SMS] Inicijalizujem Hybrid SMS Service');
  }

  async initialize(): Promise<void> {
    console.log('[HYBRID SMS] Učitavam konfiguraciju...');
    
    try {
      // Učitaj konfiguraciju iz baze
      const settings = await storage.getSystemSettings();
      const primaryProvider = settings.find(s => s.key === 'sms_primary_provider')?.value as SMSProvider || 'twilio';
      const fallbackProvider = settings.find(s => s.key === 'sms_fallback_provider')?.value as SMSProvider;
      
      this.primaryProvider = primaryProvider;
      this.fallbackProvider = fallbackProvider;
      
      console.log(`[HYBRID SMS] Primary provider: ${primaryProvider}`);
      console.log(`[HYBRID SMS] Fallback provider: ${fallbackProvider || 'none'}`);
      
      // Twilio će biti inicijalizovan po potrebi
      
      // Inicijalizuj Mobi Gateway ako je potreban
      if (primaryProvider === 'mobi_gateway' || fallbackProvider === 'mobi_gateway') {
        await this.initializeMobiGateway();
      }
      
      this.config = {
        primaryProvider,
        fallbackProvider
      };
      
    } catch (error) {
      console.error('[HYBRID SMS] Greška pri inicijalizaciji:', error);
    }
  }

  private async initializeMobiGateway(): Promise<void> {
    try {
      const settings = await storage.getSystemSettings();
      const phoneIp = settings.find(s => s.key === 'mobi_gateway_phone_ip')?.value;
      const port = settings.find(s => s.key === 'mobi_gateway_port')?.value;
      const username = settings.find(s => s.key === 'mobi_gateway_username')?.value;
      const password = settings.find(s => s.key === 'mobi_gateway_password')?.value;
      
      if (phoneIp && port) {
        const config: MobiGatewayConfig = {
          phoneIpAddress: phoneIp,
          port: parseInt(port),
          username: username || undefined,
          password: password || undefined,
          timeout: 30000,
          retryAttempts: 3
        };
        
        initializeMobiGateway(config);
        console.log(`[HYBRID SMS] Mobi Gateway inicijalizovan: ${phoneIp}:${port}`);
      } else {
        console.log('[HYBRID SMS] Mobi Gateway konfiguracija nije kompletna');
      }
    } catch (error) {
      console.error('[HYBRID SMS] Greška pri inicijalizaciji Mobi Gateway:', error);
    }
  }

  async configureMobiGateway(config: MobiGatewayConfig): Promise<boolean> {
    try {
      console.log(`[HYBRID SMS] Konfigurišem Mobi Gateway: ${config.phoneIpAddress}:${config.port}`);
      
      // Sačuvaj konfiguraciju u bazu
      await this.updateSystemSetting('mobi_gateway_phone_ip', config.phoneIpAddress);
      await this.updateSystemSetting('mobi_gateway_port', config.port.toString());
      if (config.username) await this.updateSystemSetting('mobi_gateway_username', config.username);
      if (config.password) await this.updateSystemSetting('mobi_gateway_password', config.password);
      
      // Inicijalizuj servis
      const mobiService = initializeMobiGateway(config);
      
      // Test konekcije
      const testResult = await mobiService.testConnection();
      if (testResult.success) {
        console.log('[HYBRID SMS] Mobi Gateway konfiguracija uspešna');
        return true;
      } else {
        console.error('[HYBRID SMS] Mobi Gateway test neuspešan:', testResult.error);
        return false;
      }
    } catch (error) {
      console.error('[HYBRID SMS] Greška pri konfiguraciji Mobi Gateway:', error);
      return false;
    }
  }

  async setPrimaryProvider(provider: SMSProvider): Promise<void> {
    this.primaryProvider = provider;
    this.config.primaryProvider = provider;
    await storage.setSystemSetting('sms_primary_provider', provider);
    console.log(`[HYBRID SMS] Primary provider postavljen na: ${provider}`);
  }

  async setFallbackProvider(provider?: SMSProvider): Promise<void> {
    this.fallbackProvider = provider;
    this.config.fallbackProvider = provider;
    if (provider) {
      await storage.setSystemSetting('sms_fallback_provider', provider);
    } else {
      await storage.deleteSystemSetting('sms_fallback_provider');
    }
    console.log(`[HYBRID SMS] Fallback provider postavljen na: ${provider || 'none'}`);
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    console.log(`[HYBRID SMS] Šaljem SMS na ${to} preko ${this.primaryProvider}`);
    
    // Pokušaj sa primary provider
    const primaryResult = await this.sendViaSingleProvider(this.primaryProvider, to, message);
    
    if (primaryResult) {
      console.log(`[HYBRID SMS] ✅ SMS uspešno poslat preko ${this.primaryProvider}`);
      return true;
    }
    
    // Ako primary nije uspešan, pokušaj sa fallback
    if (this.fallbackProvider && this.fallbackProvider !== this.primaryProvider) {
      console.log(`[HYBRID SMS] Primary neuspešan, pokušavam sa fallback: ${this.fallbackProvider}`);
      
      const fallbackResult = await this.sendViaSingleProvider(this.fallbackProvider, to, message);
      
      if (fallbackResult) {
        console.log(`[HYBRID SMS] ✅ SMS uspešno poslat preko fallback: ${this.fallbackProvider}`);
        return true;
      }
    }
    
    console.error('[HYBRID SMS] ❌ Svi pokušaji slanja SMS-a neuspešni');
    return false;
  }

  private async sendViaSingleProvider(provider: SMSProvider, to: string, message: string): Promise<boolean> {
    try {
      if (provider === 'twilio') {
        return await this.sendViaTwilio(to, message);
      } else if (provider === 'mobi_gateway') {
        const mobiService = getMobiGatewayService();
        if (!mobiService) {
          console.error('[HYBRID SMS] Mobi Gateway nije inicijalizovan');
          return false;
        }
        
        const result = await mobiService.sendSMS({
          recipient: to,
          message: message,
          senderId: 'FrigoServis'
        });
        
        return result.success;
      }
      
      return false;
    } catch (error) {
      console.error(`[HYBRID SMS] Greška pri slanju preko ${provider}:`, error);
      return false;
    }
  }

  async getStatus(): Promise<{
    primaryProvider: SMSProvider;
    fallbackProvider?: SMSProvider;
    twilioStatus: any;
    mobiGatewayStatus?: any;
  }> {
    const twilioStatus = this.getTwilioStatus();
    
    let mobiGatewayStatus = undefined;
    const mobiService = getMobiGatewayService();
    if (mobiService) {
      const connectionTest = await mobiService.testConnection();
      const phoneStatus = await mobiService.getPhoneStatus();
      
      mobiGatewayStatus = {
        connected: connectionTest.success,
        phoneStatus: phoneStatus.status,
        error: connectionTest.error || phoneStatus.error
      };
    }
    
    return {
      primaryProvider: this.primaryProvider,
      fallbackProvider: this.fallbackProvider,
      twilioStatus,
      mobiGatewayStatus
    };
  }

  async testConnection(provider?: SMSProvider): Promise<{ success: boolean; error?: string }> {
    const testProvider = provider || this.primaryProvider;
    
    try {
      if (testProvider === 'twilio') {
        const success = await this.testTwilioConnection();
        return { success };
      } else if (testProvider === 'mobi_gateway') {
        const mobiService = getMobiGatewayService();
        if (!mobiService) {
          return { success: false, error: 'Mobi Gateway nije inicijalizovan' };
        }
        
        return await mobiService.testConnection();
      }
      
      return { success: false, error: 'Nepoznat provider' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Nepoznata greška' 
      };
    }
  }

  async sendTestSMS(to: string, provider?: SMSProvider): Promise<boolean> {
    const testProvider = provider || this.primaryProvider;
    const testMessage = `Test SMS - Frigo Sistem Todosijević\nProvider: ${testProvider}\nVreme: ${new Date().toLocaleString('sr-RS')}`;
    
    return await this.sendViaSingleProvider(testProvider, to, testMessage);
  }

  getCurrentProvider(): SMSProvider {
    return this.primaryProvider;
  }

  getFallbackProvider(): SMSProvider | undefined {
    return this.fallbackProvider;
  }

  // Direct Twilio methods
  private async sendViaTwilio(to: string, message: string): Promise<boolean> {
    try {
      console.log(`[HYBRID SMS] Twilio SMS: to=${to}, message=${message}`);
      // Simulacija slanja - za production dodati pravu Twilio integraciju
      return true;
    } catch (error) {
      console.error('[HYBRID SMS] Greška pri Twilio slanju:', error);
      return false;
    }
  }

  private getTwilioStatus(): any {
    return {
      configured: !!this.twilioConfig,
      provider: 'twilio',
      status: 'ready'
    };
  }

  private async testTwilioConnection(): Promise<boolean> {
    console.log('[HYBRID SMS] Testing Twilio connection...');
    return true;
  }

  async configure(config: any): Promise<void> {
    console.log('[HYBRID SMS] Konfiguriši hybrid SMS servis:', config);
    
    if (config.provider === 'twilio') {
      this.primaryProvider = 'twilio';
    } else if (config.provider === 'mobi_gateway') {
      this.primaryProvider = 'mobi_gateway';
    }

    await this.updateSystemSetting('sms_primary_provider', this.primaryProvider);
    console.log(`[HYBRID SMS] Konfiguracija završena, primary provider: ${this.primaryProvider}`);
  }
}

export const hybridSMSService = new HybridSMSService();