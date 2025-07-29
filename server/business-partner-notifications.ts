import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import * as schema from "../shared/schema";
import { NotificationService } from "./notification-service";

export class BusinessPartnerNotificationService {
  
  // Kreiranje business partner notifikacije
  static async createBusinessPartnerNotification(data: {
    type: string;
    title: string;
    message: string;
    relatedServiceId?: number;
    relatedUserId?: number;
    priority?: "low" | "normal" | "high" | "urgent";
    businessPartnerCompany?: string;
    businessPartnerName?: string;
    clientName?: string;
    technicianName?: string;
    serviceDescription?: string;
  }) {
    try {
      // Šaljemo notifikaciju svim administratorima
      const admins = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.role, 'admin'));

      const notifications = [];
      
      for (const admin of admins) {
        const notification = await db
          .insert(schema.notifications)
          .values({
            userId: admin.id,
            type: data.type,
            title: data.title,
            message: data.message,
            relatedServiceId: data.relatedServiceId,
            relatedUserId: data.relatedUserId,
            priority: data.priority || "normal",
            isRead: false,
          })
          .returning();
          
        notifications.push({
          ...notification[0],
          businessPartnerCompany: data.businessPartnerCompany,
          businessPartnerName: data.businessPartnerName,
          clientName: data.clientName,
          technicianName: data.technicianName,
          serviceDescription: data.serviceDescription,
        });
      }

