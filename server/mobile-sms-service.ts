// Mobile SMS Service - glavni servis za upravljanje SMS porukama preko mobile gateway-a
import { MobileGatewaySMSService, MobileGatewaySMSConfig, SMSMessage, SMSResponse } from './mobile-gateway-sms-service';
import { IStorage } from './storage';

export class MobileSMSService {
  private gatewayService: MobileGatewaySMSService | null = null;
  private storage: IStorage;
  private isEnabled: boolean = false;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  // Inicijalizacija servisa sa konfigurацијом iz baze
  async initialize(): Promise<void> {
    try {
      console.log('[MOBILE SMS] 🔧 Inicijalizacija mobile SMS servisa...');
      
      const config = await this.loadConfiguration();
      
      if (config && config.gatewayIP) {
        this.gatewayService = new MobileGatewaySMSService(config);
        this.isEnabled = true;
        console.log(`[MOBILE SMS] ✅ Servis inicijalizovan sa gateway: ${config.gatewayIP}:${config.gatewayPort}`);
        
        // Test konekcije
        const connectionTest = await this.gatewayService.testConnection();
        if (connectionTest.connected) {
          console.log('[MOBILE SMS] 🟢 Gateway je dostupan i spreman za rad');
        } else {
          console.log(`[MOBILE SMS] 🟡 Gateway nije dostupan: ${connectionTest.error}`);
        }
      } else {
        console.log('[MOBILE SMS] ⚠️ Konfiguracija nije pronađena - SMS funkcionalnost onemogućena');
        this.isEnabled = false;
      }
    } catch (error: any) {
      console.log(`[MOBILE SMS] ❌ Greška pri inicijalizaciji: ${error.message}`);
      this.isEnabled = false;
    }
  }

  // Učitavanje konfiguracije iz system_settings tabele
  private async loadConfiguration(): Promise<MobileGatewaySMSConfig | null> {
    try {
      const allSettings = await this.storage.getAllSystemSettings();
      const settings = allSettings.filter(s => s.category === 'mobile_sms');
      
      const gatewayIP = settings.find(s => s.key === 'mobile_sms_gateway_ip')?.value;
      const gatewayPort = parseInt(settings.find(s => s.key === 'mobile_sms_gateway_port')?.value || '8080');
      const apiKey = settings.find(s => s.key === 'mobile_sms_api_key')?.value;
      const timeout = parseInt(settings.find(s => s.key === 'mobile_sms_timeout')?.value || '10000');
      
      if (!gatewayIP) {
        return null;
      }

      return {
        gatewayIP,
        gatewayPort,
        apiKey: apiKey || undefined,
        timeout
      };
    } catch (error: any) {
      console.log(`[MOBILE SMS] ❌ Greška pri učitavanju konfiguracije: ${error.message}`);
      return null;
    }
  }

