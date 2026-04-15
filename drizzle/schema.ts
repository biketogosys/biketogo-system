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
  json,
} from "drizzle-orm/mysql-core";

// ─── Users (Manus auth — kept for backward compat) ──────────────────────────
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

// ─── Admin Users (sistema próprio email+senha) ──────────────────────────────
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "operator"]).default("operator").notNull(),
  active: boolean("active").default(true).notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

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
  brand: varchar("brand", { length: 100 }),
  category: mysqlEnum("category", ["mtb", "speed", "gravel"]),
  size: varchar("size", { length: 50 }),
  color: varchar("color", { length: 50 }),
  description: text("description"),
  weight: varchar("weight", { length: 20 }),
  weightLimit: varchar("weightLimit", { length: 20 }),
  dailyRate: decimal("dailyRate", { precision: 10, scale: 2 }),
  photoUrl: text("photoUrl"),
  quantity: int("quantity").default(1).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["available", "rented", "maintenance"]).default("available").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bike = typeof bikes.$inferSelect;
export type InsertBike = typeof bikes.$inferInsert;

// ─── Bike Discount Rules (desconto progressivo) ─────────────────────────────
export const bikeDiscountRules = mysqlTable("bike_discount_rules", {
  id: int("id").autoincrement().primaryKey(),
  bikeId: int("bikeId").notNull(),
  minDays: int("minDays").notNull(),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BikeDiscountRule = typeof bikeDiscountRules.$inferSelect;
export type InsertBikeDiscountRule = typeof bikeDiscountRules.$inferInsert;

// ─── Rentals ─────────────────────────────────────────────────────────────────
export const rentals = mysqlTable("rentals", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  bikeId: int("bikeId").notNull(),

  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  returnedAt: timestamp("returnedAt"),

  // Delivery
  deliveryDate: date("deliveryDate"),
  deliveryTime: varchar("deliveryTime", { length: 5 }),
  deliveryFee: decimal("deliveryFee", { precision: 10, scale: 2 }),

  // Pricing
  dailyRate: decimal("dailyRate", { precision: 10, scale: 2 }),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),

  // Payment
  paymentType: mysqlEnum("paymentType", ["online", "presential"]).default("presential"),
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "credit_card", "debit_card", "cash", "stripe", "other"]),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "partial", "refunded"]).default("pending").notNull(),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),

  // Return
  returnCondition: mysqlEnum("returnCondition", ["ok", "damaged"]),

  status: mysqlEnum("status", ["active", "returned", "overdue", "cancelled"]).default("active").notNull(),

  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Rental = typeof rentals.$inferSelect;
export type InsertRental = typeof rentals.$inferInsert;

// ─── Rental Accessories (vínculo acessórios-aluguel) ─────────────────────────
export const rentalAccessories = mysqlTable("rental_accessories", {
  id: int("id").autoincrement().primaryKey(),
  rentalId: int("rentalId").notNull(),
  accessoryId: int("accessoryId").notNull(),
  quantity: int("quantity").default(1).notNull(),
  dailyRate: decimal("dailyRate", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RentalAccessory = typeof rentalAccessories.$inferSelect;
export type InsertRentalAccessory = typeof rentalAccessories.$inferInsert;

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

// ─── Expense Categories ──────────────────────────────────────────────────────
export const expenseCategories = mysqlTable("expense_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = typeof expenseCategories.$inferInsert;

// ─── Revenue Categories ──────────────────────────────────────────────────────
export const revenueCategories = mysqlTable("revenue_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RevenueCategory = typeof revenueCategories.$inferSelect;
export type InsertRevenueCategory = typeof revenueCategories.$inferInsert;

// ─── Expenses ────────────────────────────────────────────────────────────────
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ─── Revenues (receitas extras, fora dos aluguéis) ───────────────────────────
export const revenues = mysqlTable("revenues", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Revenue = typeof revenues.$inferSelect;
export type InsertRevenue = typeof revenues.$inferInsert;

// ─── System Settings (configurações globais) ─────────────────────────────────
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
