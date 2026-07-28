// ─── F10: devolução antecipada — o aviso do recálculo ────────────────────────
// Aparece NO MOMENTO da devolução (não depois), porque depois de devolver a
// linha entra travada na edição do contrato e não dá mais para corrigir.
// Os números vêm do servidor (`rentals.earlyReturnPreview`) — a tela só exibe.
import { CalendarMinus2, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export type EarlyReturnItem = {
  rentalId: number;
  bikeLabel: string | null;
  oldEndDate: string;
  newEndDate: string;
  removedDays: number;
  oldDays: number;
  newDays: number;
  oldTotal: string;
  newTotal: string;
  creditAmount: string;
  oldDiscountPercent: number;
  newDiscountPercent: number;
  capped: boolean;
  alreadyPaid: boolean;
};

export type EarlyReturnPreviewData = {
  items: EarlyReturnItem[];
  totalCredit: string;
  alreadyPaid: boolean;
  returnDate: string;
};

const fmtBRL = (v: string | number) =>
  (typeof v === "string" ? parseFloat(v) : v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const fmtDay = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
const diarias = (n: number) => `${n} ${n === 1 ? "diária" : "diárias"}`;

export function EarlyReturnNotice({
  data,
  loading,
  recalculate,
  onRecalculateChange,
}: {
  data: EarlyReturnPreviewData | undefined;
  loading?: boolean;
  recalculate: boolean;
  onRecalculateChange: (v: boolean) => void;
}) {
  if (loading) return <Skeleton className="h-24 w-full" />;
  if (!data || data.items.length === 0) return null;

  const credito = parseFloat(data.totalCredit);
  const perdeuDesconto = data.items.some(
    (i) => i.oldDiscountPercent > 0 && i.newDiscountPercent < i.oldDiscountPercent,
  );
  const travado = data.items.some((i) => i.capped);

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <CalendarMinus2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
          Devolução antecipada
        </p>
      </div>

      <div className="space-y-1.5">
        {data.items.map((item) => (
          <div key={item.rentalId} className="text-xs space-y-0.5">
            <p className="text-muted-foreground">
              {item.bikeLabel ? <span className="text-foreground font-medium">{item.bikeLabel}</span> : "Aluguel"}
              {" · combinado até "}{fmtDay(item.oldEndDate)}{", devolvendo "}{fmtDay(item.newEndDate)}
              {` (${item.removedDays} ${item.removedDays === 1 ? "dia" : "dias"} a menos)`}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-muted-foreground">
                {diarias(item.oldDays)} → <span className="text-foreground font-medium">{diarias(item.newDays)}</span>
              </span>
              <span className="text-muted-foreground tabular-nums">
                {fmtBRL(item.oldTotal)} →{" "}
                <span className="text-foreground font-semibold">{fmtBRL(item.newTotal)}</span>
              </span>
            </p>
          </div>
        ))}
      </div>

      {credito > 0 ? (
        <div className="flex items-center justify-between border-t border-amber-500/20 pt-2">
          <span className="text-xs text-muted-foreground">
            {data.items.length > 1 ? "Crédito total" : "Deixa de cobrar"}
          </span>
          <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            −{fmtBRL(data.totalCredit)}
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground border-t border-amber-500/20 pt-2">
          Sem alteração de valor: o desconto do período longo já compensava os dias
          não usados, então o valor combinado foi mantido.
        </p>
      )}

      {(perdeuDesconto || travado || data.alreadyPaid) && (
        <div className="space-y-1">
          {perdeuDesconto && (
            <p className="text-xs text-muted-foreground flex gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              O desconto do período maior não vale para o período reduzido: o cliente
              paga a diária da nova faixa.
            </p>
          )}
          {travado && (
            <p className="text-xs text-muted-foreground flex gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              Devolver antes nunca aumenta a conta: o valor ficou travado no combinado.
            </p>
          )}
          {data.alreadyPaid && credito > 0 && (
            <p className="text-xs text-muted-foreground flex gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              Este contrato já foi pago: o crédito entra como estorno no Financeiro.
            </p>
          )}
        </div>
      )}

      <label className="flex items-center gap-2.5 border-t border-amber-500/20 pt-2.5 cursor-pointer">
        <Switch
          checked={recalculate}
          onCheckedChange={onRecalculateChange}
          disabled={credito <= 0}
        />
        <span className="text-xs font-medium">
          Recalcular o valor pelos dias usados
        </span>
      </label>
    </div>
  );
}
