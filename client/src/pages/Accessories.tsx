import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { friendlyError } from "@/lib/utils";
import {
  Plus,
  Search,
  Package,
  Edit,
  Trash2,
  Tag,
  Hash,
  Layers,
  CheckCircle2,
  XCircle,
  List,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Wrench,
  Check,
} from "lucide-react";

type AccessoryStatus = "available" | "rented" | "maintenance" | "lost";
type UnitStatus = "disponivel" | "alugado" | "perdido" | "manutencao" | "roubado";

const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  disponivel: "Disponível",
  alugado: "Alugado",
  perdido: "Perdido",
  manutencao: "Manutenção",
  roubado: "Roubado",
};

const UNIT_STATUS_COLORS: Record<UnitStatus, string> = {
  disponivel: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  alugado: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  perdido: "bg-red-500/20 text-red-600 border-red-500/30",
  manutencao: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  roubado: "bg-red-700/20 text-red-700 border-red-700/30",
};

// ─── Accessory Units Panel (ACC-2: grouped by variante) ────────────────────────
function AccessoryUnitsPanel({ accessoryId, onClose }: { accessoryId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: units = [], isLoading } = trpc.accessories.getUnits.useQuery({ accessoryId });

  // Expanded state per variante key
  const [expandedVariantes, setExpandedVariantes] = useState<Set<string>>(new Set());
  // Edit state for individual exception units
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<UnitStatus>("disponivel");
  const [editObs, setEditObs] = useState("");
  const [editVariante, setEditVariante] = useState("");
  // Delete confirm
  const [deleteUnitId, setDeleteUnitId] = useState<number | null>(null);
  // Add variante form
  const [showAddVariante, setShowAddVariante] = useState(false);
  const [newVarianteName, setNewVarianteName] = useState("");
  const [newVarianteQty, setNewVarianteQty] = useState(1);
  // Draft qty per variante key (for inline editable input)
  const [draftQty, setDraftQty] = useState<Record<string, string>>({});
  // Manutenção mini-form state per variante key
  const [manutKey, setManutKey] = useState<string | null>(null);
  const [manutQty, setManutQty] = useState(1);
  const [manutObs, setManutObs] = useState("");

  const invalidate = () => {
    utils.accessories.getUnits.invalidate();
    utils.accessories.list.invalidate();
  };

  const updateMut = trpc.accessories.updateUnitStatus.useMutation({
    onSuccess: () => { invalidate(); setEditingUnitId(null); toast.success("Unidade atualizada!"); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const addUnitsMut = trpc.accessories.addUnits.useMutation({
    onSuccess: (r) => { invalidate(); toast.success(`${r.inserted} unidade(s) adicionada(s)!`); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const removeAvailableMut = trpc.accessories.removeAvailableUnit.useMutation({
    onSuccess: () => { invalidate(); toast.success("Unidade removida."); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const deleteMut = trpc.accessories.deleteUnit.useMutation({
    onSuccess: () => { invalidate(); setDeleteUnitId(null); toast.success("Unidade excluída."); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  function startEdit(unit: any) {
    setEditingUnitId(unit.id);
    setEditStatus(unit.status as UnitStatus);
    setEditObs(unit.observacao ?? "");
    setEditVariante(unit.variante ?? "");
  }

  function toggleVariante(key: string) {
    setExpandedVariantes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Group units by variante (null → "__null__")
  const unitList = units as any[];
  const grouped = new Map<string, any[]>();
  for (const u of unitList) {
    const key = u.variante ?? "__null__";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(u);
  }
  // Sort: named variantes first alphabetically, then null
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    if (a === "__null__") return 1;
    if (b === "__null__") return -1;
    return a.localeCompare(b);
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto dialog-mobile">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <List className="w-4 h-4 text-primary" />
            Unidades do Acessório
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : unitList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma unidade cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {sortedKeys.map((key) => {
              const varianteUnits = grouped.get(key)!;
              const varianteName = key === "__null__" ? "Padrão" : key;
              const isExpanded = expandedVariantes.has(key);

              // Breakdown counts
              const counts = varianteUnits.reduce((acc: Record<string, number>, u: any) => {
                acc[u.status] = (acc[u.status] ?? 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const total = varianteUnits.length;
              const disponivel = counts["disponivel"] ?? 0;

              // Exception units (non-disponivel)
              const exceptionUnits = varianteUnits.filter((u: any) => u.status !== "disponivel");

              return (
                <div key={key} className="border border-border rounded-lg overflow-hidden">
                  {/* Collapsed row */}
                  <div className="flex items-center gap-2 p-3">
                    <button
                      className="flex-1 flex items-center gap-2 text-left"
                      onClick={() => toggleVariante(key)}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-sm font-medium">{varianteName}</span>
                      {/* Color-coded breakdown */}
                      <span className="flex flex-wrap gap-1 ml-1">
                        {disponivel > 0 && <span className="text-[11px] text-emerald-500 font-medium">{disponivel} disp</span>}
                        {(counts["alugado"] ?? 0) > 0 && <span className="text-[11px] text-blue-500 font-medium">{counts["alugado"]} alug</span>}
                        {(counts["manutencao"] ?? 0) > 0 && <span className="text-[11px] text-amber-500 font-medium">{counts["manutencao"]} manut</span>}
                        {(counts["perdido"] ?? 0) > 0 && <span className="text-[11px] text-red-500 font-medium">{counts["perdido"]} perd</span>}
                        {(counts["roubado"] ?? 0) > 0 && <span className="text-[11px] text-red-700 font-medium">{counts["roubado"]} roub</span>}
                      </span>
                    </button>
                    {/* Stepper */}
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 text-base font-bold"
                        onClick={() => removeAvailableMut.mutate({ accessoryId, variante: key === "__null__" ? undefined : key, quantity: 1 })}
                        disabled={removeAvailableMut.isPending || disponivel === 0}
                        title="Remover 1 unidade disponível"
                      >
                        −
                      </Button>
                      <input
                        type="number"
                        min={total - disponivel}
                        className="text-sm font-semibold w-10 text-center border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary px-1 py-0.5"
                        value={draftQty[key] ?? String(total)}
                        onChange={(e) => setDraftQty(prev => ({ ...prev, [key]: e.target.value }))}
                        onFocus={() => setDraftQty(prev => ({ ...prev, [key]: String(total) }))}
                        onBlur={() => {
                          const raw = parseInt(draftQty[key] ?? "", 10);
                          const minQty = total - disponivel; // can't remove non-disponivel units
                          if (isNaN(raw) || raw === total) {
                            setDraftQty(prev => { const n = { ...prev }; delete n[key]; return n; });
                            return;
                          }
                          if (raw < minQty) {
                            toast.error(`Mínimo é ${minQty} (unidades não disponíveis não podem ser removidas).`);
                            setDraftQty(prev => { const n = { ...prev }; delete n[key]; return n; });
                            return;
                          }
                          const delta = raw - total;
                          const varianteArg = key === "__null__" ? undefined : key;
                          if (delta > 0) {
                            addUnitsMut.mutate({ accessoryId, variante: varianteArg, quantity: delta });
                          } else if (delta < 0) {
                            removeAvailableMut.mutate({ accessoryId, variante: varianteArg, quantity: Math.abs(delta) });
                          }
                          setDraftQty(prev => { const n = { ...prev }; delete n[key]; return n; });
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 text-base font-bold"
                        onClick={() => addUnitsMut.mutate({ accessoryId, variante: key === "__null__" ? undefined : key, quantity: 1 })}
                        disabled={addUnitsMut.isPending}
                        title="Adicionar 1 unidade"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {/* Manutenção mini-form */}
                  {manutKey === key ? (
                    <div className="border-t border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                      <p className="text-xs font-medium text-amber-600">Enviar para manutenção</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Qtd</Label>
                          <Input
                            type="number"
                            min={1}
                            max={disponivel}
                            value={manutQty}
                            onChange={(e) => setManutQty(Math.min(disponivel, Math.max(1, parseInt(e.target.value) || 1)))}
                            className="h-8 text-sm bg-background"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Observação (opcional)</Label>
                          <Textarea
                            value={manutObs}
                            onChange={(e) => setManutObs(e.target.value)}
                            placeholder="Motivo / descrição do reparo..."
                            className="text-xs min-h-[32px] resize-none h-8 py-1"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                          disabled={updateMut.isPending || disponivel === 0}
                          onClick={() => {
                            const dispUnits = varianteUnits.filter((u: any) => u.status === "disponivel");
                            const toSend = dispUnits.slice(0, manutQty);
                            toSend.forEach((u: any) => {
                              updateMut.mutate({
                                unitId: u.id,
                                status: "manutencao",
                                observacao: manutObs || undefined,
                                variante: u.variante ?? undefined,
                              });
                            });
                            // toast after all mutations dispatched
                            setTimeout(() => {
                              toast.success(`${toSend.length} unidade(s) enviada(s) para manutenção.`);
                            }, 100);
                            setManutKey(null);
                            setManutQty(1);
                            setManutObs("");
                          }}
                        >
                          Confirmar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setManutKey(null); setManutQty(1); setManutObs(""); }}>Cancelar</Button>
                      </div>
                    </div>
                  ) : disponivel > 0 ? (
                    <div className="border-t border-border px-3 py-1.5">
                      <button
                        className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-500 font-medium"
                        onClick={() => { setManutKey(key); setManutQty(1); setManutObs(""); }}
                      >
                        <Wrench className="w-3 h-3" />
                        Enviar pra manutenção
                      </button>
                    </div>
                  ) : null}

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border bg-secondary/10 p-3 space-y-2">
                      {/* Summary of disponivel units */}
                      {disponivel > 0 && (
                        <p className="text-xs text-muted-foreground">{disponivel} unidade{disponivel !== 1 ? "s" : ""} no estoque</p>
                      )}
                      {/* Exception units individually */}
                      {exceptionUnits.map((unit: any) => (
                        <div key={unit.id} className="border border-border rounded-md overflow-hidden bg-card">
                          <div className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {unit.serialNumber && (
                                <span className="text-xs font-mono text-muted-foreground">{unit.serialNumber}</span>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-xs border ${UNIT_STATUS_COLORS[unit.status as UnitStatus]}`}
                              >
                                {UNIT_STATUS_LABELS[unit.status as UnitStatus] ?? unit.status}
                              </Badge>
                              {unit.observacao && (
                                <span className="text-xs text-muted-foreground italic">{unit.observacao}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {unit.status === "manutencao" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs gap-1 text-emerald-600 hover:text-emerald-500"
                                  title="Resolver — voltar para disponível"
                                  disabled={updateMut.isPending}
                                  onClick={() => updateMut.mutate({ unitId: unit.id, status: "disponivel", observacao: "", variante: unit.variante ?? undefined })}
                                >
                                  <Check className="w-3 h-3" />Resolver
                                </Button>
                              )}
                              {unit.status !== "alugado" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs gap-1"
                                  onClick={() => editingUnitId === unit.id ? setEditingUnitId(null) : startEdit(unit)}
                                >
                                  <Edit className="w-3 h-3" />
                                  {editingUnitId === unit.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </Button>
                              )}
                              {unit.status !== "alugado" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteUnitId(unit.id)}
                                  title="Excluir unidade"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {editingUnitId === unit.id && (
                            <div className="p-3 pt-0 border-t border-border bg-secondary/20 space-y-2">
                              <div>
                                <Label className="text-xs">Novo status</Label>
                                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as UnitStatus)}>
                                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(UNIT_STATUS_LABELS) as UnitStatus[]).filter(s => s !== "alugado").map((s) => (
                                      <SelectItem key={s} value={s}>{UNIT_STATUS_LABELS[s]}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Observação</Label>
                                <Textarea
                                  value={editObs}
                                  onChange={(e) => setEditObs(e.target.value)}
                                  placeholder="Observação opcional..."
                                  className="text-sm min-h-[50px] resize-none"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1 bg-[#C8920A] hover:bg-[#A87608] text-white"
                                  onClick={() => updateMut.mutate({
                                    unitId: unit.id,
                                    status: editStatus,
                                    observacao: editObs || undefined,
                                    variante: editVariante || undefined,
                                  })}
                                  disabled={updateMut.isPending}
                                >
                                  Salvar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingUnitId(null)}>Cancelar</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {exceptionUnits.length === 0 && disponivel === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhuma unidade nesta variante.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add variante form */}
        <div className="border-t border-border pt-3 mt-2">
          {showAddVariante ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Nome da variante</Label>
                  <Input
                    value={newVarianteName}
                    onChange={(e) => setNewVarianteName(e.target.value)}
                    placeholder="Ex: Cinza, M, G..."
                    className="h-8 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={newVarianteQty}
                    onChange={(e) => setNewVarianteQty(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    className="h-8 text-sm mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-[#C8920A] hover:bg-[#A87608] text-white"
                  onClick={() => {
                    addUnitsMut.mutate(
                      { accessoryId, variante: newVarianteName.trim() || undefined, quantity: newVarianteQty },
                      { onSuccess: () => { setShowAddVariante(false); setNewVarianteName(""); setNewVarianteQty(1); } }
                    );
                  }}
                  disabled={addUnitsMut.isPending}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />Adicionar variante
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddVariante(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowAddVariante(true)} className="w-full gap-1">
              <Plus className="w-3.5 h-3.5" />Adicionar variante
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Delete unit confirm */}
      <Dialog open={!!deleteUnitId} onOpenChange={() => setDeleteUnitId(null)}>
        <DialogContent className="bg-card border-border max-w-sm dialog-mobile">
          <DialogHeader>
            <DialogTitle>Excluir Unidade</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUnitId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteUnitId && deleteMut.mutate({ unitId: deleteUnitId })}
              disabled={deleteMut.isPending}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

const STATUS_LABELS: Record<AccessoryStatus, string> = {
  available: "Disponível",
  rented: "Alugado",
  maintenance: "Manutenção",
  lost: "Perdido",
};

const STATUS_COLORS: Record<AccessoryStatus, string> = {
  available: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rented: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  maintenance: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  lost: "bg-red-500/20 text-red-400 border-red-500/30",
};

const CATEGORIES = [
  "segurança",
  "conforto",
  "transporte",
  "navegação",
  "Capacete",
  "Cadeado",
  "Cesta",
  "Suporte de celular",
  "Bomba de ar",
  "Lanterna",
  "Refletor",
  "Bolsa",
  "Garrafa",
  "Outro",
];

type AccessoryForm = {
  name: string;
  description: string;
  category: string;
  serialNumber: string;
  replacementValue: string;
  status: AccessoryStatus;
  obrigatorio: boolean;
  notes: string;
};

const emptyForm: AccessoryForm = {
  name: "",
  description: "",
  category: "",
  serialNumber: "",
  replacementValue: "",
  status: "available",
  obrigatorio: false,
  notes: "",
};

export default function Accessories() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AccessoryForm>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [unitsAccessoryId, setUnitsAccessoryId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data: accessoriesResult, isLoading } = trpc.accessories.list.useQuery({
    search: search || undefined,
    page,
    limit: LIMIT,
  });
  const allItems: any[] = accessoriesResult?.data ?? [];
  const totalAccessories = accessoriesResult?.total ?? 0;
  const totalPages = accessoriesResult?.totalPages ?? 1;

  // Categorias únicas derivadas da lista atual
  const uniqueCategories = Array.from(
    new Set(allItems.map((i: any) => i.category).filter(Boolean))
  ) as string[];

  const createMutation = trpc.accessories.create.useMutation({
    onSuccess: () => {
      utils.accessories.list.invalidate();
      toast.success("Acessório cadastrado com sucesso!");
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const updateMutation = trpc.accessories.update.useMutation({
    onSuccess: () => {
      utils.accessories.list.invalidate();
      toast.success("Acessório atualizado!");
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const deleteMutation = trpc.accessories.delete.useMutation({
    onSuccess: () => {
      utils.accessories.list.invalidate();
      toast.success("Acessório removido.");
      setDeleteConfirmId(null);
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: any) {
    setEditingId(item.id);
    setForm({
      name: item.name ?? "",
      description: item.description ?? "",
      category: item.category ?? "",
      serialNumber: item.serialNumber ?? "",
      replacementValue: item.replacementValue ?? "",
      status: item.status ?? "available",
      obrigatorio: item.obrigatorio ?? false,
      notes: item.notes ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("O nome do acessório é obrigatório.");
      return;
    }
    const payload = {
      name: form.name,
      description: form.description || undefined,
      category: form.category || undefined,
      serialNumber: form.serialNumber || undefined,
      replacementValue: form.replacementValue || undefined,
      obrigatorio: form.obrigatorio,
      notes: form.notes || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const items: any[] = categoryFilter === "all"
    ? allItems
    : allItems.filter((i: any) => i.category === categoryFilter);


  return (
    <>
    <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Acessórios</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Gerencie capacetes, cadeados e demais equipamentos
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[#C8920A] hover:bg-[#A87608] text-white gap-1.5 h-9 text-xs md:text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Acessório</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>

        {/* Filters — horizontal compact */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou série..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 text-sm pl-8 bg-card border-border" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {uniqueCategories.length > 0 && (
              <>
                <span className="hidden sm:inline text-border">|</span>
                {(["all", ...uniqueCategories] as string[]).map((cat) => (
                  <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-2.5 py-1 rounded text-xs font-medium transition-all border ${categoryFilter === cat ? "bg-[#C8920A]/15 border-[#C8920A]/40 text-[#C8920A]" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
                    {cat === "all" ? "Todas" : cat}
                  </button>
                ))}
              </>
            )}
            {(search || categoryFilter !== "all") && (
              <button onClick={() => { setSearch(""); setCategoryFilter("all"); }} className="px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground border border-border bg-card">
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum acessório encontrado</p>
            <Button variant="outline" onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Cadastrar primeiro acessório
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full table-compact">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Acessório</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Categoria</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Estoque</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Tipo</th>
                    <th className="w-36 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const bd = (item as any).breakdown;
                    const dispQty = bd ? bd.disponivel : ((item as any).quantidadeDisponivel ?? (item as any).quantidadeTotal ?? item.quantity ?? 0);
                    const totalQty = bd ? bd.total : ((item as any).quantidadeTotal ?? item.quantity ?? 0);
                    const isObrigatorio = (item as any).obrigatorio ?? false;
                    // Build variante summary (only if multiple variantes or named variante)
                    const byVariante: Array<{ variante: string | null; disponivel: number; alugado: number; manutencao: number; perdido: number; roubado: number }> = bd?.byVariante ?? [];
                    const showVariantes = bd && (byVariante.length > 1 || (byVariante.length === 1 && byVariante[0].variante !== null));
                    return (
                      <tr key={item.id} className="group border-b border-border/40 last:border-b-0">
                        <td className="px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-foreground truncate">{item.name}</p>
                            {item.serialNumber && <p className="text-[11px] text-muted-foreground">#{item.serialNumber}</p>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {item.category && <span className="px-1.5 py-0.5 bg-[#C8920A]/10 text-[#C8920A] rounded text-[10px] uppercase font-medium">{item.category}</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {showVariantes ? (
                            <div className="space-y-0.5">
                              {byVariante.map((v) => (
                                <div key={v.variante ?? "__null__"} className="flex flex-wrap gap-x-2 text-[11px]">
                                  <span className="text-muted-foreground font-medium">{v.variante ?? "Padrão"}:</span>
                                  {v.disponivel > 0 && <span className="text-emerald-500">{v.disponivel} disp</span>}
                                  {v.alugado > 0 && <span className="text-yellow-500">{v.alugado} alug</span>}
                                  {v.manutencao > 0 && <span className="text-orange-500">{v.manutencao} manut</span>}
                                  {v.perdido > 0 && <span className="text-red-500">{v.perdido} perd</span>}
                                  {v.roubado > 0 && <span className="text-red-700">{v.roubado} roub</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className={`text-[12px] font-medium ${dispQty > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {dispQty} / {totalQty}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {isObrigatorio ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              <ShieldCheck className="w-3 h-3" />Obrigatório
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted/50 text-muted-foreground border border-border">
                              <ShieldOff className="w-3 h-3" />Opcional
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2 row-actions">
                            <button onClick={() => openEdit(item)} className="text-[12px] text-primary hover:underline font-medium">Editar</button>
                            <button onClick={() => setUnitsAccessoryId(item.id)} className="text-[12px] text-muted-foreground hover:text-primary">Unidades</button>
                            <button onClick={() => setDeleteConfirmId(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {items.map((item: any) => {
                const bd = item.breakdown;
                const dispQty = bd ? bd.disponivel : (item.quantidadeDisponivel ?? item.quantidadeTotal ?? item.quantity ?? 0);
                const totalQty = bd ? bd.total : (item.quantidadeTotal ?? item.quantity ?? 0);
                const isObrigatorio = item.obrigatorio ?? false;
                return (
                  <div key={item.id} className="bg-card border border-border rounded-lg p-3 active:bg-accent/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-[#C8920A]/10 flex items-center justify-center flex-shrink-0 border border-[#C8920A]/20">
                        <Package className="w-5 h-5 text-[#C8920A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category || 'Sem categoria'} • {dispQty}/{totalQty} disp.</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isObrigatorio && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            <ShieldCheck className="w-2.5 h-2.5" />Obrigatório
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2 mt-2 border-t border-border/50">
                      <button onClick={() => openEdit(item)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><Edit className="w-3 h-3" />Editar</button>
                      <button onClick={() => setUnitsAccessoryId(item.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><List className="w-3 h-3" />Unidades</button>
                      <button onClick={() => setDeleteConfirmId(item.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive ml-auto"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2.5 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Mostrando {Math.min((page - 1) * LIMIT + 1, totalAccessories)}–{Math.min(page * LIMIT, totalAccessories)} de {totalAccessories}
                </p>
                <div className="flex gap-1.5">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2.5 py-1 rounded text-xs border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed">Anterior</button>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2.5 py-1 rounded text-xs border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed">Próxima</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto dialog-mobile">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Acessório" : "Novo Acessório"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nome *</Label>
                <Input
                  placeholder="Ex: Capacete M"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Número de Série</Label>
                <Input
                  placeholder="Ex: CAP-001"
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label>Valor de Reposição (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Ex: 150.00"
                  value={form.replacementValue}
                  onChange={(e) => setForm({ ...form, replacementValue: e.target.value })}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">Valor cobrado em caso de perda ou dano irreparável.</p>
              </div>

              {/* Toggle obrigatório */}
              <div className="col-span-2 flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Acessório Obrigatório</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Se ativado, este acessório será incluído automaticamente em todas as reservas públicas.
                  </p>
                </div>
                <Switch
                  checked={form.obrigatorio}
                  onCheckedChange={(v) => setForm({ ...form, obrigatorio: v })}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descrição do acessório..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="bg-background resize-none"
                  rows={2}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações internas..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="bg-background resize-none"
                  rows={2}
                />
              </div>
            </div>
            {!editingId && (
              <p className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2 border border-border">
                Uma unidade inicial será criada automaticamente. Adicione mais unidades via "Unidades" após o cadastro.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[#C8920A] hover:bg-[#A87608] text-white"
            >
              {editingId ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accessory Units Panel */}
      {unitsAccessoryId !== null && (
        <AccessoryUnitsPanel
          accessoryId={unitsAccessoryId}
          onClose={() => setUnitsAccessoryId(null)}
        />
      )}

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-card border-border max-w-sm dialog-mobile">
          <DialogHeader>
            <DialogTitle>Remover Acessório</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover este acessório? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate({ id: deleteConfirmId })}
              disabled={deleteMutation.isPending}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
