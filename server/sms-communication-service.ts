import { SMSMobileAPIService } from './sms-mobile-api-service.js';
import { SMSTemplates, SMSTemplateData } from './sms-templates.js';

export interface SMSConfig {
  apiKey: string;
  baseUrl: string;
  senderId: string;
  enabled: boolean;
}

export interface SMSRecipient {
  phone: string;
  name?: string;
  role?: 'client' | 'technician' | 'business_partner';
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: string;
}

/**
 * Centralizovan servis za SMS komunikaciju sa automatskim template sistemom
 */
export class SMSCommunicationService {
  private smsApi: SMSMobileAPIService;
  private config: SMSConfig;

  constructor(config: SMSConfig) {
    this.config = config;
    this.smsApi = new SMSMobileAPIService({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl
    });
  }

  /**
   * Pošalje SMS koristeći template
   */
  async sendTemplatedSMS(
    templateType: string,
    recipient: SMSRecipient,
    templateData: SMSTemplateData
  ): Promise<SMSResult> {
    try {
      if (!this.config.enabled) {
        console.log('📱 SMS je onemogućen u konfiguraciji');
        return { success: false, error: 'SMS servisi su onemogućeni' };
      }

      // Generiši SMS sadržaj na osnovu template-a
      const message = SMSTemplates.generateSMS(templateType, templateData);
      
      // Formatir broj telefona
      const formattedPhone = this.smsApi.formatPhoneNumber(recipient.phone);
      
      console.log(`📱 Šaljem ${templateType} SMS na ${formattedPhone} (${recipient.name || 'Nepoznato ime'})`);
      console.log(`📝 Sadržaj: ${message.substring(0, 100)}...`);

      // Pošalji SMS
      const result = await this.smsApi.sendSMS({
        recipients: formattedPhone,
        message: message,
        sendername: this.config.senderId
      });

      if (result.error === 0) {
        console.log(`✅ SMS uspešno poslat! Message ID: ${result.message_id}`);
        return {
          success: true,
          messageId: result.message_id,
          details: result.details
        };
      } else {
        console.error(`❌ Greška pri slanju SMS-a: ${result.details}`);
        return {
          success: false,
          error: result.details || 'Nepoznata greška'
        };
      }

    } catch (error: any) {
      console.error('❌ SMS Communication Service Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Pošalje custom SMS poruku - za masovno slanje
   */
  async sendCustomMessage(phone: string, message: string): Promise<SMSResult> {
    try {
      if (!this.config.enabled) {
        return { success: false, error: 'SMS servisi su onemogućeni' };
      }

      const formattedPhone = this.smsApi.formatPhoneNumber(phone);
      
      console.log(`📱 Šaljem custom SMS na ${formattedPhone}`);

      const result = await this.smsApi.sendSMS({
        recipients: formattedPhone,
        message: message,
        sendername: this.config.senderId
      });

      if (result.error === 0) {
        return {
          success: true,
          messageId: result.message_id,
          details: result.details
        };
      } else {
        return {
          success: false,
          error: result.details || 'Nepoznata greška'
        };
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Pošalje custom SMS bez template-a
   */
  async sendCustomSMS(
    recipient: SMSRecipient,
    message: string
  ): Promise<SMSResult> {
    try {
      if (!this.config.enabled) {
        return { success: false, error: 'SMS servisi su onemogućeni' };
      }

      const formattedPhone = this.smsApi.formatPhoneNumber(recipient.phone);
      
      console.log(`📱 Šaljem custom SMS na ${formattedPhone} (${recipient.name || 'Nepoznato ime'})`);

      const result = await this.smsApi.sendSMS({
        recipients: formattedPhone,
        message: message,
        sendername: this.config.senderId
      });

      if (result.error === 0) {
        return {
          success: true,
          messageId: result.message_id,
          details: result.details
        };
      } else {
        return {
          success: false,
          error: result.details || 'Nepoznata greška'
        };
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Bulk SMS slanje više primalaca
   */
  async sendBulkTemplatedSMS(
    templateType: string,
    recipients: SMSRecipient[],
    templateData: SMSTemplateData
  ): Promise<SMSResult[]> {
    const results: SMSResult[] = [];

    for (const recipient of recipients) {
      const result = await this.sendTemplatedSMS(templateType, recipient, {
        ...templateData,
        clientName: recipient.name || templateData.clientName
      });
      results.push(result);

      // Kratka pauza između SMS-ova da ne preopteretimo API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Trigger funkcije za automatsko slanje SMS-a
   */

  // KLIJENT TRIGERI
  async notifyServiceCompleted(serviceData: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    technicianName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('service_completed', 
      { phone: serviceData.clientPhone, name: serviceData.clientName, role: 'client' },
      {
        clientName: serviceData.clientName,
        serviceId: serviceData.serviceId,
        deviceType: serviceData.deviceType,
        technicianName: serviceData.technicianName
      }
    );
  }

  async notifyClientNotAvailable(serviceData: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    technicianName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('client_not_available',
      { phone: serviceData.clientPhone, name: serviceData.clientName, role: 'client' },
      {
        clientName: serviceData.clientName,
        serviceId: serviceData.serviceId,
        deviceType: serviceData.deviceType,
        technicianName: serviceData.technicianName
      }
    );
  }

  async notifyClientNoAnswer(serviceData: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    technicianName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('client_no_answer',
      { phone: serviceData.clientPhone, name: serviceData.clientName, role: 'client' },
      {
        clientName: serviceData.clientName,
        serviceId: serviceData.serviceId,
        deviceType: serviceData.deviceType,
        technicianName: serviceData.technicianName
      }
    );
  }

  async notifySparePartArrived(serviceData: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    partName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('spare_part_arrived',
      { phone: serviceData.clientPhone, name: serviceData.clientName, role: 'client' },
      {
        clientName: serviceData.clientName,
        serviceId: serviceData.serviceId,
        deviceType: serviceData.deviceType,
        partName: serviceData.partName
      }
    );
  }

  async notifySparePartOrdered(serviceData: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    partName: string;
    estimatedDate?: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('spare_part_ordered',
      { phone: serviceData.clientPhone, name: serviceData.clientName, role: 'client' },
      {
        clientName: serviceData.clientName,
        serviceId: serviceData.serviceId,
        deviceType: serviceData.deviceType,
        partName: serviceData.partName,
        estimatedDate: serviceData.estimatedDate
      }
    );
  }

  // SERVISER TRIGERI
  async notifyTechnicianNewService(serviceData: {
    technicianPhone: string;
    technicianName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    deviceModel?: string;
    problemDescription: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('new_service_assigned',
      { phone: serviceData.technicianPhone, name: serviceData.technicianName, role: 'technician' },
      {
        technicianName: serviceData.technicianName,
        serviceId: serviceData.serviceId,
        clientName: serviceData.clientName,
        deviceType: serviceData.deviceType,
        deviceModel: serviceData.deviceModel,
        problemDescription: serviceData.problemDescription
      }
    );
  }

  async notifyTechnicianPartArrived(serviceData: {
    technicianPhone: string;
    technicianName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    partName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('technician_part_arrived',
      { phone: serviceData.technicianPhone, name: serviceData.technicianName, role: 'technician' },
      {
        technicianName: serviceData.technicianName,
        serviceId: serviceData.serviceId,
        clientName: serviceData.clientName,
        deviceType: serviceData.deviceType,
        partName: serviceData.partName
      }
    );
  }

  // POSLOVNI PARTNER TRIGERI
  async notifyBusinessPartnerServiceAssigned(partnerData: {
    partnerPhone: string;
    partnerName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    technicianName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('business_partner_assigned',
      { phone: partnerData.partnerPhone, name: partnerData.partnerName, role: 'business_partner' },
      {
        partnerName: partnerData.partnerName,
        serviceId: partnerData.serviceId,
        clientName: partnerData.clientName,
        deviceType: partnerData.deviceType,
        technicianName: partnerData.technicianName
      }
    );
  }

  async notifyPartnerServiceAssigned(serviceData: {
    partnerPhone: string;
    partnerName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    deviceModel?: string;
    problemDescription: string;
    technicianName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('service_assigned_to_partner',
      { phone: serviceData.partnerPhone, name: serviceData.partnerName, role: 'business_partner' },
      {
        businessPartnerName: serviceData.partnerName,
        serviceId: serviceData.serviceId,
        clientName: serviceData.clientName,
        deviceType: serviceData.deviceType,
        deviceModel: serviceData.deviceModel,
        problemDescription: serviceData.problemDescription,
        technicianName: serviceData.technicianName
      }
    );
  }

  /**
   * Proverava da li je SMS servis konfigurisan i spreman
   */
  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.baseUrl && this.config.enabled);
  }

  /**
   * Testira SMS konekciju
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { success: false, message: 'SMS servis nije konfigurisan' };
    }

    return this.smsApi.testConnection();
  }
}