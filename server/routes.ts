import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { emailService } from "./email-service";
import { excelService } from "./excel-service";
import { insertClientSchema, insertServiceSchema, insertApplianceSchema, insertApplianceCategorySchema, insertManufacturerSchema, insertTechnicianSchema, insertUserSchema, serviceStatusEnum, insertMaintenanceScheduleSchema, insertMaintenanceAlertSchema, maintenanceFrequencyEnum } from "@shared/schema";
import { db, pool } from "./db";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";

// Mapiranje status kodova u opisne nazive statusa
const STATUS_DESCRIPTIONS: Record<string, string> = {
  'pending': 'Na čekanju',
  'assigned': 'Dodeljen serviseru',
  'scheduled': 'Zakazan termin',
  'in_progress': 'U toku',
  'completed': 'Završen',
  'cancelled': 'Otkazan'
};

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
  // Set up authentication routes
  setupAuth(app);

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

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci klijenta", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri kreiranju klijenta" });
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

  // Appliance Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllApplianceCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju kategorija" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertApplianceCategorySchema.parse(req.body);
      const category = await storage.createApplianceCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci kategorije", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri kreiranju kategorije" });
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
      const validatedData = insertManufacturerSchema.parse(req.body);
      const manufacturer = await storage.createManufacturer(validatedData);
      res.status(201).json(manufacturer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci proizvođača", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri kreiranju proizvođača" });
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
      const appliances = await storage.getAppliancesByClient(parseInt(req.params.clientId));
      res.json(appliances);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju uređaja klijenta" });
    }
  });

  app.post("/api/appliances", async (req, res) => {
    try {
      const validatedData = insertApplianceSchema.parse(req.body);
      const appliance = await storage.createAppliance(validatedData);
      res.status(201).json(appliance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci uređaja", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri kreiranju uređaja" });
    }
  });

  app.put("/api/appliances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertApplianceSchema.parse(req.body);
      const updatedAppliance = await storage.updateAppliance(id, validatedData);
      if (!updatedAppliance) return res.status(404).json({ error: "Uređaj nije pronađen" });
      res.json(updatedAppliance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci uređaja", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri ažuriranju uređaja" });
    }
  });

  // Services routes
  app.get("/api/services", async (req, res) => {
    try {
      const { status, technicianId } = req.query;
      let services;
      
      // Ako je definisan tehničar, prvo filtriramo po njemu
      if (technicianId && typeof technicianId === 'string') {
        try {
          const techId = parseInt(technicianId);
          
          // Ako je definisan i status, filtriramo dodatno po statusu
          if (status && typeof status === 'string' && status !== 'all') {
            try {
              const validStatus = serviceStatusEnum.parse(status);
              // Dohvatamo servise za tehničara pa onda filtriramo po statusu
              const techServices = await storage.getServicesByTechnician(techId);
              services = techServices.filter(s => s.status === validStatus);
            } catch {
              return res.status(400).json({ error: "Nevažeći status servisa" });
            }
          } else {
            // Samo po tehničaru
            services = await storage.getServicesByTechnician(techId);
          }
        } catch (err) {
          return res.status(400).json({ error: "Nevažeći ID servisera" });
        }
      }
      // Ako nije definisan tehničar, filtiramo samo po statusu ako je definisan
      else if (status && typeof status === 'string' && status !== 'all') {
        try {
          const validStatus = serviceStatusEnum.parse(status);
          services = await storage.getServicesByStatus(validStatus);
        } catch {
          return res.status(400).json({ error: "Nevažeći status servisa" });
        }
      } else {
        // Ako nije definisan ni tehničar ni status, dohvatamo sve servise
        services = await storage.getAllServices();
      }
      
      res.json(services);
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
      const validatedData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validatedData);
      
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
      
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci servisa", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri kreiranju servisa" });
    }
  });

  app.put("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertServiceSchema.parse(req.body);
      
      // Preuzmemo originalni servis pre ažuriranja
      const originalService = await storage.getService(id);
      if (!originalService) return res.status(404).json({ error: "Servis nije pronađen" });
      
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
        isCompletelyFixed
      } = req.body;
      
      // Validate status
      const validStatus = serviceStatusEnum.parse(status);
      
      // Get the service
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
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
        completedDate: validStatus === "completed" ? new Date().toISOString() : service.completedDate
      });
      
      if (!updatedService) {
        return res.status(500).json({ error: "Greška pri ažuriranju statusa servisa" });
      }
      
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
            
            // 2. Šalje obaveštenje KLIJENTU
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
              console.warn(`[EMAIL SISTEM] ⚠️ Klijent ${client.fullName} nema email adresu, preskačem slanje`);
              emailInfo.emailError = `Klijent ${client.fullName} nema definisanu email adresu`;
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
        console.error("[EMAIL SISTEM] ❌ Greška pri slanju email obaveštenja:", error);
        // Bezbedno obradimo grešku koja može biti bilo kog tipa
        const errorMessage = error instanceof Error ? error.message : String(error);
        emailInfo.emailError = `Sistemska greška: ${errorMessage || "Nepoznata greška"}`;
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
  
  // Get services for the logged-in technician
  app.get("/api/my-services", async (req, res) => {
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
  });

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

  const httpServer = createServer(app);
  return httpServer;
}
