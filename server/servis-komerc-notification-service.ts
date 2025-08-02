import { EmailService } from './email-service.js';
import { SMSCommunicationService } from './sms-communication-service.js';

export interface ServisKomercServiceData {
  serviceId: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  technicianName: string;
  technicianPhone?: string;
  applianceType: string;
  applianceBrand: string;
  applianceModel: string;
  description: string;
  workPerformed?: string;
  completedAt: string;
  cost: string;
  warrantyStatus: string;
  devicePickedUp?: boolean;
  pickupDate?: string;
  pickupNotes?: string;
  usedParts?: Array<{
    partName: string;
    partCode: string;
    quantity: number;
    price: number;
  }>;
  removedParts?: Array<{
    partName: string;
    partDescription: string;
    reason: string;
  }>;
}

/**
 * Servis za notifikacije specifične za Servis Komerc (Beko servise)
 * Šalje email i SMS obavještenja kada se završe servisi za Beko uređaje
 */
export class ServisKomercNotificationService {
  private emailService: EmailService;
  private smsService: SMSCommunicationService | null;

  constructor(smsService?: SMSCommunicationService) {
    this.emailService = EmailService.getInstance();
    this.smsService = smsService || null;
  }

  /**
   * Šalje kompletan set notifikacija kada se završi Beko servis za Servis Komerc
   */
  async sendServiceCompletionNotifications(data: ServisKomercServiceData): Promise<{
    emailSent: boolean;
    smsSent: boolean;
    details: string[];
  }> {
    const results = {
      emailSent: false,
      smsSent: false,
      details: [] as string[]
    };

    try {
      // 1. Pošalji email notifikaciju Servis Komerc-u
      const emailResult = await this.sendServiceCompletionEmail(data);
      results.emailSent = emailResult;
      results.details.push(emailResult ? 
        'Email uspešno poslat Servis Komerc-u' : 
        'Greška pri slanju email-a Servis Komerc-u');

      // 2. Pošalji SMS notifikaciju klijentu (opcionalno)
      if (this.smsService && data.clientPhone) {
        const smsResult = await this.sendClientCompletionSMS(data);
        results.smsSent = smsResult.success;
        results.details.push(smsResult.success ? 
          'SMS uspešno poslat klijentu' : 
          `Greška pri slanju SMS-a: ${smsResult.error}`);
      }

      console.log(`[SERVIS KOMERC NOTIFY] Završene notifikacije za servis ${data.serviceId}`);
      console.log(`[SERVIS KOMERC NOTIFY] Email: ${results.emailSent ? '✅' : '❌'}, SMS: ${results.smsSent ? '✅' : '❌'}`);

      return results;

    } catch (error) {
      console.error('[SERVIS KOMERC NOTIFY] Greška pri slanju notifikacija:', error);
      results.details.push(`Općenita greška: ${error}`);
      return results;
    }
  }

  /**
   * Šalje detaljnu email notifikaciju Servis Komerc-u o završenom servisu
   */
  private async sendServiceCompletionEmail(data: ServisKomercServiceData): Promise<boolean> {
    try {
      const subject = `🔧 Završen Beko Servis #${data.serviceId} - ${data.clientName}`;
      const htmlContent = this.generateServiceCompletionHTML(data);

      // TODO: Zamijeniti sa pravom email adresom Servis Komerc-a
      const servisKomercEmail = 'servis.komerc@example.com';

      const success = await this.emailService.sendEmail({
        to: servisKomercEmail,
        subject: subject,
        html: htmlContent
      });

      if (success) {
        console.log(`[SERVIS KOMERC EMAIL] ✅ Email poslat za servis ${data.serviceId}`);
        return true;
      } else {
        console.error(`[SERVIS KOMERC EMAIL] ❌ Greška pri slanju email-a za servis ${data.serviceId}`);
        return false;
      }

    } catch (error) {
      console.error('[SERVIS KOMERC EMAIL] Greška pri slanju email-a:', error);
      return false;
    }
  }

