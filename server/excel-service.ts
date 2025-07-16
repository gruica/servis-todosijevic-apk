// XLSX će biti importovan dinamički da se izbegnu ES module problemi
import { storage } from './storage';
import {
  Client,
  Technician,
  Appliance,
  ApplianceCategory,
  Manufacturer,
  Service,
  MaintenanceSchedule,
  insertClientSchema,
  insertTechnicianSchema,
  insertApplianceSchema,
  insertApplianceCategorySchema,
  insertManufacturerSchema,
  insertServiceSchema,
  insertMaintenanceScheduleSchema,
  maintenanceFrequencyEnum
} from '@shared/schema';
import { z } from 'zod';

/**
 * Servis za uvoz i izvoz podataka u Excel formatu
 */
export class ExcelService {
  private static instance: ExcelService;

  private constructor() {}

  /**
   * Dohvata jedinstvenu instancu ExcelService (Singleton pattern)
   */
  public static getInstance(): ExcelService {
    if (!ExcelService.instance) {
      ExcelService.instance = new ExcelService();
    }
    return ExcelService.instance;
  }

  /**
   * Izvozi klijente u Excel format
   */
  public async exportClients(): Promise<Buffer> {
    const clients = await storage.getAllClients();
    return await this.createExcelBuffer(clients, 'Klijenti');
  }

  /**
   * Izvozi servisere u Excel format
   */
  public async exportTechnicians(): Promise<Buffer> {
    const technicians = await storage.getAllTechnicians();
    return await this.createExcelBuffer(technicians, 'Serviseri');
  }

  /**
   * Izvozi uređaje u Excel format
   */
  public async exportAppliances(): Promise<Buffer> {
    const appliances = await storage.getAllAppliances();
    const enrichedAppliances = await Promise.all(
      appliances.map(async (appliance) => {
        const client = await storage.getClient(appliance.clientId);
        const category = await storage.getApplianceCategory(appliance.categoryId);
        const manufacturer = await storage.getManufacturer(appliance.manufacturerId);

        return {
          ...appliance,
          clientName: client?.fullName || 'Nepoznat',
          categoryName: category?.name || 'Nepoznata',
          manufacturerName: manufacturer?.name || 'Nepoznat'
        };
      })
    );
    
    return await this.createExcelBuffer(enrichedAppliances, 'Uređaji');
  }

  /**
   * Izvozi servise u Excel format
   */
  public async exportServices(): Promise<Buffer> {
    const services = await storage.getAllServices();
    const enrichedServices = await Promise.all(
      services.map(async (service) => {
        const client = await storage.getClient(service.clientId);
        const appliance = await storage.getAppliance(service.applianceId);
        const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;

        return {
          ...service,
          clientName: client?.fullName || 'Nepoznat',
          applianceName: appliance ? `${appliance.model || 'Nepoznat model'} (${appliance.serialNumber || 'Nepoznat SN'})` : 'Nepoznat',
          technicianName: technician?.fullName || 'Nedodeljen'
        };
      })
    );
    
    return await this.createExcelBuffer(enrichedServices, 'Servisi');
  }

  /**
   * Izvozi planove održavanja u Excel format
   */
  public async exportMaintenanceSchedules(): Promise<Buffer> {
    const schedules = await storage.getAllMaintenanceSchedules();
    const enrichedSchedules = await Promise.all(
      schedules.map(async (schedule) => {
        const appliance = await storage.getAppliance(schedule.applianceId);
        let client = null;
        
        if (appliance) {
          client = await storage.getClient(appliance.clientId);
        }

        return {
          ...schedule,
          clientName: client?.fullName || 'Nepoznat',
          applianceName: appliance ? `${appliance.model || 'Nepoznat model'} (${appliance.serialNumber || 'Nepoznat SN'})` : 'Nepoznat',
        };
      })
    );
    
    return await this.createExcelBuffer(enrichedSchedules, 'Planovi Održavanja');
  }

