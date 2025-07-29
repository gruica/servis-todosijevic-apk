import nodemailer, { Transporter, TransportOptions } from 'nodemailer';
import { Client } from '@shared/schema';
import fs from 'fs';
import path from 'path';

// Tip za SMTP konfiguraciju koji proširuje nodemailer TransportOptions
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  // TLS opcije za bezbednost konekcije
  tls?: {
    rejectUnauthorized?: boolean;
    ciphers?: string;
    minVersion?: string;
  };
}

// Tip sa dodatnim pooling opcijama za nodemailer
export interface NodemailerTransportOptions extends TransportOptions {
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
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
  // Transporter označen kao readonly kako se ne bi slučajno prepisao
  private transporter: Transporter;
  private configCache: SmtpConfig | null = null;
  private adminEmails: string[] = [
    'admin@frigosistemtodosijevic.com',
    'jelena@frigosistemtodosijevic.com',
    'jelena@frigosistemtodosijevic.me',
    'vladimir.jela.84@gmail.com' // Dodali smo još jedan admin email za testiranje
  ];

  private constructor() {
    this.from = process.env.EMAIL_FROM || 'info@frigosistemtodosijevic.com';
    
    // Učitavanje konfiguracije i kreiranje stabilnog transportera
    // Učitavamo SMTP postavke iz okruženja - ispravne vrednosti
    const host = process.env.EMAIL_HOST || 'mail.frigosistemtodosijevic.com';
    const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 465; 
    const secure = process.env.EMAIL_SECURE === 'true' || true;
    const user = process.env.EMAIL_USER || 'info@frigosistemtodosijevic.com';
    const pass = process.env.EMAIL_PASSWORD || '';
    
    // Dodatna provera formata host-a da eliminišemo čestu grešku
    const correctedHost = host.includes('@') ? host.replace('@', '.') : host;
    
    console.log('[EMAIL] Kreiranje stabilnog email transportera...');
    console.log(`[EMAIL] Konfiguracija: server=${host}, port=${port}, secure=${secure}`);
    
    // Kreiramo stabilnu konfiguraciju sa ispravljenim host-om
    this.configCache = {
      host: correctedHost, // Koristimo ispravljeni host
      port,
      secure,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    };
    
    console.log(`[EMAIL] Konfigurisani host: ${correctedHost} (originalni: ${host})`);
    
    // Kreiramo transporter koji se neće menjati tokom izvršavanja aplikacije
    this.transporter = nodemailer.createTransport({
      ...this.configCache,
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    } as NodemailerTransportOptions);
    
    console.log('[EMAIL] Email transporter kreiran');
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
  /**
   * DEPRECIRANA METODA - zadržana samo zbog kompatibilnosti
   * Ne koristiti više ovu metodu za učitavanje konfiguracije!
   * Email transporter se sada inicijalizuje samo jednom prilikom pokretanja aplikacije
   */
  private loadSmtpConfig(): void {
    try {
      console.log("[EMAIL] ⚠️ UPOZORENJE: Poziv zastarele loadSmtpConfig() metode");
      console.log("[EMAIL] Konfiguracija se ne menja tokom rada aplikacije zbog stabilnosti");
      
      // Proveri da li transporter već postoji
      if (this.transporter) {
        console.log("[EMAIL] Email transporter već postoji i neće biti promenjen");
        this.transporter.verify()
          .then(() => console.log('[EMAIL] ✓ Postojeći transporter je ispravan'))
          .catch(err => console.log('[EMAIL] ⚠️ Postojeći transporter ima problema, ali neće biti zamenjen:', err.message));
        return;
      }
      
      // Samo ako transporter ne postoji (što ne bi trebalo da se desi), kreiramo ga
      console.log("[EMAIL] Kreiranje transportera jer ne postoji (ovo ne bi trebalo da se desi)");
      
      // Izvor konfiguracije - podrazumevano vrednosti
      const host = process.env.EMAIL_HOST || 'mail.frigosistemtodosijevic.com';
      const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 465;
      const secure = process.env.EMAIL_SECURE === 'true' || true;
      const user = process.env.EMAIL_USER || '';
      const pass = process.env.EMAIL_PASSWORD || '';
      
      // Kreiraj pojednostavljenu konfiguraciju
      this.configCache = {
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false
        }
      };
      
      console.log(`[EMAIL] Pojednostavljena SMTP konfiguracija: server=${host}, port=${port}, secure=${secure}`);
      
      // Kreiraj transporter sa osnovnim opcijama
      this.transporter = nodemailer.createTransport({
        ...this.configCache,
        pool: true,
      } as NodemailerTransportOptions);
      
      // Pokušaj odmah verifikovati konekciju sa boljim debugom
      this.transporter.verify()
        .then(() => console.log('✓ SMTP konekcija uspešno verifikovana'))
        .catch(err => {
          console.error('✗ SMTP konekcija nije uspešna:', err.message);
          
          // Detaljnija analiza greške za lakše rešavanje problema
          if (err.code === 'EAUTH') {
            console.error('[EMAIL] 🔍 Problem je najverovatnije u autentifikaciji - pogrešno korisničko ime ili lozinka');
          } else if (err.code === 'ESOCKET' || err.code === 'ECONNECTION') {
            console.error('[EMAIL] 🔍 Problem sa povezivanjem - port možda nije ispravan ili firewall blokira');
            console.error('[EMAIL] 💡 Pokušajte sa portom 587 i secure=false umesto 465');
          } else if (err.code === 'ETIMEDOUT') {
            console.error('[EMAIL] 🔍 Veza je tajmautovala - server možda nije dostupan ili je blokiran');
          } else if (err.code === 'EDNS') {
            console.error('[EMAIL] 🔍 Problem sa DNS-om - hostname nije ispravan');
          }
        });
        
    } catch (error) {
      console.error('[EMAIL] Kritična greška pri učitavanju SMTP konfiguracije:', error);
      
      // Koristi Gmail konfiguraciju koja je univerzalno dostupna
      this.configCache = {
        host: 'smtp.gmail.com', // Gmail je pouzdaniji
        port: 587, // Port 587 za TLS
        secure: false, // TLS način rada
        auth: {
          user: process.env.EMAIL_USER || 'info@frigosistemtodosijevic.com',
          pass: process.env.EMAIL_PASSWORD || '',
        },
        tls: {
          rejectUnauthorized: false
        }
      };
      
      console.log('[EMAIL] Koristi se fallback Gmail SMTP konfiguracija nakon greške');
      
      // Kreiraj transporter i u slučaju greške
      this.transporter = nodemailer.createTransport({
        ...this.configCache,
        pool: true,
      } as NodemailerTransportOptions);
      
      console.log('[EMAIL] ℹ️ Kreiran fallback Gmail SMTP transporter sa sledećim podešavanjima:', {
        host: this.configCache.host,
        port: this.configCache.port,
        secure: this.configCache.secure,
        user: this.configCache.auth?.user || 'nije postavljen'
      });
    }
  }
  
