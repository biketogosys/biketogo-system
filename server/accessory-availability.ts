/**
 * Disponibilidade de ACESSÓRIO POR DATA.
 *
 * ─── Por que este módulo existe ──────────────────────────────────────────────
 * Até 2026-07-23 acessório era o único item do sistema cuja ocupação vinha do
 * STATUS da unidade (`alugado`), não de overlap de datas. Bike sempre foi por
 * data: `assignBikeUnits` NÃO toca no status — a ocupação é derivada de
 * `rental_bike_units` + período do rental.
 *
 * A assimetria mordia assim: o capacete preso num contrato de julho ficava
 * `alugado` e contava como indisponível para OUTUBRO. Duplicar contrato ou
 * criar reserva futura falhava com "Acessório indisponível". Mesmo bug que a
 * Cassiana reportou nas bikes em 2026-07-22 ("reservei pra julho e não consigo
 * usar em setembro"), só que na outra ponta do domínio.
 *
 * ─── A cadeia de ocupação ────────────────────────────────────────────────────
 * Acessório tem uma camada a mais que bike (o vínculo é com o CONTRATO, não com
 * o rental), e o contrato não tem datas próprias — elas vivem nos rentals:
 *
 *   accessory_units.id
 *     ← contract_accessories.unitId
 *       → contract_accessories.contractId
 *         → rentals.contractId  →  rentals.startDate / endDate
 *
 * Uma unidade está OCUPADA no período se algum contrato que a segura tem
 * rental vivo (pending/active/overdue, não deletado) sobrepondo o período.
 *
 * ─── O que o status ainda significa ──────────────────────────────────────────
 * `manutencao` / `perdido` / `roubado` continuam sendo verdade absoluta (não
 * dependem de data) e excluem a unidade sempre. `alugado` vira INERTE para
 * efeito de disponibilidade — fica no banco por compatibilidade com dados
 * legados e com a tela de Unidades, mas quem manda é o overlap.
 */
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { accessoryUnits } from "../drizzle/schema";

/** Status que tiram a unidade de circulação independentemente de data. */
const STATUS_FORA_DE_CIRCULACAO: Array<"manutencao" | "perdido" | "roubado"> = [
  "manutencao",
  "perdido",
  "roubado",
];

export type AccessoryUnitLite = {
  id: number;
  accessoryId: number;
  variante: string | null;
  serialNumber: string | null;
};

/**
 * Condição SQL "esta unidade NÃO está presa em nenhum contrato vivo que
 * sobreponha [startDate, endDate]".
 *
 * `excludeContractId`: na EDIÇÃO/duplicação o próprio contrato não pode
 * bloquear as unidades dele mesmo (mesma armadilha do `excludeContractId` das
 * bikes — sem isso "o acessório some" ao editar).
 */
function semOverlap(startDate: string, endDate: string, excludeContractId?: number) {
  const excludeContract = excludeContractId ?? -1;
  // ⚠️ `accessory_units."id"` escrito à mão em vez de `${accessoryUnits.id}`:
  // na lista do SELECT o drizzle emite a coluna sem qualificar ("id"), e dentro
  // da subquery isso colide com o id de contract_accessories/rentals
  // (`column reference "id" is ambiguous`). No WHERE ele qualifica e passava —
  // por isso só o breakdown quebrava.
  return sql`NOT EXISTS (
    SELECT 1 FROM contract_accessories ca
    JOIN rentals r ON r."contractId" = ca."contractId"
    WHERE ca."unitId" = accessory_units."id"
      AND ca."contractId" <> ${excludeContract}
      AND r.status IN ('pending','active','overdue')
      AND r."deletedAt" IS NULL
      AND r."startDate" <= ${endDate}
      AND (r."endDate" IS NULL OR r."endDate" >= ${startDate})
  )`;
}

/**
 * Unidades de um acessório livres no período (opcionalmente de uma variante).
 * Ordenado por id — mesma regra de "pega a primeira" do reserve.
 */
