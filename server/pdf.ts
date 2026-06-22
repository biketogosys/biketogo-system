/**
 * server/pdf.ts
 * Geração de PDF de contrato — layout Bike To Go aprovado.
 * Header dark/gold, logo BTG, partes contratantes, tabelas, termos, assinaturas, rodapé.
 * Retorna Promise<Buffer> — o upload pro S3 é feito pelo chamador.
 */

import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

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
  rentals: Array<{
    bikeModel?: string | null;
    bikeBrand?: string | null;
    bikeSerialNumber?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    totalAmount?: string | null;
    tamanho?: string | null;
    dailyRate?: string | null;
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
  // Fallback: logo BTG padrão via manus-storage (S3)
  const DEFAULT_LOGO_KEY = "logo-btg_a866cb03.png";
  try {
    const { ENV } = await import("./_core/env");
    if (ENV.forgeApiUrl && ENV.forgeApiKey) {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", DEFAULT_LOGO_KEY);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (forgeResp.ok) {
        const { url } = (await forgeResp.json()) as { url: string };
        if (url) {
          const imgResp = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (imgResp.ok) {
            const ab = await imgResp.arrayBuffer();
            return Buffer.from(ab);
          }
        }
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
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const clauseMatch = para.match(/^(\d+[.\-)\s]+)([\s\S]*)/);
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
export async function generateContractPdf(data: ContractPdfData): Promise<Buffer> {
  // Buscar settings da empresa
  const [
    empresaNome,
    empresaCnpj,
    empresaEndereco,
    empresaCidade,
    empresaEmail,
    empresaTermos,
    empresaCaucao,
    empresaSub,
    logoUrl,
  ] = await Promise.all([
    fetchSetting("company_name",    "[Razão Social não configurada]"),
    fetchSetting("company_cnpj",    "[CNPJ não configurado]"),
    fetchSetting("company_address", "[Endereço não configurado]"),
    fetchSetting("company_city",    "[Cidade não configurada]"),
    fetchSetting("company_email",   "[E-mail não configurado]"),
    fetchSetting("company_terms",   ""),
    fetchSetting("company_caucao",  ""),
    fetchSetting("company_subtitle","Locação de bicicletas"),
    fetchSetting("company_logo_url",""),
  ]);

  const logoBuffer = await fetchLogoBuffer(logoUrl || null);

  const emitidoEm = formatDate(data.criadoEm);
  const emitidoLong = formatDateLong(data.criadoEm);
  const contractNum = String(data.contractId).padStart(4, "0");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: M, size: "A4", autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const H = doc.page.height;

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
      .text("CONTRATO DE LOCAÇÃO DE BICICLETA", 126, 30, { width: 236, lineBreak: false });
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
      const y = doc.y;
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(10)
        .text(`${n}. ${t}`, M, y);
      doc.moveDown(0.25);
      doc.moveTo(M, doc.y).lineTo(RIGHT, doc.y)
        .lineWidth(0.6).strokeColor(GOLD).stroke();
      doc.moveDown(0.45);
    }

    // ── 1. PARTES CONTRATANTES ────────────────────────────────────────────────
    sectionTitle(1, "Partes contratantes");
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

      ([ [M, "LOCADORA", locadoraRows], [bx2, "LOCATÁRIO(A)", locatarioRows] ] as const).forEach(
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

    // ── 2. OBJETO DA LOCAÇÃO ──────────────────────────────────────────────────
    sectionTitle(2, "Objeto da locação");
    {
      const cols = [
        { k: "n",      x: M,   w: 20,  t: "Nº",          a: "left"  as const },
        { k: "modelo", x: 60,  w: 124, t: "Modelo",       a: "left"  as const },
        { k: "tam",    x: 184, w: 26,  t: "Tam.",         a: "left"  as const },
        { k: "sis",    x: 210, w: 88,  t: "Nº sistema",   a: "left"  as const },
        { k: "per",    x: 298, w: 116, t: "Período",      a: "left"  as const },
        { k: "diaria", x: 414, w: 56,  t: "Diária",       a: "right" as const },
        { k: "sub",    x: 470, w: 85,  t: "Subtotal",     a: "right" as const },
      ];

      let y = doc.y;
      doc.rect(M, y, CW, 18).fill(DARK);
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(7.5);
      cols.forEach((c) =>
        doc.text(c.t, c.x + 4, y + 5.5, { width: c.w - 8, align: c.a, lineBreak: false })
      );
      y += 18;

      data.rentals.forEach((r, i) => {
        if (i % 2 === 0) doc.rect(M, y, CW, 16).fill(ALT);
        doc.fillColor(INK).font("Helvetica").fontSize(8);
        const row: Record<string, string> = {
          n:      String(i + 1),
          modelo: [r.bikeModel, r.bikeBrand].filter(Boolean).join(" ") || "—",
          tam:    r.tamanho || "—",
          sis:    r.bikeSerialNumber || "—",
          per:    periodLabel(r),
          diaria: formatCurrency(r.dailyRate),
          sub:    calcSubtotal(r),
        };
        cols.forEach((c) =>
          doc.text(row[c.k], c.x + 4, y + 4.5, { width: c.w - 8, align: c.a, lineBreak: false })
        );
        y += 16;
      });

      if (data.rentals.length === 0) {
        doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
          .text("Nenhuma bicicleta vinculada.", M + 4, y + 4);
        y += 16;
      }

      doc.y = y; doc.x = M;
      doc.moveDown(0.45);
      doc.fillColor(GOLD).font("Helvetica-Oblique").fontSize(7.5)
        .text(
          "Nº de sistema — número de controle físico de cada bicicleta, conferido na retirada e na devolução.",
          M, doc.y, { width: CW }
        );
    }

    // ── 3. ACESSÓRIOS INCLUSOS ────────────────────────────────────────────────
    sectionTitle(3, "Acessórios inclusos");
    {
      const cols = [
        { k: "item", x: M,   w: 378, t: "Item",       a: "left"  as const },
        { k: "un",   x: 418, w: 137, t: "Nº unidade",  a: "right" as const },
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
          .text("Nenhum acessório vinculado.", M + 4, y + 4);
        y += 16;
      }

      doc.y = y; doc.x = M;
    }

    // ── 4. VALORES ────────────────────────────────────────────────────────────
    sectionTitle(4, "Valores");
    {
      const y = doc.y;
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(9.5)
        .text("Total da locação", M, y, { width: 300, lineBreak: false });
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(12)
        .text(formatCurrency(data.valorTotal), M, y - 2, { width: CW, align: "right", lineBreak: false });

      const y2 = y + 22;
      doc.moveTo(M, y2).lineTo(RIGHT, y2).lineWidth(0.5).strokeColor(LINE).stroke();

      const y3 = y2 + 7;
      if (empresaCaucao && empresaCaucao.trim() !== "") {
        doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
          .text("Caução (devolvida na entrega das bikes)", M, y3, { width: 300, lineBreak: false });
        doc.fillColor(INK).font("Helvetica").fontSize(8.5)
          .text(empresaCaucao, M, y3, { width: CW, align: "right", lineBreak: false });
      }
      doc.y = y3 + 14; doc.x = M;
    }

    // ── 5. TERMOS E CONDIÇÕES ─────────────────────────────────────────────────
    if (empresaTermos && empresaTermos.trim() !== "") {
      sectionTitle(5, "Termos e condições");
      renderTerms(doc, empresaTermos);
    }

    // ── ASSINATURAS ───────────────────────────────────────────────────────────
    doc.moveDown(2.4);
    const sy = doc.y;
    const sw = (CW - 60) / 2;

    doc.moveTo(M, sy).lineTo(M + sw, sy).lineWidth(0.7).strokeColor("#9A9A9A").stroke();
    doc.moveTo(M + sw + 60, sy).lineTo(RIGHT, sy).lineWidth(0.7).strokeColor("#9A9A9A").stroke();

    doc.fillColor(INK).font("Helvetica").fontSize(9)
      .text(empresaNome, M, sy + 6, { width: sw, align: "center" });
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7)
      .text("LOCADORA", M, sy + 19, { width: sw, align: "center" });

    doc.fillColor(INK).font("Helvetica").fontSize(9)
      .text(data.clientName || "—", M + sw + 60, sy + 6, { width: sw, align: "center" });
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7)
      .text("LOCATÁRIO(A)", M + sw + 60, sy + 19, { width: sw, align: "center" });

    // ── FECHO ─────────────────────────────────────────────────────────────────
    doc.moveDown(2.2);
    doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
      .text(`${empresaCidade}, ${emitidoLong}.`, M, doc.y, { width: CW, align: "center" });

    // ── FOOTER BAND ───────────────────────────────────────────────────────────
    doc.page.margins.bottom = 0;
    doc.rect(0, H - 26, W, 26).fill(DARK);
    doc.fillColor(BANDTX).font("Helvetica").fontSize(7)
      .text(
        `${empresaNome} · CNPJ ${empresaCnpj} · ${empresaCidade} · ${empresaEmail}`,
        M, H - 17, { width: CW - 60, lineBreak: false }
      );
    doc.fillColor(GOLD).font("Helvetica").fontSize(7)
      .text("Página 1", M, H - 17, { width: CW, align: "right", lineBreak: false });

    doc.end();
  });
}
