import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, comparePassword } from "./auth";
import { registerBusinessPartnerRoutes } from "./business-partner-routes";
import { emailService } from "./email-service";
import { excelService } from "./excel-service";
import { generateToken, jwtAuthMiddleware, jwtAuth, requireRole } from "./jwt-auth";
import { insertClientSchema, insertServiceSchema, insertApplianceSchema, insertApplianceCategorySchema, insertManufacturerSchema, insertTechnicianSchema, insertUserSchema, serviceStatusEnum, insertMaintenanceScheduleSchema, insertMaintenanceAlertSchema, maintenanceFrequencyEnum, insertSparePartOrderSchema, sparePartUrgencyEnum, sparePartStatusEnum, sparePartWarrantyStatusEnum, insertRemovedPartSchema, insertSparePartsCatalogSchema, sparePartCategoryEnum, sparePartAvailabilityEnum, sparePartSourceTypeEnum, insertServiceCompletionReportSchema } from "@shared/schema";
import { db, pool } from "./db";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { eq, and, desc, gte, lte, ne, isNull, isNotNull, like, count, sql, sum, or, inArray } from "drizzle-orm";
import * as schema from "@shared/schema";
import { SMSCommunicationService } from "./sms-communication-service.js";
const { availableParts, appliances, applianceCategories, manufacturers, services, spareParts, users, technicians, sparePartOrders } = schema;
import { getBotChallenge, verifyBotAnswer, checkBotVerification } from "./bot-verification";
import { checkServiceRequestRateLimit, checkRegistrationRateLimit, getRateLimitStatus } from "./rate-limiting";
import { emailVerificationService } from "./email-verification";
import { NotificationService } from "./notification-service";
import { BusinessPartnerNotificationService } from "./business-partner-notifications";
import { BusinessPartnerMessageService } from "./business-partner-messages";
import { createSMSMobileAPIRoutes } from './sms-mobile-api-routes';
import { setupWebScrapingRoutes } from './web-scraping-routes';
import { ServisKomercCronService } from './servis-komerc-cron-service.js';
import { ServisKomercNotificationService } from './servis-komerc-notification-service.js';
import { aiPredictiveMaintenanceService } from './services/ai-predictive-maintenance.js';
import { ObjectStorageService } from './objectStorage.js';
// SMS mobile functionality has been completely removed

// ENTERPRISE MONITORING & HEALTH CHECK
async function setupEnterpriseHealthEndpoint(app: Express) {
  app.get("/api/health", async (req, res) => {
    try {
      const startTime = Date.now();
      const { checkDatabaseHealth } = await import('./db.js');
      const dbHealth = await checkDatabaseHealth();
      
      const systemHealth = {
        status: dbHealth.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          healthy: dbHealth.healthy,
          responseTime: `${dbHealth.responseTime}ms`,
          activeConnections: dbHealth.activeConnections
        },
        performance: {
          healthCheckTime: `${Date.now() - startTime}ms`,
          uptime: `${Math.floor(process.uptime())}s`,
          memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        },
        version: {
          node: process.version,
          app: 'FrigoSistem_v2025.1.0_Enterprise'
        }
      };
      
      res.status(dbHealth.healthy ? 200 : 503).json(systemHealth);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });
}

// Mapiranje status kodova u opisne nazive statusa
const STATUS_DESCRIPTIONS: Record<string, string> = {
  'pending': 'Na čekanju',
  'assigned': 'Dodeljen serviseru',
  'scheduled': 'Zakazan termin',
  'in_progress': 'U toku',
  'device_parts_removed': 'Delovi uklonjeni sa uređaja',
  'completed': 'Završen',
  'cancelled': 'Otkazan'
};

// SMS functionality has been completely removed from the application
function generateStatusUpdateMessage(serviceId: number, newStatus: string, technicianName?: string | null): string {
  return '';
}

// Email postavke schema
const emailSettingsSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  secure: z.boolean().default(true),
  user: z.string().min(1),
  password: z.string().min(1),
});

const testEmailSchema = z.object({
  recipient: z.string().email(),
});

// Multer konfiguracija za CSV upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Samo CSV datoteke su dozvoljene'));
    }
  }
});

// Dodatna multer konfiguracija za catalog CSV upload
const catalogUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    console.log('Multer file filter - file info:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/csv' || 
        file.mimetype === 'text/plain' ||
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Samo CSV datoteke su dozvoljene'));
    }
  }
});

