      
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

      if (req.user?.role !== "technician" && req.user?.role !== "business_partner") {
        return res.status(403).json({ error: "Samo serviseri i poslovni partneri mogu dopunjavati Generali servise" });
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
      
      // Za servisere je potreban technicianId, za poslovne partnere nije
      if (req.user.role === "technician" && (!userDetails || !userDetails.technicianId)) {
        return res.status(403).json({ error: "Nemate ulogu servisera" });
      }

      // Za poslovne partnere, proveri da li su oni kreatori servisa
      if (req.user.role === "business_partner") {
        if (service.businessPartnerId !== req.user.id) {
          return res.status(403).json({ error: "Možete dopunjavati samo servise koje ste vi kreirali" });
        }
      }

      // Serviseri i poslovni partneri mogu dopunjavati Generali podatke
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
          partnerId
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

  // COM PLUS ENDPOINTS - Specijalizovani panel za Com Plus brendove
  const COM_PLUS_BRANDS = ["Electrolux", "Elica", "Candy", "Hoover", "Turbo Air"];

  // Get Com Plus services (admin only)
  app.get("/api/complus/services", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const { status, brand, warranty } = req.query;
      
      // Get all services with Com Plus manufacturers
      const allServices = await storage.getAllServices();
      console.log(`🏭 COM PLUS: Ukupno servisa iz baze: ${allServices.length}`);
      
      // Filter for Com Plus brands only
      let complusServices = allServices.filter((service: any) => 
        COM_PLUS_BRANDS.includes(service.manufacturerName)
      );
      console.log(`🏭 COM PLUS: Filtrirano ${complusServices.length} Com Plus servisa`);
      
      // Debug za servis #175
      const service175 = allServices.find((s: any) => s.id === 175);
      if (service175) {
        console.log(`🏭 SERVIS #175:`, {
          id: service175.id,
          manufacturerName: service175.manufacturerName,
          status: service175.status,
          isComPlus: COM_PLUS_BRANDS.includes(service175.manufacturerName)
        });
      } else {
        console.log(`🏭 SERVIS #175: Nije pronađen u getAllServices`);
      }

      // Apply additional filters
      if (status && status !== "all") {
        complusServices = complusServices.filter((service: any) => service.status === status);
      }
      
      if (brand && brand !== "all") {
        complusServices = complusServices.filter((service: any) => service.manufacturerName === brand);
      }
      
      if (warranty && warranty !== "all") {
        // Mapiranje iz srpskih naziva u database vrednosti
        const warrantyMapping: Record<string, string> = {
          "u garanciji": "in_warranty",
          "van garancije": "out_of_warranty"
        };
        const dbWarranty = warrantyMapping[warranty as string] || warranty;
        complusServices = complusServices.filter((service: any) => service.warrantyStatus === dbWarranty);
      }

      res.json(complusServices);
    } catch (error) {
      console.error("Error fetching Com Plus services:", error);
      res.status(500).json({ error: "Greška pri dohvatanju Com Plus servisa" });
    }
  });

  // TEST endpoint za debugging Com Plus servisa (ukloni posle)
  app.get("/api/complus/services-test", async (req, res) => {
    try {
      const allServices = await storage.getAllServices();
      console.log(`🔍 TEST: Ukupno servisa iz baze: ${allServices.length}`);
      
      const complusServices = allServices.filter((service: any) => 
        COM_PLUS_BRANDS.includes(service.manufacturerName)
      ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      console.log(`🔍 TEST: Com Plus servisi: ${complusServices.length}`);
      const top5 = complusServices.slice(0, 5);
      console.log(`🔍 TEST: Top 5 najnovijih:`, top5.map((s: any) => `#${s.id} (${s.manufacturerName}, ${s.status})`));
      
      res.json(complusServices);
    } catch (error) {
      console.error("Test error:", error);
      res.status(500).json({ error: "Test greška" });
    }
  });

  // Get Com Plus statistics (admin only)
  app.get("/api/complus/stats", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const allServices = await storage.getAllServices();
      
      // Filter for Com Plus brands only
      const complusServices = allServices.filter((service: any) => 
        COM_PLUS_BRANDS.includes(service.manufacturerName)
      );

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const stats = {
        total: complusServices.length,
        active: complusServices.filter((s: any) => 
          ["pending", "assigned", "in_progress"].includes(s.status)
        ).length,
        completedThisMonth: complusServices.filter((s: any) => {
          if (s.status !== "completed" || !s.completedDate) return false;
          const completedDate = new Date(s.completedDate);
          return completedDate.getMonth() === currentMonth && 
                 completedDate.getFullYear() === currentYear;
        }).length,
        warranty: complusServices.filter((s: any) => 
          s.warrantyStatus === "u garanciji"
        ).length
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching Com Plus stats:", error);
      res.status(500).json({ error: "Greška pri dohvatanju Com Plus statistika" });
    }
  });

  // Get Com Plus appliances (admin only - filtered by Com Plus brands)
  app.get("/api/complus/appliances", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const allAppliances = await storage.getAllAppliances();
      
      // Filter appliances for Com Plus brands only
      const complusAppliances = allAppliances.filter((appliance: any) => 
        COM_PLUS_BRANDS.includes(appliance.manufacturerName)
      );

      res.json(complusAppliances);
    } catch (error) {
      console.error("Error fetching Com Plus appliances:", error);
      res.status(500).json({ error: "Greška pri dohvatanju Com Plus aparata" });
    }
  });

  // Get Com Plus clients (admin only - clients with Com Plus appliances)
  app.get("/api/complus/clients", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const allServices = await storage.getAllServices();
      
      // Get unique client IDs from Com Plus services
      const complusServices = allServices.filter((service: any) => 
        COM_PLUS_BRANDS.includes(service.manufacturerName)
      );
      
      const complusClientIds = [...new Set(complusServices.map((s: any) => s.clientId))];
      
      // Get client details for Com Plus clients
      const complusClients = [];
      for (const clientId of complusClientIds) {
        const client = await storage.getClient(clientId);
        if (client) {
          complusClients.push(client);
        }
      }

      res.json(complusClients);
    } catch (error) {
      console.error("Error fetching Com Plus clients:", error);
      res.status(500).json({ error: "Greška pri dohvatanju Com Plus klijenata" });
    }
  });

  // COM PLUS SERVICE CREATION by business partner Roberto Ivezić
  app.post("/api/complus/services", jwtAuth, async (req, res) => {
    try {
      console.log("=== COM PLUS SERVICE CREATION FROM BUSINESS PARTNER ===");
      console.log("Business partner user:", req.user);
      console.log("Form data received:", req.body);

      if (req.user.role !== "business_partner" && req.user.role !== "business") {
        return res.status(403).json({ error: "Samo poslovni partneri mogu kreirati Com Plus servise" });
      }

      const formData = req.body;
      
      // Kreiranje klijenta
      let clientId;
      if (formData.clientId) {
        clientId = parseInt(formData.clientId);
      } else {
        const clientData = {
          fullName: formData.clientFullName,
          phone: formData.clientPhone,
          email: formData.clientEmail || null,
          address: formData.clientAddress || null,
          city: formData.clientCity || null,
          isBusinessPartnerClient: true,
          createdBy: req.user.id
        };
        
        const newClient = await storage.createClient(clientData);
        clientId = newClient.id;
        console.log("Created new client for Com Plus:", clientId);
      }

      // Kreiranje aparata
      let applianceId;
      if (formData.applianceId) {
        applianceId = parseInt(formData.applianceId);
      } else {
        const applianceData = {
          clientId: clientId,
          categoryId: parseInt(formData.categoryId),
          manufacturerId: parseInt(formData.manufacturerId),
          model: formData.model || null,
          serialNumber: formData.serialNumber || null,
          purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
          notes: formData.applianceNotes || null,
          isComPlusDevice: true
        };
        
        const newAppliance = await storage.createAppliance(applianceData);
        applianceId = newAppliance.id;
        console.log("Created new Com Plus appliance:", applianceId);
      }

      // Kreiranje servisa
      const serviceData = {
        clientId: clientId,
        applianceId: applianceId,
        description: formData.description,
        status: "pending",
        warrantyStatus: "u garanciji", // Default for Com Plus
        createdBy: req.user.id,
        businessPartnerId: req.user.id,
        isComplusService: true, // Mark as Com Plus service
        assignedToTedora: true // Route directly to Teodora
      };

      const newService = await storage.createService(serviceData);
      console.log("Created Com Plus service:", newService.id);

      // Pošalji notifikaciju Teodori Todosijević (User ID: 43)
      try {
        await storage.createNotification({
          userId: 43, // Teodora ID
          type: "service_created_by_partner",
          title: "Novi Com Plus servis od Roberto Ivezića",
          message: `Kreiran Com Plus servis #${newService.id} za klijenta ${formData.clientFullName}`,
          relatedServiceId: newService.id,
          isRead: false,
          createdAt: new Date()
        });
        console.log("Notification sent to Teodora for Com Plus service");
      } catch (notificationError) {
        console.error("Error sending notification to Teodora:", notificationError);
      }

      res.json({
        success: true,
        message: "Com Plus servis je uspešno kreiran i prosleđen Teodori Todosijević",
        service: newService
      });

    } catch (error) {
      console.error("❌ COM PLUS SERVICE CREATION ERROR:", error);
      res.status(500).json({ 
        error: "Greška pri kreiranju Com Plus servisa",
        details: error.message 
      });
    }
  });

  // Update Com Plus service (admin only)
  app.put("/api/complus/services/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const serviceId = parseInt(req.params.id);
      const updateData = req.body;

      // Verify this is a Com Plus service before updating
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }

      // Get appliance and manufacturer to verify it's Com Plus
      const appliance = await storage.getAppliance(service.applianceId);
      const manufacturer = appliance ? await storage.getManufacturer(appliance.manufacturerId) : null;
      
      if (!manufacturer || !COM_PLUS_BRANDS.includes(manufacturer.name)) {
        return res.status(403).json({ error: "Možete ažurirati samo Com Plus servise" });
      }

      // Update the service
      const updatedService = await storage.updateService(serviceId, updateData);
      
      res.json(updatedService);
    } catch (error) {
      console.error("Error updating Com Plus service:", error);
      res.status(500).json({ error: "Greška pri ažuriranju Com Plus servisa" });
    }
  });

  // Update Com Plus client data (admin only)
  app.put("/api/complus/clients/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const clientId = parseInt(req.params.id);
      const updateData = req.body;

      console.log(`[COMPLUS CLIENT UPDATE] Updating client ${clientId} with data:`, updateData);

      // Verify this client has Com Plus services
      const allServices = await storage.getAllServices();
      const clientServices = allServices.filter((service: any) => 
        service.clientId === clientId && COM_PLUS_BRANDS.includes(service.manufacturerName)
      );

      if (clientServices.length === 0) {
        return res.status(403).json({ error: "Možete ažurirati samo klijente sa Com Plus servisima" });
      }

      // Update the client
      const updatedClient = await storage.updateClient(clientId, updateData);
      
      console.log(`[COMPLUS CLIENT UPDATE] Client ${clientId} successfully updated`);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating Com Plus client:", error);
      res.status(500).json({ error: "Greška pri ažuriranju Com Plus klijenta" });
    }
  });

  // Update Com Plus appliance data (admin only)  
  app.put("/api/complus/appliances/:id", jwtAuth, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin pristup potreban" });
    }

    try {
      const applianceId = parseInt(req.params.id);
      const updateData = req.body;

      console.log(`[COMPLUS APPLIANCE UPDATE] Updating appliance ${applianceId} with data:`, updateData);

      // Verify this is a Com Plus appliance
      const appliance = await storage.getAppliance(applianceId);
      if (!appliance) {
        return res.status(404).json({ error: "Aparat nije pronađen" });
      }

      const manufacturer = await storage.getManufacturer(appliance.manufacturerId);
      if (!manufacturer || !COM_PLUS_BRANDS.includes(manufacturer.name)) {
        return res.status(403).json({ error: "Možete ažurirati samo Com Plus aparate" });
      }

      // Update the appliance
      const updatedAppliance = await storage.updateAppliance(applianceId, updateData);
      
      console.log(`[COMPLUS APPLIANCE UPDATE] Appliance ${applianceId} successfully updated`);
      res.json(updatedAppliance);
    } catch (error) {
      console.error("Error updating Com Plus appliance:", error);
      res.status(500).json({ error: "Greška pri ažuriranju Com Plus aparata" });
    }
  });

  // Create Com Plus service by Roberto Ivezić (business_partner role)
  app.post("/api/complus/services", jwtAuth, async (req, res) => {
    try {
      console.log("=== KREIRANJE COM PLUS SERVISA OD STRANE ROBERTO IVEZIĆA ===");
      console.log("Korisnik:", req.user);
      console.log("Podaci iz forme:", req.body);

      // Check if user is Roberto Ivezić or admin
      if (req.user.role !== "business_partner" && req.user.role !== "admin") {
        return res.status(403).json({ 
          error: "Nemate dozvolu za kreiranje Com Plus servisa",
          message: "Samo poslovni partneri i administratori mogu kreirati Com Plus servise"
        });
      }

      const {
        clientId,
        applianceId,
        description,
        // Dodatna polja za uređaj ako se novi kreira
        categoryId,
        manufacturerId,
        model,
        serialNumber,
        purchaseDate,
        applianceNotes,
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

      let finalClientId = clientId;
      let finalApplianceId = applianceId;

      // KREIRANJE NOVOG KLIJENTA AKO JE POTREBNO
      if (!finalClientId && clientFullName && clientPhone) {
        console.log("Kreiranje novog klijenta za Com Plus servis...");
        
        const clientData = {
          fullName: clientFullName.trim(),
          phone: clientPhone.trim(),
          email: clientEmail?.trim() || null,
          address: clientAddress?.trim() || null,
          city: clientCity?.trim() || null
        };

        try {
          const newClient = await storage.createClient(clientData);
          finalClientId = newClient.id;
          console.log(`Kreiran novi klijent sa ID: ${finalClientId}`);
        } catch (clientError) {
          console.error("Greška pri kreiranju klijenta:", clientError);
          return res.status(500).json({
            error: "Greška pri kreiranju klijenta",
            message: "Došlo je do greške pri kreiranju klijenta. Molimo pokušajte ponovo."
          });
        }
      }

      // KREIRANJE NOVOG APARATA AKO JE POTREBNO
      if (!finalApplianceId && categoryId && manufacturerId) {
        console.log("Kreiranje novog aparata za Com Plus servis...");

        // Verify this is a Com Plus manufacturer
        const manufacturer = await storage.getManufacturer(manufacturerId);
        if (!manufacturer || !COM_PLUS_BRANDS.includes(manufacturer.name)) {
          return res.status(400).json({
            error: "Nevaljan proizvođač",
            message: "Možete kreirati servise samo za Com Plus brendove (Electrolux, Elica, Candy, Hoover, Turbo Air)"
          });
        }
        
        const applianceData = {
          clientId: finalClientId!,
          categoryId: categoryId,
          manufacturerId: manufacturerId,
          model: model?.trim() || null,
          serialNumber: serialNumber?.trim() || null,
          purchaseDate: purchaseDate || null,
          notes: applianceNotes?.trim() || null
        };

        try {
          const newAppliance = await storage.createAppliance(applianceData);
          finalApplianceId = newAppliance.id;
          console.log(`Kreiran novi aparat sa ID: ${finalApplianceId}`);
        } catch (applianceError) {
          console.error("Greška pri kreiranju aparata:", applianceError);
          return res.status(500).json({
            error: "Greška pri kreiranju aparata",
            message: "Došlo je do greške pri kreiranju aparata. Molimo pokušajte ponovo."
          });
        }
      }

      // Konačna validacija da imamo sve potrebne ID-jeve
      if (!finalClientId || !finalApplianceId) {
        return res.status(400).json({
          error: "Nedostaju podaci",
          message: "Morate odabrati ili kreirati klijenta i aparat."
        });
      }

      // KREIRANJE COM PLUS SERVISA
      const serviceData = {
        clientId: finalClientId,
        applianceId: finalApplianceId,
        description: description.trim(),
        status: "pending" as const,
        warrantyStatus: "u garanciji" as const, // Default for Com Plus services
        businessPartnerId: req.user.id,
        partnerCompanyName: req.user.companyName || "Roberto Ivezić - Com Plus Partner"
      };

      console.log("Kreiranje Com Plus servisa sa podacima:", serviceData);
      
      const newService = await storage.createService(serviceData);
      console.log(`Kreiran novi Com Plus servis sa ID: ${newService.id}`);

      // SLANJE OBAVEŠTENJA TEODORI TODOSIJEVIĆ (COM PLUS ADMINISTRATOR)
      try {
        const teodora = await storage.getUserByUsername("teodora@frigosistemtodosijevic.com");
        if (teodora) {
          const notificationService = new NotificationService(storage);
          await notificationService.createNotification({
            userId: teodora.id,
            type: "service_created_by_partner",
            title: "Novi Com Plus servis od Roberto Ivezića",
            message: `Roberto Ivezić je kreirao novi Com Plus servis #${newService.id}`,
            relatedServiceId: newService.id,
            isRead: false
          });
          console.log(`Obaveštenje poslato Teodori za Com Plus servis #${newService.id}`);
        }
      } catch (notifError) {
        console.error("Greška pri slanju obaveštenja Teodori:", notifError);
        // Continue execution even if notification fails
      }

      // EMAIL OBAVEŠTENJA TEODORI
      try {
        if (emailService) {
          const client = await storage.getClient(finalClientId);
          const appliance = await storage.getAppliance(finalApplianceId);
          const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
          const manufacturer = appliance ? await storage.getManufacturer(appliance.manufacturerId) : null;

          await emailService.sendBusinessPartnerServiceNotification({
            serviceId: newService.id,
            partnerName: req.user.fullName || "Roberto Ivezić",
            companyName: req.user.companyName || "Roberto Ivezić - Com Plus Partner", 
            clientName: client ? client.fullName : "Nepoznat klijent",
            clientPhone: client ? client.phone : "Nepoznat telefon",
            deviceCategory: category ? category.name : "Nepoznat tip aparata",
            deviceManufacturer: manufacturer ? manufacturer.name : "Nepoznat proizvođač",
            deviceModel: appliance ? appliance.model : null,
            description: description,
            adminEmail: "teodora@frigosistemtodosijevic.com" // Direct to Teodora instead of Jelena
          });
          console.log("Email obaveštenje poslato Teodori za novi Com Plus servis");
        }
      } catch (emailError) {
        console.error("Greška pri slanju email obaveštenja:", emailError);
        // Continue execution even if email fails
      }

      res.status(201).json({
        ...newService,
        success: true,
        message: "Com Plus servis je uspešno kreiran i prosleđen Teodori Todosijević",
        redirectTo: "complus"
      });

    } catch (error) {
      console.error("Greška pri kreiranju Com Plus servisa:", error);
      res.status(500).json({
        error: "Greška servera",
        message: "Došlo je do greške pri kreiranju Com Plus servisa. Molimo pokušajte ponovo."
      });
    }
  });

  // ===== PARTKEEPR SPARE PARTS CATALOG ENDPOINTS =====
  
  // Get all spare parts catalog entries (admin only)
  app.get("/api/admin/spare-parts-catalog", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const catalog = await storage.getAllSparePartsCatalog();
      res.json(catalog);
    } catch (error) {
      console.error("Error fetching spare parts catalog:", error);
      res.status(500).json({ error: "Greška pri dohvatanju kataloga rezervnih delova" });
    }
  });

  // Get catalog entries by category
  app.get("/api/admin/spare-parts-catalog/category/:category", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { category } = req.params;
      const catalog = await storage.getSparePartsCatalogByCategory(category);
      res.json(catalog);
    } catch (error) {
      console.error("Error fetching catalog by category:", error);
      res.status(500).json({ error: "Greška pri dohvatanju kataloga po kategoriji" });
    }
  });

  // Get catalog entries by manufacturer
  app.get("/api/admin/spare-parts-catalog/manufacturer/:manufacturer", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { manufacturer } = req.params;
      const catalog = await storage.getSparePartsCatalogByManufacturer(manufacturer);
      res.json(catalog);
    } catch (error) {
      console.error("Error fetching catalog by manufacturer:", error);
      res.status(500).json({ error: "Greška pri dohvatanju kataloga po proizvođaču" });
    }
  });

  // Search spare parts catalog
  app.get("/api/admin/spare-parts-catalog/search", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Parametar pretrage 'q' je obavezan" });
      }
      
      const catalog = await storage.searchSparePartsCatalog(q);
      res.json(catalog);
    } catch (error) {
      console.error("Error searching catalog:", error);
      res.status(500).json({ error: "Greška pri pretrazi kataloga" });
    }
  });

  // Get catalog entry by part number
  app.get("/api/admin/spare-parts-catalog/part-number/:partNumber", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { partNumber } = req.params;
      const part = await storage.getSparePartsCatalogByPartNumber(partNumber);
      if (!part) {
        return res.status(404).json({ error: "Deo sa ovim kataloštim brojem nije pronađen" });
      }
      res.json(part);
    } catch (error) {
      console.error("Error fetching part by number:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dela po kataloškome broju" });
    }
  });

  // Get compatible parts for model
  app.get("/api/admin/spare-parts-catalog/compatible/:model", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { model } = req.params;
      const catalog = await storage.getSparePartsCatalogByCompatibleModel(model);
      res.json(catalog);
    } catch (error) {
      console.error("Error fetching compatible parts:", error);
      res.status(500).json({ error: "Greška pri dohvatanju kompatibilnih delova" });
    }
  });

  // Create new catalog entry
  app.post("/api/admin/spare-parts-catalog", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const validatedData = insertSparePartsCatalogSchema.parse(req.body);
      const newEntry = await storage.createSparePartsCatalogEntry(validatedData);
      res.status(201).json(newEntry);
    } catch (error) {
      console.error("Error creating catalog entry:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Neispravni podaci", details: error.errors });
      }
      res.status(500).json({ error: "Greška pri kreiranju katalog unosa" });
    }
  });

  // Update catalog entry
  app.put("/api/admin/spare-parts-catalog/:id", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const updatedEntry = await storage.updateSparePartsCatalogEntry(id, updates);
      
      if (!updatedEntry) {
        return res.status(404).json({ error: "Katalog unos nije pronađen" });
      }
      
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating catalog entry:", error);
      res.status(500).json({ error: "Greška pri ažuriranju katalog unosa" });
    }
  });

  // Delete catalog entry
  app.delete("/api/admin/spare-parts-catalog/:id", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSparePartsCatalogEntry(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Katalog unos nije pronađen" });
      }
      
      res.json({ success: true, message: "Katalog unos je uspešno uklonjen" });
    } catch (error) {
      console.error("Error deleting catalog entry:", error);
      res.status(500).json({ error: "Greška pri brisanju katalog unosa" });
    }
  });

  // Import catalog from CSV
  app.post("/api/admin/spare-parts-catalog/import-csv", jwtAuth, requireRole(["admin"]), catalogUpload.single('csvFile'), async (req, res) => {
    try {
      console.log("CSV Import attempt - file info:", req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer
      } : "No file");

      if (!req.file) {
        return res.status(400).json({ error: "CSV datoteka je obavezna" });
      }

      if (!req.file.buffer) {
        return res.status(400).json({ error: "Greška pri čitanju CSV datoteke" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      console.log("CSV Content preview:", csvContent.substring(0, 200));
      
      const { default: Papa } = await import('papaparse');
      
      const parseResult = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => value.trim()
      });

      console.log("Parse result:", {
        dataLength: parseResult.data.length,
        errorsLength: parseResult.errors.length,
        firstRow: parseResult.data[0]
      });

      if (parseResult.errors.length > 0) {
        console.log("Parse errors:", parseResult.errors);
        return res.status(400).json({ 
          error: "Greška pri parsiranju CSV datoteke", 
          details: parseResult.errors 
        });
      }

      const results = await storage.importSparePartsCatalogFromCSV(parseResult.data);
      
      res.json({
        success: true,
        message: `Uvoz završen: ${results.success} uspešnih unosa, ${results.errors.length} grešaka`,
        imported: results.success,
        errors: results.errors
      });
    } catch (error) {
      console.error("Error importing CSV:", error);
      res.status(500).json({ error: "Greška pri uvozu CSV datoteke" });
    }
  });



  // Export catalog to CSV
  app.get("/api/admin/spare-parts-catalog/export-csv", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const catalog = await storage.getAllSparePartsCatalog();
      
      // Convert to CSV format
      const csvData = catalog.map(part => ({
        'Part Number': part.partNumber,
        'Part Name': part.partName,
        'Description': part.description,
        'Category': part.category,
        'Manufacturer': part.manufacturer,
        'Compatible Models': part.compatibleModels.join(', '),
        'Price EUR': part.priceEur,
        'Price GBP': part.priceGbp,
        'Supplier Name': part.supplierName,
        'Supplier URL': part.supplierUrl,
        'Image URLs': part.imageUrls.join(', '),
        'Availability': part.availability,
        'Stock Level': part.stockLevel,
        'Min Stock Level': part.minStockLevel,
        'Dimensions': part.dimensions,
        'Weight': part.weight,
        'Technical Specs': part.technicalSpecs,
        'Installation Notes': part.installationNotes,
        'Warranty Period': part.warrantyPeriod,
        'Is OEM Part': part.isOemPart ? 'Yes' : 'No',
        'Alternative Part Numbers': part.alternativePartNumbers.join(', '),
        'Source Type': part.sourceType,
        'Created At': part.createdAt,
        'Last Updated': part.lastUpdated
      }));

      const { default: Papa } = await import('papaparse');
      const csv = Papa.unparse(csvData);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="spare-parts-catalog-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\ufeff' + csv); // Add BOM for UTF-8
    } catch (error) {
      console.error("Error exporting catalog:", error);
      res.status(500).json({ error: "Greška pri eksportu kataloga" });
    }
  });

  // Get catalog statistics (comprehensive version)
  app.get("/api/admin/spare-parts-catalog/stats", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const stats = await storage.getSparePartsCatalogStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching catalog statistics:", error);
      res.status(500).json({ error: "Greška pri dohvatanju statistika kataloga" });
    }
  });

  // Bulk update catalog entries
  app.patch("/api/admin/spare-parts-catalog/bulk-update", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { ids, updates } = req.body;
      
      if (!Array.isArray(ids) || !updates) {
        return res.status(400).json({ error: "ID lista i ažuriranja su obavezni" });
      }

      const results = { success: 0, errors: [] as string[] };
      
      for (const id of ids) {
        try {
          await storage.updateSparePartsCatalogEntry(parseInt(id), updates);
          results.success++;
        } catch (error) {
          results.errors.push(`ID ${id}: ${error instanceof Error ? error.message : 'Nepoznata greška'}`);
        }
      }
      
      res.json({
        success: true,
        message: `Masovno ažuriranje: ${results.success} uspešnih, ${results.errors.length} grešaka`,
        updated: results.success,
        errors: results.errors
      });
    } catch (error) {
      console.error("Error bulk updating catalog:", error);
      res.status(500).json({ error: "Greška pri masovnom ažuriranju" });
    }
  });

  // DIRECT WEB SCRAPING ENDPOINT - registrovan pre catch-all ruta
  app.post("/api/web-scraping/scrape", jwtAuth, requireRole(["admin"]), async (req, res) => {
    try {
      console.log(`🚀 DIRECT API endpoint /api/web-scraping/scrape pozvan od strane user-a: ${req.user?.fullName || 'Nepoznat'}`);
      console.log(`📋 Request body:`, req.body);
      
      const { manufacturer } = req.body;
      
      if (!manufacturer) {
        console.log("❌ Nedostaje proizvođač u request-u");
        return res.status(400).json({ error: "Proizvođač je obavezan" });
      }

      console.log(`🚀 Pokreće se scraping za ${manufacturer}...`);
      
      // Import web scraping service
      const { webScrapingService } = await import('./web-scraping-service.js');
      
      const result = await webScrapingService.scrapeQuinnspares(2, [manufacturer]);

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

  // WEB SCRAPING ENDPOINTS moved to web-scraping-routes.ts

  // Register Web Scraping routes
  setupWebScrapingRoutes(app);

  // Business Partner Messages API endpoints
  
  // Get all business partner messages (admin only)
  app.get("/api/admin/business-partner-messages", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const messages = await BusinessPartnerMessageService.getAllBusinessPartnerMessages(100);
      res.json(messages);
    } catch (error) {
      console.error("Greška pri dobijanju BP poruka:", error);
      res.status(500).json({ error: "Greška pri dobijanju poruka" });
    }
  });

  // Get business partner message statistics (admin only)
  app.get("/api/admin/business-partner-messages/stats", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const stats = await BusinessPartnerMessageService.getBusinessPartnerMessageStats();
      res.json(stats);
    } catch (error) {
      console.error("Greška pri dobijanju BP poruka statistika:", error);
      res.status(500).json({ error: "Greška pri dobijanju statistika" });
    }
  });

  // Mark business partner message as read (admin only)
  app.patch("/api/admin/business-partner-messages/:id/read", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      await BusinessPartnerMessageService.markMessageAsRead(messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Greška pri označavanju BP poruke kao pročitane:", error);
      res.status(500).json({ error: "Greška pri označavanju poruke" });
    }
  });

  // Reply to business partner message (admin only)
  app.post("/api/admin/business-partner-messages/:id/reply", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Sadržaj odgovora je obavezan" });
      }

      await BusinessPartnerMessageService.replyToMessage(messageId, req.user.id, content);
      res.json({ success: true });
    } catch (error) {
      console.error("Greška pri odgovoru na BP poruku:", error);
      res.status(500).json({ error: "Greška pri slanju odgovora" });
    }
  });

  // Star/unstar business partner message (admin only)
  app.patch("/api/admin/business-partner-messages/:id/star", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { isStarred } = req.body;
      
      await BusinessPartnerMessageService.toggleStarMessage(messageId, isStarred);
      res.json({ success: true });
    } catch (error) {
      console.error("Greška pri označavanju BP poruke kao važne:", error);
      res.status(500).json({ error: "Greška pri označavanju poruke" });
    }
  });

  // Archive business partner message (admin only)
  app.patch("/api/admin/business-partner-messages/:id/archive", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      await BusinessPartnerMessageService.archiveMessage(messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Greška pri arhiviranju BP poruke:", error);
      res.status(500).json({ error: "Greška pri arhiviranju poruke" });
    }
  });

  // Delete business partner message (admin only)
  app.delete("/api/admin/business-partner-messages/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      await BusinessPartnerMessageService.deleteMessage(messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Greška pri brisanju BP poruke:", error);
      res.status(500).json({ error: "Greška pri brisanju poruke" });
    }
  });

  // Business Partner Notifications API endpoints
  
  // Get all business partner notifications (admin only)
  app.get("/api/admin/business-partner-notifications", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const notifications = await BusinessPartnerNotificationService.getBusinessPartnerNotifications(100);
      res.json(notifications);
    } catch (error) {
      console.error("Greška pri dobijanju BP notifikacija:", error);
      res.status(500).json({ error: "Greška pri dobijanju notifikacija" });
    }
  });

  // Get unread business partner notifications count (admin only)
  app.get("/api/admin/business-partner-notifications/unread-count", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const count = await BusinessPartnerNotificationService.getUnreadBusinessPartnerNotificationsCount();
      res.json(count);
    } catch (error) {
      console.error("Greška pri dobijanju broja nepročitanih BP notifikacija:", error);
      res.status(500).json({ error: "Greška pri dobijanju broja notifikacija" });
    }
  });

  // Mark business partner notification as read (admin only)
  app.patch("/api/admin/business-partner-notifications/:id/read", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await BusinessPartnerNotificationService.markBusinessPartnerNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Greška pri označavanju BP notifikacije kao pročitane:", error);
      res.status(500).json({ error: "Greška pri označavanju notifikacije" });
    }
  });

  // Mark all business partner notifications as read (admin only)
  app.patch("/api/admin/business-partner-notifications/mark-all-read", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      await BusinessPartnerNotificationService.markAllBusinessPartnerNotificationsAsRead();
      res.json({ success: true });
    } catch (error) {
      console.error("Greška pri označavanju svih BP notifikacija kao pročitane:", error);
      res.status(500).json({ error: "Greška pri označavanju notifikacija" });
    }
  });

  // Delete business partner notification (admin only)
  app.delete("/api/admin/business-partner-notifications/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await BusinessPartnerNotificationService.deleteBusinessPartnerNotification(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Greška pri brisanju BP notifikacije:", error);
      res.status(500).json({ error: "Greška pri brisanju notifikacije" });
    }
  });

  // Business Partner Messages API Endpoints
  
  // Get messages for business partner
  app.get("/api/business/messages", jwtAuth, requireRole(['business_partner', 'business']), async (req, res) => {
    try {
      const messages = await db.query.businessPartnerMessages.findMany({
        where: (messages, { eq }) => eq(messages.businessPartnerId, req.user.id),
        with: {
          businessPartner: {
            columns: {
              fullName: true,
              companyName: true,
              email: true
            }
          },
          replies: {
            with: {
              admin: {
                columns: {
                  fullName: true
                }
              }
            },
            orderBy: (replies, { asc }) => [asc(replies.createdAt)]
          }
        },
        orderBy: (messages, { desc }) => [desc(messages.createdAt)]
      });
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching business partner messages:", error);
      res.status(500).json({ error: "Greška pri dohvatanju poruka" });
    }
  });

  // Send new message from business partner to admin
  app.post("/api/business/messages", jwtAuth, requireRole(['business_partner', 'business']), async (req, res) => {
    try {
      const { subject, content, messageType, messagePriority } = req.body;
      
      if (!subject?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "Naslov i sadržaj poruke su obavezni" });
      }
      
      const newMessage = await db.insert(schema.businessPartnerMessages).values({
        businessPartnerId: req.user.id,
        subject: subject.trim(),
        content: content.trim(),
        messageType: messageType || 'inquiry',
        messagePriority: messagePriority || 'medium',
        messageStatus: 'unread',
        isStarred: false
      }).returning();
      
      res.json(newMessage[0]);
    } catch (error) {
      console.error("Error creating business partner message:", error);
      res.status(500).json({ error: "Greška pri slanju poruke" });
    }
  });

  // Mark message as read (business partner)
  app.patch("/api/business/messages/:id/read", jwtAuth, requireRole(['business_partner', 'business']), async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      
      // Verify ownership
      const message = await db.query.businessPartnerMessages.findFirst({
        where: (messages, { eq, and }) => and(
          eq(messages.id, messageId),
          eq(messages.businessPartnerId, req.user.id)
        )
      });
      
      if (!message) {
        return res.status(404).json({ error: "Poruka nije pronađena" });
      }
      
      await db.update(schema.businessPartnerMessages)
        .set({ messageStatus: 'read' })
        .where(eq(schema.businessPartnerMessages.id, messageId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking business partner message as read:", error);
      res.status(500).json({ error: "Greška pri označavanju poruke kao pročitane" });
    }
  });

  // Business Partner Admin API Endpoints
  app.get("/api/admin/business-partner-services", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      // Fetch all services created by business partners
      const services = await db.query.services.findMany({
        where: (services, { isNotNull }) => isNotNull(services.businessPartnerId),
        with: {
          client: {
            columns: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              address: true,
              city: true
            }
          },
          appliance: {
            with: {
              category: {
                columns: { name: true, icon: true }
              },
              manufacturer: {
                columns: { name: true }
              }
            }
          },
          technician: {
            columns: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              specialization: true
            }
          },
          businessPartner: {
            columns: {
              id: true,
              fullName: true,
              companyName: true,
              phone: true,
              email: true
            }
          }
        },
        orderBy: (services, { desc }) => [desc(services.createdAt)]
      });

      // Process services to add calculated fields
      const enrichedServices = services
        .filter(service => service.businessPartner) // Only business partner services
        .map(service => {
          const createdAt = new Date(service.createdAt);
          const now = new Date();
          const responseTime = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)); // in hours
          
          // Determine priority based on service status and age
          let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
          if (service.status === 'pending' && responseTime > 24) priority = 'urgent';
          else if (service.status === 'pending' && responseTime > 8) priority = 'high';
          else if (service.status === 'completed') priority = 'low';
          
          // Check if overdue (more than 24h for pending)
          const isOverdue = service.status === 'pending' && responseTime > 24;
          
          return {
            ...service,
            priority,
            responseTime,
            isOverdue,
            businessPartnerCompany: service.businessPartner?.companyName || 'Unknown'
          };
        });

      res.json(enrichedServices);
    } catch (error) {
      console.error("Error fetching business partner services:", error);
      res.status(500).json({ error: "Greška pri dohvatanju business partner servisa" });
    }
  });

  app.get("/api/admin/business-partner-stats", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      // Get all business partner services
      const services = await db.query.services.findMany({
        where: (services, { isNotNull }) => isNotNull(services.businessPartnerId),
        with: {
          businessPartner: {
            columns: { companyName: true }
          }
        }
      });

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Calculate statistics
      const totalRequests = services.length;
      const pendingRequests = services.filter(s => s.status === 'pending').length;
      const activeRequests = services.filter(s => ['assigned', 'scheduled', 'in_progress'].includes(s.status)).length;
      const completedRequests = services.filter(s => s.status === 'completed').length;
      const thisMonthRequests = services.filter(s => new Date(s.createdAt) >= thisMonth).length;
      
      // Calculate overdue requests (pending > 24h)
      const overdueRequests = services.filter(s => {
        if (s.status !== 'pending') return false;
        const createdAt = new Date(s.createdAt);
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        return hoursDiff > 24;
      }).length;
      
      // Calculate average response time for completed services
      const completedServices = services.filter(s => s.status === 'completed');
      const avgResponseTime = completedServices.length > 0 
        ? Math.round(completedServices.reduce((sum, s) => {
            const createdAt = new Date(s.createdAt);
            const updatedAt = new Date(s.updatedAt);
            return sum + (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          }, 0) / completedServices.length)
        : 0;
      
      // Get unique partner count
      const uniquePartners = new Set(services.map(s => s.businessPartner?.companyName).filter(Boolean));
      const partnerCount = uniquePartners.size;
      
      // Calculate top partners
      const partnerStats = Array.from(uniquePartners).map(companyName => {
        const partnerServices = services.filter(s => s.businessPartner?.companyName === companyName);
        const completedPartnerServices = partnerServices.filter(s => s.status === 'completed');
        
        const avgResponseTime = completedPartnerServices.length > 0
          ? Math.round(completedPartnerServices.reduce((sum, s) => {
              const createdAt = new Date(s.createdAt);
              const updatedAt = new Date(s.updatedAt);
              return sum + (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            }, 0) / completedPartnerServices.length)
          : 0;
        
        return {
          companyName,
          requestCount: partnerServices.length,
          avgResponseTime,
          satisfactionScore: Math.round(85 + Math.random() * 15) // Mock satisfaction score for now
        };
      }).sort((a, b) => b.requestCount - a.requestCount).slice(0, 5);

      res.json({
        totalRequests,
        pendingRequests,
        activeRequests,
        completedRequests,
        averageResponseTime: avgResponseTime,
        overdueRequests,
        partnerCount,
        thisMonthRequests,
        topPartners: partnerStats
      });
    } catch (error) {
      console.error("Error fetching business partner stats:", error);
      res.status(500).json({ error: "Greška pri dohvatanju statistike business partnera" });
    }
  });

  app.put("/api/admin/business-partner-services/:id/priority", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { priority } = req.body;
      
      if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({ error: "Nevaljan prioritet" });
      }
      
      // Update service priority (we'll store this in service technicianNotes for now)
      const existingService = await db.query.services.findFirst({
        where: eq(schema.services.id, parseInt(id))
      });
      
      if (!existingService) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      const updatedNotes = `Priority: ${priority}${existingService.technicianNotes ? '\n' + existingService.technicianNotes : ''}`;
      
      await db.update(schema.services)
        .set({ 
          technicianNotes: updatedNotes,
          updatedAt: new Date().toISOString()
        })
        .where(eq(schema.services.id, parseInt(id)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating service priority:", error);
      res.status(500).json({ error: "Greška pri ažuriranju prioriteta" });
    }
  });

  // Get business partner pending count for sidebar
  app.get("/api/admin/business-partner-pending-count", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const pendingCount = await db.select({ count: count() })
        .from(schema.services)
        .where(
          and(
            isNotNull(schema.services.businessPartnerId),
            eq(schema.services.status, 'pending')
          )
        );
      
      res.json({ count: pendingCount[0]?.count || 0 });
    } catch (error) {
      console.error("Error fetching business partner pending count:", error);
      res.status(500).json({ error: "Greška pri dohvatanju broja pending BP zahteva" });
    }
  });

  const httpServer = createServer(app);
  // Business Partner Messages API Endpoints
  const businessPartnerMessageService = new BusinessPartnerMessageService();

  // Get all business partner messages
  app.get("/api/admin/business-partner-messages", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const messages = await businessPartnerMessageService.getAllMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching business partner messages:", error);
      res.status(500).json({ error: "Greška pri dohvatanju poruka" });
    }
  });

  // Create new business partner message
  app.post("/api/admin/business-partner-messages", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { subject, content, messageType, priority } = req.body;
      
      const messageData = {
        subject,
        content,
        messageType,
        priority: priority || 'normal',
        status: 'unread' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        isStarred: false
      };

      const message = await businessPartnerMessageService.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating business partner message:", error);
      res.status(500).json({ error: "Greška pri kreiranju poruke" });
    }
  });

  // Update business partner message
  app.put("/api/admin/business-partner-messages/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const updateData = req.body;
      
      const message = await businessPartnerMessageService.updateMessage(messageId, updateData);
      res.json(message);
    } catch (error) {
      console.error("Error updating business partner message:", error);
      res.status(500).json({ error: "Greška pri ažuriranju poruke" });
    }
  });

  // Delete business partner message
  app.delete("/api/admin/business-partner-messages/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      await businessPartnerMessageService.deleteMessage(messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting business partner message:", error);
      res.status(500).json({ error: "Greška pri brisanju poruke" });
    }
  });

  // Get message statistics
  app.get("/api/admin/business-partner-messages/stats", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const stats = await businessPartnerMessageService.getMessageStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching message stats:", error);
      res.status(500).json({ error: "Greška pri dohvatanju statistika poruka" });
    }
  });

  return httpServer;
}
