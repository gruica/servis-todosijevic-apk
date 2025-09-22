import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, setupSecurityEndpoints } from "./routes";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

import { setupVite, serveStatic, log } from "./vite";
import { maintenanceService } from "./maintenance-service";
import { setupAuth } from "./auth";
import { complusCronService } from "./complus-cron-service";
import { ServisKomercCronService } from "./servis-komerc-cron-service";
import { BekoCronService } from "./beko-cron-service.js";
import { completeSecurityStack } from "./security-middleware.js";
import { logSecurityEvent, SecurityEventType } from "./security-monitor.js";

const servisKomercCronService = new ServisKomercCronService();
const bekoCronService = BekoCronService.getInstance();

import { storage } from "./storage";
// Mobile SMS Service has been completely removed

const app = express();

// Omogući trust proxy za Replit
app.set('trust proxy', 1);

// 🛡️ SIGURNOSNI HEADERS - HELMET MIDDLEWARE
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Za Vite development
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://replit.com", "https://*.replit.com"],
      frameAncestors: ["'self'", "https://replit.com", "https://*.replit.com", "https://*.replit.dev", "https://*.repl.co", "https://*.id.repl.co", "https://*.riker.replit.dev", "http://127.0.0.1:5000"]
    },
  },
  hsts: {
    maxAge: 31536000, // 1 godina
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// 🛡️ RATE LIMITING za login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 5, // maksimalno 5 pokušaja po IP adresi
  message: { error: 'Previše pokušaja logovanja. Pokušajte ponovo za 15 minuta.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Ne računa uspešne login-e
});

// 🛡️ OPŠTI RATE LIMITING za API endpoint-e
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuta
  max: 100, // maksimalno 100 zahteva po IP adresi u minuti
  message: { error: 'Previše zahteva. Pokušajte ponovo za minut.' },
  standardHeaders: true,
  legacyHeaders: false
});

