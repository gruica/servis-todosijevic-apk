import { Express } from "express";
import { storage } from "./storage";
import { insertClientSchema, insertApplianceSchema } from "@shared/schema";

/**
 * Registruje rute specifične za poslovne partnere
 * Sve rute su zaštićene proverom autentikacije i role
 */
export function registerBusinessPartnerRoutes(app: Express): void {
  
  // Middleware za proveru da li je korisnik poslovni partner
  const isBusinessPartner = (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Niste prijavljeni" });
    }
    
    if (!["business", "partner"].includes(req.user.role)) {
      return res.status(403).json({ error: "Nemate dozvolu za pristup ovoj funkcionalnosti" });
    }
    
    next();
  };
  
  // Ruta za kreiranje novog servisa u jednom koraku (klijent + uređaj + servis)
  app.post("/api/business/create-service", isBusinessPartner, async (req, res) => {
    try {
      console.log("[BUSINESS PARTNER API] Započinjem proces kreiranja servisa za poslovnog partnera", req.user.username);
      
      // Dekonstrukcija zahteva
      const { client: clientData, appliance: applianceData, service: serviceData } = req.body;
      
      console.log("[BUSINESS PARTNER API] Podaci o klijentu:", JSON.stringify(clientData));
      console.log("[BUSINESS PARTNER API] Podaci o uređaju:", JSON.stringify(applianceData));
      console.log("[BUSINESS PARTNER API] Podaci o servisu:", JSON.stringify(serviceData));
      
      // 1. Validacija podataka o klijentu
      const parsedClient = insertClientSchema.safeParse({
        fullName: clientData.fullName,
        phone: clientData.phone,
        email: clientData.email || "",
        address: clientData.address,
        city: clientData.city,
        notes: clientData.notes || ""
      });
      
      if (!parsedClient.success) {
        console.error("[BUSINESS PARTNER API] Validacija klijenta neuspešna:", parsedClient.error.message);
        return res.status(400).json({ 
          error: "Nevažeći podaci o klijentu",
          details: parsedClient.error.message
        });
      }
      
      // 1. Kreiranje klijenta
      console.log("[BUSINESS PARTNER API] Kreiranje klijenta...");
      const clientResult = await storage.createClient(parsedClient.data);
      console.log("[BUSINESS PARTNER API] Klijent kreiran sa ID:", clientResult.id);
      
      // 2. Validacija podataka o uređaju
      const parsedAppliance = insertApplianceSchema.safeParse({
        clientId: clientResult.id,
        categoryId: applianceData.categoryId,
        manufacturerId: applianceData.manufacturerId,
        model: applianceData.model,
        serialNumber: applianceData.serialNumber || "",
        purchaseDate: applianceData.purchaseDate || ""
      });
      
      if (!parsedAppliance.success) {
        console.error("[BUSINESS PARTNER API] Validacija uređaja neuspešna:", parsedAppliance.error.message);
        return res.status(400).json({ 
          error: "Nevažeći podaci o uređaju",
          details: parsedAppliance.error.message
        });
      }
      
      // 2. Kreiranje uređaja
      console.log("[BUSINESS PARTNER API] Kreiranje uređaja...");
      const applianceResult = await storage.createAppliance(parsedAppliance.data);
      console.log("[BUSINESS PARTNER API] Uređaj kreiran sa ID:", applianceResult.id);
      
      // 3. Kreiranje servisa
      console.log("[BUSINESS PARTNER API] Kreiranje servisa...");
      
      const today = new Date().toISOString().split("T")[0];
      
      const serviceResult = await storage.createService({
        clientId: clientResult.id,
        applianceId: applianceResult.id,
        description: serviceData.description,
        status: "pending", // Poslovni partneri mogu kreirati samo servise sa statusom "pending"
        createdAt: today,
        usedParts: "[]", // Uvek prazna lista za nove servise
        businessPartnerId: req.user.id,
        partnerCompanyName: req.user.companyName || "",
        technicianId: null, // Null jer administrator kasnije dodeljuje servisera
        scheduledDate: null,
        completedDate: null,
        technicianNotes: null,
        cost: null,
        machineNotes: null,
        isCompletelyFixed: null
      });
      
      console.log("[BUSINESS PARTNER API] Servis uspešno kreiran sa ID:", serviceResult.id);
      
      // Vraćamo kompletan rezultat kreiranja
      return res.status(201).json({
        success: true,
        client: clientResult,
        appliance: applianceResult,
        service: serviceResult,
        message: "Servis uspešno kreiran"
      });
      
    } catch (error) {
      console.error("[BUSINESS PARTNER API] Kritična greška pri kreiranju servisa:", error);
      return res.status(500).json({ 
        error: "Došlo je do greške pri kreiranju servisa", 
        details: error.message || "Nepoznata greška"
      });
    }
  });
  
  // Dohvatanje liste klijenata za poslovnog partnera
  app.get("/api/business/clients", isBusinessPartner, async (req, res) => {
    try {
      // Dobavi sve klijente i vrati ih
      const clients = await storage.getAllClients();
      return res.json(clients);
    } catch (error) {
      console.error("[BUSINESS PARTNER API] Greška pri dohvatanju klijenata:", error);
      return res.status(500).json({ error: "Greška pri dohvatanju klijenata" });
    }
  });
  
  // Dohvatanje servisa kreiranih od strane trenutnog poslovnog partnera
  app.get("/api/business/services", isBusinessPartner, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Niste prijavljeni ili nedostaju podaci o korisniku" });
      }
      // Koristimo postojeću metodu getServicesByPartner umesto getServicesByBusinessPartnerId
      const services = await storage.getServicesByPartner(req.user.id);
      return res.json(services);
    } catch (error) {
      console.error("[BUSINESS PARTNER API] Greška pri dohvatanju servisa:", error);
      return res.status(500).json({ error: "Greška pri dohvatanju servisa" });
    }
  });
}