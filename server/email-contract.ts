// ─── E-mails do ciclo do contrato: RESERVA e RECIBO ──────────────────────────
// Decisão da Cassiana (2026-07-29, registrada na LEVA): são DOIS e-mails, não
// quatro. O sistema antigo mandava reserva + contrato + recibo; hoje "todos são
// reserva", então os termos viajam DENTRO do e-mail de reserva ("teve cliente
// que cancelou a reserva pq não aceitou termos do contrato") e o segundo e-mail
// é o recibo, no encerramento.
//
// Nada aqui pode derrubar o fluxo que disparou: criar contrato e encerrar
// contrato continuam funcionando com o Resend fora do ar.
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  accessories as accessoriesTable,
  auditLogs,
  bikes as bikesTable,
  bikeSizes as bikeSizesTable,
  bikeUnits as bikeUnitsTable,
  clients as clientsTable,
  contractAccessories as contractAccessoriesTable,
  contracts as contractsTable,
  rentalBikeUnits as rentalBikeUnitsTable,
  rentals as rentalsTable,
  revenues as revenuesTable,
} from "../drizzle/schema";
import { carregarAjustesDevolucao, type AjusteDevolucao } from "./contract-adjustments";
import { getSetting } from "./db";
import { sendEmail } from "./email";
import {
  CORES, EMPRESA_VAZIA, bloco, botao, carregarEmpresa, chip, escapeHtml,
  montarEmail, selo, type DadosEmpresa,
} from "./email-layout";
import { ENV } from "./_core/env";
import { formatarBRL, valorPorExtenso } from "./valor-extenso";

const FONTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Ação de auditoria que serve de guarda anti-duplicação do recibo. */
export const ACAO_RECIBO_ENVIADO = "enviou_email_recibo";

/** O enum do banco é minúsculo e técnico; o cliente lê o rótulo. */
const CATEGORIAS_PT: Record<string, string> = {
  mtb: "MTB",
  speed: "Speed",
  gravel: "Gravel",
};

const FORMAS_PT: Record<string, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  cash: "Dinheiro",
  other: "Outra forma",
};

/**
 * `YYYY-MM-DD` → `DD/MM/AAAA` tratando a data como STRING.
 * ⚠️ Nunca `new Date("2026-07-20")`: isso é meia-noite UTC e, no fuso do Brasil,
 * volta um dia. Mesma armadilha já corrigida no PDF.
 */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
}

