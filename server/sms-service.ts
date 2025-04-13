/**
 * SMS servis za slanje tekstualnih poruka klijentima putem Twilio API-ja
 * Omogućava slanje obaveštenja o statusu servisa, zakazanim održavanjima i drugim važnim informacijama
 */

import twilio from 'twilio';
import { type Client } from '@shared/schema';

// Interfejs za opcije SMS poruke
interface SmsOptions {
  to: string;
  body: string;
  from?: string;
}

/**
 * Servis za slanje SMS poruka
 * Koristi Twilio API za slanje SMS poruka klijentima
 */
export class SmsService {
  private static instance: SmsService;
  private twilioClient: twilio.Twilio;
  private defaultFrom: string;
  private isConfigured: boolean = false;
  private readonly senderName: string = "FST SERVIS";

  /**
   * Privatni konstruktor za inicijalizaciju SMS servisa
   */
  private constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.defaultFrom = process.env.TWILIO_PHONE_NUMBER || '';

    // Provera za validne Twilio kredencijale - accountSid mora da počinje sa "AC"
    if (accountSid && accountSid.startsWith('AC') && authToken && this.defaultFrom) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        this.isConfigured = true;
        console.log('[SMS] SMS servis uspešno inicijalizovan');
      } catch (error) {
        console.error('[SMS] Greška pri inicijalizaciji Twilio klijenta:', error);
        this.isConfigured = false;
        // Definišemo praznog klijenta da bi aplikacija mogla da se pokrene
        this.twilioClient = {} as twilio.Twilio;
      }
    } else {
      console.warn('[SMS] SMS servis nije pravilno konfigurisan. Nedostaju kredencijali ili su nevalidni.');
      this.isConfigured = false;
      // Definišemo praznog klijenta da bi aplikacija mogla da se pokrene
      this.twilioClient = {} as twilio.Twilio;
    }
  }

  /**
   * Dohvata jedinstvenu instancu SmsService (Singleton pattern)
   */
  public static getInstance(): SmsService {
    if (!SmsService.instance) {
      SmsService.instance = new SmsService();
    }
    return SmsService.instance;
  }

  /**
   * Provera da li je servis ispravno konfigurisan
   */
  public isProperlyConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Šalje SMS poruku sa detaljnom dijagnostikom
   * @param options Opcije za slanje SMS-a
   * @returns Promise<boolean> True ako je SMS uspešno poslat, false u suprotnom
   */
  public async sendSms(options: SmsOptions): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('[SMS] SMS servis nije pravilno konfigurisan za slanje poruka.');
      return false;
    }

    try {
      // Dodatna provera da li twilioClient ima metodu messages.create
      if (!this.twilioClient.messages || typeof this.twilioClient.messages.create !== 'function') {
        console.error('[SMS] Twilio klijent nije pravilno inicijalizovan.');
        return false;
      }

      const normalizedTo = this.normalizePhoneNumber(options.to);
      if (!this.isValidPhoneNumber(normalizedTo)) {
        console.error(`[SMS] Nevažeći broj telefona: ${options.to}`);
        return false;
      }

      console.log(`[SMS] Slanje SMS poruke na broj: ${normalizedTo}`);
      const message = await this.twilioClient.messages.create({
        body: options.body,
        from: options.from || this.defaultFrom,
        to: normalizedTo
      });

      console.log(`[SMS] SMS uspešno poslat, SID: ${message.sid}`);
      return true;
    } catch (error: any) {
      console.error('[SMS] Greška pri slanju SMS poruke:', error.message);
      return false;
    }
  }

  /**
   * Šalje obaveštenje o promeni statusa servisa
   */
  public async sendServiceStatusUpdate(
    client: Client,
    serviceId: number,
    newStatus: string,
    additionalInfo?: string
  ): Promise<boolean> {
    if (!client.phone) {
      console.warn(`[SMS] Klijent ${client.fullName} nema definisan broj telefona.`);
      return false;
    }

    const message = `${this.senderName}: Status vašeg servisa #${serviceId} je promenjen u "${newStatus}". ${additionalInfo || ''}`;
    
    return await this.sendSms({
      to: client.phone,
      body: message
    });
  }

  /**
   * Šalje obaveštenje o zakazanom održavanju
   */
  public async sendMaintenanceReminder(
    client: Client,
    applianceName: string,
    scheduledDate: Date,
    additionalInfo?: string
  ): Promise<boolean> {
    if (!client.phone) {
      console.warn(`[SMS] Klijent ${client.fullName} nema definisan broj telefona.`);
      return false;
    }

    const formattedDate = this.formatDate(scheduledDate);
    const message = `${this.senderName}: Podsećamo vas na zakazano održavanje za ${applianceName} dana ${formattedDate}. ${additionalInfo || ''}`;
    
    return await this.sendSms({
      to: client.phone,
      body: message
    });
  }

  /**
   * Šalje potvrdu o zakazanom servisu
   */
  public async sendServiceConfirmation(
    client: Client,
    serviceId: number,
    scheduledDate: Date | null,
    deviceInfo: string
  ): Promise<boolean> {
    if (!client.phone) {
      console.warn(`[SMS] Klijent ${client.fullName} nema definisan broj telefona.`);
      return false;
    }

    let message = `${this.senderName}: Vaš zahtev za servis #${serviceId} za ${deviceInfo} je primljen.`;
    
    if (scheduledDate) {
      const formattedDate = this.formatDate(scheduledDate);
      message += ` Zakazan je za ${formattedDate}.`;
    } else {
      message += ` Kontaktiraćemo vas uskoro za zakazivanje termina.`;
    }
    
    message += ` Za informacije pozovite 033 402 402.`;
    
    return await this.sendSms({
      to: client.phone,
      body: message
    });
  }

  /**
   * Validira format broja telefona
   * @param phoneNumber Broj telefona za validaciju
   * @returns boolean True ako je broj validan
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Jednostavna provera - broj mora početi sa + i sadržati bar 10 cifara
    return /^\+[0-9]{10,15}$/.test(phoneNumber);
  }

  /**
   * Normalizuje broj telefona u E.164 format (međunarodni standard)
   * @param phoneNumber Broj telefona za normalizaciju
   * @returns string Normalizovan broj telefona
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Uklanjamo sve što nije broj i +
    let normalized = phoneNumber.replace(/[^0-9+]/g, '');
    
    // Ako broj ne počinje sa +, dodajemo +382 (Crna Gora)
    if (!normalized.startsWith('+')) {
      // Ako počinje sa 0, uklanjamo ga
      if (normalized.startsWith('0')) {
        normalized = normalized.substring(1);
      }
      normalized = '+382' + normalized;
    }
    
    return normalized;
  }

  /**
   * Formatira datum u lokalni string
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('sr-ME', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// Izvoz instance za korišćenje u aplikaciji
export const smsService = SmsService.getInstance();