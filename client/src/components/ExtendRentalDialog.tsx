// ─── F8: renovação de aluguel ("fico mais N dias") ───────────────────────────
// Dialog compartilhado (Agenda + painel de Devoluções do Dashboard). Atalhos
// de +1/+3/+7 dias cobrem o caso clássico do turista; data livre para o resto.
// O valor mostrado é PRÉVIA (mesma fórmula do servidor, que é a autoridade —
// ele revalida e recusa se a unidade estiver reservada).
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export type ExtendableRental = {
  id: number;
  clientName: string;
  bikeModel: string;
  endDate: string | null;
  quantity: number | null;
  dailyRate: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const addDaysYmd = (ymd: string, n: number) =>
  new Date(Date.parse(ymd) + n * DAY_MS).toISOString().slice(0, 10);
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDay = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

export function ExtendRentalDialog({
  rental,
  onOpenChange,
  onDone,
}: {
  rental: ExtendableRental | null;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const [newEnd, setNewEnd] = useState("");

  // Ao abrir, sugere +3 dias (o caso mais comum)
  useEffect(() => {
    if (rental?.endDate) setNewEnd(addDaysYmd(rental.endDate, 3));
  }, [rental?.id, rental?.endDate]);

  const utils = trpc.useUtils();
  const extend = trpc.rentals.extend.useMutation({
    onSuccess: (r) => {
      toast.success(
        `Renovado até ${fmtDay(r.newEndDate)} — +${r.addedDays} dia(s), ${fmtBRL(parseFloat(r.extraAmount))}.`,
      );
      utils.dashboard.agenda.invalidate();
      utils.dashboard.returns.invalidate();
      utils.dashboard.summary.invalidate();
      utils.contracts.invalidate();
      onOpenChange(false);
      onDone?.();
    },
    onError: (e) => toast.error(e.message || "Não foi possível renovar."),
  });

  const preview = useMemo(() => {
    if (!rental?.endDate || !newEnd) return null;
    const addedDays = Math.round((Date.parse(newEnd) - Date.parse(rental.endDate)) / DAY_MS);
    if (addedDays <= 0) return { addedDays, extra: 0, invalido: true };
    const extra = parseFloat(rental.dailyRate ?? "0") * addedDays * (rental.quantity ?? 1);
    return { addedDays, extra, invalido: false };
  }, [rental, newEnd]);

  const minDate = rental?.endDate ? addDaysYmd(rental.endDate, 1) : undefined;

  return (
    <Dialog open={!!rental} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md dialog-mobile">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-primary" /> Renovar aluguel
          </DialogTitle>
          <DialogDescription>
            {rental?.clientName} · {rental?.bikeModel}
            {rental?.endDate ? ` · devolução atual ${fmtDay(rental.endDate)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            {[1, 3, 7].map((n) => {
              const alvo = rental?.endDate ? addDaysYmd(rental.endDate, n) : "";
              return (
                <Button
                  key={n}
                  type="button"
                  variant={newEnd === alvo ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setNewEnd(alvo)}
                >
                  +{n} {n === 1 ? "dia" : "dias"}
                </Button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nova-devolucao">Nova data de devolução</Label>
            <Input
              id="nova-devolucao"
              type="date"
              value={newEnd}
              min={minDate}
              onChange={(e) => setNewEnd(e.target.value)}
            />
          </div>

          {preview && !preview.invalido && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dias adicionais</span>
                <span className="font-medium tabular-nums">{preview.addedDays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor extra</span>
                <span className="font-semibold tabular-nums text-primary">
                  {fmtBRL(preview.extra)}
                </span>
              </div>
              {(rental?.quantity ?? 1) > 1 && (
                <p className="text-xs text-muted-foreground pt-1">
                  {rental!.quantity}× {fmtBRL(parseFloat(rental!.dailyRate ?? "0"))}/dia
                </p>
              )}
            </div>
          )}
          {preview?.invalido && (
            <p className="text-xs text-destructive">
              A nova data precisa ser posterior à devolução atual.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!rental || !preview || preview.invalido || extend.isPending}
            onClick={() => rental && extend.mutate({ rentalId: rental.id, newEndDate: newEnd })}
          >
            {extend.isPending ? "Renovando…" : "Confirmar renovação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
