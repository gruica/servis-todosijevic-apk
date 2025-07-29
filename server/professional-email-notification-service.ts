import { EmailService } from './email-service';
import { Client, Service, Technician, Appliance, ApplianceCategory, Manufacturer } from '@shared/schema';

export interface ServiceActionEmailData {
  serviceId: number;
  action: 'completed' | 'device_pickup' | 'status_change' | 'spare_parts_ordered' | 'parts_received' | 'customer_refused';
  client: Client;
  technician: Technician;
  appliance?: Appliance;
  category?: ApplianceCategory;
  manufacturer?: Manufacturer;
  service: Service;
  businessPartnerEmail?: string;
  additionalInfo?: {
    partsInfo?: string;
    refusalReason?: string;
    newStatus?: string;
    pickupLocation?: string;
    completionNotes?: string;
    cost?: string;
  };
}

/**
 * PROFESIONALNI EMAIL NOTIFICATION SISTEM - NAJVIŠI SVETSKI STANDARDI
 * 
 * Ovaj sistem obezbeđuje kompletnu komunikaciju između svih strana u servisu
 * kada serviser izvrši bilo kakvu akciju. Email notifikacije se šalju:
 * 1. Klijentu (glavno obaveštenje)
 * 2. Administratorima (interno praćenje)
 * 3. Poslovnim partnerima (ako je servis njihov)
 */