      console.log(`✅ Business Partner notifikacija kreirana: ${data.type}`);
      return notifications;
    } catch (error) {
      console.error("❌ Greška pri kreiranju BP notifikacije:", error);
      throw error;
    }
  }

  // Dobijanje svih business partner notifikacija za administratore
  static async getBusinessPartnerNotifications(limit: number = 50) {
    try {
      const notifications = await db
        .select({
          id: schema.notifications.id,
          type: schema.notifications.type,
          title: schema.notifications.title,
          message: schema.notifications.message,
          relatedServiceId: schema.notifications.relatedServiceId,
          relatedSparePartId: schema.notifications.relatedSparePartId,
          relatedUserId: schema.notifications.relatedUserId,
          isRead: schema.notifications.isRead,
          priority: schema.notifications.priority,
          createdAt: schema.notifications.createdAt,
          readAt: schema.notifications.readAt,
          // Service details
          serviceDescription: schema.services.description,
          serviceStatus: schema.services.status,
          businessPartnerCompany: schema.services.partnerCompanyName,
          // Client details
          clientName: schema.clients.fullName,
          clientPhone: schema.clients.phone,
          // Technician details
          technicianName: schema.technicians.fullName,
          // Business partner details
          businessPartnerName: schema.users.fullName,
        })
        .from(schema.notifications)
        .leftJoin(schema.services, eq(schema.notifications.relatedServiceId, schema.services.id))
        .leftJoin(schema.clients, eq(schema.services.clientId, schema.clients.id))
        .leftJoin(schema.technicians, eq(schema.services.technicianId, schema.technicians.id))
        .leftJoin(schema.users, eq(schema.notifications.relatedUserId, schema.users.id))
        .where(
          inArray(schema.notifications.type, [
            'bp_service_created',
            'bp_service_assigned', 
            'bp_service_completed',
            'bp_service_cancelled',
            'bp_service_priority_changed',
            'bp_service_overdue',
            'bp_technician_assigned',
            'bp_technician_removed',
            'bp_spare_parts_requested',
            'bp_client_communication',
            // Include regular service notifications for BP services
            'service_assigned',
            'service_status_changed',
            'spare_part_requested'
          ])
        )
        .orderBy(desc(schema.notifications.createdAt))
        .limit(limit);

      return notifications;
    } catch (error) {
      console.error("❌ Greška pri dobijanju BP notifikacija:", error);
      return [];
    }
  }

  // Dobijanje broja nepročitanih business partner notifikacija
  static async getUnreadBusinessPartnerNotificationsCount() {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.isRead, false),
            inArray(schema.notifications.type, [
              'bp_service_created',
              'bp_service_assigned',
              'bp_service_completed', 
              'bp_service_cancelled',
              'bp_service_priority_changed',
              'bp_service_overdue',
              'bp_technician_assigned',
              'bp_technician_removed',
              'bp_spare_parts_requested',
              'bp_client_communication',
              'service_assigned',
              'service_status_changed',
              'spare_part_requested'
            ])
          )
        );

      return result[0]?.count || 0;
    } catch (error) {
      console.error("❌ Greška pri dobijanju broja nepročitanih BP notifikacija:", error);
      return 0;
    }
  }

  // Označavanje notifikacije kao pročitane
  static async markBusinessPartnerNotificationAsRead(notificationId: number) {
    try {
      await db
        .update(schema.notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(schema.notifications.id, notificationId));
        
      console.log(`✅ BP notifikacija označena kao pročitana: ${notificationId}`);
    } catch (error) {
      console.error("❌ Greška pri označavanju BP notifikacije kao pročitane:", error);
      throw error;
    }
  }

  // Označavanje svih BP notifikacija kao pročitane
  static async markAllBusinessPartnerNotificationsAsRead() {
    try {
      await db
        .update(schema.notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(schema.notifications.isRead, false),
            inArray(schema.notifications.type, [
              'bp_service_created',
              'bp_service_assigned',
              'bp_service_completed',
              'bp_service_cancelled', 
              'bp_service_priority_changed',
              'bp_service_overdue',
              'bp_technician_assigned',
              'bp_technician_removed',
              'bp_spare_parts_requested',
              'bp_client_communication',
              'service_assigned',
              'service_status_changed',
              'spare_part_requested'
            ])
          )
        );
        
      console.log("✅ Sve BP notifikacije označene kao pročitane");
    } catch (error) {
      console.error("❌ Greška pri označavanju svih BP notifikacija kao pročitane:", error);
      throw error;
    }
  }

  // Brisanje business partner notifikacije
  static async deleteBusinessPartnerNotification(notificationId: number) {
    try {
      await db
        .delete(schema.notifications)
        .where(eq(schema.notifications.id, notificationId));
        
      console.log(`✅ BP notifikacija obrisana: ${notificationId}`);
    } catch (error) {
      console.error("❌ Greška pri brisanju BP notifikacije:", error);
      throw error;
    }
  }

  // Helper metode za kreiranje specifičnih business partner notifikacija

  static async notifyServiceCreated(serviceId: number, businessPartnerName: string, clientName: string, serviceDescription: string) {
    return this.createBusinessPartnerNotification({
      type: "bp_service_created",
      title: "Novi Business Partner zahtev",
      message: `${businessPartnerName} je kreirao novi servisni zahtev za klijenta ${clientName}`,
      relatedServiceId: serviceId,
      priority: "normal",
      businessPartnerName,
      clientName,
      serviceDescription: serviceDescription.substring(0, 100),
    });
  }

  static async notifyServiceAssigned(serviceId: number, technicianName: string, clientName: string, businessPartnerCompany: string) {
    return this.createBusinessPartnerNotification({
      type: "bp_service_assigned",
      title: "BP servis dodeljen",
      message: `Serviser ${technicianName} je dodeljen BP servisu za klijenta ${clientName} (${businessPartnerCompany})`,
      relatedServiceId: serviceId,
      priority: "normal",
      technicianName,
      clientName,
      businessPartnerCompany,
    });
  }

  static async notifyServiceCompleted(serviceId: number, technicianName: string, clientName: string, businessPartnerCompany: string) {
    return this.createBusinessPartnerNotification({
      type: "bp_service_completed",
      title: "BP servis završen",
      message: `Serviser ${technicianName} je završio servis za klijenta ${clientName} (${businessPartnerCompany})`,
      relatedServiceId: serviceId,
      priority: "high",
      technicianName,
      clientName,
      businessPartnerCompany,
    });
  }

  static async notifyServiceOverdue(serviceId: number, clientName: string, businessPartnerCompany: string, daysPastDue: number) {
    return this.createBusinessPartnerNotification({
      type: "bp_service_overdue",
      title: "BP servis prekoračen",
      message: `Servis za klijenta ${clientName} (${businessPartnerCompany}) je prekoračen za ${daysPastDue} dana`,
      relatedServiceId: serviceId,
      priority: "urgent",
      clientName,
      businessPartnerCompany,
    });
  }

  static async notifySparePartsRequested(serviceId: number, partName: string, clientName: string, businessPartnerCompany: string) {
    return this.createBusinessPartnerNotification({
      type: "bp_spare_parts_requested",
      title: "Rezervni delovi traženi za BP servis",
      message: `Traženi rezervni delovi "${partName}" za BP servis klijenta ${clientName} (${businessPartnerCompany})`,
      relatedServiceId: serviceId,
      priority: "high",
      clientName,
      businessPartnerCompany,
    });
  }
}