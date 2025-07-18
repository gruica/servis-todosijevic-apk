import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { Socket } from 'net';

// Interface za GSM modem konfiguraciju
interface GSMModemConfig {
  port: string;
  baudRate: number;
  phoneNumber: string;
  pin?: string;
  // Novi WiFi konfiguracija
  connectionType?: 'usb' | 'wifi';
  wifiHost?: string;
  wifiPort?: number;
}

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
}

export class GSMModemService {
  private serialPort: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private wifiSocket: Socket | null = null;
  private config: GSMModemConfig | null = null;
  private isConnected: boolean = false;
  private commandQueue: Array<{ command: string; resolve: Function; reject: Function }> = [];
  private processingCommand: boolean = false;

  constructor() {
    console.log("[GSM MODEM] Inicijalizacija GSM Modem servisa");
  }

  // Konfiguriši GSM modem
  async configure(config: GSMModemConfig): Promise<boolean> {
    try {
      this.config = config;
      
      if (config.connectionType === 'wifi') {
        console.log(`[GSM MODEM] WiFi konfiguracija: host=${config.wifiHost}, port=${config.wifiPort}, phone=${config.phoneNumber}`);
        // Sačuvaj WiFi konfiguraciju
        process.env.GSM_MODEM_WIFI_HOST = config.wifiHost || '';
        process.env.GSM_MODEM_WIFI_PORT = (config.wifiPort || 23).toString();
      } else {
        console.log(`[GSM MODEM] USB konfiguracija: port=${config.port}, baudRate=${config.baudRate}, phone=${config.phoneNumber}`);
        // Sačuvaj USB konfiguraciju
        process.env.GSM_MODEM_PORT = config.port;
        process.env.GSM_MODEM_BAUD_RATE = config.baudRate.toString();
      }
      
      process.env.GSM_MODEM_CONNECTION_TYPE = config.connectionType || 'usb';
      process.env.GSM_MODEM_PHONE = config.phoneNumber;
      
      return true;
    } catch (error) {
      console.error("[GSM MODEM] Greška pri konfiguraciji:", error);
      return false;
    }
  }

  // Povezivanje sa GSM modemom
  async connect(): Promise<boolean> {
    if (!this.config) {
      console.error("[GSM MODEM] Modem nije konfigurisan");
      return false;
    }

    try {
      // Proveri tip konekcije
      if (this.config.connectionType === 'wifi') {
        return await this.connectWiFi();
      } else {
        return await this.connectUSB();
      }
    } catch (error) {
      console.error("[GSM MODEM] Greška pri povezivanju:", error);
      return false;
    }
  }

  // Povezivanje preko USB-a
  private async connectUSB(): Promise<boolean> {
    console.log(`[GSM MODEM] Povezivanje sa USB portom ${this.config?.port}...`);
    
    this.serialPort = new SerialPort({
      path: this.config!.port,
      baudRate: this.config!.baudRate,
      autoOpen: false
    });

      this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      // Event listeneri
      this.serialPort.on('open', () => {
        console.log("[GSM MODEM] ✅ Serial port otvoren");
        this.isConnected = true;
        this.initializeModem();
      });

      this.serialPort.on('error', (err) => {
        console.error("[GSM MODEM] ❌ Serial port greška:", err);
        this.isConnected = false;
      });

      this.serialPort.on('close', () => {
        console.log("[GSM MODEM] Serial port zatvoren");
        this.isConnected = false;
      });

      // Parser za čitanje odgovora
      this.parser?.on('data', (data: string) => {
        this.handleModemResponse(data);
      });

      // Otvori port
      await new Promise<void>((resolve, reject) => {
        this.serialPort?.open((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      return true;
  }

  // Povezivanje preko WiFi-a
  private async connectWiFi(): Promise<boolean> {
    if (!this.config?.wifiHost || !this.config?.wifiPort) {
      console.error("[GSM MODEM] WiFi host ili port nije konfigurisan");
      return false;
    }

    console.log(`[GSM MODEM] Povezivanje sa WiFi modemom ${this.config.wifiHost}:${this.config.wifiPort}...`);
    
    this.wifiSocket = new Socket();
    
    // Event listeneri za WiFi socket
    this.wifiSocket.on('connect', () => {
      console.log("[GSM MODEM] ✅ WiFi konekcija uspostavljena");
      this.isConnected = true;
      this.initializeModem();
    });

    this.wifiSocket.on('error', (err) => {
      console.error("[GSM MODEM] ❌ WiFi konekcija greška:", err);
      this.isConnected = false;
    });

    this.wifiSocket.on('close', () => {
      console.log("[GSM MODEM] WiFi konekcija zatvorena");
      this.isConnected = false;
    });

    // Čitanje podataka sa WiFi modema
    this.wifiSocket.on('data', (data: Buffer) => {
      const response = data.toString().trim();
      this.handleModemResponse(response);
    });

    // Povezivanje
    await new Promise<void>((resolve, reject) => {
      this.wifiSocket?.connect(this.config!.wifiPort!, this.config!.wifiHost!, () => {
        resolve();
      });
      
      this.wifiSocket?.on('error', (err) => {
        reject(err);
      });
    });

    return true;
  }

  // Inicijalizacija modema
  private async initializeModem(): Promise<void> {
    try {
      console.log("[GSM MODEM] Inicijalizacija modema...");
      
      // Test komunikacije
      await this.sendATCommand('AT');
      
      // Postavi text mode za SMS
      await this.sendATCommand('AT+CMGF=1');
      
      // Postavi karakter set
      await this.sendATCommand('AT+CSCS="GSM"');
      
      // Proveri signal
      const signalResponse = await this.sendATCommand('AT+CSQ');
      console.log("[GSM MODEM] Signal strength:", signalResponse);
      
      // Proveri registraciju na mrežu
      const networkResponse = await this.sendATCommand('AT+CREG?');
      console.log("[GSM MODEM] Network registration:", networkResponse);
      
      console.log("[GSM MODEM] ✅ Modem uspešno inicijalizovan");
    } catch (error) {
      console.error("[GSM MODEM] Greška pri inicijalizaciji:", error);
    }
  }

  // Pošalji AT komandu
  private async sendATCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.serialPort) {
        reject(new Error("Modem nije povezan"));
        return;
      }

      this.commandQueue.push({ command, resolve, reject });
      this.processCommandQueue();
    });
  }

