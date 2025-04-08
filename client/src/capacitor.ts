// Capacitor inicijalizacija
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

// Oznaka da li aplikacija radi na mobilnom uređaju
export const isNativeMobile = Capacitor.isNativePlatform();

// Inicijalizacija Capacitor pluginova
export async function initializeCapacitor() {
  if (isNativeMobile) {
    try {
      // Sakrivanje SplashScreen-a nakon 1 sekunde
      setTimeout(() => {
        SplashScreen.hide();
      }, 1000);

      // Postavljanje status bara
      await StatusBar.setBackgroundColor({ color: '#1E293B' });
    } catch (error) {
      console.error('Greška pri inicijalizaciji Capacitor pluginova:', error);
    }
  }
}

// Dohvatanje informacija o uređaju
export async function getDeviceInfo() {
  if (!isNativeMobile) return null;
  try {
    return await Device.getInfo();
  } catch (error) {
    console.error('Greška pri dohvatanju informacija o uređaju:', error);
    return null;
  }
}

// Funkcije za rad sa skladištem (preferences)
export const storage = {
  // Čuvanje podataka
  async set(key: string, value: any): Promise<void> {
    if (isNativeMobile) {
      await Preferences.set({
        key,
        value: JSON.stringify(value),
      });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  // Dohvatanje podataka
  async get(key: string): Promise<any> {
    if (isNativeMobile) {
      const { value } = await Preferences.get({ key });
      if (value) {
        try {
          return JSON.parse(value);
        } catch (error) {
          return value;
        }
      }
      return null;
    } else {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          return JSON.parse(value);
        } catch (error) {
          return value;
        }
      }
      return null;
    }
  },

  // Brisanje podataka
  async remove(key: string): Promise<void> {
    if (isNativeMobile) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  // Brisanje svih podataka
  async clear(): Promise<void> {
    if (isNativeMobile) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  },
};