import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").default("user").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
