import express from 'express';
import { jwtAuth, requireRole } from './jwt-auth.js';
import { webScrapingService } from './web-scraping-service.js';
import { storage } from './storage.js';

// Web scraping admin routes
export function setupWebScrapingRoutes(app: express.Application) {
  
  // ===== WEB SCRAPING MANAGEMENT ENDPOINTS =====
  
  // Get scraping sources
  app.get("/api/admin/web-scraping/sources", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const sources = await storage.getScrapingSources();
      res.json(sources);
    } catch (error) {
      console.error("Error fetching scraping sources:", error);
      res.status(500).json({ error: "Greška pri dohvatanju izvora za scraping" });
    }
  });

  // Create scraping source
  app.post("/api/admin/web-scraping/sources", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, baseUrl, scrapingConfig, isActive } = req.body;
      
      if (!name || !baseUrl) {
        return res.status(400).json({ error: "Naziv i osnovna URL su obavezni" });
      }

      const source = await storage.createScrapingSource({
        name,
        baseUrl,
        scrapingConfig: scrapingConfig ? JSON.stringify(scrapingConfig) : null,
        isActive: isActive !== false
      });

      res.status(201).json(source);
    } catch (error) {
      console.error("Error creating scraping source:", error);
      res.status(500).json({ error: "Greška pri kreiranju izvora za scraping" });
    }
  });

  // Update scraping source
  app.put("/api/admin/web-scraping/sources/:id", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (updates.scrapingConfig) {
        updates.scrapingConfig = JSON.stringify(updates.scrapingConfig);
      }

      const updatedSource = await storage.updateScrapingSource(parseInt(id), updates);
      
      if (!updatedSource) {
        return res.status(404).json({ error: "Izvor za scraping nije pronađen" });
      }

      res.json(updatedSource);
    } catch (error) {
      console.error("Error updating scraping source:", error);
      res.status(500).json({ error: "Greška pri ažuriranju izvora za scraping" });
    }
  });

  // Get scraping logs
  app.get("/api/admin/web-scraping/logs", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { sourceId } = req.query;
      const logs = await storage.getScrapingLogs(sourceId ? parseInt(sourceId as string) : undefined);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching scraping logs:", error);
      res.status(500).json({ error: "Greška pri dohvatanju logova scraping-a" });
    }
  });

  // Get scraping queue
  app.get("/api/admin/web-scraping/queue", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const queue = await storage.getScrapingQueue();
      res.json(queue);
    } catch (error) {
      console.error("Error fetching scraping queue:", error);
      res.status(500).json({ error: "Greška pri dohvatanju reda za scraping" });
    }
  });

  // Add item to scraping queue
  app.post("/api/admin/web-scraping/queue", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { sourceId, priority, maxPages, targetCategories, targetManufacturers, scheduledTime } = req.body;
      
      if (!sourceId) {
        return res.status(400).json({ error: "ID izvora je obavezan" });
      }

      const queueItem = await storage.createScrapingQueueItem({
        sourceId: parseInt(sourceId),
        priority: priority || 1,
        maxPages: maxPages || 100,
        targetCategories: targetCategories || [],
        targetManufacturers: targetManufacturers || ['Candy', 'Beko', 'Electrolux', 'Hoover'],
        scheduledTime: scheduledTime ? new Date(scheduledTime) : new Date(),
        createdBy: req.user?.id
      });

      res.status(201).json(queueItem);
    } catch (error) {
      console.error("Error adding to scraping queue:", error);
      res.status(500).json({ error: "Greška pri dodavanju u red za scraping" });
    }
  });

  // ===== SCRAPING EXECUTION ENDPOINTS =====

  // GET endpoint za testiranje scraping-a
  app.get("/api/web-scraping/scrape", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      console.log(`🚀 GET API endpoint /api/web-scraping/scrape pozvan od strane user-a: ${req.user?.fullName || 'Nepoznat'}`);
      
      console.log(`🚀 Admin ${req.user?.fullName} pokrenuo direktan scraping test...`);
      
      const result = await webScrapingService.scrapeQuinnspares(
        2, // maxPages
        ['Beko', 'Candy', 'Electrolux', 'Hoover'] // svi proizvođači
      );

      console.log(`✅ Scraping rezultat:`, result);

      return res.json({
        success: result.success,
        message: `Scraping test završen`,
        scrapedParts: [],
        addedParts: [],
        duplicates: [],
        errors: result.errors || [],
        duration: result.duration,
        newParts: result.newParts,
        updatedParts: result.updatedParts
      });
      
    } catch (error) {
      console.error("❌ Error in GET scraping test:", error);
      return res.status(500).json({ 
        error: "Greška pri GET scraping testu: " + error.message,
        success: false,
        newParts: 0,
        updatedParts: 0,
        errors: [error.message]
      });
    }
  });

  // Direct scraping endpoint for custom configurations
  app.post("/api/web-scraping/scrape", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      console.log(`🚀 API endpoint /api/web-scraping/scrape pozvan od strane user-a: ${req.user?.fullName || 'Nepoznat'}`);
      console.log(`📋 Request body:`, req.body);
      
      const { manufacturer, urls, maxPages, maxItems } = req.body;
      
      // Modificirana validacija - ne zahtevamo urls jer scrapeQuinnspares ima svoju logiku
      if (!manufacturer) {
        console.log("❌ Nedostaje proizvođač u request-u");
        return res.status(400).json({ error: "Proizvođač je obavezan" });
      }

      console.log(`🚀 Admin ${req.user?.fullName} pokrenuo direktan scraping za ${manufacturer}...`);
      
      const result = await webScrapingService.scrapeQuinnspares(
        maxPages || 2, 
        [manufacturer]
      );

      console.log(`✅ Scraping rezultat:`, result);

      return res.json({
        success: true,
        message: `Scraping za ${manufacturer} završen`,
        scrapedParts: [],
        addedParts: [],
        duplicates: [],
        errors: result.errors || [],
        duration: result.duration,
        newParts: result.newParts,
        updatedParts: result.updatedParts
      });
      
    } catch (error) {
      console.error("❌ Error in direct scraping:", error);
      return res.status(500).json({ error: "Greška pri direktnom scraping-u: " + error.message });
    }
  });

  // Start scraping for specific source
  app.post("/api/admin/web-scraping/sources/:id/scrape", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { maxPages, targetManufacturers } = req.body;
      
      console.log(`🚀 Admin ${req.user?.fullName} pokrenuo scraping za source ${id}...`);
      
      // Kreiraj log zapis
      const logEntry = await storage.createScrapingLog({
        sourceId: parseInt(id),
        status: 'started',
        totalPages: maxPages || 50,
        createdBy: req.user?.id
      });

      // Pokreni scraping u pozadini
      webScrapingService.scrapeQuinnspares(
        maxPages || 50, 
        targetManufacturers || ['Candy', 'Beko', 'Electrolux', 'Hoover']
      ).then(async (result) => {
        // Ažuriraj log sa rezultatima
        await storage.updateScrapingLog(logEntry.id, {
          status: result.success ? 'completed' : 'failed',
          endTime: new Date(),
          newParts: result.newParts,
          updatedParts: result.updatedParts,
          duration: result.duration,
          errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null
        });
        
        console.log(`✅ Source ${id} scraping završen: ${result.newParts} novih, ${result.updatedParts} ažuriranih`);
      }).catch(async (error) => {
        console.error(`❌ Greška u source ${id} scraping:`, error);
        await storage.updateScrapingLog(logEntry.id, {
          status: 'failed',
          endTime: new Date(),
          errors: JSON.stringify([error.message])
        });
      });

      res.json({
        message: `Scraping za source ${id} je pokrenuta u pozadini`,
        logId: logEntry.id,
        status: 'started'
      });
      
    } catch (error) {
      console.error("Error starting source scraping:", error);
      res.status(500).json({ error: "Greška pri pokretanju scraping-a" });
    }
  });

  // Start manual scraping for Quinnspares
  app.post("/api/admin/web-scraping/start-quinnspares", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { maxPages, targetManufacturers } = req.body;
      
      console.log(`🚀 Admin ${req.user?.fullName} pokrenuo Quinnspares scraping...`);
      
      // Kreiraj log zapis
      const logEntry = await storage.createScrapingLog({
        sourceId: 1, // Pretpostavljamo da je Quinnspares ID 1
        status: 'started',
        totalPages: maxPages || 50,
        createdBy: req.user?.id
      });

      // Pokreni scraping u pozadini
      webScrapingService.scrapeQuinnspares(
        maxPages || 50, 
        targetManufacturers || ['Candy', 'Beko', 'Electrolux', 'Hoover']
      ).then(async (result) => {
        // Ažuriraj log sa rezultatima
        await storage.updateScrapingLog(logEntry.id, {
          status: result.success ? 'completed' : 'failed',
          endTime: new Date(),
          newParts: result.newParts,
          updatedParts: result.updatedParts,
          duration: result.duration,
          errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null
        });
        
        console.log(`✅ Quinnspares scraping završen: ${result.newParts} novih, ${result.updatedParts} ažuriranih`);
      }).catch(async (error) => {
        console.error("❌ Greška u Quinnspares scraping:", error);
        await storage.updateScrapingLog(logEntry.id, {
          status: 'failed',
          endTime: new Date(),
          errors: JSON.stringify([error.message])
        });
      });

      res.json({
        message: "Quinnspares scraping je pokrenuta u pozadini",
        logId: logEntry.id
      });
      
    } catch (error) {
      console.error("Error starting Quinnspares scraping:", error);
      res.status(500).json({ error: "Greška pri pokretanju Quinnspares scraping-a" });
    }
  });

  // Start full scraping (all sources)
  app.post("/api/admin/web-scraping/start-full", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      console.log(`🚀 Admin ${req.user?.fullName} pokrenuo potpun web scraping...`);
      
      // Kreiraj log zapis
      const logEntry = await storage.createScrapingLog({
        sourceId: 1, // General entry
        status: 'started',
        totalPages: 200, // Ukupno za sve izvore
        createdBy: req.user?.id
      });

      // Pokreni potpun scraping u pozadini
      webScrapingService.runFullScraping().then(async (result) => {
        await storage.updateScrapingLog(logEntry.id, {
          status: result.success ? 'completed' : 'partial',
          endTime: new Date(),
          newParts: result.newParts,
          updatedParts: result.updatedParts,
          duration: result.duration,
          errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null
        });
        
        console.log(`✅ Potpun scraping završen: ${result.newParts} novih, ${result.updatedParts} ažuriranih`);
      }).catch(async (error) => {
        console.error("❌ Greška u potpunom scraping:", error);
        await storage.updateScrapingLog(logEntry.id, {
          status: 'failed',
          endTime: new Date(),
          errors: JSON.stringify([error.message])
        });
      });

      res.json({
        message: "Potpun web scraping je pokrenuta u pozadini",
        logId: logEntry.id
      });
      
    } catch (error) {
      console.error("Error starting full scraping:", error);
      res.status(500).json({ error: "Greška pri pokretanju potpunog web scraping-a" });
    }
  });

  // Get scraping status
  app.get("/api/admin/web-scraping/status/:logId", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { logId } = req.params;
      const logs = await storage.getScrapingLogs();
      const log = logs.find(l => l.id === parseInt(logId));
      
      if (!log) {
        return res.status(404).json({ error: "Log scraping-a nije pronađen" });
      }

      res.json(log);
    } catch (error) {
      console.error("Error fetching scraping status:", error);
      res.status(500).json({ error: "Greška pri dohvatanju statusa scraping-a" });
    }
  });
}