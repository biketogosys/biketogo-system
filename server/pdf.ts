/**
 * server/pdf.ts
 * Geração de PDF de contrato usando pdfkit.
 * Busca os dados da empresa em system_settings antes de gerar o PDF.
 * Retorna um Buffer com o PDF pronto para upload no S3.
 */

import PDFDocument from "pdfkit";

export interface ContractPdfData {
  contractId: number;
  clientName: string;
  clientCpf?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  criadoEm: Date | string;
  valorTotal?: string | null;
  // Bikes alugadas
  rentals: Array<{
    bikeModel?: string | null;
    bikeBrand?: string | null;
    bikeSerialNumber?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    totalAmount?: string | null;
  }>;
  // Acessórios
  accessories: Array<{
    accessoryName?: string | null;
    qty?: number | null;
    serialNumber?: string | null;
  }>;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR");
}

function formatCurrency(v: string | null | undefined): string {
  if (!v) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Busca um setting do banco e retorna o valor ou um placeholder descritivo */
async function fetchSetting(key: string, placeholder: string): Promise<string> {
  try {
    const { getSetting } = await import("./db");
    const value = await getSetting(key);
    return value && value.trim() !== "" ? value : placeholder;
  } catch {
    return placeholder;
  }
}

export async function generateContractPdf(data: ContractPdfData): Promise<Buffer> {
  // ── Buscar dados da empresa nas Configurações ──────────────────────────────
  const [
    empresaNome,
    empresaCnpj,
    empresaEndereco,
    empresaCidade,
    empresaEstado,
    empresaTelefone,
    empresaEmail,
    empresaForo,
    empresaTermos,
    empresaCaucao,
  ] = await Promise.all([
    fetchSetting("company_name",    "[Razão Social não configurada]"),
    fetchSetting("company_cnpj",    "[CNPJ não configurado]"),
    fetchSetting("company_address", "[Endereço não configurado]"),
    fetchSetting("company_city",    "[Cidade não configurada]"),
    fetchSetting("company_state",   "[Estado não configurado]"),
    fetchSetting("company_phone",   "[Telefone não configurado]"),
    fetchSetting("company_email",   "[E-mail não configurado]"),
    fetchSetting("company_foro",    "[Foro não configurado]"),
    fetchSetting("company_terms",   ""),
    fetchSetting("company_caucao",  ""),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const primaryColor = "#1a56db";
    const grayColor = "#6b7280";
    const lineColor = "#e5e7eb";
    const pageWidth = doc.page.width - 100; // margins 50 each side

    // ── Header ──────────────────────────────────────────────────────────────
    doc.fontSize(20).fillColor(primaryColor).font("Helvetica-Bold")
      .text(empresaNome, 50, 50);
    doc.fontSize(9).fillColor(grayColor).font("Helvetica");
    doc.text(`CNPJ: ${empresaCnpj}`);
    const addr = [empresaEndereco, empresaCidade, empresaEstado].filter(Boolean).join(", ");
    if (addr) doc.text(addr);
    doc.text(`Tel: ${empresaTelefone}`);
    doc.text(`E-mail: ${empresaEmail}`);

    // Número do contrato (top-right)
    doc.fontSize(14).fillColor(primaryColor).font("Helvetica-Bold")
      .text(`CONTRATO #${data.contractId}`, 50, 50, { align: "right" });
    doc.fontSize(9).fillColor(grayColor).font("Helvetica")
      .text(`Emitido em: ${formatDate(data.criadoEm)}`, { align: "right" });

    doc.moveDown(2);

    // ── Divider ──────────────────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(lineColor).stroke();
    doc.moveDown(0.5);

    // ── Dados do Cliente ─────────────────────────────────────────────────────
    doc.fontSize(11).fillColor(primaryColor).font("Helvetica-Bold").text("DADOS DO CLIENTE");
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#111827").font("Helvetica");
    doc.text(`Nome: ${data.clientName || "—"}`);
    if (data.clientCpf) doc.text(`CPF: ${data.clientCpf}`);
    if (data.clientPhone) doc.text(`Telefone: ${data.clientPhone}`);
    if (data.clientEmail) doc.text(`E-mail: ${data.clientEmail}`);
    doc.moveDown(1);

    // ── Bicicletas ───────────────────────────────────────────────────────────
    doc.fontSize(11).fillColor(primaryColor).font("Helvetica-Bold").text("BICICLETAS ALUGADAS");
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(lineColor).stroke();
    doc.moveDown(0.3);

    if (data.rentals.length === 0) {
      doc.fontSize(9).fillColor(grayColor).font("Helvetica").text("Nenhuma bicicleta vinculada.");
    } else {
      // Table header
      const colX = [50, 200, 310, 390, 470];
      doc.fontSize(8).fillColor(grayColor).font("Helvetica-Bold");
      doc.text("Modelo / Marca", colX[0], doc.y, { width: 145, continued: false });
      const headerY = doc.y - doc.currentLineHeight();
      doc.text("Nº Série", colX[1], headerY, { width: 105 });
      doc.text("Início", colX[2], headerY, { width: 75 });
      doc.text("Devolução", colX[3], headerY, { width: 75 });
      doc.text("Valor", colX[4], headerY, { width: 80, align: "right" });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(lineColor).stroke();
      doc.moveDown(0.3);

      for (const r of data.rentals) {
        const model = [r.bikeModel, r.bikeBrand].filter(Boolean).join(" / ") || "—";
        const rowY = doc.y;
        doc.fontSize(9).fillColor("#111827").font("Helvetica");
        doc.text(model, colX[0], rowY, { width: 145 });
        doc.text(r.bikeSerialNumber || "—", colX[1], rowY, { width: 105 });
        doc.text(formatDate(r.startDate), colX[2], rowY, { width: 75 });
        doc.text(formatDate(r.endDate), colX[3], rowY, { width: 75 });
        doc.text(formatCurrency(r.totalAmount), colX[4], rowY, { width: 80, align: "right" });
        doc.moveDown(0.5);
      }
    }
    doc.moveDown(0.8);

    // ── Acessórios ───────────────────────────────────────────────────────────
    if (data.accessories.length > 0) {
      doc.fontSize(11).fillColor(primaryColor).font("Helvetica-Bold").text("ACESSÓRIOS INCLUÍDOS");
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(lineColor).stroke();
      doc.moveDown(0.3);

      for (const a of data.accessories) {
        const rowY = doc.y;
        doc.fontSize(9).fillColor("#111827").font("Helvetica");
        doc.text(`• ${a.accessoryName || "—"}`, 50, rowY, { width: 250 });
        doc.text(`Qtd: ${a.qty ?? 1}`, 310, rowY, { width: 80 });
        if (a.serialNumber) doc.text(`Nº Série: ${a.serialNumber}`, 400, rowY, { width: 150 });
        doc.moveDown(0.5);
      }
      doc.moveDown(0.8);
    }

    // ── Total ────────────────────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(lineColor).stroke();
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor(primaryColor).font("Helvetica-Bold")
      .text(`VALOR TOTAL: ${formatCurrency(data.valorTotal)}`, { align: "right" });
    doc.moveDown(1.5);

    // ── Caução ───────────────────────────────────────────────────────────────
    if (empresaCaucao && empresaCaucao.trim() !== "") {
      doc.fontSize(9).fillColor(grayColor).font("Helvetica")
        .text(`Caução: ${empresaCaucao}`, { align: "right" });
      doc.moveDown(1);
    }

    // ── Termos e Condições ───────────────────────────────────────────────────
    if (empresaTermos && empresaTermos.trim() !== "") {
      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(lineColor).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor(primaryColor).font("Helvetica-Bold").text("TERMOS E CONDIÇÕES");
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor("#374151").font("Helvetica").text(empresaTermos, { width: pageWidth });
      doc.moveDown(1);
    }

    // ── Foro ─────────────────────────────────────────────────────────────────
    if (empresaForo && empresaForo !== "[Foro não configurado]") {
      doc.fontSize(8).fillColor(grayColor).font("Helvetica")
        .text(`Foro: ${empresaForo}`, { width: pageWidth });
      doc.moveDown(1.5);
    } else {
      doc.moveDown(1);
    }

    // ── Assinaturas ──────────────────────────────────────────────────────────
    const sigY = doc.y;
    const sigWidth = (pageWidth - 40) / 2;
    doc.fontSize(9).fillColor(grayColor).font("Helvetica");
    doc.moveTo(50, sigY + 30).lineTo(50 + sigWidth, sigY + 30).strokeColor("#9ca3af").stroke();
    doc.text("Assinatura do Cliente", 50, sigY + 35, { width: sigWidth, align: "center" });
    doc.moveTo(50 + sigWidth + 40, sigY + 30).lineTo(50 + pageWidth, sigY + 30).strokeColor("#9ca3af").stroke();
    doc.text(`Assinatura — ${empresaNome}`, 50 + sigWidth + 40, sigY + 35, { width: sigWidth, align: "center" });

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.fontSize(7).fillColor(grayColor)
      .text(
        `Documento gerado em ${new Date().toLocaleString("pt-BR")} — Contrato #${data.contractId}`,
        50, doc.page.height - 40, { align: "center", width: pageWidth }
      );

    doc.end();
  });
}
