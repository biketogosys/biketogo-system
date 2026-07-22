import { trpc } from "@/lib/trpc";
import { NewContractModal } from "@/components/NewContractModal";
import { usePageParam } from "@/hooks/usePageParam";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Bike,
  Package,
  Camera,
  Download,
  CreditCard,
  Plus,
  Search,
  X,
  Check,
  Trash2,
} from "lucide-react";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useConfirm } from "@/components/ConfirmDialog";
import { friendlyError } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────────────────────
type ContractStatus = "pendente" | "ativo" | "parcialmente_devolvido" | "encerrado" | "cancelado";
type AccessoryReturnStatus = "ok" | "danificado" | "perdido" | "roubado";

const contractStatusConfig: Record<
  ContractStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; cls: string }
> = {
  pendente: { label: "Pendente", variant: "secondary", cls: "bg-amber-500/20 text-amber-600 border-amber-500/30 dark:text-amber-400" },
  ativo: { label: "Ativo", variant: "default", cls: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 dark:text-emerald-400" },
  parcialmente_devolvido: {
    label: "Parcialmente Devolvido",
    variant: "secondary",
    cls: "bg-orange-500/20 text-orange-600 border-orange-500/30 dark:text-orange-400",
  },
  encerrado: { label: "Encerrado", variant: "outline", cls: "bg-slate-500/20 text-slate-500 border-slate-500/30 dark:text-slate-400" },
  cancelado: { label: "Cancelado", variant: "destructive", cls: "bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400" },
};

const accessoryStatusConfig: Record<
  AccessoryReturnStatus,
  { label: string; icon: React.ReactNode; cls: string }
> = {
  ok: { label: "OK", icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, cls: "text-emerald-600 dark:text-emerald-400" },
  danificado: {
    label: "Danificado",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    cls: "text-amber-600 dark:text-amber-400",
  },
  perdido: { label: "Perdido", icon: <XCircle className="h-4 w-4 text-slate-500" />, cls: "text-slate-500 dark:text-slate-400" },
  roubado: { label: "Roubado", icon: <XCircle className="h-4 w-4 text-red-500" />, cls: "text-red-600 dark:text-red-400" },
};

const rentalStatusLabels: Record<string, string> = {
  pending: "Pendente",
  active: "Ativo",
  returned: "Devolvido",
  overdue: "Atrasado",
  cancelled: "Cancelado",
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const cfg = contractStatusConfig[status] ?? contractStatusConfig.ativo;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── Close Contract Dialog ────────────────────────────────────────────────────
function CloseContractDialog({
  contractId,
  open,
  onClose,
}: {
  contractId: number;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: detail, isLoading } = trpc.contracts.getById.useQuery(
    { id: contractId },
    { enabled: open }
  );

  const [accChecklist, setAccChecklist] = useState<
    Record<number, { status: AccessoryReturnStatus; observacao: string; fotoUrl?: string; uploading?: boolean }>
  >({});

  async function handleFotoUpload(accId: number, file: File) {
    setAccChecklist((prev) => ({
      ...prev,
      [accId]: { ...prev[accId], status: prev[accId]?.status ?? "ok", observacao: prev[accId]?.observacao ?? "", uploading: true },
    }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "manutencao");
      const res = await fetch("/api/upload-document", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload falhou");
      const { url } = await res.json();
      setAccChecklist((prev) => ({
        ...prev,
        [accId]: { ...prev[accId], fotoUrl: url, uploading: false },
      }));
      toast.success("Foto enviada");
    } catch {
      toast.error("Erro ao enviar foto.");
      setAccChecklist((prev) => ({
        ...prev,
        [accId]: { ...prev[accId], uploading: false },
      }));
    }
  }

  const closeMutation = trpc.contracts.close.useMutation({
    onSuccess: () => {
      toast.success("Contrato encerrado");
      utils.contracts.list.invalidate();
      utils.contracts.getById.invalidate({ id: contractId });
      onClose();
    },
    onError: (e) => toast.error(friendlyError(e, "Erro ao encerrar contrato.")),
  });

  const handleClose = () => {
    const accessories = detail?.accessories?.map((acc) => ({
      id: acc.id,
      status: accChecklist[acc.id]?.status ?? "ok",
      observacao: accChecklist[acc.id]?.observacao ?? "",
      fotoUrl: accChecklist[acc.id]?.fotoUrl,
    }));
    closeMutation.mutate({ id: contractId, accessories });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="dialog-mobile max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Encerrar Contrato #{contractId}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bikes checklist */}
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Bike className="h-4 w-4" /> Bikes vinculadas
              </h3>
              <div className="rounded-md border divide-y">
                {detail?.rentals?.map((rental) => (
                  <div key={rental.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">
                        {rental.bikeBrand} {rental.bikeModel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rental.bikeSerialNumber} · {rental.startDate} → {rental.endDate ?? "—"}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-md ${
                        rental.status === "returned"
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : rental.status === "active"
                          ? "bg-sky-500/20 text-sky-600 dark:text-sky-400"
                          : "bg-slate-500/20 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {rentalStatusLabels[rental.status] ?? rental.status}
                    </span>
                  </div>
                ))}
                {(!detail?.rentals || detail.rentals.length === 0) && (
                  <p className="text-sm text-muted-foreground px-4 py-3">Nenhuma bike vinculada.</p>
                )}
              </div>
            </div>

            {/* Accessories checklist */}
            {detail?.accessories && detail.accessories.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Checklist de Acessórios
                </h3>
                <div className="space-y-3">
                  {detail.accessories.map((acc) => (
                    <div key={acc.id} className="rounded-md border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {acc.accessoryName ?? `Acessório #${acc.accessoryId}`}{" "}
                            <span className="text-muted-foreground font-normal">× {acc.qty}</span>
                          </p>
                          {(acc as any).serialNumber && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Nº Série: <span className="font-mono">{(acc as any).serialNumber}</span>
                            </p>
                          )}
                        </div>
                        <Select
                          value={accChecklist[acc.id]?.status ?? acc.status ?? "ok"}
                          onValueChange={(v) =>
                            setAccChecklist((prev) => ({
                              ...prev,
                              [acc.id]: {
                                ...prev[acc.id],
                                status: v as AccessoryReturnStatus,
                                observacao: prev[acc.id]?.observacao ?? "",
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["ok", "danificado", "perdido", "roubado"] as AccessoryReturnStatus[]).map(
                              (s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  <span className="flex items-center gap-1.5">
                                    {accessoryStatusConfig[s].icon}
                                    {accessoryStatusConfig[s].label}
                                  </span>
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Observação</Label>
                        <Textarea
                          className="mt-1 text-sm resize-none"
                          rows={2}
                          placeholder="Descreva o estado do acessório..."
                          value={accChecklist[acc.id]?.observacao ?? ""}
                          onChange={(e) =>
                            setAccChecklist((prev) => ({
                              ...prev,
                              [acc.id]: {
                                ...prev[acc.id],
                                status: prev[acc.id]?.status ?? "ok",
                                observacao: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      {/* Foto do dano — só aparece se status ≠ ok */}
                      {(accChecklist[acc.id]?.status ?? acc.status ?? "ok") !== "ok" && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Foto do dano (opcional)</Label>
                          <div className="mt-1 flex items-center gap-2">
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFotoUpload(acc.id, file);
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="pointer-events-none"
                                disabled={accChecklist[acc.id]?.uploading}
                              >
                                {accChecklist[acc.id]?.uploading ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Camera className="h-3 w-3 mr-1" />
                                )}
                                {accChecklist[acc.id]?.fotoUrl ? "Trocar foto" : "Enviar foto"}
                              </Button>
                            </label>
                            {accChecklist[acc.id]?.fotoUrl && (
                              <a
                                href={accChecklist[acc.id]!.fotoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary underline underline-offset-2 truncate max-w-[180px] hover:text-primary/80 transition-colors"
                              >
                                Ver foto
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleClose}
            disabled={closeMutation.isPending}
          >
            {closeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Confirmar Encerramento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// // ─── Contract Detail Panel ────────────────────────────────────────────────
function ContractDetail({
  contractId,
  onBack,
}: {
  contractId: number;
  onBack: () => void;
}) {
  const confirmDialog = useConfirm();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.contracts.getById.useQuery({ id: contractId });
  const [closeOpen, setCloseOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnRentalId, setReturnRentalId] = useState<number | null>(null);
  const [returnBikeLabel, setReturnBikeLabel] = useState("");
  const [returnCondition, setReturnCondition] = useState<"ok" | "damaged">("ok");
  const [returnNotes, setReturnNotes] = useState("");

  const recalcMutation = trpc.contracts.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status recalculado.");
      utils.contracts.getById.invalidate({ id: contractId });
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const confirmAllMutation = trpc.rentals.confirmAll.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.confirmed} aluguéis confirmados`);
      utils.contracts.getById.invalidate({ id: contractId });
      utils.contracts.list.invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "Erro ao confirmar.")),
  });

  const rejectAllMutation = trpc.rentals.rejectAll.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.rejected} aluguéis recusados.`);
      utils.contracts.getById.invalidate({ id: contractId });
      utils.contracts.list.invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "Erro ao recusar.")),
  });

  const returnRentalMutation = trpc.rentals.returnRental.useMutation({
    onSuccess: () => {
      toast.success("Devolução registrada");
      utils.contracts.getById.invalidate({ id: contractId });
      utils.contracts.list.invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "Erro ao devolver.")),
  });

  const confirmPaymentMutation = trpc.contracts.confirmPayment.useMutation({
    onSuccess: (res) => {
      toast.success(`Pagamento confirmado para ${res.paid} aluguel(is). Receita registrada.`);
      utils.contracts.getById.invalidate({ id: contractId });
      utils.contracts.list.invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "Erro ao confirmar pagamento.")),
  });

  const generatePdfMutation = trpc.contracts.generatePdf.useMutation({
    onSuccess: (res) => {
      window.open(res.pdfUrl, "_blank");
      utils.contracts.getById.invalidate({ id: contractId });
    },
    onError: (e) => toast.error(friendlyError(e, "Erro ao gerar PDF.")),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-7 w-56" />
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Contrato não encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — empilha no mobile (senão os botões colidem com o título) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Contrato #{data.id}
            </h2>
            <p className="text-sm text-muted-foreground">
              Cliente: <span className="font-medium text-foreground">{data.clientName ?? `#${data.clientId}`}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ContractStatusBadge status={data.status as ContractStatus} />
          {["pendente", "ativo", "parcialmente_devolvido"].includes(data.status) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditOpen(true)}
            >
              <FileText className="h-4 w-4 mr-1" /> Editar contrato
            </Button>
          )}
          {(data.status === "pendente" || data.rentals?.some((r: any) => r.status === "pending")) && (
            <>
              {data.clientStatus && data.clientStatus !== "verified" && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-md px-2.5 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Cliente não verificado — verifique antes de confirmar</span>
                </div>
              )}
              <Button
                size="sm"
                onClick={() => confirmAllMutation.mutate({ contractId })}
                disabled={confirmAllMutation.isPending || (data.clientStatus != null && data.clientStatus !== "verified")}
                title={data.clientStatus !== "verified" ? "Cliente precisa ser verificado antes de confirmar" : undefined}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {confirmAllMutation.isPending ? "Confirmando..." : "Confirmar Reserva"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  if (await confirmDialog({ title: "Recusar reserva?", description: "Todos os aluguéis pendentes serão cancelados.", confirmText: "Recusar", destructive: true }))
                    rejectAllMutation.mutate({ contractId });
                }}
                disabled={rejectAllMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {rejectAllMutation.isPending ? "Recusando..." : "Recusar Reserva"}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => recalcMutation.mutate({ id: contractId })}
            disabled={recalcMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${recalcMutation.isPending ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
          {data.status !== "encerrado" && data.status !== "cancelado" && data.status !== "pendente" && (
            <Button
              size="sm"
              onClick={() => setCloseOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Encerrar
            </Button>
          )}

        </div>
      </div>

      {/* Payment confirmation button (presential) */}
      {data.status === "pendente" && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-300 flex-1">
            Pagamento presencial pendente
          </span>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={async () => {
              if (await confirmDialog({ title: "Confirmar pagamento?", description: "A receita será registrada automaticamente.", confirmText: "Confirmar" }))
                confirmPaymentMutation.mutate({ contractId });
            }}
            disabled={confirmPaymentMutation.isPending}
          >
            <CreditCard className="h-4 w-4 mr-1" />
            {confirmPaymentMutation.isPending ? "Confirmando..." : "Confirmar Pagamento"}
          </Button>
        </div>
      )}

      {/* PDF download */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={generatePdfMutation.isPending}>
              {generatePdfMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Gerar PDF
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => generatePdfMutation.mutate({ contractId: data.id, language: "pt" })}>
              🇧🇷 Português
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => generatePdfMutation.mutate({ contractId: data.id, language: "en" })}>
              🇺🇸 English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => generatePdfMutation.mutate({ contractId: data.id, language: "es" })}>
              🇪🇸 Español
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {data.pdfUrl && (
          <a href={data.pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              Baixar
            </Button>
          </a>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Valor Total</p>
          <p className="text-lg font-bold">
            {data.valorTotal ? `R$ ${Number(data.valorTotal).toFixed(2)}` : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Criado em</p>
          <p className="text-sm font-medium">
            {data.criadoEm ? new Date(data.criadoEm).toLocaleDateString("pt-BR") : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Encerrado em</p>
          <p className="text-sm font-medium">
            {data.encerradoEm ? new Date(data.encerradoEm).toLocaleDateString("pt-BR") : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Bikes</p>
          <p className="text-lg font-bold">{data.rentals?.length ?? 0}</p>
        </div>
      </div>

      {/* Bikes table */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Bike className="h-4 w-4" /> Bikes Vinculadas
        </h3>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bike</TableHead>
                <TableHead>Nº Série</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rentals?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.bikeBrand} {r.bikeModel}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.bikeSerialNumber}</TableCell>
                  <TableCell className="text-xs">
                    {r.startDate} → {r.endDate ?? "—"}
                  </TableCell>
                  <TableCell>
                    {r.totalAmount ? `R$ ${Number(r.totalAmount).toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                        r.status === "returned"
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : r.status === "active"
                          ? "bg-sky-500/20 text-sky-600 dark:text-sky-400"
                          : r.status === "overdue"
                          ? "bg-red-500/20 text-red-600 dark:text-red-400"
                          : "bg-slate-500/20 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {rentalStatusLabels[r.status] ?? r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.returnCondition ?? "—"}
                  </TableCell>
                  <TableCell>
                    {r.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-amber-500/40 text-amber-600 hover:bg-amber-50"
                        disabled={returnRentalMutation.isPending}
                        onClick={() => {
                          setReturnRentalId(r.id);
                          setReturnBikeLabel(`${r.bikeBrand ?? ""} ${r.bikeModel ?? ""}`.trim() || "bike");
                          setReturnCondition("ok");
                          setReturnNotes("");
                          setReturnDialogOpen(true);
                        }}
                      >
                        Devolver
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!data.rentals || data.rentals.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    Nenhuma bike vinculada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Accessories checklist */}
      {data.accessories && data.accessories.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" /> Acessórios do Contrato
          </h3>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acessório</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Valor de Reposição</TableHead>
                  <TableHead>Condição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.accessories.map((acc) => {
                  const statusCfg =
                    accessoryStatusConfig[acc.status as AccessoryReturnStatus] ??
                    accessoryStatusConfig.ok;
                  return (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium text-sm">
                        {acc.accessoryName ?? `Acessório #${acc.accessoryId}`}
                        {acc.observacao && (
                          <p className="text-xs text-muted-foreground mt-0.5">{acc.observacao}</p>
                        )}
                      </TableCell>
                      <TableCell>{acc.qty}</TableCell>
                      <TableCell className="text-sm">
                        {(acc as any).replacementValue
                          ? `R$ ${Number((acc as any).replacementValue).toFixed(2)}`
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 text-xs font-medium ${statusCfg.cls}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Close dialog */}
      <CloseContractDialog
        contractId={contractId}
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
      />

      {/* Edit modal (pendente, ativo, parcialmente_devolvido) */}
      {["pendente", "ativo", "parcialmente_devolvido"].includes(data.status) && (
        <NewContractModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          editPrefill={{
            contractId: data.id,
            contractStatus: data.status,
            clientId: data.clientId,
            clientName: data.clientName ?? `Cliente #${data.clientId}`,
            bikes: (data.rentals ?? []).map((r: any) => ({
              rentalId: r.id,
              locked: r.status === "returned",
              bikeId: r.bikeId,
              bikeModel: r.bikeModel ?? "",
              bikeBrand: r.bikeBrand ?? "",
              bikeSizeId: r.bikeSizeId ?? null,
              tamanho: r.tamanho ?? "",
              startDate: r.startDate ?? "",
              endDate: r.endDate ?? "",
              quantity: r.quantity ?? 1,
              dailyRate: r.dailyRate ?? "0",
              numDays: r.startDate && r.endDate
                ? Math.max(1, Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000))
                : 1,
              totalAmount: r.totalAmount ?? "0.00",
              unitIds: r.bikeUnitIds ?? [], // BU-PICK-FRONT
            })),
            accessories: Object.values(
              (data.accessories ?? []).reduce((acc: any, a: any) => {
                const variante = a.variante ?? null;
                const k = `${a.accessoryId}::${variante ?? "__null__"}`;
                if (!acc[k]) acc[k] = { accessoryId: a.accessoryId, variante, qty: 0 };
                acc[k].qty += (a.qty ?? 1);
                return acc;
              }, {})
            ) as Array<{ accessoryId: number; variante: string | null; qty: number }>,
          }}
        />
      )}
      {/* Return rental dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={(v) => { if (!v) setReturnDialogOpen(false); }}>
        <DialogContent className="dialog-mobile max-w-md">
          <DialogHeader>
            <DialogTitle>Devolver bike — {returnBikeLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Estado da bike</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="returnCondition"
                    value="ok"
                    checked={returnCondition === "ok"}
                    onChange={() => setReturnCondition("ok")}
                    className="accent-primary"
                  />
                  <span className="text-sm">OK — devolver disponível</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="returnCondition"
                    value="damaged"
                    checked={returnCondition === "damaged"}
                    onChange={() => setReturnCondition("damaged")}
                    className="accent-destructive"
                  />
                  <span className="text-sm text-destructive">Danificada</span>
                </label>
              </div>
            </div>
            {returnCondition === "damaged" && (
              <div className="space-y-1">
                <Label htmlFor="returnNotes">Descrição do dano <span className="text-destructive">*</span></Label>
                <Textarea
                  id="returnNotes"
                  placeholder="Descreva o dano encontrado..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancelar</Button>
            <Button
              variant={returnCondition === "damaged" ? "destructive" : "default"}
              disabled={returnRentalMutation.isPending || (returnCondition === "damaged" && !returnNotes.trim())}
              onClick={() => {
                if (!returnRentalId) return;
                returnRentalMutation.mutate(
                  { id: returnRentalId, bikeCondition: returnCondition, returnNotes: returnNotes || undefined },
                  { onSuccess: () => setReturnDialogOpen(false) }
                );
              }}
            >
              {returnRentalMutation.isPending ? "Registrando..." : "Confirmar devolução"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ─── Contracts List ───────────────────────────────────────────────────────────
export default function Contracts() {
  const confirmDialog = useConfirm();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = usePageParam();
  const [view, setView] = useState<"ativos" | "arquivados" | "excluidos">("ativos");
  const [newContractOpen, setNewContractOpen] = useState(false);
  const limit = 20;

  // Deep-link: open contract from ?contractId=N
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("contractId");
    if (cid) {
      setSelectedId(Number(cid));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.contracts.list.useQuery(
    { limit, page, view: view as "ativos" | "arquivados" },
    { enabled: view !== "excluidos" }
  );

  const { data: deletedData, isLoading: deletedLoading } = trpc.contracts.listDeleted.useQuery(
    { page, limit },
    { enabled: view === "excluidos" }
  );

  const deleteMutation = trpc.contracts.delete.useMutation({
    onSuccess: () => {
      toast.success("Contrato excluído");
      utils.contracts.list.invalidate();
      utils.contracts.listDeleted.invalidate();
    },
    onError: (err) => toast.error(friendlyError(err)),
  });

  const restoreMutation = trpc.contracts.restore.useMutation({
    onSuccess: () => {
      toast.success("Contrato restaurado");
      utils.contracts.list.invalidate();
      utils.contracts.listDeleted.invalidate();
    },
    onError: (err) => toast.error(friendlyError(err)),
  });

  const activeItems = data?.items ?? [];
  const activeTotal = data?.total ?? 0;
  const activeTotalPages = data?.totalPages ?? 1;

  const deletedItems = deletedData?.items ?? [];
  const deletedTotal = deletedData?.total ?? 0;
  const deletedTotalPages = deletedData?.totalPages ?? 1;

  const items = view === "excluidos" ? deletedItems : activeItems;
  const total = view === "excluidos" ? deletedTotal : activeTotal;
  const totalPages = view === "excluidos" ? deletedTotalPages : activeTotalPages;
  const isLoadingCurrent = view === "excluidos" ? deletedLoading : isLoading;

  // Q13: corrige ?page fora do intervalo. Usa o totalPages CRU da query (undefined
  // durante o load) — nunca o default 1, senão o clamp resetaria a cada refetch.
  const loadedTotalPages = view === "excluidos" ? deletedData?.totalPages : data?.totalPages;
  useEffect(() => {
    if (loadedTotalPages && page > loadedTotalPages) setPage(loadedTotalPages);
  }, [loadedTotalPages, page, setPage]);

  // ─── Column definitions ──────────────────────────────────────────────────────
  type ContractRow = (typeof items)[number];

  const activeColumns = useMemo<ColumnDef<ContractRow, unknown>[]>(() => [
    {
      id: "id",
      header: "#",
      accessorKey: "id",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-xs">#{row.original.id}</span>
      ),
    },
    {
      id: "cliente",
      header: "Cliente",
      accessorFn: (r) => r.clientName ?? `Cliente #${r.clientId}`,
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as string}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      enableSorting: false,
      cell: ({ row }) => (
        <ContractStatusBadge status={row.original.status as ContractStatus} />
      ),
    },
    {
      id: "valorTotal",
      header: "Valor Total",
      accessorKey: "valorTotal",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.valorTotal ? `R$ ${Number(row.original.valorTotal).toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      id: "criadoEm",
      header: "Criado em",
      accessorKey: "criadoEm",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.criadoEm ? new Date(row.original.criadoEm).toLocaleDateString("pt-BR") : "—"}
        </span>
      ),
    },
    {
      id: "encerradoEm",
      header: "Encerrado em",
      accessorKey: "encerradoEm",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {(row.original as any).encerradoEm
            ? new Date((row.original as any).encerradoEm).toLocaleDateString("pt-BR")
            : "—"}
        </span>
      ),
    },
    {
      id: "acoes",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(c.id)}>
              Ver detalhes
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: `Excluir contrato de ${c.clientName ?? `#${c.clientId}`}?`,
                  description:
                    "Os aluguéis serão removidos das listas e as bicicletas liberadas para outras reservas. Dá para restaurar depois na aba Excluídos.",
                  confirmText: "Excluir",
                  destructive: true,
                });
                if (ok) deleteMutation.mutate({ id: c.id });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], [deleteMutation.isPending, confirmDialog]);

  const deletedColumns = useMemo<ColumnDef<ContractRow, unknown>[]>(() => [
    {
      id: "id",
      header: "#",
      accessorKey: "id",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-xs">#{row.original.id}</span>
      ),
    },
    {
      id: "cliente",
      header: "Cliente",
      accessorFn: (r) => r.clientName ?? `Cliente #${r.clientId}`,
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as string}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      enableSorting: false,
      cell: ({ row }) => (
        <ContractStatusBadge status={row.original.status as ContractStatus} />
      ),
    },
    {
      id: "valorTotal",
      header: "Valor Total",
      accessorKey: "valorTotal",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.valorTotal ? `R$ ${Number(row.original.valorTotal).toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      id: "criadoEm",
      header: "Criado em",
      accessorKey: "criadoEm",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.criadoEm ? new Date(row.original.criadoEm).toLocaleDateString("pt-BR") : "—"}
        </span>
      ),
    },
    {
      id: "deletedAt",
      header: "Excluído em",
      accessorKey: "deletedAt",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {(row.original as any).deletedAt
            ? new Date((row.original as any).deletedAt).toLocaleString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })
            : "—"}
        </span>
      ),
    },
    {
      id: "acoes",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            disabled={restoreMutation.isPending}
            onClick={async () => {
              const ok = await confirmDialog({
                title: `Restaurar contrato de ${c.clientName ?? `#${c.clientId}`}?`,
                description:
                  "O contrato e seus aluguéis voltam para as listas ativas; as unidades serão re-atribuídas quando disponíveis.",
                confirmText: "Restaurar",
                destructive: false,
              });
              if (ok) restoreMutation.mutate({ id: c.id });
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Restaurar
          </Button>
        );
      },
    },
  ], [restoreMutation.isPending, confirmDialog]);

  // ─── Tab options ─────────────────────────────────────────────────────────────
  const tabOptions = useMemo(() => [
    { value: "ativos", label: "Ativos", count: view === "ativos" ? activeTotal : undefined },
    { value: "arquivados", label: "Arquivados", count: view === "arquivados" ? activeTotal : undefined },
    { value: "excluidos", label: "Excluídos", count: view === "excluidos" ? deletedTotal : undefined },
  ], [view, activeTotal, deletedTotal]);

  if (selectedId !== null) {
    return (
      <div className="p-6">
        <ContractDetail contractId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Contratos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de contratos multi-bike
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setNewContractOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Contrato
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Abas Ativos / Arquivados / Excluídos — SegmentedTabs */}
      <SegmentedTabs
        value={view}
        onValueChange={(v) => { setView(v as typeof view); setPage(1); }}
        options={tabOptions}
      />

      {/* DataTable */}
      <DataTable
        columns={view === "excluidos" ? deletedColumns : activeColumns}
        data={items as ContractRow[]}
        loading={isLoadingCurrent}
        pagination={{ page, totalPages, onPageChange: setPage }}
        empty={
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <FileText className="h-10 w-10 opacity-30" />
            <p className="text-sm">
              {view === "excluidos" ? "Nenhum contrato excluído." : "Nenhum contrato encontrado."}
            </p>
            {view !== "excluidos" && (
              <p className="text-xs">Contratos são criados ao vincular múltiplos aluguéis a um cliente.</p>
            )}
          </div>
        }
      />

      <NewContractModal open={newContractOpen} onClose={() => setNewContractOpen(false)} />
    </div>
  );
}
