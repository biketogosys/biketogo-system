import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import bcrypt from "bcryptjs";
import { mkdirSync, readFileSync } from "fs";
import path from "path";
import * as schema from "../drizzle/schema";

/**
 * Banco de desenvolvimento local (PGlite) — sem Supabase, sem .env.
 *
 * Ativado por DEV_PGLITE (ver getDb em server/db.ts):
 *   - DEV_PGLITE=file    → persiste em .dev-db/pgdata (sobrevive a restarts)
 *   - DEV_PGLITE=memory  → em memória (reseta a cada restart do tsx watch)
 *
 * Aplica as MIGRAÇÕES REAIS do repo na ordem do _journal.json (mesma regra do
 * test-helper), rastreando tags aplicadas em _dev_migrations para que novas
 * migrações entrem incrementalmente. Banco corrompido/defasado? `npm run
 * dev:local:fresh` recria do zero.
 *
 * Login semeado: admin@dev.local / dev123 (admin) e operador@dev.local / dev123.
 */

type DevDb = ReturnType<typeof drizzle<typeof schema>>;

let _initPromise: Promise<DevDb> | null = null;

export async function getDevDb(): Promise<DevDb> {
  if (!_initPromise) _initPromise = init();
  return _initPromise;
}

async function init(): Promise<DevDb> {
  const inMemory = process.env.DEV_PGLITE === "memory";
  const storage = inMemory ? undefined : path.resolve(process.cwd(), ".dev-db/pgdata");
  // PGlite não cria diretório aninhado — garantir o pai antes
  if (storage) mkdirSync(path.dirname(storage), { recursive: true });
  const client = storage ? new PGlite(storage) : new PGlite();
  const db = drizzle(client, { schema });

  // ─── Migrações (incrementais, ordem do _journal.json) ─────────────────────
  await client.exec(`CREATE TABLE IF NOT EXISTS _dev_migrations (tag text PRIMARY KEY)`);
  const appliedRows = await client.query<{ tag: string }>(`SELECT tag FROM _dev_migrations`);
  const applied = new Set(appliedRows.rows.map((r) => r.tag));

  const drizzleDir = path.resolve(process.cwd(), "drizzle");
  const journal = JSON.parse(readFileSync(path.join(drizzleDir, "meta/_journal.json"), "utf8"));
  for (const entry of journal.entries) {
    if (applied.has(entry.tag)) continue;
    const sqlText = readFileSync(path.join(drizzleDir, `${entry.tag}.sql`), "utf8");
    const statements = sqlText
      .split("--> statement-breakpoint")
      .map((s: string) => s.trim())
      .filter(Boolean);
    for (const st of statements) {
      await client.exec(st);
    }
    await client.query(`INSERT INTO _dev_migrations (tag) VALUES ($1)`, [entry.tag]);
  }

  // ─── Seed (só quando o banco está virgem) ──────────────────────────────────
  const admins = await db.select().from(schema.adminUsers).limit(1);
  if (admins.length === 0) {
    await seed(db);
    console.log("[dev-db] Seed aplicado.");
  }

  console.log(
    `[dev-db] PGlite pronto (${inMemory ? "memória" : ".dev-db/pgdata"}) — login: admin@dev.local / dev123`
  );
  return db;
}

// ─── Seed de desenvolvimento ──────────────────────────────────────────────────
function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

