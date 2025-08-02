import { db } from './db.js';
import { services, appliances, clients, users, sparePartOrders, manufacturers, applianceCategories } from '../shared/schema.js';
import { EmailService } from './email-service.js';
import { and, gte, lte, eq, isNotNull, or, like, desc, sql, count } from 'drizzle-orm';

interface BusinessPartnerNotification {
  id: string;
  partnerId: number;
  partnerName: string;
  partnerEmail: string;
  type: 'service_request' | 'service_update' | 'service_completed' | 'parts_needed' | 'urgent_request';
  title: string;
  message: string;
  serviceId?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
}

interface CommunicationStats {
  totalPartners: number;
  activePartners: number;
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  avgResponseTime: number;
  recentActivity: any[];
}

export class BusinessPartnerCommunicationService {
  
  /**
   * Šalje automatsko obaveštenje poslovnom partneru o statusu servisa
   */
  static async sendServiceStatusNotification(
    serviceId: number, 
    partnerId: number, 
    status: string, 
    additionalInfo?: string
  ): Promise<boolean> {
    try {
      console.log(`[BP COMM] Slanje obaveštenja partneru ${partnerId} za servis ${serviceId}, status: ${status}`);

      // Dohvati podatke o servisu i partneru
      const serviceData = await db
        .select({
          serviceId: services.id,
          clientName: clients.fullName,
          clientPhone: clients.phone,
          clientAddress: clients.address,
          applianceType: applianceCategories.name,
          applianceBrand: manufacturers.name,
          applianceModel: appliances.model,
          description: services.description,
          status: services.status,
          createdAt: services.createdAt,
          completedDate: services.completedDate,
          cost: services.cost,
          partnerName: users.fullName,
          partnerEmail: users.email,
          partnerCompany: users.companyName
        })
        .from(services)
        .innerJoin(appliances, eq(services.applianceId, appliances.id))
        .innerJoin(clients, eq(appliances.clientId, clients.id))
        .innerJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .innerJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
        .innerJoin(users, eq(services.businessPartnerId, users.id))
        .where(
          and(
            eq(services.id, serviceId),
            eq(services.businessPartnerId, partnerId)
          )
        )
        .limit(1);

      if (serviceData.length === 0) {
        console.warn(`[BP COMM] Servis ${serviceId} ili partner ${partnerId} nije pronađen`);
        return false;
      }

      const service = serviceData[0];
      
      // Generiši email sadržaj na osnovu statusa
      let subject = '';
      let message = '';
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

      switch (status) {
        case 'assigned':
          subject = `Servis Dodеljen - ${service.clientName}`;
          message = `Vaš zahtev za servis je dodeljen tehničaru. Servis će biti izvršen u najkraćem mogućem roku.`;
          priority = 'medium';
          break;
        case 'scheduled':
          subject = `Servis Zakazan - ${service.clientName}`;
          message = `Servis je zakazan. Tehničar će kontaktirati klijenta radi dogovora termina.`;
          priority = 'medium';
          break;
        case 'in_progress':
          subject = `Servis u Toku - ${service.clientName}`;
          message = `Tehničar je počeo rad na servisu. Radovi su u toku.`;
          priority = 'low';
          break;
        case 'completed':
          subject = `Servis Završen - ${service.clientName}`;
          message = `Servis je uspešno završen. Klijent je zadovoljan uslugom.`;
          priority = 'high';
          break;
        case 'parts_needed':
          subject = `Potrebni Rezervni Delovi - ${service.clientName}`;
          message = `Za završetak servisa potrebni su rezervni delovi. Molimo vas za potvrdu nabavke.`;
          priority = 'high';
          break;
        case 'customer_refused_repair':
          subject = `Klijent Odbio Popravku - ${service.clientName}`;
          message = `Klijent je odbio popravku. Servis je otkazan.`;
          priority = 'medium';
          break;
        default:
          subject = `Ажурирање Servisa - ${service.clientName}`;
          message = `Status servisa je ažuriran na: ${status}`;
          priority = 'low';
      }

      if (additionalInfo) {
        message += `\n\nDodатne informacije: ${additionalInfo}`;
      }

      // Generiši HTML email
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .service-info { background: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
            .status-badge { 
              display: inline-block; 
              padding: 5px 10px; 
              border-radius: 15px; 
              color: white; 
              font-weight: bold;
              background: ${status === 'completed' ? '#28a745' : status === 'parts_needed' ? '#ffc107' : '#17a2b8'};
            }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; margin-top: 30px; }
            .important { color: #dc3545; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Obaveštenje o Servisu</h1>
            <h2>${service.partnerCompany || service.partnerName}</h2>
          </div>
          
          <div class="content">
            <h3>Status Servisa: <span class="status-badge">${status.toUpperCase()}</span></h3>
            
            <div class="service-info">
              <h4>Detalji Servisa:</h4>
              <ul>
                <li><strong>ID Servisa:</strong> #${service.serviceId}</li>
                <li><strong>Klijent:</strong> ${service.clientName}</li>
                <li><strong>Telefon:</strong> ${service.clientPhone}</li>
                <li><strong>Adresa:</strong> ${service.clientAddress}</li>
                <li><strong>Uređaj:</strong> ${service.applianceBrand} ${service.applianceType} - ${service.applianceModel}</li>
                <li><strong>Opis Problema:</strong> ${service.description}</li>
                <li><strong>Datum Kreiranja:</strong> ${new Date(service.createdAt).toLocaleDateString('sr-RS')}</li>
                ${service.completedDate ? `<li><strong>Datum Završetka:</strong> ${new Date(service.completedDate).toLocaleDateString('sr-RS')}</li>` : ''}
                ${service.cost ? `<li><strong>Cena:</strong> ${service.cost}</li>` : ''}
              </ul>
            </div>

            <h4>Poruka:</h4>
            <p>${message.replace(/\n/g, '<br>')}</p>

            ${priority === 'high' ? 
              '<p class="important">⚠️ Ovo obaveštenje zahteva hitnu pažnju!</p>' : ''
            }
          </div>

          <div class="footer">
            <p>Frigo Sistem Todosijević - Profesionalni Servis Bele Tehnike</p>
            <p>Automatsko obaveštenje - ${new Date().toLocaleDateString('sr-RS')}</p>
            <p>Za dodatne informacije kontaktirajte nas na: info@frigosistemtodosijevic.com</p>
          </div>
        </body>
        </html>
      `;

      // Pošalji email
      const emailService = new EmailService();
      const result = await emailService.sendEmail({
        to: service.partnerEmail,
        subject,
        html: htmlContent
      });

      console.log(`[BP COMM] Obaveštenje partneru ${result ? 'uspešno poslato' : 'neuspešno'}`);
      return result;

    } catch (error) {
      console.error('[BP COMM] Greška pri slanju obaveštenja partneru:', error);
      return false;
    }
  }

  /**
   * Generiše dnevni izveštaj za business partnere o njihovim servisima
   */
  static async sendDailyPartnerReport(partnerId: number, date: Date = new Date()): Promise<boolean> {
    try {
      console.log(`[BP COMM] Generiram dnevni izveštaj za partnera ${partnerId}, datum: ${date.toDateString()}`);

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Dohvati partner podatke
      const partnerData = await db
        .select({
          partnerId: users.id,
          partnerName: users.fullName,
          partnerEmail: users.email,
          partnerCompany: users.companyName
        })
        .from(users)
        .where(
          and(
            eq(users.id, partnerId),
            eq(users.role, 'business_partner')
          )
        )
        .limit(1);

      if (partnerData.length === 0) {
        console.warn(`[BP COMM] Partner ${partnerId} nije pronađen`);
        return false;
      }

      const partner = partnerData[0];

      // Dohvati servise partnera za dati datum
      const partnerServices = await db
        .select({
          serviceId: services.id,
          clientName: clients.fullName,
          clientPhone: clients.phone,
          applianceType: applianceCategories.name,
          applianceBrand: manufacturers.name,
          applianceModel: appliances.model,
          description: services.description,
          status: services.status,
          createdAt: services.createdAt,
          scheduledDate: services.scheduledDate,
          completedDate: services.completedDate,
          cost: services.cost
        })
        .from(services)
        .innerJoin(appliances, eq(services.applianceId, appliances.id))
        .innerJoin(clients, eq(appliances.clientId, clients.id))
        .innerJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .innerJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
        .where(
          and(
            eq(services.businessPartnerId, partnerId),
            or(
              and(
                gte(services.createdAt, startOfDay.toISOString()),
                lte(services.createdAt, endOfDay.toISOString())
              ),
              and(
                isNotNull(services.completedDate),
                sql`${services.completedDate} >= ${startOfDay.toISOString()}`,
                sql`${services.completedDate} <= ${endOfDay.toISOString()}`
              )
            )
          )
        )
        .orderBy(desc(services.createdAt));

      // Kategorisanje servisa po statusu
      const newServices = partnerServices.filter(s => s.createdAt >= startOfDay.toISOString() && s.createdAt <= endOfDay.toISOString());
      const completedServices = partnerServices.filter(s => s.completedDate && s.completedDate >= startOfDay.toISOString() && s.completedDate <= endOfDay.toISOString());
      const scheduledServices = partnerServices.filter(s => s.status === 'scheduled');
      const inProgressServices = partnerServices.filter(s => s.status === 'in_progress');

      // Generiši HTML email
      const subject = `Dnevni Izveštaj Servisa - ${date.toLocaleDateString('sr-RS')}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
            .stat-card { background: #f8f9fa; border-left: 4px solid #6f42c1; padding: 15px; text-align: center; }
            .stat-number { font-size: 1.8em; font-weight: bold; color: #6f42c1; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.9em; }
            .table th { background-color: #f2f2f2; }
            .status-new { color: #28a745; font-weight: bold; }
            .status-completed { color: #007bff; font-weight: bold; }
            .status-progress { color: #ffc107; font-weight: bold; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Dnevni Izveštaj Servisa</h1>
            <h2>${partner.partnerCompany || partner.partnerName}</h2>
            <h3>${date.toLocaleDateString('sr-RS')}</h3>
          </div>
          
          <div class="content">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${newServices.length}</div>
                <div>Novi Servisi</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${completedServices.length}</div>
                <div>Završeni Servisi</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${inProgressServices.length}</div>
                <div>Servisi u Toku</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${scheduledServices.length}</div>
                <div>Zakazani Servisi</div>
              </div>
            </div>

            ${newServices.length > 0 ? `
              <h3>Novi Servisi Danas</h3>
              <table class="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Klijent</th>
                    <th>Uređaj</th>
                    <th>Problem</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${newServices.map(service => `
                    <tr>
                      <td>#${service.serviceId}</td>
                      <td>${service.clientName}<br><small>${service.clientPhone}</small></td>
                      <td>${service.applianceBrand} ${service.applianceType}</td>
                      <td>${service.description}</td>
                      <td class="status-new">${service.status.toUpperCase()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p>Nema novih servisa danas.</p>'}

            ${completedServices.length > 0 ? `
              <h3>Završeni Servisi Danas</h3>
              <table class="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Klijent</th>
                    <th>Uređaj</th>
                    <th>Cena</th>
                    <th>Završen</th>
                  </tr>
                </thead>
                <tbody>
                  ${completedServices.map(service => `
                    <tr>
                      <td>#${service.serviceId}</td>
                      <td>${service.clientName}</td>
                      <td>${service.applianceBrand} ${service.applianceType}</td>
                      <td>${service.cost || 'N/A'}</td>
                      <td class="status-completed">${new Date(service.completedDate).toLocaleTimeString('sr-RS')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p>Nema završenih servisa danas.</p>'}
          </div>

          <div class="footer">
            <p>Frigo Sistem Todosijević - Business Partner Portal</p>
            <p>Automatski dnevni izveštaj - ${new Date().toLocaleDateString('sr-RS')}</p>
          </div>
        </body>
        </html>
      `;

      // Pošalji email
      const emailService = new EmailService();
      const result = await emailService.sendEmail({
        to: partner.partnerEmail,
        subject,
        html: htmlContent
      });

      console.log(`[BP COMM] Dnevni izveštaj partneru ${result ? 'uspešno poslat' : 'neuspešan'}`);
      return result;

    } catch (error) {
      console.error('[BP COMM] Greška pri slanju dnevnog izveštaja partneru:', error);
      return false;
    }
  }

  /**
   * Generiše statistike komunikacije sa business partnerima
   */
  static async getCommunicationStats(startDate: Date, endDate: Date): Promise<CommunicationStats> {
    try {
      console.log(`[BP COMM] Generiram statistike komunikacije od ${startDate.toISOString()} do ${endDate.toISOString()}`);

      // Broj partnera
      const partnersCount = await db
        .select({ count: count(users.id) })
        .from(users)
        .where(eq(users.role, 'business_partner'));

      // Aktivni partneri (koji imaju servise u periodu)
      const activePartnersCount = await db
        .select({ count: count(sql`DISTINCT ${services.businessPartnerId}`) })
        .from(services)
        .where(
          and(
            isNotNull(services.businessPartnerId),
            gte(services.createdAt, startDate.toISOString()),
            lte(services.createdAt, endDate.toISOString())
          )
        );

      // Ukupan broj zahteva
      const totalRequestsCount = await db
        .select({ count: count(services.id) })
        .from(services)
        .where(
          and(
            isNotNull(services.businessPartnerId),
            gte(services.createdAt, startDate.toISOString()),
            lte(services.createdAt, endDate.toISOString())
          )
        );

      // Pending zahtevi
      const pendingRequestsCount = await db
        .select({ count: count(services.id) })
        .from(services)
        .where(
          and(
            isNotNull(services.businessPartnerId),
            eq(services.status, 'pending'),
            gte(services.createdAt, startDate.toISOString()),
            lte(services.createdAt, endDate.toISOString())
          )
        );

      // Completed zahtevi
      const completedRequestsCount = await db
        .select({ count: count(services.id) })
        .from(services)
        .where(
          and(
            isNotNull(services.businessPartnerId),
            eq(services.status, 'completed'),
            gte(services.createdAt, startDate.toISOString()),
            lte(services.createdAt, endDate.toISOString())
          )
        );

      // Poslednja aktivnost
      const recentActivity = await db
        .select({
          serviceId: services.id,
          partnerName: users.fullName,
          partnerCompany: users.companyName,
          clientName: clients.fullName,
          status: services.status,
          createdAt: services.createdAt,
          completedDate: services.completedDate
        })
        .from(services)
        .innerJoin(users, eq(services.businessPartnerId, users.id))
        .innerJoin(appliances, eq(services.applianceId, appliances.id))
        .innerJoin(clients, eq(appliances.clientId, clients.id))
        .where(
          and(
            isNotNull(services.businessPartnerId),
            gte(services.createdAt, startDate.toISOString()),
            lte(services.createdAt, endDate.toISOString())
          )
        )
        .orderBy(desc(services.createdAt))
        .limit(10);

      console.log(`[BP COMM] Statistike komunikacije generirane`);

      return {
        totalPartners: partnersCount[0]?.count || 0,
        activePartners: activePartnersCount[0]?.count || 0,
        totalRequests: totalRequestsCount[0]?.count || 0,
        pendingRequests: pendingRequestsCount[0]?.count || 0,
        completedRequests: completedRequestsCount[0]?.count || 0,
        avgResponseTime: 2.5, // Placeholder - implementirati kalkulaciju
        recentActivity
      };

    } catch (error) {
      console.error('[BP COMM] Greška pri generisanju statistika komunikacije:', error);
      throw error;
    }
  }
}