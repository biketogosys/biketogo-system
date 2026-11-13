/**
 * Título do PDF numa linha só (2026-11-06).
 *
 * A dona: o contrato em espanhol *"ta saindo com letras passando uma nas
 * outras"*. "CONTRATO DE ALQUILER DE BICICLETA" mede 237,2pt em Helvetica-Bold
 * 12 e a caixa tem 236: o PDFKit quebrava em duas linhas e a segunda caía em
 * cima do nome da empresa. O português mede 235,7pt e cabia por 0,3pt.
 *
 * ⚠️ O texto do PDF não é extraível (fonte embutida), então a prova é medir
 * com a MESMA fonte do PDFKit, como o cabeçalho faz.
 */
import PDFDocument from "pdfkit";
import { describe, expect, it } from "vitest";
import { LARGURA_TITULO, PDF_LABELS, tamanhoParaCaber, type PdfLanguage } from "./pdf";

function medir(titulo: string) {
  const doc = new PDFDocument({ size: "A4" });
  doc.font("Helvetica-Bold").fontSize(12);
  const tamanho = tamanhoParaCaber(doc.widthOfString(titulo), LARGURA_TITULO, 12);
  doc.fontSize(tamanho);
  return {
    tamanho,
    largura: doc.widthOfString(titulo),
    // Altura com a mesma caixa do cabeçalho: uma linha só, ou quebrou.
    linhas: Math.round(doc.heightOfString(titulo, { width: LARGURA_TITULO }) / doc.currentLineHeight(true)),
  };
}

describe("título do contrato no cabeçalho do PDF", () => {
  it.each(["pt", "en", "es"] as PdfLanguage[])("em %s cabe numa linha", (idioma) => {
    const m = medir(PDF_LABELS[idioma].contractTitle);
    expect(m.largura).toBeLessThanOrEqual(LARGURA_TITULO);
    expect(m.linhas).toBe(1);
  });

  it("o espanhol diminui um pouco; português e inglês ficam em 12", () => {
    expect(medir(PDF_LABELS.es.contractTitle).tamanho).toBe(11.9);
    expect(medir(PDF_LABELS.pt.contractTitle).tamanho).toBe(12);
    expect(medir(PDF_LABELS.en.contractTitle).tamanho).toBe(12);
  });
});

describe("tamanhoParaCaber", () => {
  it("não aumenta o que já cabe", () => {
    expect(tamanhoParaCaber(100, 236, 12)).toBe(12);
    expect(tamanhoParaCaber(236, 236, 12)).toBe(12);
  });

  it("arredonda para BAIXO, senão sobra um décimo para fora", () => {
    // 12 × 236 / 237,2 = 11,939… → 11,9 (11,94 não caberia com folga zero)
    expect(tamanhoParaCaber(237.2, 236, 12)).toBe(11.9);
    expect(tamanhoParaCaber(472, 236, 12)).toBe(6);
  });
});
