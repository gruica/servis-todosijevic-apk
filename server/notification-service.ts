import { db } from "./db";
import { notifications, users, services } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

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