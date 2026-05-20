import { and, between, desc, eq, gte, isNull, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  Accessory,
  AdminUser,
  Bike,
  BikeDiscountRule,
  Client,
  ClientDocument,
  Expense,
  ExpenseCategory,
  InsertAccessory,
  InsertAdminUser,
  InsertBike,
  InsertBikeDiscountRule,
  InsertClient,
  InsertClientDocument,
  InsertExpense,
  InsertExpenseCategory,
  InsertRental,
  InsertRentalAccessory,
  InsertRevenue,
  InsertRevenueCategory,
  InsertSystemSetting,
  InsertUser,
  Rental,
  RentalAccessory,
  Revenue,
  RevenueCategory,
  SystemSetting,
  accessories,
  adminUsers,
  auditLogs,
  bikeDiscountRules,
  bikes,
  clientDocuments,
  clients,
  expenseCategories,
  expenses,
  rentalAccessories,
  rentals,
  revenueCategories,
  revenues,
  systemSettings,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

function cleanDatabaseUrl(raw: string): string {
  // Handle env values that may include the key prefix or wrapping quotes
  let url = raw;
  if (url.startsWith('DATABASE_URL=')) url = url.slice('DATABASE_URL='.length);
  url = url.replace(/^"|"$/g, '');
  // Supabase URLs may wrap the password in brackets [pass] — strip them
  url = url.replace(/:(?:\[)([^\]]+)(?:\])@/, (_, pass) => `:${encodeURIComponent(pass)}@`);
  return url;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const url = cleanDatabaseUrl(process.env.DATABASE_URL);
      const client = postgres(url, { ssl: 'require' });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users (Manus auth — backward compat) ───────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Admin Users (email + senha) ─────────────────────────────────────────────
export async function getAdminUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminUsers).where(eq(adminUsers.email, email.toLowerCase())).limit(1);
  return result[0];
}

export async function getAdminUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return result[0];
}

export async function getAllAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: adminUsers.id,
    name: adminUsers.name,
    email: adminUsers.email,
    role: adminUsers.role,
    active: adminUsers.active,
    lastLoginAt: adminUsers.lastLoginAt,
    createdAt: adminUsers.createdAt,
  }).from(adminUsers).orderBy(desc(adminUsers.createdAt));
}

export async function createAdminUser(data: InsertAdminUser): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(adminUsers).values({ ...data, email: data.email.toLowerCase() }).returning({ id: adminUsers.id });
  return result[0].id;
}

export async function updateAdminUser(id: number, data: Partial<InsertAdminUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.email) data.email = data.email.toLowerCase();
  await db.update(adminUsers).set(data).where(eq(adminUsers.id, id));
}

export async function deleteAdminUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(adminUsers).where(eq(adminUsers.id, id));
}

export async function updateAdminUserLastLogin(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, id));
}

// ─── Clients ─────────────────────────────────────────────────────────────────
export async function getClients(opts?: {
  search?: string;
  status?: "lead" | "verified" | "blocked";
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions: any[] = [isNull(clients.deletedAt)];
  if (opts?.status) conditions.push(eq(clients.status, opts.status));
  if (opts?.search) {
    const q = `%${opts.search}%`;
    conditions.push(
      or(like(clients.name, q), like(clients.cpf, q), like(clients.rg, q))
    );
  }
  const where = and(...conditions);
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const [items, countResult] = await Promise.all([
    db.select().from(clients).where(where).orderBy(desc(clients.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(clients).where(where),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0];
}

export async function createClient(data: InsertClient): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data).returning({ id: clients.id });
  return result[0].id;
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function archiveClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set({ deletedAt: new Date() }).where(eq(clients.id, id));
}

/** @deprecated use archiveClient for soft delete */
export async function deleteClient(id: number) {
  return archiveClient(id);
}

export async function getClientStats() {
  const db = await getDb();
  if (!db) return { total: 0, leads: 0, verified: 0, blocked: 0 };
  const result = await db
    .select({ status: clients.status, count: sql<number>`count(*)` })
    .from(clients)
    .groupBy(clients.status);
  const stats = { total: 0, leads: 0, verified: 0, blocked: 0 };
  for (const row of result) {
    const count = Number(row.count);
    stats.total += count;
    if (row.status === "lead") stats.leads = count;
    if (row.status === "verified") stats.verified = count;
    if (row.status === "blocked") stats.blocked = count;
  }
  return stats;
}

// ─── Client Documents ────────────────────────────────────────────────────────
export async function getClientDocuments(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientDocuments).where(eq(clientDocuments.clientId, clientId));
}

export async function addClientDocument(data: InsertClientDocument): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clientDocuments).values(data).returning({ id: clientDocuments.id });
  return result[0].id;
}

