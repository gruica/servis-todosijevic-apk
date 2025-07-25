import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, comparePassword } from "./auth";
// import { registerBusinessPartnerRoutes } from "./business-partner-routes"; // Disabled - using JWT endpoints instead
import { emailService } from "./email-service";
import { excelService } from "./excel-service";
import { generateToken, jwtAuthMiddleware, jwtAuth, requireRole } from "./jwt-auth";
import { insertClientSchema, insertServiceSchema, insertApplianceSchema, insertApplianceCategorySchema, insertManufacturerSchema, insertTechnicianSchema, insertUserSchema, serviceStatusEnum, insertMaintenanceScheduleSchema, insertMaintenanceAlertSchema, maintenanceFrequencyEnum, insertSparePartOrderSchema, sparePartUrgencyEnum, sparePartStatusEnum, sparePartWarrantyStatusEnum, insertRemovedPartSchema } from "@shared/schema";
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
import { createSMSMobileAPIRoutes } from './sms-mobile-api-routes';
import { SMSCommunicationService } from './sms-communication-service';
// SMS mobile functionality has been completely removed

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

export async function registerRoutes(app: Express): Promise<Server> {
  // setupAuth se poziva u server/index.ts pre CORS middleware-a
  const server = createServer(app);
  
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
  // registerBusinessPartnerRoutes(app); // Disabled - using JWT endpoints instead

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
      res.status(500).json({ error: "Greška pri kreiranju klijenta", message: error.message });
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
      res.status(500).json({ error: "Greška pri brisanju klijenta", message: error.message });
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
      res.status(500).json({ error: "Greška pri dobijanju kategorija uređaja", details: error.message });
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
                  updatedService.warrantyStatus
                );
                
                if (clientEmailSent) {
                  console.log(`[EMAIL SISTEM] ✅ Uspešno poslato obaveštenje klijentu ${client.fullName}`);
                  emailInfo.emailSent = true;
                  
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
        pickupNotes
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
        pickupNotes: pickupNotes !== undefined ? pickupNotes : service.pickupNotes
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
              
              // Poboljšan sadržaj emaila koji sadrži više detalja
              const clientEmailContent = technicianNotes || service.description || "";
              const clientEmailSent = await emailService.sendServiceStatusUpdate(
                client, 
                serviceId,
                statusDescription,
                clientEmailContent,
                technicianName,
                updatedService.warrantyStatus
              );
              
              if (clientEmailSent) {
                console.log(`[EMAIL SISTEM] ✅ Uspešno poslato obaveštenje klijentu ${client.fullName}`);
                emailInfo.emailSent = true; // Označava da je email uspešno poslat
                
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
                const settings = await storage.getSystemSettings();
                const smsConfig = {
                  apiKey: settings.sms_mobile_api_key || '',
                  baseUrl: settings.sms_mobile_base_url || 'https://api.smsmobileapi.com',
                  senderId: settings.sms_mobile_sender_id || 'FRIGO SISTEM',
                  enabled: settings.sms_mobile_enabled === 'true'
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
            businessPartnerPhone: businessPartner?.phone,
            businessPartnerName: businessPartner?.fullName
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
  
  // Technicians routes
  app.get("/api/technicians", async (req, res) => {
    try {
      const technicians = await storage.getAllTechnicians();
      res.json(technicians);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju servisera" });
    }
  });

  app.get("/api/technicians/:id", async (req, res) => {
    try {
      const technician = await storage.getTechnician(parseInt(req.params.id));
      if (!technician) return res.status(404).json({ error: "Serviser nije pronađen" });
      res.json(technician);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju servisera" });
    }
  });

  app.post("/api/technicians", async (req, res) => {
    try {
      const validatedData = insertTechnicianSchema.parse(req.body);
      const technician = await storage.createTechnician(validatedData);
      res.status(201).json(technician);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci servisera", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri kreiranju servisera" });
    }
  });

  app.put("/api/technicians/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTechnicianSchema.parse(req.body);
      const updatedTechnician = await storage.updateTechnician(id, validatedData);
      if (!updatedTechnician) return res.status(404).json({ error: "Serviser nije pronađen" });
      res.json(updatedTechnician);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci servisera", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri ažuriranju servisera" });
    }
  });
  
  app.get("/api/technicians/:technicianId/services", async (req, res) => {
    try {
      const services = await storage.getServicesByTechnician(parseInt(req.params.technicianId));
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju servisa servisera" });
    }
  });
  
  // Users management routes - JWT protected
  app.get("/api/users", jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      console.log("GET /api/users - Admin request for all users");
      
      // Get all users but don't return their passwords
      const users = await Promise.all(
        Array.from((await storage.getAllUsers()) || []).map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })
      );
      
      console.log(`Returning ${users.length} users to admin`);
      res.json(users);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ error: "Greška pri dobijanju korisnika" });
    }
  });
  
  // Endpoint za dobijanje neverifikovanih korisnika - JWT protected
  app.get("/api/users/unverified", jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      console.log("GET /api/users/unverified - Admin request for unverified users");
      console.log(`JWT user: ${req.user?.username} (role: ${req.user?.role})`);
      
      // Dobavimo sve neverifikovane korisnike
      console.log("Fetching unverified users from database...");
      const rawUsers = await storage.getUnverifiedUsers();
      console.log(`Found ${rawUsers.length} unverified users in database`);
      
      // Isključimo lozinku iz odgovora
      const unverifiedUsers = rawUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      console.log(`Returning ${unverifiedUsers.length} unverified users to admin`);
      res.json(unverifiedUsers);
    } catch (error) {
      console.error("Error getting unverified users:", error);
      res.status(500).json({ 
        error: "Greška pri dobijanju neverifikovanih korisnika", 
        message: "Došlo je do interne greške pri dobijanju liste neverifikovanih korisnika."
      });
    }
  });
  
  // Endpoint za verifikaciju korisnika - JWT protected
  app.post("/api/users/:id/verify", jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`Pokušaj verifikacije korisnika sa ID ${req.params.id}`);
      console.log(`JWT Admin user: ${req.user?.username} (ID: ${req.user?.userId})`);
      
      // JWT middleware already validated admin role
      
      const userId = parseInt(req.params.id);
      const adminId = req.user.userId;
      
      console.log(`Administrator ${adminId} (${req.user.username}) verifikuje korisnika ${userId}`);
      
      // Pozivamo metodu za verifikaciju korisnika
      const verifiedUser = await storage.verifyUser(userId, adminId);
      
      // Ako korisnik nije pronađen, vraćamo grešku
      if (!verifiedUser) {
        console.log(`Korisnik sa ID ${userId} nije pronađen`);
        return res.status(404).json({ 
          error: "Korisnik nije pronađen", 
          message: "Korisnik sa zadatim ID-om nije pronađen u sistemu."
        });
      }
      
      console.log(`Korisnik ${verifiedUser.username} (ID: ${verifiedUser.id}) uspešno verifikovan`);
      
      // Isključimo lozinku iz odgovora
      const { password, ...userWithoutPassword } = verifiedUser;
      
      // Obaveštavamo korisnika email-om o verifikaciji
      if (verifiedUser.email) {
        try {
          console.log(`Slanje email potvrde o verifikaciji na ${verifiedUser.email}`);
          await emailService.sendVerificationConfirmation(
            verifiedUser.email,
            verifiedUser.fullName
          );
          console.log("Email potvrde uspešno poslat");
        } catch (emailError) {
          console.error("Greška pri slanju email-a o verifikaciji:", emailError);
          // Ne prekidamo proces verifikacije ako email ne može biti poslat
        }
      } else {
        console.log("Korisnik nema email adresu, preskačem slanje potvrde.");
      }
      
      // Vraćamo uspešan odgovor - vraćamo user direktno umesto nested u data field
      console.log("Vraćam odgovor sa podacima korisnika");
      res.json({
        success: true,
        message: "Korisnik je uspešno verifikovan",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Greška pri verifikaciji korisnika:", error);
      res.status(500).json({ 
        error: "Greška pri verifikaciji korisnika", 
        message: "Došlo je do interne greške pri verifikaciji korisnika."
      });
    }
  });
  
  app.post("/api/users", jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      console.log("POST /api/users - Admin creating new user");
      console.log(`JWT Admin: ${req.user?.username} (ID: ${req.user?.userId})`);
      
      // JWT middleware already validated admin role
      
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Korisničko ime već postoji" });
      }
      
      // If creating a technician user, verify the technician exists
      if (userData.role === "technician" && userData.technicianId) {
        const technician = await storage.getTechnician(userData.technicianId);
        if (!technician) {
          return res.status(404).json({ error: "Serviser nije pronađen" });
        }
      }
      
      const newUser = await storage.createUser(userData);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci korisnika", details: error.format() });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Greška pri kreiranju korisnika" });
    }
  });
  
  app.put("/api/users/:id", jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`PUT /api/users/${req.params.id} - Admin updating user`);
      console.log(`JWT Admin: ${req.user?.username} (ID: ${req.user?.userId})`);
      
      // JWT middleware already validated admin role
      
      const userId = parseInt(req.params.id);
      const existingUser = await storage.getUser(userId);
      
      if (!existingUser) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      
      // Parse the update data (with all fields optional except username)
      const updateData = insertUserSchema
        .omit({ password: true })
        .extend({ password: z.string().optional() })
        .parse(req.body);
      
      // If username is changing, check if it's already taken
      if (updateData.username !== existingUser.username) {
        const existingUserWithUsername = await storage.getUserByUsername(updateData.username);
        if (existingUserWithUsername) {
          return res.status(400).json({ error: "Korisničko ime već postoji" });
        }
      }
      
      // If role is technician and technicianId is provided, verify technician exists
      if (updateData.role === "technician" && updateData.technicianId) {
        const technician = await storage.getTechnician(updateData.technicianId);
        if (!technician) {
          return res.status(404).json({ error: "Serviser nije pronađen" });
        }
      }
      
      // Update the user
      let updateUserData: any = {
        ...existingUser,
        username: updateData.username,
        fullName: updateData.fullName,
        role: updateData.role,
        technicianId: updateData.technicianId
      };
      
      // Only update password if provided
      if (updateData.password) {
        updateUserData.password = updateData.password;
      }
      
      const updatedUser = await storage.updateUser(userId, updateUserData);
      if (!updatedUser) {
        return res.status(500).json({ error: "Greška pri ažuriranju korisnika" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci korisnika", details: error.format() });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Greška pri ažuriranju korisnika" });
    }
  });
  
  app.delete("/api/users/:id", jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`DELETE /api/users/${req.params.id} - Admin deleting user`);
      console.log(`JWT Admin: ${req.user?.username} (ID: ${req.user?.userId})`);
      
      // JWT middleware already validated admin role
      
      const userId = parseInt(req.params.id);
      
      // Don't allow deleting yourself
      if (req.user?.id === userId) {
        return res.status(400).json({ error: "Ne možete izbrisati svoj korisnički nalog" });
      }
      
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      
      res.status(200).json({ message: "Korisnik uspješno izbrisan" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Greška pri brisanju korisnika" });
    }
  });
  
  // Routes for technician users
  app.get("/api/technician-profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Potrebna je prijava" });
      }
      
      // Check if the user is a technician
      if (req.user?.role !== "technician" || !req.user?.technicianId) {
        return res.status(403).json({ error: "Pristup dozvoljen samo serviserima" });
      }
      
      // Get the technician details
      const technician = await storage.getTechnician(req.user.technicianId);
      if (!technician) {
        return res.status(404).json({ error: "Serviser nije pronađen" });
      }
      
      res.json(technician);
    } catch (error) {
      console.error("Error getting technician profile:", error);
      res.status(500).json({ error: "Greška pri dobijanju profila servisera" });
    }
  });
  
  // Helper function for technician services logic
  const getTechnicianServices = async (req: Request, res: Response) => {
    try {
      // Obavezno staviti req.isAuthenticated() ovde za proveru
      if (!req.isAuthenticated()) {
        console.log("Pristup api/my-services - korisnik nije prijavljen");
        return res.status(401).json({ error: "Potrebna je prijava" });
      }
      
      // Ispisati dodatne informacije za debugging
      console.log(`my-services API pristup - user: ${JSON.stringify(req.user || {})}`);
      
      // Check if the user is a technician
      if (req.user?.role !== "technician" || !req.user?.technicianId) {
        return res.status(403).json({ error: "Pristup dozvoljen samo serviserima" });
      }
      
      const technicianId = req.user.technicianId;
      console.log(`Dohvatanje servisa za servisera sa ID: ${technicianId}, korisnik: ${req.user.username}`);
      
      // Get all services assigned to this technician - koristimo direktno Drizzle query
      let services;
      try {
        // Direktno koristimo Drizzle query da zaobidemo storage cache probleme
        const dbServices = await db.select().from(schema.services).where(eq(schema.services.technicianId, technicianId));
        console.log(`Pronađeno ${dbServices.length} servisa direktno iz baze za servisera ${technicianId}`);
        services = dbServices;
      } catch (dbError) {
        console.error("Greška pri Drizzle query:", dbError);
        // Fallback na storage ako Drizzle ne radi
        services = await storage.getServicesByTechnician(technicianId);
        console.log(`Fallback: Pronađeno ${services.length} servisa kroz storage za servisera ${technicianId}`);
      }
      
      // Get client and appliance data for each service
      const servicesWithDetails = await Promise.all(services.map(async (service) => {
        const client = await storage.getClient(service.clientId);
        const appliance = await storage.getAppliance(service.applianceId);
        
        let applianceCategory = null;
        if (appliance && appliance.categoryId) {
          applianceCategory = await storage.getApplianceCategory(appliance.categoryId);
        }
        
        return {
          ...service,
          client,
          appliance: appliance ? {
            ...appliance,
            category: applianceCategory
          } : null
        };
      }));
      
      console.log(`Vraćam ${servicesWithDetails.length} servisa sa detaljima za servisera ${technicianId}`);
      res.json(servicesWithDetails);
    } catch (error) {
      console.error("Error getting technician services:", error);
      res.status(500).json({ error: "Greška pri dobijanju servisa" });
    }
  };

  // Get services for the logged-in technician (legacy endpoint)
  // JWT-based technician services endpoint
  app.get("/api/my-services", jwtAuthMiddleware, requireRole("technician"), async (req, res) => {
    try {
      const user = (req as any).user;
      console.log(`JWT: NOVO! Fetching services for technician ${user.username} (ID: ${user.id})`);
      
      // Get user details to find technician ID
      const fullUser = await storage.getUser(user.id);
      if (!fullUser || !fullUser.technicianId) {
        console.log(`JWT: User ${user.username} has no technicianId`);
        return res.status(400).json({ error: "Korisnik nije serviser" });
      }
      
      const technicianId = fullUser.technicianId;
      console.log(`JWT: Fetching services for technician ID ${technicianId}`);
      
      // Get all services assigned to this technician - using direct Drizzle query for fresh data
      console.log(`JWT: About to execute direct Drizzle query for technician ${technicianId}`);
      let services;
      try {
        // Direct Drizzle query to bypass storage cache
        console.log(`JWT: Executing db.select().from(schema.services).where(eq(schema.services.technicianId, ${technicianId}))`);
        const dbServices = await db.select().from(schema.services).where(eq(schema.services.technicianId, technicianId)).orderBy(desc(schema.services.createdAt));
        console.log(`JWT: DRIZZLE SUCCESS - Found ${dbServices.length} services directly from DB for technician ${technicianId}`);
        
        // Debug: show service IDs from direct query
        const serviceIds = dbServices.map(s => s.id);
        console.log(`JWT: Direct query service IDs: [${serviceIds.join(', ')}]`);
        
        services = dbServices;
      } catch (dbError) {
        console.error("JWT: DRIZZLE ERROR:", dbError);
        // Fallback to storage if Drizzle fails
        console.log(`JWT: Falling back to storage.getServicesByTechnician(${technicianId})`);
        services = await storage.getServicesByTechnician(technicianId);
        console.log(`JWT: Fallback found ${services.length} services via storage for technician ${technicianId}`);
      }
      
      // Add client and appliance details to each service
      const servicesWithDetails = await Promise.all(services.map(async (service) => {
        const client = await storage.getClient(service.clientId);
        const appliance = await storage.getAppliance(service.applianceId);
        
        let applianceCategory = null;
        if (appliance && appliance.categoryId) {
          applianceCategory = await storage.getApplianceCategory(appliance.categoryId);
        }
        
        return {
          ...service,
          client,
          appliance: appliance ? {
            ...appliance,
            category: applianceCategory
          } : null
        };
      }));
      
      console.log(`JWT: Returning ${servicesWithDetails.length} services with details for technician ${user.username}`);
      res.json(servicesWithDetails);
    } catch (error) {
      console.error("JWT: Error fetching technician services:", error);
      res.status(500).json({ error: "Greška pri dobijanju servisa" });
    }
  });

  // Get services for the logged-in technician (new endpoint)
  app.get("/api/technician/services", getTechnicianServices);

  // Dashboard stats route
  app.get("/api/stats", async (req, res) => {
    try {
      const activeServices = await storage.getServicesByStatus("in_progress");
      const completedServices = await storage.getServicesByStatus("completed");
      const pendingServices = await storage.getServicesByStatus("pending");
      const clients = await storage.getAllClients();
      const applianceStats = await storage.getApplianceStats();
      const technicians = await storage.getAllTechnicians();
      // Get upcoming maintenance for next 7 days
      const upcomingMaintenance = await storage.getUpcomingMaintenanceSchedules(7);
      const unreadAlerts = await storage.getUnreadMaintenanceAlerts();
  
      res.json({
        activeCount: activeServices.length,
        completedCount: completedServices.length,
        pendingCount: pendingServices.length,
        clientCount: clients.length,
        recentServices: await storage.getRecentServices(5),
        recentClients: await storage.getRecentClients(3),
        technicianCount: technicians.length,
        applianceStats,
        upcomingMaintenanceCount: upcomingMaintenance.length,
        unreadAlertsCount: unreadAlerts.length
      });
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju statistike" });
    }
  });

  // Maintenance Schedule routes
  app.get("/api/maintenance-schedules", async (req, res) => {
    try {
      const schedules = await storage.getAllMaintenanceSchedules();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju planova održavanja" });
    }
  });

  app.get("/api/maintenance-schedules/:id", async (req, res) => {
    try {
      const schedule = await storage.getMaintenanceSchedule(parseInt(req.params.id));
      if (!schedule) return res.status(404).json({ error: "Plan održavanja nije pronađen" });
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju plana održavanja" });
    }
  });

  app.get("/api/appliances/:applianceId/maintenance-schedules", async (req, res) => {
    try {
      const schedules = await storage.getMaintenanceSchedulesByAppliance(parseInt(req.params.applianceId));
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju planova održavanja za uređaj" });
    }
  });

  app.get("/api/maintenance-schedules/upcoming/:days", async (req, res) => {
    try {
      const days = parseInt(req.params.days);
      if (isNaN(days)) {
        return res.status(400).json({ error: "Broj dana mora biti broj" });
      }
      
      const schedules = await storage.getUpcomingMaintenanceSchedules(days);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju nadolazećih planova održavanja" });
    }
  });

  app.post("/api/maintenance-schedules", async (req, res) => {
    try {
      const validatedData = insertMaintenanceScheduleSchema.parse(req.body);
      const schedule = await storage.createMaintenanceSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci plana održavanja", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri kreiranju plana održavanja" });
    }
  });

  app.put("/api/maintenance-schedules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMaintenanceScheduleSchema.parse(req.body);
      const updatedSchedule = await storage.updateMaintenanceSchedule(id, validatedData);
      if (!updatedSchedule) return res.status(404).json({ error: "Plan održavanja nije pronađen" });
      res.json(updatedSchedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci plana održavanja", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri ažuriranju plana održavanja" });
    }
  });

  app.delete("/api/maintenance-schedules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMaintenanceSchedule(id);
      if (!success) return res.status(404).json({ error: "Plan održavanja nije pronađen" });
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Greška pri brisanju plana održavanja" });
    }
  });

  // Napomena: Ovde je bila dupla email-settings ruta koja je uklonjena
  
  // Napomena: Ovde je bio duplirani test-email endpoint koji je uklonjen
  
  // Maintenance Alert routes
  app.get("/api/maintenance-alerts", async (req, res) => {
    try {
      const alerts = await storage.getAllMaintenanceAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju obaveštenja o održavanju" });
    }
  });

  app.get("/api/maintenance-alerts/unread", async (req, res) => {
    try {
      const alerts = await storage.getUnreadMaintenanceAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju nepročitanih obaveštenja" });
    }
  });

  app.get("/api/maintenance-alerts/:id", async (req, res) => {
    try {
      const alert = await storage.getMaintenanceAlert(parseInt(req.params.id));
      if (!alert) return res.status(404).json({ error: "Obaveštenje nije pronađeno" });
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju obaveštenja" });
    }
  });

  app.get("/api/maintenance-schedules/:scheduleId/alerts", async (req, res) => {
    try {
      const alerts = await storage.getMaintenanceAlertsBySchedule(parseInt(req.params.scheduleId));
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju obaveštenja za plan održavanja" });
    }
  });

  app.post("/api/maintenance-alerts", async (req, res) => {
    try {
      const validatedData = insertMaintenanceAlertSchema.parse(req.body);
      const alert = await storage.createMaintenanceAlert(validatedData);
      res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci obaveštenja", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri kreiranju obaveštenja" });
    }
  });

  app.put("/api/maintenance-alerts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMaintenanceAlertSchema.parse(req.body);
      const updatedAlert = await storage.updateMaintenanceAlert(id, validatedData);
      if (!updatedAlert) return res.status(404).json({ error: "Obaveštenje nije pronađeno" });
      res.json(updatedAlert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci obaveštenja", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri ažuriranju obaveštenja" });
    }
  });

  app.delete("/api/maintenance-alerts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMaintenanceAlert(id);
      if (!success) return res.status(404).json({ error: "Obaveštenje nije pronađeno" });
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Greška pri brisanju obaveštenja" });
    }
  });

  app.post("/api/maintenance-alerts/:id/mark-read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const alert = await storage.markMaintenanceAlertAsRead(id);
      if (!alert) return res.status(404).json({ error: "Obaveštenje nije pronađeno" });
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Greška pri označavanju obaveštenja kao pročitanog" });
    }
  });

  // Email settings routes
  app.post("/api/email-settings", async (req, res) => {
    try {
      // Proveri da li je korisnik admin
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za upravljanje email postavkama" });
      }

      const validatedData = emailSettingsSchema.parse(req.body);
      
      // Postavi email konfiguraciju
      emailService.setSmtpConfig({
        host: validatedData.host,
        port: validatedData.port,
        secure: validatedData.secure,
        auth: {
          user: validatedData.user,
          pass: validatedData.password,
        }
      });
      
      res.status(200).json({ success: true, message: "Email postavke su uspešno sačuvane" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Nevažeće email postavke", 
          details: error.format() 
        });
      }
      console.error("Greška pri čuvanju email postavki:", error);
      res.status(500).json({ 
        error: "Greška pri čuvanju email postavki", 
        message: error instanceof Error ? error.message : "Nepoznata greška"
      });
    }
  });
  
  // Unapređena ruta za slanje test email-a sa detaljnijim izveštajem
  app.post("/api/send-test-email", async (req, res) => {
    try {
      // Proveri da li je korisnik admin
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za slanje test email-a" });
      }

      const { recipient } = testEmailSchema.parse(req.body);
      
      // Pripremi detaljan izveštaj
      const diagnosticInfo: any = {
        smtpConfig: null,
        connectionTest: false,
        emailSent: false,
        timestamp: new Date().toISOString(),
        errorInfo: null
      };
      
      // Dohvati trenutnu SMTP konfiguraciju (bez lozinke)
      const config = emailService.getSmtpConfig();
      if (config) {
        diagnosticInfo.smtpConfig = {
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: config.auth ? { user: config.auth.user } : null
        };
      } else {
        diagnosticInfo.errorInfo = "SMTP konfiguracija nije postavljena";
        return res.status(500).json({ 
          success: false, 
          error: "SMTP konfiguracija nije postavljena", 
          diagnosticInfo 
        });
      }
      
      // Verifikuj konekciju
      console.log(`[TEST EMAIL] Započinjem test slanja email-a na: ${recipient}`);
      console.log(`[TEST EMAIL] Prvo verifikujem SMTP konekciju...`);
      
      const isConnected = await emailService.verifyConnection();
      diagnosticInfo.connectionTest = isConnected;
      
      if (!isConnected) {
        diagnosticInfo.errorInfo = "Nije moguće konektovati se na SMTP server";
        return res.status(500).json({ 
          success: false, 
          error: "Nije moguće konektovati se na SMTP server", 
          diagnosticInfo 
        });
      }
      
      console.log(`[TEST EMAIL] SMTP konekcija uspešna, šaljem test email...`);
      
      // Pošalji test email sa unapređenim sadržajem
      const result = await emailService.sendEmail({
        to: recipient,
        subject: "Test email - Frigoservis Todosijević",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #0066cc;">Test email iz Frigoservis aplikacije</h2>
            <p>Poštovani,</p>
            <p>Ovo je test email poslat iz aplikacije za upravljanje servisima Frigo Sistema Todosijević.</p>
            <p>Ako vidite ovaj email, to znači da su SMTP postavke ispravno konfigurisane i da je sistem spreman za slanje obaveštenja.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>SMTP Server:</strong> ${config.host}</p>
              <p><strong>Port:</strong> ${config.port}</p>
              <p><strong>Sigurna veza:</strong> ${config.secure ? 'Da' : 'Ne'}</p>
              <p><strong>Email pošiljaoca:</strong> ${config.auth?.user || 'Nije postavljen'}</p>
              <p><strong>Vreme slanja:</strong> ${new Date().toLocaleString('sr-Latn-ME')}</p>
            </div>
            
            <p>Srdačan pozdrav,<br>Tim Frigo Sistema Todosijević</p>
            <hr style="border: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
              Frigo Sistem Todosijević<br>
              Kontakt telefon: 033 402 402<br>
              Email: info@frigosistemtodosijevic.com
            </p>
          </div>
        `
      }, 3); // Postavljamo 3 pokušaja za test email
      
      // Ažuriranje dijagnostičkih podataka
      diagnosticInfo.emailSent = result;
      
      if (result) {
        console.log(`[TEST EMAIL] ✓ Test email uspešno poslat na: ${recipient}`);
        
        return res.status(200).json({ 
          success: true, 
          message: "Test email je uspešno poslat", 
          diagnosticInfo 
        });
      } else {
        diagnosticInfo.errorInfo = "Greška pri slanju test email-a";
        
        console.error(`[TEST EMAIL] ✗ Greška pri slanju test email-a na: ${recipient}`);
        
        return res.status(500).json({ 
          success: false, 
          error: "Greška pri slanju test email-a", 
          diagnosticInfo 
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          error: "Nevažeća email adresa", 
          details: error.format() 
        });
      }
      
      console.error("[TEST EMAIL] Greška pri slanju test email-a:", error);
      const errorMessage = error instanceof Error ? error.message : "Nepoznata greška";
      
      return res.status(500).json({ 
        success: false,
        error: "Greška pri slanju test email-a", 
        message: errorMessage,
        stackTrace: error instanceof Error ? error.stack : undefined
      });
    }
  });
  
  // Get current email settings
  app.get("/api/email-settings", async (req, res) => {
    try {
      // Proveri da li je korisnik admin
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za pregled email postavki" });
      }
      
      // Dohvati trenutne postavke (bez lozinke)
      const config = emailService.getSmtpConfig();
      
      if (!config) {
        return res.status(200).json({ 
          configured: false
        });
      }
      
      res.status(200).json({
        configured: true,
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.auth?.user || ""
      });
    } catch (error) {
      console.error("Greška pri dobijanju email postavki:", error);
      res.status(500).json({ 
        error: "Greška pri dobijanju email postavki", 
        message: error instanceof Error ? error.message : "Nepoznata greška"
      });
    }
  });
  
  // Test slanja email-a (samo za administratore)
  app.post("/api/test-email", async (req, res) => {
    try {
      console.log("[TEST EMAIL] Zahtev za testiranje email-a primljen.");
      
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        console.log("[TEST EMAIL] Zahtev odbijen - korisnik nije administrator.");
        return res.status(403).json({ error: "Nemate dozvolu za testiranje email sistema" });
      }
      
      const { recipient } = testEmailSchema.parse(req.body);
      
      console.log(`[TEST EMAIL] Pokušavam poslati test email na: ${recipient}`);
      
      // Šaljemo test email
      const subject = "Test email iz Frigo Sistem aplikacije";
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">Test email</h2>
          <p>Poštovani,</p>
          <p>Ovo je test email poslat iz aplikacije za upravljanje servisima Frigo Sistema Todosijević.</p>
          <p>Ako ste primili ovaj email, to znači da je sistem za slanje emailova pravilno konfigurisan.</p>
          <p>Vreme slanja: ${new Date().toLocaleString('sr-ME')}</p>
          <hr style="border: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            Frigo Sistem Todosijević<br>
            Kontakt telefon: 033 402 402<br>
            Email: info@frigosistemtodosijevic.com
          </p>
        </div>
      `;
      
      const result = await emailService.sendEmail({
        to: recipient,
        subject,
        html
      }, 1); // Samo jedan pokušaj za testiranje
      
      if (result) {
        console.log(`[TEST EMAIL] ✅ Test email uspešno poslat na: ${recipient}`);
        // EMAIL OBAVEŠTENJA ZA ADMINISTRATORE ONEMOGUĆENA
        // Korisnik je zatražio da se iskljuće sva email obaveštenja za administratore
        console.log("[EMAIL] Admin obaveštenja onemogućena po zahtevu korisnika");
        return res.json({ success: true, message: "Test email uspešno poslat" });
      } else {
        console.error(`[TEST EMAIL] ❌ Neuspešno slanje test email-a na: ${recipient}`);
        return res.status(500).json({ 
          success: false, 
          error: "Neuspešno slanje test email-a. Proverite server logove za više detalja." 
        });
      }
    } catch (error) {
      console.error("[TEST EMAIL] Greška:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          error: "Nevažeća email adresa", 
          details: error.format() 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: "Greška pri slanju test email-a", 
        message: error instanceof Error ? error.message : "Nepoznata greška" 
      });
    }
  });

  // SQL Admin panel endpoint (DEPRECATED - Use Drizzle queries instead)
  app.post("/api/admin/execute-sql", async (req, res) => {
    try {
      // Provera da li je korisnik admin
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Samo administrator ima pristup SQL upravljaču" });
      }
      
      // SECURITY: This endpoint is deprecated due to SQL injection risk
      // Raw SQL queries should not be executed directly from user input
      return res.status(400).json({
        success: false,
        error: "SQL executor je onemogućen iz bezbednosnih razloga. Koristite Drizzle ORM upite umesto raw SQL-a.",
        deprecatedReason: "Raw SQL queries with user input pose SQL injection risk"
      });
    } catch (err) {
      const error = err as Error;
      console.error("SQL Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Nepoznata greška pri izvršavanju SQL upita"
      });
    }
  });

  // Podešavanje za upload fajlova
  const uploadStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(process.cwd(), 'uploads');
      // Kreiraj folder ako ne postoji
      fs.mkdir(uploadDir, { recursive: true })
        .then(() => cb(null, uploadDir))
        .catch(err => cb(err, uploadDir));
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ storage: uploadStorage });

  // Bulk SMS endpoint za masovno slanje SMS poruka
  app.post("/api/sms/bulk-send", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { type, message, phoneNumbers } = req.body;

      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Nedostaju brojevi telefona"
        });
      }

      // Inicijalizuj SMS servis ako nije inicijalizovan
      if (!smsService) {
        await initializeSMSService();
      }

      if (!smsService) {
        return res.status(500).json({
          success: false,
          error: "SMS servis nije dostupan"
        });
      }

      const results = [];

      for (const phone of phoneNumbers) {
        try {
          const result = await smsService.sendCustomMessage(phone, message);
          results.push({
            phone,
            success: result.success,
            messageId: result.messageId,
            error: result.error
          });
          
          // Pauza između SMS-ova
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          results.push({
            phone,
            success: false,
            error: error instanceof Error ? error.message : 'Nepoznata greška'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      console.log(`[BULK SMS] Poslato ${successCount}/${results.length} SMS poruka`);

      res.json({
        success: true,
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failCount
        }
      });

    } catch (error) {
      console.error("[BULK SMS] Greška:", error);
      res.status(500).json({
        success: false,
        error: "Greška pri slanju bulk SMS poruka",
        message: error instanceof Error ? error.message : "Nepoznata greška"
      });
    }
  });

  // Excel export endpoints
  app.get("/api/excel/clients", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      const buffer = await excelService.exportClients();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=klijenti.xlsx');
      res.setHeader('Content-Length', buffer.length);
      
      res.end(buffer);
    } catch (error) {
      console.error("Greška pri izvozu klijenata:", error);
      res.status(500).json({ error: "Greška pri izvozu klijenata" });
    }
  });

  app.get("/api/excel/technicians", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      const buffer = await excelService.exportTechnicians();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=serviseri.xlsx');
      res.setHeader('Content-Length', buffer.length);
      
      res.end(buffer);
    } catch (error) {
      console.error("Greška pri izvozu servisera:", error);
      res.status(500).json({ error: "Greška pri izvozu servisera" });
    }
  });

  app.get("/api/excel/appliances", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      const buffer = await excelService.exportAppliances();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=uredjaji.xlsx');
      res.setHeader('Content-Length', buffer.length);
      
      res.end(buffer);
    } catch (error) {
      console.error("Greška pri izvozu uređaja:", error);
      res.status(500).json({ error: "Greška pri izvozu uređaja" });
    }
  });

  app.get("/api/excel/services", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      const buffer = await excelService.exportServices();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=servisi.xlsx');
      res.setHeader('Content-Length', buffer.length);
      
      res.end(buffer);
    } catch (error) {
      console.error("Greška pri izvozu servisa:", error);
      res.status(500).json({ error: "Greška pri izvozu servisa" });
    }
  });

  app.get("/api/excel/maintenance", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      const buffer = await excelService.exportMaintenanceSchedules();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=odrzavanje.xlsx');
      res.setHeader('Content-Length', buffer.length);
      
      res.end(buffer);
    } catch (error) {
      console.error("Greška pri izvozu planova održavanja:", error);
      res.status(500).json({ error: "Greška pri izvozu planova održavanja" });
    }
  });

  // Excel import endpoints
  app.post("/api/excel/import/clients", upload.single('file'), async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "Nije priložen fajl" });
      }
      
      const buffer = await fs.readFile(req.file.path);
      const result = await excelService.importClients(buffer);
      
      // Obriši privremeni fajl
      fs.unlink(req.file.path).catch(err => console.error("Greška pri brisanju privremenog fajla:", err));
      
      res.json(result);
    } catch (error) {
      console.error("Greška pri uvozu klijenata:", error);
      res.status(500).json({ error: "Greška pri uvozu klijenata" });
    }
  });

  app.post("/api/excel/import/appliances", upload.single('file'), async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "Nije priložen fajl" });
      }
      
      const buffer = await fs.readFile(req.file.path);
      const result = await excelService.importAppliances(buffer);
      
      // Obriši privremeni fajl
      fs.unlink(req.file.path).catch(err => console.error("Greška pri brisanju privremenog fajla:", err));
      
      res.json(result);
    } catch (error) {
      console.error("Greška pri uvozu uređaja:", error);
      res.status(500).json({ error: "Greška pri uvozu uređaja" });
    }
  });

  app.post("/api/excel/import/services", upload.single('file'), async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "Nije priložen fajl" });
      }
      
      const buffer = await fs.readFile(req.file.path);
      const result = await excelService.importServices(buffer);
      
      // Obriši privremeni fajl
      fs.unlink(req.file.path).catch(err => console.error("Greška pri brisanju privremenog fajla:", err));
      
      res.json(result);
    } catch (error) {
      console.error("Greška pri uvozu servisa:", error);
      res.status(500).json({ error: "Greška pri uvozu servisa" });
    }
  });

  // Kompletna migracija iz starog sistema
  app.post("/api/excel/import/legacy-complete", upload.single('file'), async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "Nije priložen fajl" });
      }
      
      console.log("Kompletna migracija - početak obrade fajla:", req.file.filename);
      
      const buffer = await fs.readFile(req.file.path);
      
      // Debug: Analiziraj Excel fajl pre pozivanja importLegacyComplete
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log("=".repeat(60));
      console.log("🔍 DEBUG: ANALIZA EXCEL FAJLA");
      console.log("=".repeat(60));
      console.log("Sheet name:", sheetName);
      console.log("Total rows:", data.length);
      
      if (data.length > 0) {
        console.log("🔍 KOLONE U EXCEL TABELI:");
        console.log(Object.keys(data[0]));
        console.log("🔍 PRIMER PRVOG REDA:");
        console.log(JSON.stringify(data[0], null, 2));
        if (data.length > 1) {
          console.log("🔍 PRIMER DRUGOG REDA:");
          console.log(JSON.stringify(data[1], null, 2));
        }
      }
      console.log("=".repeat(60));
      
      const result = await excelService.importLegacyComplete(buffer);
      
      console.log("Kompletna migracija - rezultat:", {
        total: result.total,
        imported: result.imported,
        failed: result.failed,
        summary: result.summary
      });
      
      // Obriši privremeni fajl
      fs.unlink(req.file.path).catch(err => console.error("Greška pri brisanju privremenog fajla:", err));
      
      res.json(result);
    } catch (error) {
      console.error("Greška pri kompletnoj migraciji:", error);
      console.error("Stack trace:", error instanceof Error ? error.stack : 'Nema stack trace');
      res.status(500).json({ 
        error: "Greška pri kompletnoj migraciji iz starog sistema",
        details: error instanceof Error ? error.message : 'Nepoznata greška'
      });
    }
  });
  
  // Korisničke API rute
  // Dohvatanje servisa za korisnika po userId
  // Ruta za dobijanje servisa po klijent ID-u
  app.get("/api/services/client/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: "Neispravan ID klijenta" });
      }
      
      // Dobavljamo sve servise za datog klijenta
      const services = await db.select()
        .from(schema.services)
        .where(eq(schema.services.clientId, clientId))
        .orderBy(sql`${schema.services.createdAt} DESC`);
      
      // Za svaki servis dodajemo ime servisera ako postoji
      const servicesWithNames = await Promise.all(services.map(async (service) => {
        if (service.technicianId) {
          const [technician] = await db.select()
            .from(schema.users)
            .where(eq(schema.users.id, service.technicianId));
          
          if (technician) {
            return { 
              ...service, 
              technicianName: technician.fullName 
            };
          }
        }
        return service;
      }));
      
      res.json(servicesWithNames);
    } catch (error) {
      console.error("Greška pri dobavljanju servisa za klijenta:", error);
      res.status(500).json({ error: "Greška pri dobavljanju servisa" });
    }
  });
  
  app.get("/api/services/user/:userId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "customer") {
      return res.status(403).json({ error: "Nedozvoljeni pristup" });
    }
    
    try {
      const userId = parseInt(req.params.userId);
      
      // Proveriti da li korisnik pristupa sopstvenim servisima
      if (req.user.id !== userId) {
        return res.status(403).json({ error: "Nedozvoljeni pristup tuđim servisima" });
      }
      
      // Dohvatanje klijenta po email-u (username korisnika)
      const clients = await db.select().from(schema.clients).where(eq(schema.clients.email, req.user.username));
      const client = clients.length > 0 ? clients[0] : null;
      
      if (!client) {
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }
      
      // Dohvatanje servisa za klijenta
      const services = await db.select().from(schema.services).where(eq(schema.services.clientId, client.id));
      
      // Dohvatanje uređaja za servise
      const detailedServices = await Promise.all(services.map(async (service) => {
        const [appliance] = await db
          .select()
          .from(schema.appliances)
          .where(eq(schema.appliances.id, service.applianceId));
        
        let category = null;
        let manufacturer = null;
        
        if (appliance) {
          if (appliance.categoryId) {
            const [cat] = await db
              .select()
              .from(schema.applianceCategories)
              .where(eq(schema.applianceCategories.id, appliance.categoryId));
            category = cat;
          }
          
          if (appliance.manufacturerId) {
            const [manuf] = await db
              .select()
              .from(schema.manufacturers)
              .where(eq(schema.manufacturers.id, appliance.manufacturerId));
            manufacturer = manuf;
          }
        }
        
        return {
          ...service,
          appliance,
          category,
          manufacturer,
        };
      }));
      
      res.json(detailedServices);
    } catch (error: any) {
      console.error("Greška pri dohvatanju servisa korisnika:", error);
      res.status(500).json({ error: `Greška pri dohvatanju servisa: ${error.message}` });
    }
  });

  // SMS functionality has been completely removed from the application
  // All SMS-related endpoints, schemas, and configurations have been disabled
  
  // SMS functionality has been completely removed from the application
  
  // SMS test endpoint removed
  
  // SMS service update endpoint removed
  
  // SMS bulk sending endpoint removed
  // SMS bulk endpoint removed

  // Mobile SMS API endpoints have been completely removed

  // SMS status endpoint removed

  // SMS test connection endpoint removed

  // SMS test send endpoint removed



  // =====================================
  // ADMIN SERVICES API ENDPOINTS
  // =====================================

  // Get single service with full details for admin
  app.get("/api/admin/services/:id", jwtAuth, requireRole("admin"), async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      
      if (isNaN(serviceId)) {
        return res.status(400).json({ error: "Nevažeći ID servisa" });
      }

      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }

      // Get related data
      const client = service.clientId ? await storage.getClient(service.clientId) : null;
      const appliance = service.applianceId ? await storage.getAppliance(service.applianceId) : null;
      const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;
      const category = appliance?.categoryId ? await storage.getApplianceCategory(appliance.categoryId) : null;
      const manufacturer = appliance?.manufacturerId ? await storage.getManufacturer(appliance.manufacturerId) : null;

      // Return formatted response for admin panel
      const response = {
        id: service.id,
        status: service.status,
        description: service.description,
        createdAt: service.createdAt,
        scheduledDate: service.scheduledDate,
        clientName: client?.fullName || '',
        clientPhone: client?.phone || '',
        clientEmail: client?.email || '',
        clientAddress: client?.address || '',
        clientCity: client?.city || '',
        model: appliance?.model || '',
        serialNumber: appliance?.serialNumber || '',
        categoryName: category?.name || '',
        manufacturerName: manufacturer?.name || '',
        technicianName: technician?.fullName || '',
        technicianPhone: technician?.phone || '',
        technicianEmail: technician?.email || ''
      };

      res.json(response);
    } catch (error) {
      console.error("Greška pri dobijanju admin servisa:", error);
      res.status(500).json({ error: "Greška pri dobijanju servisa" });
    }
  });

  // =====================================
  // NOTIFICATIONS API ENDPOINTS
  // =====================================

  // Dobijanje notifikacija za trenutno ulogovanog korisnika
  app.get("/api/notifications", jwtAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await NotificationService.getUserNotifications(req.user.id, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Greška pri dobijanju notifikacija:", error);
      res.status(500).json({ error: "Greška pri dobijanju notifikacija" });
    }
  });

  // Dobijanje broja nepročitanih notifikacija
  app.get("/api/notifications/unread-count", jwtAuth, async (req, res) => {
    try {
      const count = await NotificationService.getUnreadCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Greška pri dobijanju broja nepročitanih notifikacija:", error);
      res.status(500).json({ error: "Greška pri dobijanju broja nepročitanih notifikacija" });
    }
  });

  // Označavanje notifikacije kao pročitane
  app.post("/api/notifications/:id/mark-read", jwtAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await NotificationService.markAsRead(notificationId, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Greška pri označavanju notifikacije kao pročitane:", error);
      res.status(500).json({ error: "Greška pri označavanju notifikacije kao pročitane" });
    }
  });

  // Označavanje svih notifikacija kao pročitane
  app.post("/api/notifications/mark-all-read", jwtAuth, async (req, res) => {
    try {
      await NotificationService.markAllAsRead(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Greška pri označavanju svih notifikacija kao pročitane:", error);
      res.status(500).json({ error: "Greška pri označavanju svih notifikacija kao pročitane" });
    }
  });

  // Customer routes - kreiranje servisa (privremeno bez rate limiting i bot verification)
  app.post("/api/customer/services", async (req, res) => {
    try {
      // Proveravamo da li je korisnik prijavljen i da li je klijent
      if (!req.isAuthenticated() || req.user?.role !== "customer") {
        return res.status(401).json({ error: "Nemate dozvolu za pristup ovom resursu" });
      }

      console.log("🔍 Customer service request data:", req.body);

      // Validacija podataka za customer service request
      const { categoryId, manufacturerId, model, serialNumber, purchaseDate, purchasePlace, description } = req.body;
      
      if (!categoryId || !manufacturerId || !model || !description) {
        return res.status(400).json({
          error: "Obavezna polja nisu popunjena",
          details: "categoryId, manufacturerId, model i description su obavezni"
        });
      }

      // Prvo kreiramo ili pronalazimo klijenta na osnovu korisničkih podataka
      const clientData = {
        fullName: req.user.fullName || "",
        email: req.user.username || "",
        phone: req.user.phone || "",
        address: req.user.address || "",
        city: req.user.city || "",
      };

      let clientId;
      
      // Proveravamo da li klijent već postoji
      const clients = await storage.getAllClients();
      const existingClient = clients.find(c => c.email === clientData.email);
      
      if (existingClient) {
        clientId = existingClient.id;
        console.log("✅ Pronađen postojeći klijent:", clientId);
      } else {
        // Kreiramo novog klijenta
        const newClient = await storage.createClient(clientData);
        clientId = newClient.id;
        console.log("✅ Kreiran novi klijent:", clientId);
      }

      // Kreiramo uređaj
      const applianceData = {
        clientId,
        categoryId: parseInt(categoryId),
        manufacturerId: parseInt(manufacturerId),
        model,
        serialNumber,
        purchaseDate,
        notes: purchasePlace ? `Mesto kupovine: ${purchasePlace}` : "",
      };

      const appliance = await storage.createAppliance(applianceData);
      console.log("✅ Kreiran uređaj:", appliance.id);

      // Kreiranje servisa
      const newService = await storage.createService({
        clientId,
        applianceId: appliance.id,
        description,
        status: "pending" as const,
        createdAt: new Date().toISOString().split('T')[0]
      });

      // EMAIL OBAVEŠTENJA ZA ADMINISTRATORE ONEMOGUĆENA
      // Korisnik je zatražio da se iskljuće sva email obaveštenja za administratore
      console.log("[EMAIL] Admin obaveštenja onemogućena po zahtevu korisnika");

      res.status(201).json(newService);
    } catch (error) {
      console.error("Greška pri kreiranju servisa:", error);
      res.status(500).json({ error: "Greška pri kreiranju servisa", message: error.message });
    }
  });

  // Customer routes - pregled svojih servisa
  app.get("/api/customer/services", async (req, res) => {
    try {
      // Proveravamo da li je korisnik prijavljen i da li je klijent
      if (!req.isAuthenticated() || req.user?.role !== "customer") {
        return res.status(401).json({ error: "Nemate dozvolu za pristup ovom resursu" });
      }

      // Dohvatamo sve servise za ovog klijenta
      const services = await storage.getServicesByClient(req.user.id);
      res.json(services);
    } catch (error) {
      console.error("Greška pri dohvatanju servisa:", error);
      res.status(500).json({ error: "Greška pri dohvatanju servisa", message: error.message });
    }
  });

  // Customer routes - pregled svojih uređaja
  app.get("/api/customer/appliances", async (req, res) => {
    try {
      // Proveravamo da li je korisnik prijavljen i da li je klijent
      if (!req.isAuthenticated() || req.user?.role !== "customer") {
        return res.status(401).json({ error: "Nemate dozvolu za pristup ovom resursu" });
      }

      // Dohvatamo sve uređaje za ovog klijenta
      const appliances = await storage.getAppliancesByClient(req.user.id);
      res.json(appliances);
    } catch (error) {
      console.error("Greška pri dohvatanju uređaja:", error);
      res.status(500).json({ error: "Greška pri dohvatanju uređaja", message: error.message });
    }
  });

  // Missing endpoints for assign technician and update status
  app.put("/api/services/:id/assign-technician", jwtAuth, async (req, res) => {
    try {
      // Proveri da li je korisnik admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za dodeljivanje servisera" });
      }
      
      const serviceId = parseInt(req.params.id);
      const { technicianId } = req.body;
      
      if (!technicianId || !Number.isInteger(technicianId)) {
        return res.status(400).json({ error: "ID servisera je obavezan" });
      }
      
      // Proveri da li servis postoji
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Proveri da li serviser postoji
      const technician = await storage.getTechnician(technicianId);
      if (!technician) {
        return res.status(404).json({ error: "Serviser nije pronađen" });
      }
      
      // Dodeli servisera
      const updatedService = await storage.updateService(serviceId, { 
        technicianId,
        status: 'assigned' as ServiceStatus 
      });
      
      console.log(`Serviser ${technician.fullName} dodeljen servisu #${serviceId}`);
      
      // Pošalji notifikaciju serviseru o dodeljenom servisu
      try {
        await NotificationService.notifyServiceAssigned(serviceId, technicianId, req.user.id);
      } catch (notificationError) {
        console.error("Greška pri slanju notifikacije serviseru:", notificationError);
      }

      // Obavesti servisera o postojanju pending rezervnih delova za ovaj servis
      try {
        await NotificationService.notifyTechnicianAboutPendingParts(serviceId, technicianId);
      } catch (notificationError) {
        console.error("Greška pri obaveštavanju o pending delovima:", notificationError);
      }
      
      // 4. Automatski SMS za poslovnog partnera
      if (service.businessPartnerId) {
        try {
          const businessPartner = await storage.getUser(service.businessPartnerId);
          if (businessPartner?.phone) {
            const client = await storage.getClient(service.clientId);
            const appliance = await storage.getAppliance(service.applianceId);
            const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
            
            const settings = await storage.getSystemSettings();
            const smsConfig = {
              apiKey: settings.sms_mobile_api_key || '',
              baseUrl: settings.sms_mobile_base_url || 'https://api.smsmobileapi.com',
              senderId: settings.sms_mobile_sender_id || 'FRIGO SISTEM',
              enabled: settings.sms_mobile_enabled === 'true'
            };

            if (smsConfig.enabled && smsConfig.apiKey) {
              const { SMSCommunicationService } = await import('./sms-communication-service.js');
              const smsService = new SMSCommunicationService(smsConfig);
              
              await smsService.notifyBusinessPartnerServiceAssigned({
                partnerPhone: businessPartner.phone,
                partnerName: businessPartner.fullName || businessPartner.username,
                serviceId: serviceId.toString(),
                clientName: client?.fullName || 'Nepoznat klijent',
                deviceType: category?.name || 'Uređaj',
                technicianName: technician.fullName
              });
              
              console.log(`📱 SMS o dodeli servisa poslat poslovnom partneru ${businessPartner.fullName || businessPartner.username}`);
            }
          }
        } catch (smsError) {
          console.error('❌ Greška pri SMS obaveštenju poslovnog partnera:', smsError);
        }
      }

      // ===== ADMIN SMS OBAVEŠTENJA O DODELI SERVISERA =====
      if (smsService && smsService.isConfigured()) {
        try {
          console.log(`[SMS ADMIN] Šalje obaveštenje administratorima o dodeli servisera za servis #${serviceId}`);
          
          const admins = await getAdminsWithPhones();
          const client = await storage.getClient(service.clientId);
          const appliance = await storage.getAppliance(service.applianceId);
          const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
          
          const deviceType = category ? category.name : 'Nepoznat uređaj';

          for (const admin of admins) {
            try {
              await smsService.notifyAdminTechnicianAssigned({
                adminPhone: admin.phone,
                adminName: admin.fullName,
                serviceId: serviceId.toString(),
                clientName: client?.fullName || 'Nepoznat klijent',
                deviceType: deviceType,
                technicianName: technician.fullName
              });
              console.log(`[SMS ADMIN] ✅ SMS o dodeli servisera poslat administratoru ${admin.fullName} (${admin.phone})`);
            } catch (adminSmsError) {
              console.error(`[SMS ADMIN] ❌ Greška pri slanju SMS-a administratoru ${admin.fullName}:`, adminSmsError);
            }
          }
        } catch (adminSmsError) {
          console.error('[SMS ADMIN] Globalna greška pri slanju admin SMS obaveštenja o dodeli servisera:', adminSmsError);
        }
      }
      
      res.json({
        ...updatedService,
        message: `Serviser ${technician.fullName} je uspešno dodeljen servisu #${serviceId}`,
        technicianName: technician.fullName
      });
    } catch (error) {
      console.error("Greška pri dodeljivanju servisera:", error);
      res.status(500).json({ error: "Greška pri dodeljivanju servisera" });
    }
  });

  app.put("/api/services/:id/update-status", jwtAuth, async (req, res) => {
    try {
      // Proveri da li je korisnik admin ili serviser
      if (!["admin", "technician"].includes(req.user?.role || "")) {
        return res.status(403).json({ error: "Nemate dozvolu za ažuriranje statusa" });
      }
      
      const serviceId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !serviceStatusEnum.options.includes(status)) {
        return res.status(400).json({ error: "Nevažeći status servisa" });
      }
      
      // Proveri da li servis postoji
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Sačuvaj stari status pre ažuriranja
      const oldStatus = service.status;
      
      // Ažuriraj status
      const updatedService = await storage.updateService(serviceId, { status });
      
      console.log(`[UPDATE-STATUS] Status servisa #${serviceId} ažuriran sa ${oldStatus} na ${status}`);
      
      // Pošalji notifikaciju o promeni statusa
      try {
        await NotificationService.notifyServiceStatusChanged(serviceId, status, req.user.id);
      } catch (notificationError) {
        console.error("Greška pri slanju notifikacije o promeni statusa:", notificationError);
      }
      
      // ===== UNIVERZALNI SMS TRIGGER ZA SVE PROMENE STATUSA =====
      // Aktiviramo SMS obaveštenja i za ovaj endpoint
      try {
        const settings = await storage.getSystemSettings();
        const smsConfig = {
          apiKey: settings.sms_mobile_api_key || '',
          baseUrl: settings.sms_mobile_base_url || 'https://api.smsmobileapi.com',
          senderId: settings.sms_mobile_sender_id || null,
          enabled: settings.sms_mobile_enabled === 'true'
        };

        if (smsConfig.enabled && smsConfig.apiKey && oldStatus !== status) {
          console.log(`[UPDATE-STATUS SMS] Aktiviram SMS trigger za promenu ${oldStatus} -> ${status}`);
          
          const { SMSCommunicationService } = await import('./sms-communication-service.js');
          const smsService = new SMSCommunicationService(smsConfig);
          
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
            oldStatus: oldStatus,
            newStatus: status,
            statusDescription: STATUS_DESCRIPTIONS[status] || status,
            technicianNotes: undefined,
            businessPartnerPhone: businessPartner?.phone,
            businessPartnerName: businessPartner?.fullName
          });
          
          // Log rezultate
          if (smsResults.clientSMS?.success) {
            console.log(`[UPDATE-STATUS SMS] ✅ SMS klijentu uspešno poslat`);
          }
          if (smsResults.adminSMS?.length) {
            const successCount = smsResults.adminSMS.filter(r => r.success).length;
            console.log(`[UPDATE-STATUS SMS] ✅ SMS administratorima: ${successCount}/${smsResults.adminSMS.length} uspešno`);
          }
          if (smsResults.businessPartnerSMS?.success) {
            console.log(`[UPDATE-STATUS SMS] ✅ SMS poslovnom partneru uspešno poslat`);
          }
          if (smsResults.supplierSMS?.success) {
            console.log(`[UPDATE-STATUS SMS] ✅ SMS Beli-ju (${manufacturer?.name}) uspešno poslat`);
          }
        } else {
          console.log("[UPDATE-STATUS SMS] SMS servis nije konfigurisan ili nema promene statusa");
        }
      } catch (smsError) {
        console.error("[UPDATE-STATUS SMS] Greška pri SMS obaveštenjima:", smsError);
      }
      
      res.json({
        ...updatedService,
        message: `Status servisa je uspešno ažuriran na: ${status}`
      });
    } catch (error) {
      console.error("Greška pri ažuriranju statusa:", error);
      res.status(500).json({ error: "Greška pri ažuriranju statusa servisa" });
    }
  });

  // COMPLUS BILLING ENDPOINTS - Fakturisanje garancijskih servisa
  
  // Pregled završenih garancijskih servisa za SVE Complus brendove po mesecima
  app.get("/api/admin/billing/complus", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin privilegije potrebne" });
      }

      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ 
          error: "Parametri month i year su obavezni" 
        });
      }

      // Definišemo SVE Complus brendove koji se fakturišu zajedno
      const complusBrands = ['Electrolux', 'Elica', 'Candy', 'Hoover', 'Turbo Air'];

      // Kreiraj date range za mesec
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);

      console.log(`[COMPLUS BILLING] Dohvatam SVE Complus garancijske servise za ${month}/${year}`);
      console.log(`[COMPLUS BILLING] Brendovi: ${complusBrands.join(', ')}`);

      // Dohvati završene garancijske servise za SVE Complus brendove u periodu
      const services = await db
        .select({
          serviceId: schema.services.id,
          clientId: schema.services.clientId,
          applianceId: schema.services.applianceId,
          technicianId: schema.services.technicianId,
          description: schema.services.description,
          status: schema.services.status,
          warrantyStatus: schema.services.warrantyStatus,
          completedDate: schema.services.completedDate,
          cost: schema.services.cost,
          clientName: schema.clients.fullName,
          clientPhone: schema.clients.phone,
          clientAddress: schema.clients.address,
          clientCity: schema.clients.city,
          applianceCategory: schema.applianceCategories.name,
          manufacturerName: schema.manufacturers.name,
          applianceModel: schema.appliances.model,
          serialNumber: schema.appliances.serialNumber,
          technicianName: schema.technicians.fullName
        })
        .from(schema.services)
        .leftJoin(schema.clients, eq(schema.services.clientId, schema.clients.id))
        .leftJoin(schema.appliances, eq(schema.services.applianceId, schema.appliances.id))
        .leftJoin(schema.applianceCategories, eq(schema.appliances.categoryId, schema.applianceCategories.id))
        .leftJoin(schema.manufacturers, eq(schema.appliances.manufacturerId, schema.manufacturers.id))
        .leftJoin(schema.technicians, eq(schema.services.technicianId, schema.technicians.id))
        .where(
          and(
            eq(schema.services.status, 'completed'),
            eq(schema.services.warrantyStatus, 'u garanciji'),
            or(
              eq(schema.manufacturers.name, 'Electrolux'),
              eq(schema.manufacturers.name, 'Elica'),
              eq(schema.manufacturers.name, 'Candy'),
              eq(schema.manufacturers.name, 'Hoover'),
              eq(schema.manufacturers.name, 'Turbo Air')
            ),
            gte(schema.services.completedDate, startDate.toISOString()),
            lte(schema.services.completedDate, endDate.toISOString())
          )
        )
        .orderBy(desc(schema.services.completedDate));

      // Formatiraj rezultate
      const billingServices = services.map(service => ({
        id: service.serviceId,
        serviceNumber: service.serviceId.toString(),
        clientName: service.clientName || 'Nepoznat klijent',
        clientPhone: service.clientPhone || '',
        clientAddress: service.clientAddress || '',
        clientCity: service.clientCity || '',
        applianceCategory: service.applianceCategory || '',
        manufacturerName: service.manufacturerName || '',
        applianceModel: service.applianceModel || '',
        serialNumber: service.serialNumber || '',
        technicianName: service.technicianName || 'Nepoznat serviser',
        completedDate: service.completedDate,
        cost: service.cost || 0,
        description: service.description || '',
        warrantyStatus: service.warrantyStatus || ''
      }));

      // Grupiši servise po brendu za statistiku
      const servicesByBrand = billingServices.reduce((groups, service) => {
        const brand = service.manufacturerName;
        if (!groups[brand]) {
          groups[brand] = [];
        }
        groups[brand].push(service);
        return groups;
      }, {} as Record<string, typeof billingServices>);

      const totalServices = billingServices.length;
      const totalCost = billingServices.reduce((sum, service) => sum + (service.cost || 0), 0);

      const monthNames = [
        'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
        'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
      ];

      const response = {
        month: monthNames[parseInt(month as string) - 1],
        year: parseInt(year as string),
        brandGroup: 'Complus (svi brendovi)',
        complusBrands,
        services: billingServices,
        servicesByBrand,
        totalServices,
        totalCost,
        brandBreakdown: Object.keys(servicesByBrand).map(brand => ({
          brand,
          count: servicesByBrand[brand].length,
          cost: servicesByBrand[brand].reduce((sum, s) => sum + (s.cost || 0), 0)
        }))
      };

      console.log(`[COMPLUS BILLING] Pronađeno ukupno ${totalServices} servisa za sve Complus brendove`);
      console.log(`[COMPLUS BILLING] Ukupna vrednost: ${totalCost.toFixed(2)}€`);
      console.log(`[COMPLUS BILLING] Raspored po brendovima:`, response.brandBreakdown);

      res.json(response);
    } catch (error) {
      console.error("Greška pri dohvatanju Complus billing podataka:", error);
      res.status(500).json({ error: "Greška pri dohvatanju podataka za fakturisanje" });
    }
  });

  // SMS Mobile API endpoints - restore comprehensive SMS functionality
  
  // Admin masovno slanje SMS-a
  app.post("/api/admin/sms-bulk", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin privilegije potrebne" });
      }

      const { recipients, message, type } = req.body;
      
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: "Lista primaoca je obavezna" });
      }

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: "Poruka je obavezna" });
      }

      const settings = await storage.getSystemSettings();
      const smsConfig = {
        apiKey: settings.sms_mobile_api_key || '',
        baseUrl: settings.sms_mobile_base_url || 'https://api.smsmobileapi.com',
        senderId: settings.sms_mobile_sender_id || 'FRIGO SISTEM',
        enabled: settings.sms_mobile_enabled === 'true'
      };

      if (!smsConfig.enabled || !smsConfig.apiKey) {
        return res.status(400).json({ error: "SMS servis nije konfigurisan" });
      }

      const { SMSCommunicationService } = await import('./sms-communication-service.js');
      const smsService = new SMSCommunicationService(smsConfig);
      
      const results = [];
      
      for (const recipient of recipients) {
        try {
          const result = await smsService.sendCustomMessage(recipient.phone, message);
          results.push({
            phone: recipient.phone,
            name: recipient.name,
            success: result.success,
            messageId: result.messageId,
            error: result.error
          });
          
          if (result.success) {
            console.log(`📱 Masovno SMS uspešno poslato na ${recipient.phone} (${recipient.name})`);
          } else {
            console.error(`❌ Greška pri slanju SMS na ${recipient.phone}:`, result.error);
          }
        } catch (error) {
          results.push({
            phone: recipient.phone,
            name: recipient.name,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      res.json({
        success: true,
        message: `SMS uspešno poslat na ${successCount} od ${recipients.length} brojeva`,
        results
      });

    } catch (error) {
      console.error("Greška pri masovnom slanju SMS-a:", error);
      res.status(500).json({ error: "Greška pri slanju SMS obaveštenja" });
    }
  });

  // Automatsko obaveštenje o prispeću rezervnih delova
  app.post("/api/spare-parts/:id/notify-arrival", jwtAuth, async (req, res) => {
    try {
      if (!["admin", "technician"].includes(req.user?.role || "")) {
        return res.status(403).json({ error: "Nemate dozvolu" });
      }

      const orderId = parseInt(req.params.id);
      const order = await storage.getSparePartOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ error: "Porudžbina nije pronađena" });
      }

      // Ažuriraj status na 'received'
      await storage.updateSparePartOrder(orderId, { 
        status: 'received',
        actualDeliveryDate: new Date()
      });

      const settings = await storage.getSystemSettings();
      const smsConfig = {
        apiKey: settings.sms_mobile_api_key || '',
        baseUrl: settings.sms_mobile_base_url || 'https://api.smsmobileapi.com',
        senderId: settings.sms_mobile_sender_id || 'FRIGO SISTEM',
        enabled: settings.sms_mobile_enabled === 'true'
      };

      if (smsConfig.enabled && smsConfig.apiKey) {
        const { SMSCommunicationService } = await import('./sms-communication-service.js');
        const smsService = new SMSCommunicationService(smsConfig);

        // Obavesti tehniciara
        if (order.technicianId) {
          const technician = await storage.getTechnician(order.technicianId);
          const techUser = technician ? await storage.getUserByTechnicianId(order.technicianId) : null;
          
          if (techUser?.phone) {
            await smsService.notifySparePartArrived({
              technicianPhone: techUser.phone,
              technicianName: technician.fullName,
              serviceId: order.serviceId?.toString() || 'N/A',
              partName: order.partName
            });
            
            console.log(`📱 SMS o prispeću rezervnog dela poslat tehniciaru ${technician.fullName}`);
          }
        }

        // Obavesti klijenta
        if (order.serviceId) {
          const service = await storage.getService(order.serviceId);
          if (service?.clientId) {
            const client = await storage.getClient(service.clientId);
            const appliance = await storage.getAppliance(service.applianceId);
            const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
            
            if (client?.phone) {
              await smsService.notifySparePartArrived({
                clientPhone: client.phone,
                clientName: client.fullName,
                serviceId: service.id.toString(),
                deviceType: category?.name || 'Uređaj',
                partName: order.partName
              });
              
              console.log(`📱 SMS o prispeću rezervnog dela poslat klijentu ${client.fullName}`);
            }

            // Obavesti poslovnog partnera (ako servis dolazi od poslovnog partnera)
            if (service.businessPartnerId) {
              try {
                const businessPartner = await storage.getUser(service.businessPartnerId);
                if (businessPartner && businessPartner.phone) {
                  await smsService.notifyBusinessPartnerPartsArrived({
                    partnerPhone: businessPartner.phone,
                    partnerName: businessPartner.fullName,
                    serviceId: service.id.toString(),
                    clientName: client?.fullName || 'Nepoznat klijent',
                    deviceType: category?.name || 'Uređaj',
                    partName: order.partName
                  });
                  console.log(`📱 SMS o prispeću rezervnog dela poslat poslovnom partneru ${businessPartner.fullName} (${businessPartner.phone})`);
                }
              } catch (smsError) {
                console.error(`❌ Greška pri slanju SMS-a poslovnom partneru o prispeću:`, smsError);
              }
            }
          }
        }
      }

      res.json({ 
        success: true, 
        message: "SMS obaveštenja o prispeću rezervnog dela su poslata" 
      });

    } catch (error) {
      console.error("Greška pri obaveštenju o prispeću rezervnog dela:", error);
      res.status(500).json({ error: "Greška pri slanju obaveštenja" });
    }
  });

  // SMS notification endpoints for services
  app.post("/api/services/:id/send-sms", async (req, res) => {
    try {
      // Proveri da li je korisnik admin ili serviser
      if (!req.isAuthenticated() || !["admin", "technician"].includes(req.user?.role || "")) {
        return res.status(403).json({ error: "Nemate dozvolu za slanje SMS obaveštenja" });
      }
      
      const serviceId = parseInt(req.params.id);
      const { message, type } = z.object({
        message: z.string().min(1).max(160),
        type: z.enum(['appointment', 'status_update', 'reminder', 'custom']).optional()
      }).parse(req.body);
      
      // Dohvati servis sa klijentom
      const service = await storage.getService(serviceId);
      if (!service || !service.client) {
        return res.status(404).json({ error: "Servis ili klijent nije pronađen" });
      }
      
      if (!service.client.phone) {
        return res.status(400).json({ error: "Klijent nema broj telefona" });
      }
      
      console.log(`[SMS] Slanje ${type || 'custom'} SMS-a klijentu ${service.client.fullName} za servis #${serviceId}`);
      
      // SMS functionality removed
      const result = false;
      
      if (result) {
        console.log(`[SMS] ✅ SMS uspešno poslat klijentu ${service.client.fullName}`);
        return res.json({ 
          success: true, 
          message: "SMS obaveštenje uspešno poslato"
        });
      } else {
        // SMS functionality has been removed
        return res.status(500).json({ 
          success: false, 
          error: "Neuspešno slanje SMS obaveštenja"
        });
      }
    } catch (error) {
      console.error("[SMS] Greška pri slanju obaveštenja:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          error: "Nevažeći podaci", 
          details: error.format() 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: "Greška pri slanju SMS obaveštenja", 
        message: error instanceof Error ? error.message : "Nepoznata greška" 
      });
    }
  });

  // Admin delete routes for invalid/expired clients and services
  app.delete("/api/admin/clients/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za brisanje klijenata" });
      }

      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: "Neispravan ID klijenta" });
      }

      // Check if client has any services
      const services = await db.select()
        .from(schema.services)
        .where(eq(schema.services.clientId, clientId));

      if (services.length > 0) {
        return res.status(400).json({ 
          error: "Klijent ima aktivne servise", 
          message: "Prvo obriši sve servise povezane sa ovim klijentom" 
        });
      }

      // Check if client has any appliances
      const appliances = await db.select()
        .from(schema.appliances)
        .where(eq(schema.appliances.clientId, clientId));

      if (appliances.length > 0) {
        return res.status(400).json({ 
          error: "Klijent ima registrovane uređaje", 
          message: "Prvo obriši sve uređaje povezane sa ovim klijentom" 
        });
      }

      // Delete client
      const deletedClient = await db.delete(schema.clients)
        .where(eq(schema.clients.id, clientId))
        .returning();

      if (deletedClient.length === 0) {
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }

      res.json({ 
        success: true, 
        message: "Klijent je uspešno obrisan",
        deletedClient: deletedClient[0]
      });
    } catch (error) {
      console.error("Greška pri brisanju klijenta:", error);
      res.status(500).json({ error: "Greška pri brisanju klijenta" });
    }
  });



  app.delete("/api/admin/appliances/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za brisanje uređaja" });
      }

      const applianceId = parseInt(req.params.id);
      if (isNaN(applianceId)) {
        return res.status(400).json({ error: "Neispravan ID uređaja" });
      }

      // Check if appliance has any services
      const services = await db.select()
        .from(schema.services)
        .where(eq(schema.services.applianceId, applianceId));

      if (services.length > 0) {
        return res.status(400).json({ 
          error: "Uređaj ima aktivne servise", 
          message: "Prvo obriši sve servise povezane sa ovim uređajem" 
        });
      }

      // Check if appliance has any maintenance schedules
      const maintenanceSchedules = await db.select()
        .from(schema.maintenanceSchedules)
        .where(eq(schema.maintenanceSchedules.applianceId, applianceId));

      if (maintenanceSchedules.length > 0) {
        // Delete maintenance schedules first
        await db.delete(schema.maintenanceSchedules)
          .where(eq(schema.maintenanceSchedules.applianceId, applianceId));
      }

      // Delete appliance
      const deletedAppliance = await db.delete(schema.appliances)
        .where(eq(schema.appliances.id, applianceId))
        .returning();

      if (deletedAppliance.length === 0) {
        return res.status(404).json({ error: "Uređaj nije pronađen" });
      }

      res.json({ 
        success: true, 
        message: "Uređaj je uspešno obrisan",
        deletedAppliance: deletedAppliance[0]
      });
    } catch (error) {
      console.error("Greška pri brisanju uređaja:", error);
      res.status(500).json({ error: "Greška pri brisanju uređaja" });
    }
  });

  // Bulk delete operations for admin
  app.post("/api/admin/bulk-delete", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za masovno brisanje" });
      }

      const { type, ids } = req.body;
      
      if (!type || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Neispravni parametri za masovno brisanje" });
      }

      const deletedCount = { clients: 0, services: 0, appliances: 0 };

      if (type === "clients") {
        // Delete clients that don't have services or appliances
        for (const id of ids) {
          const clientId = parseInt(id);
          if (isNaN(clientId)) continue;

          const services = await db.select()
            .from(schema.services)
            .where(eq(schema.services.clientId, clientId));

          const appliances = await db.select()
            .from(schema.appliances)
            .where(eq(schema.appliances.clientId, clientId));

          if (services.length === 0 && appliances.length === 0) {
            await db.delete(schema.clients)
              .where(eq(schema.clients.id, clientId));
            deletedCount.clients++;
          }
        }
      } else if (type === "services") {
        // Delete services
        for (const id of ids) {
          const serviceId = parseInt(id);
          if (isNaN(serviceId)) continue;

          await db.delete(schema.services)
            .where(eq(schema.services.id, serviceId));
          deletedCount.services++;
        }
      } else if (type === "appliances") {
        // Delete appliances that don't have services
        for (const id of ids) {
          const applianceId = parseInt(id);
          if (isNaN(applianceId)) continue;

          const services = await db.select()
            .from(schema.services)
            .where(eq(schema.services.applianceId, applianceId));

          if (services.length === 0) {
            // Delete maintenance schedules first
            await db.delete(schema.maintenanceSchedules)
              .where(eq(schema.maintenanceSchedules.applianceId, applianceId));
            
            await db.delete(schema.appliances)
              .where(eq(schema.appliances.id, applianceId));
            deletedCount.appliances++;
          }
        }
      }

      res.json({ 
        success: true, 
        message: "Masovno brisanje završeno",
        deletedCount
      });
    } catch (error) {
      console.error("Greška pri masovnom brisanju:", error);
      res.status(500).json({ error: "Greška pri masovnom brisanju" });
    }
  });

  // Get orphaned/invalid data for cleanup
  app.get("/api/admin/orphaned-data", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za pregled neispravnih podataka" });
      }

      const orphanedData = {
        clientsWithoutData: [],
        servicesWithoutClients: [],
        appliancesWithoutClients: [],
        expiredServices: []
      };

      // Find clients without phone or with invalid data
      const clients = await db.select().from(schema.clients);
      orphanedData.clientsWithoutData = clients.filter(client => 
        !client.phone || 
        !client.fullName || 
        client.fullName.trim() === "" ||
        client.phone.trim() === "" ||
        client.fullName.includes("Klijent ")
      );

      // Find services without valid clients
      const services = await db.select().from(schema.services);
      for (const service of services) {
        const [client] = await db.select()
          .from(schema.clients)
          .where(eq(schema.clients.id, service.clientId));
        
        if (!client) {
          orphanedData.servicesWithoutClients.push(service);
        }
      }

      // Find appliances without valid clients
      const appliances = await db.select().from(schema.appliances);
      for (const appliance of appliances) {
        const [client] = await db.select()
          .from(schema.clients)
          .where(eq(schema.clients.id, appliance.clientId));
        
        if (!client) {
          orphanedData.appliancesWithoutClients.push(appliance);
        }
      }

      // Find expired/old services (older than 2 years and completed)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      orphanedData.expiredServices = services.filter(service => 
        service.status === "completed" && 
        service.createdAt && 
        new Date(service.createdAt) < twoYearsAgo
      );

      res.json(orphanedData);
    } catch (error) {
      console.error("Greška pri dobijanju neispravnih podataka:", error);
      res.status(500).json({ error: "Greška pri dobijanju neispravnih podataka" });
    }
  });

  // Admin services API endpoints
  app.get("/api/admin/services", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const services = await storage.getAdminServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching admin services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Get admin services grouped by technicians
  app.get("/api/admin/services-by-technicians", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const services = await storage.getAdminServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching admin services by technicians:", error);
      res.status(500).json({ error: "Failed to fetch services by technicians" });
    }
  });

  app.get("/api/admin/services/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const service = await storage.getAdminServiceById(parseInt(req.params.id));
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ error: "Failed to fetch service" });
    }
  });

  app.put("/api/admin/services/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const serviceId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedService = await storage.updateAdminService(serviceId, updates);
      if (!updatedService) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      res.json(updatedService);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ error: "Failed to update service" });
    }
  });

  app.delete("/api/admin/services/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const serviceId = parseInt(req.params.id);
      const deleted = await storage.deleteAdminService(serviceId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  app.put("/api/admin/services/:id/assign-technician", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const serviceId = parseInt(req.params.id);
      const { technicianId } = req.body;
      
      const updatedService = await storage.assignTechnicianToService(serviceId, technicianId);
      if (!updatedService) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      // Obavesti servisera o postojanju pending rezervnih delova za ovaj servis
      try {
        await NotificationService.notifyTechnicianAboutPendingParts(serviceId, technicianId);
      } catch (notificationError) {
        console.error("Greška pri obaveštavanju o pending delovima:", notificationError);
      }

      // ===== ADMIN SMS OBAVEŠTENJA O DODELI SERVISERA =====
      if (smsService && smsService.isConfigured()) {
        try {
          console.log(`[SMS ADMIN] Šalje obaveštenje administratorima o dodeli servisera za servis #${serviceId} (admin endpoint)`);
          
          const admins = await getAdminsWithPhones();
          const service = await storage.getService(serviceId);
          const client = service ? await storage.getClient(service.clientId) : null;
          const appliance = service ? await storage.getAppliance(service.applianceId) : null;
          const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
          const technician = await storage.getTechnician(technicianId);
          
          const deviceType = category ? category.name : 'Nepoznat uređaj';

          for (const admin of admins) {
            try {
              await smsService.notifyAdminTechnicianAssigned({
                adminPhone: admin.phone,
                adminName: admin.fullName,
                serviceId: serviceId.toString(),
                clientName: client?.fullName || 'Nepoznat klijent',
                deviceType: deviceType,
                technicianName: technician?.fullName || 'Nepoznat serviser'
              });
              console.log(`[SMS ADMIN] ✅ SMS o dodeli servisera poslat administratoru ${admin.fullName} (${admin.phone})`);
            } catch (adminSmsError) {
              console.error(`[SMS ADMIN] ❌ Greška pri slanju SMS-a administratoru ${admin.fullName}:`, adminSmsError);
            }
          }
        } catch (adminSmsError) {
          console.error('[SMS ADMIN] Globalna greška pri slanju admin SMS obaveštenja o dodeli servisera (admin endpoint):', adminSmsError);
        }
      }
      
      res.json(updatedService);
    } catch (error) {
      console.error("Error assigning technician:", error);
      res.status(500).json({ error: "Failed to assign technician" });
    }
  });

  // Vraćanje servisa od tehnčara u admin bazu
  app.post("/api/admin/services/:id/return-from-technician", jwtAuth, requireRole("admin"), async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { reason, notes } = req.body;
      
      if (isNaN(serviceId)) {
        return res.status(400).json({ error: "Nevažeći ID servisa" });
      }
      
      // Proveri da li servis postoji
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Proveri da li je servis dodjeljen tehnčaru
      if (!service.technicianId) {
        return res.status(400).json({ error: "Servis nije dodjeljen nijednom tehnčaru" });
      }
      
      // Vrati servis u pending status i ukloni technician_id
      const updatedService = await storage.updateService(serviceId, {
        status: 'pending',
        technicianId: null,
        technicianNotes: notes ? `${service.technicianNotes || ''}\n\n[VRAĆENO OD TEHNČARA]: ${notes}` : service.technicianNotes
      });
      
      console.log(`Admin vratio servis #${serviceId} od tehnčara. Razlog: ${reason || 'Nije naveden'}`);
      
      // Pošalji notifikaciju tehnčaru o vraćanju servisa
      try {
        await NotificationService.notifyServiceReturned(serviceId, service.technicianId, req.user.id, reason || 'Bez objašnjenja');
      } catch (notificationError) {
        console.error("Greška pri slanju notifikacije o vraćanju servisa:", notificationError);
      }
      
      res.json({
        ...updatedService,
        message: `Servis #${serviceId} je uspešno vraćen od tehnčara u admin bazu`,
        reason,
        notes
      });
    } catch (error) {
      console.error("Greška pri vraćanju servisa:", error);
      res.status(500).json({ error: "Greška pri vraćanju servisa od tehnčara" });
    }
  });

  // Spare parts API endpoints
  
  // Get all spare part orders (admin only)
  app.get("/api/admin/spare-parts", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const orders = await storage.getAllSparePartOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching spare part orders:", error);
      res.status(500).json({ error: "Failed to fetch spare part orders" });
    }
  });

  // Get pending spare part orders (admin only)
  app.get("/api/admin/spare-parts/pending", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const orders = await storage.getPendingSparePartOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching pending spare part orders:", error);
      res.status(500).json({ error: "Failed to fetch pending spare part orders" });
    }
  });

  // Mark spare part as received (admin only)
  app.post("/api/admin/spare-parts/:id/mark-received", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const orderId = parseInt(req.params.id);
      const { actualCost, location, notes } = req.body;

      console.log(`[MARK RECEIVED] Processing order ${orderId} with data:`, { actualCost, location, notes });

      const result = await storage.markSparePartAsReceived(orderId, req.user.id, {
        actualCost,
        location,
        notes
      });

      if (!result) {
        return res.status(404).json({ error: "Porudžbina nije pronađena" });
      }

      console.log(`[MARK RECEIVED] Successfully processed order ${orderId}`);

      // TODO: Add SMS notifications here when needed
      
      res.json({ 
        success: true, 
        order: result.order, 
        availablePart: result.availablePart 
      });
    } catch (error) {
      console.error(`[MARK RECEIVED] Error marking spare part as received:`, error);
      res.status(500).json({ 
        error: "Greška pri označavanju dela kao primljenog",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get spare part order by ID
  app.get("/api/spare-parts/:id", jwtAuth, async (req, res) => {
    try {
      const order = await storage.getSparePartOrder(parseInt(req.params.id));
      if (!order) {
        return res.status(404).json({ error: "Spare part order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching spare part order:", error);
      res.status(500).json({ error: "Failed to fetch spare part order" });
    }
  });

  // Get spare part orders by service ID
  app.get("/api/services/:id/spare-parts", jwtAuth, async (req, res) => {
    try {
      const orders = await storage.getSparePartOrdersByService(parseInt(req.params.id));
      res.json(orders);
    } catch (error) {
      console.error("Error fetching spare part orders for service:", error);
      res.status(500).json({ error: "Failed to fetch spare part orders for service" });
    }
  });

  // Test endpoint to verify routing
  app.post("/api/test-spare-parts", async (req, res) => {
    console.log("🔍 TEST endpoint called");
    res.json({ message: "Test endpoint working", auth: req.isAuthenticated() });
  });

  // Create spare part order for specific service (admin or technician)
  app.post("/api/services/:id/spare-parts", jwtAuth, async (req, res) => {
    console.log("🔍 POST /api/services/:id/spare-parts called");
    console.log("JWT User:", req.user);
    
    if (!req.user) {
      console.log("❌ User not authenticated");
      return res.sendStatus(401);
    }

    try {
      const serviceId = parseInt(req.params.id);
      const { partName, catalogNumber, urgency, description } = req.body;

      if (!partName || !catalogNumber) {
        return res.status(400).json({ error: "Part name and catalog number are required" });
      }

      // Get service to extract appliance ID and technician ID
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      console.log("Service data:", service);
      console.log("Service appliance ID:", service.applianceId);

      // Determine technician ID
      let technicianId = null;
      if (req.user.role === "technician") {
        technicianId = req.user.technicianId;
      } else if (req.user.role === "admin") {
        // For admin, get technician from service
        if (service.technicianId) {
          technicianId = service.technicianId;
        } else {
          technicianId = 1; // Default technician for testing
        }
      }

      if (!technicianId) {
        return res.status(400).json({ error: "Technician ID not found" });
      }

      if (!service.applianceId) {
        return res.status(400).json({ error: "Service has no appliance ID" });
      }

      const validatedData = {
        serviceId,
        technicianId,
        applianceId: service.applianceId, // Add appliance ID from service
        partName,
        partNumber: catalogNumber, // Use partNumber instead of catalogNumber
        urgency: urgency || 'medium',
        description: description || '',
        status: 'pending'
      };

      console.log("Validated data for spare part order:", validatedData);

      const order = await storage.createSparePartOrder(validatedData);
      
      // Automatski kreiraj obaveštenje za administratore
      await NotificationService.notifySparePartOrdered(order.id, technicianId);
      
      // ===== AUTOMATSKI SMS TRIGGERI ZA REZERVNE DJELOVE =====
      if (smsService && smsService.isConfigured()) {
        try {
          console.log(`[SMS SISTEM] Početak automatskih SMS triggera za porudžbinu rezervnih djelova #${order.id}`);
          
          // 1. SMS KORISNIKU o porudžbini rezervnih djelova
          if (service.clientId) {
            const client = await storage.getClient(service.clientId);
            if (client && client.phone) {
              try {
                await smsService.notifyClientPartsOrdered({
                  clientPhone: client.phone,
                  clientName: client.fullName,
                  serviceId: serviceId.toString(),
                  partName: partName,
                  deviceType: 'uređaj', // TODO: Dodati pravi tip uređaja iz appliance tabele
                  deliveryTime: urgency === 'urgent' ? '3-5 dana' : '7-10 dana'
                });
                console.log(`[SMS SISTEM] ✅ SMS o porudžbini dijelova poslat korisniku ${client.fullName} (${client.phone})`);
              } catch (smsError) {
                console.error(`[SMS SISTEM] ❌ Greška pri slanju SMS-a korisniku o porudžbini:`, smsError);
              }
            }
          }

          // 2. SMS POSLOVNOM PARTNERU o porudžbini rezervnih djelova (ako servis dolazi od poslovnog partnera)
          if (service.businessPartnerId) {
            try {
              const businessPartner = await storage.getUser(service.businessPartnerId);
              if (businessPartner && businessPartner.phone) {
                const client = await storage.getClient(service.clientId!);
                
                await smsService.notifyBusinessPartnerPartsOrdered({
                  partnerPhone: businessPartner.phone,
                  partnerName: businessPartner.fullName,
                  serviceId: serviceId.toString(),
                  clientName: client?.fullName || 'Nepoznat klijent',
                  partName: partName,
                  deviceType: 'uređaj', // TODO: Dodati pravi tip uređaja
                  deliveryTime: urgency === 'urgent' ? '3-5 dana' : '7-10 dana'
                });
                console.log(`[SMS SISTEM] ✅ SMS o porudžbini dijelova poslat poslovnom partneru ${businessPartner.fullName} (${businessPartner.phone})`);
              }
            } catch (smsError) {
              console.error(`[SMS SISTEM] ❌ Greška pri slanju SMS-a poslovnom partneru o porudžbini:`, smsError);
            }
          }
          
        } catch (smsError) {
          console.error("[SMS SISTEM] Globalna greška pri automatskim SMS triggerima za rezervne djelove:", smsError);
        }
      }
      
      // Automatski premesti servis u "waiting_parts" status
      const currentService = await storage.getService(serviceId);
      if (currentService) {
        await storage.updateService(serviceId, {
          status: 'waiting_parts',
          technicianNotes: (currentService.technicianNotes || '') + 
            `\n[${new Date().toLocaleDateString('sr-RS')}] Servis pauziran - čeka rezervni deo: ${partName}`
        });
      }
      
      res.status(201).json({
        success: true,
        message: "Spare part order created successfully",
        data: order
      });
    } catch (error) {
      console.error("Error creating spare part order:", error);
      res.status(500).json({ error: "Failed to create spare part order" });
    }
  });

  // Get spare part orders by technician ID
  app.get("/api/technician/spare-parts", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "technician") {
      return res.sendStatus(401);
    }

    try {
      const technicianId = req.user.technicianId;
      if (!technicianId) {
        return res.status(400).json({ error: "Technician ID not found" });
      }
      
      const orders = await storage.getSparePartOrdersByTechnician(technicianId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching technician spare part orders:", error);
      res.status(500).json({ error: "Failed to fetch technician spare part orders" });
    }
  });

  // Create new spare part order (technician only)
  app.post("/api/spare-parts", jwtAuth, async (req, res) => {
    console.log("🔧 POST /api/spare-parts pozvan");
    console.log("User:", req.user);
    console.log("Request body:", req.body);
    
    if (!req.user || req.user.role !== "technician") {
      console.log("❌ Unauthorized - user role:", req.user?.role);
      return res.sendStatus(401);
    }

    try {
      const technicianId = req.user.technicianId;
      console.log("👤 Technician ID:", technicianId);
      
      if (!technicianId) {
        console.log("❌ Technician ID not found in user data");
        return res.status(400).json({ error: "Technician ID not found" });
      }

      console.log("🧪 Validating data...");
      const dataToValidate = {
        ...req.body,
        technicianId,
        status: 'pending'
      };
      console.log("Data to validate:", dataToValidate);
      
      const validatedData = insertSparePartOrderSchema.parse(dataToValidate);
      console.log("✅ Data validated successfully");

      console.log("💾 Creating spare part order...");
      const order = await storage.createSparePartOrder(validatedData);
      console.log("✅ Order created with ID:", order.id);
      
      // Automatski kreiraj obaveštenje za administratore
      await NotificationService.notifySparePartOrdered(order.id, technicianId);
      
      // Automatski premesti servis u "waiting_parts" status samo ako je serviceId validan
      if (validatedData.serviceId) {
        const currentService = await storage.getService(validatedData.serviceId);
        if (currentService) {
          const updatedNotes = (currentService.technicianNotes || '') + 
            `\n[${new Date().toLocaleDateString('sr-RS')}] Servis pauziran - čeka rezervni deo: ${validatedData.partName}`;
          
          // Kreiramo kompletan objekat servisa za ažuriranje
          const updateData = {
            ...currentService,
            status: 'waiting_parts' as const,
            technicianNotes: updatedNotes
          };
          
          await storage.updateService(validatedData.serviceId, updateData);
        }
      }
      
      // Kreiraj obaveštenje za tehničara da je servis premešten u folder čekanja
      if (validatedData.serviceId && req.user?.id) {
        await NotificationService.notifyServiceWaitingForParts(
          validatedData.serviceId,
          req.user.id,
          validatedData.partName
        );
      }

      // ✨ NOVO: Automatsko slanje emailova svim relevantnim stranama
      try {
        // Dobijmo sve potrebne podatke za slanje emailova
        const service = await storage.getService(validatedData.serviceId);
        const technician = await storage.getTechnician(technicianId);
        
        if (!service) {
          console.error('[SPARE PARTS] Servis nije pronađen, ne mogu poslati emailove');
        } else {
          const client = await storage.getClient(service.clientId);
          const clientName = client?.fullName || 'Nepoznat klijent';
          const clientEmail = client?.email;
          const technicianName = technician?.fullName || req.user?.fullName || 'Nepoznat serviser';
          
          // 1. Email servis firmama ako je deo u garanciji (prema brendu)
          if (validatedData.warrantyStatus === 'u garanciji') {
            console.log(`[SPARE PARTS] Deo je u garanciji, proveravam proizvođača uređaja...`);
            
            // Dobijamo podatke o uređaju i proizvođaču
            const appliance = await storage.getAppliance(service.applianceId);
            if (appliance) {
              const manufacturer = await storage.getManufacturer(appliance.manufacturerId);
              const manufacturerName = manufacturer?.name?.toLowerCase();
              
              console.log(`[SPARE PARTS] Proizvođač uređaja: ${manufacturerName}`);
              
              // AŽURIRANA LOGIKA: Samo Complus servisna firma (Beko je obustavila elektronske servise)
              const complussupportedBrands = ['electrolux', 'elica', 'candy', 'hoover', 'turbo air', 'beko'];
              
              // NAPOMENA: Beko je obustavila elektronske servise - sve notifikacije se šalju na mp4@eurotehnikamn.me
              if (manufacturerName === 'beko') {
                console.log(`[SPARE PARTS] Uređaj je Beko - šaljem notifikaciju na mp4@eurotehnikamn.me (Beko je obustavila elektronske servise)...`);
                
                // Specifična notifikacija za Beko servise
                const bekoEmailResult = await emailService.sendBekoServiceNotification(
                  validatedData.serviceId,
                  validatedData.partName,
                  validatedData.partNumber || 'N/A',
                  clientName,
                  technicianName,
                  validatedData.urgency || 'medium',
                  validatedData.description || ''
                );
                
                console.log(`[SPARE PARTS] Rezultat slanja Beko notifikacije na mp4@eurotehnikamn.me: ${bekoEmailResult ? 'Uspešno' : 'Neuspešno'}`);
              } else if (complussupportedBrands.includes(manufacturerName) && manufacturerName !== 'beko') {
                console.log(`[SPARE PARTS] Uređaj je ${manufacturerName}, šaljem prošireni email Complus servis firmi sa kompletnim kontekstom...`);
                
                // Dobijamo dodatne podatke za kompletne informacije
                const category = await storage.getApplianceCategory(appliance.categoryId);
                
                const complusEmailResult = await emailService.sendEnhancedComplusWarrantySparePartNotification(
                  validatedData.serviceId,
                  validatedData.partName,
                  validatedData.partNumber || 'N/A',
                  validatedData.urgency || 'medium',
                  validatedData.description || '',
                  manufacturer?.name || manufacturerName,
                  service,        // Kompletni podaci o servisu
                  client,         // Kompletni podaci o klijentu  
                  appliance,      // Kompletni podaci o aparatu
                  category,       // Podaci o kategoriji aparata
                  manufacturer,   // Podaci o proizvođaču
                  technician      // Podaci o tehničaru
                );
                
                console.log(`[SPARE PARTS] Rezultat slanja proširenog emaila Complus servis firmi: ${complusEmailResult ? 'Uspešno' : 'Neuspešno'}`);
              } else {
                console.log(`[SPARE PARTS] Uređaj je ${manufacturerName}, ne šaljem email nijednoj servisnoj firmi (nije podržan brend)`);
              }
            } else {
              console.warn(`[SPARE PARTS] Ne mogu da pronađem podatke o uređaju, ne šaljem email servisnim firmama`);
            }
          }

          // 2. Email klijentu o naručivanju rezervnog dela
          if (clientEmail) {
            console.log(`[SPARE PARTS] Šaljem email klijentu ${clientName} (${clientEmail})...`);
            
            const clientEmailResult = await emailService.sendSparePartOrderNotificationToClient(
              clientEmail,
              clientName,
              validatedData.serviceId,
              validatedData.partName,
              validatedData.urgency || 'medium',
              validatedData.warrantyStatus,
              technicianName
            );
            
            console.log(`[SPARE PARTS] Rezultat slanja emaila klijentu: ${clientEmailResult ? 'Uspešno' : 'Neuspešno'}`);
          } else {
            console.warn(`[SPARE PARTS] Klijent ${clientName} nema email adresu, preskačem slanje`);
          }

          // 3. Email kreatoru servisa (ako nije isti kao klijent)
          let creatorEmail = null;
          let creatorName = 'Nepoznat kreator';
          let creatorRole = 'unknown';

          // Proveri da li je servis kreiran od strane poslovnog partnera
          if (service.businessPartnerId) {
            try {
              const businessPartner = await storage.getUser(service.businessPartnerId);
              if (businessPartner && businessPartner.email && businessPartner.email !== clientEmail) {
                creatorEmail = businessPartner.email;
                creatorName = businessPartner.fullName || businessPartner.username;
                creatorRole = 'business_partner';
              }
            } catch (error) {
              console.warn('[SPARE PARTS] Greška pri dobijanju podataka o poslovnom partneru:', error);
            }
          }

          // Ako nema poslovnog partnera, proveravamo da li je admin kreirao servis
          // (u ovom slučaju, čuvamo admin email kao fallback)
          if (!creatorEmail) {
            // Ovde možemo dodati logiku za pronalaženje admin-a koji je kreirao servis
            // Za sada, šaljemo na glavnu admin adresu
            creatorEmail = 'admin@frigosistemtodosijevic.com';
            creatorName = 'Administrator';
            creatorRole = 'admin';
          }

          // Šaljemo email kreatoru servisa samo ako se razlikuje od klijenta
          if (creatorEmail && creatorEmail !== clientEmail) {
            console.log(`[SPARE PARTS] Šaljem email kreatoru servisa ${creatorName} (${creatorRole})...`);
            
            const creatorEmailResult = await emailService.sendSparePartOrderNotificationToCreator(
              creatorEmail,
              creatorName,
              creatorRole,
              validatedData.serviceId,
              clientName,
              validatedData.partName,
              validatedData.urgency || 'medium',
              validatedData.warrantyStatus,
              technicianName
            );
            
            console.log(`[SPARE PARTS] Rezultat slanja emaila kreatoru servisa: ${creatorEmailResult ? 'Uspešno' : 'Neuspešno'}`);
          } else {
            console.log(`[SPARE PARTS] Kreator servisa je isti kao klijent ili nema email, preskačem slanje`);
          }
        }
      } catch (emailError) {
        console.error('[SPARE PARTS] Greška pri slanju emailova:', emailError);
        // Ne prekidamo proces ako emailovi ne mogu da se pošalju
      }

      // ===== SMS TRIGGERI ZA PORUDŽBINU REZERVNIH DELOVA =====
      if (smsService && smsService.isConfigured()) {
        try {
          console.log(`[SMS SISTEM] Početak SMS triggera za porudžbinu rezervnih delova #${order.id}`);
          
          const service = await storage.getService(validatedData.serviceId);
          if (service) {
            const client = await storage.getClient(service.clientId);
            const appliance = service.applianceId ? await storage.getAppliance(service.applianceId) : null;
            const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
            const technician = await storage.getTechnician(technicianId);
            
            const deviceType = category ? category.name : 'Uređaj';
            const technicianName = technician ? technician.fullName : req.user.fullName || 'Nepoznat serviser';
            const deliveryTime = validatedData.urgency === 'urgent' ? '3-5 dana' : '7-10 dana';
            
            // 1. SMS KORISNIKU o porudžbini rezervnih delova
            if (client && client.phone) {
              try {
                await smsService.notifyClientPartsOrdered({
                  clientPhone: client.phone,
                  clientName: client.fullName,
                  serviceId: validatedData.serviceId.toString(),
                  partName: validatedData.partName,
                  deviceType: deviceType,
                  deliveryTime: deliveryTime
                });
                console.log(`[SMS SISTEM] ✅ SMS o porudžbini delova poslat korisniku ${client.fullName} (${client.phone})`);
              } catch (smsError) {
                console.error(`[SMS SISTEM] ❌ Greška pri slanju SMS-a korisniku o porudžbini:`, smsError);
              }
            }
            
            // 2. SMS ADMINISTRATORU o porudžbini rezervnih delova
            const admins = await getAdminsWithPhones();
            for (const admin of admins) {
              try {
                await smsService.notifyAdminPartsOrdered({
                  adminPhone: admin.phone,
                  adminName: admin.fullName,
                  serviceId: validatedData.serviceId.toString(),
                  clientName: client?.fullName || 'Nepoznat klijent',
                  deviceType: deviceType,
                  partName: validatedData.partName,
                  orderedBy: technicianName,
                  urgency: validatedData.urgency || 'normal'
                });
                console.log(`[SMS SISTEM] ✅ SMS o porudžbini delova poslat administratoru ${admin.fullName} (${admin.phone})`);
              } catch (adminSmsError) {
                console.error(`[SMS SISTEM] ❌ Greška pri slanju SMS-a administratoru o porudžbini:`, adminSmsError);
              }
            }
          }
        } catch (smsError) {
          console.error('[SMS SISTEM] Globalna greška pri slanju SMS obaveštenja za porudžbinu rezervnih delova:', smsError);
        }
      }
      
      console.log("🎉 Returning successful response");
      res.status(201).json(order);
    } catch (error) {
      console.error("❌ Error creating spare part order:", error);
      console.error("Request body:", req.body);
      console.error("User data:", req.user);
      console.error("Tech ID:", req.user?.technicianId);
      
      // Pošaljemo detaljniju grešku
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        res.status(500).json({ 
          error: "Failed to create spare part order",
          details: error.message 
        });
      } else {
        res.status(500).json({ error: "Failed to create spare part order" });
      }
    }
  });

  // Update spare part order (admin only)
  app.put("/api/admin/spare-parts/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const orderId = parseInt(req.params.id);
      const updates = req.body;
      
      // Dobijamo stari status pre ažuriranja
      const existingOrder = await storage.getSparePartOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Spare part order not found" });
      }
      
      const updatedOrder = await storage.updateSparePartOrder(orderId, updates);
      if (!updatedOrder) {
        return res.status(404).json({ error: "Spare part order not found" });
      }
      
      // Ako je status promenjen, pošaljemo obaveštenje
      if (updates.status && updates.status !== existingOrder.status) {
        await NotificationService.notifySparePartStatusChanged(
          orderId, 
          existingOrder.status, 
          updates.status, 
          req.user.id
        );
        
        // Posebno obaveštenje za "delivered" status
        if (updates.status === 'delivered') {
          await NotificationService.notifySparePartReceived(orderId, req.user.id);
        }
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating spare part order:", error);
      res.status(500).json({ error: "Failed to update spare part order" });
    }
  });

  // Return service from waiting_parts to active status (admin only)
  app.post("/api/admin/services/:id/return-from-waiting", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const serviceId = parseInt(req.params.id);
      const { newStatus = 'in_progress', adminNotes = '' } = req.body;
      
      // Dobij podatke o servisu
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      if (service.status !== 'waiting_parts') {
        return res.status(400).json({ error: "Service is not in waiting_parts status" });
      }
      
      // Ažuriraj servis
      const updatedService = await storage.updateService(serviceId, {
        status: newStatus,
        technicianNotes: service.technicianNotes + 
          `\n[${new Date().toLocaleDateString('sr-RS')}] Servis vraćen u realizaciju - rezervni deo dostupan. ${adminNotes}`
      });
      
      // Obavesti servisera da može da nastavi rad
      if (service.technicianId) {
        const technicianUser = await storage.getUserByTechnicianId(service.technicianId);
        if (technicianUser) {
          await NotificationService.notifyServiceReturnedFromWaiting(
            serviceId,
            technicianUser.id,
            req.user.id
          );
        }
      }
      
      res.json(updatedService);
    } catch (error) {
      console.error("Error returning service from waiting:", error);
      res.status(500).json({ error: "Failed to return service from waiting" });
    }
  });

  // Delete spare part order (admin only)
  app.delete("/api/admin/spare-parts/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const orderId = parseInt(req.params.id);
      const deleted = await storage.deleteSparePartOrder(orderId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Spare part order not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting spare part order:", error);
      res.status(500).json({ error: "Failed to delete spare part order" });
    }
  });

  // Admin spare parts ordering endpoint
  app.post("/api/admin/spare-parts/order", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const {
        serviceId,
        applianceSerialNumber,
        brand,
        deviceModel,
        productCode,
        applianceCategory,
        partName,
        quantity = 1,
        description,
        warrantyStatus,
        urgency = 'normal',
        emailTarget
      } = req.body;

      // Validacija obaveznih polja
      if (!brand || !deviceModel || !productCode || !applianceCategory || !partName) {
        return res.status(400).json({ error: "Obavezna polja nisu popunjena" });
      }

      // AŽURIRANA VALIDACIJA: Beko je obustavila elektronske servise
      const validBrandEmails = {
        'beko': 'mp4@eurotehnikamn.me', // Beko notifikacije se šalju na mp4@eurotehnikamn.me
        'complus': 'servis@complus.me'
      };

      if (!validBrandEmails[brand as keyof typeof validBrandEmails]) {
        return res.status(400).json({ error: "Nepoznat brend aparata" });
      }

      const targetEmail = validBrandEmails[brand as keyof typeof validBrandEmails];

      // Ako je povezano sa servisom, pokušaj da povučeš technicianId i applianceId
      let linkedTechnicianId = null;
      let linkedApplianceId = null;
      
      if (serviceId) {
        try {
          const linkedService = await storage.getService(serviceId);
          if (linkedService) {
            linkedTechnicianId = linkedService.technicianId;
            linkedApplianceId = linkedService.applianceId;
          }
        } catch (serviceError) {
          console.log('Greška pri povezivanju sa servisom:', serviceError);
          // Ne prekidamo proces ako nema servisa
        }
      }

      // Kreiraj narudžbu u bazi podataka
      const sparePartOrder = await storage.createSparePartOrder({
        serviceId: serviceId || null,
        technicianId: linkedTechnicianId, // Povezan serviser iz servisa ili null za admin narudžbu
        applianceId: linkedApplianceId, // Povezan uređaj iz servisa ili null
        partName,
        partNumber: productCode,
        quantity,
        description: `${applianceCategory} - ${deviceModel}${applianceSerialNumber ? `\nSerijski broj: ${applianceSerialNumber}` : ''}\n${description || ''}`.trim(),
        urgency,
        status: 'pending',
        warrantyStatus: warrantyStatus || 'u garanciji',
        supplierName: brand === 'beko' ? 'Beko (obustavljena elektronska podrška)' : 'Complus',
        orderDate: new Date(),
        adminNotes: `Admin porudžbina - ${brand.toUpperCase()} brend${serviceId ? ` (Servis #${serviceId})` : ''}${applianceSerialNumber ? ` - SN: ${applianceSerialNumber}` : ''}`
      });

      // Povuci detaljne informacije o servisu za email
      let serviceDetails = '';
      let technicianName = '';
      let clientDetails = '';
      let applianceDetails = '';
      
      if (serviceId) {
        try {
          const service = await storage.getService(serviceId);
          if (service) {
            // Povuci podatke o klijentu
            const client = await storage.getClient(service.clientId);
            if (client) {
              clientDetails = `
PODACI O KLIJENTU:
• Ime: ${client.fullName}
• Telefon: ${client.phone || 'N/A'}
• Email: ${client.email || 'N/A'}
• Adresa: ${client.address || 'N/A'}, ${client.city || 'N/A'}`;
            }
            
            // Povuci podatke o aparatu
            const appliance = await storage.getAppliance(service.applianceId);
            if (appliance) {
              // Povuci kategoriju aparata
              let categoryName = 'N/A';
              if (appliance.categoryId) {
                try {
                  const category = await storage.getApplianceCategory(appliance.categoryId);
                  categoryName = category?.name || 'N/A';
                } catch (catError) {
                  console.log('Greška pri dohvatanju kategorije aparata:', catError);
                }
              }
              
              // Povuci proizvođača
              let manufacturerName = 'N/A';
              if (appliance.manufacturerId) {
                try {
                  const manufacturer = await storage.getManufacturer(appliance.manufacturerId);
                  manufacturerName = manufacturer?.name || 'N/A';
                } catch (manError) {
                  console.log('Greška pri dohvatanju proizvođača:', manError);
                }
              }
              
              applianceDetails = `
PODACI O APARATU (IZ SERVISA):
• Kategorija: ${categoryName}
• Proizvođač: ${manufacturerName}  
• Model: ${appliance.model || 'N/A'}
• Serijski broj: ${appliance.serialNumber || 'N/A'}
• Datum kupovine: ${appliance.purchaseDate ? new Date(appliance.purchaseDate).toLocaleDateString('sr-RS') : 'N/A'}
• Napomene: ${appliance.notes || 'N/A'}`;
            }
            
            // Povuci podatke o serviseru
            if (service.technicianId) {
              try {
                const technician = await storage.getTechnician(service.technicianId);
                if (technician) {
                  technicianName = `
DODELJENI SERVISER:
• Ime: ${technician.name}
• Telefon: ${technician.phone || 'N/A'}
• Email: ${technician.email || 'N/A'}`;
                }
              } catch (techError) {
                console.log('Greška pri dohvatanju servisera:', techError);
              }
            }
            
            serviceDetails = `
PODACI O SERVISU:
• Broj servisa: #${service.id}
• Status: ${service.status}
• Datum kreiranja: ${new Date(service.createdAt).toLocaleDateString('sr-RS')}
• Datum zakazivanja: ${service.scheduledDate ? new Date(service.scheduledDate).toLocaleDateString('sr-RS') : 'N/A'}
• Opis problema: ${service.problemDescription || 'N/A'}
• Napomene servisera: ${service.technicianNotes || 'N/A'}
• Cena servisa: ${service.serviceCost || 'N/A'} €${clientDetails}${applianceDetails}${technicianName}`;
          }
        } catch (serviceError) {
          console.error('Greška pri povlačenju podataka o servisu:', serviceError);
          serviceDetails = `\nServis #${serviceId} - greška pri učitavanju detalja`;
        }
      }

      const emailSubject = `${urgency === 'high' ? '[HITNO] ' : ''}Porudžbina rezervnog dela - ${brand.toUpperCase()}`;
      
      const emailContent = `
Poštovani,

Molimo da obezbedite sledeći rezervni deo:

PODACI O APARATU (ADMIN UNOS):
• Brend: ${brand.toUpperCase()}
• Model: ${deviceModel}
• Tip aparata: ${applianceCategory}
• Produkt kod: ${productCode}

REZERVNI DEO:
• Naziv dela: ${partName}
• Količina: ${quantity}
• Garancijski status: ${warrantyStatus === 'u garanciji' ? '🛡️ U garanciji' : '💰 Van garancije'}
• Hitnost: ${urgency === 'high' ? '🚨 HITNO' : urgency === 'normal' ? 'Normalna' : 'Niska'}

${description ? `DODATNE NAPOMENE:\n${description}\n` : ''}${serviceDetails}

PORUDŽBINA BR: ${sparePartOrder.id}
Datum porudžbine: ${new Date().toLocaleDateString('sr-RS')}

Molimo potvrdite dostupnost i rok isporuke.

S poštovanjem,
Frigo Sistem Todosijević
Admin panel - automatska porudžbina
      `.trim();

      try {
        if (brand === 'beko') {
          // Za Beko, koristi specijalnu notifikaciju umesto običnog emaila
          await emailService.sendBekoServiceNotification(
            serviceId || 0,
            partName,
            productCode,
            'Nedefinisan klijent', // Admin unos, nema specificiran klijent
            req.user.fullName || req.user.username || 'Administrator',
            urgency,
            description
          );
          console.log(`[SPARE PARTS ORDER] Beko notifikacija poslata na mp4@eurotehnikamn.me`);
        } else {
          // Za ostale brendove, koristi standardni email
          await emailService.sendEmail(
            targetEmail,
            emailSubject,
            emailContent
          );
          console.log(`[SPARE PARTS ORDER] Email poslat na ${targetEmail} za ${brand} rezervni deo`);
        }
      } catch (emailError) {
        console.error('[SPARE PARTS ORDER] Greška pri slanju email-a:', emailError);
        // Ne prekidamo proces zbog email greške
      }

      // EMAIL OBAVEŠTENJA ZA ADMINISTRATORE ONEMOGUĆENA
      // Korisnik je zatražio da se iskljuće sva email obaveštenja za administratore
      console.log("[EMAIL] Admin obaveštenja onemogućena po zahtevu korisnika");

      // Automatski SMS za rezervne delove - obavesti klijenta
      if (serviceId) {
        try {
          const service = await storage.getService(serviceId);
          if (service?.clientId) {
            const client = await storage.getClient(service.clientId);
            if (client?.phone) {
              const appliance = await storage.getAppliance(service.applianceId);
              const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
              
              const settings = await storage.getSystemSettings();
              const smsConfig = {
                apiKey: settings.sms_mobile_api_key || '',
                baseUrl: settings.sms_mobile_base_url || 'https://api.smsmobileapi.com',
                senderId: settings.sms_mobile_sender_id || 'FRIGO SISTEM',
                enabled: settings.sms_mobile_enabled === 'true'
              };

              if (smsConfig.enabled && smsConfig.apiKey) {
                const { SMSCommunicationService } = await import('./sms-communication-service.js');
                const smsService = new SMSCommunicationService(smsConfig);
                
                await smsService.notifySparePartOrdered({
                  clientPhone: client.phone,
                  clientName: client.fullName,
                  serviceId: serviceId.toString(),
                  deviceType: category?.name || 'Uređaj',
                  partName: partName,
                  estimatedDate: '5-7 radnih dana'
                });
                
                console.log(`📱 SMS o porudžbini rezervnog dela poslat klijentu ${client.fullName}`);
              }
            }
          }
        } catch (smsError) {
          console.error('❌ Greška pri SMS obaveštenju o rezervnom delu:', smsError);
        }
      }

      // ===== AUTOMATSKI SMS TRIGGERI ZA BUSINESS PARTNERE (Admin spare parts order) =====
      if (serviceId) {
        try {
          const service = await storage.getService(serviceId);
          if (service?.businessPartnerId) {
            const businessPartner = await storage.getUser(service.businessPartnerId);
            const client = service.clientId ? await storage.getClient(service.clientId) : null;
            const appliance = await storage.getAppliance(service.applianceId);
            const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
            
            if (businessPartner && businessPartner.phone) {
              const settings = await storage.getSystemSettings();
              if (settings.sms_mobile_enabled === 'true' && settings.sms_mobile_api_key) {
                const smsConfig = {
                  apiKey: settings.sms_mobile_api_key,
                  baseUrl: settings.sms_mobile_base_url || 'https://api.smsmobileapi.com',
                  senderId: settings.sms_mobile_sender_id || 'FRIGO SISTEM',
                  enabled: true
                };

                const { SMSCommunicationService } = await import('./sms-communication-service.js');
                const smsService = new SMSCommunicationService(smsConfig);
                
                await smsService.notifyBusinessPartnerPartsOrdered({
                  partnerPhone: businessPartner.phone,
                  partnerName: businessPartner.fullName,
                  serviceId: serviceId.toString(),
                  clientName: client?.fullName || 'Nepoznat klijent',
                  partName: partName,
                  deviceType: category?.name || 'Uređaj',
                  deliveryTime: urgency === 'high' ? '3-5 dana' : '7-10 dana'
                });
                console.log(`[SMS SISTEM] ✅ SMS o admin porudžbini dijelova poslat poslovnom partneru ${businessPartner.fullName} (${businessPartner.phone})`);
              }
            }
          }
        } catch (smsError) {
          console.error(`[SMS SISTEM] ❌ Greška pri slanju SMS-a poslovnom partneru o admin porudžbini:`, smsError);
        }
      }

      res.json({
        success: true,
        orderId: sparePartOrder.id,
        message: `Rezervni deo je uspešno poručen. ${brand === 'beko' ? 'Beko notifikacija je poslata na mp4@eurotehnikamn.me (Beko je obustavila elektronske servise)' : 'Email je poslat Complus servisu'}.`
      });

    } catch (error) {
      console.error("Error creating admin spare part order:", error);
      res.status(500).json({ error: "Greška pri kreiranju porudžbine rezervnog dela" });
    }
  });

  // Data export endpoints - CSV and Excel
  app.get("/api/export/data/:table", async (req, res) => {
    try {
      console.log(`[EXPORT] Zahtev za izvoz: table=${req.params.table}, format=${req.query.format}, user=${req.user?.username}`);
      
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        console.log(`[EXPORT] Pristup odbijen: authenticated=${req.isAuthenticated()}, role=${req.user?.role}`);
        return res.status(403).json({ error: "Nemate dozvolu za izvoz podataka" });
      }
      
      const table = req.params.table;
      const format = req.query.format as string || 'csv';
      
      console.log(`[EXPORT] Obrađuje se: table=${table}, format=${format}`);
      
      // Mapiranje naziva tabela u Drizzle table definicije
      const tableMap: Record<string, any> = {
        'clients': schema.clients,
        'services': schema.services,
        'appliances': schema.appliances,
        'technicians': schema.technicians,
        'users': schema.users,
        'appliance_categories': schema.applianceCategories,
        'manufacturers': schema.manufacturers,
        'notifications': schema.notifications,
        'maintenance_schedules': schema.maintenanceSchedules,
        'maintenance_alerts': schema.maintenanceAlerts,
        'spare_part_orders': schema.sparePartOrders
      };
      
      const drizzleTable = tableMap[table];
      if (!drizzleTable) {
        return res.status(400).json({ error: "Nepoznata tabela za izvoz" });
      }
      
      // Dobijanje podataka iz tabele pomoću Drizzle ORM
      let rows;
      try {
        // Pokušaj sa sortiranjem po id
        rows = await db.select().from(drizzleTable).orderBy(drizzleTable.id);
      } catch (error) {
        // Ako nema id kolonu, sortiranje bez ORDER BY
        console.log(`Tabela ${table} nema id kolonu, sortiranje bez ORDER BY`);
        rows = await db.select().from(drizzleTable);
      }
      
      if (format === 'csv') {
        // CSV format
        if (rows.length === 0) {
          // Vratiti prazan CSV sa samo headerom
          let headers: string[] = [];
          try {
            const emptyRows = await db.select().from(drizzleTable).limit(0);
            headers = Object.keys(emptyRows[0] || {});
          } catch {
            // Fallback: koristi kolone iz schema objekta
            headers = Object.keys(drizzleTable).filter(key => key !== 'getSQL');
          }
          
          if (headers.length === 0) {
            return res.status(400).json({ error: "Tabela nema definisane kolone" });
          }
          
          const csvContent = headers.join(',');
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename=${table}.csv`);
          res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
          return res.end(csvContent);
        }
        
        // Create CSV content
        const headers = Object.keys(rows[0]);
        console.log(`[EXPORT] Kreiranje CSV za tabelu ${table}, broj redova: ${rows.length}, kolone: ${headers.join(', ')}`);
        
        const csvContent = [
          headers.join(','), // Header row
          ...rows.map(row => 
            headers.map(header => {
              const value = row[header];
              // Escape quotes and wrap in quotes if contains comma, quote, or newline
              if (value === null || value === undefined) return '';
              const stringValue = String(value);
              if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            }).join(',')
          )
        ].join('\n');
        
        console.log(`[EXPORT] CSV kreiran, veličina: ${Buffer.byteLength(csvContent, 'utf8')} bytes`);
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${table}.csv`);
        res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
        
        console.log(`[EXPORT] Šalje se CSV fajl za tabelu ${table}`);
        res.end(csvContent);
      } else {
        return res.status(400).json({ error: "Nepodržan format. Koristite 'csv'" });
      }
      
    } catch (error) {
      console.error(`[EXPORT] Greška pri izvozu podataka za tabelu ${req.params.table}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Nepoznata greška";
      res.status(500).json({ 
        error: "Greška pri izvozu podataka", 
        details: errorMessage,
        table: req.params.table 
      });
    }
  });
  
  // TEST SMS DODATNI ADMINISTRATOR ENDPOINT
  app.post("/api/test-sms-teodora", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      const smsConfig = {
        apiKey: settings.sms_mobile_api_key || '',
        baseUrl: settings.sms_mobile_base_url || 'https://api.smsmobileapi.com',
        senderId: settings.sms_mobile_sender_id || null,
        enabled: settings.sms_mobile_enabled === 'true'
      };

      if (!smsConfig.enabled || !smsConfig.apiKey) {
        return res.status(400).json({ error: "SMS servis nije konfigurisan" });
      }

      const { SMSCommunicationService } = await import('./sms-communication-service.js');
      const smsService = new SMSCommunicationService(smsConfig);

      // Test SMS sa mock podacima za status promenu
      console.log('📱 TESTIRANJE SMS DODATNOM ADMINISTRATORU - Teodora Todosijević');
      const testResults = await smsService.notifyServiceStatusChange({
        serviceId: 'TEST-001',
        clientPhone: '067000000',
        clientName: 'Test Klijent',
        technicianName: 'Test Serviser',
        deviceType: 'Test Frižider',
        manufacturerName: 'Samsung',
        oldStatus: 'assigned',
        newStatus: 'in_progress',
        statusDescription: 'Servis u toku',
        businessPartnerPhone: undefined,
        businessPartnerName: undefined
      });

      res.json({
        message: 'Test SMS poslat svim administratorima uključujući Teodoru Todosijević',
        smsEnabled: smsConfig.enabled,
        results: {
          adminSMS: testResults.adminSMS,
          totalAdminsSent: testResults.adminSMS?.length || 0,
          successfulAdminsSent: testResults.adminSMS?.filter(r => r.success).length || 0
        }
      });
    } catch (error) {
      console.error('Greška pri test SMS-u:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // API ENDPOINT ZA PARTS ACTIVITY LOG
  app.get("/api/admin/parts-activity-log", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      
      // Za sada vraćam prazan array dok se ne implementira kompletna logika
      const activities: any[] = [];
      
      res.json(activities);
    } catch (error) {
      console.error('Greška pri dohvatanju aktivnosti:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju aktivnosti rezervnih delova' });
    }
  });

  // Endpoint za listu dostupnih tabela
  app.get("/api/export/tables", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za pristup" });
      }
      
      const tables = [
        { name: 'clients', displayName: 'Klijenti', description: 'Podaci o klijentima' },
        { name: 'services', displayName: 'Servisi', description: 'Podaci o servisima' },
        { name: 'appliances', displayName: 'Uređaji', description: 'Podaci o uređajima' },
        { name: 'technicians', displayName: 'Serviseri', description: 'Podaci o serviserima' },
        { name: 'users', displayName: 'Korisnici', description: 'Podaci o korisnicima sistema' },
        { name: 'appliance_categories', displayName: 'Kategorije uređaja', description: 'Kategorije bijele tehnike' },
        { name: 'manufacturers', displayName: 'Proizvođači', description: 'Proizvođači uređaja' },
        { name: 'notifications', displayName: 'Obavještenja', description: 'Sistemska obavještenja' },
        { name: 'maintenance_schedules', displayName: 'Raspored održavanja', description: 'Planovi održavanja' },
        { name: 'maintenance_alerts', displayName: 'Upozorenja održavanja', description: 'Automatska upozorenja' },
        { name: 'spare_part_orders', displayName: 'Narudžbe rezervnih djelova', description: 'Narudžbe dijelova' }
      ];
      
      // Mapiranje naziva tabela u Drizzle table definicije
      const tableMap: Record<string, any> = {
        'clients': schema.clients,
        'services': schema.services,
        'appliances': schema.appliances,
        'technicians': schema.technicians,
        'users': schema.users,
        'appliance_categories': schema.applianceCategories,
        'manufacturers': schema.manufacturers,
        'notifications': schema.notifications,
        'maintenance_schedules': schema.maintenanceSchedules,
        'maintenance_alerts': schema.maintenanceAlerts,
        'spare_part_orders': schema.sparePartOrders
      };

      // Dodaj broj zapisa za svaku tabelu koristeći Drizzle ORM
      const tablesWithCounts = await Promise.all(
        tables.map(async (table) => {
          try {
            const drizzleTable = tableMap[table.name];
            if (!drizzleTable) {
              return { ...table, recordCount: 0 };
            }
            
            const result = await db.select({ count: sql`count(*)` }).from(drizzleTable);
            return {
              ...table,
              recordCount: parseInt(result[0].count as string)
            };
          } catch (error) {
            return {
              ...table,
              recordCount: 0
            };
          }
        })
      );
      
      res.json(tablesWithCounts);
    } catch (error) {
      console.error("Greška pri dobijanju lista tabela:", error);
      res.status(500).json({ error: "Greška pri dobijanju lista tabela" });
    }
  });

  // ===== AVAILABLE PARTS API ENDPOINTS =====
  
  // Get all available parts (admin only)
  app.get("/api/admin/available-parts", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const parts = await storage.getAllAvailableParts();
      res.json(parts);
    } catch (error) {
      console.error("Error fetching available parts:", error);
      res.status(500).json({ error: "Failed to fetch available parts" });
    }
  });

  // Get available part by ID (admin only)
  app.get("/api/admin/available-parts/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const part = await storage.getAvailablePart(parseInt(req.params.id));
      if (!part) {
        return res.status(404).json({ error: "Dostupan deo nije pronađen" });
      }
      res.json(part);
    } catch (error) {
      console.error("Error fetching available part:", error);
      res.status(500).json({ error: "Failed to fetch available part" });
    }
  });

  // Mark spare part as received and move to available parts (admin only)
  app.post("/api/admin/spare-parts/:id/mark-received", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const orderId = parseInt(req.params.id);
      const { actualCost, location, notes } = req.body;

      const result = await storage.markSparePartAsReceived(orderId, req.user.id, {
        actualCost,
        location: location || 'Glavno skladište',
        notes
      });

      if (!result) {
        return res.status(404).json({ error: "Narudžba rezervnog dela nije pronađena" });
      }

      res.json({
        message: "Rezervni deo je uspešno označen kao primljen i premešten u skladište",
        order: result.order,
        availablePart: result.availablePart
      });
    } catch (error) {
      console.error("Error marking spare part as received:", error);
      res.status(500).json({ error: "Failed to mark spare part as received" });
    }
  });

  // Assign available part to technician (admin only)
  app.post("/api/admin/available-parts/:id/assign", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const partId = parseInt(req.params.id);
      const { technicianId, quantity, assignmentNotes } = req.body;

      if (!technicianId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: "Potreban je ID servisera i validna količina" });
      }

      // Get the available part
      const part = await storage.getAvailablePart(partId);
      if (!part) {
        return res.status(404).json({ error: "Dostupan deo nije pronađen" });
      }

      if (part.quantity < quantity) {
        return res.status(400).json({ error: "Nema dovoljno delova na stanju" });
      }

      // Update quantity (reduce by assigned amount)
      const updatedPart = await storage.updateAvailablePartQuantity(partId, -quantity);

      // If quantity reaches 0, delete the part from available parts
      if (updatedPart && updatedPart.quantity <= 0) {
        await storage.deleteAvailablePart(partId);
      }

      // Get technician info for notification
      const technician = await storage.getTechnician(technicianId);
      
      // Here you could create a notification or record for the technician
      // For now, we'll just return success
      
      res.json({
        message: `Uspešno dodeljeno ${quantity} kom dela "${part.partName}" serviseru ${technician?.fullName || `ID: ${technicianId}`}`,
        assignedQuantity: quantity,
        remainingQuantity: updatedPart ? updatedPart.quantity : 0,
        assignmentNotes
      });
    } catch (error) {
      console.error("Error assigning part to technician:", error);
      res.status(500).json({ error: "Failed to assign part to technician" });
    }
  });

  // Delete available part (admin only)
  app.delete("/api/admin/available-parts/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const partId = parseInt(req.params.id);
      const success = await storage.deleteAvailablePart(partId);
      
      if (success) {
        res.json({ message: "Dostupan deo je uspešno uklonjen sa stanja" });
      } else {
        res.status(404).json({ error: "Dostupan deo nije pronađen" });
      }
    } catch (error) {
      console.error("Error deleting available part:", error);
      res.status(500).json({ error: "Failed to delete available part" });
    }
  });

  // Endpoint za dopunjavanje Generali servisa
  app.patch("/api/services/:id/supplement-generali", jwtAuth, async (req, res) => {
    try {
      // Dopuna Generali podataka za servis

      if (req.user?.role !== "technician") {
        return res.status(403).json({ error: "Samo serviseri mogu dopunjavati Generali servise" });
      }

      const serviceId = parseInt(req.params.id);
      const updateData = req.body;

      // Validacija podataka
      const { supplementGeneraliServiceSchema } = await import("@shared/schema");
      const validationResult = supplementGeneraliServiceSchema.safeParse({
        serviceId,
        ...updateData
      });

      // Validacija podataka

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Neispravni podaci",
          details: validationResult.error.errors
        });
      }

      const validData = validationResult.data;

      // Proveri da li servis postoji
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }

      // Povuci korisničke podatke da bi dobio technicianId
      const userDetails = await storage.getUser(req.user.id);
      if (!userDetails || !userDetails.technicianId) {
        return res.status(403).json({ error: "Nemate ulogu servisera" });
      }

      // Serviseri mogu dopunjavati Generali podatke za bilo koji servis
      // (uklonjena ograničavajuća provera dodele servisa)

      // Dopuni podatke o klijentu ako su navedeni
      if (validData.clientEmail || validData.clientAddress || validData.clientCity) {
        const updateClientData: any = {};
        if (validData.clientEmail) updateClientData.email = validData.clientEmail;
        if (validData.clientAddress) updateClientData.address = validData.clientAddress;
        if (validData.clientCity) updateClientData.city = validData.clientCity;

        await storage.updateClient(service.clientId, updateClientData);
      }

      // Dopuni podatke o aparatu ako su navedeni
      if (validData.serialNumber || validData.model || validData.purchaseDate) {
        const updateApplianceData: any = {};
        if (validData.serialNumber) updateApplianceData.serialNumber = validData.serialNumber;
        if (validData.model) updateApplianceData.model = validData.model;
        if (validData.purchaseDate) updateApplianceData.purchaseDate = validData.purchaseDate;

        await storage.updateAppliance(service.applianceId, updateApplianceData);
      }

      // Dodaj napomene o dopuni u tehnicianske napomene ako postoje
      if (validData.supplementNotes) {
        const currentNotes = service.technicianNotes || "";
        const updatedNotes = currentNotes ? 
          `${currentNotes}\n\n[DOPUNA GENERALI] ${validData.supplementNotes}` :
          `[DOPUNA GENERALI] ${validData.supplementNotes}`;
        
        await storage.updateService(serviceId, { technicianNotes: updatedNotes });
      }

      // Vraćaj ažurirani servis
      const updatedService = await storage.getService(serviceId);
      res.json({ 
        success: true, 
        message: "Generali servis je uspešno dopunjen",
        service: updatedService 
      });

    } catch (error) {
      console.error("❌ GENERALI DOPUNA - Greška:", error);
      res.status(500).json({ error: "Greška pri dopunjavanju servisa" });
    }
  });

  // Allocate available part to technician for service (admin only)
  app.post("/api/admin/available-parts/:id/allocate", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const partId = parseInt(req.params.id);
      const { serviceId, technicianId, quantity } = req.body;

      // Validate input
      if (!serviceId || !technicianId || !quantity || quantity <= 0) {
        return res.status(400).json({ 
          error: "Servis ID, serviser ID i količina su obavezni i količina mora biti pozitivna" 
        });
      }

      // Get service and technician details for SMS
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }

      const technician = await storage.getTechnician(technicianId);
      if (!technician) {
        return res.status(404).json({ error: "Serviser nije pronađen" });
      }

      const client = await storage.getClient(service.clientId);
      if (!client) {
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }

      const part = await storage.getAvailablePart(partId);
      if (!part) {
        return res.status(404).json({ error: "Deo nije pronađen" });
      }

      // Allocate part to technician
      const result = await storage.getAllocatePartToTechnician(
        partId,
        serviceId,
        technicianId,
        quantity,
        req.user.id
      );

      if (!result) {
        return res.status(500).json({ error: "Greška pri dodeli dela serviseru" });
      }

      // Send SMS notifications to all parties
      try {
        const smsService = new SMSCommunicationService();
        
        // Get business partner phone if exists
        let businessPartnerPhone = null;
        if (service.businessPartnerId) {
          const partner = await storage.getUser(service.businessPartnerId);
          businessPartnerPhone = partner?.phone || null;
        }

        await smsService.notifyPartsAllocated(
          service.id.toString(),
          client.phone,
          businessPartnerPhone,
          part.partName,
          quantity,
          technician.fullName,
          client.fullName
        );
      } catch (smsError) {
        console.error('❌ SMS notification error:', smsError);
        // Don't fail the allocation if SMS fails
      }

      res.json({
        success: true,
        message: "Deo je uspešno dodeljen serviseru",
        allocation: result.allocation,
        remainingQuantity: result.remainingQuantity
      });

    } catch (error) {
      console.error("Error allocating part to technician:", error);
      res.status(500).json({ 
        error: error.message || "Greška pri dodeli dela serviseru" 
      });
    }
  });

  // Test endpoint za warranty status email notifikacije
  app.post("/api/test-warranty-email", async (req, res) => {
    try {
      // Mock podatci za test
      const testClient = {
        id: 999,
        fullName: "Test Korisnik",
        email: "gruica@frigosistemtodosijevic.com",
        phone: "067123456",
        address: "Test Adresa 123",
        city: "Podgorica"
      };

      const { warrantyStatus = "in_warranty" } = req.body;
      
      console.log(`[TEST EMAIL] Šalje test warranty email na ${testClient.email} sa statusom: ${warrantyStatus}`);
      
      const emailService = new EmailService();
      
      const result = await emailService.sendServiceStatusUpdate(
        testClient,
        999,
        "Završen",
        "Test servis je završen uspešno. Proverena je funkcionalnost uređaja i uklonjen je kvar.",
        "Gruica Todosijević",
        warrantyStatus
      );
      
      if (result) {
        console.log(`[TEST EMAIL] ✅ Test email uspešno poslat na ${testClient.email}`);
        res.json({ 
          success: true, 
          message: `Test warranty email (${warrantyStatus}) poslat na ${testClient.email}`,
          warrantyStatus,
          recipient: testClient.email
        });
      } else {
        console.error(`[TEST EMAIL] ❌ Neuspešno slanje test emaila`);
        res.status(500).json({ 
          success: false, 
          error: "Neuspešno slanje test emaila. Proverite SMTP konfiguraciju."
        });
      }
      
    } catch (error) {
      console.error("[TEST EMAIL] Greška pri slanju test emaila:", error);
      res.status(500).json({ 
        success: false, 
        error: "Greška pri slanju test emaila",
        message: error.message
      });
    }
  });

  // ===== AVAILABLE PARTS ENDPOINTS =====

  // Mark spare part as received and move to available parts (admin only)
  app.post("/api/admin/spare-parts/:id/mark-received", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const orderId = parseInt(req.params.id);
      const { actualCost, location, notes } = req.body;
      
      const result = await storage.markSparePartAsReceived(orderId, req.user.id, {
        actualCost,
        location,
        notes
      });
      
      if (!result) {
        return res.status(404).json({ error: "Porudžbina rezervnog dela nije pronađena" });
      }
      
      res.json({
        success: true,
        message: "Rezervni deo je uspešno označen kao primljen i dodatan u skladište",
        order: result.order,
        availablePart: result.availablePart
      });
    } catch (error) {
      console.error("Error marking spare part as received:", error);
      res.status(500).json({ error: "Greška pri označavanju dela kao primljenog" });
    }
  });

  // Get all available parts (admin only)
  app.get("/api/admin/available-parts", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const parts = await storage.getAllAvailableParts();
      res.json(parts);
    } catch (error) {
      console.error("Error fetching available parts:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dostupnih delova" });
    }
  });

  // Get parts activity log (admin only)
  app.get("/api/admin/parts-activity-log", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const { partId, limit } = req.query;
      const activities = await storage.getPartActivityLog(
        partId ? parseInt(partId as string) : undefined,
        limit ? parseInt(limit as string) : 50
      );
      res.json(activities);
    } catch (error) {
      console.error("Error fetching parts activity log:", error);
      res.status(500).json({ error: "Greška pri dohvatanju log aktivnosti" });
    }
  });

  // Allocate available part to technician for service (admin only)
  app.post("/api/admin/available-parts/:partId/allocate", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const partId = parseInt(req.params.partId);
      const { serviceId, technicianId, allocatedQuantity, allocationNotes } = req.body;

      if (!technicianId || !allocatedQuantity) {
        return res.status(400).json({ error: "Serviser ID i količina su obavezni" });
      }

      // Get service details for notifications (if serviceId provided)
      let service = null;
      if (serviceId) {
        service = await storage.getService(serviceId);
        if (!service) {
          return res.status(404).json({ error: "Servis nije pronađen" });
        }
      }

      // Get technician details
      const technician = await storage.getUser(technicianId);
      if (!technician || technician.role !== "technician") {
        return res.status(404).json({ error: "Serviser nije pronađen" });
      }

      // Get part details
      const part = await storage.getAvailablePart(partId);
      if (!part) {
        return res.status(404).json({ error: "Dostupni deo nije pronađen" });
      }

      // Create allocation
      const allocation = await storage.allocatePartToTechnician({
        availablePartId: partId,
        serviceId: serviceId || null,
        technicianId,
        allocatedQuantity: parseInt(allocatedQuantity),
        allocatedBy: req.user.id,
        allocationNotes: allocationNotes || null,
        status: "allocated"
      });

      // Send notifications to all involved parties
      try {
        let client = null;
        let appliance = null;
        
        if (service) {
          client = await storage.getClient(service.clientId);
          appliance = await storage.getAppliance(service.applianceId);
        }

        // Notify technician
        const notificationMessage = serviceId 
          ? `Dodeljen vam je rezervni deo "${part.partName}" (${allocatedQuantity} kom) za servis #${serviceId}`
          : `Dodeljen vam je rezervni deo "${part.partName}" (${allocatedQuantity} kom)`;
          
        await notificationService.createNotification({
          userId: technicianId,
          type: "parts_allocated",
          title: "Rezervni deo dodeljen",
          message: notificationMessage,
          relatedId: serviceId || null,
          priority: "normal"
        });

        // Notify client via SMS
        if (client?.phone) {
          const smsData = {
            clientName: client.fullName,
            technicianName: technician.fullName,
            partName: part.partName,
            quantity: allocatedQuantity,
            serviceId: serviceId,
            deviceType: appliance ? appliance.model || 'uređaj' : 'uređaj'
          };

          await smsService.sendClientPartsAllocated(client.phone, smsData);
        }

        // Notify all admins via SMS
        await smsService.sendSMSToAllAdmins('admin_parts_allocated', {
          clientName: client?.fullName || 'N/A',
          technicianName: technician.fullName,
          partName: part.partName,
          quantity: allocatedQuantity,
          serviceId: serviceId
        });

        // Notify business partner if applicable
        if (service && service.businessPartnerId) {
          const businessPartner = await storage.getUser(service.businessPartnerId);
          if (businessPartner?.phone) {
            await smsService.sendBusinessPartnerPartsAllocated(businessPartner.phone, {
              clientName: client?.fullName || 'N/A',
              technicianName: technician.fullName,
              partName: part.partName,
              quantity: allocatedQuantity,
              serviceId: serviceId
            });
          }
        }

      } catch (notifError) {
        console.error("Greška pri slanju obaveštenja o dodeli dela:", notifError);
        // Allocation still succeeded, just log the notification error
      }

      res.status(201).json({ 
        allocation,
        message: "Rezervni deo uspešno dodeljen serviseru" 
      });

    } catch (error) {
      console.error("Error allocating part to technician:", error);
      res.status(500).json({ error: "Greška pri dodeli rezervnog dela" });
    }
  });

  // Get part allocations (admin only)
  app.get("/api/admin/parts-allocations", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const { serviceId, technicianId } = req.query;
      const allocations = await storage.getPartAllocations(
        serviceId ? parseInt(serviceId as string) : undefined,
        technicianId ? parseInt(technicianId as string) : undefined
      );
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching parts allocations:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dodela delova" });
    }
  });

  // Get available part by ID (admin only)
  app.get("/api/admin/available-parts/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const part = await storage.getAvailablePart(parseInt(req.params.id));
      if (!part) {
        return res.status(404).json({ error: "Dostupan deo nije pronađen" });
      }
      res.json(part);
    } catch (error) {
      console.error("Error fetching available part:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dostupnog dela" });
    }
  });

  // Search available parts (admin only)
  app.get("/api/admin/available-parts/search", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Parametar pretrage 'q' je obavezan" });
      }
      
      const parts = await storage.searchAvailableParts(q);
      res.json(parts);
    } catch (error) {
      console.error("Error searching available parts:", error);
      res.status(500).json({ error: "Greška pri pretrazi dostupnih delova" });
    }
  });

  // Create new available part manually (admin only)
  app.post("/api/admin/available-parts", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const partData = {
        ...req.body,
        addedBy: req.user.id
      };
      
      const part = await storage.createAvailablePart(partData);
      res.json(part);
    } catch (error) {
      console.error("Error creating available part:", error);
      res.status(500).json({ error: "Greška pri kreiranju dostupnog dela" });
    }
  });

  // Update available part (admin only)
  app.put("/api/admin/available-parts/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const partId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedPart = await storage.updateAvailablePart(partId, updates);
      if (!updatedPart) {
        return res.status(404).json({ error: "Dostupan deo nije pronađen" });
      }
      
      res.json(updatedPart);
    } catch (error) {
      console.error("Error updating available part:", error);
      res.status(500).json({ error: "Greška pri ažuriranju dostupnog dela" });
    }
  });

  // Delete available part (admin only)
  app.delete("/api/admin/available-parts/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const partId = parseInt(req.params.id);
      const deleted = await storage.deleteAvailablePart(partId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Dostupan deo nije pronađen" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting available part:", error);
      res.status(500).json({ error: "Greška pri brisanju dostupnog dela" });
    }
  });

  // Update available part quantity (admin only)
  app.patch("/api/admin/available-parts/:id/quantity", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const partId = parseInt(req.params.id);
      const { quantityChange } = req.body;
      
      if (typeof quantityChange !== 'number') {
        return res.status(400).json({ error: "Promena količine mora biti broj" });
      }
      
      const updatedPart = await storage.updateAvailablePartQuantity(partId, quantityChange);
      if (!updatedPart) {
        return res.status(404).json({ error: "Dostupan deo nije pronađen" });
      }
      
      res.json(updatedPart);
    } catch (error) {
      console.error("Error updating available part quantity:", error);
      res.status(500).json({ error: "Greška pri ažuriranju količine dela" });
    }
  });

  // Get services waiting for parts - special endpoint to avoid conflict with /:id route
  app.get("/api/admin/waitingforparts", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const waitingServices = await storage.getServicesByStatus('waiting_parts');
      res.json(waitingServices);
    } catch (error) {
      console.error("Error fetching waiting services:", error);
      res.status(500).json({ error: "Failed to fetch waiting services" });
    }
  });

  // ===== REMOVED PARTS ENDPOINTS =====
  
  // Get all removed parts (admin/technician access)
  app.get("/api/removed-parts", jwtAuth, async (req, res) => {
    try {
      const removedParts = await storage.getAllRemovedParts();
      res.json(removedParts);
    } catch (error) {
      console.error("Error fetching removed parts:", error);
      res.status(500).json({ error: "Greška pri dohvatanju uklonjenih delova" });
    }
  });

  // Get removed parts by service ID
  app.get("/api/services/:id/removed-parts", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const removedParts = await storage.getRemovedPartsByService(serviceId);
      res.json(removedParts);
    } catch (error) {
      console.error("Error fetching removed parts for service:", error);
      res.status(500).json({ error: "Greška pri dohvatanju uklonjenih delova za servis" });
    }
  });

  // Get removed parts by technician ID
  app.get("/api/technicians/:id/removed-parts", jwtAuth, async (req, res) => {
    try {
      const technicianId = parseInt(req.params.id);
      const removedParts = await storage.getRemovedPartsByTechnician(technicianId);
      res.json(removedParts);
    } catch (error) {
      console.error("Error fetching removed parts for technician:", error);
      res.status(500).json({ error: "Greška pri dohvatanju uklonjenih delova za servisera" });
    }
  });

  // Create new removed part record
  app.post("/api/removed-parts", jwtAuth, async (req, res) => {
    try {
      console.log("Creating removed part with data:", req.body);
      
      // Validacija da li je korisnik serviser ili admin
      if (req.user.role !== "technician" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Samo serviseri i administratori mogu evidentirati uklonjene delove" });
      }
      
      const validatedData = insertRemovedPartSchema.parse(req.body);
      const removedPart = await storage.createRemovedPart(validatedData);
      
      // ===== SMS TRIGGERI ZA EVIDENCIJU UKLONJENIH DELOVA =====
      if (smsService && smsService.isConfigured()) {
        try {
          console.log(`[SMS SISTEM] Početak SMS triggera za evidenciju uklonjenih delova (servis #${validatedData.serviceId})`);
          
          // Dohvati podatke o servisu, klijentu, uređaju i serviseru
          const service = await storage.getService(validatedData.serviceId);
          if (service) {
            const client = await storage.getClient(service.clientId);
            const appliance = service.applianceId ? await storage.getAppliance(service.applianceId) : null;
            const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
            const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;
            
            const deviceType = category ? category.name : 'Uređaj';
            const technicianName = technician ? technician.fullName : req.user.fullName || 'Nepoznat serviser';
            
            // 1. SMS KORISNIKU o uklonjenim delovima
            if (client && client.phone) {
              try {
                await smsService.notifyClientPartsRemoved({
                  clientPhone: client.phone,
                  clientName: client.fullName,
                  serviceId: validatedData.serviceId.toString(),
                  deviceType: deviceType,
                  partName: validatedData.partName,
                  technicianName: technicianName,
                  removalReason: validatedData.removalReason
                });
                console.log(`[SMS SISTEM] ✅ SMS o uklonjenim delovima poslat korisniku ${client.fullName} (${client.phone})`);
              } catch (smsError) {
                console.error(`[SMS SISTEM] ❌ Greška pri slanju SMS-a korisniku o uklonjenim delovima:`, smsError);
              }
            }
            
            // 2. SMS ADMINISTRATORU o uklonjenim delovima
            const admins = await getAdminsWithPhones();
            for (const admin of admins) {
              try {
                await smsService.notifyAdminPartsRemovedByTechnician({
                  adminPhone: admin.phone,
                  adminName: admin.fullName,
                  serviceId: validatedData.serviceId.toString(),
                  clientName: client?.fullName || 'Nepoznat klijent',
                  deviceType: deviceType,
                  partName: validatedData.partName,
                  technicianName: technicianName,
                  removalReason: validatedData.removalReason
                });
                console.log(`[SMS SISTEM] ✅ SMS o uklonjenim delovima poslat administratoru ${admin.fullName} (${admin.phone})`);
              } catch (adminSmsError) {
                console.error(`[SMS SISTEM] ❌ Greška pri slanju SMS-a administratoru o uklonjenim delovima:`, adminSmsError);
              }
            }
          }
        } catch (smsError) {
          console.error('[SMS SISTEM] Globalna greška pri slanju SMS obaveštenja za uklonjene delove:', smsError);
        }
      }
      
      res.status(201).json(removedPart);
    } catch (error) {
      console.error("Error creating removed part:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Neispravni podaci", details: error.errors });
      }
      res.status(500).json({ error: "Greška pri kreiranju evidencije uklonjenog dela" });
    }
  });

  // Update removed part status
  app.put("/api/removed-parts/:id", jwtAuth, async (req, res) => {
    try {
      const partId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Validacija da li je korisnik serviser ili admin
      if (req.user.role !== "technician" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Samo serviseri i administratori mogu ažurirati uklonjene delove" });
      }
      
      const updatedPart = await storage.updateRemovedPart(partId, updateData);
      if (!updatedPart) {
        return res.status(404).json({ error: "Uklonjeni deo nije pronađen" });
      }
      
      res.json(updatedPart);
    } catch (error) {
      console.error("Error updating removed part:", error);
      res.status(500).json({ error: "Greška pri ažuriranju uklonjenog dela" });
    }
  });

  // Mark part as returned/reinstalled
  app.patch("/api/removed-parts/:id/return", jwtAuth, async (req, res) => {
    try {
      const partId = parseInt(req.params.id);
      const { returnDate, notes } = req.body;
      
      // Validacija da li je korisnik serviser ili admin
      if (req.user.role !== "technician" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Samo serviseri i administratori mogu označiti delove kao vraćene" });
      }
      
      if (!returnDate) {
        return res.status(400).json({ error: "Datum vraćanja je obavezan" });
      }
      
      const updatedPart = await storage.markPartAsReturned(partId, returnDate, notes);
      if (!updatedPart) {
        return res.status(404).json({ error: "Uklonjeni deo nije pronađen" });
      }
      
      res.json(updatedPart);
    } catch (error) {
      console.error("Error marking part as returned:", error);
      res.status(500).json({ error: "Greška pri označavanju dela kao vraćenog" });
    }
  });

  // Update service status to device_parts_removed
  app.patch("/api/services/:id/parts-removed", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      
      // Validacija da li je korisnik serviser ili admin
      if (req.user.role !== "technician" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Samo serviseri i administratori mogu menjati status servisa" });
      }
      
      const updatedService = await storage.updateService(serviceId, {
        id: serviceId,
        clientId: 0, // Ove vrednosti će biti ignorisane zbog Partial type-a
        applianceId: 0,
        description: "",
        createdAt: "",
        status: "device_parts_removed"
      });
      
      if (!updatedService) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // ===== AUTOMATSKI SMS TRIGGERI ZA EVIDENCIJU UKLONJENIH DJELOVA =====
      if (smsService && smsService.isConfigured()) {
        try {
          console.log(`[SMS EVIDENTIRAJ_UKLONJENE_DELOVE] Početak automatskih SMS triggera za servis #${serviceId}`);
          
          // Dohvati podatke o servisu, korisniku, uređaju i tehnčaru
          const service = await storage.getService(serviceId);
          if (service) {
            const client = service.clientId ? await storage.getClient(service.clientId) : null;
            const technician = service.technicianId ? await storage.getUser(service.technicianId) : null;
            const appliance = service.applianceId ? await storage.getAppliance(service.applianceId) : null;
            const category = appliance?.categoryId ? await storage.getApplianceCategory(appliance.categoryId) : null;
            
            // 1. SMS ADMINISTRATORIMA o uklonjenim djelovima
            const admins = await storage.getUsersByRole('admin');
            for (const admin of admins) {
              if (admin.phone) {
                try {
                  await smsService.notifyAdminRemovedParts({
                    adminPhone: admin.phone,
                    adminName: admin.fullName,
                    serviceId: serviceId.toString(),
                    clientName: client?.fullName || 'Nepoznat klijent',
                    deviceType: category?.name || 'uređaj',
                    technicianName: technician?.fullName || 'serviser'
                  });
                  console.log(`[SMS EVIDENTIRAJ_UKLONJENE_DELOVE] ✅ SMS o uklonjenim djelovima poslat administratoru ${admin.fullName} (${admin.phone})`);
                } catch (adminSmsError) {
                  console.error(`[SMS EVIDENTIRAJ_UKLONJENE_DELOVE] ❌ Greška pri slanju SMS-a administratoru ${admin.fullName}:`, adminSmsError);
                }
              }
            }
          }
          
        } catch (smsError) {
          console.error("[SMS EVIDENTIRAJ_UKLONJENE_DELOVE] Globalna greška pri automatskim SMS triggerima:", smsError);
        }
      }
      
      res.json(updatedService);
    } catch (error) {
      console.error("Error updating service status:", error);
      res.status(500).json({ error: "Greška pri ažuriranju statusa servisa" });
    }
  });

  // ===== BUSINESS PARTNER JWT ENDPOINTS =====
  
  // Create service by business partner (JWT version)
  app.post("/api/business/services-jwt", jwtAuth, async (req, res) => {
    if (req.user.role !== "business_partner") {
      return res.status(403).json({ error: "Samo poslovni partneri mogu pristupiti ovom resursu" });
    }

    try {
      console.log("=== KREIRANJE SERVISA OD STRANE POSLOVNOG PARTNERA (JWT) ===");
      console.log("Podaci iz frontend forme:", req.body);
      console.log("Korisnik:", req.user);
      
      const {
        clientId,
        applianceId,
        description,
        categoryId,
        manufacturerId,
        model,
        serialNumber,
        clientFullName,
        clientPhone,
        clientEmail,
        clientAddress,
        clientCity
      } = req.body;

      if (!description || description.trim().length === 0) {
        console.error("Nedostaje opis servisa");
        return res.status(400).json({
          error: "Nedostaje opis servisa",
          message: "Opis servisa je obavezno polje."
        });
      }

      const partnerId = req.user.id;
      const partnerCompanyName = req.user.companyName || "Poslovni partner";
      
      console.log("Partner ID:", partnerId);
      console.log("Partner Company:", partnerCompanyName);

      // Prvo provera da li imamo postojećeg klijenta
      let finalClientId = clientId && clientId > 0 ? parseInt(clientId) : null;
      
      if (!finalClientId && clientFullName && clientPhone) {
        console.log("Kreiram novog klijenta sa podacima:", { clientFullName, clientPhone, clientEmail });
        const newClient = await storage.createClient({
          fullName: clientFullName.trim(),
          phone: clientPhone.trim(),
          email: clientEmail?.trim() || null,
          address: clientAddress?.trim() || null,
          city: clientCity?.trim() || null
        });
        
        finalClientId = newClient.id;
        console.log("Kreiran novi klijent sa ID:", finalClientId);
      }

      if (!finalClientId) {
        console.error("Nedostaje Client ID");
        return res.status(400).json({
          error: "Nedostaje klijent",
          message: "Morate odabrati postojećeg klijenta ili kreirati novog."
        });
      }

      // Provera da li imamo postojeći uređaj
      let finalApplianceId = applianceId && applianceId > 0 ? parseInt(applianceId) : null;
      
      if (!finalApplianceId && categoryId && manufacturerId && model) {
        console.log("Kreiram novi uređaj sa podacima:", { categoryId, manufacturerId, model, serialNumber });
        const newAppliance = await storage.createAppliance({
          clientId: finalClientId,
          categoryId: parseInt(categoryId),
          manufacturerId: parseInt(manufacturerId),
          model: model.trim(),
          serialNumber: serialNumber?.trim() || null,
          purchaseDate: null,
          notes: null
        });
        
        finalApplianceId = newAppliance.id;
        console.log("Kreiran novi uređaj sa ID:", finalApplianceId);
      }

      if (!finalApplianceId) {
        console.error("Nedostaje Appliance ID");
        return res.status(400).json({
          error: "Nedostaje uređaj",
          message: "Morate odabrati postojeći uređaj ili kreirati novi."
        });
      }

      // Kreiraj servis
      const newService = await storage.createService({
        clientId: finalClientId,
        applianceId: finalApplianceId,
        technicianId: null,
        description: description.trim(),
        status: 'pending',
        businessPartnerId: partnerId,
        partnerCompanyName: partnerCompanyName,
        warrantyStatus: 'out_of_warranty',
        createdAt: new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
      });

      console.log("Kreiran novi servis sa ID:", newService.id);

      // Notify admins about new service from partner
      try {
        await NotificationService.notifyServiceCreatedByPartner(
          newService.id,
          partnerCompanyName
        );
      } catch (notificationError) {
        console.error("Greška pri slanju obaveštenja:", notificationError);
      }

      res.json({
        success: true,
        serviceId: newService.id,
        message: "Servis je uspešno kreiran. Administrator će ga uskoro dodeliti serviseru."
      });

    } catch (error) {
      console.error("Greška pri kreiranju servisa od strane poslovnog partnera:", error);
      res.status(500).json({ 
        error: "Greška servera", 
        message: "Došlo je do greške pri kreiranju servisa. Pokušajte ponovo kasnije." 
      });
    }
  });

  // SMS GATEWAY ENDPOINTS have been completely removed

  // Mobi Gateway configuration endpoint removed

  // All SMS endpoints removed

  // ===== SMS MOBILE API ENDPOINTS =====
  // Import SMS Mobile API service
  const { SMSMobileAPIService } = await import('./sms-mobile-api-service.js');

  // Get SMS Mobile API status
  app.get('/api/sms-mobile-api/status', jwtAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin pristup potreban' });
    }

    try {
      const settings = await storage.getSystemSettings();
      const apiKey = settings.sms_mobile_api_key || '';
      const baseUrl = settings.sms_mobile_base_url || 'https://api.smsmobileapi.com';
      const enabled = settings.sms_mobile_enabled === 'true';

      if (!apiKey) {
        return res.json({
          enabled: false,
          configured: false,
          message: 'API ključ nije konfigurisan'
        });
      }

      const smsService = new SMSMobileAPIService({ apiKey, baseUrl });
      const connectionTest = await smsService.testConnection();

      res.json({
        enabled,
        configured: true,
        connected: connectionTest.success,
        message: connectionTest.message,
        baseUrl
      });
    } catch (error) {
      console.error('SMS Mobile API status error:', error);
      res.status(500).json({ error: 'Greška pri proveri statusa' });
    }
  });

  // Update SMS Mobile API configuration
  app.post('/api/sms-mobile-api/config', jwtAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin pristup potreban' });
    }

    try {
      const { apiKey, baseUrl, timeout, enabled, senderId } = req.body;

      if (apiKey !== undefined) {
        await storage.updateSystemSetting('sms_mobile_api_key', apiKey);
      }
      if (baseUrl !== undefined) {
        await storage.updateSystemSetting('sms_mobile_base_url', baseUrl);
      }
      if (timeout !== undefined) {
        await storage.updateSystemSetting('sms_mobile_timeout', timeout.toString());
      }
      if (enabled !== undefined) {
        await storage.updateSystemSetting('sms_mobile_enabled', enabled.toString());
      }
      if (senderId !== undefined) {
        await storage.updateSystemSetting('sms_mobile_sender_id', senderId);
      }

      res.json({ success: true, message: 'Konfiguracija je ažurirana' });
    } catch (error) {
      console.error('SMS Mobile API config error:', error);
      res.status(500).json({ error: 'Greška pri ažuriranju konfiguracije' });
    }
  });

  // Test SMS Mobile API connection
  app.post('/api/sms-mobile-api/test', jwtAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin pristup potreban' });
    }

    try {
      const settings = await storage.getSystemSettings();
      const apiKey = settings.sms_mobile_api_key || '';
      const baseUrl = settings.sms_mobile_base_url || 'https://api.smsmobileapi.com';

      if (!apiKey) {
        return res.status(400).json({ error: 'API ključ nije konfigurisan' });
      }

      const smsService = new SMSMobileAPIService({ apiKey, baseUrl });
      const result = await smsService.testConnection();

      res.json(result);
    } catch (error) {
      console.error('SMS Mobile API test error:', error);
      res.status(500).json({ error: 'Greška pri testiranju konekcije' });
    }
  });

  // Send SMS via Mobile API
  app.post('/api/sms-mobile-api/send', jwtAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin pristup potreban' });
    }

    try {
      const { recipients, message, senderId } = req.body;

      if (!recipients || !message) {
        return res.status(400).json({ error: 'Recipients i message su obavezni' });
      }

      const settingsArray = await storage.getSystemSettings();
      const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
      
      const apiKey = settingsMap.sms_mobile_api_key || '';
      const baseUrl = settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com';
      const enabled = settingsMap.sms_mobile_enabled === 'true';
      const defaultSenderId = settingsMap.sms_mobile_sender_id || 'FRIGO SISTEM';

      if (!enabled) {
        return res.status(400).json({ error: 'SMS Mobile API nije omogućen' });
      }

      if (!apiKey) {
        return res.status(400).json({ error: 'API ključ nije konfigurisan' });
      }

      const smsService = new SMSMobileAPIService({ apiKey, baseUrl });
      const formattedPhone = smsService.formatPhoneNumber(recipients);
      
      const result = await smsService.sendSMS({
        recipients: formattedPhone,
        message,
        sendername: senderId || defaultSenderId
      });

      res.json(result);
    } catch (error) {
      console.error('SMS Mobile API send error:', error);
      res.status(500).json({ error: 'Greška pri slanju SMS-a' });
    }
  });

  // Send bulk SMS via Mobile API
  app.post('/api/sms-mobile-api/send-bulk', jwtAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin pristup potreban' });
    }

    try {
      const { recipients, message } = req.body;

      if (!Array.isArray(recipients) || !message) {
        return res.status(400).json({ error: 'Recipients mora biti niz i message je obavezan' });
      }

      const settings = await storage.getSystemSettings();
      const apiKey = settings.sms_mobile_api_key || '';
      const baseUrl = settings.sms_mobile_base_url || 'https://api.smsmobileapi.com';
      const enabled = settings.sms_mobile_enabled === 'true';

      if (!enabled) {
        return res.status(400).json({ error: 'SMS Mobile API nije omogućen' });
      }

      if (!apiKey) {
        return res.status(400).json({ error: 'API ključ nije konfigurisan' });
      }

      const smsService = new SMSMobileAPIService({ apiKey, baseUrl });
      const results = await smsService.sendBulkSMS(recipients, message);

      res.json({ results });
    } catch (error) {
      console.error('SMS Mobile API bulk send error:', error);
      res.status(500).json({ error: 'Greška pri slanju bulk SMS-a' });
    }
  });

  // SMS kommunikacijski endpoint za servisere
  app.post('/api/sms/send-technician-trigger', jwtAuth, async (req, res) => {
    try {
      if (req.user.role !== 'technician' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Samo serviseri mogu slati SMS poruke klijentima' });
      }

      const { serviceId, smsType } = req.body;

      if (!serviceId || !smsType) {
        return res.status(400).json({ error: 'ServiceId i smsType su obavezni' });
      }

      // Dohvati service podatke
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: 'Servis nije pronađen' });
      }

      // Dohvati klijenta
      const client = await storage.getClient(service.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Klijent nije pronađen' });
      }

      // Dohvati uređaj
      const appliance = await storage.getAppliance(service.applianceId);
      if (!appliance) {
        return res.status(404).json({ error: 'Uređaj nije pronađen' });
      }

      // Dohvati kategoriju uređaja
      const category = await storage.getApplianceCategory(appliance.categoryId);
      const deviceType = category?.name || 'Uređaj';

      // Dohvati servisera
      const technician = await storage.getTechnician(service.technicianId!);
      const technicianName = technician?.fullName || 'Serviser';

      if (!client.phone) {
        return res.status(400).json({ error: 'Klijent nema broj telefona' });
      }

      // Pripremi SMS konfiguraciju
      const settings = await storage.getSystemSettings();
      const smsConfig = {
        apiKey: settings.sms_mobile_api_key || '',
        baseUrl: settings.sms_mobile_base_url || 'https://api.smsmobileapi.com',
        senderId: settings.sms_mobile_sender_id || 'FRIGO SISTEM',
        enabled: settings.sms_mobile_enabled === 'true'
      };

      if (!smsConfig.enabled || !smsConfig.apiKey) {
        return res.status(400).json({ error: 'SMS servis nije konfigurisan' });
      }

      // Kreiraj SMS Communication Service
      const { SMSCommunicationService } = await import('./sms-communication-service.js');
      const smsService = new SMSCommunicationService(smsConfig);

      // Pošalji SMS na osnovu tipa
      let result;
      switch (smsType) {
        case 'client_not_available':
          result = await smsService.notifyClientNotAvailable({
            clientPhone: client.phone,
            clientName: client.fullName,
            serviceId: serviceId.toString(),
            deviceType: deviceType,
            technicianName: technicianName
          });
          break;
          
        case 'client_no_answer':
          result = await smsService.notifyClientNoAnswer({
            clientPhone: client.phone,
            clientName: client.fullName,
            serviceId: serviceId.toString(),
            deviceType: deviceType,
            technicianName: technicianName
          });
          break;
          
        default:
          return res.status(400).json({ error: 'Nepoznat tip SMS poruke' });
      }

      if (result.success) {
        console.log(`✅ SMS ${smsType} uspešno poslat klijentu ${client.fullName} (${client.phone})`);
        res.json({ 
          success: true, 
          message: `SMS je uspešno poslat klijentu`,
          messageId: result.messageId 
        });
      } else {
        console.error(`❌ Greška pri slanju ${smsType} SMS-a:`, result.error);
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error('SMS komunikacija greška:', error);
      res.status(500).json({ error: 'Greška pri slanju SMS-a' });
    }
  });

  // Direktno slanje SMS poruka od strane tehničara
  app.post("/api/sms/direct-send", jwtAuth, requireRole(['technician']), async (req, res) => {
    try {
      const { templateType, recipientPhone, recipientName, serviceData } = req.body;
      
      console.log(`📱 [DIREKTNO SMS] Tehnicijar ${req.user.fullName} šalje ${templateType} SMS`);
      
      if (!templateType || !recipientPhone || !serviceData) {
        return res.status(400).json({ error: 'Nedostaju obavezni podaci' });
      }

      let result;
      
      switch (templateType) {
        case 'service_arrived':
          result = await smsService.sendTemplatedSMS('technician_arrived', 
            { phone: recipientPhone, name: recipientName || 'Klijent', role: 'client' },
            {
              clientName: serviceData.clientName,
              serviceId: serviceData.serviceId,
              deviceType: serviceData.deviceType,
              technicianName: serviceData.technicianName
            }
          );
          break;
          
        case 'service_delayed':
          result = await smsService.sendTemplatedSMS('technician_delayed',
            { phone: recipientPhone, name: recipientName || 'Klijent', role: 'client' },
            {
              clientName: serviceData.clientName,
              serviceId: serviceData.serviceId,  
              deviceType: serviceData.deviceType,
              technicianName: serviceData.technicianName
            }
          );
          break;
          
        default:
          return res.status(400).json({ error: 'Nepoznat tip SMS template-a' });
      }

      if (result.success) {
        console.log(`✅ [DIREKTNO SMS] ${templateType} uspešno poslat na ${recipientPhone}`);
        res.json({ 
          success: true, 
          message: `SMS je uspešno poslat`,
          messageId: result.messageId 
        });
      } else {
        console.error(`❌ [DIREKTNO SMS] Greška pri slanju ${templateType}:`, result.error);
        res.status(500).json({ 
          success: false,
          error: result.error || 'Greška pri slanju SMS-a'
        });
      }
    } catch (error) {
      console.error('[DIREKTNO SMS] Sistemska greška:', error);
      res.status(500).json({ 
        success: false,
        error: 'Greška u SMS sistemu' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
