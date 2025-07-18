import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { registerBusinessPartnerRoutes } from "./business-partner-routes";
import { emailService } from "./email-service";
import { excelService } from "./excel-service";
import { smsService as newSmsService, SmsConfig } from "./twilio-sms";
import { smsService } from "./sms-service";
import { hybridSmsService } from "./hybrid-sms-service";
import { gsmModemService } from "./gsm-modem-service";
import { gsmOnlySMSService } from "./gsm-only-sms-service";
import { insertClientSchema, insertServiceSchema, insertApplianceSchema, insertApplianceCategorySchema, insertManufacturerSchema, insertTechnicianSchema, insertUserSchema, serviceStatusEnum, insertMaintenanceScheduleSchema, insertMaintenanceAlertSchema, maintenanceFrequencyEnum, insertSparePartOrderSchema, sparePartUrgencyEnum, sparePartStatusEnum } from "@shared/schema";
import { db, pool } from "./db";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { getBotChallenge, verifyBotAnswer, checkBotVerification } from "./bot-verification";
import { checkServiceRequestRateLimit, checkRegistrationRateLimit, getRateLimitStatus } from "./rate-limiting";
import { emailVerificationService } from "./email-verification";
import { NotificationService } from "./notification-service";

// Mapiranje status kodova u opisne nazive statusa
const STATUS_DESCRIPTIONS: Record<string, string> = {
  'pending': 'Na čekanju',
  'assigned': 'Dodeljen serviseru',
  'scheduled': 'Zakazan termin',
  'in_progress': 'U toku',
  'completed': 'Završen',
  'cancelled': 'Otkazan'
};

// SMS postavke schema
const smsSettingsSchema = z.object({
  provider: z.enum(['messaggio', 'plivo', 'budgetsms', 'viber', 'twilio', 'gsm_modem']),
  apiKey: z.string().min(1),
  authToken: z.string().optional(),
  senderId: z.string().optional()
});

// GSM Modem postavke schema
const gsmModemSettingsSchema = z.object({
  provider: z.literal('gsm_modem').optional(),
  port: z.string().optional(),
  baudRate: z.number().int().positive().default(9600),
  phoneNumber: z.string().min(1),
  pin: z.string().optional(),
  fallbackToTwilio: z.boolean().default(false),
  // Novi WiFi polja
  connectionType: z.enum(['usb', 'wifi']).default('usb'),
  wifiHost: z.string().optional(),
  wifiPort: z.number().int().positive().optional()
}).refine((data) => {
  // Validacija na osnovu tipa konekcije
  if (data.connectionType === 'usb') {
    return data.port && data.port.length > 0;
  } else if (data.connectionType === 'wifi') {
    return data.wifiHost && data.wifiHost.length > 0 && data.wifiPort && data.wifiPort > 0;
  }
  return true;
}, {
  message: "Za USB konekciju je potreban port, a za WiFi su potrebni host i port",
});

