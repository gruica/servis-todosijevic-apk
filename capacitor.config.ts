import { CapacitorConfig } from '@capacitor/cli';

/**
 * CAPACITOR KONFIGURACIJA ZA ROBUST PRODUCTION DEPLOYMENT
 * 
 * Ova konfiguracija osigurava da mobilna APK aplikacija
 * radi stabilno sa production API serverom na tehnikamne.me
 */

// Production API server - ovo je glavna adresa za mobilnu aplikaciju
const PRODUCTION_API_URL = 'https://tehnikamne.me';

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isReplitDev = process.env.REPL_SLUG !== undefined;

/**
 * Određuje server URL za Capacitor na osnovu environment-a
 */
function getServerConfig() {
  // PRODUCTION: Uvek koristi tehnikamne.me za stable APK
  if (!isDevelopment) {
    console.log('🏭 [Capacitor] Production mode - using tehnikamne.me');
    return {
      androidScheme: 'https',
      url: PRODUCTION_API_URL,
      cleartext: false, // Force HTTPS za sigurnost
    };
  }
  
  // DEVELOPMENT: Opciono koristi local server za testiranje
  // Ali i u dev-u default je production server za konzistentnost
  const useLocalDev = process.env.CAPACITOR_DEV_SERVER === 'true';
  
  if (useLocalDev && process.env.CAPACITOR_DEV_URL) {
    console.log('🛠️ [Capacitor] Development mode - using local server:', process.env.CAPACITOR_DEV_URL);
    return {
      androidScheme: 'http',
      url: process.env.CAPACITOR_DEV_URL,
      cleartext: true, // Allow HTTP za local development
    };
  }
  
  // Default: Čak i u development-u koristi production server
  console.log('🔄 [Capacitor] Development mode - defaulting to production server');
  return {
    androidScheme: 'https',
    url: PRODUCTION_API_URL,
    cleartext: false,
  };
}

const config: CapacitorConfig = {
  appId: 'com.servistodosijevic.app',
  appName: 'Servis Todosijević',
  webDir: 'dist/public',
  
  // KLJUČNO: Server konfiguracija za stabilnu mobilnu aplikaciju
  server: getServerConfig(),
  
  // Plugin konfiguracije za mobilnu aplikaciju
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1E293B",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false, // Bolje performanse
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      backgroundColor: "#1E293B",
      style: "DARK",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "ionic", // Bolje upravljanje keyboard-om
      style: "dark",
      resizeOnFullScreen: true,
    },
    // Network plugin za offline/online detekciju
    Network: {
      // Automatically enabled - koristi se u runtime-config
    },
    // Preferences za local storage
    Preferences: {
      // Automatically enabled - koristi se za auth tokens
    },
    // Device plugin za platform detection  
    Device: {
      // Automatically enabled - koristi se u runtime-config
    },
    // Camera plugin za native photo capture
    Camera: {
      // Automatically enabled - koristi se u MobilePhotoUploader
    },
  },
  
  // Android specifične optimizacije
  android: {
    allowMixedContent: false, // Sigurnost - samo HTTPS
    captureInput: true,
    webContentsDebuggingEnabled: isDevelopment, // Debug samo u dev mode
    loggingBehavior: isDevelopment ? 'debug' : 'production',
    
    // Network security konfiguracija
    useLegacyBridge: false, // Koristi novi bridge za bolje performanse
  },
  
  // iOS specifične optimizacije (za buduće proširenje)
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: "#1E293B",
  },
  
  // Napredne konfiguracije
  includePlugins: [
    '@capacitor/app',
    '@capacitor/splash-screen', 
    '@capacitor/status-bar',
    '@capacitor/keyboard',
    '@capacitor/device',
    '@capacitor/preferences',
    '@capacitor/network', // Dodato za offline support
    '@capacitor/camera', // Dodato za native photo capture
  ],
  
  // Logging za debugging mobilne aplikacije
  loggingBehavior: isDevelopment ? 'debug' : 'production',
};

// Log konfiguraciju pri build-u za debugging
console.log('📱 [Capacitor Config] Final configuration:', {
  environment: isDevelopment ? 'development' : 'production',
  serverUrl: config.server?.url || 'relative',
  scheme: config.server?.androidScheme || 'https',
  plugins: Object.keys(config.plugins || {}),
});

export default config;