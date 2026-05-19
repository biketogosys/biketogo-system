import {
  serial,
  pgTable,
  pgEnum,
  text,
  timestamp,
  varchar,
  numeric,
  boolean,
  date,
  integer,
  json,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const adminRoleEnum = pgEnum("admin_role", ["admin", "operator"]);
export const clientStatusEnum = pgEnum("client_status", ["lead", "verified", "blocked"]);
export const clientSourceEnum = pgEnum("client_source", ["shopify", "manual"]);
export const docTypeEnum = pgEnum("doc_type", ["rg_front", "rg_back", "other"]);
export const bikeCategoryEnum = pgEnum("bike_category", ["mtb", "speed", "gravel"]);
export const bikeStatusEnum = pgEnum("bike_status", ["available", "rented", "maintenance"]);
export const paymentTypeEnum = pgEnum("payment_type", ["online", "presential"]);
export const paymentMethodEnum = pgEnum("payment_method", ["pix", "credit_card", "debit_card", "cash", "stripe", "other"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "partial", "refunded"]);
export const returnConditionEnum = pgEnum("return_condition", ["ok", "damaged"]);
export const rentalStatusEnum = pgEnum("rental_status", ["active", "returned", "overdue", "cancelled"]);
export const accessoryStatusEnum = pgEnum("accessory_status", ["available", "rented", "maintenance", "lost"]);
export const contractStatusEnum = pgEnum("contract_status", ["ativo", "parcialmente_devolvido", "encerrado"]);
export const accessoryReturnStatusEnum = pgEnum("accessory_return_status", ["ok", "danificado", "perdido", "roubado"]);
export const nacionalidadeEnum = pgEnum("nacionalidade", ["brasileiro", "estrangeiro"]);
export const tipoDocumentoEnum = pgEnum("tipo_documento", ["cpf", "passaporte"]);

// ─── Users (Manus auth — kept for backward compat) ──────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Admin Users (sistema próprio email+senha) ──────────────────────────────
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: adminRoleEnum("role").default("operator").notNull(),
  active: boolean("active").default(true).notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

// ─── Clients ─────────────────────────────────────────────────────────────────
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
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
  complement: varchar("complement", { length: 100 }),
  // Nationality & document type
  nacionalidade: nacionalidadeEnum("nacionalidade"),
  tipoDocumento: tipoDocumentoEnum("tipo_documento"),
  numeroPassaporte: varchar("numero_passaporte", { length: 50 }),
  // Documents
  docFrontUrl: text("docFrontUrl"),
  docBackUrl: text("docBackUrl"),
  // LGPD
  lgpdConsent: boolean("lgpdConsent").default(false).notNull(),
  lgpdConsentAt: timestamp("lgpdConsentAt"),
  // Status & control
  status: clientStatusEnum("status").default("lead").notNull(),
  receiveEmail: boolean("receiveEmail").default(true).notNull(),
  blocked: boolean("blocked").default(false).notNull(),
  expiresAt: timestamp("expiresAt"),
  notes: text("notes"),
  // Source
  source: clientSourceEnum("source").default("manual").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Client Documents ─────────────────────────────────────────────────────────
export const clientDocuments = pgTable("client_documents", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull(),
  type: docTypeEnum("type").notNull(),
  url: text("url").notNull(),
  cloudinaryPublicId: varchar("cloudinaryPublicId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ClientDocument = typeof clientDocuments.$inferSelect;
export type InsertClientDocument = typeof clientDocuments.$inferInsert;

// ─── Bikes ────────────────────────────────────────────────────────────────────
export const bikes = pgTable("bikes", {
  id: serial("id").primaryKey(),
  serialNumber: varchar("serialNumber", { length: 100 }).notNull().unique(),
  model: varchar("model", { length: 100 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  category: bikeCategoryEnum("category"),
  size: varchar("size", { length: 50 }),
  color: varchar("color", { length: 50 }),
  description: text("description"),
  weight: varchar("weight", { length: 20 }),
  weightLimit: varchar("weightLimit", { length: 20 }),
  dailyRate: numeric("dailyRate", { precision: 10, scale: 2 }),
  photoUrl: text("photoUrl"),
  quantity: integer("quantity").default(1).notNull(),
  notes: text("notes"),
  status: bikeStatusEnum("status").default("available").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Bike = typeof bikes.$inferSelect;
export type InsertBike = typeof bikes.$inferInsert;

// ─── Bike Discount Rules (desconto progressivo) ─────────────────────────────
export const bikeDiscountRules = pgTable("bike_discount_rules", {
  id: serial("id").primaryKey(),
  bikeId: integer("bikeId").notNull(),
  minDays: integer("minDays").notNull(),
  discountPercent: numeric("discountPercent", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BikeDiscountRule = typeof bikeDiscountRules.$inferSelect;
export type InsertBikeDiscountRule = typeof bikeDiscountRules.$inferInsert;

// ─── Rentals ─────────────────────────────────────────────────────────────────
export const rentals = pgTable("rentals", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull(),
  bikeId: integer("bikeId").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  returnedAt: timestamp("returnedAt"),
  // Delivery
  deliveryDate: date("deliveryDate"),
  deliveryTime: varchar("deliveryTime", { length: 5 }),
  deliveryFee: numeric("deliveryFee", { precision: 10, scale: 2 }),
  // Pricing
  dailyRate: numeric("dailyRate", { precision: 10, scale: 2 }),
  discountPercent: numeric("discountPercent", { precision: 5, scale: 2 }),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }),
  totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }),
  depositAmount: numeric("depositAmount", { precision: 10, scale: 2 }),
  // Payment
  paymentType: paymentTypeEnum("paymentType").default("presential"),
  paymentMethod: paymentMethodEnum("paymentMethod"),
  paymentStatus: paymentStatusEnum("paymentStatus").default("pending").notNull(),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  // Source
  source: clientSourceEnum("source").default("manual"),
  // Return
  returnCondition: returnConditionEnum("returnCondition"),
  status: rentalStatusEnum("status").default("active").notNull(),
  // Contract link
  contractId: integer("contractId"),
  // Soft delete
  deletedAt: timestamp("deletedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Rental = typeof rentals.$inferSelect;
export type InsertRental = typeof rentals.$inferInsert;

// ─── Rental Accessories (vínculo acessórios-aluguel) ─────────────────────────
export const rentalAccessories = pgTable("rental_accessories", {
  id: serial("id").primaryKey(),
  rentalId: integer("rentalId").notNull(),
  accessoryId: integer("accessoryId").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  dailyRate: numeric("dailyRate", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RentalAccessory = typeof rentalAccessories.$inferSelect;
export type InsertRentalAccessory = typeof rentalAccessories.$inferInsert;

// ─── Accessories ─────────────────────────────────────────────────────────────
export const accessories = pgTable("accessories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  serialNumber: varchar("serialNumber", { length: 100 }),
  quantity: integer("quantity").default(1).notNull(),
  dailyRate: numeric("dailyRate", { precision: 10, scale: 2 }),
  purchasePrice: numeric("purchasePrice", { precision: 10, scale: 2 }),
  status: accessoryStatusEnum("status").default("available").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Accessory = typeof accessories.$inferSelect;
export type InsertAccessory = typeof accessories.$inferInsert;

// ─── Expense Categories ──────────────────────────────────────────────────────
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = typeof expenseCategories.$inferInsert;

// ─── Revenue Categories ──────────────────────────────────────────────────────
export const revenueCategories = pgTable("revenue_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RevenueCategory = typeof revenueCategories.$inferSelect;
export type InsertRevenueCategory = typeof revenueCategories.$inferInsert;

// ─── Expenses ────────────────────────────────────────────────────────────────
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  categoryId: integer("categoryId").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ─── Revenues (receitas extras, fora dos aluguéis) ───────────────────────────
export const revenues = pgTable("revenues", {
  id: serial("id").primaryKey(),
  categoryId: integer("categoryId").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Revenue = typeof revenues.$inferSelect;
export type InsertRevenue = typeof revenues.$inferInsert;

// ─── Contracts ───────────────────────────────────────────────────────────────
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull(),
  status: contractStatusEnum("status").default("ativo").notNull(),
  valorTotal: numeric("valorTotal", { precision: 10, scale: 2 }),
  pdfUrl: text("pdfUrl"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  encerradoEm: timestamp("encerradoEm"),
  deletedAt: timestamp("deletedAt"),
});
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

// ─── Contract Accessories (checklist de acessórios por contrato) ──────────────
export const contractAccessories = pgTable("contract_accessories", {
  id: serial("id").primaryKey(),
  contractId: integer("contractId").notNull(),
  accessoryId: integer("accessoryId").notNull(),
  qty: integer("qty").default(1).notNull(),
  status: accessoryReturnStatusEnum("status").default("ok").notNull(),
  observacao: text("observacao"),
  fotoUrl: text("fotoUrl"),
});
export type ContractAccessory = typeof contractAccessories.$inferSelect;
export type InsertContractAccessory = typeof contractAccessories.$inferInsert;

// ─── System Settings (configurações globais) ─────────────────────────────────
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
