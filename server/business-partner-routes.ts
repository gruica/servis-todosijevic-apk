import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertClientSchema, insertServiceSchema, insertApplianceSchema } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import { emailService } from "./email-service";
import { smsService } from "./sms-service";

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

    // Provera uloge
    if (req.user?.role !== "business_partner") {
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
      // Izvlačimo relevantna polja iz zahteva
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

      const partnerId = req.user!.id;
      const partnerCompanyName = req.user!.companyName || "Poslovni partner";

      // Prvo provera da li imamo postojećeg klijenta
      let finalClientId = clientId;
      
      if (!finalClientId && clientFullName) {
        // Kreiramo novog klijenta
        const newClient = await storage.createClient({
          fullName: clientFullName,
          phone: clientPhone,
          email: clientEmail || null,
          address: clientAddress,
          city: clientCity
        });
        
        finalClientId = newClient.id;
      }
      
      if (!finalClientId) {
        return res.status(400).json({
          error: "Nedostaje ID klijenta",
          message: "Morate odabrati postojećeg klijenta ili uneti podatke za novog."
        });
      }

      // Zatim provera da li imamo postojeći uređaj
      let finalApplianceId = applianceId;
      
      if (!finalApplianceId && categoryId && manufacturerId && model) {
        // Kreiramo novi uređaj
        const newAppliance = await storage.createAppliance({
          clientId: finalClientId,
          categoryId: parseInt(categoryId),
          manufacturerId: parseInt(manufacturerId),
          model,
          serialNumber: serialNumber || "",
          purchaseDate: "",
          warrantyExpiryDate: "",
          notes: ""
        });
        
        finalApplianceId = newAppliance.id;
      }
      
      if (!finalApplianceId) {
        return res.status(400).json({
          error: "Nedostaje ID uređaja",
          message: "Morate odabrati postojeći uređaj ili uneti podatke za novi."
        });
      }

      // Na kraju kreiramo servis
      const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
      
      const newService = await storage.createService({
        clientId: finalClientId,
        applianceId: finalApplianceId,
        technicianId: null, // Poslovni partner ne može dodeliti servisera
        description,
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

      // Slanje obaveštenja administratorima o novom servisu
      try {
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
      console.error("Greška pri kreiranju servisa od strane poslovnog partnera:", error);
      
      // Detaljnija poruka o grešci
      let errorMessage = "Došlo je do greške pri kreiranju servisa.";
      if (error instanceof z.ZodError) {
        errorMessage = "Nevažeći podaci: " + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        error: "Greška pri kreiranju servisa", 
        message: errorMessage
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
}