/**
 * `updates.*` — a aba Atualizações (changelog que a dona da loja lê).
 *
 * O que este arquivo protege, em ordem de importância:
 *
 * 1. **Quem pode publicar.** Desde 2026-08-17 (2ª volta), NEM O ADMIN publica
 *    pelo sistema: quem escreve é o "publicador", uma credencial separada de
 *    `admin_users` que só vale em `/publicar-atualizacoes`. Todo mundo logado
 *    apenas LÊ. Se isso afrouxar por acidente, a loja passa a poder escrever no
 *    canal que ela mesma lê como comunicado do desenvolvedor.
 * 2. **A separação dos dois cookies.** Token de sessão do sistema não pode
 *    valer como publicador, nem o contrário. É o que sustenta o item 1.
 * 3. **A ordem do feed.** Mais recente primeiro. Um changelog em ordem errada é
 *    pior que nenhum: a dona abre e vê a novidade de um mês atrás no topo.
 *
 * ⚠️ Roda as PROCEDURES DE VERDADE (`appRouter.createCaller`), não uma cópia da
 * query. O `getDb` é apontado para o PGlite; o resto do `./db` continua real —
 * inclusive o `getAdminUserById`, que é o que faz o ramo do cookie funcionar.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import * as schema from "../drizzle/schema";
import { createTestDb } from "./test-helpers/pglite-db";
import type { TrpcContext } from "./_core/context";

vi.setConfig({ testTimeout: 30_000 });

const SENHA_PUBLICADOR = "senha-de-teste-publicador";

const alvo = vi.hoisted(() => {
  // Estas variáveis precisam existir ANTES de `_core/env` ser avaliado (ele lê
  // `process.env` no load do módulo). Sem o segredo, o `jwt.sign` dos contextos
  // lança "secretOrPrivateKey must have a value" e o teste falharia por motivo
  // errado; sem as do publicador, o login recusaria todo mundo (falha fechada).
  process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres-aqui";
  process.env.PUBLICADOR_USUARIO = "publicador-teste";
  // bcrypt de "senha-de-teste-publicador", custo 10 (o mesmo da casa).
  process.env.PUBLICADOR_SENHA_HASH =
    "$2b$10$mDZWpMZxWhzzzDL3zZcji..WWGZVKBZo0QBhswW8778dm2JnlTx.K";
  return { db: null as any };
});

vi.mock("./db", async (importOriginal) => {
  const real = await importOriginal<typeof import("./db")>();
  const { eq } = await import("drizzle-orm");
  const s = await import("../drizzle/schema");
  return {
    ...real,
    getDb: async () => alvo.db,
    // ⚠️ `getAdminUserById` mora DENTRO do `db.ts` e chama a referência LOCAL de
    // `getDb`, que este mock não alcança — sem reimplementá-la aqui, o ramo do
    // cookie do `adminAuthProcedure` não acharia o usuário e TODO teste de papel
    // falharia com UNAUTHORIZED, escondendo o que se quer provar. A consulta é a
    // mesma da real, só apontada para o banco de teste.
    getAdminUserById: async (id: number) => {
      const rows = await alvo.db.select().from(s.adminUsers).where(eq(s.adminUsers.id, id)).limit(1);
      return rows[0] ?? null;
    },
  };
});

// Importados DEPOIS do vi.mock (que o vitest iça para o topo), então as
// procedures já enxergam o `getDb` apontado para o PGlite.
const { appRouter } = await import("./routers");
const jwt = (await import("jsonwebtoken")).default;

/** Contexto de admin pelo ramo `ctx.user.role === "admin"` do adminAuthProcedure. */
function contextoAdmin(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-teste",
      email: "admin@teste.local",
      name: "Admin Teste",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, cookies: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}

/**
 * Contexto de OPERADOR. Vai pelo ramo do cookie (o único que carrega papel de
 * verdade): o fallback do OAuth só sabe produzir admin, então testar operador
 * por ele provaria nada.
 */
