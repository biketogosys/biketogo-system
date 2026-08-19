/**
 * A conta de diárias do lado do CLIENTE e a rede de segurança dos campos.
 *
 * Por que este arquivo existe: a fórmula da tela é um ESPELHO da do servidor
 * (`billableDaysWithTime`) e não tinha teste nenhum. É ela que diz à loja quanto
 * o contrato vai custar antes de salvar; divergir do servidor significa mostrar
 * um número e cobrar outro. Os casos abaixo são os MESMOS do teste do servidor,
 * de propósito — se um lado mudar sozinho, um dos dois arquivos cai.
 */
import { describe, expect, it } from "vitest";
import { diariasCobradas, minutosDoDia, valorASincronizar } from "./diarias";

describe("diariasCobradas — espelho do servidor", () => {
  const dias = (sd: string, st: string, ed: string, et: string) =>
    diariasCobradas(sd, st ? ed : ed, st, et);

  it("⭐ o caso da dona: manhã de um dia até o fim do outro = 2 diárias", () => {
    expect(diariasCobradas("2026-07-20", "2026-07-21", "09:00", "18:00")).toBe(2);
  });

  it("dentro das 24h continua 1 diária, mesmo virando o dia", () => {
    expect(diariasCobradas("2026-07-20", "2026-07-21", "09:00", "08:00")).toBe(1);
  });

  it("exatamente 24h é 1 diária", () => {
    expect(diariasCobradas("2026-07-20", "2026-07-21", "09:00", "09:00")).toBe(1);
  });

  it("⚠️ SEM tolerância: 1 minuto além das 24h já é a 2ª diária", () => {
    expect(diariasCobradas("2026-07-20", "2026-07-21", "09:00", "09:01")).toBe(2);
  });

  it("período longo casa com o calendário quando a hora é a mesma", () => {
    expect(diariasCobradas("2026-07-20", "2026-07-24", "09:00", "09:00")).toBe(4);
  });

  it("mesmo dia, poucas horas, é 1 diária", () => {
    expect(diariasCobradas("2026-07-20", "2026-07-20", "09:00", "17:00")).toBe(1);
  });

  it("devolver mais cedo que a retirada não zera nem fica negativo", () => {
    expect(diariasCobradas("2026-07-20", "2026-07-20", "18:00", "09:00")).toBe(1);
  });

  it("49h viram 3 diárias (o bloco parcial conta cheio)", () => {
    expect(diariasCobradas("2026-07-20", "2026-07-22", "09:00", "10:00")).toBe(3);
  });

  it("SEM horário cai no dia de calendário (contrato legado)", () => {
    expect(diariasCobradas("2026-07-20", "2026-07-21")).toBe(1);
    expect(diariasCobradas("2026-07-20", "2026-07-25")).toBe(5);
  });

  it("horário em UMA ponta só também cai no calendário", () => {
    expect(diariasCobradas("2026-07-20", "2026-07-21", "09:00", null)).toBe(1);
    expect(diariasCobradas("2026-07-20", "2026-07-21", null, "18:00")).toBe(1);
  });

  it("hora inválida é tratada como ausente, não quebra a conta", () => {
    expect(diariasCobradas("2026-07-20", "2026-07-21", "banana", "18:00")).toBe(1);
    expect(diariasCobradas("2026-07-20", "2026-07-21", "25:00", "18:00")).toBe(1);
  });

  it("sem data devolve 1, não NaN", () => {
    expect(diariasCobradas("", "")).toBe(1);
  });
});

describe("minutosDoDia", () => {
  it("converte hora válida", () => {
    expect(minutosDoDia("09:00")).toBe(540);
    expect(minutosDoDia("00:00")).toBe(0);
    expect(minutosDoDia("23:59")).toBe(1439);
  });

  it("recusa o que não é hora", () => {
    expect(minutosDoDia("24:00")).toBeNull();
    expect(minutosDoDia("10:60")).toBeNull();
    expect(minutosDoDia("abc")).toBeNull();
    expect(minutosDoDia("")).toBeNull();
    expect(minutosDoDia(null)).toBeNull();
  });
});

/**
 * A falha que a Cassiana viu: o campo mostrava a data, o sistema agia como se
 * estivesse vazio, e a bike não liberava. Reproduzida no navegador escrevendo no
 * campo sem disparar evento — e resolvida relendo o valor quando o campo perde
 * o foco. Estes casos protegem essa releitura.
 */
describe("valorASincronizar — rede de segurança dos campos", () => {
  it("⭐ recupera o valor que está no campo mas não chegou ao estado", () => {
    expect(valorASincronizar("2026-08-29", "")).toBe("2026-08-29");
  });

  it("não faz nada quando já bate (sem render à toa)", () => {
    expect(valorASincronizar("2026-08-29", "2026-08-29")).toBeNull();
  });

  it("campo vazio NÃO apaga o que já está no estado", () => {
    // Importante: sair de um campo vazio não pode limpar uma data já escolhida.
    expect(valorASincronizar("", "2026-08-29")).toBeNull();
  });

  it("corrige quando o campo mudou para outro valor", () => {
    expect(valorASincronizar("2026-08-30", "2026-08-29")).toBe("2026-08-30");
  });

  it("vale igual para hora", () => {
    expect(valorASincronizar("17:30", "09:00")).toBe("17:30");
    expect(valorASincronizar("09:00", "09:00")).toBeNull();
  });
});