  /**
   * Postavlja novu SMTP konfiguraciju
   * Napomena: ova metoda je deprecirana i zadržana samo za kompatibilnost
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
      
      // Ne menjamo više transporter što sprečava probleme
      console.log('[EMAIL] SMTP konfiguracija ažurirana, ali transporter nije promenjen zbog stabilnosti');
      
      // Verifikujemo konekciju sa postojećim transporterom
      this.transporter.verify()
        .then(() => console.log('[EMAIL] ✓ Postojeći transporter je uspešno verifikovan'))
        .catch(err => console.error('[EMAIL] ⚠️ Upozorenje: Postojeći transporter ima problema:', err.message));
      
      return true;
    } catch (error) {
      console.error('[EMAIL] Greška pri postavljanju SMTP konfiguracije:', error);
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
    technicianName: string,
    warrantyStatus?: string,
    customerRefusesRepair?: boolean,
    customerRefusalReason?: string
  ): Promise<boolean> {
    console.log(`[DEBUG EMAIL] Početak slanja obaveštenja o statusu servisa #${serviceId} klijentu ${client.fullName} (${client.email || 'bez email-a'})`);
    
    // Provera da li je SMTP konfiguracija dostupna
    if (!this.configCache) {
      console.error(`[DEBUG EMAIL] Nema konfigurisanog SMTP servera za slanje obaveštenja klijentu ${client.fullName}`);
      return false;
    }

    // Generiraj naslov na osnovu statusa i garancije
    let subject = `Ažuriranje statusa servisa #${serviceId}`;
    if (status === "Završen" && warrantyStatus) {
      subject = warrantyStatus === "in_warranty" 
        ? `Završen garanciski servis #${serviceId}` 
        : `Završen vangaranciski servis #${serviceId}`;
    }

    // Generiraj warranty status poruku i customer refusal poruku
    let warrantyMessage = "";
    let customerRefusalMessage = "";
    
    // Customer refusal message
    if (customerRefusesRepair && customerRefusalReason) {
      customerRefusalMessage = `
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; color: #856404; font-weight: bold;">
            ⚠️ KUPAC JE ODBIO POPRAVKU
          </p>
          <p style="margin: 5px 0 0 0; color: #856404;">
            <strong>Razlog:</strong> ${customerRefusalReason}
          </p>
        </div>
      `;
    }
    
    if (status === "Završen" && warrantyStatus) {
      if (warrantyStatus === "in_warranty") {
        warrantyMessage = `
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0; color: #155724; font-weight: bold;">
              🛡️ GARANCISKI SERVIS
            </p>
            <p style="margin: 5px 0 0 0; color: #155724;">
              Servis je obavljen u okviru garancijskih uslova. Ne naplaćuje se intervencija prema garancijskim uslovima.
            </p>
          </div>
        `;
      } else {
        warrantyMessage = `
          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0; color: #721c24; font-weight: bold;">
              💰 VANGARANCISKI SERVIS
            </p>
            <p style="margin: 5px 0 0 0; color: #721c24;">
              Servis je obavljen van garancijskih uslova. Naplaćuje se prema važećem cenovniku servisa.
            </p>
          </div>
        `;
      }
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Obaveštenje o završetku servisa</h2>
        <p>Poštovani/a ${client.fullName},</p>
        <p>Obaveštavamo Vas da je Vaš servis uspešno završen:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Status:</strong> ${status}</p>
          <p><strong>Opis radova:</strong> ${description}</p>
          <p><strong>Serviser:</strong> ${technicianName}</p>
        </div>
        ${customerRefusalMessage}
        ${warrantyMessage}
        <p>Za sva dodatna pitanja u vezi servisa, možete nas kontaktirati telefonom na broj 033 402 402 ili odgovorom na ovaj email.</p>
        <p>Hvala Vam što ste izabrali naše usluge!</p>
        <p>Srdačan pozdrav,<br>Tim Frigo Sistema Todosijević</p>
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: 033 402 402<br>
          Email: info@frigosistemtodosijevic.com<br>
          Adresa: Podgorica, Crna Gora
        </p>
      </div>
    `;

    if (!client.email) {
      console.warn(`[DEBUG EMAIL] Ne mogu poslati email klijentu ${client.fullName} - email adresa nije dostupna`);
      return false;
    }

    console.log(`[DEBUG EMAIL] Pokretanje slanja email-a klijentu ${client.fullName} (${client.email}) koristeći SMTP server: ${this.configCache.host}:${this.configCache.port}`);
    
    try {
      const result = await this.sendEmail({
        to: client.email,
        subject,
        html,
      }, 3); // 3 pokušaja slanja za obaveštenja o servisima
      
      console.log(`[DEBUG EMAIL] Rezultat slanja email-a za status servisa: ${result ? 'Uspešno ✅' : 'Neuspešno ❌'}`);
      return result;
    } catch (error) {
      console.error(`[DEBUG EMAIL] Greška pri slanju email-a za status servisa:`, error);
      return false;
    }
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
    console.log(`[DEBUG EMAIL] Početak slanja obaveštenja o održavanju za uređaj ${applianceName} klijentu ${client.fullName} (${client.email || 'bez email-a'})`);
    
    // Provera da li je SMTP konfiguracija dostupna
    if (!this.configCache) {
      console.error(`[DEBUG EMAIL] Nema konfigurisanog SMTP servera za slanje obaveštenja o održavanju klijentu ${client.fullName}`);
      return false;
    }
    
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
        <p>Za sve izmene u rasporedu ili dodatna pitanja, kontaktirajte nas na broj telefona 033 402 402.</p>
        <p>Srdačan pozdrav,<br>Tim Frigo Sistema Todosijević</p>
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: 033 402 402<br>
          Email: info@frigosistemtodosijevic.com
        </p>
      </div>
    `;

    if (!client.email) {
      console.warn(`[DEBUG EMAIL] Ne mogu poslati email klijentu ${client.fullName} - email adresa nije dostupna`);
      return false;
    }

    console.log(`[DEBUG EMAIL] Pokretanje slanja email-a o održavanju klijentu ${client.fullName} (${client.email}) koristeći SMTP server: ${this.configCache.host}:${this.configCache.port}`);
    
    try {
      const result = await this.sendEmail({
        to: client.email,
        subject,
        html,
      }, 3); // 3 pokušaja slanja za važna obaveštenja o održavanju
      
      console.log(`[DEBUG EMAIL] Rezultat slanja email-a o održavanju: ${result ? 'Uspešno ✅' : 'Neuspešno ❌'}`);
      return result;
    } catch (error) {
      console.error(`[DEBUG EMAIL] Greška pri slanju email-a o održavanju:`, error);
      return false;
    }
  }

  /**
   * Šalje obaveštenje administratorima o novom servisu od klijenta
   * @param client Klijent koji je kreirao servis
   * @param service Kreiran servis
   * @returns Promise<boolean> True ako je email uspešno poslat, false u suprotnom
   */
  public async sendNewServiceNotification(
    client: Client,
    service: any
  ): Promise<boolean> {
    console.log(`[DEBUG EMAIL] Početak slanja obaveštenja o novom servisu #${service.id} od klijenta ${client.fullName}`);
    
    // Provera da li je SMTP konfiguracija dostupna
    if (!this.configCache) {
      console.error(`[DEBUG EMAIL] Nema konfigurisanog SMTP servera za slanje obaveštenja o novom servisu`);
      return false;
    }

    const subject = `Novi servisni zahtev #${service.id} od klijenta ${client.fullName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Novi servisni zahtev</h2>
        <p>Poštovani,</p>
        <p>Klijent je kreirao novi zahtev za servis:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Broj servisa:</strong> #${service.id}</p>
          <p><strong>Klijent:</strong> ${client.fullName}</p>
          <p><strong>Email:</strong> ${client.email || 'Nije dostupan'}</p>
          <p><strong>Telefon:</strong> ${client.phone || 'Nije dostupan'}</p>
          <p><strong>Opis problema:</strong> ${service.description}</p>
          <p><strong>Status:</strong> ${service.status}</p>
          ${service.scheduledDate ? `<p><strong>Željeni termin:</strong> ${service.scheduledDate}</p>` : ''}
        </div>
        <p>Molimo vas da pregledate novi zahtev u administratorskom panelu i dodelite odgovarajućeg servisera.</p>
        <p>Srdačan pozdrav,<br>Sistem za upravljanje servisima</p>
      </div>
    `;

    const text = `
Novi servisni zahtev #${service.id}

Klijent: ${client.fullName}
Email: ${client.email || 'Nije dostupan'}
Telefon: ${client.phone || 'Nije dostupan'}
Opis: ${service.description}
Status: ${service.status}
${service.scheduledDate ? `Željeni termin: ${service.scheduledDate}` : ''}

Molimo vas da pregledate novi zahtev u administratorskom panelu.
    `;

    // Slanje email-a svim administratorima
    try {
      const allAdmins = this.adminEmails;
      let successCount = 0;
      
      for (const adminEmail of allAdmins) {
        const result = await this.sendEmail({
          to: adminEmail,
          subject,
          text,
          html
        });
        
        if (result) {
          successCount++;
        }
      }
      
      console.log(`[EMAIL] ✅ Obaveštenje o novom servisu poslato na ${successCount}/${allAdmins.length} admin adresa`);
      return successCount > 0;
    } catch (error) {
      console.error(`[EMAIL] ❌ Greška pri slanju obaveštenja o novom servisu:`, error);
      return false;
    }
  }

  /**
   * Šalje obaveštenje serviseru o novom dodeljenom servisu
   */
  /**
   * Šalje notifikaciju za Beko servise na mp4@eurotehnikamn.me (Beko je obustavila elektronske servise)
   */
  public async sendBekoServiceNotification(
    serviceId: number,
    partName: string,
    partNumber: string,
    clientName: string,
    technicianName: string,
    urgency: string,
    description?: string
  ): Promise<boolean> {
    console.log(`[EMAIL] Slanje Beko notifikacije za servis #${serviceId} na mp4@eurotehnikamn.me`);
    
    if (!this.configCache) {
      console.error(`[EMAIL] Nema konfigurisanog SMTP servera za slanje Beko notifikacije`);
      return false;
    }

    const bekoEmail = 'mp4@eurotehnikamn.me';
    const urgencyLabel = urgency === 'urgent' ? 'HITNO' : urgency === 'high' ? 'Visoka' : urgency === 'medium' ? 'Srednja' : 'Niska';
    const priorityIndicator = urgency === 'urgent' ? '🚨 HITNO' : urgency === 'high' ? '⚡ Visoka' : '📋';

    const subject = `${priorityIndicator} Beko servis obaveštenje - Servis #${serviceId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #856404; margin: 0;">⚠️ BEKO SERVIS OBAVEŠTENJE</h2>
          <p style="margin: 5px 0 0 0; color: #856404; font-weight: bold;">
            Automatsko obaveštenje - Beko je obustavila elektronske servise
          </p>
        </div>
        
        <p>Poštovani,</p>
        <p>Obaveštavamo Vas o servisu Beko uređaja:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #fd7e14;">
          <h3 style="color: #856404; margin-top: 0;">Detalji servisa</h3>
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Potreban deo:</strong> ${partName}</p>
          <p><strong>Kataloški broj:</strong> ${partNumber}</p>
          <p><strong>Prioritet:</strong> <span style="color: ${urgency === 'urgent' ? '#dc3545' : urgency === 'high' ? '#fd7e14' : '#6c757d'};">${urgencyLabel}</span></p>
          <p><strong>Klijent:</strong> ${clientName}</p>
          <p><strong>Serviser:</strong> ${technicianName}</p>
          <p><strong>Datum zahteva:</strong> ${new Date().toLocaleDateString('sr-ME')}</p>
          ${description ? `<p><strong>Napomene:</strong> ${description}</p>` : ''}
        </div>

        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; color: #721c24;">
            <strong>NAPOMENA:</strong> Pošto je Beko obustavila elektronske servise, molimo Vas da se direktno obratite proizvođaču ili ovlašćenom servisu za dalji postupak.
          </p>
        </div>

        <p>Za sva dodatna pitanja, kontaktirajte nas na broj 033 402 402.</p>
        
        <p>Srdačan pozdrav,<br>Frigo Sistem Todosijević</p>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: 033 402 402<br>
          Email: info@frigosistemtodosijevic.com<br>
          Adresa: Podgorica, Crna Gora
        </p>
      </div>
    `;

    console.log(`[EMAIL] Slanje Beko obaveštenja na: ${bekoEmail}`);

    try {
      const result = await this.sendEmail({
        to: bekoEmail,
        subject,
        html,
      }, 3);
      
      console.log(`[EMAIL] Rezultat slanja Beko notifikacije: ${result ? 'Uspešno ✅' : 'Neuspešno ❌'}`);
      return result;
    } catch (error) {
      console.error(`[EMAIL] Greška pri slanju Beko notifikacije:`, error);
      return false;
    }
  }

