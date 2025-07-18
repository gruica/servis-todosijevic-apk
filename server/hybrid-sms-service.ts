import { gsmModemService } from './gsm-modem-service';
import { smsService } from './sms-service';

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
interface HybridSMSConfig {
  preferredProvider: 'gsm_modem' | 'twilio' | 'auto';
  fallbackEnabled: boolean;
  gsmModemConfig?: {
    port: string;
    baudRate: number;
    phoneNumber: string;
  };
}

export class HybridSMSService {
  private config: HybridSMSConfig | null = null;
  private isGsmModemReady: boolean = false;
  private isTwilioReady: boolean = false;

  constructor() {
    console.log("[HYBRID SMS] Inicijalizacija hibridnog SMS servisa");
    this.checkTwilioStatus();
  }

  // Proveri status Twilio servisa
  private checkTwilioStatus(): void {
    this.isTwilioReady = !!(
      process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_PHONE_NUMBER
    );
    
    if (this.isTwilioReady) {
      console.log("[HYBRID SMS] Twilio je dostupan");
    } else {
      console.log("[HYBRID SMS] Twilio nije konfigurisan");
    }
  }

  // Konfiguriši hibridni SMS servis
  async configure(config: HybridSMSConfig): Promise<boolean> {
    try {
      this.config = config;
      console.log(`[HYBRID SMS] Konfiguracija: preferredProvider=${config.preferredProvider}, fallback=${config.fallbackEnabled}`);
      
      // Ako je GSM modem preferovan, pokušaj da ga konfigurišeš
      if (config.preferredProvider === 'gsm_modem' && config.gsmModemConfig) {
        const gsmConfigured = await gsmModemService.configure(config.gsmModemConfig);
        if (gsmConfigured) {
          this.isGsmModemReady = await gsmModemService.connect();
          if (this.isGsmModemReady) {
            console.log("[HYBRID SMS] ✅ GSM modem uspešno konfigurisan i povezan");
          } else {
            console.log("[HYBRID SMS] ❌ GSM modem konfigurisan ali nije uspešno povezan");
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error("[HYBRID SMS] Greška pri konfiguraciji:", error);
      return false;
    }
  }

  // Glavni metod za slanje SMS-a
  async sendSms(smsData: SMSMessage): Promise<SMSResponse> {
    if (!this.config) {
      return {
        success: false,
        error: "Hibridni SMS servis nije konfigurisan"
      };
    }

    const { preferredProvider, fallbackEnabled } = this.config;
    
    // Određuj koji provider da koristiš
    let primaryProvider: 'gsm_modem' | 'twilio';
    let fallbackProvider: 'gsm_modem' | 'twilio' | null = null;

    if (preferredProvider === 'auto') {
      // Automatski izbor - GSM modem ima prioritet ako je dostupan
      primaryProvider = this.isGsmModemReady ? 'gsm_modem' : 'twilio';
      fallbackProvider = fallbackEnabled ? (primaryProvider === 'gsm_modem' ? 'twilio' : 'gsm_modem') : null;
    } else {
      primaryProvider = preferredProvider;
      fallbackProvider = fallbackEnabled ? (primaryProvider === 'gsm_modem' ? 'twilio' : 'gsm_modem') : null;
    }

    console.log(`[HYBRID SMS] Pokušaj slanja SMS-a sa ${primaryProvider}, fallback: ${fallbackProvider || 'none'}`);

    // Pokušaj sa primarnim provajderom
    const primaryResult = await this.sendWithProvider(primaryProvider, smsData);
    
    if (primaryResult.success) {
      console.log(`[HYBRID SMS] ✅ SMS uspešno poslat sa ${primaryProvider}`);
      return { ...primaryResult, provider: primaryProvider };
    }

    // Ako primarni ne radi, pokušaj sa fallback provajderom
    if (fallbackProvider) {
      console.log(`[HYBRID SMS] Pokušaj fallback sa ${fallbackProvider}`);
      const fallbackResult = await this.sendWithProvider(fallbackProvider, smsData);
      
      if (fallbackResult.success) {
        console.log(`[HYBRID SMS] ✅ SMS uspešno poslat sa fallback ${fallbackProvider}`);
        return { ...fallbackResult, provider: fallbackProvider };
      }
    }

    // Ako oba nisu uspešna
    console.error(`[HYBRID SMS] ❌ Slanje SMS-a neuspešno sa svim provajderima`);
    return {
      success: false,
      error: `Slanje neuspešno: ${primaryResult.error}${fallbackProvider ? ` | Fallback: ${fallbackProvider} greška` : ''}`
    };
  }

  // Pošalji SMS sa specifičnim provajderom
  private async sendWithProvider(provider: 'gsm_modem' | 'twilio', smsData: SMSMessage): Promise<SMSResponse> {
    try {
      if (provider === 'gsm_modem') {
        if (!this.isGsmModemReady) {
          return {
            success: false,
            error: "GSM modem nije spreman"
          };
        }
        return await gsmModemService.sendSms(smsData);
      } else {
        // Twilio
        if (!this.isTwilioReady) {
          return {
            success: false,
            error: "Twilio nije konfigurisan"
          };
        }
        
        // Konvertuj u format koji Twilio očekuje
        const client = { fullName: 'Hybrid SMS', phone: smsData.to };
        const service = { id: 0, description: 'Hybrid SMS', status: 'custom' };
        
        const twilioResult = await smsService.sendServiceStatusUpdate(
          client,
          service,
          'custom',
          null
        );
        
        return {
          success: twilioResult,
          messageId: twilioResult ? `twilio_${Date.now()}` : undefined,
          error: twilioResult ? undefined : "Twilio slanje neuspešno"
        };
      }
    } catch (error) {
      console.error(`[HYBRID SMS] Greška sa ${provider}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Nepoznata greška"
      };
    }
  }

  // Dobij informacije o konfiguraciji
  getConfigInfo(): { provider: string; phone?: string; connected: boolean; availableProviders: string[] } | null {
    if (!this.config) {
      return null;
    }

    const availableProviders = [];
    if (this.isGsmModemReady) availableProviders.push('gsm_modem');
    if (this.isTwilioReady) availableProviders.push('twilio');

    const gsmInfo = gsmModemService.getConfigInfo();
    const phone = gsmInfo?.phone || process.env.TWILIO_PHONE_NUMBER || process.env.GSM_MODEM_PHONE;

    return {
      provider: this.config.preferredProvider,
      phone,
      connected: this.isGsmModemReady || this.isTwilioReady,
      availableProviders
    };
  }

  // Test konekcije
  async testConnection(): Promise<{ gsm_modem: boolean; twilio: boolean }> {
    const gsmTest = this.isGsmModemReady ? await gsmModemService.testConnection() : false;
    const twilioTest = this.isTwilioReady; // Twilio test može biti složeniji
    
    return {
      gsm_modem: gsmTest,
      twilio: twilioTest
    };
  }

  // Dobij dostupne serial portove
  async getAvailablePorts(): Promise<string[]> {
    try {
      const { SerialPort } = await import('serialport');
      const ports = await SerialPort.list();
      return ports.map(port => `${port.path} (${port.manufacturer || 'Unknown'})`);
    } catch (error) {
      console.error("[HYBRID SMS] Greška pri dobijanju portova:", error);
      return [];
    }
  }

  // Pošalji SMS sa automatskim formatiranjem za različite tipove
  async sendServiceStatusUpdate(
    client: { fullName: string; phone?: string | null },
    service: { id: number; description: string; status: string },
    newStatus: string,
    technicianName?: string | null
  ): Promise<boolean> {
    if (!client.phone) {
      console.warn(`[HYBRID SMS] Klijent ${client.fullName} nema broj telefona`);
      return false;
    }

    // Generiši poruku na osnovu statusa
    let message = '';
    switch (newStatus) {
      case 'assigned':
        message = `Frigo Sistem: Vaš servis #${service.id} je dodeljen serviseru ${technicianName || ''}. Kontakt: +382 67 028 666`;
        break;
      case 'scheduled':
        message = `Frigo Sistem: Zakazan je termin za servis #${service.id}. Kontakt: +382 67 028 666`;
        break;
      case 'in_progress':
        message = `Frigo Sistem: Servis #${service.id} je u toku. Kontakt: +382 67 028 666`;
        break;
      case 'completed':
        message = `Frigo Sistem: Servis #${service.id} je završen. Kontakt: +382 67 028 666`;
        break;
      default:
        message = `Frigo Sistem: Status servisa #${service.id} je ažuriran. Kontakt: +382 67 028 666`;
    }

    const result = await this.sendSms({
      to: client.phone,
      message,
      type: 'status_update'
    });

    return result.success;
  }

  // Pošalji podsetnik za održavanje
  async sendMaintenanceReminder(
    client: { fullName: string; phone?: string | null },
    appliance: { model: string; category: { name: string } },
    scheduledDate: Date
  ): Promise<boolean> {
    if (!client.phone) {
      console.warn(`[HYBRID SMS] Klijent ${client.fullName} nema broj telefona`);
      return false;
    }

    const dateStr = scheduledDate.toLocaleDateString('sr-Latn-ME');
    const message = `Frigo Sistem: Podsetnik za održavanje - ${appliance.category.name} ${appliance.model} zakazano za ${dateStr}. Kontakt: +382 67 028 666`;

    const result = await this.sendSms({
      to: client.phone,
      message,
      type: 'reminder'
    });

    return result.success;
  }

  // Restartuj GSM modem konekciju
  async restartGsmModem(): Promise<boolean> {
    try {
      console.log("[HYBRID SMS] Restartovanje GSM modem konekcije...");
      
      // Zatvori postojeću konekciju
      await gsmModemService.disconnect();
      
      // Pokušaj ponovo da se povezuje
      if (this.config?.gsmModemConfig) {
        const configured = await gsmModemService.configure(this.config.gsmModemConfig);
        if (configured) {
          this.isGsmModemReady = await gsmModemService.connect();
          return this.isGsmModemReady;
        }
      }
      
      return false;
    } catch (error) {
      console.error("[HYBRID SMS] Greška pri restartovanju GSM modema:", error);
      return false;
    }
  }
}

// Eksportuj singleton instancu
export const hybridSmsService = new HybridSMSService();