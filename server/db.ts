import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Bike,
  Client,
  ClientDocument,
  InsertBike,
  InsertClient,
  InsertClientDocument,
  InsertRental,
  InsertUser,
  Rental,
  bikes,
  clientDocuments,
  clients,
  rentals,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
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

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Clients ──────────────────────────────────────────────────────────────────
export async function getClients(opts?: {
  search?: string;
  status?: "lead" | "verified" | "blocked";
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts?.status) conditions.push(eq(clients.status, opts.status));
  if (opts?.search) {
    const q = `%${opts.search}%`;
    conditions.push(
      or(like(clients.name, q), like(clients.cpf, q), like(clients.rg, q))
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts?.limit ?? 50;
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
  const result = await db.insert(clients).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function getClientStats() {
  const db = await getDb();
  if (!db) return { total: 0, leads: 0, verified: 0, blocked: 0 };

  const result = await db
    .select({
      status: clients.status,
      count: sql<number>`count(*)`,
    })
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

// ─── Client Documents ─────────────────────────────────────────────────────────
export async function getClientDocuments(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientDocuments).where(eq(clientDocuments.clientId, clientId));
}

export async function addClientDocument(data: InsertClientDocument): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clientDocuments).values(data);
  return (result[0] as any).insertId as number;
}

export async function deleteClientDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clientDocuments).where(eq(clientDocuments.id, id));
}

// ─── Bikes ────────────────────────────────────────────────────────────────────
export async function getBikes(opts?: { status?: Bike["status"]; search?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (opts?.status) conditions.push(eq(bikes.status, opts.status));
  if (opts?.search) {
    const q = `%${opts.search}%`;
    conditions.push(or(like(bikes.model, q), like(bikes.serialNumber, q)));
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
  const result = await db.insert(bikes).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateBike(id: number, data: Partial<InsertBike>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bikes).set(data).where(eq(bikes.id, id));
}

export async function deleteBike(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
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

  const conditions = [];
  if (opts?.clientId) conditions.push(eq(rentals.clientId, opts.clientId));
  if (opts?.bikeId) conditions.push(eq(rentals.bikeId, opts.bikeId));
  if (opts?.status) conditions.push(eq(rentals.status, opts.status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts?.limit ?? 50;
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
  const result = await db.insert(rentals).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateRental(id: number, data: Partial<InsertRental>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(rentals).set(data).where(eq(rentals.id, id));
}

export async function getRentalStats() {
  const db = await getDb();
  if (!db) return { active: 0, monthRevenue: "0" };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeResult, revenueResult] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(rentals)
      .where(eq(rentals.status, "active")),
    db
      .select({ total: sql<string>`COALESCE(SUM(totalAmount), 0)` })
      .from(rentals)
      .where(
        and(
          eq(rentals.paymentStatus, "paid"),
          sql`createdAt >= ${startOfMonth.toISOString().slice(0, 19).replace("T", " ")}`
        )
      ),
  ]);

  return {
    active: Number(activeResult[0]?.count ?? 0),
    monthRevenue: String(revenueResult[0]?.total ?? "0"),
  };
}
