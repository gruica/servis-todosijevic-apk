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
   * Učitava SMTP konfiguraciju iz fajla ili koristi environment varijable
   */
  private loadSmtpConfig(): void {
    try {
      // Izvuci vrednosti iz environment varijabli
      const host = process.env.EMAIL_HOST;
      const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 465;
      const secure = process.env.EMAIL_SECURE === 'true';
      const user = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASSWORD;
      
      if (!host || !user || !pass) {
        console.error('SMTP konfiguracija nije kompletna. Nedostaju obavezne environment varijable:');
        if (!host) console.error('- EMAIL_HOST nije postavljen');
        if (!user) console.error('- EMAIL_USER nije postavljen');
        if (!pass) console.error('- EMAIL_PASSWORD nije postavljen');
      }
      
      // Postavi from adresu iz env varijable ako postoji
      if (process.env.EMAIL_FROM) {
        this.from = process.env.EMAIL_FROM;
        console.log(`Email FROM adresa postavljena na: ${this.from}`);
      }
      
      // Kreiraj konfiguraciju
      this.configCache = {
        host: host || 'mail.frigosistemtodosijevic.com',
        port: port,
        secure: secure,
        auth: {
          user: user || 'info@frigosistemtodosijevic.com',
          pass: pass || '',
        },
      };
      
      console.log(`SMTP konfiguracija učitana: server=${this.configCache.host}, port=${this.configCache.port}, secure=${this.configCache.secure}`);
      
      // Kreiraj transporter
      this.transporter = nodemailer.createTransport(this.configCache);
      
      // Pokušaj odmah verifikovati konekciju
      this.transporter.verify()
        .then(() => console.log('✓ SMTP konekcija uspešno verifikovana'))
        .catch(err => console.error('✗ SMTP konekcija nije uspešna:', err.message));
        
    } catch (error) {
      console.error('Greška pri učitavanju SMTP konfiguracije:', error);
      
      // Koristi osnovne vrednosti ako dođe do greške
      this.configCache = {
        host: process.env.EMAIL_HOST || 'mail.frigosistemtodosijevic.com',
        port: parseInt(process.env.EMAIL_PORT || '465'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || 'info@frigosistemtodosijevic.com',
          pass: process.env.EMAIL_PASSWORD || '',
        },
      };
      
      // Kreiraj transporter i u slučaju greške
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
   * Šalje email sa poboljšanom podrškom za ponovne pokušaje i detaljnom dijagnostikom
   * @param options Opcije za slanje email-a
   * @param maxRetries Maksimalan broj pokušaja slanja (podrazumevano 3)
   * @returns Promise<boolean> True ako je email uspešno poslat, false u suprotnom
   */
  public async sendEmail(options: EmailOptions, maxRetries: number = 3): Promise<boolean> {
    let attempts = 0;
    let lastError: any = null;
    
    // Inicijalna validacija parametara pre pokušaja slanja
    if (!options.to || options.to.trim() === '') {
      console.error('[EMAIL] ✗ Greška: Email adresa primaoca nije navedena');
      return false;
    }
    
    if (!this.from || this.from.trim() === '') {
      console.error('[EMAIL] ✗ Greška: Email adresa pošiljaoca nije postavljena');
      console.error('[EMAIL] 💡 Rešenje: Postavite EMAIL_FROM u .env fajlu ili pozovite setSmtpConfig sa ispravnim podacima');
      return false;
    }
    
    // Praćenje vremena za ukupno trajanje pokušaja
    const startTime = Date.now();
    
    // Implementacija ponovnih pokušaja ako slanje nije uspešno
    while (attempts < maxRetries) {
      attempts++;
      const attemptStartTime = Date.now();
      
      try {
        // Provera i inicijalizacija transportera ako nije postavljen
        if (!this.configCache) {
          console.error('[EMAIL] ✗ Greška: SMTP konfiguracija nije postavljena');
          console.error('[EMAIL] 💡 Rešenje: Postavite email konfiguraciju preko administratorskog panela');
          return false;
        }
        
        if (!this.transporter) {
          console.log('[EMAIL] Transporter nije inicijalizovan, pokušavam ponovno učitavanje konfiguracije...');
          this.loadSmtpConfig();
          
          // Ako i dalje nije inicijalizovan, prijavi grešku
          if (!this.transporter) {
            console.error('[EMAIL] ✗ Neuspešna inicijalizacija transportera nakon ponovnog pokušaja');
            console.error('[EMAIL] 🔍 Dijagnostika: Proverite da li su SMTP podaci ispravni i da li je server dostupan');
            return false;
          }
        }
        
        // Detaljno logovanje pokušaja
        console.log(`[EMAIL] 📤 Pokušaj #${attempts}/${maxRetries} - Slanje email-a na: ${options.to}`);
        console.log(`[EMAIL] ℹ️ SMTP konfiguracija: server=${this.configCache?.host}, port=${this.configCache?.port}, secure=${this.configCache?.secure}`);
        console.log(`[EMAIL] ℹ️ Koristim 'from' adresu: ${this.from}`);
        
        // Ako je ovo ponovni pokušaj, dodaj informaciju u logove
        if (attempts > 1) {
          console.log(`[EMAIL] 🔄 Ovo je ponovni pokušaj #${attempts} nakon prethodne greške`);
          console.log(`[EMAIL] ⏱️ Ukupno proteklo vreme: ${(Date.now() - startTime) / 1000}s`);
        }
        
        // Priprema poruke sa podržanim opcijama
        const mailOptions = {
          from: this.from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
          headers: {
            'X-System': 'FrigoServis-EmailService',
            'X-Attempt': `${attempts}`,
            'X-Priority': '1' // Visok prioritet
          },
          // Dodajemo dijagnostičke podatke koji se ne prikazuju korisniku
          messageId: `<frigoservis-${Date.now()}-${Math.random().toString(36).substring(2, 15)}@${this.configCache?.host || 'localhost'}>`,
          // Automatski dodajemo tekstualnu verziju ako postoji samo HTML (za bolje isporučivanje)
          ...(options.html && !options.text ? { generateTextFromHtml: true } : {})
        };
        
        // Slanje email-a sa praćenjem vremena
        const sendStartTime = Date.now();
        const info = await this.transporter.sendMail(mailOptions);
        const sendDuration = Date.now() - sendStartTime;
        
        // Uspešno slanje - detaljno logovanje
        console.log(`[EMAIL] ✅ Email uspešno poslat na: ${options.to} (trajanje: ${sendDuration}ms)`);
        console.log(`[EMAIL] 📝 ID poruke: ${info.messageId}`);
        
        if (info.accepted && info.accepted.length > 0) {
          console.log(`[EMAIL] ✓ Prihvaćeno od: ${info.accepted.join(', ')}`);
        }
        
        if (info.rejected && info.rejected.length > 0) {
          console.warn(`[EMAIL] ⚠️ Odbijeno od: ${info.rejected.join(', ')}`);
        }
        
        if (info.pending && info.pending.length > 0) {
          console.warn(`[EMAIL] ⏳ Na čekanju: ${info.pending.join(', ')}`);
        }
        
        if (info.response) {
          console.log(`[EMAIL] 📨 Odgovor servera: ${info.response}`);
        }
        
        // Slanje je uspešno, vraćamo true
        return true;
      } catch (err) {
        lastError = err as any;
        const attemptDuration = Date.now() - attemptStartTime;
        
        // Poboljšano detaljno logovanje greške
        console.error(`[EMAIL] ❌ Greška pri slanju email-a (pokušaj #${attempts}/${maxRetries}, trajanje: ${attemptDuration}ms)`);
        console.error(`[EMAIL] 🔍 Detalji greške:`, lastError.message || 'Nepoznata greška');
        
        // Logovanje koda greške i drugih detalja
        if (lastError.code) {
          console.error(`[EMAIL] ℹ️ Kod greške: ${lastError.code}`);
        }
        
        if (lastError.command) {
          console.error(`[EMAIL] ℹ️ Komanda koja je izazvala grešku: ${lastError.command}`);
        }
        
        if (lastError.response) {
          console.error(`[EMAIL] ℹ️ Odgovor servera: ${lastError.response}`);
        }
        
        // Detaljnija dijagnostika po kodovima grešaka sa sugestijama za rešavanje
        if (lastError.code === 'EAUTH') {
          console.error('[EMAIL] 🔍 Dijagnostika: Greška autentifikacije - pogrešno korisničko ime ili lozinka.');
          console.error('[EMAIL] 💡 Rešenje: Proverite korisničko ime i lozinku. Uverite se da je nalog aktivan i da ima dozvolu za slanje emaila.');
        } else if (lastError.code === 'ECONNREFUSED') {
          console.error('[EMAIL] 🔍 Dijagnostika: Server nije dostupan - veza odbijena.');
          console.error('[EMAIL] 💡 Rešenje: Proverite da li je host tačan, da li je port otvoren i da li firewall blokira konekciju.');
        } else if (lastError.code === 'ETIMEDOUT') {
          console.error('[EMAIL] 🔍 Dijagnostika: Veza sa serverom je istekla - server nije odgovorio u očekivanom vremenu.');
          console.error('[EMAIL] 💡 Rešenje: Proverite mrežnu vezu, postavke servera ili eventualna ograničenja brzine.');
        } else if (lastError.code === 'ESOCKET') {
          console.error('[EMAIL] 🔍 Dijagnostika: Greška sa SSL/TLS konfiguracijom.');
          console.error('[EMAIL] 💡 Rešenje: Proverite "secure" postavku. Ako je secure=true, port treba biti 465. Za druge portove (587), koristite secure=false.');
        } else if (lastError.code === 'EDNS') {
          console.error('[EMAIL] 🔍 Dijagnostika: DNS greška - ne može se pronaći host.');
          console.error('[EMAIL] 💡 Rešenje: Proverite da li je host name tačno unesen i dostupan.');
        } else if (lastError.code === 'EENVELOPE') {
          console.error('[EMAIL] 🔍 Dijagnostika: Greška u formiranju "envelope" - verovatno nevažeća email adresa.');
          console.error('[EMAIL] 💡 Rešenje: Proverite da li su adrese pošiljaoca i primaoca ispravne.');
        } else if (lastError.code === 'EMESSAGE') {
          console.error('[EMAIL] 🔍 Dijagnostika: Problem sa formatom poruke.');
          console.error('[EMAIL] 💡 Rešenje: Proverite da li poruka sadrži nevažeće znakove ili je prekomerne veličine.');
        } else {
          console.error('[EMAIL] 🔍 Dijagnostika: Nepoznata greška.');
          console.error('[EMAIL] 💡 Rešenje: Proverite mrežnu vezu, SMTP postavke i probajte ponovo kasnije.');
        }
        
        // cPanel specifični problemi
        if (this.configCache && (
            (this.configCache.host && this.configCache.host.includes('cpanel')) || 
            (this.configCache.host && this.configCache.host.includes('hostgator')) || 
            (this.configCache.host && this.configCache.host.includes('godaddy'))
        )) {
          console.error('[EMAIL] ℹ️ cPanel specifična napomena: Hosting provajderi često imaju dodatna ograničenja:');
          console.error('[EMAIL] 💡 Saveti za cPanel:');
          console.error('[EMAIL]   - Proverite da je nalog za slanje emaila ispravno konfigurisan u cPanel-u');
          console.error('[EMAIL]   - Proverite da niste prekoračili dnevnu kvotu slanja emailova');
          console.error('[EMAIL]   - Neki hosting provajderi blokiraju slanje na određene domene ili imaju dodatne sigurnosne postavke');
        }
        
        // Ako ovo nije poslednji pokušaj, sačekaj pre ponovnog pokušaja sa eksponencijalnim backoff-om
        if (attempts < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempts - 1), 30000); // Eksponencijalno povećavamo vreme čekanja, max 30s
          console.log(`[EMAIL] ⏳ Čekam ${waitTime}ms pre ponovnog pokušaja slanja (#${attempts+1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // Ako smo stigli ovde, to znači da su svi pokušaji bili neuspešni
    const totalTime = (Date.now() - startTime) / 1000;
    console.error(`[EMAIL] ❌ Svi pokušaji slanja email-a su neuspešni (${maxRetries} pokušaja, ukupno vreme: ${totalTime}s)`);
    
    if (lastError) {
      console.error('[EMAIL] 🔍 Konačna dijagnostika:', lastError.message || 'Nepoznata greška');
      console.error('[EMAIL] 💡 Preporuka: Proverite SMTP postavke u administratorskom panelu i pokušajte ponovo.');
    }
    
    return false;
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
   * Proverava validnost SMTP konfiguracije sa detaljnim logovanjem
   * Unapređena verzija koja pruža više dijagnostičkih informacija
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      console.log('[EMAIL] Započinjem verifikaciju SMTP konekcije');
      
      if (!this.configCache) {
        console.error('[EMAIL] Greška: SMTP konfiguracija nije postavljena');
        console.error('[EMAIL] 🔍 Dijagnostika: Email servis ne može da pronađe konfiguraciju u keširanju.');
        console.error('[EMAIL] 💡 Rešenje: Potrebno je postaviti SMTP konfiguraciju preko administratorskog panela.');
        return false;
      }
      
      // Logovanje konfiguracije za lakšu dijagnostiku, bez otkrivanja lozinke
      console.log('[EMAIL] SMTP konfiguracija za verifikaciju:', {
        host: this.configCache.host,
        port: this.configCache.port,
        secure: this.configCache.secure,
        auth: this.configCache.auth ? {
          user: this.configCache.auth.user,
          pass: this.configCache.auth.pass ? '****' : 'nije postavljena'
        } : 'nije postavljena'
      });
      
      // Provjera transportera
      if (!this.transporter) {
        console.log('[EMAIL] Transporter nije inicijalizovan, pokušavam ponovno učitavanje konfiguracije...');
        this.loadSmtpConfig();
        
        if (!this.transporter) {
          console.error('[EMAIL] Neuspešno učitavanje transportera');
          console.error('[EMAIL] 🔍 Dijagnostika: Nije moguće kreirati nodemailer transporter sa trenutnom konfiguracijom.');
          console.error('[EMAIL] 💡 Rešenje: Proverite da li su sve postavke tačne, posebno format host-a i porta.');
          return false;
        }
      }
      
      // Detaljno logovanje početka verifikacije
      console.log(`[EMAIL] Pokušavam verifikaciju SMTP servera: ${this.configCache.host}:${this.configCache.port} (${this.configCache.secure ? 'SECURE' : 'INSECURE'})`);
      
      // Provera sa timeout-om da ne bismo čekali predugo - povećan timeout na 15 sekundi
      const verifyPromise = this.transporter.verify();
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('Isteklo vreme za SMTP verifikaciju (15s)')), 15000)
      );
      
      // Zapamtimo vreme početka verifikacije za računanje vremena odziva
      const startTime = Date.now();
      await Promise.race([verifyPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;
      
      console.log(`[EMAIL] ✓ SMTP konekcija uspešno verifikovana (vreme odziva: ${responseTime}ms)`);
      
      // Dodatne dijagnostičke informacije nakon uspešne verifikacije
      if (responseTime > 5000) {
        console.warn('[EMAIL] ⚠️ Upozorenje: Vreme odziva SMTP servera je dugo (>5s). Ovo može uticati na performanse aplikacije.');
      }
      
      return true;
    } catch (err) {
      const error = err as any;
      console.error('[EMAIL] ✗ Greška pri verifikaciji SMTP konekcije:', error);
      
      // Poboljšana dijagnostika sa specifičnim kodovima grešaka
      if (error.code === 'EAUTH') {
        console.error('[EMAIL] 🔍 Dijagnostika: Greška autentifikacije - pogrešno korisničko ime ili lozinka.');
        console.error('[EMAIL] 💡 Rešenje: Proverite korisničko ime i lozinku. Uverite se da je nalog aktivan i da ima dozvolu za slanje emaila.');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('[EMAIL] 🔍 Dijagnostika: Server nije dostupan - veza odbijena.');
        console.error('[EMAIL] 💡 Rešenje: Proverite da li je host tačan, da li je port otvoren i da li firewall blokira konekciju.');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('[EMAIL] 🔍 Dijagnostika: Veza sa serverom je istekla - server nije odgovorio u očekivanom vremenu.');
        console.error('[EMAIL] 💡 Rešenje: Proverite mrežnu vezu, postavke servera ili eventualna ograničenja brzine.');
      } else if (error.code === 'ESOCKET') {
        console.error('[EMAIL] 🔍 Dijagnostika: Greška sa SSL/TLS konfiguracijom.');
        console.error('[EMAIL] 💡 Rešenje: Proverite "secure" postavku. Ako je secure=true, port treba biti 465. Za druge portove (587), koristite secure=false.');
      } else if (error.code === 'EDNS') {
        console.error('[EMAIL] 🔍 Dijagnostika: DNS greška - ne može se pronaći host.');
        console.error('[EMAIL] 💡 Rešenje: Proverite da li je host name tačno unesen i dostupan.');
      } else if (error.message?.includes('timeout')) {
        console.error('[EMAIL] 🔍 Dijagnostika: Isteklo vreme za verifikaciju - server nije odgovorio u roku od 15 sekundi.');
        console.error('[EMAIL] 💡 Rešenje: Proverite da li je SMTP server preopterećen ili blokiran od strane mrežnih uređaja.');
      } else {
        console.error('[EMAIL] 🔍 Dijagnostika: Nepoznata greška.');
        console.error('[EMAIL] 💡 Rešenje: Proverite osnovne postavke email servera i mrežnu povezanost.');
      }
      
      // Dodatne informacije za dijagnostiku specifične za cPanel
      try {
        if (this.configCache && typeof this.configCache.host === 'string') {
          const host = this.configCache.host.toLowerCase();
          if (host.includes('cpanel') || host.includes('hostgator') || 
              host.includes('godaddy') || host.includes('namecheap')) {
            console.error('[EMAIL] ℹ️ Hosting informacija: Detektovan je hosting provider (cPanel/GoDaddy/Namecheap/Hostgator).');
            console.error('[EMAIL] 💡 Dodatni saveti:');
            console.error('[EMAIL]   - Uverite se da je SMTP servis aktiviran u cPanel-u');
            console.error('[EMAIL]   - Proverite ograničenja slanja emailova u hosting paketu');
            console.error('[EMAIL]   - Neki hosting provajderi zahtevaju aktivaciju "External SMTP" opcije');
          }
        }
      } catch (err) {
        // Ignorišemo greške u ovom delu jer to nije ključno za funkcionalnost
        console.error('[EMAIL] Napomena: Nije moguće proveriti informacije o hosting provajderu.');
      }
      
      return false;
    }
  }

  /**
   * Šalje obaveštenje administratorima o poslatom mailu, sa podrškom za ponovne pokušaje
   */
  public async notifyAdminAboutEmail(
    emailType: string,
    recipient: string,
    serviceId: number,
    detailsText: string,
    maxRetries: number = 2
  ): Promise<boolean> {
    if (this.adminEmails.length === 0) {
      console.log('[EMAIL] Nema konfigurisanih administratorskih email adresa za slanje obaveštenja');
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

    // Koristi našu unapređenu funkciju za slanje emaila sa podrškom za ponovne pokušaje
    return await this.sendEmail({
      to: this.adminEmails.join(','),
      subject,
      html,
    }, maxRetries);
  }
}

export const emailService = EmailService.getInstance();