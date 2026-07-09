import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";

interface WeeklyDataPoint {
  week: string;
  receitaAlugueis: number;
  receitasExtras: number;
  despesas: number;
}

interface RevenueChartProps {
  data?: WeeklyDataPoint[];
  loading?: boolean;
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
}

const chartConfig = {
  receitaAlugueis: {
    label: "Rec. Aluguéis",
    color: "var(--chart-1)",
  },
  receitasExtras: {
    label: "Rec. Extras",
    color: "var(--chart-2)",
  },
  despesas: {
    label: "Despesas",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function RevenueChart({ data = [], loading, timeRange, onTimeRangeChange }: RevenueChartProps) {
  // Filtrar dados por período selecionado
  const filteredData = React.useMemo(() => {
    if (!data.length) return [];
    const weeksToShow = timeRange === "7d" ? 1 : timeRange === "30d" ? 4 : 8;
    return data.slice(-weeksToShow);
  }, [data, timeRange]);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Receitas &amp; Despesas</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Movimentação semanal — últimas semanas
          </span>
          <span className="@[540px]/card:hidden">Movimentação semanal</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(v) => v && onTimeRangeChange(v)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">8 semanas</ToggleGroupItem>
            <ToggleGroupItem value="30d">4 semanas</ToggleGroupItem>
            <ToggleGroupItem value="7d">1 semana</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Selecionar período"
            >
              <SelectValue placeholder="8 semanas" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">8 semanas</SelectItem>
              <SelectItem value="30d" className="rounded-lg">4 semanas</SelectItem>
              <SelectItem value="7d" className="rounded-lg">1 semana</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <Skeleton className="aspect-auto h-[250px] w-full" />
        ) : filteredData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Nenhum dado no período
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillReceitaAlugueis" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-receitaAlugueis)" stopOpacity={1.0} />
                  <stop offset="95%" stopColor="var(--color-receitaAlugueis)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillReceitasExtras" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-receitasExtras)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-receitasExtras)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-despesas)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--color-despesas)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => `Semana de ${value}`}
                    indicator="dot"
                    formatter={(value) =>
                      Number(value).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    }
                  />
                }
              />
              <Area
                dataKey="despesas"
                type="natural"
                fill="url(#fillDespesas)"
                stroke="var(--color-despesas)"
                stackId="a"
              />
              <Area
                dataKey="receitasExtras"
                type="natural"
                fill="url(#fillReceitasExtras)"
                stroke="var(--color-receitasExtras)"
                stackId="a"
              />
              <Area
                dataKey="receitaAlugueis"
                type="natural"
                fill="url(#fillReceitaAlugueis)"
                stroke="var(--color-receitaAlugueis)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
