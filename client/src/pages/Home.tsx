import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Users, Bike, FileText, DollarSign, Loader2,
  TrendingUp, AlertTriangle, Wrench, ArrowRight,
} from "lucide-react";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  href,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-1">{sub}</p>}
      </div>
    </Link>
  );
}

export default function Home() {
  const { data: summary, isLoading } = trpc.dashboard.summary.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const clientStats = summary?.clientStats ?? { total: 0, leads: 0, verified: 0, blocked: 0 };
  const bikeStats = summary?.bikeStats ?? { total: 0, available: 0, rented: 0, maintenance: 0 };
  const rentalStats = summary?.rentalStats ?? { active: 0, monthRevenue: "0" };
  const monthRevenue = Number(rentalStats.monthRevenue ?? 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visão geral do sistema Bike To Go
        </p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Clientes"
          value={clientStats.total}
          sub={`${clientStats.verified} verificados · ${clientStats.leads} leads`}
          color="bg-blue-500/10 text-blue-400"
          href="/clientes"
        />
        <StatCard
          icon={Bike}
          label="Bicicletas"
          value={bikeStats.total}
          sub={`${bikeStats.available} disponíveis · ${bikeStats.rented} alugadas`}
          color="bg-primary/10 text-primary"
          href="/bicicletas"
        />
        <StatCard
          icon={FileText}
          label="Aluguéis ativos"
          value={rentalStats.active}
          sub={`Receita do mês: R$ ${monthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          color="bg-green-500/10 text-green-400"
          href="/alugueis"
        />
        <StatCard
          icon={DollarSign}
          label="Financeiro"
          value="Ver"
          sub="Despesas, receitas e relatórios"
          color="bg-purple-500/10 text-purple-400"
          href="/financeiro"
        />
      </div>

      {/* Status panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Bikes status */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Bike className="w-4 h-4 text-primary" /> Status das bicicletas
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="text-xs text-muted-foreground">Disponíveis</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{bikeStats.available}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs text-muted-foreground">Alugadas</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{bikeStats.rented}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="text-xs text-muted-foreground">Manutenção</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{bikeStats.maintenance}</span>
            </div>
            {bikeStats.total > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden flex">
                  <div
                    className="h-full bg-green-400 transition-all"
                    style={{ width: `${(bikeStats.available / bikeStats.total) * 100}%` }}
                  />
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${(bikeStats.rented / bikeStats.total) * 100}%` }}
                  />
                  <div
                    className="h-full bg-red-400 transition-all"
                    style={{ width: `${(bikeStats.maintenance / bikeStats.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rentals status */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-400" /> Aluguéis
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-muted-foreground">Ativos agora</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{rentalStats.active}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">Receita do mês</span>
              </div>
              <span className="text-sm font-semibold text-primary">
                R$ {monthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-muted-foreground" /> Ações rápidas
          </h3>
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