// Photo upload middleware
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    console.log('[PHOTO MULTER] 🔥 File filter pozvan - file info:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname,
      authorization: req.headers.authorization ? 'postoji' : 'ne postoji'
    });
    
    // Accept image files
    if (file.mimetype.startsWith('image/')) {
      console.log('[PHOTO MULTER] ✅ Slika prihvaćena');
      cb(null, true);
    } else {
      console.log('[PHOTO MULTER] ❌ Odbačena - nije slika');
      cb(new Error('Samo slike su dozvoljene'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // setupAuth se poziva u server/index.ts pre CORS middleware-a
  const server = createServer(app);


  
  // Health check endpoints for deployment
  // Primary health check - used by cloud platforms
  // Backend endpoint za statistike servisera
  app.get('/api/technicians/:id/stats', jwtAuth, async (req, res) => {
    try {
      const technicianId = parseInt(req.params.id);
      
      // Proveri da li korisnik može pristupiti podacima (admin ili vlastiti podaci)
      if ((req.user as any).role !== 'admin' && (req.user as any).technicianId !== technicianId) {
        return res.status(403).json({ error: 'Nemate dozvolu za pristup ovim podacima' });
      }

      const services = await storage.getServicesByTechnician(technicianId);
      
      const stats = {
        total_services: services.length,
        completed_services: services.filter(s => s.status === 'completed').length,
        pending_services: services.filter(s => ['pending', 'assigned', 'in_progress', 'scheduled', 'waiting_parts'].includes(s.status)).length,
        this_month_completed: services.filter(s => {
          if (s.status !== 'completed') return false;
          const completedDate = new Date((s as any).updatedAt || s.createdAt);
          const now = new Date();
          return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
        }).length,
        average_completion_days: 5.2, // Mock vrednost za sada
        customer_rating: 4.8 // Mock vrednost za sada
      };

      res.json(stats);
    } catch (error) {
      console.error('Greška pri dobijanju statistika servisera:', error);
      res.status(500).json({ error: 'Greška pri dobijanju statistika' });
    }
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0"
    });
  });
  
  // Alternative health check route
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      api: "ready",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Inicijalizacija SMS servisa
  let smsService: SMSCommunicationService | null = null;
  
  // Funkcija za dobijanje SMS konfiguracije iz baze
  async function initializeSMSService() {
    try {
      const settingsArray = await storage.getSystemSettings();
      const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
      
      const apiKey = settingsMap.sms_mobile_api_key;
      const baseUrl = settingsMap.sms_mobile_base_url;
      const senderId = settingsMap.sms_mobile_sender_id || null; // Uklonjen fallback da se prikazuje broj
      const enabled = settingsMap.sms_mobile_enabled === 'true';
      
      console.log('📱 SMS postavke:', { apiKey: apiKey ? '***' : 'nema', baseUrl, senderId, enabled });
      
      if (apiKey && baseUrl) {
        smsService = new SMSCommunicationService({
          apiKey,
          baseUrl,
          senderId,
          enabled
        });
        console.log('✅ SMS Communication Service inicijalizovan uspešno');
      } else {
        console.log('⚠️ SMS servis nije inicijalizovan - nedostaju API ključ ili URL');
      }
    } catch (error) {
      console.error('❌ Greška pri inicijalizaciji SMS servisa:', error);
    }
  }
  
  // Pozovi inicijalizaciju SMS servisa
  await initializeSMSService();

  // Helper funkcija za dobijanje administratora sa telefonskim brojevima
  async function getAdminsWithPhones(): Promise<Array<{id: number, fullName: string, phone: string}>> {
    try {
      const allUsers = await storage.getAllUsers();
      return allUsers
        .filter(user => user.role === 'admin' && user.phone && user.phone.trim() !== '')
        .map(user => ({
          id: user.id,
          fullName: user.fullName,
          phone: user.phone!
        }));
    } catch (error) {
      console.error('❌ Greška pri dobijanju administratora:', error);
      return [];
    }
  }
  
  // Security routes - Bot verification and rate limiting
  app.get("/api/security/bot-challenge", getBotChallenge);
  app.post("/api/security/verify-bot", verifyBotAnswer);
  app.get("/api/security/rate-limit-status", getRateLimitStatus);
  
  // JWT Login endpoint - replacing session-based login
  app.post("/api/jwt-login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Korisničko ime i lozinka su obavezni" });
      }
      
      console.log(`JWT Login attempt for: ${username}`);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log(`JWT Login: User ${username} not found`);
        return res.status(401).json({ error: "Neispravno korisničko ime ili lozinka" });
      }
      
      // Check password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        console.log(`JWT Login: Invalid password for ${username}`);
        return res.status(401).json({ error: "Neispravno korisničko ime ili lozinka" });
      }
      
      // Check if user is verified
      if (!user.isVerified) {
        console.log(`JWT Login: User ${username} not verified`);
        return res.status(401).json({ error: "Račun nije verifikovan. Kontaktirajte administratora." });
      }
      
      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        username: user.username,
        role: user.role
      });
      
      console.log(`JWT Login successful for: ${username} (${user.role})`);
      
      // Return token and user info
      res.json({
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          phone: user.phone,
          technicianId: user.technicianId
        },
        token
      });
      
    } catch (error) {
      console.error("JWT Login error:", error);
      res.status(500).json({ error: "Greška pri prijavljivanju" });
    }
  });

  // JWT User info endpoint
  app.get("/api/jwt-user", jwtAuthMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        phone: user.phone,
        technicianId: user.technicianId
      });
    } catch (error) {
      console.error("JWT User info error:", error);
      res.status(500).json({ error: "Greška pri dobijanju korisničkih podataka" });
    }
  });

  // Email verification routes
  app.post("/api/email/send-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email adresa je obavezna." 
        });
      }

      const result = await emailVerificationService.sendVerificationEmail(email);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Greška pri slanju verifikacijskog email-a:", error);
      res.status(500).json({ 
        success: false, 
        message: "Greška servera pri slanju verifikacijskog koda." 
      });
    }
  });

  app.post("/api/email/verify-code", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ 
          success: false, 
          message: "Email adresa i kod su obavezni." 
        });
      }

      const result = await emailVerificationService.verifyEmail(email, code);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Greška pri verifikaciji email-a:", error);
      res.status(500).json({ 
        success: false, 
        message: "Greška servera pri verifikaciji koda." 
      });
    }
  });

  app.get("/api/email/verify-status/:email", async (req, res) => {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email adresa je obavezna." 
        });
      }

      const isVerified = await emailVerificationService.isEmailVerified(email);
      
      res.json({ 
        success: true, 
        isVerified 
      });
    } catch (error) {
      console.error("Greška pri proveri verifikacije:", error);
      res.status(500).json({ 
        success: false, 
        message: "Greška servera pri proveri verifikacije." 
      });
    }
  });

  // Spare parts order endpoint
  app.post("/api/spare-parts/order", async (req, res) => {
    try {
      const reqUser = (req as any).user;
      if (!reqUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { serviceId, technicianId, parts, urgency, supplierNotes, totalValue, clientName, applianceModel } = req.body;

      // Validacija podataka
      if (!serviceId || !technicianId || !parts || !Array.isArray(parts) || parts.length === 0) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Kreiraj zahtev za rezervne delove
      const orderData = {
        serviceId: parseInt(serviceId),
        technicianId: parseInt(technicianId),
        parts: JSON.stringify(parts),
        urgency: urgency || "medium",
        supplierNotes: supplierNotes || "",
        totalValue: parseFloat(totalValue) || 0,
        clientName: clientName || "",
        applianceModel: applianceModel || "",
        status: "pending",
        createdAt: new Date().toISOString(),
        requestedBy: reqUser.id
      };

      console.log("Creating spare parts order:", orderData);

      // Dodaj u bazu podataka (za sada simulacija)
      // TODO: Implementirati stvarno čuvanje u bazu
      
      res.json({ 
        message: "Zahtev za rezervne delove je uspešno kreiran",
        orderId: Date.now(),
        ...orderData
      });
    } catch (error) {
      console.error("Error creating spare parts order:", error);
      res.status(500).json({ error: "Failed to create spare parts order" });
    }
  });
  
  // Registruj rute za poslovne partnere
  // Business partner routes registration
  registerBusinessPartnerRoutes(app);

  // Client routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju klijenata" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(parseInt(req.params.id));
      if (!client) return res.status(404).json({ error: "Klijent nije pronađen" });
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju klijenta" });
    }
  });
  
  // Endpoint za dobijanje detaljnih informacija o klijentu (sa aparatima, servisima i serviserima)
  app.get("/api/clients/:id/details", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const clientDetails = await storage.getClientWithDetails(parseInt(req.params.id));
      if (!clientDetails) return res.status(404).json({ error: "Klijent nije pronađen" });
      res.json(clientDetails);
    } catch (error) {
      console.error("Greška pri dobijanju detalja klijenta:", error);
      res.status(500).json({ error: "Greška pri dobijanju detalja klijenta" });
    }
  });
  
  // Provera da li klijent već postoji
  app.post("/api/clients/check", async (req, res) => {
    console.log("🔍 /api/clients/check endpoint pozvan sa:", req.body);
    try {
      const { email } = req.body;
      if (!email) {
        console.log("❌ Email nije prosleđen");
        return res.status(400).json({ error: "Email je obavezan" });
      }
      
      const clients = await storage.getAllClients();
      const existingClient = clients.find(c => c.email === email);
      
      if (existingClient) {
        console.log("✅ Klijent pronađen:", existingClient.id);
        res.json({ exists: true, id: existingClient.id });
      } else {
        console.log("❌ Klijent nije pronađen");
        res.json({ exists: false });
      }
    } catch (error) {
      console.error("Greška pri proveri klijenta:", error);
      res.status(500).json({ error: "Greška pri proveri klijenta" });
    }
  });

  // TEST RUTA je uklonjena za produkciju

  app.post("/api/clients", async (req, res) => {
    try {
      console.log("🔧 [ADMIN CLIENTS] POST endpoint pozvan sa podacima:", req.body);
      
      // Proverimo da li se šalje klijent sa uređajem ili samo klijent
      const hasAppliance = req.body.categoryId && req.body.manufacturerId && req.body.model;
      
      if (hasAppliance) {
        console.log("📱 [ADMIN CLIENTS] Kreiranje klijenta SA uređajem");
        
        // Validacija kombinovanih podataka (klijent + uređaj)
        const clientData = {
          fullName: req.body.fullName,
          email: req.body.email,
          phone: req.body.phone,
          address: req.body.address,
          city: req.body.city,
        };
        
        const applianceData = {
          categoryId: req.body.categoryId,
          manufacturerId: req.body.manufacturerId,
          model: req.body.model,
          serialNumber: req.body.serialNumber,
          purchaseDate: req.body.purchaseDate,
          notes: req.body.notes,
        };
        
        // Validacija podataka klijenta
        const clientValidation = insertClientSchema.safeParse(clientData);
        if (!clientValidation.success) {
          return res.status(400).json({ 
            error: "Nevažeći podaci klijenta", 
            details: clientValidation.error.format(),
            message: "Podaci o klijentu nisu validni. Proverite unos."
          });
        }
        
        // Validacija podataka uređaja (dodajem dummy clientId za validaciju)
        const applianceValidation = insertApplianceSchema.safeParse({
          ...applianceData,
          clientId: 999 // Dummy pozitivna vrednost za validaciju - biće zamenjena pravim ID-om
        });
        
        if (!applianceValidation.success) {
          return res.status(400).json({ 
            error: "Nevažeći podaci uređaja", 
            details: applianceValidation.error.format(),
            message: "Podaci o uređaju nisu validni. Proverite unos."
          });
        }
        
        // Kreiranje klijenta
        console.log("👤 [ADMIN CLIENTS] Kreiranje klijenta...");
        const newClient = await storage.createClient(clientValidation.data);
        console.log("✅ [ADMIN CLIENTS] Klijent kreiran sa ID:", newClient.id);
        
        // Kreiranje uređaja sa ID klijenta
        console.log("📱 [ADMIN CLIENTS] Kreiranje uređaja za klijenta...");
        const newAppliance = await storage.createAppliance({
          ...applianceData,
          clientId: newClient.id,
        });
        console.log("✅ [ADMIN CLIENTS] Uređaj kreiran sa ID:", newAppliance.id);
        
        res.json({
          ...newClient,
          appliance: newAppliance,
          message: `Klijent ${newClient.fullName} je kreiran sa uređajem ${newAppliance.model}.`
        });
        
      } else {
        console.log("👤 [ADMIN CLIENTS] Kreiranje SAMO klijenta (bez uređaja)");
        
        // Validacija podataka klijenta
        const validationResult = insertClientSchema.safeParse(req.body);
        if (!validationResult.success) {
          return res.status(400).json({ 
            error: "Nevažeći podaci klijenta", 
            details: validationResult.error.format(),
            message: "Svi podaci o klijentu moraju biti pravilno uneti. Proverite podatke i pokušajte ponovo."
          });
        }
        
        const validatedData = validationResult.data;
        
        // Kreiranje klijenta bez uređaja
        const newClient = await storage.createClient(validatedData);
        console.log("🎉 [ADMIN CLIENTS] Novi klijent kreiran uspešno:", newClient);
        
        res.json(newClient);
      }
    } catch (error) {
      console.error("Greška pri kreiranju klijenta:", error);
      res.status(500).json({ 
        error: "Greška pri kreiranju klijenta", 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });


  app.put("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientSchema.parse(req.body);
      const updatedClient = await storage.updateClient(id, validatedData);
      if (!updatedClient) return res.status(404).json({ error: "Klijent nije pronađen" });
      res.json(updatedClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci klijenta", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri ažuriranju klijenta" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Provera da li klijent postoji
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }
      
      // Brisanje klijenta
      await storage.deleteClient(id);
      
      res.json({ 
        success: true, 
        message: "Klijent je uspešno obrisan" 
      });
    } catch (error) {
      console.error("Greška pri brisanju klijenta:", error);
      res.status(500).json({ error: "Greška pri brisanju klijenta", message: error instanceof Error ? error.message : String(error) });
    }
  });

  // Appliance Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllApplianceCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju kategorija" });
    }
  });
  
  // Novi API endpoint za kategorije uređaja - posebno za dijagnostiku
  app.get("/api/appliance-categories", async (req, res) => {
    try {
      const categories = await storage.getAllApplianceCategories();
      res.json(categories || []);
    } catch (error) {
      console.error('Greška pri dobijanju kategorija uređaja:', error);
      res.status(500).json({ error: "Greška pri dobijanju kategorija uređaja", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      // Koristimo safeParse za detaljniju kontrolu validacije
      const validationResult = insertApplianceCategorySchema.safeParse(req.body);
      
      // Ako podaci nisu validni, vrati detaljnu poruku o grešci
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Nevažeći podaci kategorije", 
          details: validationResult.error.format(),
          message: "Svi podaci o kategoriji moraju biti pravilno uneti. Naziv i ikona su obavezni."
        });
      }
      
      const validatedData = validationResult.data;
      
      // Dodatna provera: provera da li već postoji kategorija sa istim imenom
      try {
        // Dohvati sve kategorije
        const categories = await storage.getAllApplianceCategories();
        
        // Proveri da li postoji kategorija sa istim imenom (neosjetljivo na velika/mala slova)
        const existingCategory = categories.find(
          (cat) => cat.name.toLowerCase() === validatedData.name.toLowerCase()
        );
        
        if (existingCategory) {
          return res.status(400).json({
            error: "Kategorija već postoji",
            message: `Kategorija sa nazivom '${validatedData.name}' već postoji u bazi podataka.`
          });
        }
      } catch (categoryCheckError) {
        console.error("Greška pri proveri duplikata kategorije:", categoryCheckError);
        // Ne prekidamo izvršenje u slučaju neuspele provere
      }
      
      // Ako su svi uslovi ispunjeni, kreiramo kategoriju
      const category = await storage.createApplianceCategory(validatedData);
      
      // Vrati uspešan odgovor
      res.status(201).json({
        success: true,
        message: "Kategorija uređaja je uspešno kreirana",
        data: category
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci kategorije", details: error.format() });
      }
      console.error("Greška pri kreiranju kategorije:", error);
      res.status(500).json({ error: "Greška pri kreiranju kategorije", message: error instanceof Error ? error.message : String(error) });
    }
  });

  // Manufacturers routes
  app.get("/api/manufacturers", async (req, res) => {
    try {
      const manufacturers = await storage.getAllManufacturers();
      res.json(manufacturers);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju proizvođača" });
    }
  });

  app.post("/api/manufacturers", async (req, res) => {
    try {
      // Koristimo safeParse za detaljniju kontrolu validacije
      const validationResult = insertManufacturerSchema.safeParse(req.body);
      
      // Ako podaci nisu validni, vrati detaljnu poruku o grešci
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Nevažeći podaci proizvođača", 
          details: validationResult.error.format(),
          message: "Naziv proizvođača mora biti pravilno unet i imati između 2 i 100 karaktera."
        });
      }
      
      const validatedData = validationResult.data;
      
      // Dodatna provera: provera da li već postoji proizvođač sa istim imenom
      try {
        // Dohvati sve proizvođače
        const manufacturers = await storage.getAllManufacturers();
        
        // Proveri da li postoji proizvođač sa istim imenom (neosjetljivo na velika/mala slova)
        const existingManufacturer = manufacturers.find(
          (m) => m.name.toLowerCase() === validatedData.name.toLowerCase()
        );
        
        if (existingManufacturer) {
          return res.status(400).json({
            error: "Proizvođač već postoji",
            message: `Proizvođač sa nazivom '${validatedData.name}' već postoji u bazi podataka.`
          });
        }
      } catch (manufacturerCheckError) {
        console.error("Greška pri proveri duplikata proizvođača:", manufacturerCheckError);
        // Ne prekidamo izvršenje u slučaju neuspele provere
      }
      
      // Ako su svi uslovi ispunjeni, kreiramo proizvođača
      const manufacturer = await storage.createManufacturer(validatedData);
      
      // Vrati uspešan odgovor
      res.status(201).json({
        success: true,
        message: "Proizvođač je uspešno kreiran",
        data: manufacturer
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci proizvođača", details: error.format() });
      }
      console.error("Greška pri kreiranju proizvođača:", error);
      res.status(500).json({ error: "Greška pri kreiranju proizvođača", message: error instanceof Error ? error.message : String(error) });
    }
  });

  // Appliances routes
  app.get("/api/appliances", async (req, res) => {
    try {
      const appliances = await storage.getAllAppliances();
      res.json(appliances);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju uređaja" });
    }
  });

  app.get("/api/appliances/:id", async (req, res) => {
    try {
      const appliance = await storage.getAppliance(parseInt(req.params.id));
      if (!appliance) return res.status(404).json({ error: "Uređaj nije pronađen" });
      res.json(appliance);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju uređaja" });
    }
  });

  app.get("/api/clients/:clientId/appliances", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      
      // Directly query database with JOIN to get category and manufacturer data
      const appliances = await db.select({
        id: schema.appliances.id,
        clientId: schema.appliances.clientId,
        model: schema.appliances.model,
        serialNumber: schema.appliances.serialNumber,
        purchaseDate: schema.appliances.purchaseDate,
        notes: schema.appliances.notes,
        category: {
          id: schema.applianceCategories.id,
          name: schema.applianceCategories.name,
          icon: schema.applianceCategories.icon,
        },
        manufacturer: {
          id: schema.manufacturers.id,
          name: schema.manufacturers.name,
        },
      })
      .from(schema.appliances)
      .leftJoin(schema.applianceCategories, eq(schema.appliances.categoryId, schema.applianceCategories.id))
      .leftJoin(schema.manufacturers, eq(schema.appliances.manufacturerId, schema.manufacturers.id))
      .where(eq(schema.appliances.clientId, clientId));
      
      res.json(appliances);
    } catch (error) {
      console.error("Error fetching client appliances:", error);
      res.status(500).json({ error: "Greška pri dobijanju uređaja klijenta" });
    }
  });

  app.post("/api/appliances", async (req, res) => {
    try {
      // Koristimo safeParse umesto parse za detaljniju kontrolu grešaka
      const validationResult = insertApplianceSchema.safeParse(req.body);
      
      // Ako podaci nisu validni, vrati detaljnu poruku o grešci
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Nevažeći podaci uređaja", 
          details: validationResult.error.format(),
          message: "Svi obavezni podaci o uređaju moraju biti pravilno uneti."
        });
      }
      
      const validatedData = validationResult.data;
      
      // Dodatna provera validnosti klijenta
      try {
        const client = await storage.getClient(validatedData.clientId);
        if (!client) {
          return res.status(400).json({
            error: "Klijent ne postoji",
            message: "Izabrani klijent nije pronađen u bazi podataka."
          });
        }
      } catch (clientError) {
        return res.status(400).json({
          error: "Greška pri proveri klijenta",
          message: "Nije moguće proveriti postojanje klijenta."
        });
      }
      
      // Dodatna provera validnosti kategorije
      try {
        const category = await storage.getApplianceCategory(validatedData.categoryId);
        if (!category) {
          return res.status(400).json({
            error: "Kategorija ne postoji",
            message: "Izabrana kategorija uređaja nije pronađena u bazi podataka."
          });
        }
      } catch (categoryError) {
        return res.status(400).json({
          error: "Greška pri proveri kategorije",
          message: "Nije moguće proveriti postojanje kategorije uređaja."
        });
      }
      
      // Dodatna provera validnosti proizvođača
      try {
        const manufacturer = await storage.getManufacturer(validatedData.manufacturerId);
        if (!manufacturer) {
          return res.status(400).json({
            error: "Proizvođač ne postoji",
            message: "Izabrani proizvođač nije pronađen u bazi podataka."
          });
        }
      } catch (manufacturerError) {
        return res.status(400).json({
          error: "Greška pri proveri proizvođača",
          message: "Nije moguće proveriti postojanje proizvođača."
        });
      }
      
      // Ako je serijski broj unet, proveri da li već postoji uređaj sa istim serijskim brojem
      if (validatedData.serialNumber) {
        try {
          const existingAppliance = await storage.getApplianceBySerialNumber(validatedData.serialNumber);
          if (existingAppliance) {
            return res.status(400).json({
              error: "Serijski broj već postoji",
              message: "Uređaj sa ovim serijskim brojem već postoji u bazi podataka."
            });
          }
        } catch (serialCheckError) {
          // Samo logujemo ali ne prekidamo izvršenje
          console.warn("Nije moguće proveriti postojanje serijskog broja:", serialCheckError);
        }
      }
      
      // Ako su svi uslovi ispunjeni, kreiramo uređaj
      const appliance = await storage.createAppliance(validatedData);
      
      // Vrati uspešan odgovor
      res.status(201).json({
        success: true,
        message: "Uređaj je uspešno kreiran",
        data: appliance
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci uređaja", details: error.format() });
      }
      console.error("Greška pri kreiranju uređaja:", error);
      res.status(500).json({ error: "Greška pri kreiranju uređaja", message: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put("/api/appliances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Proverimo prvo da li uređaj postoji
      const existingAppliance = await storage.getAppliance(id);
      if (!existingAppliance) {
        return res.status(404).json({ error: "Uređaj nije pronađen", message: "Uređaj sa traženim ID-om ne postoji u bazi podataka." });
      }
      
      // Koristimo safeParse za detaljniju kontrolu validacije
      const validationResult = insertApplianceSchema.safeParse(req.body);
      
      // Ako podaci nisu validni, vrati detaljnu poruku o grešci
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Nevažeći podaci uređaja", 
          details: validationResult.error.format(),
          message: "Svi obavezni podaci o uređaju moraju biti pravilno uneti."
        });
      }
      
      const validatedData = validationResult.data;
      
      // Dodatna provera validnosti klijenta
      try {
        const client = await storage.getClient(validatedData.clientId);
        if (!client) {
          return res.status(400).json({
            error: "Klijent ne postoji",
            message: "Izabrani klijent nije pronađen u bazi podataka."
          });
        }
      } catch (clientError) {
        console.error("Greška pri proveri klijenta:", clientError);
        return res.status(400).json({
          error: "Greška pri proveri klijenta",
          message: "Nije moguće proveriti postojanje klijenta."
        });
      }
      
      // Dodatna provera validnosti kategorije
      try {
        const category = await storage.getApplianceCategory(validatedData.categoryId);
        if (!category) {
          return res.status(400).json({
            error: "Kategorija ne postoji",
            message: "Izabrana kategorija uređaja nije pronađena u bazi podataka."
          });
        }
      } catch (categoryError) {
        console.error("Greška pri proveri kategorije:", categoryError);
        return res.status(400).json({
          error: "Greška pri proveri kategorije",
          message: "Nije moguće proveriti postojanje kategorije uređaja."
        });
      }
      
      // Dodatna provera validnosti proizvođača
      try {
        const manufacturer = await storage.getManufacturer(validatedData.manufacturerId);
        if (!manufacturer) {
          return res.status(400).json({
            error: "Proizvođač ne postoji",
            message: "Izabrani proizvođač nije pronađen u bazi podataka."
          });
        }
      } catch (manufacturerError) {
        console.error("Greška pri proveri proizvođača:", manufacturerError);
        return res.status(400).json({
          error: "Greška pri proveri proizvođača",
          message: "Nije moguće proveriti postojanje proizvođača."
        });
      }
      
      // Ako je serijski broj promenjen, proveri da li već postoji uređaj sa istim serijskim brojem
      if (validatedData.serialNumber && validatedData.serialNumber !== existingAppliance.serialNumber) {
        try {
          const existingApplianceWithSn = await storage.getApplianceBySerialNumber(validatedData.serialNumber);
          if (existingApplianceWithSn && existingApplianceWithSn.id !== id) {
            return res.status(400).json({
              error: "Serijski broj već postoji",
              message: "Uređaj sa ovim serijskim brojem već postoji u bazi podataka."
            });
          }
        } catch (serialCheckError) {
          // Samo logujemo ali ne prekidamo izvršenje
          console.warn("Nije moguće proveriti postojanje serijskog broja:", serialCheckError);
        }
      }
      
      // Ako su svi uslovi ispunjeni, ažuriramo uređaj
      const updatedAppliance = await storage.updateAppliance(id, validatedData);
      
      // Vrati uspešan odgovor
      res.status(200).json({
        success: true,
        message: "Uređaj je uspešno ažuriran",
        data: updatedAppliance
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci uređaja", details: error.format() });
      }
      console.error("Greška pri ažuriranju uređaja:", error);
      res.status(500).json({ error: "Greška pri ažuriranju uređaja", message: error instanceof Error ? error.message : String(error) });
    }
  });

  // Delete appliance endpoint
  app.delete("/api/appliances/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || (req.user?.role !== "admin" && req.user?.role !== "technician")) {
        return res.status(403).json({ error: "Nemate dozvolu za brisanje uređaja" });
      }

      const applianceId = parseInt(req.params.id);
      if (isNaN(applianceId)) {
        return res.status(400).json({ error: "Neispravan ID uređaja" });
      }

      // Check if appliance exists
      const existingAppliance = await storage.getAppliance(applianceId);
      if (!existingAppliance) {
        return res.status(404).json({ error: "Uređaj nije pronađen" });
      }

      // Check if appliance has any services
      const services = await storage.getServicesByAppliance(applianceId);
      if (services.length > 0) {
        return res.status(400).json({ 
          error: "Uređaj ima aktivne servise", 
          message: "Prvo obriši sve servise povezane sa ovim uređajem" 
        });
      }

      // Delete appliance
      await storage.deleteAppliance(applianceId);

      res.json({ 
        success: true, 
        message: "Uređaj je uspešno obrisan"
      });
    } catch (error) {
      console.error("Greška pri brisanju uređaja:", error);
      res.status(500).json({ error: "Greška pri brisanju uređaja" });
    }
  });

  // Services routes - optimizovana verzija
  app.get("/api/services", async (req, res) => {
    try {
      // Startamo mjerenje vremena
      const startTime = Date.now();
      const { status, technicianId, limit } = req.query;
      
      // Postavimo limit za broj servisa ako je potrebno
      let limitNumber = undefined;
      if (limit && typeof limit === 'string') {
        try {
          limitNumber = parseInt(limit);
        } catch {
          // Ignorišemo nevažeći limit
        }
      }
      
      let services;
      
      // Optimizovan pristup koji odmah dohvata filtrirane rezultate direktno iz baze
      // umjesto da prvo dohvatamo sve pa onda filtriramo u memoriji
      if (technicianId && typeof technicianId === 'string') {
        try {
          const techId = parseInt(technicianId);
          
          if (status && typeof status === 'string' && status !== 'all') {
            try {
              const validStatus = serviceStatusEnum.parse(status);
              // Direktno dohvatamo servise za tehničara i status
              services = await storage.getServicesByTechnicianAndStatus(techId, validStatus, limitNumber);
            } catch {
              return res.status(400).json({ error: "Nevažeći status servisa" });
            }
          } else {
            // Samo po tehničaru
            services = await storage.getServicesByTechnician(techId, limitNumber);
          }
        } catch (err) {
          return res.status(400).json({ error: "Nevažeći ID servisera" });
        }
      }
      else if (status && typeof status === 'string' && status !== 'all') {
        try {
          const validStatus = serviceStatusEnum.parse(status);
          services = await storage.getServicesByStatus(validStatus, limitNumber);
        } catch {
          return res.status(400).json({ error: "Nevažeći status servisa" });
        }
      } else {
        // Dohvatamo sve servise, ali možemo ograničiti broj
        services = await storage.getAllServices(limitNumber);
      }
      
      // Optimizacija: mapiranje se vrši samo za specifične slučajeve
      // gde su polja u snake_case, umjesto za svaki objekat
      let formattedServices = services;
      
      // Samo prvi servis provjeravamo za potrebe formatiranja
      if (services.length > 0 && !services[0].createdAt && (services[0] as any).created_at) {
        console.log("Potrebno mapiranje iz snake_case u camelCase");
        formattedServices = services.map(service => {
          if (!service.createdAt && (service as any).created_at) {
            return {
              ...service,
              createdAt: (service as any).created_at
            };
          }
          return service;
        });
      }
      
      // Mjerimo ukupno vrijeme izvršenja
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Logovanje samo za dijagnostičke svrhe
      if (executionTime > 200) {
        console.log(`API vraća ${formattedServices.length} servisa - SPORO (${executionTime}ms)`);
      } else {
        console.log(`API vraća ${formattedServices.length} servisa (${executionTime}ms)`);
      }
      
      if (formattedServices.length > 0) {
        console.log("Ključevi prvog servisa:", Object.keys(formattedServices[0]));
      }
      
      // Dodajemo zaglavlje za vrijeme izvršenja - samo za dijagnostičke svrhe
      res.setHeader('X-Execution-Time', executionTime.toString());
      res.json(formattedServices);
    } catch (error) {
      console.error("Greška pri dobijanju servisa:", error);
      res.status(500).json({ error: "Greška pri dobijanju servisa" });
    }
  });
  
  // Business Partner API Endpoints - Enhanced with detailed service information
  app.get("/api/business/services", jwtAuth, async (req, res) => {
    try {
      // Koristi user ID iz JWT tokena umesto query parametra
      if (!req.user || req.user.role !== 'business_partner') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovim podacima" });
      }
      
      console.log(`Dohvatanje detaljnih servisa za poslovnog partnera sa ID: ${(req as any).user.id}`);
      
      // Dohvati servise povezane sa poslovnim partnerom
      const reqUser = (req as any).user;
      const services = await storage.getServicesByPartner(reqUser.id);
      
      // Dodajemo detaljan rad info za svaki servis
      const enhancedServices = await Promise.all(services.map(async (service) => {
        // Dohvati rezervne delove za servis
        const spareParts = await storage.getSparePartsByService(service.id);
        
        // Dohvati uklonjene delove sa uređaja
        const removedParts = await storage.getRemovedPartsByService(service.id);
        
        // Dohvati technicianove napomene i rad
        const technician = service.technicianId ? await storage.getTechnician(Number(service.technicianId)) : null;
        const techUser = technician ? await storage.getUserByTechnicianId(Number(service.technicianId)) : null;
        
        // Kreiraj summariju rada
        const workSummary = {
          ...service,
          technician: technician ? {
            fullName: technician.fullName,
            phone: techUser?.phone,
            email: techUser?.email,
            specialization: technician.specialization
          } : null,
          spareParts: spareParts.map(part => ({
            partName: part.partName,
            quantity: part.quantity,
            productCode: (part as any).productCode || 'N/A',
            urgency: part.urgency,
            warrantyStatus: part.warrantyStatus,
            status: part.status,
            orderDate: part.createdAt,
            estimatedDeliveryDate: (part as any).estimatedDeliveryDate || null,
            actualDeliveryDate: (part as any).actualDeliveryDate || null
          })),
          removedParts: removedParts.map(part => ({
            partName: part.partName,
            removalReason: part.removalReason,
            currentLocation: part.currentLocation,
            removalDate: part.removalDate,
            returnDate: (part as any).returnDate || null,
            status: (part as any).status || 'unknown',
            repairCost: part.repairCost
          })),
          workTimeline: [
            { date: service.createdAt, event: 'Servis kreiran', status: 'pending' },
            (service as any).assignedAt ? { date: (service as any).assignedAt, event: `Dodeljen serviseru ${technician?.fullName}`, status: 'assigned' } : null,
            service.scheduledDate ? { date: service.scheduledDate, event: 'Zakazan termin', status: 'scheduled' } : null,
            (service as any).startedAt ? { date: (service as any).startedAt, event: 'Servis započet', status: 'in_progress' } : null,
            service.completedAt ? { date: service.completedAt, event: 'Servis završen', status: 'completed' } : null
          ].filter(Boolean),
          isCompleted: service.status === 'completed',
          totalCost: service.cost || 0,
          partsCount: spareParts.length,
          removedPartsCount: removedParts.length
        };
        
        return workSummary;
      }));
      
      res.json(enhancedServices);
    } catch (error) {
      console.error("Greška pri dobijanju detaljnih servisa za poslovnog partnera:", error);
      res.status(500).json({ error: "Greška pri dobijanju servisa" });
    }
  });
  
  // API za detalje servisa za poslovnog partnera sa istorijom statusa
  app.get("/api/business/services/:id", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      
      // Samo business partneri mogu pristupiti ovim podacima
      if (!req.user || req.user.role !== 'business_partner') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovim podacima" });
      }
      
      // Prvo proveri da li je servis povezan sa ovim poslovnim partnerom
      const service = await storage.getService(serviceId);
      
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Provera da li servis pripada poslovnom partneru
      if (!req.user || service.businessPartnerId !== req.user.id) {
        return res.status(403).json({ error: "Nemate pristup ovom servisu" });
      }
      
      // Koristimo istu logiku kao u /api/business/services endpoint za detaljne podatke
      console.log(`Dohvatanje proširenih detalja servisa ${serviceId} za poslovnog partnera ${(req as any).user.id}`);
      
      // Dohvati rezervne delove za servis
      const spareParts = await storage.getSparePartsByService(serviceId);
      
      // Dohvati uklonjene delove sa uređaja
      const removedParts = await storage.getRemovedPartsByService(serviceId);
      
      // Dohvati osnovne podatke sa detaljima
      const serviceDetails = await storage.getServiceWithDetails(serviceId);
      
      // Dohvati tehniciara sa kontakt podacima
      const technician = service.technicianId ? await storage.getTechnician(Number(service.technicianId)) : null;
      const techUser = technician ? await storage.getUserByTechnicianId(Number(service.technicianId)) : null;
      
      // Dohvati istoriju statusa za servis
      const statusHistory = await storage.getServiceStatusHistory(serviceId);
      
      // Kreiraj proširenu verziju sa svim detaljima
      const response = {
        ...serviceDetails,
        technician: technician ? {
          fullName: technician.fullName,
          phone: techUser?.phone,
          email: techUser?.email,
          specialization: technician.specialization
        } : serviceDetails.technician,
        spareParts: spareParts.map(part => ({
          partName: part.partName,
          quantity: part.quantity,
          productCode: (part as any).productCode || 'N/A',
          urgency: part.urgency,
          warrantyStatus: part.warrantyStatus,
          status: part.status,
          orderDate: part.createdAt,
          estimatedDeliveryDate: (part as any).estimatedDeliveryDate || null,
          actualDeliveryDate: (part as any).actualDeliveryDate || null
        })),
        removedParts: removedParts.map(part => ({
          partName: part.partName,
          removalReason: part.removalReason,
          currentLocation: part.currentLocation,
          removalDate: part.removalDate,
          returnDate: (part as any).returnDate || null,
          status: (part as any).status || 'unknown',
          repairCost: part.repairCost
        })),
        workTimeline: [
          { date: service.createdAt, event: 'Servis kreiran', status: 'pending' },
          (service as any).assignedAt ? { date: (service as any).assignedAt, event: `Dodeljen serviseru ${technician?.fullName}`, status: 'assigned' } : null,
          service.scheduledDate ? { date: service.scheduledDate, event: 'Zakazan termin', status: 'scheduled' } : null,
          (service as any).startedAt ? { date: (service as any).startedAt, event: 'Servis započet', status: 'in_progress' } : null,
          (service as any).completedDate ? { date: (service as any).completedDate, event: 'Servis završen', status: 'completed' } : null
        ].filter(Boolean),
        statusHistory
      };
      
      console.log(`Prošireni detalji servisa ${serviceId}:`, {
        spareParts: spareParts.length,
        removedParts: removedParts.length,
        statusHistory: statusHistory.length,
        hasUsedParts: !!service.usedParts,
        hasMachineNotes: !!service.machineNotes
      });
      
      res.json(response);
    } catch (error) {
      console.error("Greška pri dobijanju detalja servisa:", error);
      res.status(500).json({ error: "Greška pri dobijanju detalja servisa" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.getService(parseInt(req.params.id));
      if (!service) return res.status(404).json({ error: "Servis nije pronađen" });
      res.json(service);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju servisa" });
    }
  });

  app.get("/api/clients/:clientId/services", async (req, res) => {
    try {
      const services = await storage.getServicesByClient(parseInt(req.params.clientId));
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju servisa klijenta" });
    }
  });

  app.post("/api/services", jwtAuth, async (req, res) => {
    try {
      console.log("=== KREIRANJE NOVOG SERVISA ===");
      console.log("Podaci iz frontend forme:", req.body);
      
      // Provera dozvola (samo admin ili technician mogu kreirati servise)
      if (!["admin", "technician"].includes(req.user?.role || "")) {
        return res.status(403).json({ 
          error: "Nemate dozvolu", 
          message: "Samo administratori i serviseri mogu kreirati servise."
        });
      }
      
      console.log("Korisnik kreira servis:", req.user?.username, "uloga:", req.user?.role);
      
      // Manuelna validacija osnovnih podataka umesto schema
      const { clientId, applianceId, description } = req.body;
      
      // Proveravamo samo obavezna polja
      if (!clientId || clientId <= 0) {
        return res.status(400).json({ 
          error: "Nevažeći ID klijenta", 
          message: "Molimo izaberite validnog klijenta."
        });
      }
      
      if (!applianceId || applianceId <= 0) {
        return res.status(400).json({ 
          error: "Nevažeći ID uređaja", 
          message: "Molimo izaberite validan uređaj."
        });
      }
      
      if (!description || description.trim().length < 5) {
        return res.status(400).json({ 
          error: "Nevažeći opis problema", 
          message: "Opis problema mora biti detaljniji (minimum 5 karaktera)."
        });
      }
      
      // Kreiraj objekat sa default vrednostima
      const validatedData = {
        clientId: parseInt(clientId),
        applianceId: parseInt(applianceId),
        description: description.trim(),
        status: req.body.status || "pending",
        warrantyStatus: req.body.warrantyStatus || "out_of_warranty",
        createdAt: req.body.createdAt || new Date().toISOString().split('T')[0],
        technicianId: req.body.technicianId && req.body.technicianId > 0 ? parseInt(req.body.technicianId) : null,
        scheduledDate: req.body.scheduledDate || null,
        completedDate: req.body.completedDate || null,
        technicianNotes: req.body.technicianNotes || null,
        cost: req.body.cost || null,
        usedParts: req.body.usedParts || "[]",
        machineNotes: req.body.machineNotes || null,
        isCompletelyFixed: req.body.isCompletelyFixed || null,
        businessPartnerId: req.body.businessPartnerId || null,
        partnerCompanyName: req.body.partnerCompanyName || null
      };
      
      // Dodatna validacija: provera da li klijent postoji
      try {
        const client = await storage.getClient(validatedData.clientId);
        if (!client) {
          return res.status(400).json({
            error: "Klijent ne postoji",
            message: "Izabrani klijent nije pronađen u bazi podataka."
          });
        }
      } catch (clientError) {
        console.error("Greška pri proveri klijenta:", clientError);
        return res.status(400).json({
          error: "Greška pri proveri klijenta",
          message: "Nije moguće proveriti postojanje klijenta."
        });
      }
      
      // Dodatna validacija: provera da li uređaj postoji
      try {
        const appliance = await storage.getAppliance(validatedData.applianceId);
        if (!appliance) {
          return res.status(400).json({
            error: "Uređaj ne postoji",
            message: "Izabrani uređaj nije pronađen u bazi podataka."
          });
        }
        
        // Dodatno proveravamo da li uređaj pripada odabranom klijentu
        if (appliance.clientId !== validatedData.clientId) {
          return res.status(400).json({
            error: "Uređaj ne pripada klijentu",
            message: "Izabrani uređaj ne pripada odabranom klijentu. Molimo proverite podatke."
          });
        }
      } catch (applianceError) {
        console.error("Greška pri proveri uređaja:", applianceError);
        return res.status(400).json({
          error: "Greška pri proveri uređaja",
          message: "Nije moguće proveriti postojanje uređaja."
        });
      }
      
      // Ako je dodeljen serviser, proverimo da li postoji
      if (validatedData.technicianId) {
        try {
          const technician = await storage.getTechnician(validatedData.technicianId);
          if (!technician) {
            return res.status(400).json({
              error: "Serviser ne postoji",
              message: "Izabrani serviser nije pronađen u bazi podataka."
            });
          }
          
          // Dodatna provera: da li je serviser aktivan
          if (technician.active === false) {
            return res.status(400).json({
              error: "Serviser nije aktivan",
              message: "Izabrani serviser trenutno nije aktivan i ne može biti dodeljen servisima."
            });
          }
        } catch (technicianError) {
          console.error("Greška pri proveri servisera:", technicianError);
          return res.status(400).json({
            error: "Greška pri proveri servisera",
            message: "Nije moguće proveriti postojanje servisera."
          });
        }
      }
      
      // Ako je naveden poslovni partner, proverimo da li postoji
      if (validatedData.businessPartnerId) {
        try {
          console.log(`Pokušaj validacije poslovnog partnera sa ID: ${validatedData.businessPartnerId}`);
          
          // Tražimo partnera prvo po ID-u
          const partner = await storage.getUser(validatedData.businessPartnerId);
          console.log(`Rezultat pretrage korisnika sa ID=${validatedData.businessPartnerId}:`, partner ? `Pronađen korisnik ${partner.username} (uloga: ${partner.role})` : "Nije pronađen");
          
          // Ako nismo našli partnera po ID-u, pokušajmo preko korisničkog imena (stari format)
          if (!partner) {
            const usernameFormat = `partner_${validatedData.businessPartnerId}`;
            console.log(`Pokušaj pretrage po starom formatu korisničkog imena: ${usernameFormat}`);
            
            const partnerByUsername = await storage.getUserByUsername(usernameFormat);
            console.log(`Rezultat pretrage po korisničkom imenu ${usernameFormat}:`, partnerByUsername ? `Pronađen korisnik (uloga: ${partnerByUsername.role})` : "Nije pronađen");
            
            if (!partnerByUsername || partnerByUsername.role !== 'business_partner') {
              return res.status(400).json({
                error: "Poslovni partner ne postoji",
                message: "Izabrani poslovni partner nije pronađen u bazi podataka ili nema odgovarajuća prava."
              });
            }
          } else if (partner.role !== 'business_partner') {
            console.log(`Korisnik sa ID=${validatedData.businessPartnerId} ima ulogu ${partner.role}, ali je potrebna uloga 'business_partner'`);
            
            return res.status(400).json({
              error: "Korisniku nedostaju prava",
              message: "Izabrani korisnik nema ulogu poslovnog partnera."
            });
          }
          
          // Ako smo došli do ovde, partner je validan
          console.log(`Poslovni partner potvrđen za zahtev. ID: ${validatedData.businessPartnerId}`);
        } catch (partnerError) {
          console.error("Greška pri proveri poslovnog partnera:", partnerError);
          // Ovde samo logujemo grešku ali nastavljamo, jer može biti sistemska greška
        }
      }
      
      // Format JSON-a za korišćene delove
      if (validatedData.usedParts) {
        try {
          // Proverava da li je usedParts validan JSON
          JSON.parse(validatedData.usedParts);
        } catch (jsonError) {
          return res.status(400).json({
            error: "Nevažeći format korišćenih delova",
            message: "Lista korišćenih delova mora biti u validnom JSON formatu."
          });
        }
      }
      
      // Ako je definisano polje isCompletelyFixed, proverimo da li ima smisla
      if (validatedData.isCompletelyFixed !== undefined && validatedData.isCompletelyFixed !== null) {
        if (validatedData.status !== 'completed') {
          return res.status(400).json({
            error: "Nedosledan status servisa",
            message: "Polje 'Da li je potpuno popravljeno' može biti postavljeno samo za završene servise."
          });
        }
      }
      
      // Ako su svi uslovi zadovoljeni, kreiramo servis
      console.log("==== DEBUG INFO ZA SERVIS ====");
      console.log("Podaci o partneru - ID:", validatedData.businessPartnerId, "tip:", typeof validatedData.businessPartnerId);
      console.log("Partner kompanija:", validatedData.partnerCompanyName);
      
      // Dodajna provera i konverzija businessPartnerId
      if (validatedData.businessPartnerId !== null && validatedData.businessPartnerId !== undefined) {
        try {
          // Proverimo da li je već broj
          if (typeof validatedData.businessPartnerId !== 'number') {
            validatedData.businessPartnerId = Number(validatedData.businessPartnerId);
            // Dodatna provera da li je konverzija uspešna
            if (isNaN(validatedData.businessPartnerId)) {
              console.error("Neuspešna konverzija businessPartnerId u broj");
              validatedData.businessPartnerId = null;
            }
          }
        } catch (error) {
          console.error("Greška pri konverziji businessPartnerId:", error);
          validatedData.businessPartnerId = null;
        }
      }
      
      // Provera debug info-a - moramo koristiti any tip jer ovo nije deo formalne šeme
      const anyData = validatedData as any;
      if (anyData._debug_info) {
        console.log("Debug info iz klijenta (raw) - tip:", typeof anyData._debug_info);
        try {
          let debugData;
          // Pokušaj parsiranja samo ako je string, inače koristi direktno vrednost
          if (typeof anyData._debug_info === 'string') {
            debugData = JSON.parse(anyData._debug_info);
            console.log("Parsirana debug info:", debugData);
          } else {
            console.log("Debug info nije string, već:", anyData._debug_info);
            debugData = anyData._debug_info;
          }
        } catch (e) {
          console.error("Nije moguće parsirati debug info:", e);
          console.error("Problematična vrednost:", anyData._debug_info);
        }
      }
      
      // Kreirajmo objekat sa samo potrebnim poljima za bazu podataka
      const serviceToCreate = {
        clientId: validatedData.clientId,
        applianceId: validatedData.applianceId,
        technicianId: validatedData.technicianId || null,
        description: validatedData.description,
        status: validatedData.status || "pending",
        warrantyStatus: validatedData.warrantyStatus || "out_of_warranty",
        createdAt: validatedData.createdAt || new Date().toISOString().split('T')[0],
        scheduledDate: validatedData.scheduledDate || null,
        completedDate: validatedData.completedDate || null,
        technicianNotes: validatedData.technicianNotes || null,
        cost: validatedData.cost || null,
        usedParts: validatedData.usedParts || "[]",
        machineNotes: validatedData.machineNotes || null,
        isCompletelyFixed: validatedData.isCompletelyFixed || null,
        businessPartnerId: validatedData.businessPartnerId || null,
        partnerCompanyName: validatedData.partnerCompanyName || null
      };
      
      console.log("Kreiram servis sa sledećim podacima:", {
        clientId: serviceToCreate.clientId,
        applianceId: serviceToCreate.applianceId,
        technicianId: serviceToCreate.technicianId,
        description: serviceToCreate.description,
        status: serviceToCreate.status,
        businessPartnerId: serviceToCreate.businessPartnerId,
        partnerCompanyName: serviceToCreate.partnerCompanyName
      });
      
      const service = await storage.createService(serviceToCreate);
      
      // Pošalji email obaveštenje klijentu o novom servisu
      try {
        if (service.clientId) {
          const client = await storage.getClient(service.clientId);
          if (client && client.email) {
            const technician = service.technicianId ? 
              await storage.getTechnician(service.technicianId) : null;
            const technicianName = technician ? technician.fullName : "Nepoznat serviser";
            
            // Šaljemo obaveštenje klijentu
            const statusText = STATUS_DESCRIPTIONS[service.status] || service.status;
            const clientEmailSent = await emailService.sendServiceStatusUpdate(
              client,
              service.id,
              statusText,
              service.description || "",
              technicianName
            );
            
            if (clientEmailSent) {
              console.log(`Email obaveštenje poslato klijentu ${client.fullName} za novi servis #${service.id}`);
              
              // Obavesti administratore o poslatom mail-u klijentu
              await emailService.notifyAdminAboutEmail(
                "Novi servis",
                client.email,
                service.id,
                `Poslato obaveštenje klijentu ${client.fullName} o novom servisu #${service.id} sa statusom ${service.status}`
              );
            }
            
            // Ako je dodeljen serviser, obavesti i njega
            if (technician && service.technicianId) {
              // Dobavljamo korisnika iz baze koji je vezan za tehničara
              const techUser = await storage.getUserByTechnicianId(service.technicianId);
              const techEmail = techUser?.email || technician.email;
              
              if (techEmail) {
                const techEmailSent = await emailService.sendNewServiceAssignment(
                  techEmail,
                  technician.fullName,
                  service.id,
                  client.fullName,
                  service.scheduledDate || service.createdAt,
                  `${client.address}, ${client.city}`,
                  service.description || ""
                );
                
                if (techEmailSent) {
                  console.log(`Email obaveštenje poslato serviseru ${technician.fullName} na adresu ${techEmail} za novi servis #${service.id}`);
                  
                  // Obavesti administratore o poslatom mail-u serviseru
                  await emailService.notifyAdminAboutEmail(
                    "Dodela servisa serviseru",
                    techEmail || technician.email || "",
                    service.id,
                    `Poslato obaveštenje serviseru ${technician.fullName} o dodeli novog servisa #${service.id}`
                  );
                }
              } else {
                console.log(`[EMAIL SISTEM] ℹ️ Serviser ${technician.fullName} nema email adresu u sistemu, preskačem slanje`);
              }
            }
          } else {
            console.warn(`Klijent ${client?.fullName || service.clientId} nema email adresu, obaveštenje nije poslato`);
          }
        }
      } catch (emailError) {
        console.error("Greška pri slanju email obaveštenja:", emailError);
        // Ne vraćamo grešku korisniku jer servis je uspešno kreiran
      }

      // ===== ADMIN SMS OBAVEŠTENJA O NOVOM SERVISU =====
      if (smsService && smsService.isConfigured()) {
        try {
          console.log(`[SMS ADMIN] Šalje obaveštenje administratorima o novom servisu #${service.id}`);
          
          const admins = await getAdminsWithPhones();
          const client = await storage.getClient(service.clientId);
          const appliance = await storage.getAppliance(service.applianceId);
          const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
          
          const deviceType = category ? category.name : 'Nepoznat uređaj';
          const createdBy = req.user?.fullName || req.user?.username || 'Nepoznat korisnik';

          for (const admin of admins) {
            try {
              await smsService.notifyAdminNewService({
                adminPhone: admin.phone,
                adminName: admin.fullName,
                serviceId: service.id.toString(),
                clientName: client?.fullName || 'Nepoznat klijent',
                deviceType: deviceType,
                createdBy: createdBy,
                problemDescription: service.description
              });
              console.log(`[SMS ADMIN] ✅ SMS o novom servisu poslat administratoru ${admin.fullName} (${admin.phone})`);
            } catch (adminSmsError) {
              console.error(`[SMS ADMIN] ❌ Greška pri slanju SMS-a administratoru ${admin.fullName}:`, adminSmsError);
            }
          }
        } catch (adminSmsError) {
          console.error('[SMS ADMIN] Globalna greška pri slanju admin SMS obaveštenja o novom servisu:', adminSmsError);
        }
      }
      
      // Vraćamo uspešan odgovor sa kreiranim servisom
      res.status(201).json({
        success: true,
        message: "Servis je uspešno kreiran",
        data: service
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci servisa", details: error.format() });
      }
      console.error("Greška pri kreiranju servisa:", error);
      res.status(500).json({ error: "Greška pri kreiranju servisa", message: error instanceof Error ? error.message : "Nepoznata greška" });
    }
  });

  app.put("/api/services/:id", jwtAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      console.log("=== AŽURIRANJE SERVISA ===");
      console.log("ID servisa:", id);
      console.log("Podaci iz frontend forme:", req.body);
      
      // Preuzmemo originalni servis pre ažuriranja
      const originalService = await storage.getService(id);
      if (!originalService) return res.status(404).json({ error: "Servis nije pronađen" });
      
      // Manuelna validacija osnovnih podataka
      const { clientId, applianceId, description } = req.body;
      
      // Kreiraj objekat sa ažuriranim vrednostima, zadržavajući postojeće ako nisu poslate
      const validatedData = {
        clientId: clientId ? parseInt(clientId) : originalService.clientId,
        applianceId: applianceId ? parseInt(applianceId) : originalService.applianceId,
        description: description ? description.trim() : originalService.description,
        status: req.body.status || originalService.status,
        warrantyStatus: req.body.warrantyStatus || originalService.warrantyStatus || "out_of_warranty",
        createdAt: req.body.createdAt || originalService.createdAt,
        technicianId: req.body.technicianId !== undefined ? 
          (req.body.technicianId && req.body.technicianId > 0 ? parseInt(req.body.technicianId) : null) : 
          originalService.technicianId,
        scheduledDate: req.body.scheduledDate !== undefined ? req.body.scheduledDate : originalService.scheduledDate,
        completedDate: req.body.completedDate !== undefined ? req.body.completedDate : originalService.completedDate,
        technicianNotes: req.body.technicianNotes !== undefined ? req.body.technicianNotes : originalService.technicianNotes,
        cost: req.body.cost !== undefined ? req.body.cost : originalService.cost,
        usedParts: req.body.usedParts !== undefined ? req.body.usedParts : originalService.usedParts,
        machineNotes: req.body.machineNotes !== undefined ? req.body.machineNotes : originalService.machineNotes,
        isCompletelyFixed: req.body.isCompletelyFixed !== undefined ? req.body.isCompletelyFixed : originalService.isCompletelyFixed,
        businessPartnerId: req.body.businessPartnerId !== undefined ? req.body.businessPartnerId : originalService.businessPartnerId,
        partnerCompanyName: req.body.partnerCompanyName !== undefined ? req.body.partnerCompanyName : originalService.partnerCompanyName
      };
      
      console.log("Validovani podaci za ažuriranje:", validatedData);
      
      const updatedService = await storage.updateService(id, validatedData);
      if (!updatedService) return res.status(404).json({ error: "Greška pri ažuriranju servisa" });
      
      // Informacije o slanju emaila koje će biti vraćene klijentu
      const emailInfo: {
        emailSent: boolean;
        clientName: string | null;
        emailDetails: string | null;
        emailError: string | null;
      } = {
        emailSent: false,
        clientName: null,
        emailDetails: null,
        emailError: null
      };
      
      // Proverimo da li je došlo do promene statusa i pošaljemo email samo u tom slučaju
      if (originalService.status !== updatedService.status) {
        // Pošalji email obaveštenja SVIM povezanim stranama o promeni statusa servisa
        try {
          console.log(`[EMAIL SISTEM] Započinjem slanje obaveštenja o promeni statusa servisa #${id} u "${updatedService.status}"`);
          
          // 1. Prvo dohvati sve neophodne podatke
          if (updatedService.clientId) {
            const client = await storage.getClient(updatedService.clientId);
            const technician = updatedService.technicianId ? await storage.getTechnician(updatedService.technicianId) : null;
            const technicianName = technician ? technician.fullName : "Nepoznat serviser";
            const statusDescription = STATUS_DESCRIPTIONS[updatedService.status] || updatedService.status;
            
            if (client) {
              // Popuni ime klijenta za vraćanje klijentu
              emailInfo.clientName = client.fullName;
              
              console.log(`[EMAIL SISTEM] Pronađen klijent: ${client.fullName}, email: ${client.email || 'nije dostupan'}`);
              
              // 2. Šalje obaveštenje KLIJENTU
              if (client.email) {
                console.log(`[EMAIL SISTEM] Pokušavam slanje emaila klijentu ${client.fullName} (${client.email})`);
                
                // Poboljšan sadržaj emaila koji sadrži više detalja
                const clientEmailContent = updatedService.technicianNotes || updatedService.description || "";
                const clientEmailSent = await emailService.sendServiceStatusUpdate(
                  client, 
                  id,
                  statusDescription,
                  clientEmailContent,
                  technicianName,
                  updatedService.warrantyStatus,
                  updatedService.customerRefusesRepair || undefined,
                  updatedService.customerRefusalReason || undefined
                );
                
                if (clientEmailSent) {
                  console.log(`[EMAIL SISTEM] ✅ Uspešno poslato obaveštenje klijentu ${client.fullName}`);
                  emailInfo.emailSent = true;
                  
                  // BEKO GARANCISKI SERVISI - Dodatno obaveštenje
                  if (updatedService.status === "completed" && 
                      updatedService.warrantyStatus === "in_warranty") {
                    
                    // Proveravamo da li je Beko brend
                    try {
                      const appliance = updatedService.applianceId ? await storage.getAppliance(updatedService.applianceId) : null;
                      if (appliance) {
                        const manufacturer = await storage.getManufacturer(appliance.manufacturerId);
                        
                        if (manufacturer && manufacturer.name.toLowerCase() === 'beko') {
                          console.log(`[BEKO EMAIL] Završen Beko garanciski servis #${id}, šaljem dodatno obaveštenje`);
                          
                          const category = await storage.getApplianceCategory(appliance.categoryId);
                          const applianceName = category ? category.name : 'Nepoznat uređaj';
                          
                          const bekoEmailSent = await emailService.sendBekoWarrantyCompletionNotification(
                            client,
                            id,
                            clientEmailContent,
                            technicianName,
                            manufacturer.name,
                            applianceName
                          );
                          
                          if (bekoEmailSent) {
                            console.log(`[BEKO EMAIL] ✅ Uspešno poslato Beko obaveštenje za servis #${id}`);
                          } else {
                            console.log(`[BEKO EMAIL] ❌ Neuspešno slanje Beko obaveštenja za servis #${id}`);
                          }
                        }
                      }
                    } catch (bekoError) {
                      console.error(`[BEKO EMAIL] Greška pri proveri/slanju Beko obaveštenja:`, bekoError);
                    }
                  }
                  
                  // COMPLUS EMAIL NOTIFIKACIJE - Završetak servisa
                  if (updatedService.status === "completed") {
                    try {
                      const appliance = updatedService.applianceId ? await storage.getAppliance(updatedService.applianceId) : null;
                      if (appliance) {
                        const manufacturer = await storage.getManufacturer(appliance.manufacturerId);
                        
                        // Proveravanje da li je ComPlus brend
                        if (manufacturer && ['COMPLUS', 'COM PLUS', 'COM_PLUS'].includes(manufacturer.name.toUpperCase())) {
                          console.log(`[COMPLUS EMAIL] Završen ComPlus servis #${id}, šaljem obaveštenje na servis@complus.me`);
                          
                          const category = await storage.getApplianceCategory(appliance.categoryId);
                          const deviceType = category ? category.name : 'Nepoznat uređaj';
                          const workPerformed = updatedService.technicianNotes || updatedService.description || 'Nema detaljne napomene o izvršenom radu';
                          
                          const complusEmailSent = await emailService.sendComplusServiceCompletion(
                            id,
                            client.fullName,
                            technicianName,
                            deviceType,
                            workPerformed,
                            manufacturer.name
                          );
                          
                          if (complusEmailSent) {
                            console.log(`[COMPLUS EMAIL] ✅ Uspešno poslato ComPlus obaveštenje za servis #${id}`);
                          } else {
                            console.log(`[COMPLUS EMAIL] ❌ Neuspešno slanje ComPlus obaveštenja za servis #${id}`);
                          }
                        }
                      }
                    } catch (complusError) {
                      console.error(`[COMPLUS EMAIL] Greška pri proveri/slanju ComPlus obaveštenja:`, complusError);
                    }
                  }
                  
                  // EMAIL OBAVEŠTENJA ZA ADMINISTRATORE ONEMOGUĆENA
                  // Korisnik je zatražio da se iskljuće sva email obaveštenja za administratore
                  console.log("[EMAIL] Admin obaveštenja onemogućena po zahtevu korisnika");
                } else {
                  console.error(`[EMAIL SISTEM] ❌ Neuspešno slanje obaveštenja klijentu ${client.fullName}`);
                  emailInfo.emailError = `Nije moguće poslati email klijentu ${client.fullName}. Proverite SMTP konfiguraciju.`;
                }
              } else {
                console.log(`[EMAIL SISTEM] ℹ️ Klijent ${client.fullName} nema email adresu, preskačem slanje`);
                emailInfo.emailError = `Klijent ${client.fullName} nema email adresu.`;
              }
            }
            
            // 3. Šalje obaveštenje SERVISERU
            if (technician && updatedService.technicianId) {
              // Dobavljamo korisnika iz baze koji je vezan za tehničara
              const techUser = await storage.getUserByTechnicianId(updatedService.technicianId);
              const techEmail = techUser?.email || technician.email;
              
              if (techEmail) {
                console.log(`[EMAIL SISTEM] Pokušavam slanje emaila serviseru ${technician.fullName} (${techEmail})`);
                
                // Sadržaj emaila za servisera
                const technicianHTML = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0066cc;">Obaveštenje o promeni statusa servisa</h2>
                    <p>Poštovani/a ${technician.fullName},</p>
                    <p>Status servisa koji vam je dodeljen je promenjen.</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                      <p><strong>Servis ID:</strong> #${id}</p>
                      <p><strong>Klijent:</strong> ${client?.fullName || 'Nepoznato'}</p>
                      <p><strong>Status:</strong> ${statusDescription}</p>
                      <p><strong>Datum i vreme:</strong> ${new Date().toLocaleString('sr-ME')}</p>
                      <p><strong>Napomene:</strong> ${updatedService.technicianNotes || 'Nema dodatnih napomena'}</p>
                    </div>
                    <p>Molimo vas da pregledate detalje u aplikaciji servisa.</p>
                    <p>Srdačan pozdrav,<br>Servis Todosijević</p>
                  </div>
                `;
                
                const techEmailSent = await emailService.sendEmail({
                  to: techEmail,
                  subject: `Obaveštenje: Promena statusa servisa #${id} u ${statusDescription}`,
                  html: technicianHTML,
                });
                
                if (techEmailSent) {
                  console.log(`[EMAIL SISTEM] ✅ Uspešno poslato obaveštenje serviseru ${technician.fullName}`);
                  
                  // Ako nije poslat email klijentu, ali je serviseru, označimo da je slanje uspešno
                  if (!emailInfo.emailSent) {
                    emailInfo.emailSent = true;
                    emailInfo.clientName = `${technician.fullName} (serviser)`;
                  } else {
                    // Ako je email poslat i klijentu i serviseru, ažurirajmo detalje
                    emailInfo.emailDetails = `Obavešteni: klijent i serviser ${technician.fullName}`;
                  }
                  
                  // EMAIL OBAVEŠTENJA ZA ADMINISTRATORE ONEMOGUĆENA
                  // Korisnik je zatražio da se iskljuće sva email obaveštenja za administratore
                  console.log("[EMAIL] Admin obaveštenja onemogućena po zahtevu korisnika");
                } else {
                  console.error(`[EMAIL SISTEM] ❌ Neuspešno slanje obaveštenja serviseru ${technician.fullName}`);
                  
                  // Ako je već postavljeno da slanje klijentu nije uspelo, dodajmo info o serviseru
                  if (emailInfo.emailError) {
                    emailInfo.emailError += ` Takođe, nije uspelo ni slanje serviseru ${technician.fullName}.`;
                  } else {
                    emailInfo.emailError = `Nije moguće poslati email serviseru ${technician.fullName}. Proverite SMTP konfiguraciju.`;
                  }
                }
              } else {
                console.log(`[EMAIL SISTEM] ℹ️ Serviser ${technician.fullName} nema email adresu u sistemu, preskačem slanje`);
              }
            } else if (technician) {
              console.log(`[EMAIL SISTEM] ℹ️ Serviser ${technician.fullName} nema dovolјno informacija za slanje, preskačem slanje`);
            }
          }
        } catch (emailError: any) {
          console.error("Error sending email notifications:", emailError);
          emailInfo.emailError = emailError.message || "Nepoznata greška pri slanju emaila";
        }

        // ===== AUTOMATSKI SMS TRIGGERI =====
        // Šaljemo SMS obaveštenja samo ako je SMS servis konfigurisan
        if (smsService && smsService.isConfigured()) {
          try {
            console.log(`[SMS SISTEM] Početak automatskih SMS triggera za servis #${id}`);
            
            // 1. SMS KORISNIKU
            if (updatedService.clientId) {
              const client = await storage.getClient(updatedService.clientId);
              if (client && client.phone) {
                try {
                  const statusDescription = STATUS_DESCRIPTIONS[updatedService.status] || updatedService.status;
                  await smsService.notifyClientStatusUpdate({
                    clientPhone: client.phone,
                    clientName: client.fullName,
                    serviceId: id.toString(),
                    deviceType: 'uređaj', // TODO: Dodati pravi tip uređaja iz appliance tabele
                    statusDescription: statusDescription,
                    technicianNotes: updatedService.technicianNotes || undefined
                  });
                  console.log(`[SMS SISTEM] ✅ SMS poslat korisniku ${client.fullName} (${client.phone})`);
                } catch (smsError) {
                  console.error(`[SMS SISTEM] ❌ Greška pri slanju SMS-a korisniku:`, smsError);
                }
              }
            }

            // 2. SMS POSLOVNOM PARTNERU (ako servis dolazi od poslovnog partnera)
            if (updatedService.businessPartnerId) {
              try {
                const businessPartner = await storage.getUser(updatedService.businessPartnerId);
                if (businessPartner && businessPartner.phone) {
                  const client = await storage.getClient(updatedService.clientId!);
                  const statusDescription = STATUS_DESCRIPTIONS[updatedService.status] || updatedService.status;
                  
                  await smsService.notifyBusinessPartnerStatusUpdate({
                    partnerPhone: businessPartner.phone,
                    partnerName: businessPartner.fullName,
                    serviceId: id.toString(),
                    clientName: client?.fullName || 'Nepoznat klijent', 
                    deviceType: 'uređaj', // TODO: Dodati pravi tip uređaja
                    statusDescription: statusDescription,
                    technicianNotes: updatedService.technicianNotes || undefined
                  });
                  console.log(`[SMS SISTEM] ✅ SMS poslat poslovnom partneru ${businessPartner.fullName} (${businessPartner.phone})`);
                }
              } catch (smsError) {
                console.error(`[SMS SISTEM] ❌ Greška pri slanju SMS-a poslovnom partneru:`, smsError);
              }
            }
            
          } catch (smsError) {
            console.error("[SMS SISTEM] Globalna greška pri slanju SMS obaveštenja:", smsError);
          }
        } else {
          console.log("[SMS SISTEM] SMS servis nije konfigurisan, preskačem automatske triggere");
        }
      }
      
      // Spojimo ažurirani servis sa informacijama o slanju emaila da bi klijent imao povratnu informaciju
      res.json({
        ...updatedService,
        ...emailInfo
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci servisa", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri ažuriranju servisa" });
    }
  });
  
  // OPTIMIZED: Quick start service endpoint (ultra-fast, no emails/SMS)
  app.put("/api/services/:id/quick-start", jwtAuth, async (req, res) => {
    const startTime = Date.now();
    
    try {
      const serviceId = parseInt(req.params.id);
      const { technicianNotes } = req.body;
      
      console.log(`[QUICK-START] 🚀 Brzo pokretanje servisa #${serviceId} - početak`);
      
      // Minimal validation
      if (!serviceId || isNaN(serviceId)) {
        return res.status(400).json({ error: "Nevažeći ID servisa" });
      }
      
      // Get service (optimized query)
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Security check for technicians
      if (req.user?.role === "technician") {
        const technicianId = req.user!.technicianId;
        if (!technicianId || service.technicianId !== technicianId) {
          return res.status(403).json({ error: "Nemate dozvolu" });
        }
      }
      
      // ULTRA-FAST UPDATE - samo status i osnovne informacije
      const updatedService = await storage.updateService(serviceId, {
        description: service.description,
        warrantyStatus: service.warrantyStatus as "u garanciji" | "van garancije",
        applianceId: service.applianceId,
        status: 'in_progress' as any,
        createdAt: service.createdAt,
        clientId: service.clientId,
        technicianNotes: technicianNotes || service.technicianNotes
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`[QUICK-START] ✅ Servis #${serviceId} započet za ${duration}ms`);
      
      // 🚀 POZADINSKA OBRADA - Ne blokira response
      setImmediate(async () => {
        try {
          console.log(`[BACKGROUND] Pokretanje pozadinske obrade za servis #${serviceId}`);
          
          // Pozovi standardni endpoint u pozadini za email/SMS obaveštenja
          await backgroundProcessServiceStart(serviceId, updatedService, req.user);
          
          console.log(`[BACKGROUND] ✅ Pozadinska obrada završena za servis #${serviceId}`);
        } catch (bgError) {
          console.error(`[BACKGROUND] ❌ Greška u pozadinskoj obradi za servis #${serviceId}:`, bgError);
        }
      });
      
      res.json({
        ...updatedService,
        _performance: {
          duration: `${duration}ms`,
          optimized: true,
          backgroundProcessing: true
        }
      });
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`[QUICK-START] ❌ Greška nakon ${duration}ms:`, error);
      res.status(500).json({ error: "Greška pri pokretanju servisa" });
    }
  });

  // POZADINSKA FUNKCIJA za email/SMS obaveštenja
  async function backgroundProcessServiceStart(serviceId: number, service: any, user: any) {
    try {
      console.log(`[BACKGROUND] Obrađujem obaveštenja za servis #${serviceId}`);
      
      // Standardna logika iz postojećeg endpointa, ali asinhrono
      if (!service.clientId) {
        console.log(`[BACKGROUND] Servis #${serviceId} nema klijenta, preskačem obaveštenja`);
        return;
      }
      
      const client = await storage.getClient(service.clientId);
      if (!client) {
        console.log(`[BACKGROUND] Klijent za servis #${serviceId} nije pronađen`);
        return;
      }
      
      // Importuj email servis
      const { EmailService } = await import('./email-service.js');
      const emailService = EmailService.getInstance();
      
      // STANDARDNO EMAIL OBAVEŠTENJE
      if (client.email) {
        try {
          const emailSent = await emailService.sendServiceStatusUpdate(
            client,
            serviceId,
            "U toku",
            `Servis je započet ${new Date().toLocaleString('sr-RS')}`,
            user?.fullName || "Tehnička podrška",
            service.warrantyStatus
          );
          
          if (emailSent) {
            console.log(`[BACKGROUND] ✅ Email obaveštenje poslato klijentu ${client.fullName}`);
          }
        } catch (emailError) {
          console.error(`[BACKGROUND] ❌ Greška pri slanju emaila:`, emailError);
        }
      }
      
      // SMS OBAVEŠTENJA - samo za in_progress status
      try {
        const settingsArray = await storage.getSystemSettings();
        const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
        const smsConfig = {
          apiKey: settingsMap.sms_mobile_api_key || '',
          baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
          senderId: settingsMap.sms_mobile_sender_id || null,
          enabled: settingsMap.sms_mobile_enabled === 'true'
        };

        if (smsConfig.enabled && smsConfig.apiKey && client.phone) {
          const { SMSCommunicationService } = await import('./sms-communication-service.js');
          const smsService = new SMSCommunicationService(smsConfig);
          
          // Dohvati informacije o uređaju
          const appliance = await storage.getAppliance(service.applianceId);
          const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
          
          const smsResult = await smsService.notifyServiceStarted({
            clientPhone: client.phone,
            clientName: client.fullName,
            serviceId: serviceId.toString(),
            deviceType: category?.name || 'Uređaj',
            technicianName: user?.fullName || 'Serviser'
          });
          
          if (smsResult.success) {
            console.log(`[BACKGROUND] 📱 SMS obaveštenje poslato klijentu ${client.fullName}`);
          } else {
            console.log(`[BACKGROUND] ❌ SMS obaveštenje neuspešno: ${smsResult.error}`);
          }
        }
      } catch (smsError) {
        console.error(`[BACKGROUND] ❌ Greška pri SMS obradi:`, smsError);
      }
      
    } catch (error) {
      console.error(`[BACKGROUND] ❌ Globalna greška pri pozadinskoj obradi:`, error);
    }
  }

  // Update service status (for technicians)
  app.put("/api/services/:id/status", jwtAuth, async (req, res) => {
    try {
      
      const serviceId = parseInt(req.params.id);
      const { 
        status, 
        technicianNotes,
        usedParts,
        machineNotes,
        cost,
        isCompletelyFixed,
        warrantyStatus,
        clientUnavailableReason,
        needsRescheduling,
        reschedulingNotes,
        devicePickedUp,
        pickupDate,
        pickupNotes,
        customerRefusalReason
      } = req.body;
      
      console.log(`[STATUS UPDATE] Korisnik ${req.user?.username} (${req.user?.role}) ažurira servis #${serviceId} sa statusom: ${status}`);
      
      // Validate status
      const validStatus = serviceStatusEnum.parse(status);
      
      // Get the service
      const service = await storage.getService(serviceId);
      if (!service) {
        console.log(`[STATUS UPDATE] Servis #${serviceId} nije pronađen`);
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      console.log(`[STATUS UPDATE] Trenutni status servisa #${serviceId}: ${service.status} -> ${validStatus}`);
      
      // If user is a technician, verify they can modify this service
      if (req.user?.role === "technician") {
        const technicianId = req.user!.technicianId;
        
        // Check if technicianId matches service's technicianId
        if (!technicianId || service.technicianId !== technicianId) {
          return res.status(403).json({ 
            error: "Nemate dozvolu da mijenjate ovaj servis" 
          });
        }
      }
      
      // Update the service
      const updatedService = await storage.updateService(serviceId, {
        ...service,
        status: validStatus,
        technicianNotes: technicianNotes !== undefined ? technicianNotes : service.technicianNotes,
        usedParts: usedParts !== undefined ? usedParts : service.usedParts,
        machineNotes: machineNotes !== undefined ? machineNotes : service.machineNotes,
        cost: cost !== undefined ? cost : service.cost,
        isCompletelyFixed: isCompletelyFixed !== undefined ? isCompletelyFixed : service.isCompletelyFixed,
        warrantyStatus: warrantyStatus !== undefined ? warrantyStatus : service.warrantyStatus,
        completedDate: validStatus === "completed" ? new Date().toISOString() : service.completedDate,
        clientUnavailableReason: clientUnavailableReason !== undefined ? clientUnavailableReason : service.clientUnavailableReason,
        needsRescheduling: needsRescheduling !== undefined ? needsRescheduling : service.needsRescheduling,
        reschedulingNotes: reschedulingNotes !== undefined ? reschedulingNotes : service.reschedulingNotes,
        devicePickedUp: devicePickedUp !== undefined ? devicePickedUp : service.devicePickedUp,
        pickupDate: pickupDate !== undefined ? pickupDate : service.pickupDate,
        pickupNotes: pickupNotes !== undefined ? pickupNotes : service.pickupNotes,
        customerRefusalReason: customerRefusalReason !== undefined ? customerRefusalReason : service.customerRefusalReason
      });
      
      if (!updatedService) {
        console.log(`[STATUS UPDATE] Greška pri ažuriranju servisa #${serviceId} u bazi podataka`);
        return res.status(500).json({ error: "Greška pri ažuriranju statusa servisa" });
      }
      
      console.log(`[STATUS UPDATE] Servis #${serviceId} uspešno ažuriran. Novi status: ${updatedService.status}`);
      
      // Informacije o slanju emaila koje će biti vraćene klijentu (SMS funkcionalnost uklonjena)
      const emailInfo: {
        emailSent: boolean;
        smsSent: boolean;
        clientName: string | null;
        emailDetails: string | null;
        emailError: string | null;
        smsError: string | null;
      } = {
        emailSent: false,
        smsSent: false,
        clientName: null,
        emailDetails: null,
        emailError: null,
        smsError: null
      };
      
      // Pošalji email obaveštenja SVIM povezanim stranama o promeni statusa servisa
      try {
        console.log(`[EMAIL SISTEM] Započinjem slanje obaveštenja o promeni statusa servisa #${serviceId} u "${validStatus}"`);

        // 1. Prvo dohvati sve neophodne podatke
        if (service.clientId) {
          const client = await storage.getClient(service.clientId);
          const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;
          const technicianName = technician ? technician.fullName : "Nepoznat serviser";
          const statusDescription = STATUS_DESCRIPTIONS[validStatus] || validStatus;
          
          if (client) {
            // Popuni ime klijenta za vraćanje klijentu
            emailInfo.clientName = client.fullName;
            
            console.log(`[EMAIL SISTEM] Pronađen klijent: ${client.fullName}, email: ${client.email || 'nije dostupan'}`);
            
            // 2. Šalje EMAIL obaveštenje KLIJENTU
            if (client.email) {
              console.log(`[EMAIL SISTEM] Pokušavam slanje emaila klijentu ${client.fullName} (${client.email})`);
              
              let clientEmailSent = false;
              
              // SPECIJALNI SLUČAJ: Customer je odbio popravku - šalje se profesionalni email
              if (validStatus === "customer_refused_repair" && customerRefusalReason) {
                console.log(`[EMAIL SISTEM] Slanje profesionalnog email-a za odbijanje popravke`);
                
                // Dohvati naziv uređaja i brend
                const appliance = service.applianceId ? await storage.getAppliance(service.applianceId) : null;
                const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
                const manufacturer = appliance ? await storage.getManufacturer(appliance.manufacturerId) : null;
                const applianceName = category ? category.name : "uređaj";
                
                // Pošalji email klijentu
                clientEmailSent = await emailService.sendCustomerRefusalNotification(
                  client,
                  serviceId,
                  applianceName,
                  customerRefusalReason,
                  technicianName
                );
                
                // SPECIJALNI SLUČAJ: Beko aparati - dodatni email-i
                if (manufacturer && manufacturer.name.toLowerCase() === 'beko') {
                  console.log(`[BEKO REFUSAL] Beko aparat - šaljem dodatna obaveštenja o odbijanju servisa`);
                  
                  try {
                    const bekoRefusalSent = await emailService.sendBekoCustomerRefusalNotification(
                      client,
                      serviceId,
                      applianceName,
                      customerRefusalReason,
                      technicianName,
                      manufacturer.name
                    );
                    
                    if (bekoRefusalSent) {
                      console.log(`[BEKO REFUSAL] ✅ Uspešno poslata Beko obaveštenja o odbijanju za servis #${serviceId}`);
                    } else {
                      console.log(`[BEKO REFUSAL] ❌ Neuspešno slanje Beko obaveštenja o odbijanju za servis #${serviceId}`);
                    }
                  } catch (bekoError) {
                    console.error(`[BEKO REFUSAL] Greška pri slanju Beko obaveštenja o odbijanju:`, bekoError);
                  }
                }
              } else {
                // STANDARDNO obaveštenje o promeni statusa
                const clientEmailContent = technicianNotes || service.description || "";
                clientEmailSent = await emailService.sendServiceStatusUpdate(
                  client, 
                  serviceId,
                  statusDescription,
                  clientEmailContent,
                  technicianName,
                  updatedService.warrantyStatus,
                  updatedService.customerRefusesRepair || undefined,
                  updatedService.customerRefusalReason || undefined
                );
              }
              
              if (clientEmailSent) {
                console.log(`[EMAIL SISTEM] ✅ Uspešno poslato obaveštenje klijentu ${client.fullName}`);
                emailInfo.emailSent = true;
                
                // GARANCISKI SERVISI - Dodatna obaveštenja za različite brendove
                if (validStatus === "completed") {
                  
                  // Proveravamo brend aparata za garancisku obaveštenja
                  try {
                    const appliance = service.applianceId ? await storage.getAppliance(service.applianceId) : null;
                    if (appliance) {
                      const manufacturer = await storage.getManufacturer(appliance.manufacturerId);
                      const category = await storage.getApplianceCategory(appliance.categoryId);
                      const applianceName = category ? category.name : 'Nepoznat uređaj';
                      const manufacturerName = manufacturer?.name?.toLowerCase();
                      
                      // BEKO obaveštenja (zadržavamo postojeće)
                      if (manufacturer && manufacturerName === 'beko' && updatedService.warrantyStatus === "in_warranty") {
                        console.log(`[BEKO EMAIL] Završen Beko garanciski servis #${serviceId}, šaljem dodatno obaveštenje`);
                        
                        const bekoEmailSent = await emailService.sendBekoWarrantyCompletionNotification(
                          client,
                          serviceId,
                          service.description || '',
                          technicianName,
                          manufacturer.name,
                          applianceName
                        );
                        
                        if (bekoEmailSent) {
                          console.log(`[BEKO EMAIL] ✅ Uspešno poslato Beko obaveštenje za servis #${serviceId}`);
                        } else {
                          console.log(`[BEKO EMAIL] ❌ Neuspešno slanje Beko obaveštenja za servis #${serviceId}`);
                        }
                      }
                      
                      // COMPLUS obaveštenja za sve ComPlus brendove
                      const complusBrands = ['electrolux', 'elica', 'candy', 'hoover', 'turbo air'];
                      if (manufacturer && manufacturerName && complusBrands.includes(manufacturerName)) {
                        console.log(`[COMPLUS EMAIL] Završen ${manufacturer.name} servis #${serviceId}, šaljem ComPlus obaveštenje`);
                        
                        const complusServiceCompletionSent = await emailService.sendComplusServiceCompletion(
                          serviceId,
                          client.fullName,
                          technicianName,
                          applianceName,
                          manufacturer.name,
                          service.description || updatedService.technicianNotes || ''
                        );
                        
                        if (complusServiceCompletionSent) {
                          console.log(`[COMPLUS EMAIL] ✅ Uspešno poslato ComPlus obaveštenje o završetku servisa #${serviceId}`);
                        } else {
                          console.log(`[COMPLUS EMAIL] ❌ Neuspešno slanje ComPlus obaveštenja o završetku servisa #${serviceId}`);
                        }
                      }
                    }
                  } catch (brandEmailError) {
                    console.error(`[BRAND EMAILS] Greška pri proveri/slanju brand obaveštenja:`, brandEmailError);
                  }
                } // Označava da je email uspešno poslat
                
                // Obavesti administratore o poslatom mail-u klijentu
                await emailService.notifyAdminAboutEmail(
                  "Promena statusa servisa",
                  client.email,
                  serviceId,
                  `Poslato obaveštenje klijentu ${client.fullName} o promeni statusa servisa #${serviceId} u "${statusDescription}"`
                );
              } else {
                console.error(`[EMAIL SISTEM] ❌ Neuspešno slanje obaveštenja klijentu ${client.fullName}`);
                emailInfo.emailError = "Neuspešno slanje emaila klijentu. Proverite email postavke.";
              }
            } else {
              console.warn(`[EMAIL SISTEM] ⚠️ Klijent ${client.fullName} nema email adresu, preskačem slanje emaila`);
              emailInfo.emailError = `Klijent ${client.fullName} nema definisanu email adresu`;
            }
            
            // 2.5. Automatski SMS obaveštenja za klijenta
            if (client.phone && validStatus === 'completed') {
              try {
                const settingsArray = await storage.getSystemSettings();
                const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
                const smsConfig = {
                  apiKey: settingsMap.sms_mobile_api_key || '',
                  baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
                  senderId: settingsMap.sms_mobile_sender_id || null,
                  enabled: settingsMap.sms_mobile_enabled === 'true'
                };

                if (smsConfig.enabled && smsConfig.apiKey) {
                  const { SMSCommunicationService } = await import('./sms-communication-service.js');
                  const smsService = new SMSCommunicationService(smsConfig);
                  
                  // Dohvati kategoriju uređaja za SMS
                  const appliance = await storage.getAppliance(service.applianceId);
                  const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
                  
                  const smsResult = await smsService.notifyServiceCompleted({
                    clientPhone: client.phone,
                    clientName: client.fullName,
                    serviceId: serviceId.toString(),
                    deviceType: category?.name || 'Uređaj',
                    technicianName: technicianName
                  });
                  
                  if (smsResult.success) {
                    console.log(`📱 Automatski SMS o završetku servisa poslat klijentu ${client.fullName} (${client.phone})`);
                    emailInfo.smsSent = true;
                  } else {
                    console.error(`❌ Greška pri slanju automatskog SMS-a:`, smsResult.error);
                    emailInfo.smsError = smsResult.error || 'Nepoznata greška pri slanju SMS-a';
                  }
                }
              } catch (smsError: any) {
                console.error('❌ Greška pri automatskom SMS obaveštenju:', smsError);
                emailInfo.smsError = smsError.message || 'Nepoznata greška pri SMS servisu';
              }
            }
            
            // 3. Šalje obaveštenje SERVISERU
            let techEmailSent = false;
            if (technician && service.technicianId) {
              // Dobavljamo korisnika iz baze koji je vezan za tehničara
              const techUser = await storage.getUserByTechnicianId(service.technicianId);
              const techEmail = techUser?.email || technician.email;
              
              if (techEmail) {
                console.log(`[EMAIL SISTEM] Pokušavam slanje emaila serviseru ${technician.fullName} (${techEmail})`);
                
                // Kreiraj poruku sa detaljima servisa za servisera
                const technicianSubject = `Ažuriran status servisa #${serviceId}: ${statusDescription}`;
                const technicianHTML = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0066cc;">Ažuriranje statusa servisa</h2>
                    <p>Poštovani/a ${technician.fullName},</p>
                    <p>Status servisa je ažuriran:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                      <p><strong>Broj servisa:</strong> #${serviceId}</p>
                      <p><strong>Klijent:</strong> ${client.fullName}</p>
                      <p><strong>Adresa klijenta:</strong> ${client.address || ''}, ${client.city || ''}</p>
                      <p><strong>Telefon klijenta:</strong> ${client.phone || 'Nije dostupan'}</p>
                      <p><strong>Novi status:</strong> ${statusDescription}</p>
                      <p><strong>Napomena:</strong> ${technicianNotes || 'Nema napomene'}</p>
                    </div>
                    <p>Ovo je automatsko obaveštenje sistema za praćenje servisa.</p>
                    <p>Srdačan pozdrav,<br>Tim Frigo Sistema Todosijević</p>
                  </div>
                `;
                
                // Pošalji email serviseru (direktno, ne kroz specijalizovanu metodu)
                techEmailSent = await emailService.sendEmail({
                  to: techEmail,
                  subject: technicianSubject,
                  html: technicianHTML,
                });
                
                if (techEmailSent) {
                  console.log(`[EMAIL SISTEM] ✅ Uspešno poslato obaveštenje serviseru ${technician.fullName}`);
                  
                  // Ako nije poslat email klijentu, ali je serviseru, označimo da je slanje uspešno
                  if (!emailInfo.emailSent) {
                    emailInfo.emailSent = true;
                    emailInfo.clientName = `${technician.fullName} (serviser)`;
                  } else {
                    // Ako je email poslat i klijentu i serviseru, ažurirajmo detalje
                    emailInfo.emailDetails = `Obavešteni: klijent i serviser ${technician.fullName}`;
                  }
                  
                  // EMAIL OBAVEŠTENJA ZA ADMINISTRATORE ONEMOGUĆENA
                  // Korisnik je zatražio da se iskljuće sva email obaveštenja za administratore
                  console.log("[EMAIL] Admin obaveštenja onemogućena po zahtevu korisnika");
                } else {
                  console.error(`[EMAIL SISTEM] ❌ Neuspešno slanje obaveštenja serviseru ${technician.fullName}`);
                  
                  // Ako je već postavljeno da slanje klijentu nije uspelo, dodajmo info o serviseru
                  if (emailInfo.emailError) {
                    emailInfo.emailError += " Takođe, slanje serviseru nije uspelo.";
                  } 
                  // Ako je slanje klijentu uspelo, ali serviseru nije, nemojmo to smatrati greškom
                }
              } else {
                console.warn(`[EMAIL SISTEM] ⚠️ Serviser ${technician.fullName} nema email adresu u sistemu, preskačem slanje`);
              }
            } else if (technician) {
              console.warn(`[EMAIL SISTEM] ⚠️ Serviser ${technician.fullName} nema dovoljno informacija za slanje, preskačem slanje`);
            } else {
              console.warn(`[EMAIL SISTEM] ⚠️ Servisu nije dodeljen serviser, preskačem slanje obaveštenja serviseru`);
            }
          } else {
            console.error(`[EMAIL SISTEM] ❌ Klijent sa ID ${service.clientId} nije pronađen, ne mogu poslati obaveštenja`);
            emailInfo.emailError = "Klijent nije pronađen u bazi podataka";
          }
        } else {
          console.error(`[EMAIL SISTEM] ❌ Servis #${serviceId} nema povezanog klijenta, ne mogu poslati obaveštenja`);
          emailInfo.emailError = "Servis nema povezanog klijenta, ne mogu poslati obaveštenja";
        }
      } catch (error) {
        console.error("[SISTEM OBAVEŠTENJA] ❌ Greška pri slanju obaveštenja:", error);
        // Bezbedno obradimo grešku koja može biti bilo kog tipa
        const errorMessage = error instanceof Error ? error.message : String(error);
        emailInfo.emailError = `Sistemska greška (email): ${errorMessage || "Nepoznata greška"}`;
      }

      // ===== SPECIJALNI SMS TRIGGERI ZA KLIJENT_NIJE_DOSTUPAN =====
      // Dodajemo specifičnu logiku za statuse "client_not_home" i "client_not_answering"
      if (smsService && smsService.isConfigured() && (validStatus === "client_not_home" || validStatus === "client_not_answering")) {
        try {
          console.log(`[SMS KLIJENT_NIJE_DOSTUPAN] Automatski trigger za status: ${validStatus}`);
          
          // 1. SMS KLIJENTU o nedostupnosti i ponovnom zakazivanju
          if (service.clientId) {
            const client = await storage.getClient(service.clientId);
            const appliance = await storage.getAppliance(service.applianceId);
            const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
            const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;
            
            if (client && client.phone) {
              try {
                await smsService.notifyClientUnavailable({
                  clientPhone: client.phone,
                  clientName: client.fullName,
                  serviceId: serviceId.toString(),
                  deviceType: category?.name || 'uređaj',
                  technicianName: technician?.fullName || 'serviser',
                  unavailableReason: clientUnavailableReason || 'nedostupan'
                });
                console.log(`[SMS KLIJENT_NIJE_DOSTUPAN] ✅ SMS o nedostupnosti poslat klijentu ${client.fullName} (${client.phone})`);
              } catch (smsError) {
                console.error(`[SMS KLIJENT_NIJE_DOSTUPAN] ❌ Greška pri slanju SMS-a klijentu:`, smsError);
              }
            }
          }

          // 2. SMS ADMINISTRATORIMA o nedostupnosti klijenta
          try {
            const admins = await getAdminsWithPhones();
            const client = await storage.getClient(service.clientId!);
            const appliance = await storage.getAppliance(service.applianceId);
            const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
            const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;
            
            for (const admin of admins) {
              try {
                await smsService.notifyAdminClientUnavailable({
                  adminPhone: admin.phone,
                  adminName: admin.fullName,
                  serviceId: serviceId.toString(),
                  clientName: client?.fullName || 'Nepoznat klijent',
                  deviceType: category?.name || 'uređaj',
                  technicianName: technician?.fullName || 'serviser',
                  unavailableType: validStatus === "client_not_home" ? 'nije kući' : 'ne javlja se',
                  reschedulingNotes: reschedulingNotes || 'potrebno novo zakazivanje'
                });
                console.log(`[SMS KLIJENT_NIJE_DOSTUPAN] ✅ SMS o nedostupnosti klijenta poslat administratoru ${admin.fullName} (${admin.phone})`);
              } catch (adminSmsError) {
                console.error(`[SMS KLIJENT_NIJE_DOSTUPAN] ❌ Greška pri slanju SMS-a administratoru ${admin.fullName}:`, adminSmsError);
              }
            }
          } catch (adminSmsError) {
            console.error('[SMS KLIJENT_NIJE_DOSTUPAN] Globalna greška pri slanju admin SMS obaveštenja:', adminSmsError);
          }
          
        } catch (smsError) {
          console.error("[SMS KLIJENT_NIJE_DOSTUPAN] Globalna greška pri SMS triggerima za nedostupnost klijenta:", smsError);
        }
      }

      // ===== UNIVERZALNI SMS TRIGGER ZA SVE PROMENE STATUSA =====
      // Konsolidovani SMS sistem koji šalje obaveštenja svim stranama odjednom
      if (smsService && smsService.isConfigured() && service.status !== validStatus) {
        try {
          console.log(`[SMS UNIVERZALNI] Automatski trigger za promenu statusa servisa #${serviceId}: ${service.status} -> ${validStatus}`);
          
          // Pripremi sve potrebne podatke
          const client = service.clientId ? await storage.getClient(service.clientId) : null;
          const appliance = await storage.getAppliance(service.applianceId);
          const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
          const manufacturer = appliance?.manufacturerId ? await storage.getManufacturer(appliance.manufacturerId) : null;
          const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;
          const businessPartner = service.businessPartnerId ? await storage.getUser(service.businessPartnerId) : null;
          
          // Pozovi univerzalnu SMS funkciju
          const smsResults = await smsService.notifyServiceStatusChange({
            serviceId: serviceId.toString(),
            clientPhone: client?.phone,
            clientName: client?.fullName,
            technicianName: technician?.fullName,
            deviceType: category?.name || 'Uređaj',
            manufacturerName: manufacturer?.name,
            oldStatus: service.status,
            newStatus: validStatus,
            statusDescription: STATUS_DESCRIPTIONS[validStatus] || validStatus,
            technicianNotes: technicianNotes,
            businessPartnerPhone: businessPartner?.phone || undefined,
            businessPartnerName: businessPartner?.fullName || undefined
          });
          
          // Log rezultate
          if (smsResults.clientSMS?.success) {
            console.log(`[SMS UNIVERZALNI] ✅ SMS klijentu uspešno poslat`);
          }
          if (smsResults.adminSMS?.length) {
            const successCount = smsResults.adminSMS.filter(r => r.success).length;
            console.log(`[SMS UNIVERZALNI] ✅ SMS administratorima: ${successCount}/${smsResults.adminSMS.length} uspešno`);
          }
          if (smsResults.businessPartnerSMS?.success) {
            console.log(`[SMS UNIVERZALNI] ✅ SMS poslovnom partneru uspešno poslat`);
          }
          if (smsResults.supplierSMS?.success) {
            console.log(`[SMS UNIVERZALNI] ✅ SMS Beli-ju (${manufacturer?.name}) uspešno poslat`);
          }
          
        } catch (smsError) {
          console.error("[SMS UNIVERZALNI] Globalna greška pri SMS obaveštenjima:", smsError);
        }
      } else {
        console.log("[SMS UNIVERZALNI] SMS servis nije konfigurisan ili nema promene statusa");
      }
      
      // Spojimo ažurirani servis sa informacijama o slanju emaila da bi klijent imao povratnu informaciju
      res.json({
        ...updatedService,
        ...emailInfo
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći status servisa", details: error.format() });
      }
      console.error("Error updating service status:", error);
      res.status(500).json({ error: "Greška pri ažuriranju statusa servisa" });
    }
  });

  // Get services for a technician - ENDPOINT DODAJ ZA SERVISERA  
  app.get("/api/services/technician/:technicianId", jwtAuth, async (req, res) => {
    try {
      const technicianId = parseInt(req.params.technicianId);
      
      if (isNaN(technicianId)) {
        return res.status(400).json({ error: "Nevažeći ID servisera" });
      }

      // Check if user is authorized to view this technician's services
      if (req.user?.role === "technician" && req.user.technicianId !== technicianId) {
        return res.status(403).json({ error: "Nemate dozvolu da vidite servise drugih servisera" });
      }

      if (req.user?.role !== "admin" && req.user?.role !== "technician") {
        return res.status(403).json({ error: "Nemate dozvolu za pristup servisima" });
      }

      console.log(`[TEHNIČKI SERVISI] Dohvatanje servisa za servisera ${technicianId}, korisnik: ${req.user?.username} (${req.user?.role})`);

      const services = await storage.getServicesByTechnician(technicianId);
      
      console.log(`[TEHNIČKI SERVISI] Pronađeno ${services.length} servisa za servisera ${technicianId}`);
      
      res.json(services);
    } catch (error) {
      console.error("Greška pri dohvatanju servisa servisera:", error);
      res.status(500).json({ error: "Greška pri dohvatanju servisa" });
    }
  });

  // My services endpoint for authenticated technicians - KLJUČNI ENDPOINT ZA GRUJICA PROBLEM
  app.get("/api/my-services", jwtAuthMiddleware, requireRole("technician"), async (req, res) => {
    try {
      const user = (req as any).user;
      console.log(`[MY-SERVICES] JWT: Fetching services for technician ${user.username} (ID: ${user.id})`);
      
      // Get user details to find technician ID
      const fullUser = await storage.getUser(user.id);
      if (!fullUser || !fullUser.technicianId) {
        console.log(`[MY-SERVICES] JWT: User ${user.username} has no technicianId - Full user:`, fullUser);
        return res.status(400).json({ error: "Korisnik nije serviser" });
      }
      
      const technicianId = parseInt(fullUser.technicianId.toString());
      console.log(`[MY-SERVICES] JWT: Fetching services for technician ID ${technicianId}`);
      
      // Get all services assigned to this technician
      const services = await storage.getServicesByTechnician(technicianId);
      console.log(`[MY-SERVICES] JWT: Found ${services.length} services for technician ${technicianId}`);
      
      res.json(services);
    } catch (error) {
      console.error("[MY-SERVICES] JWT: Greška pri dobijanju servisa servisera:", error);
      res.status(500).json({ error: "Greška pri dobijanju servisa servisera" });
    }
  });

  // Create technician users
  app.post("/api/technician-users", async (req, res) => {
    try {
      // Verify that user is admin or has permission
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      const { technicianId, username, password, fullName } = req.body;
      
      // Verify that technician exists
      const technician = await storage.getTechnician(parseInt(technicianId));
      if (!technician) {
        return res.status(404).json({ error: "Serviser nije pronađen" });
      }
      
      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Korisničko ime već postoji" });
      }
      
      // Create user with technician role
      const userData = insertUserSchema.parse({
        username,
        password,
        fullName: fullName || technician.fullName,
        role: "technician",
        technicianId: technician.id
      });
      
      const newUser = await storage.createUser(userData);
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci korisnika", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri kreiranju korisnika servisera" });
    }
  });

  // NEW ENDPOINT: Repair Failed - Aparat nije popravljen nakon servisa
  app.put("/api/services/:id/repair-failed", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { 
        status,
        repairFailureReason, 
        replacedPartsBeforeFailure, 
        technicianNotes,
        repairFailureDate
      } = req.body;
      
      console.log(`[REPAIR FAILED] Servis #${serviceId} označen kao neuspešan od strane ${req.user?.username}`);
      
      // Validate input
      if (!repairFailureReason || repairFailureReason.trim().length < 5) {
        return res.status(400).json({ 
          error: "Razlog neuspešnog servisa je obavezan i mora imati najmanje 5 karaktera" 
        });
      }
      
      // Get the service
      const service = await storage.getService(serviceId);
      if (!service) {
        console.log(`[REPAIR FAILED] Servis #${serviceId} nije pronađen`);
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Security check for technicians
      if (req.user?.role === "technician") {
        const technicianId = req.user!.technicianId;
        if (!technicianId || service.technicianId !== technicianId) {
          return res.status(403).json({ 
            error: "Nemate dozvolu da mijenjate ovaj servis" 
          });
        }
      }
      
      // Update service with repair failure data
      const updatedService = await storage.updateService(serviceId, {
        ...service,
        status: 'repair_failed' as any,
        repairFailed: true,
        repairFailureReason: repairFailureReason.trim(),
        replacedPartsBeforeFailure: replacedPartsBeforeFailure?.trim() || null,
        technicianNotes: technicianNotes?.trim() || service.technicianNotes,
        repairFailureDate: repairFailureDate || new Date().toISOString().split('T')[0]
      });
      
      console.log(`[REPAIR FAILED] Servis #${serviceId} ažuriran. Razlog: ${repairFailureReason.substring(0, 50)}...`);
      
      // KOMPLETNO SMS OBAVEŠTAVANJE - Pozadinska obrada
      setImmediate(async () => {
        try {
          console.log(`[REPAIR FAILED SMS] Pokretanje SMS obaveštenja za servis #${serviceId}`);
          
          // Dohvati potrebne podatke za SMS
          const client = await storage.getClient(service.clientId);
          const appliance = await storage.getAppliance(service.applianceId);
          const manufacturer = appliance?.manufacturerId ? await storage.getManufacturer(appliance.manufacturerId) : null;
          const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;
          const businessPartner = service.businessPartnerId ? await storage.getUser(service.businessPartnerId) : null;
          
          // Kreiranje SMS objekta
          const smsService = new SMSCommunicationService();
          
          // 1. SMS ADMINISTRATORU
          const adminSMS = `🚨 NEUSPEŠAN SERVIS #${serviceId}
Klijent: ${client?.fullName || 'N/A'}
Uređaj: ${manufacturer?.name || ''} ${appliance?.model || 'N/A'}
Serviser: ${technician?.fullName || 'N/A'}
Razlog: ${repairFailureReason.substring(0, 80)}${repairFailureReason.length > 80 ? '...' : ''}
Datum: ${new Date().toLocaleDateString('sr-RS')}`;
          
          await smsService.sendToAdministrators(adminSMS);
          console.log(`[REPAIR FAILED SMS] ✅ SMS poslat administratorima`);
          
          // 2. SMS KLIJENTU
          if (client?.phone) {
            const clientSMS = `Poštovani ${client.fullName},
Obaveštavamo Vas da nažalost servis Vašeg ${manufacturer?.name || ''} ${appliance?.model || 'uređaja'} (Servis #${serviceId}) nije mogao biti završen uspešno.
Razlog: ${repairFailureReason.substring(0, 100)}${repairFailureReason.length > 100 ? '...' : ''}
Za dodatne informacije pozovite nas.
Frigo Sistem Todosijević`;

            await smsService.sendSMS({
              recipients: client.phone,
              message: clientSMS,
              sendername: 'FrigoSistem'
            });
            console.log(`[REPAIR FAILED SMS] ✅ SMS poslat klijentu: ${client.phone}`);
          }
          
          // 3. SMS POSLOVNOM PARTNERU (ako je kreirao servis)
          if (businessPartner?.phone && service.businessPartnerId) {
            const partnerSMS = `Poštovan/a ${businessPartner.fullName},
Servis #${serviceId} koji ste kreirali za klijenta ${client?.fullName || 'N/A'} nije mogao biti završen uspešno.
Uređaj: ${manufacturer?.name || ''} ${appliance?.model || 'N/A'}
Razlog: ${repairFailureReason.substring(0, 90)}${repairFailureReason.length > 90 ? '...' : ''}
Molimo kontaktirajte nas za dalje korake.
Frigo Sistem`;

            await smsService.sendSMS({
              recipients: businessPartner.phone,
              message: partnerSMS,
              sendername: 'FrigoSistem'
            });
            console.log(`[REPAIR FAILED SMS] ✅ SMS poslat poslovnom partneru: ${businessPartner.phone}`);
          }
          
          console.log(`[REPAIR FAILED SMS] ✅ Sva SMS obaveštenja poslata za servis #${serviceId}`);
        } catch (smsError) {
          console.error(`[REPAIR FAILED SMS] ❌ Greška pri slanju SMS obaveštenja za servis #${serviceId}:`, smsError);
        }
      });
      
      res.json(updatedService);
    } catch (error) {
      console.error(`[REPAIR FAILED] Greška kod servisa #${req.params.id}:`, error);
      res.status(500).json({ error: "Greška pri obeležavanju servisa kao neuspešnog" });
    }
  });

  // SERVICE PHOTOS API - Fotografije sa terena
  
  // Serving public objects endpoint
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const { ObjectStorageService } = await import("./objectStorage");
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serving private objects endpoint
  app.get("/objects/:objectPath(*)", jwtAuth, async (req, res) => {
    const userId = req.user.id;
    const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage");
    const { ObjectPermission } = await import("./objectAcl");
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId.toString(),
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Upload URL endpoint
  app.post("/api/objects/upload", jwtAuth, async (req, res) => {
    const { ObjectStorageService } = await import("./objectStorage");
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      console.log('📸 Generated upload URL for user:', req.user?.id);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Save photo metadata after upload
  app.post("/api/service-photos", jwtAuth, async (req, res) => {
    try {
      const { serviceId, photoUrl, photoCategory = 'other', description } = req.body;
      const userId = req.user?.id;

      console.log('📸 Saving photo metadata:', { serviceId, photoUrl, photoCategory, description, userId });

      if (!serviceId || !photoUrl) {
        return res.status(400).json({ error: "ServiceId i photoUrl su obavezni" });
      }

      // Set ACL policy for the uploaded object
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      
      try {
        const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
          photoUrl,
          {
            owner: userId.toString(),
            visibility: "public", // Service photos are public for all authenticated users
          }
        );
        console.log('📸 Object ACL policy set for:', normalizedPath);
      } catch (aclError) {
        console.error('📸 Failed to set ACL policy:', aclError);
      }

      // Save to database with proper format
      const photoData = {
        serviceId: parseInt(serviceId),
        photoPath: photoUrl, // Use photoPath instead of photoUrl
        category: photoCategory === 'other' ? 'general' as const : photoCategory as any,
        description: description || `Uploaded via object storage`,
        uploadedBy: userId,
        isBeforeRepair: photoCategory === 'before'
      };

      const newPhoto = await storage.createServicePhoto(photoData);
      console.log('📸 Photo metadata saved to database:', newPhoto.id);
      
      res.json(newPhoto);
    } catch (error) {
      console.error("Error saving photo metadata:", error);
      res.status(500).json({ error: "Greška pri čuvanju fotografije" });
    }
  });

  // Test endpoint - get all photos (no auth)
  app.get("/api/service-photos-test", async (req, res) => {
    try {
      const photos = await storage.getServicePhotos(234); // Test with serviceId 234
      console.log('📸 TEST: Found photos for service 234:', photos.length);
      res.json({ count: photos.length, photos: photos.slice(0, 3) });
    } catch (error) {
      console.error("Error in test endpoint:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Get service photos - TEMPORARILY no auth for testing  
  app.get("/api/service-photos", async (req, res) => {
    try {
      const serviceId = req.query.serviceId;
      
      console.log('📸 [GET PHOTOS] Request received for serviceId:', serviceId);
      console.log('📸 [GET PHOTOS] User from session:', req.user);
      
      if (!serviceId) {
        return res.status(400).json({ error: "ServiceId je obavezan" });
      }

      console.log('📸 [GET PHOTOS] Fetching photos from database...');
      const photos = await storage.getServicePhotos(parseInt(serviceId as string));
      console.log('📸 [GET PHOTOS] Found photos:', photos.length);
      
      res.json(photos);
    } catch (error) {
      console.error("📸 [GET PHOTOS] ERROR:", error);
      res.status(500).json({ error: "Greška pri dohvatanju fotografija" });
    }
  });

  // Delete service photo  
  app.delete("/api/service-photos/:photoId", async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId);
      const userId = req.user?.id;

      if (isNaN(photoId)) {
        return res.status(400).json({ error: "Nevažeći ID fotografije" });
      }

      console.log('📸 Deleting photo:', photoId, 'by user:', userId);
      
      // Simply delete the photo - no ownership check for now

      await storage.deleteServicePhoto(photoId);
      console.log('📸 Photo deleted successfully:', photoId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ error: "Greška pri brisanju fotografije" });
    }
  });



  // Service Photos endpoints

  // Endpoint za serviranje fotografija iz local uploads
  app.get("/objects/service-photos/:fileName", async (req, res) => {
    try {
      const fileName = req.params.fileName;
      console.log("📷 [SERVE PHOTO] Zahtev za fotografiju:", fileName);
      
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      
      console.log("📷 [SERVE PHOTO] Dohvatanje iz local storage:", filePath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Fotografija nije pronađena" });
      }
      
      // Read file
      const data = fs.readFileSync(filePath);
      
      // Set headers
      res.set({
        'Content-Type': 'image/webp',
        'Content-Length': data.length.toString(),
        'Cache-Control': 'public, max-age=3600'
      });
      
      console.log("📷 [SERVE PHOTO] ✅ Fotografija uspešno dostavljana");
      res.send(data);
      
    } catch (error) {
      console.error("❌ [SERVE PHOTO] ERROR:", error);
      res.status(404).json({ error: "Fotografija nije pronađena" });
    }
  });

  // Mobile Photo Upload endpoint - koristimo Replit Object Storage
  app.post("/api/service-photos/mobile-upload", jwtAuth, async (req, res) => {
    try {
      console.log("📷 [MOBILE PHOTO] Upload started sa Replit Object Storage");
      
      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;
      
      // Validate user role
      if (!["admin", "technician"].includes(userRole)) {
        return res.status(403).json({ error: "Nemate dozvolu za upload fotografija" });
      }
      
      const { base64Data, serviceId, photoCategory, description } = req.body;
      
      if (!base64Data || !serviceId) {
        return res.status(400).json({ error: "Nedostaju obavezni podaci (base64Data, serviceId)" });
      }
      
      // Validate service exists
      const service = await storage.getService(parseInt(serviceId));
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      console.log("📷 [MOBILE PHOTO] Processing Base64 image...");
      
      // Process Base64 image
      const base64WithoutPrefix = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(base64WithoutPrefix, 'base64');
      
      // Optimize image using existing service
      const { ImageOptimizationService } = await import('./image-optimization-service.js');
      const optimizationService = new ImageOptimizationService();
      const optimizedResult = await optimizationService.optimizeImage(imageBuffer, { format: 'webp' });
      
      // Fallback - save locally i avoid Object Storage issues
      const fileName = `mobile_service_${serviceId}_${Date.now()}.webp`;
      const fs = await import('fs');
      const path = await import('path');
      
      // Save locally in uploads folder using process.cwd()
      const uploadPath = path.join(process.cwd(), 'uploads', fileName);
      const uploadsDir = path.dirname(uploadPath);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(uploadPath, optimizedResult.buffer);
      console.log("📷 [MOBILE PHOTO] File saved locally:", uploadPath);
      
      // Save to database using existing storage method
      const photoData = {
        serviceId: parseInt(serviceId),
        photoPath: `/uploads/${fileName}`, // Local path instead of Object Storage
        description: description || `Mobilna fotografija: ${photoCategory || 'general'}`,
        uploadedBy: userId,
        isBeforeRepair: photoCategory === 'before',
        category: photoCategory || 'general'
      };

      const savedPhoto = await storage.createServicePhoto(photoData);
      console.log("✅ [MOBILE PHOTO] SUCCESS! Photo saved to database, ID:", savedPhoto.id);
      
      res.status(201).json({
        success: true,
        photoId: savedPhoto.id,
        photoPath: savedPhoto.photoPath,
        fileSize: optimizedResult.size,
        message: "Fotografija uspešno uploaded"
      });
      
    } catch (error) {
      console.error("❌ [MOBILE PHOTO] ERROR:", error);
      res.status(500).json({ error: "Upload failed: " + error.message });
    }
  });

  // Base64 Photo Upload endpoint (zaobilazi multer probleme)
  app.post("/api/service-photos/upload-base64", jwtAuth, async (req, res) => {
    try {
      console.log("[BASE64 PHOTO UPLOAD] 📷 Upload fotografije servisa - ENDPOINT REACHED!");
      console.log("[BASE64 PHOTO UPLOAD] User from JWT:", req.user);
      console.log("[BASE64 PHOTO UPLOAD] Headers:", req.headers);
      console.log("[BASE64 PHOTO UPLOAD] Body keys:", Object.keys(req.body));
      
      // Proveriu role
      const userRole = (req.user as any)?.role;
      if (!["admin", "technician"].includes(userRole)) {
        return res.status(403).json({ error: "Nemate dozvolu za upload fotografija" });
      }
      
      const { base64Data, serviceId, photoCategory, description, filename } = req.body;
      
      if (!base64Data || !serviceId) {
        return res.status(400).json({ error: "base64Data i serviceId su obavezni" });
      }
      
      // Konvertuj base64 u buffer
      const base64WithoutPrefix = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(base64WithoutPrefix, 'base64');
      
      console.log("[BASE64 PHOTO UPLOAD] Slika konvertovana, veličina:", imageBuffer.length);
      
      // Optimizuj i kompresuj sliku
      const { ImageOptimizationService } = await import('./image-optimization-service.js');
      const optimizationService = new ImageOptimizationService();
      const optimizedResult = await optimizationService.optimizeImage(imageBuffer, { format: 'webp' });
      
      // Generiraj filename sa WebP ekstenzijom
      const fileName = filename ? filename.replace(/\.[^/.]+$/, '.webp') : `service_${serviceId}_${Date.now()}.webp`;
      
      // Privremeno čuvaj u uploads folderu
      const fs = await import('fs');
      const path = await import('path');
      const uploadPath = path.join(process.cwd(), 'uploads', fileName);
      
      // Osiguraj da uploads folder postoji
      const uploadsDir = path.dirname(uploadPath);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(uploadPath, optimizedResult.buffer);
      
      // Kreaj relativnu rutu za čuvanje u bazi
      const photoPath = `/uploads/${fileName}`;
      
      const photoData = {
        serviceId: parseInt(serviceId),
        photoPath: photoPath,
        description: description || `Fotografija kategorije: ${photoCategory}`,
        category: photoCategory || 'other',
        uploadedBy: req.user?.id || 1,
        isBeforeRepair: photoCategory === 'before'
      };

      const savedPhoto = await storage.createServicePhoto(photoData);
      console.log("[BASE64 PHOTO UPLOAD] ✅ Fotografija sačuvana:", { fileName, optimizedSize: optimizedResult.size });
      
      res.status(201).json({
        ...savedPhoto,
        photoUrl: photoPath,
        fileName: fileName,
        fileSize: optimizedResult.size
      });
    } catch (error) {
      console.error("[BASE64 PHOTO UPLOAD] ❌ Greška:", error);
      res.status(500).json({ error: "Greška pri upload-u fotografije" });
    }
  });

  // POBOLJŠANI Upload fotografija endpoint sa boljim error handling-om
  app.post("/api/service-photos/upload", async (req, res) => {
    console.log("📸 [PHOTO UPLOAD] Endpoint reached - no middleware yet");
    console.log("📸 [PHOTO UPLOAD] Headers:", Object.keys(req.headers));
    console.log("📸 [PHOTO UPLOAD] Content-Type:", req.headers['content-type']);
    
    // Prvo proveri autentifikaciju
    try {
      await new Promise((resolve, reject) => {
        jwtAuth(req, res, (err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
    } catch (authError) {
      console.error("📸 [PHOTO UPLOAD] ❌ Authentication failed:", authError);
      return res.status(401).json({ error: "Neautentifikovani korisnik" });
    }

    console.log("📸 [PHOTO UPLOAD] ✅ Authentication successful, user:", req.user);
    
    // Zatim primeni multer middleware
    photoUpload.single('photo')(req, res, async (multerError) => {
      if (multerError) {
        console.error("📸 [PHOTO UPLOAD] ❌ Multer error:", multerError);
        return res.status(400).json({ error: `Multer greška: ${multerError.message}` });
      }

      try {
        console.log("📸 [PHOTO UPLOAD] Multer successful, processing upload...");
        
        // Proveri korisničku dozvolu
        const userRole = (req.user as any)?.role;
        if (!["admin", "technician"].includes(userRole)) {
          return res.status(403).json({ error: "Nemate dozvolu za upload fotografija" });
        }
        
        if (!req.file) {
          console.error("📸 [PHOTO UPLOAD] ❌ No file received");
          return res.status(400).json({ error: "Fajl nije pronađen" });
        }

        const { serviceId, photoCategory, description } = req.body;
        console.log("📸 [PHOTO UPLOAD] Request data:", { serviceId, photoCategory, description });
        
        if (!serviceId) {
          return res.status(400).json({ error: "serviceId je obavezan" });
        }

        // Proveri da li servis postoji
        const service = await storage.getService(parseInt(serviceId));
        if (!service) {
          return res.status(404).json({ error: "Servis nije pronađen" });
        }

        console.log("📸 [PHOTO UPLOAD] Processing image optimization...");
        
        // Optimizuj i kompresuj sliku
        const { ImageOptimizationService } = await import('./image-optimization-service.js');
        const optimizationService = new ImageOptimizationService();
        const optimizedResult = await optimizationService.optimizeImage(req.file.buffer, { 
          format: 'webp',
          quality: 80,
          maxWidth: 1920,
          maxHeight: 1080
        });
        
        // Generiraj filename sa WebP ekstenzijom
        const fileName = `service_${serviceId}_${Date.now()}.webp`;
        
        // Sačuvaj u uploads folderu
        const fs = await import('fs');
        const path = await import('path');
        const uploadPath = path.join(process.cwd(), 'uploads', fileName);
        
        // Osiguraj da uploads folder postoji
        const uploadsDir = path.dirname(uploadPath);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        fs.writeFileSync(uploadPath, optimizedResult.buffer);
        console.log("📸 [PHOTO UPLOAD] File saved to:", uploadPath);
        
        // Kreaj relativnu rutu za čuvanje u bazi
        const photoPath = `/uploads/${fileName}`;
        
        const photoData = {
          serviceId: parseInt(serviceId),
          photoPath: photoPath,
          description: description || `Fotografija kategorije: ${photoCategory || 'other'}`,
          category: photoCategory || 'other',
          uploadedBy: (req.user as any)?.id || 1,
          isBeforeRepair: photoCategory === 'before'
        };

        const savedPhoto = await storage.createServicePhoto(photoData);
        console.log("📸 [PHOTO UPLOAD] ✅ SUCCESS! Photo saved to database:", { 
          id: savedPhoto.id, 
          fileName, 
          originalSize: req.file.size,
          optimizedSize: optimizedResult.size 
        });
        
        res.status(201).json({
          success: true,
          photo: {
            id: savedPhoto.id,
            serviceId: savedPhoto.serviceId,
            photoUrl: photoPath,
            photoCategory: savedPhoto.category,
            description: savedPhoto.description,
            fileName: fileName,
            fileSize: optimizedResult.size,
            uploadedBy: savedPhoto.uploadedBy,
            uploadedAt: savedPhoto.createdAt
          }
        });
        
      } catch (error) {
        console.error("📸 [PHOTO UPLOAD] ❌ Processing error:", error);
        res.status(500).json({ error: `Upload greška: ${error.message}` });
      }
    });
  });

  app.post("/api/service-photos", jwtAuth, async (req, res) => {
    try {
      // Proveriu role
      const userRole = (req.user as any)?.role;
      if (!["admin", "technician"].includes(userRole)) {
        return res.status(403).json({ error: "Nemate dozvolu za upload fotografija" });
      }
      
      const { serviceId, photoURL, description, category } = req.body;
      console.log("[PHOTO SAVE] 📷 Čuvanje fotografije servisa:", { serviceId, category });
      
      if (!serviceId || !photoURL) {
        return res.status(400).json({ error: "serviceId i photoURL su obavezni" });
      }

      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(photoURL);
      
      const photoData = {
        serviceId: parseInt(serviceId),
        photoPath: normalizedPath,
        description: description || '',
        category: category || 'general',
        uploadedBy: req.user?.id || 1,
        isBeforeRepair: req.body.isBeforeRepair || true
      };

      const savedPhoto = await storage.createServicePhoto(photoData);
      console.log("[PHOTO SAVE] ✅ Fotografija sačuvana:", savedPhoto);
      res.status(201).json(savedPhoto);
    } catch (error) {
      console.error("[PHOTO SAVE] ❌ Greška:", error);
      res.status(500).json({ error: "Greška pri čuvanju fotografije" });
    }
  });

  // Serviranje upload-ovanih fotografija
  app.get("/uploads/:fileName", (req, res) => {
    try {
      const fileName = req.params.fileName;
      const pathModule = require('path');
      const fs = require('fs');
      const filePath = pathModule.join(process.cwd(), 'uploads', fileName);
      
      console.log(`📸 [FILE SERVE] Pokušavam da servram: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`📸 [FILE SERVE] ❌ Fajl ne postoji: ${filePath}`);
        return res.status(404).json({ error: "Fajl nije pronađen" });
      }
      
      // Set appropriate headers
      const ext = pathModule.extname(fileName).toLowerCase();
      const contentType = ext === '.webp' ? 'image/webp' : 
                         ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                         ext === '.png' ? 'image/png' : 'image/webp';
                         
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      console.log(`📸 [FILE SERVE] ✅ Serviranje ${fileName} (${contentType})`);
      
      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error('[FILE SERVE] ❌ Stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Greška pri čitanju fajla" });
        }
      });
      fileStream.pipe(res);
    } catch (error) {
      console.error("[FILE SERVE] ❌ Greška:", error);
      res.status(500).json({ error: "Greška pri serviranje fajla" });
    }
  });

  app.get("/api/service-photos", jwtAuth, async (req, res) => {
    try {
      // Proveriu role
      const userRole = (req.user as any)?.role;
      if (!["admin", "technician"].includes(userRole)) {
        return res.status(403).json({ error: "Nemate dozvolu za pristup fotografijama" });
      }
      
      const serviceId = parseInt(req.query.serviceId as string);
      console.log(`📸 API GET /api/service-photos pozvan za serviceId: ${serviceId}, role: ${userRole}`);
      
      if (!serviceId) {
        console.log(`📸 ERROR: serviceId nije provided: ${req.query.serviceId}`);
        return res.status(400).json({ error: "serviceId je obavezan" });
      }
      
      const photos = await storage.getServicePhotos(serviceId);
      console.log(`📸 Storage returned ${photos.length} photos for service ${serviceId}`);
      
      if (photos.length > 0) {
        console.log(`📸 First photo debug:`, {
          id: photos[0].id,
          serviceId: photos[0].serviceId,
          photoPath: photos[0].photoPath,
          category: photos[0].category,
          description: photos[0].description
        });
      }
      
      // Transformiši fotografije za frontend - KONAČNO REŠENO
      const transformedPhotos = photos.map(photo => ({
        id: photo.id,
        serviceId: photo.serviceId,
        photoUrl: photo.photoPath, // Drizzle pravilno mapira photoPath iz schema
        photoCategory: photo.category,
        description: photo.description,
        uploadedBy: photo.uploadedBy,
        uploadedAt: photo.uploadedAt,
        fileName: photo.photoPath ? photo.photoPath.split('/').pop() : null,
        fileSize: null // fileSize nije u trenutnom schema
      }));
      
      console.log(`📸 Transformed photos for frontend:`, transformedPhotos.map(p => ({ id: p.id, photoUrl: p.photoUrl, photoCategory: p.photoCategory })));
      
      // Set no-cache headers to prevent stale data
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');  
      res.setHeader('Expires', '0');
      
      res.json(transformedPhotos);
    } catch (error) {
      console.error("[PHOTO GET] ❌ Greška:", error);
      res.status(500).json({ error: "Greška pri dohvatanju fotografija" });
    }
  });

  app.delete("/api/service-photos/:id", jwtAuth, async (req, res) => {
    try {
      // Proveriu role
      const userRole = (req.user as any)?.role;
      if (!["admin", "technician"].includes(userRole)) {
        return res.status(403).json({ error: "Nemate dozvolu za brisanje fotografija" });
      }
      
      const photoId = parseInt(req.params.id);
      await storage.deleteServicePhoto(photoId);
      res.json({ success: true });
    } catch (error) {
      console.error("[PHOTO DELETE] ❌ Greška:", error);
      res.status(500).json({ error: "Greška pri brisanju fotografije" });
    }
  });

  app.get("/api/service-photos/category/:category", jwtAuth, async (req, res) => {
    try {
      // Proveriu role
      const userRole = (req.user as any)?.role;
      if (!["admin", "technician"].includes(userRole)) {
        return res.status(403).json({ error: "Nemate dozvolu za pristup fotografijama" });
      }
      
      const category = req.params.category;
      // Pozivamo metodu koja prima samo kategoriju (globalni pregled)
      const photos = await storage.getServicePhotosByCategory(1, category);
      res.json(photos);
    } catch (error) {
      console.error("[PHOTO CATEGORY] ❌ Greška:", error);
      res.status(500).json({ error: "Neuspešno dohvatanje fotografija po kategoriji" });
    }
  });

  // Test endpoint bez autentifikacije
  app.get("/api/test/service-photos", async (req, res) => {
    try {
      const photos = await storage.getServicePhotosByCategory("general");
      res.json({ message: "Service Photos API radi", count: photos.length, photos });
    } catch (error) {
      console.error("[PHOTO TEST] ❌ Greška:", error);
      res.status(500).json({ error: "Test endpoint greška", details: error.message });
    }
  });

  // Test endpoint za upload URL bez autentifikacije  
  app.get("/api/test/upload-url", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ message: "Upload URL kreiran", uploadURL });
    } catch (error) {
      console.error("[UPLOAD TEST] ❌ Greška:", error);
      res.status(500).json({ error: "Upload URL greška", details: error.message });
    }
  });

  // Analiza kapaciteta baze podataka za slike
  app.get("/api/analysis/database-storage-capacity", requireRole(["admin"]), async (req, res) => {
    try {
      console.log("[STORAGE ANALYSIS] 🔍 Pokretanje analize kapaciteta baze...");
      
      // Trenutne statistike fotografija servisa
      const totalPhotos = await storage.getTotalServicePhotosCount();
      const photosByCategory = await storage.getServicePhotosCountByCategory();
      const avgPhotoSize = 2.5; // MB prosečna veličina fotografije (procena)
      
      // PostgreSQL ograničenja i preporuke
      const maxDbSize = 100 * 1024; // 100 GB u MB
      const recommendedDbSize = 50 * 1024; // 50 GB preporučeno
      const currentPhotoStorageMB = totalPhotos * avgPhotoSize;
      const currentPhotoStoragePercentage = (currentPhotoStorageMB / recommendedDbSize) * 100;
      
      // Projektovanje rasta
      const avgPhotosPerService = 3; // prosečno 3 fotografije po servisu
      const avgServicesPerMonth = 150; // procena na osnovu trenutne aktivnosti
      const newPhotosPerMonth = avgServicesPerMonth * avgPhotosPerService;
      const storageGrowthPerMonth = newPhotosPerMonth * avgPhotoSize;
      
      // Procena kada će dostići limite
      const remainingCapacityMB = recommendedDbSize - currentPhotoStorageMB;
      const monthsToCapacity = remainingCapacityMB / storageGrowthPerMonth;
      
      // Analiza po kategorijama
      const categoryAnalysis = photosByCategory.map(cat => ({
        category: cat.category,
        count: cat.count,
        estimatedSizeMB: cat.count * avgPhotoSize,
        percentage: (cat.count / totalPhotos) * 100
      }));
      
      // Preporuke za optimizaciju
      const recommendations = [];
      
      if (currentPhotoStoragePercentage > 80) {
        recommendations.push({
          priority: "KRITIČNO",
          message: "Baza se približava kapacitetu - potrebna je optimizacija",
          action: "Kompresija starijih slika ili prebacivanje na Cloud Storage"
        });
      } else if (currentPhotoStoragePercentage > 60) {
        recommendations.push({
          priority: "UPOZORENJE", 
          message: "Baza koristi preko 60% kapaciteta",
          action: "Planiranje migracije na objektno skladište"
        });
      } else {
        recommendations.push({
          priority: "DOBRO",
          message: "Trenutni kapacitet je u zdravim granicama",
          action: "Nastaviti sa trenutnim pristupom"
        });
      }
      
      if (monthsToCapacity < 12) {
        recommendations.push({
          priority: "PLANIRANJE",
          message: `Kapacitet će biti dosegnut za ${Math.round(monthsToCapacity)} meseci`,
          action: "Implementirati strategiju za upravljanje velikim fajlovima"
        });
      }
      
      const analysis = {
        trenutnoStanje: {
          ukupnoFotografija: totalPhotos,
          procenjenaVelicinaMB: Math.round(currentPhotoStorageMB),
          procenjenaVelicinaGB: Math.round(currentPhotoStorageMB / 1024 * 100) / 100,
          zauzeceBazeProcenat: Math.round(currentPhotoStoragePercentage * 100) / 100
        },
        kategorije: categoryAnalysis,
        kapaciteti: {
          maksimalniKapacitetGB: maxDbSize / 1024,
          preporuceniKapacitetGB: recommendedDbSize / 1024,
          trenutnoKoriscenjeGB: Math.round(currentPhotoStorageMB / 1024 * 100) / 100,
          dostupniKapacitetGB: Math.round(remainingCapacityMB / 1024 * 100) / 100
        },
        projekcijaRasta: {
          noveFotografijePoMesecu: newPhotosPerMonth,
          rastPoMesecuMB: Math.round(storageGrowthPerMonth),
          rastPoGodineMB: Math.round(storageGrowthPerMonth * 12),
          vremeDoDosezanjaKapaciteta: `${Math.round(monthsToCapacity)} meseci`
        },
        performanse: {
          uticajNaBazu: currentPhotoStoragePercentage < 30 ? "MINIMALAN" : 
                        currentPhotoStoragePercentage < 60 ? "UMEREN" : "ZNAČAJAN",
          brzineUpita: "Fotografije su u objektnom skladištu - minimalan uticaj na SQL upite",
          preporukeOptimizacije: [
            "Koristi Replit Object Storage umesto baze za čuvanje fajlova",
            "Implementiraj CDN za brže učitavanje slika",
            "Kompresuj slike pre upload-a (WebP format)",
            "Automatsko brisanje starijih fotografija (preko 2 godine)"
          ]
        },
        preporuke: recommendations,
        tehnickeDetalje: {
          prosecnaVelicinaFotografije: `${avgPhotoSize} MB`,
          metodaCuvanja: "Object Storage + metadata u PostgreSQL",
          kompresija: "Potrebna implementacija",
          backup: "Uključeno u Object Storage automatski"
        }
      };
      
      console.log("[STORAGE ANALYSIS] ✅ Analiza završena:", analysis);
      res.json(analysis);
      
    } catch (error) {
      console.error("[STORAGE ANALYSIS] ❌ Greška:", error);
      res.status(500).json({ error: "Greška pri analizi kapaciteta baze" });
    }
  });

  // ====================================
  // ADMIN SERVICES MANAGEMENT ENDPOINTS
  // ====================================
  
  // Return service from technician to admin
  app.post('/api/services/:id/return-from-technician', jwtAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { reason, notes } = req.body;
      
      console.log(`[ADMIN SERVICES] Vraćanje servisa ${serviceId} od servisera u admin bazu`);
      
      // Get current service
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Update service status and notes
      await storage.updateService(serviceId, {
        status: 'pending',
        technicianId: null,
        technicianNotes: notes ? `VRAĆEN OD SERVISERA: ${reason}\nBeleške: ${notes}\n\n${service.technicianNotes || ''}` : service.technicianNotes
      });
      
      console.log(`✅ [ADMIN SERVICES] Servis ${serviceId} uspešno vraćen u admin bazu`);
      res.json({ success: true, message: "Servis uspešno vraćen od servisera" });
      
    } catch (error) {
      console.error('[ADMIN SERVICES] Greška pri vraćanju servisa:', error);
      res.status(500).json({ error: "Greška pri vraćanju servisa" });
    }
  });
  
  // Assign technician to service
  app.put('/api/services/:id/assign-technician', jwtAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { technicianId } = req.body;
      
      console.log(`[ADMIN SERVICES] Dodeljavanje servisera ${technicianId} servisu ${serviceId}`);
      
      // Validate service exists
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Validate technician exists
      const technician = await storage.getTechnician(technicianId);
      if (!technician) {
        return res.status(404).json({ error: "Serviser nije pronađen" });
      }
      
      // Update service with assigned technician
      await storage.updateService(serviceId, {
        technicianId: technicianId,
        status: 'assigned'
      });
      
      console.log(`✅ [ADMIN SERVICES] Serviser ${technician.fullName} dodeljen servisu ${serviceId}`);
      res.json({ 
        success: true, 
        message: `Serviser ${technician.fullName} uspešno dodeljen servisu`,
        technician: technician 
      });
      
    } catch (error) {
      console.error('[ADMIN SERVICES] Greška pri dodeli servisera:', error);
      res.status(500).json({ error: "Greška pri dodeli servisera" });
    }
  });

  // ====================================
  // STORAGE OPTIMIZATION ENDPOINTS
  // ====================================
  
  // Manual cleanup endpoint
  app.post('/api/admin/storage/cleanup-old-photos', jwtAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      console.log('[STORAGE CLEANUP] Pokretanje manuelnog brisanja starih fotografija...');
      
      const { ImageOptimizationService } = await import('./image-optimization-service');
      const result = await ImageOptimizationService.cleanupOldPhotos();
      
      res.json({
        success: true,
        deletedCount: result.deletedCount,
        spaceSavedMB: Math.round(result.spaceSaved / 1024 / 1024 * 100) / 100,
        details: result.details
      });
      
    } catch (error) {
      console.error('[STORAGE CLEANUP] Greška:', error);
      res.status(500).json({ error: "Greška pri brisanju starih fotografija" });
    }
  });

  // Storage optimization statistics
  app.get('/api/admin/storage/optimization-stats', jwtAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { ImageOptimizationService } = await import('./image-optimization-service');
      
      // Procenimo uštede sa WebP kompresijom
      const avgPhotoSizeMB = 2.5; // Prosečna veličina trenutnih fotografija
      const totalPhotos = await storage.getServicePhotosCount();
      const currentStorageMB = totalPhotos * avgPhotoSizeMB;
      
      const savings = ImageOptimizationService.estimateStorageSavings(currentStorageMB, 0.5);
      
      res.json({
        trenutnoStanje: {
          brojFotografija: totalPhotos,
          trenutniStorageMB: currentStorageMB,
          procenjenaVelicina: `${currentStorageMB.toFixed(2)} MB`
        },
        webpOptimizacija: {
          originalSize: savings.originalSize,
          optimizedSize: savings.optimizedSize,
          savings: savings.savings,
          savingsPercentage: savings.savingsPercentage
        },
        preporuke: [
          "Implementiraj WebP kompresiju za 50% uštede prostora",
          "Ograniči rezoluciju na 1920x1080 piksela",
          "Automatsko brisanje slika starijih od 2 godine",
          "Koristi progresivno učitavanje slika u aplikaciji"
        ]
      });
      
    } catch (error) {
      console.error('[STORAGE OPTIMIZATION] Greška:', error);
      res.status(500).json({ error: "Greška pri dobijanju statistika optimizacije" });
    }
  });

  return server;
}

// Additional photo utility functions
async function sendCriticalPartsAlert(partId: number, currentQuantity: number) {
  console.log(`🚨 KRITIČNI NIVO REZERVNIH DELOVA - ID: ${partId}, Trenutna količina: ${currentQuantity}`);
  
  try {
    const part = await storage.getAvailablePart(partId);
    if (!part) return;
    
    const notificationData = {
      title: "🚨 Kritično stanje rezervnih delova",
      message: `Rezervni deo "${part.partName}" (${part.partNumber}) ima kritično nisku količinu: ${currentQuantity} kom`,
      type: "critical_parts_alert" as const,
      userId: 1, // Admin user
      isRead: false,
      metadata: {
        partId,
        currentQuantity,
        partName: part.partName,
        partNumber: part.partNumber
      }
    };
    
    await storage.createNotification(notificationData);
    console.log(`✅ Kritična notifikacija kreirana za rezervni deo ${part.partName}`);
  } catch (error) {
    console.error('❌ Greška pri kreiranju kritične notifikacije:', error);
  }
}