function contextoOperador(userId: number): TrpcContext {
  const token = jwt.sign({ userId, role: "operator" }, process.env.JWT_SECRET!, { expiresIn: "1h" });
  return {
    user: null,
    req: { protocol: "https", headers: {}, cookies: { btg_session: token } } as unknown as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}

const comoAdmin = () => appRouter.createCaller(contextoAdmin());
const comoOperador = (userId: number) => appRouter.createCaller(contextoOperador(userId));

/**
 * Contexto de um usuário REAL (pelo cookie, com o id de verdade em
 * `admin_users`) — necessário para o badge de não-lidas, que persiste
 * `atualizacoesLidasEm` por id. `comoAdmin()` acima usa o fallback OAuth com
 * id fixo 0, que não tem linha na tabela e não serve para testar isso.
 */
function contextoComCookie(userId: number, role: "admin" | "operator"): TrpcContext {
  const token = jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: "1h" });
  return {
    user: null,
    req: { protocol: "https", headers: {}, cookies: { btg_session: token } } as unknown as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}
const comoUsuario = (userId: number, role: "admin" | "operator") =>
  appRouter.createCaller(contextoComCookie(userId, role));

/**
 * Contexto do PUBLICADOR: cookie próprio (`btg_publicador`) com o claim
 * `kind: "publicador"`. É a credencial de `/publicar-atualizacoes`, que não é
 * usuário do sistema.
 *
 * `guardaCookie` captura o que o servidor SETA, para os testes de login
 * conferirem que o cookie certo saiu — sem isso, "login funcionou" seria só a
 * ausência de exceção.
 */
function contextoPublicador(token?: string) {
  const cookiesSetados: Array<{ nome: string; valor: string }> = [];
  const ctx = {
    user: null,
    req: {
      protocol: "https",
      secure: true,
      headers: {},
      cookies: token ? { btg_publicador: token } : {},
    } as unknown as TrpcContext["req"],
    res: {
      cookie: (nome: string, valor: string) => cookiesSetados.push({ nome, valor }),
      clearCookie: (nome: string) => cookiesSetados.push({ nome, valor: "" }),
    } as unknown as TrpcContext["res"],
  } as TrpcContext;
  return { ctx, cookiesSetados };
}

