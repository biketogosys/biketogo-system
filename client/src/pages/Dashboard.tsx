import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Users, Bike, FileText, DollarSign, Loader2,
  TrendingUp, AlertCircle, ArrowRight, Wrench,
} from "lucide-react";

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

export default function Dashboard() {
  const { data, isLoading } = trpc.dashboard.summary.useQuery();

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
