import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
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
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {/* Card 1 — Receita do mês */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Receita do mês</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {fmt(receitaTotal)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              Aluguéis + extras
            </Badge>
          </CardAction>
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
          <CardDescription>Aluguéis ativos</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {bikeStats.rented}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <BikeIcon />
              {frotaPct}% da frota
            </Badge>
          </CardAction>
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
          <CardDescription>Total de clientes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {clientStats.total}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <UsersIcon />
              {clientStats.verified} verificados
            </Badge>
          </CardAction>
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
          <CardDescription>Lucro líquido</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {fmt(financial.lucroLiquido)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingDownIcon />
              despesas {fmt(financial.despesas)}
            </Badge>
          </CardAction>
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
