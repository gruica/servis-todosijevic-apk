import nodemailer, { Transporter, TransportOptions } from 'nodemailer';
import { Client } from '@shared/schema';
import fs from 'fs';
import path from 'path';

// Tip za SMTP konfiguraciju
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

// Mesto za čuvanje SMTP konfiguracije
const CONFIG_FILE_PATH = path.join(process.cwd(), 'smtp-config.json');

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Klasa za slanje email notifikacija
 */
export class EmailService {
  private static instance: EmailService;
  private from: string;
  private transporter!: Transporter;
  private configCache: SmtpConfig | null = null;
  private adminEmails: string[] = [
    'admin@frigosistemtodosijevic.me',
    'jelena@frigosistemtodosijevic.me'
  ];

  private constructor() {
    this.from = process.env.EMAIL_FROM || 'info@frigosistemtodosijevic.com';
    
    // Inicijalno učitaj konfiguraciju
    this.loadSmtpConfig();
  }

  /**
   * Dohvata jedinstvenu instancu EmailService (Singleton pattern)
   */
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }
  
  /**
   * Učitava SMTP konfiguraciju iz fajla ili koristi podrazumevane vrednosti
   */
  private loadSmtpConfig(): void {
    try {
      // Pokušaj učitati iz fajla
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
        this.configCache = JSON.parse(configData);
        console.log('SMTP konfiguracija uspešno učitana iz fajla');
      } else {
        // Koristi podrazumevane vrednosti iz environment varijabli
        this.configCache = {
          host: process.env.EMAIL_HOST || 'mail.frigosistemtodosijevic.com',
          port: parseInt(process.env.EMAIL_PORT || '465'),
          secure: process.env.EMAIL_SECURE === 'true', 
          auth: {
            user: process.env.EMAIL_USER || 'info@frigosistemtodosijevic.com',
            pass: process.env.EMAIL_PASSWORD || '',
          },
        };
        console.log('Koristi se podrazumevana SMTP konfiguracija');
      }
      
      // Kreiraj transporter
      if (this.configCache) {
        this.transporter = nodemailer.createTransport(this.configCache);
      }
      
    } catch (error) {
      console.error('Greška pri učitavanju SMTP konfiguracije:', error);
      // Koristi podrazumevane vrednosti ako dođe do greške
      this.configCache = {
        host: process.env.EMAIL_HOST || 'mail.frigosistemtodosijevic.com',
        port: parseInt(process.env.EMAIL_PORT || '465'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || 'info@frigosistemtodosijevic.com',
          pass: process.env.EMAIL_PASSWORD || '',
        },
      };
      this.transporter = nodemailer.createTransport(this.configCache);
    }
  }
  
  /**
   * Postavlja novu SMTP konfiguraciju
   */
  public setSmtpConfig(config: SmtpConfig): boolean {
    try {
      this.configCache = config;
      
      // Sačuvaj konfiguraciju u fajl (bez lozinke za logiranje)
      const configForLog = { ...config };
      if (configForLog.auth?.pass) {
        console.log('SMTP lozinka je postavljena');
      }
      
      // Sačuvaj kompletnu konfiguraciju za upotrebu
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config));
      
      // Kreiraj novi transporter sa novom konfiguracijom
      this.transporter = nodemailer.createTransport(config);
      
      console.log('SMTP konfiguracija uspešno ažurirana');
      return true;
    } catch (error) {
      console.error('Greška pri postavljanju SMTP konfiguracije:', error);
      return false;
    }
  }
  
  /**
   * Vraća trenutnu SMTP konfiguraciju
   */
  public getSmtpConfig(): SmtpConfig | null {
    return this.configCache;
  }

  /**
   * Šalje email
   */
  public async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.loadSmtpConfig();
      }
      
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log(`Email uspešno poslat na: ${options.to}`);
      return true;
    } catch (error) {
      console.error('Greška pri slanju email-a:', error);
      return false;
    }
  }

  /**
   * Šalje obaveštenje o promeni statusa servisa
   */
  public async sendServiceStatusUpdate(
    client: Client,
    serviceId: number,
    status: string,
    description: string,
    technicianName: string
  ): Promise<boolean> {
    const subject = `Ažuriranje statusa servisa #${serviceId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Ažuriranje statusa servisa</h2>
        <p>Poštovani/a ${client.fullName},</p>
        <p>Obaveštavamo Vas da je status Vašeg servisa ažuriran:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Novi status:</strong> ${status}</p>
          <p><strong>Opis:</strong> ${description}</p>
          <p><strong>Serviser:</strong> ${technicianName}</p>
        </div>
        <p>Za sva dodatna pitanja, možete nas kontaktirati telefonom na broj +382 69 021 689 ili odgovorom na ovaj email.</p>
        <p>Srdačan pozdrav,<br>Tim Frigo Sistema Todosijević</p>
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: +382 69 021 689<br>
          Email: info@frigosistemtodosijevic.com
        </p>
      </div>
    `;

    if (!client.email) {
      console.warn(`Ne mogu poslati email klijentu ${client.fullName} - email adresa nije dostupna`);
      return false;
    }

    return await this.sendEmail({
      to: client.email,
      subject,
      html,
    });
  }

  /**
   * Šalje obaveštenje o zakazanom održavanju
   */
  public async sendMaintenanceReminder(
    client: Client,
    applianceName: string,
    maintenanceDate: string,
    description: string
  ): Promise<boolean> {
    const subject = `Podsetnik za zakazano održavanje uređaja`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Podsetnik za zakazano održavanje</h2>
        <p>Poštovani/a ${client.fullName},</p>
        <p>Podsećamo Vas da je zakazano održavanje za Vaš uređaj:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Uređaj:</strong> ${applianceName}</p>
          <p><strong>Datum održavanja:</strong> ${maintenanceDate}</p>
          <p><strong>Opis:</strong> ${description}</p>
        </div>
        <p>Molimo Vas da obezbedite pristup uređaju u navedenom terminu.</p>
        <p>Za sve izmene u rasporedu ili dodatna pitanja, kontaktirajte nas na +382 69 021 689.</p>
        <p>Srdačan pozdrav,<br>Tim Frigo Sistema Todosijević</p>
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: +382 69 021 689<br>
          Email: info@frigosistemtodosijevic.com
        </p>
      </div>
    `;

    if (!client.email) {
      console.warn(`Ne mogu poslati email klijentu ${client.fullName} - email adresa nije dostupna`);
      return false;
    }

    return await this.sendEmail({
      to: client.email,
      subject,
      html,
    });
  }

  /**
   * Šalje obaveštenje serviseru o novom dodeljenom servisu
   */
  public async sendNewServiceAssignment(
    technicianEmail: string,
    technicianName: string,
    serviceId: number,
    clientName: string,
    serviceDate: string,
    address: string,
    description: string
  ): Promise<boolean> {
    const subject = `Novi servis dodeljen #${serviceId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Novi servis dodeljen</h2>
        <p>Poštovani/a ${technicianName},</p>
        <p>Dodeljen Vam je novi servis:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Klijent:</strong> ${clientName}</p>
          <p><strong>Datum servisa:</strong> ${serviceDate}</p>
          <p><strong>Adresa:</strong> ${address}</p>
          <p><strong>Opis problema:</strong> ${description}</p>
        </div>
        <p>Molimo Vas da potvrdite prijem ovog zadatka i planirate posetu u navedenom terminu.</p>
        <p>Za sva dodatna pitanja, kontaktirajte kancelariju.</p>
        <p>Srdačan pozdrav,<br>Tim Frigo Sistema Todosijević</p>
      </div>
    `;

    return await this.sendEmail({
      to: technicianEmail,
      subject,
      html,
    });
  }

  /**
   * Proverava validnost SMTP konfiguracije
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.loadSmtpConfig();
      }
      
      await this.transporter.verify();
      console.log('SMTP konekcija uspešno verifikovana');
      return true;
    } catch (error) {
      console.error('Greška pri verifikaciji SMTP konekcije:', error);
      return false;
    }
  }

  /**
   * Šalje obaveštenje administratorima o poslatom mailu
   */
  public async notifyAdminAboutEmail(
    emailType: string,
    recipient: string,
    serviceId: number,
    detailsText: string
  ): Promise<boolean> {
    if (this.adminEmails.length === 0) {
      console.log('Nema konfigurisanih administratorskih email adresa za slanje obaveštenja');
      return false;
    }

    const subject = `Administratorsko obaveštenje: ${emailType} za servis #${serviceId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Administratorsko obaveštenje</h2>
        <p>Poslato je sledeće email obaveštenje:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Tip obaveštenja:</strong> ${emailType}</p>
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Poslato na:</strong> ${recipient}</p>
          <p><strong>Datum i vreme:</strong> ${new Date().toLocaleString('sr-ME')}</p>
          <p><strong>Detalji:</strong> ${detailsText}</p>
        </div>
        <p>Ovo je automatsko obaveštenje sistema.</p>
      </div>
    `;

    try {
      const toAdmins = this.adminEmails.join(',');
      
      await this.transporter.sendMail({
        from: this.from,
        to: toAdmins,
        subject,
        html,
      });
      
      console.log(`Administratorsko obaveštenje poslato na: ${toAdmins}`);
      return true;
    } catch (error) {
      console.error('Greška pri slanju administratorskog obaveštenja:', error);
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();