export class ProfessionalEmailNotificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = EmailService.getInstance();
  }

  /**
   * GLAVNI METOD - Šalje profesionalna email obaveštenja svim relevatnim stranama
   * kada serviser završi bilo kakvu akciju na servisu
   */
  public async notifyAllStakeholdersOfServiceAction(data: ServiceActionEmailData): Promise<{
    clientEmailSent: boolean;
    adminEmailSent: boolean;
    businessPartnerEmailSent: boolean;
    totalNotifications: number;
  }> {
    console.log(`[PROFESSIONAL EMAIL] 🏆 Pokretanje kompletnog email obaveštavanja za akciju "${data.action}" na servisu #${data.serviceId}`);
    
    let clientEmailSent = false;
    let adminEmailSent = false;
    let businessPartnerEmailSent = false;

    // 1. OBAVEŠTENJE KLIJENTU (prioritet)
    try {
      clientEmailSent = await this.sendClientActionNotification(data);
      console.log(`[PROFESSIONAL EMAIL] Klijent email: ${clientEmailSent ? '✅ Uspešno' : '❌ Neuspešno'}`);
    } catch (error) {
      console.error(`[PROFESSIONAL EMAIL] Greška pri slanju klijent email-a:`, error);
    }

    // 2. OBAVEŠTENJE ADMINISTRATORIMA
    try {
      adminEmailSent = await this.sendAdminActionNotification(data);
      console.log(`[PROFESSIONAL EMAIL] Admin email: ${adminEmailSent ? '✅ Uspešno' : '❌ Neuspešno'}`);
    } catch (error) {
      console.error(`[PROFESSIONAL EMAIL] Greška pri slanju admin email-a:`, error);
    }

    // 3. OBAVEŠTENJE POSLOVNOM PARTNERU (ako postoji)
    if (data.businessPartnerEmail) {
      try {
        businessPartnerEmailSent = await this.sendBusinessPartnerActionNotification(data);
        console.log(`[PROFESSIONAL EMAIL] Business partner email: ${businessPartnerEmailSent ? '✅ Uspešno' : '❌ Neuspešno'}`);
      } catch (error) {
        console.error(`[PROFESSIONAL EMAIL] Greška pri slanju business partner email-a:`, error);
      }
    }

    const totalNotifications = [clientEmailSent, adminEmailSent, businessPartnerEmailSent].filter(Boolean).length;
    
    console.log(`[PROFESSIONAL EMAIL] 📊 Ukupno poslato: ${totalNotifications}/3 email notifikacija za servis #${data.serviceId}`);

    return {
      clientEmailSent,
      adminEmailSent,
      businessPartnerEmailSent,
      totalNotifications
    };
  }

  /**
   * Šalje profesionalno obaveštenje klijentu o akciji servisera
   */
  private async sendClientActionNotification(data: ServiceActionEmailData): Promise<boolean> {
    if (!data.client.email) {
      console.warn(`[PROFESSIONAL EMAIL] Klijent ${data.client.fullName} nema email adresu`);
      return false;
    }

    const { subject, content } = this.generateClientEmailContent(data);
    
    console.log(`[PROFESSIONAL EMAIL] Slanje klijent email-a na: ${data.client.email}`);

    return await this.emailService.sendEmail({
      to: data.client.email,
      subject,
      html: content
    }, 3);
  }

  /**
   * Šalje obaveštenje administratorima o akciji servisera
   */
  private async sendAdminActionNotification(data: ServiceActionEmailData): Promise<boolean> {
    const { subject, content } = this.generateAdminEmailContent(data);
    
    console.log(`[PROFESSIONAL EMAIL] Slanje admin email-a`);

    return await this.emailService.sendEmail({
      to: [
        'jelena@frigosistemtodosijevic.com',
        'admin@frigosistemtodosijevic.com'
      ].join(','),
      subject,
      html: content
    }, 3);
  }

  /**
   * Šalje obaveštenje poslovnom partneru o akciji servisera
   */
  private async sendBusinessPartnerActionNotification(data: ServiceActionEmailData): Promise<boolean> {
    if (!data.businessPartnerEmail) {
      return false;
    }

    const { subject, content } = this.generateBusinessPartnerEmailContent(data);
    
    console.log(`[PROFESSIONAL EMAIL] Slanje business partner email-a na: ${data.businessPartnerEmail}`);

    return await this.emailService.sendEmail({
      to: data.businessPartnerEmail,
      subject,
      html: content
    }, 3);
  }

  /**
   * Generiše sadržaj email-a za klijenta
   */
  private generateClientEmailContent(data: ServiceActionEmailData): { subject: string; content: string } {
    const actionLabels = {
      'completed': 'završen je',
      'device_pickup': 'uređaj je preuzet',
      'status_change': 'status je promenjen',
      'spare_parts_ordered': 'rezervni delovi su poručeni',
      'parts_received': 'rezervni delovi su stigli',
      'customer_refused': 'servis je otkazan'
    };

    const actionLabel = actionLabels[data.action] || 'akcija je izvršena';
    const deviceName = data.category?.name || 'uređaj';
    const manufacturerName = data.manufacturer?.name || '';

    const subject = `Servis #${data.serviceId} - ${actionLabel}`;

    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0066cc 0%, #004499 100%); color: white; padding: 25px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🔧 Frigo Sistem Todosijević</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Profesionalni servis bele tehnike</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #0066cc; margin-top: 0;">Poštovani/a ${data.client.fullName},</h2>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Obaveštavamo Vas da je <strong>${actionLabel}</strong> na Vašem ${manufacturerName} ${deviceName}.
          </p>

          <!-- Service Details Card -->
          <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #0066cc; padding: 20px; margin: 25px 0; border-radius: 8px;">
            <h3 style="color: #0066cc; margin-top: 0; font-size: 18px;">📋 Detalji servisa</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Broj servisa:</td>
                <td style="padding: 8px 0; color: #495057;">#${data.serviceId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Uređaj:</td>
                <td style="padding: 8px 0; color: #495057;">${manufacturerName} ${deviceName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Serviser:</td>
                <td style="padding: 8px 0; color: #495057;">${data.technician.fullName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Datum akcije:</td>
                <td style="padding: 8px 0; color: #495057;">${new Date().toLocaleDateString('sr-ME')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Vreme:</td>
                <td style="padding: 8px 0; color: #495057;">${new Date().toLocaleTimeString('sr-ME')}</td>
              </tr>
            </table>
          </div>

          ${this.generateActionSpecificContent(data)}

          <!-- Contact Section -->
          <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #0066cc; margin-top: 0;">📞 Kontakt informacije</h3>
            <p style="margin: 5px 0;"><strong>Telefon:</strong> 033 402 402</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> info@frigosistemtodosijevic.com</p>
            <p style="margin: 5px 0;"><strong>Serviser:</strong> ${data.technician.fullName} - ${data.technician.phone || 'Kontakt preko firme'}</p>
          </div>

          <p style="font-size: 16px; line-height: 1.6;">
            Hvala Vam na poverenju! Ukoliko imate bilo kakva pitanja, slobodno nas kontaktirajte.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #343a40; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0;"><strong>Frigo Sistem Todosijević</strong></p>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">Lastva grbaljska bb, 85317 Kotor, Crna Gora</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">www.frigosistemtodosijevic.com</p>
        </div>
      </div>
    `;

    return { subject, content };
  }

  /**
   * Generiše sadržaj email-a za administratore
   */
  private generateAdminEmailContent(data: ServiceActionEmailData): { subject: string; content: string } {
    const actionLabels = {
      'completed': 'ZAVRŠEN',
      'device_pickup': 'UREĐAJ PREUZET',
      'status_change': 'PROMENA STATUSA',
      'spare_parts_ordered': 'DELOVI PORUČENI',
      'parts_received': 'DELOVI STIGLI',
      'customer_refused': 'OTKAZANO'
    };

    const actionLabel = actionLabels[data.action] || 'AKCIJA IZVRŠENA';
    const deviceName = data.category?.name || 'uređaj';
    const manufacturerName = data.manufacturer?.name || '';

    const subject = `[ADMIN] ${actionLabel} - Servis #${data.serviceId} | ${data.client.fullName}`;

    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <!-- Admin Header -->
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">🛠️ ADMINISTRATORSKO OBAVEŠTENJE</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Servisna akcija izvršena</p>
        </div>

        <div style="padding: 25px; background-color: white;">
          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #721c24; margin: 0; font-size: 18px;">📊 ${actionLabel}</h2>
            <p style="margin: 5px 0 0 0; color: #721c24; font-weight: bold;">
              Serviser ${data.technician.fullName} je izvršio akciju na servisu #${data.serviceId}
            </p>
          </div>

          <!-- Service Overview -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0;">
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #0066cc;">
              <h3 style="margin-top: 0; color: #0066cc;">👤 Klijent</h3>
              <p style="margin: 5px 0;"><strong>Ime:</strong> ${data.client.fullName}</p>
              <p style="margin: 5px 0;"><strong>Telefon:</strong> ${data.client.phone || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${data.client.email || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Grad:</strong> ${data.client.city || 'N/A'}</p>
            </div>

            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #28a745;">🔧 Serviser</h3>
              <p style="margin: 5px 0;"><strong>Ime:</strong> ${data.technician.fullName}</p>
              <p style="margin: 5px 0;"><strong>Telefon:</strong> ${data.technician.phone || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${data.technician.email || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Specijalizacija:</strong> ${data.technician.specialization || 'Opšte'}</p>
            </div>
          </div>

          <!-- Device and Service Details -->
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">📱 Detalji uređaja i servisa</h3>
            <p><strong>Uređaj:</strong> ${manufacturerName} ${deviceName}</p>
            <p><strong>Model:</strong> ${data.appliance?.model || 'N/A'}</p>
            <p><strong>Serijski broj:</strong> ${data.appliance?.serialNumber || 'N/A'}</p>
            <p><strong>Status servisa:</strong> ${data.service.status}</p>
            <p><strong>Opis problema:</strong> ${data.service.description || 'N/A'}</p>
            ${data.service.technicianNotes ? `<p><strong>Napomene servisera:</strong> ${data.service.technicianNotes}</p>` : ''}
          </div>

          ${this.generateAdminActionSpecificContent(data)}

          <!-- Action Timestamp -->
          <div style="background-color: #e2e3e5; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0; font-size: 14px; color: #495057;">
              <strong>Vreme akcije:</strong> ${new Date().toLocaleString('sr-ME')} | 
              <strong>Automatsko obaveštenje iz sistema</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    return { subject, content };
  }

  /**
   * Generiše sadržaj email-a za poslovne partnere
   */
  private generateBusinessPartnerEmailContent(data: ServiceActionEmailData): { subject: string; content: string } {
    const actionLabels = {
      'completed': 'završen je',
      'device_pickup': 'uređaj je preuzet',
      'status_change': 'status je ažuriran',
      'spare_parts_ordered': 'rezervni delovi su poručeni',
      'parts_received': 'rezervni delovi su stigli',
      'customer_refused': 'servis je otkazan'
    };

    const actionLabel = actionLabels[data.action] || 'akcija je izvršena';
    const deviceName = data.category?.name || 'uređaj';
    const manufacturerName = data.manufacturer?.name || '';

    const subject = `Servis #${data.serviceId} - ${actionLabel} | ${data.client.fullName}`;

    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <!-- Business Partner Header -->
        <div style="background: linear-gradient(135deg, #6f42c1 0%, #5a36b3 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">🤝 Partner Obaveštenje</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Frigo Sistem Todosijević</p>
        </div>

        <div style="padding: 25px; background-color: white;">
          <p style="font-size: 16px; line-height: 1.6;">
            Poštovani partneri,
          </p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Obaveštavamo Vas da je <strong>${actionLabel}</strong> na servisu koji ste kreirali.
          </p>

          <!-- Service Summary -->
          <div style="background: linear-gradient(135deg, #f1f3f4 0%, #e8eaed 100%); border-left: 4px solid #6f42c1; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #6f42c1; margin-top: 0;">📋 Pregled servisa</h3>
            <p><strong>Broj servisa:</strong> #${data.serviceId}</p>
            <p><strong>Klijent:</strong> ${data.client.fullName}</p>
            <p><strong>Kontakt:</strong> ${data.client.phone || 'N/A'}</p>
            <p><strong>Uređaj:</strong> ${manufacturerName} ${deviceName}</p>
            <p><strong>Serviser:</strong> ${data.technician.fullName}</p>
            <p><strong>Datum akcije:</strong> ${new Date().toLocaleDateString('sr-ME')}</p>
          </div>

          ${this.generatePartnerActionSpecificContent(data)}

          <!-- Contact Information -->
          <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h4 style="color: #495057; margin-top: 0;">📞 Za dodatne informacije</h4>
            <p style="margin: 5px 0;"><strong>Frigo Sistem:</strong> 033 402 402</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> info@frigosistemtodosijevic.com</p>
          </div>

          <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
            Hvala na saradnji!
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #6f42c1; color: white; padding: 15px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">Frigo Sistem Todosijević - Poslovni partner portal</p>
        </div>
      </div>
    `;

    return { subject, content };
  }

  /**
   * Generiše specifičan sadržaj na osnovu tipa akcije za klijente
   */
  private generateActionSpecificContent(data: ServiceActionEmailData): string {
    switch (data.action) {
      case 'completed':
        return `
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #155724; margin-top: 0;">✅ Servis je uspešno završen!</h3>
            <p style="margin: 10px 0; color: #155724;">
              Vaš uređaj je popravljen i spreman za preuzimanje.
            </p>
            ${data.additionalInfo?.completionNotes ? 
              `<p style="margin: 10px 0; color: #155724;"><strong>Napomene:</strong> ${data.additionalInfo.completionNotes}</p>` : ''
            }
            ${data.additionalInfo?.cost ? 
              `<p style="margin: 10px 0; color: #155724;"><strong>Cena servisa:</strong> ${data.additionalInfo.cost}</p>` : ''
            }
          </div>
        `;

      case 'device_pickup':
        return `
          <div style="background-color: #cce7ff; border: 1px solid #99d6ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #004085; margin-top: 0;">📦 Uređaj je preuzet za servis</h3>
            <p style="margin: 10px 0; color: #004085;">
              Vaš uređaj je preuzet i trenutno se nalazi u našem servisu na analizi i popravci.
            </p>
            ${data.additionalInfo?.pickupLocation ? 
              `<p style="margin: 10px 0; color: #004085;"><strong>Lokacija preuzimanja:</strong> ${data.additionalInfo.pickupLocation}</p>` : ''
            }
          </div>
        `;

      case 'spare_parts_ordered':
        return `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #856404; margin-top: 0;">🔧 Rezervni delovi su poručeni</h3>
            <p style="margin: 10px 0; color: #856404;">
              Za popravku Vašeg uređaja potrebni su rezervni delovi koji su poručeni.
            </p>
            ${data.additionalInfo?.partsInfo ? 
              `<p style="margin: 10px 0; color: #856404;"><strong>Delovi:</strong> ${data.additionalInfo.partsInfo}</p>` : ''
            }
            <p style="margin: 10px 0; color: #856404;">
              <strong>Očekivano vreme dostave:</strong> 3-7 radnih dana
            </p>
          </div>
        `;

      case 'customer_refused':
        return `
          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #721c24; margin-top: 0;">❌ Servis je otkazan</h3>
            <p style="margin: 10px 0; color: #721c24;">
              Na Vaš zahtev, servis je otkazan.
            </p>
            ${data.additionalInfo?.refusalReason ? 
              `<p style="margin: 10px 0; color: #721c24;"><strong>Razlog:</strong> ${data.additionalInfo.refusalReason}</p>` : ''
            }
          </div>
        `;

      default:
        return `
          <div style="background-color: #e2e3e5; border: 1px solid #ced4da; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #495057; margin-top: 0;">ℹ️ Ažuriranje servisa</h3>
            <p style="margin: 10px 0; color: #495057;">
              Status Vašeg servisa je ažuriran.
            </p>
          </div>
        `;
    }
  }

  /**
   * Generiše specifičan sadržaj za administratore
   */
  private generateAdminActionSpecificContent(data: ServiceActionEmailData): string {
    switch (data.action) {
      case 'completed':
        return `
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="color: #155724; margin-top: 0;">✅ SERVIS ZAVRŠEN</h4>
            <p style="color: #155724; margin: 5px 0;">Klijent je obavešten o završetku servisa.</p>
            ${data.additionalInfo?.cost ? `<p style="color: #155724; margin: 5px 0;"><strong>Naplaćeno:</strong> ${data.additionalInfo.cost}</p>` : ''}
          </div>
        `;

      case 'spare_parts_ordered':
        return `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="color: #856404; margin-top: 0;">🔧 DELOVI PORUČENI</h4>
            <p style="color: #856404; margin: 5px 0;">Serviser je poručio rezervne delove.</p>
            ${data.additionalInfo?.partsInfo ? `<p style="color: #856404; margin: 5px 0;"><strong>Delovi:</strong> ${data.additionalInfo.partsInfo}</p>` : ''}
          </div>
        `;

      default:
        return '';
    }
  }

  /**
   * Generiše specifičan sadržaj za poslovne partnere
   */
  private generatePartnerActionSpecificContent(data: ServiceActionEmailData): string {
    return this.generateActionSpecificContent(data);
  }
}