/**
 * GSM Modem Service
 * Servis za slanje SMS-ova preko fizičke SIM kartice putem GSM modema
 */

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { storage } from './storage';

export interface GSMModemConfig {
  portPath: string;         // npr. "/dev/ttyUSB0" ili "COM3"
  baudRate: number;         // obično 9600 ili 115200
  pin?: string;             // PIN kod SIM kartice (opcionalno)
  maxRetries: number;       // broj pokušaja slanja
  timeout: number;          // timeout u milisekundama
}

export interface GSMModemStatus {
  isConnected: boolean;
  isConfigured: boolean;
  signalStrength?: number;
  networkOperator?: string;
  simStatus?: string;
  lastError?: string;
  lastSentAt?: Date;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus?: 'sent' | 'delivered' | 'failed' | 'pending';
}

class GSMModemService {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private config: GSMModemConfig | null = null;
  private isConnected = false;
  private isConfigured = false;
  private lastError: string | null = null;
  private lastSentAt: Date | null = null;
  private responseBuffer: string[] = [];
  private waitingForResponse = false;

  constructor() {
    console.log('[GSM MODEM] Inicijalizovanje GSM Modem servisa');
  }

  async initialize(): Promise<void> {
    console.log('[GSM MODEM] Učitavanje GSM modem konfiguracije...');
    
    try {
      // Učitaj konfiguraciju iz baze podataka
      const settings = await storage.getSystemSettings();
      const portPath = settings.find(s => s.key === 'gsm_modem_port')?.value;
      const baudRate = parseInt(settings.find(s => s.key === 'gsm_modem_baud')?.value || '9600');
      const pin = settings.find(s => s.key === 'gsm_modem_pin')?.value;
      const maxRetries = parseInt(settings.find(s => s.key === 'gsm_modem_retries')?.value || '3');
      const timeout = parseInt(settings.find(s => s.key === 'gsm_modem_timeout')?.value || '30000');

      if (portPath) {
        await this.configure({
          portPath,
          baudRate,
          pin,
          maxRetries,
          timeout
        });
        
        await this.connect();
        console.log('[GSM MODEM] GSM modem uspešno inicijalizovan');
      } else {
        console.log('[GSM MODEM] GSM modem nije konfigurisan - potreban je port path');
      }
    } catch (error) {
      console.error('[GSM MODEM] Greška pri inicijalizaciji:', error);
      this.lastError = error instanceof Error ? error.message : 'Nepoznata greška';
    }
  }

  async configure(config: GSMModemConfig): Promise<boolean> {
    try {
      console.log('[GSM MODEM] Konfiguriranje GSM modem parametara...');
      this.config = config;
      this.isConfigured = true;
      this.lastError = null;
      return true;
    } catch (error) {
      console.error('[GSM MODEM] Greška pri konfiguraciji:', error);
      this.lastError = error instanceof Error ? error.message : 'Greška pri konfiguraciji';
      return false;
    }
  }

