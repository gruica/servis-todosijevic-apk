import { emailService } from './email-service.js';

/**
 * Email Notification Service - wrapper oko EmailService za lakše korišćenje
 */
export class EmailNotificationService {
  
  /**
   * Šalje obaveštenje klijentu o vraćanju uređaja
   */
  public async sendDeviceReturnNotification(
    clientEmail: string,
    clientName: string,
    serviceId: string,
    applianceModel: string,
    serialNumber: string,
    technicianName: string,
    returnNotes: string
  ): Promise<boolean> {
    return await emailService.sendDeviceReturnNotification(
      clientEmail,
      clientName,
      serviceId,
      applianceModel,
      serialNumber,
      technicianName,
      returnNotes
    );
  }

  /**
   * Šalje obaveštenje Beko partneru o vraćanju uređaja
   */
  public async sendDeviceReturnNotificationToBeko(
    clientName: string,
    serviceId: string,
    applianceModel: string,
    serialNumber: string,
    technicianName: string,
    returnNotes: string
  ): Promise<boolean> {
    return await emailService.sendDeviceReturnNotificationToBeko(
      clientName,
      serviceId,
      applianceModel,
      serialNumber,
      technicianName,
      returnNotes
    );
  }

  /**
   * Šalje obaveštenje ComPlus partneru o vraćanju uređaja
   */
  public async sendDeviceReturnNotificationToComPlus(
    clientName: string,
    serviceId: string,
    applianceModel: string,
    serialNumber: string,
    technicianName: string,
    returnNotes: string
  ): Promise<boolean> {
    return await emailService.sendDeviceReturnNotificationToComPlus(
      clientName,
      serviceId,
      applianceModel,
      serialNumber,
      technicianName,
      returnNotes
    );
  }
}