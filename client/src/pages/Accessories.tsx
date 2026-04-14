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
  DollarSign,
  Layers,
} from "lucide-react";

type AccessoryStatus = "available" | "rented" | "maintenance" | "lost";

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
  dailyRate: string;
  purchasePrice: string;
  status: AccessoryStatus;
  notes: string;
};

const emptyForm: AccessoryForm = {
  name: "",
  description: "",
  category: "",
  serialNumber: "",
  quantity: 1,
  dailyRate: "",
  purchasePrice: "",
  status: "available",
  notes: "",
};

export default function Accessories() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccessoryStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AccessoryForm>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: accessories, isLoading } = trpc.accessories.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

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
      quantity: item.quantity ?? 1,
      dailyRate: item.dailyRate ?? "",
      purchasePrice: item.purchasePrice ?? "",
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
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  const items = accessories ?? [];
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
                    <span>Qtd: {item.quantity}</span>
                  </div>
                  {item.dailyRate && (
                    <div className="flex items-center gap-1 text-[#C8920A]">
                      <DollarSign className="w-3 h-3" />
                      <span>R$ {item.dailyRate}/dia</span>
                    </div>
                  )}
                </div>

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
                    className="flex-1 gap-1 text-xs h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => setDeleteConfirmId(item.id)}
                  >
                    <Trash2 className="w-3 h-3" /> Remover
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
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label>Diária (R$)</Label>
                <Input
                  placeholder="0.00"
                  value={form.dailyRate}
                  onChange={(e) => setForm({ ...form, dailyRate: e.target.value })}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label>Preço de Compra (R$)</Label>
                <Input
                  placeholder="0.00"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  className="bg-background"
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
