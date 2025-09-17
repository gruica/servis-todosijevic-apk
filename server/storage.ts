import { 
  User, InsertUser, 
  Client, InsertClient, 
  ApplianceCategory, InsertApplianceCategory,
  Manufacturer, InsertManufacturer,
  Appliance, InsertAppliance,
  Service, InsertService,
  ServiceStatus,
  ServicePhoto, InsertServicePhoto,
  Technician, InsertTechnician,
  /* MaintenanceSchedule, InsertMaintenanceSchedule,
  MaintenanceAlert, InsertMaintenanceAlert, */
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
  Supplier, InsertSupplier,
  SupplierOrder, InsertSupplierOrder,
  SupplierOrderEvent, InsertSupplierOrderEvent,
  PartsCatalog, InsertPartsCatalog,
  // AI Prediktivno održavanje
  /* MaintenancePatterns, InsertMaintenancePatterns,
  PredictiveInsights, InsertPredictiveInsights,
  AiAnalysisResults, InsertAiAnalysisResults, */
  // Tabele za pristup bazi
  users, technicians, clients, applianceCategories, manufacturers, 
  appliances, services, /* maintenanceSchedules, maintenanceAlerts, */
  requestTracking, botVerification, emailVerification, sparePartOrders,
  availableParts, partsActivityLog, notifications, systemSettings, removedParts, partsAllocations,
  sparePartsCatalog, PartsAllocation, InsertPartsAllocation,
  webScrapingSources, webScrapingLogs, webScrapingQueue, serviceCompletionReports,
  suppliers, supplierOrders, supplierOrderEvents, partsCatalog,
  // AI Prediktivno održavanje tabele
  /* maintenancePatterns, predictiveInsights, aiAnalysisResults, */
  // Fotografije servisa
  servicePhotos,
  // Conversation messages
  ConversationMessage, InsertConversationMessage, conversationMessages,
  // Sigurnosni sistem protiv brisanja servisa
  ServiceAuditLog, InsertServiceAuditLog, serviceAuditLogs,
  UserPermission, InsertUserPermission, userPermissions
  // DeletedService, InsertDeletedService, deletedServices
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import { db, sql as sqlClient } from "./db";
import { eq, and, desc, gte, lte, ne, isNull, like, ilike, count, sum, or, inArray, sql } from "drizzle-orm";

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
  
  // Service Photo methods
  getServicePhotos(serviceId: number): Promise<ServicePhoto[]>;
  getServicePhoto(id: number): Promise<ServicePhoto | null>;
  createServicePhoto(photo: InsertServicePhoto): Promise<ServicePhoto>;
  updateServicePhoto(id: number, photo: Partial<ServicePhoto>): Promise<ServicePhoto | undefined>;
  deleteServicePhoto(id: number): Promise<void>;
  getServicePhotosByCategory(serviceId: number, category: string): Promise<ServicePhoto[]>;
  // Storage analysis methods
  getTotalServicePhotosCount(): Promise<number>;
  getServicePhotosCount(): Promise<number>; // Alias za storage optimizaciju
  getServicePhotosCountByCategory(): Promise<Array<{category: string, count: number}>>;
  
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
  getAllRequestsSparePartOrders(): Promise<SparePartOrder[]>; // Kombinuje 'pending' i 'requested'
  createSparePartOrder(order: InsertSparePartOrder): Promise<SparePartOrder>;
  updateSparePartOrder(id: number, order: Partial<SparePartOrder>): Promise<SparePartOrder | undefined>;
  updateSparePartOrderStatus(id: number, updates: Partial<SparePartOrder>): Promise<SparePartOrder | undefined>;
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

  // Supplier methods
  getAllSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  getSupplierByEmail(email: string): Promise<Supplier | undefined>;
  getActiveSuppliers(): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;

  // Supplier Order methods
  getAllSupplierOrders(): Promise<SupplierOrder[]>;
  getSupplierOrder(id: number): Promise<SupplierOrder | undefined>;
  getSupplierOrderWithDetails(id: number): Promise<any>;
  getSupplierOrdersBySupplier(supplierId: number): Promise<SupplierOrder[]>;
  getSupplierOrdersBySparePartOrder(sparePartOrderId: number): Promise<SupplierOrder[]>;
  getActiveSupplierOrders(): Promise<SupplierOrder[]>;
  getPendingSupplierOrdersCount(): Promise<number>;
  createSupplierOrder(order: InsertSupplierOrder): Promise<SupplierOrder>;
  updateSupplierOrder(id: number, order: Partial<SupplierOrder>): Promise<SupplierOrder | undefined>;
  deleteSupplierOrder(id: number): Promise<boolean>;

  // Parts Catalog methods
  getAllPartsFromCatalog(): Promise<PartsCatalog[]>;
  getPartFromCatalog(id: number): Promise<PartsCatalog | undefined>;
  searchPartsInCatalog(searchTerm: string, category?: string, manufacturerId?: number): Promise<PartsCatalog[]>;
  getPartsCatalogByCategory(category: string): Promise<PartsCatalog[]>;
  getPartsCatalogByManufacturer(manufacturerId: number): Promise<PartsCatalog[]>;
  createPartInCatalog(part: InsertPartsCatalog): Promise<PartsCatalog>;
  updatePartInCatalog(id: number, part: Partial<PartsCatalog>): Promise<PartsCatalog | undefined>;
  deletePartFromCatalog(id: number): Promise<boolean>;
  getPartsCatalogStats(): Promise<{
    totalParts: number;
    availableParts: number;
    outOfStockParts: number;
    categoriesCount: Record<string, number>;
  }>;
  bulkInsertPartsToCatalog(parts: InsertPartsCatalog[]): Promise<number>;

  // AI Prediktivno održavanje metode
  getAllMaintenancePatterns(): Promise<MaintenancePatterns[]>;
  getMaintenancePattern(id: number): Promise<MaintenancePatterns | undefined>;
  getMaintenancePatternsByCategory(categoryId: number): Promise<MaintenancePatterns[]>;
  getMaintenancePatternsByManufacturer(manufacturerId: number): Promise<MaintenancePatterns[]>;
  createMaintenancePattern(pattern: InsertMaintenancePatterns): Promise<MaintenancePatterns>;
  updateMaintenancePattern(id: number, pattern: Partial<MaintenancePatterns>): Promise<MaintenancePatterns | undefined>;
  deleteMaintenancePattern(id: number): Promise<boolean>;
  
  getAllPredictiveInsights(): Promise<PredictiveInsights[]>;
  getPredictiveInsight(id: number): Promise<PredictiveInsights | undefined>;
  getPredictiveInsightsByAppliance(applianceId: number): Promise<PredictiveInsights[]>;
  getPredictiveInsightsByClient(clientId: number): Promise<PredictiveInsights[]>;
  getActivePredictiveInsights(): Promise<PredictiveInsights[]>;
  getCriticalRiskInsights(): Promise<PredictiveInsights[]>;
  createPredictiveInsight(insight: InsertPredictiveInsights): Promise<PredictiveInsights>;
  updatePredictiveInsight(id: number, insight: Partial<PredictiveInsights>): Promise<PredictiveInsights | undefined>;
  deletePredictiveInsight(id: number): Promise<boolean>;
  
  getAllAiAnalysisResults(): Promise<AiAnalysisResults[]>;
  getAiAnalysisResult(id: number): Promise<AiAnalysisResults | undefined>;
  getAiAnalysisResultsByAppliance(applianceId: number): Promise<AiAnalysisResults[]>;
  getAiAnalysisResultsByType(analysisType: string): Promise<AiAnalysisResults[]>;
  getSuccessfulAiAnalysisResults(): Promise<AiAnalysisResults[]>;
  createAiAnalysisResult(result: InsertAiAnalysisResults): Promise<AiAnalysisResults>;
  updateAiAnalysisResult(id: number, result: Partial<AiAnalysisResults>): Promise<AiAnalysisResults | undefined>;
  deleteAiAnalysisResult(id: number): Promise<boolean>;

  // Conversation messages methods
  getConversationMessages(serviceId: number): Promise<ConversationMessage[]>;
  createConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage>;
  updateConversationMessageStatus(id: number, status: string): Promise<ConversationMessage | undefined>;
  getServiceConversationHistory(serviceId: number): Promise<ConversationMessage[]>;
  
  // Sigurnosni sistem protiv brisanja servisa - nove funkcije
  createServiceAuditLog(log: InsertServiceAuditLog): Promise<ServiceAuditLog | undefined>;
  getServiceAuditLogs(serviceId: number): Promise<ServiceAuditLog[]>;
  getAllAuditLogs(limit?: number): Promise<ServiceAuditLog[]>;
  createUserPermission(permission: InsertUserPermission): Promise<UserPermission | undefined>;
  getUserPermissions(userId: number): Promise<UserPermission | undefined>;
  updateUserPermissions(userId: number, updates: Partial<InsertUserPermission>): Promise<UserPermission | undefined>;
  canUserDeleteServices(userId: number): Promise<boolean>;
  softDeleteService(serviceId: number, deletedBy: number, deletedByUsername: string, deletedByRole: string, reason?: string, ipAddress?: string, userAgent?: string): Promise<boolean>;
  // restoreDeletedService(serviceId: number, restoredBy: number, restoredByUsername: string, restoredByRole: string): Promise<boolean>;
  // getDeletedServices(): Promise<DeletedService[]>;
  // getDeletedService(serviceId: number): Promise<DeletedService | undefined>;
  
  // Missing methods for routes compatibility
  getCategory(id: number): Promise<ApplianceCategory | undefined>;
  setSystemSetting(key: string, value: string): Promise<SystemSetting | undefined>;
  getBusinessPartner(id: number): Promise<User | undefined>;

  // Supplier Portal methods (Task 2)
  getSuppliersByPartnerType(partnerType: 'complus' | 'beko'): Promise<Supplier[]>;
  createSupplierPortalUser(userData: InsertUser, supplierId: number): Promise<User>;
  getSupplierPortalUsers(supplierId: number): Promise<User[]>;
  
  // Supplier Order Event methods
  createSupplierOrderEvent(event: InsertSupplierOrderEvent): Promise<SupplierOrderEvent>;
  getSupplierOrderEvents(orderId: number): Promise<SupplierOrderEvent[]>;
}

