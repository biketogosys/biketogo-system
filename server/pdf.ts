/**
 * server/pdf.ts
 * Geração de PDF de contrato — layout Bike To Go aprovado.
 * Header dark/gold, logo BTG, partes contratantes, tabelas, termos, assinaturas, rodapé.
 * Retorna Promise<Buffer> — o upload pro S3 é feito pelo chamador.
 */

import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

// Textos legais padrão (Objeto + Termos). Fonte ÚNICA, compartilhada com a tela
// de Configurações (settings.getContractDefaults) — antes ficavam hardcoded aqui
// e a tela mostrava os campos em branco, escondendo o texto real do contrato.
import { DEFAULT_OBJETO, DEFAULT_TERMOS } from "./contract-defaults";

// ── Paleta ────────────────────────────────────────────────────────────────────
const DARK   = "#1A1A1A";
const GOLD   = "#C8920A";
const CREAM  = "#FBF6E9";
const INK    = "#2A2A2A";
const MUTED  = "#7C7C7C";
const LINE   = "#E6E1D5";
const ALT    = "#FAF7EF";
const WHITE  = "#FFFFFF";
const BANDTX = "#BDBDBD";

// ── Layout ────────────────────────────────────────────────────────────────────
const M     = 40;   // margem esquerda
const RIGHT = 555;  // margem direita
const CW    = RIGHT - M; // largura útil

// ── Interface ─────────────────────────────────────────────────────────────────
export interface ContractPdfData {
  contractId: number;
  clientName: string;
  clientCpf?: string | null;
  clientRg?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  criadoEm: Date | string;
  valorTotal?: string | null;
  paymentMethod?: string | null;
  rentals: Array<{
    bikeModel?: string | null;
    bikeBrand?: string | null;
    bikeSerialNumber?: string | null;
    bikeUnitNumeros?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    totalAmount?: string | null;
    tamanho?: string | null;
    dailyRate?: string | null;
    quantity?: number | null;
    discountPercent?: string | null;
  }>;
  accessories: Array<{
    accessoryName?: string | null;
    qty?: number | null;
    serialNumber?: string | null;
    valorReposicao?: string | null;
  }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR");
}

function formatDateLong(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function formatCurrency(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcSubtotal(r: ContractPdfData["rentals"][0]): string {
  if (r.totalAmount) return formatCurrency(r.totalAmount);
  if (r.dailyRate && r.startDate && r.endDate) {
    const s = new Date(r.startDate as string);
    const e = new Date(r.endDate as string);
    const days = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000));
    const rate = parseFloat(String(r.dailyRate));
    if (!isNaN(rate)) return formatCurrency(rate * days);
  }
  return "—";
}

function periodLabel(r: ContractPdfData["rentals"][0]): string {
  const s = formatDate(r.startDate);
  const e = formatDate(r.endDate);
  if (s === "—" && e === "—") return "—";
  if (s === e) return s;
  return `${s} a ${e}`;
}

// ── Internacionalização ──────────────────────────────────────────────────────
export type PdfLanguage = "pt" | "en" | "es";