/** Diárias cobradas: mesma régua do resto do sistema (dias de calendário). */
function diarias(inicio: string | null, fim: string | null): number {
  if (!inicio || !fim) return 1;
  const ms = Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`);
  if (!Number.isFinite(ms)) return 1;
  return Math.max(1, Math.round(ms / 86_400_000));
}

export type ItemContratoEmail = {
  modelo: string;
  categoria: string | null;
  tamanho: string | null;
  cor: string | null;
  numerosSistema: string[];
  quantidade: number;
  inicio: string | null;
  fim: string | null;
  diaria: string | null;
  desconto: string | null;
  total: string | null;
};

export type ContratoEmailData = {
  contractId: number;
  status: string;
  cliente: { nome: string; email: string | null };
  periodo: { inicio: string | null; fim: string | null };
  itens: ItemContratoEmail[];
  acessorios: Array<{ nome: string; qty: number }>;
  valorTotal: string | null;
  pago: boolean;
  formasPagamento: Array<{ method: string; amount: string }>;
  ajustes: AjusteDevolucao[];
};

/**
 * Junta tudo o que os dois e-mails precisam saber sobre o contrato. Uma
 * passagem só no banco para não repetir consulta em cada template.
 */
export async function carregarDadosContrato(db: any, contractId: number): Promise<ContratoEmailData | null> {
  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, contractId));
  if (!contract || contract.deletedAt) return null;

  const [client] = contract.clientId
    ? await db.select({ name: clientsTable.name, email: clientsTable.email })
        .from(clientsTable).where(eq(clientsTable.id, contract.clientId))
    : [null];

  const rentalRows = await db.select()
    .from(rentalsTable)
    .where(and(eq(rentalsTable.contractId, contractId), isNull(rentalsTable.deletedAt)));

  const itens: ItemContratoEmail[] = await Promise.all(rentalRows.map(async (r: any) => {
    const [bike] = r.bikeId
      ? await db.select({
          model: bikesTable.model, brand: bikesTable.brand,
          category: bikesTable.category, color: bikesTable.color,
        }).from(bikesTable).where(eq(bikesTable.id, r.bikeId))
      : [null];
    let tamanho: string | null = null;
    if (r.bikeSizeId) {
      const [sz] = await db.select({ tamanho: bikeSizesTable.tamanho })
        .from(bikeSizesTable).where(eq(bikeSizesTable.id, r.bikeSizeId));
      tamanho = sz?.tamanho ?? null;
    }
    const unidades = await db.select({ numero: bikeUnitsTable.numeroSistema })
      .from(rentalBikeUnitsTable)
      .innerJoin(bikeUnitsTable, eq(bikeUnitsTable.id, rentalBikeUnitsTable.bikeUnitId))
      .where(eq(rentalBikeUnitsTable.rentalId, r.id));
    return {
      modelo: [bike?.brand, bike?.model].filter(Boolean).join(" ") || "Bicicleta",
      categoria: bike?.category ?? null,
      cor: bike?.color ?? null,
      tamanho,
      numerosSistema: unidades.map((u: any) => u.numero).filter(Boolean),
      quantidade: r.quantity ?? 1,
      inicio: r.startDate ?? null,
      fim: r.endDate ?? null,
      diaria: r.dailyRate ?? null,
      desconto: r.discountPercent ?? null,
      total: r.totalAmount ?? null,
    };
  }));

  const acessorios = await db
    .select({ nome: accessoriesTable.name, qty: contractAccessoriesTable.qty })
    .from(contractAccessoriesTable)
    .leftJoin(accessoriesTable, eq(contractAccessoriesTable.accessoryId, accessoriesTable.id))
    .where(eq(contractAccessoriesTable.contractId, contractId));

  // Acessório é gravado 1 linha POR UNIDADE: agrupa para o cliente ler
  // "Capacete × 2" em vez de duas linhas iguais.
  const acessoriosAgrupados = Object.values(
    (acessorios as Array<{ nome: string | null; qty: number | null }>).reduce((acc, a) => {
      const nome = a.nome ?? "Acessório";
      acc[nome] = { nome, qty: (acc[nome]?.qty ?? 0) + (a.qty ?? 1) };
      return acc;
    }, {} as Record<string, { nome: string; qty: number }>),
  );

  const inicios = itens.map((i) => i.inicio).filter(Boolean).sort() as string[];
  const fins = itens.map((i) => i.fim).filter(Boolean).sort() as string[];

  // Formas de pagamento: o detalhamento vive em `revenues.meta.breakdown`
  // (1 receita com o total). Sem meta, cai na forma primária do aluguel.
  const receitas = await db.select({ meta: revenuesTable.meta })
    .from(revenuesTable)
    .where(sql`${revenuesTable.meta}->>'contractId' = ${String(contractId)}`);
  const formasPagamento: Array<{ method: string; amount: string }> = [];
  for (const rev of receitas as Array<{ meta: any }>) {
    if (rev.meta?.kind !== "contract_payment") continue;
    for (const b of rev.meta.breakdown ?? []) formasPagamento.push({ method: b.method, amount: b.amount });
  }
  const pago = rentalRows.length > 0 && rentalRows.every((r: any) => r.paymentStatus === "paid");
  if (formasPagamento.length === 0 && pago) {
    const primaria = rentalRows.find((r: any) => r.paymentMethod)?.paymentMethod;
    if (primaria) formasPagamento.push({ method: primaria, amount: contract.valorTotal ?? "0" });
  }

  const ajustes = await carregarAjustesDevolucao(
    db,
    rentalRows.map((r: any) => r.id),
    new Map(rentalRows.map((r: any) => [r.id, r.startDate as string | null])),
  );

  return {
    contractId,
    status: contract.status,
    cliente: { nome: client?.name ?? "", email: client?.email ?? null },
    periodo: { inicio: inicios[0] ?? null, fim: fins[fins.length - 1] ?? null },
    itens,
    acessorios: acessoriosAgrupados,
    valorTotal: contract.valorTotal ?? null,
    pago,
    formasPagamento,
    ajustes,
  };
}

/** Cláusulas em pt, MESMA cadeia do PDF: setting por idioma → legado → default. */
export async function carregarClausulasPt(): Promise<{ objeto: string; termos: string }> {
  const { DEFAULT_OBJETO, DEFAULT_TERMOS } = await import("./contract-defaults");
  const objetoPt = (await getSetting("company_object_pt")) ?? "";
  const termosPt = (await getSetting("company_terms_pt")) ?? "";
  const objetoLegacy = (await getSetting("company_object")) ?? "";
  const termosLegacy = (await getSetting("company_terms")) ?? "";
  return {
    objeto: objetoPt.trim() || objetoLegacy.trim() || DEFAULT_OBJETO.pt,
    termos: termosPt.trim() || termosLegacy.trim() || DEFAULT_TERMOS.pt,
  };
}

function linkDoContrato(contractId: number, token: string): string {
  const base = (ENV.appUrl ?? "").replace(/\/+$/, "");
  return base ? `${base}/contrato/${token}` : "";
}

/** Texto corrido do usuário (cláusulas) em parágrafos, com escape. */
function paragrafos(texto: string, tamanho = 12): string {
  return texto
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 8px;font-family:${FONTE};font-size:${tamanho}px;line-height:1.6;color:${CORES.ink}">${escapeHtml(p)}</p>`)
    .join("");
}