// @ts-ignore - MemStorage class is not used in production, only for testing
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
      email: "admin@frigosistemtodosijevic.com",
      phone: null,
      address: null,
      city: null,
      companyName: null,
      companyId: null,
      isVerified: true,
      registeredAt: new Date(),
      verifiedAt: new Date(),
      verifiedBy: null
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
      verifiedAt: now,
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
      registeredAt: now,
      verifiedAt: isVerified ? now : null,
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
    // @ts-ignore - MemStorage stub implementation for testing only
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
    
    // @ts-ignore - MemStorage stub implementation for testing only
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
    // @ts-ignore - MemStorage stub implementation for testing only
    const mockTracking: RequestTracking = {
      id: 1,
      userId: tracking.userId,
      requestType: tracking.requestType,
      ipAddress: tracking.ipAddress,
      userAgent: tracking.userAgent || null,
      requestDate: tracking.requestDate || new Date(),
      successful: tracking.successful || false
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
      // Hotfix: Add missing columns and tables idempotently
      console.log("Applying database schema hotfixes...");
      await sqlClient(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS supplier_id integer;
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS partner_type text;
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS portal_enabled boolean DEFAULT false;
        CREATE TABLE IF NOT EXISTS supplier_order_events (
          id serial PRIMARY KEY,
          order_id integer NOT NULL,
          event_type text NOT NULL,
          event_description text NOT NULL,
          performed_by integer NOT NULL,
          performed_by_role text NOT NULL,
          created_at timestamp DEFAULT NOW()
        );
      `);
      console.log("Database schema hotfixes applied successfully");

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
      // Continue with initialization even if schema changes fail
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
        // Add missing service fields
        clientUnavailableReason: services.clientUnavailableReason,
        needsRescheduling: services.needsRescheduling,
        reschedulingNotes: services.reschedulingNotes,
        devicePickedUp: services.devicePickedUp,
        pickupDate: services.pickupDate,
        pickupNotes: services.pickupNotes,
        customerRefusesRepair: services.customerRefusesRepair,
        customerRefusalReason: services.customerRefusalReason,
        repairFailed: services.repairFailed,
        repairFailureReason: services.repairFailureReason,
        replacedPartsBeforeFailure: services.replacedPartsBeforeFailure,
        repairFailureDate: services.repairFailureDate,
        isWarrantyService: services.isWarrantyService,
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
      
      // Apply limit and get result
      const result = await (limit && limit > 0 ? query.limit(limit) : query);
      
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
        const transformed = { ...service };
        
        // Handle potential field name transformations if needed
        if (!transformed.createdAt && 'created_at' in transformed) {
          transformed.createdAt = (transformed as any).created_at;
          delete (transformed as any).created_at;
        }
        
        if (!transformed.completedDate && 'completed_date' in transformed) {
          transformed.completedDate = (transformed as any).completed_date;
          delete (transformed as any).completed_date;
        }
        
        return transformed;
      });
      
      // Map to proper Service[] format with client and appliance data
      return transformedResult.map(service => ({
        id: service.id,
        clientId: service.clientId,
        applianceId: service.applianceId,
        technicianId: service.technicianId,
        description: service.description,
        status: service.status,
        warrantyStatus: service.warrantyStatus,
        createdAt: service.createdAt,
        scheduledDate: service.scheduledDate,
        completedDate: service.completedDate,
        technicianNotes: service.technicianNotes,
        cost: service.cost,
        usedParts: service.usedParts,
        machineNotes: service.machineNotes,
        isCompletelyFixed: service.isCompletelyFixed,
        businessPartnerId: service.businessPartnerId,
        partnerCompanyName: service.partnerCompanyName,
        // FIXED: Add client data for frontend display
        clientName: service.clientName,
        clientCity: service.clientCity,
        clientAddress: service.clientAddress,
        clientPhone: service.clientPhone,
        clientEmail: service.clientEmail,
        // FIXED: Add appliance data for frontend display
        applianceName: service.applianceName,
        applianceSerialNumber: service.applianceSerialNumber,
        // FIXED: Add category and manufacturer data
        categoryName: service.categoryName,
        manufacturerName: service.manufacturerName,
        // FIXED: Add technician data
        technicianName: service.technicianName,
        clientUnavailableReason: service.clientUnavailableReason || null,
        needsRescheduling: service.needsRescheduling || false,
        reschedulingNotes: service.reschedulingNotes || null,
        devicePickedUp: service.devicePickedUp || false,
        pickupDate: service.pickupDate || null,
        pickupNotes: service.pickupNotes || null,
        customerRefusesRepair: service.customerRefusesRepair || false,
        customerRefusalReason: service.customerRefusalReason || null,
        repairFailed: service.repairFailed || false,
        repairFailureReason: service.repairFailureReason || null,
        replacedPartsBeforeFailure: service.replacedPartsBeforeFailure || null,
        repairFailureDate: service.repairFailureDate || null,
        isWarrantyService: service.isWarrantyService || false
      } as Service));
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
        category: row.appliance_categories,
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
    
    // Apply limit and return
    return await (limit && limit > 0 ? query.limit(limit) : query);
  }

  async getServicesByStatusDetailed(status: ServiceStatus): Promise<Service[]> {
    try {
      console.log(`getServicesByStatusDetailed called with status: ${status}`);
      
      const result = await db.select()
        .from(services)
        .where(eq(services.status, status))
        .orderBy(desc(services.createdAt));
      
      return result;
    } catch (error) {
      console.error(`Greška pri dohvatanju servisa po statusu ${status}:`, error);
      throw error;
    }
  }

  async getServicesByTechnician(technicianId: number, limit?: number): Promise<Service[]> {
    try {
      console.log(`Dohvatam servise za tehničara ${technicianId}`);
      
      // SELECT with LEFT JOINs to include client and appliance data
      let query = db.select({
        // Service base columns
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
        cost: services.cost,
        technicianNotes: services.technicianNotes,
        businessPartnerId: services.businessPartnerId,
        // Flat client fields expected by mobile UI
        clientName: clients.fullName,
        clientPhone: clients.phone,
        clientAddress: clients.address,
        clientCity: clients.city,
        clientEmail: clients.email,
        // Appliance enrichment
        applianceName: appliances.model,
        applianceSerialNumber: appliances.serialNumber,
        categoryName: applianceCategories.name,
        manufacturerName: manufacturers.name,
      })
        .from(services)
        .leftJoin(clients, eq(services.clientId, clients.id))
        .leftJoin(appliances, eq(services.applianceId, appliances.id))
        .leftJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
        .leftJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .where(eq(services.technicianId, technicianId))
        .orderBy(desc(services.createdAt));
        
      // Apply limit and get result
      const result = await (limit && limit > 0 ? query.limit(limit) : query);
      console.log(`Pronađeno ${result.length} servisa za tehničara ${technicianId}`);
      
      return result as Service[];
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
        
      // Apply limit and get results
      const results = await (limit && limit > 0 ? query.limit(limit) : query);
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
    })) as Service[];
  }
  
  // Business Partner methods
  async getServicesByPartner(partnerId: number): Promise<Service[]> {
    const startTime = Date.now();
    
    try {
      // OPTIMIZED: Single JOIN query umesto N+1
      const rawServices = await db
        .select({
          // Service podaci
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
          isCompletelyFixed: services.isCompletelyFixed,
          businessPartnerId: services.businessPartnerId,
          partnerCompanyName: services.partnerCompanyName,
          // Client podaci
          clientFullName: clients.fullName,
          clientEmail: clients.email,
          clientPhone: clients.phone,
          clientAddress: clients.address,
          clientCity: clients.city,
          // Appliance podaci
          applianceModel: appliances.model,
          applianceSerialNumber: appliances.serialNumber,
          applianceCategoryId: appliances.categoryId,
          applianceManufacturerId: appliances.manufacturerId,
          // Category podaci
          categoryName: applianceCategories.name,
          categoryIcon: applianceCategories.icon,
          // Manufacturer podaci
          manufacturerName: manufacturers.name,
          // Technician podaci
          technicianFullName: technicians.fullName,
          technicianSpecialization: technicians.specialization
        })
        .from(services)
        .leftJoin(clients, eq(services.clientId, clients.id))
        .leftJoin(appliances, eq(services.applianceId, appliances.id))
        .leftJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
        .leftJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .leftJoin(technicians, eq(services.technicianId, technicians.id))
        .where(eq(services.businessPartnerId, partnerId))
        .orderBy(desc(services.createdAt))
        .limit(50);

      // Transformišemo podatke u odgovarajući format
      const servicesWithDetails = rawServices.map(row => ({
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
        isCompletelyFixed: row.isCompletelyFixed,
        businessPartnerId: row.businessPartnerId,
        partnerCompanyName: row.partnerCompanyName,
        // Nested client object
        client: row.clientFullName ? {
          id: row.clientId,
          fullName: row.clientFullName,
          email: row.clientEmail,
          phone: row.clientPhone,
          address: row.clientAddress,
          city: row.clientCity,
          companyName: null
        } : null,
        // Nested appliance object
        appliance: row.applianceModel ? {
          model: row.applianceModel,
          serialNumber: row.applianceSerialNumber,
          categoryId: row.applianceCategoryId,
          manufacturerId: row.applianceManufacturerId
        } : null,
        // Nested category object
        category: row.categoryName ? {
          name: row.categoryName,
          icon: row.categoryIcon
        } : null,
        // Nested manufacturer object
        manufacturer: row.manufacturerName ? {
          name: row.manufacturerName
        } : null,
        // Nested technician object
        technician: row.technicianFullName ? {
          fullName: row.technicianFullName,
          specialization: row.technicianSpecialization
        } : null
      }));

      const responseTime = Date.now() - startTime;
      console.log(`[PERFORMANCE] getServicesByPartner(${partnerId}): ${responseTime}ms for ${servicesWithDetails.length} services`);

      return servicesWithDetails;
    } catch (error) {
      console.error('Greška pri dobijanju servisa za poslovnog partnera:', error);
      return [];
    }
  }

  // DEPRECATED: Stara implementacija sa N+1 problemom - uklonjeno za performance

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

  // Maintenance Schedule methods - Hotfix: Handle undefined references
  async getAllMaintenanceSchedules(): Promise<any[]> {
    try {
      // Check if maintenanceSchedules is defined before using it
      if (typeof maintenanceSchedules === 'undefined') {
        console.warn("Maintenance schedules table not available");
        return [];
      }
      return await db.select().from(maintenanceSchedules);
    } catch (error) {
      console.warn("Maintenance schedules not available:", error.message);
      return [];
    }
  }

  async getMaintenanceSchedule(id: number): Promise<any | undefined> {
    try {
      if (typeof maintenanceSchedules === 'undefined') {
        console.warn("Maintenance schedules table not available");
        return undefined;
      }
      const [schedule] = await db
        .select()
        .from(maintenanceSchedules)
        .where(eq(maintenanceSchedules.id, id));
      return schedule;
    } catch (error) {
      console.warn("Maintenance schedules not available:", error.message);
      return undefined;
    }
  }

  async getMaintenanceSchedulesByAppliance(applianceId: number): Promise<any[]> {
    try {
      if (typeof maintenanceSchedules === 'undefined') {
        console.warn("Maintenance schedules table not available");
        return [];
      }
      return await db
        .select()
        .from(maintenanceSchedules)
        .where(eq(maintenanceSchedules.applianceId, applianceId));
    } catch (error) {
      console.warn("Maintenance schedules not available:", error.message);
      return [];
    }
  }

  async createMaintenanceSchedule(data: any): Promise<any> {
    try {
      if (typeof maintenanceSchedules === 'undefined') {
        throw new Error("Maintenance schedules are not available in this version");
      }
      const [schedule] = await db.insert(maintenanceSchedules).values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      return schedule;
    } catch (error) {
      console.error("Cannot create maintenance schedule:", error.message);
      throw new Error("Maintenance schedules are not available in this version");
    }
  }

  async updateMaintenanceSchedule(id: number, data: any): Promise<any | undefined> {
    try {
      if (typeof maintenanceSchedules === 'undefined') {
        console.warn("Maintenance schedules table not available");
        return undefined;
      }
      const [updatedSchedule] = await db
        .update(maintenanceSchedules)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(maintenanceSchedules.id, id))
        .returning();
      return updatedSchedule;
    } catch (error) {
      console.warn("Cannot update maintenance schedule:", error.message);
      return undefined;
    }
  }

  async deleteMaintenanceSchedule(id: number): Promise<boolean> {
    try {
      if (typeof maintenanceSchedules === 'undefined') {
        console.warn("Maintenance schedules table not available");
        return false;
      }
      const result = await db.delete(maintenanceSchedules).where(eq(maintenanceSchedules.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Greška pri brisanju rasporeda održavanja:", error);
      return false;
    }
  }

  async getUpcomingMaintenanceSchedules(daysThreshold: number): Promise<any[]> {
    try {
      if (typeof maintenanceSchedules === 'undefined') {
        console.warn("Maintenance schedules table not available");
        return [];
      }
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
    } catch (error) {
      console.warn("Cannot get upcoming maintenance schedules:", error.message);
      return [];
    }
  }

  // Maintenance Alert methods - Hotfix: Handle undefined references
  async getAllMaintenanceAlerts(): Promise<any[]> {
    try {
      if (typeof maintenanceAlerts === 'undefined') {
        console.warn("Maintenance alerts table not available");
        return [];
      }
      return await db.select().from(maintenanceAlerts);
    } catch (error) {
      console.warn("Maintenance alerts not available:", error.message);
      return [];
    }
  }

  async getMaintenanceAlert(id: number): Promise<any | undefined> {
    try {
      if (typeof maintenanceAlerts === 'undefined') {
        console.warn("Maintenance alerts table not available");
        return undefined;
      }
      const [alert] = await db
        .select()
        .from(maintenanceAlerts)
        .where(eq(maintenanceAlerts.id, id));
      return alert;
    } catch (error) {
      console.warn("Maintenance alerts not available:", error.message);
      return undefined;
    }
  }

  async getMaintenanceAlertsBySchedule(scheduleId: number): Promise<any[]> {
    try {
      if (typeof maintenanceAlerts === 'undefined') {
        console.warn("Maintenance alerts table not available");
        return [];
      }
      return await db
        .select()
        .from(maintenanceAlerts)
        .where(eq(maintenanceAlerts.scheduleId, scheduleId));
    } catch (error) {
      console.warn("Maintenance alerts not available:", error.message);
      return [];
    }
  }

  async createMaintenanceAlert(data: any): Promise<any> {
    try {
      if (typeof maintenanceAlerts === 'undefined') {
        throw new Error("Maintenance alerts are not available in this version");
      }
      const [alert] = await db.insert(maintenanceAlerts).values({
        ...data,
        createdAt: new Date()
      }).returning();
      return alert;
    } catch (error) {
      console.error("Cannot create maintenance alert:", error.message);
      throw new Error("Maintenance alerts are not available in this version");
    }
  }

  async updateMaintenanceAlert(id: number, data: any): Promise<any | undefined> {
    try {
      if (typeof maintenanceAlerts === 'undefined') {
        console.warn("Maintenance alerts table not available");
        return undefined;
      }
      const [updatedAlert] = await db
        .update(maintenanceAlerts)
        .set(data)
        .where(eq(maintenanceAlerts.id, id))
        .returning();
      return updatedAlert;
    } catch (error) {
      console.warn("Cannot update maintenance alert:", error.message);
      return undefined;
    }
  }

  async deleteMaintenanceAlert(id: number): Promise<boolean> {
    try {
      if (typeof maintenanceAlerts === 'undefined') {
        console.warn("Maintenance alerts table not available");
        return false;
      }
      const result = await db.delete(maintenanceAlerts).where(eq(maintenanceAlerts.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Greška pri brisanju alarma:", error);
      return false;
    }
  }

  async getUnreadMaintenanceAlerts(): Promise<any[]> {
    try {
      if (typeof maintenanceAlerts === 'undefined') {
        console.warn("Maintenance alerts table not available");
        return [];
      }
      return await db
        .select()
        .from(maintenanceAlerts)
        .where(eq(maintenanceAlerts.isRead, false));
    } catch (error) {
      console.warn("Cannot get unread maintenance alerts:", error.message);
      return [];
    }
  }

  async markMaintenanceAlertAsRead(id: number): Promise<any | undefined> {
    try {
      if (typeof maintenanceAlerts === 'undefined') {
        console.warn("Maintenance alerts table not available");
        return undefined;
      }
      const [updatedAlert] = await db
        .update(maintenanceAlerts)
        .set({ isRead: true })
        .where(eq(maintenanceAlerts.id, id))
        .returning();
      return updatedAlert;
    } catch (error) {
      console.warn("Cannot mark maintenance alert as read:", error.message);
      return undefined;
    }
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
          isWarrantyService: service.isWarrantyService,
          devicePickedUp: service.devicePickedUp || false,
          pickupDate: service.pickupDate,
          pickupNotes: service.pickupNotes,
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
          ...updates
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
          status: 'assigned'
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
  // NOVI OPTIMIZOVANI WORKFLOW STORAGE METODE
  async getTechnicianSparePartRequests(technicianId: number): Promise<SparePartOrder[]> {
    const orders = await db.select().from(sparePartOrders).where(eq(sparePartOrders.technicianId, technicianId)).orderBy(desc(sparePartOrders.createdAt));
    return orders;
  }

  async getSparePartsByStatus(status: string): Promise<SparePartOrder[]> {
    const orders = await db.select().from(sparePartOrders).where(eq(sparePartOrders.status, status)).orderBy(desc(sparePartOrders.createdAt));
    return orders;
  }


  async getAllSparePartOrders(): Promise<any[]> {
    try {
      // RAW SQL pristup da zaobiđe Drizzle ORM greške - KOMPLETNI SELECT SA SVIM POLJIMA
      const orders = await sqlClient(`
        SELECT id, part_name, part_number, quantity, status, urgency, 
               created_at, updated_at, supplier_name, estimated_cost, 
               actual_cost, admin_notes, description,
               service_id AS "serviceId", technician_id AS "technicianId",
               'technician' as requester_type,
               technician_id as requester_user_id,
               'Serviser' as requester_name
        FROM spare_part_orders 
        ORDER BY created_at DESC
      `);

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
                  name: technician.fullName || 'Nepoznat',
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
            // Mapuj snake_case iz baze u camelCase za frontend
            id: order.id,
            partName: order.part_name,
            partNumber: order.part_number,
            quantity: order.quantity,
            status: order.status,
            urgency: order.urgency,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            supplierName: order.supplier_name,
            estimatedCost: order.estimated_cost,
            actualCost: order.actual_cost,
            adminNotes: order.admin_notes,
            description: order.description,
            serviceId: order.serviceId,
            technicianId: order.technicianId,
            requesterType: order.requester_type,
            requesterUserId: order.requester_user_id,
            requesterName: order.requester_name,
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
        .select({
          id: sparePartOrders.id,
          serviceId: sparePartOrders.serviceId,
          technicianId: sparePartOrders.technicianId,
          applianceId: sparePartOrders.applianceId,
          partName: sparePartOrders.partName,
          partNumber: sparePartOrders.partNumber,
          quantity: sparePartOrders.quantity,
          description: sparePartOrders.description,
          urgency: sparePartOrders.urgency,
          status: sparePartOrders.status,
          estimatedCost: sparePartOrders.estimatedCost,
          actualCost: sparePartOrders.actualCost,
          supplierName: sparePartOrders.supplierName,
          orderDate: sparePartOrders.orderDate,
          expectedDelivery: sparePartOrders.expectedDelivery,
          receivedDate: sparePartOrders.receivedDate,
          adminNotes: sparePartOrders.adminNotes,
          createdAt: sparePartOrders.createdAt,
          updatedAt: sparePartOrders.updatedAt
        })
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

  async getSparePartOrdersByStatus(status: SparePartStatus): Promise<any[]> {
    try {
      // RAW SQL pristup sa postojećim kolonama - dodeli default vrednosti za requester polja
      const result = await sqlClient(`
        SELECT id, part_name, part_number, quantity, status, urgency, created_at, updated_at, 
               supplier_name, estimated_cost, actual_cost, admin_notes, description,
               service_id, technician_id,
               'technician' as requester_type,
               technician_id as requester_user_id,
               'Serviser' as requester_name
        FROM spare_part_orders 
        WHERE status = $1
        ORDER BY created_at DESC
      `, [status]);
      
      // Mapuj snake_case iz baze u camelCase za frontend
      return result.map(row => ({
        id: row.id,
        partName: row.part_name,
        partNumber: row.part_number,
        quantity: row.quantity,
        status: row.status,
        urgency: row.urgency,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        supplierName: row.supplier_name,
        estimatedCost: row.estimated_cost,
        actualCost: row.actual_cost,
        adminNotes: row.admin_notes,
        description: row.description,
        serviceId: row.service_id,
        technicianId: row.technician_id,
        requesterType: row.requester_type,
        requesterUserId: row.requester_user_id,
        requesterName: row.requester_name
      }));
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina po statusu:', error);
      throw error;
    }
  }

  async getPendingSparePartOrders(): Promise<SparePartOrder[]> {
    try {
      // Jednostavan pristup - koristi samo postojeće kolone, dodeli default vrednosti za requester
      const result = await sqlClient(`
        SELECT id, part_name, part_number, quantity, status, urgency, created_at, updated_at,
               supplier_name, estimated_cost, actual_cost, admin_notes, description,
               service_id, technician_id,
               'technician' as requester_type,
               technician_id as requester_user_id,
               'Serviser' as requester_name
        FROM spare_part_orders 
        WHERE status = 'pending'
        ORDER BY created_at DESC
      `);
      
      // Mapuj snake_case iz baze u camelCase za frontend
      return result.map(row => ({
        id: row.id,
        partName: row.part_name,
        partNumber: row.part_number,
        quantity: row.quantity,
        status: row.status,
        urgency: row.urgency,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        supplierName: row.supplier_name,
        estimatedCost: row.estimated_cost,
        actualCost: row.actual_cost,
        adminNotes: row.admin_notes,
        description: row.description,
        serviceId: row.service_id,
        technicianId: row.technician_id,
        requesterType: row.requester_type,
        requesterUserId: row.requester_user_id,
        requesterName: row.requester_name
      }));
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina na čekanju:', error);
      throw error;
    }
  }

  async getAllRequestsSparePartOrders(): Promise<SparePartOrder[]> {
    try {
      // Dohvati sve zahteve: i "pending" i "requested" statuse
      const orders = await sqlClient(`
        SELECT id, part_name, part_number, quantity, status, urgency, created_at, updated_at,
               supplier_name, estimated_cost, actual_cost, admin_notes, description,
               service_id AS "serviceId", technician_id AS "technicianId",
               'technician' as requester_type,
               technician_id as requester_user_id,
               'Serviser' as requester_name
        FROM spare_part_orders 
        WHERE status IN ('pending', 'requested')
        ORDER BY created_at DESC
      `);
      
      console.log(`📋 [ALL-REQUESTS] Pronađeno ${orders.length} zahteva (pending + requested)`);

      // Zatim dodaj povezane podatke za svaki order (ista logika kao getAllSparePartOrders)
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
                  name: technician.fullName || 'Nepoznat',
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
            // Mapuj snake_case iz baze u camelCase za frontend
            id: order.id,
            partName: order.part_name,
            partNumber: order.part_number,
            quantity: order.quantity,
            status: order.status,
            urgency: order.urgency,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            supplierName: order.supplier_name,
            estimatedCost: order.estimated_cost,
            actualCost: order.actual_cost,
            adminNotes: order.admin_notes,
            description: order.description,
            serviceId: order.serviceId,
            technicianId: order.technicianId,
            requesterType: order.requester_type,
            requesterUserId: order.requester_user_id,
            requesterName: order.requester_name,
            service: serviceData,
            technician: technicianData
          };
        })
      );

      return enrichedOrders;
    } catch (error) {
      console.error('❌ [ALL-REQUESTS] Greška pri dohvatanju svih zahteva:', error);
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

  async updateSparePartOrderStatus(id: number, updates: Partial<SparePartOrder>): Promise<SparePartOrder | undefined> {
    try {
      // Dodaj updatedAt timestamp
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      const [updatedOrder] = await db
        .update(sparePartOrders)
        .set(updateData)
        .where(eq(sparePartOrders.id, id))
        .returning();
      
      if (!updatedOrder) {
        console.warn(`❌ [WORKFLOW] Rezervni deo sa ID ${id} nije pronađen za ažuriranje`);
        return undefined;
      }

      console.log(`📦 [WORKFLOW] Uspešno ažuriran rezervni deo ID: ${id}, novi status: ${updates.status}`);
      return updatedOrder;
    } catch (error) {
      console.error('❌ [WORKFLOW] Greška pri ažuriranju statusa rezervnog dela:', error);
      throw error;
    }
  }

  async deleteSparePartOrder(id: number): Promise<boolean> {
    try {
      // First delete any related notifications using RAW SQL to avoid schema issues
      await sqlClient('DELETE FROM notifications WHERE related_spare_part_id = $1', [id]);
      
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
        serviceDescription: null as string | null,
        warrantyStatus: null as string | null
      };

      if (order.serviceId) {
        try {
          const service = await this.getService(order.serviceId);
          if (service) {
            serviceInfo.serviceId = service.id;
            serviceInfo.serviceDescription = service.description;
            serviceInfo.warrantyStatus = service.warrantyStatus;

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
        partNumber: order.partNumber || undefined,
        quantity: order.quantity,
        description: order.description || undefined,
        supplierName: order.supplierName || undefined,
        unitCost: receivedData.actualCost || order.estimatedCost || null,
        location: receivedData.location || 'Glavno skladište',
        warrantyStatus: (serviceInfo.warrantyStatus || "van garancije") as "u garanciji" | "van garancije",
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
        allocatedQuantity: quantity,
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

      const conditions = [];
      if (serviceId) {
        conditions.push(eq(partsAllocations.serviceId, serviceId));
      }
      if (technicianId) {
        conditions.push(eq(partsAllocations.technicianId, technicianId));
      }
      const finalQuery = conditions.length > 0 
        ? query.where(conditions.length === 1 ? conditions[0] : and(...conditions))
        : query;

      return await finalQuery.orderBy(desc(partsAllocations.allocatedDate));
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

  // SERVICE PHOTOS - Novi metodi za rad sa fotografijama
  async getServicePhotos(serviceId: number): Promise<ServicePhoto[]> {
    console.log(`📸 DatabaseStorage: dohvatanje fotografija za servis ${serviceId}`);
    
    try {
      const photos = await db
        .select()
        .from(servicePhotos)
        .where(eq(servicePhotos.serviceId, serviceId))
        .orderBy(desc(servicePhotos.uploadedAt));
      
      // MAPIRANJE BACKEND → FRONTEND
      const mappedPhotos = photos.map(photo => ({
        ...photo,
        photoUrl: photo.photoPath, // KLJUČNO MAPIRANJE za frontend
        photoCategory: photo.category
      }));
      
      console.log(`📸 Pronađeno ${photos.length} fotografija za servis ${serviceId}`);
      return mappedPhotos;
    } catch (error) {
      console.error('❌ Greška pri dohvatanju fotografija servisa:', error);
      throw new Error('Neuspešno dohvatanje fotografija servisa');
    }
  }

  async getServicePhoto(id: number): Promise<ServicePhoto | null> {
    console.log(`📸 DatabaseStorage: dohvatanje fotografije sa ID ${id}`);
    
    try {
      const [photo] = await db
        .select()
        .from(servicePhotos)
        .where(eq(servicePhotos.id, id))
        .limit(1);
      
      if (!photo) {
        console.log(`📸 Fotografija sa ID ${id} nije pronađena`);
        return null;
      }
      
      // MAPIRANJE BACKEND → FRONTEND
      const mappedPhoto = {
        ...photo,
        photoUrl: photo.photoPath, // KLJUČNO MAPIRANJE za frontend
        photoCategory: photo.category
      };
      
      console.log(`📸 Pronađena fotografija sa ID ${id} za servis ${photo.serviceId}`);
      return mappedPhoto;
    } catch (error) {
      console.error('❌ Greška pri dohvatanju fotografije:', error);
      throw new Error('Neuspešno dohvatanje fotografije');
    }
  }

  async createServicePhoto(photo: InsertServicePhoto): Promise<ServicePhoto> {
    console.log(`📸 DatabaseStorage: kreiranje nove fotografije za servis ${photo.serviceId}`);
    
    try {
      const [newPhoto] = await db
        .insert(servicePhotos)
        .values(photo)
        .returning();
      
      console.log(`✅ Fotografija uspešno kreirana sa ID ${newPhoto.id}`);
      return newPhoto;
    } catch (error) {
      console.error('❌ Greška pri kreiranju fotografije servisa:', error);
      throw new Error('Neuspešno kreiranje fotografije servisa');
    }
  }

  async updateServicePhoto(id: number, photo: Partial<ServicePhoto>): Promise<ServicePhoto | undefined> {
    console.log(`📸 DatabaseStorage: ažuriranje fotografije ${id}`);
    
    try {
      const [updatedPhoto] = await db
        .update(servicePhotos)
        .set(photo)
        .where(eq(servicePhotos.id, id))
        .returning();
      
      console.log(`✅ Fotografija ${id} uspešno ažurirana`);
      return updatedPhoto;
    } catch (error) {
      console.error('❌ Greška pri ažuriranju fotografije servisa:', error);
      throw new Error('Neuspešno ažuriranje fotografije servisa');
    }
  }

  async deleteServicePhoto(id: number): Promise<void> {
    console.log(`📸 DatabaseStorage: brisanje fotografije ${id}`);
    
    try {
      await db
        .delete(servicePhotos)
        .where(eq(servicePhotos.id, id));
      
      console.log(`✅ Fotografija ${id} uspešno obrisana`);
    } catch (error) {
      console.error('❌ Greška pri brisanju fotografije servisa:', error);
      throw new Error('Neuspešno brisanje fotografije servisa');
    }
  }

  async getServicePhotosByCategory(serviceId: number, category: string): Promise<ServicePhoto[]> {
    console.log(`📸 DatabaseStorage: dohvatanje fotografija za servis ${serviceId}, kategorija ${category}`);
    
    try {
      const photos = await db
        .select()
        .from(servicePhotos)
        .where(
          and(
            eq(servicePhotos.serviceId, serviceId),
            eq(servicePhotos.category, category)
          )
        )
        .orderBy(desc(servicePhotos.uploadedAt));
      
      console.log(`📸 Pronađeno ${photos.length} fotografija kategorije "${category}" za servis ${serviceId}`);
      return photos;
    } catch (error) {
      console.error('❌ Greška pri dohvatanju fotografija servisa po kategoriji:', error);
      throw new Error('Neuspešno dohvatanje fotografija servisa po kategoriji');
    }
  }

  // Metoda za dohvatanje svih fotografija određene kategorije (globalno)
  async getAllServicePhotosByCategory(category: string): Promise<ServicePhoto[]> {
    console.log(`📸 DatabaseStorage: dohvatanje svih fotografija kategorije "${category}"`);
    
    try {
      const photos = await db
        .select()
        .from(servicePhotos)
        .where(eq(servicePhotos.category, category))
        .orderBy(desc(servicePhotos.uploadedAt));
      
      console.log(`📸 Pronađeno ${photos.length} fotografija kategorije "${category}"`);
      return photos;
    } catch (error) {
      console.error('❌ Greška pri dohvatanju fotografija po kategoriji:', error);
      throw new Error('Neuspešno dohvatanje fotografija po kategoriji');
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

  // Storage analysis methods implementation
  async getTotalServicePhotosCount(): Promise<number> {
    console.log('📊 DatabaseStorage: izračunavanje ukupnog broja fotografija');
    
    try {
      const result = await db
        .select({ count: count() })
        .from(servicePhotos);
      
      const totalCount = result[0]?.count || 0;
      console.log(`📊 Ukupno fotografija u bazi: ${totalCount}`);
      return totalCount;
    } catch (error) {
      console.error('❌ Greška pri računanju ukupnog broja fotografija:', error);
      return 0;
    }
  }

  // Alias metoda za storage optimizaciju
  async getServicePhotosCount(): Promise<number> {
    return await this.getTotalServicePhotosCount();
  }

  async getServicePhotosCountByCategory(): Promise<Array<{category: string, count: number}>> {
    console.log('📊 DatabaseStorage: izračunavanje broja fotografija po kategorijama');
    
    try {
      const result = await db
        .select({
          category: servicePhotos.category,
          count: count()
        })
        .from(servicePhotos)
        .groupBy(servicePhotos.category);
      
      const categoryStats = result
        .filter(row => row.category !== null)
        .map(row => ({
          category: row.category as string,
          count: row.count
        }));
      
      console.log('📊 Statistike po kategorijama:', categoryStats);
      return categoryStats;
    } catch (error) {
      console.error('❌ Greška pri računanju fotografija po kategorijama:', error);
      return [];
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

      const finalQuery = partId 
        ? query.where(eq(partsActivityLog.partId, partId))
        : query;

      const activities = await finalQuery.limit(limit);
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
      
      const finalQuery = sourceId 
        ? query.where(eq(webScrapingLogs.sourceId, sourceId))
        : query;
      
      const logs = await finalQuery;
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
        technicianId: await this.getTechnicianIdFromService(data.serviceId),
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

  async getServiceCompletionReport(serviceId: number): Promise<ServiceCompletionReport | undefined> {
    try {
      const [result] = await db.select()
        .from(serviceCompletionReports)
        .where(eq(serviceCompletionReports.serviceId, serviceId))
        .limit(1);
      return result || undefined;
    } catch (error) {
      console.error('Greška pri dohvatanju izveštaja o završetku servisa:', error);
      return undefined;
    }
  }

  async getServiceCompletionReportById(id: number): Promise<ServiceCompletionReport | undefined> {
    try {
      const [result] = await db.select()
        .from(serviceCompletionReports)
        .where(eq(serviceCompletionReports.id, id))
        .limit(1);
      return result || undefined;
    } catch (error) {
      console.error('Greška pri dohvatanju izveštaja po ID-u:', error);
      return undefined;
    }
  }

  async updateServiceCompletionReport(id: number, data: Partial<ServiceCompletionReport>): Promise<ServiceCompletionReport | undefined> {
    try {
      const [result] = await db.update(serviceCompletionReports)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(serviceCompletionReports.id, id))
        .returning();
      return result || undefined;
    } catch (error) {
      console.error('Greška pri ažuriranju izveštaja o završetku servisa:', error);
      return undefined;
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

  // ===== SUPPLIER METHODS =====
  
  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      return await db.select().from(suppliers).orderBy(suppliers.name);
    } catch (error) {
      console.error('Greška pri dohvatanju dobavljača:', error);
      return [];
    }
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    try {
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
      return supplier;
    } catch (error) {
      console.error('Greška pri dohvatanju dobavljača:', error);
      return undefined;
    }
  }

  async getSupplierByEmail(email: string): Promise<Supplier | undefined> {
    try {
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.email, email));
      return supplier;
    } catch (error) {
      console.error('Greška pri dohvatanju dobavljača po email-u:', error);
      return undefined;
    }
  }

  async getActiveSuppliers(): Promise<Supplier[]> {
    try {
      return await db.select()
        .from(suppliers)
        .where(eq(suppliers.isActive, true))
        .orderBy(desc(suppliers.priority), suppliers.name);
    } catch (error) {
      console.error('Greška pri dohvatanju aktivnih dobavljača:', error);
      return [];
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    try {
      const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
      return newSupplier;
    } catch (error) {
      console.error('Greška pri kreiranju dobavljača:', error);
      throw error;
    }
  }

  async updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier | undefined> {
    try {
      const [updatedSupplier] = await db.update(suppliers)
        .set({ ...supplier, updatedAt: new Date() })
        .where(eq(suppliers.id, id))
        .returning();
      return updatedSupplier;
    } catch (error) {
      console.error('Greška pri ažuriranju dobavljača:', error);
      return undefined;
    }
  }

  async deleteSupplier(id: number): Promise<boolean> {
    try {
      await db.delete(suppliers).where(eq(suppliers.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju dobavljača:', error);
      return false;
    }
  }

  // ===== SUPPLIER ORDER METHODS =====

  async getAllSupplierOrders(): Promise<SupplierOrder[]> {
    try {
      return await db.select().from(supplierOrders).orderBy(desc(supplierOrders.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina dobavljača:', error);
      return [];
    }
  }

  async getSupplierOrder(id: number): Promise<SupplierOrder | undefined> {
    try {
      const [order] = await db.select().from(supplierOrders).where(eq(supplierOrders.id, id));
      return order;
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbine dobavljača:', error);
      return undefined;
    }
  }

  async getSupplierOrderWithDetails(id: number): Promise<any> {
    try {
      // Get the supplier order with joined data
      const [order] = await db.select({
        // Supplier order fields
        id: supplierOrders.id,
        supplierId: supplierOrders.supplierId,
        sparePartOrderId: supplierOrders.sparePartOrderId,
        orderNumber: supplierOrders.orderNumber,
        status: supplierOrders.status,
        trackingNumber: supplierOrders.trackingNumber,
        totalCost: supplierOrders.totalCost,
        currency: supplierOrders.currency,
        estimatedDelivery: supplierOrders.estimatedDelivery,
        emailContent: supplierOrders.emailContent,
        supplierResponse: supplierOrders.supplierResponse,
        createdAt: supplierOrders.createdAt,
        updatedAt: supplierOrders.updatedAt,
        // Supplier details
        supplierName: suppliers.name,
        supplierCompanyName: suppliers.companyName,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
        supplierPartnerType: suppliers.partnerType,
        // Spare part order details
        sparePartOrderPartName: sparePartOrders.partName,
        sparePartOrderPartNumber: sparePartOrders.partNumber,
        sparePartOrderQuantity: sparePartOrders.quantity,
        sparePartOrderDescription: sparePartOrders.description,
        sparePartOrderUrgency: sparePartOrders.urgency,
        sparePartOrderServiceId: sparePartOrders.serviceId,
        // Client details from services
        clientName: clients.fullName,
        clientPhone: clients.phone,
        clientAddress: clients.address,
        // Appliance details
        applianceModel: appliances.model,
        applianceManufacturer: manufacturers.name
      })
      .from(supplierOrders)
      .leftJoin(suppliers, eq(supplierOrders.supplierId, suppliers.id))
      .leftJoin(sparePartOrders, eq(supplierOrders.sparePartOrderId, sparePartOrders.id))
      .leftJoin(services, eq(sparePartOrders.serviceId, services.id))
      .leftJoin(clients, eq(services.clientId, clients.id))
      .leftJoin(appliances, eq(services.applianceId, appliances.id))
      .leftJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
      .where(eq(supplierOrders.id, id));

      if (!order) {
        return undefined;
      }

      // Transform the flat result into a nested structure
      return {
        id: order.id,
        supplierId: order.supplierId,
        sparePartOrderId: order.sparePartOrderId,
        orderNumber: order.orderNumber,
        status: order.status,
        trackingNumber: order.trackingNumber,
        totalCost: order.totalCost,
        currency: order.currency,
        estimatedDelivery: order.estimatedDelivery,
        emailContent: order.emailContent,
        supplierResponse: order.supplierResponse,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        supplier: order.supplierName ? {
          id: order.supplierId,
          name: order.supplierName,
          companyName: order.supplierCompanyName,
          email: order.supplierEmail,
          phone: order.supplierPhone,
          partnerType: order.supplierPartnerType
        } : undefined,
        sparePartOrder: order.sparePartOrderPartName ? {
          id: order.sparePartOrderId,
          partName: order.sparePartOrderPartName,
          partNumber: order.sparePartOrderPartNumber,
          quantity: order.sparePartOrderQuantity,
          description: order.sparePartOrderDescription,
          urgency: order.sparePartOrderUrgency,
          serviceId: order.sparePartOrderServiceId,
          applianceModel: order.applianceModel,
          applianceManufacturer: order.applianceManufacturer,
          clientName: order.clientName,
          clientPhone: order.clientPhone,
          address: order.clientAddress
        } : undefined
      };
    } catch (error) {
      console.error('Greška pri dohvatanju detaljnih podataka porudžbine dobavljača:', error);
      return undefined;
    }
  }

  async getSupplierOrdersBySupplier(supplierId: number): Promise<SupplierOrder[]> {
    try {
      return await db.select()
        .from(supplierOrders)
        .where(eq(supplierOrders.supplierId, supplierId))
        .orderBy(desc(supplierOrders.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina za dobavljača:', error);
      return [];
    }
  }

  async getSupplierOrdersBySparePartOrder(sparePartOrderId: number): Promise<SupplierOrder[]> {
    try {
      return await db.select()
        .from(supplierOrders)
        .where(eq(supplierOrders.sparePartOrderId, sparePartOrderId))
        .orderBy(desc(supplierOrders.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina za rezervni deo:', error);
      return [];
    }
  }

  async getActiveSupplierOrders(): Promise<SupplierOrder[]> {
    try {
      return await db.select()
        .from(supplierOrders)
        .where(or(
          eq(supplierOrders.status, 'pending'),
          eq(supplierOrders.status, 'sent'),
          eq(supplierOrders.status, 'confirmed'),
          eq(supplierOrders.status, 'shipped')
        ))
        .orderBy(desc(supplierOrders.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju aktivnih porudžbina:', error);
      return [];
    }
  }

  async getPendingSupplierOrdersCount(): Promise<number> {
    try {
      const [result] = await db.select({ count: count() })
        .from(supplierOrders)
        .where(eq(supplierOrders.status, 'pending'));
      return result.count;
    } catch (error) {
      console.error('Greška pri brojanju porudžbina na čekanju:', error);
      return 0;
    }
  }

  async createSupplierOrder(order: InsertSupplierOrder): Promise<SupplierOrder> {
    try {
      const [newOrder] = await db.insert(supplierOrders).values(order).returning();
      return newOrder;
    } catch (error) {
      console.error('Greška pri kreiranju porudžbine dobavljača:', error);
      throw error;
    }
  }

  async updateSupplierOrder(id: number, order: Partial<SupplierOrder>): Promise<SupplierOrder | undefined> {
    try {
      const [updatedOrder] = await db.update(supplierOrders)
        .set({ ...order, updatedAt: new Date() })
        .where(eq(supplierOrders.id, id))
        .returning();
      return updatedOrder;
    } catch (error) {
      console.error('Greška pri ažuriranju porudžbine dobavljača:', error);
      return undefined;
    }
  }

  async deleteSupplierOrder(id: number): Promise<boolean> {
    try {
      await db.delete(supplierOrders).where(eq(supplierOrders.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju porudžbine dobavljača:', error);
      return false;
    }
  }

  // ===== SUPPLIER PORTAL METHODS =====

  async getSuppliersByPartnerType(partnerType: 'complus' | 'beko'): Promise<Supplier[]> {
    try {
      return await db.select()
        .from(suppliers)
        .where(and(
          eq(suppliers.partnerType, partnerType),
          eq(suppliers.isActive, true),
          eq(suppliers.portalEnabled, true)
        ))
        .orderBy(desc(suppliers.priority), suppliers.name);
    } catch (error) {
      console.error('Greška pri dohvatanju dobavljača po tipu partnera:', error);
      return [];
    }
  }

  async createSupplierPortalUser(userData: InsertUser, supplierId: number): Promise<User> {
    try {
      // CRITICAL FIX 1: Validate supplier exists and has portalEnabled=true
      const [supplier] = await db.select()
        .from(suppliers)
        .where(and(
          eq(suppliers.id, supplierId),
          eq(suppliers.isActive, true),
          eq(suppliers.portalEnabled, true)
        ));
      
      if (!supplier) {
        throw new Error(`Supplier with ID ${supplierId} not found or portal not enabled`);
      }

      // CRITICAL FIX 2: Hash password properly using scrypt (SECURITY BUG FIX)
      let hashedPassword = userData.password;
      const parts = hashedPassword.split('.');
      if (parts.length !== 2 || parts[0].length < 32 || parts[1].length < 16) {
        // Password is not properly hashed, hash it using scrypt
        hashedPassword = await this.hashPassword(userData.password);
      }

      // CRITICAL FIX 3: Assign correct role based on supplier's partnerType (FUNCTIONAL BUG FIX)
      let role: string;
      switch (supplier.partnerType?.toLowerCase()) {
        case 'complus':
          role = 'supplier_complus';
          break;
        case 'beko':
          role = 'supplier_beko';
          break;
        default:
          // Fallback to complus if partnerType is not set or invalid
          role = 'supplier_complus';
      }

      // Set supplier-specific data with properly hashed password and correct role
      const supplierUserData: InsertUser = {
        ...userData,
        password: hashedPassword, // Use hashed password
        supplierId: supplierId,
        role: role, // Use role based on supplier's partnerType
        isVerified: true // Supplier users are pre-verified
      };

      // Create the user with secure data
      const [newUser] = await db.insert(users).values(supplierUserData).returning();
      
      console.log(`🔐 [SECURITY] Created supplier portal user with role '${role}' for supplier '${supplier.name}' (${supplier.partnerType})`);
      return newUser;
    } catch (error) {
      console.error('Greška pri kreiranju korisnika supplier portala:', error);
      throw error;
    }
  }

  async getSupplierPortalUsers(supplierId: number): Promise<User[]> {
    try {
      return await db.select()
        .from(users)
        .where(and(
          eq(users.supplierId, supplierId),
          or(
            eq(users.role, 'supplier_complus'),
            eq(users.role, 'supplier_beko')
          )
        ))
        .orderBy(users.fullName);
    } catch (error) {
      console.error('Greška pri dohvatanju korisnika supplier portala:', error);
      return [];
    }
  }

  async createSupplierOrderEvent(event: InsertSupplierOrderEvent): Promise<SupplierOrderEvent> {
    try {
      const [newEvent] = await db.insert(supplierOrderEvents).values(event).returning();
      return newEvent;
    } catch (error) {
      console.error('Greška pri kreiranju supplier order event-a:', error);
      throw error;
    }
  }

  async getSupplierOrderEvents(orderId: number): Promise<SupplierOrderEvent[]> {
    try {
      return await db.select()
        .from(supplierOrderEvents)
        .where(eq(supplierOrderEvents.supplierOrderId, orderId))
        .orderBy(desc(supplierOrderEvents.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju supplier order events:', error);
      return [];
    }
  }

  // ===== PARTS CATALOG METHODS =====

  async getAllPartsFromCatalog(): Promise<PartsCatalog[]> {
    try {
      return await db.select()
        .from(partsCatalog)
        .where(eq(partsCatalog.isActive, true))
        .orderBy(desc(partsCatalog.lastUpdated));
    } catch (error) {
      console.error('Greška pri dohvatanju kataloga delova:', error);
      return [];
    }
  }

  async getPartFromCatalog(id: number): Promise<PartsCatalog | undefined> {
    try {
      const [part] = await db.select()
        .from(partsCatalog)
        .where(eq(partsCatalog.id, id))
        .limit(1);
      return part;
    } catch (error) {
      console.error('Greška pri dohvatanju dela iz kataloga:', error);
      return undefined;
    }
  }

  async getPartFromCatalogByPartNumber(partNumber: string): Promise<PartsCatalog | undefined> {
    try {
      const [part] = await db.select()
        .from(partsCatalog)
        .where(eq(partsCatalog.partNumber, partNumber))
        .limit(1);
      return part;
    } catch (error) {
      console.error('Greška pri dohvatanju dela po broju:', error);
      return undefined;
    }
  }

  async searchPartsInCatalog(query: string, category?: string, manufacturerId?: number): Promise<PartsCatalog[]> {
    try {
      // Build conditions array
      const conditions = [
        eq(partsCatalog.isActive, true),
        or(
          ilike(partsCatalog.partName, `%${query}%`),
          ilike(partsCatalog.partNumber, `%${query}%`),
          ilike(partsCatalog.description, `%${query}%`)
        )
      ];

      if (category) {
        conditions.push(eq(partsCatalog.category, category));
      }

      if (manufacturerId) {
        conditions.push(eq(partsCatalog.manufacturerId, manufacturerId));
      }

      const searchQuery = db.select()
        .from(partsCatalog)
        .where(and(...conditions));

      return await searchQuery.orderBy(desc(partsCatalog.lastUpdated));
    } catch (error) {
      console.error('Greška pri pretraživanju kataloga:', error);
      return [];
    }
  }

  async createPartInCatalog(part: InsertPartsCatalog): Promise<PartsCatalog> {
    try {
      const [newPart] = await db.insert(partsCatalog).values(part).returning();
      return newPart;
    } catch (error) {
      console.error('Greška pri kreiranju dela u katalogu:', error);
      throw error;
    }
  }

  async updatePartInCatalog(id: number, part: Partial<PartsCatalog>): Promise<PartsCatalog | undefined> {
    try {
      const [updatedPart] = await db.update(partsCatalog)
        .set({ ...part, lastUpdated: new Date() })
        .where(eq(partsCatalog.id, id))
        .returning();
      return updatedPart;
    } catch (error) {
      console.error('Greška pri ažuriranju dela u katalogu:', error);
      return undefined;
    }
  }

  async deletePartFromCatalog(id: number): Promise<boolean> {
    try {
      await db.update(partsCatalog)
        .set({ isActive: false, lastUpdated: new Date() })
        .where(eq(partsCatalog.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju dela iz kataloga:', error);
      return false;
    }
  }

  async getPartsCatalogByCategory(category: string): Promise<PartsCatalog[]> {
    try {
      return await db.select()
        .from(partsCatalog)
        .where(and(
          eq(partsCatalog.category, category),
          eq(partsCatalog.isActive, true)
        ))
        .orderBy(partsCatalog.partName);
    } catch (error) {
      console.error('Greška pri dohvatanju delova po kategoriji:', error);
      return [];
    }
  }

  async getPartsCatalogByManufacturer(manufacturerId: number): Promise<PartsCatalog[]> {
    try {
      return await db.select()
        .from(partsCatalog)
        .where(and(
          eq(partsCatalog.manufacturerId, manufacturerId),
          eq(partsCatalog.isActive, true)
        ))
        .orderBy(partsCatalog.partName);
    } catch (error) {
      console.error('Greška pri dohvatanju delova po proizvođaču:', error);
      return [];
    }
  }

  async bulkInsertPartsToCatalog(parts: InsertPartsCatalog[]): Promise<number> {
    try {
      const insertedParts = await db.insert(partsCatalog).values(parts).returning();
      return insertedParts.length;
    } catch (error) {
      console.error('Greška pri bulk insert delova:', error);
      throw error;
    }
  }

  async getPartsCatalogStats(): Promise<{
    totalParts: number;
    availableParts: number;
    outOfStockParts: number;
    categoriesCount: Record<string, number>;
  }> {
    try {
      const allParts = await db.select()
        .from(partsCatalog)
        .where(eq(partsCatalog.isActive, true));

      const totalParts = allParts.length;
      const availableParts = allParts.filter(p => p.availability === 'available').length;
      const outOfStockParts = allParts.filter(p => p.availability === 'out_of_stock').length;

      // Brojanje po kategorijama
      const categoriesCount = allParts.reduce((acc, part) => {
        acc[part.category] = (acc[part.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalParts,
        availableParts,
        outOfStockParts,
        categoriesCount
      };
    } catch (error) {
      console.error('Greška pri dobijanju statistika kataloga:', error);
      return {
        totalParts: 0,
        availableParts: 0,
        outOfStockParts: 0,
        categoriesCount: {}
      };
    }
  }

  // Conversation messages methods
  async getConversationMessages(serviceId: number): Promise<ConversationMessage[]> {
    try {
      return await db.select()
        .from(conversationMessages)
        .where(eq(conversationMessages.serviceId, serviceId))
        .orderBy(conversationMessages.createdAt);
    } catch (error) {
      console.error('Greška pri dohvatanju conversation poruka:', error);
      return [];
    }
  }

  async createConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage> {
    try {
      const [newMessage] = await db.insert(conversationMessages).values(message).returning();
      return newMessage;
    } catch (error) {
      console.error('Greška pri kreiranju conversation poruke:', error);
      throw error;
    }
  }

  async updateConversationMessageStatus(id: number, status: string): Promise<ConversationMessage | undefined> {
    try {
      const [updatedMessage] = await db.update(conversationMessages)
        .set({ 
          deliveryStatus: status as any,
          updatedAt: new Date()
        })
        .where(eq(conversationMessages.id, id))
        .returning();
      return updatedMessage;
    } catch (error) {
      console.error('Greška pri ažuriranju conversation poruke:', error);
      return undefined;
    }
  }

  async getServiceConversationHistory(serviceId: number): Promise<ConversationMessage[]> {
    try {
      return await db.select()
        .from(conversationMessages)
        .where(eq(conversationMessages.serviceId, serviceId))
        .orderBy(conversationMessages.createdAt);
    } catch (error) {
      console.error('Greška pri dohvatanju conversation istorije:', error);
      return [];
    }
  }

  // ===== SIGURNOSNI SISTEM PROTIV BRISANJA SERVISA - NOVE FUNKCIJE =====

  // Service Audit Log funkcije
  async createServiceAuditLog(log: InsertServiceAuditLog): Promise<ServiceAuditLog | undefined> {
    try {
      const [auditLog] = await db
        .insert(serviceAuditLogs)
        .values(log)
        .returning();
      console.log(`🔒 [AUDIT LOG] ${log.action} servis ${log.serviceId} od strane ${log.performedByUsername} (${log.performedByRole})`);
      return auditLog;
    } catch (error) {
      console.error('Greška pri kreiranju audit log-a:', error);
      return undefined;
    }
  }

  async getServiceAuditLogs(serviceId: number): Promise<ServiceAuditLog[]> {
    try {
      return await db.select()
        .from(serviceAuditLogs)
        .where(eq(serviceAuditLogs.serviceId, serviceId))
        .orderBy(desc(serviceAuditLogs.timestamp));
    } catch (error) {
      console.error('Greška pri dohvatanju audit log-ova:', error);
      return [];
    }
  }

  async getAllAuditLogs(limit?: number): Promise<ServiceAuditLog[]> {
    try {
      const query = db.select().from(serviceAuditLogs).orderBy(desc(serviceAuditLogs.timestamp));
      return await (limit && limit > 0 ? query.limit(limit) : query);
    } catch (error) {
      console.error('Greška pri dohvatanju svih audit log-ova:', error);
      return [];
    }
  }

  // User Permissions funkcije
  async createUserPermission(permission: InsertUserPermission): Promise<UserPermission | undefined> {
    try {
      const [userPermission] = await db
        .insert(userPermissions)
        .values(permission)
        .returning();
      console.log(`🛡️ [PERMISSIONS] Dodeljene privilegije korisniku ${permission.userId}`);
      return userPermission;
    } catch (error) {
      console.error('Greška pri kreiranju user permissions:', error);
      return undefined;
    }
  }

  async getUserPermissions(userId: number): Promise<UserPermission | undefined> {
    try {
      const [permission] = await db.select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, userId))
        .limit(1);
      return permission;
    } catch (error) {
      console.error('Greška pri dohvatanju user permissions:', error);
      return undefined;
    }
  }

  async updateUserPermissions(userId: number, updates: Partial<InsertUserPermission>): Promise<UserPermission | undefined> {
    try {
      const [updatedPermission] = await db
        .update(userPermissions)
        .set(updates)
        .where(eq(userPermissions.userId, userId))
        .returning();
      console.log(`🛡️ [PERMISSIONS] Ažurirane privilegije za korisnika ${userId}`);
      return updatedPermission;
    } catch (error) {
      console.error('Greška pri ažuriranju user permissions:', error);
      return undefined;
    }
  }

  // Funkcije za proveru privilegija
  async canUserDeleteServices(userId: number): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId);
      if (!permissions) {
        // Ako nema unos u permissions tabeli, proveravaj da li je admin
        const user = await this.getUser(userId);
        return user?.role === 'admin'; // Samo admin može brisati servise ako nema eksplicitnih privilegija
      }
      return permissions.canDeleteServices;
    } catch (error) {
      console.error('Greška pri proveri privilegija za brisanje servisa:', error);
      return false; // Default na sigurnost - ne dozvoli brisanje
    }
  }

  // Deleted Services funkcije (Soft Delete) - TEMPORARILY COMMENTED OUT
  async softDeleteService(serviceId: number, deletedBy: number, deletedByUsername: string, deletedByRole: string, reason?: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    console.log('Deleted services functionality temporarily disabled');
    return false;
    /*
    try {
      console.log(`🗑️ [SOFT DELETE] Početak soft delete za servis ${serviceId} od strane ${deletedByUsername}`);
      
      // 1. Prvo dohvati kompletne podatke servisa
      const service = await this.getService(serviceId);
      if (!service) {
        console.log(`🗑️ [SOFT DELETE] Servis ${serviceId} ne postoji`);
        return false;
      }

      // 2. Sačuvaj kompletne podatke servisa kao JSON
      const originalServiceData = JSON.stringify(service);

      // 3. Unesi u deleted_services tabelu
      const deletedServiceData: InsertDeletedService = {
        serviceId: serviceId,
        originalServiceData: originalServiceData,
        deletedBy: deletedBy,
        deletedByUsername: deletedByUsername,
        deletedByRole: deletedByRole,
        deleteReason: reason || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        canBeRestored: true
      };

      const [deletedService] = await db
        .insert(deletedServices)
        .values(deletedServiceData)
        .returning();

      // 4. Kreiraj audit log
      await this.createServiceAuditLog({
        serviceId: serviceId,
        action: 'soft_deleted',
        performedBy: deletedBy,
        performedByUsername: deletedByUsername,
        performedByRole: deletedByRole,
        oldValues: originalServiceData,
        newValues: JSON.stringify({ status: 'soft_deleted' }),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        notes: reason || 'Servis soft-obrisan (čuva se za mogućnost vraćanja)'
      });

      // 5. Fizički obriši servis iz glavne tabele
      const deleteResult = await db.delete(services)
        .where(eq(services.id, serviceId));

      console.log(`🗑️ [SOFT DELETE] ✅ Servis ${serviceId} uspešno soft-obrisan`);
      return true;
    } catch (error) {
      console.error(`🗑️ [SOFT DELETE] ❌ Greška pri soft delete servisa ${serviceId}:`, error);
      return false;
    }
    */
  }

  // TEMPORARILY COMMENTED OUT - restoreDeletedService
  /*
  async restoreDeletedService(serviceId: number, restoredBy: number, restoredByUsername: string, restoredByRole: string): Promise<boolean> {
    try {
      console.log(`🔄 [RESTORE] Početak vraćanja servisa ${serviceId} od strane ${restoredByUsername}`);

      // 1. Dohvati podatke obrisanog servisa
      const [deletedService] = await db.select()
        .from(deletedServices)
        .where(and(
          eq(deletedServices.serviceId, serviceId),
          eq(deletedServices.canBeRestored, true),
          isNull(deletedServices.restoredAt)
        ))
        .limit(1);

      if (!deletedService) {
        console.log(`🔄 [RESTORE] Servis ${serviceId} nije pronađen u obrisanima ili se ne može vratiti`);
        return false;
      }

      // 2. Parsiraj originalne podatke servisa
      const originalService = JSON.parse(deletedService.originalServiceData);

      // 3. Vrati servis u glavnu tabelu (bez ID jer se regeneriše)
      const serviceToRestore = { ...originalService };
      delete serviceToRestore.id; // Ukloni ID da bude automatski generisan

      const [restoredService] = await db
        .insert(services)
        .values(serviceToRestore)
        .returning();

      // 4. Označi kao vraćen u deleted_services
      await db.update(deletedServices)
        .set({
          restoredBy: restoredBy,
          restoredAt: new Date(),
        })
        .where(eq(deletedServices.serviceId, serviceId));

      // 5. Kreiraj audit log
      await this.createServiceAuditLog({
        serviceId: restoredService.id,
        action: 'restored',
        performedBy: restoredBy,
        performedByUsername: restoredByUsername,
        performedByRole: restoredByRole,
        oldValues: JSON.stringify({ status: 'soft_deleted' }),
        newValues: JSON.stringify(restoredService),
        notes: `Servis vraćen iz soft delete (originalni ID: ${serviceId}, novi ID: ${restoredService.id})`
      });

      console.log(`🔄 [RESTORE] ✅ Servis ${serviceId} uspešno vraćen kao novi servis ${restoredService.id}`);
      return true;
    } catch (error) {
      console.error(`🔄 [RESTORE] ❌ Greška pri vraćanju servisa ${serviceId}:`, error);
      return false;
    }
  }
  */

  // TEMPORARILY COMMENTED OUT - getDeletedServices
  /*
  async getDeletedServices(): Promise<DeletedService[]> {
    try {
      return await db.select()
        .from(deletedServices)
        .where(isNull(deletedServices.restoredAt))
        .orderBy(desc(deletedServices.deletedAt));
    } catch (error) {
      console.error('Greška pri dohvatanju obrisanih servisa:', error);
      return [];
    }
  }
  */

  // TEMPORARILY COMMENTED OUT - getDeletedService
  /*
  async getDeletedService(serviceId: number): Promise<DeletedService | undefined> {
    try {
      const [deletedService] = await db.select()
        .from(deletedServices)
        .where(eq(deletedServices.serviceId, serviceId))
        .limit(1);
      return deletedService;
    } catch (error) {
      console.error('Greška pri dohvatanju obrisanog servisa:', error);
      return undefined;
    }
  }
  */

  // Service Completion Report methods (missing implementations)
  async getServiceCompletionReportsByService(serviceId: number): Promise<ServiceCompletionReport[]> {
    try {
      return await db.select()
        .from(serviceCompletionReports)
        .where(eq(serviceCompletionReports.serviceId, serviceId))
        .orderBy(desc(serviceCompletionReports.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju izvještaja o završenim servisima po servisu:', error);
      return [];
    }
  }

  async getServiceCompletionReportsByTechnician(technicianId: number): Promise<ServiceCompletionReport[]> {
    try {
      return await db.select()
        .from(serviceCompletionReports)
        .where(eq(serviceCompletionReports.technicianId, technicianId))
        .orderBy(desc(serviceCompletionReports.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju izvještaja o završenim servisima po tehničaru:', error);
      return [];
    }
  }

  async deleteServiceCompletionReport(id: number): Promise<boolean> {
    try {
      await db.delete(serviceCompletionReports)
        .where(eq(serviceCompletionReports.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju izvještaja o završenom servisu:', error);
      return false;
    }
  }

  // AI Maintenance Pattern methods
  async getAllMaintenancePatterns(): Promise<MaintenancePatterns[]> {
    try {
      return await db.select()
        .from(maintenancePatterns)
        .orderBy(desc(maintenancePatterns.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju svih pattern-a održavanja:', error);
      return [];
    }
  }

  async getMaintenancePattern(id: number): Promise<MaintenancePatterns | undefined> {
    try {
      const [pattern] = await db.select()
        .from(maintenancePatterns)
        .where(eq(maintenancePatterns.id, id))
        .limit(1);
      return pattern;
    } catch (error) {
      console.error('Greška pri dohvatanju pattern-a održavanja:', error);
      return undefined;
    }
  }

  async getMaintenancePatternsByCategory(categoryId: number): Promise<MaintenancePatterns[]> {
    try {
      return await db.select()
        .from(maintenancePatterns)
        .where(eq(maintenancePatterns.applianceCategoryId, categoryId))
        .orderBy(desc(maintenancePatterns.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju pattern-a održavanja po kategoriji:', error);
      return [];
    }
  }

  async getMaintenancePatternsByManufacturer(manufacturerId: number): Promise<MaintenancePatterns[]> {
    try {
      return await db.select()
        .from(maintenancePatterns)
        .where(eq(maintenancePatterns.manufacturerId, manufacturerId))
        .orderBy(desc(maintenancePatterns.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju pattern-a održavanja po proizvođaču:', error);
      return [];
    }
  }

  async createMaintenancePattern(pattern: InsertMaintenancePatterns): Promise<MaintenancePatterns> {
    try {
      const [newPattern] = await db.insert(maintenancePatterns)
        .values({
          ...pattern,
          createdAt: new Date()
        })
        .returning();
      return newPattern;
    } catch (error) {
      console.error('Greška pri kreiranju pattern-a održavanja:', error);
      throw error;
    }
  }

  async updateMaintenancePattern(id: number, pattern: Partial<MaintenancePatterns>): Promise<MaintenancePatterns | undefined> {
    try {
      const [updatedPattern] = await db.update(maintenancePatterns)
        .set(pattern)
        .where(eq(maintenancePatterns.id, id))
        .returning();
      return updatedPattern;
    } catch (error) {
      console.error('Greška pri ažuriranju pattern-a održavanja:', error);
      return undefined;
    }
  }

  async deleteMaintenancePattern(id: number): Promise<boolean> {
    try {
      await db.delete(maintenancePatterns)
        .where(eq(maintenancePatterns.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju pattern-a održavanja:', error);
      return false;
    }
  }

  // Predictive Insights methods
  async getAllPredictiveInsights(): Promise<PredictiveInsights[]> {
    try {
      return await db.select()
        .from(predictiveInsights)
        .orderBy(desc(predictiveInsights.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju svih prediktivnih uvida:', error);
      return [];
    }
  }

  async getPredictiveInsight(id: number): Promise<PredictiveInsights | undefined> {
    try {
      const [insight] = await db.select()
        .from(predictiveInsights)
        .where(eq(predictiveInsights.id, id))
        .limit(1);
      return insight;
    } catch (error) {
      console.error('Greška pri dohvatanju prediktivnog uvida:', error);
      return undefined;
    }
  }

  async getPredictiveInsightsByAppliance(applianceId: number): Promise<PredictiveInsights[]> {
    try {
      return await db.select()
        .from(predictiveInsights)
        .where(eq(predictiveInsights.applianceId, applianceId))
        .orderBy(desc(predictiveInsights.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju prediktivnih uvida po aparatu:', error);
      return [];
    }
  }

  async getPredictiveInsightsByClient(clientId: number): Promise<PredictiveInsights[]> {
    try {
      return await db.select()
        .from(predictiveInsights)
        .where(eq(predictiveInsights.clientId, clientId))
        .orderBy(desc(predictiveInsights.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju prediktivnih uvida po klijentu:', error);
      return [];
    }
  }

  async getActivePredictiveInsights(): Promise<PredictiveInsights[]> {
    try {
      return await db.select()
        .from(predictiveInsights)
        .where(eq(predictiveInsights.isActive, true))
        .orderBy(desc(predictiveInsights.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju aktivnih prediktivnih uvida:', error);
      return [];
    }
  }

  async getCriticalRiskInsights(): Promise<PredictiveInsights[]> {
    try {
      return await db.select()
        .from(predictiveInsights)
        .where(and(
          eq(predictiveInsights.isActive, true),
          or(
            eq(predictiveInsights.riskLevel, 'critical'),
            eq(predictiveInsights.riskLevel, 'high')
          )
        ))
        .orderBy(desc(predictiveInsights.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju kritičnih rizičnih uvida:', error);
      return [];
    }
  }

  async createPredictiveInsight(insight: InsertPredictiveInsights): Promise<PredictiveInsights> {
    try {
      const [newInsight] = await db.insert(predictiveInsights)
        .values({
          ...insight,
          createdAt: new Date()
        })
        .returning();
      return newInsight;
    } catch (error) {
      console.error('Greška pri kreiranju prediktivnog uvida:', error);
      throw error;
    }
  }

  async updatePredictiveInsight(id: number, insight: Partial<PredictiveInsights>): Promise<PredictiveInsights | undefined> {
    try {
      const [updatedInsight] = await db.update(predictiveInsights)
        .set(insight)
        .where(eq(predictiveInsights.id, id))
        .returning();
      return updatedInsight;
    } catch (error) {
      console.error('Greška pri ažuriranju prediktivnog uvida:', error);
      return undefined;
    }
  }

  async deletePredictiveInsight(id: number): Promise<boolean> {
    try {
      await db.delete(predictiveInsights)
        .where(eq(predictiveInsights.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju prediktivnog uvida:', error);
      return false;
    }
  }

  // AI Analysis Results methods
  async getAllAiAnalysisResults(): Promise<AiAnalysisResults[]> {
    try {
      return await db.select()
        .from(aiAnalysisResults)
        .orderBy(desc(aiAnalysisResults.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju svih AI analiza:', error);
      return [];
    }
  }

  async getAiAnalysisResult(id: number): Promise<AiAnalysisResults | undefined> {
    try {
      const [result] = await db.select()
        .from(aiAnalysisResults)
        .where(eq(aiAnalysisResults.id, id))
        .limit(1);
      return result;
    } catch (error) {
      console.error('Greška pri dohvatanju AI analize:', error);
      return undefined;
    }
  }

  async getAiAnalysisResultsByAppliance(applianceId: number): Promise<AiAnalysisResults[]> {
    try {
      return await db.select()
        .from(aiAnalysisResults)
        .where(eq(aiAnalysisResults.applianceId, applianceId))
        .orderBy(desc(aiAnalysisResults.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju AI analiza po aparatu:', error);
      return [];
    }
  }

  async getAiAnalysisResultsByType(analysisType: string): Promise<AiAnalysisResults[]> {
    try {
      return await db.select()
        .from(aiAnalysisResults)
        .where(eq(aiAnalysisResults.analysisType, analysisType))
        .orderBy(desc(aiAnalysisResults.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju AI analiza po tipu:', error);
      return [];
    }
  }

  async getSuccessfulAiAnalysisResults(): Promise<AiAnalysisResults[]> {
    try {
      return await db.select()
        .from(aiAnalysisResults)
        .where(eq(aiAnalysisResults.isSuccessful, true))
        .orderBy(desc(aiAnalysisResults.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju uspešnih AI analiza:', error);
      return [];
    }
  }

  async createAiAnalysisResult(result: InsertAiAnalysisResults): Promise<AiAnalysisResults> {
    try {
      const [newResult] = await db.insert(aiAnalysisResults)
        .values({
          ...result,
          createdAt: new Date()
        })
        .returning();
      return newResult;
    } catch (error) {
      console.error('Greška pri kreiranju AI analize:', error);
      throw error;
    }
  }

  async updateAiAnalysisResult(id: number, result: Partial<AiAnalysisResults>): Promise<AiAnalysisResults | undefined> {
    try {
      const [updatedResult] = await db.update(aiAnalysisResults)
        .set(result)
        .where(eq(aiAnalysisResults.id, id))
        .returning();
      return updatedResult;
    } catch (error) {
      console.error('Greška pri ažuriranju AI analize:', error);
      return undefined;
    }
  }

  async deleteAiAnalysisResult(id: number): Promise<boolean> {
    try {
      await db.delete(aiAnalysisResults)
        .where(eq(aiAnalysisResults.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju AI analize:', error);
      return false;
    }
  }

  // Notification methods
  async getAllNotifications(userId?: number): Promise<Notification[]> {
    try {
      if (userId) {
        return await db.select()
          .from(notifications)
          .where(eq(notifications.userId, userId))
          .orderBy(desc(notifications.createdAt));
      } else {
        return await db.select()
          .from(notifications)
          .orderBy(desc(notifications.createdAt));
      }
    } catch (error) {
      console.error('Greška pri dohvatanju svih notifikacija:', error);
      return [];
    }
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    try {
      const [notification] = await db.select()
        .from(notifications)
        .where(eq(notifications.id, id))
        .limit(1);
      return notification;
    } catch (error) {
      console.error('Greška pri dohvatanju notifikacije:', error);
      return undefined;
    }
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    try {
      return await db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju notifikacija korisnika:', error);
      return [];
    }
  }

  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    try {
      return await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ))
        .orderBy(desc(notifications.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju nepročitanih notifikacija:', error);
      return [];
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [newNotification] = await db.insert(notifications)
        .values({
          ...notification,
          createdAt: new Date(),
          isRead: false
        })
        .returning();
      return newNotification;
    } catch (error) {
      console.error('Greška pri kreiranju notifikacije:', error);
      throw error;
    }
  }

  async updateNotification(id: number, notification: Partial<Notification>): Promise<Notification | undefined> {
    try {
      const [updatedNotification] = await db.update(notifications)
        .set(notification)
        .where(eq(notifications.id, id))
        .returning();
      return updatedNotification;
    } catch (error) {
      console.error('Greška pri ažuriranju notifikacije:', error);
      return undefined;
    }
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    try {
      const [updatedNotification] = await db.update(notifications)
        .set({ 
          isRead: true,
          readAt: new Date()
        })
        .where(eq(notifications.id, id))
        .returning();
      return updatedNotification;
    } catch (error) {
      console.error('Greška pri označavanju notifikacije kao pročitane:', error);
      return undefined;
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      await db.update(notifications)
        .set({ 
          isRead: true,
          readAt: new Date()
        })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
    } catch (error) {
      console.error('Greška pri označavanju svih notifikacija kao pročitane:', error);
      throw error;
    }
  }

  async deleteNotification(id: number): Promise<boolean> {
    try {
      const result = await db.delete(notifications)
        .where(eq(notifications.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju notifikacije:', error);
      return false;
    }
  }

  // Missing methods for routes compatibility
  async getCategory(id: number): Promise<ApplianceCategory | undefined> {
    return this.getApplianceCategory(id);
  }

  async setSystemSetting(key: string, value: string): Promise<SystemSetting | undefined> {
    try {
      // Try to update existing setting first
      const existing = await this.getSystemSetting(key);
      if (existing) {
        return this.updateSystemSetting(key, { value });
      } else {
        // Create new setting
        return this.createSystemSetting({ key, value, category: 'general', description: '' });
      }
    } catch (error) {
      console.error('Greška pri postavljanju system setting-a:', error);
      return undefined;
    }
  }

  async getBusinessPartner(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

}

// Koristimo PostgreSQL implementaciju umesto MemStorage
export const storage = new DatabaseStorage();
