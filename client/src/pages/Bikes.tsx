import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus, Loader2, Bike as BikeIcon, Search, Pencil, Trash2, X,
  ChevronDown, ChevronUp, Percent, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BikeStatus = "available" | "rented" | "maintenance";
type BikeCategory = "mtb" | "speed" | "gravel";

const statusConfig: Record<BikeStatus, { cls: string; label: string }> = {
  available: { cls: "badge-available", label: "Disponível" },
  rented: { cls: "badge-rented", label: "Alugada" },
  maintenance: { cls: "badge-maintenance", label: "Manutenção" },
};

const categoryLabels: Record<BikeCategory, string> = {
  mtb: "MTB",
  speed: "Speed",
  gravel: "Gravel",
};

// ─── Discount Rules Editor ──────────────────────────────────────────────────
function DiscountRulesEditor({
  bikeId,
  onClose,
}: {
  bikeId: number;
  onClose: () => void;
}) {
  const { data: rules, isLoading } = trpc.bikes.discountRules.useQuery({ bikeId });
  const utils = trpc.useUtils();
  const setRulesMutation = trpc.bikes.setDiscountRules.useMutation({
    onSuccess: () => {
      toast.success("Regras de desconto salvas!");
      utils.bikes.discountRules.invalidate({ bikeId });
    },
    onError: (e) => toast.error(e.message),
  });

  const [localRules, setLocalRules] = useState<{ minDays: string; discountPercent: string }[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && rules) {
    setLocalRules(
      rules.map((r: any) => ({
        minDays: String(r.minDays),
        discountPercent: String(r.discountPercent),
      }))
    );
    setInitialized(true);
  }

  const addRule = () => setLocalRules([...localRules, { minDays: "", discountPercent: "" }]);
  const removeRule = (idx: number) => setLocalRules(localRules.filter((_, i) => i !== idx));
  const updateRule = (idx: number, field: string, value: string) => {
    const updated = [...localRules];
    (updated[idx] as any)[field] = value;
    setLocalRules(updated);
  };

  const handleSave = () => {
    const parsed = localRules
      .filter((r) => r.minDays && r.discountPercent)
      .map((r) => ({
        minDays: parseInt(r.minDays),
        discountPercent: r.discountPercent,
      }));
    setRulesMutation.mutate({ bikeId, rules: parsed });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            Desconto Progressivo
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Configure descontos automáticos por número de dias de aluguel.
              </p>
              {localRules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Dias"
                      value={rule.minDays}
                      onChange={(e) => updateRule(idx, "minDays", e.target.value)}
                      className="bg-secondary border-border text-sm"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">dias =</span>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="%"
                      value={rule.discountPercent}
                      onChange={(e) => updateRule(idx, "discountPercent", e.target.value)}
                      className="bg-secondary border-border text-sm"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">%</span>
                  <button
                    onClick={() => removeRule(idx)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addRule}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar faixa
              </button>
            </>
          )}
          <div className="flex gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={setRulesMutation.isPending}
              className="flex-1"
              style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
            >
              {setRulesMutation.isPending ? "Salvando..." : "Salvar regras"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bike Form Dialog ────────────────────────────────────────────────────────
function BikeFormDialog({
  bike,
  onClose,
  onSuccess,
}: {
  bike?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    serialNumber: bike?.serialNumber ?? "",
    model: bike?.model ?? "",
    brand: bike?.brand ?? "",
    category: (bike?.category ?? "") as string,
    size: bike?.size ?? "",
    color: bike?.color ?? "",
    description: bike?.description ?? "",
    weight: bike?.weight ?? "",
    weightLimit: bike?.weightLimit ?? "",
    dailyRate: bike?.dailyRate ?? "",
    quantity: bike?.quantity ?? 1,
    notes: bike?.notes ?? "",
    status: (bike?.status ?? "available") as BikeStatus,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const createMutation = trpc.bikes.create.useMutation({
    onSuccess: () => { toast.success("Bicicleta criada!"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.bikes.update.useMutation({
    onSuccess: () => { toast.success("Bicicleta atualizada!"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.serialNumber.trim()) return toast.error("Número de série é obrigatório.");
    if (!form.model.trim()) return toast.error("Modelo é obrigatório.");

    const payload: any = {
      ...form,
      quantity: Number(form.quantity) || 1,
      dailyRate: form.dailyRate || undefined,
      category: form.category || undefined,
      brand: form.brand || undefined,
    };

    if (bike) {
      updateMutation.mutate({ id: bike.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {bike ? "Editar Bicicleta" : "Nova Bicicleta"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Marca</Label>
              <select
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
              >
                <option value="">Selecionar...</option>
                <option value="Trek">Trek</option>
                <option value="Sense">Sense</option>
                <option value="Oggi">Oggi</option>
                <option value="Cannondale">Cannondale</option>
                <option value="Specialized">Specialized</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Categoria</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
              >
                <option value="">Selecionar...</option>
                <option value="mtb">MTB</option>
                <option value="speed">Speed</option>
                <option value="gravel">Gravel</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Modelo *</Label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="bg-secondary border-border" placeholder="Ex: Marlin 5" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nº de série *</Label>
              <Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tamanho</Label>
              <Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="P / M / G / XL" className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cor</Label>
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Quantidade</Label>
              <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Preço/dia (R$)
              </Label>
              <Input type="number" step="0.01" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })} placeholder="150.00" className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as BikeStatus })}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
              >
                <option value="available">Disponível</option>
                <option value="rented">Alugada</option>
                <option value="maintenance">Manutenção</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showAdvanced ? "Ocultar detalhes" : "Mais detalhes"}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Peso (kg)</Label>
                  <Input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="12.5" className="bg-secondary border-border" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Limite peso ciclista (kg)</Label>
                  <Input value={form.weightLimit} onChange={(e) => setForm({ ...form, weightLimit: e.target.value })} placeholder="120" className="bg-secondary border-border" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Descrição</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground resize-none"
                  placeholder="Descrição técnica da bicicleta..."
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Observações</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-secondary border-border" />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={isPending} className="flex-1" style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}>
              {isPending ? "Salvando..." : bike ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Bikes() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BikeStatus | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [editBike, setEditBike] = useState<any>(null);
  const [discountBikeId, setDiscountBikeId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.bikes.list.useQuery({
    search: search || undefined,
    status: statusFilter,
    category: categoryFilter,
  });
  const deleteMutation = trpc.bikes.delete.useMutation({
    onSuccess: () => { toast.success("Bicicleta removida."); utils.bikes.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const bikes = data ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>Bicicletas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{bikes.length} bicicleta{bikes.length !== 1 ? "s" : ""} cadastrada{bikes.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { setEditBike(null); setShowForm(true); }} className="gap-2" style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}>
          <Plus className="w-4 h-4" />Nova bicicleta
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por modelo, marca ou série..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {([undefined, "available", "rented", "maintenance"] as (BikeStatus | undefined)[]).map((s) => (
            <button key={String(s)} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${statusFilter === s ? "bg-primary/15 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
              {s === undefined ? "Todas" : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6">
        {([undefined, "mtb", "speed", "gravel"] as (string | undefined)[]).map((c) => (
          <button key={String(c)} onClick={() => setCategoryFilter(c)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${categoryFilter === c ? "bg-primary/15 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
            {c === undefined ? "Todas categorias" : categoryLabels[c as BikeCategory]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : bikes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <BikeIcon className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhuma bicicleta encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bikes.map((bike: any) => (
            <div key={bike.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <BikeIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    {bike.brand && (
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{bike.brand}</span>
                    )}
                    {bike.category && (
                      <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
                        {categoryLabels[bike.category as BikeCategory] || bike.category}
                      </span>
                    )}
                  </div>
                </div>
                <span className={statusConfig[bike.status as BikeStatus]?.cls ?? "badge-available"}>
                  {statusConfig[bike.status as BikeStatus]?.label ?? bike.status}
                </span>
              </div>

              <h3 className="font-semibold text-foreground text-sm mb-1">{bike.model}</h3>
              <p className="text-xs text-muted-foreground font-mono mb-2">#{bike.serialNumber}</p>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                {bike.size && <span className="px-1.5 py-0.5 bg-secondary rounded">Tam: {bike.size}</span>}
                {bike.color && <span className="px-1.5 py-0.5 bg-secondary rounded">Cor: {bike.color}</span>}
                {bike.quantity > 1 && <span className="px-1.5 py-0.5 bg-secondary rounded">Qtd: {bike.quantity}</span>}
              </div>

              {bike.dailyRate && (
                <div className="flex items-center gap-1 mb-2">
                  <DollarSign className="w-3 h-3 text-primary" />
                  <span className="text-sm font-semibold text-primary">
                    R$ {parseFloat(bike.dailyRate).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-muted-foreground">/dia</span>
                </div>
              )}

              {bike.notes && <p className="text-xs text-muted-foreground/70 mb-3 line-clamp-2">{bike.notes}</p>}

              <div className="flex gap-2 pt-2 border-t border-border">
                <button onClick={() => { setEditBike(bike); setShowForm(true); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Pencil className="w-3 h-3" />Editar
                </button>
                <button onClick={() => setDiscountBikeId(bike.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Percent className="w-3 h-3" />Descontos
                </button>
                <button onClick={() => { if (confirm("Remover esta bicicleta?")) deleteMutation.mutate({ id: bike.id }); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto">
                  <Trash2 className="w-3 h-3" />Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BikeFormDialog
          bike={editBike}
          onClose={() => { setShowForm(false); setEditBike(null); }}
          onSuccess={() => { setShowForm(false); setEditBike(null); utils.bikes.list.invalidate(); }}
        />
      )}

      {discountBikeId !== null && (
        <DiscountRulesEditor
          bikeId={discountBikeId}
          onClose={() => setDiscountBikeId(null)}
        />
      )}
    </div>
  );
}
