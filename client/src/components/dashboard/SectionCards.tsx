import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUpIcon, TrendingDownIcon, BikeIcon, UsersIcon } from "lucide-react";

interface SummaryData {
  clientStats: { total: number; leads: number; verified: number; blocked: number };
  bikeStats: { total: number; available: number; rented: number; maintenance: number };
  rentalStats: { active: number; monthRevenue: string };
  financial: { receitaAlugueis: number; receitasExtras: number; despesas: number; lucroLiquido: number };
}

interface SectionCardsProps {
  data?: SummaryData;
  loading?: boolean;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CardSkeleton() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-8 w-36" />
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-32" />
      </CardFooter>
    </Card>
  );
}

export function SectionCards({ data, loading }: SectionCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const financial = data?.financial ?? { receitaAlugueis: 0, receitasExtras: 0, despesas: 0, lucroLiquido: 0 };
  const bikeStats = data?.bikeStats ?? { total: 0, available: 0, rented: 0, maintenance: 0 };
  const clientStats = data?.clientStats ?? { total: 0, leads: 0, verified: 0, blocked: 0 };

  const receitaTotal = financial.receitaAlugueis + financial.receitasExtras;
  const frotaPct = bikeStats.total > 0 ? Math.round((bikeStats.rented / bikeStats.total) * 100) : 0;

  return (
    <div className="motion-stagger grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Card 1 — Receita do mês */}
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="min-w-0 truncate">Receita do mês</CardDescription>
            <Badge variant="outline" className="shrink-0">
              <TrendingUpIcon />
              Aluguéis + extras
            </Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums whitespace-nowrap @[250px]/card:text-3xl">
            {fmt(receitaTotal)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Aluguéis {fmt(financial.receitaAlugueis)} <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Aluguéis pagos no período</div>
        </CardFooter>
      </Card>

      {/* Card 2 — Aluguéis ativos */}
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="min-w-0 truncate">Aluguéis ativos</CardDescription>
            <Badge variant="outline" className="shrink-0">
              <BikeIcon />
              {frotaPct}% da frota
            </Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums whitespace-nowrap @[250px]/card:text-3xl">
            {bikeStats.rented}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {bikeStats.available} disponíveis <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Bikes em uso agora</div>
        </CardFooter>
      </Card>

      {/* Card 3 — Total de clientes */}
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="min-w-0 truncate">Total de clientes</CardDescription>
            <Badge variant="outline" className="shrink-0">
              <UsersIcon />
              {clientStats.verified} verificados
            </Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums whitespace-nowrap @[250px]/card:text-3xl">
            {clientStats.total}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {clientStats.leads} novos leads <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Aguardando validação</div>
        </CardFooter>
      </Card>

      {/* Card 4 — Lucro líquido */}
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="min-w-0 truncate">Lucro líquido</CardDescription>
            <Badge variant="outline" className="shrink-0">
              <TrendingDownIcon />
              despesas {fmt(financial.despesas)}
            </Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums whitespace-nowrap @[250px]/card:text-3xl">
            {fmt(financial.lucroLiquido)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Receitas − despesas <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Margem do período</div>
        </CardFooter>
      </Card>
    </div>
  );
}
