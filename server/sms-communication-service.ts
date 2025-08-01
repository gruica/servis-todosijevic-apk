import { SMSMobileAPIService } from './sms-mobile-api-service.js';
import { SMSTemplates, SMSTemplateData } from './sms-templates.js';

export interface SMSConfig {
  apiKey: string;
  baseUrl: string;
  senderId: string | null;
  enabled: boolean;
}

export interface SMSRecipient {
  phone: string;
  name?: string;
  role?: 'client' | 'technician' | 'business_partner' | 'admin' | 'supplier';
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

      // Generiši OPTIMIZOVANI SMS sadržaj - GARANTOVANO JEDNODELNE PORUKE!
      const message = SMSTemplates.generateSMS(templateType, templateData);
      
      // Formatir broj telefona
      const formattedPhone = this.smsApi.formatPhoneNumber(recipient.phone);
      
      console.log(`📱 Šaljem ${templateType} SMS na ${formattedPhone} (${recipient.name || 'Nepoznato ime'})`);
      console.log(`📝 Sadržaj: ${message}`);

      // Pošalji SMS - sendername samo ako postoji
      const smsParams: any = {
        recipients: formattedPhone,
        message: message
      };
      
      if (this.config.senderId) {
        smsParams.sendername = this.config.senderId;
      }
      
      const result = await this.smsApi.sendSMS(smsParams);

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

      // Pošalji SMS - sendername samo ako postoji
      const smsParams: any = {
        recipients: formattedPhone,
        message: message
      };
      
      if (this.config.senderId) {
        smsParams.sendername = this.config.senderId;
      }
      
      const result = await this.smsApi.sendSMS(smsParams);

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

      // Pošalji SMS - sendername samo ako postoji
      const smsParams: any = {
        recipients: formattedPhone,
        message: message
      };
      
      if (this.config.senderId) {
        smsParams.sendername = this.config.senderId;
      }
      
      const result = await this.smsApi.sendSMS(smsParams);

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