async function seed(db: DevDb) {
  const passwordHash = await bcrypt.hash("dev123", 10);

  await db.insert(schema.adminUsers).values([
    { name: "Admin Dev", email: "admin@dev.local", passwordHash, role: "admin" },
    { name: "Operador Dev", email: "operador@dev.local", passwordHash, role: "operator" },
  ]);

  // Categoria de receita "Aluguéis" precisa ser id=1 (referenciada no código)
  await db.insert(schema.revenueCategories).values([
    { name: "Aluguéis" },
    { name: "Venda de acessórios" },
    { name: "Taxa de entrega" },
  ]);
  await db.insert(schema.expenseCategories).values([
    { name: "Manutenção" },
    { name: "Peças e insumos" },
    { name: "Marketing" },
    { name: "Infraestrutura" },
  ]);

  await db.insert(schema.systemSettings).values([
    { key: "company_name", value: "Bike To Go Floripa (DEV)" },
    { key: "archive_retention_days", value: "5" },
    { key: "whatsapp_number", value: "5548999999999" },
  ]);

  const clientRows = await db
    .insert(schema.clients)
    .values([
      {
        name: "Ana Souza", firstName: "Ana", lastName: "Souza", status: "verified",
        cpf: "390.533.447-05", phone: "48999990001", email: "ana@example.com",
        city: "Florianópolis", state: "SC",
      },
      {
        name: "Bruno Lima", firstName: "Bruno", lastName: "Lima", status: "lead",
        phone: "48999990002", email: "bruno@example.com",
        city: "São José", state: "SC",
      },
      {
        name: "Carla Mendes", firstName: "Carla", lastName: "Mendes", status: "verified",
        cpf: "111.444.777-35", phone: "48999990003", email: "carla@example.com",
        city: "Florianópolis", state: "SC",
      },
    ])
    .returning({ id: schema.clients.id });
  const [ana, , carla] = clientRows;

  const bikeRows = await db
    .insert(schema.bikes)
    .values([
      { serialNumber: "DEV-URB-001", model: "Urbana Comfort", brand: "Caloi", dailyRate: "45.00" },
      { serialNumber: "DEV-MTB-001", model: "MTB Trail 29", brand: "Sense", dailyRate: "65.00" },
    ])
    .returning({ id: schema.bikes.id });
  const [urbana, mtb] = bikeRows;

  const sizeRows = await db
    .insert(schema.bikeSizes)
    .values([
      { bikeId: urbana.id, tamanho: "M", quantidadeTotal: 3, quantidadeDisponivel: 3 },
      { bikeId: urbana.id, tamanho: "G", quantidadeTotal: 2, quantidadeDisponivel: 2 },
      { bikeId: mtb.id, tamanho: "M", quantidadeTotal: 2, quantidadeDisponivel: 2 },
    ])
    .returning({ id: schema.bikeSizes.id });
  const [urbanaM, urbanaG, mtbM] = sizeRows;

  const unitRows = await db
    .insert(schema.bikeUnits)
    .values([
      { bikeSizeId: urbanaM.id, numeroSistema: "URB-M-001", status: "alugado" },
      { bikeSizeId: urbanaM.id, numeroSistema: "URB-M-002", status: "disponivel" },
      { bikeSizeId: urbanaM.id, numeroSistema: "URB-M-003", status: "manutencao" },
      { bikeSizeId: urbanaG.id, numeroSistema: "URB-G-001", status: "alugado" },
      { bikeSizeId: urbanaG.id, numeroSistema: "URB-G-002", status: "disponivel" },
      { bikeSizeId: mtbM.id, numeroSistema: "MTB-M-001", status: "alugado" },
      { bikeSizeId: mtbM.id, numeroSistema: "MTB-M-002", status: "disponivel" },
    ])
    .returning({ id: schema.bikeUnits.id });

  // Acessórios + unidades. O router accessories.create gera as unidades
  // automaticamente; aqui o insert é direto, então criamos à mão — sem elas,
  // um acessório obrigatório trava a criação de contrato.
  const accRows = await db
    .insert(schema.accessories)
    .values([
      { name: "Capacete", category: "seguranca", quantity: 5, quantidadeTotal: 5, obrigatorio: true, replacementValue: "80.00" },
      { name: "Cadeado", category: "seguranca", quantity: 4, quantidadeTotal: 4, replacementValue: "50.00" },
      { name: "Cadeirinha infantil", category: "conforto", quantity: 2, quantidadeTotal: 2, dailyRate: "10.00", replacementValue: "250.00" },
    ])
    .returning({ id: schema.accessories.id, name: schema.accessories.name });

  const unitPlan: Record<string, { qty: number; variante?: string }[]> = {
    "Capacete": [{ qty: 3, variante: "M" }, { qty: 2, variante: "G" }],
    "Cadeado": [{ qty: 4 }],
    "Cadeirinha infantil": [{ qty: 2 }],
  };
  for (const acc of accRows) {
    let n = 0;
    for (const group of unitPlan[acc.name] ?? [{ qty: 1 }]) {
      for (let i = 0; i < group.qty; i++) {
        n++;
        await db.insert(schema.accessoryUnits).values({
          accessoryId: acc.id,
          serialNumber: `${acc.name.slice(0, 3).toUpperCase()}-${String(n).padStart(3, "0")}`,
          status: "disponivel",
          variante: group.variante ?? null,
        });
      }
    }
  }

  // Contrato ativo com aluguel pago no mês corrente (alimenta o Financeiro)
  const [contract] = await db
    .insert(schema.contracts)
    .values({ clientId: ana.id, status: "ativo", valorTotal: "450.00" })
    .returning({ id: schema.contracts.id });

  const [activeRental] = await db
    .insert(schema.rentals)
    .values({
      clientId: ana.id, bikeId: urbana.id, bikeSizeId: urbanaM.id, quantity: 1,
      startDate: isoDay(-5), endDate: isoDay(5),
      dailyRate: "45.00", totalAmount: "450.00",
      paymentStatus: "paid", status: "active", contractId: contract.id,
    })
    .returning({ id: schema.rentals.id });

  await db.insert(schema.rentalBikeUnits).values({
    rentalId: activeRental.id,
    bikeUnitId: unitRows[0].id, // URB-M-001, marcada "alugado"
  });

  // Devolução prevista para HOJE (alimenta o painel de devoluções do dashboard)
  const [todayContract] = await db
    .insert(schema.contracts)
    .values({ clientId: carla.id, status: "ativo", valorTotal: "180.00" })
    .returning({ id: schema.contracts.id });
  const [todayRental] = await db
    .insert(schema.rentals)
    .values({
      clientId: carla.id, bikeId: urbana.id, bikeSizeId: urbanaG.id, quantity: 1,
      startDate: isoDay(-4), endDate: isoDay(0),
      dailyRate: "45.00", totalAmount: "180.00",
      paymentStatus: "paid", status: "active", contractId: todayContract.id,
    })
    .returning({ id: schema.rentals.id });
  await db.insert(schema.rentalBikeUnits).values({
    rentalId: todayRental.id,
    bikeUnitId: unitRows[3].id, // URB-G-001, marcada "alugado"
  });

  // Aluguel ATRASADO — endDate no passado com status ainda "active": o
  // OverdueSweep do servidor marca como overdue ao subir (demo do job).
  const [lateContract] = await db
    .insert(schema.contracts)
    .values({ clientId: ana.id, status: "ativo", valorTotal: "325.00" })
    .returning({ id: schema.contracts.id });
  const [lateRental] = await db
    .insert(schema.rentals)
    .values({
      clientId: ana.id, bikeId: mtb.id, bikeSizeId: mtbM.id, quantity: 1,
      startDate: isoDay(-7), endDate: isoDay(-2),
      dailyRate: "65.00", totalAmount: "325.00",
      paymentStatus: "paid", status: "active", contractId: lateContract.id,
    })
    .returning({ id: schema.rentals.id });
  await db.insert(schema.rentalBikeUnits).values({
    rentalId: lateRental.id,
    bikeUnitId: unitRows[5].id, // MTB-M-001, marcada "alugado"
  });

  // Aluguel devolvido no mês passado (histórico)
  await db.insert(schema.rentals).values({
    clientId: carla.id, bikeId: mtb.id, bikeSizeId: mtbM.id, quantity: 1,
    startDate: isoDay(-40), endDate: isoDay(-33),
    dailyRate: "65.00", totalAmount: "455.00",
    paymentStatus: "paid", status: "returned",
    returnedAt: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000),
  });

  // Lançamentos financeiros — mês corrente e anterior
  await db.insert(schema.expenses).values([
    { categoryId: 1, description: "Revisão freios frota urbana", amount: "180.50", date: isoDay(-3) },
    { categoryId: 2, description: "Câmaras de ar (6 un.)", amount: "144.00", date: isoDay(-8) },
    { categoryId: 3, description: "Impulsionamento Instagram", amount: "95.00", date: isoDay(-12) },
    { categoryId: 4, description: "Hospedagem + domínio", amount: "230.00", date: isoDay(-35) },
  ]);
  await db.insert(schema.revenues).values([
    { categoryId: 2, description: "Venda de capacete usado", amount: "60.00", date: isoDay(-4) },
    { categoryId: 3, description: "Taxa de entrega — Campeche", amount: "25.00", date: isoDay(-6) },
    { categoryId: 2, description: "Venda de cadeado", amount: "35.00", date: isoDay(-38) },
  ]);
}
