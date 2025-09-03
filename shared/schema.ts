import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, pgEnum, decimal } from "drizzle-orm/pg-core";
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
    .regex(/^[+]?[\d\s()/-]{6,25}$/, "Broj telefona mora sadržati samo brojeve, razmake i znakove +()/-"),
  address: z.string().min(3, "Adresa mora imati najmanje 3 karaktera").or(z.literal("")).optional(),
  city: z.string().min(2, "Grad mora imati najmanje 2 karaktera").or(z.literal("")).optional(),
  notes: z.string().optional(),
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
  "delivered", // isporučen aparat klijentu
  "device_returned", // aparat vraćen
  "cancelled", // otkazano
  "client_not_home", // klijent nije kući
  "client_not_answering", // klijent se ne javlja
  "customer_refuses_repair", // kupac odbija popravku
  "customer_refused_repair", // kupac je odbio popravku (zatvoreno)
  "repair_failed", // servis neuspešan - aparat nije popravljen
]);

export type ServiceStatus = z.infer<typeof serviceStatusEnum>;

// Warranty status enum
export const warrantyStatusEnum = z.enum([
  "u garanciji", // u garanciji
  "van garancije", // van garancije
  "nepoznato", // nepoznato - mora se later ažurirati
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
  repairFailed: boolean("repair_failed").default(false), // Da li je servis neuspešan
  repairFailureReason: text("repair_failure_reason"), // Detaljan razlog neuspešnog servisa
  replacedPartsBeforeFailure: text("replaced_parts_before_failure"), // Delovi zamenjeni pre neuspešnog servisa
  repairFailureDate: text("repair_failure_date"), // Datum konstatovanja neuspešnog servisa
  isWarrantyService: boolean("is_warranty_service").default(false), // Da li je garantni servis (za lakše filtriranje)
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
  repairFailed: true,
  repairFailureReason: true,
  replacedPartsBeforeFailure: true,
  repairFailureDate: true,
  isWarrantyService: true,
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

// Service Photos
export const servicePhotos = pgTable("service_photos", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  photoPath: text("photo_path").notNull(), // Object storage path
  description: text("description"),
  uploadedBy: integer("uploaded_by").notNull(), // User/Technician ID
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  isBeforeRepair: boolean("is_before_repair").default(true), // true = pre kola servis, false = posle servisa
  category: text("category").default("general"), // "general", "parts", "damage", "repair_progress"
});

export const insertServicePhotoSchema = createInsertSchema(servicePhotos).pick({
  serviceId: true,
  photoPath: true,
  description: true,
  uploadedBy: true,
  isBeforeRepair: true,
  category: true,
}).extend({
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj"),
  photoPath: z.string().min(1, "Putanja fotografije je obavezna"),
  description: z.string().max(500, "Opis ne može biti duži od 500 karaktera").optional(),
  uploadedBy: z.number().int().positive("ID korisnika mora biti pozitivan broj"),
  isBeforeRepair: z.boolean().default(true),
  category: z.enum(["general", "parts", "damage", "repair_progress"]).default("general"),
});

export type InsertServicePhoto = z.infer<typeof insertServicePhotoSchema>;
export type ServicePhoto = typeof servicePhotos.$inferSelect;

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
  businessPartner: one(users, {
    fields: [services.businessPartnerId],
    references: [users.id],
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

// Email Management Tables
export const emailAccounts = pgTable("email_accounts", {
  id: serial("id").primaryKey(),
  accountName: text("account_name").notNull(), // Naziv naloga (npr. "Glavni servis email")
  email: text("email").notNull(), // Email adresa
  smtpHost: text("smtp_host").notNull(), // SMTP server
  smtpPort: integer("smtp_port").notNull(), // SMTP port
  smtpSecure: boolean("smtp_secure").default(true).notNull(), // SSL/TLS
  smtpUser: text("smtp_user").notNull(), // SMTP korisničko ime
  smtpPassword: text("smtp_password").notNull(), // SMTP lozinka
  imapHost: text("imap_host").notNull(), // IMAP server
  imapPort: integer("imap_port").notNull(), // IMAP port
  imapSecure: boolean("imap_secure").default(true).notNull(), // SSL/TLS za IMAP
  imapUser: text("imap_user").notNull(), // IMAP korisničko ime
  imapPassword: text("imap_password").notNull(), // IMAP lozinka
  isActive: boolean("is_active").default(true).notNull(), // Da li je nalog aktivan
  lastSyncedAt: timestamp("last_synced_at"), // Poslednji put sincronizovano
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(), // Ko je kreirao nalog
});

export const emailMessages = pgTable("email_messages", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(), // ID email naloga
  messageId: text("message_id").notNull(), // Jedinstveni ID poruke
  subject: text("subject").notNull(), // Naslov poruke
  fromAddress: text("from_address").notNull(), // Pošaljalac
  toAddresses: text("to_addresses").notNull(), // Primaoci (JSON array)
  ccAddresses: text("cc_addresses"), // CC primaoci (JSON array)
  bccAddresses: text("bcc_addresses"), // BCC primaoci (JSON array)
  bodyText: text("body_text"), // Tekstualni sadržaj
  bodyHtml: text("body_html"), // HTML sadržaj
  attachments: text("attachments"), // Lista priloga (JSON array)
  direction: text("direction").notNull(), // "incoming" ili "outgoing"
  status: text("status").default("unread").notNull(), // "unread", "read", "replied", "forwarded", "archived"
  priority: text("priority").default("normal").notNull(), // "low", "normal", "high"
  isImportant: boolean("is_important").default(false).notNull(),
  relatedServiceId: integer("related_service_id"), // Povezan servis (opciono)
  relatedClientId: integer("related_client_id"), // Povezan klijent (opciono)
  tags: text("tags"), // Tagovi (JSON array)
  receivedAt: timestamp("received_at").notNull(), // Kada je poruka primljena/poslata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"), // Kada je poruka pročitana
  repliedAt: timestamp("replied_at"), // Kada je odgovoreno
});

export const emailThreads = pgTable("email_threads", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(), // Originalni subject
  participants: text("participants").notNull(), // Lista učesnika (JSON array)
  lastMessageAt: timestamp("last_message_at").notNull(),
  messageCount: integer("message_count").default(1).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  relatedServiceId: integer("related_service_id"), // Povezan servis
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailAttachments = pgTable("email_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(), // ID email poruke
  fileName: text("file_name").notNull(), // Naziv fajla
  mimeType: text("mime_type").notNull(), // Tip fajla
  fileSize: integer("file_size").notNull(), // Veličina u bajtovima
  filePath: text("file_path").notNull(), // Put do fajla na serveru
  downloadUrl: text("download_url"), // URL za preuzimanje
  isInline: boolean("is_inline").default(false).notNull(), // Da li je inline slika
  contentId: text("content_id"), // Content-ID za inline slike
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Email schema validacije
export const insertEmailAccountSchema = createInsertSchema(emailAccounts).pick({
  accountName: true,
  email: true,
  smtpHost: true,
  smtpPort: true,
  smtpSecure: true,
  smtpUser: true,
  smtpPassword: true,
  imapHost: true,
  imapPort: true,
  imapSecure: true,
  imapUser: true,
  imapPassword: true,
  isActive: true,
  createdBy: true,
}).extend({
  accountName: z.string().min(3, "Naziv naloga mora imati najmanje 3 karaktera").max(100, "Naziv je predugačak"),
  email: z.string().email("Unesite validnu email adresu"),
  smtpHost: z.string().min(3, "SMTP host mora imati najmanje 3 karaktera"),
  smtpPort: z.number().int().min(1).max(65535, "Port mora biti između 1 i 65535"),
  smtpUser: z.string().min(1, "SMTP korisničko ime je obavezno"),
  smtpPassword: z.string().min(1, "SMTP lozinka je obavezna"),
  imapHost: z.string().min(3, "IMAP host mora imati najmanje 3 karaktera"),
  imapPort: z.number().int().min(1).max(65535, "Port mora biti između 1 i 65535"),
  imapUser: z.string().min(1, "IMAP korisničko ime je obavezno"),
  imapPassword: z.string().min(1, "IMAP lozinka je obavezna"),
  createdBy: z.number().int().positive("ID kreatora mora biti pozitivan broj"),
});

export const insertEmailMessageSchema = createInsertSchema(emailMessages).pick({
  accountId: true,
  messageId: true,
  subject: true,
  fromAddress: true,
  toAddresses: true,
  ccAddresses: true,
  bccAddresses: true,
  bodyText: true,
  bodyHtml: true,
  attachments: true,
  direction: true,
  status: true,
  priority: true,
  isImportant: true,
  relatedServiceId: true,
  relatedClientId: true,
  tags: true,
  receivedAt: true,
}).extend({
  accountId: z.number().int().positive("ID naloga mora biti pozitivan broj"),
  messageId: z.string().min(1, "ID poruke je obavezan"),
  subject: z.string().min(1, "Naslov poruke je obavezan").max(255, "Naslov je predugačak"),
  fromAddress: z.string().email("Pošaljalac mora biti validna email adresa"),
  toAddresses: z.string().min(1, "Primaoci su obavezni"),
  direction: z.enum(["incoming", "outgoing"]),
  status: z.enum(["unread", "read", "replied", "forwarded", "archived"]).default("unread"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  receivedAt: z.date(),
});

export type InsertEmailAccount = z.infer<typeof insertEmailAccountSchema>;
export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type EmailThread = typeof emailThreads.$inferSelect;
export type EmailAttachment = typeof emailAttachments.$inferSelect;

// Email Relations
export const emailAccountsRelations = relations(emailAccounts, ({ many, one }) => ({
  messages: many(emailMessages),
  creator: one(users, {
    fields: [emailAccounts.createdBy],
    references: [users.id],
  }),
}));

export const emailMessagesRelations = relations(emailMessages, ({ one, many }) => ({
  account: one(emailAccounts, {
    fields: [emailMessages.accountId],
    references: [emailAccounts.id],
  }),
  relatedService: one(services, {
    fields: [emailMessages.relatedServiceId],
    references: [services.id],
  }),
  relatedClient: one(clients, {
    fields: [emailMessages.relatedClientId],
    references: [clients.id],
  }),
  attachments: many(emailAttachments),
}));

export const emailAttachmentsRelations = relations(emailAttachments, ({ one }) => ({
  message: one(emailMessages, {
    fields: [emailAttachments.messageId],
    references: [emailMessages.id],
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

// Tabela za upravljanje dobavljačima rezervnih delova
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  website: text("website"),
  apiEndpoint: text("api_endpoint"), // Za API integraciju
  apiKey: text("api_key"), // Enkriptovano
  supportedBrands: text("supported_brands"), // JSON array brendova
  integrationMethod: text("integration_method", { 
    enum: ["email", "api", "fax", "manual"] 
  }).default("email").notNull(),
  paymentTerms: text("payment_terms"), // Net 30, Net 15, itd.
  deliveryInfo: text("delivery_info"),
  contactPerson: text("contact_person"),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(5).notNull(), // 1-10, veći broj = viši prioritet
  averageDeliveryDays: integer("average_delivery_days").default(7),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabela za automatsko slanje porudžbina dobavljačima
export const supplierOrders = pgTable("supplier_orders", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id),
  sparePartOrderId: integer("spare_part_order_id").notNull().references(() => sparePartOrders.id),
  orderNumber: text("order_number"), // Broj porudžbine od dobavljača
  status: text("status", {
    enum: ["pending", "sent", "confirmed", "shipped", "delivered", "cancelled"]
  }).default("pending").notNull(),
  sentAt: timestamp("sent_at"),
  confirmedAt: timestamp("confirmed_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  trackingNumber: text("tracking_number"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  currency: text("currency").default("EUR"),
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  emailContent: text("email_content"), // Sačuvani sadržaj poslatog email-a
  supplierResponse: text("supplier_response"), // Odgovor dobavljača
  autoRetryCount: integer("auto_retry_count").default(0),
  lastRetryAt: timestamp("last_retry_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  "pending", // čeka odobrenje (legacy)
  "approved", // odobreno (legacy)
  "ordered", // poručeno (legacy)
  "received", // primljeno (legacy)
  "delivered", // isporučeno i potvrđeno (legacy)
  "cancelled", // otkazano
  "removed_from_ordering", // uklonjen iz sistema poručivanja (legacy)
  
  // ===== NOVI OPTIMIZOVANI WORKFLOW =====
  "requested", // zahtev servisera za rezervni deo
  "admin_ordered", // administrator je poručio deo
  "waiting_delivery", // na čekanju dostave od dobavljača
  "available", // dostupno u magacinu za izdavanje
  "consumed" // potrošeno/iskorišeno od strane servisera
]);

export const sparePartWarrantyStatusEnum = z.enum([
  "u garanciji", // in warranty
  "van garancije", // out of warranty
]);

export const sparePartRequesterTypeEnum = z.enum([
  "admin", // administrattor je kreirao zahtev
  "technician", // serviser je kreirao zahtev
]);

export type SparePartUrgency = z.infer<typeof sparePartUrgencyEnum>;
export type SparePartStatus = z.infer<typeof sparePartStatusEnum>;
export type SparePartWarrantyStatus = z.infer<typeof sparePartWarrantyStatusEnum>;
export type SparePartRequesterType = z.infer<typeof sparePartRequesterTypeEnum>;

// Tabela za detaljno dokumentovanje završenih servisa
export const serviceCompletionReports = pgTable('service_completion_reports', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id').notNull().references(() => services.id),
  technicianId: integer('technician_id').notNull().references(() => technicians.id),
  workDescription: text('work_description').notNull(), // Detaljni opis izvršenih radova
  problemDiagnosis: text('problem_diagnosis').notNull(), // Dijagnoza problema
  solutionDescription: text('solution_description').notNull(), // Opis primenjenog rešenja
  warrantyStatus: text('warranty_status').notNull(), // 'u_garanciji', 'van_garancije'
  warrantyPeriod: text('warranty_period'), // Garancijski period za izvršene radove
  usedSpareParts: text('used_spare_parts').default('[]'), // Lista korišćenih rezervnih delova kao JSON string
  laborTime: integer('labor_time'), // Vreme rada u minutima
  totalCost: text('total_cost'), // Ukupna cena servisa
  clientSatisfaction: integer('client_satisfaction'), // Ocena zadovoljstva 1-5
  additionalNotes: text('additional_notes'), // Dodatne napomene
  techniciansSignature: text('technicians_signature'), // Digitalni potpis servisera
  photosBeforeWork: text('photos_before_work').default('[]'), // Fotografije pre rada kao JSON string
  photosAfterWork: text('photos_after_work').default('[]'), // Fotografije posle rada kao JSON string
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Schema za kreiranje izveštaja o završetku servisa
export const insertServiceCompletionReportSchema = z.object({
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj"),
  workDescription: z.string().min(10, "Opis rada mora biti detaljniji (min 10 karaktera)").max(1000, "Opis rada je predugačak"),
  problemDiagnosis: z.string().min(10, "Dijagnoza mora biti detaljnija (min 10 karaktera)").max(500, "Dijagnoza je predugačka"),
  solutionDescription: z.string().min(10, "Opis rešenja mora biti detaljniji (min 10 karaktera)").max(500, "Opis rešenja je predugačak"),
  warrantyStatus: z.enum(["u_garanciji", "van_garancije"]),
  warrantyPeriod: z.string().max(50, "Garancijski period je predugačak").optional(),
  usedSpareParts: z.string().default('[]'),
  laborTime: z.number().int().min(1, "Vreme rada mora biti najmanje 1 minut").max(1440, "Vreme rada ne može biti više od 24 sata").optional(),
  totalCost: z.string().max(20, "Cena je predugačka").optional(),
  clientSatisfaction: z.number().int().min(1, "Ocena mora biti između 1 i 5").max(5, "Ocena mora biti između 1 i 5").optional(),
  additionalNotes: z.string().max(1000, "Dodatne napomene su predugačke").optional(),
  techniciansSignature: z.string().max(100, "Potpis je predugačak").optional(),
  photosBeforeWork: z.string().default('[]'),
  photosAfterWork: z.string().default('[]'),
});

export type InsertServiceCompletionReport = z.infer<typeof insertServiceCompletionReportSchema>;
export type ServiceCompletionReport = typeof serviceCompletionReports.$inferSelect;

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
  requesterType: true,
  requesterUserId: true,
  requesterName: true,
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
  isDelivered: z.boolean().default(false).optional(),
  deliveryConfirmedBy: z.number().int().positive().optional(),
  autoRemoveAfterDelivery: z.boolean().default(true).optional(),
  requesterType: sparePartRequesterTypeEnum.optional(),
  requesterUserId: z.number().int().positive("ID korisnika mora biti pozitivan broj").optional(),
  requesterName: z.string().max(100, "Ime korisnika je predugačko").or(z.literal("")).optional(),
});

export type InsertSparePartOrder = z.infer<typeof insertSparePartOrderSchema>;
export type SparePartOrder = typeof sparePartOrders.$inferSelect;

// Tabela za dostupne rezervne delove (available parts)
export const messageTypeEnum = pgEnum("message_type", ["inquiry", "complaint", "request", "update", "urgent"]);
export const messageStatusEnum = pgEnum("message_status", ["unread", "read", "replied", "archived"]);
export const messagePriorityEnum = pgEnum("message_priority", ["low", "normal", "high", "urgent"]);

export const businessPartnerMessages = pgTable("business_partner_messages", {
  id: serial("id").primaryKey(),
  businessPartnerId: integer("business_partner_id").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  messageType: messageTypeEnum("message_type").notNull(),
  priority: messagePriorityEnum("priority").notNull().default('normal'),
  status: messageStatusEnum("status").notNull().default('unread'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isStarred: boolean("is_starred").default(false).notNull(),
  
  // Sender information
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  senderCompany: text("sender_company").notNull(),
  senderPhone: text("sender_phone"),
  
  // Related data
  relatedServiceId: integer("related_service_id"),
  relatedClientName: text("related_client_name"),
  attachments: text("attachments").array(),
  
  // Admin response
  adminResponse: text("admin_response"),
  adminRespondedAt: timestamp("admin_responded_at"),
  adminRespondedBy: text("admin_responded_by"),
});

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

// Web scraping sources table
export const webScrapingSources = pgTable("web_scraping_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // Naziv izvora (Quinnspares, eSpares, etc.)
  baseUrl: text("base_url").notNull(), // Osnovna URL adresa
  isActive: boolean("is_active").default(true).notNull(), // Da li je aktivan za scraping
  lastScrapeDate: timestamp("last_scrape_date"), // Poslednji put kad je scrape-ovan
  totalPartsScraped: integer("total_parts_scraped").default(0), // Ukupno delova scraped
  successfulScrapes: integer("successful_scrapes").default(0), // Uspešni scrape-ovi
  failedScrapes: integer("failed_scrapes").default(0), // Neuspešni scrape-ovi
  averageResponseTime: integer("average_response_time").default(0), // Prosečno vreme odgovora (ms)
  scrapingConfig: text("scraping_config"), // JSON konfiguracija za scraping
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Web scraping logs table
export const webScrapingLogs = pgTable("web_scraping_logs", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => webScrapingSources.id),
  status: text("status").notNull(), // started, completed, failed, partial
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  totalPages: integer("total_pages").default(0), // Ukupno stranica processed
  processedPages: integer("processed_pages").default(0), // Uspešno processed stranice
  newParts: integer("new_parts").default(0), // Novi delovi dodati
  updatedParts: integer("updated_parts").default(0), // Ažurirani postojeći delovi
  errors: text("errors"), // JSON niz grešaka
  duration: integer("duration").default(0), // Vreme izvršavanja u sekundama
  createdBy: integer("created_by").references(() => users.id), // Ko je pokrenuo scraping
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Web scraping queue table
export const webScrapingQueue = pgTable("web_scraping_queue", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => webScrapingSources.id),
  priority: integer("priority").default(1), // 1=low, 2=medium, 3=high
  status: text("status").default("pending"), // pending, processing, completed, failed
  scheduledTime: timestamp("scheduled_time").defaultNow().notNull(),
  maxPages: integer("max_pages").default(100), // Maksimalno stranica za scrape
  targetCategories: text("target_categories").array(), // Kategorije za scrape
  targetManufacturers: text("target_manufacturers").array(), // Proizvođači za scrape
  createdBy: integer("created_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

// Supplier schema types
export const insertSupplierSchema = createInsertSchema(suppliers).pick({
  name: true,
  companyName: true,
  email: true,
  phone: true,
  address: true,
  website: true,
  apiEndpoint: true,
  apiKey: true,
  supportedBrands: true,
  integrationMethod: true,
  paymentTerms: true,
  deliveryInfo: true,
  contactPerson: true,
  isActive: true,
  priority: true,
  averageDeliveryDays: true,
  notes: true,
}).extend({
  name: z.string().min(2, "Naziv mora imati najmanje 2 karaktera").max(100),
  companyName: z.string().min(2, "Naziv kompanije mora imati najmanje 2 karaktera").max(200),
  email: z.string().email("Neispravna email adresa"),
  phone: z.string().max(50).optional(),
  website: z.string().url("Neispravna URL adresa").optional(),
  integrationMethod: z.enum(["email", "api", "fax", "manual"]).default("email"),
  priority: z.number().int().min(1).max(10).default(5),
  averageDeliveryDays: z.number().int().min(1).max(365).default(7),
});

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// Supplier Orders schema types
export const insertSupplierOrderSchema = createInsertSchema(supplierOrders).pick({
  supplierId: true,
  sparePartOrderId: true,
  orderNumber: true,
  status: true,
  trackingNumber: true,
  totalCost: true,
  currency: true,
  estimatedDelivery: true,
  emailContent: true,
  supplierResponse: true,
}).extend({
  supplierId: z.number().int().positive("ID dobavljača mora biti pozitivan broj"),
  sparePartOrderId: z.number().int().positive("ID porudžbine mora biti pozitivan broj"),
  status: z.enum(["pending", "sent", "confirmed", "shipped", "delivered", "cancelled"]).default("pending"),
  currency: z.string().default("EUR"),
});

export type InsertSupplierOrder = z.infer<typeof insertSupplierOrderSchema>;
export type SupplierOrder = typeof supplierOrders.$inferSelect;

// Supplier relacije
export const suppliersRelations = relations(suppliers, ({ many }) => ({
  orders: many(supplierOrders),
}));

export const supplierOrdersRelations = relations(supplierOrders, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierOrders.supplierId],
    references: [suppliers.id],
  }),
  sparePartOrder: one(sparePartOrders, {
    fields: [supplierOrders.sparePartOrderId],
    references: [sparePartOrders.id],
  }),
}));

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

// Parts Catalog tabela - master katalog svih dostupnih rezervnih delova
export const partsCatalog = pgTable("parts_catalog", {
  id: serial("id").primaryKey(),
  partNumber: text("part_number").notNull().unique(), // Originalni broj dela
  partName: text("part_name").notNull(), // Naziv dela
  description: text("description"), // Detaljan opis
  category: text("category").notNull(), // washing-machine, tumble-dryer, oven, fridge-freezer, microwave, dishwasher, cooker-hood
  manufacturerId: integer("manufacturer_id").notNull().references(() => manufacturers.id),
  compatibleModels: text("compatible_models"), // JSON array sa kompatibilnim modelima
  priceEur: decimal("price_eur", { precision: 10, scale: 2 }), // Cena u EUR
  priceGbp: decimal("price_gbp", { precision: 10, scale: 2 }), // Cena u GBP
  supplierName: text("supplier_name"), // Naziv dobavljača
  supplierUrl: text("supplier_url"), // URL dobavljača
  imageUrls: text("image_urls"), // JSON array sa linkovima slika
  availability: text("availability", { enum: ["available", "out_of_stock", "discontinued", "on_order"] }).default("available").notNull(),
  stockLevel: integer("stock_level").default(0).notNull(), // Trenutno stanje zaliha
  minStockLevel: integer("min_stock_level").default(0).notNull(), // Minimalno stanje zaliha
  dimensions: text("dimensions"), // Dimenzije dela
  weight: text("weight"), // Težina dela
  technicalSpecs: text("technical_specs"), // Tehnične specifikacije
  installationNotes: text("installation_notes"), // Napomene za instalaciju
  warrantyPeriod: text("warranty_period"), // Period garancije
  isOemPart: boolean("is_oem_part").default(true).notNull(), // Da li je originalni deo
  alternativePartNumbers: text("alternative_part_numbers"), // JSON array sa alternativnim brojevima
  sourceType: text("source_type", { enum: ["manual", "import", "api", "scraping"] }).default("manual").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPartsCatalogSchema = createInsertSchema(partsCatalog).pick({
  partNumber: true,
  partName: true,
  description: true,
  category: true,
  manufacturerId: true,
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
  isActive: true,
});

export type InsertPartsCatalog = z.infer<typeof insertPartsCatalogSchema>;
export type PartsCatalog = typeof partsCatalog.$inferSelect;

// Relacije za parts catalog
export const partsCatalogRelations = relations(partsCatalog, ({ one }) => ({
  manufacturer: one(manufacturers, {
    fields: [partsCatalog.manufacturerId],
    references: [manufacturers.id],
  }),
}));

// AI Prediktivno održavanje - Tabela za obrasce održavanja
export const maintenancePatterns = pgTable("maintenance_patterns", {
  id: serial("id").primaryKey(),
  applianceCategoryId: integer("appliance_category_id").notNull(),
  manufacturerId: integer("manufacturer_id"),
  averageServiceInterval: integer("average_service_interval"), // Prosečan interval servisa u danima
  commonFailurePoints: text("common_failure_points").array(), // Česti delovi koji se kvare
  seasonalFactors: text("seasonal_factors"), // JSON sa sezonskim faktorima
  usagePatterns: text("usage_patterns"), // JSON sa obrascima korišćenja
  analysisData: text("analysis_data"), // JSON sa detaljnim podacima analize
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }), // Score pouzdanosti od 0 do 100
  lastAnalysis: timestamp("last_analysis").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMaintenancePatternsSchema = createInsertSchema(maintenancePatterns).pick({
  applianceCategoryId: true,
  manufacturerId: true,
  averageServiceInterval: true,
  commonFailurePoints: true,
  seasonalFactors: true,
  usagePatterns: true,
  analysisData: true,
  confidenceScore: true,
});

export type InsertMaintenancePatterns = z.infer<typeof insertMaintenancePatternsSchema>;
export type MaintenancePatterns = typeof maintenancePatterns.$inferSelect;

// AI Prediktivno održavanje - Tabela za prediktivne uvide
export const predictiveInsights = pgTable("predictive_insights", {
  id: serial("id").primaryKey(),
  applianceId: integer("appliance_id").notNull(),
  clientId: integer("client_id").notNull(),
  predictedMaintenanceDate: timestamp("predicted_maintenance_date"),
  riskLevel: text("risk_level"), // low, medium, high, critical
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }), // Score od 0 do 100
  predictedFailures: text("predicted_failures").array(), // Lista mogućih kvarova
  recommendedActions: text("recommended_actions").array(), // Lista preporučenih akcija
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }), // Procenjena cena intervencije
  confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }), // Nivo pouzdanosti predviđanja
  factors: text("factors"), // JSON sa faktorima koji utiču na predviđanje
  lastServiceDate: timestamp("last_service_date"),
  nextReviewDate: timestamp("next_review_date"),
  isActive: boolean("is_active").default(true).notNull(),
  notificationSent: boolean("notification_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPredictiveInsightsSchema = createInsertSchema(predictiveInsights).pick({
  applianceId: true,
  clientId: true,
  predictedMaintenanceDate: true,
  riskLevel: true,
  riskScore: true,
  predictedFailures: true,
  recommendedActions: true,
  estimatedCost: true,
  confidenceLevel: true,
  factors: true,
  lastServiceDate: true,
  nextReviewDate: true,
  isActive: true,
});

export type InsertPredictiveInsights = z.infer<typeof insertPredictiveInsightsSchema>;
export type PredictiveInsights = typeof predictiveInsights.$inferSelect;

// AI Analiza rezultata - Tabela za čuvanje AI analiza
export const aiAnalysisResults = pgTable("ai_analysis_results", {
  id: serial("id").primaryKey(),
  analysisType: text("analysis_type").notNull(), // 'predictive_maintenance', 'failure_analysis', 'cost_optimization'
  applianceId: integer("appliance_id"),
  clientId: integer("client_id"),
  analysisInput: text("analysis_input"), // JSON sa ulaznim podacima
  analysisOutput: text("analysis_output"), // JSON sa rezultatima analize
  insights: text("insights").array(), // Lista ključnih uvida
  recommendations: text("recommendations").array(), // Lista preporuka
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }), // Tačnost analize
  processingTime: integer("processing_time"), // Vreme obrade u milisekundama
  dataPoints: integer("data_points"), // Broj korišćenih podataka za analizu
  modelVersion: text("model_version"), // Verzija AI modela
  isSuccessful: boolean("is_successful").default(true).notNull(),
  errorMessage: text("error_message"), // Poruka o grešci ako analiza nije uspešna
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiAnalysisResultsSchema = createInsertSchema(aiAnalysisResults).pick({
  analysisType: true,
  applianceId: true,
  clientId: true,
  analysisInput: true,
  analysisOutput: true,
  insights: true,
  recommendations: true,
  accuracy: true,
  processingTime: true,
  dataPoints: true,
  modelVersion: true,
  isSuccessful: true,
  errorMessage: true,
});

export type InsertAiAnalysisResults = z.infer<typeof insertAiAnalysisResultsSchema>;
export type AiAnalysisResults = typeof aiAnalysisResults.$inferSelect;

// Relacije za prediktivno održavanje
export const maintenancePatternsRelations = relations(maintenancePatterns, ({ one }) => ({
  applianceCategory: one(applianceCategories, {
    fields: [maintenancePatterns.applianceCategoryId],
    references: [applianceCategories.id],
  }),
  manufacturer: one(manufacturers, {
    fields: [maintenancePatterns.manufacturerId],
    references: [manufacturers.id],
  }),
}));

export const predictiveInsightsRelations = relations(predictiveInsights, ({ one }) => ({
  appliance: one(appliances, {
    fields: [predictiveInsights.applianceId],
    references: [appliances.id],
  }),
  client: one(clients, {
    fields: [predictiveInsights.clientId],
    references: [clients.id],
  }),
}));

export const aiAnalysisResultsRelations = relations(aiAnalysisResults, ({ one }) => ({
  appliance: one(appliances, {
    fields: [aiAnalysisResults.applianceId],
    references: [appliances.id],
  }),
  client: one(clients, {
    fields: [aiAnalysisResults.clientId],
    references: [clients.id],
  }),
}));

// ============================================================================
// CONVERSATION MESSAGES - WhatsApp/SMS COMMUNICATION HISTORY  
// ============================================================================

// Enum-i za conversation messages (novo - bez konflikta sa postojećim)
export const conversationMessageTypeEnum = pgEnum("conversation_message_type", ["whatsapp", "sms", "auto"]);
export const conversationMessageDirectionEnum = pgEnum("conversation_message_direction", ["outgoing", "incoming"]);
export const conversationDeliveryStatusEnum = pgEnum("conversation_delivery_status", ["sent", "delivered", "failed", "pending"]);

// Tabela za conversation messages - WhatsApp i SMS komunikacija
export const conversationMessages = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  senderId: integer("sender_id").notNull().references(() => users.id), // Korisnik koji šalje poruku
  recipientPhone: text("recipient_phone").notNull(), // Formatiran broj telefona primaoca
  messageType: conversationMessageTypeEnum("message_type").notNull(), // whatsapp, sms, auto
  messageContent: text("message_content").notNull(), // Sadržaj poruke
  mediaUrl: text("media_url"), // Opciono - URL slike ili media fajla
  messageDirection: conversationMessageDirectionEnum("message_direction").notNull().default('outgoing'), // outgoing ili incoming
  sentAt: timestamp("sent_at").defaultNow().notNull(), // Vreme slanja
  deliveryStatus: conversationDeliveryStatusEnum("delivery_status").notNull().default('pending'), // sent, delivered, failed, pending
  messageId: text("message_id"), // ID poruke iz SMS Mobile API response
  relatedUserId: integer("related_user_id").references(() => users.id), // Povezani korisnik (opciono)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Validation schema za conversation messages
export const insertConversationMessageSchema = createInsertSchema(conversationMessages).pick({
  serviceId: true,
  senderId: true,
  recipientPhone: true,
  messageType: true,
  messageContent: true,
  mediaUrl: true,
  messageDirection: true,
  deliveryStatus: true,
  messageId: true,
  relatedUserId: true,
}).extend({
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj"),
  senderId: z.number().int().positive("ID pošaljaoca mora biti pozitivan broj"),
  recipientPhone: z.string().min(8, "Broj telefona mora imati najmanje 8 karaktera").max(20, "Broj telefona je predugačak"),
  messageType: z.enum(["whatsapp", "sms", "auto"]),
  messageContent: z.string().min(1, "Sadržaj poruke je obavezan").max(2000, "Poruka je predugačka"),
  mediaUrl: z.string().url("URL mora biti validan").or(z.literal("")).nullable().optional(),
  messageDirection: z.enum(["outgoing", "incoming"]).default("outgoing"),
  deliveryStatus: z.enum(["sent", "delivered", "failed", "pending"]).default("pending"),
  messageId: z.string().max(100, "ID poruke je predugačak").or(z.literal("")).nullable().optional(),
  relatedUserId: z.number().int().positive("ID povezanog korisnika mora biti pozitivan broj").nullable().optional(),
});

export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;
export type ConversationMessage = typeof conversationMessages.$inferSelect;

// Relations za conversation messages
export const conversationMessagesRelations = relations(conversationMessages, ({ one }) => ({
  service: one(services, {
    fields: [conversationMessages.serviceId],
    references: [services.id],
  }),
  sender: one(users, {
    fields: [conversationMessages.senderId],
    references: [users.id],
  }),
  relatedUser: one(users, {
    fields: [conversationMessages.relatedUserId],
    references: [users.id],
  }),
}));

// Data deletion requests table - GDPR compliance
export const dataDeletionRequests = pgTable("data_deletion_requests", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  reason: text("reason"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  status: text("status").default("pending").notNull(), // pending, approved, rejected, completed
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"), // admin user ID
  adminNotes: text("admin_notes"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const insertDataDeletionRequestSchema = createInsertSchema(dataDeletionRequests).pick({
  email: true,
  fullName: true,
  phone: true,
  reason: true,
  ipAddress: true,
  userAgent: true,
}).extend({
  email: z.string().email("Unesite validnu email adresu").min(1, "Email adresa je obavezna"),
  fullName: z.string().min(2, "Ime i prezime mora imati najmanje 2 karaktera").max(100, "Ime i prezime je predugačko"),
  phone: z.string().min(6, "Broj telefona mora imati najmanje 6 brojeva")
    .regex(/^[+]?[\d\s()-]{6,20}$/, "Broj telefona mora sadržati samo brojeve, razmake i znakove +()-")
    .or(z.literal("")).optional(),
  reason: z.string().max(500, "Razlog je predugačak").optional(),
});

export type InsertDataDeletionRequest = z.infer<typeof insertDataDeletionRequestSchema>;
export type DataDeletionRequest = typeof dataDeletionRequests.$inferSelect;


