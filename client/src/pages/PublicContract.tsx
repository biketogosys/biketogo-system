// ─── Acompanhamento do contrato pelo CLIENTE (público, por link assinado) ────
// Destino do botão dos e-mails de reserva e de recibo. Sem login: o link é a
// credencial (token HMAC).
//
// Estrutura espelha a página do sistema antigo que a loja usa hoje (LOCATÁRIO ·
// DETALHES DA LOCAÇÃO · ITENS · TERMO), com o visual da casa: dark-first,
// acento âmbar, tokens semânticos. O contrato abre em MODAL com as 3 abas de
// idioma, como no antigo.
//
// ⚠️ Dados do locatário (documento, CPF, e-mail, telefone) aparecem aqui por
// decisão do Matheus (2026-07-29), para igualar o sistema antigo. Como o link
// pode ser encaminhado, quem tiver o link vê esses dados.
import { useMemo, useState } from "react";
import { useRoute } from "wouter";
import {
  Bike, CalendarClock, FileText, MessageCircle, Package, User,
  AlertTriangle, Download, Search,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const IDIOMAS = [
  { key: "pt", label: "PT", tab: "Português" },
  { key: "en", label: "EN", tab: "English" },
  { key: "es", label: "ES", tab: "Español" },
] as const;
type Idioma = (typeof IDIOMAS)[number]["key"];

const T = {
  pt: {
    tituloPagina: "Locação de bicicletas :: Acompanhamento",
    subtitulo: "Serviço de acompanhamento online da Bike To Go. Seguem abaixo os dados do seu contrato.",
    locatario: "Locatário",
    nome: "Nome do cliente", documento: "Documento", cpf: "CPF",
    email: "E-mail", telefone: "Telefone",
    detalhes: "Detalhes da locação",
    calculado: "Calculado para o seguinte período de uso:",
    retirada: "Retirada", ciclo: "Ciclo de locação", ciclos: "Dias",
    tempo: "Tempo contratado", devolucao: "Devolução prevista",
    contrato: "Contrato", situacao: "Situação do contrato",
    verContrato: "Visualizar contrato", baixarPdf: "Baixar PDF",
    falarLoja: "Falar com a loja",
    itens: "Itens da locação",
    colItem: "Equipamento / Serviço", colUnit: "Valor unitário",
    colFator: "Fator mult.", colTotal: "Valor total", totalIgual: "Total =",
    acessorios: "Acessórios inclusos",
    hoje: "Devolução é hoje",
    faltam: (n: number) => `Faltam ${n} ${n === 1 ? "dia" : "dias"} para devolver`,
    atrasado: (n: number) => `Devolução atrasada em ${n} ${n === 1 ? "dia" : "dias"}`,
    encerrada: "Locação encerrada",
    termo: "Termo de ciência",
    termoTexto: [
      "A Bike To Go se responsabiliza pela integridade e pelo funcionamento dos equipamentos locados, e o cliente deve devolvê-los nas mesmas condições em que foram disponibilizados.",
      "Os valores apresentados nesta página se referem ao período informado acima. Devolução antecipada ou renovação alteram o valor, e a página passa a mostrar o valor atualizado.",
      "Demais informações estão nas cláusulas do contrato, que podem ser lidas no botão Visualizar contrato.",
    ],
    diarias: (n: number) => `${n} ${n === 1 ? "diária" : "diárias"}`,
    periodosVariados: "Períodos diferentes por item",
    semItens: "Nenhum equipamento vinculado.",
    naoEncontrado: "Não encontramos este contrato",
    naoEncontradoAjuda: "O link pode estar incompleto ou o contrato foi cancelado.",
    modalTitulo: "Visualização do contrato",
    objeto: "Objeto do contrato", termos: "Condições gerais",
    status: {
      pendente: "Reserva registrada", ativo: "Em circulação",
      parcialmente_devolvido: "Devolução parcial", encerrado: "Encerrado",
      cancelado: "Cancelado",
    } as Record<string, string>,
  },
  en: {
    tituloPagina: "Bicycle rental :: Tracking",
    subtitulo: "Bike To Go online tracking service. Below are your contract details.",
    locatario: "Renter",
    nome: "Client name", documento: "ID document", cpf: "CPF",
    email: "Email", telefone: "Phone",
    detalhes: "Rental details",
    calculado: "Calculated for the following usage period:",
    retirada: "Pick-up", ciclo: "Rental cycle", ciclos: "Days",
    tempo: "Contracted time", devolucao: "Expected return",
    contrato: "Contract", situacao: "Contract status",
    verContrato: "View contract", baixarPdf: "Download PDF",
    falarLoja: "Message the store",
    itens: "Rental items",
    colItem: "Equipment / Service", colUnit: "Unit price",
    colFator: "Multiplier", colTotal: "Total", totalIgual: "Total =",
    acessorios: "Included accessories",
    hoje: "Return is today",
    faltam: (n: number) => `${n} ${n === 1 ? "day" : "days"} left to return`,
    atrasado: (n: number) => `Return overdue by ${n} ${n === 1 ? "day" : "days"}`,
    encerrada: "Rental closed",
    termo: "Notice",
    termoTexto: [
      "Bike To Go is responsible for the integrity and working order of the rented equipment, and the client must return it in the same condition it was provided.",
      "The amounts shown on this page refer to the period above. An early return or a renewal changes the amount, and this page then shows the updated value.",
      "Further information is in the contract clauses, available under the View contract button.",
    ],
    diarias: (n: number) => `${n} ${n === 1 ? "day" : "days"}`,
    periodosVariados: "Different periods per item",
    semItens: "No equipment linked.",
    naoEncontrado: "We could not find this contract",
    naoEncontradoAjuda: "The link may be incomplete or the contract was cancelled.",
    modalTitulo: "Contract",
    objeto: "Object of the contract", termos: "General conditions",
    status: {
      pendente: "Reservation registered", ativo: "In circulation",
      parcialmente_devolvido: "Partially returned", encerrado: "Closed",
      cancelado: "Cancelled",
    } as Record<string, string>,
  },
  es: {
    tituloPagina: "Alquiler de bicicletas :: Seguimiento",
    subtitulo: "Servicio de seguimiento en línea de Bike To Go. A continuación, los datos de tu contrato.",
    locatario: "Arrendatario",
    nome: "Nombre del cliente", documento: "Documento", cpf: "CPF",
    email: "Correo", telefone: "Teléfono",
    detalhes: "Detalles del alquiler",
    calculado: "Calculado para el siguiente período de uso:",
    retirada: "Retiro", ciclo: "Ciclo de alquiler", ciclos: "Días",
    tempo: "Tiempo contratado", devolucao: "Devolución prevista",
    contrato: "Contrato", situacao: "Situación del contrato",
    verContrato: "Ver contrato", baixarPdf: "Descargar PDF",
    falarLoja: "Hablar con la tienda",
    itens: "Ítems del alquiler",
    colItem: "Equipo / Servicio", colUnit: "Valor unitario",
    colFator: "Factor mult.", colTotal: "Valor total", totalIgual: "Total =",
    acessorios: "Accesorios incluidos",
    hoje: "La devolución es hoy",
    faltam: (n: number) => `Faltan ${n} ${n === 1 ? "día" : "días"} para devolver`,
    atrasado: (n: number) => `Devolución atrasada ${n} ${n === 1 ? "día" : "días"}`,
    encerrada: "Alquiler finalizado",
    termo: "Términos de conocimiento",
    termoTexto: [
      "Bike To Go se responsabiliza por la integridad y el funcionamiento de los equipos alquilados, y el cliente debe devolverlos en las mismas condiciones en que fueron entregados.",
      "Los valores de esta página corresponden al período indicado arriba. Una devolución anticipada o una renovación cambian el valor, y la página pasa a mostrar el valor actualizado.",
      "Más información en las cláusulas del contrato, disponibles en el botón Ver contrato.",
    ],
    diarias: (n: number) => `${n} ${n === 1 ? "día" : "días"}`,
    periodosVariados: "Períodos diferentes por ítem",
    semItens: "Ningún equipo vinculado.",
    naoEncontrado: "No encontramos este contrato",
    naoEncontradoAjuda: "El enlace puede estar incompleto o el contrato fue cancelado.",
    modalTitulo: "Visualización del contrato",
    objeto: "Objeto del contrato", termos: "Condiciones generales",
    status: {
      pendente: "Reserva registrada", ativo: "En circulación",
      parcialmente_devolvido: "Devolución parcial", encerrado: "Finalizado",
      cancelado: "Cancelado",
    } as Record<string, string>,
  },
} as const;

// Data de coluna `date` formatada como STRING (new Date(ymd) volta um dia no BR).
const fmtData = (ymd?: string | null) =>
  ymd ? `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}` : "—";
const fmtBRL = (v?: string | number | null) =>
  v == null || v === "" ? "—"
    : (typeof v === "string" ? parseFloat(v) : v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const DIA_MS = 24 * 60 * 60 * 1000;
const hojeYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate) - Date.parse(de)) / DIA_MS);
const diarias = (ini?: string | null, fim?: string | null) =>
  ini && fim ? Math.max(1, diasEntre(ini, fim)) : 1;

