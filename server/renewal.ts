// ─── F8: renovação de aluguel ("fico mais N dias") ───────────────────────────
// Estende o endDate de um aluguel mantendo a MESMA unidade física, recalcula
// o valor e propaga pro contrato. Regra de preço idêntica à criação de
// contrato (diária × dias × qtd) — as bike_discount_rules existem no schema
// mas NÃO são aplicadas em lugar nenhum do fluxo hoje; aplicar só aqui criaria
// divergência silenciosa de cobrança.
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { rentals, contracts, rentalBikeUnits, bikeUnits } from "../drizzle/schema";
import { todaySaoPaulo } from "./overdue";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dias entre duas datas YYYY-MM-DD (UTC puro — sem deslocamento de fuso). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

/** Valor extra da extensão: diária × dias adicionais × quantidade. */
export function computeExtension(opts: {
  dailyRate: string | null;
  quantity: number | null;
  currentEnd: string;
  newEnd: string;
}): { addedDays: number; extraAmount: string } {
  const addedDays = daysBetween(opts.currentEnd, opts.newEnd);
  const rate = parseFloat(opts.dailyRate ?? "0");
  const qty = opts.quantity ?? 1;
  return {
    addedDays,
    extraAmount: (rate * Math.max(0, addedDays) * qty).toFixed(2),
  };
}

export type ExtensionConflict = {
  numeroSistema: string;
  conflictingRentalId: number;
  from: string | null;
};

/**
 * Conflitos na JANELA ADICIONADA (currentEnd → newEnd): alguma das unidades
 * físicas já ligadas a este aluguel está reservada por OUTRO aluguel vivo?
 * Não usa findAvailableBikeUnits de propósito — aquela filtra por status
 * `disponivel`, e a unidade em uso neste aluguel está `alugado`.
 */
export async function findExtensionConflicts(
  db: any,
  rentalId: number,
  currentEnd: string,
  newEnd: string,
): Promise<ExtensionConflict[]> {
  const links = await db
    .select({ unitId: rentalBikeUnits.bikeUnitId })
    .from(rentalBikeUnits)
    .where(eq(rentalBikeUnits.rentalId, rentalId));
  if (links.length === 0) return []; // sem unidade atribuída: nada a conferir

  const unitIds = links.map((l: { unitId: number }) => l.unitId);
  const rows = await db
    .select({
      numeroSistema: bikeUnits.numeroSistema,
      conflictingRentalId: rentals.id,
      from: rentals.startDate,
    })
    .from(rentalBikeUnits)
    .innerJoin(rentals, eq(rentalBikeUnits.rentalId, rentals.id))
    .innerJoin(bikeUnits, eq(rentalBikeUnits.bikeUnitId, bikeUnits.id))
    .where(and(
      inArray(rentalBikeUnits.bikeUnitId, unitIds),
      ne(rentals.id, rentalId),
      inArray(rentals.status, ["pending", "active", "overdue"]),
      isNull(rentals.deletedAt),
      // sobreposição com a janela adicionada
      sql`${rentals.startDate} <= ${newEnd}`,
      sql`(${rentals.endDate} IS NULL OR ${rentals.endDate} >= ${currentEnd})`,
    ));
  return rows;
}

export type ExtendResult = {
  addedDays: number;
  extraAmount: string;
  newTotal: string;
  newEndDate: string;
  statusChanged: boolean;
};

/**
 * Executa a renovação. Lança Error com mensagem pronta ao usuário quando a
 * pré-condição falha (o router traduz pra TRPCError).
 */
export async function extendRental(
  db: any,
  rentalId: number,
  newEndDate: string,
  now: Date = new Date(),
): Promise<ExtendResult> {
  const [rental] = await db.select().from(rentals).where(eq(rentals.id, rentalId));
  if (!rental) throw new Error("NOT_FOUND");
  if (rental.deletedAt) throw new Error("Este aluguel foi arquivado.");
  if (rental.returnedAt || rental.status === "returned") {
    throw new Error("Este aluguel já foi devolvido — crie um novo contrato.");
  }
  if (rental.status === "cancelled") throw new Error("Este aluguel está cancelado.");
  if (!rental.endDate) {
    throw new Error("Este aluguel não tem data de devolução definida.");
  }
  const currentEnd: string = rental.endDate;
  if (daysBetween(currentEnd, newEndDate) <= 0) {
    throw new Error("A nova data precisa ser posterior à devolução atual.");
  }

  const conflicts = await findExtensionConflicts(db, rentalId, currentEnd, newEndDate);
  if (conflicts.length > 0) {
    const c = conflicts[0];
    throw new Error(
      `A unidade ${c.numeroSistema} já está reservada para o contrato #${c.conflictingRentalId} a partir de ${c.from ?? "—"}. Escolha uma data menor ou troque a bike.`,
    );
  }

  const { addedDays, extraAmount } = computeExtension({
    dailyRate: rental.dailyRate,
    quantity: rental.quantity,
    currentEnd,
    newEnd: newEndDate,
  });
  const newTotal = (parseFloat(rental.totalAmount ?? "0") + parseFloat(extraAmount)).toFixed(2);

  // Aluguel atrasado que renova volta a ficar em dia (se a nova data é futura)
  const today = todaySaoPaulo(now);
  const statusChanged = rental.status === "overdue" && newEndDate >= today;

  await db.update(rentals).set({
    endDate: newEndDate,
    totalAmount: newTotal,
    ...(statusChanged ? { status: "active" as const } : {}),
    updatedAt: new Date(),
  }).where(eq(rentals.id, rentalId));

  // Propaga o extra pro contrato (valorTotal é a soma dos aluguéis)
  if (rental.contractId) {
    const [contract] = await db
      .select({ valorTotal: contracts.valorTotal })
      .from(contracts)
      .where(eq(contracts.id, rental.contractId));
    if (contract) {
      const novoValor = (parseFloat(contract.valorTotal ?? "0") + parseFloat(extraAmount)).toFixed(2);
      await db.update(contracts).set({ valorTotal: novoValor }).where(eq(contracts.id, rental.contractId));
    }
  }

  return { addedDays, extraAmount, newTotal, newEndDate, statusChanged };
}
