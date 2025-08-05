import { db } from './db.js';
import { services, appliances, clients, users, sparePartOrders, manufacturers, applianceCategories, technicians } from '../shared/schema.js';
import { EmailService } from './email-service.js';
import { and, gte, lte, eq, isNotNull, isNull, or, like } from 'drizzle-orm';

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
      console.log('[COMPLUS REPORT] Prikupljam stvarne podatke iz baze podataka...');
      
      // 1. Završeni servisi za ComPlus/Beko uređaje za određeni datum
      const completedServices = await db
        .select({
          serviceId: services.id,
          clientName: clients.fullName,
          clientPhone: clients.phone,
          clientAddress: clients.address,
          technicianName: technicians.fullName,
          applianceType: applianceCategories.name,
          applianceBrand: manufacturers.name,
          applianceModel: appliances.model,
          description: services.description,
          workPerformed: services.technicianNotes,
          completedAt: services.completedDate,
          status: services.status,
          cost: services.cost
        })
        .from(services)
        .innerJoin(appliances, eq(services.applianceId, appliances.id))
        .innerJoin(clients, eq(appliances.clientId, clients.id))
        .innerJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .innerJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
        .leftJoin(technicians, eq(services.technicianId, technicians.id))
        .where(
          and(
            eq(services.status, 'completed'),
            isNotNull(services.completedDate),
            // Filtriraj samo ComPlus/Beko brendove
            or(
              like(manufacturers.name, '%Beko%'),
              like(manufacturers.name, '%ComPlus%'),
              like(manufacturers.name, '%beko%'),
              like(manufacturers.name, '%complus%'),
              like(manufacturers.name, '%BEKO%'),
              like(manufacturers.name, '%COMPLUS%')
            ),
            // Filtriraj po datumu završetka servisa
            gte(services.completedDate, startOfDay.toISOString()),
            lte(services.completedDate, endOfDay.toISOString())
          )
        );

      // 2. Jedinstveni klijenti posećeni za ComPlus/Beko uređaje
      const visitedClientsSet = new Set();
      const visitedClients = completedServices.filter(service => {
        const clientKey = `${service.clientName}-${service.clientPhone}`;
        if (!visitedClientsSet.has(clientKey)) {
          visitedClientsSet.add(clientKey);
          return true;
        }
        return false;
      });

      // 3. Potrošeni rezervni delovi iz usedParts JSON polja u završenim servisima
      const servicesWithUsedParts = await db
        .select({
          serviceId: services.id,
          usedPartsJson: services.usedParts,
          completedAt: services.completedDate,
          clientName: clients.fullName,
          applianceBrand: manufacturers.name
        })
        .from(services)
        .innerJoin(appliances, eq(services.applianceId, appliances.id))
        .innerJoin(clients, eq(appliances.clientId, clients.id))
        .innerJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .where(
          and(
            eq(services.status, 'completed'),
            isNotNull(services.completedDate),
            isNotNull(services.usedParts),
            // Filtriraj samo ComPlus/Beko brendove  
            or(
              like(manufacturers.name, '%Beko%'),
              like(manufacturers.name, '%ComPlus%'),
              like(manufacturers.name, '%beko%'),
              like(manufacturers.name, '%complus%'),
              like(manufacturers.name, '%BEKO%'),
              like(manufacturers.name, '%COMPLUS%')
            ),
            // Filtriraj po datumu
            gte(services.completedDate, startOfDay.toISOString()),
            lte(services.completedDate, endOfDay.toISOString())
          )
        );

      // Parsiraj JSON polja da dobijem listu korišćenih delova
      const usedParts: any[] = [];
      servicesWithUsedParts.forEach(service => {
        try {
          if (service.usedPartsJson) {
            const parts = JSON.parse(service.usedPartsJson);
            if (Array.isArray(parts)) {
              parts.forEach((part: any) => {
                usedParts.push({
                  ...part,
                  serviceId: service.serviceId,
                  usedAt: service.completedAt,
                  clientName: service.clientName,
                  applianceBrand: service.applianceBrand
                });
              });
            }
          }
        } catch (e) {
          console.warn(`[COMPLUS REPORT] Invalid JSON u usedParts za servis ${service.serviceId}:`, e);
        }
      });

      // 4. Poručeni rezervni delovi koji još nisu stigli
      const orderedParts = await db
        .select({
          partId: sparePartOrders.id,
          partName: sparePartOrders.partName,
          partNumber: sparePartOrders.partNumber,
          quantity: sparePartOrders.quantity,
          estimatedCost: sparePartOrders.estimatedCost,
          actualCost: sparePartOrders.actualCost,
          serviceId: sparePartOrders.serviceId,
          status: sparePartOrders.status,
          orderedAt: sparePartOrders.orderDate,
          expectedDelivery: sparePartOrders.expectedDelivery,
          clientName: clients.fullName,
          applianceBrand: manufacturers.name
        })
        .from(sparePartOrders)
        .leftJoin(services, eq(sparePartOrders.serviceId, services.id))
        .leftJoin(appliances, eq(services.applianceId, appliances.id))
        .leftJoin(clients, eq(appliances.clientId, clients.id))
        .leftJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .where(
          and(
            // Delovi koji su poručeni ali još nisu stigli
            or(
              eq(sparePartOrders.status, 'ordered'),
              eq(sparePartOrders.status, 'pending')
            ),
            isNotNull(sparePartOrders.orderDate),
            // Filtriraj ComPlus/Beko brendove ili admin narudžbe
            or(
              // Delovi vezani za ComPlus/Beko servise
              and(
                isNotNull(sparePartOrders.serviceId),
                or(
                  like(manufacturers.name, '%Beko%'),
                  like(manufacturers.name, '%ComPlus%'),
                  like(manufacturers.name, '%beko%'),
                  like(manufacturers.name, '%complus%'),
                  like(manufacturers.name, '%BEKO%'),
                  like(manufacturers.name, '%COMPLUS%')
                )
              ),
              // Admin narudžbe bez vezivanja za servis (pretpostavljamo da su ComPlus)
              and(
                isNull(sparePartOrders.serviceId),
                or(
                  like(sparePartOrders.partName, '%ComPlus%'),
                  like(sparePartOrders.partName, '%Beko%')
                )
              )
            )
          )
        );

      console.log(`[COMPLUS REPORT] Pronađeni stvarni podaci:`);
      console.log(`- ${completedServices.length} završenih servisa`);
      console.log(`- ${visitedClients.length} posećenih klijenata`);
      console.log(`- ${usedParts.length} potrošenih delova`);
      console.log(`- ${orderedParts.length} poručenih delova`);

      return {
        completedServices,
        visitedClients,
        usedParts,
        orderedParts,
        totalCompletedServices: completedServices.length,
        totalUsedParts: usedParts.length,
        totalOrderedParts: orderedParts.length
      };

    } catch (error) {
      console.error('[COMPLUS REPORT] Greška pri prikupljanju podataka:', error);
      console.error('[COMPLUS REPORT] Error details:', {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
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

  /**
   * Generiše profesionalni HTML izveštaj sa grafikonima za poslovne partnere
   */
  generateProfessionalReportHTML(data: DailyReportData, reportDate: Date): string {
    const dateStr = reportDate.toLocaleDateString('sr-ME', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Pripremimo podatke za grafikone
    const chartData = this.prepareChartData(data);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>ComPlus Poslovni Izvještaj - ${dateStr}</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 40px; border-radius: 15px; text-align: center; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(30, 64, 175, 0.3); }
            .header h1 { margin: 0; font-size: 36px; font-weight: 300; }
            .header p { margin: 15px 0 0 0; font-size: 20px; opacity: 0.9; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px; }
            .stat-card { background: white; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; transition: transform 0.2s ease; }
            .stat-card:hover { transform: translateY(-2px); }
            .stat-number { font-size: 48px; font-weight: bold; margin-bottom: 10px; }
            .stat-label { color: #64748b; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
            .section { background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
            .section h2 { color: #1e40af; margin-top: 0; font-size: 24px; display: flex; align-items: center; gap: 10px; }
            .chart-container { position: relative; height: 400px; margin: 20px 0; }
            .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            @media (max-width: 768px) { .two-column { grid-template-columns: 1fr; } }
            .service-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .service-table th, .service-table td { padding: 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .service-table th { background: #f1f5f9; font-weight: 600; color: #374151; }
            .service-table tr:hover { background: #f8fafc; }
            .footer { text-align: center; margin-top: 50px; padding: 30px; background: #1e293b; color: white; border-radius: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>📊 ComPlus Poslovni Izvještaj</h1>
                <p>${dateStr}</p>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number" style="color: #059669;">${data.totalCompletedServices}</div>
                    <div class="stat-label">Završenih Servisa</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #0891b2;">${data.visitedClients.length}</div>
                    <div class="stat-label">Posećenih Klijenata</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #7c3aed;">${data.totalUsedParts}</div>
                    <div class="stat-label">Potrošenih Delova</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #dc2626;">${data.totalOrderedParts}</div>
                    <div class="stat-label">Poručenih Delova</div>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="two-column">
                <div class="section">
                    <h2>📈 Aktivnost po Kategorijama</h2>
                    <div class="chart-container">
                        <canvas id="categoryChart"></canvas>
                    </div>
                </div>
                <div class="section">
                    <h2>🔧 Servisi po Tehničarima</h2>
                    <div class="chart-container">
                        <canvas id="technicianChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Services Details -->
            ${this.generateProfessionalServicesSection(data.completedServices)}

            <!-- Parts Usage -->
            <div class="section">
                <h2>🔩 Analiza Potrošenih Delova</h2>
                <div class="chart-container">
                    <canvas id="partsChart"></canvas>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p style="margin: 0; font-size: 16px;">
                    🏢 <strong>Frigo Sistem Todosijević</strong><br>
                    ComPlus Poslovni Partner | Automatski Generisan Izvještaj<br>
                    ${new Date().toLocaleString('sr-ME')}
                </p>
            </div>
        </div>

        <script>
            // Chart.js konfiguracija sa responsive design
            Chart.defaults.responsive = true;
            Chart.defaults.maintainAspectRatio = false;

            // Kategorije Chart
            const categoryCtx = document.getElementById('categoryChart').getContext('2d');
            new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: ${JSON.stringify(chartData.categories.labels)},
                    datasets: [{
                        data: ${JSON.stringify(chartData.categories.data)},
                        backgroundColor: ['#059669', '#0891b2', '#7c3aed', '#dc2626', '#f59e0b', '#8b5cf6'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    plugins: {
                        legend: { position: 'bottom' },
                        title: { display: true, text: 'Raspodela po Kategorijama Uređaja' }
                    }
                }
            });

            // Tehničari Chart
            const technicianCtx = document.getElementById('technicianChart').getContext('2d');
            new Chart(technicianCtx, {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(chartData.technicians.labels)},
                    datasets: [{
                        label: 'Broj Servisa',
                        data: ${JSON.stringify(chartData.technicians.data)},
                        backgroundColor: 'rgba(30, 64, 175, 0.6)',
                        borderColor: 'rgba(30, 64, 175, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    },
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Produktivnost Tehničara' }
                    }
                }
            });

            // Delovi Chart
            const partsCtx = document.getElementById('partsChart').getContext('2d');
            new Chart(partsCtx, {
                type: 'horizontalBar',
                data: {
                    labels: ${JSON.stringify(chartData.parts.labels)},
                    datasets: [{
                        label: 'Količina',
                        data: ${JSON.stringify(chartData.parts.data)},
                        backgroundColor: 'rgba(124, 58, 237, 0.6)',
                        borderColor: 'rgba(124, 58, 237, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        x: { beginAtZero: true }
                    },
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Najkorišćeniji Rezervni Delovi' }
                    }
                }
            });
        </script>
    </body>
    </html>`;
  }

  /**
   * Priprema podatke za grafikone
   */
  private prepareChartData(data: DailyReportData) {
    // Kategorije uređaja
    const categoryMap = new Map();
    data.completedServices.forEach(service => {
      const category = service.applianceType || 'Ostalo';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    // Tehničari
    const technicianMap = new Map();
    data.completedServices.forEach(service => {
      const technician = service.technicianName || 'Nepoznat';
      technicianMap.set(technician, (technicianMap.get(technician) || 0) + 1);
    });

    // Delovi
    const partsMap = new Map();
    data.usedParts.forEach(part => {
      const partName = part.partName || 'Nepoznat deo';
      partsMap.set(partName, (partsMap.get(partName) || 0) + (part.quantity || 1));
    });

    return {
      categories: {
        labels: Array.from(categoryMap.keys()),
        data: Array.from(categoryMap.values())
      },
      technicians: {
        labels: Array.from(technicianMap.keys()),
        data: Array.from(technicianMap.values())
      },
      parts: {
        labels: Array.from(partsMap.keys()).slice(0, 10), // Top 10
        data: Array.from(partsMap.values()).slice(0, 10)
      }
    };
  }

  /**
   * Generiše profesionalnu sekciju za servise
   */
  private generateProfessionalServicesSection(services: any[]): string {
    if (services.length === 0) {
      return `
        <div class="section">
            <h2>🔧 Detaljni Pregled Servisa</h2>
            <p style="color: #6b7280; font-style: italic; text-align: center; padding: 40px;">
                Nema završenih servisa za ovaj dan.
            </p>
        </div>`;
    }

    const servicesHtml = services.map((service, index) => `
        <tr>
            <td><strong>#${service.serviceId}</strong></td>
            <td>${service.clientName}</td>
            <td>${service.clientPhone || 'N/A'}</td>
            <td>${service.technicianName || 'N/A'}</td>
            <td>${service.applianceType} ${service.applianceBrand}</td>
            <td>${service.applianceModel || 'N/A'}</td>
            <td>${service.workPerformed || 'N/A'}</td>
            <td><strong>${service.cost ? service.cost + ' RSD' : 'N/A'}</strong></td>
            <td>${new Date(service.completedAt).toLocaleTimeString('sr-ME', { hour: '2-digit', minute: '2-digit' })}</td>
        </tr>
    `).join('');

    return `
        <div class="section">
            <h2>🔧 Detaljni Pregled Servisa (${services.length})</h2>
            <div style="overflow-x: auto;">
                <table class="service-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Klijent</th>
                            <th>Telefon</th>
                            <th>Tehničar</th>
                            <th>Uređaj</th>
                            <th>Model</th>
                            <th>Izvršen Rad</th>
                            <th>Troškovi</th>
                            <th>Vreme</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${servicesHtml}
                    </tbody>
                </table>
            </div>
        </div>`;
  }

  /**
   * Šalje profesionalni dnevni izveštaj sa grafikonima za poslovne partnere
   */
  async sendProfessionalDailyReport(date: Date = new Date(), recipientEmail: string): Promise<boolean> {
    try {
      console.log(`[COMPLUS REPORT] Generiram profesionalni dnevni izveštaj za ${date.toLocaleDateString('sr-ME')} → ${recipientEmail}`);

      const data = await this.collectDailyData(date);
      const htmlContent = this.generateProfessionalReportHTML(data, date);
      
      const subject = `📊 ComPlus Poslovni Izvještaj - ${date.toLocaleDateString('sr-ME')} (${data.totalCompletedServices} servisa)`;
      
      const emailSent = await this.emailService.sendEmail({
        to: recipientEmail,
        subject,
        html: htmlContent
      });

      if (emailSent) {
        console.log(`[COMPLUS REPORT] ✅ Profesionalni dnevni izveštaj uspešno poslat na ${recipientEmail}`);
        console.log(`[COMPLUS REPORT] Sadržaj: ${data.totalCompletedServices} servisa, ${data.visitedClients.length} klijenata sa grafikonima`);
        return true;
      } else {
        console.error(`[COMPLUS REPORT] ❌ Neuspešno slanje profesionalnog izveštaja na ${recipientEmail}`);
        return false;
      }

    } catch (error) {
      console.error(`[COMPLUS REPORT] Greška pri slanju profesionalnog dnevnog izveštaja na ${recipientEmail}:`, error);
      return false;
    }
  }
}