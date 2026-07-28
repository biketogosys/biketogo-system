// ─── F10: devolveu antes do combinado (Agenda) ───────────────────────────────
// A devolução no dia certo continua no confirm simples; ESTE dialog só aparece
// quando a data real é menor que a combinada — o momento certo de perguntar
// "recalcular?", porque depois de devolver a linha trava na edição do contrato.
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EarlyReturnNotice } from "@/components/EarlyReturnNotice";

export type EarlyReturnTarget = {
  id: number;
  clientName: string;
  bikeModel: string;
};

export function EarlyReturnDialog({
  target,
  onOpenChange,
  onConfirm,
  pending,
}: {
  target: EarlyReturnTarget | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (opts: { rentalId: number; recalculate: boolean }) => void;
  pending?: boolean;
}) {
  const [recalculate, setRecalculate] = useState(true);
  useEffect(() => { setRecalculate(true); }, [target?.id]);

  const { data, isLoading } = trpc.rentals.earlyReturnPreview.useQuery(
    { rentalId: target?.id ?? 0 },
    { enabled: !!target },
  );

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-mobile sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" /> Confirmar devolução
          </DialogTitle>
          <DialogDescription>
            {target?.bikeModel} de {target?.clientName}, em bom estado. A unidade
            volta a ficar disponível. Para registrar dano, use a tela do contrato.
          </DialogDescription>
        </DialogHeader>

        <EarlyReturnNotice
          data={data}
          loading={isLoading}
          recalculate={recalculate}
          onRecalculateChange={setRecalculate}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!target || pending}
            onClick={() => target && onConfirm({ rentalId: target.id, recalculate })}
          >
            {recalculate && parseFloat(data?.totalCredit ?? "0") > 0
              ? "Devolver e recalcular"
              : "Marcar devolvida"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
