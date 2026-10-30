/**
 * País mostrado para um telefone já salvo (só o código fica gravado).
 *
 * Bug real (2026-10-27): cliente dos EUA com o telefone "+1" aparecia com a
 * bandeira do Canadá na edição. A busca pegava o primeiro país da lista com o
 * código, e a lista é alfabética.
 */
import { describe, expect, it } from "vitest";
import { DDI_OPTIONS, ddiLabel } from "./countries";

describe("ddiLabel", () => {
  it.each([
    ["+1", "Estados Unidos"],
    ["+44", "Reino Unido"],
    ["+7", "Rússia"],
    ["+55", "Brasil"],
    ["+351", "Portugal"],
  ])("%s mostra %s", (codigo, pais) => {
    expect(ddiLabel(codigo)?.name).toBe(pais);
  });

  it("país novo com código já usado obriga a decidir o principal", () => {
    // Se esta lista mudar, alguém acrescentou um país com código de outro:
    // decida qual mostrar em PRINCIPAL_DO_DDI (countries.ts) e atualize aqui.
    // Holanda e Países Baixos (+31) são o mesmo país: qualquer um serve.
    const porCodigo = new Map<string, number>();
    for (const o of DDI_OPTIONS) porCodigo.set(o.code, (porCodigo.get(o.code) ?? 0) + 1);
    const divididos = [...porCodigo].filter(([c, n]) => n > 1 && c !== "+31").map(([c]) => c).sort();
    expect(divididos).toEqual(["+1", "+44", "+7"]);
  });
});
