// ─── Período do aluguel: F8 (renovação) e F10 (devolução antecipada) ─────────
// Os dois lados da MESMA régua: esticar o endDate (o turista fica mais dias) e
// encurtá-lo (devolveu antes do combinado). Estende mantendo a MESMA unidade
// física; encurta recalculando o valor pelos dias efetivamente usados.
//
// ⚠️ Assimetria proposital de desconto (herdada do histórico do projeto):
// - `extendRental` (F8) cobra DIÁRIA CHEIA nos dias extras — decisão pendente
//   registrada no ROADMAP; mudar aqui alteraria cobrança de renovação em silêncio.
// - `applyEarlyReturn` (F10) REAPLICA as bike_discount_rules para o novo nº de
//   dias — regra confirmada pela Cassiana (2026-07-28): quem devolve antes paga
//   os dias usados e PERDE o desconto da faixa maior.
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { rentals, contracts, rentalBikeUnits, bikeUnits, bikes } from "../drizzle/schema";
import { todaySaoPaulo } from "./overdue";
import { getBikeDiscountRulesBatch } from "./db";

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
    throw new Error("Este aluguel já foi devolvido. Crie um novo contrato.");
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

// ─── F10: devolução ANTECIPADA (o inverso da renovação) ───────────────────────
// "O aluguel de 5 dias virou aluguel de 1 dia só" (Cassiana, 2026-07-28).
// Regras dela, confirmadas: cobra os dias usados · PERDE o desconto da faixa
// maior · sem multa · pagamento é na devolução (logo, normalmente não há
// estorno — o valor é corrigido ANTES de ela receber).

export type DiscountRule = { minDays: number; discountPercent: string };

/** Diárias cobradas entre duas datas (mínimo 1 — meio dia é diária cheia). */
export function billableDays(startDate: string, endDate: string): number {
  return Math.max(1, daysBetween(startDate, endDate));
}

/**
 * Desconto progressivo: vale a regra de MAIOR `minDays` que o período atingir.
 * Mesma fórmula do `calcTotal` do NewContractModal — se divergir, o crédito da
 * devolução antecipada não bate com o valor que o contrato cobrou.
 */
export function pickDiscountPercent(rules: DiscountRule[], numDays: number): number {
  const rule = rules
    .filter((r) => numDays >= r.minDays)
    .sort((a, b) => b.minDays - a.minDays)[0];
  const pct = rule ? parseFloat(String(rule.discountPercent)) : 0;
  return Number.isFinite(pct) && pct > 0 ? pct : 0;
}

/** Preço de um aluguel: diária × dias × qtd, menos o desconto da faixa. */
export function computeRentalTotal(opts: {
  dailyRate: string | null;
  quantity: number | null;
  startDate: string;
  endDate: string;
  rules?: DiscountRule[];
}): { numDays: number; discountPercent: number; totalAmount: string } {
  const numDays = billableDays(opts.startDate, opts.endDate);
  const rate = parseFloat(opts.dailyRate ?? "0") || 0;
  const qty = opts.quantity ?? 1;
  const pct = pickDiscountPercent(opts.rules ?? [], numDays);
  return {
    numDays,
    discountPercent: pct,
    totalAmount: (rate * numDays * qty * (1 - pct / 100)).toFixed(2),
  };
}

export type EarlyReturnPreview = {
  rentalId: number;
  contractId: number | null;
  bikeLabel: string | null;
  startDate: string;
  oldEndDate: string;
  newEndDate: string;
  /** Dias que o cliente NÃO usou (endDate combinado − devolução real). */
  removedDays: number;
  /** Diárias cobradas antes e depois do recálculo. */
  oldDays: number;
  newDays: number;
  oldTotal: string;
  newTotal: string;
  /** Positivo = quanto sai da conta do cliente. Nunca negativo (ver `capped`). */
  creditAmount: string;
  oldDiscountPercent: number;
  newDiscountPercent: number;
  /**
   * O período curto sairia MAIS CARO que o combinado (o desconto perdido supera
   * os dias devolvidos) e o valor foi travado no original. Devolver antes nunca
   * pode aumentar a conta — a regra da Cassiana é "não paga o que não usou",
   * não "paga multa disfarçada de desconto perdido".
   */
  capped: boolean;
  /** Contrato já pago ⇒ o crédito vira estorno no Financeiro. */
  alreadyPaid: boolean;
};

/**
 * Calcula (sem gravar) o recálculo de uma devolução antecipada.
 * Devolve `null` quando não há o que recalcular: aluguel inexistente/arquivado/
 * cancelado/já devolvido, sem data de devolução, ou devolução na data combinada
 * (ou depois — aí é atraso, outro assunto).
 */
