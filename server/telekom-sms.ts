import axios from 'axios';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { newSmsService, NewSmsOptions } from './new-sms-platform';

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
      console.log(`[GSM MODEM] Proverava dostupnost GSM modem uređaja...`);
      
      // Proverava više mogućih putanja za GSM modem
      const modemPaths = [
        '/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyUSB2', '/dev/ttyUSB3',
        '/dev/ttyACM0', '/dev/ttyACM1', '/dev/ttyACM2', '/dev/ttyACM3',
        '/dev/ttyAMA0', '/dev/ttyS0', '/dev/ttyS1'
      ];
      
      for (const path of modemPaths) {
        const process = spawn('ls', [path], { stdio: 'pipe' });
        
        const exists = await new Promise<boolean>((resolve) => {
          process.on('close', (code) => {
            resolve(code === 0);
          });
          
          process.on('error', () => {
            resolve(false);
          });
          
          // Timeout nakon 2 sekunde
          setTimeout(() => {
            process.kill();
            resolve(false);
          }, 2000);
        });
        
        if (exists) {
          console.log(`[GSM MODEM] ✅ Pronađen GSM modem na: ${path}`);
          this.modemPath = path;
          
          // Testira komunikaciju sa modemom
          const isResponding = await this.testModemCommunication(path);
          if (isResponding) {
            console.log(`[GSM MODEM] ✅ GSM modem odgovara na AT komande`);
            return true;
          }
        }
      }
      
      console.log(`[GSM MODEM] ❌ GSM modem nije pronađen`);
      return false;

    } catch (error) {
      console.log(`[GSM MODEM] Greška pri proveri dostupnosti: ${error}`);
      return false;
    }
  }

  private modemPath: string | null = null;

  /**
   * Testira komunikaciju sa GSM modemom
   */
  private async testModemCommunication(devicePath: string): Promise<boolean> {
    try {
      console.log(`[GSM MODEM] Testira komunikaciju sa ${devicePath}...`);
      
      // Pokušava da pošalje AT komandu za test
      const result = await this.sendAtCommand(devicePath, 'AT');
      return result.success && result.response.includes('OK');
      
    } catch (error) {
      console.log(`[GSM MODEM] Greška pri testiranju komunikacije: ${error}`);
      return false;
    }
  }

  /**
   * Šalje AT komandu na GSM modem koristeći serijsku komunikaciju
   */
  private async sendAtCommand(devicePath: string, command: string): Promise<{ success: boolean; response: string; error?: string }> {
    return new Promise((resolve) => {
      try {
        console.log(`[AT KOMANDE] Otvara serijsku konekciju na ${devicePath}...`);
        
        // Kreira serijsku konekciju sa modemom
        const port = new SerialPort({ 
          path: devicePath, 
          baudRate: 115200,
          dataBits: 8,
          parity: 'none',
          stopBits: 1,
          flowControl: false
        });
        
        const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
        let response = '';
        let timeoutId: NodeJS.Timeout;
        
        // Slušaj odgovore
        parser.on('data', (data) => {
          response += data.toString() + '\n';
          console.log(`[AT KOMANDE] Odgovor: ${data.toString()}`);
          
          // Proverava da li je odgovor završen
          if (data.toString().includes('OK') || data.toString().includes('ERROR') || data.toString().includes('>')) {
            clearTimeout(timeoutId);
            port.close();
            resolve({ success: true, response: response.trim() });
          }
        });
        
        // Greška pri otvaranju porta
        port.on('error', (error) => {
          clearTimeout(timeoutId);
          console.log(`[AT KOMANDE] Greška porta: ${error.message}`);
          resolve({ success: false, response: '', error: error.message });
        });
        
        // Kada je port otvoren, pošalji komandu
        port.on('open', () => {
          console.log(`[AT KOMANDE] Port otvoren, šalje komandu: ${command}`);
          
          // Dodaj carriage return i line feed
          const commandWithCr = command + '\r\n';
          port.write(commandWithCr, (error) => {
            if (error) {
              clearTimeout(timeoutId);
              port.close();
              resolve({ success: false, response: '', error: error.message });
            }
          });
        });
        
        // Timeout nakon 10 sekundi
        timeoutId = setTimeout(() => {
          console.log(`[AT KOMANDE] Timeout za komandu: ${command}`);
          port.close();
          resolve({ success: false, response: response || '', error: 'Timeout' });
        }, 10000);
        
      } catch (error: any) {
        console.log(`[AT KOMANDE] Greška: ${error.message}`);
        resolve({ success: false, response: '', error: error.message });
      }
    });
  }

  /**
   * Šalje SMS preko AT komandi
   */
  private async sendSmsViaAtCommands(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; details?: any }> {
    try {
      if (!this.modemPath) {
        return {
          success: false,
          error: 'GSM modem nije dostupan'
        };
      }

      console.log(`[AT KOMANDE] Šalje SMS na ${phone} preko ${this.modemPath}: ${message.substring(0, 50)}...`);
      
      // Koraci za slanje SMS-a preko AT komandi:
      // 1. Postavi modem u text mode
      // 2. Definiši broj telefona
      // 3. Pošalji sadržaj poruke
      // 4. Pošalji Ctrl+Z za završetak
      
      const steps = [
        { command: 'AT', expectedResponse: 'OK' },
        { command: 'AT+CMGF=1', expectedResponse: 'OK' }, // Text mode
        { command: `AT+CMGS="${phone}"`, expectedResponse: '>' }, // Destination number
        { command: message + '\x1A', expectedResponse: 'OK' } // Message + Ctrl+Z
      ];
      
      for (const step of steps) {
        console.log(`[AT KOMANDE] Izvršava: ${step.command.replace('\x1A', '<Ctrl+Z>')}`);
        
        const result = await this.sendAtCommand(this.modemPath, step.command);
        
        if (!result.success) {
          return {
            success: false,
            error: `AT komanda neuspešna: ${result.error}`,
            details: { step: step.command, modemPath: this.modemPath }
          };
        }
        
        // Proveri da li je odgovor očekivan
        if (!result.response.includes(step.expectedResponse)) {
          console.log(`[AT KOMANDE] Neočekivan odgovor: ${result.response}`);
          if (step.expectedResponse === 'OK' && !result.response.includes('ERROR')) {
            // Nastavi ako nema greške
            continue;
          }
          return {
            success: false,
            error: `Neočekivan odgovor: ${result.response}`,
            details: { expected: step.expectedResponse, received: result.response }
          };
        }
        
        // Kratka pauza između komandi
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`[AT KOMANDE] ✅ SMS uspešno poslat na ${phone}`);
      
      return {
        success: true,
        messageId: `GSM_${Date.now()}`,
        details: { 
          method: 'AT_Commands', 
          device: this.modemPath,
          phone: phone,
          messageLength: message.length
        }
      };

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

    // Pokušaj 3: Vaša nova SMS platforma
    console.log(`[TELEKOM SMS] Pokušava novu SMS platformu...`);
    const newPlatformResult = await newSmsService.sendSms({
      to: options.to,
      message: options.message,
      from: '+38267051141',
      type: options.type
    });
    if (newPlatformResult.success) {
      console.log(`[TELEKOM SMS] Uspešno poslano preko nove SMS platforme`);
      return {
        success: true,
        messageId: newPlatformResult.messageId,
        cost: newPlatformResult.cost,
        method: 'Nova SMS platforma',
        details: newPlatformResult.details
      };
    }

    // Pokušaj 4: Fallback na postojeći sistem
    console.log(`[TELEKOM SMS] Sve metode neuspešne, koristim fallback`);
    return {
      success: false,
      error: 'Sve metode slanja neuspešne',
      method: 'fallback',
      details: {
        telekomError: telekomResult.error,
        gsmError: gsmResult.error,
        newPlatformError: newPlatformResult.error
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