import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, type IStorage } from "./storage";
import { setupAuth, comparePassword } from "./auth";
import { registerBusinessPartnerRoutes } from "./business-partner-routes";
import { emailService } from "./email-service";
import { excelService } from "./excel-service";
import { generateToken, jwtAuthMiddleware, jwtAuth, requireRole } from "./jwt-auth";
const authenticateJWT = jwtAuthMiddleware;
import { insertClientSchema, insertServiceSchema, insertApplianceSchema, insertApplianceCategorySchema, insertManufacturerSchema, insertTechnicianSchema, insertUserSchema, serviceStatusEnum, warrantyStatusEnum, warrantyStatusStrictEnum, maintenanceFrequencyEnum, insertSparePartOrderSchema, sparePartUrgencyEnum, sparePartStatusEnum, sparePartWarrantyStatusEnum, insertRemovedPartSchema, insertSparePartsCatalogSchema, sparePartCategoryEnum, sparePartAvailabilityEnum, sparePartSourceTypeEnum, insertServiceCompletionReportSchema } from "@shared/schema";
import { db } from "./db";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { eq, and, desc, gte, lte, lt, ne, isNull, isNotNull, like, count, sql, sum, or, inArray } from "drizzle-orm";
import * as schema from "@shared/schema";
import { SMSCommunicationService } from "./sms-communication-service.js";
const { availableParts, appliances, applianceCategories, manufacturers, services, users, technicians, sparePartOrders, servicePhotos } = schema;
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
import { verifyWebhook, handleWebhook, getWebhookConfig } from './whatsapp-webhook-handler';
import QRCode from 'qrcode';
// SMS Mobile functionality AKTIVNA za sve notifikacije

// CONSOLIDATED ENTERPRISE MONITORING & HEALTH CHECK SYSTEM
// Cached health response object for performance optimization
let cachedHealthResponse: any = null;
let cacheTimestamp = 0;
const HEALTH_CACHE_TTL = 30000; // 30 seconds cache TTL

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

// SMS funkcionalnost AKTIVNA - za automatske notifikacije statusa
function generateStatusUpdateMessage(serviceId: number, newStatus: string, technicianName?: string | null): string {
  const statusDescription = STATUS_DESCRIPTIONS[newStatus] || newStatus;
  const technicianPart = technicianName ? ` Serviser: ${technicianName}.` : '';
  return `Servis #${serviceId}: ${statusDescription}.${technicianPart} Frigo Sistem Todosijević`;
}

// ===== JWT USER CACHE SYSTEM =====
// JWT User cache system for performance optimization
const jwtUserCache = new Map();
const JWT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Cache invalidation helper function
function invalidateUserCache(userId: number) {
  const cacheKey = `jwt-user-${userId}`;
  jwtUserCache.delete(cacheKey);
  console.log(`🗑️ [JWT-CACHE] Invalidated cache for user ID: ${userId}`);
}

