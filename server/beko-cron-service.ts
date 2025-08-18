import * as cron from 'node-cron';
import { BekoDailyReportService } from './beko-daily-report.js';

/**
 * Beko Cron Service - identičan ComPlus sistemu
 * Automatski izvještaji za Beko uređaje servisirane u garantnom roku
 */
export class BekoCronService {
  private static instance: BekoCronService;
  private dailyReportService: BekoDailyReportService;
  private isRunning = false;

  private constructor() {
    this.dailyReportService = new BekoDailyReportService();
  }

  static getInstance(): BekoCronService {
    if (!BekoCronService.instance) {
      BekoCronService.instance = new BekoCronService();
    }
    return BekoCronService.instance;
  }

  /**
   * Pokreće Beko cron job-ove
   */
  start(): void {
    if (this.isRunning) {
      console.log('[BEKO CRON] Već je pokrenut');
      return;
    }

    try {
      // Dnevni Beko izveštaj - svaki dan u 22:30 (30 min nakon ComPlus-a)
      cron.schedule('30 22 * * *', async () => {
        console.log('[BEKO CRON] 🕙 Pokretanje automatskog dnevnog Beko izveštaja...');
        try {
          // Lista email adresa za Beko izveštaje
          const bekoReportEmails = [
            'gruica@frigosistemtodosijevic.com',
            'servis@bekoserbija.com', // TODO: dodati pravu email adresu za Beko
            'fakturisanje@bekoserbija.com' // TODO: dodati pravu email adresu za fakturisanje
          ];
          
          // Šalje izveštaj svim odgovornim osobama
          for (const email of bekoReportEmails) {
            try {
              await this.dailyReportService.sendProfessionalDailyReport(new Date(), email);
              console.log(`[BEKO CRON] ✅ Profesionalni izveštaj uspešno poslat na: ${email}`);
            } catch (error) {
              console.error(`[BEKO CRON] ❌ Greška pri slanju na ${email}:`, error);
            }
          }
          console.log('[BEKO CRON] ✅ Automatski dnevni Beko izveštaj završen');
        } catch (error) {
          console.error('[BEKO CRON] ❌ Greška pri slanju automatskog dnevnog izveštaja:', error);
        }
      }, {
        timezone: "Europe/Belgrade"
      });

      this.isRunning = true;
      console.log('[BEKO CRON] ✅ Beko cron job-ovi pokrenuti');
      console.log('[BEKO CRON] 📅 Dnevni izveštaj: svaki dan u 22:30 (Belgrade vreme)');
      console.log('[BEKO CRON] 📧 Email adrese: gruica@frigosistemtodosijevic.com, servis@bekoserbija.com, fakturisanje@bekoserbija.com');
    
    } catch (error) {
      console.error('[BEKO CRON] ❌ Greška pri pokretanju Beko cron job-ova:', error);
    }
  }

  /**
   * Zaustavlja sve cron job-ove
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('[BEKO CRON] Već je zaustavljen');
      return;
    }

    // Node-cron ne podržava direktno zaustavljanje, ali možemo označiti kao zaustavljeno
    this.isRunning = false;
    console.log('[BEKO CRON] 🛑 Beko cron job-ovi zaustavljeni');
  }

  /**
   * Proverava da li je servis pokrenut
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }
}