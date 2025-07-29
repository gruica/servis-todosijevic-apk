import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, comparePassword } from "./auth";
import { registerBusinessPartnerRoutes } from "./business-partner-routes";
import { emailService } from "./email-service";
import { excelService } from "./excel-service";
import { generateToken, jwtAuthMiddleware, jwtAuth, requireRole } from "./jwt-auth";
import { insertClientSchema, insertServiceSchema, insertApplianceSchema, insertApplianceCategorySchema, insertManufacturerSchema, insertTechnicianSchema, insertUserSchema, serviceStatusEnum, insertMaintenanceScheduleSchema, insertMaintenanceAlertSchema, maintenanceFrequencyEnum, insertSparePartOrderSchema, sparePartUrgencyEnum, sparePartStatusEnum, sparePartWarrantyStatusEnum, insertRemovedPartSchema, insertSparePartsCatalogSchema, sparePartCategoryEnum, sparePartAvailabilityEnum, sparePartSourceTypeEnum } from "@shared/schema";
import { db, pool } from "./db";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { eq, and, desc, gte, lte, ne, isNull, like, count, sql, sum, or, inArray } from "drizzle-orm";
import * as schema from "@shared/schema";
import { SMSCommunicationService } from "./sms-communication-service.js";
const { availableParts } = schema;
import { getBotChallenge, verifyBotAnswer, checkBotVerification } from "./bot-verification";
import { checkServiceRequestRateLimit, checkRegistrationRateLimit, getRateLimitStatus } from "./rate-limiting";
import { emailVerificationService } from "./email-verification";
import { NotificationService } from "./notification-service";
import { BusinessPartnerNotificationService } from "./business-partner-notifications";
import { BusinessPartnerMessageService } from "./business-partner-messages";
import { createSMSMobileAPIRoutes } from './sms-mobile-api-routes';
import { setupWebScrapingRoutes } from './web-scraping-routes';
import { ProfessionalEmailNotificationService } from './professional-email-notification-service';
// SMS mobile functionality has been completely removed

