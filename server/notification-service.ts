import { db } from "./db";
import { notifications, users, services, sparePartOrders } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { emailService } from "./email-service";

export interface NotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedServiceId?: number;
  relatedUserId?: number;
  priority?: "low" | "normal" | "high" | "urgent";
}

export class NotificationService {
  // Kreiranje nove notifikacije
  static async createNotification(data: NotificationData) {
    try {
      const [notification] = await db
        .insert(notifications)
        .values({
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          relatedServiceId: data.relatedServiceId,
          relatedUserId: data.relatedUserId,
          priority: data.priority || "normal",
          isRead: false,
        })
        .returning();

      console.log(`Notifikacija kreirana: ${data.title} za korisnika ${data.userId}`);
      return notification;
    } catch (error) {
      console.error("Greška pri kreiranju notifikacije:", error);
      throw error;
    }
  }

  // Kreiranje notifikacije za servis koji čeka rezervne delove
  static async notifyServiceWaitingForParts(serviceId: number, technicianId: number, partName: string) {
    try {
      const serviceData = await db
        .select({
          id: services.id,
          description: services.description,
          clientId: services.clientId,
        })
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);

      if (!serviceData.length) {
        throw new Error(`Servis sa ID ${serviceId} nije pronađen`);
      }

      const service = serviceData[0];

      await this.createNotification({
        userId: technicianId,
        type: "service_waiting_for_parts",
        title: "Servis pauziran - čeka rezervni deo",
        message: `Servis #${serviceId} je premešten u folder "Čeka rezervne delove" jer je zahtevana rezervna deo: ${partName}`,
        relatedServiceId: serviceId,
        priority: "normal",
      });
    } catch (error) {
      console.error("Greška pri kreiranju notifikacije za servis koji čeka deo:", error);
      throw error;
    }
  }

  // Kreiranje notifikacije za vraćanje servisa iz čekanja
  static async notifyServiceReturnedFromWaiting(serviceId: number, technicianId: number, adminId: number) {
    try {
      const serviceData = await db
        .select({
          id: services.id,
          description: services.description,
          clientId: services.clientId,
        })
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);

      if (!serviceData.length) {
        throw new Error(`Servis sa ID ${serviceId} nije pronađen`);
      }

      const service = serviceData[0];

      await this.createNotification({
        userId: technicianId,
        type: "service_returned_from_waiting",
        title: "Servis vraćen u realizaciju",
        message: `Servis #${serviceId} je vraćen u realizaciju. Rezervni deo je dostupan i možete nastaviti rad.`,
        relatedServiceId: serviceId,
        relatedUserId: adminId,
        priority: "high",
      });
    } catch (error) {
      console.error("Greška pri kreiranju notifikacije za vraćanje servisa iz čekanja:", error);
      throw error;
    }
  }

  // Kreiranje notifikacije za dodeljeni servis
  static async notifyServiceAssigned(serviceId: number, technicianId: number, assignedBy: number) {
    try {
      // Dobijamo podatke o servisu
      const serviceData = await db
        .select({
          id: services.id,
          description: services.description,
          clientId: services.clientId,
        })
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);

      if (!serviceData.length) {
        throw new Error(`Servis sa ID ${serviceId} nije pronađen`);
      }

      const service = serviceData[0];

      // Dobijamo podatke o administratoru koji je dodelio servis
      const adminData = await db
        .select({
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.id, assignedBy))
        .limit(1);

      const adminName = adminData[0]?.fullName || "Administrator";

      await this.createNotification({
        userId: technicianId,
        type: "service_assigned",
        title: "Novi servis dodešen",
        message: `${adminName} vam je dodelio novi servis: ${service.description}`,
        relatedServiceId: serviceId,
        relatedUserId: assignedBy,
        priority: "high",
      });

      console.log(`Notifikacija o dodeljenom servisu poslana serviseru ${technicianId}`);
    } catch (error) {
      console.error("Greška pri slanju notifikacije o dodeljenom servisu:", error);
    }
  }

  // Kreiranje notifikacije za novi zahtev za rezervnim delom
  static async notifySparePartOrdered(orderId: number, technicianId: number) {
    try {
      // Dobijamo podatke o porudžbini
      const orderData = await db
        .select({
          id: sparePartOrders.id,
          partName: sparePartOrders.partName,
          partNumber: sparePartOrders.partNumber,
          urgency: sparePartOrders.urgency,
          serviceId: sparePartOrders.serviceId,
          quantity: sparePartOrders.quantity,
          description: sparePartOrders.description,
        })
        .from(sparePartOrders)
        .where(eq(sparePartOrders.id, orderId))
        .limit(1);

      if (!orderData.length) {
        throw new Error(`Porudžbina sa ID ${orderId} nije pronađena`);
      }

      const order = orderData[0];

      // Dobijamo podatke o serviseru
      const technicianData = await db
        .select({
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.technicianId, technicianId))
        .limit(1);

      const technicianName = technicianData[0]?.fullName || "Serviser";

      // Dobijamo sve administratore
      const admins = await db
        .select({
          id: users.id,
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.role, "admin"));

      // Kreiramo notifikaciju za svakog administratora
      for (const admin of admins) {
        await this.createNotification({
          userId: admin.id,
          type: "spare_part_requested",
          title: "Novi zahtev za rezervnim delom",
          message: `${technicianName} zahteva rezervni deo: ${order.partName}${order.partNumber ? ` (${order.partNumber})` : ''} - ${order.urgency === 'urgent' ? 'HITNO' : order.urgency === 'high' ? 'VISOKA PRIORITET' : 'STANDARDNO'}`,
          relatedServiceId: order.serviceId,
          relatedUserId: technicianId,
          priority: order.urgency === 'urgent' ? 'urgent' : order.urgency === 'high' ? 'high' : 'normal',
        });
      }

      console.log(`Notifikacija o zahtevu za rezervnim delom poslana administratorima`);
      
      // Pošaljemo email obaveštenje administratorima
      try {
        const emailSubject = `Novi zahtev za rezervnim delom - ${order.urgency === 'urgent' ? 'HITNO' : 'PRIORITET: ' + order.urgency}`;
        const emailBody = `
          Serviser ${technicianName} je zahtevao rezervni deo:
          
          Deo: ${order.partName}
          Kataloški broj: ${order.partNumber || 'Nije naveden'}
          Količina: ${order.quantity}
          Prioritet: ${order.urgency === 'urgent' ? 'HITNO' : order.urgency === 'high' ? 'VISOK' : 'STANDARDNO'}
          Servis ID: #${order.serviceId}
          ${order.description ? `Opis: ${order.description}` : ''}
          
          Molimo da pregledate zahtev u admin panelu.
          
          Frigo Sistem Todosijević
        `;
        
        for (const admin of admins) {
          await emailService.sendEmail(
            admin.email || 'admin@frigosistemtodosijevic.com',
            emailSubject,
            emailBody
          );
        }
      } catch (emailError) {
        console.error("Greška pri slanju email obaveštenja:", emailError);
      }
    } catch (error) {
      console.error("Greška pri slanju notifikacije o zahtevu za rezervnim delom:", error);
    }
  }

  // Kreiranje notifikacije za prispeli rezervni deo
  static async notifySparePartReceived(orderId: number, adminId: number) {
    try {
      // Dobijamo podatke o porudžbini
      const orderData = await db
        .select({
          id: sparePartOrders.id,
          partName: sparePartOrders.partName,
          partNumber: sparePartOrders.partNumber,
          serviceId: sparePartOrders.serviceId,
          technicianId: sparePartOrders.technicianId,
          quantity: sparePartOrders.quantity,
          supplierName: sparePartOrders.supplierName,
          actualCost: sparePartOrders.actualCost,
        })
        .from(sparePartOrders)
        .where(eq(sparePartOrders.id, orderId))
        .limit(1);

      if (!orderData.length) {
        throw new Error(`Porudžbina sa ID ${orderId} nije pronađena`);
      }

      const order = orderData[0];

      // Dobijamo podatke o administratoru
      const adminData = await db
        .select({
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.id, adminId))
        .limit(1);

      const adminName = adminData[0]?.fullName || "Administrator";

      // Dobijamo podatke o serviseru
      const technicianData = await db
        .select({
          id: users.id,
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.technicianId, order.technicianId))
        .limit(1);

      if (technicianData.length > 0) {
        const technician = technicianData[0];
        
        await this.createNotification({
          userId: technician.id,
          type: "spare_part_received",
          title: "Rezervni deo je stigao",
          message: `${adminName} je potvrdio da je rezervni deo "${order.partName}"${order.partNumber ? ` (${order.partNumber})` : ''} stigao${order.supplierName ? ` od ${order.supplierName}` : ''}. Možete preuzeti deo za servis #${order.serviceId}.`,
          relatedServiceId: order.serviceId,
          relatedUserId: adminId,
          priority: "high",
        });
      }

      console.log(`Notifikacija o prispeću rezervnog dela poslana serviseru ${order.technicianId}`);
    } catch (error) {
      console.error("Greška pri slanju notifikacije o prispeću rezervnog dela:", error);
    }
  }

  // Kreiranje notifikacije za ažuriranje statusa rezervnog dela
  static async notifySparePartStatusChanged(orderId: number, oldStatus: string, newStatus: string, adminId: number) {
    try {
      // Dobijamo podatke o porudžbini
      const orderData = await db
        .select({
          id: sparePartOrders.id,
          partName: sparePartOrders.partName,
          partNumber: sparePartOrders.partNumber,
          serviceId: sparePartOrders.serviceId,
          technicianId: sparePartOrders.technicianId,
          urgency: sparePartOrders.urgency,
          supplierName: sparePartOrders.supplierName,
          expectedDelivery: sparePartOrders.expectedDelivery,
        })
        .from(sparePartOrders)
        .where(eq(sparePartOrders.id, orderId))
        .limit(1);

      if (!orderData.length) {
        throw new Error(`Porudžbina sa ID ${orderId} nije pronađena`);
      }

      const order = orderData[0];

      // Dobijamo podatke o administratoru
      const adminData = await db
        .select({
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.id, adminId))
        .limit(1);

      const adminName = adminData[0]?.fullName || "Administrator";

      // Dobijamo podatke o serviseru
      const technicianData = await db
        .select({
          id: users.id,
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.technicianId, order.technicianId))
        .limit(1);

      if (technicianData.length > 0) {
        const technician = technicianData[0];
        
        // Kreiramo poruku na osnovu statusa
        let message = '';
        let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';
        
        switch (newStatus) {
          case 'approved':
            message = `${adminName} je odobrio zahtev za rezervni deo "${order.partName}"${order.partNumber ? ` (${order.partNumber})` : ''}.`;
            priority = 'normal';
            break;
          case 'ordered':
            message = `${adminName} je poručio rezervni deo "${order.partName}"${order.partNumber ? ` (${order.partNumber})` : ''}${order.supplierName ? ` od ${order.supplierName}` : ''}${order.expectedDelivery ? `. Očekivana dostava: ${new Date(order.expectedDelivery).toLocaleDateString('sr-RS')}` : ''}.`;
            priority = 'normal';
            break;
          case 'delivered':
            message = `Rezervni deo "${order.partName}"${order.partNumber ? ` (${order.partNumber})` : ''} je dostavljen. Možete preuzeti deo za servis #${order.serviceId}.`;
            priority = 'high';
            break;
          case 'cancelled':
            message = `${adminName} je otkazao zahtev za rezervni deo "${order.partName}"${order.partNumber ? ` (${order.partNumber})` : ''}.`;
            priority = 'high';
            break;
          default:
            message = `Status rezervnog dela "${order.partName}" je promenjen sa "${oldStatus}" na "${newStatus}".`;
        }
        
        await this.createNotification({
          userId: technician.id,
          type: "spare_part_status_changed",
          title: "Ažuriranje rezervnog dela",
          message: message,
          relatedServiceId: order.serviceId,
          relatedUserId: adminId,
          priority: priority,
        });
      }

      console.log(`Notifikacija o promeni statusa rezervnog dela poslana serviseru ${order.technicianId}`);
    } catch (error) {
      console.error("Greška pri slanju notifikacije o promeni statusa rezervnog dela:", error);
    }
  }

  // Kreiranje notifikacije za novi servis od poslovnog partnera
  static async notifyServiceCreatedByPartner(serviceId: number, partnerId: number) {
    try {
      // Dobijamo podatke o servisu
      const serviceData = await db
        .select({
          id: services.id,
          description: services.description,
          partnerCompanyName: services.partnerCompanyName,
        })
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);

      if (!serviceData.length) {
        throw new Error(`Servis sa ID ${serviceId} nije pronađen`);
      }

      const service = serviceData[0];

      // Dobijamo sve administratore
      const admins = await db
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.role, "admin"));

      // Šaljemo notifikaciju svim administratorima
      for (const admin of admins) {
        await this.createNotification({
          userId: admin.id,
          type: "service_created_by_partner",
          title: "Novi servis od poslovnog partnera",
          message: `Poslovni partner "${service.partnerCompanyName}" je kreirao novi servis: ${service.description}`,
          relatedServiceId: serviceId,
          relatedUserId: partnerId,
          priority: "high",
        });
      }

      console.log(`Notifikacija o novom servisu od partnera poslana svim administratorima`);
    } catch (error) {
      console.error("Greška pri slanju notifikacije o novom servisu od partnera:", error);
    }
  }

  // Kreiranje notifikacije za promenu statusa servisa
  static async notifyServiceStatusChanged(serviceId: number, newStatus: string, changedBy: number) {
    try {
      const serviceData = await db
        .select({
          id: services.id,
          description: services.description,
          technicianId: services.technicianId,
          businessPartnerId: services.businessPartnerId,
        })
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);

      if (!serviceData.length) {
        throw new Error(`Servis sa ID ${serviceId} nije pronađen`);
      }

      const service = serviceData[0];

      // Dobijamo podatke o korisniku koji je promenio status
      const changedByData = await db
        .select({
          fullName: users.fullName,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, changedBy))
        .limit(1);

      const changedByName = changedByData[0]?.fullName || "Korisnik";

      const statusLabels: Record<string, string> = {
        pending: "Na čekanju",
        scheduled: "Zakazano",
        in_progress: "U procesu",
        completed: "Završeno",
        cancelled: "Otkazano",
      };

      const statusLabel = statusLabels[newStatus] || newStatus;

      // Određujemo kome treba poslati notifikaciju
      const notificationRecipients: number[] = [];

      // Ako je servis promenio status na "completed", obavesti administratore
      if (newStatus === "completed") {
        const admins = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.role, "admin"));
        
        notificationRecipients.push(...admins.map(admin => admin.id));
      }

      // Ako je servis od poslovnog partnera, obavesti partnera
      if (service.businessPartnerId) {
        notificationRecipients.push(service.businessPartnerId);
      }

      // Pošaljemo notifikacije svim recipijentima
      for (const recipientId of notificationRecipients) {
        await this.createNotification({
          userId: recipientId,
          type: "service_status_changed",
          title: "Status servisa promenjen",
          message: `${changedByName} je promenio status servisa "${service.description}" na: ${statusLabel}`,
          relatedServiceId: serviceId,
          relatedUserId: changedBy,
          priority: "normal",
        });
      }

      console.log(`Notifikacija o promeni statusa servisa poslana`);
    } catch (error) {
      console.error("Greška pri slanju notifikacije o promeni statusa:", error);
    }
  }

  // Dobijanje notifikacija za korisnika
  static async getUserNotifications(userId: number, limit: number = 50) {
    try {
      const userNotifications = await db
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          relatedServiceId: notifications.relatedServiceId,
          relatedUserId: notifications.relatedUserId,
          isRead: notifications.isRead,
          priority: notifications.priority,
          createdAt: notifications.createdAt,
          readAt: notifications.readAt,
        })
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

      return userNotifications;
    } catch (error) {
      console.error("Greška pri dobijanju notifikacija:", error);
      throw error;
    }
  }

  // Označavanje notifikacije kao pročitane
  static async markAsRead(notificationId: number, userId: number) {
    try {
      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );

      console.log(`Notifikacija ${notificationId} označena kao pročitana`);
    } catch (error) {
      console.error("Greška pri označavanju notifikacije kao pročitane:", error);
      throw error;
    }
  }

  // Dobijanje broja nepročitanih notifikacija
  static async getUnreadCount(userId: number) {
    try {
      const count = await db
        .select({ count: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      return count.length;
    } catch (error) {
      console.error("Greška pri dobijanju broja nepročitanih notifikacija:", error);
      return 0;
    }
  }

  // Označavanje svih notifikacija kao pročitane
  static async markAllAsRead(userId: number) {
    try {
      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      console.log(`Sve notifikacije označene kao pročitane za korisnika ${userId}`);
    } catch (error) {
      console.error("Greška pri označavanju svih notifikacija kao pročitane:", error);
      throw error;
    }
  }
}