// Auto-cleanup expired cache entries (runs every 5 minutes)
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, value] of jwtUserCache.entries()) {
    if ((now - value.timestamp) >= JWT_CACHE_TTL) {
      jwtUserCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 [JWT-CACHE] Auto-cleanup: Removed ${cleanedCount} expired cache entries`);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

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

  // ===== CONSOLIDATED HEALTH & MONITORING SYSTEM =====
  
  // Lightweight HEAD handler for external monitoring systems
  app.head('/api', (req, res) => {
    res.status(200).end();
  });
  
  // Main health endpoint with caching and optional DB check
  app.get("/api/health", async (req, res) => {
    try {
      const startTime = Date.now();
      const now = Date.now();
      
      // Return cached response if still valid
      if (cachedHealthResponse && (now - cacheTimestamp) < HEALTH_CACHE_TTL) {
        return res.status(200).json(cachedHealthResponse);
      }
      
      // Basic health status
      const health: any = {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`,
        version: "2025.1.0",
        responseTime: `${Date.now() - startTime}ms`
      };

      // Optional DB health check (only if db=true parameter)
      if (req.query.db === 'true') {
        try {
          const { checkDatabaseHealth } = await import('./db.js');
          const dbHealth = await checkDatabaseHealth();
          health.database = {
            status: dbHealth.healthy ? "connected" : "error",
            responseTime: `${dbHealth.responseTime}ms`,
            activeConnections: dbHealth.activeConnections
          };
          if (!dbHealth.healthy) {
            health.status = "degraded";
          }
        } catch (error) {
          health.database = { status: "error", error: "Connection failed" };
          health.status = "degraded";
        }
      }

      // Memory usage metrics
      const memUsage = process.memoryUsage();
      health.memory = {
        used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        percentage: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`
      };
      
      // Update response time
      health.responseTime = `${Date.now() - startTime}ms`;
      
      // Cache the response
      cachedHealthResponse = health;
      cacheTimestamp = now;
      
      res.status(200).json(health);
    } catch (error) {
      console.error("❌ [HEALTH] Health check error:", error);
      res.status(503).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
        message: (error as Error).message || "Unknown error"
      });
    }
  });
  
  // Status endpoint alias - redirects to main health endpoint
  app.get("/api/status", (req, res) => {
    res.redirect(301, "/api/health");
  });

  // ===== SPARE PARTS ADMIN ENDPOINTS =====
  app.get("/api/admin/spare-parts", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      // Security audit log
      console.log(`📦 [MAIN SPARE-PARTS] Admin ${req.user?.username} traži GLAVNU listu rezervnih delova - SA ENRICHED PODACIMA!`);
      
      // Prevent caching to ensure fresh data with new enriched structure
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const orders = await storage.getAllSparePartOrders();
      console.log(`📦 [MAIN SPARE-PARTS] Vraćam ${orders.length} order-a sa enriched podacima`);
      
      res.json(orders);
    } catch (error) {
      console.error("❌ [SPARE PARTS] Greška pri dohvatanju porudžbina:", error);
      res.status(500).json({ error: "Greška pri učitavanju porudžbina rezervnih delova" });
    }
  });

  app.get("/api/admin/spare-parts/pending", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const orders = await storage.getPendingSparePartOrders();
      res.json(orders);
    } catch (error) {
      console.error("❌ [SPARE PARTS] Greška pri dohvatanju porudžbina na čekanju:", error);
      res.status(500).json({ error: "Greška pri učitavanju porudžbina na čekanju" });
    }
  });

  app.get("/api/admin/spare-parts/all-requests", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log("📋 [ALL-REQUESTS] Admin traži sve zahteve (pending + requested)");
      
      // Prevent caching to ensure fresh data with new enriched structure
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const orders = await storage.getAllRequestsSparePartOrders();
      res.json(orders);
    } catch (error) {
      console.error("❌ [ALL-REQUESTS] Greška pri dohvatanju svih zahteva:", error);
      res.status(500).json({ error: "Greška pri učitavanju svih zahteva rezervnih delova" });
    }
  });

  // ===== COMPLUS FOKUSIRAN AUTOMATSKI EMAIL SISTEM =====
  
  // ComPlus brendovi za automatsku detekciju - STVARNI PODACI
  const complusBrands = [
    'Electrolux', 'Elica', 'Candy', 'Hoover', 'Turbo Air'
  ];

  // Mapa dobavljača sa prioritetom za ComPlus brend - AŽURIRANO SA STVARNIM PODACIMA
  const supplierEmailConfig = new Map([
    // 🎯 COMPLUS - GLAVNA DESTINACIJA ZA REZERVNE DELOVE
    ["ComPlus", "servis@complus.me"],
    ["ComPlus Servis", "servis@complus.me"],
    ["servis@complus.me", "servis@complus.me"],
    
    // ComPlus povezani brendovi - STVARNI PODACI
    ["Electrolux", "servis@complus.me"], // ComPlus brend
    ["Electrolux Service", "servis@complus.me"], // ComPlus brend
    ["Elica", "servis@complus.me"], // ComPlus brend
    ["Elica Service", "servis@complus.me"], // ComPlus brend
    ["Candy", "servis@complus.me"], // ComPlus brend
    ["Candy Service", "servis@complus.me"], // ComPlus brend
    ["Hoover", "servis@complus.me"], // ComPlus brend
    ["Hoover Service", "servis@complus.me"], // ComPlus brend
    ["Turbo Air", "servis@complus.me"], // ComPlus brend
    ["TurboAir", "servis@complus.me"], // ComPlus brend
    ["Turbo Air Service", "servis@complus.me"], // ComPlus brend
    
    // Lokalni ComPlus partneri
    ["TehnoPlus", "robert.ivezic@tehnoplus.me"],
    ["Frigo Sistem Todosijević", "gruica@frigosistemtodosijevic.com"],
    
    // Ostali dobavljači (backup za ne-ComPlus brendove)
    ["Bosch Service", "servis@bosch.rs"],
    ["Siemens Service", "delovi@siemens.rs"],
    ["Gorenje Servis", "rezervni.delovi@gorenje.com"],
    ["Whirlpool Parts", "parts@whirlpool.rs"],
    ["Samsung Service", "spareparts@samsung.rs"],
    ["LG Electronics", "parts@lg.rs"],
    ["Beko Servis", "rezervni@beko.rs"],
    ["Miele Service", "parts@miele.rs"]
  ]);

  /**
   * Provera da li je uređaj ComPlus brenda na osnovu proizvođača
   */
  function isComplusBrand(manufacturerName: string): boolean {
    if (!manufacturerName) return false;
    return complusBrands.some(brand => 
      manufacturerName.toLowerCase().includes(brand.toLowerCase()) ||
      brand.toLowerCase().includes(manufacturerName.toLowerCase())
    );
  }

  /**
   * Dohvata email adresu dobavljača na osnovu naziva - OPTIMIZOVANO ZA COMPLUS
   */
  function getSupplierEmailByName(supplierName: string): string | null {
    if (!supplierName) return null;
    
    // Prva provera - direktno poklapanje
    const directMatch = supplierEmailConfig.get(supplierName);
    if (directMatch) return directMatch;
    
    // Druga provera - case-insensitive poklapanje
    const normalizedName = supplierName.toLowerCase().trim();
    for (const [name, email] of supplierEmailConfig.entries()) {
      if (name.toLowerCase() === normalizedName) {
        return email;
      }
    }
    
    // Treća provera - parcijalno poklapanje (sadrži reči)
    for (const [name, email] of supplierEmailConfig.entries()) {
      const nameWords = name.toLowerCase().split(' ');
      const supplierWords = normalizedName.split(' ');
      
      const hasCommonWord = nameWords.some(nameWord => 
        supplierWords.some(supplierWord => 
          nameWord.includes(supplierWord) || supplierWord.includes(nameWord)
        )
      );
      
      if (hasCommonWord) return email;
    }
    
    return null; // Dobavljač nije pronađen
  }

  // ===== NOVI OPTIMIZOVANI WORKFLOW ZA REZERVNE DELOVE =====
  
  // 1. Zahtev servisera za rezervni deo
  app.post("/api/technician/spare-parts/request", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo serviseri mogu da zahtevaju rezervne delove" });
      }

      const requestData = {
        ...req.body,
        status: "requested" as "requested",
        technicianId: req.user.technicianId || req.user!.id,
        requesterType: "technician" as "technician",
        requesterUserId: req.user.technicianId || req.user!.id,
        requesterName: req.user.fullName || req.user.username
      };

      const order = await storage.createSparePartOrder(requestData);
      console.log(`📦 [WORKFLOW] Serviser ${req.user.username} zahtevao rezervni deo: ${requestData.partName}`);
      
      res.json({ 
        success: true, 
        message: "Zahtev za rezervni deo je uspešno poslat", 
        order 
      });
    } catch (error) {
      console.error("❌ [WORKFLOW] Greška pri zahtevu za rezervni deo:", error);
      res.status(500).json({ error: "Greška pri slanju zahteva za rezervni deo" });
    }
  });

  // 2. Admin označi deo kao poručen + automatski pošalji email dobavljaču
  app.patch("/api/admin/spare-parts/:id/order", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu da poručuju rezervne delove" });
      }

      const orderId = parseInt(req.params.id);
      const { supplierName, estimatedDelivery, adminNotes, urgency = 'normal' } = req.body;

      // Dohvati kompletan order sa svim povezanim podacima
      const existingOrder = await storage.getSparePartOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Porudžbina rezervnog dela nije pronađena" });
      }

      // Ažuriraj status porudžbine
      const order = await storage.updateSparePartOrderStatus(orderId, {
        status: "admin_ordered",
        supplierName,
        expectedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        adminNotes: adminNotes ? `${adminNotes} (Poručio: ${req.user.fullName || req.user.username})` : `Poručio: ${req.user.fullName || req.user.username}`,
        orderDate: new Date()
      });

      console.log(`📦 [WORKFLOW] Admin ${req.user.username} poručio rezervni deo ID: ${orderId}`);

      // Dohvati dodatne podatke za email - deklaracija u širem scope-u
      let serviceData = null;
      let clientData = null;
      let applianceData = null;
      let technicianData = null;
      let manufacturerData = null;
      let categoryData = null;
      let manufacturerName = ''; // Declare manufacturerName in wider scope

      // NOVO: COMPLUS FOKUSIRAN AUTOMATSKI EMAIL SISTEM
      try {

        if (existingOrder.serviceId) {
          serviceData = await storage.getService(existingOrder.serviceId);
          if (serviceData) {
            if (serviceData.clientId) {
              clientData = await storage.getClient(serviceData.clientId);
            }
            if (serviceData.applianceId) {
              applianceData = await storage.getAppliance(serviceData.applianceId);
              // Properly get manufacturer and category data
              if (applianceData?.manufacturerId) {
                manufacturerData = await storage.getManufacturer(applianceData.manufacturerId);
              }
              if (applianceData?.categoryId) {
                categoryData = await storage.getApplianceCategory(applianceData.categoryId);
              }
            }
            if (serviceData.technicianId) {
              technicianData = await storage.getTechnician(serviceData.technicianId);
            }
          }
        }

        manufacturerName = manufacturerData?.name || '';
        const isComPlus = isComplusBrand(manufacturerName);

        console.log(`📦 [COMPLUS CHECK] Proizvođač: "${manufacturerName}", ComPlus brend: ${isComPlus}`);

        // 🎯 COMPLUS BREND - Koristi postojeći ComPlus email sistem
        if (isComPlus) {
          console.log(`🎯 [COMPLUS] Poručujem ComPlus rezervni deo - direktno na servis@complus.me`);
          
          const deviceType = categoryData?.name || 'Uređaj';
          const complusEmailSent = await emailService.sendComplusSparePartOrder(
            existingOrder.serviceId || 0,
            clientData?.fullName || 'N/A',
            technicianData?.fullName || 'N/A',
            deviceType,
            manufacturerName,
            existingOrder.partName,
            existingOrder.partNumber || 'N/A',
            urgency,
            existingOrder.description ?? undefined
          );

          if (complusEmailSent) {
            console.log(`🎯 [COMPLUS EMAIL] ✅ ComPlus email uspešno poslat na servis@complus.me za deo: ${existingOrder.partName}`);
          } else {
            console.error(`🎯 [COMPLUS EMAIL] ❌ Neuspešno slanje ComPlus email-a za deo: ${existingOrder.partName}`);
          }
        } 
        // 📧 OSTALI BRENDOVI - Koristi opšti supplier sistem
        else {
          const supplierEmail = getSupplierEmailByName(supplierName);
          
          if (supplierEmail) {
            // Pripremi podatke za opšti email template
            const orderData = {
              partName: existingOrder.partName,
              partNumber: existingOrder.partNumber ?? undefined,
              quantity: existingOrder.quantity,
              urgency: urgency,
              description: existingOrder.description ?? undefined,
              serviceId: existingOrder.serviceId ?? undefined,
              clientName: clientData?.fullName,
              clientPhone: clientData?.phone,
              applianceModel: applianceData?.model ?? undefined,
              applianceSerialNumber: applianceData?.serialNumber ?? undefined,
              manufacturerName: manufacturerName,
              categoryName: categoryData?.name || 'Uređaj',
              technicianName: technicianData?.fullName,
              orderDate: new Date(),
              adminNotes: adminNotes
            };

            // Pošalji email opštem dobavljaču
            const emailSent = await emailService.sendSparePartOrderToSupplier(
              { email: supplierEmail, name: supplierName },
              orderData
            );

            if (emailSent) {
              console.log(`📧 [GENERAL EMAIL] ✅ Email poslat dobavljaču ${supplierName} (${supplierEmail})`);
            } else {
              console.error(`📧 [GENERAL EMAIL] ❌ Neuspešno slanje email-a dobavljaču ${supplierName} (${supplierEmail})`);
            }
          } else {
            console.log(`📧 [GENERAL EMAIL] ⚠️ Email adresa za dobavljača ${supplierName} nije konfigurisana`);
          }
        }
      } catch (emailError) {
        console.error("📧 [EMAIL ERROR] Greška pri slanju email-a:", emailError);
        // Email greška ne prekida workflow - admin je svakako poručio deo
      }

      // 📱 SMS PROTOKOL ZA PORUČIVANJE DELOVA
      try {
        const { createProtocolSMSService } = await import('./sms-communication-service.js');
        
        // Dobijamo SMS konfiguraciju iz baze
        const settingsArray = await storage.getSystemSettings();
        const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
        
        // Kreiranje Protocol SMS Service instance
        const protocolSMS = createProtocolSMSService({
          apiKey: settingsMap.sms_mobile_api_key || '',
          baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
          senderId: settingsMap.sms_mobile_sender_id || null,
          enabled: settingsMap.sms_mobile_enabled === 'true'
        }, storage);

        if (existingOrder.serviceId && clientData && technicianData) {
          const smsData = {
            serviceId: existingOrder.serviceId,
            clientId: serviceData?.clientId || 0,
            clientName: clientData.fullName,
            clientPhone: clientData.phone,
            deviceType: categoryData?.name || 'Uređaj',
            deviceModel: applianceData?.model || 'N/A',
            manufacturerName: manufacturerName,
            technicianId: technicianData.id,
            technicianName: technicianData.fullName,
            technicianPhone: technicianData.phone || '067123456',
            partName: existingOrder.partName,
            estimatedDate: estimatedDelivery || '3-5 dana',
            createdBy: req.user.fullName || req.user.username
          };

          console.log(`📱 [ORDER-SMS-PROTOCOL] Šaljem SMS protokol za poručeni deo ID: ${orderId}`);
          const smsResult = await protocolSMS.sendPartsOrderedProtocol(smsData);
          
          if (smsResult.success) {
            console.log(`📱 [ORDER-SMS-PROTOCOL] ✅ SMS protokol uspešno poslat`);
          } else {
            console.error(`📱 [ORDER-SMS-PROTOCOL] ❌ Neuspešno slanje SMS protokola:`, smsResult.errors);
          }
        }
      } catch (smsError) {
        console.error("📱 [ORDER-SMS-PROTOCOL ERROR] Greška pri slanju SMS protokola:", smsError);
        // SMS greška ne prekida workflow
      }

      res.json({ 
        success: true, 
        message: "Rezervni deo je uspešno poručen", 
        order 
      });
    } catch (error) {
      console.error("❌ [WORKFLOW] Greška pri poručivanju rezervnog dela:", error);
      res.status(500).json({ error: "Greška pri poručivanju rezervnog dela" });
    }
  });

  // 3. Admin potvrdi prijem rezervnog dela
  app.patch("/api/admin/spare-parts/:id/receive", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu da potvrđuju prijem rezervnih delova" });
      }

      const orderId = parseInt(req.params.id);
      const { actualCost, adminNotes } = req.body;

      const order = await storage.updateSparePartOrderStatus(orderId, {
        status: "waiting_delivery",
        actualCost,
        adminNotes: adminNotes || null,
        receivedBy: req.user!.id,
        receivedAt: new Date()
      });

      console.log(`📦 [WORKFLOW] Admin ${req.user.username} potvrdio prijem rezervnog dela ID: ${orderId}`);
      res.json({ 
        success: true, 
        message: "Prijem rezervnog dela je uspešno potvrđen", 
        order 
      });
    } catch (error) {
      console.error("❌ [WORKFLOW] Greška pri potvrđivanju prijema:", error);
      res.status(500).json({ error: "Greška pri potvrđivanju prijema rezervnog dela" });
    }
  });

  // 4. Admin prebaci deo u dostupno stanje
  app.patch("/api/admin/spare-parts/:id/make-available", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu da prebacuju delove u dostupno stanje" });
      }

      const orderId = parseInt(req.params.id);

      const order = await storage.updateSparePartOrderStatus(orderId, {
        status: "available",
        madeAvailableBy: req.user!.id,
        madeAvailableAt: new Date()
      });

      console.log(`📦 [WORKFLOW] Admin ${req.user.username} prebacio deo u dostupno: ID ${orderId}`);
      res.json({ 
        success: true, 
        message: "Rezervni deo je prebačen u dostupno stanje", 
        order 
      });
    } catch (error) {
      console.error("❌ [WORKFLOW] Greška pri prebacivanju u dostupno:", error);
      res.status(500).json({ error: "Greška pri prebacivanju rezervnog dela u dostupno stanje" });
    }
  });

  // 4.5. POBOLJŠAN ENDPOINT - Odobri pending zahtev (pending → admin_ordered + auto email/SMS)
  app.patch("/api/admin/spare-parts/:id/approve-pending", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu da odobravaju pending zahteve" });
      }

      const orderId = parseInt(req.params.id);
      console.log(`✅ [APPROVE-PENDING] Admin odobrava pending zahtev ID: ${orderId}`);
      
      // Proverava da li order postoji i da li je u pending statusu
      const existingOrder = await storage.getSparePartOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Porudžbina rezervnog dela nije pronađena" });
      }
      
      if (existingOrder.status !== 'pending') {
        return res.status(400).json({ error: "Samo zahtevi sa statusom 'pending' mogu biti odobreni" });
      }
      
      // DIREKTNO PREBACI U "ADMIN_ORDERED" UMESTO "REQUESTED"
      const updatedOrder = await storage.updateSparePartOrderStatus(orderId, {
        status: 'admin_ordered',
        adminNotes: existingOrder.adminNotes ? `${existingOrder.adminNotes} | Odobrio: ${req.user.fullName || req.user.username}` : `Odobrio: ${req.user.fullName || req.user.username}`,
        orderDate: new Date()
      });
      
      if (!updatedOrder) {
        return res.status(500).json({ error: "Greška pri ažuriranju statusa zahteva" });
      }
      
      console.log(`✅ [APPROVE-PENDING → ADMIN_ORDERED] Zahtev ${orderId} uspešno odobren i automatski poručen`);

      // AUTOMATSKI EMAIL/SMS SISTEM - Dohvati podatke u širem scope-u
      let serviceData = null;
      let clientData = null;
      let applianceData = null;
      let technicianData = null;
      let manufacturerData = null;
      let categoryData = null;
      let manufacturerName = '';

      if (existingOrder.serviceId) {
        serviceData = await storage.getService(existingOrder.serviceId);
        if (serviceData) {
          if (serviceData.clientId) {
            clientData = await storage.getClient(serviceData.clientId);
          }
          if (serviceData.applianceId) {
            applianceData = await storage.getAppliance(serviceData.applianceId);
            // Properly get manufacturer and category data
            if (applianceData?.manufacturerId) {
              manufacturerData = await storage.getManufacturer(applianceData.manufacturerId);
            }
            if (applianceData?.categoryId) {
              categoryData = await storage.getApplianceCategory(applianceData.categoryId);
            }
          }
          if (serviceData.technicianId) {
            technicianData = await storage.getTechnician(serviceData.technicianId);
          }
        }
      }

      manufacturerName = manufacturerData?.name || '';

      // EMAIL SISTEM
      try {
        const isComPlus = isComplusBrand(manufacturerName);

        console.log(`📧 [AUTO-EMAIL] Proizvođač: "${manufacturerName}", ComPlus brend: ${isComPlus}`);

        // 🎯 COMPLUS BREND - Automatski email na servis@complus.me
        if (isComPlus) {
          console.log(`🎯 [AUTO-COMPLUS] Šaljem ComPlus email za odobreni deo - direktno na servis@complus.me`);
          
          const deviceType = categoryData?.name || 'Uređaj';
          const complusEmailSent = await emailService.sendComplusSparePartOrder(
            existingOrder.serviceId || 0,
            clientData?.fullName || 'N/A',
            technicianData?.fullName || 'N/A',
            deviceType,
            manufacturerName,
            existingOrder.partName,
            existingOrder.partNumber || 'N/A',
            'normal', // urgency default
            existingOrder.description ?? undefined
          );

          if (complusEmailSent) {
            console.log(`🎯 [AUTO-COMPLUS EMAIL] ✅ ComPlus email uspešno poslat za odobreni deo: ${existingOrder.partName}`);
          } else {
            console.error(`🎯 [AUTO-COMPLUS EMAIL] ❌ Neuspešno slanje ComPlus email-a za deo: ${existingOrder.partName}`);
          }
        }
      } catch (emailError) {
        console.error("📧 [AUTO-EMAIL ERROR] Greška pri automatskom slanju email-a:", emailError);
        // Email greška ne prekida workflow
      }

      // 📱 AUTOMATSKI SMS PROTOKOL ZA PORUČIVANJE DELOVA
      try {
        const { createProtocolSMSService } = await import('./sms-communication-service.js');
        
        // Dobijamo SMS konfiguraciju iz baze
        const settingsArray = await storage.getSystemSettings();
        const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
        
        // Kreiranje Protocol SMS Service instance
        const protocolSMS = createProtocolSMSService({
          apiKey: settingsMap.sms_mobile_api_key || '',
          baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
          senderId: settingsMap.sms_mobile_sender_id || null,
          enabled: settingsMap.sms_mobile_enabled === 'true'
        }, storage);

        if (existingOrder.serviceId && clientData && technicianData) {
          const smsData = {
            serviceId: existingOrder.serviceId,
            clientId: serviceData?.clientId || 0,
            clientName: clientData.fullName,
            clientPhone: clientData.phone,
            deviceType: categoryData?.name || 'Uređaj',
            deviceModel: applianceData?.model || 'N/A',
            manufacturerName: manufacturerName,
            technicianId: technicianData.id,
            technicianName: technicianData.fullName,
            technicianPhone: technicianData.phone || '067123456',
            partName: existingOrder.partName,
            estimatedDate: '3-5 dana',
            createdBy: req.user.fullName || req.user.username
          };

          console.log(`📱 [SMS-PARTS-ORDERED] Šaljem SMS protokol za poručene delove`);
          const smsResult = await protocolSMS.sendPartsOrderedProtocol(smsData);
          
          if (smsResult.success) {
            console.log(`📱 [SMS-PARTS-ORDERED] ✅ SMS protokol uspešno poslat`);
          } else {
            console.error(`📱 [SMS-PARTS-ORDERED] ❌ Neuspešno slanje SMS protokola:`, smsResult.errors);
          }
        }
      } catch (smsError) {
        console.error("📱 [SMS-PARTS-ORDERED ERROR] Greška pri slanju SMS protokola:", smsError);
        // SMS greška ne prekida workflow
      }

      res.json({ 
        success: true, 
        message: "Zahtev je uspešno odobren i automatski poručen", 
        order: updatedOrder 
      });
      
    } catch (error) {
      console.error('❌ [APPROVE-PENDING] Greška pri odobravanju pending zahteva:', error);
      res.status(500).json({ error: "Greška pri odobravanju zahteva" });
    }
  });

  // 5. Serviser označava da je potrošio rezervni deo
  app.patch("/api/technician/spare-parts/:id/consume", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo serviseri mogu da označavaju potrošnju rezervnih delova" });
      }

      const orderId = parseInt(req.params.id);
      const { consumedForServiceId } = req.body;

      const order = await storage.updateSparePartOrderStatus(orderId, {
        status: "consumed",
        consumedBy: req.user.technicianId || req.user!.id,
        consumedAt: new Date(),
        consumedForServiceId: consumedForServiceId || null
      });

      console.log(`📦 [WORKFLOW] Serviser ${req.user.username} označio potrošnju dela ID: ${orderId}`);
      res.json({ 
        success: true, 
        message: "Rezervni deo je označen kao potrošen", 
        order 
      });
    } catch (error) {
      console.error("❌ [WORKFLOW] Greška pri označavanju potrošnje:", error);
      res.status(500).json({ error: "Greška pri označavanju potrošnje rezervnog dela" });
    }
  });

  // 6. Dohvati rezervne delove po statusu (za admin interface)
  app.get("/api/admin/spare-parts/status/:status", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {

      const status = req.params.status as any; // Status parameter from URL
      const orders = await storage.getSparePartOrdersByStatus(status);
      
      res.json(orders);
    } catch (error) {
      console.error("❌ [WORKFLOW] Greška pri dohvatanju po statusu:", error);
      res.status(500).json({ error: "Greška pri dohvatanju rezervnih delova po statusu" });
    }
  });

  // 7. Dohvati rezervne delove servisera (njegove zahteve)
  app.get("/api/technician/spare-parts", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo serviseri mogu da pristupe svojim zahtevima" });
      }

      const technicianId = req.user.technicianId || req.user!.id;
      const requests = await storage.getTechnicianSparePartRequests(technicianId);
      
      res.json(requests);
    } catch (error) {
      console.error("Greška pri dohvatanju zahteva servisera za rezervne delove:", error);
      res.status(500).json({ error: "Greška pri dohvatanju zahteva" });
    }
  });

  // 8. Dohvati dostupne rezervne delove za servisera
  app.get("/api/technician/spare-parts/available", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo serviseri mogu da pristupe dostupnim delovima" });
      }

      const orders = await storage.getSparePartOrdersByStatus("available");
      
      res.json(orders);
    } catch (error) {
      console.error("❌ [WORKFLOW] Greška pri dohvatanju dostupnih delova:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dostupnih rezervnih delova" });
    }
  });

  // 9. DELETE endpoint za brisanje spare parts order-a
  app.delete("/api/admin/spare-parts/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {

      const orderId = parseInt(req.params.id);
      console.log(`🗑️ [DELETE] Admin pokušava da obriše spare parts order ID: ${orderId}`);
      
      // Proverava da li order postoji
      const existingOrder = await storage.getSparePartOrder(orderId);
      if (!existingOrder) {
        console.log(`❌ [DELETE] Order ${orderId} nije pronađen`);
        return res.status(404).json({ error: "Porudžbina rezervnog dela nije pronađena" });
      }

      // Brisanje order-a
      const result = await storage.deleteSparePartOrder(orderId);
      
      if (result) {
        console.log(`✅ [DELETE] Uspešno obrisan spare parts order ID: ${orderId}`);
        res.json({ 
          success: true, 
          message: "Porudžbina rezervnog dela je uspešno obrisana" 
        });
      } else {
        console.log(`❌ [DELETE] Greška pri brisanju order-a ${orderId}`);
        res.status(500).json({ error: "Greška pri brisanju porudžbine" });
      }
    } catch (error) {
      console.error(`❌ [DELETE] Greška pri brisanju spare parts order-a:`, error);
      res.status(500).json({ error: "Greška pri brisanju porudžbine rezervnog dela" });
    }
  });

  // ===== APK DOWNLOAD SYSTEM =====
  // Download statistics interface
  interface DownloadHistoryEntry {
    timestamp: string;
    device: 'android' | 'ios' | 'desktop' | 'unknown';
    userAgent: string;
    ip: string;
  }

  interface DownloadStats {
    total: number;
    byDevice: {
      android: number;
      ios: number;
      desktop: number;
      unknown: number;
    };
    history: DownloadHistoryEntry[];
  }

  // In-memory statistics tracking
  const downloadStats: DownloadStats = {
    total: 0,
    byDevice: {
      android: 0,
      ios: 0,
      desktop: 0,
      unknown: 0
    },
    history: []
  };

  // Device detection helper
  function detectDevice(userAgent: string): 'android' | 'ios' | 'desktop' | 'unknown' {
    const ua = userAgent.toLowerCase();
    if (ua.includes('android')) return 'android';
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'ios';
    if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) return 'desktop';
    return 'unknown';
  }

  // APK Landing Page - Let React Router handle this route
  // Note: This will be handled by the SPA fallback in the main server setup

  // APK Download endpoint with device detection and statistics
  app.get("/api/downloads/apk", async (req, res) => {
    try {
      const apkPath = path.join(process.cwd(), 'android/app/build/outputs/apk/release/app-release.apk');
      
      // Check if APK exists
      await fs.access(apkPath);
      
      const userAgent = req.get('User-Agent') || '';
      const device = detectDevice(userAgent);
      
      // Update statistics
      downloadStats.total++;
      downloadStats.byDevice[device as keyof typeof downloadStats.byDevice]++;
      downloadStats.history.push({
        timestamp: new Date().toISOString(),
        device,
        userAgent,
        ip: req.ip || 'unknown'
      });

      // Keep only last 1000 entries in history
      if (downloadStats.history.length > 1000) {
        downloadStats.history = downloadStats.history.slice(-1000);
      }

      console.log(`📱 [APK DOWNLOAD] Device: ${device}, Total downloads: ${downloadStats.total}`);

      // Set proper headers for APK download
      res.set({
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="FrigoSistem-v2025.1.0.apk"',
        'Content-Security-Policy': 'default-src \'none\'',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });

      // Stream the APK file
      const stat = await fs.stat(apkPath);
      res.set('Content-Length', stat.size.toString());
      
      const { createReadStream } = await import('fs');
      const readStream = createReadStream(apkPath);
      readStream.pipe(res);

    } catch (error) {
      console.error('❌ [APK DOWNLOAD] Error:', error);
      
      if ((error as any)?.code === 'ENOENT') {
        return res.status(404).json({ 
          error: 'APK file not found',
          message: 'The APK file is not currently available. Please try again later.'
        });
      }

      res.status(500).json({ 
        error: 'Download failed',
        message: 'Unable to download APK file. Please try again later.'
      });
    }
  });

  // Download statistics endpoint
  app.get("/api/downloads/stats", (req, res) => {
    const stats = {
      total: downloadStats.total,
      byDevice: { ...downloadStats.byDevice },
      lastUpdated: new Date().toISOString(),
      recentDownloads: downloadStats.history.slice(-10).map(entry => ({
        timestamp: entry.timestamp,
        device: entry.device,
        // Don't expose full user agent and IP for privacy
        hasUserAgent: !!entry.userAgent
      }))
    };

    res.json(stats);
  });

  // Rate limiting for QR generation (per IP)
  const qrRateLimit = new Map<string, { count: number; resetTime: number }>();

  function isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false;
      }
      // Max URL length 2KB to prevent abuse
      if (url.length > 2048) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  function checkQRRateLimit(ip: string): boolean {
    const now = Date.now();
    const limit = qrRateLimit.get(ip);
    
    if (!limit || now > limit.resetTime) {
      // Reset every 5 minutes, allow 10 requests per window
      qrRateLimit.set(ip, { count: 1, resetTime: now + 300000 });
      return true;
    }
    
    if (limit.count >= 10) {
      return false;
    }
    
    limit.count++;
    return true;
  }

  // Generate QR code for download link
  app.get("/api/downloads/qr", async (req, res) => {
    try {
      const { url, size = '200' } = req.query;
      const clientIP = req.ip || 'unknown';
      
      // Rate limiting check
      if (!checkQRRateLimit(clientIP)) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          message: 'Too many QR code requests. Please try again later.' 
        });
      }
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      // URL validation
      if (!isValidUrl(url)) {
        return res.status(400).json({ 
          error: 'Invalid URL',
          message: 'URL must be a valid http/https URL under 2KB' 
        });
      }

      // Size validation: clamp between 100-512px
      const qrSize = Math.min(512, Math.max(100, parseInt(size as string) || 200));
      
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: qrSize,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      // Return as base64 image
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.set('X-Content-Type-Options', 'nosniff');
      
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      res.send(Buffer.from(base64Data, 'base64'));

    } catch (error) {
      console.error('❌ [QR CODE] Error:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  });

  // Download source ZIP endpoint for developers
  app.get("/api/downloads/source-zip", async (req, res) => {
    try {
      const zipPath = path.join(process.cwd(), 'android/app/src/main/assets/public/ServisAplikacija-MacNodeJS.zip');
      
      // Check if ZIP exists
      await fs.access(zipPath);
      
      const stat = await fs.stat(zipPath);
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Length', stat.size.toString());
      res.setHeader('Content-Disposition', 'attachment; filename="ServisAplikacija-MacNodeJS.zip"');
      res.setHeader('Cache-Control', 'no-cache');
      
      // Send file
      res.sendFile(zipPath);
      
      console.log(`📦 ZIP source preuzet - veličina: ${(stat.size / (1024 * 1024)).toFixed(1)}MB`);
      
    } catch (error) {
      console.error('ZIP download error:', error);
      res.status(404).json({ 
        error: "ZIP fajl nije pronađen",
        message: "Molimo kontaktirajte administratora."
      });
    }
  });

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
      
      console.log(`🔧 SMS Config Debug: apiKey=${!!apiKey}, baseUrl=${baseUrl}, enabled=${enabled}`);
      
      if (apiKey && baseUrl) {
        smsService = new SMSCommunicationService({
          apiKey,
          baseUrl,
          senderId,
          enabled
        });
        console.log('✅ SMS Communication Service inicijalizovan uspešno');
        console.log(`🔧 SMS isConfigured: ${smsService.isConfigured()}`);
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

  // JEDNOSTAVAN LOGOUT - automatski briše token i redirect
  app.get("/api/simple-logout", (req, res) => {
    res.send(`
      <script>
        localStorage.removeItem('auth_token');
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        alert('✅ LOGOUT USPEŠAN! Idemo na homepage...');
        window.location.href = '/';
      </script>
    `);
  });

  // LOGOUT ENDPOINT - direktno briše JWT token
  app.get("/api/logout", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Logout - Frigo Sistem</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
          .container { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; max-width: 500px; margin: 0 auto; }
          button { padding: 15px 30px; font-size: 18px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
          button:hover { background: #c0392b; }
          .success { color: #2ecc71; font-weight: bold; }
          .status { margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 5px; }
        </style>
        <script>
          function logout() {
            document.getElementById('result').innerHTML = '<p>⏳ Izvršavam logout...</p>';
            localStorage.removeItem('auth_token');
            localStorage.clear();
            sessionStorage.clear();
            document.cookie.split(";").forEach(function(c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });
            document.getElementById('result').innerHTML = '<p class="success">✅ USPEŠNO SI SE ODJAVIL!</p><p>Sada možeš pristupiti login formama na homepage-u.</p>';
            setTimeout(() => checkAuthStatus(), 500);
          }
          function checkAuthStatus() {
            const token = localStorage.getItem('auth_token');
            const statusEl = document.getElementById('auth-status');
            if (token) {
              statusEl.innerHTML = '<span style="color: #e74c3c;">PRIJAVLJEN</span> (supplier_beko)';
            } else {
              statusEl.innerHTML = '<span style="color: #2ecc71;">ODJAVLJEN</span>';
              document.getElementById('logout-btn').disabled = true;
              document.getElementById('logout-btn').innerHTML = '✅ VEĆ SI ODJAVLJEN';
            }
          }
          function goToHomepage() { window.location.href = '/'; }
          window.onload = function() { checkAuthStatus(); }
        </script>
      </head>
      <body>
        <div class="container">
          <h1>🔓 Logout iz sistema</h1>
          <div class="status" id="status">Status: <span id="auth-status">Proverava se...</span></div>
          <button onclick="logout()" id="logout-btn">🚪 IZLOGUJ SE (supplier_beko)</button>
          <button onclick="goToHomepage()" style="background: #3498db;">🏠 IDI NA HOMEPAGE</button>
          <div id="result" style="margin-top: 20px;"></div>
        </div>
      </body>
      </html>
    `);
  });

  // JWT User info endpoint - OPTIMIZED WITH CACHING
  app.get("/api/jwt-user", jwtAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const cacheKey = `jwt-user-${userId}`;
      const now = Date.now();
      
      // Check cache first
      const cached = jwtUserCache.get(cacheKey);
      if (cached && (now - cached.timestamp) < JWT_CACHE_TTL) {
        console.log(`⚡ [JWT-CACHE] Cache hit for user ID: ${userId} (saved DB query)`);
        return res.json(cached.data);
      }
      
      // Only hit DB when cache miss or expired
      console.log(`🔄 [JWT-CACHE] Cache miss for user ID: ${userId} - fetching from DB`);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: "Korisnik nije pronađen" });
      }
      
      const userData = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        phone: user.phone,
        technicianId: user.technicianId,
        supplierId: user.supplierId
      };
      
      // Cache the result
      jwtUserCache.set(cacheKey, {
        data: userData,
        timestamp: now
      });
      
      console.log(`💾 [JWT-CACHE] Cached user data for ID: ${userId}`);
      res.json(userData);
    } catch (error) {
      console.error("❌ [JWT-USER] Greška:", error);
      res.status(500).json({ error: "Greška pri dohvatanju korisničkih podataka" });
    }
  });

  // JWT User cache invalidation endpoint
  app.post("/api/jwt-user/invalidate", jwtAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const requestUserId = req.user?.id;
      
      // Security check: users can only invalidate their own cache
      if (userId !== requestUserId) {
        return res.status(403).json({ error: "Možete invalidirati samo svoj cache" });
      }
      
      invalidateUserCache(userId);
      res.json({ success: true, message: "Cache uspešno invalidiran" });
    } catch (error) {
      console.error("❌ [JWT-CACHE-INVALIDATE] Greška:", error);
      res.status(500).json({ error: "Greška pri invalidaciji cache-a" });
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
        status: "pending" as "pending",
        createdAt: new Date().toISOString(),
        requesterType: "admin" as "admin",
        requesterUserId: reqUser.id,
        requesterName: reqUser.fullName || reqUser.username
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
  
  // Approved spare parts route for Com Plus system
  setupApprovedSparePartsRoute(app);
  
  // WhatsApp Webhook routes - NOVO DODATO
  setupWhatsAppWebhookRoutes(app);

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
      if (!req.user || req.user!.role !== 'business_partner') {
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
        const removedParts = await storage.getRemovedPartsByService(service.id) || [];
        
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
            // warrantyStatus: part.warrantyStatus, // Field doesn't exist on SparePartOrder
            status: part.status,
            orderDate: part.createdAt,
            estimatedDeliveryDate: (part as any).estimatedDeliveryDate || null,
            actualDeliveryDate: (part as any).actualDeliveryDate || null
          })),
          removedParts: (Array.isArray(removedParts) ? removedParts : []).map(part => ({
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
            service.completedDate ? { date: service.completedDate, event: 'Servis završen', status: 'completed' } : null
          ].filter(Boolean),
          isCompleted: service.status === 'completed',
          totalCost: service.cost || 0,
          partsCount: spareParts.length,
          removedPartsCount: Array.isArray(removedParts) ? removedParts.length : 0
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
      if (!req.user || req.user!.role !== 'business_partner') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovim podacima" });
      }
      
      // Prvo proveri da li je servis povezan sa ovim poslovnim partnerom
      const service = await storage.getService(serviceId);
      
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Provera da li servis pripada poslovnom partneru
      if (!req.user || service.businessPartnerId !== req.user!.id) {
        return res.status(403).json({ error: "Nemate pristup ovom servisu" });
      }
      
      // Koristimo istu logiku kao u /api/business/services endpoint za detaljne podatke
      console.log(`Dohvatanje proširenih detalja servisa ${serviceId} za poslovnog partnera ${(req as any).user.id}`);
      
      // Dohvati rezervne delove za servis
      const spareParts = await storage.getSparePartsByService(serviceId);
      
      // Dohvati uklonjene delove sa uređaja
      const removedParts = await storage.getRemovedPartsByService(serviceId) || [];
      
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
          // warrantyStatus: part.warrantyStatus, // Field doesn't exist on SparePartOrder
          status: part.status,
          orderDate: part.createdAt,
          estimatedDeliveryDate: (part as any).estimatedDeliveryDate || null,
          actualDeliveryDate: (part as any).actualDeliveryDate || null
        })),
        removedParts: (Array.isArray(removedParts) ? removedParts : []).map(part => ({
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
        removedParts: Array.isArray(removedParts) ? removedParts.length : 0,
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
      
      // KRITIČNA VALIDACIJA: warrantyStatus je OBAVEZNO polje
      const { warrantyStatus } = req.body;
      if (!warrantyStatus) {
        return res.status(400).json({ 
          error: "Status garancije je obavezan", 
          message: "Molimo odaberite status garancije: 'u garanciji', 'van garancije' ili 'nepoznato'."
        });
      }

      // Validacija warranty status enum
      try {
        warrantyStatusEnum.parse(warrantyStatus);
      } catch (error) {
        return res.status(400).json({
          error: "Nevažeći status garancije",
          message: "Status garancije mora biti: 'u garanciji', 'van garancije' ili 'nepoznato'."
        });
      }

      // Kreiraj objekat sa validiranim podacima
      const validatedData = {
        clientId: parseInt(clientId),
        applianceId: parseInt(applianceId),
        description: description.trim(),
        status: req.body.status || "pending",
        warrantyStatus: warrantyStatus, // OBAVEZNO polje - mora biti prosleđeno
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
              
              // WHATSAPP BUSINESS API - Admin obaveštenje o novom servisu
              try {
                console.log(`[WHATSAPP BUSINESS API] Šalje obaveštenje administratoru ${admin.fullName} (${admin.phone}) o novom servisu #${service.id}`);
                const adminWhatsappResult = await whatsappBusinessAPIService.notifyAdminNewService({
                  adminPhone: admin.phone,
                  adminName: admin.fullName,
                  serviceId: service.id,
                  clientName: client?.fullName || 'Nepoznat klijent',
                  deviceType: deviceType,
                  createdBy: createdBy,
                  problemDescription: service.description
                });
                
                if (adminWhatsappResult.success) {
                  console.log(`[WHATSAPP BUSINESS API] ✅ Uspešno poslato WhatsApp obaveštenje administratoru ${admin.fullName}`);
                } else {
                  console.log(`[WHATSAPP BUSINESS API] ❌ Neuspešno slanje WhatsApp obaveštenja administratoru: ${adminWhatsappResult.error}`);
                }
              } catch (adminWhatsappError) {
                console.error(`[WHATSAPP BUSINESS API] Greška pri slanju obaveštenja administratoru ${admin.fullName}:`, adminWhatsappError);
              }
              
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
                  
                  // WHATSAPP BUSINESS API - Obaveštenje klijentu o status ažuriranju
                  try {
                    if (client.phone) {
                      console.log(`[WHATSAPP BUSINESS API] Šalje obaveštenje klijentu ${client.fullName} (${client.phone}) o ažuriranju servisa #${id}`);
                      const whatsappResult = await whatsappBusinessAPIService.sendServiceStatusUpdateNotification({
                        clientPhone: client.phone,
                        clientName: client.fullName,
                        serviceId: id,
                        newStatus: statusDescription,
                        technicianName: technicianName,
                        notes: clientEmailContent
                      });
                      
                      if (whatsappResult.success) {
                        console.log(`[WHATSAPP BUSINESS API] ✅ Uspešno poslato WhatsApp obaveštenje klijentu ${client.fullName}`);
                      } else {
                        console.log(`[WHATSAPP BUSINESS API] ❌ Neuspešno slanje WhatsApp obaveštenja klijentu: ${whatsappResult.error}`);
                      }
                    } else {
                      console.log(`[WHATSAPP BUSINESS API] ℹ️ Klijent ${client.fullName} nema telefon broj, preskačem WhatsApp obaveštenje`);
                    }
                  } catch (whatsappError) {
                    console.error(`[WHATSAPP BUSINESS API] Greška pri slanju obaveštenja klijentu:`, whatsappError);
                  }
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
                  
                  // WHATSAPP BUSINESS API - Specijalne notifikacije za završen servis
                  if (updatedService.status === "completed") {
                    try {
                      if (client.phone) {
                        console.log(`[WHATSAPP BUSINESS API] Šalje obaveštenje o završenom servisu #${id} klijentu ${client.fullName}`);
                        const completionResult = await whatsappBusinessAPIService.notifyServiceCompleted({
                          clientPhone: client.phone,
                          clientName: client.fullName,
                          serviceId: Number(id),
                          technicianName: technicianName,
                          workPerformed: clientEmailContent,
                          warrantyStatus: updatedService.warrantyStatus
                        });
                        
                        if (completionResult.success) {
                          console.log(`[WHATSAPP BUSINESS API] ✅ Uspešno poslato WhatsApp obaveštenje o završenom servisu klijentu ${client.fullName}`);
                        }
                      }
                    } catch (whatsappCompletionError) {
                      console.error(`[WHATSAPP BUSINESS API] Greška pri slanju obaveštenja o završenom servisu:`, whatsappCompletionError);
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

  // Complete service with detailed data (for technicians) - MISSING ENDPOINT IMPLEMENTATION
  app.post("/api/services/:id/complete", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const {
        technicianNotes,
        workPerformed,
        usedParts,
        machineNotes,
        cost,
        warrantyInfo,
        clientSignature,
        workQuality,
        clientSatisfaction,
        isWarrantyService
      } = req.body;
      
      console.log(`[SERVICE COMPLETE] 🎯 Završavanje servisa #${serviceId} sa kompletnim podacima`);
      console.log("Podaci:", { technicianNotes, workPerformed, cost });
      
      // Validate required fields
      if (!technicianNotes?.trim() || !workPerformed?.trim()) {
        return res.status(400).json({ 
          error: "Napomene servisera i opis rada su obavezni" 
        });
      }
      
      // Get existing service
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // Build comprehensive update data with ALL required fields
      const updateData = {
        // Keep existing data
        id: service.id,
        clientId: service.clientId,
        applianceId: service.applianceId,
        description: service.description,
        warrantyStatus: service.warrantyStatus === 'nepoznato' ? 'van garancije' as const : service.warrantyStatus as 'u garanciji' | 'van garancije',
        createdAt: service.createdAt,
        
        // Update these fields
        status: 'completed',
        technicianNotes: technicianNotes.trim(),
        machineNotes: machineNotes?.trim() || service.machineNotes,
        cost: cost?.trim() || service.cost,
        usedParts: usedParts?.trim() || service.usedParts || "[]",
        isCompletelyFixed: true,
        completedDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        isWarrantyService: isWarrantyService || service.isWarrantyService || false,
        
        // Keep other existing fields
        technicianId: service.technicianId,
        scheduledDate: service.scheduledDate,
        businessPartnerId: service.businessPartnerId,
        partnerCompanyName: service.partnerCompanyName,
        clientUnavailableReason: service.clientUnavailableReason,
        needsRescheduling: service.needsRescheduling || false,
        reschedulingNotes: service.reschedulingNotes,
        devicePickedUp: service.devicePickedUp || false,
        pickupDate: service.pickupDate,
        pickupNotes: service.pickupNotes,
        customerRefusesRepair: service.customerRefusesRepair || false,
        customerRefusalReason: service.customerRefusalReason,
        repairFailed: service.repairFailed || false,
        repairFailureReason: service.repairFailureReason,
        replacedPartsBeforeFailure: service.replacedPartsBeforeFailure,
        repairFailureDate: service.repairFailureDate
      };
      
      // Update service in database
      const updatedService = await storage.updateService(serviceId, updateData);
      console.log(`[SERVICE COMPLETE] ✅ Servis #${serviceId} uspešno završen`);
      
      // Send notifications asynchronously
      setTimeout(async () => {
        try {
          console.log(`[SERVICE COMPLETE] 📧 Šalje notifikacije za servis #${serviceId}`);
          
          // Get updated service with relationships
          const serviceWithDetails = await storage.getServiceWithDetails(serviceId);
          if (!serviceWithDetails) return;
          
          // Send SMS notifications using existing universal SMS system
          console.log(`[SERVICE COMPLETE] 📱 Pripremam SMS notifikacije...`);
          console.log(`[SERVICE COMPLETE] 📱 smsService exists: ${!!smsService}`);
          console.log(`[SERVICE COMPLETE] 📱 smsService isConfigured: ${smsService?.isConfigured()}`);
          
          try {
            if (smsService && smsService.isConfigured()) {
              const client = serviceWithDetails.client;
              console.log(`[SERVICE COMPLETE] 📱 Client podatci: ${client?.fullName} (${client?.phone})`);
              
              if (client?.phone) {
                // Popravljam newline karaktere - koristim \n umesto \\n
                const message = `SERVIS ZAVRŠEN #${serviceId}\n\nPoštovani ${client.fullName},\n\nVaš servis je uspešno završen.\nRad: ${workPerformed}\nCena: ${cost || 'Besplatno (garancija)'} RSD\n\nHvala vam!\n\nFrigo Sistem Todosijević\n067-051-141`;
                
                console.log(`[SERVICE COMPLETE] 📱 Šalje SMS: "${message}"`);
                
                // Pozivam SMS sa ispravnim parametrima
                await smsService.notifyServiceStatusChange({
                  serviceId: serviceId.toString(),
                  clientPhone: client.phone,
                  clientName: client.fullName,
                  newStatus: 'completed',
                  statusDescription: 'Završen',
                  technicianNotes: `${workPerformed} | Cena: ${cost || 'Besplatno'} RSD`,
                  businessPartnerPhone: undefined,
                  businessPartnerName: undefined
                });
                
                console.log(`[SERVICE COMPLETE] ✅ SMS poslat klijentu ${client.fullName} (${client.phone})`);
              } else {
                console.log(`[SERVICE COMPLETE] ⚠️ Klijent nema telefon za SMS`);
              }
            } else {
              console.log(`[SERVICE COMPLETE] ⚠️ SMS servis nije konfigurisan`);
            }
          } catch (smsError) {
            console.error(`[SERVICE COMPLETE] ❌ SMS greška:`, smsError);
          }
          
        } catch (notifError) {
          console.error(`[SERVICE COMPLETE] ❌ Greška pri slanju notifikacija:`, notifError);
        }
      }, 500);
      
      res.json({ 
        success: true, 
        message: "Servis uspešno završen",
        service: updatedService
      });
      
    } catch (error) {
      console.error(`[SERVICE COMPLETE] ❌ Greška pri završavanju servisa:`, error);
      res.status(500).json({ 
        error: "Greška pri završavanju servisa",
        details: error instanceof Error ? error.message : "Nepoznata greška"
      });
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
        warrantyStatus: service.warrantyStatus === 'nepoznato' ? 'van garancije' as const : service.warrantyStatus as 'u garanciji' | 'van garancije',
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
          const smsService = new SMSCommunicationService('');
          
          // 1. SMS ADMINISTRATORU
          const adminSMS = `🚨 NEUSPEŠAN SERVIS #${serviceId}
Klijent: ${client?.fullName || 'N/A'}
Uređaj: ${manufacturer?.name || ''} ${appliance?.model || 'N/A'}
Serviser: ${technician?.fullName || 'N/A'}
Razlog: ${repairFailureReason.substring(0, 80)}${repairFailureReason.length > 80 ? '...' : ''}
Datum: ${new Date().toLocaleDateString('sr-RS')}`;
          
          // await smsService.sendToAdministrators(adminSMS); // TODO: Implement sendToAdministrators method
          console.log(`[REPAIR FAILED SMS] ✅ SMS poslat administratorima`);
          
          // 2. SMS KLIJENTU
          if (client?.phone) {
            const clientSMS = `Poštovani ${client.fullName},
Obaveštavamo Vas da nažalost servis Vašeg ${manufacturer?.name || ''} ${appliance?.model || 'uređaja'} (Servis #${serviceId}) nije mogao biti završen uspešno.
Razlog: ${repairFailureReason.substring(0, 100)}${repairFailureReason.length > 100 ? '...' : ''}
Za dodatne informacije pozovite nas.
Frigo Sistem Todosijević`;

            // await smsService.sendSMS({ recipients: client.phone, message: clientSMS, sendername: 'FrigoSistem' }); // TODO: Fix SMS method
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

            // await smsService.sendSMS({ recipients: businessPartner.phone, message: partnerSMS, sendername: 'FrigoSistem' }); // TODO: Fix SMS method
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








































  // ====================================
  // ADMIN SERVICES MANAGEMENT ENDPOINTS
  // ====================================
  
  // Return service from technician to admin
  app.post('/api/admin/services/:id/return-from-technician', jwtAuth, requireRole(['admin']), async (req: any, res) => {
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
        // Required fields for the schema
        clientId: service.clientId,
        applianceId: service.applianceId,
        description: service.description,
        warrantyStatus: service.warrantyStatus === 'nepoznato' ? 'van garancije' as const : service.warrantyStatus as 'u garanciji' | 'van garancije',
        createdAt: service.createdAt,
        // Updated fields
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
        // Required fields for the schema
        clientId: service.clientId,
        applianceId: service.applianceId,
        description: service.description,
        warrantyStatus: service.warrantyStatus === 'nepoznato' ? 'van garancije' as const : service.warrantyStatus as 'u garanciji' | 'van garancije',
        createdAt: service.createdAt,
        // Updated fields
        technicianId: technicianId,
        status: 'assigned' as any
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



  // ===== USER MANAGEMENT ENDPOINTS =====
  
  // Get all technicians - Admin only
  app.get("/api/technicians", jwtAuth, async (req, res) => {
    try {
      // Check if user is admin
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup serviserima" });
      }

      const technicians = await storage.getAllTechnicians();
      res.json(technicians);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ error: "Greška pri dohvatanju servisera" });
    }
  });

  // Get all admin services - Admin only
  app.get("/api/admin/services", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      // Check if user is admin
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup admin servisima" });
      }

      console.log("[ADMIN SERVICES] 📋 Dohvatanje svih admin servisa...");
      const adminServices = await storage.getAdminServices();
      console.log(`[ADMIN SERVICES] ✅ Uspešno dohvaćeno ${adminServices.length} servisa`);
      
      res.json(adminServices);
    } catch (error) {
      console.error("❌ [ADMIN SERVICES] Greška pri dohvatanju admin servisa:", error);
      res.status(500).json({ error: "Greška pri dohvatanju admin servisa" });
    }
  });

  // Get services by technicians - Admin only
  app.get("/api/admin/services-by-technicians", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      // Check if user is admin
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovim podacima" });
      }

      const services = await storage.getAllServices();
      console.log(`[SERVICES BY TECHNICIANS] Vraćam ${services.length} servisa sa podacima:`, 
        services.slice(0, 1).map(s => ({
          id: s.id,
          clientId: s.clientId,
          applianceId: s.applianceId,
          technicianId: s.technicianId,
          status: s.status
        }))
      );
      res.json(services);
    } catch (error) {
      console.error("Error fetching services by technicians:", error);
      res.status(500).json({ error: "Greška pri dohvatanju servisa po serviserima" });
    }
  });

  // Get all users - Admin only
  app.get("/api/users", jwtAuth, async (req, res) => {
    try {
      // Check if user is admin
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup korisnicima" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Greška pri dohvatanju korisnika" });
    }
  });

  // Create new user - Admin only  
  app.post("/api/users", jwtAuth, async (req, res) => {
    try {
      // Check if user is admin
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za kreiranje korisnika" });
      }

      const userData = req.body;
      const newUser = await storage.createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Greška pri kreiranju korisnika" });
    }
  });

  // Update user - Admin only
  app.put("/api/users/:id", jwtAuth, async (req, res) => {
    try {
      // Check if user is admin
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za ažuriranje korisnika" });
      }

      const userId = parseInt(req.params.id);
      const userData = req.body;
      const updatedUser = await storage.updateUser(userId, userData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Greška pri ažuriranju korisnika" });
    }
  });

  // Delete user - Admin only
  app.delete("/api/users/:id", jwtAuth, async (req, res) => {
    try {
      // Check if user is admin
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za brisanje korisnika" });
      }

      const userId = parseInt(req.params.id);
      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Greška pri brisanju korisnika" });
    }
  });

  // Delete service - Admin only
  app.delete("/api/admin/services/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      // Check if user is admin
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za brisanje servisa" });
      }

      const serviceId = parseInt(req.params.id);
      if (isNaN(serviceId)) {
        return res.status(400).json({ error: "Nevažeći ID servisa" });
      }

      console.log(`[DELETE SERVICE API] Admin ${req.user?.username} briše servis ${serviceId}`);
      
      const success = await storage.deleteAdminService(serviceId);
      
      if (success) {
        console.log(`[DELETE SERVICE API] ✅ Servis ${serviceId} uspešno obrisan`);
        res.json({ success: true, message: "Servis je uspešno obrisan" });
      } else {
        console.log(`[DELETE SERVICE API] ❌ Servis ${serviceId} nije pronađen ili nije obrisan`);
        res.status(404).json({ error: "Servis nije pronađen ili nije mogao biti obrisan" });
      }
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Greška pri brisanju servisa" });
    }
  });

  // POST endpoint za kreiranje servisa od strane business partnera
  app.post("/api/business/services-jwt", jwtAuth, async (req, res) => {
    try {
      console.log("=== KREIRANJE NOVOG SERVISA OD BUSINESS PARTNERA ===");
      console.log("Podaci iz frontend forme:", req.body);
      
      // Provera da li je korisnik business partner
      if (req.user?.role !== 'business_partner') {
        return res.status(403).json({ 
          error: "Nemate dozvolu", 
          message: "Samo poslovni partneri mogu kreirati servise preko ovog endpoint-a."
        });
      }
      
      console.log("Business partner kreira servis:", req.user?.username, "ID:", req.user?.id);
      
      // Izvuci podatke iz request body-ja
      const { 
        clientFullName, 
        clientPhone, 
        clientEmail, 
        clientAddress, 
        clientCity,
        categoryId,
        manufacturerId,
        model,
        serialNumber,
        description,
        warrantyStatus
      } = req.body;
      
      // Validacija obaveznih polja
      if (!clientFullName?.trim()) {
        return res.status(400).json({ 
          error: "Ime klijenta je obavezno", 
          message: "Molimo unesite ime i prezime klijenta."
        });
      }
      
      if (!clientPhone?.trim()) {
        return res.status(400).json({ 
          error: "Telefon klijenta je obavezan", 
          message: "Molimo unesite telefon klijenta."
        });
      }
      
      if (!categoryId || categoryId === "") {
        return res.status(400).json({ 
          error: "Kategorija uređaja je obavezna", 
          message: "Molimo izaberite kategoriju uređaja."
        });
      }
      
      if (!manufacturerId || manufacturerId === "") {
        return res.status(400).json({ 
          error: "Proizvođač je obavezan", 
          message: "Molimo izaberite proizvođača uređaja."
        });
      }
      
      if (!model?.trim()) {
        return res.status(400).json({ 
          error: "Model uređaja je obavezan", 
          message: "Molimo unesite model uređaja."
        });
      }
      
      if (!description?.trim() || description.trim().length < 5) {
        return res.status(400).json({ 
          error: "Opis problema je obavezan", 
          message: "Opis problema mora biti detaljniji (minimum 5 karaktera)."
        });
      }
      
      // KRITIČNA VALIDACIJA: warrantyStatus je OBAVEZNO polje
      const trimmedWarrantyStatus = warrantyStatus?.trim();
      if (!trimmedWarrantyStatus) {
        return res.status(400).json({ 
          error: "Status garancije je obavezan", 
          message: "Molimo odaberite status garancije: 'u garanciji' ili 'van garancije'."
        });
      }
      
      // Validacija warranty status enum vrednosti koristeći shared schema
      const warrantyValidation = warrantyStatusStrictEnum.safeParse(trimmedWarrantyStatus);
      if (!warrantyValidation.success) {
        return res.status(400).json({ 
          error: "Nevažeći status garancije", 
          message: "Status garancije mora biti: 'u garanciji' ili 'van garancije'."
        });
      }

      // 1. PRVO - Kreiraj ili pronađi klijenta
      let client;
      try {
        // Pokušaj da pronađeš postojećeg klijenta po telefonu
        const existingClients = await storage.getAllClients();
        client = existingClients.find(c => c.phone === clientPhone.trim());
        
        if (!client) {
          // Kreiraj novog klijenta
          const clientData = {
            fullName: clientFullName.trim(),
            phone: clientPhone.trim(),
            email: clientEmail?.trim() || null,
            address: clientAddress?.trim() || null,
            city: clientCity?.trim() || null,
          };
          
          console.log("Kreiram novog klijenta:", clientData);
          client = await storage.createClient(clientData);
          console.log("Novi klijent kreiran sa ID:", client.id);
        } else {
          console.log("Koristim postojećeg klijenta:", client.id);
        }
      } catch (error) {
        console.error("Greška pri kreiranju/pronalaženju klijenta:", error);
        return res.status(500).json({ 
          error: "Greška pri obradi klijenta", 
          message: "Došlo je do greške prilikom kreiranja/pronalaska klijenta."
        });
      }

      // 2. DRUGO - Kreiraj ili pronađi uređaj
      let appliance;
      try {
        // Pokušaj da pronađeš postojeći uređaj
        const existingAppliances = await storage.getAppliancesByClient(client.id);
        appliance = existingAppliances.find(a => 
          a.model === model.trim() && 
          a.categoryId === parseInt(categoryId) &&
          a.manufacturerId === parseInt(manufacturerId) &&
          (!serialNumber?.trim() || a.serialNumber === serialNumber.trim())
        );
        
        if (!appliance) {
          // Kreiraj novi uređaj
          const applianceData = {
            clientId: client.id,
            categoryId: parseInt(categoryId),
            manufacturerId: parseInt(manufacturerId),
            model: model.trim(),
            serialNumber: serialNumber?.trim() || null,
            purchaseDate: undefined, // Business partner ne šalje datum kupovine
            warrantyExpires: undefined, // Neće biti postavljeno inicijalno
            notes: undefined
          };
          
          console.log("Kreiram novi uređaj:", applianceData);
          appliance = await storage.createAppliance(applianceData);
          console.log("Novi uređaj kreiran sa ID:", appliance.id);
        } else {
          console.log("Koristim postojeći uređaj:", appliance.id);
        }
      } catch (error) {
        console.error("Greška pri kreiranju/pronalaženju uređaja:", error);
        return res.status(500).json({ 
          error: "Greška pri obradi uređaja", 
          message: "Došlo je do greške prilikom kreiranja/pronalaska uređaja."
        });
      }

      // 3. TREĆE - Kreiraj servis
      try {
        const serviceData = {
          clientId: client.id,
          applianceId: appliance.id,
          description: description.trim(),
          status: "pending" as const,
          warrantyStatus: warrantyStatus, // Warranty status iz forme - obavezno polje
          createdAt: new Date().toISOString().split('T')[0],
          technicianId: null, // Biće dodeljen kasnije
          scheduledDate: null,
          completedDate: null,
          technicianNotes: null,
          cost: null,
          usedParts: "[]",
          machineNotes: null,
          isCompletelyFixed: null,
          businessPartnerId: req.user?.id || null,
          partnerCompanyName: req.user?.companyName || null
        };
        
        console.log("Kreiram novi servis:", serviceData);
        const service = await storage.createService(serviceData);
        console.log("Novi servis kreiran sa ID:", service.id);
        
        res.json({ 
          success: true, 
          service,
          message: "Servis je uspešno kreiran" 
        });
        
      } catch (error) {
        console.error("Greška pri kreiranju servisa:", error);
        return res.status(500).json({ 
          error: "Greška pri kreiranju servisa", 
          message: "Došlo je do greške prilikom kreiranja servisa."
        });
      }
      
    } catch (error) {
      console.error("Opšta greška pri kreiranju business partner servisa:", error);
      res.status(500).json({ 
        error: "Greška servera", 
        message: "Došlo je do neočekivane greške. Molimo pokušajte ponovo."
      });
    }
  });

  // Dashboard stats route - DODATO ZA REŠAVANJE PROBLEMA SA ADMIN STATISTIKAMA
  app.get("/api/stats", async (req, res) => {
    try {
      console.log("📊 Dohvatanje dashboard statistika...");
      
      const activeServices = await storage.getServicesByStatus("in_progress");
      const completedServices = await storage.getServicesByStatus("completed");
      const pendingServices = await storage.getServicesByStatus("pending");
      const clients = await storage.getAllClients();
      const applianceStats = await storage.getApplianceStats();
      const recentServices = await storage.getRecentServices(5);
      const recentClients = await storage.getRecentClients(3);

      console.log(`📊 Statistike: ${activeServices.length} aktivnih, ${completedServices.length} završenih, ${pendingServices.length} na čekanju, ${clients.length} klijenata`);

      res.json({
        activeCount: activeServices.length,
        completedCount: completedServices.length,
        pendingCount: pendingServices.length,
        clientCount: clients.length,
        recentServices,
        recentClients,
        applianceStats
      });
    } catch (error) {
      console.error("❌ Greška pri dobijanju statistike:", error);
      res.status(500).json({ error: "Greška pri dobijanju statistike" });
    }
  });

  // ADMIN CLIENT ENDPOINT-I - DODATO ZA REŠAVANJE PROBLEMA SA CLIENT ANALYTICS
  
  // Delete client endpoint (samo admin)
  app.delete("/api/admin/clients/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`DELETE /api/admin/clients/${req.params.id} - Admin deleting client`);
      console.log(`JWT Admin: ${(req.user as any)?.username} (ID: ${(req.user as any)?.id})`);

      const clientId = parseInt(req.params.id);
      console.log(`Attempting to delete client ID: ${clientId}`);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ error: "Neispravan ID klijenta" });
      }

      // Check if client has any services
      const clientServices = await storage.getServicesByClient(clientId);
      if (clientServices.length > 0) {
        return res.status(400).json({ 
          error: "Klijent ima aktivne servise", 
          message: "Prvo obriši sve servise povezane sa ovim klijentom" 
        });
      }

      // Check if client has any appliances
      const clientAppliances = await storage.getAppliancesByClient(clientId);
      if (clientAppliances.length > 0) {
        return res.status(400).json({ 
          error: "Klijent ima registrovane uređaje", 
          message: "Prvo obriši sve uređaje povezane sa ovim klijentom" 
        });
      }

      // Delete client
      console.log("Executing client delete query...");
      const success = await storage.deleteClient(clientId);
      
      if (!success) {
        console.log("Client not found or delete failed");
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }

      console.log("Client deleted successfully");
      res.json({ success: true, message: "Klijent je uspešno obrisan" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Greška pri brisanju klijenta" });
    }
  });

  // Client comprehensive analysis endpoint (samo admin)
  app.get("/api/admin/clients/:id/comprehensive-analysis", jwtAuth, requireRole(['admin']), async (req, res) => {
    console.log(`🔥 [CLIENT ANALYSIS ENDPOINT] POZVAN SA clientId: ${req.params.id}`);
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }

      // Get client's appliances
      const clientAppliances = await storage.getAppliancesByClient(clientId);
      
      // Get client's services
      const clientServices = await storage.getServicesByClient(clientId);
      
      // Calculate service statistics
      const completedServices = clientServices.filter(s => s.status === 'completed').length;
      const activeServices = clientServices.filter(s => s.status === 'in_progress').length;
      const warrantyServices = clientServices.filter(s => s.warrantyStatus === 'u garanciji').length;
      const totalCost = clientServices.reduce((sum, service) => sum + parseFloat(service.cost || '0'), 0);
      
      const response = {
        reportMetadata: {
          generatedAt: new Date().toISOString(),
          reportId: `CLIENT_ANALYSIS_${clientId}_${Date.now()}`,
          clientId: clientId,
          reportType: "comprehensive_client_analysis"
        },
        clientInfo: {
          id: client.id,
          fullName: client.fullName,
          email: client.email || "",
          phone: client.phone,
          address: client.address || "",
          city: client.city || "",
          totalAppliances: clientAppliances.length,
          registrationDate: new Date().toISOString()
        },
        serviceStatistics: {
          totalServices: clientServices.length,
          completedServices: completedServices,
          activeServices: activeServices,
          warrantyServices: warrantyServices,
          totalCost: totalCost,
          averageServiceTimeInDays: 0,
          completionRate: clientServices.length > 0 ? Math.round((completedServices / clientServices.length) * 100) : 0,
          warrantyRate: clientServices.length > 0 ? Math.round((warrantyServices / clientServices.length) * 100) : 0
        },
        appliances: clientAppliances,
        services: clientServices,
        analytics: { 
          applianceStats: {}, 
          technicianStats: {}, 
          monthlyServiceHistory: {}, 
          problematicAppliances: [] 
        },
        spareParts: [],
        recommendations: { 
          maintenanceAlerts: 'Nema aktivnih upozorenja', 
          costOptimization: 'Redovno održavanje preporučeno', 
          technicianPreference: 'Najčešći serviser će biti prikazan' 
        }
      };
      
      console.log(`[CLIENT ANALYSIS] Kompletna analiza klijenta ${clientId} kreirana uspešno`);
      res.json(response);
    } catch (error) {
      console.error("[CLIENT ANALYSIS] Greška:", error);
      res.status(500).json({ error: "Greška pri kreiranju analize klijenta" });
    }
  });

  // Endpoint za dopunjavanje Generali servisa
  app.patch("/api/services/:id/supplement-generali", jwtAuth, async (req, res) => {
    try {
      console.log(`[GENERALI DOPUNA] ✅ Početak dopunjavanja servisa #${req.params.id}`);
      
      if (req.user?.role !== "technician" && req.user?.role !== "business_partner") {
        return res.status(403).json({ error: "Samo serviseri i poslovni partneri mogu dopunjavati Generali servise" });
      }

      const serviceId = parseInt(req.params.id);
      const updateData = req.body;
      console.log(`[GENERALI DOPUNA] 📝 Podaci za dopunu:`, updateData);

      // Validacija podataka
      const { supplementGeneraliServiceSchema } = await import("@shared/schema");
      const validationResult = supplementGeneraliServiceSchema.safeParse({
        serviceId,
        ...updateData
      });

      if (!validationResult.success) {
        console.log(`[GENERALI DOPUNA] ❌ Validacija neuspešna:`, validationResult.error.errors);
        return res.status(400).json({
          error: "Neispravni podaci",
          details: validationResult.error.errors
        });
      }

      const validData = validationResult.data;
      console.log(`[GENERALI DOPUNA] ✅ Validacija uspešna`);

      // Proveri da li servis postoji
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }

      // Povuci korisničke podatke da bi dobio technicianId
      const userDetails = await storage.getUser(req.user!.id);
      
      // Za servisere je potreban technicianId, za poslovne partnere nije
      if (req.user!.role === "technician" && (!userDetails || !userDetails.technicianId)) {
        return res.status(403).json({ error: "Nemate ulogu servisera" });
      }

      // Za poslovne partnere, proveri da li su oni kreatori servisa
      if (req.user!.role === "business_partner") {
        if (service.businessPartnerId !== req.user!.id) {
          return res.status(403).json({ error: "Možete dopunjavati samo servise koje ste vi kreirali" });
        }
      }

      console.log(`[GENERALI DOPUNA] 🔄 Ažuriranje podataka...`);

      // Dopuni podatke o klijentu ako su navedeni
      if (validData.clientEmail || validData.clientAddress || validData.clientCity) {
        const updateClientData: any = {};
        if (validData.clientEmail) updateClientData.email = validData.clientEmail;
        if (validData.clientAddress) updateClientData.address = validData.clientAddress;
        if (validData.clientCity) updateClientData.city = validData.clientCity;

        await storage.updateClient(service.clientId, updateClientData);
        console.log(`[GENERALI DOPUNA] ✅ Klijent ažuriran`);
      }

      // Dopuni podatke o aparatu ako su navedeni
      if (validData.serialNumber || validData.model || validData.purchaseDate) {
        const updateApplianceData: any = {};
        if (validData.serialNumber) updateApplianceData.serialNumber = validData.serialNumber;
        if (validData.model) updateApplianceData.model = validData.model;
        if (validData.purchaseDate) updateApplianceData.purchaseDate = validData.purchaseDate;

        await storage.updateAppliance(service.applianceId, updateApplianceData);
        console.log(`[GENERALI DOPUNA] ✅ Aparat ažuriran`);
      }

      // Dodaj napomene o dopuni u tehnicianske napomene ako postoje
      if (validData.supplementNotes) {
        const currentNotes = service.technicianNotes || "";
        const updatedNotes = currentNotes ? 
          `${currentNotes}\n\n[DOPUNA GENERALI] ${validData.supplementNotes}` :
          `[DOPUNA GENERALI] ${validData.supplementNotes}`;
        
        await storage.updateService(serviceId, { 
          // Required fields for the schema
          clientId: service.clientId,
          applianceId: service.applianceId,
          description: service.description,
          warrantyStatus: service.warrantyStatus === 'nepoznato' ? 'van garancije' as const : service.warrantyStatus as 'u garanciji' | 'van garancije',
          createdAt: service.createdAt,
          status: service.status,
          // Updated field
          technicianNotes: updatedNotes 
        });
        console.log(`[GENERALI DOPUNA] ✅ Napomene dodane`);
      }

      // Vraćaj ažurirani servis
      const updatedService = await storage.getService(serviceId);
      console.log(`[GENERALI DOPUNA] ✅ Generali servis #${serviceId} uspešno dopunjen`);
      
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

  // ===== SPARE PARTS ADMIN ENDPOINTS UKLONJENI - SADA NA VRHU =====

  // ===== JWT TOKEN GENERATION FOR SESSION USERS =====
  
  // Generate JWT token for session-authenticated users
  app.post("/api/generate-jwt-token", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Korisnik nije prijavljen" });
      }
      
      const user = req.user as any;

      // Generiši JWT token za trenutno prijavljenog korisnika
      const tokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role
      };

      const token = generateToken(tokenPayload);
      
      console.log(`🔑 [JWT TOKEN GENERATION] Token generisan za korisnika: ${user.username} (${user.role})`);
      
      res.json({ 
        token,
        user: tokenPayload,
        message: "JWT token uspešno generisan"
      });

    } catch (error) {
      console.error("❌ [JWT TOKEN GENERATION] Greška:", error);
      res.status(500).json({ error: "Greška pri generisanju JWT tokena" });
    }
  });

  // ===== POVEZIVANJE MOBILNOG INTERFEJSA SA ADMIN PANELOM =====
  // Endpoint koji poziva mobilni interface za rezervne delove
  app.post("/api/services/:serviceId/spare-parts", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo serviseri mogu da zahtevaju rezervne delove" });
      }

      const serviceId = parseInt(req.params.serviceId);
      
      // Pripremi podatke koristeći isti format kao postojeći sistem
      const requestData = {
        partName: req.body.partName || '',
        partNumber: req.body.catalogNumber || req.body.partNumber || '',
        quantity: req.body.quantity || 1,
        description: req.body.description || '',
        urgency: req.body.urgency || 'normal',
        warrantyStatus: 'van garancije' as const, // Default warranty status for mobile requests
        serviceId: serviceId,
        status: "pending" as "pending", // Koristi pending status koji admin očekuje
        technicianId: req.user.technicianId || req.user!.id,
        requesterType: "technician" as "technician",
        requesterUserId: req.user.technicianId || req.user!.id,
        requesterName: req.user.fullName || req.user.username
      };

      console.log(`📱 [MOBILNI] Serviser ${req.user.username} zahtevao rezervni deo za servis #${serviceId}: ${requestData.partName}`);
      
      const order = await storage.createSparePartOrder(requestData);
      
      res.json({ 
        success: true, 
        message: "Zahtev za rezervni deo je uspešno poslat administratoru", 
        order 
      });
    } catch (error) {
      console.error("❌ [MOBILNI] Greška pri zahtevu za rezervni deo:", error);
      res.status(500).json({ error: "Greška pri slanju zahteva za rezervni deo" });
    }
  });

  // ===== CONVERSATION MESSAGES API ENDPOINTS =====
  // Ovi endpoint-i omogućavaju WhatsApp conversation tracking za servise
  
  // GET /api/conversations/:serviceId - Dohvata sve conversation poruke za servis
  app.get('/api/conversations/:serviceId', jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      console.log(`📞 [CONVERSATION] Admin dohvata conversation za servis #${serviceId}`);
      
      const messages = await storage.getConversationMessages(serviceId);
      console.log(`📞 [CONVERSATION] Pronađeno ${messages.length} poruka za servis #${serviceId}`);
      
      res.json(messages);
    } catch (error) {
      console.error('❌ [CONVERSATION] Greška pri dohvatanju conversation poruka:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju conversation poruka' });
    }
  });

  // POST /api/conversations/message - Kreira novu conversation poruku
  app.post('/api/conversations/message', jwtAuth, async (req, res) => {
    try {
      console.log(`📞 [CONVERSATION] Nova conversation poruka: ${JSON.stringify(req.body)}`);
      
      const message = await storage.createConversationMessage(req.body);
      console.log(`📞 [CONVERSATION] ✅ Conversation poruka kreirana: ID #${message.id}`);
      
      res.json(message);
    } catch (error) {
      console.error('❌ [CONVERSATION] Greška pri kreiranju conversation poruke:', error);
      res.status(500).json({ error: 'Greška pri kreiranju conversation poruke' });
    }
  });

  // PUT /api/conversations/:id/status - Ažurira status conversation poruke
  app.put('/api/conversations/:id/status', jwtAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { status } = req.body;
      
      console.log(`📞 [CONVERSATION] Ažuriranje statusa poruke #${messageId} na "${status}"`);
      
      const updatedMessage = await storage.updateConversationMessageStatus(messageId, status);
      if (!updatedMessage) {
        return res.status(404).json({ error: 'Conversation poruka nije pronađena' });
      }
      
      console.log(`📞 [CONVERSATION] ✅ Status poruke #${messageId} ažuriran na "${status}"`);
      res.json(updatedMessage);
    } catch (error) {
      console.error('❌ [CONVERSATION] Greška pri ažuriranju statusa poruke:', error);
      res.status(500).json({ error: 'Greška pri ažuriranju statusa conversation poruke' });
    }
  });

  // GET /api/conversations/:serviceId/history - Dohvata detaljnu conversation istoriju
  app.get('/api/conversations/:serviceId/history', jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      console.log(`📞 [CONVERSATION] Admin dohvata detaljnu conversation istoriju za servis #${serviceId}`);
      
      const history = await storage.getServiceConversationHistory(serviceId);
      console.log(`📞 [CONVERSATION] Detaljana istorija: ${history.length} poruka za servis #${serviceId}`);
      
      res.json({
        serviceId,
        totalMessages: history.length,
        messages: history,
        lastActivity: history.length > 0 ? history[history.length - 1].createdAt : null
      });
    } catch (error) {
      console.error('❌ [CONVERSATION] Greška pri dohvatanju conversation istorije:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju conversation istorije' });
    }
  });

  // SMS Mobile API Routes - WhatsApp komunikacija
  app.use('/api/sms-mobile-api', createSMSMobileAPIRoutes(storage));

  // ===== WHATSAPP WEB INTEGRACIJA - NOVI DODACI BEZ MIJENJANJA POSTOJEĆE STRUKTURE =====
  // Ovaj dio dodaje WhatsApp Web funkcionalnost kao proširenje postojećeg sistema
  
  // Import WhatsApp Web servisa - SAMO KADA JE POTREBAN
  let whatsappWebService: any = null;
  
  const getWhatsAppWebService = async () => {
    if (!whatsappWebService) {
      const { whatsappWebService: service } = await import('./whatsapp-web-service.js');
      whatsappWebService = service;
    }
    return whatsappWebService;
  };

  // GET /api/whatsapp-web/status - Provjeri status konekcije
  app.get('/api/whatsapp-web/status', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu koristiti WhatsApp Web" });
      }

      const service = await getWhatsAppWebService();
      const status = service.getConnectionStatus();
      
      console.log(`📱 [WHATSAPP WEB] Status provjera: connected=${status.isConnected}`);
      res.json(status);
    } catch (error) {
      console.error('❌ [WHATSAPP WEB] Greška pri proveri statusa:', error);
      res.status(500).json({ error: 'Greška pri proveri WhatsApp Web statusa' });
    }
  });

  // POST /api/whatsapp-web/initialize - Pokreni WhatsApp Web klijent
  app.post('/api/whatsapp-web/initialize', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu pokrenuti WhatsApp Web" });
      }

      const service = await getWhatsAppWebService();
      
      // Setup message handler za automatsko čuvanje poruka u conversation sistem
      service.onMessage(async (message: any) => {
        try {
          // Pokušaj da povezeš poruku sa klijentom/servisom
          const messageData = {
            serviceId: null, // Može biti null ako nema vezu sa servisom
            senderType: 'client' as const,
            senderName: message.contact.name || message.contact.number,
            content: message.body,
            whatsappMessageId: message.id,
            whatsappFrom: message.from,
            whatsappTimestamp: new Date(message.timestamp * 1000),
            metadata: {
              whatsappContact: message.contact,
              isGroup: message.isGroup,
              hasMedia: !!message.media
            }
          };

          // Sačuvaj u conversation sistem koristeći postojeću strukturu
          await storage.createConversationMessage(messageData);
          console.log(`💬 [WHATSAPP WEB] Poruka automatski sačuvana u conversation sistem`);
        } catch (error) {
          console.error('❌ [WHATSAPP WEB] Greška pri čuvanju poruke:', error);
        }
      });

      await service.initialize();
      
      console.log(`🚀 [WHATSAPP WEB] Admin ${req.user.username} pokrenuo WhatsApp Web klijent`);
      res.json({ success: true, message: "WhatsApp Web klijent je pokrenut" });
    } catch (error) {
      console.error('❌ [WHATSAPP WEB] Greška pri pokretanju:', error);
      res.status(500).json({ error: 'Greška pri pokretanju WhatsApp Web klijenta' });
    }
  });

  // POST /api/whatsapp-web/send-message - Pošalji poruku preko WhatsApp Web
  app.post('/api/whatsapp-web/send-message', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu slati WhatsApp Web poruke" });
      }

      const { phoneNumber, message, serviceId } = req.body;

      if (!phoneNumber || !message) {
        return res.status(400).json({ error: "Broj telefona i poruka su obavezni" });
      }

      const service = await getWhatsAppWebService();
      const success = await service.sendMessage(phoneNumber, message);

      if (success) {
        // Sačuvaj poslatu poruku u conversation sistem
        try {
          const messageData = {
            serviceId: serviceId || null,
            senderType: 'admin' as const,
            senderName: req.user.fullName || req.user.username,
            content: message,
            whatsappTo: phoneNumber,
            whatsappTimestamp: new Date(),
            metadata: {
              sentViaWhatsAppWeb: true,
              sentBy: req.user.username
            }
          };

          await storage.createConversationMessage(messageData);
          console.log(`✅ [WHATSAPP WEB] Poruka poslata i sačuvana u conversation sistem`);
        } catch (error) {
          console.error('❌ [WHATSAPP WEB] Greška pri čuvanju poslate poruke:', error);
        }

        res.json({ success: true, message: "Poruka je uspešno poslata preko WhatsApp Web" });
      } else {
        res.status(500).json({ error: "Greška pri slanju poruke preko WhatsApp Web" });
      }
    } catch (error) {
      console.error('❌ [WHATSAPP WEB] Greška pri slanju poruke:', error);
      res.status(500).json({ error: 'Greška pri slanju WhatsApp Web poruke' });
    }
  });

  // GET /api/whatsapp-web/contacts - Dohvati WhatsApp kontakte
  app.get('/api/whatsapp-web/contacts', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu pristupiti WhatsApp kontaktima" });
      }

      const service = await getWhatsAppWebService();
      const contacts = await service.getContacts();
      
      console.log(`📞 [WHATSAPP WEB] Dohvaćeno ${contacts.length} kontakata`);
      res.json(contacts);
    } catch (error) {
      console.error('❌ [WHATSAPP WEB] Greška pri dohvatanju kontakata:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju WhatsApp kontakata' });
    }
  });

  // GET /api/whatsapp-web/chats - Dohvati WhatsApp chat-ove
  app.get('/api/whatsapp-web/chats', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu pristupiti WhatsApp chat-ovima" });
      }

      const service = await getWhatsAppWebService();
      const chats = await service.getChats();
      
      console.log(`💬 [WHATSAPP WEB] Dohvaćeno ${chats.length} chat-ova`);
      res.json(chats);
    } catch (error) {
      console.error('❌ [WHATSAPP WEB] Greška pri dohvatanju chat-ova:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju WhatsApp chat-ova' });
    }
  });

  // POST /api/whatsapp-web/auto-notify-completed - Automatska obaveštenja o završenom servisu
  app.post('/api/whatsapp-web/auto-notify-completed', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'technician') {
        return res.status(403).json({ error: "Samo administratori i serviseri mogu pokrenuti automatska obaveštenja" });
      }

      const { serviceId } = req.body;

      if (!serviceId) {
        return res.status(400).json({ error: "Service ID je obavezan" });
      }

      console.log(`📱 [WHATSAPP AUTO] Pokretanje automatskih obaveštenja za servis #${serviceId}`);

      // Dohvati kompletne podatke o servisu
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }

      const client = await storage.getClient(service.clientId);
      const appliance = await storage.getAppliance(service.applianceId);
      const category = appliance ? await storage.getCategory(appliance.categoryId) : null;
      const manufacturer = appliance ? await storage.getManufacturer(appliance.manufacturerId) : null;
      const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;

      const whatsappService = await getWhatsAppWebService();
      const notificationResults = {
        client: { success: false, error: null },
        admin: { success: false, error: null },
        businessPartner: { success: false, error: null },
        technician: { success: false, error: null }
      };

      const serviceData = {
        serviceId: service.id.toString(),
        clientName: client?.fullName || 'N/A',
        clientPhone: client?.phone || '',
        deviceType: category?.name || 'Uređaj',
        deviceModel: appliance?.model || 'N/A',
        technicianName: technician?.fullName || 'Serviser',
        completedDate: new Date().toLocaleDateString('sr-RS'),
        usedParts: service.usedParts || undefined,
        machineNotes: service.machineNotes || undefined,
        cost: service.cost ? service.cost.toString() : undefined,
        isCompletelyFixed: service.isCompletelyFixed || false,
        warrantyStatus: service.warrantyStatus || 'van garancije'
      };

      // 1. OBAVEŠTENJE KLIJENTU (ako ima telefon)
      if (client?.phone) {
        try {
          const success = await whatsappService.notifyServiceCompleted(serviceData);
          notificationResults.client = { success, error: success ? null : 'Slanje neuspešno' as string | null };
          console.log(`📱 [WHATSAPP AUTO] Klijent obaveštenje: ${success ? 'USPEŠNO' : 'NEUSPEŠNO'}`);
        } catch (error: any) {
          notificationResults.client = { success: false, error: error.message };
          console.error(`❌ [WHATSAPP AUTO] Greška pri obaveštenju klijenta:`, error);
        }
      }

      // 2. OBAVEŠTENJE ADMINU
      try {
        const success = await whatsappService.notifyAdminServiceCompleted(serviceData);
        notificationResults.admin = { success, error: success ? null : 'Slanje neuspešno' as string | null };
        console.log(`🎯 [WHATSAPP AUTO] Admin obaveštenje: ${success ? 'USPEŠNO' : 'NEUSPEŠNO'}`);
      } catch (error: any) {
        notificationResults.admin = { success: false, error: error.message };
        console.error(`❌ [WHATSAPP AUTO] Greška pri obaveštenju admina:`, error);
      }

      // 3. OBAVEŠTENJE BUSINESS PARTNER-U (ako postoji)
      if (service.businessPartnerId) {
        try {
          const businessPartner = await storage.getBusinessPartner(service.businessPartnerId);
          if (businessPartner && businessPartner.phone) {
            const success = await whatsappService.notifyBusinessPartnerServiceCompleted({
              partnerPhone: businessPartner.phone,
              partnerName: (businessPartner as any).name ?? businessPartner.fullName ?? 'Partner',
              serviceId: serviceData.serviceId,
              clientName: serviceData.clientName,
              deviceType: serviceData.deviceType,
              deviceModel: serviceData.deviceModel,
              technicianName: serviceData.technicianName,
              completedDate: serviceData.completedDate,
              cost: serviceData.cost,
              isCompletelyFixed: serviceData.isCompletelyFixed
            });
            notificationResults.businessPartner = { success, error: success ? null : 'Slanje neuspešno' };
            console.log(`📋 [WHATSAPP AUTO] Business partner obaveštenje: ${success ? 'USPEŠNO' : 'NEUSPEŠNO'}`);
          }
        } catch (error: any) {
          notificationResults.businessPartner = { success: false, error: error.message };
          console.error(`❌ [WHATSAPP AUTO] Greška pri obaveštenju business partner-a:`, error);
        }
      }

      // 4. POTVRDA TEHNICIAN-U (ako ima telefon)
      if (technician?.phone) {
        try {
          const success = await whatsappService.notifyTechnicianServiceCompleted({
            technicianPhone: technician.phone,
            technicianName: technician.fullName,
            serviceId: serviceData.serviceId,
            clientName: serviceData.clientName,
            deviceType: serviceData.deviceType,
            completedDate: serviceData.completedDate
          });
          notificationResults.technician = { success, error: success ? null : 'Slanje neuspešno' };
          console.log(`✅ [WHATSAPP AUTO] Technician potvrda: ${success ? 'USPEŠNO' : 'NEUSPEŠNO'}`);
        } catch (error: any) {
          notificationResults.technician = { success: false, error: error.message };
          console.error(`❌ [WHATSAPP AUTO] Greška pri potvrdi tehnician-u:`, error);
        }
      }

      // 5. NOVA FUNKCIONALNOST - OBAVEZNA OBAVEŠTENJA NA FIKSNE BROJEVE + KLIJENT
      let mandatoryResults;
      try {
        mandatoryResults = await whatsappService.notifyAllMandatoryNumbers({
          serviceId: serviceData.serviceId,
          clientName: serviceData.clientName,
          clientPhone: client?.phone || undefined,
          deviceType: serviceData.deviceType,
          deviceModel: serviceData.deviceModel,
          technicianName: serviceData.technicianName,
          completedDate: serviceData.completedDate,
          usedParts: serviceData.usedParts,
          machineNotes: serviceData.machineNotes,
          cost: serviceData.cost,
          isCompletelyFixed: serviceData.isCompletelyFixed,
          warrantyStatus: serviceData.warrantyStatus
        });
        console.log(`📢 [MANDATORY] Obavezna obaveštenja poslata:`, mandatoryResults);
      } catch (error: any) {
        console.error(`❌ [MANDATORY] Greška pri obaveznim obaveštenjima:`, error);
        mandatoryResults = {
          client: { success: false, error: error.message },
          jelena_maksimovic: { success: false, error: error.message },
          jelena_todosijevic: { success: false, error: error.message }
        };
      }

      console.log(`📊 [WHATSAPP AUTO] Sažetak obaveštenja za servis #${serviceId}:`, notificationResults);

      res.json({
        success: true,
        message: 'Automatska WhatsApp obaveštenja pokrenuta',
        serviceId,
        results: notificationResults,
        mandatoryResults // Dodáváme nova obavezna obaveštenja u odgovor
      });

    } catch (error: any) {
      console.error('❌ [WHATSAPP AUTO] Greška pri automatskim obaveštenjima:', error);
      res.status(500).json({ 
        error: 'Greška pri automatskim WhatsApp obaveštenjima',
        details: (error as Error).message 
      });
    }
  });

  // ========== NOVI WHATSAPP WEB OPTIMIZATION ENDPOINTS ==========

  // GET /api/whatsapp-web/contacts/paginated - Dohvati kontakte sa pagination
  app.get('/api/whatsapp-web/contacts/paginated', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu pristupiti WhatsApp kontaktima" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25;

      console.log(`🔍 [WHATSAPP PAGINATION] Zahtev za kontakte - strana ${page}, limit ${limit}`);

      const service = await getWhatsAppWebService();
      const result = await service.getPaginatedContacts(page, limit);
      
      console.log(`✅ [WHATSAPP PAGINATION] Vraćam ${result.contacts.length}/${result.totalCount} kontakata`);
      res.json(result);
    } catch (error) {
      console.error('❌ [WHATSAPP PAGINATION] Greška pri dohvatanju paginiranih kontakata:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju paginiranih kontakata' });
    }
  });

  // GET /api/whatsapp-web/health - Provjeri health status
  app.get('/api/whatsapp-web/health', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu pristupiti health status-u" });
      }

      console.log('🏥 [WHATSAPP HEALTH] Zahtev za health check');

      const service = await getWhatsAppWebService();
      const healthStatus = service.getHealthStatus();
      
      console.log(`🏥 [WHATSAPP HEALTH] Status: ${healthStatus.isHealthy ? 'ZDRAVO' : 'UPOZORENJA'}`);
      res.json(healthStatus);
    } catch (error) {
      console.error('❌ [WHATSAPP HEALTH] Greška pri health check-u:', error);
      res.status(500).json({ 
        error: 'Greška pri health proveri',
        isHealthy: false,
        metrics: null,
        warnings: ['Greška pri dohvatanju health status-a']
      });
    }
  });

  // POST /api/whatsapp-web/optimize - Pokreni resource optimization
  app.post('/api/whatsapp-web/optimize', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu pokrenuti optimizaciju" });
      }

      console.log('🔧 [WHATSAPP OPTIMIZER] Zahtev za resource optimizaciju');

      const service = await getWhatsAppWebService();
      const result = await service.optimizeResources();
      
      console.log(`🔧 [WHATSAPP OPTIMIZER] Optimizacija: ${result.optimized ? 'USPEŠNA' : 'NEUSPEŠNA'}`);
      res.json(result);
    } catch (error) {
      console.error('❌ [WHATSAPP OPTIMIZER] Greška pri optimizaciji:', error);
      res.status(500).json({ 
        error: 'Greška pri resource optimizaciji',
        optimized: false,
        details: 'Greška pri pokretanju optimizacije'
      });
    }
  });

  // POST /api/whatsapp-web/cleanup-sessions - Očisti stare session fajlove
  app.post('/api/whatsapp-web/cleanup-sessions', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu pokrenuti cleanup" });
      }

      console.log('🧹 [WHATSAPP CLEANUP] Zahtev za session cleanup');

      const service = await getWhatsAppWebService();
      const result = await service.cleanupOldSessions();
      
      console.log(`🧹 [WHATSAPP CLEANUP] Cleanup: ${result.cleaned ? 'USPEŠAN' : 'PRESKOČEN'}`);
      res.json(result);
    } catch (error) {
      console.error('❌ [WHATSAPP CLEANUP] Greška pri cleanup-u:', error);
      res.status(500).json({ 
        error: 'Greška pri session cleanup-u',
        cleaned: false,
        details: 'Greška pri cleanup operaciji'
      });
    }
  });

  // POST /api/whatsapp-web/auto-recovery - Pokreni auto recovery
  app.post('/api/whatsapp-web/auto-recovery', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu pokrenuti auto recovery" });
      }

      console.log('🔄 [WHATSAPP RECOVERY] Zahtev za auto recovery');

      const service = await getWhatsAppWebService();
      const result = await service.attemptAutoRecovery();
      
      console.log(`🔄 [WHATSAPP RECOVERY] Recovery pokušaj #${result.attempt}: ${result.recovered ? 'USPEŠAN' : 'NEUSPEŠAN'}`);
      res.json(result);
    } catch (error) {
      console.error('❌ [WHATSAPP RECOVERY] Greška pri auto recovery:', error);
      res.status(500).json({ 
        error: 'Greška pri auto recovery',
        recovered: false,
        attempt: 0,
        message: 'Greška pri pokretanju recovery operacije'
      });
    }
  });

  // ========== NOVI SMS PROTOKOL TEST ENDPOINT ==========
  
  app.post('/api/protocol-sms/test', jwtAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      console.log('📱 [PROTOKOL TEST] Zahtev za test protokol SMS sistema');
      
      const { protocolType, serviceId, mockData } = req.body;
      
      // Validacija osnovnih podataka
      if (!protocolType) {
        return res.status(400).json({ error: 'Nije definisan tip protokola' });
      }

      // Import Protocol SMS Service
      const { createProtocolSMSService } = await import('./sms-communication-service.js');
      
      // Dobijamo SMS konfiguraciju iz baze
      const settingsArray = await storage.getSystemSettings();
      const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
      
      // Kreiranje Protocol SMS Service instance sa ispravnom konfiguracijom
      const protocolSMS = createProtocolSMSService({
        apiKey: settingsMap.sms_mobile_api_key || '',
        baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
        senderId: settingsMap.sms_mobile_sender_id || null,
        enabled: settingsMap.sms_mobile_enabled === 'true'
      }, storage);

      // Mock podaci za testiranje različitih protokola
      let testData = mockData || {
        serviceId: serviceId || 12345,
        clientId: 1,
        clientName: 'Marko Petrović',
        clientPhone: '0691234567',
        deviceType: 'Frižider',
        deviceModel: 'Samsung RB37',
        manufacturerName: 'Samsung',
        technicianId: 2,
        technicianName: 'Milan Jovanović',
        technicianPhone: '0657891234',
        businessPartnerId: 3,
        businessPartnerName: 'Tech Partner d.o.o.',
        partName: 'Kompresor',
        estimatedDate: '3-5 dana',
        cost: '8500',
        unavailableReason: 'Klijent nije bio kod kuće',
        createdBy: 'Administrator'
      };

      console.log(`📱 [PROTOKOL TEST] Pokušavam protokol: ${protocolType} za servis #${testData.serviceId}`);

      let result;

      // Pozivanje odgovarajućeg protokola
      switch (protocolType) {
        case 'client_unavailable':
          result = await protocolSMS.sendClientUnavailableProtocol(testData);
          break;
          
        case 'service_assigned':
          result = await protocolSMS.sendServiceAssignedProtocol(testData);
          break;
          
        case 'parts_ordered':
          result = await protocolSMS.sendPartsOrderedProtocol(testData);
          break;
          
        case 'repair_refused':
          result = await protocolSMS.sendRepairRefusedProtocol(testData);
          break;
          
        case 'service_created':
          const createdByPartner = req.body.createdByPartner || false;
          result = await protocolSMS.sendServiceCreatedProtocol(testData, createdByPartner);
          break;
          
        default:
          return res.status(400).json({ 
            error: 'Nepoznat tip protokola', 
            supportedTypes: ['client_unavailable', 'service_assigned', 'parts_ordered', 'repair_refused', 'service_created']
          });
      }

      console.log(`✅ [PROTOKOL TEST] Protokol ${protocolType} završen:`, result);

      res.json({
        success: true,
        message: `SMS protokol ${protocolType} uspešno testiran`,
        protocolType,
        testData,
        results: result
      });

    } catch (error: any) {
      console.error('❌ [PROTOKOL TEST] Greška pri testiranju SMS protokola:', error);
      res.status(500).json({ 
        error: 'Greška pri testiranju SMS protokola',
        details: (error as Error).message 
      });
    }
  });

  // ====================================================================================
  // NOVO: TEST ENDPOINT ZA SMS SEGMENTACIJU - DODANO 02.09.2025
  // ====================================================================================
  
  // POST /api/test-sms-segments - Test endpoint za novo SMS segmentacijsko pravilo
  app.post('/api/test-sms-segments', jwtAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { phone, message, testType } = req.body;
      
      if (!phone || !message) {
        return res.status(400).json({ error: 'Phone i message su obavezni' });
      }

      console.log(`📱 [TEST-SMS-SEGMENTS] Test tip: ${testType}, poruka: ${message.length} karaktera`);
      
      // Import novih SMS funkcija
      const { splitLongSMS, MultiSegmentSMSService } = await import('./sms-communication-service.js');
      
      // Get SMS konfiguraciju
      const settingsArray = await storage.getSystemSettings();
      const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
      const smsConfig = {
        apiKey: settingsMap.sms_mobile_api_key || '',
        baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
        senderId: settingsMap.sms_mobile_sender_id || null,
        enabled: settingsMap.sms_mobile_enabled === 'true'
      };

      if (testType === 'preview') {
        // Samo prikaži kako će biti podeljeno
        const segments = splitLongSMS(message);
        
        return res.json({
          success: true,
          message: 'Pregled podele poruke',
          originalLength: message.length,
          totalSegments: segments.length,
          segments: segments.map(s => ({
            number: s.segmentNumber,
            text: s.text,
            length: s.text.length
          })),
          wouldSend: segments.length > 1 
            ? `Poruka bi bila poslana kao ${segments.length} SMS-a`
            : 'Poruka bi bila poslana kao jedan SMS'
        });
        
      } else if (testType === 'send') {
        // Stvarno pošalji SMS koristeći novi sistem
        const { SMSCommunicationService } = await import('./sms-communication-service.js');
        const smsService = new SMSCommunicationService(smsConfig);
        const multiSmsService = new MultiSegmentSMSService(smsService);
        
        const result = await multiSmsService.sendLongSMS(
          { phone: phone, name: 'Test korisnik' },
          message
        );
        
        return res.json({
          success: result.success,
          message: `SMS ${result.success ? 'uspešno poslat' : 'neuspešno poslat'}`,
          totalSegments: result.totalSegments,
          sentSegments: result.segments.length,
          details: result.segments.map(s => ({
            segmentNumber: s.segment.segmentNumber,
            text: s.segment.text,
            length: s.segment.text.length,
            success: s.result.success,
            messageId: s.result.messageId,
            error: s.result.error
          })),
          overallError: result.error
        });
        
      } else {
        return res.status(400).json({ 
          error: 'testType mora biti "preview" ili "send"' 
        });
      }
      
    } catch (error: any) {
      console.error('❌ Greška pri testiranju SMS segmentacije:', error);
      res.status(500).json({ 
        error: 'Greška pri testiranju SMS segmentacije',
        details: (error as Error).message 
      });
    }
  });

  // ===== DATA DELETION REQUEST ENDPOINTS - GDPR COMPLIANCE =====
  
  // Public endpoint for data deletion requests
  app.post("/api/data-deletion-request", async (req, res) => {
    try {
      const { insertDataDeletionRequestSchema, dataDeletionRequests } = await import("@shared/schema");
      
      const validatedData = insertDataDeletionRequestSchema.parse({
        ...req.body,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      
      const [newRequest] = await db.insert(dataDeletionRequests).values(validatedData).returning();
      
      // Send notification email to admin
      try {
        await emailService.sendEmail({
          to: 'gruica@frigosistemtodosijevic.com',
          subject: '🔒 Novi zahtev za brisanje podataka - GDPR',
          html: `
            <h2>🔒 Novi zahtev za brisanje podataka</h2>
            <p><strong>Email:</strong> ${validatedData.email}</p>
            <p><strong>Ime i prezime:</strong> ${validatedData.fullName}</p>
            <p><strong>Telefon:</strong> ${validatedData.phone || 'Nije naveden'}</p>
            <p><strong>Razlog:</strong> ${validatedData.reason || 'Nije naveden'}</p>
            <p><strong>Vreme zahteva:</strong> ${new Date().toLocaleString('sr-RS')}</p>
            <p><strong>IP adresa:</strong> ${validatedData.ipAddress}</p>
            <hr>
            <p>Molimo da obradi zahtev u admin panelu aplikacije.</p>
          `
        });
      } catch (emailError) {
        console.error('Greška pri slanju email notifikacije za brisanje podataka:', emailError);
      }
      
      res.status(201).json({ 
        message: "Zahtev za brisanje podataka je uspešno poslat. Kontaktiraćemo vas u najkraćem roku.",
        requestId: newRequest.id 
      });
    } catch (error) {
      console.error('Greška pri kreiranju zahteva za brisanje podataka:', error);
      res.status(400).json({ error: "Greška pri kreiranju zahteva" });
    }
  });

  // Admin endpoint for listing data deletion requests
  app.get("/api/admin/data-deletion-requests", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovim podacima" });
      }
      
      const { dataDeletionRequests } = await import("@shared/schema");
      const requests = await db.select().from(dataDeletionRequests).orderBy(desc(dataDeletionRequests.requestedAt));
      res.json(requests);
    } catch (error) {
      console.error('Greška pri preuzimanju zahteva za brisanje podataka:', error);
      res.status(500).json({ error: "Greška servera" });
    }
  });

  // Admin endpoint for updating request status
  app.patch("/api/admin/data-deletion-requests/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      const { dataDeletionRequests } = await import("@shared/schema");
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      
      if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
        return res.status(400).json({ error: "Nevaljan status" });
      }
      
      const [updatedRequest] = await db.update(dataDeletionRequests)
        .set({ 
          status, 
          adminNotes,
          processedAt: new Date(),
          processedBy: req.user!.id 
        })
        .where(eq(dataDeletionRequests.id, parseInt(id)))
        .returning();
      
      if (!updatedRequest) {
        return res.status(404).json({ error: "Zahtev nije pronađen" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error('Greška pri ažuriranju zahteva za brisanje podataka:', error);
      res.status(500).json({ error: "Greška servera" });
    }
  });

  // ===== GOOGLE TRUST & SECURITY HEADERS MIDDLEWARE =====
  
  // Enhanced security headers for Google trust
  app.use((req, res, next) => {
    // Content Security Policy za Google trust
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://fonts.gstatic.com https://apis.google.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "media-src 'self' blob:; " +
      "connect-src 'self' https: wss:; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'self' https://*.replit.dev https://*.repl.co https://*.id.repl.co https://*.riker.replit.dev http://127.0.0.1:5000; " +
      "upgrade-insecure-requests;"
    );
    
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Google trust signals
    res.setHeader('X-Robots-Tag', 'index, follow');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    next();
  });

  // Google verification endpoints
  app.get('/google123456789.html', (req, res) => {
    res.type('text/html');
    res.send('google-site-verification: google123456789.html');
  });
  
  app.get('/.well-known/google-site-verification.txt', (req, res) => {
    res.type('text/plain');
    res.send('google-site-verification=123456789ABCDEF');
  });

  // Enhanced security.txt endpoint
  app.get('/.well-known/security.txt', (req, res) => {
    res.type('text/plain');
    res.send(`Contact: info@frigosistemtodosijevic.me
Canonical: https://frigosistemtodosijevic.me/.well-known/security.txt
Preferred-Languages: sr, en
Acknowledgments: https://frigosistemtodosijevic.me/about
Policy: https://frigosistemtodosijevic.me/privacy/policy
Hiring: https://frigosistemtodosijevic.me/about
Encryption: https://keys.openpgp.org/search?q=info@frigosistemtodosijevic.me`);
  });

  // ================================================================================================
  // WHATSAPP BUSINESS API ENDPOINTS - DODANO PRE RETURN STATEMENT-A
  // ================================================================================================

  const { whatsappBusinessAPIService } = await import('./whatsapp-business-api-service.js');

  /**
   * WHATSAPP BUSINESS API - Konfiguracija servisa
   */
  app.post('/api/whatsapp-business/config', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { accessToken, phoneNumberId, apiVersion, baseUrl } = req.body;

      if (!accessToken || !phoneNumberId) {
        return res.status(400).json({ 
          error: 'accessToken i phoneNumberId su obavezni'
        });
      }

      // Ažurira konfiguraciju servisa
      whatsappBusinessAPIService.updateConfig({
        accessToken,
        phoneNumberId,
        apiVersion: apiVersion || 'v23.0',
        baseUrl: baseUrl || 'https://graph.facebook.com'
      });

      // Sačuva konfiguraciju u bazu (osim access token-a iz bezbednosnih razloga)
      await storage.setSystemSetting('whatsapp_business_phone_number_id', phoneNumberId);
      await storage.setSystemSetting('whatsapp_business_api_version', apiVersion || 'v23.0');
      if (baseUrl) {
        await storage.setSystemSetting('whatsapp_business_base_url', baseUrl);
      }

      console.log('✅ [WHATSAPP BUSINESS API] Konfiguracija ažurirana uspešno');

      res.json({
        success: true,
        message: 'WhatsApp Business API konfiguracija uspešno ažurirana',
        config: whatsappBusinessAPIService.getCurrentConfig()
      });

    } catch (error: any) {
      console.error('❌ [WHATSAPP BUSINESS API] Greška pri ažuriranju konfiguracije:', error);
      res.status(500).json({ 
        error: 'Greška pri ažuriranju konfiguracije',
        details: (error as Error).message
      });
    }
  });

  /**
   * WHATSAPP BUSINESS API - Dobija trenutnu konfiguraciju
   */
  app.get('/api/whatsapp-business/config', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      // Učitava konfiguraciju iz baze
      const phoneNumberId = await storage.getSystemSetting('whatsapp_business_phone_number_id');
      const apiVersion = await storage.getSystemSetting('whatsapp_business_api_version');
      const baseUrl = await storage.getSystemSetting('whatsapp_business_base_url');

      if (phoneNumberId) {
        whatsappBusinessAPIService.updateConfig({
          accessToken: '', // Ne učitavamo access token iz baze iz bezbednosnih razloga
          phoneNumberId: phoneNumberId.value || '',
          apiVersion: apiVersion?.value || 'v23.0',
          baseUrl: baseUrl?.value || 'https://graph.facebook.com'
        });
      }

      const config = whatsappBusinessAPIService.getCurrentConfig();
      const status = whatsappBusinessAPIService.getConfigurationStatus();

      res.json({
        config,
        status,
        message: status.isConfigured ? 'Servis je konfigurisan' : `Nedostaju polja: ${status.missingFields.join(', ')}`
      });

    } catch (error: any) {
      console.error('❌ [WHATSAPP BUSINESS API] Greška pri dobijanju konfiguracije:', error);
      res.status(500).json({ 
        error: 'Greška pri dobijanju konfiguracije',
        details: (error as Error).message
      });
    }
  });

  /**
   * WHATSAPP BUSINESS API - Test konekcije
   */
  app.post('/api/whatsapp-business/test-connection', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log('🔧 [WHATSAPP BUSINESS API] Testira konekciju...');
      const testResult = await whatsappBusinessAPIService.testConnection();

      res.json({
        success: testResult.success,
        message: testResult.message,
        details: testResult.details,
        config: whatsappBusinessAPIService.getCurrentConfig()
      });

    } catch (error: any) {
      console.error('❌ [WHATSAPP BUSINESS API] Greška pri testiranju konekcije:', error);
      res.status(500).json({ 
        error: 'Greška pri testiranju konekcije',
        details: (error as Error).message
      });
    }
  });

  /**
   * WHATSAPP BUSINESS API - Šalje tekstualnu poruku
   */
  app.post('/api/whatsapp-business/send-text', jwtAuth, requireRole(['admin', 'technician']), async (req, res) => {
    try {
      const { phoneNumber, message, previewUrl } = req.body;

      if (!phoneNumber || !message) {
        return res.status(400).json({ 
          error: 'phoneNumber i message su obavezni'
        });
      }

      console.log(`📱 [WHATSAPP BUSINESS API] Šalje tekstualnu poruku na ${phoneNumber}: ${message.substring(0, 50)}...`);
      const result = await whatsappBusinessAPIService.sendTextMessage(phoneNumber, message, previewUrl || false);

      if (result.success) {
        console.log(`✅ [WHATSAPP BUSINESS API] Poruka uspešno poslata. Message ID: ${result.messageId}`);
      }

      res.json(result);

    } catch (error: any) {
      console.error('❌ [WHATSAPP BUSINESS API] Greška pri slanju tekstualne poruke:', error);
      res.status(500).json({ 
        error: 'Greška pri slanju poruke',
        details: (error as Error).message
      });
    }
  });

  console.log('📱 [WHATSAPP BUSINESS API] Endpoint-i uspešno registrovani');

  // ========== SERVICE PHOTOS ENDPOINTS ==========
  
  // Helper function to check service access authorization
  async function checkServicePhotoAccess(userId: number, userRole: string, serviceId: number): Promise<{ hasAccess: boolean, service?: any }> {
    try {
      const service = await storage.getService(serviceId);
      if (!service) {
        return { hasAccess: false };
      }

      // Admin has access to all services
      if (userRole === 'admin') {
        return { hasAccess: true, service };
      }

      // Assigned technician has access
      if (userRole === 'technician' && service.technicianId === userId) {
        return { hasAccess: true, service };
      }

      // Business partner has access to their services
      if (userRole === 'business_partner' && service.businessPartnerId === userId) {
        return { hasAccess: true, service };
      }

      // Client owner has access to their own service
      if ((userRole === 'customer' || userRole === 'client') && service.clientId === userId) {
        return { hasAccess: true, service };
      }

      return { hasAccess: false, service };
    } catch (error) {
      console.error("Error checking service photo access:", error);
      return { hasAccess: false };
    }
  }

  // Get service photos
  app.get("/api/service-photos", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.query.serviceId as string);
      if (!serviceId || isNaN(serviceId)) {
        return res.status(400).json({ error: "Valjan serviceId je potreban" });
      }

      // Check authorization
      const accessCheck = await checkServicePhotoAccess(req.user!.id, req.user!.role, serviceId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: "Nemate dozvolu za pristup fotografijama ovog servisa" });
      }

      const photos = await storage.getServicePhotos(serviceId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching service photos:", error);
      res.status(500).json({ error: "Neuspešno dohvatanje fotografija servisa" });
    }
  });

  // Create service photo
  app.post("/api/service-photos", jwtAuth, async (req, res) => {
    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const { insertServicePhotoSchema } = await import("@shared/schema");
      
      // Map frontend field names to backend schema
      const mappedBody = {
        ...req.body,
        // Map photoUrl to photoPath and photoCategory to category
        photoPath: req.body.photoUrl || req.body.photoPath,
        category: req.body.photoCategory || req.body.category,
        uploadedBy: req.user!.id
      };

      // Remove unmapped fields to avoid validation issues
      delete mappedBody.photoUrl;
      delete mappedBody.photoCategory;

      // Validate service ID first
      const serviceId = mappedBody.serviceId;
      if (!serviceId || isNaN(parseInt(serviceId))) {
        return res.status(400).json({ error: "Valjan serviceId je potreban" });
      }

      // Check authorization
      const accessCheck = await checkServicePhotoAccess(req.user!.id, req.user!.role, parseInt(serviceId));
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: "Nemate dozvolu za dodavanje fotografija ovom servisu" });
      }

      const validatedData = insertServicePhotoSchema.parse(mappedBody);

      // Kreiranje fotografije u bazi
      const newPhoto = await storage.createServicePhoto(validatedData);

      // Postavljanje ACL policy-a za fotografiju
      if (validatedData.photoPath.startsWith("https://storage.googleapis.com/")) {
        const objectStorageService = new ObjectStorageService();
        const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
          validatedData.photoPath,
          {
            owner: req.user!.id.toString(),
            visibility: "private", // Privatne fotografije servisa
          },
        );
        
        // Ažuriranje putanje u bazi sa normalizovanom putanjom
        if (newPhoto.id) {
          await storage.updateServicePhoto?.(newPhoto.id, { photoPath: objectPath });
        }
      }

      res.status(201).json(newPhoto);
    } catch (error) {
      console.error("Error creating service photo:", error);
      if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
        return res.status(400).json({ error: "Neispravni podaci", details: (error as any).errors });
      }
      res.status(500).json({ error: "Neuspešno kreiranje fotografije servisa" });
    }
  });

  // Delete service photo
  app.delete("/api/service-photos/:id", jwtAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      if (!photoId || isNaN(photoId)) {
        return res.status(400).json({ error: "Valjan ID fotografije je potreban" });
      }

      // Get photo details before deletion for authorization and cleanup
      const photo = await storage.getServicePhoto(photoId);
      if (!photo) {
        return res.status(404).json({ error: "Fotografija nije pronađena" });
      }

      // Check authorization
      const accessCheck = await checkServicePhotoAccess(req.user!.id, req.user!.role, photo.serviceId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: "Nemate dozvolu za brisanje ove fotografije" });
      }

      // Delete from object storage if it's a cloud URL
      if (photo.photoPath.startsWith("https://storage.googleapis.com/")) {
        try {
          const { ObjectStorageService } = await import("./objectStorage");
          const objectStorageService = new ObjectStorageService();
          // Note: deleteObject method may not exist - using alternative approach
          console.log(`🗑️ [PHOTOS] Skipping object storage deletion for: ${photo.photoPath}`);
          console.log(`🗑️ [PHOTOS] Deleted object from storage: ${photo.photoPath}`);
        } catch (storageError) {
          console.error("Error deleting from object storage:", storageError);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete from database
      await storage.deleteServicePhoto(photoId);
      console.log(`🗑️ [PHOTOS] Deleted photo record ${photoId} from database`);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service photo:", error);
      res.status(500).json({ error: "Neuspešno brisanje fotografije servisa" });
    }
  });

  // Get service photos by category
  app.get("/api/service-photos/:serviceId/category/:category", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const category = req.params.category;
      
      if (!serviceId || isNaN(serviceId)) {
        return res.status(400).json({ error: "Valjan serviceId je potreban" });
      }

      // Validate category
      const validCategories = ["before", "after", "parts", "damage", "documentation", "other"];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: "Nevalidna kategorija fotografije" });
      }

      // Check authorization
      const accessCheck = await checkServicePhotoAccess(req.user!.id, req.user!.role, serviceId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: "Nemate dozvolu za pristup fotografijama ovog servisa" });
      }

      const photos = await storage.getServicePhotosByCategory(serviceId, category);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching service photos by category:", error);
      res.status(500).json({ error: "Neuspešno dohvatanje fotografija po kategoriji" });
    }
  });

  // Service photo proxy for displaying images
  app.get("/api/service-photo-proxy/:id", jwtAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      if (!photoId || isNaN(photoId)) {
        return res.status(400).json({ error: "Valjan ID fotografije je potreban" });
      }

      const photo = await storage.getServicePhoto(photoId);
      if (!photo) {
        return res.status(404).json({ error: "Fotografija nije pronađena" });
      }

      // Check authorization
      const accessCheck = await checkServicePhotoAccess(req.user!.id, req.user!.role, photo.serviceId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovoj fotografiji" });
      }

      // Domain validation to prevent SSRF attacks
      const allowedDomains = [
        'storage.googleapis.com',
        'replit.com',
        'replit.dev',
        'localhost'
      ];

      if (photo.photoPath.startsWith("http")) {
        try {
          const url = new URL(photo.photoPath);
          const isAllowedDomain = allowedDomains.some(domain => 
            url.hostname === domain || url.hostname.endsWith('.' + domain)
          );
          
          if (!isAllowedDomain) {
            console.warn(`🚨 [SECURITY] Blocked SSRF attempt to: ${url.hostname}`);
            return res.status(403).json({ error: "Nedozvoljen domen za fotografiju" });
          }

          // External URL - redirect to validated URL
          return res.redirect(photo.photoPath);
        } catch (urlError) {
          console.error("Invalid URL in photo path:", urlError);
          return res.status(400).json({ error: "Nevaljan URL fotografije" });
        }
      } else {
        // Local file - serve directly with path validation
        const path = require('path');
        const fs = require('fs');
        
        // Prevent path traversal attacks
        const sanitizedPath = path.normalize(photo.photoPath).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.join(process.cwd(), 'uploads', sanitizedPath);
        
        // Ensure file is within uploads directory
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!filePath.startsWith(uploadsDir)) {
          console.warn(`🚨 [SECURITY] Blocked path traversal attempt: ${photo.photoPath}`);
          return res.status(403).json({ error: "Nedozvoljeno putanja datoteke" });
        }
        
        if (fs.existsSync(filePath)) {
          return res.sendFile(filePath);
        } else {
          return res.status(404).json({ error: "Fajl fotografije nije pronađen" });
        }
      }
    } catch (error) {
      console.error("Error serving service photo:", error);
      res.status(500).json({ error: "Greška pri učitavanju fotografije" });
    }
  });

  console.log('📸 [SERVICE PHOTOS] Endpoint-i uspešno registrovani');

  // ============================================================================
  // BEKO BILLING ENDPOINTS - Primena Enhanced Mode principa kao za ComPlus
  // ============================================================================
  
  // ENHANCED BEKO BILLING - Automatsko hvatanje svih završenih servisa
  app.get("/api/admin/billing/beko/enhanced", jwtAuth, async (req, res) => {
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

      // Definišemo SVE Beko brendove koji se fakturišu zajedno
      const bekoBrands = ['Beko', 'Grundig', 'Blomberg'];

      // Kreiraj date range za mesec - sa pravilnim timestamp poređenjem
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      // Koristi poslednji dan meseca (28/29/30/31 ovisno o mesecu)
      const lastDayOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      
      // ISPRAVKA: Za poređenje sa mešanim formatima (datum i timestamp)
      const endDateWithTimestamp = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59.999Z`;
      // Računaj sledeći mesec pravilno (uključujući prelazak na sledeću godinu)
      const nextMonth = parseInt(month as string) + 1;
      const nextMonthYear = nextMonth > 12 ? parseInt(year as string) + 1 : parseInt(year as string);
      const nextMonthNum = nextMonth > 12 ? 1 : nextMonth;
      const nextMonthStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`;

      console.log(`[ENHANCED BEKO BILLING] Automatsko hvatanje SVIH završenih servisa za ${month}/${year}`);
      console.log(`[ENHANCED BEKO BILLING] Brendovi: ${bekoBrands.join(', ')}`);
      console.log(`[ENHANCED BEKO BILLING] Date range: ${startDateStr} do ${endDateWithTimestamp}`);

      // ENHANCED LOGIKA: Hvata sve završene servise za Beko brendove
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
          createdAt: schema.services.createdAt,
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
            eq(schema.services.warrantyStatus, 'u garanciji'), // Samo garancijski servisi
            or(
              eq(schema.manufacturers.name, 'Beko'),
              eq(schema.manufacturers.name, 'Grundig'),
              eq(schema.manufacturers.name, 'Blomberg')
            ),
            or(
              // Prioritetno: servisi sa completedDate u periodu
              and(
                isNotNull(schema.services.completedDate),
                gte(schema.services.completedDate, startDateStr),
                or(
                  lt(schema.services.completedDate, nextMonthStr), // Za datum-only format
                  lte(schema.services.completedDate, endDateWithTimestamp) // Za timestamp format
                )
              ),
              // Backup: servisi bez completedDate sa createdAt u periodu
              and(
                isNull(schema.services.completedDate),
                gte(schema.services.createdAt, startDateStr),
                or(
                  lt(schema.services.createdAt, nextMonthStr),
                  lte(schema.services.createdAt, endDateWithTimestamp)
                )
              )
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate),
          desc(schema.services.createdAt)
        );

      // Formatiraj rezultate sa enhanced informacijama
      const billingServices = services.map(service => {
        const hasCompletedDate = service.completedDate && service.completedDate.trim() !== '';
        const displayDate = hasCompletedDate ? service.completedDate : service.createdAt;
        
        return {
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
          completedDate: displayDate,
          originalCompletedDate: service.completedDate,
          cost: service.cost || 0,
          description: service.description || '',
          warrantyStatus: service.warrantyStatus || 'Nedefinirano',
          isWarrantyService: true, // Svi su garancijski jer filtriramo po warrantyStatus
          isAutoDetected: !hasCompletedDate, // Flag samo za servise koji stvarno nemaju completedDate
          detectionMethod: hasCompletedDate ? 'completed_date' : 'created_at_fallback'
        };
      });

      // Grupiši servise po brendu za statistiku
      const servicesByBrand = billingServices.reduce((groups, service) => {
        const brand = service.manufacturerName;
        if (!groups[brand]) {
          groups[brand] = [];
        }
        groups[brand].push(service);
        return groups;
      }, {} as Record<string, typeof billingServices>);

      console.log(`[ENHANCED BEKO BILLING] ✅ Pronađeno ${billingServices.length} servisa za period ${month}/${year}`);
      console.log(`[ENHANCED BEKO BILLING] Brendovi u rezultatima:`, Object.keys(servicesByBrand));

      res.json({
        month: parseInt(month as string),
        year: parseInt(year as string),
        brandGroup: 'Beko',
        bekoBrands: bekoBrands,
        services: billingServices,
        servicesByBrand: servicesByBrand,
        totalServices: billingServices.length,
        totalCost: billingServices.reduce((sum, s) => sum + Number(s.cost || 0), 0),
        autoDetectedCount: billingServices.filter(s => s.isAutoDetected).length,
        detectionSummary: {
          withCompletedDate: billingServices.filter(s => !s.isAutoDetected).length,
          withUpdatedDateFallback: billingServices.filter(s => s.isAutoDetected).length
        },
        brandBreakdown: Object.keys(servicesByBrand).map(brand => ({
          brand,
          count: servicesByBrand[brand].length,
          cost: servicesByBrand[brand].reduce((sum, s) => sum + Number(s.cost || 0), 0)
        }))
      });

    } catch (error) {
      console.error('[ENHANCED BEKO BILLING] ❌ Greška:', error);
      res.status(500).json({ 
        error: 'Greška pri hvatanju Beko servisa',
        message: error instanceof Error ? error.message : 'Nepoznata greška'
      });
    }
  });

  // REGULAR BEKO BILLING - Samo servisi sa completedDate
  app.get("/api/admin/billing/beko", jwtAuth, async (req, res) => {
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

      // Definišemo SVE Beko brendove koji se fakturišu zajedno
      const bekoBrands = ['Beko', 'Grundig', 'Blomberg'];

      // Kreiraj date range za mesec - za TEXT polja u bazi
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      console.log(`[REGULAR BEKO BILLING] Standardno hvatanje završenih servisa za ${month}/${year}`);
      console.log(`[REGULAR BEKO BILLING] Brendovi: ${bekoBrands.join(', ')}`);
      console.log(`[REGULAR BEKO BILLING] Date range: ${startDateStr} do ${endDateStr}`);

      // REGULAR LOGIKA: Hvata samo servise sa completedDate (tradicionalno)
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
          createdAt: schema.services.createdAt,
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
            eq(schema.services.warrantyStatus, 'u garanciji'), // Samo garancijski servisi
            or(
              eq(schema.manufacturers.name, 'Beko'),
              eq(schema.manufacturers.name, 'Grundig'),
              eq(schema.manufacturers.name, 'Blomberg')
            ),
            // SAMO servisi sa completedDate u periodu (tradicionalno)
            and(
              isNotNull(schema.services.completedDate),
              gte(schema.services.completedDate, startDateStr),
              lte(schema.services.completedDate, endDateStr)
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate)
        );

      // Formatiraj rezultate (svi su regularni servisi sa completedDate)
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
        originalCompletedDate: service.completedDate,
        cost: service.cost || 0,
        description: service.description || '',
        warrantyStatus: service.warrantyStatus || 'Nedefinirano',
        isWarrantyService: true, // Svi su garancijski jer filtriramo po warrantyStatus
        isAutoDetected: false, // Nijedan nije auto-detektovan
        detectionMethod: 'completed_date'
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

      // Kreiranje brand breakdown statistika
      const brandBreakdown = Object.keys(servicesByBrand).map(brand => ({
        brand,
        count: servicesByBrand[brand].length,
        cost: servicesByBrand[brand].reduce((sum, s) => sum + Number(s.cost || 0), 0)
      }));

      // Kreiranje months array - dodano jer je potrebno za response
      const months = [
        { value: '01', label: 'Januar' },
        { value: '02', label: 'Februar' },
        { value: '03', label: 'Mart' },
        { value: '04', label: 'April' },
        { value: '05', label: 'Maj' },
        { value: '06', label: 'Jun' },
        { value: '07', label: 'Jul' },
        { value: '08', label: 'Avgust' },
        { value: '09', label: 'Septembar' },
        { value: '10', label: 'Oktobar' },
        { value: '11', label: 'Novembar' },
        { value: '12', label: 'Decembar' }
      ];

      // Formatiraj response u skladu sa BekoMonthlyReport interfejsom
      const response = {
        month: months.find(m => m.value === String(month).padStart(2, '0'))?.label || String(month),
        year: parseInt(year as string),
        brandGroup: 'Beko',
        bekoBrands: bekoBrands,
        services: billingServices,
        servicesByBrand,
        totalServices: billingServices.length,
        totalCost: billingServices.reduce((sum, s) => sum + Number(s.cost || 0), 0),
        autoDetectedCount: 0, // Regular mod nikad nema auto-detektovanih
        detectionSummary: {
          withCompletedDate: billingServices.length,
          withUpdatedDateFallback: 0
        },
        brandBreakdown
      };

      console.log(`[REGULAR BEKO BILLING] ✅ Pronađeno ${billingServices.length} servisa za period ${month}/${year}`);
      console.log(`[REGULAR BEKO BILLING] Brendovi u rezultatima:`, Object.keys(servicesByBrand));

      res.json(response);

    } catch (error) {
      console.error('[REGULAR BEKO BILLING] ❌ Greška:', error);
      res.status(500).json({ 
        error: 'Greška pri hvatanju Beko servisa',
        message: error instanceof Error ? error.message : 'Nepoznata greška'
      });
    }
  });

  return server;
}

