/**
 * CENTRALIZOVANA RUNTIME KONFIGURACIJA ZA WEB I MOBILNU APLIKACIJU
 * 
 * Ovaj modul upravlja svim environment varijablama i konfiguracijama
 * za stabilno funkcionisanje na web i native platformama.
 */

import { Capacitor } from '@capacitor/core';

export interface RuntimeConfig {
  // API Configuration
  apiBaseUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isNative: boolean;
  isWeb: boolean;
  
  // Platform Detection
  platform: 'web' | 'android' | 'ios' | 'electron';
  
  // Network Configuration
  enableOfflineMode: boolean;
  apiTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  
  // Feature Flags
  features: {
    sharing: boolean;
    photoUpload: boolean;
    notifications: boolean;
    offlineSync: boolean;
  };
}

/**
 * Dobija production API base URL sa prioritetom:
 * 1. VITE_API_BASE_URL environment varijabla (najviša prioriteta)
 * 2. Capacitor server URL (za native aplikacije)
 * 3. window.location.origin (za web aplikacije)
 * 4. Fallback na tehnikamne.me (default production)
 */
function getApiBaseUrl(): string {
  // 1. Environment varijabla (build time)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    console.log('🔧 [Runtime Config] Using VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 2. Native aplikacija - koristi definisan production URL
  if (Capacitor.isNativePlatform()) {
    const productionUrl = 'https://tehnikamne.me';
    console.log('📱 [Runtime Config] Native platform detected, using:', productionUrl);
    return productionUrl;
  }
  
  // 3. Web aplikacija - koristi trenutni origin
  if (typeof window !== 'undefined' && window.location) {
    const webUrl = window.location.origin;
    console.log('🌐 [Runtime Config] Web platform detected, using:', webUrl);
    return webUrl;
  }
  
  // 4. Fallback za production
  const fallbackUrl = 'https://tehnikamne.me';
  console.log('⚠️ [Runtime Config] Fallback to production URL:', fallbackUrl);
  return fallbackUrl;
}

/**
 * Detektuje trenutnu platformu
 */
function detectPlatform(): 'web' | 'android' | 'ios' | 'electron' {
  if (!Capacitor.isNativePlatform()) {
    return 'web';
  }
  
  const platform = Capacitor.getPlatform();
  switch (platform) {
    case 'android':
      return 'android';
    case 'ios':
      return 'ios';
    case 'electron':
      return 'electron';
    default:
      return 'web';
  }
}

/**
 * Provera da li je development environment
 */
function isDevelopmentEnvironment(): boolean {
  // Check za development environment varijable
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.DEV === true || import.meta.env.NODE_ENV === 'development') {
      return true;
    }
  }
  
  // Check za localhost ili development domene
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost' || 
                  hostname === '127.0.0.1' || 
                  hostname.includes('replit.dev') ||
                  hostname.includes('ngrok.io') ||
                  hostname.includes('localhost');
    return isDev;
  }
  
  return false;
}

/**
 * Kreira kompletnu runtime konfiguraciju
 */
function createRuntimeConfig(): RuntimeConfig {
  const apiBaseUrl = getApiBaseUrl();
  const isDevelopment = isDevelopmentEnvironment();
  const isProduction = !isDevelopment;
  const isNative = Capacitor.isNativePlatform();
  const isWeb = !isNative;
  const platform = detectPlatform();
  
  console.log(`🚀 [Runtime Config] Environment detected:`, {
    apiBaseUrl,
    isDevelopment,
    isProduction,
    isNative,
    isWeb,
    platform
  });
  
  return {
    // API Configuration
    apiBaseUrl,
    isDevelopment,
    isProduction,
    isNative,
    isWeb,
    
    // Platform Detection
    platform,
    
    // Network Configuration
    enableOfflineMode: isNative, // Offline mode samo za native aplikacije
    apiTimeout: isDevelopment ? 30000 : 15000, // 30s dev, 15s prod
    retryAttempts: isNative ? 3 : 1, // Više pokušaja za native
    retryDelay: 1000, // 1 sekund između pokušaja
    
    // Feature Flags
    features: {
      sharing: true,
      photoUpload: true,
      notifications: isNative, // Push notifikacije samo za native
      offlineSync: isNative, // Offline sync samo za native
    }
  };
}

// Singleton instance - kreira se jednom pri učitavanju modula
let runtimeConfig: RuntimeConfig | null = null;

/**
 * Vraća singleton instancu runtime konfiguracije
 */
export function getRuntimeConfig(): RuntimeConfig {
  if (!runtimeConfig) {
    runtimeConfig = createRuntimeConfig();
  }
  return runtimeConfig;
}

/**
 * Resetuje runtime konfiguraciju (korisno za testiranje)
 */
export function resetRuntimeConfig(): void {
  runtimeConfig = null;
}

/**
 * Helper funkcije za brže pristupanje često korišćenim vrednostima
 */
export const runtimeHelpers = {
  /** Vraća API base URL */
  getApiBaseUrl: (): string => getRuntimeConfig().apiBaseUrl,
  
  /** Proverava da li je native aplikacija */
  isNative: (): boolean => getRuntimeConfig().isNative,
  
  /** Proverava da li je web aplikacija */
  isWeb: (): boolean => getRuntimeConfig().isWeb,
  
  /** Proverava da li je development */
  isDevelopment: (): boolean => getRuntimeConfig().isDevelopment,
  
  /** Proverava da li je production */
  isProduction: (): boolean => getRuntimeConfig().isProduction,
  
  /** Vraća trenutnu platformu */
  getPlatform: (): string => getRuntimeConfig().platform,
  
  /** Proverava da li je određena funkcionalnost omogućena */
  isFeatureEnabled: (feature: keyof RuntimeConfig['features']): boolean => 
    getRuntimeConfig().features[feature],
  
  /** Vraća kompletnu URL sa API base */
  buildApiUrl: (endpoint: string): string => {
    const baseUrl = getRuntimeConfig().apiBaseUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }
};

// Automatic initialization za console feedback
if (typeof window !== 'undefined') {
  // Pokreni konfiguraciju čim se modul učita
  getRuntimeConfig();
}