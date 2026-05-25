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
  const [newSerial, setNewSerial] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const updateMut = trpc.accessories.updateUnitStatus.useMutation({
    onSuccess: () => {
      utils.accessories.getUnits.invalidate();
      setEditingUnitId(null);
      toast.success("Status atualizado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const createMut = trpc.accessories.createUnit.useMutation({
    onSuccess: () => {
      utils.accessories.getUnits.invalidate();
      setNewSerial("");
      setShowAddForm(false);
      toast.success("Unidade adicionada!");
    },
    onError: (e) => toast.error(e.message),
  });

  function startEdit(unit: any) {
    setEditingUnitId(unit.id);
    setEditStatus(unit.status as UnitStatus);
    setEditObs(unit.observacao ?? "");
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">#{unit.id}</span>
                    {unit.serialNumber && (
                      <span className="text-xs text-foreground font-medium">{unit.serialNumber}</span>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-xs border ${UNIT_STATUS_COLORS[unit.status as UnitStatus]}`}
                    >
                      {UNIT_STATUS_LABELS[unit.status as UnitStatus] ?? unit.status}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => editingUnitId === unit.id ? setEditingUnitId(null) : startEdit(unit)}
                  >
                    <Edit className="w-3 h-3" />
                    {editingUnitId === unit.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </div>
                {editingUnitId === unit.id && (
                  <div className="p-3 pt-0 border-t border-border bg-secondary/20 space-y-2">
                    {unit.observacao && editingUnitId !== unit.id && (
                      <p className="text-xs text-muted-foreground">{unit.observacao}</p>
                    )}
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
                        onClick={() => updateMut.mutate({ unitId: unit.id, status: editStatus, observacao: editObs || undefined })}
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
              <Label className="text-xs">Número de série (opcional)</Label>
              <Input
                value={newSerial}
                onChange={(e) => setNewSerial(e.target.value)}
                placeholder="Ex: CAP-007"
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-[#C8920A] hover:bg-[#A87608] text-white"
                  onClick={() => createMut.mutate({ accessoryId, serialNumber: newSerial || undefined })}
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
  quantity: number;
  quantidadeTotal: number;
  status: AccessoryStatus;
  notes: string;
};

const emptyForm: AccessoryForm = {
  name: "",
  description: "",
  category: "",
  serialNumber: "",
  quantity: 1,
  quantidadeTotal: 1,
  status: "available",
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

  const { data: accessories, isLoading } = trpc.accessories.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  // Categorias únicas derivadas da lista atual
  const uniqueCategories = Array.from(
    new Set((accessories ?? []).map((i: any) => i.category).filter(Boolean))
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
      quantity: item.quantidadeTotal ?? item.quantity ?? 1,
      quantidadeTotal: item.quantidadeTotal ?? item.quantity ?? 1,
      status: item.status ?? "available",
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
      quantity: form.quantidadeTotal,
      quantidadeTotal: form.quantidadeTotal,
      status: form.status,
      notes: form.notes || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const allItems = accessories ?? [];
  const items = categoryFilter === "all"
    ? allItems
    : allItems.filter((i: any) => i.category === categoryFilter);
  const counts = {
    all: items.length,
    available: items.filter((i) => i.status === "available").length,
    rented: items.filter((i) => i.status === "rented").length,
    maintenance: items.filter((i) => i.status === "maintenance").length,
    lost: items.filter((i) => i.status === "lost").length,
  };

  return (
    <>
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Acessórios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie capacetes, cadeados e demais equipamentos
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-[#C8920A] hover:bg-[#A87608] text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Acessório
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["available", "rented", "maintenance", "lost"] as AccessoryStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={`rounded-lg border p-3 text-left transition-all ${
                statusFilter === s
                  ? "border-[#C8920A] bg-[#C8920A]/10"
                  : "border-border bg-card hover:border-[#C8920A]/50"
              }`}
            >
              <div className="text-2xl font-bold text-foreground">{counts[s]}</div>
              <div className={`text-xs mt-0.5 font-medium ${STATUS_COLORS[s].split(" ")[1]}`}>
                {STATUS_LABELS[s]}
              </div>
            </button>
          ))}
        </div>

        {/* Category filter */}
        {uniqueCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                categoryFilter === "all"
                  ? "bg-[#C8920A] text-white border-[#C8920A]"
                  : "border-border text-muted-foreground hover:border-[#C8920A]/50"
              }`}
            >
              Todas
            </button>
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  categoryFilter === cat
                    ? "bg-[#C8920A] text-white border-[#C8920A]"
                    : "border-border text-muted-foreground hover:border-[#C8920A]/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou número de série..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        {/* List */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-[#C8920A]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                    {item.category && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      </div>
                    )}
                  </div>
                  <Badge
                    className={`shrink-0 text-xs border ${STATUS_COLORS[item.status as AccessoryStatus]}`}
                    variant="outline"
                  >
                    {STATUS_LABELS[item.status as AccessoryStatus]}
                  </Badge>
                </div>

                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {item.serialNumber && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Hash className="w-3 h-3" />
                      <span className="truncate">{item.serialNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Layers className="w-3 h-3" />
                    <span>Total: {(item as any).quantidadeTotal ?? item.quantity}</span>
                  </div>
                </div>
                {(() => {
                  const dispQty = (item as any).quantidadeDisponivel ?? (item as any).quantidadeTotal ?? item.quantity ?? 0;
                  const isAvail = dispQty > 0 && item.status === "available";
                  return (
                    <div className="flex items-center gap-2">
                      {isAvail ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-xs text-emerald-600 font-medium">
                            {dispQty} disponível{dispQty !== 1 ? "is" : ""}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/30">
                          <XCircle className="w-3 h-3 text-red-500" />
                          <span className="text-xs text-red-600 font-medium">
                            {dispQty === 0 ? "Sem estoque" : `${dispQty} disp.`}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">(gratuito)</span>
                    </div>
                  );
                })()}

                <div className="flex gap-2 pt-1 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-1 text-xs h-8"
                    onClick={() => openEdit(item)}
                  >
                    <Edit className="w-3 h-3" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-1 text-xs h-8 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => setUnitsAccessoryId(item.id)}
                  >
                    <List className="w-3 h-3" /> Unidades
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => setDeleteConfirmId(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
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
                <Label>Quantidade Total</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.quantidadeTotal}
                  onChange={(e) => setForm({ ...form, quantidadeTotal: Number(e.target.value), quantity: Number(e.target.value) })}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">Acessórios são incluídos gratuitamente no aluguel.</p>
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
        <DialogContent className="bg-card border-border max-w-sm">
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
