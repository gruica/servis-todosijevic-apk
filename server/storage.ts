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
  // Tabele za pristup bazi
  users, technicians, clients, applianceCategories, manufacturers, 
  appliances, services, maintenanceSchedules, maintenanceAlerts
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

// Define extended storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Technician methods
  getAllTechnicians(): Promise<Technician[]>;
  getTechnician(id: number): Promise<Technician | undefined>;
  createTechnician(technician: InsertTechnician): Promise<Technician>;
  updateTechnician(id: number, technician: InsertTechnician): Promise<Technician | undefined>;
  
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
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: InsertClient): Promise<Client | undefined>;
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
  getAppliancesByClient(clientId: number): Promise<Appliance[]>;
  createAppliance(appliance: InsertAppliance): Promise<Appliance>;
  updateAppliance(id: number, appliance: InsertAppliance): Promise<Appliance | undefined>;
  getApplianceStats(): Promise<{categoryId: number, count: number}[]>;
  
  // Service methods
  getAllServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByClient(clientId: number): Promise<Service[]>;
  getServicesByStatus(status: ServiceStatus): Promise<Service[]>;
  getServicesByTechnician(technicianId: number): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: InsertService): Promise<Service | undefined>;
  getRecentServices(limit: number): Promise<Service[]>;
  
  // Session store
  sessionStore: any; // Express session store
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
    // We need to hash the password manually since this is the initial seeding
    const hashedPassword = await this.hashPassword("admin123.admin123");
    
    const id = this.userId++;
    const user: User = { 
      id, 
      role: "admin", 
      username: "admin@example.com", 
      fullName: "Jelena Todosijević", 
      password: hashedPassword,
      technicianId: null
    };
    
    this.users.set(id, user);
    console.log("Admin user created:", user.username);
    
    // Create a test technician user
    this.createUser({
      username: "serviser@example.com",
      password: "serviser123",
      fullName: "Jovan Todosijević",
      role: "technician",
      technicianId: 1 // First technician
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    
    // If role is not provided, set default role
    const role = insertUser.role || (id === 1 ? "admin" : "user");
    
    // If the password isn't already hashed (contains no .), hash it
    let password = insertUser.password;
    if (!password.includes('.')) {
      password = await this.hashPassword(password);
    }
    
    const user: User = { 
      ...insertUser, 
      password, 
      id, 
      role,
      technicianId: insertUser.technicianId !== undefined ? insertUser.technicianId : null
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

  async updateClient(id: number, insertClient: InsertClient): Promise<Client | undefined> {
    const existingClient = this.clients.get(id);
    if (!existingClient) return undefined;
    
    const updatedClient: Client = { 
      id,
      fullName: insertClient.fullName,
      phone: insertClient.phone,
      email: insertClient.email || null,
      address: insertClient.address || null,
      city: insertClient.city || null
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
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

  async updateAppliance(id: number, insertAppliance: InsertAppliance): Promise<Appliance | undefined> {
    const existingAppliance = this.appliances.get(id);
    if (!existingAppliance) return undefined;
    
    const updatedAppliance: Appliance = { 
      id,
      clientId: insertAppliance.clientId,
      categoryId: insertAppliance.categoryId,
      manufacturerId: insertAppliance.manufacturerId,
      model: insertAppliance.model || null,
      serialNumber: insertAppliance.serialNumber || null,
      purchaseDate: insertAppliance.purchaseDate || null,
      notes: insertAppliance.notes || null
    };
    this.appliances.set(id, updatedAppliance);
    return updatedAppliance;
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

  async getServicesByStatus(status: ServiceStatus): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.status === status,
    );
  }

  async createService(insertService: InsertService): Promise<Service> {
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
      cost: insertService.cost || null
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
      cost: insertService.cost || null
    };
    this.services.set(id, updatedService);
    return updatedService;
  }
  
  async getServicesByTechnician(technicianId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.technicianId === technicianId,
    );
  }
  
  async getRecentServices(limit: number): Promise<Service[]> {
    return Array.from(this.services.values())
      .slice(-limit)
      .reverse();
  }
  
  // Additional user management methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
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
}

// DatabaseStorage implementacija
export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    // Koristi PostgreSQL za session store
    this.sessionStore = new PostgresSessionStore({
      conObject: { connectionString: process.env.DATABASE_URL },
      createTableIfMissing: true
    });
    
    // Inicijalno podešavanje baze
    this.initializeDatabaseIfEmpty();
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

  async createUser(insertUser: InsertUser): Promise<User> {
    // Proveri da li je lozinka već validno heširana (ima format 'hash.salt')
    let password = insertUser.password;
    const parts = password.split('.');
    if (parts.length !== 2 || parts[0].length < 32 || parts[1].length < 16) {
      // Ako nije u ispravnom formatu, heširati je
      password = await this.hashPassword(password);
    }

    const [user] = await db.insert(users).values({
      ...insertUser,
      password
    }).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
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

  // Client methods
  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: number, data: InsertClient): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set(data)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
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

  async getAppliancesByClient(clientId: number): Promise<Appliance[]> {
    return await db.select().from(appliances).where(eq(appliances.clientId, clientId));
  }

  async createAppliance(data: InsertAppliance): Promise<Appliance> {
    const [appliance] = await db.insert(appliances).values(data).returning();
    return appliance;
  }

  async updateAppliance(id: number, data: InsertAppliance): Promise<Appliance | undefined> {
    const [updatedAppliance] = await db
      .update(appliances)
      .set(data)
      .where(eq(appliances.id, id))
      .returning();
    return updatedAppliance;
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
  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async getServicesByClient(clientId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.clientId, clientId));
  }

  async getServicesByStatus(status: ServiceStatus): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.status, status));
  }

  async getServicesByTechnician(technicianId: number): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .where(eq(services.technicianId, technicianId));
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
    return await db
      .select()
      .from(services)
      .orderBy(desc(services.createdAt))
      .limit(limit);
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
}

// Koristimo PostgreSQL implementaciju umesto MemStorage
export const storage = new DatabaseStorage();