export async function deleteClientDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clientDocuments).where(eq(clientDocuments.id, id));
}

// ─── Bikes ───────────────────────────────────────────────────────────────────
export async function getBikes(opts?: { status?: Bike["status"]; search?: string; category?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.status) conditions.push(eq(bikes.status, opts.status));
  if (opts?.category) conditions.push(eq(bikes.category, opts.category as any));
  if (opts?.search) {
    const q = `%${opts.search}%`;
    conditions.push(or(like(bikes.model, q), like(bikes.serialNumber, q), like(bikes.brand, q)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(bikes).where(where).orderBy(desc(bikes.createdAt));
}

export async function getBikeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bikes).where(eq(bikes.id, id)).limit(1);
  return result[0];
}

export async function createBike(data: InsertBike): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bikes).values(data).returning({ id: bikes.id });
  return result[0].id;
}

export async function updateBike(id: number, data: Partial<InsertBike>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bikes).set(data).where(eq(bikes.id, id));
}

export async function deleteBike(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete related discount rules first
  await db.delete(bikeDiscountRules).where(eq(bikeDiscountRules.bikeId, id));
  await db.delete(bikes).where(eq(bikes.id, id));
}

export async function getBikeStats() {
  const db = await getDb();
  if (!db) return { total: 0, available: 0, rented: 0, maintenance: 0 };
  const result = await db
    .select({ status: bikes.status, count: sql<number>`count(*)` })
    .from(bikes)
    .groupBy(bikes.status);
  const stats = { total: 0, available: 0, rented: 0, maintenance: 0 };
  for (const row of result) {
    const count = Number(row.count);
    stats.total += count;
    if (row.status === "available") stats.available = count;
    if (row.status === "rented") stats.rented = count;
    if (row.status === "maintenance") stats.maintenance = count;
  }
  return stats;
}

// ─── Bike Discount Rules ─────────────────────────────────────────────────────
export async function getBikeDiscountRules(bikeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bikeDiscountRules).where(eq(bikeDiscountRules.bikeId, bikeId)).orderBy(bikeDiscountRules.minDays);
}

export async function createBikeDiscountRule(data: InsertBikeDiscountRule): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bikeDiscountRules).values(data).returning({ id: bikeDiscountRules.id });
  return result[0].id;
}

export async function deleteBikeDiscountRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bikeDiscountRules).where(eq(bikeDiscountRules.id, id));
}

export async function deleteAllBikeDiscountRules(bikeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bikeDiscountRules).where(eq(bikeDiscountRules.bikeId, bikeId));
}

