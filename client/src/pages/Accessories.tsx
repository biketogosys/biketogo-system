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

// ─── Accessory Units Panel ──────────────────────────────────────────────────────────────────────
function AccessoryUnitsPanel({ accessoryId, onClose }: { accessoryId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: units = [], isLoading } = trpc.accessories.getUnits.useQuery({ accessoryId });
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<UnitStatus>("disponivel");
  const [editObs, setEditObs] = useState("");
  const [editVariante, setEditVariante] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newVariante, setNewVariante] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteUnitId, setDeleteUnitId] = useState<number | null>(null);

  const updateMut = trpc.accessories.updateUnitStatus.useMutation({
    onSuccess: () => {
      utils.accessories.getUnits.invalidate();
      utils.accessories.list.invalidate();
      setEditingUnitId(null);
      toast.success("Unidade atualizada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const createMut = trpc.accessories.createUnit.useMutation({
    onSuccess: () => {
      utils.accessories.getUnits.invalidate();
      utils.accessories.list.invalidate();
      setNewSerial("");
      setNewVariante("");
      setShowAddForm(false);
      toast.success("Unidade adicionada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.accessories.deleteUnit.useMutation({
    onSuccess: () => {
      utils.accessories.getUnits.invalidate();
      utils.accessories.list.invalidate();
      setDeleteUnitId(null);
      toast.success("Unidade removida.");
    },
    onError: (e) => toast.error(e.message),
  });

  function startEdit(unit: any) {
    setEditingUnitId(unit.id);
    setEditStatus(unit.status as UnitStatus);
    setEditObs(unit.observacao ?? "");
    setEditVariante(unit.variante ?? "");
  }

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
        ) : (
          <div className="space-y-2">
            {(units as any[]).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma unidade cadastrada.</p>
            )}
            {(units as any[]).map((unit: any) => (
              <div key={unit.id} className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">#{unit.id}</span>
                    {unit.serialNumber && (
                      <span className="text-xs text-foreground font-medium">{unit.serialNumber}</span>
                    )}
                    {unit.variante && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#C8920A]/10 text-[#C8920A] font-medium border border-[#C8920A]/20">
                        {unit.variante}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-xs border ${UNIT_STATUS_COLORS[unit.status as UnitStatus]}`}
                    >
                      {UNIT_STATUS_LABELS[unit.status as UnitStatus] ?? unit.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => editingUnitId === unit.id ? setEditingUnitId(null) : startEdit(unit)}
                    >
                      <Edit className="w-3 h-3" />
                      {editingUnitId === unit.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteUnitId(unit.id)}
                      disabled={unit.status === "alugado"}
                      title={unit.status === "alugado" ? "Não é possível excluir unidade alugada" : "Excluir unidade"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {editingUnitId === unit.id && (
                  <div className="p-3 pt-0 border-t border-border bg-secondary/20 space-y-2">
                    <div>
                      <Label className="text-xs">Variante (ex: P, M, G, Azul)</Label>
                      <Input
                        value={editVariante}
                        onChange={(e) => setEditVariante(e.target.value)}
                        placeholder="Ex: Tamanho M, Cor Azul..."
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Novo status</Label>
                      <Select value={editStatus} onValueChange={(v) => setEditStatus(v as UnitStatus)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(UNIT_STATUS_LABELS) as UnitStatus[]).map((s) => (
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
          </div>
        )}

        {/* Add unit form */}
        <div className="border-t border-border pt-3 mt-2">
          {showAddForm ? (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Número de série (opcional)</Label>
                <Input
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  placeholder="Ex: CAP-007"
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Variante (opcional — ex: Tamanho M, Cor Azul)</Label>
                <Input
                  value={newVariante}
                  onChange={(e) => setNewVariante(e.target.value)}
                  placeholder="Ex: M, G, Azul..."
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-[#C8920A] hover:bg-[#A87608] text-white"
                  onClick={() => createMut.mutate({
                    accessoryId,
                    serialNumber: newSerial || undefined,
                    variante: newVariante || undefined,
                  })}
                  disabled={createMut.isPending}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />Adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)} className="w-full gap-1">
              <Plus className="w-3.5 h-3.5" />Adicionar Unidade
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
  const [statusFilter, setStatusFilter] = useState<AccessoryStatus | "all">("all");
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
    status: statusFilter !== "all" ? statusFilter : undefined,
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
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.accessories.update.useMutation({
    onSuccess: () => {
      utils.accessories.list.invalidate();
      toast.success("Acessório atualizado!");
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.accessories.delete.useMutation({
    onSuccess: () => {
      utils.accessories.list.invalidate();
      toast.success("Acessório removido.");
      setDeleteConfirmId(null);
    },
    onError: (e) => toast.error(e.message),
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
      status: form.status,
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
  const counts = {
    all: totalAccessories,
    available: items.filter((i: any) => i.status === "available").length,
    rented: items.filter((i: any) => i.status === "rented").length,
    maintenance: items.filter((i: any) => i.status === "maintenance").length,
    lost: items.filter((i: any) => i.status === "lost").length,
  };

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
            {(["all", "available", "rented", "maintenance", "lost"] as (AccessoryStatus | "all")[]).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 rounded text-xs font-medium transition-all border ${statusFilter === s ? "bg-[#C8920A]/15 border-[#C8920A]/40 text-[#C8920A]" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
                {s === "all" ? `Todos (${counts.all})` : `${STATUS_LABELS[s]} (${counts[s]})`}
              </button>
            ))}
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
            {(search || statusFilter !== "all" || categoryFilter !== "all") && (
              <button onClick={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); }} className="px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground border border-border bg-card">
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
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Status</th>
                    <th className="w-36 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const dispQty = (item as any).quantidadeDisponivel ?? (item as any).quantidadeTotal ?? item.quantity ?? 0;
                    const isObrigatorio = (item as any).obrigatorio ?? false;
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
                          <span className={`text-[12px] font-medium ${dispQty > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {dispQty} / {(item as any).quantidadeTotal ?? item.quantity}
                          </span>
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
                          <Badge className={`text-[10px] px-2 py-0.5 border ${STATUS_COLORS[item.status as AccessoryStatus]}`} variant="outline">
                            {STATUS_LABELS[item.status as AccessoryStatus]}
                          </Badge>
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
                const dispQty = item.quantidadeDisponivel ?? item.quantidadeTotal ?? item.quantity ?? 0;
                const isObrigatorio = item.obrigatorio ?? false;
                return (
                  <div key={item.id} className="bg-card border border-border rounded-lg p-3 active:bg-accent/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-[#C8920A]/10 flex items-center justify-center flex-shrink-0 border border-[#C8920A]/20">
                        <Package className="w-5 h-5 text-[#C8920A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category || 'Sem categoria'} • {dispQty}/{item.quantidadeTotal ?? item.quantity} disp.</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={`text-[10px] px-2 py-0.5 border flex-shrink-0 ${STATUS_COLORS[item.status as AccessoryStatus]}`} variant="outline">
                          {STATUS_LABELS[item.status as AccessoryStatus]}
                        </Badge>
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
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as AccessoryStatus })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABELS) as AccessoryStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
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
