/**
 * Desconto dado DEPOIS de assinar não aparecia no contrato (2026-11-25).
 *
 * A dona: *"dei desconto depois que assinamos o contrato original.. fui baixar o
 * novo com o desconto e to vendo que não tem em lugar nenhum nele o desconto que
 * foi dado"*. Bike de R$ 220,00 a diária, desconto manual de ~9%, total R$ 200,00.
 * O valor entrou certo; o PDF mostrava diária R$ 220,00 e subtotal R$ 200,00 sem
 * explicar a diferença.
 *
 * Causa: o PDF escreve "desconto de X% aplicado" lendo `rentals.discountPercent`,
 * e o ramo de edição de contrato ATIVO (o de quem já assinou) gravava o total
 * novo da bike sem gravar o percentual. A bike nova adicionada nesse ramo também
 * nascia sem ele. O ramo PENDENTE sempre gravou.
 *
 * ⚠️ Roda a procedure de verdade contra PGlite (mesmo arranjo de mocks de
 * `financeiro-duplicidade.test.ts`, pelo mesmo motivo: `createRental` e
 * `createAuditLog` chamam o `getDb` de dentro do `db.ts`).
 */
import { readFileSync } from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { createTestDb, seedBasics } from "./test-helpers/pglite-db";
import type { TrpcContext } from "./_core/context";

vi.setConfig({ testTimeout: 30_000 });

const alvo = vi.hoisted(() => {
  process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres-aqui";
  return { db: null as any };
});

vi.mock("./db", async (importOriginal) => {
  const real = await importOriginal<typeof import("./db")>();
  const s = await import("../drizzle/schema");
  return {
    ...real,
    getDb: async () => alvo.db,
    createRevenue: async (data: any) => {
      const [r] = await alvo.db.insert(s.revenues).values(data).returning({ id: s.revenues.id });
      return r.id;
    },
    createRental: async (data: any) => {
      const [r] = await alvo.db.insert(s.rentals).values(data).returning({ id: s.rentals.id });
      return r.id;
    },
    createAuditLog: async () => {},
  };
});

const { appRouter, buildContractPdfData } = await import("./routers");
const { rotuloDesconto } = await import("./pdf");

