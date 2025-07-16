import * as XLSX from 'xlsx';
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
    return this.createExcelBuffer(clients, 'Klijenti');
  }

  /**
   * Izvozi servisere u Excel format
   */
  public async exportTechnicians(): Promise<Buffer> {
    const technicians = await storage.getAllTechnicians();
    return this.createExcelBuffer(technicians, 'Serviseri');
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
    
    return this.createExcelBuffer(enrichedAppliances, 'Uređaji');
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
    
    return this.createExcelBuffer(enrichedServices, 'Servisi');
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
    
    return this.createExcelBuffer(enrichedSchedules, 'Planovi Održavanja');
  }

  /**
   * Kreira Excel buffer iz podataka
   */
  private createExcelBuffer(data: any[], sheetName: string): Buffer {
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
    
    // Obradi svaki red iz Excel tabele
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      
      try {
        // Ekstraktuj podatke iz reda (fleksibilno mapiranje naziva kolona)
        const clientName = String(row['Ime i prezime klijenta'] || row['ime_klijenta'] || row['klijent'] || row['client'] || row['name'] || '').trim();
        const clientPhone = String(row['Telefon'] || row['telefon'] || row['phone'] || row['broj_telefona'] || '').trim();
        const clientCity = this.mapCityCode(String(row['Grad'] || row['grad'] || row['city'] || row['mjesto'] || '').trim());
        
        const applianceType = String(row['Tip aparata'] || row['tip_aparata'] || row['type'] || row['kategorija'] || '').trim();
        const manufacturer = String(row['Proizvođač'] || row['proizvodjac'] || row['manufacturer'] || row['brand'] || '').trim();
        const model = String(row['Model'] || row['model'] || row['tip'] || '').trim();
        const serialNumber = String(row['Serijski broj'] || row['serijski_broj'] || row['serial'] || row['sn'] || '').trim();
        
        const serviceDescription = String(row['Opis kvara'] || row['opis_kvara'] || row['problem'] || '').trim();
        
        // Bezbednije parsiranje datuma - format YYYY-MM-DD
        let registrationDate = new Date().toISOString().split('T')[0];
        const rawDate = row['Datum registracije'] || row['datum_registracije'] || row['datum'];
        if (rawDate) {
          try {
            const parsedDate = new Date(rawDate);
            if (!isNaN(parsedDate.getTime())) {
              registrationDate = parsedDate.toISOString().split('T')[0];
            }
          } catch (error) {
            // Ako parsiranje datuma ne uspe, koristi trenutni datum
            console.warn(`Neispravan datum: ${rawDate}, koristim trenutni datum`);
          }
        }
        
        const warrantyStatus = String(row['Garancija'] || row['garancija'] || row['warranty'] || 'ne').toLowerCase() === 'da' ? 'in_warranty' : 'out_of_warranty';
        
        // Preskačemo redove koji nemaju osnovne podatke
        if (!clientName && !clientPhone) {
          throw new Error('Nedostaju osnovni podaci o klijentu (ime ili telefon)');
        }
        
        // Ako nema ime, generiši ga iz telefona
        const finalClientName = clientName || `Klijent ${clientPhone}`;
        
        // Ako nema telefon, generiši ga
        const finalClientPhone = clientPhone || '000-000-000';
        
        // 1. Kreiraj ili pronađi klijenta
        let clientId = clientMap.get(finalClientName.toLowerCase()) || clientMap.get(finalClientPhone.toLowerCase());
        
        if (!clientId) {
          const clientData = {
            fullName: finalClientName,
            phone: finalClientPhone,
            city: clientCity || 'Nepoznat grad',
            address: '', // Nema adrese u starom sistemu
            email: '' // Nema email-a u starom sistemu
          };
          
          try {
            const validatedClientData = insertClientSchema.parse(clientData);
            const newClient = await storage.createClient(validatedClientData);
            clientId = newClient.id;
            clientMap.set(finalClientName.toLowerCase(), clientId);
            clientMap.set(finalClientPhone.toLowerCase(), clientId);
            result.summary.clientsCreated++;
          } catch (clientError) {
            throw new Error(`Greška pri kreiranju klijenta: ${clientError instanceof Error ? clientError.message : 'Nepoznata greška'}`);
          }
        }
        
        // 2. Kreiraj ili pronađi kategoriju aparata
        const mappedApplianceType = this.mapApplianceTypeCode(applianceType) || 'Nepoznat uređaj';
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
        let manufacturerId = manufacturerMap.get(manufacturer.toLowerCase());
        
        if (!manufacturerId && manufacturer) {
          const manufacturerData = {
            name: manufacturer
          };
          
          const validatedManufacturerData = insertManufacturerSchema.parse(manufacturerData);
          const newManufacturer = await storage.createManufacturer(validatedManufacturerData);
          manufacturerId = newManufacturer.id;
          manufacturerMap.set(manufacturer.toLowerCase(), manufacturerId);
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
        if (serviceDescription && applianceId) {
          const serviceData = {
            description: serviceDescription,
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