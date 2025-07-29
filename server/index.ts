import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { maintenanceService } from "./maintenance-service";
import { setupAuth } from "./auth";
import { verifyToken } from './jwt-auth';

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

// Registruj JWT endpoint-e PRE auth middleware setup-a
app.get('/api/my-services-test', async (req, res) => {
  console.log('🔧 TEST MY-SERVICES: Endpoint pozvan bez JWT autentifikacije');
  res.json({ message: 'Test endpoint radi', services: [], timestamp: new Date().toISOString() });
});

// API endpoint za servise servisera (mobilni pristup) - registrovan PRE setupAuth
app.get('/api/my-services', async (req, res) => {
  console.log('🔧 MY-SERVICES: Endpoint pozvan - početak funkcije');
  
  try {
    console.log('🔧 MY-SERVICES: U try bloku');
    
    // JWT autentifikacija
    const authHeader = req.headers.authorization;
    console.log('🔧 MY-SERVICES: Auth header:', authHeader ? 'prisutan' : 'nije prisutan');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔧 MY-SERVICES: Vraćam 401 - nema header-a');
      return res.status(401).json({ error: 'Token nije pronađen' });
    }

    const token = authHeader.substring(7);
    console.log('🔧 MY-SERVICES: Token dužina:', token.length);
    
    // Test da li uopšte izvršavamo JWT verifikaciju
    const JWT_SECRET = process.env.JWT_SECRET;
    console.log('🔧 MY-SERVICES: JWT_SECRET:', JWT_SECRET ? 'prisutan' : 'nije prisutan');
    
    if (!JWT_SECRET) {
      console.log('🔧 MY-SERVICES: JWT_SECRET nije konfigurisan');
      return res.status(500).json({ error: 'JWT konfiguracija nije pronađena' });
    }

    console.log('🔧 MY-SERVICES: Pokušavam verifikaciju tokena...');

    console.log('🔧 MY-SERVICES: Pozivam verifyToken funkciju...');
    
    // Debug - proverim direktno JWT_SECRET iz jwt-auth
    console.log('🔧 MY-SERVICES: JWT_SECRET iz index.ts:', JWT_SECRET);
    console.log('🔧 MY-SERVICES: JWT_SECRET iz env var:', process.env.JWT_SECRET);
    
    const decoded = verifyToken(token);
    console.log('🔧 MY-SERVICES: verifyToken returned:', decoded);
    
    if (!decoded) {
      console.log('🔧 MY-SERVICES: Token verifikacija neuspešna - vracam error');
      return res.status(401).json({ error: 'Neispravan token' });
    }
    
    console.log('🔧 MY-SERVICES: Token uspešno dekodiran:', decoded);

    console.log('🔧 MY-SERVICES: JWT verifikacija prošla, proveravam ulogu...');
    // Proveri da li je korisnik serviser
    if (!decoded || decoded.role !== 'technician') {
      console.log('🔧 MY-SERVICES: Korisnik nije tehničar:', decoded?.role);
      return res.status(403).json({ error: 'Nemate dozvolu za pristup ovim podacima' });
    }

    const technicianId = decoded.technicianId;
    if (!technicianId) {
      console.log('🔧 MY-SERVICES: TechnicianId nije dostupan u token-u');
      return res.status(400).json({ error: 'Tehničar ID nije dostupan' });
    }

    console.log(`🔧 MY-SERVICES: Dohvatanje servisa za tehničara ${technicianId}...`);

    try {
      console.log('🔧 MY-SERVICES: Pozivam storage.getServicesByTechnician...');
      console.log('🔧 MY-SERVICES: Storage objekat:', typeof storage);
      
      // Dohvati servise iz baze podataka
      const services = await storage.getServicesByTechnician(technicianId);
      console.log(`🔧 MY-SERVICES: Pronađeno ${services.length} servisa za tehničara ${technicianId}`);

      res.json({ 
        success: true,
        technicianId: technicianId,
        services: services,
        count: services.length
      });
    } catch (storageError) {
      console.error('🔧 MY-SERVICES: Storage greška:', storageError);
      res.status(500).json({ error: 'Greška pri dohvatanju servisa iz baze' });
    }
    
  } catch (error) {
    console.error('🔧 MY-SERVICES: Catch block greška:', error);
    res.status(500).json({ error: 'Greška pri dohvatanju servisa' });
  }
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

// Registruj kritične API endpoint-e PRE ostalih middleware-ova
app.get('/api/my-services-test', async (req, res) => {
  console.log('🔧 TEST MY-SERVICES: Endpoint pozvan bez JWT autentifikacije');
  res.json({ message: 'Test endpoint radi', services: [], timestamp: new Date().toISOString() });
});



(async () => {
  // Mobile SMS Service has been completely removed
  
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

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
  });
})();
