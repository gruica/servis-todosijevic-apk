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
          await this.dailyReportService.sendDailyReport(new Date(), 'gruica@frigosistemtodosijevic.com');
          console.log('[COMPLUS CRON] ✅ Automatski dnevni ComPlus izveštaj uspešno poslat');
        } catch (error) {
          console.error('[COMPLUS CRON] ❌ Greška pri slanju automatskog dnevnog izveštaja:', error);
        }
      }, {
        timezone: "Europe/Belgrade"
      });

      this.isRunning = true;
      console.log('[COMPLUS CRON] ✅ ComPlus cron job-ovi pokrenuti');
      console.log('[COMPLUS CRON] 📅 Dnevni izveštaj: svaki dan u 22:00 (Belgrade vreme)');
      console.log('[COMPLUS CRON] 📧 Email adresa: gruica@frigosistemtodosijevic.com');

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
      console.log('[COMPLUS CRON] ✅ Test dnevnog izveštaja uspešan');
    } catch (error) {
      console.error('[COMPLUS CRON] ❌ Test dnevnog izveštaja neuspešan:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const complusCronService = ComplusCronService.getInstance();