  // OPŠTI STATUS UPDATE TRIGGER ZA SVE PROMENE STATUSA
  async notifyServiceStatusChange(serviceData: {
    serviceId: string;
    clientPhone?: string;
    clientName?: string;
    technicianName?: string;
    deviceType?: string;
    manufacturerName?: string;
    oldStatus?: string;
    newStatus: string;
    statusDescription?: string;
    technicianNotes?: string;
    businessPartnerPhone?: string;
    businessPartnerName?: string;
  }): Promise<{
    clientSMS?: SMSResult;
    adminSMS?: SMSResult[];
    businessPartnerSMS?: SMSResult;
    supplierSMS?: SMSResult;
  }> {
    const results: any = {};

    try {
      // 1. SMS klijentu (ako ima telefon)
      if (serviceData.clientPhone && serviceData.clientName) {
        console.log(`📱 Šalje SMS klijentu o promeni statusa: ${serviceData.oldStatus} -> ${serviceData.newStatus}`);
        results.clientSMS = await this.sendTemplatedSMS('service_status_changed', 
          { phone: serviceData.clientPhone, name: serviceData.clientName, role: 'client' },
          {
            clientName: serviceData.clientName,
            serviceId: serviceData.serviceId,
            deviceType: serviceData.deviceType || 'Uređaj',
            oldStatus: serviceData.oldStatus,
            newStatus: serviceData.newStatus,
            statusDescription: serviceData.statusDescription || serviceData.newStatus,
            technicianName: serviceData.technicianName || 'Serviser',
            technicianNotes: serviceData.technicianNotes
          }
        );
      }

      // 2. SMS SVE ADMINISTRATORE (uključujući Teodoru Todosijević)
      console.log(`📱 Šalje SMS svim administratorima o promeni statusa: ${serviceData.oldStatus} -> ${serviceData.newStatus}`);
      results.adminSMS = await this.sendSMSToAllAdmins('admin_status_change', {
        serviceId: serviceData.serviceId,
        clientName: serviceData.clientName || 'Nepoznat klijent',
        deviceType: serviceData.deviceType || 'Uređaj',
        oldStatus: serviceData.oldStatus,
        newStatus: serviceData.newStatus,
        technicianName: serviceData.technicianName || 'Nepoznat serviser'
      });

      // 3. SMS poslovnom partneru (ako postoji)
      if (serviceData.businessPartnerPhone && serviceData.businessPartnerName) {
        console.log(`📱 Šalje SMS poslovnom partneru o promeni statusa`);
        results.businessPartnerSMS = await this.sendTemplatedSMS('business_partner_status_changed',
          { phone: serviceData.businessPartnerPhone, name: serviceData.businessPartnerName, role: 'business_partner' },
          {
            serviceId: serviceData.serviceId,
            clientName: serviceData.clientName || 'Nepoznat klijent',
            deviceType: serviceData.deviceType || 'Uređaj',
            oldStatus: serviceData.oldStatus,
            newStatus: serviceData.newStatus,
            technicianName: serviceData.technicianName || 'Serviser',
            businessPartnerName: serviceData.businessPartnerName
          }
        );
      }

      // 4. SMS Beli-ju za Electrolux, Elica, Candy, Hoover, Turbo Air aparate
      const comPlusBrands = ['Electrolux', 'Elica', 'Candy', 'Hoover', 'Turbo Air'];
      if (serviceData.manufacturerName && comPlusBrands.includes(serviceData.manufacturerName)) {
        console.log(`📱 Šalje SMS Beli-ju za ${serviceData.manufacturerName} aparat`);
        results.supplierSMS = await this.sendTemplatedSMS('supplier_status_changed',
          { phone: '067590272', name: 'Beli', role: 'supplier' },
          {
            serviceId: serviceData.serviceId,
            clientName: serviceData.clientName || 'Nepoznat klijent',
            deviceType: serviceData.deviceType || 'Uređaj',
            manufacturerName: serviceData.manufacturerName,
            oldStatus: serviceData.oldStatus,
            newStatus: serviceData.newStatus,
            technicianName: serviceData.technicianName || 'Serviser',
            supplierName: 'Beli'
          }
        );
      }

    } catch (error) {
      console.error('❌ Greška pri slanju SMS obaveštenja o promeni statusa:', error);
    }

    return results;
  }

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

  async notifyServiceStarted(serviceData: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    technicianName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('service_started', 
      { phone: serviceData.clientPhone, name: serviceData.clientName, role: 'client' },
      {
        clientName: serviceData.clientName,
        serviceId: serviceData.serviceId,
        deviceType: serviceData.deviceType,
        technicianName: serviceData.technicianName
      }
    );
  }