  // Procesiranje reda komandi
  private async processCommandQueue(): Promise<void> {
    if (this.processingCommand || this.commandQueue.length === 0) {
      return;
    }

    this.processingCommand = true;
    const { command, resolve, reject } = this.commandQueue.shift()!;

    try {
      console.log(`[GSM MODEM] Šalje komandu: ${command}`);
      
      // Timeout za odgovor
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout za komandu: ${command}`));
      }, 10000);

      // Čekaj odgovor
      const responseHandler = (data: string) => {
        if (data.includes('OK') || data.includes('ERROR')) {
          clearTimeout(timeout);
          this.parser?.removeListener('data', responseHandler);
          
          if (data.includes('ERROR')) {
            reject(new Error(`AT komanda greška: ${data}`));
          } else {
            resolve(data);
          }
          
          this.processingCommand = false;
          this.processCommandQueue();
        }
      };

      if (this.config?.connectionType === 'wifi') {
        // WiFi konekcija
        this.wifiSocket?.on('data', (data: Buffer) => {
          responseHandler(data.toString());
        });
        this.wifiSocket?.write(command + '\r\n');
      } else {
        // USB konekcija
        this.parser?.on('data', responseHandler);
        this.serialPort?.write(command + '\r\n');
      }
      
    } catch (error) {
      this.processingCommand = false;
      reject(error);
    }
  }

  // Handlovanje odgovora modema
  private handleModemResponse(data: string): void {
    console.log(`[GSM MODEM] Odgovor: ${data}`);
    
    // Ovde možete dodati logiku za parsiranje specificnih odgovora
    if (data.includes('+CMTI:')) {
      console.log("[GSM MODEM] Nova SMS poruka primljena");
    }
  }

  // Pošalji SMS poruku
  async sendSms(smsData: SMSMessage): Promise<SMSResponse> {
    if (!this.isConnected || (!this.serialPort && !this.wifiSocket)) {
      return {
        success: false,
        error: "GSM modem nije povezan"
      };
    }

    try {
      console.log(`[GSM MODEM] Slanje SMS-a na ${smsData.to}: ${smsData.message}`);
      
      // Postavi odredište
      await this.sendATCommand(`AT+CMGS="${smsData.to}"`);
      
      // Pošalji poruku i završi sa Ctrl+Z (ASCII 26)
      await new Promise<void>((resolve, reject) => {
        const messageToSend = smsData.message + String.fromCharCode(26);
        
        if (this.config?.connectionType === 'wifi') {
          this.wifiSocket?.write(messageToSend, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        } else {
          this.serialPort?.write(messageToSend, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });

      console.log("[GSM MODEM] ✅ SMS uspešno poslat");
      
      return {
        success: true,
        messageId: `gsm_${Date.now()}`,
        cost: 0 // Lokalni SMS nema trošak
      };
      
    } catch (error) {
      console.error("[GSM MODEM] ❌ Greška pri slanju SMS-a:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Nepoznata greška"
      };
    }
  }

  // Dobij informacije o konfiguraciji
  getConfigInfo(): { provider: string; phone?: string; connected: boolean } | null {
    if (!this.config) {
      return null;
    }

    return {
      provider: "gsm_modem",
      phone: this.config.phoneNumber,
      connected: this.isConnected
    };
  }

  // Testiraj konekciju
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.sendATCommand('AT');
      return true;
    } catch (error) {
      console.error("[GSM MODEM] Test konekcije neuspešan:", error);
      return false;
    }
  }

  // Dobij listu dostupnih portova
  static async getAvailablePorts(): Promise<string[]> {
    try {
      const { SerialPort } = await import('serialport');
      const ports = await SerialPort.list();
      return ports.map(port => port.path);
    } catch (error) {
      console.error("[GSM MODEM] Greška pri dobijanju portova:", error);
      return [];
    }
  }

  // Zatvori konekciju
  async disconnect(): Promise<void> {
    if (this.serialPort && this.isConnected) {
      try {
        await new Promise<void>((resolve) => {
          this.serialPort?.close((err) => {
            if (err) {
              console.error("[GSM MODEM] Greška pri zatvaranju:", err);
            } else {
              console.log("[GSM MODEM] Konekcija zatvorena");
            }
            resolve();
          });
        });
      } catch (error) {
        console.error("[GSM MODEM] Greška pri zatvaranju konekcije:", error);
      }
    }
    
    this.isConnected = false;
    this.serialPort = null;
    this.parser = null;
  }
}

// Eksportuj singleton instancu
export const gsmModemService = new GSMModemService();