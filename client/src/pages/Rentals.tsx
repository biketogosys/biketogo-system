import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Bike, Search, X, Check, Package, Truck, Clock, Trash2, AlertTriangle, RotateCcw, Archive } from "lucide-react";
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

// Helper: generate time slots
function generateTimeSlots(start = "09:00", end = "19:00") {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let h = sh, m = sm;
  while (h < eh || (h === eh && m <= em)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) { h++; m = 0; }
  }
  return slots;
}

// Helper: calculate days between dates
function daysBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

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

// ─── New Rental Dialog ────────────────────────────────────────────────────────
function NewRentalDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { data: bikesData } = trpc.bikes.list.useQuery({ status: "available" });
  const { data: accessoriesData } = trpc.accessories.list.useQuery({ status: "available" });
  const { data: settingsData } = trpc.settings.getAll.useQuery();

  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    bikeId: "",
    startDate: new Date().toISOString().split("T")[0],
    expectedReturnDate: "",
    deliveryTime: "",
    includeDelivery: false,
    dailyRate: "",
    totalAmount: "",
    paymentMethod: "",
    paymentType: "presencial" as "online" | "presencial",
    notes: "",
  });

  // Selected accessories: { [accessoryId]: quantity }
  const [selectedAccessories, setSelectedAccessories] = useState<Record<number, number>>({});

  // Settings
  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    (settingsData ?? []).forEach((s: any) => { map[s.key] = s.value; });
    return map;
  }, [settingsData]);
  const deliveryFee = parseFloat(settingsMap["delivery_fee"] || "30");
  const timeSlots = useMemo(() => generateTimeSlots(
    settingsMap["opening_time"] || "09:00",
    settingsMap["closing_time"] || "19:00"
  ), [settingsMap]);

  // Auto-fill daily rate from selected bike
  const selectedBike = useMemo(() => {
    if (!form.bikeId) return null;
    const bikesArr = (bikesData as any)?.data ?? (Array.isArray(bikesData) ? bikesData : []);
    return (bikesArr as any[]).find((b: any) => b.id === parseInt(form.bikeId));
  }, [form.bikeId, bikesData]);

  // Discount rules for selected bike
  const { data: discountRules } = trpc.bikes.discountRules.useQuery(
    { bikeId: parseInt(form.bikeId) },
    { enabled: !!form.bikeId }
  );

  // Auto-calculate
  const numDays = daysBetween(form.startDate, form.expectedReturnDate);
  const baseRate = form.dailyRate ? parseFloat(form.dailyRate) : (selectedBike?.dailyRate ? parseFloat(selectedBike.dailyRate) : 0);

  // Find best discount
  const discountPercent = useMemo(() => {
    if (!discountRules || numDays <= 0) return 0;
    const sorted = [...discountRules].sort((a: any, b: any) => b.minDays - a.minDays);
    const rule = sorted.find((r: any) => numDays >= r.minDays);
    return rule ? parseFloat(rule.discountPercent) : 0;
  }, [discountRules, numDays]);

  const subtotal = baseRate * numDays;
  const discountAmount = subtotal * (discountPercent / 100);
  const deliveryTotal = form.includeDelivery ? deliveryFee : 0;
  const calculatedTotal = subtotal - discountAmount + deliveryTotal;

  // Auto-fill daily rate when bike changes
  useEffect(() => {
    if (selectedBike?.dailyRate && !form.dailyRate) {
      setForm(prev => ({ ...prev, dailyRate: String(selectedBike.dailyRate) }));
    }
  }, [selectedBike]);

  const createMutation = trpc.rentals.create.useMutation({
    onSuccess: () => { toast.success("Aluguel registrado!"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) return toast.error("Selecione um cliente.");
    if (!form.bikeId) return toast.error("Selecione uma bicicleta.");

    // Build accessories note
    const accessoryList = Object.entries(selectedAccessories)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ id: parseInt(id), quantity: qty }));

    const accessoryNote = accessoryList.length > 0
      ? `Acessórios: ${accessoryList.map((a) => {
          const accArr = (accessoriesData as any)?.data ?? (Array.isArray(accessoriesData) ? accessoriesData : []);
          const acc = (accArr as any[]).find((x: any) => x.id === a.id);
          return `${acc?.name ?? `#${a.id}`} (x${a.quantity})`;
        }).join(", ")}`
      : "";

    const deliveryNote = form.includeDelivery
      ? `Entrega: R$ ${deliveryFee.toFixed(2)}${form.deliveryTime ? ` às ${form.deliveryTime}` : ""}`
      : "";

    const discountNote = discountPercent > 0
      ? `Desconto: ${discountPercent}% (${numDays} dias)`
      : "";

    const finalNotes = [form.notes, accessoryNote, deliveryNote, discountNote].filter(Boolean).join("\n");

    const finalTotal = form.totalAmount ? form.totalAmount : String(calculatedTotal.toFixed(2));

    createMutation.mutate({
      clientId: parseInt(form.clientId),
      bikeId: parseInt(form.bikeId),
      startDate: form.startDate,
      endDate: form.expectedReturnDate || undefined,
      dailyRate: form.dailyRate || undefined,
      totalAmount: finalTotal || undefined,
      paymentMethod: (form.paymentMethod || undefined) as any,
      notes: finalNotes || undefined,
    });
  };

  function toggleAccessory(id: number) {
    setSelectedAccessories((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  }

  function setAccessoryQty(id: number, qty: number) {
    if (qty < 1) return;
    setSelectedAccessories((prev) => ({ ...prev, [id]: qty }));
  }

  const bikes = (bikesData as any)?.data ?? (Array.isArray(bikesData) ? bikesData : []);
  const accessories = (accessoriesData as any)?.data ?? (Array.isArray(accessoriesData) ? accessoriesData : []);
  const selectedCount = Object.keys(selectedAccessories).length;

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
              {(bikes as any[]).map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.model} — #{b.serialNumber} {b.size ? `(${b.size})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Accessories */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Acessórios
              {selectedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#C8920A]/20 text-[#C8920A] text-[10px] font-semibold">
                  {selectedCount} selecionado(s)
                </span>
              )}
            </Label>
            {accessories.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-secondary rounded-md px-3 py-2">
                Nenhum acessório disponível no momento
              </p>
            ) : (
              <div className="bg-secondary rounded-md border border-border divide-y divide-border/50 max-h-40 overflow-y-auto">
                {(accessories as any[]).map((acc: any) => {
                  const isSelected = !!selectedAccessories[acc.id];
                  return (
                    <div key={acc.id} className="flex items-center gap-3 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleAccessory(acc.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-[#C8920A] border-[#C8920A]"
                            : "border-border bg-background hover:border-[#C8920A]/50"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground truncate">{acc.name}</span>
                        {acc.category && (
                          <span className="text-xs text-muted-foreground ml-1.5">({acc.category})</span>
                        )}
                        {acc.dailyRate && (
                          <span className="text-xs text-[#C8920A] ml-1.5">
                            R$ {parseFloat(acc.dailyRate).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/dia
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setAccessoryQty(acc.id, (selectedAccessories[acc.id] ?? 1) - 1)}
                            className="w-5 h-5 rounded bg-background border border-border text-xs flex items-center justify-center hover:border-[#C8920A]/50"
                          >
                            −
                          </button>
                          <span className="text-xs text-foreground w-4 text-center">
                            {selectedAccessories[acc.id]}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAccessoryQty(acc.id, (selectedAccessories[acc.id] ?? 1) + 1)}
                            className="w-5 h-5 rounded bg-background border border-border text-xs flex items-center justify-center hover:border-[#C8920A]/50"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

          {/* Delivery option */}
          <div className="bg-secondary/50 rounded-lg border border-border p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.includeDelivery}
                onChange={(e) => setForm({ ...form, includeDelivery: e.target.checked })}
                className="rounded border-border"
              />
              <Truck className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-foreground">Incluir entrega</span>
              <span className="text-xs text-muted-foreground ml-auto">+ R$ {deliveryFee.toFixed(2)}</span>
            </label>
            {form.includeDelivery && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Horário de entrega
                </Label>
                <select
                  value={form.deliveryTime}
                  onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
                >
                  <option value="">Selecionar horário...</option>
                  {timeSlots.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
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
              <Label className="text-xs text-muted-foreground mb-1.5 block">Total manual (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                placeholder={calculatedTotal > 0 ? calculatedTotal.toFixed(2) : "0,00"}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          {/* Auto-calculation summary */}
          {numDays > 0 && baseRate > 0 && (
            <div className="bg-secondary/50 rounded-lg border border-border p-3 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>{numDays} dia(s) x R$ {baseRate.toFixed(2)}</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Desconto progressivo ({discountPercent}%)</span>
                  <span>- R$ {discountAmount.toFixed(2)}</span>
                </div>
              )}
              {form.includeDelivery && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Entrega</span>
                  <span>+ R$ {deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border">
                <span>Total calculado</span>
                <span className="text-[#C8920A]">R$ {calculatedTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
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
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tipo</Label>
              <select
                value={form.paymentType}
                onChange={(e) => setForm({ ...form, paymentType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
              >
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Observações</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground resize-none"
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
                      ? { pix: "PIX", credit_card: "Crédito", debit_card: "Débito", cash: "Dinheiro", stripe: "Stripe", other: "Outro" }[rental.paymentMethod] ?? rental.paymentMethod
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
