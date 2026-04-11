import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Bike as BikeIcon, Search, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BikeStatus = "available" | "rented" | "maintenance";

const statusConfig: Record<BikeStatus, { cls: string; label: string }> = {
  available: { cls: "badge-available", label: "Disponível" },
  rented: { cls: "badge-rented", label: "Alugada" },
  maintenance: { cls: "badge-maintenance", label: "Manutenção" },
};

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
    size: bike?.size ?? "",
    color: bike?.color ?? "",
    notes: bike?.notes ?? "",
    status: (bike?.status ?? "available") as BikeStatus,
  });

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
    if (bike) {
      updateMutation.mutate({ id: bike.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
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
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nº de série *</Label>
              <Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Modelo *</Label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tamanho</Label>
              <Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="P / M / G / XL" className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cor</Label>
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="bg-secondary border-border" />
            </div>
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
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Observações</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-secondary border-border" />
          </div>
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

export default function Bikes() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BikeStatus | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [editBike, setEditBike] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.bikes.list.useQuery({ search: search || undefined, status: statusFilter });
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
        <Button onClick={() => setShowForm(true)} className="gap-2" style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}>
          <Plus className="w-4 h-4" />Nova bicicleta
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por modelo ou número de série..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <div className="flex gap-2">
          {([undefined, "available", "rented", "maintenance"] as (BikeStatus | undefined)[]).map((s) => (
            <button key={String(s)} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${statusFilter === s ? "bg-primary/15 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
              {s === undefined ? "Todas" : statusConfig[s].label}
            </button>
          ))}
        </div>
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
          {bikes.map((bike) => (
            <div key={bike.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <BikeIcon className="w-5 h-5 text-primary" />
                </div>
                <span className={statusConfig[bike.status as BikeStatus]?.cls ?? "badge-available"}>
                  {statusConfig[bike.status as BikeStatus]?.label ?? bike.status}
                </span>
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{bike.model}</h3>
              <p className="text-xs text-muted-foreground font-mono mb-2">#{bike.serialNumber}</p>
              <div className="flex gap-2 text-xs text-muted-foreground mb-3">
                {bike.size && <span>Tam: {bike.size}</span>}
                {bike.color && <span>Cor: {bike.color}</span>}
              </div>
              {bike.notes && <p className="text-xs text-muted-foreground/70 mb-3 line-clamp-2">{bike.notes}</p>}
              <div className="flex gap-2 pt-2 border-t border-border">
                <button onClick={() => { setEditBike(bike); setShowForm(true); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Pencil className="w-3 h-3" />Editar
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
    </div>
  );
}
