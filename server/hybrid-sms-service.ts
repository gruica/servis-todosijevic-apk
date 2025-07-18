import { gsmModemService } from './gsm-modem-service';

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

// Interface za konfiguraciju - samo GSM modem
interface GSMOnlyConfig {
  port: string;
  baudRate: number;
  phoneNumber: string;
}

export class GSMOnlySMSService {
  private config: GSMOnlyConfig | null = null;
  private isGsmModemReady: boolean = false;

  constructor() {
    console.log("[GSM SMS] Inicijalizacija GSM-only SMS servisa");
    this.checkGsmModemStatus();
  }

  // Proveri status GSM modema
  private async checkGsmModemStatus(): Promise<void> {
    try {
      // Proveravamo da li je GSM modem konfigurisan preko environment varijabli
      const gsmPort = process.env.GSM_MODEM_PORT;
      const gsmPhone = process.env.GSM_MODEM_PHONE;
      
      this.isGsmModemReady = !!(gsmPort && gsmPhone);
      if (this.isGsmModemReady) {
        console.log("[GSM SMS] GSM modem je konfigurisan");
      } else {
        console.log("[GSM SMS] GSM modem nije konfigurisan");
      }
    } catch (error) {
      console.log("[GSM SMS] Greška pri proveri GSM modema:", error);
      this.isGsmModemReady = false;
    }
  }

  // Konfiguriši GSM modem
  async configure(config: GSMOnlyConfig): Promise<boolean> {
    try {
      this.config = config;
      console.log(`[GSM SMS] Konfiguracija GSM modema: port=${config.port}, broj=${config.phoneNumber}`);
      
      const gsmConfigured = await gsmModemService.configure(config);
      if (gsmConfigured) {
        this.isGsmModemReady = await gsmModemService.connect();
        if (this.isGsmModemReady) {
          console.log("[GSM SMS] ✅ GSM modem uspešno konfigurisan i povezan");
          return true;
        } else {
          console.log("[GSM SMS] ❌ GSM modem konfigurisan ali nije uspešno povezan");
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error("[HYBRID SMS] Greška pri konfiguraciji:", error);
      return false;
    }
  }

  // Glavni metod za slanje SMS-a - samo GSM modem
  async sendSms(smsData: SMSMessage): Promise<SMSResponse> {
    if (!this.config) {
      return {
        success: false,
        error: "GSM SMS servis nije konfigurisan"
      };
    }

    if (!this.isGsmModemReady) {
      return {
        success: false,
        error: "GSM modem nije spreman ili povezan"
      };
    }

    console.log(`[GSM SMS] Slanje SMS-a preko GSM modema na: ${smsData.to}`);

    try {
      const result = await gsmModemService.sendSms(smsData);
      
      if (result.success) {
        console.log(`[GSM SMS] ✅ SMS uspešno poslat preko GSM modema`);
        return { ...result, provider: 'gsm_modem' };
      } else {
        console.error(`[GSM SMS] ❌ Slanje SMS-a neuspešno: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error(`[GSM SMS] ❌ Greška pri slanju SMS-a:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Nepoznata greška"
      };
    }
  }

  // Test GSM modema
  async testGsmModem(testNumber: string): Promise<SMSResponse> {
    if (!this.isGsmModemReady) {
      return {
        success: false,
        error: "GSM modem nije spreman"
      };
    }

    const testMessage = {
      to: testNumber,
      message: "Test poruka sa GSM modema - Frigo Sistem Todosijević",
      type: 'custom' as const
    };

    return await this.sendSms(testMessage);
  }

  // Dobij informacije o konfiguraciji GSM modema
  getConfigInfo(): { provider: string; phone?: string; connected: boolean; port?: string } | null {
    if (!this.config) {
      return null;
    }

    const gsmInfo = gsmModemService.getConfigInfo();
    
    return {
      provider: 'gsm_modem',
      phone: this.config.phoneNumber || '+38267028666',
      connected: this.isGsmModemReady,
      port: this.config.port
    };
  }

  // Test GSM modem konekcije
  async testConnection(): Promise<{ gsm_modem: boolean }> {
    const gsmTest = this.isGsmModemReady ? await gsmModemService.testConnection() : false;
    
    return {
      gsm_modem: gsmTest
    };
  }

  // Dobij dostupne serial portove
  async getAvailablePorts(): Promise<string[]> {
    try {
      const { SerialPort } = await import('serialport');
      const ports = await SerialPort.list();
      return ports.map(port => `${port.path} (${port.manufacturer || 'Unknown'})`);
    } catch (error) {
      console.error("[GSM SMS] Greška pri dobijanju portova:", error);
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
      console.warn(`[GSM SMS] Klijent ${client.fullName} nema broj telefona`);
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
      console.warn(`[GSM SMS] Klijent ${client.fullName} nema broj telefona`);
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
      console.log("[GSM SMS] Restartovanje GSM modem konekcije...");
      
      // Zatvori postojeću konekciju
      await gsmModemService.disconnect();
      
      // Pokušaj ponovo da se povezuje
      if (this.config) {
        const configured = await gsmModemService.configure(this.config);
        if (configured) {
          this.isGsmModemReady = await gsmModemService.connect();
          return this.isGsmModemReady;
        }
      }
      
      return false;
    } catch (error) {
      console.error("[GSM SMS] Greška pri restartovanju GSM modema:", error);
      return false;
    }
  }
}

// Eksportuj singleton instancu - sada je GSM-only servis
export const hybridSmsService = new GSMOnlySMSService();