export async function previewEarlyReturn(
  db: any,
  rentalId: number,
  returnDate: string,
): Promise<EarlyReturnPreview | null> {
  const [rental] = await db.select().from(rentals).where(eq(rentals.id, rentalId));
  if (!rental || rental.deletedAt) return null;
  if (rental.status === "cancelled" || rental.status === "returned" || rental.returnedAt) return null;
  if (!rental.endDate || !rental.startDate) return null;
  if (daysBetween(returnDate, rental.endDate) <= 0) return null; // não é antecipada

  // Devolver antes do início (ou no mesmo dia) = 1 diária, não zero.
  const newEndDate = returnDate < rental.startDate ? rental.startDate : returnDate;

  const rulesMap = await getBikeDiscountRulesBatch(db, rental.bikeId ? [rental.bikeId] : []);
  const rules = (rulesMap[rental.bikeId] ?? []) as DiscountRule[];

  const oldDays = billableDays(rental.startDate, rental.endDate);
  const oldDiscountPercent = pickDiscountPercent(rules, oldDays);
  const recalc = computeRentalTotal({
    dailyRate: rental.dailyRate,
    quantity: rental.quantity,
    startDate: rental.startDate,
    endDate: newEndDate,
    rules,
  });

  const oldTotal = parseFloat(rental.totalAmount ?? "0") || 0;
  const computed = parseFloat(recalc.totalAmount);
  const capped = computed > oldTotal;
  const newTotalNum = capped ? oldTotal : computed;

  let bikeLabel: string | null = null;
  if (rental.bikeId) {
    const [b] = await db
      .select({ brand: bikes.brand, model: bikes.model })
      .from(bikes)
      .where(eq(bikes.id, rental.bikeId));
    if (b) bikeLabel = `${b.brand ?? ""} ${b.model ?? ""}`.trim() || null;
  }

  return {
    rentalId,
    contractId: rental.contractId ?? null,
    bikeLabel,
    startDate: rental.startDate,
    oldEndDate: rental.endDate,
    newEndDate,
    removedDays: daysBetween(newEndDate, rental.endDate),
    oldDays,
    newDays: recalc.numDays,
    oldTotal: oldTotal.toFixed(2),
    newTotal: newTotalNum.toFixed(2),
    creditAmount: Math.max(0, oldTotal - newTotalNum).toFixed(2),
    oldDiscountPercent,
    newDiscountPercent: capped ? oldDiscountPercent : recalc.discountPercent,
    capped,
    alreadyPaid: rental.paymentStatus === "paid",
  };
}

/**
 * Aplica o recálculo: encurta o `endDate`, grava o novo valor/desconto e
 * propaga o abatimento pro `contracts.valorTotal`. NÃO marca como devolvido
 * (quem chama faz isso) e NÃO mexe no Financeiro — o lançamento do estorno é
 * decisão do router (só existe se o contrato já tiver sido PAGO).
 */
export async function applyEarlyReturn(
  db: any,
  rentalId: number,
  returnDate: string,
): Promise<EarlyReturnPreview | null> {
  const pv = await previewEarlyReturn(db, rentalId, returnDate);
  if (!pv) return null;

  await db.update(rentals).set({
    endDate: pv.newEndDate,
    totalAmount: pv.newTotal,
    discountPercent: pv.newDiscountPercent > 0 ? pv.newDiscountPercent.toFixed(2) : null,
    updatedAt: new Date(),
  }).where(eq(rentals.id, rentalId));

  const credito = parseFloat(pv.creditAmount);
  if (pv.contractId && credito > 0) {
    const [contract] = await db
      .select({ valorTotal: contracts.valorTotal })
      .from(contracts)
      .where(eq(contracts.id, pv.contractId));
    if (contract) {
      const novoValor = Math.max(0, parseFloat(contract.valorTotal ?? "0") - credito);
      await db.update(contracts).set({ valorTotal: novoValor.toFixed(2) })
        .where(eq(contracts.id, pv.contractId));
    }
  }
  return pv;
}

/** Aluguéis vivos de um contrato que ainda podem ser devolvidos. */
export async function contractOpenRentalIds(db: any, contractId: number): Promise<number[]> {
  const rows = await db
    .select({ id: rentals.id })
    .from(rentals)
    .where(and(
      eq(rentals.contractId, contractId),
      isNull(rentals.deletedAt),
      inArray(rentals.status, ["pending", "active", "overdue"]),
    ));
  return rows.map((r: { id: number }) => r.id);
}