  /**
   * Kreira Excel buffer iz podataka
   */
  private async createExcelBuffer(data: any[], sheetName: string): Promise<Buffer> {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generiši buffer
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Mapiranje skraćenica gradova iz starog sistema u pun naziv
   */
  private mapCityCode(cityCode: string): string {
    const cityMap: Record<string, string> = {
      'TV': 'Tivat',
      'KO': 'Kotor',
      'BD': 'Budva',
      'PG': 'Podgorica',
      'NK': 'Nikšić',
      'PL': 'Pljevlja',
      'HN': 'Herceg Novi',
      'BA': 'Bar',
      'UL': 'Ulcinj',
      'CT': 'Cetinje',
      'BJ': 'Bijelo Polje',
      'RO': 'Rožaje',
      'PV': 'Plav',
      'ZB': 'Žabljak',
      'DG': 'Danilovgrad',
      'MK': 'Mojkovac',
      'KL': 'Kolašin',
      'BE': 'Berane',
      'AN': 'Andrijevica',
      'PZ': 'Plužine',
      'SA': 'Šavnik',
      'GO': 'Gusinje',
      'PE': 'Petnjica'
    };
    
    const upperCode = cityCode.toUpperCase().trim();
    return cityMap[upperCode] || cityCode; // Vraća originalni string ako nije pronađeno mapiranje
  }

  /**
   * Mapiranje skraćenica tipova aparata iz starog sistema u pun naziv kategorije
   */
  private mapApplianceTypeCode(typeCode: string): string {
    const typeMap: Record<string, string> = {
      'SM': 'Sudo mašina',
      'VM': 'Veš mašina',
      'VM KOMB': 'Kombinovana veš mašina',
      'VM KOMB.': 'Kombinovana veš mašina',
      'VM komb': 'Kombinovana veš mašina',
      'VM komb.': 'Kombinovana veš mašina',
      'SM UG': 'Ugradna sudo mašina',
      'SM UG.': 'Ugradna sudo mašina',
      'SM ug': 'Ugradna sudo mašina',
      'SM ug.': 'Ugradna sudo mašina',
      'frižider': 'Frižider',
      'FRIŽIDER': 'Frižider',
      'frizider': 'Frižider',
      'FRIZIDER': 'Frižider',
      'frižider komb': 'Kombinovan frižider',
      'FRIŽIDER KOMB': 'Kombinovan frižider',
      'frizider komb': 'Kombinovan frižider',
      'FRIZIDER KOMB': 'Kombinovan frižider',
      'šporet': 'Šporet',
      'ŠPORET': 'Šporet',
      'sporet': 'Šporet',
      'SPORET': 'Šporet',
      'rerka': 'Rerka',
      'RERKA': 'Rerka',
      'RERNA': 'Rerka',
      'rerna': 'Rerka',
      'TA': 'Toster aparat',
      'toster': 'Toster aparat',
      'TOSTER': 'Toster aparat',
      'klimu': 'Klima uređaj',
      'KLIMU': 'Klima uređaj',
      'klima': 'Klima uređaj',
      'KLIMA': 'Klima uređaj',
      'inverter': 'Inverter klima',
      'INVERTER': 'Inverter klima'
    };
    
    const trimmedCode = typeCode.trim();
    return typeMap[trimmedCode] || typeMap[trimmedCode.toUpperCase()] || trimmedCode;
  }

  /**
   * Odabir odgovarajuće ikone za kategoriju na osnovu naziva
   */
  private getIconForCategory(categoryName: string): string {
    const iconMap: Record<string, string> = {
      'Sudo mašina': 'dishwasher',
      'Ugradna sudo mašina': 'dishwasher',
      'Veš mašina': 'washing-machine',
      'Kombinovana veš mašina': 'washing-machine',
      'Frižider': 'refrigerator',
      'Šporet': 'stove',
      'Rerka': 'oven',
      'Toster aparat': 'toaster',
      'Klima uređaj': 'air-conditioner',
      'Inverter klima': 'air-conditioner'
    };
    
    return iconMap[categoryName] || 'devices';
  }

  /**
   * Uvozi klijente iz Excel fajla
   */
  public async importClients(buffer: Buffer): Promise<{ 
    total: number;
    imported: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const result = {
      total: data.length,
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>
    };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as Record<string, any>;
      try {
        // Pripremi podatke za validaciju kroz Zod schemu
        const rawCity = row.city || row.grad || row.mesto || '';
        const mappedCity = rawCity ? this.mapCityCode(String(rawCity)) : undefined;
        
        const clientData = {
          fullName: String(row.fullName || row.full_name || row.ime_prezime || row.imePrezime || ''),
          phone: String(row.phone || row.telefon || row.phoneNumber || row.broj_telefona || ''),
          email: row.email ? String(row.email || row.e_mail || row.e_posta || '') : undefined,
          address: row.address ? String(row.address || row.adresa || '') : undefined,
          city: mappedCity,
        };
        
        // Validiraj podatke
        const validatedData = insertClientSchema.parse(clientData);
        
        // Kreiraj klijenta
        await storage.createClient(validatedData);
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: i + 2, // +2 jer Excel indeksira od 1 i ima header red
          error: error instanceof Error ? error.message : 'Nepoznata greška'
        });
      }
    }
    
    return result;
  }

  /**
   * Uvozi uređaje iz Excel fajla
   */
  public async importAppliances(buffer: Buffer): Promise<{ 
    total: number;
    imported: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const result = {
      total: data.length,
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>
    };
    
    // Prvo učitamo sve kategorije i proizvođače za brže pretraživanje
    const categories = await storage.getAllApplianceCategories();
    const manufacturers = await storage.getAllManufacturers();
    const clients = await storage.getAllClients();
    
    // Kreira mape za brže pretraživanje
    const categoryMap = new Map<string, number>();
    categories.forEach(cat => categoryMap.set(cat.name.toLowerCase(), cat.id));
    
    const manufacturerMap = new Map<string, number>();
    manufacturers.forEach(man => manufacturerMap.set(man.name.toLowerCase(), man.id));
    
    const clientMap = new Map<string, number>();
    clients.forEach(client => {
      clientMap.set(client.fullName.toLowerCase(), client.id);
      if (client.email) clientMap.set(client.email.toLowerCase(), client.id);
      if (client.phone) clientMap.set(client.phone.toLowerCase(), client.id);
    });
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as Record<string, any>;
      try {
        // Pronađi ili kreiraj kategoriju sa mapiranjem tipova aparata
        let categoryId: number | null = null;
        const rawCategoryName = row.category || row.kategorija || row.tip || row.tip_aparata || '';
        
        if (rawCategoryName) {
          // Primeni mapiranje skraćenica tipova aparata
          const mappedCategoryName = this.mapApplianceTypeCode(String(rawCategoryName));
          const categoryNameLower = mappedCategoryName.toLowerCase();
          
          if (categoryMap.has(categoryNameLower)) {
            categoryId = categoryMap.get(categoryNameLower) || null;
          } else {
            // Kreiraj novu kategoriju sa mapiranim nazivom
            try {
              const newCategory = await storage.createApplianceCategory({
                name: mappedCategoryName,
                icon: this.getIconForCategory(mappedCategoryName)
              });
              categoryId = newCategory.id;
              categoryMap.set(categoryNameLower, newCategory.id);
            } catch (error) {
              // Ignorišemo greške pri kreiranju kategorije
            }
          }
        }
        
        // Pronađi ili kreiraj proizvođača
        let manufacturerId: number | null = null;
        const manufacturerName = row.manufacturer || row.proizvodjac || row.marka || '';
        
        if (manufacturerName) {
          const manufacturerNameLower = String(manufacturerName).toLowerCase();
          if (manufacturerMap.has(manufacturerNameLower)) {
            manufacturerId = manufacturerMap.get(manufacturerNameLower) || null;
          } else {
            // Kreiraj novog proizvođača
            try {
              const newManufacturer = await storage.createManufacturer({
                name: String(manufacturerName)
              });
              manufacturerId = newManufacturer.id;
              manufacturerMap.set(manufacturerNameLower, newManufacturer.id);
            } catch (error) {
              // Ignorišemo greške pri kreiranju proizvođača
            }
          }
        }
        
        // Pronađi klijenta po imenu, emailu ili telefonu
        let clientId: number | null = null;
        const clientIdentifier = row.client || row.klijent || row.vlasnik || row.client_email || row.client_phone || '';
        
        if (clientIdentifier) {
          const clientIdentifierLower = String(clientIdentifier).toLowerCase();
          if (clientMap.has(clientIdentifierLower)) {
            clientId = clientMap.get(clientIdentifierLower) || null;
          } else {
            // Ako nema klijenta, preskačemo uređaj
            throw new Error(`Klijent '${clientIdentifier}' nije pronađen`);
          }
        } else {
          throw new Error('Nedostaje identifikator klijenta');
        }
        
        // Pripremi podatke za validaciju kroz Zod schemu
        const applianceData = {
          model: row.model ? String(row.model) : undefined,
          serialNumber: row.serialNumber ? String(row.serialNumber || row.serial_number || row.serijski_broj || row.sn) : undefined,
          purchaseDate: row.purchaseDate ? String(row.purchaseDate || row.purchase_date || row.datum_kupovine) : undefined,
          clientId: clientId || 0,
          categoryId: categoryId || 0,
          manufacturerId: manufacturerId || 0,
          notes: row.notes ? String(row.notes || row.opis || row.description) : undefined
        };
        
        // Validiraj podatke
        const validatedData = insertApplianceSchema.parse(applianceData);
        
        // Kreiraj uređaj
        await storage.createAppliance(validatedData);
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: i + 2, // +2 jer Excel indeksira od 1 i ima header red
          error: error instanceof Error ? error.message : 'Nepoznata greška'
        });
      }
    }
    
    return result;
  }

  /**
   * Uvozi servise iz Excel fajla
   */
  public async importServices(buffer: Buffer): Promise<{ 
    total: number;
    imported: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const result = {
      total: data.length,
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>
    };
    
    // Učitaj sve klijente, uređaje i servisere za brže pretraživanje
    const clients = await storage.getAllClients();
    const appliances = await storage.getAllAppliances();
    const technicians = await storage.getAllTechnicians();
    
    // Kreira mape za brže pretraživanje
    const clientMap = new Map<string, number>();
    clients.forEach(client => {
      clientMap.set(client.fullName.toLowerCase(), client.id);
      if (client.email) clientMap.set(client.email.toLowerCase(), client.id);
      if (client.phone) clientMap.set(client.phone.toLowerCase(), client.id);
    });
    
    const applianceMap = new Map<string, number>();
    appliances.forEach(appliance => {
      if (appliance.serialNumber) {
        applianceMap.set(appliance.serialNumber.toLowerCase(), appliance.id);
        if (appliance.model) {
          applianceMap.set(`${appliance.model.toLowerCase()}-${appliance.serialNumber.toLowerCase()}`, appliance.id);
        }
      }
    });
    
    const technicianMap = new Map<string, number>();
    technicians.forEach(tech => {
      technicianMap.set(tech.fullName.toLowerCase(), tech.id);
      if (tech.email) technicianMap.set(tech.email.toLowerCase(), tech.id);
      if (tech.phone) technicianMap.set(tech.phone.toLowerCase(), tech.id);
    });
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as Record<string, any>;
      try {
        // Pronađi klijenta
        let clientId: number | null = null;
        const clientIdentifier = row.client || row.klijent || row.client_name || row.ime_klijenta || '';
        
        if (clientIdentifier) {
          const clientIdentifierLower = String(clientIdentifier).toLowerCase();
          if (clientMap.has(clientIdentifierLower)) {
            clientId = clientMap.get(clientIdentifierLower) || null;
          } else {
            throw new Error(`Klijent '${clientIdentifier}' nije pronađen`);
          }
        }
        
        // Pronađi uređaj
        let applianceId: number | null = null;
        const applianceIdentifier = row.appliance || row.aparat || row.uredjaj || row.serial_number || row.serijski_broj || '';
        
        if (applianceIdentifier) {
          const applianceIdentifierLower = String(applianceIdentifier).toLowerCase();
          if (applianceMap.has(applianceIdentifierLower)) {
            applianceId = applianceMap.get(applianceIdentifierLower) || null;
          } else {
            // Pokušaj pronaći po modelu-serijskom broju
            const model = row.model || '';
            if (model && applianceIdentifier) {
              const combinedKey = `${String(model).toLowerCase()}-${applianceIdentifierLower}`;
              if (applianceMap.has(combinedKey)) {
                applianceId = applianceMap.get(combinedKey) || null;
              }
            }
            
            if (!applianceId) {
              throw new Error(`Uređaj '${applianceIdentifier}' nije pronađen`);
            }
          }
        }
        
        // Pronađi servisera
        let technicianId: number | undefined = undefined;
        const technicianIdentifier = row.technician || row.serviser || row.tech_name || row.ime_servisera || '';
        
        if (technicianIdentifier) {
          const techIdentifierLower = String(technicianIdentifier).toLowerCase();
          if (technicianMap.has(techIdentifierLower)) {
            technicianId = technicianMap.get(techIdentifierLower) || undefined;
          }
          // Ako serviser nije pronađen, ostavićemo undefined - nije obavezan
        }
        
        // Pripremi podatke za validaciju kroz Zod schemu
        const serviceData = {
          description: String(row.description || row.opis || row.problem || ''),
          status: row.status ? String(row.status) : undefined,
          clientId: clientId || 0,
          applianceId: applianceId || 0,
          technicianId: technicianId,
          scheduledDate: row.scheduledDate ? String(row.scheduledDate || row.scheduled_date || row.datum) : undefined,
          completedDate: row.completedDate ? String(row.completedDate || row.completed_date || row.datum_zavrsetka) : undefined,
          cost: row.cost ? String(row.cost || row.cena || row.cijena) : undefined,
          technicianNotes: row.technicianNotes ? String(row.technicianNotes || row.tech_notes || row.beleske_servisera) : undefined,
          createdAt: row.createdAt ? String(row.createdAt || row.created_at || row.datum_kreiranja) : new Date().toISOString()
        };
        
        // Validiraj podatke
        const validatedData = insertServiceSchema.parse(serviceData);
        
        // Kreiraj servis
        await storage.createService(validatedData);
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: i + 2, // +2 jer Excel indeksira od 1 i ima header red
          error: error instanceof Error ? error.message : 'Nepoznata greška'
        });
      }
    }
    
    return result;
  }

  /**
   * Kompletna migracija iz starog sistema - čita jednu Excel tabelu i kreira sve entitete
   */
  public async importLegacyComplete(buffer: Buffer): Promise<{ 
    total: number;
    imported: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
    summary: {
      clientsCreated: number;
      appliancesCreated: number;
      servicesCreated: number;
    };
  }> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const result = {
      total: data.length,
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
      summary: {
        clientsCreated: 0,
        appliancesCreated: 0,
        servicesCreated: 0
      }
    };
    
    // Učitaj postojeće podatke
    const existingClients = await storage.getAllClients();
    const existingAppliances = await storage.getAllAppliances();
    const categories = await storage.getAllApplianceCategories();
    const manufacturers = await storage.getAllManufacturers();
    
    // Kreira mape za brže pretraživanje
    const clientMap = new Map<string, number>();
    existingClients.forEach(client => {
      clientMap.set(client.fullName.toLowerCase(), client.id);
      if (client.phone) clientMap.set(client.phone.toLowerCase(), client.id);
    });
    
    const applianceMap = new Map<string, number>();
    existingAppliances.forEach(appliance => {
      if (appliance.serialNumber) {
        applianceMap.set(appliance.serialNumber.toLowerCase(), appliance.id);
      }
    });
    
    const categoryMap = new Map<string, number>();
    categories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    });
    
    const manufacturerMap = new Map<string, number>();
    manufacturers.forEach(man => {
      manufacturerMap.set(man.name.toLowerCase(), man.id);
    });
    
    // Debug: Ispiši nazive kolona iz prve 3 reda
    if (data.length > 0) {
      console.log('🔍 Debug: Nazivi kolona u Excel tabeli:');
      console.log('Kolone u prvom redu:', Object.keys(data[0]));
      if (data.length > 1) {
        console.log('Primer vrednosti iz reda 2:', data[1]);
      }
      
      // Dodatni debug za prve 5 redova
      console.log('🔍 Debug: Analiza prvih 5 redova:');
      for (let debugI = 0; debugI < Math.min(5, data.length); debugI++) {
        const debugRow = data[debugI];
        console.log(`Red ${debugI + 1}:`, {
          allKeys: Object.keys(debugRow),
          sampleValues: Object.fromEntries(Object.entries(debugRow).slice(0, 10))
        });
      }
    }
    
    // Obradi svaki red iz Excel tabele
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      
      try {
        // Ekstraktuj podatke iz reda na osnovu pozicije kolona
        // Kolone: Datum, Grad, Ime i prezime, Aparat, Opis kvara, Dio, Broj telefona, Proizvođač, Garancija, [prazna], Datum servisa, Gotovina, Kupon, Virman
        const allKeys = Object.keys(row);
        const allValues = Object.values(row);
        
        // Mapiranje na osnovu pozicije u tabeli
        const registrationDateRaw = allValues[0]; // Kolona 1: Datum
        const clientCity = this.mapCityCode(String(allValues[1] || '').trim()); // Kolona 2: Grad
        const clientName = String(allValues[2] || '').trim(); // Kolona 3: Ime i prezime
        const applianceType = String(allValues[3] || '').trim(); // Kolona 4: Aparat
        const serviceDescription = String(allValues[4] || '').trim(); // Kolona 5: Opis kvara
        // Kolona 6: Dio - zanemarujemo
        const clientPhone = String(allValues[6] || '').trim(); // Kolona 7: Broj telefona
        const manufacturer = String(allValues[7] || '').trim(); // Kolona 8: Proizvođač
        const warrantyStatusRaw = String(allValues[8] || '').trim(); // Kolona 9: Garancija
        // Kolone 10+ zanemarujemo (prazna, datum servisa, gotovina, kupon, virman)
        
        // Fallback na mapiranje po nazivima kolona ako pozicijski pristup ne radi
        let fallbackClientName = clientName;
        let fallbackClientPhone = clientPhone;
        let fallbackClientCity = clientCity || this.mapCityCode('');
        let fallbackApplianceType = applianceType;
        let fallbackServiceDescription = serviceDescription;
        let fallbackManufacturer = manufacturer;
        let fallbackWarrantyStatus = warrantyStatusRaw;
        
        if (!fallbackClientName || !fallbackClientPhone) {
          // Pokušaj mapiranje po nazivima kolona
          fallbackClientName = fallbackClientName || String(row['Ime i prezime'] || row['ime_prezime'] || row['ime'] || row['name'] || '').trim();
          fallbackClientPhone = fallbackClientPhone || String(row['Telefon'] || row['telefon'] || row['phone'] || row['broj_telefona'] || '').trim();
          fallbackClientCity = fallbackClientCity || this.mapCityCode(String(row['Grad'] || row['grad'] || row['city'] || '').trim());
          fallbackApplianceType = fallbackApplianceType || String(row['Aparat'] || row['aparat'] || row['tip_aparata'] || '').trim();
          fallbackServiceDescription = fallbackServiceDescription || String(row['Opis kvara'] || row['opis_kvara'] || row['problem'] || '').trim();
          fallbackManufacturer = fallbackManufacturer || String(row['Proizvođač'] || row['proizvodjac'] || row['manufacturer'] || '').trim();
          fallbackWarrantyStatus = fallbackWarrantyStatus || String(row['Garancija'] || row['garancija'] || row['warranty'] || '').trim();
        }
        
        // Koristi finalne vrijednosti
        const finalClientName = fallbackClientName;
        const finalClientPhone = fallbackClientPhone;
        const finalClientCity = fallbackClientCity;
        const finalApplianceType = fallbackApplianceType;
        const finalServiceDescription = fallbackServiceDescription;
        const finalManufacturer = fallbackManufacturer;
        
        // Obradi ostale vrijednosti
        const model = ''; // Nema model u legacy tabeli
        const serialNumber = ''; // Nema serijski broj u legacy tabeli
        
        // Bezbednije parsiranje datuma - format YYYY-MM-DD
        let registrationDate = new Date().toISOString().split('T')[0];
        if (registrationDateRaw) {
          try {
            const parsedDate = new Date(registrationDateRaw);
            if (!isNaN(parsedDate.getTime())) {
              registrationDate = parsedDate.toISOString().split('T')[0];
            }
          } catch (error) {
            // Ako parsiranje datuma ne uspe, koristi trenutni datum
            console.warn(`Neispravan datum: ${registrationDateRaw}, koristim trenutni datum`);
          }
        }
        
        const warrantyStatus = String(fallbackWarrantyStatus || 'ne').toLowerCase() === 'da' ? 'in_warranty' : 'out_of_warranty';
        
        // Debug: ispišemo podatke za prve 3 reda
        if (i < 3) {
          console.log(`🔍 DEBUG Red ${i + 1}:`, {
            finalClientName,
            finalClientPhone,
            finalClientCity,
            finalApplianceType,
            finalManufacturer,
            model,
            serialNumber,
            finalServiceDescription,
            registrationDate,
            warrantyStatus
          });
        }
        
        // Preskačemo redove koji nemaju osnovne podatke
        if (!finalClientName && !finalClientPhone) {
          // Pokušaj da pronađe bilo koju kolonu sa tekstom
          const allValues = Object.values(row).filter(val => val && String(val).trim() !== '');
          if (allValues.length === 0) {
            throw new Error('Prazan red - nema podataka');
          }
          
          // Ako ima podataka ali ne prepoznaje kolone, prikaži dostupne kolone
          const availableColumns = Object.keys(row).filter(key => row[key] && String(row[key]).trim() !== '');
          throw new Error(`Nedostaju osnovni podaci o klijentu (ime ili telefon). Dostupne kolone: ${availableColumns.join(', ')}`);
        }
        
        // Ako nema ime, generiši ga iz telefona
        const processedClientName = finalClientName || `Klijent ${finalClientPhone}`;
        
        // Ako nema telefon, generiši ga
        const processedClientPhone = finalClientPhone || '000-000-000';
        
        // 1. Kreiraj ili pronađi klijenta
        let clientId = clientMap.get(processedClientName.toLowerCase()) || clientMap.get(processedClientPhone.toLowerCase());
        
        if (!clientId) {
          const clientData = {
            fullName: processedClientName,
            phone: processedClientPhone,
            city: finalClientCity || 'Nepoznat grad',
            address: '', // Nema adrese u starom sistemu
            email: '' // Nema email-a u starom sistemu
          };
          
          try {
            const validatedClientData = insertClientSchema.parse(clientData);
            const newClient = await storage.createClient(validatedClientData);
            clientId = newClient.id;
            clientMap.set(processedClientName.toLowerCase(), clientId);
            clientMap.set(processedClientPhone.toLowerCase(), clientId);
            result.summary.clientsCreated++;
          } catch (clientError) {
            throw new Error(`Greška pri kreiranju klijenta: ${clientError instanceof Error ? clientError.message : 'Nepoznata greška'}`);
          }
        }
        
        // 2. Kreiraj ili pronađi kategoriju aparata
        const mappedApplianceType = this.mapApplianceTypeCode(finalApplianceType) || 'Nepoznat uređaj';
        let categoryId = categoryMap.get(mappedApplianceType.toLowerCase());
        
        if (!categoryId) {
          const categoryData = {
            name: mappedApplianceType,
            icon: this.getIconForCategory(mappedApplianceType)
          };
          
          try {
            const validatedCategoryData = insertApplianceCategorySchema.parse(categoryData);
            const newCategory = await storage.createApplianceCategory(validatedCategoryData);
            categoryId = newCategory.id;
            categoryMap.set(mappedApplianceType.toLowerCase(), categoryId);
          } catch (categoryError) {
            throw new Error(`Greška pri kreiranju kategorije: ${categoryError instanceof Error ? categoryError.message : 'Nepoznata greška'}`);
          }
        }
        
        // 3. Kreiraj ili pronađi proizvođača
        let manufacturerId = manufacturerMap.get(finalManufacturer.toLowerCase());
        
        if (!manufacturerId && finalManufacturer) {
          const manufacturerData = {
            name: finalManufacturer
          };
          
          const validatedManufacturerData = insertManufacturerSchema.parse(manufacturerData);
          const newManufacturer = await storage.createManufacturer(validatedManufacturerData);
          manufacturerId = newManufacturer.id;
          manufacturerMap.set(finalManufacturer.toLowerCase(), manufacturerId);
        }
        
        // 4. Kreiraj ili pronađi uređaj
        let applianceId = serialNumber ? applianceMap.get(serialNumber.toLowerCase()) : undefined;
        
        if (!applianceId && serialNumber) {
          const applianceData = {
            model: model || 'Nepoznat model',
            serialNumber: serialNumber,
            clientId: clientId,
            categoryId: categoryId || 0,
            manufacturerId: manufacturerId || 0,
            notes: `Migrirano iz starog sistema - ${new Date(registrationDate).toLocaleDateString('sr-RS')}`
          };
          
          try {
            const validatedApplianceData = insertApplianceSchema.parse(applianceData);
            const newAppliance = await storage.createAppliance(validatedApplianceData);
            applianceId = newAppliance.id;
            applianceMap.set(serialNumber.toLowerCase(), applianceId);
            result.summary.appliancesCreated++;
          } catch (applianceError) {
            throw new Error(`Greška pri kreiranju uređaja: ${applianceError instanceof Error ? applianceError.message : 'Nepoznata greška'}`);
          }
        }
        
        // 5. Kreiraj servis
        if (finalServiceDescription && applianceId) {
          const serviceData = {
            description: finalServiceDescription,
            status: 'completed' as const, // Stari servisi su obično završeni
            warrantyStatus: warrantyStatus as 'in_warranty' | 'out_of_warranty',
            clientId: clientId,
            applianceId: applianceId,
            createdAt: registrationDate,
            completedDate: registrationDate,
            technicianNotes: `Migrirano iz starog sistema - ${new Date(registrationDate).toLocaleDateString('sr-RS')}`
          };
          
          const validatedServiceData = insertServiceSchema.parse(serviceData);
          await storage.createService(validatedServiceData);
          result.summary.servicesCreated++;
        }
        
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: i + 2, // +2 jer Excel indeksira od 1 i ima header red
          error: error instanceof Error ? error.message : 'Nepoznata greška'
        });
      }
    }
    
    return result;
  }
}

export const excelService = ExcelService.getInstance();