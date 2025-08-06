import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertClientSchema, insertServiceSchema, insertApplianceSchema } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import { emailService } from "./email-service";
// SMS service import removed
// SMS functionality has been removed
import { NotificationService } from "./notification-service";
import { jwtAuth, requireRole } from "./jwt-auth";

export function registerBusinessPartnerRoutes(app: Express) {
  // JWT middleware za business partner autentifikaciju (admin ima puni pristup)
  const businessPartnerAuth = [jwtAuth, requireRole(['business_partner', 'business', 'admin'])];

  // Dobijanje servisa za poslovnog partnera
  app.get("/api/business/services", businessPartnerAuth, async (req, res) => {
    try {
      const partnerId = req.user!.id;
      
      // Dobijanje servisa za konkretnog poslovnog partnera
      const services = await storage.getServicesByPartner(partnerId);
      
      res.json(services);
    } catch (error) {
      console.error("Greška pri dobijanju servisa za poslovnog partnera:", error);
      res.status(500).json({ 
        error: "Greška servera", 
        message: "Došlo je do greške pri dobijanju servisa. Pokušajte ponovo kasnije." 
      });
    }
  });

  // Kreiranje novog servisa od strane poslovnog partnera
  app.post("/api/business/services", businessPartnerAuth, async (req, res) => {
    try {
      console.log("=== KREIRANJE SERVISA OD STRANE POSLOVNOG PARTNERA ===");
      console.log("Podaci iz frontend forme:", req.body);
      console.log("Korisnik:", req.user);
      
      // Izvlačimo relevantna polja iz zahteva sa osnovnom validacijom
      const {
        clientId,
        applianceId,
        description,
        // Dodatna polja za uređaj ako se novi kreira
        categoryId,
        manufacturerId,
        model,
        serialNumber,
        // Dodatna polja za klijenta ako se novi kreira
        clientFullName,
        clientPhone,
        clientEmail,
        clientAddress,
        clientCity
      } = req.body;

      // Osnovna validacija obaveznih polja
      if (!description || description.trim().length === 0) {
        console.error("Nedostaje opis servisa");
        return res.status(400).json({
          error: "Nedostaje opis servisa",
          message: "Opis servisa je obavezno polje."
        });
      }

      const partnerId = req.user!.id;
      const partnerCompanyName = req.user!.companyName || "Poslovni partner";
      
      console.log("Partner ID:", partnerId);
      console.log("Partner Company:", partnerCompanyName);

      // Prvo provera da li imamo postojećeg klijenta
      let finalClientId = clientId && clientId > 0 ? parseInt(clientId) : null;
      
      console.log("Client ID iz forme:", clientId);
      console.log("Final Client ID:", finalClientId);
      
      if (!finalClientId && clientFullName && clientPhone) {
        console.log("Kreiram novog klijenta sa podacima:", { clientFullName, clientPhone, clientEmail });
        // Kreiramo novog klijenta
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
        console.error("Nema client ID ni podataka za novog klijenta");
        return res.status(400).json({
          error: "Nedostaje ID klijenta",
          message: "Morate odabrati postojećeg klijenta ili uneti podatke za novog (ime i telefon su obavezni)."
        });
      }

      // Zatim provera da li imamo postojeći uređaj
      let finalApplianceId = applianceId && applianceId > 0 ? parseInt(applianceId) : null;
      
      console.log("Appliance ID iz forme:", applianceId);
      console.log("Final Appliance ID:", finalApplianceId);
      
      if (!finalApplianceId && categoryId && manufacturerId && model) {
        console.log("Kreiram novi uređaj sa podacima:", { categoryId, manufacturerId, model, serialNumber });
        // Kreiramo novi uređaj
        const newAppliance = await storage.createAppliance({
          clientId: finalClientId,
          categoryId: parseInt(categoryId),
          manufacturerId: parseInt(manufacturerId),
          model: model.trim(),
          serialNumber: serialNumber?.trim() || "",
          purchaseDate: "",
          notes: ""
        });
        
        finalApplianceId = newAppliance.id;
        console.log("Kreiran novi uređaj sa ID:", finalApplianceId);
      }
      
      if (!finalApplianceId) {
        console.error("Nema appliance ID ni podataka za novi uređaj");
        return res.status(400).json({
          error: "Nedostaje ID uređaja",
          message: "Morate odabrati postojeći uređaj ili uneti podatke za novi (kategorija, proizvođač i model su obavezni)."
        });
      }

      // Na kraju kreiramo servis
      const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
      
      console.log("Kreiranje servisa sa podacima:");
      console.log({
        clientId: finalClientId,
        applianceId: finalApplianceId,
        description: description.trim(),
        businessPartnerId: partnerId,
        partnerCompanyName
      });
      
      const newService = await storage.createService({
        clientId: finalClientId,
        applianceId: finalApplianceId,
        technicianId: null, // Poslovni partner ne može dodeliti servisera
        description: description.trim(),
        status: "pending", // Poslovni partneri mogu kreirati samo servise sa statusom "pending"
        scheduledDate: null,
        completedDate: null,
        cost: null,
        technicianNotes: null,
        createdAt: today,
        usedParts: "[]", // Prazna lista za delove
        machineNotes: null,
        isCompletelyFixed: null,
        warrantyStatus: "in_warranty", // dodano obavezno polje
        // Dodajemo podatke o poslovnom partneru
        businessPartnerId: partnerId,
        partnerCompanyName
      });
      
      console.log("Servis uspešno kreiran sa ID:", newService.id);

      // Slanje obaveštenja administratorima o novom servisu
      try {
        // Šaljemo notifikacije administratorima
        await NotificationService.notifyServiceCreatedByPartner(newService.id, partnerId);
        
        // Šaljemo email svim administratorima o novom zahtevu
        const adminUsers = await storage.getAllUsers();
        const admins = adminUsers.filter(user => user.role === "admin");
        
        // Dobavljanje detalja klijenta
        const client = await storage.getClient(finalClientId);
        const clientName = client?.fullName || "Klijent";
        
        // EMAIL OBAVEŠTENJA ZA ADMINISTRATORE ONEMOGUĆENA
        // Korisnik je zatražio da se iskljuće sva email obaveštenja za administratore
        console.log("[EMAIL] Admin obaveštenja onemogućena po zahtevu korisnika");
      } catch (emailError) {
        console.error("Greška pri slanju email obaveštenja:", emailError);
        // Ne prekidamo izvršenje ako slanje email-a ne uspe
      }

      res.status(201).json(newService);
    } catch (error: unknown) {
      console.error("=== GREŠKA PRI KREIRANJU SERVISA OD STRANE POSLOVNOG PARTNERA ===");
      console.error("Error object:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      console.error("Request body:", req.body);
      console.error("User:", req.user);
      
      // Detaljnija poruka o grešci
      let errorMessage = "Došlo je do greške pri kreiranju servisa.";
      if (error instanceof z.ZodError) {
        errorMessage = "Nevažeći podaci: " + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error("Zod validation errors:", error.errors);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        error: "Greška pri kreiranju servisa", 
        message: errorMessage,
        details: error instanceof Error ? error.message : "Nepoznata greška"
      });
    }
  });

  // Dobijanje detalja o servisu za poslovnog partnera
  app.get("/api/business/services/:id", businessPartnerAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const partnerId = req.user!.id;
      
      // Dobijanje servisa
      const service = await storage.getService(serviceId);
      
      // Provera da li servis postoji
      if (!service) {
        return res.status(404).json({
          error: "Servis nije pronađen",
          message: "Traženi servis ne postoji ili je uklonjen."
        });
      }
      
      // Poboljšana provjera vlasništva servisa
      const partnerIdNum = parseInt(partnerId.toString());
      if (!service.businessPartnerId || service.businessPartnerId !== partnerIdNum) {
        console.log(`BEZBEDNOSNA GREŠKA: Poslovni partner ${partnerId} pokušava pristup servisu ${serviceId} koji ne pripada njemu`);
        return res.status(403).json({
          error: "Nemate dozvolu",
          message: "Nemate dozvolu da pristupite detaljima ovog servisa."
        });
      }
      
      // Dobijanje dodatnih informacija o servisu
      const client = await storage.getClient(service.clientId);
      const appliance = await storage.getAppliance(service.applianceId);
      const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
      const manufacturer = appliance ? await storage.getManufacturer(appliance.manufacturerId) : null;
      
      // Vraćanje kompletnih podataka
      res.json({
        ...service,
        client,
        appliance: appliance ? {
          ...appliance,
          category,
          manufacturer
        } : null
      });
    } catch (error: unknown) {
      console.error("Greška pri dobijanju detalja servisa:", error);
      let errorMessage = "Došlo je do greške pri dobijanju detalja servisa.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ 
        error: "Greška servera", 
        message: errorMessage
      });
    }
  });

  // Ažuriranje servisa za poslovnog partnera
  app.put("/api/business/services/:id", businessPartnerAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const partnerId = req.user!.id;
      
      console.log("=== AŽURIRANJE SERVISA OD STRANE POSLOVNOG PARTNERA ===");
      console.log("Service ID:", serviceId);
      console.log("Partner ID:", partnerId);
      console.log("Request body:", req.body);
      
      // Dobijanje postojećeg servisa
      const existingService = await storage.getService(serviceId);
      
      if (!existingService) {
        return res.status(404).json({
          error: "Servis nije pronađen",
          message: "Traženi servis ne postoji ili je uklonjen."
        });
      }
      
      // Provera vlasništva servisa
      const partnerIdNum = parseInt(partnerId.toString());
      if (!existingService.businessPartnerId || existingService.businessPartnerId !== partnerIdNum) {
        console.log(`BEZBEDNOSNA GREŠKA: Partner ${partnerId} pokušava ažuriranje servisa ${serviceId} koji mu ne pripada`);
        return res.status(403).json({
          error: "Nemate dozvolu",
          message: "Nemate dozvolu da ažurirate ovaj servis."
        });
      }
      
      // Provera da li se servis može ažurirati
      if (existingService.status !== 'pending' && existingService.status !== 'scheduled') {
        return res.status(400).json({
          error: "Servis se ne može ažurirati",
          message: "Servis se može ažurirati samo kada je u statusu 'Na čekanju' ili 'Zakazan'."
        });
      }
      
      const { serviceData, clientData, applianceData } = req.body;
      
      // Ažuriranje servisa
      if (serviceData) {
        const updateData: any = {};
        if (serviceData.description) updateData.description = serviceData.description;
        if (serviceData.scheduledDate !== undefined) updateData.scheduledDate = serviceData.scheduledDate;
        
        if (Object.keys(updateData).length > 0) {
          await storage.updateService(serviceId, updateData);
          console.log("Service updated:", updateData);
        }
      }
      
      // Ažuriranje klijenta
      if (clientData && existingService.clientId) {
        const updateClientData: any = {};
        if (clientData.fullName) updateClientData.fullName = clientData.fullName;
        if (clientData.email !== undefined) updateClientData.email = clientData.email || null; // Podrška za prazan email
        if (clientData.phone) updateClientData.phone = clientData.phone;
        if (clientData.address) updateClientData.address = clientData.address;
        if (clientData.city) updateClientData.city = clientData.city;
        
        if (Object.keys(updateClientData).length > 0) {
          await storage.updateClient(existingService.clientId, updateClientData);
          console.log("Client updated:", updateClientData);
        }
      }
      
      // Ažuriranje aparata
      if (applianceData && existingService.applianceId) {
        const updateApplianceData: any = {};
        if (applianceData.model) updateApplianceData.model = applianceData.model;
        if (applianceData.serialNumber !== undefined) updateApplianceData.serialNumber = applianceData.serialNumber;
        if (applianceData.categoryId) updateApplianceData.categoryId = applianceData.categoryId;
        if (applianceData.manufacturerId) updateApplianceData.manufacturerId = applianceData.manufacturerId;
        
        if (Object.keys(updateApplianceData).length > 0) {
          await storage.updateAppliance(existingService.applianceId, updateApplianceData);
          console.log("Appliance updated:", updateApplianceData);
        }
      }
      
      // Dobijanje ažuriranog servisa sa svim podacima
      const updatedService = await storage.getService(serviceId);
      const client = await storage.getClient(updatedService!.clientId);
      const appliance = await storage.getAppliance(updatedService!.applianceId);
      const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
      const manufacturer = appliance ? await storage.getManufacturer(appliance.manufacturerId) : null;
      
      res.json({
        ...updatedService,
        client,
        appliance: appliance ? {
          ...appliance,
          category,
          manufacturer
        } : null
      });
      
    } catch (error: unknown) {
      console.error("=== GREŠKA PRI AŽURIRANJU SERVISA ===");
      console.error("Error object:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      
      let errorMessage = "Došlo je do greške pri ažuriranju servisa.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        error: "Greška pri ažuriranju servisa", 
        message: errorMessage
      });
    }
  });

  // Endpoint za dobijanje podataka potrebnih za kreiranje klijenata
  app.get("/api/business/clients/new", businessPartnerAuth, async (req, res) => {
    try {
      // Vraćaj podatke potrebne za kreiranje novog klijenta
      const categories = await storage.getAllApplianceCategories();
      const manufacturers = await storage.getAllManufacturers();
      
      res.json({
        categories,
        manufacturers,
        success: true,
        message: "Podaci za kreiranje klijenta uspešno dohvaćeni"
      });
    } catch (error) {
      console.error("Greška pri dohvatanju podataka za kreiranje klijenta:", error);
      res.status(500).json({ 
        error: "Greška servera", 
        message: "Došlo je do greške pri dohvatanju podataka za kreiranje klijenta"
      });
    }
  });

  // Endpoint za kreiranje novog klijenta od strane poslovnog partnera
  app.post("/api/business/clients", businessPartnerAuth, async (req, res) => {
    try {
      console.log("=== KREIRANJE KLIJENTA OD STRANE POSLOVNOG PARTNERA ===");
      console.log("Podaci iz frontend forme:", req.body);
      console.log("Korisnik:", req.user);
      
      const validatedData = insertClientSchema.parse(req.body);
      const newClient = await storage.createClient(validatedData);
      
      console.log("Uspešno kreiran klijent:", newClient);
      
      res.status(201).json({
        ...newClient,
        success: true,
        message: "Klijent je uspešno kreiran"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Nevažeći podaci klijenta", 
          details: error.format(),
          message: "Molimo proverite unete podatke i pokušajte ponovo"
        });
      }
      console.error("Greška pri kreiranju klijenta:", error);
      res.status(500).json({ 
        error: "Greška servera", 
        message: "Došlo je do greške pri kreiranju klijenta. Pokušajte ponovo kasnije."
      });
    }
  });

  // Endpoint za dobijanje klijenata poslovnog partnera (samo oni koji su povezani sa servisima tog partnera)
  app.get("/api/business/clients", businessPartnerAuth, async (req, res) => {
    try {
      const partnerId = req.user!.id;
      const userRole = req.user!.role;
      
      let clients;
      
      // Admin može videti sve klijente, business partneri samo svoje
      if (userRole === 'admin') {
        clients = await storage.getAllClients();
        console.log(`Admin ${partnerId} (${req.user!.companyName || 'Admin'}) je pristupio listi svih klijenata`);
      } else {
        // Business partneri vide samo klijente povezane sa njihovim servisima
        clients = await storage.getClientsByPartner(partnerId);
        console.log(`Poslovni partner ${partnerId} (${req.user!.companyName}) je pristupio listi svojih klijenata (${clients.length} klijenata)`);
      }
      
      res.json(clients);
    } catch (error) {
      console.error("Greška pri dohvatanju klijenata za poslovnog partnera:", error);
      res.status(500).json({ 
        error: "Greška servera", 
        message: "Došlo je do greške pri dohvatanju klijenata"
      });
    }
  });

  // Endpoint za ažuriranje klijenta od strane poslovnog partnera
  app.put("/api/business/clients/:id", businessPartnerAuth, async (req, res) => {
    try {
      console.log("=== AŽURIRANJE KLIJENTA OD STRANE POSLOVNOG PARTNERA ===");
      console.log("Podaci iz frontend forme:", req.body);
      console.log("Klijent ID:", req.params.id);
      console.log("Korisnik:", req.user);
      
      const clientId = parseInt(req.params.id);
      const partnerId = req.user!.id;
      const userRole = req.user!.role;
      
      // Kreiram schema za update klijenta koji može da prima notes polje
      const updateClientSchema = insertClientSchema.extend({
        notes: z.string().optional()
      });
      
      console.log("📝 Podaci iz frontend-a:", req.body);
      const validatedData = updateClientSchema.parse(req.body);
      
      // Proveravamo da li klijent postoji
      const existingClient = await storage.getClient(clientId);
      if (!existingClient) {
        return res.status(404).json({
          error: "Klijent nije pronađen",
          message: "Klijent sa datim ID-om ne postoji u sistemu"
        });
      }
      
      // Business partneri mogu editovati samo svoje klijente, admin može sve
      if (userRole !== 'admin') {
        const partnerClients = await storage.getClientsByPartner(partnerId);
        const canEditClient = partnerClients.some(client => client.id === clientId);
        
        if (!canEditClient) {
          return res.status(403).json({
            error: "Nemate dozvolu",
            message: "Možete editovati samo klijente povezane sa vašim servisima"
          });
        }
      }
      
      const updatedClient = await storage.updateClient(clientId, validatedData);
      
      console.log("Uspešno ažuriran klijent:", updatedClient);
      
      res.json({
        ...updatedClient,
        success: true,
        message: "Podaci klijenta su uspešno ažurirani"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Nevažeći podaci klijenta", 
          details: error.format(),
          message: "Molimo proverite unete podatke i pokušajte ponovo"
        });
      }
      console.error("Greška pri ažuriranju klijenta:", error);
      res.status(500).json({ 
        error: "Greška servera", 
        message: "Došlo je do greške pri ažuriranju klijenta. Pokušajte ponovo kasnije."
      });
    }
  });
}