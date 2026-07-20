// ─── Agenda de Operações (F1) ────────────────────────────────────────────────
// A tela do "o que eu faço hoje/essa semana": entregas e devoluções por dia,
// com ações inline (Devolvida + WhatsApp). Semana corrente a partir de hoje,
// navegação ← Hoje → de 7 em 7 dias. Atrasadas ficam fixadas no dia de hoje.
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  CalendarClock, CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight,
  MapPin, MessageCircle, Truck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ConfirmDialog";
import { useMarkReturned } from "@/hooks/useMarkReturned";
import { ExtendRentalDialog, type ExtendableRental } from "@/components/ExtendRentalDialog";
import { buildWhatsappUrl } from "@/lib/whatsapp";

// ─── Datas (locais — o navegador da operação está em SP) ─────────────────────
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return toYmd(new Date(y, m - 1, d + n));
};
const dayLabel = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12);
  const wd = dt.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return `${wd}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
};

type Item = {
  id: number; day: string; deliveryTime: string | null;
  clientId: number; clientName: string; clientPhone: string | null;
  accommodation: string | null; neighborhood: string | null; city: string | null;
  bikeModel: string; tamanho: string | null; quantity: number | null;
  dailyRate: string | null;
  contractId: number | null; status: string; daysLate: number;
};

function locationOf(item: Item): string | null {
  if (item.accommodation?.trim()) return item.accommodation.trim();
  const parts = [item.neighborhood, item.city].filter((p) => p && p.trim());
  return parts.length ? parts.join(" · ") : null;
}

function waMessage(item: Item, kind: "delivery" | "return"): string {
  const nome = item.clientName.split(" ")[0] || item.clientName;
  const data = `${item.day.slice(8, 10)}/${item.day.slice(5, 7)}`;
  const cabecalho = `Oi ${nome}! Aqui é da Bike To Go Floripa 🚲`;
  if (kind === "delivery") {
    const hora = item.deliveryTime ? ` às ${item.deliveryTime}` : "";
    return `${cabecalho}\n\nSua ${item.bikeModel} está programada para ${data}${hora}. Podemos confirmar o local e o horário da entrega?`;
  }
  if (item.daysLate > 0) {
    return `${cabecalho}\n\nA devolução da sua ${item.bikeModel} estava prevista para ${data} e está ${item.daysLate} dia(s) em atraso. Consegue combinar com a gente o horário pra devolver?`;
  }
  return `${cabecalho}\n\nPassando pra lembrar que a devolução da sua ${item.bikeModel} está prevista para ${data}. Consegue combinar com a gente o horário? Obrigado!`;
}

// ─── Página ──────────────────────────────────────────────────────────────────
export default function Agenda() {
  const today = useMemo(() => toYmd(new Date()), []);
  const [from, setFrom] = useState(today);
  const to = addDays(from, 6);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(from, i)),
    [from],
  );

  const { data, isLoading, error } = trpc.dashboard.agenda.useQuery({ from, to });

  const confirmDialog = useConfirm();
  const markReturned = useMarkReturned(); // optimistic (M1)
  const [extending, setExtending] = useState<ExtendableRental | null>(null); // F8

  async function handleReturn(item: Item) {
    const ok = await confirmDialog({
      title: "Confirmar devolução?",
      description: `Marcar a ${item.bikeModel} de ${item.clientName} como devolvida (em bom estado). Para registrar dano, use a tela do contrato.`,
      confirmText: "Marcar devolvida",
    });
    if (ok) markReturned.mutate({ rentalId: item.id });
  }

  function handleWhatsapp(item: Item, kind: "delivery" | "return") {
    const url = buildWhatsappUrl(item.clientPhone, waMessage(item, kind));
    if (!url) { toast.error("Cliente sem telefone válido cadastrado."); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const byDay = useMemo(() => {
    const map = new Map<string, { deliveries: Item[]; returns: Item[] }>();
    for (const d of days) map.set(d, { deliveries: [], returns: [] });
    for (const it of (data?.deliveries ?? []) as Item[]) map.get(it.day)?.deliveries.push(it);
    for (const it of (data?.returns ?? []) as Item[]) map.get(it.day)?.returns.push(it);
    return map;
  }, [data, days]);

  const overdue = (data?.overdue ?? []) as Item[];
  const totalWeek =
    (data?.deliveries?.length ?? 0) + (data?.returns?.length ?? 0) + overdue.length;

  const rangeLabel = `${dayLabel(from)} — ${dayLabel(to)}`;

  // ─── Linha de item (entrega ou devolução) ─────────────────────────────────
  const ItemRow = ({ item, kind }: { item: Item; kind: "delivery" | "return" }) => {
    const late = kind === "return" && item.daysLate > 0;
    const loc = locationOf(item);
    return (
      <div className="py-2.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium shrink-0 ${
            late
              ? "bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400"
              : kind === "delivery"
              ? "bg-sky-500/20 text-sky-600 border-sky-500/30 dark:text-sky-400"
              : "bg-amber-500/20 text-amber-600 border-amber-500/30 dark:text-amber-400"
          }`}
        >
          {kind === "delivery" ? <Truck className="w-3 h-3" /> : <CalendarClock className="w-3 h-3" />}
          {late
            ? `Atrasada ${item.daysLate}d`
            : kind === "delivery"
            ? `Entrega${item.deliveryTime ? ` ${item.deliveryTime}` : ""}`
            : "Devolução"}
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
            {loc ? (
              <span className="inline-flex items-center gap-0.5">
                {" · "}<MapPin className="w-3 h-3 inline shrink-0" />{loc}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => handleWhatsapp(item, kind)}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{kind === "delivery" ? "Combinar" : "Lembrar"}</span>
          </Button>
          {kind === "return" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                title="Renovar (fica mais dias)"
                // numa devolução, `day` É o endDate do aluguel
                onClick={() => setExtending({
                  id: item.id,
                  clientName: item.clientName,
                  bikeModel: item.bikeModel,
                  endDate: item.day,
                  quantity: item.quantity,
                  dailyRate: item.dailyRate,
                })}
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span className="sr-only">Renovar</span>
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5"
                disabled={markReturned.isPending}
                onClick={() => handleReturn(item)}
              >
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Devolvida</span>
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">

        {/* Cabeçalho + navegação de semana */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Agenda
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rangeLabel}{!isLoading && ` · ${totalWeek} movimentação(ões)`}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 px-2" aria-label="Semana anterior"
              onClick={() => setFrom(addDays(from, -7))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8"
              disabled={from === today}
              onClick={() => setFrom(today)}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-2" aria-label="Próxima semana"
              onClick={() => setFrom(addDays(from, 7))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive">Erro ao carregar a agenda.</p>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-3 motion-stagger">
            {days.map((d) => {
              const bucket = byDay.get(d)!;
              const isToday = d === today;
              const showOverdue = isToday && overdue.length > 0;
              const empty = bucket.deliveries.length === 0 && bucket.returns.length === 0 && !showOverdue;
              return (
                <Card key={d} className={isToday ? "border-primary/40" : undefined}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <span className={isToday ? "text-primary" : "text-foreground"}>
                        {dayLabel(d)}
                      </span>
                      {isToday && (
                        <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium bg-primary/15 text-primary border-primary/30">
                          Hoje
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {empty ? (
                      <p className="text-xs text-muted-foreground py-1">Sem movimentação.</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {showOverdue && overdue.map((it) => <ItemRow key={`o-${it.id}`} item={it} kind="return" />)}
                        {bucket.returns.map((it) => <ItemRow key={`r-${it.id}`} item={it} kind="return" />)}
                        {bucket.deliveries.map((it) => <ItemRow key={`d-${it.id}`} item={it} kind="delivery" />)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* F8 — renovação */}
      <ExtendRentalDialog rental={extending} onOpenChange={(o) => !o && setExtending(null)} />
    </div>
  );
}
