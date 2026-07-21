// ─── Agenda de Operações — entregas + devoluções por intervalo (fuso SP) ─────
// F1 do roadmap: a pergunta que responde é "o que eu entrego/cobro neste
// período?". Entrega = COALESCE(deliveryDate, startDate); devolução = endDate.
// Atrasadas (endDate < hoje, não devolvidas) vêm em lista própria — o cliente
// as fixa no dia de hoje. Sem estado "entregue" no domínio (decisão v1: a
// entrega é informativa + WhatsApp; devolução usa o markReturned existente).
import { and, asc, eq, gte, inArray, isNull, lt, lte, sql } from "drizzle-orm";
import { rentals, clients, bikes, bikeSizes } from "../drizzle/schema";
import { todaySaoPaulo } from "./overdue";

export type AgendaItem = {
  id: number;
  day: string;                 // YYYY-MM-DD (entrega ou devolução)
  deliveryTime: string | null;
  clientId: number;
  clientName: string;
  clientPhone: string | null;
  accommodation: string | null;
  neighborhood: string | null;
  city: string | null;
  bikeModel: string;
  tamanho: string | null;
  quantity: number | null;
  dailyRate: string | null;
  contractId: number | null;
  status: string;
  daysLate: number;            // só > 0 nas atrasadas
};

const baseSelect = {
  id: rentals.id,
  deliveryTime: rentals.deliveryTime,
  clientId: rentals.clientId,
  clientName: clients.name,
  clientPhone: clients.phone,
  accommodation: clients.accommodation,
  neighborhood: clients.neighborhood,
  city: clients.city,
  bikeModel: bikes.model,
  tamanho: bikeSizes.tamanho,
  quantity: rentals.quantity,
  dailyRate: rentals.dailyRate,
  contractId: rentals.contractId,
  status: rentals.status,
};

function joins(q: any) {
  return q
    .innerJoin(clients, eq(rentals.clientId, clients.id))
    .innerJoin(bikes, eq(rentals.bikeId, bikes.id))
    .leftJoin(bikeSizes, eq(rentals.bikeSizeId, bikeSizes.id));
}

/**
 * Agenda do intervalo [from, to] (datas YYYY-MM-DD, inclusivas).
 * - deliveries: dia = COALESCE(deliveryDate, startDate), pending/active,
 *   ainda não devolvido (um aluguel devolvido não tem entrega pendente).
 * - returns: dia = endDate, active/overdue, não devolvido.
 * - overdue: endDate < hoje-SP, não devolvido — independe do intervalo
 *   (a UI fixa no dia de hoje).
 */
export async function getAgenda(
  db: any,
  from: string,
  to: string,
  now: Date = new Date(),
): Promise<{ deliveries: AgendaItem[]; returns: AgendaItem[]; overdue: AgendaItem[] }> {
  const today = todaySaoPaulo(now);
  const deliveryDay = sql<string>`COALESCE(${rentals.deliveryDate}, ${rentals.startDate})`;

  const deliveries = await joins(
    db.select({ ...baseSelect, day: deliveryDay }).from(rentals),
  )
    .where(and(
      inArray(rentals.status, ["pending", "active"]),
      isNull(rentals.deletedAt),
      isNull(rentals.returnedAt),
      gte(deliveryDay, from),
      lte(deliveryDay, to),
    ))
    .orderBy(asc(deliveryDay), asc(rentals.deliveryTime));

  // "pending" entra aqui porque a entrega já mostra pendentes (contrato criado,
  // pagamento ainda não confirmado): se a entrega aparece, a devolução do mesmo
  // aluguel também tem de aparecer — senão a bike some da coluna de devoluções.
  const returns = await joins(
    db.select({ ...baseSelect, day: rentals.endDate }).from(rentals),
  )
    .where(and(
      inArray(rentals.status, ["pending", "active", "overdue"]),
      isNull(rentals.deletedAt),
      isNull(rentals.returnedAt),
      gte(rentals.endDate, from),
      lte(rentals.endDate, to),
    ))
    .orderBy(asc(rentals.endDate));

  const overdueRows = await joins(
    db.select({ ...baseSelect, day: rentals.endDate }).from(rentals),
  )
    .where(and(
      inArray(rentals.status, ["pending", "active", "overdue"]),
      isNull(rentals.deletedAt),
      isNull(rentals.returnedAt),
      lt(rentals.endDate, today),
    ))
    .orderBy(asc(rentals.endDate));

  const dayMs = 24 * 60 * 60 * 1000;
  const withLate = (r: any, late: boolean): AgendaItem => ({
    ...r,
    daysLate: late && r.day ? Math.round((Date.parse(today) - Date.parse(r.day)) / dayMs) : 0,
  });
  return {
    deliveries: deliveries.map((r: any) => withLate(r, false)),
    // devoluções do intervalo que JÁ estão atrasadas ficam só na lista overdue
    returns: returns.filter((r: any) => r.day >= today).map((r: any) => withLate(r, false)),
    overdue: overdueRows.map((r: any) => withLate(r, true)),
  };
}
