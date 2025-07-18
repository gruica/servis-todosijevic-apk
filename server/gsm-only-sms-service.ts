import { gsmModemService, GSMModemService } from './gsm-modem-service';

// Interface za SMS poruku
interface SMSMessage {
  to: string;
  message: string;
  type?: 'status_update' | 'reminder' | 'custom' | 'appointment';
}

// Interface za odgovor slanja SMS-a
interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
  provider?: string;
}

// Interface za konfiguraciju
interface GSMOnlySMSConfig {
  port: string;
  baudRate: number;
  phoneNumber: string;
}

export class GSMOnlySMSService {
  private config: GSMOnlySMSConfig | null = null;
  private isGsmModemReady: boolean = false;

  constructor() {
    console.log("[GSM ONLY SMS] Inicijalizacija GSM SMS servisa");
  }

  // Konfiguriši GSM modem
  async configure(config: GSMOnlySMSConfig): Promise<boolean> {
    try {
      this.config = config;
      console.log(`[GSM ONLY SMS] Konfiguracija: port=${config.port}, baudRate=${config.baudRate}, phoneNumber=${config.phoneNumber}`);
      
      // Konfiguriši GSM modem
      const gsmConfigured = await gsmModemService.configure(config);
      if (gsmConfigured) {
        this.isGsmModemReady = await gsmModemService.connect();
        if (this.isGsmModemReady) {
          console.log("[GSM ONLY SMS] ✅ GSM modem uspešno konfigurisan i povezan");
        } else {
          console.log("[GSM ONLY SMS] ❌ GSM modem konfigurisan ali nije uspešno povezan");
        }
      }
      
      return this.isGsmModemReady;
    } catch (error) {
      console.error("[GSM ONLY SMS] Greška pri konfiguraciji:", error);
      return false;
    }
  }

  // Glavni metod za slanje SMS-a
  async sendSms(smsData: SMSMessage): Promise<SMSResponse> {
    if (!this.config) {
      return {
        success: false,
        error: "GSM modem nije konfigurisan",
        provider: "none"
      };
    }

    // Proverava da li je broj telefona valjan
    if (!this.isValidPhoneNumber(smsData.to)) {
      return {
        success: false,
        error: "Nevaljan broj telefona",
        provider: "none"
      };
    }

    // Pokušaj slanja preko GSM modema
    try {
      console.log(`[GSM ONLY SMS] Slanje SMS na ${smsData.to}: ${smsData.message}`);
      
      if (!this.isGsmModemReady) {
        // Pokušaj ponovo povezati GSM modem
        console.log("[GSM ONLY SMS] Pokušavam ponovo povezati GSM modem...");
        this.isGsmModemReady = await gsmModemService.connect();
        
        if (!this.isGsmModemReady) {
          return {
            success: false,
            error: "GSM modem nije dostupan",
            provider: "gsm_modem"
          };
        }
      }

      const result = await gsmModemService.sendSms(smsData.to, smsData.message);
      
      if (result.success) {
        console.log(`[GSM ONLY SMS] ✅ SMS uspešno poslat preko GSM modema`);
        return {
          success: true,
          messageId: result.messageId,
          provider: "gsm_modem",
          cost: 0 // Lokalni GSM modem nema dodatne troškove
        };
      } else {
        console.log(`[GSM ONLY SMS] ❌ Greška pri slanju SMS preko GSM modema: ${result.error}`);
        return {
          success: false,
          error: result.error,
          provider: "gsm_modem"
        };
      }
      
    } catch (error) {
      console.error("[GSM ONLY SMS] Greška pri slanju SMS:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Neočekivana greška",
        provider: "gsm_modem"
      };
    }
  }

  // Test slanje SMS-a
  async testSms(recipient: string, message: string = "Test SMS sa GSM modema"): Promise<SMSResponse> {
    console.log(`[GSM ONLY SMS] Test SMS na ${recipient}`);
    
    return await this.sendSms({
      to: recipient,
      message: message,
      type: 'custom'
    });
  }

  // Proverava da li je broj telefona valjan
  private isValidPhoneNumber(phone: string): boolean {
    // Uklanja sve što nije cifra ili +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // Proverava da li je broj valjan (minimalno 6 cifara, maksimalno 15)
    const phoneRegex = /^\+?[\d]{6,15}$/;
    return phoneRegex.test(cleanPhone);
  }

  // Dohvata status GSM modema
  async getStatus(): Promise<{
    configured: boolean;
    connected: boolean;
    phoneNumber: string;
    provider: string;
    availableProviders: string[];
    connectionTest: { gsm_modem: boolean };
  }> {
    return {
      configured: this.config !== null,
      connected: this.isGsmModemReady,
      phoneNumber: this.config?.phoneNumber || "",
      provider: "gsm_modem",
      availableProviders: ["gsm_modem"],
      connectionTest: { gsm_modem: this.isGsmModemReady }
    };
  }

  // Restartovanje GSM modema
  async restart(): Promise<boolean> {
    try {
      console.log("[GSM ONLY SMS] Restartovanje GSM modema...");
      
      // Prvo prekini konekciju
      await gsmModemService.disconnect();
      
      // Čekaj malo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Ponovo se poveži
      if (this.config) {
        this.isGsmModemReady = await gsmModemService.connect();
        console.log(`[GSM ONLY SMS] Restart ${this.isGsmModemReady ? 'uspešan' : 'neuspešan'}`);
        return this.isGsmModemReady;
      }
      
      return false;
    } catch (error) {
      console.error("[GSM ONLY SMS] Greška pri restartovanju:", error);
      return false;
    }
  }

  // Dohvata dostupne COM portove
  async getAvailablePorts(): Promise<string[]> {
    return await GSMModemService.getAvailablePorts();
  }
}

// Kreiranje instance servisa
export const gsmOnlySMSService = new GSMOnlySMSService();