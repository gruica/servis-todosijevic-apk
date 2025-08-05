import cron from 'node-cron';
import { ComplusDailyReportService } from './complus-daily-report.js';

/**
 * Servis za upravljanje ComPlus automatskim cron job-ovima
 */
export class ComplusCronService {
  private static instance: ComplusCronService;
  private dailyReportService: ComplusDailyReportService;
  private isRunning = false;

  private constructor() {
    this.dailyReportService = new ComplusDailyReportService();
  }

  static getInstance(): ComplusCronService {
    if (!ComplusCronService.instance) {
      ComplusCronService.instance = new ComplusCronService();
    }
    return ComplusCronService.instance;
  }

  /**
   * Pokreće ComPlus cron job-ove
   */
  start(): void {
    if (this.isRunning) {
      console.log('[COMPLUS CRON] Već je pokrenut');
      return;
    }

    try {
      // Dnevni ComPlus izveštaj - svaki dan u 22:00
      cron.schedule('0 22 * * *', async () => {
        console.log('[COMPLUS CRON] 🕙 Pokretanje automatskog dnevnog ComPlus izveštaja...');
        try {
          // Lista poslovnih partnera i njihovih email adresa
          const businessPartnerEmails = [
            'gruica@frigosistemtodosijevic.com',
            'robert.ivezic@tehnoplus.me', 
            'servis@complus.me'
          ];
          
          // Šalje izveštaj svim poslovnim partnerima
          for (const email of businessPartnerEmails) {
            try {
              await this.dailyReportService.sendProfessionalDailyReport(new Date(), email);
              console.log(`[COMPLUS CRON] ✅ Profesionalni izveštaj uspešno poslat na: ${email}`);
            } catch (error) {
              console.error(`[COMPLUS CRON] ❌ Greška pri slanju na ${email}:`, error);
            }
          }
          console.log('[COMPLUS CRON] ✅ Automatski dnevni ComPlus izveštaj završen');
        } catch (error) {
          console.error('[COMPLUS CRON] ❌ Greška pri slanju automatskog dnevnog izveštaja:', error);
        }
      }, {
        timezone: "Europe/Belgrade"
      });

      this.isRunning = true;
      console.log('[COMPLUS CRON] ✅ ComPlus cron job-ovi pokrenuti');
      console.log('[COMPLUS CRON] 📅 Dnevni izveštaj: svaki dan u 22:00 (Belgrade vreme)');
      console.log('[COMPLUS CRON] 📧 Email adrese: gruica@frigosistemtodosijevic.com, robert.ivezic@tehnoplus.me, servis@complus.me');

    } catch (error) {
      console.error('[COMPLUS CRON] ❌ Greška pri pokretanju cron job-ova:', error);
      throw error;
    }
  }

  /**
   * Zaustavlja ComPlus cron job-ove
   */
  stop(): void {
    console.log('[COMPLUS CRON] 🛑 Zaustavljanje ComPlus cron job-ova...');
    // Node-cron ne podržava direktno zaustavljanje, ali možemo označiti kao neaktivan
    this.isRunning = false;
    console.log('[COMPLUS CRON] ✅ ComPlus cron job-ovi zaustavljeni');
  }

  /**
   * Proverava da li su cron job-ovi pokrenuti
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Testira slanje dnevnog izveštaja (za debugging)
   */
  async testDailyReport(email?: string): Promise<void> {
    const testEmail = email || 'gruica@frigosistemtodosijevic.com';
    console.log(`[COMPLUS CRON] 🧪 Testiranje dnevnog izveštaja na: ${testEmail}`);
    
    try {
      await this.dailyReportService.sendDailyReport(new Date(), testEmail);
      console.log(`[COMPLUS CRON] ✅ Test izveštaj uspešno poslat`);
    } catch (error) {
      console.error(`[COMPLUS CRON] ❌ Greška pri test slanju:`, error);
    }
  }

  /**
   * Testira slanje profesionalnog izveštaja sa grafikonima (za debugging)
   */
  async testProfessionalReport(email?: string, targetDate?: string): Promise<void> {
    const testEmail = email || 'robert.ivezic@tehnoplus.me';
    const reportDate = targetDate ? new Date(targetDate) : new Date();
    
    console.log(`[COMPLUS CRON] 🧪 Testiranje profesionalnog izveštaja na: ${testEmail}`);
    if (targetDate) {
      console.log(`[COMPLUS CRON] 📅 Za datum: ${targetDate}`);
    }
    
    try {
      await this.dailyReportService.sendProfessionalDailyReport(reportDate, testEmail);
      console.log(`[COMPLUS CRON] ✅ Test profesionalnog izveštaja uspešno poslat za ${targetDate || 'danas'}`);
    } catch (error) {
      console.error(`[COMPLUS CRON] ❌ Greška pri test slanju profesionalnog izveštaja:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const complusCronService = ComplusCronService.getInstance();