/** Telefone salvo como "+DDI número" ou só dígitos BR: exibe legível. */
const fmtTelefone = (v?: string | null) => {
  if (!v) return null;
  if (v.trim().startsWith("+")) return v.trim();
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v;
};

const STATUS_CLS: Record<string, string> = {
  pendente: "bg-amber-500/20 text-amber-600 border-amber-500/30 dark:text-amber-400",
  ativo: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  parcialmente_devolvido: "bg-orange-500/20 text-orange-600 border-orange-500/30 dark:text-orange-400",
  encerrado: "bg-slate-500/20 text-slate-500 border-slate-500/30 dark:text-slate-400",
  cancelado: "bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400",
};

/** Bloco no formato do sistema antigo: faixa de título + corpo. */
function Bloco({ titulo, icone, children }: { titulo: string; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <h2 className="flex items-center gap-2 bg-muted/50 border-b border-border px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary">
        {icone}{titulo}
      </h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Campo rótulo + valor em caixa, como os "inputs" da tela antiga. */
function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div className="grid grid-cols-[minmax(88px,0.4fr)_1fr] items-center gap-2 sm:gap-3">
      <span className="text-xs text-muted-foreground text-right">{label}</span>
      <span className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm truncate">
        {valor || "—"}
      </span>
    </div>
  );
}

