// Push Notifications frontend helper
let swRegistration: ServiceWorkerRegistration | null = null;

interface PushNotificationOptions {
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

class PushNotificationManager {
  private vapidPublicKey: string | null = null;

  /**
   * Inicijalizuj push notifikacije
   */
  async initialize(): Promise<boolean> {
    try {
      // Provjeri da li su push notifikacije podržane
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifikacije nisu podržane u ovom browser-u');
        return false;
      }

      // Registruj service worker
      swRegistration = await navigator.serviceWorker.register('/push-sw.js');
      console.log('Service Worker registrovan za push notifikacije:', swRegistration);

      // Uzmi VAPID public key
      await this.fetchVapidPublicKey();

      return true;
    } catch (error) {
      console.error('Greška pri inicijalizaciji push notifikacija:', error);
      return false;
    }
  }

  /**
   * Uzmi VAPID public key sa servera
   */
  private async fetchVapidPublicKey(): Promise<void> {
    try {
      const response = await fetch('/api/push-notifications/vapid-public-key');
      const data = await response.json();
      this.vapidPublicKey = data.publicKey;
      console.log('VAPID public key učitan');
    } catch (error) {
      console.error('Greška pri učitavanju VAPID public key:', error);
      throw error;
    }
  }

  /**
   * Zatraži dozvolu za notifikacije
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifikacije nisu podržane');
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    console.log('Dozvola za notifikacije:', permission);
    return permission;
  }

  /**
   * Subscribe korisnika za push notifikacije
   */
  async subscribe(): Promise<boolean> {
    try {
      if (!swRegistration || !this.vapidPublicKey) {
        throw new Error('Service Worker ili VAPID key nisu inicijalizovani');
      }

      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.log('Korisnik je odbio dozvolu za notifikacije');
        return false;
      }

      // Kreiraj push subscription
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      console.log('Push subscription kreiran:', subscription);

      // Pošalji subscription na server
      const response = await fetch('/api/push-notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });

      if (response.ok) {
        console.log('Push subscription sačuvan na serveru');
        localStorage.setItem('pushNotificationsEnabled', 'true');
        return true;
      } else {
        throw new Error('Greška pri čuvanju subscription na serveru');
      }
    } catch (error) {
      console.error('Greška pri subscribe:', error);
      return false;
    }
  }

  /**
   * Unsubscribe korisnika
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (!swRegistration) {
        throw new Error('Service Worker nije registrovan');
      }

      const subscription = await swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Push subscription uklonjen lokalno');
      }

      // Ukloni subscription sa servera
      const response = await fetch('/api/push-notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        console.log('Push subscription uklonjen sa servera');
        localStorage.removeItem('pushNotificationsEnabled');
        return true;
      } else {
        throw new Error('Greška pri uklanjanju subscription sa servera');
      }
    } catch (error) {
      console.error('Greška pri unsubscribe:', error);
      return false;
    }
  }

  /**
   * Provjeri da li je korisnik subscribed
   */
  async isSubscribed(): Promise<boolean> {
    try {
      if (!swRegistration) {
        return false;
      }

      const subscription = await swRegistration.pushManager.getSubscription();
      const isEnabled = localStorage.getItem('pushNotificationsEnabled') === 'true';
      
      return subscription !== null && isEnabled;
    } catch (error) {
      console.error('Greška pri provjeri subscription:', error);
      return false;
    }
  }

  /**
   * Prikaži lokalnu notifikaciju
   */
  async showLocalNotification(options: PushNotificationOptions): Promise<void> {
    if (!swRegistration) {
      throw new Error('Service Worker nije registrovan');
    }

    await swRegistration.showNotification(options.title, {
      body: options.body,
      icon: options.icon || '/icon-192.png',
      badge: options.badge || '/icon-192.png',
      data: options.data || {},
      actions: options.actions || [],
      requireInteraction: true,
      vibrate: [200, 100, 200]
    });
  }

  /**
   * Helper funkcija za konvertovanje VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const pushNotificationManager = new PushNotificationManager();