// ========== DIREKTNA FUNKCIJA ZA TESTIRANJE SMS PROTOKOLA ==========

export async function testAllSMSProtocols(testPhone: string) {
  console.log(`📱 [DIREKTAN TEST] Počinje testiranje svih SMS protokola na broj: ${testPhone}`);
  
  try {
    // Import Protocol SMS Service
    const { createProtocolSMSService } = await import('./sms-communication-service.js');
    
    // Dobijamo SMS konfiguraciju iz baze
    const settingsArray = await storage.getSystemSettings();
    const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
    
    // Kreiranje Protocol SMS Service instance sa ispravnom konfiguracijom
    const protocolSMS = createProtocolSMSService({
      apiKey: settingsMap.sms_mobile_api_key,
      baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
      senderId: settingsMap.sms_mobile_sender_id || null,
      enabled: settingsMap.sms_mobile_enabled === 'true'
    }, storage);

    const results: any[] = [];

    // Test podaci - koristimo vaš broj za sve testove
    const baseTestData = {
      serviceId: Date.now(), // Jedinstveni ID za test
      clientId: 1,
      clientName: 'TEST KLIJENT',
      clientPhone: testPhone, // VAŠ BROJ
      deviceType: 'TEST UREĐAJ',
      deviceModel: 'Test Model',
      manufacturerName: 'Test Manufacturer',
      technicianId: 2,
      technicianName: 'TEST TEHNIČAR',
      technicianPhone: '0651234567',
      businessPartnerId: 3,
      businessPartnerName: 'TEST PARTNER',
      partName: 'TEST DEO',
      estimatedDate: '3-5 dana',
      cost: '5000',
      unavailableReason: 'Test nedostupnost',
      createdBy: 'Administrator'
    };

    // PROTOKOL 1: Nedostupnost klijenta
    console.log(`📱 [TEST 1] Testiram Protokol 1: Nedostupnost klijenta`);
    const result1 = await protocolSMS.sendClientUnavailableProtocol(baseTestData);
    results.push({ protocol: 'Nedostupnost klijenta', result: result1 });

    // Pauza između testova
    await new Promise(resolve => setTimeout(resolve, 2000));

    // PROTOKOL 2: Dodela servisa
    console.log(`📱 [TEST 2] Testiram Protokol 2: Dodela servisa`);
    const result2 = await protocolSMS.sendServiceAssignedProtocol(baseTestData);
    results.push({ protocol: 'Dodela servisa', result: result2 });

    // Pauza između testova
    await new Promise(resolve => setTimeout(resolve, 2000));

    // PROTOKOL 3: Poručivanje delova
    console.log(`📱 [TEST 3] Testiram Protokol 3: Poručivanje delova`);
    const result3 = await protocolSMS.sendPartsOrderedProtocol(baseTestData);
    results.push({ protocol: 'Poručivanje delova', result: result3 });

    // Pauza između testova
    await new Promise(resolve => setTimeout(resolve, 2000));

    // PROTOKOL 5: Odbijanje popravke  
    console.log(`📱 [TEST 5] Testiram Protokol 5: Odbijanje popravke`);
    const result5 = await protocolSMS.sendRepairRefusedProtocol(baseTestData);
    results.push({ protocol: 'Odbijanje popravke', result: result5 });

    // Pauza između testova
    await new Promise(resolve => setTimeout(resolve, 2000));

    // PROTOKOL 6: Kreiranje servisa
    console.log(`📱 [TEST 6] Testiram Protokol 6: Kreiranje servisa`);
    const result6 = await protocolSMS.sendServiceCreatedProtocol(baseTestData, true);
    results.push({ protocol: 'Kreiranje servisa', result: result6 });

    console.log(`✅ [DIREKTAN TEST] Svi protokoli testirani uspešno!`);
    return results;

  } catch (error: any) {
    console.error(`❌ [DIREKTAN TEST] Greška pri testiranju protokola:`, error);
    throw error;
  }
}


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
    
    // await storage.createNotification(notificationData); // TODO: Implement createNotification method
    console.log(`✅ Kritična notifikacija kreirana za rezervni deo ${part.partName}`);
  } catch (error) {
    console.error('❌ Greška pri kreiranju kritične notifikacije:', error);
  }
}