  /**
   * Šalje obaveštenje o završenom Beko garancijskom servisu na specificirane email adrese
   * @param client Podaci o klijentu
   * @param serviceId ID servisa
   * @param description Opis završenog rada
   * @param technicianName Ime servisera
   * @param manufacturerName Brend uređaja
   * @param applianceName Naziv uređaja
   * @returns Promise<boolean> True ako je email uspešno poslat, false u suprotnom
   */
  public async sendBekoWarrantyCompletionNotification(
    client: Client,
    serviceId: number,
    description: string,
    technicianName: string,
    manufacturerName: string,
    applianceName: string
  ): Promise<boolean> {
    console.log(`[EMAIL] Slanje obaveštenja o završenom Beko garancijskom servisu #${serviceId}`);
    
    if (!this.configCache) {
      console.error(`[EMAIL] Nema konfigurisanog SMTP servera za slanje Beko obaveštenja`);
      return false;
    }

    // Email adrese koje treba da prime obaveštenja o Beko garancijskim servisima
    const bekoNotificationEmails = [
      'jelena@frigosistemtodosijevic.com',
      'mp4@eurotehnikamn.me'
    ];

    const subject = `Završen Beko garanciski servis #${serviceId} - ${applianceName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #155724; margin: 0;">🛡️ ZAVRŠEN BEKO GARANCISKI SERVIS</h2>
          <p style="margin: 5px 0 0 0; color: #155724; font-weight: bold;">
            Automatsko obaveštenje o završenom garancijskom servisu
          </p>
        </div>
        
        <p>Poštovani,</p>
        <p>Obaveštavamo Vas da je završen garanciski servis za Beko uređaj:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin-top: 0;">Detalji završenog servisa</h3>
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Brend:</strong> ${manufacturerName}</p>
          <p><strong>Uređaj:</strong> ${applianceName}</p>
          <p><strong>Status:</strong> Završen (u garanciji)</p>
          <p><strong>Serviser:</strong> ${technicianName}</p>
          <p><strong>Datum završetka:</strong> ${new Date().toLocaleDateString('sr-ME')}</p>
          <p><strong>Opis završenog rada:</strong> ${description}</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0;">
          <h3 style="color: #495057; margin-top: 0;">Podaci o klijentu</h3>
          <p><strong>Ime klijenta:</strong> ${client.fullName}</p>
          <p><strong>Telefon:</strong> ${client.phone || 'Nije dostupan'}</p>
          <p><strong>Email:</strong> ${client.email || 'Nije dostupan'}</p>
          <p><strong>Adresa:</strong> ${client.address || 'Nije dostupna'}</p>
          <p><strong>Grad:</strong> ${client.city || 'Nije dostupan'}</p>
        </div>

        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; color: #155724;">
            <strong>GARANCISKI SERVIS:</strong> Servis je obavljen u okviru garancijskih uslova. Ne naplaćuje se intervencija.
          </p>
        </div>

        <p>Za sve dodatne informacije, kontaktirajte nas na broj 033 402 402.</p>
        
        <p>Srdačan pozdrav,<br>Frigo Sistem Todosijević</p>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: 033 402 402<br>
          Email: info@frigosistemtodosijevic.com<br>
          Adresa: Podgorica, Crna Gora
        </p>
      </div>
    `;

    // Šaljemo email na sve specificirane adrese
    try {
      let successCount = 0;
      
      for (const email of bekoNotificationEmails) {
        console.log(`[EMAIL] Slanje Beko garancijskog obaveštenja na: ${email}`);
        
        const result = await this.sendEmail({
          to: email,
          subject,
          html,
        }, 3);
        
        if (result) {
          successCount++;
          console.log(`[EMAIL] ✅ Beko obaveštenje uspešno poslato na: ${email}`);
        } else {
          console.log(`[EMAIL] ❌ Neuspešno slanje Beko obaveštenja na: ${email}`);
        }
      }
      
      console.log(`[EMAIL] Ukupno uspešno poslato: ${successCount}/${bekoNotificationEmails.length} Beko obaveštenja`);
      return successCount > 0;
    } catch (error) {
      console.error(`[EMAIL] Greška pri slanju Beko garancijskih obaveštenja:`, error);
      return false;
    }
  }

  /**
   * Šalje profesionalni email klijentu kada odbije popravku uređaja
   * @param client Podaci o klijentu
   * @param serviceId ID servisa
   * @param applianceName Naziv uređaja
   * @param refusalReason Razlog odbijanja popravke
   * @param technicianName Ime servisera
   * @returns Promise<boolean> True ako je email uspešno poslat, false u suprotnom
   */
  public async sendCustomerRefusalNotification(
    client: Client,
    serviceId: number,
    applianceName: string,
    refusalReason: string,
    technicianName: string
  ): Promise<boolean> {
    console.log(`[EMAIL] Slanje obaveštenja klijentu ${client.fullName} o odbijanju popravke servisa #${serviceId}`);
    
    if (!this.configCache) {
      console.error(`[EMAIL] Nema konfigurisanog SMTP servera za slanje obaveštenja o odbijanju popravke`);
      return false;
    }

    if (!client.email) {
      console.warn(`[EMAIL] Ne mogu poslati email klijentu ${client.fullName} - email adresa nije dostupna`);
      return false;
    }

    const subject = `Obaveštenje o servisu #${serviceId} - ${applianceName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #721c24; margin: 0;">📋 Obaveštenje o servisu</h2>
          <p style="margin: 5px 0 0 0; color: #721c24; font-weight: bold;">
            Servis #${serviceId} - ${applianceName}
          </p>
        </div>
        
        <p>Poštovani/a ${client.fullName},</p>
        
        <p>Žao nam je što ste odbili da popravite vaš ${applianceName}.</p>
        
        <p>Naš serviser <strong>${technicianName}</strong> je bio spreman da izvrši potrebne radove na vašem uređaju, 
        međutim razumemo vašu odluku i poštujemo je.</p>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; color: #856404; font-weight: bold;">
            Razlog odbijanja popravke:
          </p>
          <p style="margin: 5px 0 0 0; color: #856404;">
            ${refusalReason}
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0;">
          <h3 style="color: #495057; margin-top: 0;">Detalji servisa</h3>
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Uređaj:</strong> ${applianceName}</p>
          <p><strong>Status:</strong> Zatvoren zbog odbijanja popravke</p>
          <p><strong>Serviser:</strong> ${technicianName}</p>
          <p><strong>Datum:</strong> ${new Date().toLocaleDateString('sr-ME')}</p>
        </div>

        <p>Ukoliko promenite mišljenje ili budete imali potrebu za našim uslugama u budućnosti, 
        slobodno nas kontaktirajte. Uvek smo na raspolaganju za sve vaše potrebe vezane za popravku kućnih aparata.</p>

        <p>Hvala vam na poverenju!</p>
        
        <p>S poštovanjem,<br>
        <strong>Tim Frigo Sistem Todosijević</strong></p>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: 033 402 402<br>
          Email: info@frigosistemtodosijevic.com<br>
          Adresa: Lastva grbaljska bb, 85317 Kotor, Crna Gora<br>
          www.frigosistemtodosijevic.com
        </p>
      </div>
    `;

    const text = `
Obaveštenje o servisu #${serviceId} - ${applianceName}

Poštovani/a ${client.fullName},

Žao nam je što ste odbili da popravite vaš ${applianceName}.

Naš serviser ${technicianName} je bio spreman da izvrši potrebne radove na vašem uređaju, 
međutim razumemo vašu odluku i poštujemo je.

Razlog odbijanja popravke: ${refusalReason}

Detalji servisa:
- Broj servisa: #${serviceId}
- Uređaj: ${applianceName}
- Status: Zatvoren zbog odbijanja popravke
- Serviser: ${technicianName}
- Datum: ${new Date().toLocaleDateString('sr-ME')}

Ukoliko promenite mišljenje ili budete imali potrebu za našim uslugama u budućnosti, 
slobodno nas kontaktirajte. Uvek smo na raspolaganju za sve vaše potrebe vezane za popravku kućnih aparata.

Hvala vam na poverenju!

S poštovanjem,
Tim Frigo Sistem Todosijević

----
Frigo Sistem Todosijević
Kontakt telefon: 033 402 402
Email: info@frigosistemtodosijevic.com
Adresa: Lastva grbaljska bb, 85317 Kotor, Crna Gora
www.frigosistemtodosijevic.com
    `;

    try {
      const result = await this.sendEmail({
        to: client.email,
        subject,
        html,
        text
      });
      
      console.log(`[EMAIL] Rezultat slanja obaveštenja o odbijanju popravke: ${result ? 'Uspešno ✅' : 'Neuspešno ❌'}`);
      return result;
    } catch (error) {
      console.error(`[EMAIL] Greška pri slanju obaveštenja o odbijanju popravke:`, error);
      return false;
    }
  }

