import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Bike, Search, X, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RentalStatus = "active" | "returned" | "overdue" | "cancelled";

const rentalStatusConfig: Record<RentalStatus, { cls: string; label: string }> = {
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
    { search: inputValue, limit: 10, offset: 0 },
    { enabled: open || inputValue.length > 0 }
  );

  const clients = data?.items ?? [];

  // Close on outside click
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

// ─── New Rental Dialog ────────────────────────────────────────────────────────
function NewRentalDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { data: bikesData } = trpc.bikes.list.useQuery({ status: "available" });
  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    bikeId: "",
    startDate: new Date().toISOString().split("T")[0],
    expectedReturnDate: "",
    dailyRate: "",
    totalAmount: "",
    paymentMethod: "",
    notes: "",
  });

  const createMutation = trpc.rentals.create.useMutation({
    onSuccess: () => { toast.success("Aluguel registrado!"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) return toast.error("Selecione um cliente.");
    if (!form.bikeId) return toast.error("Selecione uma bicicleta.");
    createMutation.mutate({
      clientId: parseInt(form.clientId),
      bikeId: parseInt(form.bikeId),
      startDate: form.startDate,
      endDate: form.expectedReturnDate || undefined,
      dailyRate: form.dailyRate || undefined,
      totalAmount: form.totalAmount || undefined,
      paymentMethod: (form.paymentMethod || undefined) as any,
      notes: form.notes || undefined,
    });
  };

  const bikes = bikesData ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-semibold text-foreground">Novo Aluguel</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Client autocomplete */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Cliente *</Label>
            <ClientAutocomplete
              value={form.clientId}
              onChange={(id, name) => setForm({ ...form, clientId: id, clientName: name })}
            />
            {form.clientId && (
              <p className="text-xs text-[#C8920A] mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" /> {form.clientName} selecionado(a)
              </p>
            )}
          </div>

          {/* Bike select */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Bicicleta *</Label>
            <select
              value={form.bikeId}
              onChange={(e) => setForm({ ...form, bikeId: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#C8920A] focus:border-[#C8920A]"
            >
              <option value="">Selecionar bicicleta disponível...</option>
              {bikes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.model} — #{b.serialNumber} {b.size ? `(${b.size})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Data de saída *</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Devolução prevista</Label>
              <Input
                type="date"
                value={form.expectedReturnDate}
                onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Diária (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.dailyRate}
                onChange={(e) => setForm({ ...form, dailyRate: e.target.value })}
                placeholder="0,00"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Total (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                placeholder="0,00"
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Forma de pagamento</Label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#C8920A] focus:border-[#C8920A]"
            >
              <option value="">Selecionar...</option>
              <option value="pix">PIX</option>
              <option value="credit_card">Cartão de crédito</option>
              <option value="debit_card">Cartão de débito</option>
              <option value="cash">Dinheiro</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Observações</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="bg-secondary border-border"
              placeholder="Observações opcionais..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-[#C8920A] hover:bg-[#A87608] text-white"
            >
              {createMutation.isPending ? "Registrando..." : "Registrar aluguel"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Rentals() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RentalStatus | undefined>(undefined);
  const [showNew, setShowNew] = useState(false);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.rentals.list.useQuery({
    status: statusFilter,
    limit: 100,
    offset: 0,
  });

  // Load all clients once to show names in table
  const { data: allClients } = trpc.clients.list.useQuery({ limit: 500, offset: 0 });
  const { data: allBikes } = trpc.bikes.list.useQuery({});
  const clientMap = Object.fromEntries((allClients?.items ?? []).map((c) => [c.id, c.name]));
  const bikeMap = Object.fromEntries((allBikes ?? []).map((b) => [b.id, `${b.model} #${b.serialNumber}`]));

  const returnMutation = trpc.rentals.update.useMutation({
    onSuccess: () => {
      toast.success("Devolução registrada!");
      utils.rentals.list.invalidate();
      utils.bikes.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rentals = (data?.items ?? []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const clientName = clientMap[r.clientId]?.toLowerCase() ?? "";
    const bikeName = bikeMap[r.bikeId]?.toLowerCase() ?? "";
    return clientName.includes(q) || bikeName.includes(q) || String(r.id).includes(q);
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
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

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
            {([undefined, "active", "returned", "overdue", "cancelled"] as (RentalStatus | undefined)[]).map((s) => (
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

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-[#C8920A]" />
          </div>
        ) : rentals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Bike className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhum aluguel encontrado</p>
          </div>
        ) : (
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
                        ? { pix: "PIX", credit_card: "Crédito", debit_card: "Débito", cash: "Dinheiro", other: "Outro" }[rental.paymentMethod] ?? rental.paymentMethod
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={rentalStatusConfig[rental.status as RentalStatus]?.cls ?? "badge-lead"}>
                        {rentalStatusConfig[rental.status as RentalStatus]?.label ?? rental.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {rental.status === "active" && (
                        <button
                          onClick={() =>
                            returnMutation.mutate({
                              id: rental.id,
                              returnedAt: new Date(),
                              status: "returned",
                            })
                          }
                          className="text-xs text-[#C8920A] hover:underline"
                        >
                          Devolver
                        </button>
                      )}
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
                  {rental.status === "active" && (
                    <button
                      onClick={() =>
                        returnMutation.mutate({
                          id: rental.id,
                          returnedAt: new Date(),
                          status: "returned",
                        })
                      }
                      className="mt-2 text-xs text-[#C8920A] hover:underline"
                    >
                      Registrar devolução
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showNew && (
          <NewRentalDialog
            onClose={() => setShowNew(false)}
            onSuccess={() => {
              setShowNew(false);
              utils.rentals.list.invalidate();
              utils.bikes.list.invalidate();
            }}
          />
        )}
    </div>
  );
}