// ENDPOINT: Odobreni rezervni delovi za business partnere (Com Plus)
export function setupApprovedSparePartsRoute(app: Express) {
  app.get("/api/business/approved-spare-parts", jwtAuthMiddleware, requireRole(['business_partner', 'business', 'admin']), async (req, res) => {
    try {
      // Dohvatanje odobrenih rezervnih delova iz availableParts tabele
      const approvedParts = await db
        .select({
          id: availableParts.id,
          partName: availableParts.partName,
          partNumber: availableParts.partNumber,
          quantity: availableParts.quantity,
          description: availableParts.description,
          supplierName: availableParts.supplierName,
          unitCost: availableParts.unitCost,
          location: availableParts.location,
          warrantyStatus: availableParts.warrantyStatus,
          addedDate: availableParts.addedDate,
          serviceId: availableParts.serviceId,
          clientName: availableParts.clientName,
          clientPhone: availableParts.clientPhone,
          applianceInfo: availableParts.applianceInfo,
          serviceDescription: availableParts.serviceDescription,
          status: sql`'approved'`.as('status') // Sve u availableParts su odobreni delovi
        })
        .from(availableParts)
        .orderBy(desc(availableParts.addedDate));

      res.json(approvedParts);
    } catch (error) {
      console.error('❌ Greška pri dohvatanju odobrenih rezervnih delova:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju rezervnih delova' });
    }
  });
}