const PDF_LABELS: Record<PdfLanguage, {
  contractTitle: string;
  bikesSubtitle: string;
  contractObject: string;
  section1: string;
  section2: string;
  section3: string;
  section4: string;
  section5: string;
  colN: string;
  colModelo: string;
  colTam: string;
  colQtd: string;
  colSis: string;
  colPeriodo: string;
  colDiaria: string;
  colSubtotal: string;
  colItem: string;
  colUnidade: string;
  totalLocacao: string;
  caucaoLabel: string;
  formaPagamento: string;
  pm: Record<string, string>;
  nenhumaBike: string;
  nenhumAcessorio: string;
  notaSistema: string;
  locadora: string;
  locatario: string;
  periodo: string;
}> = {
  pt: {
    contractTitle: "CONTRATO DE LOCAÇÃO DE BICICLETA",
    bikesSubtitle:  "Locação de bicicletas",
    section1:  "Partes contratantes",
    section2:  "Objeto da locação",
    section3:  "Acessórios inclusos",
    section4:  "Valores",
    section5:  "Termos e condições",
    colN:        "Nº",
    colModelo:   "Modelo",
    colTam:      "Tam.",
    colQtd:      "Qtd",
    colSis:      "Nº sistema",
    colPeriodo:  "Período",
    colDiaria:   "Diária",
    colSubtotal: "Subtotal",
    colItem:     "Item",
    colUnidade:  "Nº unidade",
    totalLocacao: "Total da locação",
    caucaoLabel:  "Caução (devolvida na entrega das bikes)",
    formaPagamento: "Forma de pagamento",
    pm: { pix: "Pix", cash: "Dinheiro", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", stripe: "Cartão", other: "Outro" },
    nenhumaBike:  "Nenhuma bicicleta vinculada.",
    nenhumAcessorio: "Nenhum acessório vinculado.",
    notaSistema: "Nº de sistema — número de controle físico de cada bicicleta, conferido na retirada e na devolução.",
    locadora:  "LOCADORA",
    locatario: "LOCATÁRIO(A)",
    periodo:   "a",
    contractObject: "Objeto do contrato",
  },
  en: {
    contractTitle: "BICYCLE RENTAL CONTRACT",
    bikesSubtitle:  "Bicycle rental",
    section1:  "Contracting parties",
    section2:  "Object of the rental",
    section3:  "Included accessories",
    section4:  "Values",
    section5:  "Terms and conditions",
    colN:        "No.",
    colModelo:   "Model",
    colTam:      "Size",
    colQtd:      "Qty",
    colSis:      "System no.",
    colPeriodo:  "Period",
    colDiaria:   "Daily rate",
    colSubtotal: "Subtotal",
    colItem:     "Item",
    colUnidade:  "Unit no.",
    totalLocacao: "Rental total",
    caucaoLabel:  "Deposit (returned on bike delivery)",
    formaPagamento: "Payment method",
    pm: { pix: "Pix", cash: "Cash", credit_card: "Credit card", debit_card: "Debit card", stripe: "Card", other: "Other" },
    nenhumaBike:  "No bicycles linked.",
    nenhumAcessorio: "No accessories linked.",
    notaSistema: "System no. — physical control number of each bicycle, checked at pick-up and return.",
    locadora:  "LESSOR",
    locatario: "LESSEE",
    periodo:   "to",
    contractObject: "Object of the contract",
  },
  es: {
    contractTitle: "CONTRATO DE ALQUILER DE BICICLETA",
    bikesSubtitle:  "Alquiler de bicicletas",
    section1:  "Partes contratantes",
    section2:  "Objeto del alquiler",
    section3:  "Accesorios incluidos",
    section4:  "Valores",
    section5:  "Términos y condiciones",
    colN:        "Nº",
    colModelo:   "Modelo",
    colTam:      "Talla",
    colQtd:      "Cant.",
    colSis:      "Nº sistema",
    colPeriodo:  "Período",
    colDiaria:   "Tarifa diaria",
    colSubtotal: "Subtotal",
    colItem:     "Artículo",
    colUnidade:  "Nº unidad",
    totalLocacao: "Total del alquiler",
    caucaoLabel:  "Depósito (devuelto en la entrega de las bicicletas)",
    formaPagamento: "Forma de pago",
    pm: { pix: "Pix", cash: "Efectivo", credit_card: "Tarjeta de crédito", debit_card: "Tarjeta de débito", stripe: "Tarjeta", other: "Otro" },
    nenhumaBike:  "Ninguna bicicleta vinculada.",
    nenhumAcessorio: "Ningún accesorio vinculado.",
    notaSistema: "Nº de sistema — número de control físico de cada bicicleta, verificado en la recogida y la devolución.",
    locadora:  "ARRENDADOR",
    locatario: "ARRENDATARIO",
    periodo:   "a",
    contractObject: "Objeto del contrato",
  },
};

async function fetchSetting(key: string, placeholder: string): Promise<string> {
  try {
    const { getSetting } = await import("./db");
    const value = await getSetting(key);
    return value && value.trim() !== "" ? value : placeholder;
  } catch {
    return placeholder;
  }
}

/** Baixa a logo da URL ou cai no asset embarcado. NUNCA lança exceção. */
async function fetchLogoBuffer(logoUrl: string | null): Promise<Buffer | null> {
  // Tentar URL remota (http ou https)
  if (logoUrl && logoUrl.startsWith("http")) {
    try {
      const res = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }
    } catch {
      // cai no fallback
    }
  }
  // Fallback: logo BTG padrão via storage (backend abstraído — Manus/S3/local)
  const DEFAULT_LOGO_KEY = "logo-btg_a866cb03.png";
  try {
    const { storageGet } = await import("./storage");
    const { url } = await storageGet(DEFAULT_LOGO_KEY);
    if (url && url.startsWith("http")) {
      const imgResp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (imgResp.ok) {
        const ab = await imgResp.arrayBuffer();
        return Buffer.from(ab);
      }
    }
  } catch {
    // sem logo — ok
  }
  return null;
}

