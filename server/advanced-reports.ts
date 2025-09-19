import { db } from './db.js';
import { services, appliances, clients, technicians, sparePartOrders, manufacturers, applianceCategories } from '../shared/schema.js';
import { EmailService } from './email-service.js';
import { and, gte, lte, eq, isNotNull, isNull, or, like, sql, count, sum, desc } from 'drizzle-orm';

interface MonthlyReportData {
  month: string;
  year: number;
  totalServices: number;
  completedServices: any[];
  totalClients: number;
  visitedClients: any[];
  totalRevenue: number;
  partsUsed: any[];
  partsOrdered: any[];
  topTechnicians: any[];
  servicesByCategory: any[];
  averageCompletionTime: number;
}

interface AnalyticsData {
  dailyStats: any[];
  weeklyTrends: any[];
  monthlyComparison: any[];
  technicianPerformance: any[];
  clientSatisfaction: any[];
  partsCostAnalysis: any[];
}

export class AdvancedReportsService {
  
  /**
   * Generiše mesečni ComPlus izveštaj sa detaljnom statistikom
   */
  static async generateMonthlyReport(month: number, year: number): Promise<MonthlyReportData> {
    console.log(`[ADVANCED REPORTS] Generiram mesečni ComPlus izveštaj za ${month}/${year}`);
    
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    try {
      // 1. Osnovne statistike završenih servisa
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
          cost: services.cost,
          createdAt: services.createdAt,
          warrantyStatus: services.warrantyStatus
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
            or(
              like(manufacturers.name, '%Beko%'),
              like(manufacturers.name, '%ComPlus%'),
              like(manufacturers.name, '%beko%'),
              like(manufacturers.name, '%complus%'),
              like(manufacturers.name, '%BEKO%'),
              like(manufacturers.name, '%COMPLUS%')
            ),
            gte(services.completedDate, startOfMonth.toISOString()),
            lte(services.completedDate, endOfMonth.toISOString())
          )
        )
        .orderBy(desc(services.completedDate));

      // 2. Jedinstveni klijenti posećeni tokom meseca
      const visitedClientsSet = new Set();
      const visitedClients = completedServices.filter(service => {
        const clientKey = `${service.clientName}-${service.clientPhone}`;
        if (!visitedClientsSet.has(clientKey)) {
          visitedClientsSet.add(clientKey);
          return true;
        }
        return false;
      });

      // 3. Ukupan prihod (parsing cost field)
      let totalRevenue = 0;
      completedServices.forEach(service => {
        if (service.cost) {
          const cost = parseFloat(service.cost.replace(/[^\d.-]/g, ''));
          if (!isNaN(cost)) {
            totalRevenue += cost;
          }
        }
      });

      // 4. Top tehničari po broju servisa
      const technicianStats = new Map();
      completedServices.forEach(service => {
        if (service.technicianName) {
          const current = technicianStats.get(service.technicianName) || { 
            name: service.technicianName, 
            services: 0, 
            revenue: 0 
          };
          current.services++;
          if (service.cost) {
            const cost = parseFloat(service.cost.replace(/[^\d.-]/g, ''));
            if (!isNaN(cost)) {
              current.revenue += cost;
            }
          }
          technicianStats.set(service.technicianName, current);
        }
      });
      
      const topTechnicians = Array.from(technicianStats.values())
        .sort((a, b) => b.services - a.services)
        .slice(0, 5);

      // 5. Servisi po kategorijama uređaja
      const categoryStats = new Map();
      completedServices.forEach(service => {
        const current = categoryStats.get(service.applianceType) || { 
          category: service.applianceType, 
          count: 0 
        };
        current.count++;
        categoryStats.set(service.applianceType, current);
      });
      
      const servicesByCategory = Array.from(categoryStats.values())
        .sort((a, b) => b.count - a.count);

