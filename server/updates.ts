// ─── Changelog do sistema ("Atualizações") ───────────────────────────────────
/**
 * Fonte única das consultas do changelog que a loja lê.
 *
 * ⚠️ **Por que aqui e não no `db.ts`:** as funções de dentro do `db.ts` chamam a
 * referência LOCAL de `getDb`, que um `vi.mock("./db")` não alcança — testar a
 * procedure de verdade contra o PGlite seria impossível (a consulta cairia no
 * banco real, ausente, e devolveria lista vazia calada). Um módulo próprio
 * IMPORTA `getDb`, então o mock vale. Mesmo padrão de `rental-period.ts` e
 * `accessory-availability.ts`; de quebra não engorda o `routers.ts`, que já é
 * dívida técnica registrada (tarefa 15).
 */
import { count, desc, eq, gt } from "drizzle-orm";
import { adminUsers, systemUpdates, type InsertSystemUpdate } from "../drizzle/schema";
import { getDb } from "./db";

export type UpdateCategoria = "novidade" | "melhoria" | "correcao";

export type SystemUpdateItem = {
  id: number;
  titulo: string;
  descricao: string;
  categoria: UpdateCategoria;
  criadoEm: Date;
  autorNome: string | null;
};

/**
 * Feed do mais recente para o mais antigo. O `total` é o do banco inteiro, não
 * o da página: é o que a tela usa para saber se ainda há o que carregar.
 */
export async function listarAtualizacoes(opts?: { limit?: number; offset?: number }): Promise<{
  items: SystemUpdateItem[];
  total: number;
}> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const [items, totalResult] = await Promise.all([
    db
      // O nome do autor vem junto: "autor #3" não diz nada para quem lê.
      // LEFT join de propósito — o admin vindo do OAuth entra com id 0, que não
      // existe em `admin_users`, e um inner join sumiria com a linha inteira.
      .select({
        id: systemUpdates.id,
        titulo: systemUpdates.titulo,
        descricao: systemUpdates.descricao,
        categoria: systemUpdates.categoria,
        criadoEm: systemUpdates.criadoEm,
        autorNome: adminUsers.name,
      })
      .from(systemUpdates)
      .leftJoin(adminUsers, eq(systemUpdates.autorId, adminUsers.id))
      .orderBy(desc(systemUpdates.criadoEm))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(systemUpdates),
  ]);

  return {
    items: items as SystemUpdateItem[],
    total: Number(totalResult[0]?.total ?? 0),
  };
}

export async function criarAtualizacao(data: InsertSystemUpdate): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(systemUpdates).values(data).returning({ id: systemUpdates.id });
  return result[0].id;
}

export async function editarAtualizacao(id: number, data: Partial<InsertSystemUpdate>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(systemUpdates).set(data).where(eq(systemUpdates.id, id));
}

export async function apagarAtualizacao(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(systemUpdates).where(eq(systemUpdates.id, id));
}

// ─── Badge de "tem novidade" (por usuário) ───────────────────────────────────
/**
 * `adminUserId` pode vir 0 (o admin do fallback OAuth, `routers.ts`, não tem
 * linha em `admin_users`) — nesses dois casos não há onde persistir "lido", e a
 * resposta é 0/no-op em vez de estourar ou mentir uma contagem.
 */
export async function contarAtualizacoesNaoLidas(adminUserId: number | null): Promise<number> {
  const db = await getDb();
  if (!db || !adminUserId) return 0;

  const [user] = await db
    .select({ atualizacoesLidasEm: adminUsers.atualizacoesLidasEm })
    .from(adminUsers)
    .where(eq(adminUsers.id, adminUserId))
    .limit(1);

  // Nunca abriu a aba: tudo que existe hoje é "não lido".
  const desde = user?.atualizacoesLidasEm ?? new Date(0);

  const [row] = await db
    .select({ total: count() })
    .from(systemUpdates)
    .where(gt(systemUpdates.criadoEm, desde));

  return Number(row?.total ?? 0);
}

export async function marcarAtualizacoesLidas(adminUserId: number | null): Promise<void> {
  const db = await getDb();
  if (!db || !adminUserId) return;
  await db.update(adminUsers).set({ atualizacoesLidasEm: new Date() }).where(eq(adminUsers.id, adminUserId));
}
