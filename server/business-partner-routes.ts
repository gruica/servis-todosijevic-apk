import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertClientSchema, insertServiceSchema, insertApplianceSchema } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import { emailService } from "./email-service";
import { smsService } from "./sms-service";
import { smsService as newSmsService } from "./twilio-sms";
import { NotificationService } from "./notification-service";

export function registerBusinessPartnerRoutes(app: Express) {
  // Middleware za proveru da li je korisnik poslovni partner
  const isBusinessPartner = (req: Request, res: Response, next: NextFunction) => {
    // Provera autentifikacije
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        error: "Niste prijavljeni",
        message: "Morate biti prijavljeni da biste pristupili ovom resursu."
      });
    }

    // Provera uloge - prihvatamo i "business" i "business_partner"
    if (req.user?.role !== "business_partner" && req.user?.role !== "business") {
      return res.status(403).json({
        error: "Nemate dozvolu",
        message: "Samo poslovni partneri mogu pristupiti ovom resursu."
      });
    }

    next();
  };

  // Dobijanje servisa za poslovnog partnera
  app.get("/api/business/services", isBusinessPartner, async (req, res) => {
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
  app.post("/api/business/services", isBusinessPartner, async (req, res) => {
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
        
        // Ako ima administratora, šaljemo email
        if (admins.length > 0) {
          // Email za administratore
          for (const admin of admins) {
            if (admin.email) {
              await emailService.sendEmail({
                to: admin.email,
                subject: `Novi servisni zahtev #${newService.id} od partnera ${partnerCompanyName}`,
                html: `
                  <h2>Novi servisni zahtev #${newService.id}</h2>
                  <p><strong>Partner:</strong> ${partnerCompanyName}</p>
                  <p><strong>Klijent:</strong> ${clientName}</p>
                  <p><strong>Opis:</strong> ${description}</p>
                  <p>Molimo vas da pregledate novi zahtev u administratorskom panelu.</p>
                `
              });
            }
          }
        }
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
  app.get("/api/business/services/:id", isBusinessPartner, async (req, res) => {
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
      
      // Provera da li servis pripada ovom poslovnom partneru
      if (service.businessPartnerId !== partnerId) {
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

  // Endpoint za dobijanje podataka potrebnih za kreiranje klijenata
  app.get("/api/business/clients/new", isBusinessPartner, async (req, res) => {
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
  app.post("/api/business/clients", isBusinessPartner, async (req, res) => {
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

  // Endpoint za dobijanje svih klijenata poslovnog partnera
  app.get("/api/business/clients", isBusinessPartner, async (req, res) => {
    try {
      // Za sada vraćamo sve klijente - možda treba filtrirati po business partner-u u budućnosti
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error("Greška pri dohvatanju klijenata za poslovnog partnera:", error);
      res.status(500).json({ 
        error: "Greška servera", 
        message: "Došlo je do greške pri dohvatanju klijenata"
      });
    }
  });
}