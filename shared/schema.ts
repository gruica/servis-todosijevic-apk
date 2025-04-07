import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").default("user")
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true
});

// Clients
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address")
});

export const insertClientSchema = createInsertSchema(clients).pick({
  name: true,
  phone: true,
  email: true,
  address: true
});

// Appliance Types
export const applianceTypes = pgTable("appliance_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull()
});

export const insertApplianceTypeSchema = createInsertSchema(applianceTypes).pick({
  name: true
});

// Manufacturers
export const manufacturers = pgTable("manufacturers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull()
});

export const insertManufacturerSchema = createInsertSchema(manufacturers).pick({
  name: true
});

// Appliances
export const appliances = pgTable("appliances", {
  id: serial("id").primaryKey(),
  typeId: integer("type_id").notNull(),
  manufacturerId: integer("manufacturer_id").notNull(),
  model: text("model").notNull(),
  serialNumber: text("serial_number")
});

export const insertApplianceSchema = createInsertSchema(appliances).pick({
  typeId: true,
  manufacturerId: true,
  model: true,
  serialNumber: true
});

// Service Statuses
export const serviceStatuses = pgTable("service_statuses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull()
});

export const insertServiceStatusSchema = createInsertSchema(serviceStatuses).pick({
  name: true,
  color: true
});

// Services
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  serviceNumber: text("service_number").notNull(),
  clientId: integer("client_id").notNull(),
  applianceId: integer("appliance_id").notNull(),
  statusId: integer("status_id").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
});

export const insertServiceSchema = createInsertSchema(services).pick({
  serviceNumber: true,
  clientId: true,
  applianceId: true,
  statusId: true,
  description: true
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertApplianceType = z.infer<typeof insertApplianceTypeSchema>;
export type ApplianceType = typeof applianceTypes.$inferSelect;

export type InsertManufacturer = z.infer<typeof insertManufacturerSchema>;
export type Manufacturer = typeof manufacturers.$inferSelect;

export type InsertAppliance = z.infer<typeof insertApplianceSchema>;
export type Appliance = typeof appliances.$inferSelect;

export type InsertServiceStatus = z.infer<typeof insertServiceStatusSchema>;
export type ServiceStatus = typeof serviceStatuses.$inferSelect;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// Extended service type with related data
export type ServiceWithRelations = Service & {
  client: Client;
  appliance: Appliance & {
    type: ApplianceType;
    manufacturer: Manufacturer;
  };
  status: ServiceStatus;
};
