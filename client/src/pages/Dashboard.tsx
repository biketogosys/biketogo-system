import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Users, Bike, FileText, DollarSign,
  AlertCircle, ArrowRight, Wrench,
  TrendingDown, Minus, ChevronDown,
  CalendarCheck, CalendarClock, CalendarPlus, MessageCircle, Check,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ConfirmDialog";
import { useMarkReturned } from "@/hooks/useMarkReturned";
import { ExtendRentalDialog, type ExtendableRental } from "@/components/ExtendRentalDialog";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { SectionCards } from "@/components/dashboard/SectionCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";

// ─── Tipos de período ─────────────────────────────────────────────────────────
type PeriodKey = "mes_atual" | "mes_anterior" | "ultimos_3_meses" | "este_ano";

interface PeriodOption {
  key: PeriodKey;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "mes_atual", label: "Mês atual" },
  { key: "mes_anterior", label: "Mês anterior" },
  { key: "ultimos_3_meses", label: "Últimos 3 meses" },
  { key: "este_ano", label: "Este ano" },
];

function getPeriodDates(key: PeriodKey): { startDate: string; endDate: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (key) {
    case "mes_atual": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: fmt(start), endDate: fmt(end) };
    }
    case "mes_anterior": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: fmt(start), endDate: fmt(end) };
    }
    case "ultimos_3_meses": {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: fmt(start), endDate: fmt(end) };
    }
    case "este_ano": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { startDate: fmt(start), endDate: fmt(end) };
    }
  }
}

// Data "YYYY-MM-DD" → "dd/mm" por fatiamento (Date() deslocaria o dia no fuso)
const fmtShortDate = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "—");

// Item do painel de devoluções → mensagem de WhatsApp pronta (lembrete/cobrança)
function buildReturnMessage(item: {
  clientName: string; bikeModel: string; endDate: string | null; daysLate: number;
}): string {
  const nome = item.clientName.split(" ")[0] || item.clientName;
  const data = fmtShortDate(item.endDate);
  const cabecalho = `Oi ${nome}! Aqui é da Bike To Go Floripa 🚲`;
  if (item.daysLate > 0) {
    return `${cabecalho}\n\nA devolução da sua ${item.bikeModel} estava prevista para ${data} e está ${item.daysLate} dia(s) em atraso. Consegue combinar com a gente o horário pra devolver? Qualquer dúvida, é só chamar por aqui!`;
  }
  return `${cabecalho}\n\nPassando pra lembrar que a devolução da sua ${item.bikeModel} está prevista para hoje (${data}). Consegue combinar com a gente o horário? Obrigado!`;
}

