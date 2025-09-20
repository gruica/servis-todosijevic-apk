// 🛡️ PRODUCTION SAFETY MEASURES
// Ovaj fajl implementira sigurnosne mere za production environment

import { ENV, logger } from "@shared/environment";

// 🚨 PRODUCTION VALIDATION CHECKS
export class ProductionSafety {
  
  // 🔐 VALIDATE CRITICAL ENVIRONMENT VARIABLES
  static validateProductionSecrets(): boolean {
    if (!ENV.isProduction) {
      logger.debug("Preskačem production validaciju - development mod");
      return true;
    }

    const requiredSecrets = [
      'DATABASE_URL',
      'SESSION_SECRET',
      'EMAIL_USER',
      'EMAIL_PASSWORD'
    ];

    const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);
    
    if (missingSecrets.length > 0) {
      logger.error(`❌ PRODUCTION ERROR: Nedostaju secrets: ${missingSecrets.join(', ')}`);
      return false;
    }

    logger.production("✅ Svi production secrets su validni");
    return true;
  }

  // 🛡️ DISABLE DEBUG FEATURES IN PRODUCTION
  static disableDebugFeatures(): void {
    if (ENV.isProduction) {
      // Override console methods za production
      const originalConsole = { ...console };
      
      console.log = () => {}; // Disable console.log
      console.debug = () => {}; // Disable console.debug
      
      // Keep error and warn for important messages
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      
      logger.production("🔇 Debug features disabled za production");
    }
  }

  // 📊 PRODUCTION MONITORING
  static enableProductionMonitoring(): void {
    if (ENV.isProduction) {
      // Monitor uncaught exceptions
      process.on('uncaughtException', (error) => {
        logger.error('🚨 UNCAUGHT EXCEPTION:', error);
        // U production, možemo poslati alert ili log u external servis
      });

      process.on('unhandledRejection', (reason, promise) => {
        logger.error('🚨 UNHANDLED REJECTION:', reason);
        // U production, možemo poslati alert ili log u external servis
      });

      logger.production("📊 Production monitoring aktiviran");
    }
  }

  // 🎯 COMPREHENSIVE PRODUCTION SETUP
  static initializeProductionSafety(): boolean {
    logger.info("🛡️ Inicijalizujem production safety mere...");
    
    // Validate secrets
    if (!this.validateProductionSecrets()) {
      return false;
    }
    
    // Setup monitoring
    this.enableProductionMonitoring();
    
    // Disable debug features
    this.disableDebugFeatures();
    
    logger.production("✅ Production safety mere uspešno inicijalizovane");
    return true;
  }
}

// 🚀 DEPLOYMENT HELPER FUNCTIONS
export class DeploymentHelper {
  
  // 📋 PRE-DEPLOYMENT CHECKLIST
  static runPreDeploymentChecks(): boolean {
    logger.info("🔍 Pokretam pre-deployment provjere...");
    
    const checks = [
      { name: "Environment setup", check: () => ENV.isProduction },
      { name: "Database connection", check: () => !!process.env.DATABASE_URL },
      { name: "Session secret", check: () => !!process.env.SESSION_SECRET },
      { name: "Email configuration", check: () => !!process.env.EMAIL_USER }
    ];

    let allPassed = true;
    
    checks.forEach(({ name, check }) => {
      const passed = check();
      if (passed) {
        logger.info(`✅ ${name}: PASSED`);
      } else {
        logger.error(`❌ ${name}: FAILED`);
        allPassed = false;
      }
    });

    if (allPassed) {
      logger.production("🎉 Svi pre-deployment checks prošli uspešno!");
    } else {
      logger.error("🚨 Neki pre-deployment checks nisu prošli!");
    }

    return allPassed;
  }

  // 📝 GENERATE DEPLOYMENT REPORT
  static generateDeploymentReport(): object {
    return {
      timestamp: new Date().toISOString(),
      environment: ENV.isProduction ? 'PRODUCTION' : 'DEVELOPMENT',
      appName: ENV.appName,
      nodeEnv: process.env.NODE_ENV,
      databaseConfigured: !!ENV.databaseUrl,
      secretsConfigured: !!process.env.SESSION_SECRET,
      emailConfigured: !!process.env.EMAIL_USER,
      debugFeatures: ENV.enableDebugFeatures
    };
  }
}

export default ProductionSafety;