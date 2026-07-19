// ─── Busca global (Ctrl+K) ───────────────────────────────────────────────────
// Q1 do roadmap: achar cliente/contrato/bike por texto num salto. Busca
// server-side (ilike) com no máximo 5 resultados por grupo — o palette é pra
// PULAR pra algo, não pra listar. CPF/telefone casam por dígitos (ignora
// máscara). Escala atual (centenas de linhas) dispensa índice trigram —
// revisitar se a base crescer 10x (nota já registrada no HANDOFF).
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { clients, bikes, contracts } from "../drizzle/schema";

export type SearchResults = {
  clients: { id: number; name: string; cpf: string | null; status: string }[];
  bikes: { id: number; model: string; serialNumber: string; brand: string | null }[];
  contracts: { id: number; clientName: string; status: string }[];
};

const EMPTY: SearchResults = { clients: [], bikes: [], contracts: [] };

export async function globalSearch(db: any, qRaw: string): Promise<SearchResults> {
  const q = qRaw.trim();
  if (q.length < 2) return EMPTY;
  const like = `%${q}%`;
  const digits = q.replace(/\D/g, "");

  // Clientes: nome sempre; CPF/telefone por dígitos quando a busca tiver 3+
  const clientConds = [ilike(clients.name, like)];
  if (digits.length >= 3) {
    const dLike = `%${digits}%`;
    clientConds.push(sql`replace(replace(replace(${clients.cpf}, '.', ''), '-', ''), ' ', '') ILIKE ${dLike}`);
    clientConds.push(sql`replace(replace(replace(replace(${clients.phone}, '(', ''), ')', ''), '-', ''), ' ', '') ILIKE ${dLike}`);
  }
  const clientRows = await db
    .select({ id: clients.id, name: clients.name, cpf: clients.cpf, status: clients.status })
    .from(clients)
    .where(and(isNull(clients.deletedAt), or(...clientConds)))
    .orderBy(desc(clients.updatedAt))
    .limit(5);

  const bikeRows = await db
    .select({ id: bikes.id, model: bikes.model, serialNumber: bikes.serialNumber, brand: bikes.brand })
    .from(bikes)
    .where(or(
      ilike(bikes.model, like),
      ilike(bikes.serialNumber, like),
      ilike(bikes.brand, like),
    ))
    .limit(5);

  // Contratos: por número exato ("42" ou "#42") ou pelo nome do cliente
  const contractConds = [ilike(clients.name, like)];
  const idNum = Number(q.replace(/^#/, ""));
  if (Number.isInteger(idNum) && idNum > 0 && /^#?\d+$/.test(q)) {
    contractConds.push(eq(contracts.id, idNum));
  }
  const contractRows = await db
    .select({ id: contracts.id, clientName: clients.name, status: contracts.status })
    .from(contracts)
    .innerJoin(clients, eq(contracts.clientId, clients.id))
    .where(and(isNull(contracts.deletedAt), or(...contractConds)))
    .orderBy(desc(contracts.id))
    .limit(5);

  return { clients: clientRows, bikes: bikeRows, contracts: contractRows };
}
