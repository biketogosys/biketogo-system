// ─── Overdue — marcação de aluguéis vencidos (fuso America/Sao_Paulo) ────────
import { and, asc, eq, inArray, isNull, lt, lte } from "drizzle-orm";
import { rentals, clients, bikes, bikeSizes } from "../drizzle/schema";

/**
 * "Hoje" (YYYY-MM-DD) no fuso America/Sao_Paulo, independente do fuso do
 * servidor (Railway roda em UTC). en-CA formata como ISO 8601.
 */
export function todaySaoPaulo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Marca como "overdue" todo aluguel ATIVO cuja endDate já passou em SP
 * (endDate < hoje-SP). O aluguel só vence no dia SEGUINTE ao endDate: às
 * 23h59-SP do endDate ainda está ativo; às 00h01-SP do dia seguinte vira
 * overdue. Idempotente — seguro rodar em qualquer frequência.
 * Retorna os ids marcados.
 */
export async function markOverdueRentals(db: any, now: Date = new Date()): Promise<number[]> {
  const today = todaySaoPaulo(now);
  const rows: { id: number }[] = await db
    .update(rentals)
    .set({ status: "overdue" as const, updatedAt: new Date() })
    .where(and(
      eq(rentals.status, "active"),
      isNull(rentals.deletedAt),
      isNull(rentals.returnedAt),
      lt(rentals.endDate, today),
    ))
    .returning({ id: rentals.id });
  return rows.map((r) => r.id);
}

// ─── Devoluções pendentes (atrasadas + previstas p/ hoje), fuso SP ───────────
// Fonte ÚNICA da lista de devoluções — consumida pelo painel do dashboard
// (dashboard.returns) e pelo digest matinal. Corte por endDate (não por
// status), então fica correta mesmo se o OverdueSweep ainda não rodou.
export type ReturnDueItem = {
  id: number;
  clientId: number;
  clientName: string;
  clientPhone: string | null;
  bikeModel: string;
  tamanho: string | null;
  quantity: number | null;
  endDate: string | null;
  contractId: number | null;
  daysLate: number;
};

export async function getReturnsDue(
  db: any,
  now: Date = new Date(),
): Promise<{ overdue: ReturnDueItem[]; dueToday: ReturnDueItem[] }> {
  const today = todaySaoPaulo(now);
  const rows = await db
    .select({
      id: rentals.id,
      clientId: rentals.clientId,
      clientName: clients.name,
      clientPhone: clients.phone,
      bikeModel: bikes.model,
      tamanho: bikeSizes.tamanho,
      quantity: rentals.quantity,
      endDate: rentals.endDate,
      contractId: rentals.contractId,
    })
    .from(rentals)
    .innerJoin(clients, eq(rentals.clientId, clients.id))
    .innerJoin(bikes, eq(rentals.bikeId, bikes.id))
    .leftJoin(bikeSizes, eq(rentals.bikeSizeId, bikeSizes.id))
    .where(and(
      inArray(rentals.status, ["active", "overdue"]),
      isNull(rentals.deletedAt),
      isNull(rentals.returnedAt),
      lte(rentals.endDate, today),
    ))
    .orderBy(asc(rentals.endDate));
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    overdue: rows
      .filter((x: ReturnDueItem) => x.endDate !== null && x.endDate < today)
      .map((x: ReturnDueItem) => ({ ...x, daysLate: Math.round((Date.parse(today) - Date.parse(x.endDate!)) / dayMs) })),
    dueToday: rows
      .filter((x: ReturnDueItem) => x.endDate === today)
      .map((x: ReturnDueItem) => ({ ...x, daysLate: 0 })),
  };
}
