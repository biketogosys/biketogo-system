import { trpc } from "@/lib/trpc";
import { NewContractModal } from "@/components/NewContractModal";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Bike, Search, X, Check, Trash2, AlertTriangle, RotateCcw, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
  return (
    <div
      role="dialog"
      aria-modal
      tabIndex={0}
      onKeyDown={handleKey}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ outline: "none" }}
      ref={el => el?.focus()}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        aria-label="Fechar"
      >
        <span className="text-xl leading-none">×</span>
      </button>
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}


type RentalStatus = "pending" | "active" | "returned" | "overdue" | "cancelled";

const rentalStatusConfig: Record<RentalStatus, { cls: string; label: string }> = {
  pending: { cls: "badge-lead", label: "Pendente" },
  active: { cls: "badge-rented", label: "Ativo" },
  returned: { cls: "badge-available", label: "Devolvido" },
  overdue: { cls: "badge-blocked", label: "Atrasado" },
  cancelled: { cls: "badge-maintenance", label: "Cancelado" },
};



// ─── Client Autocomplete ──────────────────────────────────────────────────────
function ClientAutocomplete({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string, name: string) => void;
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(id: number, name: string) {
    onChange(String(id), name);
    setSelectedName(name);
    setInputValue("");
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    setSelectedName("");
    onChange("", "");
    setOpen(true);
  }

  function handleClear() {
    setInputValue("");
    setSelectedName("");
    onChange("", "");
    setOpen(false);
  }

  const displayValue = selectedName || inputValue;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Digite o nome do cliente..."
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-8 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#C8920A] focus:border-[#C8920A]"
        />
        {displayValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (inputValue.length > 0 || clients.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {clients.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {inputValue ? "Nenhum cliente encontrado" : "Digite para buscar..."}
            </div>
          ) : (
            clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c.id, c.name)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.cpf && `CPF: ${c.cpf}`}
                    {c.cpf && c.phone && " · "}
                    {c.phone && c.phone}
                  </div>
                </div>
                {value === String(c.id) && (
                  <Check className="w-4 h-4 text-[#C8920A] shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Return Dialog ──────────────────────────────────────────────────────────
function ReturnDialog({
  rental,
  onClose,
  onSuccess,
}: {
  rental: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [condition, setCondition] = useState<"ok" | "damaged">("ok");
  const [conditionNotes, setConditionNotes] = useState("");

  const returnMutation = trpc.rentals.update.useMutation({
    onSuccess: () => {
      toast.success("Devolução registrada!");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleReturn = () => {
    const notes = [
      rental.notes || "",
      `Devolução: ${condition === "ok" ? "Bike OK" : "Com dano"}`,
      conditionNotes ? `Obs devolução: ${conditionNotes}` : "",
    ].filter(Boolean).join("\n");

    returnMutation.mutate({
      id: rental.id,
      returnedAt: new Date(),
      status: "returned",
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Registrar Devolução</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {rental.bikeSizeId && (
            <div className="p-3 bg-secondary rounded-lg border border-border">
              <div className="text-xs text-muted-foreground mb-1">Tamanho selecionado</div>
              <div className="text-sm font-medium text-foreground">{rental.bikeSize?.tamanho || "Não informado"}</div>
              {rental.quantity && (
                <div className="text-xs text-muted-foreground mt-1">Quantidade: {rental.quantity}</div>
              )}
            </div>
          )}
          {rental.contractId && (
            <div className="p-3 bg-secondary rounded-lg border border-border">
              <a
                href={`/contratos?contractId=${rental.contractId}`}
                className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Ver contrato →
              </a>
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Condição da bicicleta</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCondition("ok")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  condition === "ok"
                    ? "bg-green-500/15 border-green-500/40 text-green-400"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Check className="w-4 h-4 inline mr-1" />OK
              </button>
              <button
                type="button"
                onClick={() => setCondition("damaged")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  condition === "damaged"
                    ? "bg-red-500/15 border-red-500/40 text-red-400"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <AlertTriangle className="w-4 h-4 inline mr-1" />Com dano
              </button>
            </div>
          </div>
          {condition === "damaged" && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Descreva o dano</Label>
              <textarea
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground resize-none"
                placeholder="Descreva o dano observado..."
              />
            </div>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button
              onClick={handleReturn}
              disabled={returnMutation.isPending}
              className="flex-1"
              style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
            >
              {returnMutation.isPending ? "Salvando..." : "Confirmar devolução"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Rental Dialog — substituído por NewContractModal (Tarefa 40) ────────


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Rentals() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RentalStatus | undefined>(undefined);
  const [showNew, setShowNew] = useState(false);
  const [returnRental, setReturnRental] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  const [archivedPage, setArchivedPage] = useState(1);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState("");
  const openLightbox = (src: string, alt: string) => { setLightboxSrc(src); setLightboxAlt(alt); };
  const closeLightbox = () => setLightboxSrc(null);
  const utils = trpc.useUtils();

  const { data: settingsData } = trpc.settings.getAll.useQuery();
  const retentionDays = (() => {
    if (!settingsData) return 5;
    const map: Record<string, string> = {};
    (settingsData as any[]).forEach((s: any) => { map[s.key] = s.value; });
    return Math.max(3, Math.min(30, parseInt(map["archive_retention_days"] || "5") || 5));
  })();

  function calcRetentionBadge(deletedAt: string | Date | null | undefined): { label: string; cls: string } | null {
    if (!deletedAt) return null;
    const archived = new Date(deletedAt);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - archived.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeft = retentionDays - daysSince;
    if (daysLeft < 0) return { label: "Expirado", cls: "bg-red-900/40 text-red-300 border-red-800" };
    if (daysLeft <= 2) return { label: daysLeft === 0 ? "Expira hoje" : "Expira amanhã", cls: "bg-red-500/20 text-red-400 border-red-500/40" };
    return { label: `${daysLeft} dias restantes`, cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  }

  const { data, isLoading } = trpc.rentals.list.useQuery({
    status: statusFilter,
    page,
    limit: 20,
  }, { enabled: viewMode === "active" });

  const { data: archivedData, isLoading: archivedLoading } = trpc.rentals.listArchived.useQuery({
    page: archivedPage,
    limit: 20,
  }, { enabled: viewMode === "archived" });

  const { data: allClients } = trpc.clients.list.useQuery({ limit: 100, page: 1 });
  const { data: allBikes } = trpc.bikes.list.useQuery({});
  const clientMap = Object.fromEntries((allClients?.items ?? []).map((c: any) => [c.id, c.name]));
  const allBikesArr = (allBikes as any)?.data ?? (Array.isArray(allBikes) ? allBikes : []);
  const bikeMap = Object.fromEntries((allBikesArr as any[]).map((b: any) => [b.id, `${b.model} #${b.serialNumber}`]));

  const deleteMutation = trpc.rentals.delete.useMutation({
    onSuccess: () => { toast.success("Aluguel arquivado."); utils.rentals.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const restoreMutation = trpc.rentals.restore.useMutation({
    onSuccess: () => {
      toast.success("Aluguel restaurado com sucesso.");
      utils.rentals.listArchived.invalidate();
      utils.rentals.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const archivedRentals = archivedData?.items ?? [];
  const archivedTotal = archivedData?.total ?? 0;

  const rentals = (data?.items ?? []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const clientName = clientMap[r.clientId]?.toLowerCase() ?? "";
    const bikeName = bikeMap[r.bikeId]?.toLowerCase() ?? "";
    return clientName.includes(q) || bikeName.includes(q) || String(r.id).includes(q);
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {lightboxSrc && <Lightbox src={lightboxSrc} alt={lightboxAlt} onClose={closeLightbox} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aluguéis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.total ?? 0} aluguel(s) registrado(s)
          </p>
        </div>
        <Button
          onClick={() => setShowNew(true)}
          className="gap-2 bg-[#C8920A] hover:bg-[#A87608] text-white"
        >
          <Plus className="w-4 h-4" /> Novo aluguel
        </Button>
      </div>

      {/* View mode tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setViewMode("active")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
            viewMode === "active"
              ? "bg-primary/15 border-primary/40 text-primary"
              : "bg-card border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bike className="w-3.5 h-3.5" /> Ativos
        </button>
        <button
          onClick={() => setViewMode("archived")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
            viewMode === "archived"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
              : "bg-card border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Archive className="w-3.5 h-3.5" /> Arquivados {archivedTotal > 0 && `(${archivedTotal})`}
        </button>
      </div>

      <div className={`flex flex-col sm:flex-row gap-3 mb-6 ${viewMode === "archived" ? "hidden" : ""}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou bicicleta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {([undefined, "pending", "active", "returned", "overdue", "cancelled"] as (RentalStatus | undefined)[]).map((s) => (
            <button
              key={String(s)}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                statusFilter === s
                  ? "bg-[#C8920A]/15 border-[#C8920A]/40 text-[#C8920A]"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === undefined ? "Todos" : rentalStatusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Archived rentals */}
      {viewMode === "archived" && (
        <>
          {archivedLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : archivedRentals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Archive className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhum aluguel arquivado</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full hidden md:table">
                <thead>
                  <tr className="border-b border-border">
                    {["#", "Cliente", "Bicicleta", "Saída", "Arquivado em", ""].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {archivedRentals.map((rental, idx) => (
                    <tr key={rental.id} className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${idx === archivedRentals.length - 1 ? "border-b-0" : ""}`}>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">#{rental.id}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{clientMap[rental.clientId] ?? `Cliente #${rental.clientId}`}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{bikeMap[rental.bikeId] ?? `Bike #${rental.bikeId}`}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(rental.startDate).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <span>{rental.deletedAt ? new Date(rental.deletedAt).toLocaleDateString("pt-BR") : "—"}</span>
                          {(() => { const b = calcRetentionBadge(rental.deletedAt); return b ? <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${b.cls}`}>{b.label}</span> : null; })()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => restoreMutation.mutate({ id: rental.id })} disabled={restoreMutation.isPending}>
                          <RotateCcw className="w-3 h-3" /> Restaurar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-border">
                {archivedRentals.map((rental) => (
                  <div key={rental.id} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{clientMap[rental.clientId] ?? `Cliente #${rental.clientId}`}</p>
                      <p className="text-xs text-muted-foreground">{bikeMap[rental.bikeId] ?? `Bike #${rental.bikeId}`}</p>
                      {(() => { const b = calcRetentionBadge(rental.deletedAt); return b ? <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${b.cls} mt-0.5`}>{b.label}</span> : null; })()}
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => restoreMutation.mutate({ id: rental.id })} disabled={restoreMutation.isPending}>
                      <RotateCcw className="w-3 h-3" /> Restaurar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(archivedData?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button variant="outline" size="sm" onClick={() => setArchivedPage((p) => Math.max(1, p - 1))} disabled={archivedPage <= 1}>← Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {archivedPage} de {archivedData?.totalPages ?? 1}</span>
              <Button variant="outline" size="sm" onClick={() => setArchivedPage((p) => p + 1)} disabled={archivedPage >= (archivedData?.totalPages ?? 1)}>Próxima →</Button>
            </div>
          )}
        </>
      )}

      {/* Active rentals */}
      {viewMode === "active" && isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-[#C8920A]" />
        </div>
      ) : viewMode === "active" && rentals.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Bike className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhum aluguel encontrado</p>
        </div>
      ) : viewMode === "active" ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full hidden md:table">
            <thead>
              <tr className="border-b border-border">
                {["#", "Cliente", "Bicicleta", "Saída", "Devolução", "Total", "Pagamento", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rentals.map((rental, idx) => (
                <tr
                  key={rental.id}
                  className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${
                    idx === rentals.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">#{rental.id}</td>
                  <td className="px-4 py-3 text-sm text-foreground font-medium">
                    {clientMap[rental.clientId] ?? `Cliente #${rental.clientId}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {bikeMap[rental.bikeId] ?? `Bike #${rental.bikeId}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(rental.startDate).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {rental.returnedAt
                      ? new Date(rental.returnedAt).toLocaleDateString("pt-BR")
                      : rental.endDate
                      ? new Date(rental.endDate).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground">
                    {rental.totalAmount
                      ? `R$ ${parseFloat(rental.totalAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                    {rental.paymentMethod
                      ? ({ pix: "PIX", credit_card: "Crédito", debit_card: "Débito", cash: "Dinheiro", stripe: "Stripe", other: "Outro" } as Record<string, string>)[rental.paymentMethod] ?? rental.paymentMethod
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={rentalStatusConfig[rental.status as RentalStatus]?.cls ?? "badge-lead"}>
                      {rentalStatusConfig[rental.status as RentalStatus]?.label ?? rental.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {rental.status === "active" && (
                        <button
                          onClick={() => setReturnRental(rental)}
                          className="text-xs text-[#C8920A] hover:underline"
                        >
                          Devolver
                        </button>
                      )}
                      {rental.status === "pending" && rental.contractId && (
                        <a
                          href={`/contratos?contractId=${rental.contractId}`}
                          className="text-xs text-blue-400 hover:underline"
                        >
                          Ver contrato
                        </a>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Remover este aluguél?"))
                            deleteMutation.mutate({ id: rental.id });
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-border">
            {rentals.map((rental) => (
              <div key={rental.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {clientMap[rental.clientId] ?? `Cliente #${rental.clientId}`}
                  </span>
                  <span className={rentalStatusConfig[rental.status as RentalStatus]?.cls ?? "badge-lead"}>
                    {rentalStatusConfig[rental.status as RentalStatus]?.label ?? rental.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {bikeMap[rental.bikeId] ?? `Bike #${rental.bikeId}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Saída: {new Date(rental.startDate).toLocaleDateString("pt-BR")}
                </p>
                {rental.totalAmount && (
                  <p className="text-xs text-foreground mt-1">
                    R${" "}
                    {parseFloat(rental.totalAmount).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                )}
                <div className="flex gap-3 mt-2">
                  {rental.status === "active" && (
                    <button
                      onClick={() => setReturnRental(rental)}
                      className="text-xs text-[#C8920A] hover:underline"
                    >
                      Registrar devolução
                    </button>
                  )}
                  {rental.status === "pending" && rental.contractId && (
                    <a
                      href={`/contratos?contractId=${rental.contractId}`}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Ver contrato
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("Remover este aluguél?"))
                        deleteMutation.mutate({ id: rental.id });
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <NewContractModal
        open={showNew}
        onClose={() => {
          setShowNew(false);
          utils.rentals.list.invalidate();
          utils.bikes.list.invalidate();
        }}
      />

      {/* Pagination — active only */}
      {viewMode === "active" && (data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {data?.totalPages ?? 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= (data?.totalPages ?? 1)}
          >
            Próxima →
          </Button>
        </div>
      )}

      {returnRental && (
        <ReturnDialog
          rental={returnRental}
          onClose={() => setReturnRental(null)}
          onSuccess={() => {
            setReturnRental(null);
            utils.rentals.list.invalidate();
            utils.bikes.list.invalidate();
          }}
        />
      )}
    </div>
  );
}