// ─── Rentals ─────────────────────────────────────────────────────────────────
export async function getRentals(opts?: {
  clientId?: number;
  bikeId?: number;
  status?: Rental["status"];
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions: any[] = [isNull(rentals.deletedAt)];
  if (opts?.clientId) conditions.push(eq(rentals.clientId, opts.clientId));
  if (opts?.bikeId) conditions.push(eq(rentals.bikeId, opts.bikeId));
  if (opts?.status) conditions.push(eq(rentals.status, opts.status));
  const where = and(...conditions);
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const [items, countResult] = await Promise.all([
    db.select().from(rentals).where(where).orderBy(desc(rentals.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(rentals).where(where),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getRentalById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rentals).where(eq(rentals.id, id)).limit(1);
  return result[0];
}

export async function createRental(data: InsertRental): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(rentals).values(data).returning({ id: rentals.id });
  return result[0].id;
}

export async function updateRental(id: number, data: Partial<InsertRental>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(rentals).set(data).where(eq(rentals.id, id));
}

export async function archiveRental(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(rentals).set({ deletedAt: new Date() }).where(eq(rentals.id, id));
}

/** @deprecated use archiveRental for soft delete */
export async function deleteRental(id: number) {
  return archiveRental(id);
}

// Check bike availability for a date range
export async function checkBikeAvailability(bikeId: number, startDate: string, endDate: string, excludeRentalId?: number) {
  const db = await getDb();
  if (!db) return false;
  const conditions = [
    eq(rentals.bikeId, bikeId),
    eq(rentals.status, "active"),
    // Overlapping dates
    lte(rentals.startDate, endDate),
    gte(rentals.endDate, startDate),
  ];
  if (excludeRentalId) {
    conditions.push(sql`${rentals.id} != ${excludeRentalId}`);
  }
  const result = await db.select({ count: sql<number>`count(*)` }).from(rentals).where(and(...conditions));
  return Number(result[0]?.count ?? 0) === 0;
}

// ─── Rental Accessories ──────────────────────────────────────────────────────
export async function getRentalAccessories(rentalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rentalAccessories).where(eq(rentalAccessories.rentalId, rentalId));
}

export async function createRentalAccessory(data: InsertRentalAccessory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(rentalAccessories).values(data).returning({ id: rentalAccessories.id });
  return result[0].id;
}

export async function deleteRentalAccessories(rentalId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(rentalAccessories).where(eq(rentalAccessories.rentalId, rentalId));
}

// ─── Accessories ─────────────────────────────────────────────────────────────
export async function getAccessories(opts?: {
  status?: Accessory["status"];
  search?: string;
  category?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.status) conditions.push(eq(accessories.status, opts.status));
  if (opts?.category) conditions.push(eq(accessories.category, opts.category));
  if (opts?.search) {
    const q = `%${opts.search}%`;
    conditions.push(or(like(accessories.name, q), like(accessories.serialNumber, q)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(accessories).where(where).orderBy(desc(accessories.createdAt));
}

export async function getAccessoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accessories).where(eq(accessories.id, id)).limit(1);
  return result[0];
}

export async function createAccessory(data: InsertAccessory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(accessories).values(data).returning({ id: accessories.id });
  return result[0].id;
}

export async function updateAccessory(id: number, data: Partial<InsertAccessory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(accessories).set(data).where(eq(accessories.id, id));
}

export async function deleteAccessory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(accessories).where(eq(accessories.id, id));
}

// ─── Expense Categories ──────────────────────────────────────────────────────
export async function getExpenseCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenseCategories).orderBy(expenseCategories.name);
}

export async function createExpenseCategory(data: InsertExpenseCategory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenseCategories).values(data).returning({ id: expenseCategories.id });
  return result[0].id;
}

export async function deleteExpenseCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(expenses).where(eq(expenses.categoryId, id));
  await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
}

export async function updateExpenseCategory(id: number, data: Partial<InsertExpenseCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(expenseCategories).set(data).where(eq(expenseCategories.id, id));
}

// ─── Revenue Categories ──────────────────────────────────────────────────────
export async function getRevenueCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(revenueCategories).orderBy(revenueCategories.name);
}

export async function createRevenueCategory(data: InsertRevenueCategory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(revenueCategories).values(data).returning({ id: revenueCategories.id });
  return result[0].id;
}

export async function deleteRevenueCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(revenues).where(eq(revenues.categoryId, id));
  await db.delete(revenueCategories).where(eq(revenueCategories.id, id));
}

export async function updateRevenueCategory(id: number, data: Partial<InsertRevenueCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(revenueCategories).set(data).where(eq(revenueCategories.id, id));
}

