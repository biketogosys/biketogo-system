/**
 * `periodLabel` — o período que sai no PDF do contrato (2026-08-18).
 *
 * Por que existe um teste só para isto: o PDF é gerado com fonte EMBUTIDA
 * (subset), então o texto do arquivo final não é legível por extração — não dá
 * para conferir o documento lendo o `.pdf`. A alternativa honesta é testar a
 * função que monta a string.
 *
 * O que protege: o horário combinado tem que aparecer no documento assinado.
 * Ele é o que decide a virada da diária; um PDF só com datas não explica por que
 * o contrato cobrou 2 diárias de um dia para o outro.
 */
import { describe, expect, it } from "vitest";
import { periodLabel } from "./pdf";

const rental = (r: Partial<Parameters<typeof periodLabel>[0]>) =>
  periodLabel(r as Parameters<typeof periodLabel>[0]);

describe("periodLabel (PDF)", () => {
  it("com horário, data e hora saem juntas nas duas pontas", () => {
    expect(
      rental({ startDate: "2026-09-10", endDate: "2026-09-11", startTime: "09:00", endTime: "18:00" }),
    ).toBe("10/09/2026 09:00 a 11/09/2026 18:00");
  });

  it("SEM horário sai só com as datas (contrato legado, formato inalterado)", () => {
    expect(rental({ startDate: "2026-09-10", endDate: "2026-09-15" })).toBe("10/09/2026 a 15/09/2026");
  });

  it("mesmo dia com horas diferentes mostra as duas pontas", () => {
    expect(
      rental({ startDate: "2026-09-10", endDate: "2026-09-10", startTime: "09:00", endTime: "17:00" }),
    ).toBe("10/09/2026 09:00 a 10/09/2026 17:00");
  });

  it("mesmo dia e mesma hora não repete o valor", () => {
    expect(
      rental({ startDate: "2026-09-10", endDate: "2026-09-10", startTime: "09:00", endTime: "09:00" }),
    ).toBe("10/09/2026 09:00");
  });

  it("mesmo dia sem hora continua sem repetir", () => {
    expect(rental({ startDate: "2026-09-10", endDate: "2026-09-10" })).toBe("10/09/2026");
  });

  it("hora em UMA ponta só aparece só naquela ponta", () => {
    // Não inventa hora do outro lado: mostra o que existe.
    expect(
      rental({ startDate: "2026-09-10", endDate: "2026-09-11", startTime: "09:00" }),
    ).toBe("10/09/2026 09:00 a 11/09/2026");
  });

  it("sem data nenhuma devolve o travessão, como antes", () => {
    expect(rental({})).toBe("—");
  });
});