export default function PublicContract() {
  const [, params] = useRoute("/contrato/:token");
  const token = params?.token ?? "";
  const [lang, setLang] = useState<Idioma>("pt");
  const [contratoAberto, setContratoAberto] = useState(false);
  const t = T[lang];

  const { data, isLoading, error } = trpc.publicApi.contractByToken.useQuery(
    { token },
    { enabled: token.length > 3, retry: false },
  );

  // Contrato pode ter bikes com períodos diferentes: aí o "N diárias" do span
  // inteiro mentiria (dois aluguéis distantes viravam "286 diárias").
  const mesmoPeriodo = useMemo(() => {
    const itens = data?.itens ?? [];
    if (itens.length <= 1) return true;
    return itens.every((i) => i.inicio === itens[0].inicio && i.fim === itens[0].fim);
  }, [data?.itens]);

  const contagem = useMemo(() => {
    const fim = data?.periodo.fim;
    if (!fim) return null;
    if (data?.status === "encerrado" || data?.status === "cancelado") {
      return { texto: t.encerrada, cls: "text-muted-foreground" };
    }
    const dias = diasEntre(hojeYmd(), fim);
    if (dias === 0) return { texto: t.hoje, cls: "text-amber-600 dark:text-amber-400" };
    if (dias < 0) return { texto: t.atrasado(Math.abs(dias)), cls: "text-red-600 dark:text-red-400" };
    return { texto: t.faltam(dias), cls: "text-emerald-600 dark:text-emerald-400" };
  }, [data?.periodo.fim, data?.status, t]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="h-14 bg-sidebar border-b border-border" />
        <div className="mx-auto w-full max-w-4xl p-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3 motion-enter">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-lg">{t.naoEncontrado}</p>
          <p className="text-sm text-muted-foreground">{t.naoEncontradoAjuda}</p>
        </div>
      </div>
    );
  }

  const { empresa } = data;
  const totalDiarias = diarias(data.periodo.inicio, data.periodo.fim);
  const waUrl = empresa.whatsapp
    ? `https://wa.me/${empresa.whatsapp}?text=${encodeURIComponent(
        `Oi! Sou ${data.cliente.nome}, do contrato #${data.contractId}.`,
      )}`
    : null;
  const dataEmissao = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-sidebar border-b border-border">
        <div className="mx-auto w-full max-w-4xl px-4 py-3 flex items-center justify-between gap-3">
          {empresa.logoUrl ? (
            <img src={empresa.logoUrl} alt={empresa.nome || "Bike To Go"} className="h-7 w-auto object-contain" />
          ) : (
            <span className="font-semibold text-primary text-sm">{empresa.nome || "Bike To Go"}</span>
          )}
          <div className="flex gap-0.5 rounded-lg bg-background/40 p-0.5">
            {IDIOMAS.map((i) => (
              <button
                key={i.key}
                onClick={() => setLang(i.key)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  lang === i.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Faixa de título, como o cabeçalho da página antiga */}
      <div className="bg-sidebar/60 border-b border-border">
        <div className="mx-auto w-full max-w-4xl px-4 py-4">
          <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight">{t.tituloPagina}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t.subtitulo}</p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-4xl px-4 py-5 space-y-4 motion-stagger">
        {/* ── LOCATÁRIO ───────────────────────────────────────────────────── */}
        <Bloco titulo={t.locatario} icone={<User className="w-3.5 h-3.5" />}>
          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-x-6">
            <Campo label={t.nome} valor={data.cliente.nome} />
            <Campo label={t.cpf} valor={data.cliente.cpf} />
            <Campo label={t.documento} valor={data.cliente.documento} />
            <Campo label={t.telefone} valor={fmtTelefone(data.cliente.telefone)} />
            <Campo label={t.email} valor={data.cliente.email} />
          </div>
        </Bloco>

        {/* ── DETALHES DA LOCAÇÃO ─────────────────────────────────────────── */}
        <Bloco titulo={t.detalhes} icone={<CalendarClock className="w-3.5 h-3.5" />}>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            <div className="space-y-1.5 text-sm">
              <p className="text-xs text-muted-foreground mb-2">{t.calculado}</p>
              <Linha rotulo={t.retirada} valor={fmtData(data.periodo.inicio)} />
              <Linha rotulo={t.ciclo} valor={t.ciclos} />
              <Linha
                rotulo={t.tempo}
                valor={mesmoPeriodo ? t.diarias(totalDiarias) : t.periodosVariados}
              />
              <Linha rotulo={t.devolucao} valor={fmtData(data.periodo.fim)} />
              {contagem && <p className={`pt-1 text-sm font-semibold ${contagem.cls}`}>{contagem.texto}</p>}
            </div>

            <div className="sm:text-right space-y-2 shrink-0">
              <p className="text-xl font-bold text-primary">{t.contrato} #{data.contractId}</p>
              <p className="text-xs text-muted-foreground">
                {t.situacao}:{" "}
                <span className={`ml-1 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[data.status] ?? STATUS_CLS.ativo}`}>
                  {t.status[data.status] ?? data.status}
                </span>
              </p>
              <div className="flex flex-col sm:items-end gap-2 pt-1">
                <Button size="sm" onClick={() => setContratoAberto(true)}>
                  <Search className="w-4 h-4 mr-1.5" />{t.verContrato}
                </Button>
                <div className="flex gap-2">
                  {data.pdfUrl && (
                    <Button asChild size="sm" variant="outline">
                      <a href={data.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-1.5" />{t.baixarPdf}
                      </a>
                    </Button>
                  )}
                  {waUrl && (
                    <Button asChild size="sm" variant="outline">
                      <a href={waUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-4 h-4 mr-1.5" />{t.falarLoja}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Bloco>

        {/* ── ITENS DA LOCAÇÃO ────────────────────────────────────────────── */}
        <Bloco titulo={t.itens} icone={<Bike className="w-3.5 h-3.5" />}>
          {data.itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.semItens}</p>
          ) : (
            <>
              {/* Cabeçalho de tabela só no desktop; no celular cada item vira bloco */}
              <div className="hidden sm:grid grid-cols-[1fr_120px_110px_120px] gap-2 border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{t.colItem}</span>
                <span className="text-right">{t.colUnit}</span>
                <span className="text-right">{t.colFator}</span>
                <span className="text-right">{t.colTotal}</span>
              </div>
              <ul className="divide-y divide-border">
                {data.itens.map((item, i) => {
                  const dias = diarias(item.inicio, item.fim);
                  return (
                    <li key={i} className="py-3 grid gap-1 sm:grid-cols-[1fr_120px_110px_120px] sm:gap-2 sm:items-center">
                      <div className="min-w-0">
                        <p className="font-medium text-sm flex items-center gap-2">
                          <Bike className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate">{item.modelo}</span>
                        </p>
                        <p className="text-xs text-muted-foreground pl-6">
                          {[
                            item.tamanho && `Tam. ${item.tamanho}`,
                            item.cor,
                            item.numerosSistema.join(", "),
                            !mesmoPeriodo && `${fmtData(item.inicio)} a ${fmtData(item.fim)}`,
                            item.desconto && parseFloat(item.desconto) > 0 && `−${parseFloat(item.desconto)}%`,
                          ].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <ValorCel rotulo={t.colUnit} valor={fmtBRL(item.diaria)} />
                      <ValorCel rotulo={t.colFator} valor={`${dias}d${(item.quantidade ?? 1) > 1 ? ` × ${item.quantidade}` : ""}`} />
                      <ValorCel rotulo={t.colTotal} valor={fmtBRL(item.total)} forte />
                    </li>
                  );
                })}
              </ul>

              {data.acessorios.length > 0 && (
                <div className="pt-3 mt-1 border-t border-border">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    <Package className="w-3.5 h-3.5" />{t.acessorios}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {data.acessorios.map((a, i) => (
                      <span key={i} className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                        {a.nome ?? "—"}{(a.qty ?? 1) > 1 ? ` ${a.qty}×` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-border flex items-baseline justify-end gap-3">
                <span className="text-sm text-muted-foreground">{t.totalIgual}</span>
                <span className="text-2xl font-bold tabular-nums text-primary">{fmtBRL(data.valorTotal)}</span>
              </div>
            </>
          )}
        </Bloco>

        {/* ── TERMO DE CIÊNCIA ────────────────────────────────────────────── */}
        <Bloco titulo={t.termo} icone={<FileText className="w-3.5 h-3.5" />}>
          <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            {t.termoTexto.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="mt-4 pt-3 border-t border-border text-[11px] leading-relaxed text-muted-foreground/80">
            {empresa.nome && <p className="font-medium text-foreground/70">{empresa.nome}</p>}
            {empresa.cnpj && <p>{empresa.cnpj}</p>}
            {empresa.endereco && <p>{empresa.endereco}</p>}
            {empresa.cidade && <p>{empresa.cidade}</p>}
            {empresa.telefone && <p>{empresa.telefone}</p>}
            <p className="mt-2 text-foreground/70">
              {[empresa.cidade, dataEmissao].filter(Boolean).join(", ")}
            </p>
          </div>
        </Bloco>

        <footer className="pb-8 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} {empresa.nome || "Bike To Go Floripa"}
        </footer>
      </main>

      {/* ── Modal do contrato, com as 3 abas de idioma (igual ao antigo) ──── */}
      <Dialog open={contratoAberto} onOpenChange={setContratoAberto}>
        <DialogContent className="dialog-steps dialog-mobile sm:max-w-3xl p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0 px-5 py-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />{t.modalTitulo} #{data.contractId}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue={lang} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-5 mt-3 shrink-0">
              {IDIOMAS.map((i) => (
                <TabsTrigger key={i.key} value={i.key}>{i.tab}</TabsTrigger>
              ))}
            </TabsList>
            {IDIOMAS.map((i) => (
              <TabsContent key={i.key} value={i.key} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 mt-0">
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold">{T[i.key].objeto}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                    {data.clausulas[i.key]?.objeto}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold">{T[i.key].termos}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                    {data.clausulas[i.key]?.termos}
                  </p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <p className="flex gap-2">
      <span className="text-muted-foreground min-w-[130px]">{rotulo}:</span>
      <span className="font-medium tabular-nums">{valor}</span>
    </p>
  );
}

/** Célula de valor: no celular mostra o rótulo, no desktop só o número. */
function ValorCel({ rotulo, valor, forte = false }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <span className="flex items-baseline justify-between sm:justify-end gap-2 pl-6 sm:pl-0 text-sm">
      <span className="sm:hidden text-xs text-muted-foreground">{rotulo}</span>
      <span className={`tabular-nums ${forte ? "font-semibold" : ""}`}>{valor}</span>
    </span>
  );
}
