import { db } from './db.js';
import { services, appliances, clients, users, sparePartOrders } from '../shared/schema.js';
import { EmailService } from './email-service.js';
import { and, gte, lte, eq, isNotNull, or, like } from 'drizzle-orm';

interface DailyReportData {
  completedServices: any[];
  visitedClients: any[];
  usedParts: any[];
  orderedParts: any[];
  totalCompletedServices: number;
  totalUsedParts: number;
  totalOrderedParts: number;
}

/**
 * Klasa za generisanje i slanje dnevnih ComPlus izveštaja
 */
export class ComplusDailyReportService {
  private emailService: EmailService;

  constructor() {
    this.emailService = EmailService.getInstance();
  }

  /**
   * Prikuplja podatke za dnevni izveštaj
   * @param date Datum za koji se generiše izveštaj (default: danas)
   */
  async collectDailyData(date: Date = new Date()): Promise<DailyReportData> {
    console.log(`[COMPLUS REPORT] Prikupljam podatke za datum: ${date.toLocaleDateString('sr-ME')}`);

    // Početak i kraj dana
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // Temporary: Return empty data to test email functionality first
      console.log('[COMPLUS REPORT] Test mode - returning empty data to validate email system');
      
      const completedServices: any[] = [];

      const visitedClients: any[] = [];
      const usedParts: any[] = [];
      const orderedParts: any[] = [];

      console.log(`[COMPLUS REPORT] Test mode - returning empty data`);

      return {
        completedServices,
        visitedClients,
        usedParts,
        orderedParts,
        totalCompletedServices: 0,
        totalUsedParts: 0,
        totalOrderedParts: 0
      };

    } catch (error) {
      console.error('[COMPLUS REPORT] Greška pri prikupljanju podataka:', error);
      throw error;
    }
  }

  /**
   * Generiše HTML content za dnevni izveštaj
   */
  generateReportHTML(data: DailyReportData, reportDate: Date): string {
    const dateStr = reportDate.toLocaleDateString('sr-ME', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>ComPlus Dnevni Izveštaj - ${dateStr}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">📊 ComPlus Dnevni Izveštaj</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">${dateStr}</p>
        </div>

        <!-- Sažetak -->
        <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h2 style="color: #1e40af; margin-top: 0;">📈 Sažetak aktivnosti</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 32px; font-weight: bold; color: #059669;">${data.totalCompletedServices}</div>
                    <div style="color: #6b7280; font-size: 14px;">Završenih servisa</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 32px; font-weight: bold; color: #0891b2;">${data.visitedClients.length}</div>
                    <div style="color: #6b7280; font-size: 14px;">Posećenih klijenata</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 32px; font-weight: bold; color: #7c3aed;">${data.totalUsedParts}</div>
                    <div style="color: #6b7280; font-size: 14px;">Potrošenih delova</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${data.totalOrderedParts}</div>
                    <div style="color: #6b7280; font-size: 14px;">Poručenih delova</div>
                </div>
            </div>
        </div>

        ${this.generateServicesSection(data.completedServices)}
        ${this.generateClientsSection(data.visitedClients)}
        ${this.generateUsedPartsSection(data.usedParts)}
        ${this.generateOrderedPartsSection(data.orderedParts)}

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding: 20px; background-color: #f1f5f9; border-radius: 8px;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">
                📧 Automatski generisan izveštaj | Frigo Sistem Todosijević<br>
                ComPlus Partner Komunikacija | ${new Date().toLocaleString('sr-ME')}
            </p>
        </div>
    </body>
    </html>`;
  }

  private generateServicesSection(services: any[]): string {
    if (services.length === 0) {
      return `
        <div style="margin-bottom: 25px;">
            <h2 style="color: #1e40af;">🔧 Završeni servisi</h2>
            <p style="color: #6b7280; font-style: italic;">Nema završenih servisa za danas.</p>
        </div>`;
    }

    const servicesHtml = services.map((service, index) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; font-weight: 600;">#${service.serviceId}</td>
            <td style="padding: 12px;">${service.clientName}</td>
            <td style="padding: 12px;">${service.technicianName || 'N/A'}</td>
            <td style="padding: 12px;">${service.applianceType} ${service.applianceBrand}</td>
            <td style="padding: 12px;">${service.workPerformed || 'N/A'}</td>
            <td style="padding: 12px;">${new Date(service.completedAt).toLocaleTimeString('sr-ME', { hour: '2-digit', minute: '2-digit' })}</td>
        </tr>
    `).join('');

    return `
        <div style="margin-bottom: 25px;">
            <h2 style="color: #1e40af;">🔧 Završeni servisi (${services.length})</h2>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background-color: #1e40af; color: white;">
                            <th style="padding: 15px; text-align: left;">ID</th>
                            <th style="padding: 15px; text-align: left;">Klijent</th>
                            <th style="padding: 15px; text-align: left;">Tehničar</th>
                            <th style="padding: 15px; text-align: left;">Uređaj</th>
                            <th style="padding: 15px; text-align: left;">Rad</th>
                            <th style="padding: 15px; text-align: left;">Vreme</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${servicesHtml}
                    </tbody>
                </table>
            </div>
        </div>`;
  }

  private generateClientsSection(clients: any[]): string {
    if (clients.length === 0) {
      return `
        <div style="margin-bottom: 25px;">
            <h2 style="color: #1e40af;">👥 Posećeni klijenti</h2>
            <p style="color: #6b7280; font-style: italic;">Nema posećenih klijenata za danas.</p>
        </div>`;
    }

    const clientsHtml = clients.map(client => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; font-weight: 600;">${client.clientName}</td>
            <td style="padding: 12px;">${client.clientPhone || 'N/A'}</td>
            <td style="padding: 12px;">${client.clientAddress || 'N/A'}</td>
            <td style="padding: 12px;">${client.applianceType} ${client.applianceBrand}</td>
        </tr>
    `).join('');

    return `
        <div style="margin-bottom: 25px;">
            <h2 style="color: #1e40af;">👥 Posećeni klijenti (${clients.length})</h2>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background-color: #0891b2; color: white;">
                            <th style="padding: 15px; text-align: left;">Ime</th>
                            <th style="padding: 15px; text-align: left;">Telefon</th>
                            <th style="padding: 15px; text-align: left;">Adresa</th>
                            <th style="padding: 15px; text-align: left;">Uređaj</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clientsHtml}
                    </tbody>
                </table>
            </div>
        </div>`;
  }

  private generateUsedPartsSection(parts: any[]): string {
    if (parts.length === 0) {
      return `
        <div style="margin-bottom: 25px;">
            <h2 style="color: #1e40af;">🔩 Potrošeni rezervni delovi</h2>
            <p style="color: #6b7280; font-style: italic;">Nema potrošenih delova za danas.</p>
        </div>`;
    }

    const partsHtml = parts.map(part => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; font-weight: 600;">${part.partName || part.name || 'N/A'}</td>
            <td style="padding: 12px;">${part.partNumber || part.part_number || 'N/A'}</td>
            <td style="padding: 12px;">${part.brand || 'N/A'}</td>
            <td style="padding: 12px; text-align: center;">${part.quantity || 1}</td>
            <td style="padding: 12px; text-align: right;">${part.price ? parseFloat(part.price).toFixed(2) + ' €' : 'N/A'}</td>
            <td style="padding: 12px; text-align: center;">#${part.serviceId}</td>
        </tr>
    `).join('');

    const totalValue = parts.reduce((sum, part) => {
      const price = parseFloat(part.price || 0);
      const quantity = parseInt(part.quantity || 1);
      return sum + (price * quantity);
    }, 0);

    return `
        <div style="margin-bottom: 25px;">
            <h2 style="color: #1e40af;">🔩 Potrošeni rezervni delovi (${parts.length})</h2>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background-color: #7c3aed; color: white;">
                            <th style="padding: 15px; text-align: left;">Deo</th>
                            <th style="padding: 15px; text-align: left;">Broj dela</th>
                            <th style="padding: 15px; text-align: left;">Brend</th>
                            <th style="padding: 15px; text-align: center;">Količina</th>
                            <th style="padding: 15px; text-align: right;">Cena</th>
                            <th style="padding: 15px; text-align: center;">Servis</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${partsHtml}
                        <tr style="background-color: #f8fafc; font-weight: bold;">
                            <td colspan="4" style="padding: 15px; text-align: right;">UKUPNA VREDNOST:</td>
                            <td style="padding: 15px; text-align: right; color: #7c3aed;">${totalValue.toFixed(2)} €</td>
                            <td style="padding: 15px;"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
  }

  private generateOrderedPartsSection(parts: any[]): string {
    if (parts.length === 0) {
      return `
        <div style="margin-bottom: 25px;">
            <h2 style="color: #1e40af;">📦 Poručeni rezervni delovi</h2>
            <p style="color: #6b7280; font-style: italic;">Nema poručenih delova za danas.</p>
        </div>`;
    }

    const partsHtml = parts.map(part => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; font-weight: 600;">${part.partName || 'N/A'}</td>
            <td style="padding: 12px;">${part.partNumber || 'N/A'}</td>
            <td style="padding: 12px;">N/A</td>
            <td style="padding: 12px; text-align: center;">${part.quantity || 1}</td>
            <td style="padding: 12px; text-align: right;">${part.estimatedCost || part.actualCost || 'N/A'}</td>
            <td style="padding: 12px;">${part.expectedDelivery ? new Date(part.expectedDelivery).toLocaleDateString('sr-ME') : 'N/A'}</td>
            <td style="padding: 12px; text-align: center;">#${part.serviceId || 'N/A'}</td>
        </tr>
    `).join('');

    return `
        <div style="margin-bottom: 25px;">
            <h2 style="color: #1e40af;">📦 Poručeni rezervni delovi - čeka se isporuka (${parts.length})</h2>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background-color: #dc2626; color: white;">
                            <th style="padding: 15px; text-align: left;">Deo</th>
                            <th style="padding: 15px; text-align: left;">Broj dela</th>
                            <th style="padding: 15px; text-align: left;">Brend</th>
                            <th style="padding: 15px; text-align: center;">Količina</th>
                            <th style="padding: 15px; text-align: right;">Procenjena cena</th>
                            <th style="padding: 15px; text-align: left;">Očekivana isporuka</th>
                            <th style="padding: 15px; text-align: center;">Servis</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${partsHtml}
                    </tbody>
                </table>
            </div>
        </div>`;
  }

  /**
   * Šalje dnevni izveštaj na ComPlus email adresu
   */
  async sendDailyReport(date: Date = new Date(), testEmail?: string): Promise<boolean> {
    try {
      console.log(`[COMPLUS REPORT] Generiram dnevni izveštaj za ${date.toLocaleDateString('sr-ME')}`);

      const data = await this.collectDailyData(date);
      const htmlContent = this.generateReportHTML(data, date);
      
      const subject = `ComPlus Dnevni Izveštaj - ${date.toLocaleDateString('sr-ME')} (${data.totalCompletedServices} servisa)`;
      
      // Test email ili produkjcijski ComPlus email
      const recipientEmail = testEmail || 'servis@complus.me';
      
      const emailSent = await this.emailService.sendEmail({
        to: recipientEmail,
        subject,
        html: htmlContent
      });

      if (emailSent) {
        console.log(`[COMPLUS REPORT] ✅ Dnevni izveštaj uspešno poslat na ${recipientEmail}`);
        console.log(`[COMPLUS REPORT] Sadržaj: ${data.totalCompletedServices} servisa, ${data.visitedClients.length} klijenata`);
        return true;
      } else {
        console.error(`[COMPLUS REPORT] ❌ Neuspešno slanje izveštaja na ${recipientEmail}`);
        return false;
      }

    } catch (error) {
      console.error('[COMPLUS REPORT] Greška pri slanju dnevnog izveštaja:', error);
      return false;
    }
  }
}