  async connect(): Promise<boolean> {
    if (!this.config) {
      this.lastError = 'GSM modem nije konfigurisan';
      return false;
    }

    try {
      console.log(`[GSM MODEM] Povezivanje sa GSM modemom na ${this.config.portPath}...`);
      
      // Kreiraj serial port konekciju
      this.port = new SerialPort({
        path: this.config.portPath,
        baudRate: this.config.baudRate,
        autoOpen: false
      });

      // Kreiraj parser za čitanje linija
      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      // Otvori port
      await new Promise<void>((resolve, reject) => {
        this.port!.open((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Postavi event handlere
      this.parser.on('data', (data: string) => {
        console.log(`[GSM MODEM] Odgovor: ${data.trim()}`);
        this.responseBuffer.push(data.trim());
      });

      this.port.on('error', (error) => {
        console.error('[GSM MODEM] Port greška:', error);
        this.lastError = error.message;
        this.isConnected = false;
      });

      // Testiraj konekciju sa osnovnim AT komandama
      const testResult = await this.sendATCommand('AT');
      if (!testResult || !testResult.includes('OK')) {
        throw new Error('GSM modem ne odgovara na AT komande');
      }

      // Postavi SMS format na text mode
      await this.sendATCommand('AT+CMGF=1');
      
      // Unesi PIN ako je potreban
      if (this.config.pin) {
        await this.sendATCommand(`AT+CPIN=${this.config.pin}`);
        await this.delay(2000); // Čekaj da se SIM aktivira
      }

      // Proveri status SIM kartice
      const simStatus = await this.sendATCommand('AT+CPIN?');
      console.log('[GSM MODEM] SIM status:', simStatus);

      // Proveri mrežni signal
      const signalInfo = await this.sendATCommand('AT+CSQ');
      console.log('[GSM MODEM] Signal info:', signalInfo);

      this.isConnected = true;
      this.lastError = null;
      console.log('[GSM MODEM] Uspešno povezan sa GSM modemom');
      
      return true;
    } catch (error) {
      console.error('[GSM MODEM] Greška pri povezivanju:', error);
      this.lastError = error instanceof Error ? error.message : 'Greška pri povezivanju';
      this.isConnected = false;
      
      if (this.port) {
        this.port.close();
        this.port = null;
      }
      
      return false;
    }
  }

  async sendSMS(phoneNumber: string, message: string): Promise<SMSResult> {
    if (!this.isConnected || !this.config) {
      return {
        success: false,
        error: 'GSM modem nije povezan'
      };
    }

    try {
      console.log(`[GSM MODEM] Slanje SMS na ${phoneNumber}: ${message}`);
      
      // Normalizuj broj telefona
      const normalizedNumber = this.normalizePhoneNumber(phoneNumber);
      
      // Pokušaj slanje sa retry logikom
      for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
        try {
          console.log(`[GSM MODEM] Pokušaj ${attempt}/${this.config.maxRetries}`);
          
          // Postavi odredište SMS poruke
          const setRecipient = await this.sendATCommand(`AT+CMGS="${normalizedNumber}"`);
          
          if (setRecipient && setRecipient.includes('>')) {
            // Pošalji poruku (završi sa Ctrl+Z = 0x1A)
            const sendResult = await this.sendATCommand(message + String.fromCharCode(26));
            
            if (sendResult && sendResult.includes('+CMGS:')) {
              // Izvuci message ID iz odgovora
              const messageIdMatch = sendResult.match(/\+CMGS:\s*(\d+)/);
              const messageId = messageIdMatch ? messageIdMatch[1] : undefined;
              
              this.lastSentAt = new Date();
              console.log(`[GSM MODEM] SMS uspešno poslat, ID: ${messageId}`);
              
              return {
                success: true,
                messageId,
                deliveryStatus: 'sent'
              };
            }
          }
          
          // Ako nije uspešno, čekaj pre sledećeg pokušaja
          if (attempt < this.config.maxRetries) {
            await this.delay(2000);
          }
          
        } catch (attemptError) {
          console.error(`[GSM MODEM] Pokušaj ${attempt} neuspešan:`, attemptError);
          
          if (attempt === this.config.maxRetries) {
            throw attemptError;
          }
          
          await this.delay(2000);
        }
      }
      
      throw new Error(`Slanje SMS neuspešno nakon ${this.config.maxRetries} pokušaja`);
      
    } catch (error) {
      console.error('[GSM MODEM] Greška pri slanju SMS:', error);
      this.lastError = error instanceof Error ? error.message : 'Greška pri slanju SMS';
      
      return {
        success: false,
        error: this.lastError
      };
    }
  }

  async getStatus(): Promise<GSMModemStatus> {
    const status: GSMModemStatus = {
      isConnected: this.isConnected,
      isConfigured: this.isConfigured,
      lastError: this.lastError || undefined,
      lastSentAt: this.lastSentAt || undefined
    };

    if (this.isConnected) {
      try {
        // Dobij signal strength
        const signalResponse = await this.sendATCommand('AT+CSQ');
        if (signalResponse) {
          const signalMatch = signalResponse.match(/\+CSQ:\s*(\d+),/);
          if (signalMatch) {
            status.signalStrength = parseInt(signalMatch[1]);
          }
        }

        // Dobij network operator
        const operatorResponse = await this.sendATCommand('AT+COPS?');
        if (operatorResponse) {
          const operatorMatch = operatorResponse.match(/"([^"]+)"/);
          if (operatorMatch) {
            status.networkOperator = operatorMatch[1];
          }
        }

        // Dobij SIM status
        const simResponse = await this.sendATCommand('AT+CPIN?');
        if (simResponse) {
          status.simStatus = simResponse.replace('+CPIN: ', '').trim();
        }
      } catch (error) {
        console.error('[GSM MODEM] Greška pri dobijanju statusa:', error);
      }
    }

    return status;
  }

  async disconnect(): Promise<void> {
    if (this.port) {
      this.port.close();
      this.port = null;
      this.parser = null;
      this.isConnected = false;
      console.log('[GSM MODEM] GSM modem odspojen');
    }
  }

  private async sendATCommand(command: string): Promise<string | null> {
    if (!this.port || !this.isConnected) {
      throw new Error('GSM modem nije povezan');
    }

    return new Promise((resolve, reject) => {
      this.responseBuffer = [];
      this.waitingForResponse = true;

      // Postavi timeout
      const timeout = setTimeout(() => {
        this.waitingForResponse = false;
        reject(new Error(`AT komanda timeout: ${command}`));
      }, this.config?.timeout || 30000);

      // Pošalji komandu
      this.port!.write(command + '\r\n', (err) => {
        if (err) {
          clearTimeout(timeout);
          this.waitingForResponse = false;
          reject(err);
          return;
        }

        // Čekaj odgovor
        const checkResponse = () => {
          if (!this.waitingForResponse) return;

          const response = this.responseBuffer.join('\n');
          
          if (response.includes('OK') || response.includes('ERROR') || response.includes('+CMGS:')) {
            clearTimeout(timeout);
            this.waitingForResponse = false;
            resolve(response);
          } else {
            setTimeout(checkResponse, 100);
          }
        };

        setTimeout(checkResponse, 100);
      });
    });
  }

  private normalizePhoneNumber(phone: string): string {
    // Ukloni sve što nije cifra ili +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Dodaj +382 prefix za crnogorske brojeve ako nema international prefix
    if (!normalized.startsWith('+')) {
      if (normalized.startsWith('0')) {
        // Ukloni vodeću nulu i dodaj +382
        normalized = '+382' + normalized.substring(1);
      } else if (normalized.startsWith('382')) {
        // Dodaj + prefix
        normalized = '+' + normalized;
      } else {
        // Pretpostavi crnogorski broj
        normalized = '+382' + normalized;
      }
    }
    
    console.log(`[GSM MODEM] Normalizovan broj: ${phone} -> ${normalized}`);
    return normalized;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const gsmModemService = new GSMModemService();

export { gsmModemService };
export default gsmModemService;