function contextoAdmin(): TrpcContext {
  return {
    user: {
      id: 1, openId: "admin-teste", email: "admin@teste.local", name: "Admin Teste",
      loginMethod: "manus", role: "admin",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, cookies: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}
const comoAdmin = () => appRouter.createCaller(contextoAdmin());

/** O caso do print: contrato ATIVO, uma bike de R$ 220,00 por um dia, sem desconto. */
async function contratoAssinado() {
  const base = await seedBasics(alvo.db);
  const [c] = await alvo.db.insert(schema.contracts)
    .values({ clientId: base.clientId, valorTotal: "220.00", status: "ativo" })
    .returning({ id: schema.contracts.id });
  const [r] = await alvo.db.insert(schema.rentals).values({
    clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
    quantity: 1, startDate: "2026-11-25", endDate: "2026-11-25",
    startTime: "09:30", endTime: "17:00",
    dailyRate: "220.00", totalAmount: "220.00",
    status: "active", paymentStatus: "pending", contractId: c.id,
  }).returning({ id: schema.rentals.id });
  return { ...base, contractId: c.id, rentalId: r.id };
}

const bikeDoContrato = (ct: Awaited<ReturnType<typeof contratoAssinado>>) => ({
  rentalId: ct.rentalId, bikeId: ct.bikeId, bikeSizeId: ct.bikeSizeId,
  startDate: "2026-11-25", endDate: "2026-11-25", startTime: "09:30", endTime: "17:00",
  quantity: 1, dailyRate: "220.00",
});

async function descontoDasBikes(contractId: number) {
  const linhas = await alvo.db.select({ pct: schema.rentals.discountPercent })
    .from(schema.rentals).where(eq(schema.rentals.contractId, contractId));
  return linhas.map((l: { pct: string | null }) => l.pct);
}

beforeEach(async () => {
  alvo.db = await createTestDb();
});

describe("desconto dado na edição de contrato já assinado", () => {
  it("a bike guarda o percentual, e o PDF recebe o desconto", async () => {
    const ct = await contratoAssinado();
    await comoAdmin().contracts.update({
      id: ct.contractId, clientId: ct.clientId,
      descontoPercent: 9.09,
      bikes: [{ ...bikeDoContrato(ct), totalAmount: "200.00", discountPercent: "9.09" }],
    });

    expect(await descontoDasBikes(ct.contractId)).toEqual(["9.09"]);
    const pdf = await buildContractPdfData(alvo.db, ct.contractId);
    expect(pdf.rentals[0].totalAmount).toBe("200.00");
    expect(pdf.rentals[0].discountPercent).toBe("9.09");
  });

  it("tirar o desconto na edição tira o percentual da bike", async () => {
    const ct = await contratoAssinado();
    await comoAdmin().contracts.update({
      id: ct.contractId, clientId: ct.clientId, descontoPercent: 9.09,
      bikes: [{ ...bikeDoContrato(ct), totalAmount: "200.00", discountPercent: "9.09" }],
    });
    await comoAdmin().contracts.update({
      id: ct.contractId, clientId: ct.clientId, descontoPercent: 0,
      bikes: [{ ...bikeDoContrato(ct), totalAmount: "220.00" }],
    });

    expect(await descontoDasBikes(ct.contractId)).toEqual([null]);
  });

  it("bike adicionada na edição já nasce com o desconto", async () => {
    const ct = await contratoAssinado();
    await comoAdmin().contracts.update({
      id: ct.contractId, clientId: ct.clientId, descontoPercent: 9.09,
      bikes: [
        { ...bikeDoContrato(ct), totalAmount: "200.00", discountPercent: "9.09" },
        { ...bikeDoContrato(ct), rentalId: undefined, totalAmount: "200.00", discountPercent: "9.09" },
      ],
    });

    expect(await descontoDasBikes(ct.contractId)).toEqual(["9.09", "9.09"]);
  });
});

describe("scripts/corrigir-desconto-edicao.sql", () => {
  const SCRIPT = readFileSync(
    path.resolve(import.meta.dirname, "../scripts/corrigir-desconto-edicao.sql"), "utf8",
  );
  const rodar = () => (alvo.db as any).$client.exec(SCRIPT);

  async function semear() {
    const base = await seedBasics(alvo.db);
    const contrato = async (descontoPercent: string | null) =>
      (await alvo.db.insert(schema.contracts)
        .values({ clientId: base.clientId, valorTotal: "200.00", status: "ativo", descontoPercent })
        .returning({ id: schema.contracts.id }))[0].id;
    const bike = async (contractId: number, extra: Record<string, unknown> = {}) =>
      (await alvo.db.insert(schema.rentals).values({
        clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
        quantity: 1, startDate: "2026-11-25", endDate: "2026-11-25",
        dailyRate: "220.00", totalAmount: "200.00", status: "active", contractId, ...extra,
      }).returning({ id: schema.rentals.id }))[0].id;

    const comManual = await contrato("9.09");
    const soFaixa = await contrato(null);
    return {
      // o caso do print: desconto manual no contrato, bike sem percentual
      semPercentual: await bike(comManual),
      jaCerta: await bike(comManual, { discountPercent: "9.09" }),
      apagada: await bike(comManual, { deletedAt: new Date() }),
      // desconto por dias, sem manual: não é com este script
      faixa: await bike(soFaixa, { discountPercent: "10.00", dailyRate: "100.00", totalAmount: "630.00" }),
    };
  }

  const pct = async (id: number) =>
    (await alvo.db.select({ p: schema.rentals.discountPercent }).from(schema.rentals)
      .where(eq(schema.rentals.id, id)))[0].p;

  it("a bike do contrato com desconto manual ganha o percentual dele", async () => {
    const ids = await semear();
    await rodar();
    expect(await pct(ids.semPercentual)).toBe("9.09");
  });

  it("não toca em bike apagada, em bike já certa nem em desconto por dias", async () => {
    const ids = await semear();
    const antes = await alvo.db.select().from(schema.rentals).where(eq(schema.rentals.id, ids.jaCerta));
    await rodar();
    expect(await pct(ids.apagada)).toBeNull();
    expect(await pct(ids.faixa)).toBe("10.00");
    const depois = await alvo.db.select().from(schema.rentals).where(eq(schema.rentals.id, ids.jaCerta));
    expect(depois).toEqual(antes);
  });

  it("é idempotente: a segunda rodada não muda nada", async () => {
    await semear();
    await rodar();
    const antes = await alvo.db.select().from(schema.rentals);
    await rodar();
    expect(await alvo.db.select().from(schema.rentals)).toEqual(antes);
  });
});

describe("rótulo do desconto no PDF", () => {
  it("vírgula em português e espanhol, ponto em inglês", () => {
    expect(rotuloDesconto(9.09, "pt")).toBe("desconto de 9,09% aplicado");
    expect(rotuloDesconto(9.09, "es")).toBe("descuento del 9,09% aplicado");
    expect(rotuloDesconto(9.09, "en")).toBe("9.09% discount applied");
  });

  it("cabe numa linha embaixo da diária e do subtotal, onde a do subtotal sozinha não bastava", () => {
    const doc = new PDFDocument({ size: "A4" });
    doc.font("Helvetica").fontSize(6.5);
    // Colunas da tabela de bikes: diária em x 414, subtotal em x 470 com 85 de
    // largura. A caixa nova vai de 414 a 555, menos 8 de margem; a antiga era
    // só a do subtotal, 85 − 8.
    const CAIXA_NOVA = 555 - 414 - 8;
    const CAIXA_ANTIGA = 85 - 8;
    expect(doc.widthOfString(rotuloDesconto(9.09, "pt"))).toBeGreaterThan(CAIXA_ANTIGA);
    for (const idioma of ["pt", "es", "en"] as const) {
      expect(doc.widthOfString(rotuloDesconto(99.99, idioma))).toBeLessThanOrEqual(CAIXA_NOVA);
    }
  });

  it("percentual redondo sai sem casas", () => {
    expect(rotuloDesconto(15, "pt")).toBe("desconto de 15% aplicado");
    expect(rotuloDesconto(12.5, "pt")).toBe("desconto de 12,5% aplicado");
  });
});