function tokenPublicadorValido(usuario = process.env.PUBLICADOR_USUARIO!) {
  return jwt.sign({ kind: "publicador", usuario }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

const comoPublicador = (token = tokenPublicadorValido()) =>
  appRouter.createCaller(contextoPublicador(token).ctx);

/** Cria um admin_user real no banco (o ramo do cookie o carrega pelo id). */
async function criarUsuario(db: any, role: "admin" | "operator", nome: string) {
  const [u] = await db
    .insert(schema.adminUsers)
    .values({
      name: nome,
      email: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@teste.local`,
      passwordHash: "hash-irrelevante-para-este-teste",
      role,
      active: true,
    })
    .returning({ id: schema.adminUsers.id });
  return u.id;
}

beforeEach(async () => {
  alvo.db = await createTestDb();
});

describe("updates — o feed", () => {
  it("lista vazia não quebra: devolve items vazio e total 0", async () => {
    const r = await comoAdmin().updates.list({});
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
  });

  it("publica e aparece na lista com título, descrição e categoria", async () => {
    const { id } = await comoPublicador().updates.create({
      titulo: "Recibo mostra o desconto",
      descricao: "O e-mail de recibo agora separa subtotal, desconto e total.",
      categoria: "melhoria",
    });

    const r = await comoAdmin().updates.list({});

    expect(r.total).toBe(1);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].id).toBe(id);
    expect(r.items[0].titulo).toBe("Recibo mostra o desconto");
    expect(r.items[0].descricao).toBe("O e-mail de recibo agora separa subtotal, desconto e total.");
    expect(r.items[0].categoria).toBe("melhoria");
  });

  it("categoria tem padrão 'melhoria' quando não é informada", async () => {
    await comoPublicador().updates.create({
      titulo: "Sem categoria explícita",
      descricao: "Deve cair no padrão.",
    } as any);

    const r = await comoAdmin().updates.list({});
    expect(r.items[0].categoria).toBe("melhoria");
  });

  it("ORDEM do feed é do mais recente para o mais antigo", async () => {
    // O caso que um `orderBy` errado inverte silenciosamente. Datas explícitas
    // porque três inserts no mesmo milissegundo empatariam o critério.
    await alvo.db.insert(schema.systemUpdates).values([
      { titulo: "Mais antiga", descricao: "d", criadoEm: new Date("2026-01-10T12:00:00Z") },
      { titulo: "Mais nova", descricao: "d", criadoEm: new Date("2026-08-17T12:00:00Z") },
      { titulo: "Do meio", descricao: "d", criadoEm: new Date("2026-05-01T12:00:00Z") },
    ]);

    const r = await comoAdmin().updates.list({});

    expect(r.items.map((i: any) => i.titulo)).toEqual(["Mais nova", "Do meio", "Mais antiga"]);
  });

  it("traz o NOME do autor, não o id cru", async () => {
    const adminId = await criarUsuario(alvo.db, "admin", "Matheus");
    await alvo.db.insert(schema.systemUpdates).values({
      titulo: "Com autor",
      descricao: "d",
      autorId: adminId,
    });

    const r = await comoAdmin().updates.list({});
    expect(r.items[0].autorNome).toBe("Matheus");
  });

  it("atualização sem autor não quebra a listagem (join à esquerda)", async () => {
    // Autor nulo é o caso real: o admin do OAuth entra com id 0, que não existe
    // em `admin_users`. Um inner join sumiria com a linha inteira.
    await alvo.db.insert(schema.systemUpdates).values({ titulo: "Sem autor", descricao: "d" });

    const r = await comoAdmin().updates.list({});
    expect(r.items).toHaveLength(1);
    expect(r.items[0].autorNome).toBeNull();
  });

  it("paginação: limit e offset recortam, mas o total continua o do banco", async () => {
    for (let i = 1; i <= 5; i++) {
      await alvo.db.insert(schema.systemUpdates).values({
        titulo: `Item ${i}`,
        descricao: "d",
        criadoEm: new Date(`2026-0${i}-01T12:00:00Z`),
      });
    }

    const r = await comoAdmin().updates.list({ limit: 2, offset: 1 });

    expect(r.items.map((i: any) => i.titulo)).toEqual(["Item 4", "Item 3"]);
    expect(r.total).toBe(5);
  });
});

describe("updates — editar e apagar", () => {
  it("editar troca os três campos", async () => {
    const { id } = await comoPublicador().updates.create({
      titulo: "Título velho",
      descricao: "Descrição velha.",
      categoria: "melhoria",
    });

    await comoPublicador().updates.update({
      id,
      titulo: "Título novo",
      descricao: "Descrição nova.",
      categoria: "correcao",
    });

    const r = await comoAdmin().updates.list({});
    expect(r.items[0].titulo).toBe("Título novo");
    expect(r.items[0].descricao).toBe("Descrição nova.");
    expect(r.items[0].categoria).toBe("correcao");
  });

  it("apagar remove só a linha pedida", async () => {
    const a = await comoPublicador().updates.create({ titulo: "Fica", descricao: "d", categoria: "novidade" });
    const b = await comoPublicador().updates.create({ titulo: "Sai", descricao: "d", categoria: "novidade" });

    await comoPublicador().updates.delete({ id: b.id });

    const r = await comoAdmin().updates.list({});
    expect(r.total).toBe(1);
    expect(r.items[0].id).toBe(a.id);
  });
});

describe("updates — não lidas (badge do menu)", () => {
  it("sem nada publicado, não lidas é 0", async () => {
    const adminId = await criarUsuario(alvo.db, "admin", "Nova Cassiana");

    const r = await comoUsuario(adminId, "admin").updates.naoLidas();

    expect(r.count).toBe(0);
  });

  it("quem NUNCA abriu a aba vê TODAS como não lidas", async () => {
    const adminId = await criarUsuario(alvo.db, "admin", "Nova Cassiana");
    await alvo.db.insert(schema.systemUpdates).values([
      { titulo: "A", descricao: "d", criadoEm: new Date("2026-01-01T12:00:00Z") },
      { titulo: "B", descricao: "d", criadoEm: new Date("2026-01-02T12:00:00Z") },
    ]);

    const r = await comoUsuario(adminId, "admin").updates.naoLidas();

    expect(r.count).toBe(2);
  });

  it("marcar como lida zera a contagem", async () => {
    const adminId = await criarUsuario(alvo.db, "admin", "Nova Cassiana");
    await alvo.db.insert(schema.systemUpdates).values({
      titulo: "A", descricao: "d", criadoEm: new Date("2026-01-01T12:00:00Z"),
    });

    await comoUsuario(adminId, "admin").updates.marcarLidas();

    const r = await comoUsuario(adminId, "admin").updates.naoLidas();
    expect(r.count).toBe(0);
  });

  it("publicação DEPOIS de marcar como lida volta a contar", async () => {
    // Datas explícitas de propósito: depender do relógio da máquina para provar
    // "depois de marcar como lida" seria um teste instável.
    const adminId = await criarUsuario(alvo.db, "admin", "Nova Cassiana");
    await alvo.db.insert(schema.systemUpdates).values({
      titulo: "Antiga", descricao: "d", criadoEm: new Date("2020-01-01T12:00:00Z"),
    });

    await comoUsuario(adminId, "admin").updates.marcarLidas();

    await alvo.db.insert(schema.systemUpdates).values({
      titulo: "Nova, publicada depois de marcar como lida",
      descricao: "d",
      criadoEm: new Date(Date.now() + 60_000),
    });

    const r = await comoUsuario(adminId, "admin").updates.naoLidas();
    expect(r.count).toBe(1);
  });

  it("a leitura é POR USUÁRIO: um admin marcar como lida não afeta o outro", async () => {
    // O caso que uma coluna GLOBAL (em vez de por adminUserId) erraria: a
    // Cassiana abrir a aba não pode zerar o badge do Matheus também.
    const cassiana = await criarUsuario(alvo.db, "admin", "Cassiana");
    const matheus = await criarUsuario(alvo.db, "admin", "Matheus");
    await alvo.db.insert(schema.systemUpdates).values({
      titulo: "A", descricao: "d", criadoEm: new Date("2026-01-01T12:00:00Z"),
    });

    await comoUsuario(cassiana, "admin").updates.marcarLidas();

    expect((await comoUsuario(cassiana, "admin").updates.naoLidas()).count).toBe(0);
    expect((await comoUsuario(matheus, "admin").updates.naoLidas()).count).toBe(1);
  });

  it("operador também tem badge próprio (não é exclusivo de admin)", async () => {
    const operadorId = await criarUsuario(alvo.db, "operator", "Operador");
    await alvo.db.insert(schema.systemUpdates).values({
      titulo: "A", descricao: "d", criadoEm: new Date("2026-01-01T12:00:00Z"),
    });

    expect((await comoUsuario(operadorId, "operator").updates.naoLidas()).count).toBe(1);

    await comoUsuario(operadorId, "operator").updates.marcarLidas();

    expect((await comoUsuario(operadorId, "operator").updates.naoLidas()).count).toBe(0);
  });
});

describe("updates — quem LÊ o feed", () => {
  it("operador lê", async () => {
    const operadorId = await criarUsuario(alvo.db, "operator", "Operador");
    await comoPublicador().updates.create({ titulo: "Novidade", descricao: "d", categoria: "novidade" });

    const r = await comoOperador(operadorId).updates.list({});

    expect(r.total).toBe(1);
    expect(r.items[0].titulo).toBe("Novidade");
  });

  it("o PUBLICADOR lê (precisa ver o que publicou para editar)", async () => {
    // 🐛 Bug real pego na conferência visual: `list` era `adminAuthProcedure`, e
    // como o publicador não é usuário do sistema, a página de publicação abria
    // com "Nada publicado ainda" mesmo tendo três posts no banco.
    await comoPublicador().updates.create({
      titulo: "Publicada", descricao: "d", categoria: "novidade",
    });

    const r = await comoPublicador().updates.list({});

    expect(r.total).toBe(1);
    expect(r.items[0].titulo).toBe("Publicada");
  });

  it("deslogado não lê nada", async () => {
    const semSessao = {
      user: null,
      req: { protocol: "https", headers: {}, cookies: {} },
      res: { clearCookie: () => {} },
    } as unknown as TrpcContext;

    await expect(
      appRouter.createCaller(semSessao).updates.list({}),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("updates — quem PUBLICA (a régua que mudou em 2026-08-17)", () => {
  // O coração do pedido: publicar saiu do sistema. Nem admin escreve no feed.

  it("ADMIN não publica, não edita e não apaga", async () => {
    const { id } = await comoPublicador().updates.create({
      titulo: "Original", descricao: "d", categoria: "novidade",
    });

    await expect(
      comoAdmin().updates.create({ titulo: "Admin tentando", descricao: "d", categoria: "novidade" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    await expect(
      comoAdmin().updates.update({ id, titulo: "Adulterado", descricao: "d", categoria: "correcao" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    await expect(
      comoAdmin().updates.delete({ id }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    // E nada mudou no banco.
    const r = await comoAdmin().updates.list({});
    expect(r.total).toBe(1);
    expect(r.items[0].titulo).toBe("Original");
  });

  it("operador também não publica", async () => {
    const operadorId = await criarUsuario(alvo.db, "operator", "Operador");

    await expect(
      comoOperador(operadorId).updates.create({ titulo: "Não entra", descricao: "d", categoria: "novidade" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    expect((await comoAdmin().updates.list({})).total).toBe(0);
  });

  it("⚠️ token de SESSÃO do sistema não vale como publicador", async () => {
    // Copiar o cookie de sessão de um admin para o nome `btg_publicador` não
    // publica. (Na prática quem barra aqui é a checagem do `usuario`, que o
    // token de sessão não tem — o `kind` é a segunda camada, coberta abaixo.)
    const adminId = await criarUsuario(alvo.db, "admin", "Admin");
    const tokenDeSessao = jwt.sign({ userId: adminId, role: "admin" }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });

    await expect(
      comoPublicador(tokenDeSessao).updates.create({ titulo: "x", descricao: "d", categoria: "novidade" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("⚠️ token SEM o claim `kind` não vale, mesmo com o usuário certo", async () => {
    // Este é o caso que SÓ o `kind` barra — e a razão de ele existir. Descoberto
    // por sabotagem: desligar o `kind` não derrubava nenhum teste, porque todos
    // os tokens hostis que eu tinha escrito já caíam na checagem do `usuario`.
    const semKind = jwt.sign(
      { usuario: process.env.PUBLICADOR_USUARIO },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" },
    );

    await expect(
      comoPublicador(semKind).updates.create({ titulo: "x", descricao: "d", categoria: "novidade" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("⚠️ token assinado com OUTRO segredo não vale", async () => {
    const forjado = jwt.sign(
      { kind: "publicador", usuario: process.env.PUBLICADOR_USUARIO },
      "outro-segredo-qualquer-de-atacante",
      { expiresIn: "1h" },
    );

    await expect(
      comoPublicador(forjado).updates.create({ titulo: "x", descricao: "d", categoria: "novidade" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("⚠️ token de um usuário publicador ANTIGO para de valer ao trocar a credencial", async () => {
    // Trocar PUBLICADOR_USUARIO no Railway tem que derrubar as sessões antigas.
    const tokenAntigo = tokenPublicadorValido("publicador-de-antes");

    await expect(
      comoPublicador(tokenAntigo).updates.create({ titulo: "x", descricao: "d", categoria: "novidade" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("sem cookie nenhum, não publica", async () => {
    const { ctx } = contextoPublicador();

    await expect(
      appRouter.createCaller(ctx).updates.create({ titulo: "x", descricao: "d", categoria: "novidade" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("publicação NÃO grava autor (o publicador não é usuário do sistema)", async () => {
    await comoPublicador().updates.create({ titulo: "Sem autor", descricao: "d", categoria: "novidade" });

    const r = await comoAdmin().updates.list({});
    expect(r.items[0].autorNome).toBeNull();
  });
});

describe("updates — login do publicador", () => {
  it("usuário e senha corretos entram e recebem o cookie próprio", async () => {
    const { ctx, cookiesSetados } = contextoPublicador();

    const r = await appRouter.createCaller(ctx).updates.loginPublicador({
      usuario: process.env.PUBLICADOR_USUARIO!,
      senha: SENHA_PUBLICADOR,
    });

    expect(r.success).toBe(true);
    // O cookie certo saiu, com o nome certo — e o token vale de verdade.
    expect(cookiesSetados).toHaveLength(1);
    expect(cookiesSetados[0].nome).toBe("btg_publicador");
    const dados = jwt.verify(cookiesSetados[0].valor, process.env.JWT_SECRET!) as any;
    expect(dados.kind).toBe("publicador");
    expect(dados.usuario).toBe(process.env.PUBLICADOR_USUARIO);
  });

  it("o cookie emitido pelo login realmente publica", async () => {
    // Prova o ciclo inteiro, não só o formato do token.
    const { ctx, cookiesSetados } = contextoPublicador();
    await appRouter.createCaller(ctx).updates.loginPublicador({
      usuario: process.env.PUBLICADOR_USUARIO!,
      senha: SENHA_PUBLICADOR,
    });

    await comoPublicador(cookiesSetados[0].valor).updates.create({
      titulo: "Publicado com o cookie do login", descricao: "d", categoria: "novidade",
    });

    expect((await comoAdmin().updates.list({})).total).toBe(1);
  });

  it("senha errada é recusada", async () => {
    const { ctx, cookiesSetados } = contextoPublicador();

    await expect(
      appRouter.createCaller(ctx).updates.loginPublicador({
        usuario: process.env.PUBLICADOR_USUARIO!,
        senha: "senha-errada",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    expect(cookiesSetados).toHaveLength(0);
  });

  it("usuário errado é recusado, mesmo com a senha certa", async () => {
    const { ctx } = contextoPublicador();

    await expect(
      appRouter.createCaller(ctx).updates.loginPublicador({
        usuario: "outro-usuario",
        senha: SENHA_PUBLICADOR,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("souPublicador diz se a sessão vale", async () => {
    const semCookie = await appRouter.createCaller(contextoPublicador().ctx).updates.souPublicador();
    expect(semCookie.autenticado).toBe(false);
    expect(semCookie.configurado).toBe(true);

    const comCookie = await comoPublicador().updates.souPublicador();
    expect(comCookie.autenticado).toBe(true);
  });

  it("sair limpa o cookie", async () => {
    const { ctx, cookiesSetados } = contextoPublicador(tokenPublicadorValido());

    await appRouter.createCaller(ctx).updates.logoutPublicador();

    expect(cookiesSetados[0].nome).toBe("btg_publicador");
    expect(cookiesSetados[0].valor).toBe("");
  });

  it("a senha é comparada mesmo com usuário errado (anti-enumeração por tempo)", async () => {
    // Não mede tempo (seria instável); prova que o `bcrypt.compare` foi chamado
    // no caminho do usuário inexistente, que é o que iguala o custo.
    const spy = vi.spyOn(bcrypt, "compare");
    const { ctx } = contextoPublicador();

    await expect(
      appRouter.createCaller(ctx).updates.loginPublicador({
        usuario: "nao-existe", senha: "qualquer",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
