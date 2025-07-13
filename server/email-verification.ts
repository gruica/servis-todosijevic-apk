import { storage } from "./storage";
import { emailService } from "./email-service";

/**
 * Servis za upravljanje email verifikacijom
 */
export class EmailVerificationService {
  private static instance: EmailVerificationService;

  private constructor() {}

  public static getInstance(): EmailVerificationService {
    if (!EmailVerificationService.instance) {
      EmailVerificationService.instance = new EmailVerificationService();
    }
    return EmailVerificationService.instance;
  }

  /**
   * Generiše nasumični 6-cifreni kod
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Šalje email sa verifikacijskim kodom
   */
  public async sendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Proverava da li email već postoji u bazi
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return {
          success: false,
          message: "Email adresa je već registrovana u sistemu."
        };
      }

      // Generiše novi kod
      const verificationCode = this.generateVerificationCode();
      
      // Postavlja vreme isteka (15 minuta)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      // Čuva kod u bazi
      await storage.createEmailVerification({
        email,
        verificationCode,
        used: false,
        attempts: 0,
        expiresAt
      });

      // Šalje email
      const emailSent = await emailService.sendEmail({
        to: email,
        subject: "Verifikacija email adrese - Frigo Sistem Todosijević",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb; text-align: center;">Verifikacija email adrese</h2>
            <p>Poštovani,</p>
            <p>Hvala vam što ste se registrovali na našu platformu. Da biste završili registraciju, molimo vas da unesete sledeći verifikacijski kod:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <h1 style="color: #1f2937; font-size: 32px; margin: 0; letter-spacing: 4px;">${verificationCode}</h1>
            </div>
            <p><strong>Važno:</strong> Ovaj kod važi 15 minuta od trenutka slanja.</p>
            <p>Ako niste vi poslali ovaj zahtev, molimo vas da ignorišete ovaj email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Frigo Sistem Todosijević<br>
              Servis bele tehnike<br>
              Crna Gora
            </p>
          </div>
        `,
        text: `Verifikacijski kod: ${verificationCode}\n\nOvaj kod važi 15 minuta.\n\nFrigo Sistem Todosijević`
      });

      if (emailSent) {
        return {
          success: true,
          message: "Verifikacijski kod je poslat na vašu email adresu."
        };
      } else {
        return {
          success: false,
          message: "Greška pri slanju email-a. Molimo pokušajte kasnije."
        };
      }

    } catch (error) {
      console.error("Greška pri slanju verifikacijskog email-a:", error);
      return {
        success: false,
        message: "Greška pri slanju verifikacijskog koda."
      };
    }
  }

  /**
   * Verifikuje email kod
   */
  public async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const isValid = await storage.validateEmailVerification(email, code);
      
      if (isValid) {
        return {
          success: true,
          message: "Email je uspešno verifikovan."
        };
      } else {
        return {
          success: false,
          message: "Neispravni ili istekli verifikacijski kod."
        };
      }

    } catch (error) {
      console.error("Greška pri verifikaciji email-a:", error);
      return {
        success: false,
        message: "Greška pri verifikaciji koda."
      };
    }
  }

  /**
   * Proverava da li je email verifikovan
   */
  public async isEmailVerified(email: string): Promise<boolean> {
    try {
      const verification = await storage.getEmailVerification(email);
      return verification ? verification.used : false;
    } catch (error) {
      console.error("Greška pri proveri verifikacije:", error);
      return false;
    }
  }

  /**
   * Čišćenje isteklih kodova (poziva se periodično)
   */
  public async cleanupExpiredCodes(): Promise<void> {
    try {
      await storage.cleanupExpiredEmailVerifications();
    } catch (error) {
      console.error("Greška pri čišćenju isteklih kodova:", error);
    }
  }
}

export const emailVerificationService = EmailVerificationService.getInstance();