// Funkcija za generisanje SMS poruke na osnovu statusa servisa
function generateStatusUpdateMessage(serviceId: number, newStatus: string, technicianName?: string | null): string {
  const statusMessages = {
    'assigned': `Frigo Sistem: Vaš servis #${serviceId} je dodeljen serviseru ${technicianName || ''}. Kontakt: 033 402 402`,
    'scheduled': `Frigo Sistem: Zakazan je termin za servis #${serviceId}. Kontakt: 033 402 402`,
    'in_progress': `Frigo Sistem: Servis #${serviceId} je u toku. Kontakt: 033 402 402`,
    'completed': `Frigo Sistem: Servis #${serviceId} je završen. Kontakt: 033 402 402`,
    'cancelled': `Frigo Sistem: Servis #${serviceId} je otkazan. Kontakt: 033 402 402`,
    'pending': `Frigo Sistem: Servis #${serviceId} je u pripremi. Kontakt: 033 402 402`
  };
  
  return statusMessages[newStatus] || `Frigo Sistem: Status servisa #${serviceId} je ažuriran. Kontakt: 033 402 402`;
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
  
  // Security routes - Bot verification and rate limiting
  app.get("/api/security/bot-challenge", getBotChallenge);
  app.post("/api/security/verify-bot", verifyBotAnswer);
  app.get("/api/security/rate-limit-status", getRateLimitStatus);
  
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
  app.get("/api/clients/:id/details", async (req, res) => {
    try {
      // Provera autentifikacije - samo admin može da vidi detalje klijenta
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(401).json({ error: "Nemate dozvolu za pristup detaljima klijenta" });
      }
      
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
  
  // Business Partner API Endpoints
  app.get("/api/business/services", async (req, res) => {
    try {
      const { partnerId } = req.query;
      
      if (!partnerId || typeof partnerId !== 'string') {
        return res.status(400).json({ error: "Nedostaje ID poslovnog partnera" });
      }
      
      try {
        const partnerIdNum = parseInt(partnerId);
        console.log(`Dohvatanje servisa za poslovnog partnera sa ID: ${partnerIdNum}`);
        
        // Dohvati servise povezane sa poslovnim partnerom
        const services = await storage.getServicesByPartner(partnerIdNum);
        res.json(services);
      } catch (err) {
        return res.status(400).json({ error: "Nevažeći ID poslovnog partnera" });
      }
    } catch (error) {
      console.error("Greška pri dobijanju servisa za poslovnog partnera:", error);
      res.status(500).json({ error: "Greška pri dobijanju servisa" });
    }
  });
  
  // API za detalje servisa za poslovnog partnera sa istorijom statusa
  app.get("/api/business/services/:id", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { partnerId } = req.query;
      
      if (!partnerId || typeof partnerId !== 'string') {
        return res.status(400).json({ error: "Nedostaje ID poslovnog partnera" });
      }
      
      const partnerIdNum = parseInt(partnerId);
      
      // Prvo proveri da li je servis povezan sa ovim poslovnim partnerom
      const service = await storage.getService(serviceId);
      
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Provera da li servis pripada poslovnom partneru
      if (service.businessPartnerId !== partnerIdNum) {
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

  app.post("/api/services", async (req, res) => {
    try {
      console.log("=== KREIRANJE NOVOG SERVISA ===");
      console.log("Podaci iz frontend forme:", req.body);
      
      // Provera autentifikacije
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          error: "Neautentifikovani korisnik", 
          message: "Morate biti ulogovani da biste kreirali servis."
        });
      }
      
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

  app.put("/api/services/:id", async (req, res) => {
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
                  technicianName
                );
                
                if (clientEmailSent) {
                  console.log(`[EMAIL SISTEM] ✅ Uspešno poslato obaveštenje klijentu ${client.fullName}`);
                  emailInfo.emailSent = true;
                  
                  // Obavesti administratore o poslatom mail-u klijentu
                  await emailService.notifyAdminAboutEmail(
                    "Obaveštenje klijenta o promeni statusa",
                    client.email,
                    id,
                    `Poslato obaveštenje klijentu ${client.fullName} o promeni statusa servisa #${id} u "${statusDescription}"`
                  );
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
                  
                  // Obavesti administratore o poslatom mail-u serviseru
                  await emailService.notifyAdminAboutEmail(
                    "Obaveštenje servisera o promeni statusa",
                    techEmail,
                    id,
                    `Poslato obaveštenje serviseru ${technician.fullName} o promeni statusa servisa #${id} u "${statusDescription}"`
                  );
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
  app.put("/api/services/:id/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Potrebna je prijava" });
      }
      
      const serviceId = parseInt(req.params.id);
      const { 
        status, 
        technicianNotes,
        usedParts,
        machineNotes,
        cost,
        isCompletelyFixed,
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
      
      // Informacije o slanju emaila i SMS-a koje će biti vraćene klijentu
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
                technicianName
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
            
            // 3. Šalje SMS obaveštenje KLIJENTU - nova funkcionalnost
            if (client.phone) {
              console.log(`[SMS SISTEM] Pokušavam slanje SMS poruke klijentu ${client.fullName} (${client.phone})`);
              
              // Kraći sadržaj za SMS koji je maksimalno 160 karaktera
              const clientSmsContent = technicianNotes || service.description || "";
              // Skraćujemo napomenu ako postoji
              let additionalInfo = "";
              if (clientSmsContent && clientSmsContent.length > 0) {
                const maxNoteLength = 70; // Ograničavamo dužinu napomene
                additionalInfo = clientSmsContent.length > maxNoteLength 
                  ? clientSmsContent.substring(0, maxNoteLength) + '...' 
                  : clientSmsContent;
              }
              
              // Šaljemo SMS klijentu preko novog SMS servisa
              const smsMessage = generateStatusUpdateMessage(serviceId, statusDescription, additionalInfo);
              const clientSmsSent = await newSmsService.sendSms({
                to: client.phone || '',
                message: smsMessage,
                type: 'status_update'
              });
              
              if (clientSmsSent.success) {
                console.log(`[SMS SISTEM] ✅ Uspešno poslata SMS poruka klijentu ${client.fullName} preko ${newSmsService.getConfigInfo()?.provider || 'novog SMS servisa'}`);
                emailInfo.smsSent = true;
                if (clientSmsSent.messageId) {
                  console.log(`[SMS SISTEM] Message ID: ${clientSmsSent.messageId}`);
                }
              } else {
                console.error(`[SMS SISTEM] ❌ Neuspešno slanje SMS poruke: ${clientSmsSent.error}`);
                
                // Fallback na postojeći Twilio SMS servis
                console.log(`[SMS SISTEM] Pokušavam fallback na Twilio SMS servis...`);
                try {
                  const fallbackSent = await smsService.sendServiceStatusUpdate(
                    client,
                    { id: serviceId, description: statusDescription, status: statusDescription },
                    statusDescription,
                    additionalInfo
                  );
                  
                  if (fallbackSent) {
                    console.log(`[SMS SISTEM] ✅ Fallback SMS uspešno poslat preko Twilio`);
                    emailInfo.smsSent = true;
                  } else {
                    emailInfo.smsError = "Neuspešno slanje SMS poruke preko oba servisa. Proverite SMS postavke.";
                  }
                } catch (fallbackError) {
                  console.error(`[SMS SISTEM] ❌ Fallback SMS takođe neuspešan:`, fallbackError);
                  emailInfo.smsError = `Neuspešno slanje SMS poruke. Greška: ${clientSmsSent.error}`;
                }
              }
            } else {
              console.warn(`[SMS SISTEM] ⚠️ Klijent ${client.fullName} nema broj telefona, preskačem slanje SMS-a`);
              emailInfo.smsError = `Klijent ${client.fullName} nema definisan broj telefona`;
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
                  
                  // Obavesti administratore o poslatom mail-u serviseru
                  await emailService.notifyAdminAboutEmail(
                    "Obaveštenje servisera o promeni statusa",
                    techEmail,
                    serviceId,
                    `Poslato obaveštenje serviseru ${technician.fullName} o promeni statusa servisa #${serviceId} u "${statusDescription}"`
                  );
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
        emailInfo.smsError = `Sistemska greška (SMS): ${errorMessage || "Nepoznata greška"}`;
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
  
  // Users management routes
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za pristup korisnicima" });
      }
      
      // Get all users but don't return their passwords
      const users = await Promise.all(
        Array.from((await storage.getAllUsers()) || []).map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })
      );
      
      res.json(users);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ error: "Greška pri dobijanju korisnika" });
    }
  });
  
  // Endpoint za dobijanje neverifikovanih korisnika
  app.get("/api/users/unverified", async (req, res) => {
    try {
      console.log("GET /api/users/unverified - Zahtev za dobijanje neverifikovanih korisnika");
      console.log("Autorizacija korisnika:", req.isAuthenticated() ? `Autentifikovan (${req.user?.username}, uloga: ${req.user?.role})` : "Nije autentifikovan");
      
      // Osiguramo da je korisnik autorizovan - samo admin može da vidi neverifikovane korisnike
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        console.log("Neautorizovan pristup endpoint-u za neverifikovane korisnike");
        return res.status(403).json({ 
          error: "Nemate dozvolu za pristup neverifikovanim korisnicima",
          message: "Samo administrator može pristupiti ovim podacima."
        });
      }
      
      // Dobavimo sve neverifikovane korisnike
      console.log("Dohvatanje neverifikovanih korisnika iz baze...");
      const rawUsers = await storage.getUnverifiedUsers();
      console.log(`Pronađeno ${rawUsers.length} neverifikovanih korisnika u bazi`);
      
      // Isključimo lozinku iz odgovora
      const unverifiedUsers = rawUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      // Vraćamo samo niz korisnika bez nested data polja da bi odgovaralo očekivanom formatu u frontendu
      console.log(`Vraćanje ${unverifiedUsers.length} neverifikovanih korisnika klijentu`);
      res.json(unverifiedUsers);
    } catch (error) {
      console.error("Greška pri dobijanju neverifikovanih korisnika:", error);
      res.status(500).json({ 
        error: "Greška pri dobijanju neverifikovanih korisnika", 
        message: "Došlo je do interne greške pri dobijanju liste neverifikovanih korisnika."
      });
    }
  });
  
  // Endpoint za verifikaciju korisnika
  app.post("/api/users/:id/verify", async (req, res) => {
    try {
      console.log(`Pokušaj verifikacije korisnika sa ID ${req.params.id}`);
      
      // Osiguramo da je korisnik autorizovan - samo admin može da verifikuje korisnike
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        console.log("Verifikacija neuspešna - korisnik nije admin");
        return res.status(403).json({ 
          error: "Nemate dozvolu za verifikaciju korisnika", 
          message: "Samo administrator može verifikovati korisnike."
        });
      }
      
      const userId = parseInt(req.params.id);
      const adminId = req.user.id;
      
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
  
  app.post("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za kreiranje korisnika" });
      }
      
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
  
  app.put("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za ažuriranje korisnika" });
      }
      
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
  
  app.delete("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za brisanje korisnika" });
      }
      
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
      
      // Get all services assigned to this technician
      let services = await storage.getServicesByTechnician(technicianId);
      console.log(`Pronađeno ${services.length} servisa za servisera ${technicianId}`);
      
      // Ako nema servisa, proveri direktno u bazi (zaobilaženje kesiranja)
      if (services.length === 0) {
        try {
          // Direktno dohvati iz baze za ovaj slučaj
          const servicesFromDb = await pool.query(
            "SELECT * FROM services WHERE technician_id = $1",
            [technicianId]
          );
          
          if (servicesFromDb.rows.length > 0) {
            console.log(`Pronađeno ${servicesFromDb.rows.length} servisa direktno iz baze za servisera ${technicianId}`);
            // U ovom slučaju, moramo ručno mapirati kolone iz snake_case u camelCase
            services = servicesFromDb.rows.map(row => ({
              id: row.id,
              clientId: row.client_id,
              applianceId: row.appliance_id,
              technicianId: row.technician_id,
              description: row.description,
              status: row.status,
              scheduledDate: row.scheduled_date,
              completedDate: row.completed_date,
              cost: row.cost,
              technicianNotes: row.technician_notes,
              createdAt: row.created_at,
              usedParts: row.used_parts,
              machineNotes: row.machine_notes,
              isCompletelyFixed: row.is_completely_fixed
            }));
          }
        } catch (dbError) {
          console.error("Greška pri direktnom dohvatanju iz baze:", dbError);
        }
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
  app.get("/api/my-services", getTechnicianServices);

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
        // Obavesti administratore
        await emailService.notifyAdminAboutEmail(
          "Test email-a",
          recipient,
          0, // Nema ID servisa
          `Administrator ${req.user.fullName} je testirao slanje email-a na adresu ${recipient}`
        );
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

  // SQL Admin panel endpoint
  app.post("/api/admin/execute-sql", async (req, res) => {
    try {
      // Provera da li je korisnik admin
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Samo administrator ima pristup SQL upravljaču" });
      }
      
      const { query } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "SQL upit je obavezan" });
      }
      
      // Zaštita od destruktivnih upita koji mogu oštetiti bazu
      const lowerQuery = query.toLowerCase();
      const isDestructive = 
        lowerQuery.includes("drop table") || 
        lowerQuery.includes("drop database") ||
        lowerQuery.includes("truncate table");
      
      if (isDestructive) {
        return res.status(400).json({
          error: "Destruktivni upiti nisu dozvoljeni (DROP TABLE, DROP DATABASE, TRUNCATE)",
          query
        });
      }
      
      // Izvršavanje SQL upita
      const result = await pool.query(query);
      
      res.json({
        success: true,
        rowCount: result.rowCount,
        rows: result.rows,
        fields: result.fields?.map(f => ({
          name: f.name,
          dataTypeID: f.dataTypeID
        }))
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

  // SMS Servis rute
  
  // Schema za validaciju test SMS-a
  const testSmsSchema = z.object({
    recipient: z.string().min(1, { message: "Broj telefona je obavezan" }),
    message: z.string().min(1, { message: "Tekst poruke je obavezan" }).max(160, { message: "SMS poruka ne može biti duža od 160 karaktera" })
  });
  
  // Ruta za proveru konfiguracije SMS servisa
  app.get("/api/sms/config", (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ error: "Nemate dozvolu za pristup konfiguraciji SMS servisa" });
    }
    
    // Ovo je pojednostavljeni pristup koji će direktno koristiti environment varijable
    // Proverimo da li su svi potrebni kredencijali prisutni
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    console.log('[SMS CONFIG API] Kredencijali:', 
      'accountSid:', accountSid ? `${accountSid.substring(0, 5)}...` : 'nedostaje', 
      'authToken:', authToken ? 'postoji' : 'nedostaje',
      'phone:', phoneNumber || 'nedostaje');
    
    // Proverimo sami da li je konfiguracija validna
    const isValidConfig = 
      accountSid && 
      accountSid.startsWith('AC') && 
      authToken && 
      phoneNumber;
    
    console.log('[SMS CONFIG API] Validna konfiguracija:', isValidConfig);
    
    // Informacije o konfiguraciji
    const configInfo = {
      configured: isValidConfig,
      phone: phoneNumber || null,
      missingCredentials: {
        accountSid: !accountSid,
        authToken: !authToken,
        phoneNumber: !phoneNumber
      },
      invalidCredentials: {
        accountSid: accountSid && !accountSid.startsWith('AC'),
      }
    };
    
    res.json(configInfo);
  });
  
  // Ruta za slanje test SMS poruke
  app.post("/api/sms/test", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ error: "Nemate dozvolu za slanje test poruka" });
    }
    
    try {
      const validationResult = testSmsSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Nevažeći podaci za SMS", 
          details: validationResult.error.format() 
        });
      }
      
      const { recipient, message } = validationResult.data;
      
      // Slanje test poruke
      const result = await smsService.sendSms({
        to: recipient,
        body: message
      });
      
      if (result) {
        res.json({ success: true, message: "SMS poruka je uspešno poslata" });
      } else {
        res.status(500).json({ error: "Greška pri slanju SMS poruke" });
      }
    } catch (error) {
      console.error("Greška pri slanju test SMS poruke:", error);
      res.status(500).json({ error: "Greška pri slanju test SMS poruke", details: error.message });
    }
  });
  
  // Ruta za slanje SMS obaveštenja klijentu o promeni statusa servisa
  app.post("/api/sms/service-update/:serviceId", async (req, res) => {
    if (!req.isAuthenticated() || (req.user?.role !== "admin" && req.user?.role !== "technician")) {
      return res.status(401).json({ error: "Nemate dozvolu za slanje obaveštenja" });
    }
    
    try {
      const serviceId = parseInt(req.params.serviceId);
      const service = await storage.getService(serviceId);
      
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Dohvatanje podataka o klijentu
      const client = await storage.getClient(service.clientId);
      if (!client || !client.phone) {
        return res.status(400).json({ 
          error: "Nedostaju podaci o klijentu", 
          message: "Klijent ne postoji ili nema definisan broj telefona" 
        });
      }
      
      // Slanje SMS obaveštenja o promeni statusa
      const result = await smsService.sendServiceStatusUpdate(
        client,
        serviceId,
        STATUS_DESCRIPTIONS[service.status] || service.status,
        req.body.additionalInfo
      );
      
      if (result) {
        res.json({ success: true, message: "SMS obaveštenje je uspešno poslato" });
      } else {
        res.status(500).json({ error: "Greška pri slanju SMS obaveštenja" });
      }
    } catch (error) {
      console.error("Greška pri slanju SMS obaveštenja o servisu:", error);
      res.status(500).json({ error: "Greška pri slanju SMS obaveštenja", details: error.message });
    }
  });
  
  // Ruta za masovno slanje SMS poruka izabranim klijentima
  app.post("/api/sms/bulk", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ error: "Nemate dozvolu za slanje masovnih poruka" });
    }
    
    try {
      const { clientIds, message } = req.body;
      
      if (!Array.isArray(clientIds) || clientIds.length === 0) {
        return res.status(400).json({ error: "Morate izabrati bar jednog klijenta" });
      }
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: "Tekst poruke je obavezan" });
      }
      
      if (message.length > 160) {
        return res.status(400).json({ error: "SMS poruka ne može biti duža od 160 karaktera" });
      }
      
      const results = [];
      const errors = [];
      
      // Iteriramo kroz sve klijente i šaljemo im poruke
      for (const clientId of clientIds) {
        try {
          const client = await storage.getClient(clientId);
          
          if (!client || !client.phone) {
            errors.push({ 
              clientId, 
              error: "Klijent ne postoji ili nema definisan broj telefona" 
            });
            continue;
          }
          
          const result = await smsService.sendSms({
            to: client.phone,
            body: `Frigo Sistem Todosijević: ${message}`
          });
          
          if (result) {
            results.push({ clientId, success: true });
          } else {
            errors.push({ clientId, error: "Greška pri slanju SMS poruke" });
          }
        } catch (error) {
          errors.push({ clientId, error: error.message });
        }
      }
      
      res.json({
        success: errors.length === 0,
        results: {
          total: clientIds.length,
          sent: results.length,
          failed: errors.length
        },
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Greška pri masovnom slanju SMS poruka:", error);
      res.status(500).json({ error: "Greška pri masovnom slanju SMS poruka", details: error.message });
    }
  });

  // =====================================
  // GSM MODEM API ENDPOINTS
  // =====================================

  // Dobij dostupne serial portove za GSM modem
  app.get("/api/gsm-modem/ports", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za pristup GSM modem postavkama" });
      }

      const ports = await gsmOnlySMSService.getAvailablePorts();
      res.json({ ports });
    } catch (error) {
      console.error("Greška pri dobijanju portova:", error);
      res.status(500).json({ error: "Greška pri dobijanju dostupnih portova" });
    }
  });

  // Konfiguracija GSM modema
  app.post("/api/gsm-modem/configure", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za konfiguraciju GSM modema" });
      }

      const config = gsmModemSettingsSchema.parse(req.body);
      
      if (config.connectionType === 'wifi') {
        console.log(`[GSM MODEM API] WiFi konfiguracija GSM modema: host=${config.wifiHost}, port=${config.wifiPort}, phone=${config.phoneNumber}`);
      } else {
        console.log(`[GSM MODEM API] USB konfiguracija GSM modema: port=${config.port}, baud=${config.baudRate}, phone=${config.phoneNumber}`);
      }
      
      // Konfiguracija GSM-only servisa sa novim poljima
      const gsmConfig = {
        port: config.port || '',
        baudRate: config.baudRate,
        phoneNumber: config.phoneNumber,
        connectionType: config.connectionType,
        wifiHost: config.wifiHost,
        wifiPort: config.wifiPort
      };

      const configured = await gsmOnlySMSService.configure(gsmConfig);
      
      if (configured) {
        res.json({ 
          success: true, 
          message: "GSM modem je uspešno konfigurisan",
          provider: 'gsm_modem',
          phoneNumber: config.phoneNumber
        });
      } else {
        res.status(500).json({ error: "Greška pri konfiguraciji GSM modema" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Nevažeći podaci za GSM modem", 
          details: error.format() 
        });
      }
      console.error("Greška pri konfiguraciji GSM modema:", error);
      res.status(500).json({ 
        error: "Greška pri konfiguraciji GSM modema", 
        message: error instanceof Error ? error.message : "Nepoznata greška"
      });
    }
  });

  // Status GSM modema
  app.get("/api/gsm-modem/status", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za pristup GSM modem statusu" });
      }

      const status = await gsmOnlySMSService.getStatus();
      
      res.json(status);
    } catch (error) {
      console.error("Greška pri dobijanju GSM modem statusa:", error);
      res.status(500).json({ error: "Greška pri dobijanju GSM modem statusa" });
    }
  });

  // Test konekcije sa GSM modemom
  app.post("/api/gsm-modem/test-connection", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za testiranje GSM modem konekcije" });
      }

      const { host, port } = req.body;
      
      if (!host || !port) {
        return res.status(400).json({ error: "Host i port su obavezni za testiranje konekcije" });
      }

      // Brza provjera konekcije sa kratkim timeout-om
      const net = require('net');
      const client = new net.Socket();
      
      const testPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.destroy();
          reject(new Error(`Timeout - modem nije dostupan na ${host}:${port}`));
        }, 3000); // 3 sekunde timeout

        client.connect(port, host, () => {
          clearTimeout(timeout);
          client.destroy();
          resolve(true);
        });

        client.on('error', (err) => {
          clearTimeout(timeout);
          client.destroy();
          reject(err);
        });
      });

      await testPromise;
      
      res.json({ 
        success: true, 
        message: `Konekcija sa ${host}:${port} je uspešna`,
        host,
        port
      });
    } catch (error) {
      console.error(`Greška pri testiranju konekcije sa ${req.body.host}:${req.body.port}:`, error);
      res.status(400).json({ 
        success: false, 
        message: error.message || "Greška pri testiranju konekcije",
        host: req.body.host,
        port: req.body.port
      });
    }
  });

  // Skeniranje mreže za GSM modem
  app.post("/api/gsm-modem/scan-network", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za skeniranje mreže" });
      }

      console.log("[GSM MODEM] Započinje skeniranje mreže za GSM modem...");
      
      const net = require('net');
      const commonPorts = [23, 2000, 8080, 80, 8888, 443, 1883, 8081, 8082, 8083];
      const possibleIPs = [
        '192.168.1.1',
        '192.168.0.1', 
        '192.168.1.100',
        '192.168.0.100',
        '10.0.0.1',
        '172.16.0.1'
      ];

      const devices = [];
      let scanCount = 0;
      const totalScans = possibleIPs.length * commonPorts.length;

      for (const ip of possibleIPs) {
        for (const port of commonPorts) {
          scanCount++;
          console.log(`[GSM SCAN] Skeniram ${ip}:${port} (${scanCount}/${totalScans})`);
          
          try {
            const client = new net.Socket();
            
            const testPromise = new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                client.destroy();
                reject(new Error('timeout'));
              }, 1000); // 1 sekunda timeout za svaki test

              client.connect(port, ip, () => {
                clearTimeout(timeout);
                client.destroy();
                resolve({ ip, port });
              });

              client.on('error', (err) => {
                clearTimeout(timeout);
                client.destroy();
                reject(err);
              });
            });

            const result = await testPromise;
            devices.push(result);
            console.log(`[GSM SCAN] ✓ Pronađen modem na ${ip}:${port}`);
            
            // Prekini skeniranje nakon prvog pronađenog uređaja
            if (devices.length > 0) break;
          } catch (error) {
            // Ignorisi greške i nastavi skeniranje
          }
        }
        
        // Prekini skeniranje nakon prvog pronađenog uređaja
        if (devices.length > 0) break;
      }

      console.log(`[GSM SCAN] Završeno skeniranje. Pronađeno ${devices.length} uređaja.`);
      
      res.json({ 
        success: true, 
        devices,
        scannedCount: scanCount,
        totalCount: totalScans
      });
    } catch (error) {
      console.error("Greška pri skeniranju mreže:", error);
      res.status(500).json({ 
        success: false, 
        message: "Greška pri skeniranju mreže",
        error: error.message
      });
    }
  });

  // Test SMS funkcija
  app.post("/api/gsm-modem/send-test-sms", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za slanje test SMS-a" });
      }

      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ error: "Broj telefona i poruka su obavezni" });
      }

      console.log(`[GSM MODEM] Slanje test SMS-a na ${phoneNumber}: ${message}`);
      
      // Koristi GSM-only SMS servis
      const result = await gsmOnlySMSService.sendSMS({
        to: phoneNumber,
        message: message,
        type: 'custom'
      });

      res.json({
        success: result.success,
        message: result.success ? "SMS uspešno poslat" : "Greška pri slanju SMS-a",
        messageId: result.messageId,
        error: result.error
      });
    } catch (error) {
      console.error("Greška pri slanju test SMS-a:", error);
      res.status(500).json({ 
        success: false, 
        message: "Greška pri slanju test SMS-a",
        error: error.message
      });
    }
  });

  // Test GSM modema
  app.post("/api/gsm-modem/test", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za testiranje GSM modema" });
      }

      const { recipient } = z.object({ recipient: z.string().min(8) }).parse(req.body);
      
      console.log(`[GSM MODEM TEST] Slanje test SMS-a na: ${recipient}`);
      
      const result = await gsmOnlySMSService.testSms(recipient, "Test poruka sa GSM modema - Frigo Sistem Todosijević");
      
      if (result.success) {
        console.log(`[GSM MODEM TEST] ✅ Test SMS uspešno poslat na: ${recipient}`);
        return res.json({ 
          success: true, 
          message: "Test SMS uspešno poslat",
          messageId: result.messageId,
          provider: result.provider || 'gsm_modem'
        });
      } else {
        console.error(`[GSM MODEM TEST] ❌ Neuspešno slanje test SMS-a: ${result.error}`);
        return res.status(500).json({ 
          success: false, 
          error: result.error || "Neuspešno slanje test SMS-a"
        });
      }
    } catch (error) {
      console.error("[GSM MODEM TEST] Greška:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          error: "Nevažeći broj telefona", 
          details: error.format() 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: "Greška pri slanju test SMS-a", 
        message: error instanceof Error ? error.message : "Nepoznata greška" 
      });
    }
  });

  // Restart GSM modem konekcije
  app.post("/api/gsm-modem/restart", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za restartovanje GSM modema" });
      }

      console.log("[GSM MODEM API] Restartovanje GSM modem konekcije...");
      
      const restarted = await gsmOnlySMSService.restart();
      
      if (restarted) {
        res.json({ 
          success: true, 
          message: "GSM modem je uspešno restartovan" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Greška pri restartovanju GSM modema" 
        });
      }
    } catch (error) {
      console.error("Greška pri restartovanju GSM modema:", error);
      res.status(500).json({ 
        success: false, 
        error: "Greška pri restartovanju GSM modema", 
        message: error instanceof Error ? error.message : "Nepoznata greška" 
      });
    }
  });

  // =====================================
  // NOTIFICATIONS API ENDPOINTS
  // =====================================

  // Dobijanje notifikacija za trenutno ulogovanog korisnika
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Morate biti ulogovani" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await NotificationService.getUserNotifications(req.user.id, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Greška pri dobijanju notifikacija:", error);
      res.status(500).json({ error: "Greška pri dobijanju notifikacija" });
    }
  });

  // Dobijanje broja nepročitanih notifikacija
  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Morate biti ulogovani" });
      }

      const count = await NotificationService.getUnreadCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Greška pri dobijanju broja nepročitanih notifikacija:", error);
      res.status(500).json({ error: "Greška pri dobijanju broja nepročitanih notifikacija" });
    }
  });

  // Označavanje notifikacije kao pročitane
  app.post("/api/notifications/:id/mark-read", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Morate biti ulogovani" });
      }

      const notificationId = parseInt(req.params.id);
      await NotificationService.markAsRead(notificationId, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Greška pri označavanju notifikacije kao pročitane:", error);
      res.status(500).json({ error: "Greška pri označavanju notifikacije kao pročitane" });
    }
  });

  // Označavanje svih notifikacija kao pročitane
  app.post("/api/notifications/mark-all-read", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Morate biti ulogovani" });
      }

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

      // Slanje email notifikacije administratorima
      try {
        const client = await storage.getClient(clientId);
        if (client) {
          // Koristim postojeću email funkcionalnost
          const adminUsers = await storage.getAllUsers();
          const admins = adminUsers.filter(user => user.role === "admin");
          
          for (const admin of admins) {
            if (admin.email) {
              await emailService.sendEmail({
                to: admin.email,
                subject: `Novi zahtev za servis #${newService.id} od klijenta ${client.fullName}`,
                html: `
                  <h2>Novi zahtev za servis #${newService.id}</h2>
                  <p><strong>Klijent:</strong> ${client.fullName}</p>
                  <p><strong>Email:</strong> ${client.email || 'Nije dostupan'}</p>
                  <p><strong>Telefon:</strong> ${client.phone || 'Nije dostupan'}</p>
                  <p><strong>Opis:</strong> ${newService.description}</p>
                  <p>Molimo vas da pregledate novi zahtev u administratorskom panelu.</p>
                `
              });
            }
          }
        }
      } catch (emailError) {
        console.error("Greška pri slanju email notifikacije:", emailError);
      }

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
  app.put("/api/services/:id/assign-technician", async (req, res) => {
    try {
      // Proveri da li je korisnik admin
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
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
      
      // Pošalji SMS obaveštenje klijentu o dodeljivanju servisera
      if (service.client?.phone) {
        const smsMessage = generateStatusUpdateMessage(serviceId, 'assigned', technician.fullName);
        const smsResult = await newSmsService.sendSms({
          to: service.client.phone,
          message: smsMessage,
          type: 'status_update'
        });
        
        if (smsResult.success) {
          console.log(`[SMS] ✅ SMS obaveštenje o dodeljivanju servisera poslato klijentu ${service.client.fullName}`);
        } else {
          console.error(`[SMS] ❌ Neuspešno slanje SMS-a: ${smsResult.error}`);
          // Fallback na Twilio
          await smsService.sendServiceStatusUpdate(
            service.client,
            { id: serviceId, description: service.description, status: 'assigned' },
            'assigned',
            technician.fullName
          );
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

  app.put("/api/services/:id/update-status", async (req, res) => {
    try {
      // Proveri da li je korisnik admin ili serviser
      if (!req.isAuthenticated() || !["admin", "technician"].includes(req.user?.role || "")) {
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
      
      // Ažuriraj status
      const updatedService = await storage.updateService(serviceId, { status });
      
      console.log(`Status servisa #${serviceId} ažuriran na: ${status}`);
      
      // Pošalji notifikaciju o promeni statusa
      try {
        await NotificationService.notifyServiceStatusChanged(serviceId, status, req.user.id);
      } catch (notificationError) {
        console.error("Greška pri slanju notifikacije o promeni statusa:", notificationError);
      }
      
      // Pošalji SMS obaveštenje klijentu o promenama statusa
      if (service.client?.phone) {
        const smsMessage = generateStatusUpdateMessage(serviceId, status, service.technician?.fullName);
        const smsResult = await newSmsService.sendSms({
          to: service.client.phone,
          message: smsMessage,
          type: 'status_update'
        });
        
        if (smsResult.success) {
          console.log(`[SMS] ✅ SMS obaveštenje o statusu poslato klijentu ${service.client.fullName}`);
        } else {
          console.error(`[SMS] ❌ Neuspešno slanje SMS-a: ${smsResult.error}`);
          // Fallback na Twilio
          await smsService.sendServiceStatusUpdate(
            service.client,
            { id: serviceId, description: service.description, status: status },
            status,
            service.technician?.fullName
          );
        }
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

  // SMS Configuration endpoints
  app.post("/api/admin/sms-settings", async (req, res) => {
    try {
      // Proveri da li je korisnik admin
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za konfiguraciju SMS-a" });
      }
      
      const smsConfig = smsSettingsSchema.parse(req.body);
      
      console.log(`[SMS ADMIN] Konfiguracija SMS provajdera: ${smsConfig.provider}`);
      
      // Konfiguriši novi SMS servis
      newSmsService.configure(smsConfig);
      
      res.json({ 
        success: true, 
        message: `SMS provajder ${smsConfig.provider} je uspešno konfigurisan`,
        provider: smsConfig.provider
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Nevažeće SMS postavke", 
          details: error.format() 
        });
      }
      console.error("Greška pri konfiguraciji SMS-a:", error);
      res.status(500).json({ 
        error: "Greška pri konfiguraciji SMS-a", 
        message: error instanceof Error ? error.message : "Nepoznata greška"
      });
    }
  });

  app.get("/api/admin/sms-settings", async (req, res) => {
    try {
      // Proveri da li je korisnik admin
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za pregled SMS postavki" });
      }
      
      const configInfo = newSmsService.getConfigInfo();
      
      if (!configInfo) {
        return res.json({ 
          configured: false,
          recommendations: [
            { provider: 'messaggio', description: 'Najbolja opcija za Crnu Goru', price: '€0.025-0.05/SMS' },
            { provider: 'plivo', description: 'Pouzdana multinacionalna opcija', price: '€0.03-0.08/SMS' },
            { provider: 'budgetsms', description: 'Najjeftinija opcija', price: '€0.052/SMS' },
            { provider: 'viber', description: 'Hibridna opcija (Viber + SMS fallback)', price: '€0.0025/Viber + SMS fallback' }
          ]
        });
      }
      
      res.json({
        configured: true,
        provider: configInfo.provider
      });
    } catch (error) {
      console.error("Greška pri dobijanju SMS postavki:", error);
      res.status(500).json({ 
        error: "Greška pri dobijanju SMS postavki", 
        message: error instanceof Error ? error.message : "Nepoznata greška"
      });
    }
  });

  app.post("/api/admin/test-sms", async (req, res) => {
    try {
      // Proveri da li je korisnik admin
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za testiranje SMS-a" });
      }
      
      const { recipient } = z.object({ recipient: z.string().min(8) }).parse(req.body);
      
      console.log(`[SMS TEST] Slanje test SMS-a na: ${recipient}`);
      
      // Koristi GSM modem SMS servis
      const hybridResult = await gsmOnlySMSService.sendSms({
        to: recipient,
        message: `Test SMS iz Frigo Sistema. Vreme: ${new Date().toLocaleString('sr-Latn-ME')}. Ignoriši ovu poruku.`,
        type: 'custom'
      });
      
      if (hybridResult.success) {
        console.log(`[SMS TEST] ✅ Test SMS uspešno poslat na: ${recipient} preko ${hybridResult.provider}`);
        return res.json({ 
          success: true, 
          message: "Test SMS uspešno poslat",
          messageId: hybridResult.messageId,
          cost: hybridResult.cost,
          provider: hybridResult.provider
        });
      } else {
        console.error(`[SMS TEST] ❌ Hibridni servis neuspešan: ${hybridResult.error}, pokušavam fallback`);
        
        // Fallback na novi SMS servis
        const fallbackResult = await newSmsService.sendSms({
          to: recipient,
          message: `Test SMS iz Frigo Sistema. Vreme: ${new Date().toLocaleString('sr-Latn-ME')}. Ignoriši ovu poruku.`,
          type: 'transactional'
        });
        
        if (fallbackResult.success) {
          console.log(`[SMS TEST] ✅ Test SMS uspešno poslat na: ${recipient} preko fallback`);
          return res.json({ 
            success: true, 
            message: "Test SMS uspešno poslat (fallback)",
            messageId: fallbackResult.messageId,
            cost: fallbackResult.cost,
            provider: newSmsService.getConfigInfo()?.provider
          });
        } else {
          console.error(`[SMS TEST] ❌ Svi SMS servisi neuspešni: ${fallbackResult.error}`);
          return res.status(500).json({ 
            success: false, 
            error: fallbackResult.error || "Neuspešno slanje test SMS-a"
          });
        }
      }
    } catch (error) {
      console.error("[SMS TEST] Greška:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          error: "Nevažeći broj telefona", 
          details: error.format() 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: "Greška pri slanju test SMS-a", 
        message: error instanceof Error ? error.message : "Nepoznata greška" 
      });
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
      
      const result = await newSmsService.sendSms({
        to: service.client.phone,
        message: message,
        type: type || 'custom'
      });
      
      if (result.success) {
        console.log(`[SMS] ✅ SMS uspešno poslat klijentu ${service.client.fullName}`);
        return res.json({ 
          success: true, 
          message: "SMS obaveštenje uspešno poslato",
          messageId: result.messageId,
          cost: result.cost
        });
      } else {
        console.error(`[SMS] ❌ Neuspešno slanje SMS-a: ${result.error}`);
        return res.status(500).json({ 
          success: false, 
          error: result.error || "Neuspešno slanje SMS obaveštenja"
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
  app.get("/api/admin/services", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(401);
    }

    try {
      const services = await storage.getAdminServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching admin services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Get services waiting for parts (admin only)
  app.get("/api/admin/services/waiting-for-parts", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(401);
    }

    try {
      const waitingServices = await storage.getServicesByStatus('waiting_parts');
      res.json(waitingServices);
    } catch (error) {
      console.error("Error fetching waiting services:", error);
      res.status(500).json({ error: "Failed to fetch waiting services" });
    }
  });

  app.get("/api/admin/services/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(401);
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

  app.put("/api/admin/services/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.sendStatus(401);
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

  app.delete("/api/admin/services/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.sendStatus(401);
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

  app.put("/api/admin/services/:id/assign-technician", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(401);
    }

    try {
      const serviceId = parseInt(req.params.id);
      const { technicianId } = req.body;
      
      const updatedService = await storage.assignTechnicianToService(serviceId, technicianId);
      if (!updatedService) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      res.json(updatedService);
    } catch (error) {
      console.error("Error assigning technician:", error);
      res.status(500).json({ error: "Failed to assign technician" });
    }
  });

  // Spare parts API endpoints
  
  // Get all spare part orders (admin only)
  app.get("/api/admin/spare-parts", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(401);
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
  app.get("/api/admin/spare-parts/pending", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(401);
    }

    try {
      const orders = await storage.getPendingSparePartOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching pending spare part orders:", error);
      res.status(500).json({ error: "Failed to fetch pending spare part orders" });
    }
  });

  // Get spare part order by ID
  app.get("/api/spare-parts/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

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
  app.get("/api/services/:id/spare-parts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

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
  app.post("/api/services/:id/spare-parts", async (req, res) => {
    console.log("🔍 POST /api/services/:id/spare-parts called");
    console.log("Auth status:", req.isAuthenticated());
    console.log("User:", req.user);
    
    if (!req.isAuthenticated()) {
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
  app.post("/api/spare-parts", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "technician") {
      return res.sendStatus(401);
    }

    try {
      const technicianId = req.user.technicianId;
      if (!technicianId) {
        return res.status(400).json({ error: "Technician ID not found" });
      }

      const validatedData = insertSparePartOrderSchema.parse({
        ...req.body,
        technicianId,
        status: 'pending'
      });

      const order = await storage.createSparePartOrder(validatedData);
      
      // Automatski kreiraj obaveštenje za administratore
      await NotificationService.notifySparePartOrdered(order.id, technicianId);
      
      // Automatski premesti servis u "waiting_parts" status
      await storage.updateService(validatedData.serviceId, {
        status: 'waiting_parts',
        technicianNotes: (await storage.getService(validatedData.serviceId))?.technicianNotes + 
          `\n[${new Date().toLocaleDateString('sr-RS')}] Servis pauziran - čeka rezervni deo: ${validatedData.partName}`
      });
      
      // Kreiraj obaveštenje za tehničara da je servis premešten u folder čekanja
      await NotificationService.notifyServiceWaitingForParts(
        validatedData.serviceId,
        req.user.id,
        validatedData.partName
      );
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating spare part order:", error);
      res.status(500).json({ error: "Failed to create spare part order" });
    }
  });

  // Update spare part order (admin only)
  app.put("/api/admin/spare-parts/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(401);
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
  app.post("/api/admin/services/:id/return-from-waiting", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(401);
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
  app.delete("/api/admin/spare-parts/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(401);
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

  const httpServer = createServer(app);
  return httpServer;
}