// PRVO postavi JSON body parser middleware sa povećanim limitom za Base64 fotografije
app.use(express.json({ limit: '10mb' })); // Povećano sa default 1mb na 10mb za Base64 fotografije
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// 🛡️ SIGURNA CORS KONFIGURACIJA - EXACT MATCH ONLY
app.use((req, res, next) => {
  // Lista dozvoljenih origin-a za APK i web pristup - EXACT MATCH
  const allowedOrigins = [
    'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev', // Development Replit
    'https://tehnikamne.me', // Production domen
    'https://www.tehnikamne.me', // Production domen sa www
    'http://127.0.0.1:5000', // Local development
    'http://localhost:5000' // Local development alternativa
  ];
  
  const requestOrigin = req.headers.origin; // SAMO origin, ne referer
  
  // 🛡️ SIGURNA CORS PROVERA - EXACT MATCH ONLY
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    // Origin je eksplicitno dozvoljen
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (!requestOrigin) {
    // Same-origin zahtevi (bez Origin header-a) - dozvoli ih
    res.header('Access-Control-Allow-Origin', allowedOrigins[0]); // Default fallback
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    // Nepoznat origin - BLOKIRATI + LOG SECURITY EVENT
    console.warn(`🚫 CORS: Blokiran nepoznat origin: ${requestOrigin}`);
    logSecurityEvent(SecurityEventType.CORS_VIOLATION, {
      origin: requestOrigin,
      path: req.path,
      method: req.method
    }, req);
    return res.status(403).json({ error: 'CORS policy violation - origin not allowed' });
  }
  
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  // CSP header za iframe embedding će biti postavljen nakon Vite setup-a
  
  // 🛡️ BEZBEDNOST: Ne loguj CORS details u production zbog session ID-jeva
  if (process.env.NODE_ENV !== 'production') {
    // Ukloni sessionID iz logova zbog bezbednosti
    console.log(`CORS: method=${req.method}, origin=${req.headers.origin}, allowed=${!!requestOrigin && allowedOrigins.includes(requestOrigin)}, cookies=${req.headers.cookie ? 'present' : 'missing'}`);
  }
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// NAKON body parser-a postavi session middleware
setupAuth(app);

// Session middleware je konfigurisan u setupAuth()

// 🛡️ SIGURNI ENDPOINT ZA SERVIRANJE SLIKA - ZAŠTIĆEN OD DIRECTORY TRAVERSAL
app.get('/uploads/:fileName', async (req, res) => {
  const fs = await import('fs');
  const fileName = req.params.fileName;
  
  // 🛡️ SIGURNOSNA VALIDACIJA IMENA FAJLA
  if (!fileName || typeof fileName !== 'string') {
    return res.status(400).json({ error: 'Invalid file name' });
  }
  
  // 🛡️ BLOKIRANJE PATH TRAVERSAL KARAKTERA + SECURITY LOGGING
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\') || fileName.includes('\0')) {
    console.warn(`🚫 SECURITY: Path traversal pokušaj blokiran: ${fileName}`);
    logSecurityEvent(SecurityEventType.PATH_TRAVERSAL_ATTEMPT, {
      fileName,
      path: req.path,
      detectedPattern: 'file_name_traversal'
    }, req);
    return res.status(400).json({ error: 'Invalid file name - security violation' });
  }
  
  // 🛡️ DOZVOLJENE EKSTENZIJE FAJLOVA
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.gif'];
  const ext = path.extname(fileName).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    console.warn(`🚫 SECURITY: Nedozvoljena ekstenzija blokirana: ${ext} za fajl ${fileName}`);
    return res.status(400).json({ error: 'File type not allowed' });
  }
  
  // 🛡️ SIGURNO KREIRANJE PUTANJE - PATH RESOLUTION SA VALIDACIJOM
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const requestedPath = path.resolve(uploadsDir, fileName);
  
  // 🛡️ PROVERA DA LI JE PUTANJA UNUTAR UPLOADS DIREKTORIJA
  if (!requestedPath.startsWith(uploadsDir + path.sep) && requestedPath !== uploadsDir) {
    console.warn(`🚫 SECURITY: Path traversal pokušaj blokiran - putanja van uploads: ${requestedPath}`);
    return res.status(400).json({ error: 'Path traversal blocked' });
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📷 Serving secure image: ${fileName}`);
  }
  
  if (!fs.existsSync(requestedPath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  try {
    // Mapa ekstenzija na MIME tipove
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff'); // Dodatna XSS zaštita
    
    const fileStream = fs.createReadStream(requestedPath);
    fileStream.pipe(res);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📷 ✅ Secure image served: ${fileName}`);
    }
    
  } catch (error) {
    console.error(`📷 ❌ Error serving image:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API logging middleware - optimized for production
app.use((req, res, next) => {
  // Skip logging for health check endpoints to improve performance
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    // Only capture response in development mode
    if (process.env.NODE_ENV !== 'production') {
      capturedJsonResponse = bodyJson;
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only include response data in development
      if (capturedJsonResponse && process.env.NODE_ENV !== 'production') {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// 🛡️ APLIKACIJA RATE LIMITING-a NA API ENDPOINT-E
app.use('/api/', apiLimiter);

// 🛡️ ENTERPRISE SECURITY MONITORING STACK
app.use(completeSecurityStack());

(async () => {
  // Mobile SMS Service has been completely removed
  
  const server = await registerRoutes(app, loginLimiter);
  
  // Registruj sigurnosne endpoint-e za audit i soft delete
  setupSecurityEndpoints(app, storage);
  


  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';
  
  server.listen({
    port,
    host,
    reusePort: true,
  }, () => {
    log(`serving on ${host}:${port} (env: ${app.get("env")})`);
    
    // Pokreni servis za automatsko održavanje sa error handling-om
    try {
      maintenanceService.start();
      log("Servis za održavanje je pokrenut");
    } catch (error) {
      console.error("Greška pri pokretanju servisa za održavanje:", error);
      // Aplikacija i dalje može da radi bez servisa za održavanje
    }

    // Pokreni ComPlus automatske izveštaje
    try {
      complusCronService.start();
      log("ComPlus automatski izveštaji pokrenuti");
    } catch (error) {
      console.error("Greška pri pokretanju ComPlus cron servisa:", error);
      // Aplikacija i dalje može da radi bez ComPlus cron servisa
    }

    // Pokreni Servis Komerc automatske izveštaje
    try {
      servisKomercCronService.start();
      log("Servis Komerc automatski izveštaji pokrenuti");
    } catch (error) {
      console.error("Greška pri pokretanju Servis Komerc cron servisa:", error);
      // Aplikacija i dalje može da radi bez Servis Komerc cron servisa
    }

    // Pokreni Beko automatske izveštaje
    try {
      bekoCronService.start();
      log("Beko automatski izveštaji pokrenuti");
    } catch (error) {
      console.error("Greška pri pokretanju Beko cron servisa:", error);
      // Aplikacija i dalje može da radi bez Beko cron servisa
    }

    // Pokreni Storage Optimization cron job-ove
    (async () => {
      try {
        const { StorageOptimizationCron } = await import('./storage-optimization-cron');
        StorageOptimizationCron.startAll();
        log("Storage optimization cron job-ovi pokrenuti");
      } catch (error) {
        console.error("Greška pri pokretanju Storage optimization cron servisa:", error);
        // Aplikacija i dalje može da radi bez Storage optimization cron servisa
      }
    })();
  });

  // PROFESSIONAL GRACEFUL SHUTDOWN HANDLER - DODANO NA KRAJ
  // Replit best practices za čist restart aplikacije
  let isShuttingDown = false;
  
  function gracefulShutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(`🔄 [SHUTDOWN] Received ${signal}. Gracefully shutting down server...`);
    
    server.close(() => {
      console.log('✅ [SHUTDOWN] HTTP server closed');
      
      // Close database connections
      (async () => {
        try {
          const { pool } = await import('./db.js');
          await pool.end();
          console.log('✅ [SHUTDOWN] Database connections closed');
        } catch (error) {
          console.error('❌ [SHUTDOWN] Error closing database:', error);
        }
        
        // Exit gracefully
        console.log('✅ [SHUTDOWN] Process terminated cleanly');
        process.exit(0);
      })();
    });
    
    // Force shutdown after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('❌ [SHUTDOWN] Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  }

  // Register shutdown handlers for various signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For Replit restarts
  
  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    console.error('❌ [UNCAUGHT EXCEPTION]:', error);
    
    // Don't shutdown on Neon database errors - they're usually temporary
    const errorMessage = error.message || '';
    const errorStack = error.stack || '';
    
    if (errorMessage.includes('Cannot set property message') && 
        errorStack.includes('@neondatabase/serverless')) {
      console.log('🔧 [DATABASE] Ignoring known Neon database error - continuing operation');
      return;
    }
    
    // Only shutdown on severe errors that are not database-related
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [UNHANDLED REJECTION] at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });

})();