// Instanca profesionalnog email notification sistema
const professionalEmailService = new ProfessionalEmailNotificationService();

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
      if (req.user.role !== 'admin' && req.user.technicianId !== technicianId) {
        return res.status(403).json({ error: 'Nemate dozvolu za pristup ovim podacima' });
      }

      const services = await storage.getServicesByTechnician(technicianId);
      
      const stats = {
        total_services: services.length,
        completed_services: services.filter(s => s.status === 'completed').length,
        pending_services: services.filter(s => ['pending', 'assigned', 'in_progress', 'scheduled', 'waiting_parts'].includes(s.status)).length,
        this_month_completed: services.filter(s => {
          if (s.status !== 'completed') return false;
          const completedDate = new Date(s.updatedAt);
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
      if (!req.user) {
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
        requestedBy: req.user.id
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
  // Business partner routes are now integrated directly in this file - deactivated duplicate registration
  // registerBusinessPartnerRoutes(app);

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
      // Dodatna validacija podataka o klijentu - Zod provera
      const validationResult = insertClientSchema.safeParse(req.body);
      
      // Ako podaci nisu validni, vrati grešku sa detaljima
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Nevažeći podaci klijenta", 
          details: validationResult.error.format(),
          message: "Svi podaci o klijentu moraju biti pravilno uneti. Proverite podatke i pokušajte ponovo."
        });
      }
      
      // Dodatna poslovna pravila
      const validatedData = validationResult.data;
      
      // Provera duplikata po email adresi ako je uneta
      if (validatedData.email) {
        try {
          const existingClient = await storage.getClientByEmail(validatedData.email);
          if (existingClient) {
            return res.status(400).json({
              error: "Duplikat email adrese",
              message: `Klijent sa email adresom '${validatedData.email}' već postoji u bazi. Koristite funkciju pretrage da pronađete postojećeg klijenta.`
            });
          }
        } catch (emailCheckError) {
          console.error("Greška pri proveri duplikata email adrese:", emailCheckError);
          // Ne vraćamo grešku korisniku ovde, nastavljamo proces
        }
      }
      
      // Formatiranje telefonskog broja
      if (validatedData.phone) {
        // Ako telefon ne počinje sa +, dodajemo prefiks za Crnu Goru
        if (!validatedData.phone.startsWith('+')) {
          // Prvo uklanjamo sve što nije broj
          const numberOnly = validatedData.phone.replace(/\D/g, '');
          
          // Ako počinje sa 0, zamenjujemo ga sa 382
          if (numberOnly.startsWith('0')) {
            validatedData.phone = '+382' + numberOnly.substring(1);
          } else {
            // Inače dodajemo prefiks na ceo broj
            validatedData.phone = '+382' + numberOnly;
          }
        }
      }
      
      // Provera telefona (mora sadržati samo brojeve, +, -, razmake i zagrade)
      if (!/^[+]?[\d\s()-]{6,20}$/.test(validatedData.phone)) {
        return res.status(400).json({
          error: "Nevažeći broj telefona",
          message: "Broj telefona može sadržati samo brojeve, razmake i znakove +()-"
        });
      }
      
      // Provera da li email već postoji (ako je unet)
      if (validatedData.email) {
        const existingClientWithEmail = await storage.getClientByEmail(validatedData.email);
        if (existingClientWithEmail) {
          return res.status(400).json({
            error: "Email već postoji",
            message: "Klijent sa ovim email-om već postoji u bazi podataka"
          });
        }
      }
      
      // Ako su svi uslovi ispunjeni, kreiramo klijenta
      const client = await storage.createClient(validatedData);
      
      // Vrati uspešan odgovor
      res.status(201).json({
        success: true,
        message: "Klijent je uspešno kreiran",
        data: client
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci klijenta", details: error.format() });
      }
      console.error("Greška pri kreiranju klijenta:", error);
      res.status(500).json({ error: "Greška pri kreiranju klijenta", message: error instanceof Error ? error.message : String(error) });
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
      res.status(500).json({ error: "Greška pri kreiranju kategorije", message: error.message });
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
      res.status(500).json({ error: "Greška pri kreiranju proizvođača", message: error.message });
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
      res.status(500).json({ error: "Greška pri kreiranju uređaja", message: error.message });
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
      res.status(500).json({ error: "Greška pri ažuriranju uređaja", message: error.message });
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

  // Admin Services Endpoint - za admin panel
  app.get("/api/admin/services", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log('Admin dohvatanje svih servisa');
      
      // Dohvati sve servise sa kompletnim podacima
      const services = await storage.getAdminServices();
      
      console.log(`Admin API vraća ${services.length} servisa`);
      
      res.json(services);
    } catch (error) {
      console.error("Greška pri dobijanju admin servisa:", error);
      res.status(500).json({ error: "Greška pri dobijanju servisa" });
    }
  });
  
  // Business Partner API Endpoints - Enhanced with detailed service information
  app.get("/api/business/services", jwtAuth, async (req, res) => {
    try {
      // Koristi user ID iz JWT tokena umesto query parametra
      if (req.user.role !== 'business_partner') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovim podacima" });
      }
      
      console.log(`Dohvatanje detaljnih servisa za poslovnog partnera sa ID: ${req.user.id}`);
      
      // Dohvati servise povezane sa poslovnim partnerom
      const services = await storage.getServicesByPartner(req.user.id);
      
      // Dodajemo detaljan rad info za svaki servis
      const enhancedServices = await Promise.all(services.map(async (service) => {
        // Dohvati rezervne delove za servis
        const spareParts = await storage.getSparePartsByService(service.id);
        
        // Dohvati uklonjene delove sa uređaja
        const removedParts = await storage.getRemovedPartsByService(service.id);
        
        // Dohvati technicianove napomene i rad
        const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;
        const techUser = technician ? await storage.getUserByTechnicianId(service.technicianId) : null;
        
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
            productCode: part.productCode,
            urgency: part.urgency,
            warrantyStatus: part.warrantyStatus,
            status: part.status,
            orderDate: part.createdAt,
            estimatedDeliveryDate: part.estimatedDeliveryDate,
            actualDeliveryDate: part.actualDeliveryDate
          })),
          removedParts: removedParts.map(part => ({
            partName: part.partName,
            removalReason: part.removalReason,
            currentLocation: part.currentLocation,
            removalDate: part.removalDate,
            returnDate: part.returnDate,
            status: part.status,
            repairCost: part.repairCost
          })),
          workTimeline: [
            { date: service.createdAt, event: 'Servis kreiran', status: 'pending' },
            service.assignedAt ? { date: service.assignedAt, event: `Dodeljen serviseru ${technician?.fullName}`, status: 'assigned' } : null,
            service.scheduledDate ? { date: service.scheduledDate, event: 'Zakazan termin', status: 'scheduled' } : null,
            service.startedAt ? { date: service.startedAt, event: 'Servis započet', status: 'in_progress' } : null,
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
      if (req.user.role !== 'business_partner') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovim podacima" });
      }
      
      // Prvo proveri da li je servis povezan sa ovim poslovnim partnerom
      const service = await storage.getService(serviceId);
      
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Provera da li servis pripada poslovnom partneru
      if (service.businessPartnerId !== req.user.id) {
        return res.status(403).json({ error: "Nemate pristup ovom servisu" });
      }
      
      // Dohvati detaljne informacije o servisu
      const serviceDetails = await storage.getServiceWithDetails(serviceId);
      
      // Dohvati istoriju statusa za servis
      const statusHistory = await storage.getServiceStatusHistory(serviceId);
      
      // Kombinuj podatke
      const response = {
        ...serviceDetails,
        statusHistory
      };
      
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
                    technicianNotes: updatedService.technicianNotes
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
                    technicianNotes: updatedService.technicianNotes
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
        const technicianId = req.user.technicianId;
        
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
      
      // PROFESIONALNI EMAIL NOTIFICATION SISTEM - NAJVIŠI SVETSKI STANDARDI
      try {
        console.log(`[PROFESSIONAL EMAIL] 🏆 Pokretanje profesionalnog email obaveštavanja za servis #${serviceId} - akcija: status_change`);

        // Dohvati sve potrebne podatke za profesionalni email sistem
        const client = service.clientId ? await storage.getClient(service.clientId) : null;
        const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;
        const appliance = service.applianceId ? await storage.getAppliance(service.applianceId) : null;
        const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
        const manufacturer = appliance ? await storage.getManufacturer(appliance.manufacturerId) : null;

        if (client && technician) {
          // Kreiraj podatke za profesionalni email sistem
          const emailData = {
            serviceId,
            action: validStatus === 'completed' ? 'completed' as const : 'status_change' as const,
            client,
            technician,
            appliance,
            category,
            manufacturer,
            service: updatedService,
            businessPartnerEmail: undefined, // Dodaće se u sledećoj iteraciji
            additionalInfo: {
              newStatus: validStatus,
              completionNotes: technicianNotes,
              cost: cost ? `${cost} €` : undefined
            }
          };

          // Pokreni profesionalni email notification sistem
          const emailResults = await professionalEmailService.notifyAllStakeholdersOfServiceAction(emailData);
          
          // Ažuriraj email info za response
          emailInfo.emailSent = emailResults.clientEmailSent;
          emailInfo.clientName = client.fullName;
          
          if (emailResults.clientEmailSent) {
            emailInfo.emailDetails = `Uspešno poslato profesionalno obaveštenje o promeni statusa u "${validStatus}"`;
          } else {
            emailInfo.emailError = "Neuspešno slanje profesionalnog email obaveštenja";
          }
          
          console.log(`[PROFESSIONAL EMAIL] 📊 Rezultati: ${emailResults.totalNotifications}/3 notifikacija poslato za servis #${serviceId}`);
        } else {
          console.warn(`[PROFESSIONAL EMAIL] ⚠️ Nedostaju podaci - klijent: ${!!client}, serviser: ${!!technician}`);
          emailInfo.emailError = "Nedostaju podaci o klijentu ili serviseru";
        }
      } catch (emailError) {
        console.error(`[PROFESSIONAL EMAIL] ❌ Greška pri profesionalnom email obaveštavanju:`, emailError);
        emailInfo.emailError = `Greška pri slanju profesionalnih email obaveštenja: ${emailError.message}`;
      }

      // SMS obaveštavanje ostaje isti (legacy sistema)
      if (validStatus === 'completed' && service.clientId) {
        const client = await storage.getClient(service.clientId);
        const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;
        const technicianName = technician ? technician.fullName : "Nepoznat serviser";
        
        // SMS notifikacije za završene servise
        if (client && client.phone) {
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
                console.log(`📱 Legacy SMS o završetku servisa poslat klijentu ${client.fullName} (${client.phone})`);
                emailInfo.smsSent = true;
              } else {
                console.error(`❌ Greška pri legacy SMS-u:`, smsResult.error);
                emailInfo.smsError = smsResult.error || 'Nepoznata greška pri slanju SMS-a';
              }
            }
          } catch (smsError: any) {
            console.error('❌ Greška pri legacy SMS obaveštenju:', smsError);
            emailInfo.smsError = smsError.message || 'Nepoznata greška pri SMS servisu';
          }
        }
      }

      console.log(`[STATUS UPDATE] 📊 Finalni rezultat za servis #${serviceId}:`, {
        newStatus: validStatus,
        emailSent: emailInfo.emailSent,
        smsSent: emailInfo.smsSent,
        clientName: emailInfo.clientName
      });

      res.json({ 
        ...updatedService, 
        message: `Status servisa #${serviceId} uspešno ažuriran u "${validStatus}"`,
        notifications: {
          emailSent: emailInfo.emailSent,
          smsSent: emailInfo.smsSent,
          details: emailInfo.emailDetails || null,
          errors: {
            email: emailInfo.emailError || null,
            sms: emailInfo.smsError || null
          }
        }
      });
      
    } catch (error) {
      console.error(`[STATUS UPDATE] ❌ Kritična greška pri ažuriranju statusa servisa #${serviceId}:`, error);
      res.status(500).json({ 
        error: "Greška pri ažuriranju statusa servisa",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Dodatni endpoint za quick status update (legacy)
  app.put("/api/services/:id/quick-status", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { status } = req.body;
      
      console.log(`[QUICK STATUS] Brzo ažuriranje statusa servisa #${serviceId} u "${status}"`);
      
      // Pozovi glavni status update endpoint
      const response = await fetch(`${req.protocol}://${req.get('host')}/api/services/${serviceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        const result = await response.json();
        res.json(result);
      } else {
        const error = await response.json();
        res.status(response.status).json(error);
      }
    } catch (error) {
      console.error(`[QUICK STATUS] Greška:`, error);
      res.status(500).json({ error: "Greška pri brzom ažuriranju statusa" });
    }
  });

  // Service equipment details endpoint (legacy)
  app.get("/api/services/:id/equipment", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const service = await storage.getService(serviceId);
      
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }

      // Get appliance details
      const appliance = service.applianceId ? await storage.getAppliance(service.applianceId) : null;
      const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
      const manufacturer = appliance ? await storage.getManufacturer(appliance.manufacturerId) : null;

      res.json({
        appliance: appliance ? {
          ...appliance,
          category: category,
          manufacturer: manufacturer
        } : null
      });
    } catch (error) {
      console.error("[EQUIPMENT DETAILS] Greška:", error);
      res.status(500).json({ error: "Greška pri dohvatanju detalja opreme" });
    }
  });

  // Service notifications endpoint (legacy)
  app.get("/api/services/:id/notifications", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const notifications = await storage.getNotificationsByService(serviceId);
      res.json(notifications);
    } catch (error) {
      console.error("[SERVICE NOTIFICATIONS] Greška:", error);
      res.status(500).json({ error: "Greška pri dohvatanju obaveštenja" });
    }
  });

  // Legacy completion endpoint  
  app.post("/api/services/:id/complete", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { notes, cost } = req.body;
      
      // Call main status update endpoint
      const response = await fetch(`${req.protocol}://${req.get('host')}/api/services/${serviceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify({ 
          status: 'completed',
          technicianNotes: notes,
          cost: cost
        })
      });

      if (response.ok) {
        const result = await response.json();
        res.json(result);
      } else {
        const error = await response.json();
        res.status(response.status).json(error);
      }
    } catch (error) {
      console.error("[LEGACY COMPLETE] Greška:", error);
      res.status(500).json({ error: "Greška pri završavanju servisa" });
    }
  });

  // Maintenance Schedules Routes
  app.get("/api/maintenance-schedules", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const schedules = await storage.getMaintenanceSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("[MAINTENANCE SCHEDULES] Greška:", error);
      res.status(500).json({ error: "Greška pri dohvatanju schedule-a" });
    }
  });

  app.post("/api/maintenance-schedules", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const newSchedule = await storage.createMaintenanceSchedule(req.body);
      res.json(newSchedule);
    } catch (error) {
      console.error("[CREATE MAINTENANCE SCHEDULE] Greška:", error);
      res.status(500).json({ error: "Greška pri kreiranju schedule-a" });
    }
  });

  // Spare Parts Routes
  app.get("/api/spare-parts", jwtAuth, async (req, res) => {
    try {
      const spareParts = await storage.getAllSpareParts();
      res.json(spareParts);
    } catch (error) {
      console.error("[SPARE PARTS] Greška:", error);
      res.status(500).json({ error: "Greška pri dohvatanju rezervnih delova" });
    }
  });

  app.post("/api/spare-parts/order", jwtAuth, async (req, res) => {
    try {
      const { serviceId, partName, quantity, description, urgency } = req.body;
      
      const newOrder = await storage.createSparePartOrder({
        serviceId,
        partName,
        quantity,
        description,
        urgency: urgency || 'normal',
        status: 'pending',
        requestedBy: req.user.userId,
        requestedAt: new Date()
      });

      // Professional email notification system
      try {
        const { ProfessionalEmailNotificationService } = await import('./professional-email-notification-service.js');
        const emailService = new ProfessionalEmailNotificationService();
        
        const service = await storage.getService(serviceId);
        if (service) {
          await emailService.sendSparePartOrderNotification({
            serviceId,
            partName,
            quantity,
            description,
            urgency,
            service
          });
        }
      } catch (emailError) {
        console.error('[EMAIL] Greška pri slanju obaveštenja:', emailError);
      }

      res.json(newOrder);
    } catch (error) {
      console.error("[ORDER SPARE PARTS] Greška:", error);
      res.status(500).json({ error: "Greška pri naručivanju rezervnih delova" });
    }
  });

  // === BUSINESS PARTNER MESSAGING SYSTEM ===
  
  // Get all business partner messages (admin)
  app.get("/api/admin/business-partner-messages", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const messages = await db.query.businessPartnerMessages.findMany({
        with: {
          businessPartner: {
            columns: {
              fullName: true,
              email: true,
              companyName: true
            }
          }
        },
        orderBy: (messages, { desc }) => [desc(messages.createdAt)]
      });
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching business partner messages for admin:", error);
      res.status(500).json({ error: "Greška pri dohvatanju poruka" });
    }
  });

  // Create new message to business partner (admin)
  app.post("/api/admin/business-partner-messages", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { businessPartnerId, subject, content, messageType, priority } = req.body;
      
      if (!businessPartnerId || !subject?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "BusinessPartnerId, subject i content su obavezni" });
      }

      // Get business partner info
      const businessPartner = await storage.getUser(businessPartnerId);
      if (!businessPartner || businessPartner.role !== 'business_partner') {
        return res.status(400).json({ error: "Nevaljan business partner" });
      }

      // Get admin info
      const admin = await storage.getUser(req.user.id);
      
      const newMessage = await db.insert(schema.businessPartnerMessages)
        .values({
          businessPartnerId: businessPartnerId,
          subject: subject.trim(),
          content: content.trim(),
          messageType: messageType || 'update',
          priority: priority || 'normal',
          status: 'unread',
          isStarred: false,
          senderName: admin?.fullName || 'Administrator',
          senderEmail: admin?.email || 'admin@frigosistemtodosijevic.me',
          senderCompany: 'Frigo Sistem Todosijević',
          senderPhone: admin?.phone || '067077092',
          relatedServiceId: null,
          relatedClientName: null,
          attachments: null,
          adminResponse: null,
          adminRespondedAt: null,
          adminRespondedBy: null
        })
        .returning();
      
      res.json(newMessage[0]);
    } catch (error) {
      console.error("Error creating admin message to business partner:", error);
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ error: "Greška pri kreiranju poruke" });
    }
  });

  // Reply to business partner message (admin)
  app.post("/api/admin/business-partner-messages/:id/reply", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { reply } = req.body;
      
      if (!reply?.trim()) {
        return res.status(400).json({ error: "Odgovor je obavezan" });
      }

      // Mark original message as read and update with admin response
      await db.update(schema.businessPartnerMessages)
        .set({ 
          status: 'read',
          adminResponse: reply.trim(),
          adminRespondedAt: new Date(),
          adminRespondedBy: req.user.id,
          updatedAt: new Date()
        })
        .where(eq(schema.businessPartnerMessages.id, messageId));
      
      res.json({ success: true, message: "Odgovor je uspešno poslat" });
    } catch (error) {
      console.error("Error replying to business partner message:", error);
      res.status(500).json({ error: "Greška pri slanju odgovora" });
    }
  });
  
  // Get business partner messages
  app.get("/api/business/messages", jwtAuth, requireRole(['business_partner', 'business']), async (req, res) => {
    try {
      const messages = await db.select()
        .from(schema.businessPartnerMessages)
        .where(eq(schema.businessPartnerMessages.businessPartnerId, req.user.id))
        .orderBy(desc(schema.businessPartnerMessages.createdAt));
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching business partner messages:", error);
      res.status(500).json({ error: "Greška pri dohvatanju poruka" });
    }
  });

  // Send new message from business partner to admin
  app.post("/api/business/messages", jwtAuth, requireRole(['business_partner', 'business']), async (req, res) => {
    try {
      const { subject, content, messageType, messagePriority } = req.body;
      
      if (!subject?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "Naslov i sadržaj poruke su obavezni" });
      }

      // Get business partner user info
      const businessPartner = await db.query.users.findFirst({
        where: eq(schema.users.id, req.user.id)
      });

      if (!businessPartner) {
        return res.status(404).json({ error: "Business partner nije pronađen" });
      }
      
      const newMessage = await db.insert(schema.businessPartnerMessages).values({
        businessPartnerId: req.user.id,
        subject: subject.trim(),
        content: content.trim(),
        messageType: messageType || 'inquiry',
        priority: messagePriority || 'normal',
        status: 'unread',
        senderName: businessPartner.fullName || 'Unknown',
        senderEmail: businessPartner.email,
        senderCompany: businessPartner.companyName || 'Unknown Company',
        senderPhone: businessPartner.phone,
        isStarred: false
      }).returning();
      
      res.json(newMessage[0]);
    } catch (error) {
      console.error("Error creating business partner message:", error);
      res.status(500).json({ error: "Greška pri slanju poruke" });
    }
  });

  // Mark message as read (business partner)
  app.patch("/api/business/messages/:id/read", jwtAuth, requireRole(['business_partner', 'business']), async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      
      // Verify ownership
      const message = await db.query.businessPartnerMessages.findFirst({
        where: (messages, { eq, and }) => and(
          eq(messages.id, messageId),
          eq(messages.businessPartnerId, req.user.id)
        )
      });
      
      if (!message) {
        return res.status(404).json({ error: "Poruka nije pronađena" });
      }
      
      await db.update(schema.businessPartnerMessages)
        .set({ status: 'read' })
        .where(eq(schema.businessPartnerMessages.id, messageId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Greška pri označavanju poruke kao pročitana" });
    }
  });

  // COM PLUS ENDPOINTS - Specijalizovani panel za Com Plus brendove
  const COM_PLUS_BRANDS = ["Electrolux", "Elica", "Candy", "Hoover", "Turbo Air"];

  // Get Com Plus services (admin and complus_admin only)
  app.get("/api/complus/services", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin" && req.user.role !== "complus_admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const { status, brand, warranty } = req.query;
      
      console.log(`🏭 COM PLUS: Dohvatam Com Plus servise sa JOIN query-jem`);
      
      // Direct query sa JOIN da dobijemo manufacturerName
      const complusServicesQuery = await db
        .select({
          id: schema.services.id,
          clientId: schema.services.clientId,
          applianceId: schema.services.applianceId,
          technicianId: schema.services.technicianId,
          businessPartnerId: schema.services.businessPartnerId,
          description: schema.services.description,
          status: schema.services.status,
          warrantyStatus: schema.services.warrantyStatus,
          scheduledDate: schema.services.scheduledDate,
          completedDate: schema.services.completedDate,
          cost: schema.services.cost,
          technicianNotes: schema.services.technicianNotes,
          createdAt: schema.services.createdAt,
          usedParts: schema.services.usedParts,
          machineNotes: schema.services.machineNotes,
          // Related data
          clientName: schema.clients.fullName,
          clientContact: schema.clients.phone,
          clientLocation: schema.clients.city,
          applianceInfo: schema.applianceCategories.name,
          manufacturerName: schema.manufacturers.name,
          technicianName: schema.technicians.fullName,
          businessPartnerName: schema.users.fullName
        })
        .from(schema.services)
        .leftJoin(schema.clients, eq(schema.services.clientId, schema.clients.id))
        .leftJoin(schema.appliances, eq(schema.services.applianceId, schema.appliances.id))
        .leftJoin(schema.applianceCategories, eq(schema.appliances.categoryId, schema.applianceCategories.id))
        .leftJoin(schema.manufacturers, eq(schema.appliances.manufacturerId, schema.manufacturers.id))
        .leftJoin(schema.technicians, eq(schema.services.technicianId, schema.technicians.id))
        .leftJoin(schema.users, eq(schema.services.businessPartnerId, schema.users.id))
        .where(inArray(schema.manufacturers.name, COM_PLUS_BRANDS))
        .orderBy(desc(schema.services.createdAt));

      let complusServices = complusServicesQuery;
      console.log(`🏭 COM PLUS: Pronađeno ${complusServices.length} Com Plus servisa`);

      // Apply additional filters
      if (status && status !== "all") {
        complusServices = complusServices.filter((service: any) => service.status === status);
      }
      
      if (brand && brand !== "all") {
        complusServices = complusServices.filter((service: any) => service.manufacturerName === brand);
      }
      
      if (warranty && warranty !== "all") {
        // Mapiranje iz srpskih naziva u database vrednosti
        const warrantyMapping: Record<string, string> = {
          "u garanciji": "in_warranty",
          "van garancije": "out_of_warranty"
        };
        const dbWarranty = warrantyMapping[warranty as string] || warranty;
        complusServices = complusServices.filter((service: any) => service.warrantyStatus === dbWarranty);
      }

      console.log(`🏭 COM PLUS: Nakon filtriranja ${complusServices.length} servisa`);
      res.json(complusServices);
    } catch (error) {
      console.error("Error fetching Com Plus services:", error);
      res.status(500).json({ error: "Greška pri dohvatanju Com Plus servisa" });
    }
  });

  // System health endpoint
  app.get("/health", (req, res) => {
    res.json({ 
      status: "OK", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime() 
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "OK", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime() 
    });
  });

  return app;
};
