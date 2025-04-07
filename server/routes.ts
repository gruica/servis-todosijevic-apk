import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertClientSchema, insertServiceSchema, insertApplianceSchema, insertApplianceCategorySchema, insertManufacturerSchema, insertTechnicianSchema, insertUserSchema, serviceStatusEnum } from "@shared/schema";
import { z } from "zod";

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
      const { status } = req.query;
      let services;
      
      if (status && typeof status === 'string') {
        try {
          const validStatus = serviceStatusEnum.parse(status);
          services = await storage.getServicesByStatus(validStatus);
        } catch {
          return res.status(400).json({ error: "Nevažeći status servisa" });
        }
      } else {
        services = await storage.getAllServices();
      }
      
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju servisa" });
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
      const updatedService = await storage.updateService(id, validatedData);
      if (!updatedService) return res.status(404).json({ error: "Servis nije pronađen" });
      res.json(updatedService);
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
      const { status, technicianNotes } = req.body;
      
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
        completedDate: validStatus === "completed" ? new Date().toISOString() : service.completedDate
      });
      
      if (!updatedService) {
        return res.status(500).json({ error: "Greška pri ažuriranju statusa servisa" });
      }
      
      // TODO: Send email notification when email functionality is enabled
      
      res.json(updatedService);
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
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Potrebna je prijava" });
      }
      
      // Check if the user is a technician
      if (req.user?.role !== "technician" || !req.user?.technicianId) {
        return res.status(403).json({ error: "Pristup dozvoljen samo serviserima" });
      }
      
      // Get all services assigned to this technician
      const services = await storage.getServicesByTechnician(req.user.technicianId);
      
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
  
      res.json({
        activeCount: activeServices.length,
        completedCount: completedServices.length,
        pendingCount: pendingServices.length,
        clientCount: clients.length,
        recentServices: await storage.getRecentServices(5),
        recentClients: await storage.getRecentClients(3),
        technicianCount: technicians.length,
        applianceStats
      });
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju statistike" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