/** Rótulos de status iguais aos da página pública (`PublicContract.tsx`). */
const STATUS_PT: Record<string, string> = {
  pendente: "Reserva registrada",
  ativo: "Em circulação",
  parcialmente_devolvido: "Devolução parcial",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

// Cliente de e-mail não conhece os tokens oklch do tema, então o selo de status
// repete em hex a família de cor que a página usa em cada situação.
const STATUS_COR: Record<string, { fundo: string; texto: string; borda: string }> = {
  pendente: { fundo: "#FFF6E0", texto: "#8A6400", borda: "#F0DCA6" },
  ativo: { fundo: "#E7F6EE", texto: "#146C43", borda: "#B6E2C9" },
  parcialmente_devolvido: { fundo: "#FFF1E3", texto: "#9A5300", borda: "#F3D2AE" },
  encerrado: { fundo: "#EFEFEF", texto: "#4A4A4A", borda: "#DCDCDC" },
  cancelado: { fundo: "#FDECEC", texto: "#9B2C2C", borda: "#F3C6C6" },
};

/** Linha "rótulo: valor" do bloco de detalhes, no espelho da página. */
function detalhe(rotulo: string, valor: string): string {
  if (!valor) return "";
  return `
<tr>
  <td style="padding:3px 14px 3px 0;font-family:${FONTE};font-size:13px;color:${CORES.muted};white-space:nowrap">${escapeHtml(rotulo)}</td>
  <td style="padding:3px 0;font-family:${FONTE};font-size:13px;font-weight:600;color:${CORES.ink}">${escapeHtml(valor)}</td>
</tr>`.trim();
}

/**
 * Bloco DETALHES DA LOCAÇÃO: período à esquerda, número do contrato e situação
 * à direita. Mesma divisão da página pública.
 */
function blocoDetalhes(dados: ContratoEmailData, mesmoPeriodo: boolean): string {
  const dias = diarias(dados.periodo.inicio, dados.periodo.fim);
  const cor = STATUS_COR[dados.status] ?? STATUS_COR.ativo;
  // ⚠️ Número do contrato EM CIMA, não ao lado do período como na página.
  // Medido: as duas colunas lado a lado somavam 455px de largura mínima (os
  // rótulos e o "Contrato #N" são `nowrap`) e furavam qualquer tela de 375px.
  // E-mail não tem media query confiável para empilhar só no mobile.
  return bloco("Detalhes da locação", `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px">
  <tr>
    <td style="font-family:${FONTE};font-size:19px;font-weight:700;color:${CORES.gold}">Contrato #${dados.contractId}</td>
    <td align="right" style="vertical-align:middle">${selo(STATUS_PT[dados.status] ?? dados.status, cor)}</td>
  </tr>
</table>
<p style="margin:0 0 10px;font-family:${FONTE};font-size:12px;color:${CORES.muted}">Calculado para o seguinte período de uso:</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  ${detalhe("Retirada", formatarData(dados.periodo.inicio))}
  ${detalhe("Tempo contratado", mesmoPeriodo ? `${dias} ${dias === 1 ? "diária" : "diárias"}` : "Períodos diferentes por item")}
  ${detalhe("Devolução prevista", formatarData(dados.periodo.fim))}
</table>`.trim());
}

/**
 * Bloco ITENS DA LOCAÇÃO: as MESMAS colunas da página pública (equipamento,
 * unitário, fator, total), acessórios em chips e "Total =" em destaque.
 * `extraHtml` recebe a linha do ajuste de devolução antecipada, no recibo.
 */
function blocoItens(dados: ContratoEmailData, mesmoPeriodo: boolean, extraHtml = ""): string {
  // ⚠️ TRÊS colunas, não as quatro da página. Medido num iframe de 375px: com a
  // coluna "Unitário" separada, os três valores `nowrap` mais os paddings do
  // cartão empurravam o e-mail para 455px de largura — rolagem lateral na caixa
  // de entrada do celular, que é onde a Cassiana e o turista leem. A página se
  // safa empilhando as células no mobile, e e-mail não tem media query
  // confiável, então o unitário desce para a linha de detalhe do equipamento.
  const th = `padding:0 8px 8px 0;border-bottom:1px solid ${CORES.line};font-family:${FONTE};font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${CORES.muted};white-space:nowrap`;
  const cabecalho = `
<tr>
  <td style="${th}">Equipamento</td>
  <td align="right" style="${th}">Fator</td>
  <td align="right" style="${th.replace("0 8px 8px 0", "0 0 8px")}">Total</td>
</tr>`.trim();

  const linhas = dados.itens.map((item) => {
    const dias = diarias(item.inicio, item.fim);
    const desconto = parseFloat(item.desconto ?? "0");
    // Mesma linha de detalhe da página: tipo · tamanho · cor · nº · desconto.
    const detalhes = [
      item.categoria ? (CATEGORIAS_PT[item.categoria] ?? item.categoria) : null,
      item.tamanho ? `Tam. ${item.tamanho}` : null,
      item.cor,
      item.numerosSistema.join(", ") || null,
      !mesmoPeriodo && item.inicio ? `${formatarData(item.inicio)} a ${formatarData(item.fim)}` : null,
      item.diaria ? `${formatarBRL(item.diaria)} por diária` : null,
      desconto > 0 ? `desconto de ${desconto}%` : null,
    ].filter(Boolean).join(" · ");
    const td = `padding:10px 8px;border-bottom:1px solid ${CORES.line};font-family:${FONTE}`;
    return `
<tr>
  <td style="${td};padding-left:0;font-size:13px;color:${CORES.ink}">
    <span style="font-weight:600">${escapeHtml(item.modelo)}</span>
    ${detalhes ? `<br><span style="font-size:11px;color:${CORES.muted}">${escapeHtml(detalhes)}</span>` : ""}
  </td>
  <td align="right" style="${td};font-size:12px;color:${CORES.muted};white-space:nowrap">${dias}d${item.quantidade > 1 ? ` × ${item.quantidade}` : ""}</td>
  <td align="right" style="${td};padding-right:0;font-size:13px;font-weight:600;color:${CORES.ink};white-space:nowrap">${formatarBRL(item.total)}</td>
</tr>`.trim();
  }).join("");

  const acessorios = dados.acessorios.length
    ? `
<p style="margin:16px 0 8px;font-family:${FONTE};font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${CORES.muted}">Acessórios inclusos</p>
<div>${dados.acessorios.map((a) => chip(`${a.nome}${a.qty > 1 ? ` ${a.qty}×` : ""}`)).join("")}</div>`.trim()
    : "";

  const total = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px">
  <tr>
    <td align="right" style="font-family:${FONTE};font-size:13px;color:${CORES.muted};padding-right:10px">Total =</td>
    <td align="right" style="font-family:${FONTE};font-size:22px;font-weight:700;color:${CORES.gold};white-space:nowrap;width:1%">${formatarBRL(dados.valorTotal)}</td>
  </tr>
</table>`.trim();

  return bloco("Itens da locação", `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
  ${cabecalho}
  ${linhas}
</table>
${acessorios}
${extraHtml}
${total}`.trim());
}

/** Assinatura do documento: dados da empresa e a linha de cidade e data. */
function rodapeDocumento(empresa: DadosEmpresa): string {
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const linhas = [empresa.nome, empresa.cnpj, empresa.endereco, empresa.cidade, empresa.telefone]
    .filter((l) => l && l.trim())
    .map((l) => `<p style="margin:0 0 2px;font-family:${FONTE};font-size:11px;line-height:1.6;color:${CORES.muted}">${escapeHtml(l)}</p>`)
    .join("");
  const cidadeData = [empresa.cidade, hoje].filter(Boolean).join(", ");
  return `
${linhas}
${cidadeData ? `<p style="margin:10px 0 0;font-family:${FONTE};font-size:11px;color:${CORES.ink}">${escapeHtml(cidadeData)}</p>` : ""}`.trim();
}

/** Saudação de abertura, comum aos dois e-mails. */
function abertura(dados: ContratoEmailData, linhaEvento: string, complemento: string): string {
  const primeiroNome = dados.cliente.nome.trim().split(/\s+/)[0] || dados.cliente.nome;
  return `
<p style="margin:0 0 14px;font-family:${FONTE};font-size:23px;line-height:1.25;color:${CORES.dark};font-weight:700">Oi, ${escapeHtml(primeiroNome)}!</p>
<p style="margin:0 0 10px;font-family:${FONTE};font-size:14px;line-height:1.65;color:${CORES.ink}">${linhaEvento}</p>
<p style="margin:0 0 20px;font-family:${FONTE};font-size:14px;line-height:1.65;color:${CORES.ink}">${complemento}</p>`.trim();
}

/** Botão centralizado com a legenda embaixo, como a página faz nas ações. */
function chamada(texto: string, link: string, legenda: string): string {
  if (!link) return "";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px">
  <tr><td align="center" style="padding:2px 0 16px">
    ${botao(texto, link)}
    <p style="margin:12px 0 0;font-family:${FONTE};font-size:12px;color:${CORES.muted}">${escapeHtml(legenda)}</p>
  </td></tr>
</table>`.trim();
}

/** Contrato com bikes em períodos diferentes não pode mostrar um span único. */
function temPeriodoUnico(dados: ContratoEmailData): boolean {
  if (dados.itens.length <= 1) return true;
  return dados.itens.every((i) => i.inicio === dados.itens[0].inicio && i.fim === dados.itens[0].fim);
}

// ─── E-mail A: RESERVA (com os termos dentro) ────────────────────────────────

export function buildReservationEmail(
  dados: ContratoEmailData,
  clausulas: { objeto: string; termos: string },
  empresa: DadosEmpresa = EMPRESA_VAZIA,
  link = "",
): { subject: string; html: string } {
  const mesmoPeriodo = temPeriodoUnico(dados);

  const termos = bloco("Condições do contrato", `
<p style="margin:0 0 10px;font-family:${FONTE};font-size:13px;font-weight:700;color:${CORES.dark}">Objeto do contrato</p>
${paragrafos(clausulas.objeto)}
<div style="height:1px;background:${CORES.line};margin:16px 0"></div>
<p style="margin:0 0 10px;font-family:${FONTE};font-size:13px;font-weight:700;color:${CORES.dark}">Condições gerais</p>
${paragrafos(clausulas.termos)}`.trim());

  const corpo = [
    abertura(
      dados,
      "Reservado! Registramos o seu pedido de reserva de bicicleta.",
      "Abaixo estão os detalhes e as condições do contrato de locação, para você ler com calma. Vamos falar com você pelo WhatsApp para combinar a entrega.",
    ),
    blocoDetalhes(dados, mesmoPeriodo),
    blocoItens(dados, mesmoPeriodo),
    chamada("Visualizar detalhes da reserva", link, "Acompanhe a sua reserva online quando quiser. O link é só seu."),
    termos,
    bloco("Termo de ciência", `
<p style="margin:0 0 8px;font-family:${FONTE};font-size:12px;line-height:1.65;color:${CORES.muted}">A Bike To Go se responsabiliza pela integridade e pelo funcionamento dos equipamentos locados, e o cliente deve devolvê-los nas mesmas condições em que foram disponibilizados.</p>
<p style="margin:0 0 16px;font-family:${FONTE};font-size:12px;line-height:1.65;color:${CORES.muted}">Os valores acima se referem ao período informado. Devolução antecipada ou renovação alteram o valor, e a página de acompanhamento passa a mostrar o valor atualizado.</p>
${rodapeDocumento(empresa)}`.trim()),
  ].join("");

  const bike = dados.itens[0]?.modelo;
  return {
    subject: `Reserva de aluguel de bicicletas: contrato #${dados.contractId}`,
    html: montarEmail({
      titulo: "Reserva de aluguel de bicicletas",
      preheader: [
        `Reserva #${dados.contractId} registrada`,
        bike,
        dados.periodo.inicio ? formatarData(dados.periodo.inicio) : "",
      ].filter(Boolean).join(" · "),
      corpoHtml: corpo,
      empresa,
    }),
  };
}

// ─── E-mail B: RECIBO (encerramento) ─────────────────────────────────────────

export function buildReceiptEmail(
  dados: ContratoEmailData,
  empresa: DadosEmpresa = EMPRESA_VAZIA,
  link = "",
): { subject: string; html: string } {
  const mesmoPeriodo = temPeriodoUnico(dados);
  const total = dados.valorTotal;
  const extenso = valorPorExtenso(total);
  const periodoTexto = dados.periodo.inicio
    ? `${formatarData(dados.periodo.inicio)}${dados.periodo.fim ? ` a ${formatarData(dados.periodo.fim)}` : ""}`
    : "";

  // A fonte desta linha é a AUDITORIA da F10 — é o único lugar com o valor
  // anterior. Sem ela o cliente recebe um total diferente do combinado, calado.
  const ajustes = dados.ajustes.map((a) => `
<p style="margin:14px 0 0;padding:10px 12px;background:${CORES.alt};border-left:3px solid ${CORES.gold};border-radius:0 6px 6px 0;font-family:${FONTE};font-size:12px;line-height:1.6;color:${CORES.ink}">Devolução antecipada em ${formatarData(new Date(a.data).toISOString().slice(0, 10))}: período ajustado de ${a.diariasDe} para ${a.diariasPara} ${a.diariasPara === 1 ? "diária" : "diárias"} e valor de ${formatarBRL(a.valorDe)} para ${formatarBRL(a.valorPara)}.</p>`.trim()).join("");

  const formas = dados.formasPagamento.map((f) => `
<tr>
  <td style="padding:9px 8px 9px 0;border-bottom:1px solid ${CORES.line};font-family:${FONTE};font-size:13px;color:${CORES.ink}">${escapeHtml(FORMAS_PT[f.method] ?? f.method)}</td>
  <td align="right" style="padding:9px 0;border-bottom:1px solid ${CORES.line};font-family:${FONTE};font-size:13px;font-weight:600;color:${CORES.ink};white-space:nowrap">${formatarBRL(f.amount)}</td>
</tr>`.trim()).join("");

  const recibo = bloco("Recibo de pagamento", `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
  ${formas}
  <tr>
    <td style="padding:13px 8px 0 0;font-family:${FONTE};font-size:13px;color:${CORES.muted}">Total recebido</td>
    <td align="right" style="padding:13px 0 0;font-family:${FONTE};font-size:22px;font-weight:700;color:${CORES.gold};white-space:nowrap">${formatarBRL(total)}</td>
  </tr>
</table>
<p style="margin:18px 0 0;padding-top:14px;border-top:1px solid ${CORES.line};font-family:${FONTE};font-size:13px;line-height:1.65;color:${CORES.ink}">Recebemos o valor de <strong>${formatarBRL(total)}</strong>${extenso ? ` (${escapeHtml(extenso)})` : ""} referente ao contrato de aluguel de equipamentos para ciclismo${periodoTexto ? ` no período de ${escapeHtml(periodoTexto)}` : ""}.</p>`.trim());

  const corpo = [
    abertura(
      dados,
      "Obrigado por pedalar com a gente! O seu aluguel foi encerrado.",
      "Abaixo está o recibo com o resumo da locação e do pagamento, para você guardar.",
    ),
    blocoDetalhes(dados, mesmoPeriodo),
    blocoItens(dados, mesmoPeriodo, ajustes),
    recibo,
    chamada("Visualizar contrato", link, "Os detalhes completos continuam disponíveis online."),
    bloco("Termo de ciência", `
<p style="margin:0 0 16px;font-family:${FONTE};font-size:12px;line-height:1.65;color:${CORES.muted}">Este recibo se refere aos equipamentos e ao período descritos acima. Guarde-o para os seus registros.</p>
${rodapeDocumento(empresa)}`.trim()),
  ].join("");

  return {
    subject: `Recibo de pagamento de locação de bicicletas: contrato #${dados.contractId}`,
    html: montarEmail({
      titulo: "Recibo de pagamento",
      preheader: `Contrato #${dados.contractId} encerrado · ${formatarBRL(total)}`,
      corpoHtml: corpo,
      empresa,
    }),
  };
}

// ─── Disparos (fire-safe: nunca lançam) ──────────────────────────────────────

/**
 * E-mail de reserva, na criação do contrato. Silencioso quando o cliente não
 * tem e-mail no cadastro — comum no cadastro manual da Cassiana.
 */
export async function sendReservationEmail(db: any, contractId: number, token: string): Promise<boolean> {
  try {
    const dados = await carregarDadosContrato(db, contractId);
    const email = dados?.cliente.email?.trim();
    if (!dados || !email || !email.includes("@")) return false;
    const [empresa, clausulas] = await Promise.all([
      carregarEmpresa().catch(() => EMPRESA_VAZIA),
      carregarClausulasPt(),
    ]);
    const { subject, html } = buildReservationEmail(dados, clausulas, empresa, linkDoContrato(contractId, token));
    return await sendEmail({ to: email, subject, html });
  } catch (err) {
    console.warn("[Email] Erro no e-mail de reserva:", err);
    return false;
  }
}

/**
 * E-mail de recibo, no encerramento.
 *
 * ⚠️ Duas pré-condições, e as duas são de propósito:
 * 1. **Contrato PAGO.** Um "recibo" de contrato não pago é um documento errado.
 *    Como encerrar e receber são ações separadas e a ordem varia (no fluxo dela
 *    o pagamento é na devolução), quem completa o par dispara: o `close` manda
 *    se já estava pago, o `confirmPayment` manda se o contrato já estava
 *    encerrado. **Consequência aceita:** contrato encerrado e nunca marcado
 *    como pago não gera recibo nenhum.
 * 2. **Guarda anti-duplicação pela AUDITORIA**, porque os dois caminhos acima
 *    podem se cruzar. Sem ela o cliente receberia dois recibos iguais.
 */
export async function sendReceiptEmail(db: any, contractId: number, token: string): Promise<boolean> {
  try {
    const [jaEnviado] = await db.select({ id: auditLogs.id })
      .from(auditLogs)
      .where(and(eq(auditLogs.acao, ACAO_RECIBO_ENVIADO), eq(auditLogs.registroId, contractId)))
      .limit(1);
    if (jaEnviado) return false;

    const dados = await carregarDadosContrato(db, contractId);
    const email = dados?.cliente.email?.trim();
    if (!dados || !dados.pago || !email || !email.includes("@")) return false;

    const empresa = await carregarEmpresa().catch(() => EMPRESA_VAZIA);
    const { subject, html } = buildReceiptEmail(dados, empresa, linkDoContrato(contractId, token));
    const ok = await sendEmail({ to: email, subject, html });
    if (ok) {
      // Só registra quando saiu de verdade: se o Resend recusou, a próxima ação
      // (confirmar pagamento, por exemplo) ainda tem chance de mandar.
      await db.insert(auditLogs).values({
        acao: ACAO_RECIBO_ENVIADO,
        tabela: "contracts",
        registroId: contractId,
        dadosDepois: { para: email, pago: dados.pago },
      });
    }
    return ok;
  } catch (err) {
    console.warn("[Email] Erro no e-mail de recibo:", err);
    return false;
  }
}