  async notifyBusinessPartnerServiceCompleted(serviceData: {
    partnerPhone: string;
    partnerName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    technicianName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('business_partner_service_completed',
      { phone: serviceData.partnerPhone, name: serviceData.partnerName, role: 'business_partner' },
      {
        partnerName: serviceData.partnerName,
        serviceId: serviceData.serviceId,
        clientName: serviceData.clientName,
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
    return this.sendTemplatedSMS('client_spare_part_ordered',
      { phone: serviceData.clientPhone, name: serviceData.clientName, role: 'client' },
      {
        clientName: serviceData.clientName,
        serviceId: serviceData.serviceId,
        partName: serviceData.partName,
        estimatedDate: serviceData.estimatedDate || '5-7 radnih dana',
        manufacturerName: serviceData.deviceType,
        urgency: 'normal'
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

  // ===== TEHNIČKE AKCIJE SMS TRIGGERI =====

  /**
   * SMS korisniku kada serviser prijavi da klijent nije dostupan
   */
  async notifyClientUnavailable(data: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    technicianName: string;
    unavailableReason: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('klijent_nije_dostupan', 
      { phone: data.clientPhone, name: data.clientName, role: 'client' },
      {
        clientName: data.clientName,
        serviceId: data.serviceId,
        deviceType: data.deviceType,
        technicianName: data.technicianName,
        unavailableReason: data.unavailableReason
      }
    );
  }

  /**
   * SMS administratoru kada serviser prijavi da klijent nije dostupan
   */
  async notifyAdminClientUnavailable(data: {
    adminPhone: string;
    adminName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    technicianName: string;
    unavailableType: string;
    reschedulingNotes: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('admin_klijent_nije_dostupan', 
      { phone: data.adminPhone, name: data.adminName, role: 'technician' },
      {
        adminName: data.adminName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        deviceType: data.deviceType,
        technicianName: data.technicianName,
        unavailableType: data.unavailableType,
        reschedulingNotes: data.reschedulingNotes
      }
    );
  }

  /**
   * Helper funkcija za slanje SMS svim administratorima uključujući Teodoru Todosijević
   */
  private async sendSMSToAllAdmins(
    templateType: string,
    templateData: SMSTemplateData,
    additionalContext?: { serviceId?: string; clientName?: string }
  ): Promise<SMSResult[]> {
    const adminResults: SMSResult[] = [];
    
    try {
      // 1. SMS regularnim administratorima iz baze
      const { storage } = await import('./storage.js');
      const admins = await storage.getUsersByRole('admin');
      
      for (const admin of admins) {
        if (admin.phone) {
          console.log(`📱 Šalje SMS administratoru ${admin.fullName}`);
          const adminResult = await this.sendTemplatedSMS(templateType,
            { phone: admin.phone, name: admin.fullName, role: 'admin' },
            { ...templateData, adminName: admin.fullName }
          );
          adminResults.push(adminResult);
        }
      }
      
      // 2. SMS dodatnom administratoru - Teodora Todosijević (067077093)
      try {
        const additionalAdminSetting = await storage.getSystemSetting('admin_sms_additional');
        if (additionalAdminSetting) {
          console.log(`📱 Šalje SMS dodatnom administratoru Teodora Todosijević`);
          const teodoraSMSResult = await this.sendTemplatedSMS(templateType,
            { phone: additionalAdminSetting, name: 'Teodora Todosijević', role: 'admin' },
            { ...templateData, adminName: 'Teodora Todosijević' }
          );
          adminResults.push(teodoraSMSResult);
        }
      } catch (error) {
        console.log('⚠️ Greška pri slanju SMS dodatnom administratoru:', error);
      }
      
    } catch (error) {
      console.error('❌ Greška pri slanju SMS administratorima:', error);
    }
    
    return adminResults;
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

  // ===== NOVI AUTOMATSKI SMS TRIGGERI =====

  /**
   * SMS korisniku pri promjeni statusa servisa
   */
  async notifyClientStatusUpdate(data: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    statusDescription: string;
    technicianNotes?: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('client_status_update', 
      { phone: data.clientPhone, name: data.clientName, role: 'client' },
      {
        clientName: data.clientName,
        serviceId: data.serviceId,
        deviceType: data.deviceType,
        statusDescription: data.statusDescription,
        technicianNotes: data.technicianNotes
      }
    );
  }

  /**
   * SMS poslovnom partneru kad se poruče rezervni dijelovi za njihov servis
   */
  async notifyBusinessPartnerPartsOrdered(data: {
    partnerPhone: string;
    partnerName: string;
    serviceId: string;
    clientName: string;
    partName: string;
    deviceType: string;
    deliveryTime: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('business_partner_parts_ordered', 
      { phone: data.partnerPhone, name: data.partnerName, role: 'business_partner' },
      {
        businessPartnerName: data.partnerName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        partName: data.partName,
        deviceType: data.deviceType,
        deliveryTime: data.deliveryTime
      }
    );
  }

  /**
   * SMS poslovnom partneru kad stignu rezervni dijelovi za njihov servis
   */
  async notifyBusinessPartnerPartsArrived(data: {
    partnerPhone: string;
    partnerName: string;
    serviceId: string;
    clientName: string;
    partName: string;
    deviceType: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('business_partner_parts_arrived', 
      { phone: data.partnerPhone, name: data.partnerName, role: 'business_partner' },
      {
        businessPartnerName: data.partnerName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        partName: data.partName,
        deviceType: data.deviceType
      }
    );
  }

  /**
   * SMS korisniku kada se poruče rezervni dijelovi
   */  
  async notifyClientPartsOrdered(data: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    partName: string;
    deviceType: string;
    deliveryTime: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('client_parts_ordered', 
      { phone: data.clientPhone, name: data.clientName, role: 'client' },
      {
        clientName: data.clientName,
        serviceId: data.serviceId,
        partName: data.partName,
        deviceType: data.deviceType,
        deliveryTime: data.deliveryTime
      }
    );
  }

  /**
   * SMS korisniku kada se poruči rezervni dio
   */
  async notifyClientSparePartOrdered(data: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    partName: string;
    estimatedDate?: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('client_spare_part_ordered',
      { phone: data.clientPhone, name: data.clientName, role: 'client' },
      {
        clientName: data.clientName,
        serviceId: data.serviceId,
        deviceType: data.deviceType,
        partName: data.partName,
        estimatedDate: data.estimatedDate
      }
    );
  }

  /**
   * SMS korisniku kada rezervni dio stigne
   */
  async notifyClientSparePartArrived(data: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    partName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('client_spare_part_arrived',
      { phone: data.clientPhone, name: data.clientName, role: 'client' },
      {
        clientName: data.clientName,
        serviceId: data.serviceId,
        deviceType: data.deviceType,
        partName: data.partName
      }
    );
  }

  /**
   * SMS poslovnom partneru kada se dodeli tehničar
   */
  async notifyBusinessPartnerTechnicianAssigned(data: {
    partnerPhone: string;
    partnerName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    technicianName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('business_partner_technician_assigned',
      { phone: data.partnerPhone, name: data.partnerName, role: 'business_partner' },
      {
        businessPartnerName: data.partnerName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        deviceType: data.deviceType,
        technicianName: data.technicianName
      }
    );
  }

  /**
   * SMS poslovnom partneru pri promjeni statusa
   */
  async notifyBusinessPartnerStatusUpdate(data: {
    partnerPhone: string;
    partnerName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    statusDescription: string;
    technicianNotes?: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('business_partner_status_update',
      { phone: data.partnerPhone, name: data.partnerName, role: 'business_partner' },
      {
        businessPartnerName: data.partnerName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        deviceType: data.deviceType,
        statusDescription: data.statusDescription,
        technicianNotes: data.technicianNotes
      }
    );
  }

  /**
   * SMS poslovnom partneru kada se poruči rezervni dio
   */
  async notifyBusinessPartnerSparePartOrdered(data: {
    partnerPhone: string;
    partnerName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    partName: string;
    supplierName?: string;
    estimatedDate?: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('business_partner_spare_part_ordered',
      { phone: data.partnerPhone, name: data.partnerName, role: 'business_partner' },
      {
        businessPartnerName: data.partnerName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        deviceType: data.deviceType,
        partName: data.partName,
        supplierName: data.supplierName,
        estimatedDate: data.estimatedDate
      }
    );
  }

  /**
   * SMS dobavljaču kada se poruče rezervni dijelovi za Com Plus brendove  
   */
  async notifySupplierPartsOrdered(data: {
    supplierPhone: string;
    supplierName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    partName: string;
    manufacturerName: string;
    orderedBy: string;
    urgency: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('supplier_parts_ordered', 
      { phone: data.supplierPhone, name: data.supplierName, role: 'supplier' },
      {
        supplierName: data.supplierName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        deviceType: data.deviceType,
        partName: data.partName,
        manufacturerName: data.manufacturerName,
        orderedBy: data.orderedBy,
        urgency: data.urgency
      }
    );
  }

  /**
   * SMS administratoru kada serviser evidencira uklonjene dijelove
   */
  async notifyAdminRemovedParts(data: {
    adminPhone: string;
    adminName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    technicianName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('admin_removed_parts',
      { phone: data.adminPhone, name: data.adminName, role: 'admin' },
      {
        adminName: data.adminName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        deviceType: data.deviceType,
        technicianName: data.technicianName
      }
    );
  }

  // ===== ADMIN SMS OBAVEŠTENJA =====

  /**
   * SMS administratoru o novom servisu
   */
  async notifyAdminNewService(data: {
    adminPhone: string;
    adminName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    createdBy: string;
    problemDescription?: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('admin_new_service',
      { phone: data.adminPhone, name: data.adminName, role: 'admin' },
      {
        adminName: data.adminName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        deviceType: data.deviceType,
        createdBy: data.createdBy,
        problemDescription: data.problemDescription
      }
    );
  }

  /**
   * SMS administratoru o promeni statusa servisa
   */
  async notifyAdminStatusChange(data: {
    adminPhone: string;
    adminName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    oldStatus: string;
    newStatus: string;
    technicianName?: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('admin_status_change',
      { phone: data.adminPhone, name: data.adminName, role: 'admin' },
      {
        adminName: data.adminName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        deviceType: data.deviceType,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        technicianName: data.technicianName
      }
    );
  }

  /**
   * SMS administratoru o dodeli tehničara
   */
  async notifyAdminTechnicianAssigned(data: {
    adminPhone: string;
    adminName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    technicianName: string;
    assignedBy: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('admin_technician_assigned',
      { phone: data.adminPhone, name: data.adminName, role: 'admin' },
      {
        adminName: data.adminName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        deviceType: data.deviceType,
        technicianName: data.technicianName,
        assignedBy: data.assignedBy
      }
    );
  }

  /**
   * SMS administratoru o porudžbini rezervnih delova
   */
  async notifyAdminPartsOrdered(data: {
    adminPhone: string;
    adminName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    partName: string;
    orderedBy: string;
    urgency: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('admin_parts_ordered',
      { phone: data.adminPhone, name: data.adminName, role: 'admin' },
      {
        adminName: data.adminName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        deviceType: data.deviceType,
        partName: data.partName,
        orderedBy: data.orderedBy,
        urgency: data.urgency
      }
    );
  }

  /**
   * SMS administratoru o prispeću rezervnih delova
   */
  async notifyAdminPartsArrived(data: {
    adminPhone: string;
    adminName: string;
    serviceId: string;
    clientName: string;
    deviceType: string;
    partName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('admin_parts_arrived',
      { phone: data.adminPhone, name: data.adminName, role: 'admin' },
      {
        adminName: data.adminName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        deviceType: data.deviceType,
        partName: data.partName
      }
    );
  }

  // ===== TEHNIČKE AKCIJE - NOVI SMS TRIGGERI =====

  /**
   * SMS klijentu kada tehničar ukloni delove
   */
  async notifyClientPartsRemoved(data: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    technicianName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('client_parts_removed',
      { phone: data.clientPhone, name: data.clientName, role: 'client' },
      {
        clientName: data.clientName,
        serviceId: data.serviceId,
        deviceType: data.deviceType,
        technicianName: data.technicianName
      }
    );
  }

  /**
   * SMS klijentu kada tehničar poruči rezervni deo
   */
  async notifyClientPartOrderedByTechnician(data: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    partName?: string;
    urgency?: string;
    deliveryTime?: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('client_part_ordered_by_technician',
      { phone: data.clientPhone, name: data.clientName, role: 'client' },
      {
        clientName: data.clientName,
        serviceId: data.serviceId,
        deviceType: data.deviceType,
        partName: data.partName,
        urgency: data.urgency,
        deliveryTime: data.deliveryTime
      }
    );
  }

  /**
   * SMS klijentu kada tehničar označi da nije dostupan
   */
  async notifyClientNotAvailableByTechnician(data: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    technicianName: string;
    companyPhone: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('client_not_available_by_technician',
      { phone: data.clientPhone, name: data.clientName, role: 'client' },
      {
        clientName: data.clientName,
        serviceId: data.serviceId,
        deviceType: data.deviceType,
        technicianName: data.technicianName,
        companyPhone: data.companyPhone
      }
    );
  }

  /**
   * SMS administratoru kada tehničar ukloni delove
   */
  async notifyAdminPartsRemovedByTechnician(data: {
    adminPhone: string;
    adminName: string;
    serviceId: string;
    clientName: string;
    clientPhone: string;
    deviceType: string;
    technicianName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('admin_parts_removed_by_technician',
      { phone: data.adminPhone, name: data.adminName, role: 'admin' },
      {
        adminName: data.adminName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        deviceType: data.deviceType,
        technicianName: data.technicianName
      }
    );
  }

  /**
   * SMS administratoru kada tehničar poruči rezervni deo
   */
  async notifyAdminPartOrderedByTechnician(data: {
    adminPhone: string;
    adminName: string;
    serviceId: string;
    clientName: string;
    clientPhone: string;
    deviceType: string;
    technicianName: string;
    partName?: string;
    urgency?: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('admin_part_ordered_by_technician',
      { phone: data.adminPhone, name: data.adminName, role: 'admin' },
      {
        adminName: data.adminName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        deviceType: data.deviceType,
        technicianName: data.technicianName,
        partName: data.partName,
        urgency: data.urgency
      }
    );
  }

  /**
   * SMS administratoru kada tehničar označi da klijent nije dostupan
   */
  async notifyAdminClientNotAvailableByTechnician(data: {
    adminPhone: string;
    adminName: string;
    serviceId: string;
    clientName: string;
    clientPhone: string;
    deviceType: string;
    technicianName: string;
  }): Promise<SMSResult> {
    return this.sendTemplatedSMS('admin_client_not_available_by_technician',
      { phone: data.adminPhone, name: data.adminName, role: 'admin' },
      {
        adminName: data.adminName,
        serviceId: data.serviceId,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        deviceType: data.deviceType,
        technicianName: data.technicianName
      }
    );
  }

  /**
   * Obaveštava sve stranke o dodeli dela serviseru
   */
  async notifyPartsAllocated(
    serviceId: string,
    clientPhone: string,
    businessPartnerPhone: string | null,
    partName: string,
    quantity: number,
    technicianName: string,
    clientName: string
  ): Promise<SMSResult[]> {
    const results: SMSResult[] = [];

    const templateData: SMSTemplateData = {
      serviceId,
      partName,
      quantity: quantity.toString(),
      technicianName,
      clientName
    };

    try {
      // 1. SMS klijentu
      if (clientPhone) {
        console.log(`📱 Šaljem SMS klijentu o dodeli dela - Servis #${serviceId}`);
        const clientResult = await this.sendSMS(
          { phone: clientPhone, name: clientName },
          'client_parts_allocated',
          templateData
        );
        results.push(clientResult);
      }

      // 2. SMS poslovnom partneru (ako postoji)
      if (businessPartnerPhone) {
        console.log(`📱 Šaljem SMS poslovnom partneru o dodeli dela - Servis #${serviceId}`);
        const partnerResult = await this.sendSMS(
          { phone: businessPartnerPhone, name: 'Poslovni partner' },
          'business_partner_parts_allocated',
          templateData
        );
        results.push(partnerResult);
      }

      // 3. SMS administratorima (uključujući Teodoru)
      console.log(`📱 Šaljem SMS administratorima o dodeli dela - Servis #${serviceId}`);
      const adminResults = await this.sendSMSToAllAdmins('admin_parts_allocated', templateData);
      results.push(...adminResults);

      return results;
    } catch (error) {
      console.error('❌ Greška pri slanju SMS obaveštenja o dodeli dela:', error);
      return results;
    }
  }
}