  // Slanje pojedinačne SMS poruke
  async sendSMS(phoneNumber: string, message: string, priority: 'normal' | 'high' = 'normal'): Promise<SMSResponse> {
    if (!this.isEnabled || !this.gatewayService) {
      console.log('[MOBILE SMS] ⚠️ SMS servis nije omogućen ili konfigurisan');
      return {
        success: false,
        error: 'Mobile SMS servis nije omogućen ili konfigurisan',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Formatiranje srpskog broja telefona
      const formattedPhone = MobileGatewaySMSService.formatSerbianPhoneNumber(phoneNumber);
      
      const smsMessage: SMSMessage = {
        phoneNumber: formattedPhone,
        message: message,
        priority: priority
      };

      const result = await this.gatewayService.sendSMS(smsMessage);
      
      // Logovanje rezultata
      if (result.success) {
        console.log(`[MOBILE SMS] 📱 SMS uspešno poslat na ${formattedPhone}`);
      } else {
        console.log(`[MOBILE SMS] ❌ Neuspešno slanje SMS-a na ${formattedPhone}: ${result.error}`);
      }

      return result;
    } catch (error: any) {
      console.log(`[MOBILE SMS] 💥 Greška pri slanju SMS-a: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Slanje SMS notifikacije o servisu
  async sendServiceNotification(serviceId: number, phoneNumber: string, notificationType: string): Promise<SMSResponse> {
    if (!phoneNumber) {
      return {
        success: false,
        error: 'Broj telefona nije määjen',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Preuzimanje detalja servisa iz baze
      const service = await this.storage.getService(serviceId);
      if (!service) {
        return {
          success: false,
          error: 'Servis nije pronađen',
          timestamp: new Date().toISOString()
        };
      }

      const client = await this.storage.getClient(service.clientId);
      const clientName = client?.fullName || 'Poštovani klijente';

      // Kreiranje poruke na osnovu tipa notifikacije
      let message = '';
      let priority: 'normal' | 'high' = 'normal';

      switch (notificationType) {
        case 'service_created':
          message = `${clientName}, kreiran je novi servis #${serviceId}. Status: ${service.status}. Frigo Sistem Todosijević`;
          break;
        case 'service_assigned':
          message = `${clientName}, servis #${serviceId} je dodeljen tehničaru. Kontaktiraćemo Vas uskoro. Frigo Sistem Todosijević`;
          break;
        case 'service_scheduled':
          message = `${clientName}, servis #${serviceId} je zakazan${service.scheduledDate ? ` za ${service.scheduledDate}` : ''}. Frigo Sistem Todosijević`;
          break;
        case 'service_started':
          message = `${clientName}, rad na servisu #${serviceId} je započet. Frigo Sistem Todosijević`;
          break;
        case 'service_completed':
          message = `${clientName}, servis #${serviceId} je završen${service.cost ? `. Cena: ${service.cost}€` : ''}. Hvala Vam! Frigo Sistem Todosijević`;
          priority = 'high';
          break;
        case 'parts_waiting':
          message = `${clientName}, servis #${serviceId} čeka rezervne delove. Obavestićemo Vas čim stignu. Frigo Sistem Todosijević`;
          break;
        case 'client_not_home':
          message = `${clientName}, naš tehničar je bio kod Vas za servis #${serviceId}, ali niste bili dostupni. Molimo kontaktirajte nas. Frigo Sistem Todosijević`;
          priority = 'high';
          break;
        default:
          message = `${clientName}, status servisa #${serviceId} je ažuriran: ${service.status}. Frigo Sistem Todosijević`;
      }

      return await this.sendSMS(phoneNumber, message, priority);
    } catch (error: any) {
      console.log(`[MOBILE SMS] ❌ Greška pri slanju SMS notifikacije: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Grupno slanje SMS poruka
  async sendBulkSMS(messages: { phoneNumber: string; message: string; priority?: 'normal' | 'high' }[]): Promise<SMSResponse[]> {
    if (!this.isEnabled || !this.gatewayService) {
      console.log('[MOBILE SMS] ⚠️ SMS servis nije omogućen za grupno slanje');
      return messages.map(() => ({
        success: false,
        error: 'Mobile SMS servis nije omogućen',
        timestamp: new Date().toISOString()
      }));
    }

    console.log(`[MOBILE SMS] 📬 Pokretanje grupnog slanja ${messages.length} SMS poruka`);
    
    const smsMessages: SMSMessage[] = messages.map(msg => ({
      phoneNumber: MobileGatewaySMSService.formatSerbianPhoneNumber(msg.phoneNumber),
      message: msg.message,
      priority: msg.priority || 'normal'
    }));

    return await this.gatewayService.sendBulkSMS(smsMessages);
  }

  // Test slanja SMS poruke
  async sendTestSMS(phoneNumber: string, testMessage?: string): Promise<SMSResponse> {
    const message = testMessage || `Test poruka sa Frigo Sistem SMS Gateway-a. Vreme: ${new Date().toLocaleString('sr-RS')}`;
    return await this.sendSMS(phoneNumber, message, 'normal');
  }

  // Provera statusa gateway-a
  async checkGatewayStatus(): Promise<{ connected: boolean; error?: string; gatewayInfo?: any }> {
    if (!this.gatewayService) {
      return { connected: false, error: 'Gateway servis nije inicijalizovan' };
    }

    return await this.gatewayService.testConnection();
  }

  // Omogućavanje/onemogućavanje servisa
  async setEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    console.log(`[MOBILE SMS] ${enabled ? '✅ Servis omogućen' : '❌ Servis onemogućen'}`);
  }

  // Getter za status servisa
  get enabled(): boolean {
    return this.isEnabled && this.gatewayService !== null;
  }

  // Reinicijalizacija servisa (po potrebi kada se promeni konfiguracija)
  async reinitialize(): Promise<void> {
    console.log('[MOBILE SMS] 🔄 Reinicijalizacija servisa...');
    this.gatewayService = null;
    this.isEnabled = false;
    await this.initialize();
  }
}

// Kreiranje globalnog SMS servisa
let mobileSMSService: MobileSMSService | null = null;

export function createMobileSMSService(storage: IStorage): MobileSMSService {
  if (!mobileSMSService) {
    mobileSMSService = new MobileSMSService(storage);
  }
  return mobileSMSService;
}

export function getMobileSMSService(): MobileSMSService | null {
  return mobileSMSService;
}