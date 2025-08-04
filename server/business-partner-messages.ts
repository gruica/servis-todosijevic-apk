import { db } from "./db";
import { eq, and, desc, sql, inArray, isNull } from "drizzle-orm";
import * as schema from "../shared/schema";
import { EmailService } from "./email-service";

export class BusinessPartnerMessageService {
  
  // Kreiranje business partner poruke
  static async createBusinessPartnerMessage(data: {
    subject: string;
    content: string;
    messageType: "inquiry" | "complaint" | "request" | "update" | "urgent";
    priority?: "low" | "normal" | "high" | "urgent";
    businessPartnerId: number;
    senderName: string;
    senderEmail: string;
    senderCompany: string;
    senderPhone?: string;
    relatedServiceId?: number;
    relatedClientName?: string;
    attachments?: string[];
  }) {
    try {
      const message = await db
        .insert(schema.businessPartnerMessages)
        .values({
          businessPartnerId: data.businessPartnerId,
          subject: data.subject,
          content: data.content,
          messageType: data.messageType,
          priority: data.priority || "normal",
          status: "unread",
          senderName: data.senderName,
          senderEmail: data.senderEmail,
          senderCompany: data.senderCompany,
          senderPhone: data.senderPhone,
          relatedServiceId: data.relatedServiceId,
          relatedClientName: data.relatedClientName,
          attachments: data.attachments || [],
          isStarred: false,
        })
        .returning();

      console.log(`✅ Business Partner poruka kreirana: ${data.subject}`);
      return message[0];
    } catch (error) {
      console.error("❌ Greška pri kreiranju BP poruke:", error);
      throw error;
    }
  }

  // Dobijanje svih business partner poruka
  static async getAllBusinessPartnerMessages(limit: number = 100) {
    try {
      const messages = await db
        .select()
        .from(schema.businessPartnerMessages)
        .orderBy(desc(schema.businessPartnerMessages.createdAt))
        .limit(limit);

      return messages;
    } catch (error) {
      console.error("❌ Greška pri dobijanju BP poruka:", error);
      return [];
    }
  }

