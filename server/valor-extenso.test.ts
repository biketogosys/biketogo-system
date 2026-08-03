import { describe, expect, it } from "vitest";
import { formatarBRL, valorPorExtenso } from "./valor-extenso";

describe("valorPorExtenso", () => {
  it("escreve o caso do recibo do sistema antigo", () => {
    // O antigo imprimia "( duzentos e vinte reais)" — texto certo, formatação
    // torta. O texto tem que ser este.
    expect(valorPorExtenso("220.00")).toBe("duzentos e vinte reais");
  });

  it("trata singular de real e de centavo", () => {
    expect(valorPorExtenso(1)).toBe("um real");
    expect(valorPorExtenso(0.01)).toBe("um centavo");
    expect(valorPorExtenso(2)).toBe("dois reais");
  });

  it("junta reais e centavos", () => {
    expect(valorPorExtenso("70.58")).toBe("setenta reais e cinquenta e oito centavos");
    expect(valorPorExtenso(1487.5)).toBe("mil, quatrocentos e oitenta e sete reais e cinquenta centavos");
  });

  it("usa 'cem' sozinho e 'cento' acompanhado", () => {
    expect(valorPorExtenso(100)).toBe("cem reais");
    expect(valorPorExtenso(101)).toBe("cento e um reais");
  });

  it("não põe 'um' antes de mil", () => {
    expect(valorPorExtenso(1000)).toBe("mil reais");
    expect(valorPorExtenso(1200)).toBe("mil e duzentos reais");
    expect(valorPorExtenso(2000)).toBe("dois mil reais");
  });

  it("liga com 'e' ou vírgula conforme a última parcela", () => {
    expect(valorPorExtenso(1230)).toBe("mil, duzentos e trinta reais");
    expect(valorPorExtenso(1002)).toBe("mil e dois reais");
  });

  it("arredonda em centavos antes de separar", () => {
    // 0.615 vira 62 centavos: separar antes de arredondar daria 61.
    expect(valorPorExtenso(0.615)).toBe("sessenta e dois centavos");
  });

  it("cobre a faixa de um aluguel de bicicleta com folga", () => {
    expect(valorPorExtenso(450)).toBe("quatrocentos e cinquenta reais");
    expect(valorPorExtenso(15000)).toBe("quinze mil reais");
  });

  it("usa a preposição só quando o número termina na escala", () => {
    expect(valorPorExtenso(1_000_000)).toBe("um milhão de reais");
    expect(valorPorExtenso(2_000_000)).toBe("dois milhões de reais");
    expect(valorPorExtenso(1_500_000)).toBe("um milhão e quinhentos mil reais");
  });

  it("devolve vazio em vez de mentir quando não é número", () => {
    expect(valorPorExtenso(null)).toBe("");
    expect(valorPorExtenso(undefined)).toBe("");
    expect(valorPorExtenso("abc")).toBe("");
  });

  it("zero é zero reais", () => {
    expect(valorPorExtenso(0)).toBe("zero reais");
  });

  it("marca o negativo (estorno)", () => {
    expect(valorPorExtenso(-90)).toBe("menos noventa reais");
  });
});

describe("formatarBRL", () => {
  it("formata com vírgula decimal e ponto de milhar", () => {
    expect(formatarBRL("220")).toBe("R$ 220,00");
    expect(formatarBRL(1487.5)).toBe("R$ 1.487,50");
    expect(formatarBRL(1234567.89)).toBe("R$ 1.234.567,89");
  });

  it("não quebra com valor ausente", () => {
    expect(formatarBRL(null)).toBe("R$ 0,00");
  });
});
