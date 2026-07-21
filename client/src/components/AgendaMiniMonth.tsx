// ─── F1.1: mini-visão mensal da Agenda ───────────────────────────────────────
// Navegador, não uma segunda agenda: mostra o mês compacto com a DENSIDADE de
// cada dia (um ponto por tipo presente) e, ao clicar, foca a semana daquele
// dia na lista principal. Dia vazio abre "Novo contrato" já com a data.
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type DayDensity = { deliveries: number; returns: number; overdue: number };

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function AgendaMiniMonth({
  anchor,
  today,
  weekFrom,
  weekTo,
  density,
  loading,
  onPickDay,
  onNewContract,
  onMonthShift,
}: {
  anchor: string;                       // qualquer dia do mês exibido (YYYY-MM-DD)
  today: string;
  weekFrom: string;
  weekTo: string;
  density: Map<string, DayDensity>;
  loading: boolean;
  onPickDay: (day: string) => void;
  onNewContract: (day: string) => void;
  onMonthShift: (delta: number) => void;
}) {
  const [ay, am] = anchor.split("-").map(Number);
  const year = ay;
  const month = am - 1;                 // 0-based
  const first = new Date(year, month, 1);
  const leading = first.getDay();       // domingo = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ymd(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const titulo = first
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" className="h-7 px-2" aria-label="Mês anterior"
          onClick={() => onMonthShift(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">{titulo}</span>
        <Button variant="ghost" size="sm" className="h-7 px-2" aria-label="Próximo mês"
          onClick={() => onMonthShift(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {w}
          </div>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`v-${i}`} />;
            const d = density.get(day);
            const total = d ? d.deliveries + d.returns + d.overdue : 0;
            const isToday = day === today;
            const naSemana = day >= weekFrom && day <= weekTo;
            const num = Number(day.slice(8, 10));
            return (
              <button
                key={day}
                type="button"
                onClick={() => (total > 0 ? onPickDay(day) : onNewContract(day))}
                title={
                  total > 0
                    ? `${total} movimentação(ões) — ver a semana`
                    : "Sem movimentação — criar contrato neste dia"
                }
                className={`group relative flex h-11 flex-col items-center justify-center rounded-md border text-xs transition-colors ${
                  isToday
                    ? "border-primary/50 bg-primary/10 font-semibold text-primary"
                    : naSemana
                    ? "border-border bg-accent/40 text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-accent/30"
                }`}
              >
                <span className="tabular-nums leading-none">{num}</span>
                <span className="mt-1 flex h-1.5 items-center gap-0.5">
                  {d && d.overdue > 0 && <i className="size-1.5 rounded-full bg-red-500" />}
                  {d && d.returns > 0 && <i className="size-1.5 rounded-full bg-amber-500" />}
                  {d && d.deliveries > 0 && <i className="size-1.5 rounded-full bg-sky-500" />}
                  {total === 0 && (
                    <CalendarPlus className="size-3 opacity-0 transition-opacity group-hover:opacity-40" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-sky-500" /> entrega</span>
        <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-amber-500" /> devolução</span>
        <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-red-500" /> atrasada</span>
        <span className="ml-auto">dia vazio = novo contrato</span>
      </div>
    </div>
  );
}
