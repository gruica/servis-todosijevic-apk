import { pgTable, text, serial, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").default("customer").notNull(), // Promenjen default na customer
  technicianId: integer("technician_id"), // Reference to technician if user is a technician
  email: text("email"), // Email adresa korisnika
  phone: text("phone"), // Broj telefona korisnika
  address: text("address"), // Adresa korisnika
  city: text("city"), // Grad korisnika
  companyName: text("company_name"), // Naziv kompanije za poslovne partnere
  companyId: text("company_id"), // Jedinstveni identifikator kompanije
  isVerified: boolean("is_verified").default(false).notNull(), // Da li je korisnik verifikovan od strane administratora
  registeredAt: timestamp("registered_at").defaultNow().notNull(), // Datum i vreme registracije
  verifiedAt: timestamp("verified_at"), // Datum i vreme kada je korisnik verifikovan
  verifiedBy: integer("verified_by"), // ID administratora koji je verifikovao korisnika
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  technicianId: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  companyName: true,
  companyId: true,
  isVerified: true,
}).extend({
  username: z.string().min(3, "Korisničko ime mora imati najmanje 3 karaktera").max(50, "Korisničko ime je predugačko"),
  password: z.string().min(6, "Lozinka mora imati najmanje 6 karaktera"),
  fullName: z.string().min(2, "Ime i prezime mora imati najmanje 2 karaktera").max(100, "Ime i prezime je predugačko"),
  email: z.string().email("Unesite validnu email adresu").min(1, "Email adresa je obavezna"),
  phone: z.string().min(6, "Broj telefona mora imati najmanje 6 brojeva")
    .regex(/^[+]?[\d\s()-]{6,20}$/, "Broj telefona mora sadržati samo brojeve, razmake i znakove +()-")
    .or(z.literal("")).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Technicians/Servicemen table
export const technicians = pgTable("technicians", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  specialization: text("specialization"),
  active: boolean("active").default(true).notNull(),
});

export const insertTechnicianSchema = createInsertSchema(technicians).pick({
  fullName: true,
  phone: true,
  email: true,
  specialization: true,
  active: true,
});

export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Technician = typeof technicians.$inferSelect;

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city"),
});

// Poboljšana šema za validaciju klijenata sa detaljnijim pravilima
export const insertClientSchema = createInsertSchema(clients).pick({
  fullName: true,
  email: true,
  phone: true,
  address: true,
  city: true,
}).extend({
  fullName: z.string().min(2, "Ime i prezime mora imati najmanje 2 karaktera").max(100, "Ime je predugačko"),
  email: z.string().email("Unesite validnu email adresu").or(z.literal("")).optional(),
  phone: z.string().min(6, "Broj telefona mora imati najmanje 6 brojeva")
    .regex(/^[+]?[\d\s()-]{6,20}$/, "Broj telefona mora sadržati samo brojeve, razmake i znakove +()-"),
  address: z.string().min(3, "Adresa mora imati najmanje 3 karaktera").or(z.literal("")).optional(),
  city: z.string().min(2, "Grad mora imati najmanje 2 karaktera").or(z.literal("")).optional(),
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Appliance categories
export const applianceCategories = pgTable("appliance_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(), // Material icon name
});

export const insertApplianceCategorySchema = createInsertSchema(applianceCategories)
  .pick({
    name: true,
    icon: true,
  })
  .extend({
    // Validacija imena kategorije
    name: z.string()
      .min(2, "Naziv kategorije mora imati najmanje 2 karaktera")
      .max(100, "Naziv kategorije ne sme biti duži od 100 karaktera")
      .trim(), // Uklanja razmake na početku i kraju
    
    // Validacija ikone
    icon: z.string()
      .min(1, "Ikona je obavezna")
      .max(50, "Naziv ikone je predugačak")
      .trim(), // Uklanja razmake na početku i kraju
  });

export type InsertApplianceCategory = z.infer<typeof insertApplianceCategorySchema>;
export type ApplianceCategory = typeof applianceCategories.$inferSelect;

// Manufacturers
export const manufacturers = pgTable("manufacturers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertManufacturerSchema = createInsertSchema(manufacturers)
  .pick({
    name: true,
  })
  .extend({
    // Validacija da ime proizvođača mora biti između 2 i 100 karaktera
    name: z.string()
      .min(2, "Naziv proizvođača mora imati najmanje 2 karaktera")
      .max(100, "Naziv proizvođača ne sme biti duži od 100 karaktera")
      .trim(), // Uklanja razmake na početku i kraju
  });

export type InsertManufacturer = z.infer<typeof insertManufacturerSchema>;
export type Manufacturer = typeof manufacturers.$inferSelect;

// Appliances
export const appliances = pgTable("appliances", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  categoryId: integer("category_id").notNull(),
  manufacturerId: integer("manufacturer_id").notNull(),
  model: text("model"),
  serialNumber: text("serial_number"),
  purchaseDate: text("purchase_date"),
  notes: text("notes"),
});

// Poboljšana šema za validaciju uređaja
export const insertApplianceSchema = createInsertSchema(appliances).pick({
  clientId: true,
  categoryId: true,
  manufacturerId: true,
  model: true,
  serialNumber: true,
  purchaseDate: true,
  notes: true,
}).extend({
  clientId: z.number().int().positive("ID klijenta mora biti pozitivan broj"),
  categoryId: z.number().int().positive("ID kategorije mora biti pozitivan broj"),
  manufacturerId: z.number().int().positive("ID proizvođača mora biti pozitivan broj"),
  model: z.string().min(1, "Model je obavezan").max(100, "Model je predugačak").or(z.literal("")).optional(),
  serialNumber: z.string().max(50, "Serijski broj je predugačak").or(z.literal("")).optional(),
  purchaseDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .or(z.literal(""))
    .optional()
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime()) && date <= new Date();
    }, "Datum kupovine ne može biti u budućnosti"),
  notes: z.string().max(500, "Napomene su predugačke").or(z.literal("")).optional(),
});