      // 6. Prosečno vreme završetka servisa (u danima)
      let totalCompletionTime = 0;
      let validServices = 0;
      completedServices.forEach(service => {
        if (service.createdAt && service.completedAt) {
          const created = new Date(service.createdAt);
          const completed = new Date(service.completedAt);
          const diffTime = Math.abs(completed.getTime() - created.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          totalCompletionTime += diffDays;
          validServices++;
        }
      });
      
      const averageCompletionTime = validServices > 0 ? totalCompletionTime / validServices : 0;

      // 7. Korišćeni delovi tokom meseca
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
            or(
              like(manufacturers.name, '%Beko%'),
              like(manufacturers.name, '%ComPlus%'),
              like(manufacturers.name, '%beko%'),
              like(manufacturers.name, '%complus%'),
              like(manufacturers.name, '%BEKO%'),
              like(manufacturers.name, '%COMPLUS%')
            ),
            gte(services.completedDate, startOfMonth.toISOString()),
            lte(services.completedDate, endOfMonth.toISOString())
          )
        );

      const partsUsed: any[] = [];
      servicesWithUsedParts.forEach(service => {
        try {
          if (service.usedPartsJson) {
            const parts = JSON.parse(service.usedPartsJson);
            if (Array.isArray(parts)) {
              parts.forEach((part: any) => {
                partsUsed.push({
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
          console.warn(`[ADVANCED REPORTS] Invalid JSON u usedParts za servis ${service.serviceId}:`, e);
        }
      });

      // 8. Poručeni delovi tokom meseca
      const partsOrdered = await db
        .select({
          partId: sparePartOrders.id,
          partName: sparePartOrders.partName,
          partNumber: sparePartOrders.partNumber,
          quantity: sparePartOrders.quantity,
          estimatedCost: sparePartOrders.estimatedCost,
          actualCost: sparePartOrders.actualCost,
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
            isNotNull(sparePartOrders.orderDate),
            sql`${sparePartOrders.orderDate} >= ${startOfMonth.toISOString()}`,
            sql`${sparePartOrders.orderDate} <= ${endOfMonth.toISOString()}`,
            or(
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
              and(
                isNull(sparePartOrders.serviceId),
                or(
                  like(sparePartOrders.partName, '%ComPlus%'),
                  like(sparePartOrders.partName, '%Beko%')
                )
              )
            )
          )
        )
        .orderBy(desc(sparePartOrders.orderDate));

      console.log(`[ADVANCED REPORTS] Mesečni izveštaj generisan:`);
      console.log(`- ${completedServices.length} završenih servisa`);
      console.log(`- ${visitedClients.length} posećenih klijenata`);
      console.log(`- ${totalRevenue.toFixed(2)} RSD ukupan prihod`);
      console.log(`- ${partsUsed.length} korišćenih delova`);
      console.log(`- ${partsOrdered.length} poručenih delova`);

      return {
        month: `${month}/${year}`,
        year,
        totalServices: completedServices.length,
        completedServices,
        totalClients: visitedClients.length,
        visitedClients,
        totalRevenue,
        partsUsed,
        partsOrdered,
        topTechnicians,
        servicesByCategory,
        averageCompletionTime
      };

    } catch (error) {
      console.error('[ADVANCED REPORTS] Greška pri generisanju mesečnog izveštaja:', error);
      throw error;
    }
  }

  /**
   * Generiše analytics dashboard podatke
   */
  static async generateAnalyticsData(startDate: Date, endDate: Date): Promise<AnalyticsData> {
    console.log(`[ADVANCED REPORTS] Generiram analytics podatke od ${startDate.toISOString()} do ${endDate.toISOString()}`);
    
    try {
      // 1. Dnevne statistike
      const dailyStatsQuery = await db
        .select({
          date: sql<string>`DATE(${services.completedDate})`.as('date'),
          servicesCount: count(services.id).as('services_count'),
          totalRevenue: sql<number>`0`.as('total_revenue')
        })
        .from(services)
        .innerJoin(appliances, eq(services.applianceId, appliances.id))
        .innerJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .where(
          and(
            eq(services.status, 'completed'),
            isNotNull(services.completedDate),
            or(
              like(manufacturers.name, '%Beko%'),
              like(manufacturers.name, '%ComPlus%'),
              like(manufacturers.name, '%beko%'),
              like(manufacturers.name, '%complus%'),
              like(manufacturers.name, '%BEKO%'),
              like(manufacturers.name, '%COMPLUS%')
            ),
            gte(services.completedDate, startDate.toISOString()),
            lte(services.completedDate, endDate.toISOString())
          )
        )
        .groupBy(sql`DATE(${services.completedDate})`)
        .orderBy(sql`DATE(${services.completedDate})`);

      // 2. Performance tehničara
      const technicianPerformanceQuery = await db
        .select({
          technicianName: technicians.fullName,
          servicesCount: count(services.id).as('services_count'),
          avgCompletionDays: sql<number>`AVG(EXTRACT(DAY FROM (CAST(${services.completedDate} AS TIMESTAMP) - CAST(${services.createdAt} AS TIMESTAMP))))`.as('avg_completion_days'),
          totalRevenue: sql<number>`0`.as('total_revenue')
        })
        .from(services)
        .innerJoin(appliances, eq(services.applianceId, appliances.id))
        .innerJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .leftJoin(technicians, eq(services.technicianId, technicians.id))
        .where(
          and(
            eq(services.status, 'completed'),
            isNotNull(services.completedDate),
            isNotNull(services.technicianId),
            or(
              like(manufacturers.name, '%Beko%'),
              like(manufacturers.name, '%ComPlus%'),
              like(manufacturers.name, '%beko%'),
              like(manufacturers.name, '%complus%'),
              like(manufacturers.name, '%BEKO%'),
              like(manufacturers.name, '%COMPLUS%')
            ),
            gte(services.completedDate, startDate.toISOString()),
            lte(services.completedDate, endDate.toISOString())
          )
        )
        .groupBy(technicians.fullName)
        .orderBy(desc(count(services.id)));

      console.log(`[ADVANCED REPORTS] Analytics podaci generirani`);
      console.log(`- ${dailyStatsQuery.length} dnevnih statistika`);
      console.log(`- ${technicianPerformanceQuery.length} tehničara u analizi`);

      return {
        dailyStats: dailyStatsQuery,
        weeklyTrends: [], // Implementiraće se kasnije
        monthlyComparison: [], // Implementiraće se kasnije
        technicianPerformance: technicianPerformanceQuery,
        clientSatisfaction: [], // Implementiraće se kasnije
        partsCostAnalysis: [] // Implementiraće se kasnije
      };

    } catch (error) {
      console.error('[ADVANCED REPORTS] Greška pri generisanju analytics podataka:', error);
      throw error;
    }
  }

  /**
   * Šalje mesečni ComPlus izveštaj putem email-a
   */
  static async sendMonthlyReportEmail(reportData: MonthlyReportData, emailAddress: string): Promise<boolean> {
    try {
      console.log(`[ADVANCED REPORTS] Slanje mesečnog izveštaja na ${emailAddress}`);
      
      const subject = `ComPlus Mesečni Izveštaj - ${reportData.month}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
            .stat-card { background: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; }
            .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .table th { background-color: #f2f2f2; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ComPlus Mesečni Izveštaj</h1>
            <h2>${reportData.month}</h2>
          </div>
          
          <div class="content">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${reportData.totalServices}</div>
                <div>Završenih Servisa</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${reportData.totalClients}</div>
                <div>Posećenih Klijenata</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${reportData.totalRevenue.toFixed(2)} RSD</div>
                <div>Ukupan Prihod</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${reportData.averageCompletionTime.toFixed(1)} dana</div>
                <div>Prosečno Vreme Završetka</div>
              </div>
            </div>

            <h3>Top Tehničari</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Tehničar</th>
                  <th>Broj Servisa</th>
                  <th>Prihod (RSD)</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.topTechnicians.map(tech => `
                  <tr>
                    <td>${tech.name}</td>
                    <td>${tech.services}</td>
                    <td>${tech.revenue.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <h3>Servisi po Kategorijama</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Kategorija Uređaja</th>
                  <th>Broj Servisa</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.servicesByCategory.map(cat => `
                  <tr>
                    <td>${cat.category}</td>
                    <td>${cat.count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <h3>Rezime Rezervnih Delova</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${reportData.partsUsed.length}</div>
                <div>Korišćenih Delova</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${reportData.partsOrdered.length}</div>
                <div>Poručenih Delova</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Generirano automatski od strane Frigo Sistem Todosijević</p>
            <p>Datum: ${new Date().toLocaleDateString('sr-RS')}</p>
          </div>
        </body>
        </html>
      `;

      const emailService = new EmailService();
      const result = await emailService.sendEmail({
        to: emailAddress,
        subject,
        html: htmlContent
      });

      console.log(`[ADVANCED REPORTS] Mesečni izveštaj ${result ? 'uspešno poslat' : 'nije poslat'}`);
      return result;

    } catch (error) {
      console.error('[ADVANCED REPORTS] Greška pri slanju mesečnog izveštaja:', error);
      return false;
    }
  }
}