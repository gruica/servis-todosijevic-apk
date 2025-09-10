/**
 * WHATSAPP NOTIFICATION SERVICE
 * Automatsko slanje WhatsApp poruka na osnovu događaja u sistemu
 * Frigo Sistem Todosijević - Montenegro
 */

import { 
  SERVICE_TEMPLATES, 
  BUSINESS_PARTNER_TEMPLATES,
  fillTemplate,
  WhatsAppTemplate 
} from '../shared/whatsapp-templates.js';
import { whatsappBusinessAPIService } from './whatsapp-business-api-service.js';

export interface NotificationData {
  serviceId?: number;
  senderId: number;
  recipientPhone: string;
  recipientName: string;
  // Dodatni podaci specifični za template
  [key: string]: any;
}

export class WhatsAppNotificationService {
  
  /**
   * Obavesti klijenta da je zahtev za servis potvrđen
   */
  async notifyServiceRequestConfirmed(data: NotificationData & {
    applianceType: string;
    brand: string;
    issueDescription: string;
    address: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const template = SERVICE_TEMPLATES.SERVICE_REQUEST_CONFIRMED;
      const message = fillTemplate(template, {
        CLIENT_NAME: data.recipientName,
        APPLIANCE_TYPE: data.applianceType,
        BRAND: data.brand,
        ISSUE_DESCRIPTION: data.issueDescription,
        ADDRESS: data.address,
        SERVICE_ID: data.serviceId?.toString() || '0'
      });

      const result = await whatsappBusinessAPIService.sendTextMessageWithSave(
        data.recipientPhone,
        message,
        data.senderId,
        data.serviceId
      );

      console.log(`📱 [WHATSAPP NOTIFICATION] Potvrda zahteva poslata na ${data.recipientPhone}`);
      return result;
    } catch (error: any) {
      console.error('❌ [WHATSAPP NOTIFICATION] Greška pri slanju potvrde zahteva:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obavesti klijenta da je termin zakazan
   */
  async notifyAppointmentScheduled(data: NotificationData & {
    date: string;
    time: string;
    technicianName: string;
    address: string;
    applianceType: string;
    issueDescription: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const template = SERVICE_TEMPLATES.APPOINTMENT_SCHEDULED;
      const message = fillTemplate(template, {
        CLIENT_NAME: data.recipientName,
        DATE: data.date,
        TIME: data.time,
        TECHNICIAN_NAME: data.technicianName,
        ADDRESS: data.address,
        APPLIANCE_TYPE: data.applianceType,
        ISSUE_DESCRIPTION: data.issueDescription
      });

      const result = await whatsappBusinessAPIService.sendTextMessageWithSave(
        data.recipientPhone,
        message,
        data.senderId,
        data.serviceId
      );

      console.log(`📅 [WHATSAPP NOTIFICATION] Potvrda termina poslata na ${data.recipientPhone}`);
      return result;
    } catch (error: any) {
      console.error('❌ [WHATSAPP NOTIFICATION] Greška pri slanju potvrde termina:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obavesti klijenta da je tehničar na putu
   */
  async notifyTechnicianOnWay(data: NotificationData & {
    technicianName: string;
    estimatedArrival: string;
    address: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const template = SERVICE_TEMPLATES.TECHNICIAN_ON_WAY;
      const message = fillTemplate(template, {
        CLIENT_NAME: data.recipientName,
        TECHNICIAN_NAME: data.technicianName,
        ESTIMATED_ARRIVAL: data.estimatedArrival,
        ADDRESS: data.address
      });

      const result = await whatsappBusinessAPIService.sendTextMessageWithSave(
        data.recipientPhone,
        message,
        data.senderId,
        data.serviceId
      );

      console.log(`🚐 [WHATSAPP NOTIFICATION] "Tehničar na putu" poslato na ${data.recipientPhone}`);
      return result;
    } catch (error: any) {
      console.error('❌ [WHATSAPP NOTIFICATION] Greška pri slanju "tehničar na putu":', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obavesti klijenta da je servis završen
   */
  async notifyServiceCompleted(data: NotificationData & {
    workPerformed: string;
    totalCost: string;
    paymentMethod: string;
    warrantyPeriod: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const template = SERVICE_TEMPLATES.SERVICE_COMPLETED;
      const message = fillTemplate(template, {
        CLIENT_NAME: data.recipientName,
        WORK_PERFORMED: data.workPerformed,
        TOTAL_COST: data.totalCost,
        PAYMENT_METHOD: data.paymentMethod,
        WARRANTY_PERIOD: data.warrantyPeriod
      });

      const result = await whatsappBusinessAPIService.sendTextMessageWithSave(
        data.recipientPhone,
        message,
        data.senderId,
        data.serviceId
      );

      console.log(`✅ [WHATSAPP NOTIFICATION] Potvrda završenog servisa poslata na ${data.recipientPhone}`);
      return result;
    } catch (error: any) {
      console.error('❌ [WHATSAPP NOTIFICATION] Greška pri slanju potvrde završenog servisa:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obavesti klijenta da su potrebni rezervni delovi
   */
  async notifyPartsNeeded(data: NotificationData & {
    applianceType: string;
    diagnosis: string;
    partsList: string;
    partsCost: string;
    laborCost: string;
    totalCost: string;
    deliveryTime: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const template = SERVICE_TEMPLATES.PARTS_NEEDED;
      const message = fillTemplate(template, {
        CLIENT_NAME: data.recipientName,
        APPLIANCE_TYPE: data.applianceType,
        DIAGNOSIS: data.diagnosis,
        PARTS_LIST: data.partsList,
        PARTS_COST: data.partsCost,
        LABOR_COST: data.laborCost,
        TOTAL_COST: data.totalCost,
        DELIVERY_TIME: data.deliveryTime
      });

      const result = await whatsappBusinessAPIService.sendTextMessageWithSave(
        data.recipientPhone,
        message,
        data.senderId,
        data.serviceId
      );

      console.log(`🔧 [WHATSAPP NOTIFICATION] Zahtev za rezervne delove poslat na ${data.recipientPhone}`);
      return result;
    } catch (error: any) {
      console.error('❌ [WHATSAPP NOTIFICATION] Greška pri slanju zahteva za rezervne delove:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obavesti klijenta da je popravka otkazana/odbijena
   */
  async notifyServiceRefused(data: NotificationData & {
    applianceType: string;
    diagnosis: string;
    refusalReason: string;
    diagnosticFee: string;
    paymentMethod: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const template = SERVICE_TEMPLATES.SERVICE_REFUSED;
      const message = fillTemplate(template, {
        CLIENT_NAME: data.recipientName,
        APPLIANCE_TYPE: data.applianceType,
        DIAGNOSIS: data.diagnosis,
        REFUSAL_REASON: data.refusalReason,
        DIAGNOSTIC_FEE: data.diagnosticFee,
        PAYMENT_METHOD: data.paymentMethod
      });

      const result = await whatsappBusinessAPIService.sendTextMessageWithSave(
        data.recipientPhone,
        message,
        data.senderId,
        data.serviceId
      );

      console.log(`❌ [WHATSAPP NOTIFICATION] Potvrda otkazane popravke poslata na ${data.recipientPhone}`);
      return result;
    } catch (error: any) {
      console.error('❌ [WHATSAPP NOTIFICATION] Greška pri slanju potvrde otkazane popravke:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obavesti klijenta da su poslate fotografije
   */
  async notifyPhotosUploaded(data: NotificationData & {
    technicianName: string;
    applianceType: string;
    repairStatus: string;
    photoCount: string;
    additionalMessage?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const template = SERVICE_TEMPLATES.PHOTOS_UPLOADED;
      const message = fillTemplate(template, {
        CLIENT_NAME: data.recipientName,
        TECHNICIAN_NAME: data.technicianName,
        APPLIANCE_TYPE: data.applianceType,
        REPAIR_STATUS: data.repairStatus,
        PHOTO_COUNT: data.photoCount,
        ADDITIONAL_MESSAGE: data.additionalMessage || ''
      });

      const result = await whatsappBusinessAPIService.sendTextMessageWithSave(
        data.recipientPhone,
        message,
        data.senderId,
        data.serviceId
      );

      console.log(`📸 [WHATSAPP NOTIFICATION] Obaveštenje o fotografijama poslato na ${data.recipientPhone}`);
      return result;
    } catch (error: any) {
      console.error('❌ [WHATSAPP NOTIFICATION] Greška pri slanju obaveštenja o fotografijama:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obavesti business partnera da mu je dodeljen servis
   */
  async notifyPartnerServiceAssigned(data: NotificationData & {
    clientPhone: string;
    address: string;
    applianceType: string;
    brand: string;
    issueDescription: string;
    deadline: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const template = BUSINESS_PARTNER_TEMPLATES.SERVICE_ASSIGNED;
      const message = fillTemplate(template, {
        SERVICE_ID: data.serviceId?.toString() || '0',
        CLIENT_NAME: data.recipientName,
        CLIENT_PHONE: data.clientPhone,
        ADDRESS: data.address,
        APPLIANCE_TYPE: data.applianceType,
        BRAND: data.brand,
        ISSUE_DESCRIPTION: data.issueDescription,
        DEADLINE: data.deadline
      });

      const result = await whatsappBusinessAPIService.sendTextMessageWithSave(
        data.recipientPhone,
        message,
        data.senderId,
        data.serviceId
      );

      console.log(`🤝 [WHATSAPP NOTIFICATION] Dodela servisa partneru poslata na ${data.recipientPhone}`);
      return result;
    } catch (error: any) {
      console.error('❌ [WHATSAPP NOTIFICATION] Greška pri slanju dodele servisa partneru:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pošalje sliku sa opisom (za service fotografije)
   */
  async sendServicePhoto(data: NotificationData & {
    imageUrl: string;
    photoDescription: string;
    applianceType: string;
    repairStatus: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const caption = `📸 ${data.applianceType} - ${data.repairStatus}

${data.photoDescription}

Tehničar: ${data.recipientName}
Servis: #${data.serviceId}

🔧 FRIGO SISTEM TODOSIJEVIĆ`;

      const result = await whatsappBusinessAPIService.sendImageMessageWithSave(
        data.recipientPhone,
        data.imageUrl,
        caption,
        data.senderId,
        data.serviceId
      );

      console.log(`📷 [WHATSAPP NOTIFICATION] Servisna fotografija poslata na ${data.recipientPhone}`);
      return result;
    } catch (error: any) {
      console.error('❌ [WHATSAPP NOTIFICATION] Greška pri slanju servisne fotografije:', error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton instanca za upotrebu kroz aplikaciju
export const whatsappNotificationService = new WhatsAppNotificationService();