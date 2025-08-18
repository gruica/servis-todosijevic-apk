import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { pushSubscriptions, users } from '../shared/schema';

// VAPID ključevi za push notifikacije
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:info@frigosistemtodosijevic.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_EMAIL,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('📱 VAPID ključevi konfigurisani za push notifikacije');
} else {
  console.log('⚠️  VAPID ključevi nisu konfigurisani - push notifikacije neće raditi');
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class PushNotificationService {
  /**
   * Sačuvaj push subscription za korisnika
   */
  async saveSubscription(userId: number, subscription: PushSubscription) {
    try {
      // Provjeri da li subscription već postoji
      const existing = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        // Ažuriraj postojeći subscription
        await db
          .update(pushSubscriptions)
          .set({
            endpoint: subscription.endpoint,
            keys: JSON.stringify(subscription.keys),
            updatedAt: new Date()
          })
          .where(eq(pushSubscriptions.userId, userId));
      } else {
        // Kreiraj novi subscription
        await db.insert(pushSubscriptions).values({
          userId,
          endpoint: subscription.endpoint,
          keys: JSON.stringify(subscription.keys)
        });
      }

      console.log(`📱 Push subscription sačuvan za korisnika ${userId}`);
      return true;
    } catch (error) {
      console.error('Greška pri čuvanju push subscription:', error);
      return false;
    }
  }

  /**
   * Pošalji notifikaciju korisniku
   */
  async sendNotificationToUser(userId: number, payload: PushNotificationPayload) {
    try {
      const subscription = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId))
        .limit(1);

      if (subscription.length === 0) {
        console.log(`📱 Nema push subscription za korisnika ${userId}`);
        return false;
      }

      const sub = subscription[0];
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: JSON.parse(sub.keys)
      };

      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        data: payload.data || {},
        actions: payload.actions || []
      });

      await webpush.sendNotification(pushSubscription, notificationPayload);
      console.log(`📱 Push notifikacija poslana korisniku ${userId}: ${payload.title}`);
      return true;
    } catch (error) {
      console.error(`Greška pri slanju push notifikacije korisniku ${userId}:`, error);
      return false;
    }
  }

  /**
   * Pošalji notifikaciju svim tehničarima
   */
  async sendNotificationToAllTechnicians(payload: PushNotificationPayload) {
    try {
      // Pronađi sve tehničare koji imaju push subscriptions
      const technicians = await db
        .select({
          userId: pushSubscriptions.userId,
          endpoint: pushSubscriptions.endpoint,
          keys: pushSubscriptions.keys,
          username: users.username
        })
        .from(pushSubscriptions)
        .innerJoin(users, eq(pushSubscriptions.userId, users.id))
        .where(eq(users.role, 'technician'));

      const promises = technicians.map(async (tech) => {
        try {
          const pushSubscription = {
            endpoint: tech.endpoint,
            keys: JSON.parse(tech.keys)
          };

          const notificationPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/icon-192.png',
            badge: payload.badge || '/icon-192.png',
            data: payload.data || {},
            actions: payload.actions || []
          });

          await webpush.sendNotification(pushSubscription, notificationPayload);
          console.log(`📱 Push notifikacija poslana tehničaru ${tech.username}`);
          return { success: true, userId: tech.userId };
        } catch (error) {
          console.error(`Greška pri slanju push notifikacije tehničaru ${tech.username}:`, error);
          return { success: false, userId: tech.userId, error };
        }
      });

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`📱 Push notifikacije poslane: ${successful} uspešno, ${failed} neuspešno`);
      return { successful, failed, results };
    } catch (error) {
      console.error('Greška pri slanju push notifikacija svim tehničarima:', error);
      return { successful: 0, failed: 0, results: [] };
    }
  }

  /**
   * Ukloni push subscription za korisnika
   */
  async removeSubscription(userId: number) {
    try {
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));
      
      console.log(`📱 Push subscription uklonjen za korisnika ${userId}`);
      return true;
    } catch (error) {
      console.error('Greška pri uklanjanju push subscription:', error);
      return false;
    }
  }

  /**
   * Generiraj VAPID ključeve (za setup)
   */
  static generateVAPIDKeys() {
    const keys = webpush.generateVAPIDKeys();
    console.log('VAPID Public Key:', keys.publicKey);
    console.log('VAPID Private Key:', keys.privateKey);
    return keys;
  }
}

export const pushNotificationService = new PushNotificationService();

// Pomoćne funkcije za slanje specifičnih notifikacija
export const sendServiceAssignedNotification = async (technicianId: number, serviceData: any) => {
  return pushNotificationService.sendNotificationToUser(technicianId, {
    title: 'Novi servis dodeljen',
    body: `Dodeljen vam je novi servis: ${serviceData.clientName} - ${serviceData.appliance}`,
    data: {
      type: 'service_assigned',
      serviceId: serviceData.id,
      url: `/tech`
    },
    actions: [
      {
        action: 'view',
        title: 'Pogledaj servis'
      }
    ]
  });
};

export const sendServiceCompletedNotification = async (adminUserId: number, serviceData: any) => {
  return pushNotificationService.sendNotificationToUser(adminUserId, {
    title: 'Servis završen',
    body: `Tehničar je završio servis za ${serviceData.clientName}`,
    data: {
      type: 'service_completed',
      serviceId: serviceData.id,
      url: `/admin/services`
    },
    actions: [
      {
        action: 'view',
        title: 'Pogledaj detaljе'
      }
    ]
  });
};

export const sendPartsOrderNotification = async (userId: number, partsData: any) => {
  return pushNotificationService.sendNotificationToUser(userId, {
    title: 'Rezervni delovi naručeni',
    body: `Naručeni su rezervni delovi za servis ${partsData.serviceId}`,
    data: {
      type: 'parts_ordered',
      serviceId: partsData.serviceId,
      url: `/admin/spare-parts`
    }
  });
};