// Paleta âmbar para o gráfico de pizza (usa tokens CSS)
const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodKey>("mes_atual");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [chartTimeRange, setChartTimeRange] = useState("90d");

  const periodDates = useMemo(() => getPeriodDates(period), [period]);
  const periodLabel = PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? "Mês atual";

  const {
    data,
    isLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = trpc.dashboard.summary.useQuery(periodDates);

  const {
    data: weeklyData,
    isLoading: weeklyLoading,
    error: weeklyError,
    refetch: refetchWeekly,
  } = trpc.dashboard.weeklyRevenue.useQuery(periodDates);

  const {
    data: bikeRevenueData = [],
    isLoading: bikeRevenueLoading,
    error: bikeRevenueError,
    refetch: refetchBikeRevenue,
  } = trpc.dashboard.revenueByBike.useQuery(periodDates);

  // Painel de devoluções (erro fica contido no card — não derruba o dashboard)
  const {
    data: returnsData,
    isLoading: returnsLoading,
    error: returnsError,
  } = trpc.dashboard.returns.useQuery();

  const anyError = summaryError || weeklyError || bikeRevenueError;

  // ─── Error state ──────────────────────────────────────────────────────────
  if (anyError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-center">
          <p className="text-sm font-medium text-destructive">Erro ao carregar o dashboard</p>
          <p className="text-xs text-muted-foreground mt-1">
            {(summaryError || weeklyError || bikeRevenueError)?.message}
          </p>
        </div>
        <button
          onClick={() => { refetchSummary(); refetchWeekly(); refetchBikeRevenue(); }}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const summaryData = data ?? undefined;
  const bikeStats = data?.bikeStats ?? { total: 0, available: 0, rented: 0, maintenance: 0 };
  const clientStats = data?.clientStats ?? { total: 0, leads: 0, verified: 0, blocked: 0 };

  const totalBikeReceita = bikeRevenueData.reduce((acc: number, d: any) => acc + d.receita, 0);

  // Atrasadas primeiro (já vêm ordenadas por endDate asc), depois as de hoje
  const returnItems = [...(returnsData?.overdue ?? []), ...(returnsData?.dueToday ?? [])];

  // ─── Ações rápidas do painel de devoluções ───────────────────────────────
  const confirmDialog = useConfirm();
  const markReturned = useMarkReturned(); // optimistic (M1)
  const [extending, setExtending] = useState<ExtendableRental | null>(null); // F8

  async function handleMarkReturned(item: { id: number; clientName: string; bikeModel: string }) {
    const ok = await confirmDialog({
      title: "Confirmar devolução?",
      description: `Marcar a ${item.bikeModel} de ${item.clientName} como devolvida (em bom estado). A unidade volta a ficar disponível. Para registrar dano, use a tela do contrato.`,
      confirmText: "Marcar devolvida",
    });
    if (ok) markReturned.mutate({ rentalId: item.id });
  }

  function handleWhatsapp(item: typeof returnItems[number]) {
    const url = buildWhatsappUrl(item.clientPhone, buildReturnMessage(item));
    if (!url) {
      toast.error("Cliente sem telefone válido cadastrado.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

          {/* ─── Period selector ─────────────────────────────────────────── */}
          <div className="px-4 lg:px-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Visão geral — Bike To Go Floripa
            </p>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:border-primary/40 transition-colors"
              >
                {periodLabel}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setPeriod(opt.key); setDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-accent/50 ${
                        period === opt.key ? "text-primary font-semibold" : "text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Section Cards (4 KPI) ───────────────────────────────────── */}
          <SectionCards data={summaryData} loading={isLoading} />

          {/* ─── Devoluções (atrasadas + hoje) ───────────────────────────── */}
          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-primary" />
                  Devoluções
                  {(returnsData?.overdue.length ?? 0) > 0 && (
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium normal-case tracking-normal bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400">
                      {returnsData!.overdue.length} em atraso
                    </span>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Aluguéis em atraso e com devolução prevista para hoje
                </p>
              </CardHeader>
              <CardContent>
                {returnsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : returnsError ? (
                  <p className="text-sm text-destructive">Erro ao carregar devoluções.</p>
                ) : returnItems.length === 0 ? (
                  <div className="flex items-center gap-3 text-muted-foreground py-2">
                    <CalendarCheck className="w-5 h-5 opacity-40 shrink-0" />
                    <p className="text-sm">Nenhuma devolução pendente para hoje.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {returnItems.map((item) => (
                      <div
                        key={item.id}
                        className="py-2.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
                      >
                        <span
                          className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium shrink-0 ${
                            item.daysLate > 0
                              ? "bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400"
                              : "bg-amber-500/20 text-amber-600 border-amber-500/30 dark:text-amber-400"
                          }`}
                        >
                          {item.daysLate > 0 ? `Atrasada ${item.daysLate}d` : "Hoje"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/clientes/${item.clientId}`}
                            className="text-sm font-medium text-foreground hover:text-primary truncate block"
                          >
                            {item.clientName}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.bikeModel}
                            {item.tamanho ? ` · Tam. ${item.tamanho}` : ""}
                            {(item.quantity ?? 1) > 1 ? ` · ${item.quantity}×` : ""}
                            {" · "}Prevista: {fmtShortDate(item.endDate)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => handleWhatsapp(item)}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Lembrar</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            title="Renovar (fica mais dias)"
                            onClick={() => setExtending(item)}
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span className="sr-only">Renovar</span>
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 gap-1.5"
                            disabled={markReturned.isPending}
                            onClick={() => handleMarkReturned(item)}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Devolvida</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── Revenue Area Chart ──────────────────────────────────────── */}
          <div className="px-4 lg:px-6">
            <RevenueChart
              data={weeklyData ?? []}
              loading={weeklyLoading}
              timeRange={chartTimeRange}
              onTimeRangeChange={setChartTimeRange}
            />
          </div>

          {/* ─── Revenue by bike model (Pie) ─────────────────────────────── */}
          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Receita por modelo de bicicleta
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Aluguéis pagos no período — {periodLabel}
                </p>
              </CardHeader>
              <CardContent>
                {bikeRevenueLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : bikeRevenueData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <Bike className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">Nenhum aluguel pago no período selecionado</p>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <ResponsiveContainer
                      width="100%"
                      height={220}
                      className="md:!w-[280px] md:!min-w-[280px] md:!flex-shrink-0"
                    >
                      <PieChart>
                        <Pie
                          data={bikeRevenueData}
                          dataKey="receita"
                          nameKey="modelo"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={48}
                          paddingAngle={2}
                        >
                          {bikeRevenueData.map((_: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                              stroke="transparent"
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [
                            value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                            "Receita",
                          ]}
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2 w-full">
                      {bikeRevenueData.map((item: any, index: number) => {
                        const pct = totalBikeReceita > 0
                          ? Math.round((item.receita / totalBikeReceita) * 100)
                          : 0;
                        return (
                          <div key={item.modelo} className="flex items-center gap-3">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                            />
                            <span
                              className="text-sm text-foreground flex-1 truncate"
                              title={item.modelo}
                            >
                              {item.modelo}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
                            <span className="text-sm font-semibold text-foreground shrink-0 tabular-nums">
                              {item.receita.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── Status panels ───────────────────────────────────────────── */}
          <div className="px-4 lg:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {/* Bikes status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Status das Bicicletas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <>
                    {[
                      { label: "Disponíveis", value: bikeStats.available, cls: "badge-available" },
                      { label: "Alugadas", value: bikeStats.rented, cls: "badge-rented" },
                      { label: "Manutenção", value: bikeStats.maintenance, cls: "badge-maintenance" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className={item.cls}>{item.label}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                              style={{
                                width: bikeStats.total > 0
                                  ? `${(item.value / bikeStats.total) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground w-6 text-right">
                            {item.value}
                          </span>
                        </div>
                      </div>
                    ))}
                    <Link
                      href="/bicicletas"
                      className="mt-4 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ver todas as bicicletas <ArrowRight className="w-3 h-3" />
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Clients status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Status dos Clientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <>
                    {[
                      { label: "Lead", value: clientStats.leads, cls: "badge-lead" },
                      { label: "Verificado", value: clientStats.verified, cls: "badge-verified" },
                      { label: "Bloqueado", value: clientStats.blocked, cls: "badge-blocked" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className={item.cls}>{item.label}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                              style={{
                                width: clientStats.total > 0
                                  ? `${(item.value / clientStats.total) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground w-6 text-right">
                            {item.value}
                          </span>
                        </div>
                      </div>
                    ))}
                    <Link
                      href="/clientes"
                      className="mt-4 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ver todos os clientes <ArrowRight className="w-3 h-3" />
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/contratos">
                  <button className="w-full text-left px-3 py-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-sm text-foreground transition-colors flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Novo contrato
                  </button>
                </Link>
                <Link href="/clientes">
                  <button className="w-full text-left px-3 py-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-sm text-foreground transition-colors flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Cadastrar cliente
                  </button>
                </Link>
                <Link href="/bicicletas">
                  <button className="w-full text-left px-3 py-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-sm text-foreground transition-colors flex items-center gap-2">
                    <Bike className="w-4 h-4 text-primary" /> Adicionar bicicleta
                  </button>
                </Link>
                <Link href="/financeiro">
                  <button className="w-full text-left px-3 py-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-sm text-foreground transition-colors flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" /> Lançar despesa
                  </button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* ─── Maintenance alert ───────────────────────────────────────── */}
          {!isLoading && bikeStats.maintenance > 0 && (
            <div className="px-4 lg:px-6">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
                <Wrench className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-400">
                    {bikeStats.maintenance} bicicleta(s) em manutenção
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Acompanhe o status na página de bicicletas.
                  </p>
                </div>
                <Link href="/bicicletas" className="ml-auto">
                  <button className="text-xs text-amber-400 hover:underline whitespace-nowrap">
                    Ver bicicletas
                  </button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* F8 — renovação */}
      <ExtendRentalDialog rental={extending} onOpenChange={(o) => !o && setExtending(null)} />
    </div>
  );
}