  /**
   * Generiše HTML sadržaj za email notifikaciju
   */
  private generateServiceCompletionHTML(data: ServisKomercServiceData): string {
    const completedDate = new Date(data.completedAt).toLocaleString('sr-ME');
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Servis Komerc - Završen Beko Servis</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; border-radius: 10px;">
            <h1 style="margin: 0; font-size: 24px;">🔧 SERVIS KOMERC</h1>
            <h2 style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Završen Beko Servis #${data.serviceId}</h2>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">📋 Informacije o servisu</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                    <strong style="color: #374151;">👤 Klijent:</strong><br>
                    <span>${data.clientName}</span><br>
                    <span style="color: #6b7280;">📞 ${data.clientPhone}</span><br>
                    <span style="color: #6b7280;">📍 ${data.clientAddress}</span>
                </div>
                <div>
                    <strong style="color: #374151;">🔧 Serviser:</strong><br>
                    <span>${data.technicianName}</span><br>
                    ${data.technicianPhone ? `<span style="color: #6b7280;">📞 ${data.technicianPhone}</span><br>` : ''}
                    <span style="color: #6b7280;">📅 ${completedDate}</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <strong style="color: #374151;">📺 Uređaj:</strong><br>
                    <span>${data.applianceType}</span><br>
                    <span style="color: #6b7280;">${data.applianceBrand} ${data.applianceModel}</span>
                </div>
                <div>
                    <strong style="color: #374151;">💰 Troškovi:</strong><br>
                    <span style="font-size: 18px; font-weight: bold; color: #059669;">${data.cost}€</span><br>
                    <span style="color: #6b7280;">🛡️ ${data.warrantyStatus}</span>
                </div>
            </div>
        </div>

        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px;">📝 Opis problema</h3>
            <p style="color: #374151; line-height: 1.6; margin: 0; background: #f8fafc; padding: 15px; border-radius: 8px;">
                ${data.description}
            </p>
        </div>

        ${data.workPerformed ? `
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #059669; font-size: 16px;">✅ Izvršeni rad</h3>
            <p style="color: #374151; line-height: 1.6; margin: 0; background: #f0fdf4; padding: 15px; border-radius: 8px;">
                ${data.workPerformed}
            </p>
        </div>
        ` : ''}

        ${data.usedParts && data.usedParts.length > 0 ? `
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #ca8a04; font-size: 16px;">🔧 Korišćeni rezervni delovi</h3>
            <div style="background: #fefce8; padding: 15px; border-radius: 8px;">
                ${data.usedParts.map(part => `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fde047;">
                        <span><strong>${part.partName}</strong> (${part.partCode})</span>
                        <span>${part.quantity}x - ${(part.price * part.quantity).toFixed(2)}€</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${data.removedParts && data.removedParts.length > 0 ? `
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #dc2626; font-size: 16px;">🔽 Uklonjeni delovi sa uređaja</h3>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px;">
                ${data.removedParts.map(part => `
                    <div style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
                        <strong>${part.partName}</strong><br>
                        <span style="color: #6b7280; font-size: 14px;">${part.partDescription}</span><br>
                        <span style="color: #dc2626; font-size: 14px;">Razlog: ${part.reason}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${data.devicePickedUp ? `
        <div style="background: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #059669; font-size: 16px;">📦 Uređaj preuzet</h3>
            <p style="margin: 0; color: #374151;">
                <strong>Datum preuzimanja:</strong> ${data.pickupDate ? new Date(data.pickupDate).toLocaleString('sr-ME') : 'Nije specificiran'}<br>
                ${data.pickupNotes ? `<strong>Napomene:</strong> ${data.pickupNotes}` : ''}
            </p>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f1f5f9; border-radius: 10px; color: #64748b; font-size: 12px;">
            <p style="margin: 0;">📧 Automatska notifikacija generisana ${new Date().toLocaleString('sr-ME')}</p>
            <p style="margin: 5px 0 0 0;">🏢 Frigo Sistem Todosijević - Servis Komerc Partnership</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Šalje SMS klijentu o završetku servisa
   */
  private async sendClientCompletionSMS(data: ServisKomercServiceData): Promise<{success: boolean, error?: string}> {
    if (!this.smsService) {
      return { success: false, error: 'SMS servis nije dostupan' };
    }

    try {
      const message = `Pozdrav ${data.clientName}! Vaš ${data.applianceBrand} ${data.applianceType} servis #${data.serviceId} je uspešno završen. Serviser: ${data.technicianName}. Trošak: ${data.cost}€. Hvala Vam! - Frigo Sistem Todosijević`;

      const result = await this.smsService.sendTemplatedSMS(
        'servis_zavrsen_beko',
        { 
          phone: data.clientPhone, 
          name: data.clientName, 
          role: 'client' 
        },
        {
          clientName: data.clientName,
          serviceId: data.serviceId,
          deviceType: `${data.applianceBrand} ${data.applianceType}`,
          technicianName: data.technicianName,
          cost: data.cost,
          deviceModel: data.applianceModel
        }
      );

      return { success: result.success, error: result.error };

    } catch (error: any) {
      console.error('[SERVIS KOMERC SMS] Greška pri slanju SMS-a:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Testira slanje notifikacija (bez stvarnog slanja)
   */
  async testNotifications(testData?: Partial<ServisKomercServiceData>): Promise<string> {
    const defaultData: ServisKomercServiceData = {
      serviceId: 'TEST123',
      clientName: 'Test Klijent',
      clientPhone: '069123456',
      clientAddress: 'Test adresa 1, Novi Sad',
      technicianName: 'Test Serviser',
      applianceType: 'Frižider',
      applianceBrand: 'Beko',
      applianceModel: 'RCNE520E20ZXB',
      description: 'Test opis problema sa uređajem',
      workPerformed: 'Test izvršeni rad',
      completedAt: new Date().toISOString(),
      cost: '150.00',
      warrantyStatus: 'u garanciji'
    };

    const finalData = { ...defaultData, ...testData };
    const html = this.generateServiceCompletionHTML(finalData);
    
    console.log('[SERVIS KOMERC TEST] HTML generisan uspešno');
    return html;
  }
}