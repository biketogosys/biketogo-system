/**
 * Q8 — regras de desconto em BATCH (PGlite).
 *
 * Por que existe: duplicar contrato precisa das regras de TODAS as bikes do
 * contrato original pra recalcular o desconto no período novo. Sem isso o
 * contrato duplicado sairia com diária cheia — regressão do fix de desconto
 * progressivo achado pela Cassiana (2026-07-22).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createTestDb } from "./test-helpers/pglite-db";
import { getBikeDiscountRulesBatch } from "./db";
import * as schema from "../drizzle/schema";

describe("getBikeDiscountRulesBatch", () => {
  let db: any;
  let bikeComRegras: number;
  let bikeOutra: number;
  let bikeSemRegra: number;

  beforeAll(async () => {
    db = await createTestDb();

    const mkBike = async (model: string) => {
      const [b] = await db
        .insert(schema.bikes)
        .values({ serialNumber: `SN-${model}-${Math.random().toString(36).slice(2, 7)}`, model })
        .returning({ id: schema.bikes.id });
      return b.id;
    };

    bikeComRegras = await mkBike("Com Regras");
    bikeOutra = await mkBike("Outra");
    bikeSemRegra = await mkBike("Sem Regra");

    // Inseridas fora de ordem de propósito: o retorno tem que vir por minDays.
    await db.insert(schema.bikeDiscountRules).values([
      { bikeId: bikeComRegras, minDays: 7, discountPercent: "10.00" },
      { bikeId: bikeComRegras, minDays: 3, discountPercent: "5.00" },
      { bikeId: bikeOutra, minDays: 5, discountPercent: "20.00" },
    ]);
  });

  it("agrupa as regras por bikeId", async () => {
    const out = await getBikeDiscountRulesBatch(db, [bikeComRegras, bikeOutra]);
    expect(Object.keys(out).map(Number).sort()).toEqual([bikeComRegras, bikeOutra].sort());
    expect(out[bikeComRegras]).toHaveLength(2);
    expect(out[bikeOutra]).toHaveLength(1);
    expect(out[bikeOutra][0].discountPercent).toBe("20.00");
  });

  it("ordena por minDays crescente", async () => {
    const out = await getBikeDiscountRulesBatch(db, [bikeComRegras]);
    expect(out[bikeComRegras].map((r: any) => r.minDays)).toEqual([3, 7]);
  });

  it("bike sem regra NÃO aparece no mapa (não vira array vazio)", async () => {
    const out = await getBikeDiscountRulesBatch(db, [bikeComRegras, bikeSemRegra]);
    expect(out[bikeSemRegra]).toBeUndefined();
    expect(out[bikeComRegras]).toBeDefined();
  });

  it("lista vazia devolve {} sem tocar o banco", async () => {
    expect(await getBikeDiscountRulesBatch(db, [])).toEqual({});
  });

  it("não vaza regra de bike que não foi pedida", async () => {
    const out = await getBikeDiscountRulesBatch(db, [bikeOutra]);
    expect(out[bikeComRegras]).toBeUndefined();
  });

  it("o desconto aplicado é o de MAIOR minDays atingido (regra do contrato)", async () => {
    // Espelha o calcTotal do NewContractModal: filtra por numDays e pega o maior.
    const out = await getBikeDiscountRulesBatch(db, [bikeComRegras]);
    const pick = (numDays: number) =>
      out[bikeComRegras]
        .filter((r: any) => numDays >= r.minDays)
        .sort((a: any, b: any) => b.minDays - a.minDays)[0];

    expect(pick(2)).toBeUndefined();        // abaixo da menor faixa
    expect(pick(3)?.discountPercent).toBe("5.00");
    expect(pick(10)?.discountPercent).toBe("10.00"); // 7d vence 3d
  });
});
