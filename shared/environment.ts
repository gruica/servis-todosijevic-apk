// 🛡️ CENTRALNI ENVIRONMENT CONFIGURATION SISTEM
// Ovaj fajl kontroliše da li ste u development ili production modu

export interface EnvironmentConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  databaseUrl: string;
  appName: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableDebugFeatures: boolean;
  showDevBanner: boolean;
}

// 🎯 AUTOMATSKA DETEKCIJA ENVIRONMENT-a
function detectEnvironment(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  
  // 🔍 DODATNE PROVERE ZA DEVELOPMENT MOD
  const isReplit = !!process.env.REPLIT_DB_URL || !!process.env.REPLIT_DEV_DOMAIN;
  const isLocalDev = !isReplit && isDevelopment;
  const isReplitDev = isReplit && isDevelopment;
  
  return {
    isDevelopment,
    isProduction,
    databaseUrl: process.env.DATABASE_URL || '',
    appName: isDevelopment ? 'FrigoSistem-DEV' : 'FrigoSistem-PRODUCTION',
    logLevel: isDevelopment ? 'debug' : 'warn',
    enableDebugFeatures: isDevelopment,
    showDevBanner: isDevelopment
  };
}

// 🚀 GLOBALNI ENVIRONMENT CONFIG
export const ENV = detectEnvironment();

// 🛡️ PRODUCTION SAFETY CHECKS
export function validateProductionRequirements(): void {
  if (ENV.isProduction) {
    if (!ENV.databaseUrl) {
      throw new Error('⚠️ PRODUCTION ERROR: DATABASE_URL is required in production');
    }
    
    if (!process.env.SESSION_SECRET) {
      throw new Error('⚠️ PRODUCTION ERROR: SESSION_SECRET is required in production');
    }
    
    console.log('✅ Production environment validated successfully');
  }
}

// 📊 LOGGING UTILITIES
export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (ENV.enableDebugFeatures) {
      console.log(`🔧 [DEV] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (ENV.logLevel === 'debug' || ENV.logLevel === 'info') {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (ENV.logLevel !== 'error') {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(`❌ [ERROR] ${message}`, ...args);
  },
  
  production: (message: string, ...args: any[]) => {
    if (ENV.isProduction) {
      console.log(`🚀 [PROD] ${message}`, ...args);
    }
  }
};

// 🎨 UI HELPERS
export const getEnvironmentTheme = () => ({
  bannerColor: ENV.isDevelopment ? 'bg-yellow-500' : 'bg-green-500',
  bannerText: ENV.isDevelopment ? 'DEVELOPMENT MODE - Eksperimenti nisu vidljivi korisnicima' : 'PRODUCTION MODE',
  headerClass: ENV.isDevelopment ? 'border-l-4 border-yellow-500' : '',
  debugInfo: ENV.enableDebugFeatures
});

export default ENV;