/** Renderiza termos numerados com número dourado */
function renderTerms(doc: PDFKit.PDFDocument, text: string): void {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const contentBottom = doc.page.height - 44; // igual à margin.bottom do documento
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const clauseMatch = para.match(/^(\d+[.\-)\s]+)([\s\S]*)/);
    // Mantém o número da cláusula colado à 1ª linha do texto: se não couber ao
    // menos uma linha antes do rodapé, quebra a página ANTES de fixar o `y`.
    // Sem isto, o número (desenhado com lineBreak:false) podia ir sozinho pra
    // página nova e o texto — desenhado no MESMO `y` salvo, agora obsoleto —
    // pulava pra página seguinte, deixando uma página EM BRANCO no meio.
    if (doc.y + 16 > contentBottom) doc.addPage();
    const y = doc.y;
    if (clauseMatch) {
      doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(8.5)
        .text(clauseMatch[1].trim(), M, y, { width: 14, lineBreak: false });
      doc.fillColor(INK).font("Helvetica").fontSize(8.5)
        .text(clauseMatch[2].trim(), M + 16, y, { width: CW - 16 });
    } else {
      doc.fillColor(INK).font("Helvetica").fontSize(8.5)
        .text(para, M, y, { width: CW });
    }
    doc.moveDown(0.35);
  }
}

