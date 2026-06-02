import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Archive,
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
import { Button } from "@/components/ui/button";
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

// ─── Types ────────────────────────────────────────────────────────────────────
type ContractStatus = "pendente" | "ativo" | "parcialmente_devolvido" | "encerrado" | "cancelado";
type AccessoryReturnStatus = "ok" | "danificado" | "perdido" | "roubado";

const contractStatusConfig: Record<
  ContractStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; cls: string }
> = {
  pendente: { label: "Pendente", variant: "secondary", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  ativo: { label: "Ativo", variant: "default", cls: "bg-green-100 text-green-800 border-green-200" },
  parcialmente_devolvido: {
    label: "Parcialmente Devolvido",
    variant: "secondary",
    cls: "bg-amber-100 text-amber-800 border-amber-200",
  },
  encerrado: { label: "Encerrado", variant: "outline", cls: "bg-gray-100 text-gray-600 border-gray-200" },
  cancelado: { label: "Cancelado", variant: "destructive", cls: "bg-red-100 text-red-800 border-red-200" },
};

const accessoryStatusConfig: Record<
  AccessoryReturnStatus,
  { label: string; icon: React.ReactNode; cls: string }
> = {
  ok: { label: "OK", icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, cls: "text-green-700" },
  danificado: {
    label: "Danificado",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    cls: "text-amber-700",
  },
  perdido: { label: "Perdido", icon: <XCircle className="h-4 w-4 text-red-500" />, cls: "text-red-700" },
  roubado: { label: "Roubado", icon: <XCircle className="h-4 w-4 text-red-700" />, cls: "text-red-800" },
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
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── New Contract Modal ─────────────────────────────────────────────────────
type BikeEntry = {
  bikeId: number;
  bikeModel: string;
  bikeBrand: string;
  bikeSizeId: number | null;
  tamanho: string;
  startDate: string;
  endDate: string;
  quantity: number;
  dailyRate: string;
  numDays: number;
  totalAmount: string;
};

type AccessoryEntry = {
  accessoryId: number;
  name: string;
  qty: number;
  obrigatorio: boolean;
  variante?: string;
  unitId?: number;
};

function VerifiedClientAutocomplete({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string, name: string, status: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = trpc.clients.list.useQuery(
    { search: inputValue, limit: 10, page: 1 },
    { enabled: open || inputValue.length > 0 }
  );
  const clients = data?.items ?? [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(id: number, name: string, status: string) {
    onChange(String(id), name, status);
    setSelectedName(name);
    setInputValue("");
    setOpen(false);
  }

  function handleClear() {
    setInputValue(""); setSelectedName(""); onChange("", "", ""); setOpen(false);
  }

  const displayValue = selectedName || inputValue;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Digite o nome ou CPF do cliente..."
          value={displayValue}
          onChange={(e) => { setInputValue(e.target.value); setSelectedName(""); onChange("", "", ""); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-8 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#C8920A] focus:border-[#C8920A]"
        />
        {displayValue && (
          <button type="button" onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && (inputValue.length > 0 || clients.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {clients.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">{inputValue ? "Nenhum cliente encontrado" : "Digite para buscar..."}</div>
          ) : (
            clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c.id, c.name, c.status)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                    {c.status !== "verified" && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">Não verificado</span>
                    )}
                    {c.status === "verified" && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800 border border-green-200">Verificado</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.cpf && `CPF: ${c.cpf}`}{c.cpf && c.phone && " · "}{c.phone && c.phone}
                  </div>
                </div>
                {value === String(c.id) && <Check className="w-4 h-4 text-[#C8920A] shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function NewContractModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [step, setStep] = useState(1);
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientStatus, setClientStatus] = useState("");
  const [bikeEntries, setBikeEntries] = useState<BikeEntry[]>([]);
  const [accessories, setAccessories] = useState<AccessoryEntry[]>([]);
  const [notes, setNotes] = useState("");

  // Bike selection state
  const [selBikeId, setSelBikeId] = useState("");
  const [selBikeSizeId, setSelBikeSizeId] = useState("");
  const [selStartDate, setSelStartDate] = useState("");
  const [selEndDate, setSelEndDate] = useState("");
  const [selQty, setSelQty] = useState(1);

  const { data: bikesData } = trpc.bikes.list.useQuery(
    { status: "available", page: 1, limit: 100 },
    { enabled: open && step === 2 }
  );
  const bikes = bikesData?.data ?? [];

  const { data: sizesData } = trpc.bikes.listSizes.useQuery(
    { bikeId: Number(selBikeId) },
    { enabled: !!selBikeId && step === 2 }
  );
  const sizes = sizesData ?? [];

  const { data: accData } = trpc.accessories.list.useQuery(
    { page: 1, limit: 100 },
    { enabled: open && step === 3 }
  );
  const accList = accData?.data ?? [];

  // Fetch units for accessories selected in step 3 (to show variante dropdown)
  const [expandedAccId, setExpandedAccId] = useState<number | null>(null);
  const { data: accUnitsData } = trpc.accessories.getUnits.useQuery(
    { accessoryId: expandedAccId! },
    { enabled: !!expandedAccId && step === 3 }
  );
  const accUnits = accUnitsData ?? [];
  const availableUnits = accUnits.filter((u) => u.status === "disponivel");

  // Initialize mandatory accessories when step 3 opens
  useEffect(() => {
    if (step === 3 && accList.length > 0) {
      setAccessories((prev) => {
        const mandatory = accList.filter((a) => (a as any).obrigatorio);
        const existing = new Set(prev.map((p) => p.accessoryId));
        const toAdd = mandatory
          .filter((a) => !existing.has(a.id))
          .map((a) => ({ accessoryId: a.id, name: a.name, qty: 1, obrigatorio: true }));
        return [...prev, ...toAdd];
      });
    }
  }, [step, accList.length]);

  const selectedBike = bikes.find((b) => b.id === Number(selBikeId));

  function calcTotal(entry: Omit<BikeEntry, "totalAmount" | "numDays">): { numDays: number; totalAmount: string } {
    if (!entry.startDate || !entry.endDate) return { numDays: 0, totalAmount: "0.00" };
    const start = new Date(entry.startDate);
    const end = new Date(entry.endDate);
    const numDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const rate = parseFloat(entry.dailyRate || "0");
    return { numDays, totalAmount: (rate * numDays * entry.quantity).toFixed(2) };
  }

  function handleAddBike() {
    if (!selBikeId || !selStartDate || !selEndDate) {
      toast.error("Selecione a bike, data de início e data de devolução.");
      return;
    }
    const bike = bikes.find((b) => b.id === Number(selBikeId));
    const size = sizes.find((s) => s.id === Number(selBikeSizeId));
    if (size && size.quantidadeDisponivel < selQty) {
      toast.error(`Disponível: ${size.quantidadeDisponivel} unidade(s) deste tamanho.`);
      return;
    }
    const entry: Omit<BikeEntry, "totalAmount" | "numDays"> = {
      bikeId: Number(selBikeId),
      bikeModel: bike?.model ?? "",
      bikeBrand: bike?.brand ?? "",
      bikeSizeId: selBikeSizeId ? Number(selBikeSizeId) : null,
      tamanho: size?.tamanho ?? "",
      startDate: selStartDate,
      endDate: selEndDate,
      quantity: selQty,
      dailyRate: bike?.dailyRate ?? "0",
    };
    const { numDays, totalAmount } = calcTotal(entry);
    setBikeEntries((prev) => [...prev, { ...entry, numDays, totalAmount }]);
    setSelBikeId(""); setSelBikeSizeId(""); setSelStartDate(""); setSelEndDate(""); setSelQty(1);
  }

  function handleRemoveBike(idx: number) {
    setBikeEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleAccessory(acc: typeof accList[0]) {
    setAccessories((prev) => {
      const exists = prev.find((a) => a.accessoryId === acc.id);
      if (exists) {
        if (exists.obrigatorio) return prev; // can't remove mandatory
        return prev.filter((a) => a.accessoryId !== acc.id);
      }
      return [...prev, { accessoryId: acc.id, name: acc.name, qty: 1, obrigatorio: false }];
    });
    // Expand to show variante options
    setExpandedAccId((prev) => prev === acc.id ? null : acc.id);
  }

  function setAccessoryVariant(accessoryId: number, unitId: number, variante: string | null) {
    setAccessories((prev) => prev.map((a) =>
      a.accessoryId === accessoryId ? { ...a, unitId, variante: variante ?? undefined } : a
    ));
  }

  const grandTotal = bikeEntries.reduce((s, b) => s + parseFloat(b.totalAmount), 0);

  const createMutation = trpc.contracts.createManual.useMutation({
    onSuccess: (res) => {
      toast.success(`Contrato #${res.id} criado com sucesso!`);
      utils.contracts.list.invalidate();
      handleReset();
      onClose();
    },
    onError: (e) => toast.error("Erro ao criar contrato: " + e.message),
  });

  function handleReset() {
    setStep(1); setClientId(""); setClientName(""); setClientStatus("");
    setBikeEntries([]); setAccessories([]); setNotes("");
    setSelBikeId(""); setSelBikeSizeId(""); setSelStartDate(""); setSelEndDate(""); setSelQty(1);
  }

  function handleSubmit() {
    if (!clientId) { toast.error("Selecione um cliente."); return; }
    if (bikeEntries.length === 0) { toast.error("Adicione pelo menos uma bike."); return; }
    createMutation.mutate({
      clientId: Number(clientId),
      bikes: bikeEntries.map((b) => ({
        bikeId: b.bikeId,
        bikeSizeId: b.bikeSizeId,
        startDate: b.startDate,
        endDate: b.endDate,
        quantity: b.quantity,
        dailyRate: b.dailyRate,
        totalAmount: b.totalAmount,
      })),
      accessories: accessories.map((a) => ({ accessoryId: a.accessoryId, qty: a.qty, variante: a.variante, unitId: a.unitId })),
      notes: notes || undefined,
    });
  }

  const stepLabels = ["Cliente", "Bikes", "Acessórios", "Resumo"];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { handleReset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Novo Contrato Manual
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-4">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {step > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs truncate ${step === i + 1 ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
              {i < stepLabels.length - 1 && <div className={`h-px flex-1 mx-1 ${step > i + 1 ? "bg-green-500" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Select client */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Buscar cliente</Label>
              <VerifiedClientAutocomplete
                value={clientId}
                onChange={(id, name, status) => { setClientId(id); setClientName(name); setClientStatus(status); }}
              />
            </div>
            {clientId && clientStatus !== "verified" && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Este cliente ainda não foi verificado. Apenas clientes verificados podem ter contratos criados manualmente.
              </div>
            )}
            {clientId && clientStatus === "verified" && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span><strong>{clientName}</strong> selecionado(a).</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Add bikes */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs">Bicicleta</Label>
                <Select value={selBikeId} onValueChange={(v) => { setSelBikeId(v); setSelBikeSizeId(""); }}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Selecionar bike" /></SelectTrigger>
                  <SelectContent>
                    {bikes.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.model}{b.brand ? ` — ${b.brand}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Tamanho</Label>
                <Select value={selBikeSizeId} onValueChange={setSelBikeSizeId} disabled={!selBikeId || sizes.length === 0}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder={sizes.length === 0 ? "Sem tamanhos" : "Selecionar"} /></SelectTrigger>
                  <SelectContent>
                    {sizes.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.tamanho} — {s.quantidadeDisponivel} disp.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Data início</Label>
                <Input type="date" value={selStartDate} onChange={(e) => setSelStartDate(e.target.value)} className="text-sm" />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Data devolução</Label>
                <Input type="date" value={selEndDate} onChange={(e) => setSelEndDate(e.target.value)} min={selStartDate} className="text-sm" />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Quantidade</Label>
                <Input type="number" min={1} max={10} value={selQty} onChange={(e) => setSelQty(Number(e.target.value))} className="text-sm" />
              </div>
              {selectedBike && (
                <div className="flex items-end">
                  <p className="text-xs text-muted-foreground">R$ {selectedBike.dailyRate ?? "—"}/dia</p>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleAddBike} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Adicionar bike ao contrato
            </Button>

            {bikeEntries.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bikes adicionadas</p>
                {bikeEntries.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-md bg-muted/50 border">
                    <div className="text-sm">
                      <span className="font-medium">{b.bikeModel}</span>
                      {b.tamanho && <span className="text-muted-foreground"> · {b.tamanho}</span>}
                      <span className="text-muted-foreground"> · {b.numDays}d · {b.quantity}x</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">R$ {b.totalAmount}</span>
                      <button type="button" onClick={() => handleRemoveBike(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Accessories */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Acessórios obrigatórios já estão incluídos automaticamente. Adicione opcionais se necessário.</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {accList.map((acc) => {
                const selected = accessories.find((a) => a.accessoryId === acc.id);
                const isMandatory = (acc as any).obrigatorio;
                const isExpanded = expandedAccId === acc.id;
                const hasVariants = isExpanded && availableUnits.some((u) => u.variante);
                return (
                  <div key={acc.id} className="border rounded-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleAccessory(acc)}
                      disabled={isMandatory}
                      className={`w-full flex items-center gap-2 p-2.5 text-left text-sm transition-colors ${
                        selected ? "bg-primary/5" : "hover:bg-muted/50"
                      } ${isMandatory ? "cursor-default" : ""}`}
                    >
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{acc.name}</div>
                        {isMandatory && <div className="text-xs text-amber-600">Obrigatório</div>}
                        {selected?.variante && <div className="text-xs text-muted-foreground">Variante: {selected.variante}</div>}
                      </div>
                      {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </button>
                    {/* Variante dropdown + qty when selected and expanded */}
                    {selected && isExpanded && (
                      <div className="px-3 pb-3 pt-1 bg-muted/30 border-t flex flex-wrap gap-3 items-end">
                        {hasVariants && (
                          <div className="flex-1 min-w-[140px]">
                            <Label className="text-xs mb-1 block">Variante</Label>
                            <Select
                              value={selected.unitId ? String(selected.unitId) : ""}
                              onValueChange={(v) => {
                                const unit = availableUnits.find((u) => String(u.id) === v);
                                if (unit) setAccessoryVariant(acc.id, unit.id, unit.variante ?? null);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                              <SelectContent>
                                {availableUnits.filter((u) => u.variante).map((u) => (
                                  <SelectItem key={u.id} value={String(u.id)}>{u.variante}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="w-20">
                          <Label className="text-xs mb-1 block">Qtd.</Label>
                          <Input
                            type="number" min={1} max={10}
                            value={selected.qty}
                            onChange={(e) => setAccessories((prev) => prev.map((a) =>
                              a.accessoryId === acc.id ? { ...a, qty: Number(e.target.value) } : a
                            ))}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {accList.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">Nenhum acessório cadastrado.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-muted/50 border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cliente</p>
              <p className="font-medium">{clientName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Bikes</p>
              {bikeEntries.map((b, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span>{b.bikeModel}{b.tamanho ? ` (${b.tamanho})` : ""} · {b.numDays}d · {b.quantity}x</span>
                  <span className="font-medium">R$ {b.totalAmount}</span>
                </div>
              ))}
            </div>
            {accessories.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Acessórios</p>
                {accessories.map((a) => (
                  <div key={a.accessoryId} className="flex justify-between text-sm py-1 border-b last:border-0">
                    <span>{a.name} × {a.qty}{a.obrigatorio && <span className="ml-1 text-xs text-amber-600">(obrig.)</span>}</span>
                    <span className="text-muted-foreground">gratuito</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">R$ {grandTotal.toFixed(2)}</span>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Observações (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações internas..." rows={2} className="text-sm" />
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between gap-2 pt-2">
          <div>
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                ← Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { handleReset(); onClose(); }}>Cancelar</Button>
            {step < 4 ? (
              <Button
                size="sm"
                onClick={() => {
                  if (step === 1 && (!clientId || clientStatus !== "verified")) {
                    toast.error("Selecione um cliente verificado."); return;
                  }
                  if (step === 2 && bikeEntries.length === 0) {
                    toast.error("Adicione pelo menos uma bike."); return;
                  }
                  setStep((s) => s + 1);
                }}
              >
                Próximo →
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Criar Contrato
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      toast.success("Foto enviada!");
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
      toast.success("Contrato encerrado com sucesso!");
      utils.contracts.list.invalidate();
      utils.contracts.getById.invalidate({ id: contractId });
      onClose();
    },
    onError: (e) => toast.error("Erro ao encerrar contrato: " + e.message),
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Encerrar Contrato #{contractId}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        rental.status === "returned"
                          ? "bg-green-100 text-green-700"
                          : rental.status === "active"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
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
                                className="text-xs text-blue-600 underline truncate max-w-[180px]"
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
            className="bg-green-600 hover:bg-green-700 text-white"
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

// ─── Contract Detail Panel ────────────────────────────────────────────────────
function ContractDetail({
  contractId,
  onBack,
}: {
  contractId: number;
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.contracts.getById.useQuery({ id: contractId });
  const [closeOpen, setCloseOpen] = useState(false);

  const archiveMutation = trpc.contracts.archive.useMutation({
    onSuccess: () => {
      toast.success("Contrato arquivado.");
      utils.contracts.list.invalidate();
      onBack();
    },
    onError: (e) => toast.error("Erro ao arquivar: " + e.message),
  });

  const recalcMutation = trpc.contracts.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status recalculado.");
      utils.contracts.getById.invalidate({ id: contractId });
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const confirmAllMutation = trpc.rentals.confirmAll.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.confirmed} aluguéis confirmados!`);
      utils.contracts.getById.invalidate({ id: contractId });
      utils.contracts.list.invalidate();
    },
    onError: (e) => toast.error("Erro ao confirmar: " + e.message),
  });

  const rejectAllMutation = trpc.rentals.rejectAll.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.rejected} aluguéis recusados.`);
      utils.contracts.getById.invalidate({ id: contractId });
      utils.contracts.list.invalidate();
    },
    onError: (e) => toast.error("Erro ao recusar: " + e.message),
  });

  const confirmPaymentMutation = trpc.contracts.confirmPayment.useMutation({
    onSuccess: (res) => {
      toast.success(`Pagamento confirmado para ${res.paid} aluguel(is). Receita registrada.`);
      utils.contracts.getById.invalidate({ id: contractId });
      utils.contracts.list.invalidate();
    },
    onError: (e) => toast.error("Erro ao confirmar pagamento: " + e.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
      {/* Header */}
      <div className="flex items-center justify-between">
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
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
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
                onClick={() => {
                  if (confirm("Tem certeza que deseja recusar esta reserva? Todos os aluguéis pendentes serão cancelados."))
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
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setCloseOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Encerrar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => archiveMutation.mutate({ id: contractId })}
            disabled={archiveMutation.isPending}
          >
            <Archive className="h-4 w-4 mr-1" /> Arquivar
          </Button>
        </div>
      </div>

      {/* Payment confirmation button (presential) */}
      {data.rentals?.some((r: any) => r.paymentStatus === "pending" || !r.paymentStatus) && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-300 flex-1">
            Pagamento presencial pendente
          </span>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => {
              if (confirm("Confirmar recebimento do pagamento presencial? A receita será registrada automaticamente."))
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
        {data.pdfUrl ? (
          <a
            href={data.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              Baixar Contrato PDF
            </Button>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground italic">PDF não gerado</span>
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
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        r.status === "returned"
                          ? "bg-green-100 text-green-700"
                          : r.status === "active"
                          ? "bg-blue-100 text-blue-700"
                          : r.status === "overdue"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {rentalStatusLabels[r.status] ?? r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.returnCondition ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {(!data.rentals || data.rentals.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
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
    </div>
  );
}

// ─── Contracts List ───────────────────────────────────────────────────────────
export default function Contracts() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [newContractOpen, setNewContractOpen] = useState(false);
  const limit = 20;

  // Deep-link: open contract from ?contractId=N
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("contractId");
    if (cid) {
      setSelectedId(Number(cid));
      // Clean URL without reload
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data, isLoading, refetch } = trpc.contracts.list.useQuery({
    limit,
    page,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

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
          <h1 className="text-2xl font-bold flex items-center gap-2">
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
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Encerrado em</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <FileText className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Nenhum contrato encontrado.</p>
                    <p className="text-xs">
                      Contratos são criados ao vincular múltiplos aluguéis a um cliente.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedId(c.id)}
                >
                  <TableCell className="font-mono text-muted-foreground text-xs">#{c.id}</TableCell>
                  <TableCell className="font-medium">
                    {c.clientName ?? `Cliente #${c.clientId}`}
                  </TableCell>
                  <TableCell>
                    <ContractStatusBadge status={c.status as ContractStatus} />
                  </TableCell>
                  <TableCell>
                    {c.valorTotal ? `R$ ${Number(c.valorTotal).toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.criadoEm ? new Date(c.criadoEm).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.encerradoEm ? new Date(c.encerradoEm).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(c.id);
                      }}
                    >
                      Ver detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewContractModal open={newContractOpen} onClose={() => setNewContractOpen(false)} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages} — {total} contrato{total !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
