import { db } from './db.js';
import { services, clients, appliances, manufacturers, applianceCategories, technicians, sparePartsCatalog, sparePartOrders } from '../shared/schema.js';
import { eq, and, gte, lte, like, or, isNotNull, desc } from 'drizzle-orm';
import { EmailService } from './email-service.js';

// Tipovi za izvještaj
interface ServisKomercReportData {
  reportDate: string;
  totalCompletedServices: number;
  totalVisitedClients: number;
  totalPartsUsed: number;
  totalRevenue: number;
  completedServices: Array<{
    serviceId: string;
    clientName: string;
    clientPhone: string;
    clientAddress: string;
    technicianName: string;
    applianceType: string;
    applianceBrand: string;
    applianceModel: string;
    description: string;
    workPerformed: string;
    completedAt: string;
    cost: string;
    partsUsed: Array<{
      partName: string;
      partCode: string;
      quantity: number;
      price: number;
    }>;
  }>;
}

/**
 * Servis za dnevne izvještaje Servis Komerc-a (Beko servisi)
 * Generiše i šalje automatske dnevne izvještaje putem email-a
 */
export class ServisKomercDailyReportService {
  private emailService: EmailService;

  constructor() {
    this.emailService = EmailService.getInstance();
  }

  /**
   * Prikuplja podatke za dnevni izvještaj Servis Komerc-a
   * @param date Datum za koji se generiše izvještaj (default: danas)
   */
  async collectDailyData(date: Date = new Date()): Promise<ServisKomercReportData> {
    console.log(`[SERVIS KOMERC REPORT] Prikupljam podatke za datum: ${date.toLocaleDateString('sr-ME')}`);

    // Početak i kraj dana
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      console.log('[SERVIS KOMERC REPORT] Prikupljam stvarne podatke iz baze podataka...');
      
      // 1. Završeni servisi za Beko uređaje kreirane od strane Servis Komerc-a
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
          cost: services.cost,
          businessPartnerId: services.businessPartnerId
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
            // Filtriraj samo Beko brendove
            or(
              like(manufacturers.name, '%Beko%'),
              like(manufacturers.name, '%beko%'),
              like(manufacturers.name, '%BEKO%')
            ),
            // Filtriraj po datumu završetka servisa
            gte(services.completedDate, startOfDay.toISOString()),
            lte(services.completedDate, endOfDay.toISOString()),
            // Filtriraj servise kreirane od strane business partner-a (Servis Komerc)
            isNotNull(services.businessPartnerId)
          )
        );

      // 2. Jedinstveni klijenti posećeni za Beko uređaje
      const visitedClientsSet = new Set();
      const visitedClients = completedServices.filter(service => {
        const clientKey = `${service.clientName}-${service.clientPhone}`;
        if (visitedClientsSet.has(clientKey)) {
          return false;
        }
        visitedClientsSet.add(clientKey);
        return true;
      });

      // 3. Prikupljanje rezervnih delova za svaki servis
      const servicesWithParts = await Promise.all(
        completedServices.map(async (service) => {
          const parts = await db
            .select({
              partName: sparePartsCatalog.name,
              partCode: sparePartsCatalog.partCode,
              quantity: sparePartOrders.quantity,
              price: sparePartOrders.estimatedCost
            })
            .from(sparePartOrders)
            .innerJoin(sparePartsCatalog, eq(sparePartOrders.sparePartId, sparePartsCatalog.id))
            .where(eq(sparePartOrders.serviceId, service.serviceId));

          return {
            serviceId: service.serviceId.toString(),
            clientName: service.clientName,
            clientPhone: service.clientPhone,
            clientAddress: service.clientAddress || 'Nije navedeno',
            technicianName: service.technicianName || 'Nije dodeljen',
            applianceType: service.applianceType,
            applianceBrand: service.applianceBrand,
            applianceModel: service.applianceModel || 'Nije naveden',
            description: service.description,
            workPerformed: service.workPerformed || 'Nije navedeno',
            completedAt: service.completedAt || new Date().toISOString(),
            cost: service.cost || '0',
            partsUsed: parts.map(part => ({
              partName: part.partName,
              partCode: part.partCode || 'N/A',
              quantity: part.quantity,
              price: parseFloat(part.price || '0')
            }))
          };
        })
      );

      // 4. Računanje ukupnih statistika
      const totalPartsUsed = servicesWithParts.reduce((sum, service) => 
        sum + service.partsUsed.reduce((partSum, part) => partSum + part.quantity, 0), 0
      );

      const totalRevenue = servicesWithParts.reduce((sum, service) => 
        sum + parseFloat(service.cost || '0'), 0
      );

      const reportData: ServisKomercReportData = {
        reportDate: date.toLocaleDateString('sr-ME', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        totalCompletedServices: completedServices.length,
        totalVisitedClients: visitedClients.length,
        totalPartsUsed,
        totalRevenue,
        completedServices: servicesWithParts
      };

      console.log(`[SERVIS KOMERC REPORT] Izvještaj pripremljen:`);
      console.log(`  - Završenih servisa: ${reportData.totalCompletedServices}`);
      console.log(`  - Posećenih klijenata: ${reportData.totalVisitedClients}`);
      console.log(`  - Korišćenih delova: ${reportData.totalPartsUsed}`);
      console.log(`  - Ukupan prihod: ${reportData.totalRevenue}€`);

      return reportData;

    } catch (error) {
      console.error('[SERVIS KOMERC REPORT] Greška pri prikupljanju podataka:', error);
      throw error;
    }
  }

  /**
   * Generiše HTML sadržaj za izvještaj
   */
  private generateReportHTML(data: ServisKomercReportData): string {
    const dateStr = data.reportDate;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Servis Komerc Dnevni Izvještaj - ${dateStr}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; border-radius: 10px;">
            <h1 style="margin: 0; font-size: 28px;">📊 SERVIS KOMERC</h1>
            <h2 style="margin: 10px 0 0 0; font-size: 20px; opacity: 0.9;">Dnevni Izvještaj - ${dateStr}</h2>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: #f8fafc; border: 2px solid #e2e8f0; padding: 20px; border-radius: 10px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #1e40af; margin-bottom: 5px;">${data.totalCompletedServices}</div>
                <div style="color: #64748b; font-size: 14px;">Završenih servisa</div>
            </div>
            
            <div style="background: #f0fdf4; border: 2px solid #bbf7d0; padding: 20px; border-radius: 10px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #059669; margin-bottom: 5px;">${data.totalVisitedClients}</div>
                <div style="color: #64748b; font-size: 14px;">Posećenih klijenata</div>
            </div>
            
            <div style="background: #fefce8; border: 2px solid #fde047; padding: 20px; border-radius: 10px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #ca8a04; margin-bottom: 5px;">${data.totalPartsUsed}</div>
                <div style="color: #64748b; font-size: 14px;">Korišćenih delova</div>
            </div>
            
            <div style="background: #fdf2f8; border: 2px solid #f9a8d4; padding: 20px; border-radius: 10px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #be185d; margin-bottom: 5px;">${data.totalRevenue.toFixed(2)}€</div>
                <div style="color: #64748b; font-size: 14px;">Ukupan prihod</div>
            </div>
        </div>

        ${data.completedServices.length > 0 ? `
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
            <div style="background: #f8fafc; padding: 15px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0; color: #1e40af; font-size: 18px;">🔧 Detaljan pregled završenih servisa</h3>
            </div>
            
            ${data.completedServices.map(service => `
                <div style="padding: 20px; border-bottom: 1px solid #f1f5f9;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                        <div>
                            <strong style="color: #1e40af;">Servis #${service.serviceId}</strong><br>
                            <span style="color: #64748b; font-size: 14px;">👤 ${service.clientName}</span><br>
                            <span style="color: #64748b; font-size: 14px;">📞 ${service.clientPhone}</span><br>
                            <span style="color: #64748b; font-size: 14px;">📍 ${service.clientAddress}</span>
                        </div>
                        <div>
                            <span style="color: #059669; font-weight: bold;">🔧 ${service.technicianName}</span><br>
                            <span style="color: #64748b; font-size: 14px;">📺 ${service.applianceType}</span><br>
                            <span style="color: #64748b; font-size: 14px;">🏢 ${service.applianceBrand} ${service.applianceModel}</span><br>
                            <span style="color: #be185d; font-weight: bold;">💰 ${service.cost}€</span>
                        </div>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <strong style="color: #1e40af;">📝 Opis problema:</strong><br>
                        <span style="color: #374151;">${service.description}</span>
                    </div>
                    
                    ${service.workPerformed !== 'Nije navedeno' ? `
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <strong style="color: #059669;">✅ Izvršeni rad:</strong><br>
                        <span style="color: #374151;">${service.workPerformed}</span>
                    </div>
                    ` : ''}
                    
                    ${service.partsUsed.length > 0 ? `
                    <div style="background: #fefce8; padding: 15px; border-radius: 8px;">
                        <strong style="color: #ca8a04;">🔧 Korišćeni rezervni delovi:</strong><br>
                        <div style="margin-top: 10px;">
                            ${service.partsUsed.map(part => `
                                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #fde047;">
                                    <span>${part.partName} (${part.partCode})</span>
                                    <span>${part.quantity}x - ${(part.price * part.quantity).toFixed(2)}€</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        ` : `
        <div style="text-align: center; padding: 40px; background: #f8fafc; border-radius: 10px; color: #64748b;">
            <div style="font-size: 48px; margin-bottom: 15px;">📅</div>
            <h3 style="margin: 0; color: #475569;">Nema završenih servisa danas</h3>
            <p style="margin: 10px 0 0 0;">Izvještaj će biti dostupan kada se završe servisi za Beko uređaje.</p>
        </div>
        `}

        <div style="text-align: center; margin-top: 40px; padding: 20px; background: #f1f5f9; border-radius: 10px; color: #64748b; font-size: 12px;">
            <p style="margin: 0;">📧 Automatski dnevni izvještaj generisan ${new Date().toLocaleString('sr-ME')}</p>
            <p style="margin: 5px 0 0 0;">🏢 Frigo Sistem Todosijević - Servis Komerc Partnership</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Šalje dnevni izvještaj putem email-a
   */
  async sendDailyReport(date: Date = new Date(), emailAddress: string): Promise<boolean> {
    try {
      console.log(`[SERVIS KOMERC REPORT] Generiše dnevni izvještaj za ${date.toLocaleDateString('sr-ME')}`);
      
      // Prikupi podatke
      const reportData = await this.collectDailyData(date);
      
      // Generiši HTML
      const htmlContent = this.generateReportHTML(reportData);
      
      // Pošalji email
      const subject = `📊 Servis Komerc - Dnevni Izvještaj ${reportData.reportDate}`;
      
      const success = await this.emailService.sendEmail({
        to: emailAddress,
        subject: subject,
        html: htmlContent
      });

      if (success) {
        console.log(`[SERVIS KOMERC REPORT] ✅ Dnevni izvještaj uspešno poslat na ${emailAddress}`);
        return true;
      } else {
        console.error(`[SERVIS KOMERC REPORT] ❌ Greška pri slanju izvještaja na ${emailAddress}`);
        return false;
      }

    } catch (error) {
      console.error('[SERVIS KOMERC REPORT] ❌ Greška pri slanju dnevnog izvještaja:', error);
      return false;
    }
  }

  /**
   * Testira generiranje izvještaja (bez slanja email-a)
   */
  async testReportGeneration(date: Date = new Date()): Promise<ServisKomercReportData> {
    return await this.collectDailyData(date);
  }
}