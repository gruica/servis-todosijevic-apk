import { 
  User, InsertUser, 
  Client, InsertClient, 
  ApplianceCategory, InsertApplianceCategory,
  Manufacturer, InsertManufacturer,
  Appliance, InsertAppliance,
  Service, InsertService,
  ServiceStatus,
  Technician, InsertTechnician,
  MaintenanceSchedule, InsertMaintenanceSchedule,
  MaintenanceAlert, InsertMaintenanceAlert,
  RequestTracking, InsertRequestTracking,
  BotVerification, InsertBotVerification,
  EmailVerification, InsertEmailVerification,
  SparePartOrder, InsertSparePartOrder,
  SparePartUrgency, SparePartStatus,
  AvailablePart, InsertAvailablePart,
  PartsActivityLog, InsertPartsActivityLog,
  Notification, InsertNotification,
  SystemSetting, InsertSystemSetting,
  RemovedPart, InsertRemovedPart,
  SparePartsCatalog, InsertSparePartsCatalog,
  ServiceCompletionReport, InsertServiceCompletionReport,
  // Tabele za pristup bazi
  users, technicians, clients, applianceCategories, manufacturers, 
  appliances, services, maintenanceSchedules, maintenanceAlerts,
  requestTracking, botVerification, emailVerification, sparePartOrders,
  availableParts, partsActivityLog, notifications, systemSettings, removedParts, partsAllocations,
  sparePartsCatalog, PartsAllocation, InsertPartsAllocation,
  webScrapingSources, webScrapingLogs, webScrapingQueue, serviceCompletionReports
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { eq, and, desc, gte, lte, ne, isNull, like, count, sum, or, inArray, sql } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

// Define extended storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUnverifiedUsers(): Promise<User[]>;
  verifyUser(id: number, adminId: number): Promise<User | undefined>;
  
  // Technician methods
  getAllTechnicians(): Promise<Technician[]>;
  getTechnician(id: number): Promise<Technician | undefined>;
  createTechnician(technician: InsertTechnician): Promise<Technician>;
  updateTechnician(id: number, technician: InsertTechnician): Promise<Technician | undefined>;
  getUserByTechnicianId(technicianId: number): Promise<User | undefined>;
  
  // Maintenance Schedule methods
  getAllMaintenanceSchedules(): Promise<MaintenanceSchedule[]>;
  getMaintenanceSchedule(id: number): Promise<MaintenanceSchedule | undefined>;
  getMaintenanceSchedulesByAppliance(applianceId: number): Promise<MaintenanceSchedule[]>;
  createMaintenanceSchedule(schedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule>;
  updateMaintenanceSchedule(id: number, schedule: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule | undefined>;
  deleteMaintenanceSchedule(id: number): Promise<boolean>;
  getUpcomingMaintenanceSchedules(daysThreshold: number): Promise<MaintenanceSchedule[]>;
  
  // Maintenance Alert methods
  getAllMaintenanceAlerts(): Promise<MaintenanceAlert[]>;
  getMaintenanceAlert(id: number): Promise<MaintenanceAlert | undefined>;
  getMaintenanceAlertsBySchedule(scheduleId: number): Promise<MaintenanceAlert[]>;
  createMaintenanceAlert(alert: InsertMaintenanceAlert): Promise<MaintenanceAlert>;
  updateMaintenanceAlert(id: number, alert: Partial<MaintenanceAlert>): Promise<MaintenanceAlert | undefined>;
  deleteMaintenanceAlert(id: number): Promise<boolean>;
  getUnreadMaintenanceAlerts(): Promise<MaintenanceAlert[]>;
  markMaintenanceAlertAsRead(id: number): Promise<MaintenanceAlert | undefined>;
  
  // Client methods
  getAllClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  getClientByEmail(email: string): Promise<Client | undefined>; // Nova metoda za pretragu po emailu
  getClientWithDetails(id: number): Promise<any | undefined>; // Dodajemo metodu za detaljne informacije o klijentu
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<void>;
  getRecentClients(limit: number): Promise<Client[]>;
  
  // Appliance Category methods
  getAllApplianceCategories(): Promise<ApplianceCategory[]>;
  getApplianceCategory(id: number): Promise<ApplianceCategory | undefined>;
  createApplianceCategory(category: InsertApplianceCategory): Promise<ApplianceCategory>;
  
  // Manufacturer methods
  getAllManufacturers(): Promise<Manufacturer[]>;
  getManufacturer(id: number): Promise<Manufacturer | undefined>;
  createManufacturer(manufacturer: InsertManufacturer): Promise<Manufacturer>;
  
  // Appliance methods
  getAllAppliances(): Promise<Appliance[]>;
  getAppliance(id: number): Promise<Appliance | undefined>;
  getApplianceBySerialNumber(serialNumber: string): Promise<Appliance | undefined>; // Nova metoda za pretragu po serijskom broju
  getAppliancesByClient(clientId: number): Promise<Appliance[]>;
  createAppliance(appliance: InsertAppliance): Promise<Appliance>;
  updateAppliance(id: number, appliance: Partial<InsertAppliance>): Promise<Appliance | undefined>;
  deleteAppliance(id: number): Promise<void>;
  getApplianceStats(): Promise<{categoryId: number, count: number}[]>;
  
  // Service methods - optimizirana verzija
  getAllServices(limit?: number): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByClient(clientId: number): Promise<Service[]>;
  getServicesByAppliance(applianceId: number): Promise<Service[]>;
  getServicesByStatus(status: ServiceStatus, limit?: number): Promise<Service[]>;
  getServicesByTechnician(technicianId: number, limit?: number): Promise<Service[]>;
  // Već postoji
  getServicesByTechnicianAndStatus(technicianId: number, status: ServiceStatus, limit?: number): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: InsertService): Promise<Service | undefined>;
  getRecentServices(limit: number): Promise<Service[]>;
  
  // Business Partner methods
  getServicesByPartner(partnerId: number): Promise<Service[]>;
  getClientsByPartner(partnerId: number): Promise<Client[]>;
  getServiceWithDetails(serviceId: number): Promise<any>;
  getServiceStatusHistory(serviceId: number): Promise<any[]>;
  
  // Request tracking methods (rate limiting)
  getRequestCount(userId: number, requestType: string, windowStart: Date): Promise<number>;
  addRequestTracking(tracking: InsertRequestTracking): Promise<RequestTracking>;
  getRequestHistory(userId: number, limit?: number): Promise<RequestTracking[]>;
  
  // Bot verification methods
  getBotVerification(sessionId: string): Promise<BotVerification | undefined>;
  createBotVerification(verification: InsertBotVerification): Promise<BotVerification>;
  updateBotVerification(sessionId: string, update: Partial<BotVerification>): Promise<BotVerification | undefined>;
  cleanupExpiredBotVerifications(): Promise<void>;
  
  // Email verification methods
  getEmailVerification(email: string): Promise<EmailVerification | undefined>;
  createEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification>;
  updateEmailVerification(id: number, update: Partial<EmailVerification>): Promise<EmailVerification | undefined>;
  validateEmailVerification(email: string, code: string): Promise<boolean>;
  cleanupExpiredEmailVerifications(): Promise<void>;
  
  // Admin service methods
  getAdminServices(): Promise<any[]>;
  getAdminServiceById(id: number): Promise<any | undefined>;
  updateAdminService(id: number, updates: any): Promise<any | undefined>;
  deleteAdminService(id: number): Promise<boolean>;
  assignTechnicianToService(serviceId: number, technicianId: number): Promise<any | undefined>;
  
  // Spare parts methods
  getAllSparePartOrders(): Promise<SparePartOrder[]>;
  getSparePartOrder(id: number): Promise<SparePartOrder | undefined>;
  getSparePartOrdersByService(serviceId: number): Promise<SparePartOrder[]>;
  getSparePartOrdersByTechnician(technicianId: number): Promise<SparePartOrder[]>;
  getSparePartOrdersByStatus(status: SparePartStatus): Promise<SparePartOrder[]>;
  getPendingSparePartOrders(): Promise<SparePartOrder[]>;
  createSparePartOrder(order: InsertSparePartOrder): Promise<SparePartOrder>;
  updateSparePartOrder(id: number, order: Partial<SparePartOrder>): Promise<SparePartOrder | undefined>;
  deleteSparePartOrder(id: number): Promise<boolean>;
  markSparePartAsReceived(orderId: number, adminId: number, receivedData: { actualCost?: string; location?: string; notes?: string }): Promise<{ order: SparePartOrder; availablePart: AvailablePart } | undefined>;

  // Available parts methods
  getAllAvailableParts(): Promise<AvailablePart[]>;
  getAvailablePart(id: number): Promise<AvailablePart | undefined>;
  getAvailablePartsByCategory(categoryId: number): Promise<AvailablePart[]>;
  getAvailablePartsByManufacturer(manufacturerId: number): Promise<AvailablePart[]>;
  getAvailablePartsByWarrantyStatus(warrantyStatus: string): Promise<AvailablePart[]>;
  searchAvailableParts(searchTerm: string): Promise<AvailablePart[]>;
  createAvailablePart(part: InsertAvailablePart): Promise<AvailablePart>;
  updateAvailablePart(id: number, part: Partial<AvailablePart>): Promise<AvailablePart | undefined>;
  deleteAvailablePart(id: number): Promise<boolean>;
  updateAvailablePartQuantity(id: number, quantityChange: number): Promise<AvailablePart | undefined>;
  
  // Notification methods
  getAllNotifications(userId?: number): Promise<Notification[]>;
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  getUnreadNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, notification: Partial<Notification>): Promise<Notification | undefined>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  deleteNotification(id: number): Promise<boolean>;
  
  // System Settings methods
  getSystemSettings(): Promise<SystemSetting[]>;
  getAllSystemSettings(): Promise<SystemSetting[]>; // Alias za mobile SMS kompatibilnost
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getSystemSettingsByCategory(category: string): Promise<SystemSetting[]>;
  createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  updateSystemSetting(key: string, setting: Partial<SystemSetting>): Promise<SystemSetting | undefined>;
  deleteSystemSetting(key: string): Promise<boolean>;

  // Removed Parts methods
  getAllRemovedParts(): Promise<RemovedPart[]>;
  getRemovedPart(id: number): Promise<RemovedPart | undefined>;
  getRemovedPartsByService(serviceId: number): Promise<RemovedPart[]>;
  getRemovedPartsByTechnician(technicianId: number): Promise<RemovedPart[]>;
  getRemovedPartsByStatus(status: string): Promise<RemovedPart[]>;
  createRemovedPart(part: InsertRemovedPart): Promise<RemovedPart>;
  updateRemovedPart(id: number, part: Partial<RemovedPart>): Promise<RemovedPart | undefined>;
  deleteRemovedPart(id: number): Promise<boolean>;
  markPartAsReturned(id: number, returnDate: string, notes?: string): Promise<RemovedPart | undefined>;
  
  // Spare Parts Orders methods for business partner details
  getSparePartsByService(serviceId: number): Promise<SparePartOrder[]>;

  // Spare Parts Catalog methods (PartKeepr compatible)
  getAllSparePartsCatalog(): Promise<SparePartsCatalog[]>;
  getSparePartsCatalogByCategory(category: string): Promise<SparePartsCatalog[]>;
  getSparePartsCatalogByManufacturer(manufacturer: string): Promise<SparePartsCatalog[]>;
  searchSparePartsCatalog(searchTerm: string): Promise<SparePartsCatalog[]>;
  getSparePartsCatalogByPartNumber(partNumber: string): Promise<SparePartsCatalog | undefined>;
  getSparePartsCatalogByCompatibleModel(model: string): Promise<SparePartsCatalog[]>;
  createSparePartsCatalogEntry(entry: InsertSparePartsCatalog): Promise<SparePartsCatalog>;
  updateSparePartsCatalogEntry(id: number, entry: Partial<SparePartsCatalog>): Promise<SparePartsCatalog | undefined>;
  deleteSparePartsCatalogEntry(id: number): Promise<boolean>;
  importSparePartsCatalogFromCSV(csvData: any[]): Promise<{ success: number; errors: string[] }>;
  getSparePartsCatalogStats(): Promise<{ totalParts: number; byCategory: Record<string, number>; byManufacturer: Record<string, number> }>;
  
  // Web Scraping methods
  createScrapingSource(source: any): Promise<any>;
  getScrapingSources(): Promise<any[]>;
  updateScrapingSource(id: number, data: any): Promise<any>;
  createScrapingLog(log: any): Promise<any>;
  getScrapingLogs(sourceId?: number): Promise<any[]>;
  createScrapingQueueItem(item: any): Promise<any>;
  getScrapingQueue(): Promise<any[]>;
  updateScrapingQueueItem(id: number, data: any): Promise<any>;

  // Service Completion Report methods
  getAllServiceCompletionReports(): Promise<ServiceCompletionReport[]>;
  getServiceCompletionReport(id: number): Promise<ServiceCompletionReport | undefined>;
  getServiceCompletionReportsByService(serviceId: number): Promise<ServiceCompletionReport[]>;
  getServiceCompletionReportsByTechnician(technicianId: number): Promise<ServiceCompletionReport[]>;
  createServiceCompletionReport(report: InsertServiceCompletionReport): Promise<ServiceCompletionReport>;
  updateServiceCompletionReport(id: number, report: Partial<ServiceCompletionReport>): Promise<ServiceCompletionReport | undefined>;
  deleteServiceCompletionReport(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private applianceCategories: Map<number, ApplianceCategory>;
  private manufacturers: Map<number, Manufacturer>;
  private appliances: Map<number, Appliance>;
  private services: Map<number, Service>;
  
  sessionStore: any;
  
  // Technicians collection
  private technicians: Map<number, Technician>;

  // Auto-incrementing IDs
  private userId: number;
  private clientId: number;
  private categoryId: number;
  private manufacturerId: number;
  private applianceId: number;
  private serviceId: number;
  private technicianId: number;

  // Hash password utility method
  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }
  
  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.applianceCategories = new Map();
    this.manufacturers = new Map();
    this.appliances = new Map();
    this.services = new Map();
    this.technicians = new Map();
    this.maintenanceSchedules = new Map();
    this.maintenanceAlerts = new Map();
    
    this.userId = 1;
    this.clientId = 1;
    this.categoryId = 1;
    this.manufacturerId = 1;
    this.applianceId = 1;
    this.serviceId = 1;
    this.technicianId = 1;
    this.maintenanceScheduleId = 1;
    this.maintenanceAlertId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Add some initial categories with proper icons
    this.seedApplianceCategories();
    
    // Add some manufacturers
    this.seedManufacturers();
    
    // Set up the initial admin account
    this.seedAdminUser();
    
    // Add the technicians
    this.seedTechnicians();
  }
  
  private seedTechnicians() {
    const technicians = [
      { fullName: "Jovan Todosijević", phone: "+382661234567", email: "jovan@servistodosijevic.me", specialization: "Frižideri i zamrzivači", active: true },
      { fullName: "Gruica Todosijević", phone: "+382661234568", email: "gruica@servistodosijevic.me", specialization: "Mašine za veš i sudove", active: true },
      { fullName: "Nikola Četković", phone: "+382661234569", email: "nikola@servistodosijevic.me", specialization: "Šporeti i mikrotalasne", active: true },
      { fullName: "Petar Vulović", phone: "+382661234570", email: "petar@servistodosijevic.me", specialization: "Klima uređaji", active: true }
    ];
    
    technicians.forEach(tech => {
      this.createTechnician(tech);
    });
  }
  
  private async seedAdminUser() {
    // Admin sa jednostavnijim korisničkim imenom za lakšu prijavu
    const hashedPassword = await this.hashPassword("admin123");
    
    const id = this.userId++;
    const user: User = { 
      id, 
      role: "admin", 
      username: "admin", 
      fullName: "Jelena Todosijević", 
      password: hashedPassword,
      technicianId: null,
      email: "admin@frigosistemtodosijevic.com"
    };
    
    this.users.set(id, user);
    console.log("Admin user created:", user.username);
    
    // Create a test technician user
    this.createUser({
      username: "serviser@example.com",
      password: "serviser123",
      fullName: "Jovan Todosijević",
      role: "technician",
      technicianId: 1, // First technician
      email: "jovan@frigosistemtodosijevic.com"
    });
    console.log("Technician user created: serviser@example.com");
  }

  private seedApplianceCategories() {
    const categories = [
      { name: "Mašina za veš", icon: "veš_mašina" },
      { name: "Frižider", icon: "frižider" },
      { name: "Šporet", icon: "šporet" },
      { name: "Mašina za sudove", icon: "sudopera" },
      { name: "Klima uređaj", icon: "klima" }
    ];
    
    categories.forEach(category => {
      this.createApplianceCategory(category);
    });
  }
  
  private seedManufacturers() {
    const manufacturers = [
      { name: "Bosch" },
      { name: "Samsung" },
      { name: "Gorenje" },
      { name: "Beko" },
      { name: "LG" },
      { name: "Whirlpool" },
      { name: "Electrolux" }
    ];
    
    manufacturers.forEach(manufacturer => {
      this.createManufacturer(manufacturer);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByTechnicianId(technicianId: number): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.technicianId === technicianId,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async getUnverifiedUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role !== 'admin' && !user.isVerified
    ).sort((a, b) => {
      // Sortiraj po datumu registracije (noviji prvo)
      const dateA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
      const dateB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
      return dateB - dateA;
    });
  }
  
  async verifyUser(id: number, adminId: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const now = new Date();
    
    const updatedUser: User = {
      ...user,
      isVerified: true,
      verifiedAt: now.toISOString(),
      verifiedBy: adminId
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    
    // If role is not provided, set default role
    const role = insertUser.role || (id === 1 ? "admin" : "user");
    
    // If the password isn't already hashed (contains no .), hash it
    let password = insertUser.password;
    if (!password.includes('.')) {
      password = await this.hashPassword(password);
    }
    
    const now = new Date();
    // Administratori i serviseri (techniciani) su automatski verifikovani
    const isVerified = role === "admin" || role === "technician" || !!insertUser.isVerified;
    
    const user: User = { 
      id, 
      username: insertUser.username,
      password, 
      fullName: insertUser.fullName,
      role,
      technicianId: insertUser.technicianId !== undefined ? insertUser.technicianId : null,
      email: insertUser.email || null,
      phone: insertUser.phone || null,
      address: insertUser.address || null,
      city: insertUser.city || null,
      companyName: insertUser.companyName || null,
      companyId: insertUser.companyId || null,
      isVerified: isVerified,
      registeredAt: now.toISOString(),
      verifiedAt: isVerified ? now.toISOString() : null,
      verifiedBy: isVerified && role === "admin" ? id : null // samoodobravanje za administratore
    };
    
    this.users.set(id, user);
    return user;
  }
  
  // Technician methods
  async getAllTechnicians(): Promise<Technician[]> {
    return Array.from(this.technicians.values());
  }

  async getTechnician(id: number): Promise<Technician | undefined> {
    return this.technicians.get(id);
  }
  
  async createTechnician(insertTechnician: InsertTechnician): Promise<Technician> {
    const id = this.technicianId++;
    const technician: Technician = {
      id,
      fullName: insertTechnician.fullName,
      phone: insertTechnician.phone || null,
      email: insertTechnician.email || null,
      specialization: insertTechnician.specialization || null,
      active: insertTechnician.active !== undefined ? insertTechnician.active : true
    };
    this.technicians.set(id, technician);
    return technician;
  }
  
  async updateTechnician(id: number, insertTechnician: InsertTechnician): Promise<Technician | undefined> {
    const existingTechnician = this.technicians.get(id);
    if (!existingTechnician) return undefined;
    
    const updatedTechnician: Technician = {
      id,
      fullName: insertTechnician.fullName,
      phone: insertTechnician.phone || null,
      email: insertTechnician.email || null,
      specialization: insertTechnician.specialization || null,
      active: insertTechnician.active !== undefined ? insertTechnician.active : true
    };
    
    this.technicians.set(id, updatedTechnician);
    return updatedTechnician;
  }
  


  // Client methods
  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  

  
  /**
   * Dobavlja detaljne informacije o klijentu sa aparatima i istorijom servisa
   */
  async getClientWithDetails(id: number): Promise<any | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    // Dobavljanje svih uređaja klijenta
    const appliances = await this.getAppliancesByClient(id);
    
    // Priprema objekata za proširivanje informacija
    const appliancesWithDetails = [];
    
    // Za svaki uređaj dobavljamo kategoriju i proizvođača
    for (const appliance of appliances) {
      const category = this.applianceCategories.get(appliance.categoryId);
      const manufacturer = this.manufacturers.get(appliance.manufacturerId);
      
      // Dobavljanje svih servisa povezanih sa ovim uređajem
      const applianceServices = Array.from(this.services.values()).filter(
        (service) => service.applianceId === appliance.id
      );
      
      // Za svaki servis dobavljamo informacije o serviseru
      const servicesWithTechnicians = [];
      
      for (const service of applianceServices) {
        let technicianInfo = null;
        
        if (service.technicianId) {
          const technician = this.technicians.get(service.technicianId);
          if (technician) {
            technicianInfo = {
              id: technician.id,
              fullName: technician.fullName,
              specialization: technician.specialization,
              phone: technician.phone,
              email: technician.email
            };
          }
        }
        
        // Dobavljanje istorije statusa servisa
        const statusHistory = await this.getServiceStatusHistory(service.id);
        
        servicesWithTechnicians.push({
          ...service,
          technician: technicianInfo,
          statusHistory
        });
      }
      
      appliancesWithDetails.push({
        ...appliance,
        category: category || { name: "Nepoznata kategorija" },
        manufacturer: manufacturer || { name: "Nepoznat proizvođač" },
        services: servicesWithTechnicians
      });
    }
    
    // Dobavljanje svih servisa klijenta
    const clientServices = Array.from(this.services.values()).filter(
      (service) => service.clientId === id
    );
    
    // Za svaki servis dobavljamo informacije o serviseru i aparatu
    const servicesWithDetails = [];
    
    for (const service of clientServices) {
      let technicianInfo = null;
      let applianceInfo = null;
      
      if (service.technicianId) {
        const technician = this.technicians.get(service.technicianId);
        if (technician) {
          technicianInfo = {
            id: technician.id,
            fullName: technician.fullName,
            specialization: technician.specialization,
            phone: technician.phone,
            email: technician.email
          };
        }
      }
      
      if (service.applianceId) {
        const appliance = this.appliances.get(service.applianceId);
        if (appliance) {
          const category = this.applianceCategories.get(appliance.categoryId);
          const manufacturer = this.manufacturers.get(appliance.manufacturerId);
          
          applianceInfo = {
            ...appliance,
            category: category || { name: "Nepoznata kategorija" },
            manufacturer: manufacturer || { name: "Nepoznat proizvođač" }
          };
        }
      }
      
      // Dobavljanje istorije statusa servisa
      const statusHistory = await this.getServiceStatusHistory(service.id);
      
      servicesWithDetails.push({
        ...service,
        technician: technicianInfo,
        appliance: applianceInfo,
        statusHistory
      });
    }
    
    return {
      ...client,
      appliances: appliancesWithDetails,
      services: servicesWithDetails
    };
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.clientId++;
    const client: Client = { 
      id,
      fullName: insertClient.fullName,
      phone: insertClient.phone,
      email: insertClient.email || null,
      address: insertClient.address || null,
      city: insertClient.city || null
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: number, insertClient: Partial<InsertClient>): Promise<Client | undefined> {
    const existingClient = this.clients.get(id);
    if (!existingClient) return undefined;
    
    const updatedClient: Client = { 
      id,
      fullName: insertClient.fullName ?? existingClient.fullName,
      phone: insertClient.phone ?? existingClient.phone,
      email: insertClient.email !== undefined ? (insertClient.email || null) : existingClient.email,
      address: insertClient.address !== undefined ? (insertClient.address || null) : existingClient.address,
      city: insertClient.city !== undefined ? (insertClient.city || null) : existingClient.city
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<void> {
    this.clients.delete(id);
  }
  
  async getRecentClients(limit: number): Promise<Client[]> {
    return Array.from(this.clients.values())
      .slice(-limit)
      .reverse();
  }

  // Appliance Category methods
  async getAllApplianceCategories(): Promise<ApplianceCategory[]> {
    return Array.from(this.applianceCategories.values());
  }

  async getApplianceCategory(id: number): Promise<ApplianceCategory | undefined> {
    return this.applianceCategories.get(id);
  }

  async createApplianceCategory(insertCategory: InsertApplianceCategory): Promise<ApplianceCategory> {
    const id = this.categoryId++;
    const category: ApplianceCategory = { ...insertCategory, id };
    this.applianceCategories.set(id, category);
    return category;
  }

  // Manufacturer methods
  async getAllManufacturers(): Promise<Manufacturer[]> {
    return Array.from(this.manufacturers.values());
  }

  async getManufacturer(id: number): Promise<Manufacturer | undefined> {
    return this.manufacturers.get(id);
  }

  async createManufacturer(insertManufacturer: InsertManufacturer): Promise<Manufacturer> {
    const id = this.manufacturerId++;
    const manufacturer: Manufacturer = { ...insertManufacturer, id };
    this.manufacturers.set(id, manufacturer);
    return manufacturer;
  }

  // Appliance methods
  async getAllAppliances(): Promise<Appliance[]> {
    return Array.from(this.appliances.values());
  }

  async getAppliance(id: number): Promise<Appliance | undefined> {
    return this.appliances.get(id);
  }
  


  async getAppliancesByClient(clientId: number): Promise<Appliance[]> {
    return Array.from(this.appliances.values()).filter(
      (appliance) => appliance.clientId === clientId,
    );
  }

  async createAppliance(insertAppliance: InsertAppliance): Promise<Appliance> {
    const id = this.applianceId++;
    const appliance: Appliance = { 
      id,
      clientId: insertAppliance.clientId,
      categoryId: insertAppliance.categoryId,
      manufacturerId: insertAppliance.manufacturerId,
      model: insertAppliance.model || null,
      serialNumber: insertAppliance.serialNumber || null,
      purchaseDate: insertAppliance.purchaseDate || null,
      notes: insertAppliance.notes || null
    };
    this.appliances.set(id, appliance);
    return appliance;
  }

  async updateAppliance(id: number, insertAppliance: Partial<InsertAppliance>): Promise<Appliance | undefined> {
    const existingAppliance = this.appliances.get(id);
    if (!existingAppliance) return undefined;
    
    const updatedAppliance: Appliance = { 
      id,
      clientId: insertAppliance.clientId ?? existingAppliance.clientId,
      categoryId: insertAppliance.categoryId ?? existingAppliance.categoryId,
      manufacturerId: insertAppliance.manufacturerId ?? existingAppliance.manufacturerId,
      model: insertAppliance.model !== undefined ? (insertAppliance.model || null) : existingAppliance.model,
      serialNumber: insertAppliance.serialNumber !== undefined ? (insertAppliance.serialNumber || null) : existingAppliance.serialNumber,
      purchaseDate: insertAppliance.purchaseDate !== undefined ? (insertAppliance.purchaseDate || null) : existingAppliance.purchaseDate,
      notes: insertAppliance.notes !== undefined ? (insertAppliance.notes || null) : existingAppliance.notes
    };
    this.appliances.set(id, updatedAppliance);
    return updatedAppliance;
  }

  async deleteAppliance(id: number): Promise<void> {
    this.appliances.delete(id);
  }
  
  async getApplianceStats(): Promise<{categoryId: number, count: number}[]> {
    const categoryCountMap = new Map<number, number>();
    
    // Initialize counts for all categories
    const categories = Array.from(this.applianceCategories.values());
    categories.forEach(category => {
      categoryCountMap.set(category.id, 0);
    });
    
    // Count appliances by category
    const appliances = Array.from(this.appliances.values());
    appliances.forEach(appliance => {
      const currentCount = categoryCountMap.get(appliance.categoryId) || 0;
      categoryCountMap.set(appliance.categoryId, currentCount + 1);
    });
    
    // Convert to array of objects
    return Array.from(categoryCountMap.entries()).map(([categoryId, count]) => ({
      categoryId,
      count
    }));
  }

  // Service methods
  async getAllServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async getServicesByClient(clientId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.clientId === clientId,
    );
  }

  async getServicesByAppliance(applianceId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.applianceId === applianceId,
    );
  }

  async getServicesByStatus(status: ServiceStatus): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.status === status,
    );
  }

  // Ova metoda je implementirana samo za MemStorage i neće se koristiti u produkciji
  // Stvarna implementacija je data u DatabaseStorage klasi
  async createService(insertService: InsertService): Promise<Service> {
    // Pravljenje imitacije servisa za MemStorage - u praksi se neće koristiti
    const id = this.serviceId++;
    const service: Service = { 
      id,
      clientId: insertService.clientId,
      applianceId: insertService.applianceId,
      technicianId: insertService.technicianId || null,
      description: insertService.description,
      createdAt: insertService.createdAt,
      status: insertService.status || "pending",
      scheduledDate: insertService.scheduledDate || null,
      completedDate: insertService.completedDate || null,
      technicianNotes: insertService.technicianNotes || null,
      cost: insertService.cost || null,
      usedParts: insertService.usedParts || null,
      machineNotes: insertService.machineNotes || null,
      isCompletelyFixed: insertService.isCompletelyFixed || null,
      businessPartnerId: insertService.businessPartnerId || null,
      partnerCompanyName: insertService.partnerCompanyName || null
    };
    this.services.set(id, service);
    return service;
  }

  async updateService(id: number, insertService: InsertService): Promise<Service | undefined> {
    const existingService = this.services.get(id);
    if (!existingService) return undefined;
    
    const updatedService: Service = { 
      id,
      clientId: insertService.clientId,
      applianceId: insertService.applianceId,
      technicianId: insertService.technicianId || null,
      description: insertService.description,
      createdAt: insertService.createdAt,
      status: insertService.status || "pending",
      scheduledDate: insertService.scheduledDate || null,
      completedDate: insertService.completedDate || null,
      technicianNotes: insertService.technicianNotes || null,
      cost: insertService.cost || null,
      usedParts: insertService.usedParts || null,
      machineNotes: insertService.machineNotes || null,
      isCompletelyFixed: insertService.isCompletelyFixed || null
    };
    this.services.set(id, updatedService);
    return updatedService;
  }
  
  async getServicesByTechnician(technicianId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.technicianId === technicianId,
    );
  }
  
  async getServicesByTechnicianAndStatus(technicianId: number, status: ServiceStatus): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.technicianId === technicianId && service.status === status,
    );
  }
  
  async getRecentServices(limit: number): Promise<Service[]> {
    return Array.from(this.services.values())
      .slice(-limit)
      .reverse();
  }
  
  // Business partner methods
  async getServicesByPartner(partnerId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.businessPartnerId === partnerId
    );
  }

  // Dobijanje klijenata poslovnog partnera (samo oni klijenti koji su povezani sa servisima tog partnera)
  async getClientsByPartner(partnerId: number): Promise<Client[]> {
    // Dobijamo servise tog partnera
    const partnerServices = await this.getServicesByPartner(partnerId);
    const clientIds = [...new Set(partnerServices.map(service => service.clientId))];
    
    // Vraćamo klijente povezane sa tim servisima
    return Array.from(this.clients.values()).filter(
      (client) => clientIds.includes(client.id)
    );
  }
  
  async getServiceWithDetails(serviceId: number): Promise<any> {
    const service = this.services.get(serviceId);
    if (!service) return null;
    
    const client = service.clientId ? await this.getClient(service.clientId) : null;
    const appliance = service.applianceId ? await this.getAppliance(service.applianceId) : null;
    const technician = service.technicianId ? await this.getTechnician(service.technicianId) : null;
    const category = appliance?.categoryId ? await this.getApplianceCategory(appliance.categoryId) : null;
    const manufacturer = appliance?.manufacturerId ? await this.getManufacturer(appliance.manufacturerId) : null;
    
    return {
      ...service,
      client: client ? {
        id: client.id,
        fullName: client.fullName,
        phone: client.phone,
        email: client.email,
        address: client.address,
        city: client.city
      } : null,
      appliance: appliance ? {
        id: appliance.id,
        model: appliance.model,
        serialNumber: appliance.serialNumber
      } : null,
      technician: technician ? {
        id: technician.id,
        fullName: technician.fullName,
        phone: technician.phone,
        email: technician.email
      } : null,
      category: category ? {
        id: category.id,
        name: category.name
      } : null,
      manufacturer: manufacturer ? {
        id: manufacturer.id,
        name: manufacturer.name
      } : null
    };
  }
  
  // Implementacija za istoriju promena statusa servisa (zahteva dopunu schema.ts u budućnosti)
  async getServiceStatusHistory(serviceId: number): Promise<any[]> {
    // Za sada, za test u inmemory bazi, vraćamo simuliranu istoriju
    const service = this.services.get(serviceId);
    if (!service) return [];
    
    // Simuliramo istoriju promena statusa na osnovu trenutnog statusa
    const history = [];
    
    // Dodajemo početni status "on hold" kad je servis kreiran
    history.push({
      id: 1,
      serviceId,
      oldStatus: "",
      newStatus: "on_hold",
      notes: "Servis kreiran",
      createdAt: service.createdAt,
      createdBy: "Poslovni partner"
    });
    
    if (service.status !== "on_hold") {
      // Dodajemo promenu na "pending" ako je servis prešao u taj status
      history.push({
        id: 2,
        serviceId,
        oldStatus: "on_hold",
        newStatus: "pending",
        notes: "Servis primljen na razmatranje",
        createdAt: new Date(new Date(service.createdAt).getTime() + 86400000).toISOString(), // dan kasnije
        createdBy: "Administrator"
      });
    }
    
    if (service.status === "in_progress" || service.status === "completed" || service.status === "canceled") {
      // Dodajemo promenu na "in_progress" kad je serviser dodeljen
      history.push({
        id: 3,
        serviceId,
        oldStatus: "pending",
        newStatus: "in_progress",
        notes: "Serviser dodeljen",
        createdAt: service.scheduledDate || new Date(new Date(service.createdAt).getTime() + 172800000).toISOString(), // dva dana kasnije
        createdBy: service.technicianId ? `Serviser ${service.technicianId}` : "Administrator"
      });
    }
    
    if (service.status === "completed") {
      // Dodajemo krajnju promenu na "completed"
      history.push({
        id: 4,
        serviceId,
        oldStatus: "in_progress",
        newStatus: "completed",
        notes: service.technicianNotes || "Servis završen",
        createdAt: service.completedDate || new Date().toISOString(),
        createdBy: service.technicianId ? `Serviser ${service.technicianId}` : "Administrator"
      });
    } else if (service.status === "canceled") {
      // Dodajemo krajnju promenu na "canceled"
      history.push({
        id: 4,
        serviceId,
        oldStatus: "in_progress",
        newStatus: "canceled",
        notes: "Servis otkazan",
        createdAt: new Date().toISOString(),
        createdBy: "Administrator"
      });
    }
    
    return history;
  }
  
  // Additional user management methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }
  
  async updateUser(id: number, updateUserData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    // If the password is provided and not already hashed, hash it
    let password = updateUserData.password || existingUser.password;
    if (updateUserData.password && !updateUserData.password.includes('.')) {
      password = await this.hashPassword(updateUserData.password);
    }
    
    const updatedUser: User = {
      ...existingUser,
      ...updateUserData,
      password,
      id
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    // Check if user exists
    if (!this.users.has(id)) return false;
    
    // Delete the user
    return this.users.delete(id);
  }
  
  // Maintenance Schedule methods
  private maintenanceSchedules = new Map<number, MaintenanceSchedule>();
  private maintenanceScheduleId = 1;

  async getAllMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
    return Array.from(this.maintenanceSchedules.values());
  }

  async getMaintenanceSchedule(id: number): Promise<MaintenanceSchedule | undefined> {
    return this.maintenanceSchedules.get(id);
  }

  async getMaintenanceSchedulesByAppliance(applianceId: number): Promise<MaintenanceSchedule[]> {
    return Array.from(this.maintenanceSchedules.values()).filter(
      (schedule) => schedule.applianceId === applianceId,
    );
  }

  async createMaintenanceSchedule(insertSchedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule> {
    const id = this.maintenanceScheduleId++;
    const schedule: MaintenanceSchedule = {
      id,
      applianceId: insertSchedule.applianceId,
      name: insertSchedule.name,
      description: insertSchedule.description || null,
      frequency: insertSchedule.frequency,
      lastMaintenanceDate: insertSchedule.lastMaintenanceDate || null,
      nextMaintenanceDate: insertSchedule.nextMaintenanceDate,
      customIntervalDays: insertSchedule.customIntervalDays || null,
      isActive: insertSchedule.isActive !== undefined ? insertSchedule.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.maintenanceSchedules.set(id, schedule);
    return schedule;
  }

  async updateMaintenanceSchedule(id: number, scheduleData: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule | undefined> {
    const existingSchedule = this.maintenanceSchedules.get(id);
    if (!existingSchedule) return undefined;

    const updatedSchedule: MaintenanceSchedule = {
      ...existingSchedule,
      ...scheduleData,
      updatedAt: new Date()
    };

    this.maintenanceSchedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  async deleteMaintenanceSchedule(id: number): Promise<boolean> {
    if (!this.maintenanceSchedules.has(id)) return false;
    
    // Delete all related alerts first
    const alertsToDelete = Array.from(this.maintenanceAlerts.values())
      .filter(alert => alert.scheduleId === id)
      .map(alert => alert.id);
      
    alertsToDelete.forEach(alertId => this.maintenanceAlerts.delete(alertId));
    
    return this.maintenanceSchedules.delete(id);
  }

  async getUpcomingMaintenanceSchedules(daysThreshold: number): Promise<MaintenanceSchedule[]> {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);
    
    return Array.from(this.maintenanceSchedules.values()).filter(schedule => {
      const nextMaintenanceDate = new Date(schedule.nextMaintenanceDate);
      return schedule.isActive && 
             nextMaintenanceDate >= now && 
             nextMaintenanceDate <= thresholdDate;
    });
  }

  // Maintenance Alert methods
  private maintenanceAlerts = new Map<number, MaintenanceAlert>();
  private maintenanceAlertId = 1;

  async getAllMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    return Array.from(this.maintenanceAlerts.values());
  }

  async getMaintenanceAlert(id: number): Promise<MaintenanceAlert | undefined> {
    return this.maintenanceAlerts.get(id);
  }

  async getMaintenanceAlertsBySchedule(scheduleId: number): Promise<MaintenanceAlert[]> {
    return Array.from(this.maintenanceAlerts.values()).filter(
      (alert) => alert.scheduleId === scheduleId,
    );
  }

  async createMaintenanceAlert(insertAlert: InsertMaintenanceAlert): Promise<MaintenanceAlert> {
    const id = this.maintenanceAlertId++;
    const alert: MaintenanceAlert = {
      id,
      scheduleId: insertAlert.scheduleId,
      title: insertAlert.title,
      message: insertAlert.message,
      alertDate: insertAlert.alertDate || new Date(),
      status: insertAlert.status || "pending",
      isRead: insertAlert.isRead !== undefined ? insertAlert.isRead : false,
      createdAt: new Date()
    };
    this.maintenanceAlerts.set(id, alert);
    return alert;
  }

  async updateMaintenanceAlert(id: number, alertData: Partial<MaintenanceAlert>): Promise<MaintenanceAlert | undefined> {
    const existingAlert = this.maintenanceAlerts.get(id);
    if (!existingAlert) return undefined;

    const updatedAlert: MaintenanceAlert = {
      ...existingAlert,
      ...alertData
    };

    this.maintenanceAlerts.set(id, updatedAlert);
    return updatedAlert;
  }

  async deleteMaintenanceAlert(id: number): Promise<boolean> {
    if (!this.maintenanceAlerts.has(id)) return false;
    return this.maintenanceAlerts.delete(id);
  }

  async getUnreadMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    return Array.from(this.maintenanceAlerts.values()).filter(
      (alert) => !alert.isRead,
    );
  }

  async markMaintenanceAlertAsRead(id: number): Promise<MaintenanceAlert | undefined> {
    const alert = this.maintenanceAlerts.get(id);
    if (!alert) return undefined;
    
    alert.isRead = true;
    this.maintenanceAlerts.set(id, alert);
    return alert;
  }

  // Request tracking methods (stubbed for MemStorage)
  async getRequestCount(userId: number, requestType: string, windowStart: Date): Promise<number> {
    return 0; // In-memory implementation doesn't track requests
  }

  async addRequestTracking(tracking: InsertRequestTracking): Promise<RequestTracking> {
    // Create a mock request tracking object
    const mockTracking: RequestTracking = {
      id: 1,
      userId: tracking.userId,
      requestType: tracking.requestType,
      ipAddress: tracking.ipAddress,
      userAgent: tracking.userAgent,
      requestDate: tracking.requestDate,
      successful: tracking.successful
    };
    return mockTracking;
  }

  async getRequestHistory(userId: number, limit: number = 50): Promise<RequestTracking[]> {
    return []; // In-memory implementation doesn't store history
  }

  // Bot verification methods (stubbed for MemStorage)
  async getBotVerification(sessionId: string): Promise<BotVerification | undefined> {
    return undefined; // In-memory implementation doesn't support bot verification
  }

  async createBotVerification(verification: InsertBotVerification): Promise<BotVerification> {
    // Create a mock bot verification object
    const mockVerification: BotVerification = {
      id: 1,
      sessionId: verification.sessionId,
      question: verification.question,
      correctAnswer: verification.correctAnswer,
      userAnswer: null,
      attempts: 0,
      verified: false,
      expiresAt: verification.expiresAt,
      createdAt: new Date()
    };
    return mockVerification;
  }

  async updateBotVerification(sessionId: string, update: Partial<BotVerification>): Promise<BotVerification | undefined> {
    return undefined; // In-memory implementation doesn't support bot verification updates
  }

  async cleanupExpiredBotVerifications(): Promise<void> {
    // No-op for in-memory implementation
  }

  // Email verification methods (stubbed for MemStorage)
  async getEmailVerification(email: string): Promise<EmailVerification | undefined> {
    return undefined; // In-memory implementation doesn't support email verification
  }

  async createEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification> {
    // Create a mock email verification object
    const mockVerification: EmailVerification = {
      id: 1,
      email: verification.email,
      verificationCode: verification.verificationCode,
      used: false,
      attempts: 0,
      expiresAt: verification.expiresAt,
      createdAt: new Date()
    };
    return mockVerification;
  }

  async updateEmailVerification(id: number, update: Partial<EmailVerification>): Promise<EmailVerification | undefined> {
    return undefined; // In-memory implementation doesn't support email verification updates
  }

  async validateEmailVerification(email: string, code: string): Promise<boolean> {
    return true; // In-memory implementation always returns true for testing
  }

  async cleanupExpiredEmailVerifications(): Promise<void> {
    // No-op for in-memory implementation
  }

  // Admin service methods
  async getAdminServices(): Promise<any[]> {
    // Return all services with detailed information
    return Array.from(this.services.values()).map(service => ({
      ...service,
      client: this.clients.get(service.clientId),
      appliance: this.appliances.get(service.applianceId),
      technician: service.technicianId ? this.technicians.get(service.technicianId) : null
    }));
  }

  async getAdminServiceById(id: number): Promise<any | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;
    
    return {
      ...service,
      client: this.clients.get(service.clientId),
      appliance: this.appliances.get(service.applianceId),
      technician: service.technicianId ? this.technicians.get(service.technicianId) : null
    };
  }

  async updateAdminService(id: number, updates: any): Promise<any | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;
    
    const updatedService = { ...service, ...updates };
    this.services.set(id, updatedService);
    
    return this.getAdminServiceById(id);
  }

  async deleteAdminService(id: number): Promise<boolean> {
    return this.services.delete(id);
  }

  async assignTechnicianToService(serviceId: number, technicianId: number): Promise<any | undefined> {
    const service = this.services.get(serviceId);
    if (!service) return undefined;
    
    const updatedService = { ...service, technicianId, status: 'assigned' };
    this.services.set(serviceId, updatedService);
    
    return this.getAdminServiceById(serviceId);
  }
}

