import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { maintenanceService } from "./maintenance-service";
import { setupAuth } from "./auth";

import { storage } from "./storage";
import { createMobileSMSService } from "./mobile-sms-service";

const app = express();

// Omogući trust proxy za Replit
app.set('trust proxy', 1);

// PRVO postavi JSON body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ZATIM CORS middleware za omogućavanje cookies
app.use((req, res, next) => {
  // Specificno dozvoljavamo origin za Replit
  const allowedOrigin = req.headers.origin || req.headers.referer || 'https://5000-manic-donkey-9yxqy86.replit.app';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  console.log(`CORS: method=${req.method}, origin=${req.headers.origin}, referer=${req.headers.referer}, allowedOrigin=${allowedOrigin}, cookies=${req.headers.cookie ? 'present' : 'missing'}, sessionID=${req.sessionID || 'none'}`);
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// NAKON body parser-a postavi session middleware
setupAuth(app);

// Session middleware je konfigurisan u setupAuth()

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
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
  // Inicijalizacija Mobile SMS servisa sa novim parametrima
  console.log('[MOBILE SMS] Pokretanje mobile SMS servisa sa novom aplikacijom...');
  const mobileSMSService = createMobileSMSService(storage as any);
  await mobileSMSService.initialize();
  
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
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Pokreni servis za automatsko održavanje - provera na svakih sat vremena
    maintenanceService.start();
    log("Servis za održavanje je pokrenut");
  });
})();
