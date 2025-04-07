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
  role: text("role").default("user").notNull(),
  technicianId: integer("technician_id"), // Reference to technician if user is a technician
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  technicianId: true,
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

export const insertClientSchema = createInsertSchema(clients).pick({
  fullName: true,
  email: true,
  phone: true,
  address: true,
  city: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Appliance categories
export const applianceCategories = pgTable("appliance_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(), // Material icon name
});

export const insertApplianceCategorySchema = createInsertSchema(applianceCategories).pick({
  name: true,
  icon: true,
});

export type InsertApplianceCategory = z.infer<typeof insertApplianceCategorySchema>;
export type ApplianceCategory = typeof applianceCategories.$inferSelect;

// Manufacturers
export const manufacturers = pgTable("manufacturers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertManufacturerSchema = createInsertSchema(manufacturers).pick({
  name: true,
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

export const insertApplianceSchema = createInsertSchema(appliances).pick({
  clientId: true,
  categoryId: true,
  manufacturerId: true,
  model: true,
  serialNumber: true,
  purchaseDate: true,
  notes: true,
});

export type InsertAppliance = z.infer<typeof insertApplianceSchema>;
export type Appliance = typeof appliances.$inferSelect;

// Service status enum
export const serviceStatusEnum = z.enum([
  "pending", // čekanje
  "scheduled", // zakazano
  "in_progress", // u procesu
  "waiting_parts", // čeka delove
  "completed", // završeno
  "cancelled", // otkazano
]);

export type ServiceStatus = z.infer<typeof serviceStatusEnum>;

// Services
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  applianceId: integer("appliance_id").notNull(),
  technicianId: integer("technician_id"),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  scheduledDate: text("scheduled_date"),
  completedDate: text("completed_date"),
  technicianNotes: text("technician_notes"),
  cost: text("cost"),
});

export const insertServiceSchema = createInsertSchema(services).pick({
  clientId: true,
  applianceId: true,
  technicianId: true,
  description: true,
  status: true,
  createdAt: true,
  scheduledDate: true,
  completedDate: true,
  technicianNotes: true,
  cost: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

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

export const servicesRelations = relations(services, ({ one }) => ({
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
}));