export type InsertAppliance = z.infer<typeof insertApplianceSchema>;
export type Appliance = typeof appliances.$inferSelect;

// Service status enum
export const serviceStatusEnum = z.enum([
  "pending", // čekanje
  "scheduled", // zakazano
  "in_progress", // u procesu
  "waiting_parts", // čeka delove
  "device_parts_removed", // delovi uklonjeni sa uređaja
  "completed", // završeno
  "cancelled", // otkazano
  "client_not_home", // klijent nije kući
  "client_not_answering", // klijent se ne javlja
  "customer_refuses_repair", // kupac odbija popravku
  "customer_refused_repair", // kupac je odbio popravku (zatvoreno)
]);

export type ServiceStatus = z.infer<typeof serviceStatusEnum>;

// Warranty status enum
export const warrantyStatusEnum = z.enum([
  "u garanciji", // u garanciji
  "van garancije", // van garancije
]);

export type WarrantyStatus = z.infer<typeof warrantyStatusEnum>;

// Services
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  applianceId: integer("appliance_id").notNull(),
  technicianId: integer("technician_id"),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  warrantyStatus: text("warranty_status").notNull(), // u garanciji ili van garancije
  createdAt: text("created_at").notNull(),
  scheduledDate: text("scheduled_date"),
  completedDate: text("completed_date"),
  technicianNotes: text("technician_notes"),
  cost: text("cost"),
  usedParts: text("used_parts"),
  machineNotes: text("machine_notes"),
  isCompletelyFixed: boolean("is_completely_fixed"),
  businessPartnerId: integer("business_partner_id"), // ID korisnika poslovnog partnera
  partnerCompanyName: text("partner_company_name"), // Naziv kompanije poslovnog partnera
  clientUnavailableReason: text("client_unavailable_reason"), // Razlog nedostupnosti klijenta
  needsRescheduling: boolean("needs_rescheduling").default(false), // Da li treba ponovno zakazivanje
  reschedulingNotes: text("rescheduling_notes"), // Napomene za ponovno zakazivanje
  devicePickedUp: boolean("device_picked_up").default(false), // Da li je uređaj preuzet
  pickupDate: text("pickup_date"), // Datum preuzimanja uređaja
  pickupNotes: text("pickup_notes"), // Napomene o preuzimanju
  customerRefusesRepair: boolean("customer_refuses_repair").default(false), // Da li kupac odbija popravku
  customerRefusalReason: text("customer_refusal_reason"), // Razlog zašto kupac odbija popravku
});

// Tabela za praćenje uklonjenih delova sa uređaja
export const removedParts = pgTable("removed_parts", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  partName: text("part_name").notNull(), // Naziv dela (elektronika, motor, pumpa, itd.)
  partDescription: text("part_description"), // Detaljan opis dela
  removalDate: text("removal_date").notNull(), // Datum uklanjanja
  removalReason: text("removal_reason").notNull(), // Razlog uklanjanja (popravka, zamena, itd.)
  currentLocation: text("current_location").default("workshop"), // Lokacija dela (workshop, external_repair, returned)
  expectedReturnDate: text("expected_return_date"), // Očekivani datum vraćanja
  actualReturnDate: text("actual_return_date"), // Stvarni datum vraćanja
  partStatus: text("part_status").notNull().default("removed"), // removed, in_repair, repaired, returned, replaced
  technicianNotes: text("technician_notes"), // Napomene servisera
  repairCost: text("repair_cost"), // Troškovi popravke dela
  isReinstalled: boolean("is_reinstalled").default(false), // Da li je deo vraćen u uređaj
  createdBy: integer("created_by").notNull(), // ID servisera koji je uklonio deo
});

