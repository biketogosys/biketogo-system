// ─── Ajustes de devolução antecipada (F10) — fonte única de leitura ──────────
// O "valor anterior" de um recálculo só existe na AUDITORIA: o aluguel guarda
// apenas o valor atual. O PDF do contrato já explicava a diferença a partir
// daqui; o recibo por e-mail precisa da MESMA linha, senão o cliente recebe um
// total menor que o combinado sem explicação.
import { and, eq, inArray } from "drizzle-orm";
import { auditLogs } from "../drizzle/schema";

export type AjusteDevolucao = {
  data: Date;
  diariasDe: number;
  diariasPara: number;
  valorDe: string;
  valorPara: string;
};

/**
 * Lê os recálculos por devolução antecipada dos aluguéis informados.
 *
 * `inicioPorRental` alimenta a reconstrução das diárias: registros anteriores a
 * 2026-07-28 não gravavam `diariasAntes`/`diariasDepois`, então elas são
 * recalculadas pelas datas com a mesma régua do recálculo (`billableDays`).
 */
export async function carregarAjustesDevolucao(
  db: any,
  rentalIds: number[],
  inicioPorRental: Map<number, string | null>,
): Promise<AjusteDevolucao[]> {
  const ids = rentalIds.filter(Boolean);
  if (ids.length === 0) return [];

  const rows = await db
    .select({ registroId: auditLogs.registroId, dados: auditLogs.dadosDepois, criadoEm: auditLogs.criadoEm })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.acao, "devolucao_antecipada_recalculada"),
      inArray(auditLogs.registroId, ids),
    ))
    .orderBy(auditLogs.id);

  const { billableDays } = await import("./rental-period");
  return rows
    .map((row: any) => {
      const d = (row.dados ?? {}) as Record<string, any>;
      if (!d.valorAnterior || !d.novoValor) return null;
      const inicio = inicioPorRental.get(row.registroId as number) ?? null;
      const diariasDe = d.diariasAntes ?? (inicio && d.devolucaoCombinada ? billableDays(inicio, d.devolucaoCombinada) : 0);
      const diariasPara = d.diariasDepois ?? (inicio && d.devolucaoReal ? billableDays(inicio, d.devolucaoReal) : 0);
      return {
        data: row.criadoEm as Date,
        diariasDe, diariasPara,
        valorDe: String(d.valorAnterior),
        valorPara: String(d.novoValor),
      };
    })
    .filter(Boolean) as AjusteDevolucao[];
}