export async function findAvailableAccessoryUnits(
  db: any,
  opts: {
    accessoryId: number;
    variante?: string | null;
    startDate: string;
    endDate: string;
    excludeContractId?: number;
  },
): Promise<AccessoryUnitLite[]> {
  if (!db) return [];
  const conds: any[] = [
    eq(accessoryUnits.accessoryId, opts.accessoryId),
    notInArray(accessoryUnits.status, STATUS_FORA_DE_CIRCULACAO),
    semOverlap(opts.startDate, opts.endDate, opts.excludeContractId),
  ];
  // `undefined` = qualquer variante; `null` = explicitamente a variante padrão.
  if (opts.variante !== undefined) {
    conds.push(
      opts.variante === null
        ? sql`${accessoryUnits.variante} IS NULL`
        : eq(accessoryUnits.variante, opts.variante),
    );
  }
  return db
    .select({
      id: accessoryUnits.id,
      accessoryId: accessoryUnits.accessoryId,
      variante: accessoryUnits.variante,
      serialNumber: accessoryUnits.serialNumber,
    })
    .from(accessoryUnits)
    .where(and(...conds))
    .orderBy(accessoryUnits.id);
}

export type PeriodVariante = { variante: string | null; disponivel: number; total: number };
export type PeriodBreakdown = { accessoryId: number; disponivel: number; total: number; byVariante: PeriodVariante[] };

/**
 * Breakdown por variante NO PERÍODO, para N acessórios em UMA query.
 * (Batch pelo mesmo motivo do `getAccessoryBreakdowns`: no pooler do Supabase
 * cada query é uma viagem de rede.)
 *
 * `total` conta as unidades em circulação (exclui manutenção/perdido/roubado),
 * `disponivel` conta as que também estão livres no período.
 */
export async function getAccessoryAvailabilityByPeriod(
  db: any,
  opts: {
    accessoryIds: number[];
    startDate: string;
    endDate: string;
    excludeContractId?: number;
  },
): Promise<PeriodBreakdown[]> {
  if (!db || opts.accessoryIds.length === 0) return [];

  const rows = await db
    .select({
      accessoryId: accessoryUnits.accessoryId,
      variante: accessoryUnits.variante,
      livre: semOverlap(opts.startDate, opts.endDate, opts.excludeContractId),
    })
    .from(accessoryUnits)
    .where(
      and(
        inArray(accessoryUnits.accessoryId, opts.accessoryIds),
        notInArray(accessoryUnits.status, STATUS_FORA_DE_CIRCULACAO),
      ),
    );

  const porAcessorio = new Map<number, Map<string, PeriodVariante>>();
  for (const id of opts.accessoryIds) porAcessorio.set(id, new Map());

  for (const r of rows) {
    const vMap = porAcessorio.get(r.accessoryId);
    if (!vMap) continue;
    const key = r.variante ?? "__null__";
    if (!vMap.has(key)) vMap.set(key, { variante: r.variante ?? null, disponivel: 0, total: 0 });
    const v = vMap.get(key)!;
    v.total++;
    if (r.livre) v.disponivel++;
  }

  return opts.accessoryIds.map((accessoryId) => {
    const byVariante = Array.from(porAcessorio.get(accessoryId)?.values() ?? []);
    return {
      accessoryId,
      byVariante,
      disponivel: byVariante.reduce((s, v) => s + v.disponivel, 0),
      total: byVariante.reduce((s, v) => s + v.total, 0),
    };
  });
}

/**
 * Reserva UMA unidade livre no período. Devolve o id ou null se não houver.
 *
 * ⚠️ NÃO altera o status da unidade — de propósito. Marcar `alugado` era
 * justamente o que criava a ocupação "para sempre". Quem registra a reserva é
 * a linha de `contract_accessories` (que o chamador insere), e a ocupação passa
 * a ser derivada dela + das datas do contrato. Espelha `assignBikeUnits`.
 */
export async function reserveAccessoryUnitForPeriod(
  db: any,
  opts: {
    accessoryId: number;
    variante?: string | null;
    startDate: string;
    endDate: string;
    excludeContractId?: number;
    /** Unidades já reservadas nesta MESMA transação lógica (o app é não-transacional). */
    jaUsadas?: number[];
  },
): Promise<number | null> {
  const livres = await findAvailableAccessoryUnits(db, opts);
  const usadas = new Set(opts.jaUsadas ?? []);
  const escolhida = livres.find((u) => !usadas.has(u.id));
  return escolhida?.id ?? null;
}
