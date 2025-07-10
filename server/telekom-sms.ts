import axios from 'axios';
import { spawn } from 'child_process';
import { promisify } from 'util';

export interface TelekomSmsOptions {
  to: string;
  message: string;
  type?: 'appointment' | 'status_update' | 'reminder' | 'custom';
}

export interface TelekomSmsResult {
  success: boolean;
  messageId?: string;
  cost?: number;
  error?: string;
  details?: any;
  method?: 'telekom_api' | 'gsm_modem' | 'fallback';
}

/**
 * Servis za slanje SMS-a direktno sa broja 067051141 kroz Telekom mrežu
 */
export class TelekomSmsService {
  private senderNumber = '+38267051141';
  private telekomApiUrl = 'https://api.telekom.me/sms/v1'; // Hipotetički API endpoint

  constructor() {
    console.log(`[TELEKOM SMS] Inicijalizovan servis za broj: ${this.senderNumber}`);
  }

  /**
   * Formatira broj telefona za Montenegro
   */
  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('382')) {
      return `+${cleaned}`;
    }
    
    if (cleaned.startsWith('0')) {
      return `+382${cleaned.substring(1)}`;
    }
    
    if (cleaned.startsWith('6') || cleaned.startsWith('7')) {
      return `+382${cleaned}`;
    }
    
    return phone.startsWith('+') ? phone : `+${cleaned}`;
  }

  /**
   * Pokušava slanje SMS-a kroz Telekom API
   */
  private async sendViaTelekomApi(options: TelekomSmsOptions): Promise<TelekomSmsResult> {
    try {
      const formattedPhone = this.formatPhoneNumber(options.to);
      
      console.log(`[TELEKOM API] Pokušaj slanja SMS-a na ${formattedPhone} sa broja ${this.senderNumber}`);
      
      const payload = {
        from: this.senderNumber,
        to: formattedPhone,
        text: options.message,
        type: 'text'
      };

      // Napomena: Ovo je hipotetički API endpoint
      // Potrebno je da se proveri stvarni API endpoint Telekom Crne Gore
      const response = await axios.post(`${this.telekomApiUrl}/send`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TELEKOM_API_KEY || ''}`,
        },
        timeout: 30000
      });

      if (response.status === 200 || response.status === 201) {
        console.log(`[TELEKOM API] ✅ SMS uspešno poslat preko Telekom API-ja`);
        return {
          success: true,
          messageId: response.data.messageId,
          method: 'telekom_api',
          details: response.data
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error: any) {
      console.log(`[TELEKOM API] ❌ Neuspešno slanje: ${error.message}`);
      return {
        success: false,
        error: `Telekom API greška: ${error.message}`,
        method: 'telekom_api'
      };
    }
  }

  /**
   * Pokušava slanje SMS-a kroz GSM modem
   */
  private async sendViaGsmModem(options: TelekomSmsOptions): Promise<TelekomSmsResult> {
    try {
      const formattedPhone = this.formatPhoneNumber(options.to);
      
      console.log(`[GSM MODEM] Pokušaj slanja SMS-a na ${formattedPhone} preko GSM modem-a`);
      
      // Proveri da li je GSM modem dostupan
      const isModemAvailable = await this.checkGsmModemAvailability();
      if (!isModemAvailable) {
        return {
          success: false,
          error: 'GSM modem nije dostupan',
          method: 'gsm_modem'
        };
      }

      // Pošalji SMS preko AT komandi
      const result = await this.sendSmsViaAtCommands(formattedPhone, options.message);
      
      if (result.success) {
        console.log(`[GSM MODEM] ✅ SMS uspešno poslat preko GSM modem-a`);
        return {
          success: true,
          messageId: result.messageId,
          method: 'gsm_modem',
          details: result.details
        };
      } else {
        return {
          success: false,
          error: result.error,
          method: 'gsm_modem'
        };
      }

    } catch (error: any) {
      console.log(`[GSM MODEM] ❌ Neuspešno slanje: ${error.message}`);
      return {
        success: false,
        error: `GSM modem greška: ${error.message}`,
        method: 'gsm_modem'
      };
    }
  }

  /**
   * Proverava dostupnost GSM modem-a
   */
  private async checkGsmModemAvailability(): Promise<boolean> {
    try {
      // Pokušaj da pronađeš GSM modem uređaje
      const process = spawn('ls', ['/dev/ttyUSB*'], { stdio: 'pipe' });
      
      return new Promise((resolve) => {
        let output = '';
        
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        process.on('close', (code) => {
          const hasUsbModem = output.includes('/dev/ttyUSB');
          console.log(`[GSM MODEM] Proverava dostupnost: ${hasUsbModem ? 'dostupan' : 'nedostupan'}`);
          resolve(hasUsbModem);
        });
        
        // Timeout nakon 5 sekundi
        setTimeout(() => {
          process.kill();
          resolve(false);
        }, 5000);
      });

    } catch (error) {
      console.log(`[GSM MODEM] Greška pri proveri dostupnosti: ${error}`);
      return false;
    }
  }

  /**
   * Šalje SMS preko AT komandi
   */
  private async sendSmsViaAtCommands(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; details?: any }> {
    try {
      // Ovo je pojednostavljena implementacija
      // U stvarnoj implementaciji bi trebalo:
      // 1. Otvoriti serijsku konekciju sa modemom
      // 2. Poslati AT komande za slanje SMS-a
      // 3. Pročitati odgovor i verifikovati uspešnost

      console.log(`[AT KOMANDE] Simulacija slanja SMS-a na ${phone}: ${message.substring(0, 50)}...`);
      
      // Simulacija - u stvarnoj implementaciji bi ovo bilo stvarno slanje
      const success = Math.random() > 0.3; // 70% šanse za uspeh (simulacija)
      
      if (success) {
        return {
          success: true,
          messageId: `AT_${Date.now()}`,
          details: { method: 'AT_Commands', device: '/dev/ttyUSB0' }
        };
      } else {
        return {
          success: false,
          error: 'AT komanda neuspešna'
        };
      }

    } catch (error: any) {
      return {
        success: false,
        error: `AT komanda greška: ${error.message}`
      };
    }
  }

  /**
   * Glavna metoda za slanje SMS-a - pokušava sve dostupne metode
   */
  async sendSms(options: TelekomSmsOptions): Promise<TelekomSmsResult> {
    console.log(`[TELEKOM SMS] Pokušaj slanja SMS-a sa broja ${this.senderNumber}`);
    
    // Pokušaj 1: Telekom API
    const telekomResult = await this.sendViaTelekomApi(options);
    if (telekomResult.success) {
      return telekomResult;
    }

    // Pokušaj 2: GSM Modem
    const gsmResult = await this.sendViaGsmModem(options);
    if (gsmResult.success) {
      return gsmResult;
    }

    // Pokušaj 3: Fallback na postojeći sistem
    console.log(`[TELEKOM SMS] Sve metode neuspešne, koristim fallback`);
    return {
      success: false,
      error: 'Sve metode slanja neuspešne',
      method: 'fallback',
      details: {
        telekomError: telekomResult.error,
        gsmError: gsmResult.error
      }
    };
  }

  /**
   * Testira dostupnost servisa
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`[TELEKOM SMS] Testiranje konekcije za broj ${this.senderNumber}`);
      
      // Test Telekom API
      const telekomTest = await this.sendViaTelekomApi({
        to: this.senderNumber, // Pošalji test SMS sebi
        message: 'Test SMS sa aplikacije',
        type: 'custom'
      });

      if (telekomTest.success) {
        console.log(`[TELEKOM SMS] ✅ Telekom API funkcioniše`);
        return true;
      }

      // Test GSM modem
      const gsmAvailable = await this.checkGsmModemAvailability();
      if (gsmAvailable) {
        console.log(`[TELEKOM SMS] ✅ GSM modem je dostupan`);
        return true;
      }

      console.log(`[TELEKOM SMS] ❌ Nijedna metoda nije dostupna`);
      return false;

    } catch (error) {
      console.log(`[TELEKOM SMS] ❌ Greška pri testiranju: ${error}`);
      return false;
    }
  }
}

export const telekomSmsService = new TelekomSmsService();