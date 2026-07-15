// ─── Overdue — marcação de aluguéis vencidos (fuso America/Sao_Paulo) ────────
import { and, eq, isNull, lt } from "drizzle-orm";
import { rentals } from "../drizzle/schema";

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