// ── Gerador principal ─────────────────────────────────────────────────────────
export async function generateContractPdf(
  data: ContractPdfData,
  language: PdfLanguage = "pt",
): Promise<Buffer> {
  const L = PDF_LABELS[language];

  // Buscar settings da empresa
  const [
    empresaNome,
    empresaCnpj,
    empresaEndereco,
    empresaCidade,
    empresaEmail,
    empresaTermosLang,
    empresaObjetoLang,
    empresaTermosLegacy,
    empresaObjetoLegacy,
    empresaCaucao,
    empresaSub,
    logoUrl,
  ] = await Promise.all([
    fetchSetting("company_name",    "[Razão Social não configurada]"),
    fetchSetting("company_cnpj",    "[CNPJ não configurado]"),
    fetchSetting("company_address", "[Endereço não configurado]"),
    fetchSetting("company_city",    "[Cidade não configurada]"),
    fetchSetting("company_email",   "[E-mail não configurado]"),
    fetchSetting(`company_terms_${language}`,  ""),
    fetchSetting(`company_object_${language}`, ""),
    fetchSetting("company_terms",  ""),
    fetchSetting("company_object", ""),
    fetchSetting("company_caucao",  ""),
    fetchSetting("company_subtitle", L.bikesSubtitle),
    fetchSetting("company_logo_url",""),
  ]);

  // Usar defaults embutidos quando o campo estiver vazio
  const empresaTermos =
    empresaTermosLang.trim() ? empresaTermosLang
    : (language === "pt" && empresaTermosLegacy.trim() ? empresaTermosLegacy
    : DEFAULT_TERMOS[language]);
  const empresaObjetoTexto =
    empresaObjetoLang.trim() ? empresaObjetoLang
    : (language === "pt" && empresaObjetoLegacy.trim() ? empresaObjetoLegacy
    : DEFAULT_OBJETO[language]);

  const logoBuffer = await fetchLogoBuffer(logoUrl || null);

  const emitidoEm = formatDate(data.criadoEm);
  const emitidoLong = formatDateLong(data.criadoEm);
  const contractNum = String(data.contractId).padStart(4, "0");

  return new Promise((resolve, reject) => {
    // bufferPages: permite carimbar o rodapé em TODAS as páginas no fim (a
    // contagem total só é conhecida depois que o conteúdo termina de fluir).
    // margin.bottom reservado (44) mantém o texto corrido acima da faixa de
    // rodapé (H-26..H) em qualquer página — sem isso o texto invade o rodapé.
    const doc = new PDFDocument({
      size: "A4",
      autoFirstPage: true,
      bufferPages: true,
      margins: { top: M, bottom: 44, left: M, right: M },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const H = doc.page.height;
    const FOOTER_H = 26;
    const CONTENT_BOTTOM = H - 44; // limite inferior do conteúdo (acima do rodapé)

    // Quebra de página controlada: se não couberem `needed` pontos antes do
    // rodapé, começa uma página nova. Evita título/assinatura órfãos no pé.
    function ensureSpace(needed: number) {
      if (doc.y + needed > CONTENT_BOTTOM) doc.addPage();
    }

    // ── HEADER BAND ──────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 90).fill(DARK);
    doc.rect(0, 90, W, 2.5).fill(GOLD);

    // Logo
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 30, 20, { fit: [84, 52] });
      } catch {
        // sem logo — ok
      }
    }

    // Título e subtítulo
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(12)
      .text(L.contractTitle, 126, 30, { width: 236, lineBreak: false });
    doc.fillColor(BANDTX).font("Helvetica").fontSize(8)
      .text(`${empresaNome} · ${empresaSub}`, 126, 50, { width: 236, lineBreak: false });

    // Nº e data (alinhados à direita)
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(12)
      .text(`Nº ${contractNum}`, 360, 28, { width: CW - 320, align: "right", lineBreak: false });
    doc.fillColor(BANDTX).font("Helvetica").fontSize(8)
      .text(`Emitido em ${emitidoEm}`, 360, 50, { width: CW - 320, align: "right", lineBreak: false });

    doc.y = 108; doc.x = M;

    // ── Helper: título de seção ───────────────────────────────────────────────
    function sectionTitle(n: number, t: string) {
      doc.moveDown(0.7);
      ensureSpace(48); // título + régua + um pouco de conteúdo não órfãos no pé
      const y = doc.y;
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(10)
        .text(`${n}. ${t}`, M, y);
      doc.moveDown(0.25);
      doc.moveTo(M, doc.y).lineTo(RIGHT, doc.y)
        .lineWidth(0.6).strokeColor(GOLD).stroke();
      doc.moveDown(0.45);
    }

        // ── 1. PARTES CONTRATANTES ────────────────────────────────────────────
    sectionTitle(1, L.section1);
    {
      const gap = 16, bw = (CW - gap) / 2, bx2 = M + bw + gap;
      const y0 = doc.y, bh = 92, pad = 11;

      const locadoraRows: [string, string][] = [
        ["Razão social", empresaNome],
        ["CNPJ",         empresaCnpj],
        ["Endereço",     empresaEndereco],
        ["Cidade",       empresaCidade],
      ];
      const locatarioRows: [string, string][] = [
        ["Nome",     data.clientName || "—"],
        ["CPF",      data.clientCpf  || "—"],
        ["RG",       data.clientRg   || "—"],
        ["Telefone", data.clientPhone || "—"],
      ];

      ([ [M, L.locadora, locadoraRows], [bx2, L.locatario, locatarioRows] ] as const).forEach(
        ([bx, title, rows]) => {
          doc.rect(bx as number, y0, bw, bh).fill(CREAM);
          doc.rect(bx as number, y0, 3, bh).fill(GOLD);
          doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(9)
            .text(title as string, (bx as number) + pad, y0 + 9);
          let yy = y0 + 26;
          (rows as [string, string][]).forEach(([l, v]) => {
            doc.fontSize(8).fillColor(MUTED).font("Helvetica")
              .text(`${l}: `, (bx as number) + pad, yy, { continued: true, width: bw - 2 * pad });
            doc.fillColor(INK).text(v);
            yy += 15;
          });
        }
      );
      doc.y = y0 + bh; doc.x = M;
    }

     // ── 2. OBJETO DA LOCAÇÃO ────────────────────────────────────────────
    sectionTitle(2, L.section2);
    {
      const cols = [
        { k: "n",      x: M,   w: 20,  t: L.colN,        a: "left"  as const },
        { k: "modelo", x: 60,  w: 124, t: L.colModelo,    a: "left"  as const },
        { k: "tam",    x: 184, w: 26,  t: L.colTam,       a: "left"   as const },
        { k: "qtd",    x: 210, w: 24,  t: L.colQtd,       a: "center" as const },
        { k: "sis",    x: 234, w: 80,  t: L.colSis,       a: "left"   as const },
        { k: "per",    x: 314, w: 100, t: L.colPeriodo,   a: "left"  as const },
        { k: "diaria", x: 414, w: 56,  t: L.colDiaria,    a: "right" as const },
        { k: "sub",    x: 470, w: 85,  t: L.colSubtotal,  a: "right" as const },
      ];

      let y = doc.y;
      doc.rect(M, y, CW, 18).fill(DARK);
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(7.5);
      cols.forEach((c) =>
        doc.text(c.t, c.x + 4, y + 5.5, { width: c.w - 8, align: c.a, lineBreak: false })
      );
      y += 18;

      const modeloCol = cols.find((c) => c.k === "modelo")!;
      const subCol = cols.find((c) => c.k === "sub")!;
      data.rentals.forEach((r, i) => {
        doc.fillColor(INK).font("Helvetica").fontSize(8);
        const modeloTxt = [r.bikeModel, r.bikeBrand].filter(Boolean).join(" ") || "—";
        // Altura do modelo QUEBRANDO dentro da coluna (antes estourava numa linha
        // só e invadia as colunas vizinhas — bug Cassiana 2026-07-22).
        const modelH = doc.heightOfString(modeloTxt, { width: modeloCol.w - 8 });
        const pct = r.discountPercent ? parseFloat(String(r.discountPercent)) : 0;
        const hasDiscount = !isNaN(pct) && pct > 0;
        const rowH = Math.max(16, Math.ceil(Math.max(modelH, 11)) + (hasDiscount ? 9 : 0) + 5);

        // Quebra de página se a linha não couber acima do rodapé
        if (y + rowH > CONTENT_BOTTOM) { doc.addPage(); y = M; }

        if (i % 2 === 0) doc.rect(M, y, CW, rowH).fill(ALT);
        doc.fillColor(INK).font("Helvetica").fontSize(8);
        // Modelo com quebra
        doc.text(modeloTxt, modeloCol.x + 4, y + 3.5, { width: modeloCol.w - 8 });
        // Demais colunas em 1 linha (alinhadas ao topo da linha)
        const single: Record<string, string> = {
          n:      String(i + 1),
          tam:    r.tamanho || "—",
          qtd:    String(r.quantity ?? 1),
          sis:    r.bikeUnitNumeros || r.bikeSerialNumber || "—",
          per:    periodLabel(r),
          diaria: formatCurrency(r.dailyRate),
          sub:    calcSubtotal(r),
        };
        cols.filter((c) => c.k !== "modelo").forEach((c) =>
          doc.text(single[c.k], c.x + 4, y + 3.5, { width: c.w - 8, align: c.a, lineBreak: false })
        );
        // Desconto aplicado, logo abaixo do subtotal
        if (hasDiscount) {
          doc.fillColor(GOLD).font("Helvetica").fontSize(6.5)
            .text(`desconto de ${pct % 1 === 0 ? pct.toFixed(0) : pct}% aplicado`, subCol.x + 4, y + 15, { width: subCol.w - 8, align: "right", lineBreak: false });
          doc.fillColor(INK).font("Helvetica").fontSize(8);
        }
        y += rowH;
      });

      if (data.rentals.length === 0) {
        doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
          .text(L.nenhumaBike, M + 4, y + 4);
        y += 16;
      }

      doc.y = y; doc.x = M;
      doc.moveDown(0.45);
      doc.fillColor(GOLD).font("Helvetica-Oblique").fontSize(7.5)
        .text(L.notaSistema, M, doc.y, { width: CW });
    }

    // ── 3. ACESSÓRIOS INCLUSOS ───────────────────────────────────────────
    sectionTitle(3, L.section3);
    {
      const cols = [
        { k: "item", x: M,   w: 378, t: L.colItem,    a: "left"  as const },
        { k: "un",   x: 418, w: 137, t: L.colUnidade,  a: "right" as const },
      ];

      let y = doc.y;
      doc.rect(M, y, CW, 18).fill(DARK);
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(7.5);
      cols.forEach((c) =>
        doc.text(c.t, c.x + 4, y + 5.5, { width: c.w - 8, align: c.a, lineBreak: false })
      );
      y += 18;

      data.accessories.forEach((a, i) => {
        if (i % 2 === 0) doc.rect(M, y, CW, 16).fill(ALT);
        doc.fillColor(INK).font("Helvetica").fontSize(8.5);
        const row: Record<string, string> = {
          item: a.accessoryName || "—",
          un:   a.serialNumber  || "—",
        };
        cols.forEach((c) =>
          doc.text(row[c.k], c.x + 4, y + 4.5, { width: c.w - 8, align: c.a, lineBreak: false })
        );
        y += 16;
      });

      if (data.accessories.length === 0) {
        doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
          .text(L.nenhumAcessorio, M + 4, y + 4);
        y += 16;
      }

      doc.y = y; doc.x = M;
    }

        // ── 4. VALORES ──────────────────────────────────────────────────────
    sectionTitle(4, L.section4);
    {
      const y = doc.y;
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(9.5)
        .text(L.totalLocacao, M, y, { width: 300, lineBreak: false });
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(12)
        .text(formatCurrency(data.valorTotal), M, y - 2, { width: CW, align: "right", lineBreak: false });

      const y2 = y + 22;
      doc.moveTo(M, y2).lineTo(RIGHT, y2).lineWidth(0.5).strokeColor(LINE).stroke();

      let rowY = y2 + 7;
      if (empresaCaucao && empresaCaucao.trim() !== "") {
        doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
          .text(L.caucaoLabel, M, rowY, { width: 300, lineBreak: false });
        doc.fillColor(INK).font("Helvetica").fontSize(8.5)
          .text(empresaCaucao, M, rowY, { width: CW, align: "right", lineBreak: false });
        rowY += 14;
      }
      // Forma de pagamento (só quando informada no contrato)
      if (data.paymentMethod) {
        doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
          .text(L.formaPagamento, M, rowY, { width: 300, lineBreak: false });
        doc.fillColor(INK).font("Helvetica").fontSize(8.5)
          .text(L.pm[data.paymentMethod] ?? data.paymentMethod, M, rowY, { width: CW, align: "right", lineBreak: false });
        rowY += 14;
      }
      doc.y = rowY + 7; doc.x = M;
    }
    // ── 5. TERMOS E CONDIÇÕES ───────────────────────────────────────────────────
    // Termos: sempre renderiza (usa default embutido se vazio no banco)
    sectionTitle(5, L.section5);
    // Subtítulo + texto do objeto do contrato
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(8)
      .text(L.contractObject, M, doc.y, { width: CW });
    doc.fillColor(INK).font("Helvetica").fontSize(8)
      .text(empresaObjetoTexto, M, doc.y, { width: CW });
    doc.moveDown(0.6);
    renderTerms(doc, empresaTermos);
    // ── ASSINATURAS ───────────────────────────────────────────────────────────
    doc.moveDown(2.4);
    // Bloco de assinaturas + fecho não pode partir no meio: se não couber,
    // joga tudo pra próxima página (antes ficava órfão gerando página quase vazia).
    ensureSpace(90);
    const sy = doc.y;
    const sw = (CW - 60) / 2;

    doc.moveTo(M, sy).lineTo(M + sw, sy).lineWidth(0.7).strokeColor("#9A9A9A").stroke();
    doc.moveTo(M + sw + 60, sy).lineTo(RIGHT, sy).lineWidth(0.7).strokeColor("#9A9A9A").stroke();

    doc.fillColor(INK).font("Helvetica").fontSize(9)
      .text(empresaNome, M, sy + 6, { width: sw, align: "center" });
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7)
      .text(L.locadora, M, sy + 19, { width: sw, align: "center" });

    doc.fillColor(INK).font("Helvetica").fontSize(9)
      .text(data.clientName || "—", M + sw + 60, sy + 6, { width: sw, align: "center" });
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7)
      .text(L.locatario, M + sw + 60, sy + 19, { width: sw, align: "center" });

    // ── FECHO ─────────────────────────────────────────────────────────────────
    doc.moveDown(2.2);
    doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
      .text(`${empresaCidade}, ${emitidoLong}.`, M, doc.y, { width: CW, align: "center" });

    // ── FOOTER BAND (carimbado em TODAS as páginas) ───────────────────────────
    // Só agora sabemos o total de páginas — percorre todas as páginas
    // bufferizadas e desenha a faixa + "Página X de Y" no pé de cada uma.
    const range = doc.bufferedPageRange();
    for (let p = 0; p < range.count; p++) {
      doc.switchToPage(range.start + p);
      // Zera a margem inferior desta página: sem isso, desenhar texto em H-17
      // (abaixo do limite de conteúdo) faz o pdfkit achar que "não cabe" e
      // adicionar páginas em cascata.
      doc.page.margins.bottom = 0;
      doc.rect(0, H - FOOTER_H, W, FOOTER_H).fill(DARK);
      doc.fillColor(BANDTX).font("Helvetica").fontSize(7)
        .text(
          `${empresaNome} · CNPJ ${empresaCnpj} · ${empresaCidade} · ${empresaEmail}`,
          M, H - 17, { width: CW - 60, lineBreak: false }
        );
      const pageLabel = language === "en"
        ? `Page ${p + 1} of ${range.count}`
        : `Página ${p + 1} de ${range.count}`;
      doc.fillColor(GOLD).font("Helvetica").fontSize(7)
        .text(pageLabel, M, H - 17, { width: CW, align: "right", lineBreak: false });
    }

    doc.flushPages();
    doc.end();
  });
}
