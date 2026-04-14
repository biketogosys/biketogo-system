import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

// ─── Users (auth) ────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Clients ─────────────────────────────────────────────────────────────────
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),

  // Identification
  name: varchar("name", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  rg: varchar("rg", { length: 20 }),
  birthDate: varchar("birthDate", { length: 10 }),
  gender: varchar("gender", { length: 20 }),
  height: varchar("height", { length: 10 }),
  pedalFrequency: varchar("pedalFrequency", { length: 50 }),
  origin: varchar("origin", { length: 100 }),

  // Contact
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  instagram: varchar("instagram", { length: 100 }),
  accommodation: varchar("accommodation", { length: 255 }),

  // Address
  zipCode: varchar("zipCode", { length: 10 }),
  street: varchar("street", { length: 255 }),
  number: varchar("number", { length: 20 }),
  neighborhood: varchar("neighborhood", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  country: varchar("country", { length: 50 }).default("Brasil"),

  // Status & control
  status: mysqlEnum("status", ["lead", "verified", "blocked"]).default("lead").notNull(),
  receiveEmail: boolean("receiveEmail").default(true).notNull(),
  blocked: boolean("blocked").default(false).notNull(),
  expiresAt: timestamp("expiresAt"),
  notes: text("notes"),

  // Source
  source: mysqlEnum("source", ["shopify", "manual"]).default("manual").notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Client Documents ─────────────────────────────────────────────────────────
export const clientDocuments = mysqlTable("client_documents", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  type: mysqlEnum("type", ["rg_front", "rg_back", "other"]).notNull(),
  url: text("url").notNull(),
  cloudinaryPublicId: varchar("cloudinaryPublicId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClientDocument = typeof clientDocuments.$inferSelect;
export type InsertClientDocument = typeof clientDocuments.$inferInsert;

// ─── Bikes ────────────────────────────────────────────────────────────────────
export const bikes = mysqlTable("bikes", {
  id: int("id").autoincrement().primaryKey(),
  serialNumber: varchar("serialNumber", { length: 100 }).notNull().unique(),
  model: varchar("model", { length: 100 }).notNull(),
  size: varchar("size", { length: 20 }),
  color: varchar("color", { length: 50 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["available", "rented", "maintenance"]).default("available").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bike = typeof bikes.$inferSelect;
export type InsertBike = typeof bikes.$inferInsert;

// ─── Rentals ─────────────────────────────────────────────────────────────────
export const rentals = mysqlTable("rentals", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  bikeId: int("bikeId").notNull(),

  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  returnedAt: timestamp("returnedAt"),

  dailyRate: decimal("dailyRate", { precision: 10, scale: 2 }),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),

  paymentMethod: mysqlEnum("paymentMethod", ["pix", "credit_card", "debit_card", "cash", "other"]),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "partial", "refunded"]).default("pending").notNull(),

  status: mysqlEnum("status", ["active", "returned", "overdue", "cancelled"]).default("active").notNull(),

  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Rental = typeof rentals.$inferSelect;
export type InsertRental = typeof rentals.$inferInsert;

// ─── Accessories ─────────────────────────────────────────────────────────────
export const accessories = mysqlTable("accessories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  serialNumber: varchar("serialNumber", { length: 100 }),
  quantity: int("quantity").default(1).notNull(),
  dailyRate: decimal("dailyRate", { precision: 10, scale: 2 }),
  purchasePrice: decimal("purchasePrice", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["available", "rented", "maintenance", "lost"]).default("available").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Accessory = typeof accessories.$inferSelect;
export type InsertAccessory = typeof accessories.$inferInsert;