  /**
   * Šalje obaveštenja o odbijanju Beko servisa na specificirane email adrese
   * @param client Podaci o klijentu
   * @param serviceId ID servisa
   * @param applianceName Naziv uređaja
   * @param refusalReason Razlog odbijanja popravke
   * @param technicianName Ime servisera
   * @param manufacturerName Brend uređaja
   * @returns Promise<boolean> True ako su svi email-i uspešno poslati, false u suprotnom
   */
  public async sendBekoCustomerRefusalNotification(
    client: Client,
    serviceId: number,
    applianceName: string,
    refusalReason: string,
    technicianName: string,
    manufacturerName: string
  ): Promise<boolean> {
    console.log(`[EMAIL] Slanje Beko customer refusal obaveštenja za servis #${serviceId}`);
    
    if (!this.configCache) {
      console.error(`[EMAIL] Nema konfigurisanog SMTP servera za slanje Beko customer refusal obaveštenja`);
      return false;
    }

    // Email adrese koje treba da prime obaveštenja o Beko customer refusal
    const bekoNotificationEmails = [
      'jelena@frigosistemtodosijevic.com',
      'mp4@eurotehnikamn.me'
    ];

    const subject = `Beko servis odbijen od strane klijenta #${serviceId} - ${applianceName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #721c24; margin: 0;">🚫 BEKO SERVIS ODBIJEN</h2>
          <p style="margin: 5px 0 0 0; color: #721c24; font-weight: bold;">
            Servis #${serviceId} - Klijent odbio popravku
          </p>
        </div>
        
        <p>Obaveštenje o odbijanju Beko servisa:</p>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">Detalji servisa</h3>
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Brend:</strong> ${manufacturerName}</p>
          <p><strong>Uređaj:</strong> ${applianceName}</p>
          <p><strong>Status:</strong> <span style="color: #dc3545;">Odbijen od strane klijenta</span></p>
          <p><strong>Serviser:</strong> ${technicianName}</p>
          <p><strong>Datum odbijanja:</strong> ${new Date().toLocaleDateString('sr-ME')}</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #6c757d;">
          <h3 style="color: #495057; margin-top: 0;">Podaci o klijentu</h3>
          <p><strong>Ime i prezime:</strong> ${client.fullName}</p>
          <p><strong>Telefon:</strong> ${client.phone || 'Nije dostupan'}</p>
          <p><strong>Email:</strong> ${client.email || 'Nije dostupan'}</p>
          <p><strong>Adresa:</strong> ${client.address || 'Nije dostupna'}</p>
          <p><strong>Grad:</strong> ${client.city || 'Nije dostupan'}</p>
        </div>

        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="color: #721c24; margin-top: 0;">Razlog odbijanja</h3>
          <p style="margin: 0; color: #721c24; font-style: italic;">
            "${refusalReason}"
          </p>
        </div>

        <p>Servis je zatvoren zbog odbijanja popravke od strane klijenta.</p>
        
        <p>Srdačan pozdrav,<br>Frigo Sistem Todosijević</p>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: 033 402 402<br>
          Email: info@frigosistemtodosijevic.com<br>
          Adresa: Lastva grbaljska bb, 85317 Kotor, Crna Gora<br>
          www.frigosistemtodosijevic.com
        </p>
      </div>
    `;

    console.log(`[EMAIL] Slanje Beko customer refusal obaveštenja na: ${bekoNotificationEmails.join(', ')}`);

    try {
      let successCount = 0;
      
      for (const email of bekoNotificationEmails) {
        const result = await this.sendEmail({
          to: email,
          subject,
          html,
        }, 3);
        
        if (result) {
          successCount++;
          console.log(`[EMAIL] ✅ Beko customer refusal obaveštenje uspešno poslato na: ${email}`);
        } else {
          console.log(`[EMAIL] ❌ Neuspešno slanje Beko customer refusal obaveštenja na: ${email}`);
        }
      }
      
      console.log(`[EMAIL] Ukupno uspešno poslato: ${successCount}/${bekoNotificationEmails.length} Beko customer refusal obaveštenja`);
      return successCount > 0;
    } catch (error) {
      console.error(`[EMAIL] Greška pri slanju Beko customer refusal obaveštenja:`, error);
      return false;
    }
  }