// ─── Expenses ────────────────────────────────────────────────────────────────
export async function getExpenses(opts?: { categoryId?: number; startDate?: string; endDate?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions = [];
  if (opts?.categoryId) conditions.push(eq(expenses.categoryId, opts.categoryId));
  if (opts?.startDate) conditions.push(gte(expenses.date, opts.startDate));
  if (opts?.endDate) conditions.push(lte(expenses.date, opts.endDate));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const [items, countResult] = await Promise.all([
    db.select().from(expenses).where(where).orderBy(desc(expenses.date)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(expenses).where(where),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function createExpense(data: InsertExpense): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenses).values(data).returning({ id: expenses.id });
  return result[0].id;
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(expenses).set(data).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(expenses).where(eq(expenses.id, id));
}

// ─── Revenues ────────────────────────────────────────────────────────────────
export async function getRevenues(opts?: { categoryId?: number; startDate?: string; endDate?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions = [];
  if (opts?.categoryId) conditions.push(eq(revenues.categoryId, opts.categoryId));
  if (opts?.startDate) conditions.push(gte(revenues.date, opts.startDate));
  if (opts?.endDate) conditions.push(lte(revenues.date, opts.endDate));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const [items, countResult] = await Promise.all([
    db.select().from(revenues).where(where).orderBy(desc(revenues.date)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(revenues).where(where),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function createRevenue(data: InsertRevenue): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(revenues).values(data).returning({ id: revenues.id });
  return result[0].id;
}

export async function updateRevenue(id: number, data: Partial<InsertRevenue>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(revenues).set(data).where(eq(revenues.id, id));
}

export async function deleteRevenue(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(revenues).where(eq(revenues.id, id));
}

// ─── Financial Report ────────────────────────────────────────────────────────
export async function getFinancialReport(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return { rentalRevenue: "0", extraRevenue: "0", totalExpenses: "0" };
  const [rentalResult, revenueResult, expenseResult] = await Promise.all([
    db.select({ total: sql<string>`COALESCE(SUM("totalAmount"::numeric), 0)` })
      .from(rentals)
      .where(and(
        eq(rentals.paymentStatus, "paid"),
        gte(rentals.startDate, startDate),
        lte(rentals.startDate, endDate),
      )),
    db.select({ total: sql<string>`COALESCE(SUM("amount"::numeric), 0)` })
      .from(revenues)
      .where(and(gte(revenues.date, startDate), lte(revenues.date, endDate))),
    db.select({ total: sql<string>`COALESCE(SUM("amount"::numeric), 0)` })
      .from(expenses)
      .where(and(gte(expenses.date, startDate), lte(expenses.date, endDate))),
  ]);
  return {
    rentalRevenue: String(rentalResult[0]?.total ?? "0"),
    extraRevenue: String(revenueResult[0]?.total ?? "0"),
    totalExpenses: String(expenseResult[0]?.total ?? "0"),
  };
}

// ─── Rental Stats ────────────────────────────────────────────────────────────
export async function getRentalStats() {
  const db = await getDb();
  if (!db) return { active: 0, monthRevenue: "0" };
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [activeResult, revenueResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(rentals).where(eq(rentals.status, "active")),
    db.select({ total: sql<string>`COALESCE(SUM("totalAmount"::numeric), 0)` })
      .from(rentals)
      .where(and(
        eq(rentals.paymentStatus, "paid"),
        gte(rentals.createdAt, startOfMonth),
      )),
  ]);
  return {
    active: Number(activeResult[0]?.count ?? 0),
    monthRevenue: String(revenueResult[0]?.total ?? "0"),
  };
}

// ─── System Settings ─────────────────────────────────────────────────────────
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(systemSettings).values({ key, value }).onConflictDoUpdate({ target: systemSettings.key, set: { value } });
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemSettings);
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────
export async function createAuditLog(data: {
  adminId?: number | null;
  acao: string;
  tabela: string;
  registroId?: number | null;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  ip?: string | null;
}) {
  const db = await getDb();
  if (!db) return; // silently skip if DB unavailable
  try {
    await db.insert(auditLogs).values({
      adminId: data.adminId ?? null,
      acao: data.acao,
      tabela: data.tabela,
      registroId: data.registroId ?? null,
      dadosAntes: data.dadosAntes as any ?? null,
      dadosDepois: data.dadosDepois as any ?? null,
      ip: data.ip ?? null,
    });
  } catch (e) {
    console.warn("[AuditLog] Failed to write audit log:", e);
  }
}
