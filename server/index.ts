import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { maintenanceService } from "./maintenance-service";
import { setupAuth } from "./auth";
import { complusCronService } from "./complus-cron-service";
import { ServisKomercCronService } from "./servis-komerc-cron-service";
import { BekoCronService } from "./beko-cron-service.js";

const servisKomercCronService = new ServisKomercCronService();
const bekoCronService = BekoCronService.getInstance();

import { storage } from "./storage";
// Mobile SMS Service has been completely removed

const app = express();

// Omogući trust proxy za Replit
app.set('trust proxy', 1);

// PRVO postavi JSON body parser middleware sa povećanim limitom za Base64 fotografije
app.use(express.json({ limit: '10mb' })); // Povećano sa default 1mb na 10mb za Base64 fotografije
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// ZATIM CORS middleware za omogućavanje cookies
app.use((req, res, next) => {
  // Specificno dozvoljavamo origin za Replit
  const allowedOrigin = req.headers.origin || req.headers.referer || 'https://5000-manic-donkey-9yxqy86.replit.app';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Only log CORS in development mode to improve production performance
  if (process.env.NODE_ENV !== 'production') {
    console.log(`CORS: method=${req.method}, origin=${req.headers.origin}, referer=${req.headers.referer}, allowedOrigin=${allowedOrigin}, cookies=${req.headers.cookie ? 'present' : 'missing'}, sessionID=${req.sessionID || 'none'}`);
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

// JEDNOSTAVAN ENDPOINT ZA SERVIRANJE SLIKA DIREKTNO OVDE
app.get('/uploads/:fileName', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const fileName = req.params.fileName;
  const filePath = path.join(process.cwd(), 'uploads', fileName);
  
  console.log(`📷 Serving image: ${fileName}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`📷 Image not found: ${filePath}`);
    return res.status(404).send('Image not found');
  }
  
  try {
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.png') contentType = 'image/png';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    console.log(`📷 ✅ Image served: ${fileName}`);
    
  } catch (error) {
    console.error(`📷 ❌ Error serving image:`, error);
    res.status(500).send('Error serving image');
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

(async () => {
  // Mobile SMS Service has been completely removed
  
  const server = await registerRoutes(app);

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
})();
