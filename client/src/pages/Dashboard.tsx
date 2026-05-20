import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Users, Bike, FileText, DollarSign, Loader2,
  TrendingUp, AlertCircle, ArrowRight, Wrench,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const content = (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors group">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, border: `1px solid ${color}35` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {href && (
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </div>
      <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        {value}
      </p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">Semana de {label}</p>
      <p className="font-semibold text-foreground">
        {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = trpc.dashboard.summary.useQuery();
  const { data: weeklyData, isLoading: weeklyLoading } = trpc.dashboard.weeklyRevenue.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const { clientStats, bikeStats, rentalStats } = data ?? {
    clientStats: { total: 0, leads: 0, verified: 0, blocked: 0 },
    bikeStats: { total: 0, available: 0, rented: 0, maintenance: 0 },
    rentalStats: { active: 0, monthRevenue: "0" },
  };

  const revenue = parseFloat(rentalStats.monthRevenue || "0");
  const revenueFormatted = revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const chartData = weeklyData ?? [];
  const maxRevenue = Math.max(...chartData.map((d) => d.receita), 1);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral do sistema — Bike To Go Floripa
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total de clientes"
          value={clientStats.total}
          subtitle={`${clientStats.verified} verificados`}
          icon={Users}
          color="oklch(0.60 0.15 200)"
          href="/clientes"
        />
        <StatCard
          title="Novos leads"
          value={clientStats.leads}
          subtitle="Aguardando validação"
          icon={AlertCircle}
          color="oklch(0.65 0.18 50)"
          href="/clientes"
        />
        <StatCard
          title="Aluguéis ativos"
          value={rentalStats.active}
          subtitle={`${bikeStats.rented} bikes em uso`}
          icon={Bike}
          color="oklch(0.68 0.12 65)"
          href="/alugueis"
        />
        <StatCard
          title="Receita do mês"
          value={revenueFormatted}
          subtitle="Pagamentos confirmados"
          icon={TrendingUp}
          color="oklch(0.60 0.18 145)"
          href="/financeiro"
        />
      </div>

      {/* Weekly Revenue Chart */}
      <div className="bg-card border border-border rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Receita Semanal
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Últimas 8 semanas — devoluções confirmadas
            </p>
          </div>
          {!weeklyLoading && chartData.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Pico:{" "}
              <span className="text-foreground font-medium">
                {maxRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </span>
          )}
        </div>

        {weeklyLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : chartData.every((d) => d.receita === 0) ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <TrendingUp className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">Nenhuma receita registrada nas últimas 8 semanas</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.60 0.18 145)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.60 0.18 145)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0 / 0.15)" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }}
                axisLine={false}
                tickLine={false}
                width={60}
                tickFormatter={(v) =>
                  v >= 1000
                    ? `R$${(v / 1000).toFixed(1)}k`
                    : `R$${v}`
                }
              />
              <Tooltip content={<RevenueTooltip />} />
              <Area
                type="monotone"
                dataKey="receita"
                stroke="oklch(0.60 0.18 145)"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={{ r: 3, fill: "oklch(0.60 0.18 145)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "oklch(0.60 0.18 145)", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Status panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Bikes status */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
            Status das Bicicletas
          </h2>
          <div className="space-y-3">
            {[
              { label: "Disponíveis", value: bikeStats.available, total: bikeStats.total, cls: "badge-available" },
              { label: "Alugadas", value: bikeStats.rented, total: bikeStats.total, cls: "badge-rented" },
              { label: "Manutenção", value: bikeStats.maintenance, total: bikeStats.total, cls: "badge-maintenance" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={item.cls}>{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: item.total > 0 ? `${(item.value / item.total) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-6 text-right">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/bicicletas"
            className="mt-4 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver todas as bicicletas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Clients status */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
            Status dos Clientes
          </h2>
          <div className="space-y-3">
            {[
              { label: "Lead", value: clientStats.leads, total: clientStats.total, cls: "badge-lead" },
              { label: "Verificado", value: clientStats.verified, total: clientStats.total, cls: "badge-verified" },
              { label: "Bloqueado", value: clientStats.blocked, total: clientStats.total, cls: "badge-blocked" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={item.cls}>{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: item.total > 0 ? `${(item.value / item.total) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-6 text-right">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/clientes"
            className="mt-4 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver todos os clientes <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Quick actions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
            Ações Rápidas
          </h2>
          <div className="space-y-2">
            <Link href="/alugueis">
              <button className="w-full text-left px-3 py-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-sm text-foreground transition-colors flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Novo aluguel
              </button>
            </Link>
            <Link href="/clientes">
              <button className="w-full text-left px-3 py-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-sm text-foreground transition-colors flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Cadastrar cliente
              </button>
            </Link>
            <Link href="/bicicletas">
              <button className="w-full text-left px-3 py-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-sm text-foreground transition-colors flex items-center gap-2">
                <Bike className="w-4 h-4 text-green-400" /> Adicionar bicicleta
              </button>
            </Link>
            <Link href="/financeiro">
              <button className="w-full text-left px-3 py-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-sm text-foreground transition-colors flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-400" /> Lançar despesa
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {bikeStats.maintenance > 0 && (
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
      )}
    </div>
  );
}