// DatabaseStorage implementacija
export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    // Privremeno koristimo memory store za debugging
    console.log("Inicijalizujem Memory session store za debugging...");
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 sata
    });
    
    console.log("Memory session store inicijalizovan uspešno");
    
    // Inicijalno podešavanje baze
    this.initializeDatabaseIfEmpty();
  }

  /**
   * Dobavlja klijenta po email adresi, koristi se za proveru duplikata
   * @param email Email adresa klijenta
   * @returns Pronađeni klijent ili undefined
   */

  
  /**
   * Dobavlja uređaj po serijskom broju, koristi se za proveru duplikata
   * @param serialNumber Serijski broj uređaja
   * @returns Pronađeni uređaj ili undefined
   */

  
  /**
   * Dobavlja detaljne informacije o klijentu sa aparatima i istorijom servisa
   */
  async getClientWithDetails(id: number): Promise<any | undefined> {
    try {
      // Dobavljanje klijenta
      const [client] = await db.select().from(clients).where(eq(clients.id, id));
      if (!client) return undefined;
      
      // Dobavljanje svih uređaja klijenta
      const clientAppliances = await db.select()
        .from(appliances)
        .where(eq(appliances.clientId, id));
      
      // Priprema objekata za proširivanje informacija
      const appliancesWithDetails = [];
      
      // Za svaki uređaj dobavljamo kategoriju i proizvođača
      for (const appliance of clientAppliances) {
        const [category] = appliance.categoryId ? 
          await db.select().from(applianceCategories).where(eq(applianceCategories.id, appliance.categoryId)) :
          [{ name: "Nepoznata kategorija" }];
          
        const [manufacturer] = appliance.manufacturerId ? 
          await db.select().from(manufacturers).where(eq(manufacturers.id, appliance.manufacturerId)) :
          [{ name: "Nepoznat proizvođač" }];
        
        // Dobavljanje svih servisa povezanih sa ovim uređajem
        const applianceServices = await db.select()
          .from(services)
          .where(eq(services.applianceId, appliance.id));
        
        // Za svaki servis dobavljamo informacije o serviseru
        const servicesWithTechnicians = [];
        
        for (const service of applianceServices) {
          let technicianInfo = null;
          
          if (service.technicianId) {
            const [technician] = await db.select()
              .from(technicians)
              .where(eq(technicians.id, service.technicianId));
              
            if (technician) {
              technicianInfo = {
                id: technician.id,
                fullName: technician.fullName,
                specialization: technician.specialization,
                phone: technician.phone,
                email: technician.email
              };
            }
          }
          
          // Dobavljanje istorije statusa servisa
          const statusHistory = await this.getServiceStatusHistory(service.id);
          
          servicesWithTechnicians.push({
            ...service,
            technician: technicianInfo,
            statusHistory
          });
        }
        
        appliancesWithDetails.push({
          ...appliance,
          category: category || { name: "Nepoznata kategorija" },
          manufacturer: manufacturer || { name: "Nepoznat proizvođač" },
          services: servicesWithTechnicians
        });
      }
      
      // Dobavljanje svih servisa klijenta
      const clientServices = await db.select()
        .from(services)
        .where(eq(services.clientId, id));
      
      // Za svaki servis dobavljamo informacije o serviseru i aparatu
      const servicesWithDetails = [];
      
      for (const service of clientServices) {
        let technicianInfo = null;
        let applianceInfo = null;
        
        if (service.technicianId) {
          const [technician] = await db.select()
            .from(technicians)
            .where(eq(technicians.id, service.technicianId));
            
          if (technician) {
            technicianInfo = {
              id: technician.id,
              fullName: technician.fullName,
              specialization: technician.specialization,
              phone: technician.phone,
              email: technician.email
            };
          }
        }
        
        if (service.applianceId) {
          const [appliance] = await db.select()
            .from(appliances)
            .where(eq(appliances.id, service.applianceId));
            
          if (appliance) {
            const [category] = appliance.categoryId ? 
              await db.select().from(applianceCategories).where(eq(applianceCategories.id, appliance.categoryId)) :
              [{ name: "Nepoznata kategorija" }];
              
            const [manufacturer] = appliance.manufacturerId ? 
              await db.select().from(manufacturers).where(eq(manufacturers.id, appliance.manufacturerId)) :
              [{ name: "Nepoznat proizvođač" }];
            
            applianceInfo = {
              ...appliance,
              category: category || { name: "Nepoznata kategorija" },
              manufacturer: manufacturer || { name: "Nepoznat proizvođač" }
            };
          }
        }
        
        // Dobavljanje istorije statusa servisa
        const statusHistory = await this.getServiceStatusHistory(service.id);
        
        servicesWithDetails.push({
          ...service,
          technician: technicianInfo,
          appliance: applianceInfo,
          statusHistory
        });
      }
      
      return {
        ...client,
        appliances: appliancesWithDetails,
        services: servicesWithDetails
      };
    } catch (error) {
      console.error("Greška pri dobavljanju detalja klijenta:", error);
      return undefined;
    }
  }

  private async initializeDatabaseIfEmpty(): Promise<void> {
    try {
      // Provera da li postoje korisnici
      const existingUsers = await db.select().from(users);
      if (existingUsers.length === 0) {
        console.log("Inicijalizacija baze podataka...");
        await this.seedApplianceCategories();
        await this.seedManufacturers();
        await this.seedTechnicians();
        await this.seedAdminUser();
      }
    } catch (error) {
      console.error("Greška pri inicijalizaciji baze:", error);
    }
  }

  private async seedApplianceCategories(): Promise<void> {
    try {
      const categories = [
        { name: "Mašina za veš", icon: "veš_mašina" },
        { name: "Frižider", icon: "frižider" },
        { name: "Šporet", icon: "šporet" },
        { name: "Mašina za sudove", icon: "sudopera" },
        { name: "Klima uređaj", icon: "klima" }
      ];
      
      for (const category of categories) {
        await db.insert(applianceCategories).values(category);
      }
    } catch (error) {
      console.error("Greška pri kreiranju kategorija uređaja:", error);
    }
  }

  private async seedManufacturers(): Promise<void> {
    try {
      const manufacturersList = [
        { name: "Bosch" },
        { name: "Samsung" },
        { name: "Gorenje" },
        { name: "Beko" },
        { name: "LG" },
        { name: "Whirlpool" },
        { name: "Electrolux" }
      ];
      
      for (const manufacturer of manufacturersList) {
        await db.insert(manufacturers).values(manufacturer);
      }
    } catch (error) {
      console.error("Greška pri kreiranju proizvođača:", error);
    }
  }

  private async seedTechnicians(): Promise<void> {
    try {
      const techniciansList = [
        { fullName: "Jovan Todosijević", phone: "+382661234567", email: "jovan@servistodosijevic.me", specialization: "Frižideri i zamrzivači", active: true },
        { fullName: "Gruica Todosijević", phone: "+382661234568", email: "gruica@servistodosijevic.me", specialization: "Mašine za veš i sudove", active: true },
        { fullName: "Nikola Četković", phone: "+382661234569", email: "nikola@servistodosijevic.me", specialization: "Šporeti i mikrotalasne", active: true },
        { fullName: "Petar Vulović", phone: "+382661234570", email: "petar@servistodosijevic.me", specialization: "Klima uređaji", active: true }
      ];
      
      for (const tech of techniciansList) {
        await db.insert(technicians).values(tech);
      }
    } catch (error) {
      console.error("Greška pri kreiranju servisera:", error);
    }
  }

  private async seedAdminUser(): Promise<void> {
    try {
      const hashedPassword = await this.hashPassword("admin123.admin123");
      
      // Kreiranje admin korisnika
      await db.insert(users).values({
        username: "admin@example.com",
        password: hashedPassword,
        fullName: "Jelena Todosijević",
        role: "admin"
      });
      console.log("Admin user created: admin@example.com");
      
      // Dohvatanje prvog servisera
      const [firstTech] = await db.select().from(technicians).limit(1);
      
      if (firstTech) {
        const hashedServiserPassword = await this.hashPassword("serviser123");
        
        // Kreiranje korisnika za servisera
        await db.insert(users).values({
          username: "serviser@example.com",
          password: hashedServiserPassword,
          fullName: firstTech.fullName,
          role: "technician",
          technicianId: firstTech.id
        });
        console.log("Technician user created: serviser@example.com");
      }
    } catch (error) {
      console.error("Greška pri kreiranju korisnika:", error);
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUnverifiedUsers(): Promise<User[]> {
    try {
      console.log("Dohvatanje neverifikovanih korisnika...");
      
      // Kombinujemo upite za business partnere i druge korisnike
      const result = await db
        .select()
        .from(users)
        .where(and(
          eq(users.isVerified, false),
          sql`${users.role} != 'admin'` // Administrator je uvek verifikovan
        ))
        .orderBy(desc(users.registeredAt));
      
      // Posebno pronađimo poslovne partnere radi logovanja
      const businessPartners = result.filter(user => user.role === 'business');
      console.log(`Pronađeno ${result.length} neverifikovanih korisnika, od toga ${businessPartners.length} poslovnih partnera`);
      
      if (businessPartners.length > 0) {
        console.log("Poslovni partneri koji čekaju verifikaciju:", businessPartners.map(p => ({
          id: p.id,
          username: p.username,
          fullName: p.fullName,
          companyName: p.companyName,
          registeredAt: p.registeredAt
        })));
      }
      
      return result;
    } catch (error) {
      console.error("Greška pri dohvatanju neverifikovanih korisnika:", error);
      throw error;
    }
  }
  
  async verifyUser(id: number, adminId: number): Promise<User | undefined> {
    const now = new Date();
    
    const [updatedUser] = await db
      .update(users)
      .set({
        isVerified: true,
        verifiedAt: now,
        verifiedBy: adminId
      })
      .where(eq(users.id, id))
      .returning();
      
    return updatedUser;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      console.log("Kreiranje korisnika:", {
        username: insertUser.username,
        fullName: insertUser.fullName,
        role: insertUser.role,
        email: insertUser.email,
        companyName: insertUser.companyName,
        phone: insertUser.phone
      });
      
      // Proveri da li je lozinka već validno heširana (ima format 'hash.salt')
      let password = insertUser.password;
      const parts = password.split('.');
      if (parts.length !== 2 || parts[0].length < 32 || parts[1].length < 16) {
        // Ako nije u ispravnom formatu, heširati je
        password = await this.hashPassword(password);
      }
      
      // Eksplicitno postavljamo email polje na vrednost username ako nije već postavljeno
      // jer username mora biti email adresa
      const email = insertUser.email || insertUser.username;
      
      // Korisnici kreirani od strane administratora su automatski verifikovani
      // jer administrator ima potpunu kontrolu nad kreiranjem naloga
      // Ili ako je eksplicitno postavljen isVerified u insertUser podacima
      const isVerified = insertUser.isVerified !== undefined ? insertUser.isVerified : true;
      
      // Konvertujemo stringove datuma u Date objekte za ispravno skladištenje
      const now = new Date();
      const verifiedDate = isVerified ? now : null;
      
      // Priprema registracije za insertovanje u bazu - sa ispravnim tipovima
      const userToInsert = {
        username: insertUser.username || "",
        password: password || "",
        fullName: insertUser.fullName || "",
        role: insertUser.role || "customer",
        technicianId: insertUser.technicianId || null,
        email: email || null,
        phone: insertUser.phone || null,
        address: insertUser.address || null,
        city: insertUser.city || null,
        companyName: insertUser.companyName || null,
        companyId: insertUser.companyId || null,
        isVerified: isVerified,
        registeredAt: now,
        verifiedAt: verifiedDate,
        verifiedBy: null
      };
      
      console.log("Vrednosti za unos u bazu:", {
        username: userToInsert.username,
        role: userToInsert.role,
        email: userToInsert.email,
        companyName: userToInsert.companyName
      });

      // Koristimo Drizzle ORM sa type-safe insert().returning() pattern
      console.log("Izvršavanje Drizzle upita za kreiranje korisnika");
      
      const result = await db.insert(users).values({
        username: userToInsert.username,
        password: userToInsert.password,
        fullName: userToInsert.fullName,
        role: userToInsert.role,
        technicianId: userToInsert.technicianId,
        email: userToInsert.email,
        phone: userToInsert.phone,
        address: userToInsert.address,
        city: userToInsert.city,
        companyName: userToInsert.companyName,
        companyId: userToInsert.companyId,
        isVerified: userToInsert.isVerified,
        registeredAt: userToInsert.registeredAt,
        verifiedAt: userToInsert.verifiedAt,
        verifiedBy: userToInsert.verifiedBy
      }).returning();
      
      if (!result || result.length === 0) {
        throw new Error("Došlo je do greške pri kreiranju korisnika. Korisnik nije vraćen iz baze.");
      }
      
      // Mapiranje rezultata u User objekat
      const userResult = result[0];
      const user: User = {
        id: userResult.id,
        username: userResult.username,
        password: userResult.password,
        fullName: userResult.fullName,
        role: userResult.role,
        technicianId: userResult.technicianId,
        email: userResult.email,
        phone: userResult.phone,
        address: userResult.address,
        city: userResult.city,
        companyName: userResult.companyName,
        companyId: userResult.companyId,
        isVerified: userResult.isVerified,
        registeredAt: userResult.registeredAt ? new Date(userResult.registeredAt) : new Date(),
        verifiedAt: userResult.verifiedAt ? new Date(userResult.verifiedAt) : null,
        verifiedBy: userResult.verifiedBy
      };
      
      console.log("Korisnik uspešno kreiran:", {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      });
      
      return user;
    } catch (error) {
      console.error("Greška pri kreiranju korisnika:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async updateUser(id: number, updateData: Partial<User>): Promise<User | undefined> {
    // Ako je uključen password, proveri da li je već validno heširan
    if (updateData.password) {
      const parts = updateData.password.split('.');
      if (parts.length !== 2 || parts[0].length < 32 || parts[1].length < 16) {
        // Ako nije u ispravnom formatu, heširati
        updateData.password = await this.hashPassword(updateData.password);
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Greška pri brisanju korisnika:", error);
      return false;
    }
  }

  // Technician methods
  async getAllTechnicians(): Promise<Technician[]> {
    return await db.select().from(technicians);
  }

  async getTechnician(id: number): Promise<Technician | undefined> {
    const [technician] = await db.select().from(technicians).where(eq(technicians.id, id));
    return technician;
  }

  async createTechnician(insertTechnician: InsertTechnician): Promise<Technician> {
    const [technician] = await db.insert(technicians).values(insertTechnician).returning();
    return technician;
  }

  async updateTechnician(id: number, data: InsertTechnician): Promise<Technician | undefined> {
    const [updatedTechnician] = await db
      .update(technicians)
      .set(data)
      .where(eq(technicians.id, id))
      .returning();
    return updatedTechnician;
  }
  
  async getUserByTechnicianId(technicianId: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.technicianId, technicianId));
    return user;
  }

  // Client methods
  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }
  
  async getClientByEmail(email: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.email, email));
    return client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set(data)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async getRecentClients(limit: number): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.id)).limit(limit);
  }

  // Appliance Category methods
  async getAllApplianceCategories(): Promise<ApplianceCategory[]> {
    return await db.select().from(applianceCategories);
  }

  async getApplianceCategory(id: number): Promise<ApplianceCategory | undefined> {
    const [category] = await db
      .select()
      .from(applianceCategories)
      .where(eq(applianceCategories.id, id));
    return category;
  }

  async createApplianceCategory(data: InsertApplianceCategory): Promise<ApplianceCategory> {
    const [category] = await db.insert(applianceCategories).values(data).returning();
    return category;
  }

  // Manufacturer methods
  async getAllManufacturers(): Promise<Manufacturer[]> {
    return await db.select().from(manufacturers);
  }

  async getManufacturer(id: number): Promise<Manufacturer | undefined> {
    const [manufacturer] = await db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.id, id));
    return manufacturer;
  }

  async createManufacturer(data: InsertManufacturer): Promise<Manufacturer> {
    const [manufacturer] = await db.insert(manufacturers).values(data).returning();
    return manufacturer;
  }

  // Appliance methods
  async getAllAppliances(): Promise<Appliance[]> {
    return await db.select().from(appliances);
  }

  async getAppliance(id: number): Promise<Appliance | undefined> {
    const [appliance] = await db.select().from(appliances).where(eq(appliances.id, id));
    return appliance;
  }
  
  async getApplianceBySerialNumber(serialNumber: string): Promise<Appliance | undefined> {
    const [appliance] = await db.select().from(appliances).where(eq(appliances.serialNumber, serialNumber));
    return appliance;
  }

  async getAppliancesByClient(clientId: number): Promise<Appliance[]> {
    return await db.select().from(appliances).where(eq(appliances.clientId, clientId));
  }

  async createAppliance(data: InsertAppliance): Promise<Appliance> {
    const [appliance] = await db.insert(appliances).values(data).returning();
    return appliance;
  }

  async updateAppliance(id: number, data: Partial<InsertAppliance>): Promise<Appliance | undefined> {
    const [updatedAppliance] = await db
      .update(appliances)
      .set(data)
      .where(eq(appliances.id, id))
      .returning();
    return updatedAppliance;
  }

  async deleteAppliance(id: number): Promise<void> {
    await db.delete(appliances).where(eq(appliances.id, id));
  }

  async getServicesByAppliance(applianceId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.applianceId, applianceId));
  }

  async getApplianceStats(): Promise<{categoryId: number, count: number}[]> {
    const result = await db
      .select({
        categoryId: appliances.categoryId,
        count: sql<number>`count(*)::int`
      })
      .from(appliances)
      .groupBy(appliances.categoryId);
    
    return result;
  }

  // Service methods
  async getAllServices(limit?: number): Promise<Service[]> {
    try {
      console.log('Dohvatanje svih servisa...');
      
      // Koristimo innerJoin za validaciju veza između tabela
      // Ovo će osigurati da servisi imaju validne reference na klijente i uređaje
      let query = db.select({
        id: services.id,
        clientId: services.clientId,
        applianceId: services.applianceId,
        technicianId: services.technicianId,
        description: services.description,
        status: services.status,
        warrantyStatus: services.warrantyStatus,
        createdAt: services.createdAt,
        scheduledDate: services.scheduledDate,
        completedDate: services.completedDate,
        technicianNotes: services.technicianNotes,
        cost: services.cost,
        usedParts: services.usedParts,
        machineNotes: services.machineNotes,
        isCompletelyFixed: services.isCompletelyFixed,
        businessPartnerId: services.businessPartnerId,
        partnerCompanyName: services.partnerCompanyName,
        // Dodajemo podatke o klijentu za prikaz u tabeli
        clientName: clients.fullName,
        clientCity: clients.city,
        clientAddress: clients.address,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        // Dodajemo podatke o uređaju za prikaz
        applianceName: appliances.model,
        applianceSerialNumber: appliances.serialNumber,
        // Dodajemo kategoriju i proizvođača za Complus filtriranje
        categoryName: applianceCategories.name,
        manufacturerName: manufacturers.name,
        // Dodajemo ime servisera za prikaz
        technicianName: technicians.fullName
      })
      .from(services)
      .innerJoin(clients, eq(services.clientId, clients.id))
      .innerJoin(appliances, eq(services.applianceId, appliances.id))
      .leftJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
      .leftJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
      .leftJoin(technicians, eq(services.technicianId, technicians.id))
      .orderBy(desc(services.createdAt));
      
      // Dodamo limit ako je specificiran za optimizaciju
      if (limit && limit > 0) {
        query = query.limit(limit);
      }
      
      const result = await query;
      
      // Vodimo zapisnik o ključevima prvog rezultata za debug
      if (result.length > 0) {
        console.log("Ključevi prvog servisa:", Object.keys(result[0]));
        if (result[0].createdAt) {
          console.log("Prvi servis createdAt:", new Date(result[0].createdAt).toISOString().split('T')[0]);
        }
      }
      
      console.log(`Uspješno dohvaćeno ${result.length} servisa sa validnim referencama`);
      
      // Transformacija naziva iz snake_case u camelCase ako je potrebno
      const transformedResult = result.map(service => {
        // Ako je slučajno createdAt transformirano iz created_at nazad u snake_case od strane orm-a
        if (!service.createdAt && (service as any).created_at) {
          return {
            ...service,
            // Ako imamo created_at umesto createdAt, prebacujemo u camelCase format
            createdAt: (service as any).created_at,
          };
        }
        return service;
      });
      
      return transformedResult;
    } catch (error) {
      console.error("Greška pri dobijanju svih servisa sa validacijom veza:", error);
      // Fallback na osnovni upit bez validacije
      console.log("Korištenje fallback upita za dohvatanje servisa");
      return await db.select().from(services);
    }
  }

  async getService(id: number): Promise<Service | undefined> {
    // Дохвата сервис са свим повезаним детаљима клијента, уређаја, категорије, произвођача и техничара
    const [service] = await db.select()
      .from(services)
      .leftJoin(clients, eq(services.clientId, clients.id))
      .leftJoin(appliances, eq(services.applianceId, appliances.id)) 
      .leftJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
      .leftJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
      .leftJoin(technicians, eq(services.technicianId, technicians.id))
      .leftJoin(users, eq(services.businessPartnerId, users.id))
      .where(eq(services.id, id))
      .then(rows => rows.map(row => ({
        ...row.services,
        client: row.clients,
        appliance: row.appliances,
        category: row.applianceCategories,
        manufacturer: row.manufacturers,
        technician: row.technicians,
        businessPartner: row.users ? {
          id: row.users.id,
          username: row.users.username,
          fullName: row.users.fullName,
          companyName: row.users.companyName,
          email: row.users.email,
          phone: row.users.phone,
          address: row.users.address,
          city: row.users.city
        } : undefined
      })));
    
    return service;
  }

  async getServicesByClient(clientId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.clientId, clientId));
  }

  async getServicesByStatus(status: ServiceStatus, limit?: number): Promise<Service[]> {
    let query = db.select().from(services).where(eq(services.status, status));
    
    // Dodamo limit ako je specificiran za optimizaciju
    if (limit && limit > 0) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async getServicesByStatusDetailed(status: ServiceStatus): Promise<any[]> {
    // Temporary: Return empty array while debugging Drizzle ORM issues
    console.log(`getServicesByStatusDetailed called with status: ${status}`);
    return [];
  }

  async getServicesByTechnician(technicianId: number, limit?: number): Promise<Service[]> {
    try {
      console.log(`Dohvatam servise za tehničara ${technicianId}`);
      
      let query = db
        .select()
        .from(services)
        .where(eq(services.technicianId, technicianId))
        .orderBy(desc(services.createdAt));
        
      // Dodamo limit ako je specificiran
      if (limit && limit > 0) {
        query = query.limit(limit);
      }
      
      const results = await query;
      console.log(`Pronađeno ${results.length} servisa za tehničara ${technicianId}`);
      return results;
    } catch (error) {
      console.error(`Greška pri dohvatanju servisa za tehničara ${technicianId}:`, error);
      throw error;
    }
  }
  
  // Nova optimizirana metoda za dohvaćanje servisa po tehničaru i statusu
  async getServicesByTechnicianAndStatus(technicianId: number, status: ServiceStatus, limit?: number): Promise<Service[]> {
    try {
      console.log(`Dohvatam servise za tehničara ${technicianId} sa statusom '${status}'`);
      
      let query = db
        .select()
        .from(services)
        .where(and(
          eq(services.technicianId, technicianId),
          eq(services.status, status)
        ))
        .orderBy(desc(services.createdAt));
        
      // Dodamo limit ako je specificiran
      if (limit && limit > 0) {
        query = query.limit(limit);
      }
      
      const results = await query;
      console.log(`Pronađeno ${results.length} servisa za tehničara ${technicianId} sa statusom '${status}'`);
      return results;
    } catch (error) {
      console.error(`Greška pri dohvatanju servisa za tehničara ${technicianId} sa statusom '${status}':`, error);
      throw error;
    }
  }

  async createService(data: InsertService): Promise<Service> {
    const [service] = await db.insert(services).values(data).returning();
    return service;
  }

  async updateService(id: number, data: InsertService): Promise<Service | undefined> {
    const [updatedService] = await db
      .update(services)
      .set(data)
      .where(eq(services.id, id))
      .returning();
    return updatedService;
  }

  async getRecentServices(limit: number): Promise<Service[]> {
    const results = await db
      .select({
        id: services.id,
        clientId: services.clientId,
        applianceId: services.applianceId,
        technicianId: services.technicianId,
        description: services.description,
        status: services.status,
        createdAt: services.createdAt,
        scheduledDate: services.scheduledDate,
        completedDate: services.completedDate,
        technicianNotes: services.technicianNotes,
        cost: services.cost,
        usedParts: services.usedParts,
        machineNotes: services.machineNotes,
        isCompletelyFixed: services.isCompletelyFixed,
        businessPartnerId: services.businessPartnerId,
        partnerCompanyName: services.partnerCompanyName,
        warrantyStatus: services.warrantyStatus,
        // Client information
        clientFullName: clients.fullName,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        clientAddress: clients.address,
        clientCity: clients.city,
        // Appliance information
        applianceModel: appliances.model,
        applianceSerialNumber: appliances.serialNumber,
        // Category information
        categoryName: applianceCategories.name,
        categoryIcon: applianceCategories.icon,
        // Manufacturer information
        manufacturerName: manufacturers.name
      })
      .from(services)
      .leftJoin(clients, eq(services.clientId, clients.id))
      .leftJoin(appliances, eq(services.applianceId, appliances.id))
      .leftJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
      .leftJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
      .orderBy(desc(services.createdAt))
      .limit(limit);

    // Transform the results to match the expected format
    return results.map(row => ({
      id: row.id,
      clientId: row.clientId,
      applianceId: row.applianceId,
      technicianId: row.technicianId,
      description: row.description,
      status: row.status,
      createdAt: row.createdAt,
      scheduledDate: row.scheduledDate,
      completedDate: row.completedDate,
      technicianNotes: row.technicianNotes,
      cost: row.cost,
      usedParts: row.usedParts,
      machineNotes: row.machineNotes,
      isCompletelyFixed: row.isCompletelyFixed,
      businessPartnerId: row.businessPartnerId,
      partnerCompanyName: row.partnerCompanyName,
      warrantyStatus: row.warrantyStatus,
      // Nested client object
      client: row.clientFullName ? {
        id: row.clientId,
        fullName: row.clientFullName,
        phone: row.clientPhone,
        email: row.clientEmail,
        address: row.clientAddress,
        city: row.clientCity
      } : undefined,
      // Nested appliance object with category
      appliance: row.applianceModel || row.categoryName ? {
        id: row.applianceId,
        model: row.applianceModel,
        serialNumber: row.applianceSerialNumber,
        category: row.categoryName ? {
          id: row.applianceId, // This will be overridden by actual category ID if needed
          name: row.categoryName,
          icon: row.categoryIcon
        } : undefined,
        manufacturer: row.manufacturerName ? {
          name: row.manufacturerName
        } : undefined
      } : undefined
    })) as Service[];
  }
  
  // Business Partner methods
  async getServicesByPartner(partnerId: number): Promise<any[]> {
    try {
      const partnerServices = await db
        .select()
        .from(services)
        .where(eq(services.businessPartnerId, partnerId))
        .orderBy(desc(services.createdAt));

      const servicesWithDetails = [];

      for (const service of partnerServices) {
        let clientInfo = null;
        let applianceInfo = null;
        let technicianInfo = null;

        // Dobavljanje informacija o klijentu
        if (service.clientId) {
          const [client] = await db.select().from(clients).where(eq(clients.id, service.clientId));
          if (client) {
            clientInfo = {
              id: client.id,
              fullName: client.fullName,
              phone: client.phone,
              email: client.email,
              address: client.address,
              city: client.city
            };
          }
        }

        // Dobavljanje informacija o uređaju, kategoriji i proizvođaču
        if (service.applianceId) {
          const [appliance] = await db.select().from(appliances).where(eq(appliances.id, service.applianceId));
          if (appliance) {
            const [category] = appliance.categoryId ? 
              await db.select().from(applianceCategories).where(eq(applianceCategories.id, appliance.categoryId)) :
              [null];
              
            const [manufacturer] = appliance.manufacturerId ? 
              await db.select().from(manufacturers).where(eq(manufacturers.id, appliance.manufacturerId)) :
              [null];

            applianceInfo = {
              id: appliance.id,
              model: appliance.model,
              serialNumber: appliance.serialNumber,
              categoryId: appliance.categoryId,
              manufacturerId: appliance.manufacturerId
            };

            // Dodavanje category i manufacturer informacija
            if (category) {
              applianceInfo.category = { id: category.id, name: category.name };
            }
            if (manufacturer) {
              applianceInfo.manufacturer = { id: manufacturer.id, name: manufacturer.name };
            }
          }
        }

        // Dobavljanje informacija o serviseru
        if (service.technicianId) {
          const [technician] = await db.select().from(technicians).where(eq(technicians.id, service.technicianId));
          if (technician) {
            technicianInfo = {
              id: technician.id,
              fullName: technician.fullName,
              specialization: technician.specialization,
              phone: technician.phone,
              email: technician.email
            };
          }
        }

        servicesWithDetails.push({
          ...service,
          client: clientInfo,
          appliance: applianceInfo,
          category: applianceInfo?.category || null,
          manufacturer: applianceInfo?.manufacturer || null,
          technician: technicianInfo
        });
      }

      return servicesWithDetails;
    } catch (error) {
      console.error("Greška pri dobavljanju servisa za poslovnog partnera:", error);
      return [];
    }
  }

  // Dobijanje klijenata poslovnog partnera (samo oni klijenti koji su povezani sa servisima tog partnera)
  async getClientsByPartner(partnerId: number): Promise<Client[]> {
    try {
      // Dobijam ID-jeve klijenata iz servisa ovog partnera
      const partnerServices = await db
        .select({ clientId: services.clientId })
        .from(services)
        .where(eq(services.businessPartnerId, partnerId));
      
      const clientIds = [...new Set(partnerServices.map(s => s.clientId).filter(id => id !== null))];
      
      if (clientIds.length === 0) {
        return [];
      }
      
      // Vraćam klijente povezane sa tim servisima
      const partnersClients = await db
        .select()
        .from(clients)
        .where(inArray(clients.id, clientIds))
        .orderBy(clients.fullName);
      
      return partnersClients;
    } catch (error) {
      console.error('Greška pri dohvatanju klijenata za poslovnog partnera:', error);
      return [];
    }
  }
  
  async getServiceWithDetails(serviceId: number): Promise<any> {
    // Dohvati osnovne podatke o servisu
    const [service] = await db.select().from(services).where(eq(services.id, serviceId));
    
    if (!service) return null;
    
    // Dohvati podatke o klijentu
    let client = null;
    if (service.clientId) {
      const [clientData] = await db.select().from(clients).where(eq(clients.id, service.clientId));
      if (clientData) {
        client = {
          id: clientData.id,
          fullName: clientData.fullName,
          phone: clientData.phone,
          email: clientData.email,
          address: clientData.address,
          city: clientData.city
        };
      }
    }
    
    // Dohvati podatke o uređaju
    let appliance = null;
    let category = null;
    let manufacturer = null;
    
    if (service.applianceId) {
      const [applianceData] = await db.select().from(appliances).where(eq(appliances.id, service.applianceId));
      
      if (applianceData) {
        appliance = {
          id: applianceData.id,
          model: applianceData.model,
          serialNumber: applianceData.serialNumber
        };
        
        // Dohvati kategoriju uređaja
        if (applianceData.categoryId) {
          const [categoryData] = await db.select().from(applianceCategories).where(eq(applianceCategories.id, applianceData.categoryId));
          if (categoryData) {
            category = {
              id: categoryData.id,
              name: categoryData.name
            };
          }
        }
        
        // Dohvati proizvođača
        if (applianceData.manufacturerId) {
          const [manufacturerData] = await db.select().from(manufacturers).where(eq(manufacturers.id, applianceData.manufacturerId));
          if (manufacturerData) {
            manufacturer = {
              id: manufacturerData.id,
              name: manufacturerData.name
            };
          }
        }
      }
    }
    
    // Dohvati podatke o tehničaru
    let technician = null;
    if (service.technicianId) {
      const [technicianData] = await db.select().from(technicians).where(eq(technicians.id, service.technicianId));
      if (technicianData) {
        technician = {
          id: technicianData.id,
          fullName: technicianData.fullName,
          phone: technicianData.phone,
          email: technicianData.email
        };
      }
    }
    
    // Kombinuj sve podatke
    return {
      ...service,
      client,
      appliance,
      technician,
      category,
      manufacturer
    };
  }
  
  async getServiceStatusHistory(serviceId: number): Promise<any[]> {
    // Potrebno je kreirati tabelu za istoriju statusa u budućnosti
    // Za sada, simuliramo istoriju na osnovu postojećih podataka
    
    const [service] = await db.select().from(services).where(eq(services.id, serviceId));
    
    if (!service) return [];
    
    // Simuliramo istoriju promena statusa na osnovu trenutnog statusa
    const history = [];
    
    // Dodajemo početni status "on hold" kad je servis kreiran
    history.push({
      id: 1,
      serviceId,
      oldStatus: "",
      newStatus: "on_hold",
      notes: "Servis kreiran",
      createdAt: service.createdAt,
      createdBy: "Poslovni partner"
    });
    
    if (service.status !== "on_hold") {
      // Dodajemo promenu na "pending" ako je servis prešao u taj status
      history.push({
        id: 2,
        serviceId,
        oldStatus: "on_hold",
        newStatus: "pending",
        notes: "Servis primljen na razmatranje",
        createdAt: new Date(new Date(service.createdAt).getTime() + 86400000).toISOString(), // dan kasnije
        createdBy: "Administrator"
      });
    }
    
    if (service.status === "in_progress" || service.status === "completed" || service.status === "canceled") {
      // Dodajemo promenu na "in_progress" kad je serviser dodeljen
      history.push({
        id: 3,
        serviceId,
        oldStatus: "pending",
        newStatus: "in_progress",
        notes: "Serviser dodeljen",
        createdAt: service.scheduledDate || new Date(new Date(service.createdAt).getTime() + 172800000).toISOString(), // dva dana kasnije
        createdBy: service.technicianId ? `Serviser ${service.technicianId}` : "Administrator"
      });
    }
    
    if (service.status === "completed") {
      // Dodajemo krajnju promenu na "completed"
      history.push({
        id: 4,
        serviceId,
        oldStatus: "in_progress",
        newStatus: "completed",
        notes: service.technicianNotes || "Servis završen",
        createdAt: service.completedDate || new Date().toISOString(),
        createdBy: service.technicianId ? `Serviser ${service.technicianId}` : "Administrator"
      });
    } else if (service.status === "canceled") {
      // Dodajemo krajnju promenu na "canceled"
      history.push({
        id: 4,
        serviceId,
        oldStatus: "in_progress",
        newStatus: "canceled",
        notes: "Servis otkazan",
        createdAt: new Date().toISOString(),
        createdBy: "Administrator"
      });
    }
    
    return history;
  }

  // Maintenance Schedule methods
  async getAllMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
    return await db.select().from(maintenanceSchedules);
  }

  async getMaintenanceSchedule(id: number): Promise<MaintenanceSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(maintenanceSchedules)
      .where(eq(maintenanceSchedules.id, id));
    return schedule;
  }

  async getMaintenanceSchedulesByAppliance(applianceId: number): Promise<MaintenanceSchedule[]> {
    return await db
      .select()
      .from(maintenanceSchedules)
      .where(eq(maintenanceSchedules.applianceId, applianceId));
  }

  async createMaintenanceSchedule(data: InsertMaintenanceSchedule): Promise<MaintenanceSchedule> {
    const [schedule] = await db.insert(maintenanceSchedules).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return schedule;
  }

  async updateMaintenanceSchedule(id: number, data: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule | undefined> {
    const [updatedSchedule] = await db
      .update(maintenanceSchedules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(maintenanceSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteMaintenanceSchedule(id: number): Promise<boolean> {
    try {
      const result = await db.delete(maintenanceSchedules).where(eq(maintenanceSchedules.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Greška pri brisanju rasporeda održavanja:", error);
      return false;
    }
  }

  async getUpcomingMaintenanceSchedules(daysThreshold: number): Promise<MaintenanceSchedule[]> {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);
    
    return await db
      .select()
      .from(maintenanceSchedules)
      .where(
        and(
          eq(maintenanceSchedules.isActive, true),
          gte(maintenanceSchedules.nextMaintenanceDate, now),
          lte(maintenanceSchedules.nextMaintenanceDate, thresholdDate)
        )
      );
  }

  // Maintenance Alert methods
  async getAllMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    return await db.select().from(maintenanceAlerts);
  }

  async getMaintenanceAlert(id: number): Promise<MaintenanceAlert | undefined> {
    const [alert] = await db
      .select()
      .from(maintenanceAlerts)
      .where(eq(maintenanceAlerts.id, id));
    return alert;
  }

  async getMaintenanceAlertsBySchedule(scheduleId: number): Promise<MaintenanceAlert[]> {
    return await db
      .select()
      .from(maintenanceAlerts)
      .where(eq(maintenanceAlerts.scheduleId, scheduleId));
  }

  async createMaintenanceAlert(data: InsertMaintenanceAlert): Promise<MaintenanceAlert> {
    const [alert] = await db.insert(maintenanceAlerts).values({
      ...data,
      createdAt: new Date()
    }).returning();
    return alert;
  }

  async updateMaintenanceAlert(id: number, data: Partial<MaintenanceAlert>): Promise<MaintenanceAlert | undefined> {
    const [updatedAlert] = await db
      .update(maintenanceAlerts)
      .set(data)
      .where(eq(maintenanceAlerts.id, id))
      .returning();
    return updatedAlert;
  }

  async deleteMaintenanceAlert(id: number): Promise<boolean> {
    try {
      const result = await db.delete(maintenanceAlerts).where(eq(maintenanceAlerts.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Greška pri brisanju alarma:", error);
      return false;
    }
  }

  async getUnreadMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    return await db
      .select()
      .from(maintenanceAlerts)
      .where(eq(maintenanceAlerts.isRead, false));
  }

  async markMaintenanceAlertAsRead(id: number): Promise<MaintenanceAlert | undefined> {
    const [updatedAlert] = await db
      .update(maintenanceAlerts)
      .set({ isRead: true })
      .where(eq(maintenanceAlerts.id, id))
      .returning();
    return updatedAlert;
  }

  // Request tracking methods (rate limiting)
  async getRequestCount(userId: number, requestType: string, windowStart: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(requestTracking)
        .where(
          and(
            eq(requestTracking.userId, userId),
            eq(requestTracking.requestType, requestType),
            gte(requestTracking.requestDate, windowStart)
          )
        );
      return result.count;
    } catch (error) {
      console.error('Greška pri brojanju zahteva:', error);
      return 0;
    }
  }

  async addRequestTracking(tracking: InsertRequestTracking): Promise<RequestTracking> {
    const [newTracking] = await db
      .insert(requestTracking)
      .values(tracking)
      .returning();
    return newTracking;
  }

  async getRequestHistory(userId: number, limit: number = 50): Promise<RequestTracking[]> {
    return await db
      .select()
      .from(requestTracking)
      .where(eq(requestTracking.userId, userId))
      .orderBy(desc(requestTracking.requestDate))
      .limit(limit);
  }

  // Bot verification methods
  async getBotVerification(sessionId: string): Promise<BotVerification | undefined> {
    try {
      const [verification] = await db
        .select()
        .from(botVerification)
        .where(eq(botVerification.sessionId, sessionId));
      return verification;
    } catch (error) {
      console.error('Greška pri dohvatanju bot verifikacije:', error);
      return undefined;
    }
  }

  async createBotVerification(verification: InsertBotVerification): Promise<BotVerification> {
    const [newVerification] = await db
      .insert(botVerification)
      .values(verification)
      .returning();
    return newVerification;
  }

  async updateBotVerification(sessionId: string, update: Partial<BotVerification>): Promise<BotVerification | undefined> {
    try {
      const [updatedVerification] = await db
        .update(botVerification)
        .set(update)
        .where(eq(botVerification.sessionId, sessionId))
        .returning();
      return updatedVerification;
    } catch (error) {
      console.error('Greška pri ažuriranju bot verifikacije:', error);
      return undefined;
    }
  }

  async cleanupExpiredBotVerifications(): Promise<void> {
    try {
      const now = new Date();
      await db
        .delete(botVerification)
        .where(lte(botVerification.expiresAt, now));
    } catch (error) {
      console.error('Greška pri čišćenju isteklih bot verifikacija:', error);
    }
  }

  // Email verification methods
  async getEmailVerification(email: string): Promise<EmailVerification | undefined> {
    try {
      const [verification] = await db
        .select()
        .from(emailVerification)
        .where(and(
          eq(emailVerification.email, email),
          eq(emailVerification.used, false),
          gte(emailVerification.expiresAt, new Date())
        ))
        .orderBy(desc(emailVerification.createdAt));
      return verification;
    } catch (error) {
      console.error('Greška pri dohvatanju email verifikacije:', error);
      return undefined;
    }
  }

  async createEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification> {
    const [newVerification] = await db
      .insert(emailVerification)
      .values(verification)
      .returning();
    return newVerification;
  }

  async updateEmailVerification(id: number, update: Partial<EmailVerification>): Promise<EmailVerification | undefined> {
    try {
      const [updatedVerification] = await db
        .update(emailVerification)
        .set(update)
        .where(eq(emailVerification.id, id))
        .returning();
      return updatedVerification;
    } catch (error) {
      console.error('Greška pri ažuriranju email verifikacije:', error);
      return undefined;
    }
  }

  async validateEmailVerification(email: string, code: string): Promise<boolean> {
    try {
      const verification = await this.getEmailVerification(email);
      if (!verification) return false;
      
      if (verification.verificationCode === code) {
        await this.updateEmailVerification(verification.id, { used: true });
        return true;
      } else {
        await this.updateEmailVerification(verification.id, { 
          attempts: verification.attempts + 1 
        });
        return false;
      }
    } catch (error) {
      console.error('Greška pri validaciji email verifikacije:', error);
      return false;
    }
  }

  async cleanupExpiredEmailVerifications(): Promise<void> {
    try {
      const now = new Date();
      await db
        .delete(emailVerification)
        .where(lte(emailVerification.expiresAt, now));
    } catch (error) {
      console.error('Greška pri čišćenju isteklih email verifikacija:', error);
    }
  }

  // Admin service methods
  async getAdminServices(): Promise<any[]> {
    try {
      // First, get all services with minimal data to reduce complexity
      const allServices = await db
        .select()
        .from(services)
        .orderBy(desc(services.createdAt));
      
      if (allServices.length === 0) {
        return [];
      }

      // Get all related data with bulk queries
      const clientIds = [...new Set(allServices.map(s => s.clientId))];
      const applianceIds = [...new Set(allServices.map(s => s.applianceId))];
      const technicianIds = [...new Set(allServices.map(s => s.technicianId).filter(id => id !== null))];

      // Bulk fetch all clients
      const clientsData = await db
        .select()
        .from(clients)
        .where(inArray(clients.id, clientIds));

      // Bulk fetch all appliances with their categories and manufacturers
      const appliancesData = await db
        .select({
          id: appliances.id,
          model: appliances.model,
          serialNumber: appliances.serialNumber,
          categoryId: appliances.categoryId,
          manufacturerId: appliances.manufacturerId,
          categoryName: applianceCategories.name,
          categoryIcon: applianceCategories.icon,
          manufacturerName: manufacturers.name,
        })
        .from(appliances)
        .innerJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
        .innerJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .where(inArray(appliances.id, applianceIds));

      // Bulk fetch all technicians
      const techniciansData = technicianIds.length > 0 
        ? await db
            .select()
            .from(technicians)
            .where(inArray(technicians.id, technicianIds))
        : [];

      // Create maps for fast lookups
      const clientsMap = new Map(clientsData.map(c => [c.id, c]));
      const appliancesMap = new Map(appliancesData.map(a => [a.id, a]));
      const techniciansMap = new Map(techniciansData.map(t => [t.id, t]));

      // Assemble the final result
      return allServices.map(service => {
        const client = clientsMap.get(service.clientId);
        const appliance = appliancesMap.get(service.applianceId);
        const technician = service.technicianId ? techniciansMap.get(service.technicianId) : null;

        return {
          id: service.id,
          status: service.status,
          description: service.description,
          createdAt: service.createdAt,
          updatedAt: service.createdAt,
          scheduledDate: service.scheduledDate,
          completedDate: service.completedDate,
          technicianId: service.technicianId,
          clientId: service.clientId,
          applianceId: service.applianceId,
          priority: 'medium',
          notes: null,
          technicianNotes: service.technicianNotes,
          usedParts: service.usedParts,
          machineNotes: service.machineNotes,
          cost: service.cost,
          isCompletelyFixed: service.isCompletelyFixed,
          warrantyStatus: service.warrantyStatus,
          businessPartnerId: service.businessPartnerId,
          partnerCompanyName: service.partnerCompanyName,
          client: client ? {
            id: client.id,
            fullName: client.fullName,
            phone: client.phone,
            email: client.email,
            address: client.address,
            city: client.city,
            companyName: client.companyName,
          } : null,
          appliance: appliance ? {
            id: appliance.id,
            model: appliance.model,
            serialNumber: appliance.serialNumber,
            category: {
              id: appliance.categoryId,
              name: appliance.categoryName,
              icon: appliance.categoryIcon,
            },
            manufacturer: {
              id: appliance.manufacturerId,
              name: appliance.manufacturerName,
            },
          } : null,
          technician: technician ? {
            id: technician.id,
            fullName: technician.fullName,
            email: technician.email,
            phone: technician.phone,
            specialization: technician.specialization,
          } : null,
        };
      });
    } catch (error) {
      console.error('Greška pri dohvatanju admin servisa:', error);
      return [];
    }
  }

  async getAdminServiceById(id: number): Promise<any | undefined> {
    try {
      // First get the service
      const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, id));

      if (!service) return undefined;

      // Then get related data separately to avoid complex joins
      const [client] = service.clientId ? await db
        .select()
        .from(clients)
        .where(eq(clients.id, service.clientId)) : [null];

      const [appliance] = service.applianceId ? await db
        .select()
        .from(appliances)
        .where(eq(appliances.id, service.applianceId)) : [null];

      const [technician] = service.technicianId ? await db
        .select()
        .from(technicians)
        .where(eq(technicians.id, service.technicianId)) : [null];

      // Get category and manufacturer for appliance if it exists
      let category = null;
      let manufacturer = null;
      if (appliance) {
        if (appliance.categoryId) {
          [category] = await db
            .select()
            .from(applianceCategories)
            .where(eq(applianceCategories.id, appliance.categoryId));
        }
        if (appliance.manufacturerId) {
          [manufacturer] = await db
            .select()
            .from(manufacturers)
            .where(eq(manufacturers.id, appliance.manufacturerId));
        }
      }

      return {
        id: service.id,
        status: service.status,
        description: service.description,
        createdAt: service.createdAt,
        updatedAt: service.createdAt,
        scheduledDate: service.scheduledDate,
        completedDate: service.completedDate,
        technicianId: service.technicianId,
        clientId: service.clientId,
        applianceId: service.applianceId,
        priority: 'medium',
        notes: null,
        technicianNotes: service.technicianNotes,
        usedParts: service.usedParts,
        machineNotes: service.machineNotes,
        cost: service.cost,
        isCompletelyFixed: service.isCompletelyFixed,
        warrantyStatus: service.warrantyStatus,
        businessPartnerId: service.businessPartnerId,
        partnerCompanyName: service.partnerCompanyName,
        client: client ? {
          id: client.id,
          fullName: client.fullName,
          phone: client.phone,
          email: client.email,
          address: client.address,
          city: client.city,
          companyName: client.companyName,
        } : null,
        appliance: appliance ? {
          id: appliance.id,
          model: appliance.model,
          serialNumber: appliance.serialNumber,
          category: category ? {
            id: category.id,
            name: category.name,
            icon: category.icon,
          } : null,
          manufacturer: manufacturer ? {
            id: manufacturer.id,
            name: manufacturer.name,
          } : null,
        } : null,
        technician: technician ? {
          id: technician.id,
          fullName: technician.fullName,
          email: technician.email,
          phone: technician.phone,
          specialization: technician.specialization,
        } : null,
      };
    } catch (error) {
      console.error('Greška pri dohvatanju admin servisa:', error);
      return undefined;
    }
  }

  async updateAdminService(id: number, updates: any): Promise<any | undefined> {
    try {
      const [updated] = await db
        .update(services)
        .set({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(services.id, id))
        .returning();

      if (!updated) return undefined;

      return this.getAdminServiceById(id);
    } catch (error) {
      console.error('Greška pri ažuriranju admin servisa:', error);
      return undefined;
    }
  }

  async deleteAdminService(id: number): Promise<boolean> {
    try {
      console.log(`[DELETE SERVICE] Započinje brisanje servisa ID: ${id}`);
      
      // Validacija da li je ID valjan
      if (isNaN(id) || id <= 0) {
        console.error('Nevaljan ID servisa za brisanje:', id);
        return false;
      }

      // Proverava da li servis uopšte postoji
      const existingService = await db
        .select()
        .from(services)
        .where(eq(services.id, id))
        .limit(1);
      
      console.log(`[DELETE SERVICE] Servis sa ID ${id} postoji:`, existingService.length > 0);
      
      if (existingService.length === 0) {
        console.log(`[DELETE SERVICE] Servis sa ID ${id} ne postoji u bazi`);
        return false;
      }

      // Prvo obriši sve povezane notifikacije
      console.log(`[DELETE SERVICE] Brišem povezane notifikacije za servis ${id}`);
      const deletedNotifications = await db
        .delete(notifications)
        .where(eq(notifications.relatedServiceId, id))
        .returning();
      
      console.log(`[DELETE SERVICE] Obrisano ${deletedNotifications.length} notifikacija`);

      // Zatim obriši sam servis
      console.log(`[DELETE SERVICE] Brišem sam servis ${id}`);
      const result = await db
        .delete(services)
        .where(eq(services.id, id))
        .returning();

      console.log(`[DELETE SERVICE] Rezultat brisanja servisa:`, result.length > 0 ? 'USPEŠNO' : 'NEUSPEŠNO');
      console.log(`[DELETE SERVICE] Obrisani servis podaci:`, result.length > 0 ? result[0].id : 'nema podataka');

      return result.length > 0;
    } catch (error) {
      console.error('Greška pri brisanju admin servisa:', error);
      return false;
    }
  }

  async assignTechnicianToService(serviceId: number, technicianId: number): Promise<any | undefined> {
    try {
      const [updated] = await db
        .update(services)
        .set({
          technicianId,
          status: 'assigned',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(services.id, serviceId))
        .returning();

      if (!updated) return undefined;

      return this.getAdminServiceById(serviceId);
    } catch (error) {
      console.error('Greška pri dodeli servisera:', error);
      return undefined;
    }
  }

  // Spare parts methods
  async getAllSparePartOrders(): Promise<any[]> {
    try {
      // Prvo dohvati sve spare part orders
      const orders = await db
        .select()
        .from(sparePartOrders)
        .orderBy(desc(sparePartOrders.createdAt));

      // Zatim dodaj povezane podatke za svaki order
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          let serviceData = undefined;
          let technicianData = undefined;

          // Dodaj service podatke ako postoji serviceId
          if (order.serviceId) {
            try {
              const service = await this.getAdminServiceById(order.serviceId);
              if (service) {
                serviceData = service;
              }
            } catch (error) {
              console.log(`Servis ${order.serviceId} nije pronađen:`, error);
            }
          }

          // Dodaj technician podatke ako postoji technicianId
          if (order.technicianId) {
            try {
              const technician = await this.getTechnician(order.technicianId);
              if (technician) {
                technicianData = {
                  name: technician.name,
                  phone: technician.phone || '',
                  email: technician.email || '',
                  specialization: technician.specialization || ''
                };
              }
            } catch (error) {
              console.log(`Serviser ${order.technicianId} nije pronađen:`, error);
            }
          }

          return {
            ...order,
            service: serviceData,
            technician: technicianData
          };
        })
      );

      return enrichedOrders;
    } catch (error) {
      console.error('Greška pri dohvatanju svih porudžbina rezervnih delova:', error);
      throw error;
    }
  }

  async getSparePartOrder(id: number): Promise<SparePartOrder | undefined> {
    try {
      const [order] = await db
        .select()
        .from(sparePartOrders)
        .where(eq(sparePartOrders.id, id));
      return order;
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbine rezervnog dela:', error);
      throw error;
    }
  }

  async getSparePartOrdersByService(serviceId: number): Promise<SparePartOrder[]> {
    try {
      const orders = await db
        .select()
        .from(sparePartOrders)
        .where(eq(sparePartOrders.serviceId, serviceId))
        .orderBy(desc(sparePartOrders.createdAt));
      return orders;
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina po servisu:', error);
      throw error;
    }
  }

  async getSparePartOrdersByTechnician(technicianId: number): Promise<SparePartOrder[]> {
    try {
      const orders = await db
        .select()
        .from(sparePartOrders)
        .where(eq(sparePartOrders.technicianId, technicianId))
        .orderBy(desc(sparePartOrders.createdAt));
      return orders;
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina po tehničaru:', error);
      throw error;
    }
  }

  async getSparePartOrdersByStatus(status: SparePartStatus): Promise<SparePartOrder[]> {
    try {
      const orders = await db
        .select()
        .from(sparePartOrders)
        .where(eq(sparePartOrders.status, status))
        .orderBy(desc(sparePartOrders.createdAt));
      return orders;
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina po statusu:', error);
      throw error;
    }
  }

  async getPendingSparePartOrders(): Promise<SparePartOrder[]> {
    try {
      const orders = await db
        .select()
        .from(sparePartOrders)
        .where(eq(sparePartOrders.status, 'pending'))
        .orderBy(desc(sparePartOrders.createdAt));
      return orders;
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina na čekanju:', error);
      throw error;
    }
  }

  async createSparePartOrder(order: InsertSparePartOrder): Promise<SparePartOrder> {
    try {
      const [newOrder] = await db
        .insert(sparePartOrders)
        .values(order)
        .returning();
      return newOrder;
    } catch (error) {
      console.error('Greška pri kreiranju porudžbine rezervnog dela:', error);
      throw error;
    }
  }

  async updateSparePartOrder(id: number, order: Partial<SparePartOrder>): Promise<SparePartOrder | undefined> {
    try {
      const [updatedOrder] = await db
        .update(sparePartOrders)
        .set(order)
        .where(eq(sparePartOrders.id, id))
        .returning();
      return updatedOrder;
    } catch (error) {
      console.error('Greška pri ažuriranju porudžbine rezervnog dela:', error);
      throw error;
    }
  }

  async deleteSparePartOrder(id: number): Promise<boolean> {
    try {
      // First delete any related notifications
      await db
        .delete(notifications)
        .where(eq(notifications.relatedSparePartId, id));
      
      // Then delete the spare part order
      const result = await db
        .delete(sparePartOrders)
        .where(eq(sparePartOrders.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Greška pri brisanju porudžbine rezervnog dela:', error);
      return false;
    }
  }

  async markSparePartAsReceived(orderId: number, adminId: number, receivedData: { actualCost?: string; location?: string; notes?: string }): Promise<{ order: SparePartOrder; availablePart: AvailablePart } | undefined> {
    try {
      // Get the order first
      const order = await this.getSparePartOrder(orderId);
      if (!order) {
        throw new Error('Porudžbina nije pronađena');
      }

      // Update the order status to 'received'
      const updatedOrder = await this.updateSparePartOrder(orderId, {
        status: 'received',
        receivedDate: new Date(),
        actualCost: receivedData.actualCost || order.actualCost
      });

      if (!updatedOrder) {
        throw new Error('Nije moguće ažurirati porudžbinu');
      }

      // Gather service information if available
      let serviceInfo = {
        serviceId: null as number | null,
        clientName: null as string | null,
        clientPhone: null as string | null,
        applianceInfo: null as string | null,
        serviceDescription: null as string | null
      };

      if (order.serviceId) {
        try {
          const service = await this.getService(order.serviceId);
          if (service) {
            serviceInfo.serviceId = service.id;
            serviceInfo.serviceDescription = service.description;

            // Get client info
            if (service.clientId) {
              const client = await this.getClient(service.clientId);
              if (client) {
                serviceInfo.clientName = client.fullName;
                serviceInfo.clientPhone = client.phone;
              }
            }

            // Get appliance info
            if (service.applianceId) {
              const appliance = await this.getAppliance(service.applianceId);
              if (appliance) {
                const category = appliance.categoryId ? await this.getApplianceCategory(appliance.categoryId) : null;
                const manufacturer = appliance.manufacturerId ? await this.getManufacturer(appliance.manufacturerId) : null;
                
                serviceInfo.applianceInfo = [
                  manufacturer?.name,
                  category?.name,
                  appliance.model
                ].filter(Boolean).join(' - ');
              }
            }
          }
        } catch (serviceError) {
          console.error('Greška pri dohvatanju informacija o servisu:', serviceError);
          // Nastavljamo bez servisnih informacija
        }
      }

      // Create available part from the order
      const availablePartData = {
        partName: order.partName,
        partNumber: order.partNumber || null,
        quantity: order.quantity,
        description: order.description || null,
        supplierName: order.supplierName || null,
        unitCost: receivedData.actualCost || order.estimatedCost || null,
        location: receivedData.location || 'Glavno skladište',
        warrantyStatus: order.warrantyStatus,
        categoryId: null, // Could be extracted from appliance if needed
        manufacturerId: null, // Could be extracted from appliance if needed
        originalOrderId: orderId,
        addedBy: adminId,
        notes: receivedData.notes || null,
        // Add service information
        serviceId: serviceInfo.serviceId,
        clientName: serviceInfo.clientName,
        clientPhone: serviceInfo.clientPhone,
        applianceInfo: serviceInfo.applianceInfo,
        serviceDescription: serviceInfo.serviceDescription
      };

      const availablePart = await this.createAvailablePart(availablePartData);

      return { order: updatedOrder, availablePart };
    } catch (error) {
      console.error('Greška pri označavanju dela kao primljenog:', error);
      throw error;
    }
  }

  // Parts Allocation Methods
  async createPartsAllocation(allocationData: InsertPartsAllocation): Promise<PartsAllocation> {
    try {
      const [allocation] = await db
        .insert(partsAllocations)
        .values(allocationData)
        .returning();
      return allocation;
    } catch (error) {
      console.error('Greška pri kreiranju alokacije delova:', error);
      throw error;
    }
  }

  async getAllocatePartToTechnician(
    partId: number,
    serviceId: number,
    technicianId: number,
    quantity: number,
    allocatedBy: number
  ): Promise<{ allocation: PartsAllocation; remainingQuantity: number } | undefined> {
    try {
      // Get the available part
      const part = await this.getAvailablePart(partId);
      if (!part) {
        throw new Error('Deo nije pronađen');
      }

      if (part.quantity < quantity) {
        throw new Error('Nema dovoljno delova na stanju');
      }

      // Create allocation record
      const allocationData = {
        availablePartId: partId,
        serviceId,
        technicianId,
        quantity,
        allocatedDate: new Date(),
        allocatedBy,
        status: 'allocated' as const
      };

      const allocation = await this.createPartsAllocation(allocationData);

      // Update available part quantity
      const newQuantity = part.quantity - quantity;
      await this.updateAvailablePart(partId, { quantity: newQuantity });

      return { allocation, remainingQuantity: newQuantity };
    } catch (error) {
      console.error('Greška pri dodeli dela serviseru:', error);
      throw error;
    }
  }

  async getPartsAllocationsByService(serviceId: number): Promise<PartsAllocation[]> {
    try {
      return await db
        .select()
        .from(partsAllocations)
        .where(eq(partsAllocations.serviceId, serviceId))
        .orderBy(desc(partsAllocations.allocatedDate));
    } catch (error) {
      console.error('Greška pri dohvatanju alokacija delova za servis:', error);
      return [];
    }
  }

  async getPartsAllocationsByTechnician(technicianId: number): Promise<PartsAllocation[]> {
    try {
      return await db
        .select()
        .from(partsAllocations)
        .where(eq(partsAllocations.technicianId, technicianId))
        .orderBy(desc(partsAllocations.allocatedDate));
    } catch (error) {
      console.error('Greška pri dohvatanju alokacija delova za servisera:', error);
      return [];
    }
  }

  async getAllPartsAllocations(): Promise<PartsAllocation[]> {
    try {
      return await db
        .select()
        .from(partsAllocations)
        .orderBy(desc(partsAllocations.allocatedDate));
    } catch (error) {
      console.error('Greška pri dohvatanju svih alokacija delova:', error);
      return [];
    }
  }

  // Available parts methods
  async getAllAvailableParts(): Promise<AvailablePart[]> {
    try {
      const parts = await db
        .select()
        .from(availableParts)
        .orderBy(desc(availableParts.addedDate));
      return parts;
    } catch (error) {
      console.error('Greška pri dohvatanju dostupnih delova:', error);
      throw error;
    }
  }

  async getAvailablePart(id: number): Promise<AvailablePart | undefined> {
    try {
      const [part] = await db
        .select()
        .from(availableParts)
        .where(eq(availableParts.id, id));
      return part;
    } catch (error) {
      console.error('Greška pri dohvatanju dostupnog dela:', error);
      throw error;
    }
  }

  async getAvailablePartsByCategory(categoryId: number): Promise<AvailablePart[]> {
    try {
      const parts = await db
        .select()
        .from(availableParts)
        .where(eq(availableParts.categoryId, categoryId))
        .orderBy(desc(availableParts.addedDate));
      return parts;
    } catch (error) {
      console.error('Greška pri dohvatanju delova po kategoriji:', error);
      throw error;
    }
  }

  async getAvailablePartsByManufacturer(manufacturerId: number): Promise<AvailablePart[]> {
    try {
      const parts = await db
        .select()
        .from(availableParts)
        .where(eq(availableParts.manufacturerId, manufacturerId))
        .orderBy(desc(availableParts.addedDate));
      return parts;
    } catch (error) {
      console.error('Greška pri dohvatanju delova po proizvođaču:', error);
      throw error;
    }
  }

  async getAvailablePartsByWarrantyStatus(warrantyStatus: string): Promise<AvailablePart[]> {
    try {
      const parts = await db
        .select()
        .from(availableParts)
        .where(eq(availableParts.warrantyStatus, warrantyStatus))
        .orderBy(desc(availableParts.addedDate));
      return parts;
    } catch (error) {
      console.error('Greška pri dohvatanju delova po garanciji:', error);
      throw error;
    }
  }

  async searchAvailableParts(searchTerm: string): Promise<AvailablePart[]> {
    try {
      const parts = await db
        .select()
        .from(availableParts)
        .where(
          sql`LOWER(${availableParts.partName}) LIKE LOWER(${'%' + searchTerm + '%'}) OR 
              LOWER(${availableParts.partNumber}) LIKE LOWER(${'%' + searchTerm + '%'}) OR
              LOWER(${availableParts.description}) LIKE LOWER(${'%' + searchTerm + '%'})`
        )
        .orderBy(desc(availableParts.addedDate));
      return parts;
    } catch (error) {
      console.error('Greška pri pretrazi dostupnih delova:', error);
      throw error;
    }
  }

  async createAvailablePart(part: InsertAvailablePart): Promise<AvailablePart> {
    try {
      const [newPart] = await db
        .insert(availableParts)
        .values(part)
        .returning();
      return newPart;
    } catch (error) {
      console.error('Greška pri kreiranju dostupnog dela:', error);
      throw error;
    }
  }

  async updateAvailablePart(id: number, part: Partial<AvailablePart>): Promise<AvailablePart | undefined> {
    try {
      const [updatedPart] = await db
        .update(availableParts)
        .set({...part, updatedAt: new Date()})
        .where(eq(availableParts.id, id))
        .returning();
      return updatedPart;
    } catch (error) {
      console.error('Greška pri ažuriranju dostupnog dela:', error);
      throw error;
    }
  }

  async deleteAvailablePart(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(availableParts)
        .where(eq(availableParts.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Greška pri brisanju dostupnog dela:', error);
      return false;
    }
  }

  async updateAvailablePartQuantity(id: number, quantityChange: number): Promise<AvailablePart | undefined> {
    try {
      const part = await this.getAvailablePart(id);
      if (!part) {
        throw new Error('Deo nije pronađen');
      }

      const newQuantity = part.quantity + quantityChange;
      if (newQuantity < 0) {
        throw new Error('Količina ne može biti negativna');
      }

      return await this.updateAvailablePart(id, { quantity: newQuantity });
    } catch (error) {
      console.error('Greška pri ažuriranju količine dela:', error);
      throw error;
    }
  }

  // System Settings methods
  async getSystemSettings(): Promise<SystemSetting[]> {
    try {
      return await db.select().from(systemSettings);
    } catch (error) {
      console.error('Greška pri dohvatanju sistemskih postavki:', error);
      return [];
    }
  }

  // Alias metoda za mobile SMS kompatibilnost
  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return this.getSystemSettings();
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    try {
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);
      return setting;
    } catch (error) {
      console.error('Greška pri dohvatanju sistemske postavke:', error);
      return undefined;
    }
  }

  async getSystemSettingsByCategory(category: string): Promise<SystemSetting[]> {
    try {
      return await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.category, category));
    } catch (error) {
      console.error('Greška pri dohvatanju sistemskih postavki po kategoriji:', error);
      return [];
    }
  }

  async createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    try {
      const [newSetting] = await db
        .insert(systemSettings)
        .values(setting)
        .returning();
      return newSetting;
    } catch (error) {
      console.error('Greška pri kreiranju sistemske postavke:', error);
      throw error;
    }
  }

  async updateSystemSetting(key: string, setting: Partial<SystemSetting>): Promise<SystemSetting | undefined> {
    try {
      // Uklanjamo undefined vrednosti iz setting objekta
      const cleanSetting = Object.fromEntries(
        Object.entries(setting).filter(([_, value]) => value !== undefined)
      );
      
      if (Object.keys(cleanSetting).length === 0) {
        console.error('Nema validnih podataka za ažuriranje');
        return undefined;
      }
      
      const [updatedSetting] = await db
        .update(systemSettings)
        .set(cleanSetting)
        .where(eq(systemSettings.key, key))
        .returning();
      return updatedSetting;
    } catch (error) {
      console.error('Greška pri ažuriranju sistemske postavke:', error);
      return undefined;
    }
  }

  async deleteSystemSetting(key: string): Promise<boolean> {
    try {
      const result = await db
        .delete(systemSettings)
        .where(eq(systemSettings.key, key))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Greška pri brisanju sistemske postavke:', error);
      return false;
    }
  }

  // Removed Parts methods

  // Parts Allocation methods
  async allocatePartToTechnician(allocation: InsertPartsAllocation): Promise<any> {
    try {
      // Check available part exists and has sufficient quantity
      const availablePart = await this.getAvailablePart(allocation.availablePartId);
      if (!availablePart) {
        throw new Error('Dostupni deo nije pronađen');
      }
      
      if (availablePart.quantity < allocation.allocatedQuantity) {
        throw new Error('Nedovoljna količina dostupnog dela');
      }

      // Create allocation record
      const [newAllocation] = await db
        .insert(partsAllocations)
        .values(allocation)
        .returning();

      // Update available part quantity
      await this.updateAvailablePartQuantity(allocation.availablePartId, -allocation.allocatedQuantity);

      // Log activity
      await this.logPartActivity({
        partId: allocation.availablePartId,
        action: 'allocated',
        previousQuantity: availablePart.quantity,
        newQuantity: availablePart.quantity - allocation.allocatedQuantity,
        technicianId: allocation.technicianId,
        serviceId: allocation.serviceId,
        userId: allocation.allocatedBy,
        description: `Deo dodeljen serviseru za servis #${allocation.serviceId}: ${allocation.allocatedQuantity} kom`
      });

      return newAllocation;
    } catch (error) {
      console.error('Greška pri dodeli dela serviseru:', error);
      throw error;
    }
  }

  async getPartAllocations(serviceId?: number, technicianId?: number): Promise<any[]> {
    try {
      let query = db
        .select({
          id: partsAllocations.id,
          availablePartId: partsAllocations.availablePartId,
          serviceId: partsAllocations.serviceId,
          technicianId: partsAllocations.technicianId,
          allocatedQuantity: partsAllocations.allocatedQuantity,
          allocatedBy: partsAllocations.allocatedBy,
          allocationNotes: partsAllocations.allocationNotes,
          status: partsAllocations.status,
          allocatedDate: partsAllocations.allocatedDate,
          partName: availableParts.partName,
          partNumber: availableParts.partNumber,
          technicianName: users.fullName,
          allocatedByName: users.fullName
        })
        .from(partsAllocations)
        .leftJoin(availableParts, eq(partsAllocations.availablePartId, availableParts.id))
        .leftJoin(users, eq(partsAllocations.technicianId, users.id));

      if (serviceId) {
        query = query.where(eq(partsAllocations.serviceId, serviceId));
      }
      if (technicianId) {
        query = query.where(eq(partsAllocations.technicianId, technicianId));
      }

      return await query.orderBy(desc(partsAllocations.allocatedDate));
    } catch (error) {
      console.error('Greška pri dohvatanju dodela delova:', error);
      return [];
    }
  }

  async getAllRemovedParts(): Promise<RemovedPart[]> {
    try {
      return await db.select().from(removedParts).orderBy(desc(removedParts.id));
    } catch (error) {
      console.error('Greška pri dohvatanju uklonjenih delova:', error);
      return [];
    }
  }

  async getRemovedPart(id: number): Promise<RemovedPart | undefined> {
    try {
      const [part] = await db
        .select()
        .from(removedParts)
        .where(eq(removedParts.id, id))
        .limit(1);
      return part;
    } catch (error) {
      console.error('Greška pri dohvatanju uklonjenog dela:', error);
      return undefined;
    }
  }

  async getRemovedPartsByService(serviceId: number): Promise<RemovedPart[]> {
    try {
      return await db
        .select()
        .from(removedParts)
        .where(eq(removedParts.serviceId, serviceId))
        .orderBy(desc(removedParts.id));
    } catch (error) {
      console.error('Greška pri dohvatanju uklonjenih delova za servis:', error);
      return [];
    }
  }

  async getRemovedPartsByTechnician(technicianId: number): Promise<RemovedPart[]> {
    try {
      return await db
        .select()
        .from(removedParts)
        .where(eq(removedParts.createdBy, technicianId))
        .orderBy(desc(removedParts.id));
    } catch (error) {
      console.error('Greška pri dohvatanju uklonjenih delova za servisera:', error);
      return [];
    }
  }

  async getRemovedPartsByStatus(status: string): Promise<RemovedPart[]> {
    try {
      return await db
        .select()
        .from(removedParts)
        .where(eq(removedParts.partStatus, status))
        .orderBy(desc(removedParts.id));
    } catch (error) {
      console.error('Greška pri dohvatanju uklonjenih delova po statusu:', error);
      return [];
    }
  }

  async createRemovedPart(part: InsertRemovedPart): Promise<RemovedPart> {
    try {
      const [newPart] = await db
        .insert(removedParts)
        .values(part)
        .returning();
      return newPart;
    } catch (error) {
      console.error('Greška pri kreiranju uklonjenog dela:', error);
      throw error;
    }
  }

  async updateRemovedPart(id: number, part: Partial<RemovedPart>): Promise<RemovedPart | undefined> {
    try {
      const [updatedPart] = await db
        .update(removedParts)
        .set(part)
        .where(eq(removedParts.id, id))
        .returning();
      return updatedPart;
    } catch (error) {
      console.error('Greška pri ažuriranju uklonjenog dela:', error);
      return undefined;
    }
  }

  async deleteRemovedPart(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(removedParts)
        .where(eq(removedParts.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Greška pri brisanju uklonjenog dela:', error);
      return false;
    }
  }

  async markPartAsReturned(id: number, returnDate: string, notes?: string): Promise<RemovedPart | undefined> {
    try {
      const updateData: Partial<RemovedPart> = {
        actualReturnDate: returnDate,
        partStatus: 'returned',
        isReinstalled: true,
      };
      
      if (notes) {
        updateData.technicianNotes = notes;
      }

      const [updatedPart] = await db
        .update(removedParts)
        .set(updateData)
        .where(eq(removedParts.id, id))
        .returning();
      return updatedPart;
    } catch (error) {
      console.error('Greška pri označavanju dela kao vraćenog:', error);
      return undefined;
    }
  }

  // Method for getting spare parts orders by service ID for business partner details
  async getSparePartsByService(serviceId: number): Promise<SparePartOrder[]> {
    try {
      const spareParts = await db
        .select()
        .from(sparePartOrders)
        .where(eq(sparePartOrders.serviceId, serviceId))
        .orderBy(desc(sparePartOrders.createdAt));
      return spareParts;
    } catch (error) {
      console.error('Greška pri dohvatanju rezervnih delova za servis:', error);
      return [];
    }
  }

  // Parts Activity Log methods
  async logPartActivity(data: InsertPartsActivityLog): Promise<PartsActivityLog> {
    try {
      const [activityLog] = await db
        .insert(partsActivityLog)
        .values(data)
        .returning();
      return activityLog;
    } catch (error) {
      console.error('Greška pri upisu aktivnosti rezervnog dela:', error);
      throw error;
    }
  }

  async getPartActivityLog(partId?: number, limit: number = 50): Promise<any[]> {
    try {
      let query = db
        .select({
          id: partsActivityLog.id,
          partId: partsActivityLog.partId,
          action: partsActivityLog.action,
          previousQuantity: partsActivityLog.previousQuantity,
          newQuantity: partsActivityLog.newQuantity,
          technicianId: partsActivityLog.technicianId,
          serviceId: partsActivityLog.serviceId,
          userId: partsActivityLog.userId,
          description: partsActivityLog.description,
          timestamp: partsActivityLog.timestamp,
          userName: users.fullName,
          partName: availableParts.partName,
        })
        .from(partsActivityLog)
        .leftJoin(users, eq(partsActivityLog.userId, users.id))
        .leftJoin(availableParts, eq(partsActivityLog.partId, availableParts.id))
        .orderBy(desc(partsActivityLog.timestamp));

      if (partId) {
        query = query.where(eq(partsActivityLog.partId, partId));
      }

      const activities = await query.limit(limit);
      return activities;
    } catch (error) {
      console.error('Greška pri dohvatanju log aktivnosti:', error);
      return [];
    }
  }

  // PartKeepr Catalog methods implementation
  async getAllSparePartsCatalog(): Promise<SparePartsCatalog[]> {
    try {
      const catalog = await db
        .select()
        .from(sparePartsCatalog)
        .orderBy(sparePartsCatalog.partName);
      return catalog;
    } catch (error) {
      console.error('Greška pri dohvatanju kataloga rezervnih delova:', error);
      return [];
    }
  }

  async getSparePartsCatalogByCategory(category: string): Promise<SparePartsCatalog[]> {
    try {
      const catalog = await db
        .select()
        .from(sparePartsCatalog)
        .where(eq(sparePartsCatalog.category, category))
        .orderBy(sparePartsCatalog.partName);
      return catalog;
    } catch (error) {
      console.error('Greška pri dohvatanju kataloga po kategoriji:', error);
      return [];
    }
  }

  async getSparePartsCatalogByManufacturer(manufacturer: string): Promise<SparePartsCatalog[]> {
    try {
      const catalog = await db
        .select()
        .from(sparePartsCatalog)
        .where(eq(sparePartsCatalog.manufacturer, manufacturer))
        .orderBy(sparePartsCatalog.partName);
      return catalog;
    } catch (error) {
      console.error('Greška pri dohvatanju kataloga po proizvođaču:', error);
      return [];
    }
  }

  async searchSparePartsCatalog(searchTerm: string): Promise<SparePartsCatalog[]> {
    try {
      const catalog = await db
        .select()
        .from(sparePartsCatalog)
        .where(
          or(
            like(sparePartsCatalog.partName, `%${searchTerm}%`),
            like(sparePartsCatalog.partNumber, `%${searchTerm}%`),
            like(sparePartsCatalog.description, `%${searchTerm}%`)
          )
        )
        .orderBy(sparePartsCatalog.partName)
        .limit(100);
      return catalog;
    } catch (error) {
      console.error('Greška pri pretrazi kataloga:', error);
      return [];
    }
  }

  async getSparePartsCatalogByPartNumber(partNumber: string): Promise<SparePartsCatalog | undefined> {
    try {
      const [part] = await db
        .select()
        .from(sparePartsCatalog)
        .where(eq(sparePartsCatalog.partNumber, partNumber));
      return part;
    } catch (error) {
      console.error('Greška pri dohvatanju dela po kataloškome broju:', error);
      return undefined;
    }
  }

  async getSparePartsCatalogByCompatibleModel(model: string): Promise<SparePartsCatalog[]> {
    try {
      const catalog = await db
        .select()
        .from(sparePartsCatalog)
        .where(sql`${sparePartsCatalog.compatibleModels} @> ARRAY[${model}]`)
        .orderBy(sparePartsCatalog.partName);
      return catalog;
    } catch (error) {
      console.error('Greška pri dohvatanju kompatibilnih delova:', error);
      return [];
    }
  }

  async createSparePartsCatalogEntry(entry: InsertSparePartsCatalog): Promise<SparePartsCatalog> {
    try {
      const [newEntry] = await db
        .insert(sparePartsCatalog)
        .values(entry)
        .returning();
      return newEntry;
    } catch (error) {
      console.error('Greška pri kreiranju katalog unosa:', error);
      throw error;
    }
  }

  async updateSparePartsCatalogEntry(id: number, entry: Partial<SparePartsCatalog>): Promise<SparePartsCatalog | undefined> {
    try {
      const [updatedEntry] = await db
        .update(sparePartsCatalog)
        .set({
          ...entry,
          lastUpdated: new Date()
        })
        .where(eq(sparePartsCatalog.id, id))
        .returning();
      return updatedEntry;
    } catch (error) {
      console.error('Greška pri ažuriranju katalog unosa:', error);
      return undefined;
    }
  }

  async deleteSparePartsCatalogEntry(id: number): Promise<boolean> {
    try {
      await db
        .delete(sparePartsCatalog)
        .where(eq(sparePartsCatalog.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju katalog unosa:', error);
      return false;
    }
  }

  async importSparePartsCatalogFromCSV(csvData: any[]): Promise<{ success: number; errors: string[] }> {
    const results = { success: 0, errors: [] as string[] };
    
    for (let i = 0; i < csvData.length; i++) {
      try {
        const row = csvData[i];
        const entry: InsertSparePartsCatalog = {
          partNumber: row.partNumber || row['Part Number'] || '',
          partName: row.partName || row['Part Name'] || '',
          description: row.description || row.Description || '',
          category: row.category || row.Category || 'universal',
          manufacturer: row.manufacturer || row.Manufacturer || 'Candy',
          compatibleModels: Array.isArray(row.compatibleModels) 
            ? row.compatibleModels 
            : (row.compatibleModels || row['Compatible Models'] || '').split(',').map((m: string) => m.trim()).filter(Boolean),
          priceEur: row.priceEur || row['Price EUR'] || '',
          priceGbp: row.priceGbp || row['Price GBP'] || '',
          supplierName: row.supplierName || row['Supplier Name'] || '',
          supplierUrl: row.supplierUrl || row['Supplier URL'] || '',
          imageUrls: Array.isArray(row.imageUrls) 
            ? row.imageUrls 
            : (row.imageUrls || row['Image URLs'] || '').split(',').map((url: string) => url.trim()).filter(Boolean),
          availability: row.availability || row.Availability || 'available',
          stockLevel: parseInt(row.stockLevel || row['Stock Level'] || '0') || 0,
          minStockLevel: parseInt(row.minStockLevel || row['Min Stock Level'] || '0') || 0,
          dimensions: row.dimensions || row.Dimensions || '',
          weight: row.weight || row.Weight || '',
          technicalSpecs: row.technicalSpecs || row['Technical Specs'] || '',
          installationNotes: row.installationNotes || row['Installation Notes'] || '',
          warrantyPeriod: row.warrantyPeriod || row['Warranty Period'] || '',
          isOemPart: row.isOemPart !== undefined ? Boolean(row.isOemPart) : true,
          alternativePartNumbers: Array.isArray(row.alternativePartNumbers) 
            ? row.alternativePartNumbers 
            : (row.alternativePartNumbers || row['Alternative Part Numbers'] || '').split(',').map((p: string) => p.trim()).filter(Boolean),
          sourceType: row.sourceType || row['Source Type'] || 'manual',
        };

        await this.createSparePartsCatalogEntry(entry);
        results.success++;
      } catch (error) {
        results.errors.push(`Red ${i + 1}: ${error instanceof Error ? error.message : 'Nepoznata greška'}`);
      }
    }

    return results;
  }

  async getSparePartsCatalogStats(): Promise<{ 
    totalParts: number; 
    availableParts: number;
    categoriesCount: number;
    manufacturersCount: number;
    byCategory: Record<string, number>; 
    byManufacturer: Record<string, number> 
  }> {
    try {
      // Total parts count
      const [totalResult] = await db
        .select({ count: count() })
        .from(sparePartsCatalog);
      
      // Available parts count
      const [availableResult] = await db
        .select({ count: count() })
        .from(sparePartsCatalog)
        .where(eq(sparePartsCatalog.availability, 'available'));
      
      // Count by category
      const categoryStats = await db
        .select({
          category: sparePartsCatalog.category,
          count: count()
        })
        .from(sparePartsCatalog)
        .groupBy(sparePartsCatalog.category);
      
      // Count by manufacturer
      const manufacturerStats = await db
        .select({
          manufacturer: sparePartsCatalog.manufacturer,
          count: count()
        })
        .from(sparePartsCatalog)
        .groupBy(sparePartsCatalog.manufacturer);

      const byCategory: Record<string, number> = {};
      categoryStats.forEach(stat => {
        byCategory[stat.category] = stat.count;
      });

      const byManufacturer: Record<string, number> = {};
      manufacturerStats.forEach(stat => {
        byManufacturer[stat.manufacturer] = stat.count;
      });

      return {
        totalParts: totalResult.count,
        availableParts: availableResult.count,
        categoriesCount: Object.keys(byCategory).length,
        manufacturersCount: Object.keys(byManufacturer).length,
        byCategory,
        byManufacturer
      };
    } catch (error) {
      console.error('Greška pri dohvatanju statistike kataloga:', error);
      return {
        totalParts: 0,
        availableParts: 0,
        categoriesCount: 0,
        manufacturersCount: 0,
        byCategory: {},
        byManufacturer: {}
      };
    }
  }

  // ===== WEB SCRAPING METHODS =====
  
  async createScrapingSource(source: any): Promise<any> {
    try {
      const [newSource] = await db
        .insert(webScrapingSources)
        .values(source)
        .returning();
      return newSource;
    } catch (error) {
      console.error('Greška pri kreiranju scraping izvora:', error);
      throw error;
    }
  }

  async getScrapingSources(): Promise<any[]> {
    try {
      const sources = await db
        .select({
          id: webScrapingSources.id,
          name: webScrapingSources.name,
          baseUrl: webScrapingSources.baseUrl,
          isActive: webScrapingSources.isActive,
          lastScrapeDate: webScrapingSources.lastScrapeDate,
          totalPartsScraped: webScrapingSources.totalPartsScraped,
          successfulScrapes: webScrapingSources.successfulScrapes,
          failedScrapes: webScrapingSources.failedScrapes,
          averageResponseTime: webScrapingSources.averageResponseTime,
          scrapingConfig: webScrapingSources.scrapingConfig,
          createdAt: webScrapingSources.createdAt,
          updatedAt: webScrapingSources.updatedAt
        })
        .from(webScrapingSources)
        .orderBy(webScrapingSources.name);
      return sources;
    } catch (error) {
      console.error('Greška pri dohvatanju scraping izvora:', error);
      return [];
    }
  }

  async updateScrapingSource(id: number, data: any): Promise<any> {
    try {
      const [updated] = await db
        .update(webScrapingSources)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(webScrapingSources.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Greška pri ažuriranju scraping izvora:', error);
      throw error;
    }
  }

  async createScrapingLog(log: any): Promise<any> {
    try {
      const [newLog] = await db
        .insert(webScrapingLogs)
        .values(log)
        .returning();
      return newLog;
    } catch (error) {
      console.error('Greška pri kreiranju scraping log-a:', error);
      throw error;
    }
  }

  async getScrapingLogs(sourceId?: number): Promise<any[]> {
    try {
      let query = db
        .select({
          id: webScrapingLogs.id,
          sourceId: webScrapingLogs.sourceId,
          status: webScrapingLogs.status,
          startTime: webScrapingLogs.startTime,
          endTime: webScrapingLogs.endTime,
          totalPages: webScrapingLogs.totalPages,
          processedPages: webScrapingLogs.processedPages,
          newParts: webScrapingLogs.newParts,
          updatedParts: webScrapingLogs.updatedParts,
          errors: webScrapingLogs.errors,
          duration: webScrapingLogs.duration,
          createdBy: webScrapingLogs.createdBy,
          createdAt: webScrapingLogs.createdAt
        })
        .from(webScrapingLogs)
        .orderBy(desc(webScrapingLogs.createdAt))
        .limit(100);
      
      if (sourceId) {
        query = query.where(eq(webScrapingLogs.sourceId, sourceId));
      }
      
      const logs = await query;
      return logs;
    } catch (error) {
      console.error('Greška pri dohvatanju scraping logova:', error);
      return [];
    }
  }

  async createScrapingQueueItem(item: any): Promise<any> {
    try {
      const [newItem] = await db
        .insert(webScrapingQueue)
        .values(item)
        .returning();
      return newItem;
    } catch (error) {
      console.error('Greška pri kreiranju scraping queue item-a:', error);
      throw error;
    }
  }

  async getScrapingQueue(): Promise<any[]> {
    try {
      const queue = await db
        .select()
        .from(webScrapingQueue)
        .orderBy(desc(webScrapingQueue.priority), webScrapingQueue.scheduledTime);
      return queue;
    } catch (error) {
      console.error('Greška pri dohvatanju scraping queue:', error);
      return [];
    }
  }

  async updateScrapingQueueItem(id: number, data: any): Promise<any> {
    try {
      const [updated] = await db
        .update(webScrapingQueue)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(webScrapingQueue.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Greška pri ažuriranju scraping queue item-a:', error);
      throw error;
    }
  }

  async updateScrapingLog(id: number, data: any): Promise<any> {
    try {
      const [updated] = await db
        .update(webScrapingLogs)
        .set(data)
        .where(eq(webScrapingLogs.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Greška pri ažuriranju scraping log-a:', error);
      throw error;
    }
  }

  // Alias metode za web scraping service kompatibilnost
  async getSparePartsCatalog(): Promise<SparePartsCatalog[]> {
    return this.getAllSparePartsCatalog();
  }

  async updateSparePartsCatalog(id: number, updates: Partial<SparePartsCatalog>): Promise<SparePartsCatalog | undefined> {
    return this.updateSparePartsCatalogEntry(id, updates);
  }

  async createSparePartsCatalog(part: InsertSparePartsCatalog): Promise<SparePartsCatalog> {
    return this.createSparePartsCatalogEntry(part);
  }

  // Service completion reports methods
  async createServiceCompletionReport(data: InsertServiceCompletionReport): Promise<ServiceCompletionReport> {
    try {
      const reportData = {
        ...data,
        technicianId: data.technicianId || await this.getTechnicianIdFromService(data.serviceId),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const [result] = await db.insert(serviceCompletionReports)
        .values(reportData)
        .returning();
      return result;
    } catch (error) {
      console.error('Greška pri kreiranju izveštaja o završetku servisa:', error);
      throw error;
    }
  }

  async getServiceCompletionReport(serviceId: number): Promise<ServiceCompletionReport | null> {
    try {
      const [result] = await db.select()
        .from(serviceCompletionReports)
        .where(eq(serviceCompletionReports.serviceId, serviceId))
        .limit(1);
      return result || null;
    } catch (error) {
      console.error('Greška pri dohvatanju izveštaja o završetku servisa:', error);
      return null;
    }
  }

  async getServiceCompletionReportById(id: number): Promise<ServiceCompletionReport | null> {
    try {
      const [result] = await db.select()
        .from(serviceCompletionReports)
        .where(eq(serviceCompletionReports.id, id))
        .limit(1);
      return result || null;
    } catch (error) {
      console.error('Greška pri dohvatanju izveštaja po ID-u:', error);
      return null;
    }
  }

  async updateServiceCompletionReport(id: number, data: Partial<ServiceCompletionReport>): Promise<ServiceCompletionReport | null> {
    try {
      const [result] = await db.update(serviceCompletionReports)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(serviceCompletionReports.id, id))
        .returning();
      return result || null;
    } catch (error) {
      console.error('Greška pri ažuriranju izveštaja o završetku servisa:', error);
      return null;
    }
  }

  async getCompletionReportsByTechnician(technicianId: number): Promise<ServiceCompletionReport[]> {
    try {
      return await db.select()
        .from(serviceCompletionReports)
        .where(eq(serviceCompletionReports.technicianId, technicianId))
        .orderBy(desc(serviceCompletionReports.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju izveštaja za servisera:', error);
      return [];
    }
  }

  async getAllServiceCompletionReports(): Promise<ServiceCompletionReport[]> {
    try {
      return await db.select()
        .from(serviceCompletionReports)
        .orderBy(desc(serviceCompletionReports.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju svih izveštaja o završetku servisa:', error);
      return [];
    }
  }

  private async getTechnicianIdFromService(serviceId: number): Promise<number> {
    const service = await this.getService(serviceId);
    if (!service?.technicianId) {
      throw new Error('Servis nema dodeljenog servisera');
    }
    return service.technicianId;
  }
}

// Koristimo PostgreSQL implementaciju umesto MemStorage
export const storage = new DatabaseStorage();
