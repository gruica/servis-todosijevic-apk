import * as cron from 'node-cron';
import { ServisKomercDailyReportService } from './servis-komerc-daily-report.js';

/**
 * Cron servis za automatske Servis Komerc izvještaje i notifikacije
 * Pokreće se automatski pri pokretanju aplikacije
 */
export class ServisKomercCronService {
  private dailyReportService: ServisKomercDailyReportService;
  private isRunning: boolean = false;

  constructor() {
    this.dailyReportService = new ServisKomercDailyReportService();
  }

  /**
   * Pokretanje cron job-ova za Servis Komerc
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[SERVIS KOMERC CRON] ⚠️ Cron job-ovi su već pokrenuti');
      return;
    }

    try {
      console.log('[SERVIS KOMERC CRON] 🚀 Pokretanje Servis Komerc cron job-ova...');

      // Dnevni Servis Komerc izvještaj - svaki dan u 22:00
      cron.schedule('0 22 * * *', async () => {
        console.log('[SERVIS KOMERC CRON] 🕙 Pokretanje automatskog dnevnog Servis Komerc izvještaja...');
        try {
          // Servis Komerc email adresa
          await this.dailyReportService.sendDailyReport(new Date(), 'info@serviscommerce.me');
          console.log('[SERVIS KOMERC CRON] ✅ Automatski dnevni Servis Komerc izvještaj uspešno poslat');
        } catch (error) {
          console.error('[SERVIS KOMERC CRON] ❌ Greška pri slanju automatskog dnevnog izvještaja:', error);
        }
      }, {
        timezone: "Europe/Belgrade"
      });

      this.isRunning = true;
      console.log('[SERVIS KOMERC CRON] ✅ Servis Komerc cron job-ovi pokrenuti');
      console.log('[SERVIS KOMERC CRON] 📅 Dnevni izvještaj: svaki dan u 22:00 (Belgrade vreme)');
      console.log('[SERVIS KOMERC CRON] 📧 Email adresa: info@serviscommerce.me');

    } catch (error) {
      console.error('[SERVIS KOMERC CRON] ❌ Greška pri pokretanju cron job-ova:', error);
      throw error;
    }
  }

  /**
   * Zaštava da li su cron job-ovi pokrenuti
   */
  isRunningJobs(): boolean {
    return this.isRunning;
  }

  /**
   * Testira dnevni izvještaj (bez slanja email-a)
   */
  async testDailyReport(): Promise<any> {
    try {
      console.log('[SERVIS KOMERC CRON] 🧪 Testiranje dnevnog izvještaja...');
      const reportData = await this.dailyReportService.testReportGeneration();
      console.log('[SERVIS KOMERC CRON] ✅ Test dnevnog izvještaja završen uspešno');
      return reportData;
    } catch (error) {
      console.error('[SERVIS KOMERC CRON] ❌ Greška u testu dnevnog izvještaja:', error);
      throw error;
    }
  }

  /**
   * Ručno pokretanje dnevnog izvještaja
   */
  async manualDailyReport(date: Date = new Date(), emailAddress?: string): Promise<boolean> {
    try {
      console.log('[SERVIS KOMERC CRON] 🚀 Ručno pokretanje dnevnog Servis Komerc izvještaja...');
      const targetEmail = emailAddress || 'info@serviscommerce.me';
      const success = await this.dailyReportService.sendDailyReport(date, targetEmail);
      
      if (success) {
        console.log('[SERVIS KOMERC CRON] ✅ Ručno pokrenut dnevni izvještaj uspešno poslat');
        return true;
      } else {
        console.error('[SERVIS KOMERC CRON] ❌ Greška pri ručnom pokretanju dnevnog izvještaja');
        return false;
      }
    } catch (error) {
      console.error('[SERVIS KOMERC CRON] ❌ Greška pri ručnom pokretanju:', error);
      return false;
    }
  }
}