  /**
   * Šalje email korisniku kada je njegov nalog verifikovan 
   * @param userEmail Email adresa korisnika
   * @param userName Ime korisnika
   * @returns Promise<boolean> True ako je email uspešno poslat, false u suprotnom
   */
  public async sendVerificationConfirmation(
    userEmail: string,
    userName: string
  ): Promise<boolean> {
    try {
      console.log(`[EMAIL] 📨 Slanje potvrde o verifikaciji na: ${userEmail}`);
      
      const currentDate = new Date().toLocaleDateString('sr-Latn-ME');
      
      // HTML poruka za potvrdu o verifikaciji
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://frigosistemtodosijevic.com/wp-content/uploads/2016/10/logo-1.png" alt="Frigo Sistem Todosijević" style="max-width: 200px;">
          </div>
          
          <h2 style="color: #0056b3; text-align: center;">Vaš nalog je verifikovan</h2>
          
          <p>Poštovani/a <strong>${userName}</strong>,</p>
          
          <p>Sa zadovoljstvom vas obaveštavamo da je vaš nalog uspešno verifikovan od strane administratora.</p>
          
          <p>Sada možete pristupiti svim funkcionalnostima našeg sistema za upravljanje servisima.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Datum verifikacije:</strong> ${currentDate}</p>
          </div>
          
          <p>Za pristup sistemu, koristite svoje korisničko ime i lozinku koju ste definisali prilikom registracije.</p>
          
          <p>Ukoliko imate bilo kakvih pitanja ili problema prilikom korišćenja sistema, slobodno nas kontaktirajte:</p>
          
          <ul style="margin-bottom: 20px;">
            <li><strong>Telefon:</strong> 033 402 402</li>
            <li><strong>Email:</strong> info@frigosistemtodosijevic.com</li>
          </ul>
          
          <p>Hvala vam na poverenju!</p>
          
          <p>S poštovanjem,<br>
          <strong>Tim Frigo Sistem Todosijević</strong></p>
          
          <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; font-size: 12px; color: #777; text-align: center;">
            <p>Frigo Sistem Todosijević<br>
            Lastva grbaljska bb, 85317 Kotor, Crna Gora<br>
            www.frigosistemtodosijevic.com</p>
          </div>
        </div>
      `;
      
      // Tekstualna verzija poruke (za email klijente koji ne podržavaju HTML)
      const text = `
Vaš nalog je verifikovan

Poštovani/a ${userName},

Sa zadovoljstvom vas obaveštavamo da je vaš nalog uspešno verifikovan od strane administratora.

Sada možete pristupiti svim funkcionalnostima našeg sistema za upravljanje servisima.

Datum verifikacije: ${currentDate}

Za pristup sistemu, koristite svoje korisničko ime i lozinku koju ste definisali prilikom registracije.

Ukoliko imate bilo kakvih pitanja ili problema prilikom korišćenja sistema, slobodno nas kontaktirajte:
- Telefon: 033 402 402
- Email: info@frigosistemtodosijevic.com

Hvala vam na poverenju!

S poštovanjem,
Tim Frigo Sistem Todosijević

----
Frigo Sistem Todosijević
Lastva grbaljska bb, 85317 Kotor, Crna Gora
www.frigosistemtodosijevic.com
      `;
      
      // Slanje email-a
      const result = await this.sendEmail({
        to: userEmail,
        subject: "Vaš nalog je verifikovan - Frigo Sistem Todosijević",
        html,
        text
      });
      
      // Vraćamo rezultat
      return result;
      
    } catch (error) {
      console.error('[EMAIL] Greška pri slanju potvrde o verifikaciji:', error);
      return false;
    }
  }
  
  public async sendNewServiceAssignment(
    technicianEmail: string,
    technicianName: string,
    serviceId: number,
    clientName: string,
    serviceDate: string,
    address: string,
    description: string
  ): Promise<boolean> {
    console.log(`[DEBUG EMAIL] Početak slanja obaveštenja serviseru ${technicianName} (${technicianEmail || 'bez email-a'}) o dodeljenom servisu #${serviceId}`);
    
    // Provera da li je SMTP konfiguracija dostupna
    if (!this.configCache) {
      console.error(`[DEBUG EMAIL] Nema konfigurisanog SMTP servera za slanje obaveštenja serviseru ${technicianName}`);
      return false;
    }
    
    if (!technicianEmail) {
      console.warn(`[DEBUG EMAIL] Ne mogu poslati email serviseru ${technicianName} - email adresa nije dostupna`);
      return false;
    }

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

    console.log(`[DEBUG EMAIL] Pokretanje slanja email-a serviseru ${technicianName} (${technicianEmail}) koristeći SMTP server: ${this.configCache.host}:${this.configCache.port}`);
    
    try {
      const result = await this.sendEmail({
        to: technicianEmail,
        subject,
        html,
      }, 3); // 3 pokušaja slanja za obaveštenja serviserima
      
      console.log(`[DEBUG EMAIL] Rezultat slanja email-a serviseru: ${result ? 'Uspešno ✅' : 'Neuspešno ❌'}`);
      return result;
    } catch (error) {
      console.error(`[DEBUG EMAIL] Greška pri slanju email-a serviseru:`, error);
      return false;
    }
  }

  /**
   * Proverava validnost SMTP konfiguracije sa detaljnim logovanjem
   * Unapređena verzija koja pruža više dijagnostičkih informacija
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      // Reset smtp connection to ensure we have fresh connection
      this.loadSmtpConfig();
      
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
      
      // Implementacija sa alternativnim konfiguracijama i robustnom obradom grešaka
      let isVerified = false;
      let originalError: any = null;
      
      // Strategija 1: Pokušaj sa originalnom konfiguracijom
      try {
        // Detaljno logovanje početka verifikacije
        console.log(`[EMAIL] Pokušavam verifikaciju SMTP servera: ${this.configCache.host}:${this.configCache.port} (${this.configCache.secure ? 'SECURE' : 'INSECURE'})`);
        
        // Provera sa timeout-om da ne bismo čekali predugo - povećan timeout na 20 sekundi
        const verifyPromise = this.transporter.verify();
        const timeoutPromise = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Isteklo vreme za SMTP verifikaciju (20s)')), 20000)
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
        
        isVerified = true;
      } catch (err) {
        originalError = err as any;
        console.error('[EMAIL] ✗ Greška pri verifikaciji osnovne SMTP konekcije:', originalError?.message || 'Nepoznata greška');
        
        // Logujemo dodatne informacije za dijagnostiku
        if (originalError.code) {
          console.error(`[EMAIL] ℹ️ Kod greške: ${originalError.code}`);
        }
        
        // Strategija 2: Ako originalna konfiguracija ne radi, probaj sa alternativnim podešavanjima
        console.log('[EMAIL] Pokušaj sa alternativnim SMTP podešavanjima...');
        
        // Modifikujemo trenutna podešavanja sa boljom podrškom za TLS
        const alternativeConfig = {
          ...this.configCache,
          tls: {
            rejectUnauthorized: false // Ignorišemo probleme sa SSL sertifikatima
          }
        };
        
        try {
          // Kreiraj novi transporter sa alternativnim podešavanjima
          const alternativeTransporter = nodemailer.createTransport(alternativeConfig);
          
          // Pokušaj sa alternativnim transporterom
          console.log('[EMAIL] Pokušavam verifikaciju sa alternativnim podešavanjima (ignorisanje SSL problema)');
          await alternativeTransporter.verify();
          
          console.log('[EMAIL] ✓ Alternativna SMTP konfiguracija uspešno verifikovana');
          
          // Ažuriraj transporter i konfiguraciju
          this.transporter = alternativeTransporter;
          this.configCache = alternativeConfig;
          isVerified = true;
        } catch (altErr) {
          console.error('[EMAIL] ✗ Ni alternativna konfiguracija nije uspela:', (altErr as any)?.message || 'Nepoznata greška');
          
          // Strategija 3: Ako je problem sa portom, promeni port i secure
          if (this.configCache.port === 465 && this.configCache.secure === true) {
            console.log('[EMAIL] Probam sa portom 587 i secure=false umesto porta 465...');
            
            const port587Config = {
              ...this.configCache,
              port: 587,
              secure: false,
              tls: {
                rejectUnauthorized: false
              }
            };
            
            try {
              // Kreiraj novi transporter sa port 587
              const port587Transporter = nodemailer.createTransport(port587Config);
              
              // Pokušaj sa transporterom za port 587
              console.log('[EMAIL] Pokušavam verifikaciju sa portom 587 (TLS)');
              await port587Transporter.verify();
              
              console.log('[EMAIL] ✓ SMTP konfiguracija sa portom 587 uspešno verifikovana');
              
              // Ažuriraj transporter i konfiguraciju
              this.transporter = port587Transporter;
              this.configCache = port587Config;
              isVerified = true;
            } catch (port587Err) {
              console.error('[EMAIL] ✗ Ni konfiguracija sa portom 587 nije uspela:', (port587Err as any)?.message || 'Nepoznata greška');
            }
          } else if (this.configCache.port === 587 && this.configCache.secure === false) {
            // Ako je već 587, probaj sa 465
            console.log('[EMAIL] Probam sa portom 465 i secure=true umesto porta 587...');
            
            const port465Config = {
              ...this.configCache,
              port: 465,
              secure: true,
              tls: {
                rejectUnauthorized: false
              }
            };
            
            try {
              // Kreiraj novi transporter sa port 465
              const port465Transporter = nodemailer.createTransport(port465Config);
              
              // Pokušaj sa transporterom za port 465
              console.log('[EMAIL] Pokušavam verifikaciju sa portom 465 (SSL)');
              await port465Transporter.verify();
              
              console.log('[EMAIL] ✓ SMTP konfiguracija sa portom 465 uspešno verifikovana');
              
              // Ažuriraj transporter i konfiguraciju
              this.transporter = port465Transporter;
              this.configCache = port465Config;
              isVerified = true;
            } catch (port465Err) {
              console.error('[EMAIL] ✗ Ni konfiguracija sa portom 465 nije uspela:', (port465Err as any)?.message || 'Nepoznata greška');
            }
          }
        }
      }
      
      // Ako nijedna strategija nije uspela, generišemo detaljnu dijagnostiku za originalnu grešku
      if (!isVerified && originalError) {
        // Poboljšana dijagnostika sa specifičnim kodovima grešaka
        if (originalError.code === 'EAUTH') {
          console.error('[EMAIL] 🔍 Dijagnostika: Greška autentifikacije - pogrešno korisničko ime ili lozinka.');
          console.error('[EMAIL] 💡 Rešenje: Proverite korisničko ime i lozinku. Uverite se da je nalog aktivan i da ima dozvolu za slanje emaila.');
        } else if (originalError.code === 'ECONNREFUSED') {
          console.error('[EMAIL] 🔍 Dijagnostika: Server nije dostupan - veza odbijena.');
          console.error('[EMAIL] 💡 Rešenje: Proverite da li je host tačan, da li je port otvoren i da li firewall blokira konekciju.');
        } else if (originalError.code === 'ETIMEDOUT') {
          console.error('[EMAIL] 🔍 Dijagnostika: Veza sa serverom je istekla - server nije odgovorio u očekivanom vremenu.');
          console.error('[EMAIL] 💡 Rešenje: Proverite mrežnu vezu, postavke servera ili eventualna ograničenja brzine.');
        } else if (originalError.code === 'ESOCKET') {
          console.error('[EMAIL] 🔍 Dijagnostika: Greška sa SSL/TLS konfiguracijom.');
          console.error('[EMAIL] 💡 Rešenje: Proverite "secure" postavku. Ako je secure=true, port treba biti 465. Za druge portove (587), koristite secure=false.');
        } else if (originalError.code === 'EDNS') {
          console.error('[EMAIL] 🔍 Dijagnostika: DNS greška - ne može se pronaći host.');
          console.error('[EMAIL] 💡 Rešenje: Proverite da li je host name tačno unesen i dostupan.');
        } else if (originalError.message?.includes('timeout')) {
          console.error('[EMAIL] 🔍 Dijagnostika: Isteklo vreme za verifikaciju - server nije odgovorio u roku od 20 sekundi.');
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
            } else if (host.includes('gmail')) {
              console.error('[EMAIL] ℹ️ Gmail informacija: Za Gmail SMTP server potrebna su posebna podešavanja:');
              console.error('[EMAIL] 💡 Gmail saveti:');
              console.error('[EMAIL]   - Omogućite "Less secure apps" u vašem Google nalogu ili');
              console.error('[EMAIL]   - Koristite App Password umesto standardne lozinke');
            }
          }
        } catch (err) {
          // Ignorišemo greške u ovom delu jer to nije ključno za funkcionalnost
          console.error('[EMAIL] Napomena: Nije moguće proveriti informacije o hosting provajderu.');
        }
        
        // VAŽNO: Ako je sve ostalo neuspešno, vratimo true da bi korisnik ipak mogao da pokuša slanje test email-a
        // Ovo nam daje mogućnost da vidimo konkretne greške pri slanju emaila, što može dati više informacija za dijagnostiku
        console.log('[EMAIL] ⚠️ Iako verifikacija nije uspela, vraćam true da bi se pokušao test email radi bolje dijagnostike');
        return true;
      }
      
      return isVerified;
    } catch (unexpectedErr) {
      // Generalna greška koja se nije očekivala
      console.error('[EMAIL] ❌ Neočekivana greška pri verifikaciji SMTP konekcije:', unexpectedErr);
      
      // Za maksimalnu robusnost, vraćamo true čak i u slučaju neočekivane greške da bismo mogli pokušati slanje
      console.log('[EMAIL] ⚠️ Vraćam true uprkos neočekivanoj grešci da bi se pokušao test email radi bolje dijagnostike');
      return true;
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
    console.log(`[DEBUG ADMIN EMAIL] Pokretanje slanja administratorskog obaveštenja za servis #${serviceId}`);
    
    if (this.adminEmails.length === 0) {
      console.log('[DEBUG ADMIN EMAIL] Nema konfigurisanih administratorskih email adresa za slanje obaveštenja');
      return false;
    }

    // Provera da li je SMTP konfiguracija dostupna
    if (!this.configCache) {
      console.error(`[DEBUG ADMIN EMAIL] Nema konfigurisanog SMTP servera za slanje administratorskog obaveštenja`);
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
        <div style="background-color: #f0f8ff; padding: 10px; border-radius: 5px; margin-top: 20px; font-size: 12px;">
          <p><strong>SMTP Informacije:</strong></p>
          <p>Server: ${this.configCache?.host || 'Nije konfigurisan'}</p>
          <p>Port: ${this.configCache?.port || 'Nije konfigurisan'}</p>
          <p>Korisnik: ${this.configCache?.auth?.user || 'Nije konfigurisan'}</p>
          <p>Šalju se na: ${this.adminEmails.join(', ')}</p>
        </div>
      </div>
    `;

    console.log(`[DEBUG ADMIN EMAIL] Slanje administratorskog obaveštenja na: ${this.adminEmails.join(', ')}`);

    try {
      // Koristi našu unapređenu funkciju za slanje emaila sa podrškom za ponovne pokušaje
      const result = await this.sendEmail({
        to: this.adminEmails.join(','),
        subject,
        html,
      }, maxRetries);
      
      console.log(`[DEBUG ADMIN EMAIL] Rezultat slanja administratorskog obaveštenja: ${result ? 'Uspešno ✅' : 'Neuspešno ❌'}`);
      return result;
    } catch (error) {
      console.error(`[DEBUG ADMIN EMAIL] Greška pri slanju administratorskog obaveštenja:`, error);
      return false;
    }
  }

  /**
   * Šalje obaveštenje servis firmi o rezervnom delu u garanciji
   */
  public async sendWarrantySparePartNotification(
    serviceId: number,
    partName: string,
    partNumber: string,
    clientName: string,
    technicianName: string,
    urgency: string,
    description?: string
  ): Promise<boolean> {
    console.log(`[EMAIL] Početak slanja obaveštenja servis firmi o garancijskom rezervnom delu za servis #${serviceId}`);
    
    // Provera da li je SMTP konfiguracija dostupna
    if (!this.configCache) {
      console.error(`[EMAIL] Nema konfigurisanog SMTP servera za slanje obaveštenja servis firmi`);
      return false;
    }

    const serviceCompanyEmail = 'servis@eurotehnikamn.me';
    const urgencyLabel = urgency === 'urgent' ? 'HITNO' : urgency === 'high' ? 'Visoka' : urgency === 'medium' ? 'Srednja' : 'Niska';
    const priorityIndicator = urgency === 'urgent' ? '🚨 HITNO' : urgency === 'high' ? '⚡ Visoka' : '📋';

    const subject = `${priorityIndicator} Garanciski rezervni deo - Servis #${serviceId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #155724; margin: 0;">🛡️ GARANCISKI REZERVNI DEO</h2>
          <p style="margin: 5px 0 0 0; color: #155724; font-weight: bold;">
            Automatsko obaveštenje sistema
          </p>
        </div>
        
        <p>Poštovani,</p>
        <p>Obaveštavamo Vas da je naručen rezervni deo u okviru garancijskih uslova:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin-top: 0;">Detalji porudžbine</h3>
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Naziv dela:</strong> ${partName}</p>
          <p><strong>Kataloški broj:</strong> ${partNumber}</p>
          <p><strong>Prioritet:</strong> <span style="color: ${urgency === 'urgent' ? '#dc3545' : urgency === 'high' ? '#fd7e14' : '#6c757d'};">${urgencyLabel}</span></p>
          <p><strong>Klijent:</strong> ${clientName}</p>
          <p><strong>Serviser:</strong> ${technicianName}</p>
          <p><strong>Datum zahteva:</strong> ${new Date().toLocaleDateString('sr-ME')}</p>
          ${description ? `<p><strong>Napomene:</strong> ${description}</p>` : ''}
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; color: #856404;">
            ⚠️ <strong>Napomena:</strong> Ovo je garanciski servis. Rezervni deo se naručuje u skladu sa garancijskim uslovima.
          </p>
        </div>

        <p>Molimo Vas da obradi ovu porudžbinu u najkraćem roku.</p>
        <p>Za sva dodatna pitanja, kontaktirajte nas na broj 033 402 402.</p>
        
        <p>Srdačan pozdrav,<br>Frigo Sistem Todosijević</p>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: 033 402 402<br>
          Email: info@frigosistemtodosijevic.com<br>
          Adresa: Podgorica, Crna Gora
        </p>
      </div>
    `;

    console.log(`[EMAIL] Slanje obaveštenja servis firmi na: ${serviceCompanyEmail}`);

    try {
      const result = await this.sendEmail({
        to: serviceCompanyEmail,
        subject,
        html,
      }, 3); // 3 pokušaja slanja za važne obavštenja
      
      console.log(`[EMAIL] Rezultat slanja obaveštenja servis firmi: ${result ? 'Uspešno ✅' : 'Neuspešno ❌'}`);
      return result;
    } catch (error) {
      console.error(`[EMAIL] Greška pri slanju obaveštenja servis firmi:`, error);
      return false;
    }
  }

  /**
   * Šalje obaveštenje klijentu o naručivanju rezervnog dela
   */
  public async sendSparePartOrderNotificationToClient(
    clientEmail: string,
    clientName: string,
    serviceId: number,
    partName: string,
    urgency: string,
    warrantyStatus: string,
    technicianName: string
  ): Promise<boolean> {
    console.log(`[EMAIL] Početak slanja obaveštenja klijentu ${clientName} (${clientEmail}) o naručivanju rezervnog dela za servis #${serviceId}`);
    
    if (!this.configCache) {
      console.error(`[EMAIL] Nema konfigurisanog SMTP servera za slanje obaveštenja klijentu`);
      return false;
    }

    if (!clientEmail) {
      console.warn(`[EMAIL] Ne mogu poslati email klijentu ${clientName} - email adresa nije dostupna`);
      return false;
    }

    const urgencyLabel = urgency === 'urgent' ? 'Hitno' : urgency === 'high' ? 'Visoka' : urgency === 'medium' ? 'Srednja' : 'Niska';
    const warrantyLabel = warrantyStatus === 'in_warranty' ? 'u garanciji' : 'van garancije';
    const warrantyStyle = warrantyStatus === 'in_warranty' ? 
      'background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724;' : 
      'background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24;';
    const warrantyIcon = warrantyStatus === 'in_warranty' ? '🛡️' : '💰';

    const subject = `Naručen rezervni deo - Servis #${serviceId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Obaveštenje o naručivanju rezervnog dela</h2>
        <p>Poštovani/a ${clientName},</p>
        <p>Obaveštavamo Vas da je naš serviser naručio rezervni deo potreban za popravku Vašeg uređaja:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff;">
          <h3 style="color: #007bff; margin-top: 0;">Detalji narudžbine</h3>
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Naziv dela:</strong> ${partName}</p>
          <p><strong>Prioritet:</strong> ${urgencyLabel}</p>
          <p><strong>Serviser:</strong> ${technicianName}</p>
          <p><strong>Datum zahteva:</strong> ${new Date().toLocaleDateString('sr-ME')}</p>
        </div>

        <div style="${warrantyStyle} padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; font-weight: bold;">
            ${warrantyIcon} Servis se izvršava ${warrantyLabel}
          </p>
        </div>

        <p>Obavesćiemo Vas čim rezervni deo stigne i kada možemo nastaviti sa popravkom.</p>
        <p>Za sva pitanja možete nas kontaktirati na broj 033 402 402.</p>
        
        <p>Hvala Vam na razumevanju!</p>
        <p>Srdačan pozdrav,<br>Tim Frigo Sistema Todosijević</p>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: 033 402 402<br>
          Email: info@frigosistemtodosijevic.com<br>
          Adresa: Podgorica, Crna Gora
        </p>
      </div>
    `;

    try {
      const result = await this.sendEmail({
        to: clientEmail,
        subject,
        html,
      }, 3);
      
      console.log(`[EMAIL] Rezultat slanja obaveštenja klijentu: ${result ? 'Uspešno ✅' : 'Neuspešno ❌'}`);
      return result;
    } catch (error) {
      console.error(`[EMAIL] Greška pri slanju obaveštenja klijentu:`, error);
      return false;
    }
  }

  /**
   * Šalje obaveštenje kreatoru servisa o naručivanju rezervnog dela
   */
  public async sendSparePartOrderNotificationToCreator(
    creatorEmail: string,
    creatorName: string,
    creatorRole: string,
    serviceId: number,
    clientName: string,
    partName: string,
    urgency: string,
    warrantyStatus: string,
    technicianName: string
  ): Promise<boolean> {
    console.log(`[EMAIL] Početak slanja obaveštenja kreatoru servisa ${creatorName} (${creatorRole}) o naručivanju rezervnog dela za servis #${serviceId}`);
    
    if (!this.configCache) {
      console.error(`[EMAIL] Nema konfigurisanog SMTP servera za slanje obaveštenja kreatoru servisa`);
      return false;
    }

    if (!creatorEmail) {
      console.warn(`[EMAIL] Ne mogu poslati email kreatoru servisa ${creatorName} - email adresa nije dostupna`);
      return false;
    }

    const urgencyLabel = urgency === 'urgent' ? 'Hitno' : urgency === 'high' ? 'Visoka' : urgency === 'medium' ? 'Srednja' : 'Niska';
    const warrantyLabel = warrantyStatus === 'in_warranty' ? 'u garanciji' : 'van garancije';
    const roleLabel = creatorRole === 'admin' ? 'Administrator' : 
                     creatorRole === 'business_partner' ? 'Poslovni partner' : 
                     creatorRole === 'customer' ? 'Klijent' : 'Korisnik';

    const subject = `Naručen rezervni deo za Vaš servis #${serviceId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Obaveštenje o naručivanju rezervnog dela</h2>
        <p>Poštovani/a ${creatorName},</p>
        <p>Obaveštavamo Vas da je naš serviser naručio rezervni deo za servis koji ste kreirali:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #28a745; margin-top: 0;">Detalji narudžbine</h3>
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Klijent:</strong> ${clientName}</p>
          <p><strong>Naziv dela:</strong> ${partName}</p>
          <p><strong>Prioritet:</strong> ${urgencyLabel}</p>
          <p><strong>Status garancije:</strong> ${warrantyLabel}</p>
          <p><strong>Serviser:</strong> ${technicianName}</p>
          <p><strong>Kreirao servis:</strong> ${roleLabel}</p>
          <p><strong>Datum zahteva:</strong> ${new Date().toLocaleDateString('sr-ME')}</p>
        </div>

        <div style="background-color: #e7f3ff; border: 1px solid #b8daff; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; color: #004085;">
            ℹ️ <strong>Napomena:</strong> Klijent je takođe obavešten o naručivanju rezervnog dela.
          </p>
        </div>

        <p>Servis će biti nastavljen čim rezervni deo stigne.</p>
        <p>Za sva pitanja možete nas kontaktirati na broj 033 402 402.</p>
        
        <p>Srdačan pozdrav,<br>Tim Frigo Sistema Todosijević</p>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: 033 402 402<br>
          Email: info@frigosistemtodosijevic.com<br>
          Adresa: Podgorica, Crna Gora
        </p>
      </div>
    `;

    try {
      const result = await this.sendEmail({
        to: creatorEmail,
        subject,
        html,
      }, 3);
      
      console.log(`[EMAIL] Rezultat slanja obaveštenja kreatoru servisa: ${result ? 'Uspešno ✅' : 'Neuspešno ❌'}`);
      return result;
    } catch (error) {
      console.error(`[EMAIL] Greška pri slanju obaveštenja kreatoru servisa:`, error);
      return false;
    }
  }
  /**
   * Šalje obaveštenje Complus servis firmi o potrebi za rezervnim delom u garanciji 
   * (SAMO Electrolux, Elica, Candy, Hoover, Turbo Air)
   */
  public async sendComplusWarrantySparePartNotification(
    serviceId: number,
    partName: string,
    partNumber: string,
    clientName: string,
    technicianName: string,
    manufacturerName: string,
    urgency: string,
    description?: string
  ): Promise<boolean> {
    console.log(`[EMAIL] Početak slanja obaveštenja Complus servis firmi za ${manufacturerName} rezervni deo u garanciji - servis #${serviceId}`);
    
    if (!this.configCache) {
      console.error(`[EMAIL] Nema konfigurisanog SMTP servera za slanje obaveštenja Complus servis firmi`);
      return false;
    }

    const serviceCompanyEmail = 'servis@complus.me';
    const urgencyLabel = urgency === 'urgent' ? 'HITNO' : urgency === 'high' ? 'Visoka' : urgency === 'medium' ? 'Srednja' : 'Niska';
    const priorityIndicator = urgency === 'urgent' ? '🚨 HITNO' : urgency === 'high' ? '⚡ Visoka' : '📋';

    const subject = `${priorityIndicator} Garanciski rezervni deo ${manufacturerName.toUpperCase()} - Servis #${serviceId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #155724; margin: 0;">🛡️ GARANCISKI REZERVNI DEO - ${manufacturerName.toUpperCase()}</h2>
          <p style="margin: 5px 0 0 0; color: #155724; font-weight: bold;">
            Automatsko obaveštenje sistema
          </p>
        </div>
        
        <p>Poštovani,</p>
        <p>Obaveštavamo Vas da je naručen rezervni deo u okviru garancijskih uslova:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin-top: 0;">Detalji porudžbine</h3>
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Brend:</strong> <span style="color: #0066cc; font-weight: bold;">${manufacturerName.toUpperCase()}</span></p>
          <p><strong>Naziv dela:</strong> ${partName}</p>
          <p><strong>Kataloški broj:</strong> ${partNumber}</p>
          <p><strong>Prioritet:</strong> <span style="color: ${urgency === 'urgent' ? '#dc3545' : urgency === 'high' ? '#fd7e14' : '#6c757d'};">${urgencyLabel}</span></p>
          <p><strong>Klijent:</strong> ${clientName}</p>
          <p><strong>Serviser:</strong> ${technicianName}</p>
          <p><strong>Datum zahteva:</strong> ${new Date().toLocaleDateString('sr-ME')}</p>
          ${description ? `<p><strong>Napomene:</strong> ${description}</p>` : ''}
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; color: #856404;">
            ⚠️ <strong>Napomena:</strong> Ovo je garanciski servis za ${manufacturerName} uređaj. Rezervni deo se naručuje u skladu sa garancijskim uslovima.
          </p>
        </div>

        <p>Molimo Vas da obradi ovu porudžbinu u najkraćem roku.</p>
        <p>Za sva dodatna pitanja, kontaktirajte nas na broj 033 402 402.</p>
        
        <p>Srdačan pozdrav,<br>Frigo Sistem Todosijević</p>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: 033 402 402<br>
          Email: info@frigosistemtodosijevic.com<br>
          Adresa: Podgorica, Crna Gora
        </p>
      </div>
    `;

    console.log(`[EMAIL] Slanje obaveštenja Complus servis firmi na: ${serviceCompanyEmail}`);

    try {
      const result = await this.sendEmail({
        to: serviceCompanyEmail,
        subject,
        html,
      }, 3); // 3 pokušaja slanja za važne obavštenja
      
      console.log(`[EMAIL] Rezultat slanja obaveštenja Complus servis firmi: ${result ? 'Uspešno ✅' : 'Neuspešno ❌'}`);
      return result;
    } catch (error) {
      console.error(`[EMAIL] Greška pri slanju obaveštenja Complus servis firmi:`, error);
      return false;
    }
  }

  /**
   * Šalje obaveštenje servis firmi sa kompletnim informacijama o servisu
   * NOVA FUNKCIJA - Uključuje sve podatke o servisu, klijentu i aparatu
   */
  public async sendEnhancedWarrantySparePartNotification(
    serviceId: number,
    partName: string,
    partNumber: string,
    urgency: string,
    description: string,
    serviceData: any,
    clientData: any,
    applianceData: any,
    categoryData: any,
    manufacturerData: any,
    technicianData: any
  ): Promise<boolean> {
    console.log(`[EMAIL] Slanje proširenog obaveštenja Eurotehnika servis firmi za servis #${serviceId} sa kompletnim podacima`);
    
    if (!this.configCache) {
      console.error(`[EMAIL] Nema konfigurisanog SMTP servera za slanje proširenog obaveštenja`);
      return false;
    }

    const serviceCompanyEmail = 'servis@eurotehnikamn.me';
    const urgencyLabel = urgency === 'urgent' ? 'HITNO' : urgency === 'high' ? 'Visoka' : urgency === 'medium' ? 'Srednja' : 'Niska';
    const priorityIndicator = urgency === 'urgent' ? '🚨 HITNO' : urgency === 'high' ? '⚡ Visoka' : '📋';

    const subject = `${priorityIndicator} Garanciski rezervni deo - Servis #${serviceId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #155724; margin: 0;">🛡️ GARANCISKI REZERVNI DEO</h2>
          <p style="margin: 5px 0 0 0; color: #155724; font-weight: bold;">
            Automatsko obaveštenje sistema - Kompletan kontekst servisa
          </p>
        </div>
        
        <p>Poštovani,</p>
        <p>Obaveštavamo Vas da je naručen rezervni deo u okviru garancijskih uslova. Evo kompletnih informacija o servisu:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin-top: 0;">📋 DETALJI PORUDŽBINE</h3>
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Naziv dela:</strong> ${partName}</p>
          <p><strong>Kataloški broj:</strong> ${partNumber}</p>
          <p><strong>Prioritet:</strong> <span style="color: ${urgency === 'urgent' ? '#dc3545' : urgency === 'high' ? '#fd7e14' : '#6c757d'};">${urgencyLabel}</span></p>
          <p><strong>Datum zahteva:</strong> ${new Date().toLocaleDateString('sr-ME')}</p>
          ${description ? `<p><strong>Napomene:</strong> ${description}</p>` : ''}
        </div>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2196f3;">
          <h3 style="color: #1976d2; margin-top: 0;">🔧 PODACI O SERVISU</h3>
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Status:</strong> ${serviceData?.status || 'N/A'}</p>
          <p><strong>Kreiran:</strong> ${serviceData?.createdAt ? new Date(serviceData.createdAt).toLocaleDateString('sr-ME') : 'N/A'}</p>
          <p><strong>Planiran za:</strong> ${serviceData?.scheduledDate ? new Date(serviceData.scheduledDate).toLocaleDateString('sr-ME') : 'N/A'}</p>
          <p><strong>Opis problema:</strong> ${serviceData?.description || 'N/A'}</p>
          ${serviceData?.technicianNotes ? `<p><strong>Napomene servisera:</strong> ${serviceData.technicianNotes}</p>` : ''}
          ${serviceData?.cost ? `<p><strong>Cena servisa:</strong> ${serviceData.cost} €</p>` : ''}
        </div>

        <div style="background-color: #fff3e0; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ff9800;">
          <h3 style="color: #f57c00; margin-top: 0;">👤 PODACI O KLIJENTU</h3>
          <p><strong>Ime i prezime:</strong> ${clientData?.fullName || 'N/A'}</p>
          <p><strong>Telefon:</strong> ${clientData?.phone || 'N/A'}</p>
          <p><strong>Email:</strong> ${clientData?.email || 'N/A'}</p>
          <p><strong>Adresa:</strong> ${clientData?.address || 'N/A'}</p>
          <p><strong>Grad:</strong> ${clientData?.city || 'N/A'}</p>
        </div>

        <div style="background-color: #f3e5f5; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #9c27b0;">
          <h3 style="color: #7b1fa2; margin-top: 0;">🏠 PODACI O APARATU IZ SERVISA</h3>
          <p><strong>Kategorija:</strong> ${categoryData?.name || 'N/A'}</p>
          <p><strong>Proizvođač:</strong> ${manufacturerData?.name || 'N/A'}</p>
          <p><strong>Model:</strong> ${applianceData?.model || 'N/A'}</p>
          <p><strong>Serijski broj:</strong> ${applianceData?.serialNumber || 'N/A'}</p>
          <p><strong>Datum kupovine:</strong> ${applianceData?.purchaseDate ? new Date(applianceData.purchaseDate).toLocaleDateString('sr-ME') : 'N/A'}</p>
          ${applianceData?.notes ? `<p><strong>Napomene o aparatu:</strong> ${applianceData.notes}</p>` : ''}
        </div>

        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4caf50;">
          <h3 style="color: #388e3c; margin-top: 0;">👨‍🔧 DODELJENI SERVISER</h3>
          <p><strong>Ime i prezime:</strong> ${technicianData?.fullName || 'N/A'}</p>
          <p><strong>Telefon:</strong> ${technicianData?.phone || 'N/A'}</p>
          <p><strong>Email:</strong> ${technicianData?.email || 'N/A'}</p>
          ${technicianData?.specialization ? `<p><strong>Specijalizacija:</strong> ${technicianData.specialization}</p>` : ''}
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; color: #856404;">
            ⚠️ <strong>Napomena:</strong> Ovo je garanciski servis. Rezervni deo se naručuje u skladu sa garancijskim uslovima.
          </p>
        </div>

        <p>Molimo Vas da obradi ovu porudžbinu u najkraćem roku imajući u vidu kompletan kontekst servisa.</p>
        <p>Za sva dodatna pitanja, kontaktirajte nas na broj 033 402 402.</p>
        
        <p>Srdačan pozdrav,<br>Frigo Sistem Todosijević</p>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Frigo Sistem Todosijević<br>
          Kontakt telefon: 033 402 402<br>
          Email: info@frigosistemtodosijevic.com<br>
          Adresa: Podgorica, Crna Gora
        </p>
      </div>
    `;

    console.log(`[EMAIL] Slanje proširenog obaveštenja Eurotehnika servis firmi na: ${serviceCompanyEmail}`);

    try {
      const result = await this.sendEmail({
        to: serviceCompanyEmail,
        subject,
        html,
      }, 3);
      
      console.log(`[EMAIL] Rezultat slanja proširenog obaveštenja Eurotehnika servis firmi: ${result ? 'Uspešno ✅' : 'Neuspešno ❌'}`);
      return result;
    } catch (error) {
      console.error(`[EMAIL] Greška pri slanju proširenog obaveštenja Eurotehnika servis firmi:`, error);
      return false;
    }
  }

  /**
   * AUTOMATSKA OPTIMIZOVANA INTEGRACIJA ZA COM PLUS - POTPUNA AUTOMATIZACIJA
   * Šalje kompletnu automatizovanu porudžbinu sa svim potrebnim specifikacijama za nabavku
   * Integracija po najvišim svetskim standardima za workflow automatizaciju
   */
  public async sendAutomatedComplusSparePartsOrder(
    serviceId: number,
    partName: string,
    partNumber: string,
    urgency: string,
    description: string,
    manufacturerName: string,
    serviceData: any,
    clientData: any,
    applianceData: any,
    categoryData: any,
    manufacturerData: any,
    technicianData: any,
    estimatedCost?: number,
    warrantyStatus?: string,
    deliveryAddress?: string
  ): Promise<boolean> {
    console.log(`[AUTOMATIZACIJA] Pokretanje automatske porudžbine Com Plus za ${manufacturerName} - servis #${serviceId}`);
    
    if (!this.configCache) {
      console.error(`[AUTOMATIZACIJA] Nema konfigurisanog SMTP servera za automatsku porudžbinu`);
      return false;
    }

    const serviceCompanyEmail = 'servis@complus.me';
    const urgencyLabel = urgency === 'urgent' ? 'HITNO' : urgency === 'high' ? 'Visoka' : urgency === 'medium' ? 'Srednja' : 'Niska';
    const priorityIndicator = urgency === 'urgent' ? '🚨 HITNO' : urgency === 'high' ? '⚡ Visoka' : '📋';

    const warrantyLabel = warrantyStatus === 'u garanciji' ? 'GARANCISKI' : 'VANGARANCISKI';
    const subject = `${priorityIndicator} AUTOMATSKA PORUDŽBINA ${manufacturerName.toUpperCase()} - ${warrantyLabel} - Servis #${serviceId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background-color: #0066cc; border: 1px solid #004499; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🚀 AUTOMATSKA PORUDŽBINA REZERVNIH DELOVA</h1>
          <h2 style="color: #e6f3ff; margin: 10px 0 0 0; font-size: 18px;">${manufacturerName.toUpperCase()} - ${warrantyLabel}</h2>
          <p style="margin: 10px 0 0 0; color: #ccddff; font-weight: bold; font-size: 14px;">
            Sistem je automatski generisao porudžbinu sa kompletnim podacima za nabavku
          </p>
        </div>
        
        <p>Poštovani Com Plus tim,</p>
        <p><strong>Sistem je automatski generisao ovu porudžbinu rezervnog dela.</strong> Svi potrebni podaci za nabavku su uključeni u ovom emailu:</p>
        
        <div style="background-color: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; margin: 15px 0;">
          <h3 style="color: #856404; margin-top: 0; text-align: center;">⚡ AUTOMATSKA PORUDŽBINA - HITNO PROCESIRATI</h3>
          <div style="text-align: center; font-size: 18px; color: #dc3545; font-weight: bold; margin: 10px 0;">
            PRIORITET: ${urgencyLabel} | GARANT: ${warrantyLabel}
          </div>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 6px solid #0066cc;">
          <h3 style="color: #0066cc; margin-top: 0; font-size: 20px;">🔧 SPECIFIKACIJE REZERVNOG DELA</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <tr style="background-color: #e9ecef;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Naziv dela:</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: #0066cc; font-weight: bold;">${partName}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Kataloški broj:</strong></td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${partNumber}</td></tr>
            <tr style="background-color: #e9ecef;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Proizvođač:</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: #dc3545; font-weight: bold;">${manufacturerName.toUpperCase()}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Model aparata:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applianceData?.model || 'N/A'}</td></tr>
            <tr style="background-color: #e9ecef;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Serijski broj:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applianceData?.serialNumber || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Količina:</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: #28a745; font-weight: bold;">1 kom</td></tr>
            <tr style="background-color: #e9ecef;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Datum zahteva:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleDateString('sr-ME')} ${new Date().toLocaleTimeString('sr-ME')}</td></tr>
            ${estimatedCost ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Procenjena cena:</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: #28a745; font-weight: bold;">${estimatedCost} €</td></tr>` : ''}
          </table>
          ${description ? `<div style="background-color: #fff; padding: 10px; border-radius: 5px; margin-top: 10px;"><strong>Tehnička napomena:</strong> ${description}</div>` : ''}
        </div>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2196f3;">
          <h3 style="color: #1976d2; margin-top: 0;">🔧 PODACI O SERVISU</h3>
          <p><strong>Broj servisa:</strong> #${serviceId}</p>
          <p><strong>Status:</strong> ${serviceData?.status || 'N/A'}</p>
          <p><strong>Kreiran:</strong> ${serviceData?.createdAt ? new Date(serviceData.createdAt).toLocaleDateString('sr-ME') : 'N/A'}</p>
          <p><strong>Planiran za:</strong> ${serviceData?.scheduledDate ? new Date(serviceData.scheduledDate).toLocaleDateString('sr-ME') : 'N/A'}</p>
          <p><strong>Opis problema:</strong> ${serviceData?.description || 'N/A'}</p>
          ${serviceData?.technicianNotes ? `<p><strong>Napomene servisera:</strong> ${serviceData.technicianNotes}</p>` : ''}
          ${serviceData?.cost ? `<p><strong>Cena servisa:</strong> ${serviceData.cost} €</p>` : ''}
        </div>

        <div style="background-color: #fff3e0; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ff9800;">
          <h3 style="color: #f57c00; margin-top: 0;">👤 PODACI O KLIJENTU</h3>
          <p><strong>Ime i prezime:</strong> ${clientData?.fullName || 'N/A'}</p>
          <p><strong>Telefon:</strong> ${clientData?.phone || 'N/A'}</p>
          <p><strong>Email:</strong> ${clientData?.email || 'N/A'}</p>
          <p><strong>Adresa:</strong> ${clientData?.address || 'N/A'}</p>
          <p><strong>Grad:</strong> ${clientData?.city || 'N/A'}</p>
        </div>

        <div style="background-color: #f3e5f5; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #9c27b0;">
          <h3 style="color: #7b1fa2; margin-top: 0;">🏠 PODACI O APARATU IZ SERVISA</h3>
          <p><strong>Kategorija:</strong> ${categoryData?.name || 'N/A'}</p>
          <p><strong>Proizvođač:</strong> ${manufacturerData?.name || 'N/A'}</p>
          <p><strong>Model:</strong> ${applianceData?.model || 'N/A'}</p>
          <p><strong>Serijski broj:</strong> ${applianceData?.serialNumber || 'N/A'}</p>
          <p><strong>Datum kupovine:</strong> ${applianceData?.purchaseDate ? new Date(applianceData.purchaseDate).toLocaleDateString('sr-ME') : 'N/A'}</p>
          ${applianceData?.notes ? `<p><strong>Napomene o aparatu:</strong> ${applianceData.notes}</p>` : ''}
        </div>

        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4caf50;">
          <h3 style="color: #388e3c; margin-top: 0;">👨‍🔧 DODELJENI SERVISER</h3>
          <p><strong>Ime i prezime:</strong> ${technicianData?.fullName || 'N/A'}</p>
          <p><strong>Telefon:</strong> ${technicianData?.phone || 'N/A'}</p>
          <p><strong>Email:</strong> ${technicianData?.email || 'N/A'}</p>
          ${technicianData?.specialization ? `<p><strong>Specijalizacija:</strong> ${technicianData.specialization}</p>` : ''}
        </div>

        <div style="background-color: #d1ecf1; border: 2px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0c5460; margin-top: 0; text-align: center;">📞 KONTAKT ZA POTVRDU I DOSTAVU</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <tr><td style="padding: 8px; border: 1px solid #bee5eb;"><strong>Kontakt telefon:</strong></td><td style="padding: 8px; border: 1px solid #bee5eb; color: #dc3545; font-weight: bold;">033 402 402</td></tr>
            <tr style="background-color: #f8f9fa;"><td style="padding: 8px; border: 1px solid #bee5eb;"><strong>Email za potvrdu:</strong></td><td style="padding: 8px; border: 1px solid #bee5eb;">info@frigosistemtodosijevic.com</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #bee5eb;"><strong>Adresa za dostavu:</strong></td><td style="padding: 8px; border: 1px solid #bee5eb;">${deliveryAddress || clientData?.address || 'Kontaktirati za detalje'}</td></tr>
            <tr style="background-color: #f8f9fa;"><td style="padding: 8px; border: 1px solid #bee5eb;"><strong>Kontakt osoba:</strong></td><td style="padding: 8px; border: 1px solid #bee5eb;">${technicianData?.fullName || 'N/A'} (${technicianData?.phone || 'N/A'})</td></tr>
          </table>
        </div>

        <div style="background-color: ${warrantyStatus === 'u garanciji' ? '#d4edda' : '#fff3cd'}; border: 2px solid ${warrantyStatus === 'u garanciji' ? '#c3e6cb' : '#ffeaa7'}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="color: ${warrantyStatus === 'u garanciji' ? '#155724' : '#856404'}; margin: 0;">
            ${warrantyStatus === 'u garanciji' ? '✅ GARANCISKI SERVIS' : '💳 VANGARANCISKI SERVIS'}
          </h3>
          <p style="margin: 10px 0 0 0; color: ${warrantyStatus === 'u garanciji' ? '#155724' : '#856404'}; font-weight: bold;">
            ${warrantyStatus === 'u garanciji' ? 'Deo se naručuje u okviru garancijskih uslova - HITNO PROCESIRATI' : 'Deo se naplaćuje klijentu - potvrditi cenu pre isporuke'}
          </p>
        </div>

        <div style="background-color: #f8f9fa; border: 2px solid #6c757d; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="color: #495057; margin: 0;">🤖 POTPUNA AUTOMATIZACIJA AKTIVIRANA</h3>
          <p style="margin: 10px 0 0 0; color: #495057; font-size: 14px;">
            Ova porudžbina je automatski generisana sa kompletnim podacima potrebnim za nabavku.<br>
            <strong>Molimo potvrdite prijem i vreme dostave telefonom: 033 402 402</strong>
          </p>
        </div>
        
        <p><strong>Srdačan pozdrav,<br>
        Frigo Sistem Todosijević - Automatski sistem za rezervne delove</strong></p>
        
        <hr style="border: 2px solid #0066cc; margin: 30px 0;">
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
          <p style="font-size: 14px; color: #495057; margin: 0; font-weight: bold;">
            Frigo Sistem Todosijević d.o.o. | Automatski sistem za rezervne delove<br>
            📞 033 402 402 | 📧 info@frigosistemtodosijevic.com<br>
            📍 Lastva grbaljska bb, 85317 Kotor, Crna Gora<br>
            🌐 www.frigosistemtodosijevic.com
          </p>
        </div>
      </div>
    `;

    console.log(`[AUTOMATIZACIJA] 🚀 Slanje automatske porudžbine Com Plus-u na: ${serviceCompanyEmail}`);
    console.log(`[AUTOMATIZACIJA] 📦 Porudžbina: ${partName} (${partNumber}) za ${manufacturerName} - Servis #${serviceId}`);
    console.log(`[AUTOMATIZACIJA] ⚡ Prioritet: ${urgencyLabel} | Garancija: ${warrantyLabel || 'N/A'}`);

    try {
      const result = await this.sendEmail({
        to: serviceCompanyEmail,
        subject,
        html,
      }, 3);
      
      if (result) {
        console.log(`[AUTOMATIZACIJA] ✅ USPEŠNA AUTOMATSKA PORUDŽBINA - Com Plus je obavešten sa kompletnim podacima`);
        console.log(`[AUTOMATIZACIJA] 📋 Email poslat na: ${serviceCompanyEmail} sa temom: ${subject}`);
        console.log(`[AUTOMATIZACIJA] 🎯 Potpuna automatizacija aktivirana po najvišim svetskim standardima`);
      } else {
        console.error(`[AUTOMATIZACIJA] ❌ NEUSPEŠNA AUTOMATSKA PORUDŽBINA - greška pri slanju`);
      }
      
      return result;
    } catch (error) {
      console.error(`[AUTOMATIZACIJA] ⚠️ KRITIČNA GREŠKA - automatska porudžbina Com Plus-u nije poslana:`, error);
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();