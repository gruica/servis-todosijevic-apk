import { db } from './db.js';
import { services, clients, appliances, manufacturers, applianceCategories, technicians, sparePartOrders, removedParts } from '../shared/schema.js';
import { and, eq, isNotNull, like, or, gte, lte } from 'drizzle-orm';
import { EmailService } from './email-service.js';

interface BekoReportData {
  totalCompletedServices: number;
  visitedClients: Array<{
    name: string;
    phone: string;
    address: string;
    serviceCount: number;
  }>;
  totalUsedParts: number;
  completedServices: Array<{
    serviceId: number;
    clientName: string;
    clientPhone: string;
    clientAddress: string;
    technicianName: string;
    applianceType: string;
    applianceBrand: string;
    applianceModel: string;
    description: string;
    workPerformed: string;
    completedAt: Date;
    status: string;
    cost: number | null;
  }>;
  usedParts: Array<{
    partName: string;
    quantity: number;
    serviceId: number;
    clientName: string;
  }>;
}

/**
 * Klasa za generisanje i slanje dnevnih Beko izveštaja
 * Fokus na uređaje servisirane u garantnom roku
 */
export class BekoDailyReportService {
  private emailService: EmailService;

  constructor() {
    this.emailService = EmailService.getInstance();
  }

  /**
   * Prikuplja podatke za dnevni izveštaj - samo Beko uređaji u garanciji
   * @param date Datum za koji se generiše izveštaj (default: danas)
   */
  async collectDailyData(date: Date = new Date()): Promise<BekoReportData> {
    console.log(`[BEKO REPORT] Prikupljam podatke za datum: ${date.toLocaleDateString('sr-ME')}`);

    // Početak i kraj dana
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      console.log('[BEKO REPORT] Prikupljam stvarne podatke iz baze podataka...');
      
      // 1. Završeni servisi za Beko uređaje u garantnom roku za određeni datum
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
          isWarrantyService: services.isWarrantyService // Ključno polje za garanciju
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
            gte(services.completedDate, startOfDay),
            lte(services.completedDate, endOfDay),
            // KLJUČNO: Filtriraraj samo Beko brendove
            or(
              like(manufacturers.name, '%Beko%'),
              like(manufacturers.name, '%beko%'),
              like(manufacturers.name, '%BEKO%')
            ),
            // KLJUČNO: Samo garantni servisi
            eq(services.isWarrantyService, true)
          )
        );

      console.log(`[BEKO REPORT] Pronađeno ${completedServices.length} završenih Beko garantnih servisa`);

      // 2. Rezervni delovi korišćeni u tim servisima
      const usedParts = completedServices.length > 0 ? await db
        .select({
          partName: sparePartOrders.partName,
          quantity: sparePartOrders.quantity,
          serviceId: sparePartOrders.serviceId,
          clientName: clients.fullName
        })
        .from(sparePartOrders)
        .innerJoin(services, eq(sparePartOrders.serviceId, services.id))
        .innerJoin(appliances, eq(services.applianceId, appliances.id))
        .innerJoin(clients, eq(appliances.clientId, clients.id))
        .where(
          and(
            // Samo delovi iz završenih servisa
            eq(services.status, 'completed'),
            isNotNull(services.completedDate),
            gte(services.completedDate, startOfDay),
            lte(services.completedDate, endOfDay),
            eq(services.isWarrantyService, true) // Samo garantni servisi
          )
        ) : [];

      // 3. Ukupan broj korišćenih delova
      const totalUsedParts = usedParts.reduce((sum, part) => sum + part.quantity, 0);

      // 4. Klijenti koji su servisirani
      const visitedClientsMap = new Map();
      completedServices.forEach(service => {
        const key = service.clientName;
        if (visitedClientsMap.has(key)) {
          visitedClientsMap.get(key).serviceCount += 1;
        } else {
          visitedClientsMap.set(key, {
            name: service.clientName,
            phone: service.clientPhone,
            address: service.clientAddress,
            serviceCount: 1
          });
        }
      });

      const visitedClients = Array.from(visitedClientsMap.values());

      const reportData: BekoReportData = {
        totalCompletedServices: completedServices.length,
        visitedClients,
        totalUsedParts,
        completedServices: completedServices.map(service => ({
          serviceId: service.serviceId,
          clientName: service.clientName || 'Nepoznat klijent',
          clientPhone: service.clientPhone || 'Nepoznat telefon',
          clientAddress: service.clientAddress || 'Nepoznata adresa',
          technicianName: service.technicianName || 'Nepoznat serviser',
          applianceType: service.applianceType || 'Nepoznat tip',
          applianceBrand: service.applianceBrand || 'Nepoznat brend',
          applianceModel: service.applianceModel || 'Nepoznat model',
          description: service.description || 'Nema opisa',
          workPerformed: service.workPerformed || 'Nema beleški',
          completedAt: service.completedAt,
          status: service.status,
          cost: service.cost
        })),
        usedParts
      };

      console.log(`[BEKO REPORT] Izveštaj pripremljen: ${reportData.totalCompletedServices} servisa, ${reportData.visitedClients.length} klijenata, ${reportData.totalUsedParts} delova`);
      return reportData;

    } catch (error) {
      console.error('[BEKO REPORT] Greška pri prikupljanju podataka:', error);
      throw error;
    }
  }

  /**
   * Generiše profesionalni HTML izveštaj za Beko garantne servise
   */
  generateProfessionalReportHTML(data: BekoReportData, reportDate: Date): string {
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
        <title>Beko Garantni Servisi - Dnevni Izveštaj - ${dateStr}</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 40px; border-radius: 15px; text-align: center; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(220, 38, 38, 0.3); }
            .header h1 { margin: 0; font-size: 36px; font-weight: 300; }
            .header p { margin: 15px 0 0 0; font-size: 20px; opacity: 0.9; }
            .warranty-badge { background: #059669; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-top: 10px; display: inline-block; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px; }
            .stat-card { background: white; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; transition: transform 0.2s ease; }
            .stat-card:hover { transform: translateY(-2px); }
            .stat-number { font-size: 48px; font-weight: bold; margin-bottom: 10px; }
            .stat-label { color: #64748b; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
            .section { background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
            .section h2 { color: #dc2626; margin-top: 0; font-size: 24px; display: flex; align-items: center; gap: 10px; }
            .chart-container { position: relative; height: 400px; margin: 20px 0; }
            .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            @media (max-width: 768px) { .two-column { grid-template-columns: 1fr; } }
            .service-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .service-table th, .service-table td { padding: 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .service-table th { background: #f1f5f9; font-weight: 600; color: #374151; }
            .service-table tr:hover { background: #f8fafc; }
            .footer { text-align: center; margin-top: 50px; padding: 30px; background: #1e293b; color: white; border-radius: 12px; }
            .beko-red { color: #dc2626; }
            .warranty-indicator { background: #10b981; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>🔧 Beko Garantni Servisi</h1>
                <p>Dnevni Izveštaj - ${dateStr}</p>
                <div class="warranty-badge">✅ SAMO GARANTNI SERVISI</div>
            </div>

            <!-- Statistike -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number beko-red">${data.totalCompletedServices}</div>
                    <div class="stat-label">Završenih servisa</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number beko-red">${data.visitedClients.length}</div>
                    <div class="stat-label">Posećenih klijenata</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number beko-red">${data.totalUsedParts}</div>
                    <div class="stat-label">Korišćenih delova</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number beko-red">${data.completedServices.reduce((sum, s) => sum + (s.cost || 0), 0).toLocaleString('sr-ME')} RSD</div>
                    <div class="stat-label">Ukupna vrednost</div>
                </div>
            </div>

            <!-- Grafikoni -->
            <div class="two-column">
                <div class="section">
                    <h2>📊 Tipovi uređaja</h2>
                    <div class="chart-container">
                        <canvas id="applianceChart"></canvas>
                    </div>
                </div>
                <div class="section">
                    <h2>🔧 Serviseri</h2>
                    <div class="chart-container">
                        <canvas id="technicianChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Detaljni servisi -->
            <div class="section">
                <h2>📋 Detaljni pregled servisa</h2>
                <table class="service-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Klijent</th>
                            <th>Uređaj</th>
                            <th>Serviser</th>
                            <th>Opis posla</th>
                            <th>Status</th>
                            <th>Trošak</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.completedServices.map(service => `
                        <tr>
                            <td><strong>#${service.serviceId}</strong></td>
                            <td>
                                <strong>${service.clientName}</strong><br>
                                <small>${service.clientPhone}</small>
                            </td>
                            <td>
                                <strong>${service.applianceBrand} ${service.applianceModel}</strong><br>
                                <small>${service.applianceType}</small>
                                <br><span class="warranty-indicator">GARANCIJA</span>
                            </td>
                            <td>${service.technicianName}</td>
                            <td>
                                <strong>Problem:</strong> ${service.description}<br>
                                <strong>Uradeno:</strong> ${service.workPerformed}
                            </td>
                            <td><span style="color: #059669; font-weight: bold;">✅ Završeno</span></td>
                            <td><strong>${service.cost ? service.cost.toLocaleString('sr-ME') + ' RSD' : 'Garantno'}</strong></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Korišćeni delovi -->
            ${data.usedParts.length > 0 ? `
            <div class="section">
                <h2>🔩 Korišćeni rezervni delovi</h2>
                <table class="service-table">
                    <thead>
                        <tr>
                            <th>Naziv dela</th>
                            <th>Količina</th>
                            <th>Servis ID</th>
                            <th>Klijent</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.usedParts.map(part => `
                        <tr>
                            <td><strong>${part.partName}</strong></td>
                            <td>${part.quantity}</td>
                            <td>#${part.serviceId}</td>
                            <td>${part.clientName}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <!-- Footer -->
            <div class="footer">
                <h3>🏢 Frigo Sistem Todosijević</h3>
                <p>Beko Ovlašćeni Servis - Garantni Servisi</p>
                <p>Automatski generisan izveštaj - ${new Date().toLocaleString('sr-ME')}</p>
            </div>
        </div>

        <script>
            // Grafikon tipova uređaja
            const applianceCtx = document.getElementById('applianceChart').getContext('2d');
            new Chart(applianceCtx, {
                type: 'doughnut',
                data: ${JSON.stringify(chartData.applianceTypes)},
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });

            // Grafikon servisera
            const technicianCtx = document.getElementById('technicianChart').getContext('2d');
            new Chart(technicianCtx, {
                type: 'bar',
                data: ${JSON.stringify(chartData.technicians)},
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        </script>
    </body>
    </html>
    `;
  }

  /**
   * Priprema podatke za grafikone
   */
  private prepareChartData(data: BekoReportData) {
    // Tipovi uređaja
    const applianceTypeCounts = new Map();
    data.completedServices.forEach(service => {
      const type = service.applianceType;
      applianceTypeCounts.set(type, (applianceTypeCounts.get(type) || 0) + 1);
    });

    const applianceTypes = {
      labels: Array.from(applianceTypeCounts.keys()),
      datasets: [{
        data: Array.from(applianceTypeCounts.values()),
        backgroundColor: [
          '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'
        ]
      }]
    };

    // Serviseri
    const technicianCounts = new Map();
    data.completedServices.forEach(service => {
      const tech = service.technicianName;
      technicianCounts.set(tech, (technicianCounts.get(tech) || 0) + 1);
    });

    const technicians = {
      labels: Array.from(technicianCounts.keys()),
      datasets: [{
        label: 'Broj servisa',
        data: Array.from(technicianCounts.values()),
        backgroundColor: '#dc2626'
      }]
    };

    return { applianceTypes, technicians };
  }

  /**
   * Šalje profesionalni dnevni izveštaj
   */
  async sendProfessionalDailyReport(reportDate: Date, recipientEmail: string): Promise<boolean> {
    try {
      console.log(`[BEKO REPORT] Generiram profesionalni dnevni izveštaj za ${reportDate.toLocaleDateString('sr-ME')} -> ${recipientEmail}`);
      
      const data = await this.collectDailyData(reportDate);
      const htmlContent = this.generateProfessionalReportHTML(data, reportDate);

      const dateStr = reportDate.toLocaleDateString('sr-ME');
      const subject = `🔧 Beko Garantni Servisi - Dnevni Izveštaj ${dateStr}`;

      const result = await this.emailService.sendEmail({
        to: recipientEmail,
        subject: subject,
        html: htmlContent
      });

      if (result.success) {
        console.log(`[BEKO REPORT] ✅ Uspešno poslat profesionalni izveštaj na ${recipientEmail}`);
        return true;
      } else {
        console.error(`[BEKO REPORT] ❌ Neuspešno slanje izveštaja na ${recipientEmail}`);
        return false;
      }

    } catch (error) {
      console.error(`[BEKO REPORT] Greška pri slanju profesionalnog dnevnog izveštaja na ${recipientEmail}:`, error);
      return false;
    }
  }
}