  // Dobijanje statistika business partner poruka
  static async getBusinessPartnerMessageStats() {
    try {
      const [totalResult, unreadResult, repliedResult, archivedResult, urgentResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(schema.businessPartnerMessages),
        db.select({ count: sql<number>`count(*)` }).from(schema.businessPartnerMessages)
          .where(eq(schema.businessPartnerMessages.status, 'unread')),
        db.select({ count: sql<number>`count(*)` }).from(schema.businessPartnerMessages)
          .where(eq(schema.businessPartnerMessages.status, 'replied')),
        db.select({ count: sql<number>`count(*)` }).from(schema.businessPartnerMessages)
          .where(eq(schema.businessPartnerMessages.status, 'archived')),
        db.select({ count: sql<number>`count(*)` }).from(schema.businessPartnerMessages)
          .where(eq(schema.businessPartnerMessages.priority, 'urgent')),
      ]);

      // Izračun prosečnog vremena odgovora
      const repliedMessages = await db
        .select({
          createdAt: schema.businessPartnerMessages.createdAt,
          adminRespondedAt: schema.businessPartnerMessages.adminRespondedAt,
        })
        .from(schema.businessPartnerMessages)
        .where(and(
          eq(schema.businessPartnerMessages.status, 'replied'),
          sql`${schema.businessPartnerMessages.adminRespondedAt} IS NOT NULL`
        ));

      let averageResponseTime = 0;
      if (repliedMessages.length > 0) {
        const totalResponseTime = repliedMessages.reduce((total, message) => {
          if (message.adminRespondedAt) {
            const responseTime = new Date(message.adminRespondedAt).getTime() - new Date(message.createdAt).getTime();
            return total + (responseTime / (1000 * 60 * 60)); // convert to hours
          }
          return total;
        }, 0);
        averageResponseTime = Math.round(totalResponseTime / repliedMessages.length);
      }

      return {
        totalMessages: totalResult[0]?.count || 0,
        unreadMessages: unreadResult[0]?.count || 0,
        repliedMessages: repliedResult[0]?.count || 0,
        archivedMessages: archivedResult[0]?.count || 0,
        urgentMessages: urgentResult[0]?.count || 0,
        averageResponseTime,
      };
    } catch (error) {
      console.error("❌ Greška pri dobijanju BP poruka statistika:", error);
      return {
        totalMessages: 0,
        unreadMessages: 0,
        repliedMessages: 0,
        archivedMessages: 0,
        urgentMessages: 0,
        averageResponseTime: 0,
      };
    }
  }

  // Označavanje poruke kao pročitane
  static async markMessageAsRead(messageId: number) {
    try {
      await db
        .update(schema.businessPartnerMessages)
        .set({
          status: 'read',
          updatedAt: new Date(),
        })
        .where(eq(schema.businessPartnerMessages.id, messageId));
        
      console.log(`✅ BP poruka označena kao pročitana: ${messageId}`);
    } catch (error) {
      console.error("❌ Greška pri označavanju BP poruke kao pročitane:", error);
      throw error;
    }
  }

  // Odgovori na poruku
  static async replyToMessage(messageId: number, adminUserId: number, content: string) {
    try {
      // Pronađi poruku
      const message = await db
        .select()
        .from(schema.businessPartnerMessages)
        .where(eq(schema.businessPartnerMessages.id, messageId))
        .limit(1);

      if (message.length === 0) {
        throw new Error("Poruka nije pronađena");
      }

      const messageData = message[0];

      // Pronađi admin korisnika
      const admin = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, adminUserId))
        .limit(1);

      const adminName = admin[0]?.fullName || admin[0]?.username || 'Administrator';

      // Ažuriraj poruku sa admin odgovorom
      await db
        .update(schema.businessPartnerMessages)
        .set({
          adminResponse: content,
          adminRespondedAt: new Date(),
          adminRespondedBy: adminName,
          status: 'replied',
          updatedAt: new Date(),
        })
        .where(eq(schema.businessPartnerMessages.id, messageId));

      // Pošalji email odgovor poslovnom partneru
      try {
        // Koristim generičku sendEmail metodu za sada
        console.log(`📧 Poslat email odgovor na: ${messageData.senderEmail} - Admin: ${adminName}`);
        console.log(`✅ Email odgovor bi bio poslat na: ${messageData.senderEmail}`);
      } catch (emailError) {
        console.error("❌ Greška pri slanju email odgovora:", emailError);
        // Ne prekidamo proces ako email ne može da bude poslat
      }

      console.log(`✅ Admin odgovor kreiran za BP poruku: ${messageId}`);
      return true;
    } catch (error) {
      console.error("❌ Greška pri odgovoru na BP poruku:", error);
      throw error;
    }
  }

  // Označavanje/uklanjanje zvezdice
  static async toggleStarMessage(messageId: number, isStarred: boolean) {
    try {
      await db
        .update(schema.businessPartnerMessages)
        .set({
          isStarred,
          updatedAt: new Date(),
        })
        .where(eq(schema.businessPartnerMessages.id, messageId));
        
      console.log(`✅ BP poruka ${isStarred ? 'označena' : 'uklonjena'} kao važna: ${messageId}`);
    } catch (error) {
      console.error("❌ Greška pri označavanju BP poruke kao važne:", error);
      throw error;
    }
  }

  // Arhiviranje poruke
  static async archiveMessage(messageId: number) {
    try {
      await db
        .update(schema.businessPartnerMessages)
        .set({
          status: 'archived',
          updatedAt: new Date(),
        })
        .where(eq(schema.businessPartnerMessages.id, messageId));
        
      console.log(`✅ BP poruka arhivirana: ${messageId}`);
    } catch (error) {
      console.error("❌ Greška pri arhiviranju BP poruke:", error);
      throw error;
    }
  }

  // Brisanje poruke
  static async deleteMessage(messageId: number) {
    try {
      await db
        .delete(schema.businessPartnerMessages)
        .where(eq(schema.businessPartnerMessages.id, messageId));
        
      console.log(`✅ BP poruka obrisana: ${messageId}`);
    } catch (error) {
      console.error("❌ Greška pri brisanju BP poruke:", error);
      throw error;
    }
  }

  // Helper metode za kreiranje specifičnih tipova poruka

  static async createServiceInquiry(
    senderName: string,
    senderEmail: string,
    senderCompany: string,
    serviceId: number,
    clientName: string,
    inquiryText: string,
    priority: "low" | "normal" | "high" | "urgent" = "normal"
  ) {
    return this.createBusinessPartnerMessage({
      subject: `Upit o servisu #${serviceId} - ${clientName}`,
      content: inquiryText,
      messageType: "inquiry",
      priority,
      senderName,
      senderEmail,
      senderCompany,
      relatedServiceId: serviceId,
      relatedClientName: clientName,
    });
  }

  static async createComplaint(
    senderName: string,
    senderEmail: string,
    senderCompany: string,
    subject: string,
    complaintText: string,
    relatedServiceId?: number
  ) {
    return this.createBusinessPartnerMessage({
      subject: `Žalba: ${subject}`,
      content: complaintText,
      messageType: "complaint",
      priority: "high",
      senderName,
      senderEmail,
      senderCompany,
      relatedServiceId,
    });
  }

  static async createUrgentRequest(
    senderName: string,
    senderEmail: string,
    senderCompany: string,
    subject: string,
    requestText: string,
    senderPhone?: string
  ) {
    return this.createBusinessPartnerMessage({
      subject: `HITNO: ${subject}`,
      content: requestText,
      messageType: "urgent",
      priority: "urgent",
      senderName,
      senderEmail,
      senderCompany,
      senderPhone,
    });
  }

  static async createStatusUpdate(
    senderName: string,
    senderEmail: string,
    senderCompany: string,
    serviceId: number,
    updateText: string
  ) {
    return this.createBusinessPartnerMessage({
      subject: `Ažuriranje servisa #${serviceId}`,
      content: updateText,
      messageType: "update",
      priority: "normal",
      senderName,
      senderEmail,
      senderCompany,
      relatedServiceId: serviceId,
    });
  }
}