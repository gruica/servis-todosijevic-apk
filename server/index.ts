import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { maintenanceService } from "./maintenance-service";
import { setupAuth } from "./auth";
import { complusCronService } from "./complus-cron-service";
import { ServisKomercCronService } from "./servis-komerc-cron-service";

const servisKomercCronService = new ServisKomercCronService();

import { storage } from "./storage";
// Mobile SMS Service has been completely removed

const app = express();

// Omogući trust proxy za Replit
app.set('trust proxy', 1);

// PRVO postavi JSON body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ZATIM CORS middleware za omogućavanje cookies
app.use((req, res, next) => {
  // Automatski detektujemo trenutni Replit domain
  let allowedOrigin = req.headers.origin;
  if (!allowedOrigin && req.headers.referer) {
    const refererUrl = new URL(req.headers.referer);
    allowedOrigin = refererUrl.origin;
  }
  if (!allowedOrigin) {
    allowedOrigin = 'https://5000-manic-donkey-9yxqy86.replit.app';
  }
  
  // Omogući sve Replit domene
  if (allowedOrigin.includes('replit.dev') || allowedOrigin.includes('replit.app')) {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
  } else {
    res.header('Access-Control-Allow-Origin', 'https://5000-manic-donkey-9yxqy86.replit.app');
  }
  
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
  });
})();