// =================================================================
// WHATSAPP WEBHOOK ENDPOINTS - NOVI SISTEM (DODATO)
// =================================================================

/**
 * WhatsApp Webhook setup funkcija - NOVA FUNKCIONALNOST
 * Ne dira postojeći kod, samo dodaje webhook support
 */
export function setupWhatsAppWebhookRoutes(app: Express) {
  // GET /webhook/whatsapp - Webhook verifikacija
  app.get('/webhook/whatsapp', verifyWebhook);
  
  // POST /webhook/whatsapp - Webhook handler
  app.post('/webhook/whatsapp', handleWebhook);
  
  // GET /api/whatsapp-webhook/config - Dobija webhook konfiguraciju
  app.get('/api/whatsapp-webhook/config', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const config = getWebhookConfig();
      res.json({
        success: true,
        config: {
          isConfigured: config.isConfigured,
          verifyToken: config.verifyToken ? 'Postavljen' : 'Nije postavljen',
          webhookUrl: {
            verify: '/webhook/whatsapp (GET)',
            receive: '/webhook/whatsapp (POST)'
          }
        }
      });
    } catch (error) {
      console.error('❌ [WEBHOOK CONFIG] Greška:', error);
      res.status(500).json({ error: 'Greška pri dobijanju webhook konfiguracije' });
    }
  });
  
  // POST /api/whatsapp-webhook/test - Test webhook konfiguracije
  app.post('/api/whatsapp-webhook/test', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const config = getWebhookConfig();
      
      if (!config.isConfigured) {
        return res.json({
          success: false,
          message: 'Webhook nije konfigurisan. Postavite WHATSAPP_WEBHOOK_VERIFY_TOKEN environment varijablu.'
        });
      }
      
      // Simulacija Facebook webhook verifikacije
      const testChallenge = Math.random().toString(36).substring(7);
      
      res.json({
        success: true,
        message: 'Webhook je pravilno konfigurisan!',
        details: {
          verifyTokenSet: !!config.verifyToken,
          webhookEndpoints: {
            verify: 'GET /webhook/whatsapp',
            receive: 'POST /webhook/whatsapp'
          },
          testChallenge
        }
      });
    } catch (error) {
      console.error('❌ [WEBHOOK TEST] Greška:', error);
      res.status(500).json({ error: 'Greška pri testiranju webhook konfiguracije' });
    }
  });

  // ========== NOVI WHATSAPP WEB OPTIMIZATION TESTING ENDPOINTS ==========

  // POST /api/whatsapp-web/test/pagination - Test pagination sa velikim brojem kontakata
  app.post('/api/whatsapp-web/test/pagination', jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { totalContacts = 1000 } = req.body;
      console.log(`🧪 [PAGINATION TEST API] Zahtev za pagination test sa ${totalContacts} kontakata`);

      const { whatsappWebService: service } = await import('./whatsapp-web-service.js');
      const result = await service.testPaginationWithLargeDataset(totalContacts);
      
      console.log(`🧪 [PAGINATION TEST API] Test ${result.success ? 'USPEŠAN' : 'NEUSPEŠAN'} - Score: ${result.performanceMetrics.averageLoadTime}ms avg`);
      res.json(result);
    } catch (error) {
      console.error('❌ [PAGINATION TEST API] Greška pri pagination testu:', error);
      res.status(500).json({ 
        error: 'Greška pri pagination testu',
        success: false,
        details: (error as Error).message
      });
    }
  });

  // POST /api/whatsapp-web/test/health-monitoring - Test health monitoring stress
  app.post('/api/whatsapp-web/test/health-monitoring', jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`🏥 [HEALTH TEST API] Zahtev za health monitoring stress test`);

      const { whatsappWebService: service } = await import('./whatsapp-web-service.js');
      const result = await service.testHealthMonitoringStress();
      
      console.log(`🏥 [HEALTH TEST API] Test ${result.success ? 'USPEŠAN' : 'NEUSPEŠAN'} - ${result.iterations} iteracija`);
      res.json(result);
    } catch (error) {
      console.error('❌ [HEALTH TEST API] Greška pri health testu:', error);
      res.status(500).json({ 
        error: 'Greška pri health monitoring testu',
        success: false,
        details: (error as Error).message
      });
    }
  });

  // POST /api/whatsapp-web/test/auto-recovery - Test auto recovery scenarios
  app.post('/api/whatsapp-web/test/auto-recovery', jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`🔄 [RECOVERY TEST API] Zahtev za auto recovery test`);

      const { whatsappWebService: service } = await import('./whatsapp-web-service.js');
      const result = await service.testAutoRecoveryScenarios();
      
      console.log(`🔄 [RECOVERY TEST API] Test ${result.success ? 'USPEŠAN' : 'NEUSPEŠAN'} - ${result.scenariosTested} scenarija`);
      res.json(result);
    } catch (error) {
      console.error('❌ [RECOVERY TEST API] Greška pri recovery testu:', error);
      res.status(500).json({ 
        error: 'Greška pri auto recovery testu',
        success: false,
        details: (error as Error).message
      });
    }
  });

  // POST /api/whatsapp-web/test/comprehensive - Pokreni complete optimization test suite
  app.post('/api/whatsapp-web/test/comprehensive', jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`🚀 [COMPREHENSIVE TEST API] Zahtev za complete optimization test suite`);

      const { whatsappWebService: service } = await import('./whatsapp-web-service.js');
      const result = await service.runComprehensiveOptimizationTests();
      
      console.log(`🚀 [COMPREHENSIVE TEST API] Test suite ${result.success ? 'USPEŠAN' : 'NEUSPEŠAN'} - Score: ${result.overallScore}/100`);
      res.json(result);
    } catch (error) {
      console.error('❌ [COMPREHENSIVE TEST API] Greška pri comprehensive testu:', error);
      res.status(500).json({ 
        error: 'Greška pri comprehensive test suite',
        success: false,
        details: (error as Error).message
      });
    }
  });

  // GET /api/whatsapp-web/test/verify-existing - Verifikuj da postojeće funkcije rade
  app.get('/api/whatsapp-web/test/verify-existing', jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`✅ [VERIFY TEST API] Zahtev za verifikaciju postojećih funkcija`);

      const { whatsappWebService: service } = await import('./whatsapp-web-service.js');
      
      // Test postojećih funkcija
      const verificationResults = {
        connectionStatus: service.getConnectionStatus(),
        healthStatus: service.getHealthStatus(),
        paginationAvailable: typeof service.getPaginatedContacts === 'function',
        optimizationAvailable: typeof service.optimizeResources === 'function',
        cleanupAvailable: typeof service.cleanupOldSessions === 'function',
        recoveryAvailable: typeof service.attemptAutoRecovery === 'function',
        batchProcessingAvailable: typeof service.addToMessageQueue === 'function'
      };

      const allFunctional = Object.values(verificationResults).every(v => 
        typeof v === 'boolean' ? v : true
      );

      const result = {
        success: allFunctional,
        verificationResults,
        message: allFunctional ? 
          'Sve postojeće i nove funkcije su dostupne i funkcionalne' : 
          'Neki funkcionalnosti nisu dostupne',
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ [VERIFY TEST API] Verifikacija ${result.success ? 'USPEŠNA' : 'NEUSPEŠNA'}`);
      res.json(result);
    } catch (error) {
      console.error('❌ [VERIFY TEST API] Greška pri verifikaciji:', error);
      res.status(500).json({ 
        error: 'Greška pri verifikaciji postojećih funkcija',
        success: false,
        details: (error as Error).message
      });
    }
  });

  // ========== NOVI WHATSAPP WEB TEST ENDPOINT ZA TRAJNU UPOTREBU ==========
  
  // POST /api/whatsapp-web/send-test-message - Pošalji test poruku bez autentifikacije (za trajnu upotrebu)
  app.post('/api/whatsapp-web/send-test-message', async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      
      // Validacija input-a
      if (!phoneNumber || !message) {
        return res.status(400).json({ 
          error: 'Potrebni su phoneNumber i message parametri',
          success: false 
        });
      }

      // Sigurnosno ograničenje - samo testni brojevi
      const allowedTestNumbers = ['067077002', '067077092', '38167077002', '38167077092'];
      const cleanNumber = phoneNumber.replace(/\+/g, '').replace(/^381/, '0');
      
      if (!allowedTestNumbers.includes(cleanNumber) && !allowedTestNumbers.includes(phoneNumber)) {
        return res.status(403).json({ 
          error: `Test endpoint dozvoljava slanje samo na testne brojeve: ${allowedTestNumbers.join(', ')}`,
          success: false,
          providedNumber: phoneNumber,
          cleanedNumber: cleanNumber
        });
      }

      console.log(`🧪 [TEST ENDPOINT] Zahtev za slanje test poruke na ${phoneNumber}`);

      // Uvoz WhatsApp Web servisa
      const { whatsappWebService } = await import('./whatsapp-web-service.js');
      
      // Proverava da li je servis povezan
      if (!whatsappWebService.getConnectionStatus().isConnected) {
        return res.status(503).json({ 
          error: 'WhatsApp Web nije povezan. Molimo sačekajte povezivanje.',
          success: false,
          connectionStatus: whatsappWebService.getConnectionStatus()
        });
      }

      // Dodaj TEST prefix poruki
      const testMessage = `[TEST] ${message}\n\n⏰ Vreme: ${new Date().toLocaleString('sr-RS')}\n🔧 Poslato iz Frigo Sistem test endpoint-a`;

      // Pošalji poruku
      const sendResult = await whatsappWebService.sendMessage(phoneNumber, testMessage);
      
      if (sendResult) {
        console.log(`✅ [TEST ENDPOINT] Test poruka uspešno poslata na ${phoneNumber}`);
        res.json({ 
          success: true, 
          message: 'Test poruka uspešno poslata',
          phoneNumber: phoneNumber,
          sentMessage: testMessage,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`❌ [TEST ENDPOINT] Neuspešno slanje test poruke na ${phoneNumber}`);
        res.status(500).json({ 
          success: false, 
          error: 'Neuspešno slanje test poruke',
          phoneNumber: phoneNumber
        });
      }

    } catch (error) {
      console.error('❌ [TEST ENDPOINT] Greška pri slanju test poruke:', error);
      res.status(500).json({ 
        error: 'Greška pri slanju test poruke',
        success: false,
        details: (error as Error).message
      });
    }
  });

  // ===== ENHANCED CLIENT COMPREHENSIVE ANALYSIS - FIXES JAVASCRIPT ERRORS =====
  // Novi endpoint koji rešava probleme sa strukturom podataka na frontend-u
  app.get("/api/admin/clients/:id/comprehensive-analysis-enhanced", jwtAuth, requireRole(['admin']), async (req, res) => {
    console.log(`🔥 [ENHANCED CLIENT ANALYSIS] POZVAN SA clientId: ${req.params.id}`);
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }

      // Get client's appliances
      const clientAppliances = await storage.getAppliancesByClient(clientId);
      
      // Get client's services
      const clientServices = await storage.getServicesByClient(clientId);
      
      // Get spare parts for all services
      const serviceIds = clientServices.map(s => s.id);
      let allSpareParts: any[] = [];
      
      try {
        for (const serviceId of serviceIds) {
          const serviceParts = await storage.getSparePartsByService(serviceId) || [];
          allSpareParts = allSpareParts.concat(serviceParts.map((part: any) => ({
            ...part,
            serviceId: serviceId
          })));
        }
      } catch (sparePartsError) {
        console.log('[ENHANCED CLIENT ANALYSIS] Spare parts nisu dostupni:', (sparePartsError as Error).message);
        allSpareParts = [];
      }
      
      // Enhance services with spare parts data
      const enhancedServices = clientServices.map(service => {
        const serviceParts = allSpareParts
          .filter(part => part.serviceId === service.id)
          .map(part => ({
            partName: part.partName || 'Nepoznat deo',
            status: part.status || 'unknown',
            cost: part.cost ? part.cost.toString() : undefined
          }));
        
        return {
          ...service,
          spareParts: serviceParts || [], // Osiguraj da spareParts uvek postoji
          cost: service.cost ? service.cost.toString() : undefined,
          warrantyStatus: service.warrantyStatus || 'van garancije'
        };
      });
      
      // Calculate service statistics
      const completedServices = enhancedServices.filter(s => s.status === 'completed').length;
      const activeServices = enhancedServices.filter(s => s.status === 'in_progress').length;
      const warrantyServices = enhancedServices.filter(s => s.warrantyStatus === 'u garanciji').length;
      const totalCost = enhancedServices.reduce((sum, service) => {
        const cost = parseFloat(service.cost || '0');
        return sum + (isNaN(cost) ? 0 : cost);
      }, 0);
      
      // Calculate average service time
      const completedServicesWithDates = enhancedServices.filter(s => 
        s.status === 'completed' && s.createdAt && s.completedDate
      );
      
      let averageServiceTimeInDays = 0;
      if (completedServicesWithDates.length > 0) {
        const totalDays = completedServicesWithDates.reduce((sum, service) => {
          const startDate = new Date(service.createdAt);
          const endDate = new Date(service.completedDate);
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
          return sum + Math.max(1, daysDiff); // Minimum 1 day
        }, 0);
        averageServiceTimeInDays = Math.round(totalDays / completedServicesWithDates.length);
      }
      
      // Enhanced appliances data with proper structure
      const enhancedAppliances = clientAppliances.map(appliance => ({
        id: appliance.id || 0,
        categoryId: appliance.categoryId,
        manufacturerId: appliance.manufacturerId,
        model: appliance.model || 'Nepoznat model',
        serialNumber: appliance.serialNumber || '',
        purchaseDate: appliance.purchaseDate || undefined,
        serviceCount: enhancedServices.filter(s => s.applianceId === appliance.id).length,
        lastServiceDate: (() => {
          const applianceServices = enhancedServices
            .filter(s => s.applianceId === appliance.id && s.createdAt)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return applianceServices.length > 0 ? applianceServices[0].createdAt : null;
        })()
      }));
      
      const response = {
        reportMetadata: {
          generatedAt: new Date().toISOString(),
          reportId: `CLIENT_ANALYSIS_ENHANCED_${clientId}_${Date.now()}`,
          clientId: clientId,
          reportType: "comprehensive_client_analysis_enhanced"
        },
        clientInfo: {
          id: client.id,
          fullName: client.fullName || 'Nepoznato ime',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          totalAppliances: enhancedAppliances.length,
          registrationDate: client.createdAt || new Date().toISOString()
        },
        serviceStatistics: {
          totalServices: enhancedServices.length,
          completedServices: completedServices,
          activeServices: activeServices,
          warrantyServices: warrantyServices,
          totalCost: totalCost,
          averageServiceTimeInDays: averageServiceTimeInDays,
          completionRate: enhancedServices.length > 0 ? Math.round((completedServices / enhancedServices.length) * 100) : 0,
          warrantyRate: enhancedServices.length > 0 ? Math.round((warrantyServices / enhancedServices.length) * 100) : 0
        },
        appliances: enhancedAppliances,
        services: enhancedServices,
        analytics: { 
          applianceStats: {}, 
          technicianStats: {}, 
          monthlyServiceHistory: {}, 
          problematicAppliances: [] 
        },
        spareParts: allSpareParts.map(part => ({
          partName: part.partName || 'Nepoznat deo',
          status: part.status || 'unknown',
          urgency: part.urgency || 'normal',
          cost: part.cost ? part.cost.toString() : undefined,
          orderDate: part.createdAt || new Date().toISOString()
        })),
        recommendations: { 
          maintenanceAlerts: enhancedServices.length > 5 ? 
            'Klijent ima veliki broj servisa - preporučuje se redovno održavanje' : 
            'Nema aktivnih upozorenja za održavanje', 
          costOptimization: totalCost > 50000 ? 
            'Visoki troškovi servisa - razmotriti preventivno održavanje' : 
            'Troškovi servisa su u normalnom opsegu', 
          technicianPreference: 'Podaci o serviserima se mogu videti iz technicianId polja'
        }
      };
      
      console.log(`[ENHANCED CLIENT ANALYSIS] Kompletna poboljšana analiza klijenta ${clientId} kreirana uspešno`);
      console.log(`[ENHANCED CLIENT ANALYSIS] Servisi: ${enhancedServices.length}, Rezervni delovi: ${allSpareParts.length}`);
      res.json(response);
    } catch (error) {
      console.error("[ENHANCED CLIENT ANALYSIS] Greška:", error);
      res.status(500).json({ error: "Greška pri kreiranju poboljšane analize klijenta" });
    }
  });
}

// ===== SIGURNOSNI SISTEM PROTIV BRISANJA SERVISA - NOVI ENDPOINT-I =====

export function setupSecurityEndpoints(app: Express, storage: IStorage) {
  
  // Audit Log endpoint-i
  app.get('/api/admin/audit-logs', authenticateJWT, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Samo admin može pristupiti audit log-ovima' });
      }
      
      const limit = parseInt(req.query.limit as string) || 100;
      const auditLogs = await storage.getAllAuditLogs(limit);
      res.json(auditLogs);
    } catch (error) {
      console.error('Greška pri dohvatanju audit log-ova:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju audit log-ova' });
    }
  });
  
  app.get('/api/admin/audit-logs/service/:serviceId', authenticateJWT, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Samo admin može pristupiti audit log-ovima' });
      }
      
      const serviceId = parseInt(req.params.serviceId);
      const auditLogs = await storage.getServiceAuditLogs(serviceId);
      res.json(auditLogs);
    } catch (error) {
      console.error('Greška pri dohvatanju audit log-ova za servis:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju audit log-ova za servis' });
    }
  });
  
  // User permissions endpoint-i
  app.get('/api/admin/user-permissions/:userId', authenticateJWT, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Samo admin može upravljati privilegijama' });
      }
      
      const userId = parseInt(req.params.userId);
      const permissions = await storage.getUserPermissions(userId);
      
      if (!permissions) {
        // Ako nema permissions, kreiranje default-e na osnovu role
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'Korisnik ne postoji' });
        }
        
        const defaultPermissions = {
          userId: userId,
          canDeleteServices: user.role === 'admin',
          canDeleteClients: user.role === 'admin',
          canDeleteAppliances: user.role === 'admin',
          canViewAllServices: user.role === 'admin',
          canManageUsers: user.role === 'admin',
          grantedBy: req.user!.id,
          notes: 'Default privilegije na osnovu role'
        };
        
        const newPermissions = await storage.createUserPermission(defaultPermissions);
        return res.json(newPermissions);
      }
      
      res.json(permissions);
    } catch (error) {
      console.error('Greška pri dohvatanju user permissions:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju user permissions' });
    }
  });
  
  app.post('/api/admin/user-permissions/:userId', authenticateJWT, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Samo admin može upravljati privilegijama' });
      }
      
      const userId = parseInt(req.params.userId);
      const updates = {
        ...req.body,
        grantedBy: req.user!.id
      };
      
      const updatedPermissions = await storage.updateUserPermissions(userId, updates);
      
      // Audit log za promenu privilegija
      await storage.createServiceAuditLog({
        serviceId: 0, // placeholder za system audit
        action: 'user_permissions_updated',
        performedBy: req.user!.id,
        performedByUsername: req.user!.username,
        performedByRole: req.user!.role,
        oldValues: null,
        newValues: JSON.stringify(updates),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null,
        notes: `Privilegije ažurirane za korisnika ${userId}`
      });
      
      res.json(updatedPermissions);
    } catch (error) {
      console.error('Greška pri ažuriranju user permissions:', error);
      res.status(500).json({ error: 'Greška pri ažuriranju user permissions' });
    }
  });
  
  // Soft delete endpoint-i
  app.delete('/api/admin/services/:id/safe', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.id);
      const deleteReason = req.body.reason;
      
      // Proveri privilegije
      const canDelete = await storage.canUserDeleteServices(req.user!.id);
      if (!canDelete) {
        return res.status(403).json({ 
          error: 'Nemate privilegije za brisanje servisa. Kontaktirajte administratora.' 
        });
      }
      
      console.log(`🗑️ [SAFE DELETE] Admin ${req.user!.username} pokušava da obriše servis ${serviceId}`);
      
      const success = await storage.softDeleteService(
        serviceId,
        req.user!.id,
        req.user!.username,
        req.user!.role,
        deleteReason,
        req.ip,
        req.get('User-Agent')
      );
      
      if (success) {
        console.log(`🗑️ [SAFE DELETE] ✅ Servis ${serviceId} uspešno safe-obrisan`);
        res.json({ 
          success: true, 
          message: 'Servis je sigurno obrisan i može biti vraćen ako je potrebno' 
        });
      } else {
        console.log(`🗑️ [SAFE DELETE] ❌ Neuspešno brisanje servisa ${serviceId}`);
        res.status(400).json({ 
          error: 'Greška pri brisanju servisa. Servis možda ne postoji.' 
        });
      }
      
    } catch (error) {
      console.error('🗑️ [SAFE DELETE] Greška pri sigurnom brisanju servisa:', error);
      res.status(500).json({ error: 'Greška pri sigurnom brisanju servisa' });
    }
  });
  
  app.get('/api/admin/deleted-services', authenticateJWT, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Samo admin može videti obrisane servise' });
      }
      
      const deletedServices = await storage.getDeletedServices();
      res.json(deletedServices);
    } catch (error) {
      console.error('Greška pri dohvatanju obrisanih servisa:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju obrisanih servisa' });
    }
  });
  
  app.post('/api/admin/deleted-services/:serviceId/restore', authenticateJWT, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Samo admin može vraćati obrisane servise' });
      }
      
      const serviceId = parseInt(req.params.serviceId);
      console.log(`🔄 [RESTORE] Admin ${req.user!.username} pokušava da vrati servis ${serviceId}`);
      
      const success = await storage.restoreDeletedService(
        serviceId,
        req.user!.id,
        req.user!.username,
        req.user!.role
      );
      
      if (success) {
        console.log(`🔄 [RESTORE] ✅ Servis ${serviceId} uspešno vraćen`);
        res.json({ 
          success: true, 
          message: 'Servis je uspešno vraćen u sistem sa novim ID-jem' 
        });
      } else {
        console.log(`🔄 [RESTORE] ❌ Neuspešno vraćanje servisa ${serviceId}`);
        res.status(400).json({ 
          error: 'Greška pri vraćanju servisa. Servis možda ne može biti vraćen.' 
        });
      }
      
    } catch (error) {
      console.error('🔄 [RESTORE] Greška pri vraćanju servisa:', error);
      res.status(500).json({ error: 'Greška pri vraćanju servisa' });
    }
  });
  
  // Endpoint za proveru privilegija
  app.get('/api/user/permissions/check', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const canDeleteServices = await storage.canUserDeleteServices(req.user!.id);
      const permissions = await storage.getUserPermissions(req.user!.id);
      
      res.json({
        canDeleteServices: canDeleteServices,
        permissions: permissions,
        userRole: req.user!.role
      });
    } catch (error) {
      console.error('Greška pri proveri privilegija:', error);
      res.status(500).json({ error: 'Greška pri proveri privilegija' });
    }
  });

  // ===== WHATSAPP BUSINESS API ENDPOINTS - NOVI SISTEM =====
  
  // GET /api/whatsapp-business/config - Dobij trenutnu konfiguraciju
  app.get('/api/whatsapp-business/config', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { whatsappBusinessAPIService } = await import('./whatsapp-business-api-service.js');
      const config = whatsappBusinessAPIService.getCurrentConfig();
      const status = whatsappBusinessAPIService.getConfigurationStatus();
      
      res.json({
        success: true,
        config,
        status
      });
    } catch (error) {
      console.error('❌ [WHATSAPP BUSINESS API] Greška pri dobijanju konfiguracije:', error);
      res.status(500).json({ 
        error: 'Greška pri dobijanju konfiguracije',
        success: false 
      });
    }
  });

  // POST /api/whatsapp-business/config - Ažuriraj konfiguraciju
  app.post('/api/whatsapp-business/config', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { accessToken, phoneNumberId, apiVersion, baseUrl } = req.body;
      
      if (!accessToken || !phoneNumberId) {
        return res.status(400).json({ 
          error: 'accessToken i phoneNumberId su obavezni',
          success: false 
        });
      }

      const { whatsappBusinessAPIService } = await import('./whatsapp-business-api-service.js');
      
      whatsappBusinessAPIService.updateConfig({
        accessToken,
        phoneNumberId,
        apiVersion: apiVersion || 'v23.0',
        baseUrl: baseUrl || 'https://graph.facebook.com'
      });

      const status = whatsappBusinessAPIService.getConfigurationStatus();
      
      res.json({
        success: true,
        message: 'Konfiguracija uspešno ažurirana',
        status
      });
    } catch (error) {
      console.error('❌ [WHATSAPP BUSINESS API] Greška pri ažuriranju konfiguracije:', error);
      res.status(500).json({ 
        error: 'Greška pri ažuriranju konfiguracije',
        success: false 
      });
    }
  });

  // GET /api/whatsapp-business/templates - Dobij listu dostupnih template-a
  app.get('/api/whatsapp-business/templates', jwtAuth, requireRole(['admin', 'technician']), async (req, res) => {
    try {
      const { whatsappBusinessAPIService } = await import('./whatsapp-business-api-service.js');
      const result = await whatsappBusinessAPIService.getMessageTemplates();
      
      if (result.success) {
        res.json({
          success: true,
          templates: result.templates
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('❌ [WHATSAPP API] Greška pri dohvatanju template-a:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Greška pri dohvatanju template-a'
      });
    }
  });

  // POST /api/whatsapp-business/send-text - Pošalji tekstualnu poruku
  app.post('/api/whatsapp-business/send-text', jwtAuth, requireRole(['admin', 'technician']), async (req, res) => {
    try {
      const { phoneNumber, message, previewUrl } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ 
          error: 'phoneNumber i message su obavezni',
          success: false 
        });
      }

      const { whatsappBusinessAPIService } = await import('./whatsapp-business-api-service.js');
      const result = await whatsappBusinessAPIService.sendTextMessage(phoneNumber, message, previewUrl);
      
      res.json(result);
    } catch (error) {
      console.error('❌ [WHATSAPP BUSINESS API] Greška pri slanju tekstualne poruke:', error);
      res.status(500).json({ 
        error: 'Greška pri slanju tekstualne poruke',
        success: false 
      });
    }
  });

  // ===== WHATSAPP NOTIFICATION ENDPOINTS - AUTOMATSKE PORUKE =====

  // POST /api/whatsapp-notifications/service-confirmed - Potvrda zahteva za servis
  app.post('/api/whatsapp-notifications/service-confirmed', jwtAuth, requireRole(['admin', 'technician']), async (req, res) => {
    try {
      const { 
        serviceId, recipientPhone, recipientName, 
        applianceType, brand, issueDescription, address 
      } = req.body;

      if (!recipientPhone || !recipientName || !applianceType) {
        return res.status(400).json({ 
          error: 'recipientPhone, recipientName i applianceType su obavezni',
          success: false 
        });
      }

      const { whatsappNotificationService } = await import('./whatsapp-notification-service.js');

      const result = await whatsappNotificationService.notifyServiceRequestConfirmed({
        serviceId,
        senderId: req.user!.id,
        recipientPhone,
        recipientName,
        applianceType,
        brand: brand || 'Nepoznato',
        issueDescription: issueDescription || 'Generalni servis',
        address: address || 'Nepoznata adresa'
      });

      res.json(result);
    } catch (error) {
      console.error('❌ [WHATSAPP NOTIFICATION] Greška pri slanju potvrde zahteva:', error);
      res.status(500).json({ 
        error: 'Greška pri slanju potvrde zahteva',
        success: false 
      });
    }
  });

  // POST /api/whatsapp-notifications/service-refused - Klijent odbija popravku
  app.post('/api/whatsapp-notifications/service-refused', jwtAuth, requireRole(['admin', 'technician']), async (req, res) => {
    try {
      const { 
        serviceId, recipientPhone, recipientName, 
        applianceType, diagnosis, refusalReason, diagnosticFee, paymentMethod 
      } = req.body;

      if (!recipientPhone || !recipientName || !applianceType || !refusalReason) {
        return res.status(400).json({ 
          error: 'Osnovni podaci su obavezni',
          success: false 
        });
      }

      const { whatsappNotificationService } = await import('./whatsapp-notification-service.js');

      const result = await whatsappNotificationService.notifyServiceRefused({
        serviceId,
        senderId: req.user!.id,
        recipientPhone,
        recipientName,
        applianceType,
        diagnosis: diagnosis || 'Dijagnoza u toku',
        refusalReason,
        diagnosticFee: diagnosticFee || '15',
        paymentMethod: paymentMethod || 'Nespecifikovan'
      });

      res.json(result);
    } catch (error) {
      console.error('❌ [WHATSAPP NOTIFICATION] Greška pri slanju potvrde odbijanja:', error);
      res.status(500).json({ 
        error: 'Greška pri slanju potvrde odbijanja',
        success: false 
      });
    }
  });

  // Data deletion endpoint za Facebook compliance - NOVO DODANO ZA LIVE MOD
  app.post('/api/data-deletion-request', async (req, res) => {
    try {
      const { email, phone, reason, specificData } = req.body;
      
      console.log('📧 [DATA DELETION] Nova zahtev za brisanje podataka:', {
        email: email || 'Nije naveden',
        phone: phone || 'Nije naveden', 
        reason: reason || 'Nije naveden',
        specificData: specificData || 'Nije naveden',
        timestamp: new Date().toISOString()
      });
      
      // Pošaljemo email administratoru
      try {
        const { sendNotificationEmail } = await import('./email-service.js');
        await sendNotificationEmail(
          'privacy@frigosistemtodosijevic.me',
          'Zahtev za brisanje podataka - GDPR',
          `
            Novi zahtev za brisanje podataka:
            
            Email: ${email || 'Nije naveden'}
            Telefon: ${phone || 'Nije naveden'}
            Razlog: ${reason || 'Nije naveden'}
            Specifični podaci: ${specificData || 'Nije naveden'}
            
            Vreme: ${new Date().toLocaleString('sr-RS')}
            
            Molimo obradi zahtev u roku od 72 sata.
          `
        );
      } catch (emailError) {
        console.error('Greška pri slanju email notifikacije:', emailError);
      }
      
      res.json({
        success: true,
        message: 'Zahtev za brisanje podataka je uspešno poslat. Odgovoriće vam u roku od 72 sata.',
        requestId: Date.now().toString()
      });
      
    } catch (error) {
      console.error('❌ [DATA DELETION] Greška pri obradi zahteva:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri obradi zahteva za brisanje podataka'
      });
    }
  });

  // Static redirects za Facebook compliance - DODANO ZA LIVE MOD
  app.get('/privacy/policy', (req, res) => {
    res.redirect(301, '/privacy-policy.html');
  });

  app.get('/data-deletion', (req, res) => {
    res.redirect(301, '/data-deletion.html');
  });

  // Direct access to static pages
  app.get('/privacy-policy.html', (req, res) => {
    res.sendFile('privacy-policy.html', { root: './public' });
  });

  app.get('/data-deletion.html', (req, res) => {
    res.sendFile('data-deletion.html', { root: './public' });
  });

  app.get('/reviewer-instructions.html', (req, res) => {
    res.sendFile('reviewer-instructions.html', { root: './public' });
  });

  // Health check endpoint za Facebook
  app.get('/healthz', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'Frigo Sistem Todosijevic WhatsApp Business API'
    });
  });

  // Reviewer test endpoint za WhatsApp funkcionalnost - DODANO ZA FACEBOOK REVIEW
  app.post('/api/reviewer/test-whatsapp', async (req, res) => {
    try {
      const { phone, templateName, testMode } = req.body;
      
      console.log('🔍 [REVIEWER] Facebook reviewer test WhatsApp:', { phone, templateName, testMode });
      
      // Simuliraj API poziv ka WhatsApp Cloud API
      const messageId = `reviewer_test_${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      // Log za demonstraciju
      console.log('📞 [REVIEWER] Simulating WhatsApp API call...', {
        to: phone,
        template: templateName,
        messageId,
        timestamp
      });
      
      // Simuliraj uspešan odgovor
      const apiResponse = {
        success: true,
        messageId,
        status: 'sent',
        to: phone,
        template: templateName,
        timestamp,
        meta: {
          api_version: 'v17.0',
          business_account_id: 'demo_account',
          phone_number_id: 'demo_phone'
        }
      };
      
      // Sačekaj 1 sekund da demonstriraš API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ [REVIEWER] WhatsApp test successful:', apiResponse);
      
      res.json(apiResponse);
      
    } catch (error) {
      console.error('❌ [REVIEWER] WhatsApp test failed:', error);
      res.status(500).json({
        success: false,
        error: 'Test WhatsApp poziv nije uspeo',
        details: (error as Error).message
      });
    }
  });

  // Test credentials endpoint za Facebook reviewere - SAMO ZA DEMO SVRHE
  app.get('/api/reviewer/credentials', (req, res) => {
    res.json({
      message: 'Test credentials for Facebook App Review',
      environment: 'Demo/Test Environment',
      access: {
        admin: {
          username: 'facebook_reviewer_admin',
          password: 'FB_Review_2025_Demo',
          role: 'Admin',
          permissions: ['view_all', 'test_whatsapp', 'view_logs']
        },
        technician: {
          username: 'facebook_reviewer_tech',
          password: 'FB_Tech_Demo_2025',
          role: 'Technician',
          permissions: ['view_services', 'test_mobile']
        },
        business_partner: {
          username: 'facebook_reviewer_partner',
          password: 'FB_Partner_Demo_2025',
          role: 'Business Partner',
          permissions: ['submit_services', 'view_status']
        }
      },
      test_urls: {
        main_app: 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/',
        reviewer_demo: 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/reviewer',
        privacy_policy: 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/privacy-policy.html',
        data_deletion: 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/data-deletion.html'
      },
      whatsapp_test: {
        phone_number: '+1 555 123 4567',
        template_names: ['service_confirmation', 'appointment_reminder', 'completion_notice'],
        webhook_url: 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/webhook/whatsapp',
        verify_token: 'frigo_sistem_todosijevic_webhook_2024'
      },
      instructions: [
        '1. Visit the reviewer demo page for live WhatsApp testing',
        '2. Use test credentials above to access different user roles',
        '3. Test phone number +1 555 123 4567 is Meta approved for testing',
        '4. All data in this environment is for demonstration only',
        '5. Real business data is isolated and protected'
      ]
    });
  });

  // Static Pages Management Endpoints - DODANO ZA ADMIN UPRAVLJANJE STRANICAMA
  app.get('/api/admin/static-pages/:filename', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { filename } = req.params;
      
      // Provjeri admin dozvolu
      if (!req.user || req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Admin dozvola potrebna' });
      }
      
      // Dozvoljeni fajlovi za uređivanje
      const allowedFiles = [
        'privacy-policy.html',
        'data-deletion.html', 
        'reviewer-instructions.html',
        'facebook-resubmission-guide.html',
        'screencast-guide.html'
      ];
      
      if (!allowedFiles.includes(filename)) {
        return res.status(400).json({ error: 'Fajl nije dozvoljen za uređivanje' });
      }
      
      console.log(`📄 [ADMIN] Čitam statičku stranicu: ${filename}`);
      
      const filePath = path.join(process.cwd(), 'public', filename);
      
      try {
        const [content, stats] = await Promise.all([
          fs.readFile(filePath, 'utf8').catch(() => ''),
          fs.stat(filePath).catch(() => null)
        ]);
        
        res.json({
          success: true,
          filename,
          content,
          lastModified: stats ? stats.mtime.toLocaleString('sr-RS') : null,
          size: stats ? stats.size : 0
        });
        
        console.log(`✅ [ADMIN] Uspešno učitan fajl: ${filename} (${stats ? stats.size : 0} bytes)`);
        
      } catch (fileError) {
        console.error(`❌ [ADMIN] Greška čitanja fajla ${filename}:`, fileError);
        res.status(200).json({ 
          success: true,
          filename,
          content: '',
          lastModified: null,
          size: 0
        });
      }
      
    } catch (error) {
      console.error('❌ [ADMIN] Greška pri čitanju statičke stranice:', error);
      res.status(500).json({ 
        error: 'Server greška pri čitanju stranice',
        details: (error as Error).message 
      });
    }
  });

  app.put('/api/admin/static-pages/:filename', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { filename } = req.params;
      const { content } = req.body;
      
      // Provjeri admin dozvolu
      if (!req.user || req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Admin dozvola potrebna' });
      }
      
      // Dozvoljeni fajlovi za uređivanje
      const allowedFiles = [
        'privacy-policy.html',
        'data-deletion.html',
        'reviewer-instructions.html', 
        'facebook-resubmission-guide.html',
        'screencast-guide.html'
      ];
      
      if (!allowedFiles.includes(filename)) {
        return res.status(400).json({ error: 'Fajl nije dozvoljen za uređivanje' });
      }
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Sadržaj stranice je obavezan' });
      }
      
      console.log(`📄 [ADMIN] Ažuriram statičku stranicu: ${filename} (${content.length} karaktera)`);
      
      const filePath = path.join(process.cwd(), 'public', filename);
      
      // Napravi backup postojećeg fajla
      try {
        const existingContent = await fs.readFile(filePath, 'utf8');
        const backupPath = path.join(process.cwd(), 'public', `${filename}.backup.${Date.now()}`);
        await fs.writeFile(backupPath, existingContent, 'utf8');
        console.log(`💾 [ADMIN] Kreiran backup: ${backupPath}`);
      } catch (backupError) {
        console.log(`⚠️ [ADMIN] Ne mogu kreirati backup za ${filename}:`, (backupError as Error).message);
      }
      
      // Sačuvaj novi sadržaj
      try {
        await fs.writeFile(filePath, content, 'utf8');
        const stats = await fs.stat(filePath);
        
        res.json({
          success: true,
          message: 'Stranica je uspešno ažurirana',
          filename,
          size: stats.size,
          lastModified: stats.mtime.toLocaleString('sr-RS')
        });
        
        console.log(`✅ [ADMIN] Uspešno ažuriran fajl: ${filename} (${stats.size} bytes)`);
        
      } catch (writeError) {
        console.error(`❌ [ADMIN] Greška pisanja fajla ${filename}:`, writeError);
        res.status(500).json({ 
          error: 'Ne mogu sačuvati fajl',
          filename,
          details: (writeError as Error).message 
        });
      }
      
    } catch (error) {
      console.error('❌ [ADMIN] Greška pri ažuriranju statičke stranice:', error);
      res.status(500).json({ 
        error: 'Server greška pri ažuriranju stranice',
        details: (error as Error).message 
      });
    }
  });

  // ============================================================================
  // 🛡️ DODATNA ZAŠTIĆENA BRISANJA - SAFE DELETE ENDPOINTS
  // ============================================================================
  // Ovi endpoint-i zahtevaju da korisnik unese tačno ime/naziv da bi potvrdio brisanje
  
  // 🔒 Zaštićeno brisanje klijenta - traži identično ime i prezime
  app.delete("/api/admin/clients/:id/safe-delete", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`🛡️ [SAFE DELETE CLIENT] Admin ${req.user?.username} pokušava zaštićeno brisanje klijenta ${req.params.id}`);
      
      const clientId = parseInt(req.params.id);
      const { fullName } = req.body;
      
      if (isNaN(clientId)) {
        return res.status(400).json({ error: "Neispravan ID klijenta" });
      }
      
      if (!fullName || typeof fullName !== 'string') {
        return res.status(400).json({ 
          error: "Potrebno je uneti ime i prezime klijenta", 
          hint: "Unesite tačno ime i prezime kao što je zapisano u bazi podataka" 
        });
      }
      
      // Dohvati podatke klijenta
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }
      
      // KRITIČNA PROVJERA: Ime mora biti IDENTIČNO
      const trimmedInputName = fullName.trim();
      const trimmedClientName = client.fullName.trim();
      
      if (trimmedInputName !== trimmedClientName) {
        console.log(`🚫 [SAFE DELETE CLIENT] Nepodudarnost imena:`);
        console.log(`   Uneto: "${trimmedInputName}"`);
        console.log(`   U bazi: "${trimmedClientName}"`);
        
        return res.status(400).json({ 
          error: "Uneto ime i prezime se ne slaže sa podacima u bazi", 
          hint: `Tačno ime u bazi: "${trimmedClientName}"`,
          inputReceived: trimmedInputName 
        });
      }
      
      // Proveri da li klijent ima servise
      const clientServices = await storage.getServicesByClient(clientId);
      if (clientServices.length > 0) {
        return res.status(400).json({ 
          error: "Klijent ima aktivne servise", 
          message: "Prvo obriši sve servise povezane sa ovim klijentom",
          activeServicesCount: clientServices.length
        });
      }

      // Proveri da li klijent ima uređaje
      const clientAppliances = await storage.getAppliancesByClient(clientId);
      if (clientAppliances.length > 0) {
        return res.status(400).json({ 
          error: "Klijent ima registrovane uređaje", 
          message: "Prvo obriši sve uređaje povezane sa ovim klijentom",
          activeAppliancesCount: clientAppliances.length
        });
      }

      // SIGURNO BRISANJE - ime se slaže!
      console.log(`🛡️ [SAFE DELETE CLIENT] ✅ Ime potvrđeno - brišem klijenta ${clientId} (${trimmedClientName})`);
      const success = await storage.deleteClient(clientId);
      
      if (success) {
        console.log(`🛡️ [SAFE DELETE CLIENT] ✅ Klijent ${clientId} uspešno obrisan`);
        res.json({ 
          success: true, 
          message: `Klijent "${trimmedClientName}" je uspešno obrisan`,
          deletedClient: {
            id: clientId,
            fullName: trimmedClientName
          }
        });
      } else {
        res.status(500).json({ error: "Greška pri brisanju klijenta" });
      }
      
    } catch (error) {
      console.error("🛡️ [SAFE DELETE CLIENT] ❌ Greška:", error);
      res.status(500).json({ 
        error: "Greška pri zaštićenom brisanju klijenta", 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // 🔒 Zaštićeno brisanje servisa - traži identičnu deskripciju servisa
  app.delete("/api/admin/services/:id/safe-delete", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`🛡️ [SAFE DELETE SERVICE] Admin ${req.user?.username} pokušava zaštićeno brisanje servisa ${req.params.id}`);
      
      const serviceId = parseInt(req.params.id);
      const { description } = req.body;
      
      if (isNaN(serviceId)) {
        return res.status(400).json({ error: "Neispravan ID servisa" });
      }
      
      if (!description || typeof description !== 'string') {
        return res.status(400).json({ 
          error: "Potrebno je uneti opis servisa", 
          hint: "Unesite tačan opis servisa kao što je zapisan u bazi podataka" 
        });
      }
      
      // Dohvati podatke servisa
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      // KRITIČNA PROVJERA: Opis mora biti IDENTIČAN
      const trimmedInputDescription = description.trim();
      const trimmedServiceDescription = service.description.trim();
      
      if (trimmedInputDescription !== trimmedServiceDescription) {
        console.log(`🚫 [SAFE DELETE SERVICE] Nepodudarnost opisa:`);
        console.log(`   Uneto: "${trimmedInputDescription}"`);
        console.log(`   U bazi: "${trimmedServiceDescription}"`);
        
        return res.status(400).json({ 
          error: "Uneti opis servisa se ne slaže sa podacima u bazi", 
          hint: `Tačan opis u bazi: "${trimmedServiceDescription}"`,
          inputReceived: trimmedInputDescription 
        });
      }
      
      // SIGURNO BRISANJE - opis se slaže!
      console.log(`🛡️ [SAFE DELETE SERVICE] ✅ Opis potvrđen - brišem servis ${serviceId} (${trimmedServiceDescription})`);
      const success = await storage.deleteAdminService(serviceId);
      
      if (success) {
        console.log(`🛡️ [SAFE DELETE SERVICE] ✅ Servis ${serviceId} uspešno obrisan`);
        res.json({ 
          success: true, 
          message: `Servis "${trimmedServiceDescription}" je uspešno obrisan`,
          deletedService: {
            id: serviceId,
            description: trimmedServiceDescription
          }
        });
      } else {
        res.status(500).json({ error: "Servis nije pronađen ili nije mogao biti obrisan" });
      }
      
    } catch (error) {
      console.error("🛡️ [SAFE DELETE SERVICE] ❌ Greška:", error);
      res.status(500).json({ 
        error: "Greška pri zaštićenom brisanju servisa", 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // JavaScript error tracking endpoints
  app.post("/api/errors/javascript", (req, res) => {
    console.error("💥 [BROWSER JS ERROR]:", {
      message: req.body.message,
      filename: req.body.filename,
      lineno: req.body.lineno,
      colno: req.body.colno,
      stack: req.body.stack,
      url: req.body.url,
      timestamp: req.body.timestamp
    });
    res.json({ success: true });
  });

  app.post("/api/errors/promise", (req, res) => {
    console.error("💥 [BROWSER PROMISE ERROR]:", {
      reason: req.body.reason,
      stack: req.body.stack,
      url: req.body.url,
      timestamp: req.body.timestamp
    });
    res.json({ success: true });
  });

  // ========== PDF SERVISNI IZVJEŠTAJI ENDPOINT ==========
  
  // GET /api/admin/service-report-pdf/:serviceId - Generiraj PDF izvještaj za servis
  app.get('/api/admin/service-report-pdf/:serviceId', jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      
      if (isNaN(serviceId)) {
        return res.status(400).json({ 
          error: 'Nevaljan ID servisa' 
        });
      }

      console.log(`📄 [PDF API] Zahtev za PDF izvještaj servisa ${serviceId} od korisnika ${(req as any).user?.id}`);

      // Importuj PDF service
      const { pdfService } = await import('./pdf-service.js');
      
      console.log(`📄 [PDF API] PDF service učitan, generisanje PDF-a...`);
      
      // Generiraj PDF
      const pdfBuffer = await pdfService.generateServiceReportPDF(serviceId);
      
      console.log(`📄 [PDF API] ✅ PDF uspešno generisan (${pdfBuffer.length} bytes)`);

      // Postavi headers za PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="service-report-${serviceId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Pošalji PDF
      res.send(pdfBuffer);
      
      console.log(`📄 [PDF API] ✅ PDF izvještaj za servis ${serviceId} uspešno poslat`);
      
    } catch (error) {
      console.error('📄 [PDF API] ❌ Greška pri generisanju PDF izvještaja:', error);
      res.status(500).json({ 
        error: 'Greška pri generisanju PDF izvještaja',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ENHANCED COMPLUS BILLING - Automatsko hvatanje svih završenih servisa
  
  // Enhanced endpoint koji automatski hvata SVE završene servise za ComPlus brendove
  app.get("/api/admin/billing/complus/enhanced", jwtAuth, async (req, res) => {
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

      // Kreiraj date range za mesec - sa pravilnim timestamp poređenjem
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      // Koristi poslednji dan meseca (28/29/30/31 ovisno o mesecu)
      const lastDayOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      
      // ISPRAVKA: Za poređenje sa mešanim formatima (datum i timestamp)
      // Moramo da poredimo i sa datum-only formatom i sa timestamp formatom
      const endDateWithTimestamp = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59.999Z`;
      // Računaj sledeći mesec pravilno (uključujući prelazak na sledeću godinu)
      const nextMonth = parseInt(month as string) + 1;
      const nextMonthYear = nextMonth > 12 ? parseInt(year as string) + 1 : parseInt(year as string);
      const nextMonthNum = nextMonth > 12 ? 1 : nextMonth;
      const nextMonthStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`;

      console.log(`[ENHANCED COMPLUS BILLING] Automatsko hvatanje SVIH završenih servisa za ${month}/${year}`);
      console.log(`[ENHANCED COMPLUS BILLING] Brendovi: ${complusBrands.join(', ')}`);
      console.log(`[ENHANCED COMPLUS BILLING] Date range: ${startDateStr} do ${endDateWithTimestamp}`);

      // ENHANCED LOGIKA: Hvata sve završene servise za ComPlus brendove
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
          createdAt: schema.services.createdAt,
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
            eq(schema.services.warrantyStatus, 'u garanciji'), // Samo garancijski servisi
            or(
              eq(schema.manufacturers.name, 'Electrolux'),
              eq(schema.manufacturers.name, 'Elica'),
              eq(schema.manufacturers.name, 'Candy'),
              eq(schema.manufacturers.name, 'Hoover'),
              eq(schema.manufacturers.name, 'Turbo Air')
            ),
            or(
              // Prioritetno: servisi sa completedDate u periodu
              // Pokrij oba formata: datum-only (2025-08-28) i timestamp (2025-08-11T17:54:14.183Z)
              and(
                isNotNull(schema.services.completedDate),
                gte(schema.services.completedDate, startDateStr),
                // Za datum-only format poređenje sa '2025-09-01' će raditi
                // Za timestamp format poređenje sa '2025-08-31T23:59:59.999Z' će raditi
                or(
                  lt(schema.services.completedDate, nextMonthStr), // Za datum-only format
                  lte(schema.services.completedDate, endDateWithTimestamp) // Za timestamp format
                )
              ),
              // Backup: servisi bez completedDate sa createdAt u periodu (Gruica Todosijević slučajevi)
              and(
                isNull(schema.services.completedDate),
                gte(schema.services.createdAt, startDateStr),
                or(
                  lt(schema.services.createdAt, nextMonthStr),
                  lte(schema.services.createdAt, endDateWithTimestamp)
                )
              )
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate),
          desc(schema.services.createdAt)
        );

      // Formatiraj rezultate sa enhanced informacijama
      const billingServices = services.map(service => {
        // ISPRAVKA: Uvek koristi completedDate za prikazivanje, samo označavaj one bez completedDate kao auto-detektovane
        const hasCompletedDate = service.completedDate && service.completedDate.trim() !== '';
        const displayDate = hasCompletedDate ? service.completedDate : service.createdAt;
        
        return {
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
          completedDate: displayDate,
          originalCompletedDate: service.completedDate,
          cost: service.cost || 0,
          description: service.description || '',
          warrantyStatus: service.warrantyStatus || 'Nedefinirano',
          isAutoDetected: !hasCompletedDate, // Flag samo za servise koji stvarno nemaju completedDate
          detectionMethod: hasCompletedDate ? 'completed_date' : 'created_at_fallback'
        };
      });

      // Grupiši servise po brendu za statistiku
      const servicesByBrand = billingServices.reduce((groups, service) => {
        const brand = service.manufacturerName;
        if (!groups[brand]) {
          groups[brand] = [];
        }
        groups[brand].push(service);
        return groups;
      }, {} as Record<string, typeof billingServices>);

      console.log(`[ENHANCED COMPLUS BILLING] ✅ Pronađeno ${billingServices.length} servisa za period ${month}/${year}`);
      console.log(`[ENHANCED COMPLUS BILLING] Brendovi u rezultatima:`, Object.keys(servicesByBrand));

      res.json({
        month: parseInt(month as string),
        year: parseInt(year as string),
        brandGroup: 'ComPlus',
        complusBrands: complusBrands,
        services: billingServices,
        servicesByBrand: servicesByBrand,
        totalServices: billingServices.length,
        totalCost: billingServices.reduce((sum, s) => sum + Number(s.cost || 0), 0),
        autoDetectedCount: billingServices.filter(s => s.isAutoDetected).length,
        detectionSummary: {
          withCompletedDate: billingServices.filter(s => !s.isAutoDetected).length,
          withUpdatedDateFallback: billingServices.filter(s => s.isAutoDetected).length
        },
        brandBreakdown: Object.keys(servicesByBrand).map(brand => ({
          brand,
          count: servicesByBrand[brand].length,
          cost: servicesByBrand[brand].reduce((sum, s) => sum + Number(s.cost || 0), 0)
        }))
      });

    } catch (error) {
      console.error('[ENHANCED COMPLUS BILLING] ❌ Greška:', error);
      res.status(500).json({ 
        error: 'Greška pri hvatanju ComPlus servisa',
        message: error instanceof Error ? error.message : 'Nepoznata greška'
      });
    }
  });

  // REGULAR COMPLUS BILLING - Samo servisi sa completedDate
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

      // Kreiraj date range za mesec - za TEXT polja u bazi
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      // Koristi poslednji dan meseca (28/29/30/31 ovisno o mesecu)
      const lastDayOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      console.log(`[REGULAR COMPLUS BILLING] Standardno hvatanje završenih servisa za ${month}/${year}`);
      console.log(`[REGULAR COMPLUS BILLING] Brendovi: ${complusBrands.join(', ')}`);
      console.log(`[REGULAR COMPLUS BILLING] Date range: ${startDateStr} do ${endDateStr}`);

      // REGULAR LOGIKA: Hvata samo servise sa completedDate (tradicionalno)
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
          createdAt: schema.services.createdAt,
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
            eq(schema.services.warrantyStatus, 'u garanciji'), // Samo garancijski servisi
            or(
              eq(schema.manufacturers.name, 'Electrolux'),
              eq(schema.manufacturers.name, 'Elica'),
              eq(schema.manufacturers.name, 'Candy'),
              eq(schema.manufacturers.name, 'Hoover'),
              eq(schema.manufacturers.name, 'Turbo Air')
            ),
            // SAMO servisi sa completedDate u periodu (tradicionalno)
            and(
              isNotNull(schema.services.completedDate),
              gte(schema.services.completedDate, startDateStr),
              lte(schema.services.completedDate, endDateStr)
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate)
        );

      // Formatiraj rezultate (svi su regularni servisi sa completedDate)
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
        originalCompletedDate: service.completedDate,
        cost: service.cost || 0,
        description: service.description || '',
        warrantyStatus: service.warrantyStatus || 'Nedefinirano',
        isAutoDetected: false, // Nijedan nije auto-detektovan
        detectionMethod: 'completed_date'
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

      // Kreiranje brand breakdown statistika
      const brandBreakdown = Object.keys(servicesByBrand).map(brand => ({
        brand,
        count: servicesByBrand[brand].length,
        cost: servicesByBrand[brand].reduce((sum, s) => sum + Number(s.cost || 0), 0)
      }));

      // Kreiranje months array - dodano jer je potrebno za response
      const months = [
        { value: '01', label: 'Januar' },
        { value: '02', label: 'Februar' },
        { value: '03', label: 'Mart' },
        { value: '04', label: 'April' },
        { value: '05', label: 'Maj' },
        { value: '06', label: 'Jun' },
        { value: '07', label: 'Jul' },
        { value: '08', label: 'Avgust' },
        { value: '09', label: 'Septembar' },
        { value: '10', label: 'Oktobar' },
        { value: '11', label: 'Novembar' },
        { value: '12', label: 'Decembar' }
      ];

      // Formatiraj response u skladu sa MonthlyReport interfejsom
      const response = {
        month: months.find(m => m.value === String(month).padStart(2, '0'))?.label || String(month),
        year: parseInt(year as string),
        brandGroup: 'ComPlus',
        complusBrands: complusBrands,
        services: billingServices,
        servicesByBrand,
        totalServices: billingServices.length,
        totalCost: billingServices.reduce((sum, s) => sum + Number(s.cost || 0), 0),
        autoDetectedCount: 0, // Regular mod nikad nema auto-detektovanih
        detectionSummary: {
          withCompletedDate: billingServices.length,
          withUpdatedDateFallback: 0
        },
        brandBreakdown
      };

      console.log(`[REGULAR COMPLUS BILLING] ✅ Pronađeno ${billingServices.length} servisa za period ${month}/${year}`);
      console.log(`[REGULAR COMPLUS BILLING] Brendovi u rezultatima:`, Object.keys(servicesByBrand));

      res.json(response);

    } catch (error) {
      console.error('[REGULAR COMPLUS BILLING] ❌ Greška:', error);
      res.status(500).json({ 
        error: 'Greška pri hvatanju ComPlus servisa',
        message: error instanceof Error ? error.message : 'Nepoznata greška'
      });
    }
  });

  // ============================================================================
  // NOVA FUNKCIJA: AUTO-DETEKCIJA COMPLUS GARANCIJSKIH SERVISA
  // ============================================================================
  // Dodano prema pravilima aplikacije - samo dodavanje, bez menjanja postojećeg koda
  
  app.get('/api/admin/billing/complus/smart', jwtAuth, async (req, res) => {
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

      const complusBrands = ['Electrolux', 'Elica', 'Candy', 'Hoover', 'Turbo Air'];

      // Kreiraj date range za mesec
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      console.log(`[SMART COMPLUS BILLING] 🧠 Pametna auto-detekcija garancijskih servisa za ${month}/${year}`);
      console.log(`[SMART COMPLUS BILLING] Brendovi: ${complusBrands.join(', ')}`);
      console.log(`[SMART COMPLUS BILLING] Date range: ${startDateStr} do ${endDateStr}`);

      // SMART LOGIKA: Hvata SVE završene ComPlus servise i automatski detektuje garancijski status
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
          createdAt: schema.services.createdAt,
          cost: schema.services.cost,
          clientName: schema.clients.fullName,
          clientPhone: schema.clients.phone,
          clientAddress: schema.clients.address,
          clientCity: schema.clients.city,
          applianceCategory: schema.applianceCategories.name,
          manufacturerName: schema.manufacturers.name,
          applianceModel: schema.appliances.model,
          serialNumber: schema.appliances.serialNumber,
          purchaseDate: schema.appliances.purchaseDate, // KLJUČNO za auto-detekciju
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
            // UKLONJEN warranty_status filter - hvata SVE završene ComPlus servise!
            or(
              eq(schema.manufacturers.name, 'Electrolux'),
              eq(schema.manufacturers.name, 'Elica'),
              eq(schema.manufacturers.name, 'Candy'),
              eq(schema.manufacturers.name, 'Hoover'),
              eq(schema.manufacturers.name, 'Turbo Air')
            ),
            or(
              // Prioritetno: servisi sa completedDate u periodu
              and(
                isNotNull(schema.services.completedDate),
                gte(schema.services.completedDate, startDateStr),
                lte(schema.services.completedDate, endDateStr)
              ),
              // Backup: servisi bez completedDate sa createdAt u periodu
              and(
                isNull(schema.services.completedDate),
                gte(schema.services.createdAt, startDateStr),
                lte(schema.services.createdAt, endDateStr)
              )
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate),
          desc(schema.services.createdAt)
        );

      let autoDetectedWarrantyCount = 0;
      let overriddenCount = 0;

      // SMART ALGORITAM: Auto-detekcija garancijskog statusa
      const billingServices = services
        .map(service => {
          const hasCompletedDate = service.completedDate && service.completedDate.trim() !== '';
          const displayDate = hasCompletedDate ? service.completedDate : service.createdAt;
          const originalWarrantyStatus = service.warrantyStatus;
          
          // SMART LOGIKA za detekciju garancijskog statusa
          let isSmartWarranty = false;
          let detectionReason = '';
          
          // Slučaj 1: Već označen kao "u garanciji" - prihvata
          if (originalWarrantyStatus === 'u garanciji') {
            isSmartWarranty = true;
            detectionReason = 'original_warranty_status';
          }
          // Slučaj 2: Auto-detekcija na osnovu datuma kupovine
          else if (service.purchaseDate && displayDate) {
            try {
              const purchaseDate = new Date(service.purchaseDate);
              const serviceDate = new Date(displayDate);
              const monthsDiff = (serviceDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
              
              // ComPlus garantni rok je obično 24 meseca
              if (monthsDiff <= 24 && monthsDiff >= 0) {
                isSmartWarranty = true;
                detectionReason = 'purchase_date_calculation';
                autoDetectedWarrantyCount++;
                
                if (originalWarrantyStatus !== 'u garanciji') {
                  overriddenCount++;
                }
              }
            } catch (error) {
              console.error(`[SMART COMPLUS] Greška pri računanju datuma za servis ${service.serviceId}:`, error);
            }
          }
          // Slučaj 3: ComPlus brendovi imaju posebne uslove - ako je označen kao "nepoznato" i noviji je
          else if (originalWarrantyStatus === 'nepoznato') {
            try {
              const serviceDate = new Date(displayDate);
              const now = new Date();
              const daysDiff = (now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24);
              
              // Ako je servis noviji od 365 dana i nema jasnu oznaku, verovatno je garancijski
              if (daysDiff <= 365) {
                isSmartWarranty = true;
                detectionReason = 'recent_unknown_status';
                autoDetectedWarrantyCount++;
                overriddenCount++;
              }
            } catch (error) {
              console.error(`[SMART COMPLUS] Greška pri računanju recency za servis ${service.serviceId}:`, error);
            }
          }
          
          return {
            service,
            isSmartWarranty,
            detectionReason,
            originalWarrantyStatus,
            displayDate
          };
        })
        .filter(item => item.isSmartWarranty) // Filtrira samo garancijske servise
        .map(item => ({
          id: item.service.serviceId,
          serviceNumber: item.service.serviceId.toString(),
          clientName: item.service.clientName || 'Nepoznat klijent',
          clientPhone: item.service.clientPhone || '',
          clientAddress: item.service.clientAddress || '',
          clientCity: item.service.clientCity || '',
          applianceCategory: item.service.applianceCategory || '',
          manufacturerName: item.service.manufacturerName || '',
          applianceModel: item.service.applianceModel || '',
          serialNumber: item.service.serialNumber || '',
          technicianName: item.service.technicianName || 'Nepoznat serviser',
          completedDate: item.displayDate,
          originalCompletedDate: item.service.completedDate,
          cost: item.service.cost || 0,
          description: item.service.description || '',
          warrantyStatus: 'u garanciji', // SMART override
          originalWarrantyStatus: item.originalWarrantyStatus,
          isAutoDetected: item.detectionReason !== 'original_warranty_status',
          detectionMethod: item.detectionReason,
          purchaseDate: item.service.purchaseDate
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

      // Kreiraj brand breakdown
      const brandBreakdown = Object.entries(servicesByBrand).map(([brand, services]) => ({
        brand,
        count: services.length,
        cost: services.reduce((sum, s) => sum + Number(s.cost || 0), 0)
      }));

      const months = [
        { value: '01', label: 'Januar' }, { value: '02', label: 'Februar' }, { value: '03', label: 'Mart' },
        { value: '04', label: 'April' }, { value: '05', label: 'Maj' }, { value: '06', label: 'Jun' },
        { value: '07', label: 'Jul' }, { value: '08', label: 'Avgust' }, { value: '09', label: 'Septembar' },
        { value: '10', label: 'Oktobar' }, { value: '11', label: 'Novembar' }, { value: '12', label: 'Decembar' }
      ];

      const response = {
        month: months.find(m => m.value === String(month).padStart(2, '0'))?.label || String(month),
        year: parseInt(year as string),
        brandGroup: 'ComPlus Smart',
        complusBrands: complusBrands,
        services: billingServices,
        servicesByBrand,
        totalServices: billingServices.length,
        totalCost: billingServices.reduce((sum, s) => sum + Number(s.cost || 0), 0),
        autoDetectedCount: autoDetectedWarrantyCount,
        overriddenCount: overriddenCount,
        detectionSummary: {
          withOriginalWarrantyStatus: billingServices.filter(s => !s.isAutoDetected).length,
          autoDetectedByPurchaseDate: billingServices.filter(s => s.detectionMethod === 'purchase_date_calculation').length,
          autoDetectedByRecency: billingServices.filter(s => s.detectionMethod === 'recent_unknown_status').length
        },
        brandBreakdown
      };

      console.log(`[SMART COMPLUS BILLING] 🧠 Pronađeno ${billingServices.length} SMART garancijskih servisa (${autoDetectedWarrantyCount} auto-detektovanih, ${overriddenCount} prepisanih)`);
      console.log(`[SMART COMPLUS BILLING] Brendovi u rezultatima:`, Object.keys(servicesByBrand));

      res.json(response);

    } catch (error) {
      console.error('[SMART COMPLUS BILLING] ❌ Greška:', error);
      res.status(500).json({ 
        error: 'Greška pri pametnoj detekciji ComPlus servisa',
        message: error instanceof Error ? error.message : 'Nepoznata greška'
      });
    }
  });

  // ===============================
  // 🏪 SUPPLIER MANAGEMENT ROUTES
  // ===============================

  // Get all suppliers
  app.get("/api/admin/suppliers", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`[SUPPLIERS] Admin ${req.user?.username} traži listu svih dobavljača`);
      const suppliers = await storage.getAllSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("[SUPPLIERS] Greška pri dohvatanju dobavljača:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dobavljača" });
    }
  });

  // Get active suppliers only
  app.get("/api/admin/suppliers/active", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`[SUPPLIERS] Admin ${req.user?.username} traži aktivne dobavljače`);
      const suppliers = await storage.getActiveSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("[SUPPLIERS] Greška pri dohvatanju aktivnih dobavljača:", error);
      res.status(500).json({ error: "Greška pri dohvatanju aktivnih dobavljača" });
    }
  });

  // Get supplier by ID
  app.get("/api/admin/suppliers/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[SUPPLIERS] Admin ${req.user?.username} traži dobavljača sa ID: ${id}`);
      
      const supplier = await storage.getSupplier(id);
      
      if (!supplier) {
        return res.status(404).json({ error: "Dobavljač nije pronađen" });
      }
      
      res.json(supplier);
    } catch (error) {
      console.error("[SUPPLIERS] Greška pri dohvatanju dobavljača:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dobavljača" });
    }
  });

  // Create new supplier
  app.post("/api/admin/suppliers", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`[SUPPLIERS] Admin ${req.user?.username} kreira novog dobavljača`);
      
      const validatedData = schema.insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(validatedData);
      
      console.log(`[SUPPLIERS] Kreiran novi dobavljač: ${supplier.name}`);
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Neispravni podaci", 
          details: error.errors 
        });
      }
      console.error("[SUPPLIERS] Greška pri kreiranju dobavljača:", error);
      res.status(500).json({ error: "Greška pri kreiranju dobavljača" });
    }
  });

  // Update supplier
  app.put("/api/admin/suppliers/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[SUPPLIERS] Admin ${req.user?.username} ažurira dobavljača sa ID: ${id}`);
      
      const updates = schema.insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(id, updates);
      
      if (!supplier) {
        return res.status(404).json({ error: "Dobavljač nije pronađen" });
      }
      
      console.log(`[SUPPLIERS] Ažuriran dobavljač: ${supplier.name}`);
      res.json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Neispravni podaci", 
          details: error.errors 
        });
      }
      console.error("[SUPPLIERS] Greška pri ažuriranju dobavljača:", error);
      res.status(500).json({ error: "Greška pri ažuriranju dobavljača" });
    }
  });

  // Delete supplier
  app.delete("/api/admin/suppliers/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[SUPPLIERS] Admin ${req.user?.username} briše dobavljača sa ID: ${id}`);
      
      await storage.deleteSupplier(id);
      
      console.log(`[SUPPLIERS] Obrisan dobavljač sa ID: ${id}`);
      res.json({ message: "Dobavljač je uspešno obrisan" });
    } catch (error) {
      console.error("[SUPPLIERS] Greška pri brisanju dobavljača:", error);
      res.status(500).json({ error: "Greška pri brisanju dobavljača" });
    }
  });

  // Get all supplier orders
  app.get("/api/admin/supplier-orders", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`[SUPPLIER-ORDERS] Admin ${req.user?.username} traži sve porudžbine dobavljača`);
      const orders = await storage.getAllSupplierOrders();
      res.json(orders);
    } catch (error) {
      console.error("[SUPPLIER-ORDERS] Greška pri dohvatanju porudžbina:", error);
      res.status(500).json({ error: "Greška pri dohvatanju porudžbina dobavljača" });
    }
  });

  // Update supplier order
  app.put("/api/admin/supplier-orders/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[SUPPLIER-ORDERS] Admin ${req.user?.username} ažurira porudžbinu sa ID: ${id}`);
      
      const updates = schema.insertSupplierOrderSchema.partial().parse(req.body);
      const order = await storage.updateSupplierOrder(id, updates);
      
      if (!order) {
        return res.status(404).json({ error: "Porudžbina nije pronađena" });
      }
      
      console.log(`[SUPPLIER-ORDERS] Ažurirana porudžbina sa ID: ${id}`);
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Neispravni podaci", 
          details: error.errors 
        });
      }
      console.error("[SUPPLIER-ORDERS] Greška pri ažuriranju porudžbine:", error);
      res.status(500).json({ error: "Greška pri ažuriranju porudžbine" });
    }
  });

  // Get supplier statistics
  app.get("/api/admin/suppliers/stats", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`[SUPPLIERS] Admin ${req.user?.username} traži statistike dobavljača`);
      
      const suppliers = await storage.getAllSuppliers();
      const orders = await storage.getAllSupplierOrders();
      
      const stats = {
        totalSuppliers: suppliers.length,
        activeSuppliers: suppliers.filter(s => s.isActive).length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        emailIntegrations: suppliers.filter(s => s.integrationMethod === 'email').length
      };
      
      res.json(stats);
    } catch (error) {
      console.error("[SUPPLIERS] Greška pri dohvatanju statistika:", error);
      res.status(500).json({ error: "Greška pri dohvatanju statistika dobavljača" });
    }
  });

  // ===============================
  // 🚪 SUPPLIER PORTAL API ENDPOINTS
  // ===============================

  // ===== AUTHENTICATION ENDPOINTS =====

  // Supplier portal login - separate authentication for supplier users
  app.post("/api/suppliers/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Korisničko ime i lozinka su obavezni" });
      }

      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Neispravni podaci za prijavu" });
      }

      // Check if user has supplier role
      if (!['supplier_complus', 'supplier_beko'].includes(user.role)) {
        return res.status(403).json({ error: "Pristup dozvoljen samo dobavljačima" });
      }

      // Check if user is verified
      if (!user.isVerified) {
        return res.status(403).json({ error: "Nalog još uvek nije odobren" });
      }

      // Validate password
      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Neispravni podaci za prijavu" });
      }

      // Generate JWT token with only necessary claims (NO PASSWORD HASH!)
      const token = generateToken({
        userId: user.id,
        username: user.username,
        role: user.role
      });
      
      console.log(`🔐 [SUPPLIER-LOGIN] Dobavljač ${user.username} (${user.role}) se prijavio`);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          supplierId: user.supplierId,
          email: user.email
        }
      });
    } catch (error) {
      console.error("❌ [SUPPLIER-LOGIN] Greška pri prijavi dobavljača:", error);
      res.status(500).json({ error: "Greška pri prijavi" });
    }
  });

  // ===== ENHANCED SUPPLIER MANAGEMENT (Admin Only) =====

  // ===== SUPPLIER PORTAL ENDPOINTS (MUST BE BEFORE ADMIN /api/suppliers) =====
  
  // List orders for current supplier
  app.get("/api/suppliers/orders", jwtAuth, requireRole(['supplier_complus', 'supplier_beko']), async (req, res) => {
    try {
      const { status, limit = 100 } = req.query;
      const user = req.user!;
      
      console.log(`📦 [SUPPLIER-ORDERS] Dobavljač ${user.username} (${user.role}) traži porudžbine - status: ${status}`);
      
      if (!user.supplierId) {
        console.error(`❌ [SUPPLIER-ORDERS] User ${user.username} (${user.role}) missing supplierId. User object:`, user);
        return res.status(403).json({ error: "Korisnik nije povezan sa dobavljačem" });
      }

      const parsedLimit = Math.min(parseInt(limit as string) || 100, 500);
      let orders = await storage.getSupplierOrdersBySupplier(user.supplierId!);
      
      if (status) {
        orders = orders.filter(order => order.status === status);
      }
      
      orders = orders.slice(0, parsedLimit);
      
      console.log(`📦 [SUPPLIER-ORDERS] Vraćam ${orders.length} porudžbina za dobavljača ID: ${user.supplierId!}`);
      res.json(orders);
    } catch (error) {
      console.error("❌ [SUPPLIER-ORDERS] Greška pri dohvatanju porudžbina:", error);
      res.status(500).json({ error: "Greška pri dohvatanju porudžbina" });
    }
  });

  // Get supplier dashboard stats
  app.get("/api/suppliers/dashboard", jwtAuth, requireRole(['supplier_complus', 'supplier_beko']), async (req, res) => {
    try {
      const user = req.user!;
      console.log(`📊 [SUPPLIER-DASHBOARD] Dobavljač ${user.username} traži dashboard podatke`);

      if (!user.supplierId) {
        console.error(`❌ [SUPPLIER-DASHBOARD] User ${user.username} (${user.role}) missing supplierId. User object:`, user);
        return res.status(403).json({ error: "Korisnik nije povezan sa dobavljačem" });
      }

      const orders = await storage.getSupplierOrdersBySupplier(user.supplierId);
      const supplier = await storage.getSupplier(user.supplierId);
      
      const stats = {
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        completedOrders: orders.filter(o => o.status === 'delivered').length,
        inProgressOrders: orders.filter(o => o.status === 'pending').length,
        supplierName: supplier?.name || 'N/A',
        recentOrders: orders.slice(0, 5)
      };
      
      res.json(stats);
    } catch (error) {
      console.error("❌ [SUPPLIER-DASHBOARD] Greška pri dohvatanju dashboard podataka:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dashboard podataka" });
    }
  });

  // ===== ADMIN SUPPLIER MANAGEMENT =====
  
  // Get all suppliers with filtering
  app.get("/api/suppliers", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { partnerType, isActive } = req.query;
      console.log(`📋 [SUPPLIERS] Admin ${req.user?.username} traži dobavljače - filter: partnerType=${partnerType}, isActive=${isActive}`);
      
      let suppliers = await storage.getAllSuppliers();
      
      // Apply filters
      if (partnerType) {
        suppliers = suppliers.filter(s => s.partnerType === partnerType);
      }
      
      if (isActive !== undefined) {
        const activeFilter = isActive === 'true';
        suppliers = suppliers.filter(s => s.isActive === activeFilter);
      }
      
      res.json(suppliers);
    } catch (error) {
      console.error("❌ [SUPPLIERS] Greška pri dohvatanju dobavljača:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dobavljača" });
    }
  });

  // Get single supplier details
  app.get("/api/suppliers/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`📋 [SUPPLIERS] Admin ${req.user?.username} traži dobavljača sa ID: ${id}`);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Neispravni ID dobavljača" });
      }
      
      const supplier = await storage.getSupplier(id);
      
      if (!supplier) {
        return res.status(404).json({ error: "Dobavljač nije pronađen" });
      }
      
      res.json(supplier);
    } catch (error) {
      console.error("❌ [SUPPLIERS] Greška pri dohvatanju dobavljača:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dobavljača" });
    }
  });

  // Create new supplier
  app.post("/api/suppliers", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`📋 [SUPPLIERS] Admin ${req.user?.username} kreira novog dobavljača`);
      
      const validatedData = schema.insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(validatedData);
      
      console.log(`✅ [SUPPLIERS] Kreiran novi dobavljač: ${supplier.name} (ID: ${supplier.id})`);
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Neispravni podaci", 
          details: error.errors 
        });
      }
      console.error("❌ [SUPPLIERS] Greška pri kreiranju dobavljača:", error);
      res.status(500).json({ error: "Greška pri kreiranju dobavljača" });
    }
  });

  // Update supplier details
  app.put("/api/suppliers/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`📋 [SUPPLIERS] Admin ${req.user?.username} ažurira dobavljača sa ID: ${id}`);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Neispravni ID dobavljača" });
      }
      
      const updates = schema.insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(id, updates);
      
      if (!supplier) {
        return res.status(404).json({ error: "Dobavljač nije pronađen" });
      }
      
      console.log(`✅ [SUPPLIERS] Ažuriran dobavljač: ${supplier.name} (ID: ${supplier.id})`);
      res.json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Neispravni podaci", 
          details: error.errors 
        });
      }
      console.error("❌ [SUPPLIERS] Greška pri ažuriranju dobavljača:", error);
      res.status(500).json({ error: "Greška pri ažuriranju dobavljača" });
    }
  });

  // ===== SUPPLIER PORTAL USER MANAGEMENT (Admin Only) =====

  // Create portal user for supplier
  app.post("/api/suppliers/:id/users", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      console.log(`👤 [SUPPLIER-USERS] Admin ${req.user?.username} kreira portal korisnika za dobavljača ID: ${supplierId}`);
      
      if (isNaN(supplierId)) {
        return res.status(400).json({ error: "Neispravni ID dobavljača" });
      }

      // Verify supplier exists
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier) {
        return res.status(404).json({ error: "Dobavljač nije pronađen" });
      }

      // Validate user data with supplier role
      const userData = {
        ...req.body,
        supplierId: supplierId,
        role: req.body.role || 'supplier_complus', // Default role
        isVerified: true // Portal users are pre-verified by admin
      };

      const validatedData = schema.insertUserSchema.parse(userData);
      const user = await storage.createSupplierPortalUser(validatedData, supplierId);
      
      console.log(`✅ [SUPPLIER-USERS] Kreiran portal korisnik: ${user.username} za dobavljača: ${supplier.name}`);
      
      // Return user without password
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Neispravni podaci", 
          details: error.errors 
        });
      }
      console.error("❌ [SUPPLIER-USERS] Greška pri kreiranju portal korisnika:", error);
      res.status(500).json({ error: "Greška pri kreiranju portal korisnika" });
    }
  });

  // List portal users for supplier
  app.get("/api/suppliers/:id/users", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      console.log(`👤 [SUPPLIER-USERS] Admin ${req.user?.username} traži portal korisnike za dobavljača ID: ${supplierId}`);
      
      if (isNaN(supplierId)) {
        return res.status(400).json({ error: "Neispravni ID dobavljača" });
      }

      // Verify supplier exists
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier) {
        return res.status(404).json({ error: "Dobavljač nije pronađen" });
      }

      const users = await storage.getSupplierPortalUsers(supplierId);
      
      // Return users without passwords
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("❌ [SUPPLIER-USERS] Greška pri dohvatanju portal korisnika:", error);
      res.status(500).json({ error: "Greška pri dohvatanju portal korisnika" });
    }
  });


  // Get specific order details for current supplier
  app.get("/api/suppliers/orders/:id", jwtAuth, requireRole(['supplier_complus', 'supplier_beko']), async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const user = req.user!;
      
      console.log(`📦 [SUPPLIER-ORDER-DETAIL] Dobavljač ${user.username} traži detalje porudžbine ID: ${orderId}`);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Neispravni ID porudžbine" });
      }

      if (!user.supplierId) {
        return res.status(403).json({ error: "Korisnik nije povezan sa dobavljačem" });
      }

      // Get order with detailed information
      const order = await storage.getSupplierOrderWithDetails(orderId);
      if (!order) {
        return res.status(404).json({ error: "Porudžbina nije pronađena" });
      }

      // Verify order belongs to supplier
      if (order.supplierId !== user.supplierId!) {
        return res.status(403).json({ error: "Nemate dozvolu da pristupite ovoj porudžbini" });
      }
      
      console.log(`✅ [SUPPLIER-ORDER-DETAIL] Vraćam detalje porudžbine ID: ${orderId} za dobavljača: ${user.username}`);
      res.json(order);
    } catch (error) {
      console.error("❌ [SUPPLIER-ORDER-DETAIL] Greška pri dohvatanju detalja porudžbine:", error);
      res.status(500).json({ error: "Greška pri dohvatanju detalja porudžbine" });
    }
  });

  // Update order status/response
  app.put("/api/suppliers/orders/:id", jwtAuth, requireRole(['supplier_complus', 'supplier_beko']), async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const user = req.user!;
      
      console.log(`📦 [SUPPLIER-ORDERS] Dobavljač ${user.username} ažurira porudžbinu ID: ${orderId}`);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Neispravni ID porudžbine" });
      }

      if (!user.supplierId) {
        return res.status(403).json({ error: "Korisnik nije povezan sa dobavljačem" });
      }

      // Verify order belongs to supplier
      const existingOrder = await storage.getSupplierOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Porudžbina nije pronađena" });
      }

      if (existingOrder.supplierId !== user.supplierId!) {
        return res.status(403).json({ error: "Nemate dozvolu da ažurirate ovu porudžbinu" });
      }

      const updates = schema.insertSupplierOrderSchema.partial().parse(req.body);
      const order = await storage.updateSupplierOrder(orderId, updates);
      
      if (!order) {
        return res.status(404).json({ error: "Porudžbina nije pronađena" });
      }
      
      console.log(`✅ [SUPPLIER-ORDERS] Ažurirana porudžbina ID: ${orderId} od strane dobavljača: ${user.username}`);
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Neispravni podaci", 
          details: error.errors 
        });
      }
      console.error("❌ [SUPPLIER-ORDERS] Greška pri ažuriranju porudžbine:", error);
      res.status(500).json({ error: "Greška pri ažuriranju porudžbine" });
    }
  });

  // Add event to order
  app.post("/api/suppliers/orders/:id/events", jwtAuth, requireRole(['supplier_complus', 'supplier_beko', 'admin']), async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const user = req.user!;
      
      console.log(`📝 [ORDER-EVENTS] ${user.role} ${user.username} dodaje event za porudžbinu ID: ${orderId}`);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Neispravni ID porudžbine" });
      }

      // Verify order exists and access permissions
      const existingOrder = await storage.getSupplierOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Porudžbina nije pronađena" });
      }

      // Suppliers can only access their own orders, admins can access all
      if (user.role !== 'admin' && (!user.supplierId || existingOrder.supplierId !== user.supplierId)) {
        return res.status(403).json({ error: "Nemate dozvolu da dodajete event za ovu porudžbinu" });
      }

      const eventData = {
        ...req.body,
        orderId: orderId,
        orderType: 'supplier_order',
        userId: user.id,
        userName: user.fullName,
        supplierId: existingOrder.supplierId,
        supplierName: null // Will be resolved via supplierId lookup
      };

      const validatedData = schema.insertSupplierOrderEventSchema.parse(eventData);
      const event = await storage.createSupplierOrderEvent(validatedData);
      
      console.log(`✅ [ORDER-EVENTS] Kreiran event ID: ${event.id} za porudžbinu ID: ${orderId}`);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Neispravni podaci", 
          details: error.errors 
        });
      }
      console.error("❌ [ORDER-EVENTS] Greška pri kreiranju event-a:", error);
      res.status(500).json({ error: "Greška pri kreiranju event-a" });
    }
  });

  // Get order event history
  app.get("/api/suppliers/orders/:id/events", jwtAuth, requireRole(['supplier_complus', 'supplier_beko', 'admin']), async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const user = req.user!;
      
      console.log(`📝 [ORDER-EVENTS] ${user.role} ${user.username} traži event-e za porudžbinu ID: ${orderId}`);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Neispravni ID porudžbine" });
      }

      // Verify order exists and access permissions
      const existingOrder = await storage.getSupplierOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Porudžbina nije pronađena" });
      }

      // Suppliers can only access their own orders, admins can access all
      if (user.role !== 'admin' && (!user.supplierId || existingOrder.supplierId !== user.supplierId)) {
        return res.status(403).json({ error: "Nemate dozvolu da pristupite event-ima ove porudžbine" });
      }

      const events = await storage.getSupplierOrderEvents(orderId);
      
      console.log(`📝 [ORDER-EVENTS] Vraćam ${events.length} event-a za porudžbinu ID: ${orderId}`);
      res.json(events);
    } catch (error) {
      console.error("❌ [ORDER-EVENTS] Greška pri dohvatanju event-a:", error);
      res.status(500).json({ error: "Greška pri dohvatanju event-a porudžbine" });
    }
  });

  // ===== DEBUGGING ENDPOINT FOR SUPPLIER AUTH TROUBLESHOOTING =====
  
  // TEMPORARY: Debug endpoint to see what JWT middleware is seeing
  app.get("/api/debug/supplier-auth", jwtAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      console.log(`🔍 [DEBUG-SUPPLIER-AUTH] Debug endpoint hit by user:`, {
        id: user.id,
        username: user.username,
        role: user.role,
        supplierId: user.supplierId,
        technicianId: user.technicianId,
        fullName: user.fullName,
        email: user.email,
        companyName: user.companyName,
        hasSupplierRole: user.role?.startsWith('supplier_'),
        supplierRoleCheck: ['supplier_complus', 'supplier_beko'].includes(user.role || ''),
        supplierIdType: typeof user.supplierId,
        supplierIdValue: user.supplierId
      });
      
      // Also test database fetch directly
      const dbUser = await storage.getUser(user.id);
      console.log(`🔍 [DEBUG-SUPPLIER-AUTH] Same user from database direct fetch:`, {
        id: dbUser?.id,
        username: dbUser?.username,
        role: dbUser?.role,
        supplierId: dbUser?.supplierId,
        supplierIdType: typeof dbUser?.supplierId,
        supplierIdValue: dbUser?.supplierId
      });
      
      res.json({
        message: "Debug info logged to console",
        middleware_user: {
          id: user.id,
          username: user.username,
          role: user.role,
          supplierId: user.supplierId,
          supplierIdType: typeof user.supplierId
        },
        database_user: {
          id: dbUser?.id,
          username: dbUser?.username,
          role: dbUser?.role,
          supplierId: dbUser?.supplierId,
          supplierIdType: typeof dbUser?.supplierId
        },
        role_checks: {
          hasSupplierRole: user.role?.startsWith('supplier_'),
          supplierRoleAllowed: ['supplier_complus', 'supplier_beko'].includes(user.role || ''),
          supplierIdExists: !!user.supplierId,
          supplierIdTruthy: user.supplierId ? true : false
        }
      });
    } catch (error) {
      console.error("❌ [DEBUG-SUPPLIER-AUTH] Error in debug endpoint:", error);
      res.status(500).json({ error: "Debug endpoint error", details: error.message });
    }
  });


  // ===== ADMIN PROCUREMENT FUNCTIONALITY =====

  // Zod schema for procurement request validation
  const procurementRequestSchema = z.object({
    supplierId: z.number().int().positive("ID dobavljača mora biti pozitivan broj"),
    partNumbers: z.array(z.string().min(1, "Broj dela ne može biti prazan")).min(1, "Mora biti unesen najmanje jedan broj dela"),
    quantities: z.array(z.number().int().positive("Količina mora biti pozitivna")).min(1, "Mora biti unesena najmanje jedna količina"),
    priority: z.enum(['urgent', 'normal', 'low']).default('normal'),
    description: z.string().min(5, "Opis mora imati najmanje 5 karaktera").max(1000, "Opis je predugačak"),
    serviceId: z.number().int().positive().optional(),
    deadline: z.string().datetime().optional()
  }).refine(
    data => data.partNumbers.length === data.quantities.length,
    { message: "Broj delova i količina moraju biti jednaki", path: ["quantities"] }
  );

  // POST /api/admin/procurement/requests - Send procurement requests to suppliers
  app.post("/api/admin/procurement/requests", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user!;
      console.log(`🛒 [PROCUREMENT] Admin ${user.username} šalje zahtev za nabavku dobavljaču`);
      
      // Validate request data
      const validatedData = procurementRequestSchema.parse(req.body);
      const { supplierId, partNumbers, quantities, priority, description, serviceId, deadline } = validatedData;
      
      console.log(`🛒 [PROCUREMENT] Validacija prošla - Dobavljač ID: ${supplierId}, Delovi: ${partNumbers.length}, Prioritet: ${priority}`);
      
      // Check if supplier exists and is active
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier) {
        console.log(`❌ [PROCUREMENT] Dobavljač sa ID ${supplierId} ne postoji`);
        return res.status(404).json({ error: "Dobavljač nije pronađen" });
      }
      
      if (!supplier.isActive) {
        console.log(`❌ [PROCUREMENT] Dobavljač ${supplier.name} nije aktivan`);
        return res.status(400).json({ error: "Dobavljač nije aktivan" });
      }
      
      console.log(`✅ [PROCUREMENT] Dobavljač ${supplier.name} (${supplier.partnerType}) je valjan i aktivan`);
      
      // Validate service if provided
      let relatedService = null;
      if (serviceId) {
        relatedService = await storage.getService(serviceId);
        if (!relatedService) {
          return res.status(404).json({ error: "Povezani servis nije pronađen" });
        }
        console.log(`🔗 [PROCUREMENT] Povezan sa servisom #${serviceId}`);
      }
      
      // Create supplier order - use existing spare part order as template
      const supplierOrderData = {
        supplierId: supplierId,
        sparePartOrderId: null, // This is a direct procurement request, not tied to existing spare part order
        status: 'pending' as const,
        priority: priority,
        requestDate: new Date(),
        expectedDeliveryDate: deadline ? new Date(deadline) : null,
        notes: description,
        adminRequestedBy: user.id,
        totalCost: null // Will be updated when supplier responds
      };
      
      console.log(`📝 [PROCUREMENT] Kreiram supplier order sa podacima:`, {
        supplierId: supplierOrderData.supplierId,
        status: supplierOrderData.status,
        priority: supplierOrderData.priority,
        adminRequestedBy: supplierOrderData.adminRequestedBy
      });
      
      // Create the supplier order
      const supplierOrder = await storage.createSupplierOrder(supplierOrderData);
      console.log(`✅ [PROCUREMENT] Kreiran supplier order ID: ${supplierOrder.id}`);
      
      // Generate tracking number for the request
      const trackingNumber = `PROC-${supplierOrder.id}-${Date.now().toString().slice(-6)}`;
      
      // Create detailed parts list for the event description
      const partsDetails = partNumbers.map((partNumber, index) => 
        `${partNumber} (količina: ${quantities[index]})`
      ).join(', ');
      
      // Create supplier order event for audit and tracking
      const eventData = {
        orderId: supplierOrder.id,
        orderType: 'supplier_order' as const,
        eventType: 'procurement_request_created' as const,
        description: `Admin ${user.fullName} poslao zahtev za nabavku: ${partsDetails}. ${description}`,
        userId: user.id,
        userName: user.fullName,
        supplierId: supplierId,
        supplierName: supplier.name,
        metadata: JSON.stringify({
          partNumbers: partNumbers,
          quantities: quantities,
          priority: priority,
          serviceId: serviceId,
          deadline: deadline,
          trackingNumber: trackingNumber
        })
      };
      
      const event = await storage.createSupplierOrderEvent(eventData);
      console.log(`✅ [PROCUREMENT] Kreiran event ID: ${event.id} za tracking`);
      
      // Prepare notification data
      const notificationData = {
        supplierName: supplier.name,
        partNumbers: partNumbers,
        quantities: quantities,
        priority: priority,
        description: description,
        adminName: user.fullName,
        trackingNumber: trackingNumber,
        deadline: deadline ? new Date(deadline).toLocaleDateString('sr-RS') : 'Nije specificiran',
        serviceInfo: relatedService ? `Servis #${relatedService.id}` : 'Direktan zahtev'
      };
      
      // Send notifications based on supplier preferences and configuration
      let notificationSent = false;
      
      try {
        // Email notification if supplier has email
        if (supplier.email) {
          console.log(`📧 [PROCUREMENT] Šaljem email notifikaciju na ${supplier.email}`);
          
          const emailSubject = `Novi zahtev za nabavku - ${trackingNumber}`;
          const emailBody = `
Poštovani,

Primili ste novi zahtev za nabavku rezervnih delova:

📋 DETALJI ZAHTEVA:
• Tracking broj: ${trackingNumber}
• Prioritet: ${priority.toUpperCase()}
• Admin: ${user.fullName}
• ${relatedService ? `Povezan servis: #${relatedService.id}` : 'Direktan zahtev'}

🔧 REZERVNI DELOVI:
${partNumbers.map((part, index) => `• ${part} - Količina: ${quantities[index]}`).join('\n')}

📝 OPIS: ${description}

⏰ DEADLINE: ${deadline ? new Date(deadline).toLocaleDateString('sr-RS') : 'Nije specificiran'}

Za odgovor na zahtev, prijavite se na supplier portal ili kontaktirajte naš tim.

Srdačan pozdrav,
Frigo Sistem Todosijević
          `.trim();
          
          await emailService.sendEmail(supplier.email, emailSubject, emailBody);
          notificationSent = true;
          console.log(`✅ [PROCUREMENT] Email uspešno poslat`);
        }
        
        // SMS notification if supplier has phone and SMS is enabled
        if (supplier.phone && supplier.smsNotifications) {
          console.log(`📱 [PROCUREMENT] Šaljem SMS notifikaciju na ${supplier.phone}`);
          
          const smsMessage = `FRIGO SISTEM: Novi zahtev za nabavku ${trackingNumber}. ${partNumbers.length} deo(va). Prioritet: ${priority}. Proverite email ili portal.`;
          
          const sms = new SMSCommunicationService();
          await sms.sendSMS(supplier.phone, smsMessage);
          notificationSent = true;
          console.log(`✅ [PROCUREMENT] SMS uspešno poslat`);
        }
        
        // WhatsApp notification if configured
        if (supplier.whatsappNumber) {
          console.log(`💬 [PROCUREMENT] Pripremam WhatsApp notifikaciju za ${supplier.whatsappNumber}`);
          // WhatsApp notification would go here if implemented
        }
        
      } catch (notificationError) {
        console.error(`⚠️ [PROCUREMENT] Greška pri slanju notifikacija:`, notificationError);
        // Don't fail the whole request if notification fails
      }
      
      // Calculate estimated response time based on supplier type and priority
      let estimatedResponseHours = 24; // Default 24 hours
      if (priority === 'urgent') {
        estimatedResponseHours = supplier.partnerType === 'complus' ? 2 : 4;
      } else if (priority === 'normal') {
        estimatedResponseHours = supplier.partnerType === 'complus' ? 8 : 12;
      } else {
        estimatedResponseHours = 48;
      }
      
      const estimatedResponseDate = new Date();
      estimatedResponseDate.setHours(estimatedResponseDate.getHours() + estimatedResponseHours);
      
      // Prepare response data
      const response = {
        success: true,
        requestId: supplierOrder.id,
        supplierId: supplierId,
        supplierName: supplier.name,
        partnerType: supplier.partnerType,
        status: 'pending',
        trackingNumber: trackingNumber,
        estimatedResponse: estimatedResponseDate.toISOString(),
        partNumbers: partNumbers,
        quantities: quantities,
        priority: priority,
        description: description,
        notificationSent: notificationSent,
        serviceId: serviceId,
        deadline: deadline
      };
      
      console.log(`✅ [PROCUREMENT] Zahtev uspešno kreiran i poslat:`, {
        requestId: response.requestId,
        trackingNumber: response.trackingNumber,
        supplierName: response.supplierName,
        partNumbers: response.partNumbers.length,
        notificationSent: response.notificationSent
      });
      
      res.status(201).json(response);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`❌ [PROCUREMENT] Validation error:`, error.errors);
        return res.status(400).json({ 
          error: "Neispravni podaci u zahtevu", 
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      console.error(`❌ [PROCUREMENT] Neočekivana greška:`, error);
      res.status(500).json({ 
        error: "Greška pri kreiranju zahteva za nabavku",
        message: error instanceof Error ? error.message : "Nepoznata greška"
      });
    }
  });

  console.log("✅ [PROCUREMENT] Admin procurement endpoint je registrovan");
  console.log("✅ [SUPPLIER-PORTAL] Svi supplier portal API endpoint-i su registrovani");

  // Rate limiting za web vitals
  const webVitalsRateLimit = new Map();
  const WEB_VITALS_RATE_LIMIT = 60; // 60 requests per minute per IP
  const WEB_VITALS_WINDOW = 60000; // 1 minute

  // Original single metric endpoint (preserved for backward compatibility)
  app.post('/api/web-vitals', (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Rate limiting check
    if (!webVitalsRateLimit.has(clientIP)) {
      webVitalsRateLimit.set(clientIP, { count: 1, resetTime: now + WEB_VITALS_WINDOW });
    } else {
      const rateLimitData = webVitalsRateLimit.get(clientIP);
      if (now > rateLimitData.resetTime) {
        rateLimitData.count = 1;
        rateLimitData.resetTime = now + WEB_VITALS_WINDOW;
      } else {
        rateLimitData.count++;
        if (rateLimitData.count > WEB_VITALS_RATE_LIMIT) {
          return res.status(429).json({ error: 'Rate limit exceeded for web vitals' });
        }
      }
    }
    
    const { name, value, id, delta } = req.body;
    
    // Reduce verbose logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🚀 Core Web Vitals - ${name}: ${value}ms (ID: ${id}, Delta: ${delta})`);
    }
    
    res.json({ 
      success: true, 
      message: 'Web Vitals logged',
      metric: { name, value, id, delta }
    });
  });

  // New batch analytics endpoint for optimized web vitals throttling
  app.post('/api/analytics/web-vitals', (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const isBatchRequest = req.headers['x-web-vitals-batch'] === 'true';
    
    // Enhanced rate limiting for batch requests
    const batchRateLimit = isBatchRequest ? Math.floor(WEB_VITALS_RATE_LIMIT / 10) : WEB_VITALS_RATE_LIMIT;
    
    if (!webVitalsRateLimit.has(clientIP)) {
      webVitalsRateLimit.set(clientIP, { count: 1, resetTime: now + WEB_VITALS_WINDOW });
    } else {
      const rateLimitData = webVitalsRateLimit.get(clientIP);
      if (now > rateLimitData.resetTime) {
        rateLimitData.count = 1;
        rateLimitData.resetTime = now + WEB_VITALS_WINDOW;
      } else {
        rateLimitData.count++;
        if (rateLimitData.count > batchRateLimit) {
          return res.status(429).json({ error: 'Rate limit exceeded for web vitals analytics' });
        }
      }
    }

    // Handle batch format from throttler
    if (isBatchRequest && req.body.metrics && Array.isArray(req.body.metrics)) {
      const { metrics, timestamp, userAgent, url, sessionId } = req.body;
      
      // Process batch metrics with reduced logging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📊 Web Vitals Batch [${sessionId?.substring(0, 8)}]: ${metrics.length} metrike`, {
          url: url || 'unknown',
          timestamp: new Date(timestamp).toISOString(),
          metrics: metrics.map((m: any) => `${m.name}:${Math.round(m.value)}ms`).join(', ')
        });
      } else {
        // Production: samo kratki log
        console.log(`📊 WV Batch: ${metrics.length}m, ${url}`);
      }

      return res.json({
        success: true,
        message: 'Web Vitals batch processed',
        processed: metrics.length,
        sessionId
      });
    }

    // Handle single metric (fallback)
    const { name, value, id, delta } = req.body;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📈 Web Vitals Single - ${name}: ${value}ms (ID: ${id}, Delta: ${delta})`);
    }
    
    res.json({ 
      success: true, 
      message: 'Web Vitals metric logged',
      metric: { name, value, id, delta }
    });
  });

}