// Osnovni schema za validaciju servisa - samo obavezna polja
export const insertServiceSchema = createInsertSchema(services).pick({
  clientId: true,
  applianceId: true,
  technicianId: true,
  description: true,
  status: true,
  warrantyStatus: true,
  createdAt: true,
  scheduledDate: true,
  completedDate: true,
  technicianNotes: true,
  cost: true,
  usedParts: true,
  machineNotes: true,
  isCompletelyFixed: true,
  businessPartnerId: true,
  partnerCompanyName: true,
  clientUnavailableReason: true,
  needsRescheduling: true,
  reschedulingNotes: true,
  devicePickedUp: true,
  pickupDate: true,
  pickupNotes: true,
  customerRefusesRepair: true,
  customerRefusalReason: true,
}).extend({
  clientId: z.number().int().positive("ID klijenta mora biti pozitivan broj"),
  applianceId: z.number().int().positive("ID uređaja mora biti pozitivan broj"),
  technicianId: z.number().int().positive("ID servisera mora biti pozitivan broj").nullable().optional(),
  description: z.string().min(5, "Opis problema mora biti detaljniji (min. 5 karaktera)").max(1000, "Opis je predugačak"),
  status: serviceStatusEnum.default("pending"),
  warrantyStatus: warrantyStatusEnum,
  createdAt: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .refine(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Nevažeći datum"),
  scheduledDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .or(z.literal(""))
    .nullable()
    .optional()
    .refine(val => {
      if (!val || val === "") return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Nevažeći datum zakazivanja"),
  completedDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .or(z.literal(""))
    .nullable()
    .optional()
    .refine(val => {
      if (!val || val === "") return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Nevažeći datum završetka"),
  technicianNotes: z.string().max(1000, "Napomene su predugačke").or(z.literal("")).nullable().optional(),
  cost: z.string().max(50, "Iznos je predugačak").or(z.literal("")).nullable().optional(),
  usedParts: z.string().max(1000, "Lista delova je predugačka").or(z.literal("")).nullable().optional()
    .refine(val => {
      if (!val || val === "") return true;
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, "Nevažeći JSON format za korišćene delove"),
  machineNotes: z.string().max(500, "Napomene o uređaju su predugačke").or(z.literal("")).nullable().optional(),
  isCompletelyFixed: z.boolean().nullable().optional(),
  businessPartnerId: z.union([
    z.number().int().positive("ID poslovnog partnera mora biti pozitivan broj"),
    z.string().refine((val) => !isNaN(parseInt(val)), {
      message: "ID poslovnog partnera mora biti broj ili string koji se može konvertovati u broj"
    }).transform(val => parseInt(val))
  ]).nullable().optional(),
  partnerCompanyName: z.string().max(100, "Naziv kompanije je predugačak").or(z.literal("")).nullable().optional(),
  clientUnavailableReason: z.string().max(500, "Razlog nedostupnosti je predugačak").or(z.literal("")).nullable().optional(),
  needsRescheduling: z.boolean().nullable().optional(),
  reschedulingNotes: z.string().max(1000, "Napomene za ponovno zakazivanje su predugačke").or(z.literal("")).nullable().optional(),
  devicePickedUp: z.boolean().nullable().optional(),
  pickupDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .or(z.literal(""))
    .nullable()
    .optional()
    .refine(val => {
      if (!val || val === "") return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Nevažeći datum preuzimanja"),
  pickupNotes: z.string().max(1000, "Napomene o preuzimanju su predugačke").or(z.literal("")).nullable().optional(),
}).partial({
  // Ova polja su opciona za osnovnu formu za kreiranje servisa
  technicianId: true,
  scheduledDate: true,
  completedDate: true,
  technicianNotes: true,
  cost: true,
  usedParts: true,
  machineNotes: true,
  isCompletelyFixed: true,
  businessPartnerId: true,
  partnerCompanyName: true,
  clientUnavailableReason: true,
  needsRescheduling: true,
  reschedulingNotes: true,
  devicePickedUp: true,
  pickupDate: true,
  pickupNotes: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// Schema za dopunjavanje Generali servisa
export const supplementGeneraliServiceSchema = z.object({
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj"),
  // Podaci o klijentu koji se mogu dopuniti
  clientEmail: z.string().email("Unesite validnu email adresu").optional(),
  clientAddress: z.string().min(5, "Adresa mora imati najmanje 5 karaktera").max(200, "Adresa je predugačka").optional(),
  clientCity: z.string().min(2, "Grad mora imati najmanje 2 karaktera").max(50, "Grad je predugačak").optional(),
  // Podaci o aparatu koji se mogu dopuniti
  serialNumber: z.string().min(3, "Serijski broj mora imati najmanje 3 karaktera").max(50, "Serijski broj je predugačak").optional(),
  model: z.string().min(2, "Model mora imati najmanje 2 karaktera").max(100, "Model je predugačak").optional(),
  purchaseDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .optional()
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime()) && date <= new Date();
    }, "Datum kupovine ne može biti u budućnosti"),
  // Dodatne napomene o dopuni
  supplementNotes: z.string().max(500, "Napomene su predugačke").optional(),
});

export type SupplementGeneraliService = z.infer<typeof supplementGeneraliServiceSchema>;

// Schema za validaciju uklonjenih delova
export const insertRemovedPartSchema = createInsertSchema(removedParts).pick({
  serviceId: true,
  partName: true,
  partDescription: true,
  removalDate: true,
  removalReason: true,
  currentLocation: true,
  expectedReturnDate: true,
  actualReturnDate: true,
  partStatus: true,
  technicianNotes: true,
  repairCost: true,
  isReinstalled: true,
  createdBy: true,
}).extend({
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj"),
  partName: z.string().min(2, "Naziv dela mora imati najmanje 2 karaktera").max(100, "Naziv dela je predugačak"),
  partDescription: z.string().max(500, "Opis dela je predugačak").optional(),
  removalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD"),
  removalReason: z.string().min(5, "Razlog uklanjanja mora biti detaljniji").max(300, "Razlog je predugačak"),
  currentLocation: z.enum(["workshop", "external_repair", "returned"]).default("workshop"),
  expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD").optional(),
  actualReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD").optional(),
  partStatus: z.enum(["removed", "in_repair", "repaired", "returned", "replaced"]).default("removed"),
  technicianNotes: z.string().max(500, "Napomene su predugačke").optional(),
  repairCost: z.string().max(20, "Cena je predugačka").optional(),
  isReinstalled: z.boolean().default(false),
  createdBy: z.number().int().positive("ID servisera mora biti pozitivan broj"),
});

export type InsertRemovedPart = z.infer<typeof insertRemovedPartSchema>;
export type RemovedPart = typeof removedParts.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  technician: one(technicians, {
    fields: [users.technicianId],
    references: [technicians.id],
  }),
}));

export const techniciansRelations = relations(technicians, ({ many }) => ({
  services: many(services),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  appliances: many(appliances),
  services: many(services),
}));

export const appliancesRelations = relations(appliances, ({ one, many }) => ({
  client: one(clients, {
    fields: [appliances.clientId],
    references: [clients.id],
  }),
  category: one(applianceCategories, {
    fields: [appliances.categoryId],
    references: [applianceCategories.id],
  }),
  manufacturer: one(manufacturers, {
    fields: [appliances.manufacturerId],
    references: [manufacturers.id],
  }),
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  client: one(clients, {
    fields: [services.clientId],
    references: [clients.id],
  }),
  appliance: one(appliances, {
    fields: [services.applianceId],
    references: [appliances.id],
  }),
  technician: one(technicians, {
    fields: [services.technicianId],
    references: [technicians.id],
  }),
  removedParts: many(removedParts),
}));

export const removedPartsRelations = relations(removedParts, ({ one }) => ({
  service: one(services, {
    fields: [removedParts.serviceId],
    references: [services.id],
  }),
  technician: one(technicians, {
    fields: [removedParts.createdBy],
    references: [technicians.id],
  }),
}));

// Maintenance Prediction and Alerts
export const maintenanceFrequencyEnum = z.enum([
  "monthly", // Mesečno
  "quarterly", // Kvartalno
  "biannual", // Polugodišnje
  "annual", // Godišnje
  "custom" // Prilagođeno
]);

export type MaintenanceFrequency = z.infer<typeof maintenanceFrequencyEnum>;

// Tabela za održavanje uređaja
export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: serial("id").primaryKey(),
  applianceId: integer("appliance_id").notNull().references(() => appliances.id),
  name: text("name").notNull(), // Naziv plana održavanja
  description: text("description"), // Opis održavanja
  frequency: text("frequency", { enum: ["monthly", "quarterly", "biannual", "annual", "custom"] }).notNull(),
  lastMaintenanceDate: timestamp("last_maintenance_date"), // Datum poslednjeg održavanja
  nextMaintenanceDate: timestamp("next_maintenance_date").notNull(), // Sledeći planirani datum
  customIntervalDays: integer("custom_interval_days"), // Dani između održavanja (za prilagođeni interval)
  isActive: boolean("is_active").default(true).notNull(), // Da li je aktivno
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules).pick({
  applianceId: true,
  name: true,
  description: true,
  frequency: true,
  lastMaintenanceDate: true,
  nextMaintenanceDate: true,
  customIntervalDays: true,
  isActive: true
});

export type InsertMaintenanceSchedule = z.infer<typeof insertMaintenanceScheduleSchema>;
export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;

// Tabela za obaveštenja o održavanju
export const maintenanceAlerts = pgTable("maintenance_alerts", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull().references(() => maintenanceSchedules.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  alertDate: timestamp("alert_date").defaultNow().notNull(),
  status: text("status", { enum: ["pending", "sent", "acknowledged", "completed"] }).default("pending").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMaintenanceAlertSchema = createInsertSchema(maintenanceAlerts).pick({
  scheduleId: true,
  title: true,
  message: true,
  alertDate: true,
  status: true,
  isRead: true
});

export type InsertMaintenanceAlert = z.infer<typeof insertMaintenanceAlertSchema>;
export type MaintenanceAlert = typeof maintenanceAlerts.$inferSelect;

// Relacije za održavanje
export const maintenanceSchedulesRelations = relations(maintenanceSchedules, ({ one, many }) => ({
  appliance: one(appliances, {
    fields: [maintenanceSchedules.applianceId],
    references: [appliances.id],
  }),
  alerts: many(maintenanceAlerts)
}));

export const maintenanceAlertsRelations = relations(maintenanceAlerts, ({ one }) => ({
  schedule: one(maintenanceSchedules, {
    fields: [maintenanceAlerts.scheduleId],
    references: [maintenanceSchedules.id],
  })
}));

// Tabela za praćenje zahteva korisnika (rate limiting)
export const requestTracking = pgTable("request_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  requestType: text("request_type").notNull(), // "service_request", "registration", etc.
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  successful: boolean("successful").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRequestTrackingSchema = createInsertSchema(requestTracking).pick({
  userId: true,
  requestType: true,
  ipAddress: true,
  userAgent: true,
  requestDate: true,
  successful: true
});

export type InsertRequestTracking = z.infer<typeof insertRequestTrackingSchema>;
export type RequestTracking = typeof requestTracking.$inferSelect;

// Tabela za anti-bot mehanizam (jednostavan matematički zadatak)
export const botVerification = pgTable("bot_verification", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  question: text("question").notNull(), // "5 + 3 = ?"
  correctAnswer: integer("correct_answer").notNull(), // 8
  userAnswer: integer("user_answer"),
  verified: boolean("verified").default(false).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Važi 10 minuta
});

export const insertBotVerificationSchema = createInsertSchema(botVerification).pick({
  sessionId: true,
  question: true,
  correctAnswer: true,
  userAnswer: true,
  verified: true,
  attempts: true,
  expiresAt: true
});

export type InsertBotVerification = z.infer<typeof insertBotVerificationSchema>;
export type BotVerification = typeof botVerification.$inferSelect;

// Tabela za email verifikaciju
export const emailVerification = pgTable("email_verification", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  verificationCode: text("verification_code").notNull(), // Nasumični kod (6 cifara)
  used: boolean("used").default(false).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Važi 15 minuta
});

export const insertEmailVerificationSchema = createInsertSchema(emailVerification).pick({
  email: true,
  verificationCode: true,
  used: true,
  attempts: true,
  expiresAt: true
});

export type InsertEmailVerification = z.infer<typeof insertEmailVerificationSchema>;
export type EmailVerification = typeof emailVerification.$inferSelect;

// Tabela za rezervne delove (spare parts orders)
export const sparePartOrders = pgTable("spare_part_orders", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id"), // Nullable for admin orders
  technicianId: integer("technician_id"), // Nullable for admin orders
  applianceId: integer("appliance_id"), // Nullable for admin orders
  partName: text("part_name").notNull(),
  partNumber: text("part_number"), // Kataloški broj dela
  quantity: integer("quantity").notNull().default(1),
  description: text("description"), // Dodatni opis potrebe
  urgency: text("urgency").notNull().default("normal"), // normal, high, urgent
  status: text("status").notNull().default("pending"), // pending, approved, ordered, received, cancelled
  warrantyStatus: text("warranty_status").notNull(), // in_warranty, out_of_warranty
  estimatedCost: text("estimated_cost"), // Procenjena cena
  actualCost: text("actual_cost"), // Stvarna cena
  supplierName: text("supplier_name"), // Dobavljač
  orderDate: timestamp("order_date"),
  expectedDelivery: timestamp("expected_delivery"),
  receivedDate: timestamp("received_date"),
  adminNotes: text("admin_notes"), // Napomene administratora
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Status enums za rezervne delove
export const sparePartUrgencyEnum = z.enum([
  "normal", // normalno
  "high", // visoko
  "urgent", // hitno
]);

export const sparePartStatusEnum = z.enum([
  "pending", // čeka odobrenje
  "approved", // odobreno
  "ordered", // poručeno
  "received", // primljeno
  "cancelled", // otkazano
]);

export const sparePartWarrantyStatusEnum = z.enum([
  "u garanciji", // in warranty
  "van garancije", // out of warranty
]);

export type SparePartUrgency = z.infer<typeof sparePartUrgencyEnum>;
export type SparePartStatus = z.infer<typeof sparePartStatusEnum>;
export type SparePartWarrantyStatus = z.infer<typeof sparePartWarrantyStatusEnum>;

export const insertSparePartOrderSchema = createInsertSchema(sparePartOrders).pick({
  serviceId: true,
  technicianId: true,
  applianceId: true,
  partName: true,
  partNumber: true,
  quantity: true,
  description: true,
  urgency: true,
  status: true,
  warrantyStatus: true,
  estimatedCost: true,
  actualCost: true,
  supplierName: true,
  orderDate: true,
  expectedDelivery: true,
  receivedDate: true,
  adminNotes: true,
}).extend({
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj").optional(),
  technicianId: z.number().int().positive("ID servisera mora biti pozitivan broj").optional(),
  applianceId: z.number().int().positive("ID uređaja mora biti pozitivan broj").optional(),
  partName: z.string().min(2, "Naziv dela mora imati najmanje 2 karaktera").max(200, "Naziv dela je predugačak"),
  partNumber: z.string().max(100, "Kataloški broj je predugačak").or(z.literal("")).optional(),
  quantity: z.number().int().positive("Količina mora biti pozitivan broj"),
  description: z.string().max(500, "Opis je predugačak").or(z.literal("")).optional(),
  urgency: sparePartUrgencyEnum.default("normal"),
  status: sparePartStatusEnum.default("pending"),
  warrantyStatus: sparePartWarrantyStatusEnum,
  estimatedCost: z.string().max(50, "Procenjena cena je predugačka").or(z.literal("")).optional(),
  actualCost: z.string().max(50, "Stvarna cena je predugačka").or(z.literal("")).optional(),
  supplierName: z.string().max(100, "Naziv dobavljača je predugačak").or(z.literal("")).optional(),
  adminNotes: z.string().max(1000, "Napomene su predugačke").or(z.literal("")).optional(),
});

export type InsertSparePartOrder = z.infer<typeof insertSparePartOrderSchema>;
export type SparePartOrder = typeof sparePartOrders.$inferSelect;

// Tabela za dostupne rezervne delove (available parts)
export const availableParts = pgTable("available_parts", {
  id: serial("id").primaryKey(),
  partName: text("part_name").notNull(),
  partNumber: text("part_number"), // Kataloški broj dela
  quantity: integer("quantity").notNull().default(1),
  description: text("description"), // Opis dela
  supplierName: text("supplier_name"), // Dobavljač
  unitCost: text("unit_cost"), // Cena po komadu
  location: text("location"), // Lokacija u skladištu
  warrantyStatus: text("warranty_status").notNull(), // u garanciji, van garancije
  categoryId: integer("category_id").references(() => applianceCategories.id), // Kategorija uređaja
  manufacturerId: integer("manufacturer_id").references(() => manufacturers.id), // Proizvođač
  originalOrderId: integer("original_order_id").references(() => sparePartOrders.id), // Originalna porudžbina
  addedDate: timestamp("added_date").defaultNow().notNull(), // Kada je deo dodati u skladište
  addedBy: integer("added_by").notNull().references(() => users.id), // Ko je dodao deo
  notes: text("notes"), // Dodatne napomene
  // Novi podaci o servisu za lakše prepoznavanje
  serviceId: integer("service_id").references(() => services.id), // Servis za koji je deo namijenjen
  clientName: text("client_name"), // Ime klijenta za lakše prepoznavanje
  clientPhone: text("client_phone"), // Telefon klijenta
  applianceInfo: text("appliance_info"), // Informacije o aparatu (brend, model, kategorija)
  serviceDescription: text("service_description"), // Opis servisa
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAvailablePartSchema = createInsertSchema(availableParts).pick({
  partName: true,
  partNumber: true,
  quantity: true,
  description: true,
  supplierName: true,
  unitCost: true,
  location: true,
  warrantyStatus: true,
  categoryId: true,
  manufacturerId: true,
  originalOrderId: true,
  addedBy: true,
  notes: true,
  serviceId: true,
  clientName: true,
  clientPhone: true,
  applianceInfo: true,
  serviceDescription: true,
}).extend({
  partName: z.string().min(2, "Naziv dela mora imati najmanje 2 karaktera").max(200, "Naziv dela je predugačak"),
  partNumber: z.string().max(100, "Kataloški broj je predugačak").or(z.literal("")).optional(),
  quantity: z.number().int().positive("Količina mora biti pozitivan broj"),
  description: z.string().max(500, "Opis je predugačak").or(z.literal("")).optional(),
  supplierName: z.string().max(100, "Naziv dobavljača je predugačak").or(z.literal("")).optional(),
  unitCost: z.string().max(50, "Cena je predugačka").or(z.literal("")).optional(),
  location: z.string().max(100, "Lokacija je predugačka").or(z.literal("")).optional(),
  warrantyStatus: sparePartWarrantyStatusEnum,
  categoryId: z.number().int().positive("ID kategorije mora biti pozitivan broj").optional(),
  manufacturerId: z.number().int().positive("ID proizvođača mora biti pozitivan broj").optional(),
  originalOrderId: z.number().int().positive("ID originalne porudžbine mora biti pozitivan broj").optional(),
  addedBy: z.number().int().positive("ID korisnika mora biti pozitivan broj"),
  notes: z.string().max(1000, "Napomene su predugačke").or(z.literal("")).optional(),
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj").optional(),
  clientName: z.string().max(200, "Ime klijenta je predugačko").or(z.literal("")).optional(),
  clientPhone: z.string().max(50, "Telefon klijenta je predugačak").or(z.literal("")).optional(),
  applianceInfo: z.string().max(300, "Informacije o aparatu su predugačke").or(z.literal("")).optional(),
  serviceDescription: z.string().max(500, "Opis servisa je predugačak").or(z.literal("")).optional(),
});

export type InsertAvailablePart = z.infer<typeof insertAvailablePartSchema>;
export type AvailablePart = typeof availableParts.$inferSelect;

// Parts Activity Log - tabela za praćenje aktivnosti rezervnih delova
export const partsActivityLog = pgTable("parts_activity_log", {
  id: serial("id").primaryKey(),
  partId: integer("part_id"),
  action: text("action").notNull(), // 'added', 'allocated', 'returned', 'consumed', 'expired'
  previousQuantity: integer("previous_quantity"),
  newQuantity: integer("new_quantity"),
  technicianId: integer("technician_id"),
  serviceId: integer("service_id"),
  userId: integer("user_id").notNull(),
  description: text("description"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertPartsActivityLogSchema = createInsertSchema(partsActivityLog).pick({
  partId: true,
  action: true,
  previousQuantity: true,
  newQuantity: true,
  technicianId: true,
  serviceId: true,
  userId: true,
  description: true,
});

export type InsertPartsActivityLog = z.infer<typeof insertPartsActivityLogSchema>;
export type PartsActivityLog = typeof partsActivityLog.$inferSelect;

// PartKeepr-compatible spare parts catalog table
export const sparePartsCatalog = pgTable("spare_parts_catalog", {
  id: serial("id").primaryKey(),
  partNumber: text("part_number").notNull().unique(), // Kataloški broj dela (primary identifier)
  partName: text("part_name").notNull(), // Naziv dela
  description: text("description"), // Detaljan opis dela
  category: text("category").notNull(), // Kategorija (washing-machine, dishwasher, oven, etc.)
  manufacturer: text("manufacturer").notNull().default("Candy"), // Proizvođač
  compatibleModels: text("compatible_models").array(), // Array kompatibilnih modela
  priceEur: text("price_eur"), // Cena u evrima
  priceGbp: text("price_gbp"), // Cena u funtama
  supplierName: text("supplier_name"), // Dobavljač
  supplierUrl: text("supplier_url"), // URL dobavljača za deo
  imageUrls: text("image_urls").array(), // Array URL-ova slika
  availability: text("availability").default("available"), // available, out_of_stock, discontinued
  stockLevel: integer("stock_level").default(0), // Količina na stanju
  minStockLevel: integer("min_stock_level").default(0), // Minimalna količina za upozorenje
  dimensions: text("dimensions"), // Dimenzije dela
  weight: text("weight"), // Težina dela
  technicalSpecs: text("technical_specs"), // Tehnički podaci u JSON formatu
  installationNotes: text("installation_notes"), // Napomene za ugradnju
  warrantyPeriod: text("warranty_period"), // Period garancije
  isOemPart: boolean("is_oem_part").default(true), // Da li je originalan deo
  alternativePartNumbers: text("alternative_part_numbers").array(), // Alternativni kataloški brojevi
  sourceType: text("source_type").default("manual"), // manual, partkeepr_import, web_scraping
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id), // Ko je kreirao zapis
});

// Category enum za spare parts catalog
export const sparePartCategoryEnum = z.enum([
  "washing-machine", // Mašina za veš
  "dishwasher", // Sudopera
  "oven", // Šporet/pećnica
  "cooker-hood", // Aspirator
  "tumble-dryer", // Sušilica
  "fridge-freezer", // Frižider/zamrzivač
  "microwave", // Mikrotalasna
  "universal", // Univerzalni delovi
]);

// Availability enum
export const sparePartAvailabilityEnum = z.enum([
  "available", // Dostupno
  "out_of_stock", // Nema na stanju
  "discontinued", // Prestalo da se proizvodi
  "special_order", // Specijalna porudžbina
]);

// Source type enum
export const sparePartSourceTypeEnum = z.enum([
  "manual", // Uneto ručno
  "partkeepr_import", // Uvezeno iz PartKeepr
  "web_scraping", // Dobijeno web scraping-om
  "supplier_api", // API dobavljača
]);

export type SparePartCategory = z.infer<typeof sparePartCategoryEnum>;
export type SparePartAvailability = z.infer<typeof sparePartAvailabilityEnum>;
export type SparePartSourceType = z.infer<typeof sparePartSourceTypeEnum>;

export const insertSparePartsCatalogSchema = createInsertSchema(sparePartsCatalog).pick({
  partNumber: true,
  partName: true,
  description: true,
  category: true,
  manufacturer: true,
  compatibleModels: true,
  priceEur: true,
  priceGbp: true,
  supplierName: true,
  supplierUrl: true,
  imageUrls: true,
  availability: true,
  stockLevel: true,
  minStockLevel: true,
  dimensions: true,
  weight: true,
  technicalSpecs: true,
  installationNotes: true,
  warrantyPeriod: true,
  isOemPart: true,
  alternativePartNumbers: true,
  sourceType: true,
  createdBy: true,
}).extend({
  partNumber: z.string().min(3, "Kataloški broj mora imati najmanje 3 karaktera").max(100, "Kataloški broj je predugačak"),
  partName: z.string().min(2, "Naziv dela mora imati najmanje 2 karaktera").max(200, "Naziv dela je predugačak"),
  description: z.string().max(1000, "Opis je predugačak").or(z.literal("")).optional(),
  category: sparePartCategoryEnum,
  manufacturer: z.string().min(2, "Naziv proizvođača mora imati najmanje 2 karaktera").max(100, "Naziv proizvođača je predugačak"),
  compatibleModels: z.array(z.string().max(100, "Model je predugačak")).max(500, "Previše kompatibilnih modela").optional(),
  priceEur: z.string().max(20, "Cena je predugačka").or(z.literal("")).optional(),
  priceGbp: z.string().max(20, "Cena je predugačka").or(z.literal("")).optional(),
  supplierName: z.string().max(100, "Naziv dobavljača je predugačak").or(z.literal("")).optional(),
  supplierUrl: z.string().url("Unesite valjan URL").or(z.literal("")).optional(),
  imageUrls: z.array(z.string().url("Unesite valjan URL za sliku")).max(20, "Previše slika").optional(),
  availability: sparePartAvailabilityEnum.default("available"),
  stockLevel: z.number().int().min(0, "Količina na stanju ne može biti negativna").optional(),
  minStockLevel: z.number().int().min(0, "Minimalna količina ne može biti negativna").optional(),
  dimensions: z.string().max(100, "Dimenzije su predugačke").or(z.literal("")).optional(),
  weight: z.string().max(50, "Težina je predugačka").or(z.literal("")).optional(),
  technicalSpecs: z.string().max(2000, "Tehnički podaci su predugački").or(z.literal("")).optional(),
  installationNotes: z.string().max(1000, "Napomene za ugradnju su predugačke").or(z.literal("")).optional(),
  warrantyPeriod: z.string().max(50, "Period garancije je predugačak").or(z.literal("")).optional(),
  isOemPart: z.boolean().default(true),
  alternativePartNumbers: z.array(z.string().max(100, "Alternativni broj je predugačak")).max(50, "Previše alternativnih brojeva").optional(),
  sourceType: sparePartSourceTypeEnum.default("manual"),
  createdBy: z.number().int().positive("ID korisnika mora biti pozitivan broj").optional(),
});

export type InsertSparePartsCatalog = z.infer<typeof insertSparePartsCatalogSchema>;
export type SparePartsCatalog = typeof sparePartsCatalog.$inferSelect;

// Parts Allocations - tabela za praćenje dodele delova serviserima
export const partsAllocations = pgTable("parts_allocations", {
  id: serial("id").primaryKey(),
  availablePartId: integer("available_part_id").notNull().references(() => availableParts.id),
  serviceId: integer("service_id").notNull().references(() => services.id),
  technicianId: integer("technician_id").notNull().references(() => users.id),
  allocatedQuantity: integer("allocated_quantity").notNull(),
  allocatedBy: integer("allocated_by").notNull().references(() => users.id), // Admin koji je dodelio
  allocationNotes: text("allocation_notes"),
  status: text("status").notNull().default("allocated"), // allocated, used, returned
  allocatedDate: timestamp("allocated_date").defaultNow().notNull(),
  usedDate: timestamp("used_date"),
  returnedDate: timestamp("returned_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPartsAllocationSchema = createInsertSchema(partsAllocations).pick({
  availablePartId: true,
  serviceId: true,
  technicianId: true,
  allocatedQuantity: true,
  allocatedBy: true,
  allocationNotes: true,
  status: true,
}).extend({
  availablePartId: z.number().int().positive("ID dostupnog dela mora biti pozitivan broj"),
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj"),
  technicianId: z.number().int().positive("ID servisera mora biti pozitivan broj"),
  allocatedQuantity: z.number().int().positive("Količina mora biti pozitivan broj"),
  allocatedBy: z.number().int().positive("ID admina mora biti pozitivan broj"),
  allocationNotes: z.string().max(500, "Napomene su predugačke").optional(),
  status: z.enum(["allocated", "used", "returned"]).default("allocated"),
});

export type InsertPartsAllocation = z.infer<typeof insertPartsAllocationSchema>;
export type PartsAllocation = typeof partsAllocations.$inferSelect;

// Dodatne relacije
export const requestTrackingRelations = relations(requestTracking, ({ one }) => ({
  user: one(users, {
    fields: [requestTracking.userId],
    references: [users.id],
  })
}));

export const sparePartOrderRelations = relations(sparePartOrders, ({ one }) => ({
  service: one(services, {
    fields: [sparePartOrders.serviceId],
    references: [services.id],
  }),
  technician: one(users, {
    fields: [sparePartOrders.technicianId],
    references: [users.id],
  }),
  appliance: one(appliances, {
    fields: [sparePartOrders.applianceId],
    references: [appliances.id],
  }),
}));

export const availablePartsRelations = relations(availableParts, ({ one }) => ({
  category: one(applianceCategories, {
    fields: [availableParts.categoryId],
    references: [applianceCategories.id],
  }),
  manufacturer: one(manufacturers, {
    fields: [availableParts.manufacturerId],
    references: [manufacturers.id],
  }),
  originalOrder: one(sparePartOrders, {
    fields: [availableParts.originalOrderId],
    references: [sparePartOrders.id],
  }),
  addedByUser: one(users, {
    fields: [availableParts.addedBy],
    references: [users.id],
  }),
}));

// Tabela za notifikacije i alarme
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // Korisnik koji prima notifikaciju
  type: text("type").notNull(), // "service_assigned", "service_created", "service_status_changed", "spare_part_ordered", "admin_spare_part_ordered"
  title: text("title").notNull(), // Naslov notifikacije
  message: text("message").notNull(), // Poruka notifikacije
  relatedServiceId: integer("related_service_id").references(() => services.id), // Povezani servis (opciono)
  relatedSparePartId: integer("related_spare_part_id").references(() => sparePartOrders.id), // Povezana spare part narudžbina (opciono)
  relatedUserId: integer("related_user_id").references(() => users.id), // Povezani korisnik (opciono)
  isRead: boolean("is_read").default(false).notNull(), // Da li je pročitana
  priority: text("priority", { enum: ["low", "normal", "high", "urgent"] }).default("normal").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"), // Kada je pročitana
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  message: true,
  relatedServiceId: true,
  relatedSparePartId: true,
  relatedUserId: true,
  isRead: true,
  priority: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Relacije za notifikacije
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  relatedService: one(services, {
    fields: [notifications.relatedServiceId],
    references: [services.id],
  }),
  relatedSparePart: one(sparePartOrders, {
    fields: [notifications.relatedSparePartId],
    references: [sparePartOrders.id],
  }),
  relatedUser: one(users, {
    fields: [notifications.relatedUserId],
    references: [users.id],
  }),
}));

// System Settings tabela - za SMS, email i ostale sistemske postavke
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // Jedinstveni ključ postavke
  value: text("value"), // Vrednost postavke
  description: text("description"), // Opis postavke
  category: text("category").default("general").notNull(), // Kategorija postavke (sms, email, general)
  isEncrypted: boolean("is_encrypted").default(false).notNull(), // Da li je vrednost šifrovana
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => users.id), // Admin koji je menjao postavku
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).pick({
  key: true,
  value: true,
  description: true,
  category: true,
  isEncrypted: true,
  updatedBy: true,
});

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

// Relacije za system settings
export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));
