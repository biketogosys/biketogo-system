import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, ChevronRight, ChevronLeft, Check, Bike, Calendar, Clock, User, ShoppingBag } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type BikeOption = {
  id: number;
  model: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  sizes: string | null;
  dailyRate: string | null;
  photoUrl: string | null;
  status: string;
  description: string | null;
  weight: string | null;
  weightLimit: string | null;
};

type AccessoryOption = {
  id: number;
  name: string;
  category: string | null;
  dailyRate: string | null;
  quantity: number;
};

type DiscountRule = {
  id: number;
  bikeId: number;
  minDays: number;
  discountPercent: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function generateTimeSlots(opening: string, closing: string): string[] {
  const slots: string[] = [];
  const [oh, om] = opening.split(":").map(Number);
  const [ch, cm] = closing.split(":").map(Number);
  let h = oh, m = om;
  while (h < ch || (h === ch && m <= cm)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) { h++; m = 0; }
  }
  return slots;
}

// ─── Step indicators ─────────────────────────────────────────────────────────
const STEPS = [
  { label: "Bicicleta", icon: Bike },
  { label: "Período", icon: Calendar },
  { label: "Dados", icon: User },
  { label: "Resumo", icon: Check },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-1 sm:gap-2">
            <div className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all
              ${active ? "bg-[#C8920A] text-[#0a0a0f]" : done ? "bg-[#C8920A]/20 text-[#C8920A]" : "bg-[#1a1a2e] text-[#666]"}
            `}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className={`w-3.5 h-3.5 ${done ? "text-[#C8920A]" : "text-[#333]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function PublicReservation() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Bike selection
  const [selectedBikeId, setSelectedBikeId] = useState<number | null>(null);
  const [bikeSearch, setBikeSearch] = useState("");

  // Dates & delivery
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");

  // Accessories
  const [selectedAccessories, setSelectedAccessories] = useState<Record<number, number>>({});

  // Client data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [instagram, setInstagram] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [notes, setNotes] = useState("");

  // Data fetching
  const { data: bikesRaw, isLoading: bikesLoading } = trpc.publicApi.availableBikes.useQuery();
  const { data: accessoriesRaw } = trpc.publicApi.availableAccessories.useQuery();
  const { data: deliveryFeeStr } = trpc.publicApi.deliveryFee.useQuery();

  const bikes = (bikesRaw ?? []) as BikeOption[];
  const accessoryOptions = (accessoriesRaw ?? []) as AccessoryOption[];
  const deliveryFee = parseFloat(deliveryFeeStr || "0");

  // Discount rules for selected bike
  const { data: discountRulesRaw } = trpc.publicApi.bikeDiscountRules.useQuery(
    { bikeId: selectedBikeId! },
    { enabled: !!selectedBikeId }
  );
  const discountRules = (discountRulesRaw ?? []) as DiscountRule[];

  // Availability check
  const { data: availabilityResult } = trpc.publicApi.checkAvailability.useQuery(
    { bikeId: selectedBikeId!, startDate, endDate },
    { enabled: !!selectedBikeId && !!startDate && !!endDate }
  );
  const isAvailable = availabilityResult ?? true;

  // Submit mutation
  const submitMutation = trpc.publicApi.submitReservation.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  // Filter bikes
  const availableBikes = useMemo(() => {
    return bikes
      .filter((b) => b.status === "available")
      .filter((b) => {
        if (!bikeSearch) return true;
        const q = bikeSearch.toLowerCase();
        return (
          b.model.toLowerCase().includes(q) ||
          (b.brand?.toLowerCase().includes(q)) ||
          (b.category?.toLowerCase().includes(q))
        );
      });
  }, [bikes, bikeSearch]);

  const selectedBike = bikes.find((b) => b.id === selectedBikeId);

  // Calculate pricing
  const numDays = startDate && endDate ? daysBetween(startDate, endDate) : 0;
  const dailyRate = parseFloat(selectedBike?.dailyRate || "0");

  const applicableDiscount = useMemo(() => {
    if (!discountRules.length || numDays <= 0) return 0;
    const sorted = [...discountRules].sort((a, b) => b.minDays - a.minDays);
    const rule = sorted.find((r) => numDays >= r.minDays);
    return rule ? parseFloat(rule.discountPercent) : 0;
  }, [discountRules, numDays]);

  const bikeSubtotal = dailyRate * numDays;
  const discountAmount = bikeSubtotal * (applicableDiscount / 100);
  const bikeTotal = bikeSubtotal - discountAmount;

  const accessoriesTotal = useMemo(() => {
    let total = 0;
    for (const [accId, qty] of Object.entries(selectedAccessories)) {
      if (qty <= 0) continue;
      const acc = accessoryOptions.find((a) => a.id === Number(accId));
      if (acc) total += parseFloat(acc.dailyRate || "0") * numDays * qty;
    }
    return total;
  }, [selectedAccessories, accessoryOptions, numDays]);

  const grandTotal = bikeTotal + accessoriesTotal + deliveryFee;

  // Time slots
  const timeSlots = useMemo(() => generateTimeSlots("09:00", "19:00"), []);

  // Today's date for min
  const today = new Date().toISOString().split("T")[0];

  // ─── Validation ────────────────────────────────────────────────────────────
  const canGoStep1 = !!selectedBikeId;
  const canGoStep2 = !!startDate && !!endDate && isAvailable && !!deliveryTime;
  const canGoStep3 = name.trim().length >= 2 && (phone.trim().length >= 8 || email.trim().length >= 5);

  // ─── Submit ────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!selectedBikeId) return;
    const accArr = Object.entries(selectedAccessories)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ accessoryId: Number(id), quantity: qty }));

    submitMutation.mutate({
      name,
      cpf,
      email,
      phone,
      instagram,
      accommodation,
      bikeId: selectedBikeId,
      startDate,
      endDate,
      deliveryTime,
      totalAmount: grandTotal.toFixed(2),
      discountPercent: applicableDiscount.toFixed(1),
      deliveryFee: deliveryFee.toFixed(2),
      paymentMethod: "other",
      notes,
      accessories: accArr,
    });
  }

  // ─── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#C8920A]/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-[#C8920A]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Reserva Enviada!
          </h1>
          <p className="text-[#aaa] text-sm leading-relaxed mb-6">
            Sua reserva foi recebida com sucesso. Entraremos em contato em breve
            para confirmar os detalhes da entrega.
          </p>
          <div className="bg-[#141420] border border-[#2a2a3a] rounded-xl p-5 text-left mb-6">
            <p className="text-xs text-[#888] mb-1">Bicicleta</p>
            <p className="text-sm text-white font-medium mb-3">{selectedBike?.model}</p>
            <p className="text-xs text-[#888] mb-1">Período</p>
            <p className="text-sm text-white font-medium mb-3">
              {new Date(startDate + "T12:00").toLocaleDateString("pt-BR")} a{" "}
              {new Date(endDate + "T12:00").toLocaleDateString("pt-BR")}
            </p>
            <p className="text-xs text-[#888] mb-1">Valor total</p>
            <p className="text-lg text-[#C8920A] font-bold">R$ {formatCurrency(grandTotal)}</p>
          </div>
          <p className="text-xs text-[#666]">
            Dúvidas? Fale conosco pelo Instagram <strong>@biketogofloripa</strong>
          </p>
        </div>
      </div>
    );
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (bikesLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C8920A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-[#1a1a2e] bg-[#0a0a0f]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#C8920A]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Bike To Go
            </h1>
            <p className="text-[10px] text-[#666] uppercase tracking-widest">Florianópolis</p>
          </div>
          <span className="text-xs text-[#555] bg-[#141420] px-3 py-1.5 rounded-full border border-[#2a2a3a]">
            Reserva Online
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <StepIndicator current={step} />

        {/* ─── Step 0: Bike Selection ─────────────────────────────────────── */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Escolha sua bicicleta
            </h2>
            <p className="text-sm text-[#888] mb-6">
              Selecione o modelo ideal para sua aventura em Floripa
            </p>

            {/* Search */}
            <input
              type="text"
              placeholder="Buscar por modelo, marca ou categoria..."
              value={bikeSearch}
              onChange={(e) => setBikeSearch(e.target.value)}
              className="w-full bg-[#141420] border border-[#2a2a3a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#C8920A] focus:outline-none mb-6"
            />

            {/* Bike grid */}
            {availableBikes.length === 0 ? (
              <div className="text-center py-12 text-[#666]">
                <Bike className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma bicicleta disponível no momento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableBikes.map((bike) => {
                  const isSelected = selectedBikeId === bike.id;
                  return (
                    <button
                      key={bike.id}
                      onClick={() => setSelectedBikeId(bike.id)}
                      className={`
                        text-left rounded-xl border p-4 transition-all
                        ${isSelected
                          ? "border-[#C8920A] bg-[#C8920A]/10 ring-1 ring-[#C8920A]/30"
                          : "border-[#2a2a3a] bg-[#141420] hover:border-[#3a3a4a]"}
                      `}
                    >
                      {/* Photo placeholder or image */}
                      {bike.photoUrl ? (
                        <img
                          src={bike.photoUrl}
                          alt={bike.model}
                          className="w-full h-36 object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="w-full h-36 bg-[#1a1a2e] rounded-lg mb-3 flex items-center justify-center">
                          <Bike className="w-10 h-10 text-[#333]" />
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{bike.model}</p>
                          {bike.brand && (
                            <p className="text-xs text-[#888]">{bike.brand}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {bike.category && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] text-[#888] border border-[#2a2a3a]">
                                {bike.category}
                              </span>
                            )}
                            {bike.size && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] text-[#888] border border-[#2a2a3a]">
                                Aro {bike.size}
                              </span>
                            )}
                          </div>
                        </div>
                        {bike.dailyRate && (
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-[#C8920A]">
                              R$ {formatCurrency(parseFloat(bike.dailyRate))}
                            </p>
                            <p className="text-[10px] text-[#666]">/dia</p>
                          </div>
                        )}
                      </div>

                      {bike.description && (
                        <p className="text-xs text-[#666] mt-2 line-clamp-2">{bike.description}</p>
                      )}

                      {(bike.weight || bike.weightLimit) && (
                        <div className="flex gap-3 mt-2">
                          {bike.weight && (
                            <span className="text-[10px] text-[#666]">Peso: {bike.weight}kg</span>
                          )}
                          {bike.weightLimit && (
                            <span className="text-[10px] text-[#666]">Limite: {bike.weightLimit}kg</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Next */}
            <div className="flex justify-end mt-8">
              <button
                onClick={() => setStep(1)}
                disabled={!canGoStep1}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#C8920A] text-[#0a0a0f] hover:bg-[#d9a020]"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 1: Dates & Delivery ───────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Período e entrega
            </h2>
            <p className="text-sm text-[#888] mb-6">
              Selecione as datas e o horário de entrega da bicicleta
            </p>

            <div className="space-y-6">
              {/* Selected bike summary */}
              {selectedBike && (
                <div className="bg-[#141420] border border-[#2a2a3a] rounded-xl p-4 flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#1a1a2e] rounded-lg flex items-center justify-center shrink-0">
                    {selectedBike.photoUrl ? (
                      <img src={selectedBike.photoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Bike className="w-6 h-6 text-[#444]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{selectedBike.model}</p>
                    <p className="text-xs text-[#888]">{selectedBike.brand} {selectedBike.category && `· ${selectedBike.category}`}</p>
                    <p className="text-sm text-[#C8920A] font-semibold mt-0.5">
                      R$ {formatCurrency(dailyRate)}/dia
                    </p>
                  </div>
                </div>
              )}

              {/* Date range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Data de início</label>
                  <input
                    type="date"
                    value={startDate}
                    min={today}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate && e.target.value > endDate) setEndDate("");
                    }}
                    className="w-full bg-[#141420] border border-[#2a2a3a] rounded-lg px-4 py-3 text-sm text-white focus:border-[#C8920A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Data de devolução</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || today}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#141420] border border-[#2a2a3a] rounded-lg px-4 py-3 text-sm text-white focus:border-[#C8920A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Availability warning */}
              {startDate && endDate && !isAvailable && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                  Bicicleta não disponível para este período. Escolha outras datas.
                </div>
              )}

              {/* Delivery time */}
              <div>
                <label className="block text-xs text-[#888] mb-1.5">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  Horário de entrega
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setDeliveryTime(slot)}
                      className={`
                        py-2 rounded-lg text-xs font-medium transition-all border
                        ${deliveryTime === slot
                          ? "bg-[#C8920A] text-[#0a0a0f] border-[#C8920A]"
                          : "bg-[#141420] text-[#888] border-[#2a2a3a] hover:border-[#3a3a4a]"}
                      `}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#555] mt-1.5">
                  Horários sujeitos a margem de 15-30 min devido ao trânsito
                </p>
              </div>

              {/* Accessories */}
              {accessoryOptions.length > 0 && (
                <div>
                  <label className="block text-xs text-[#888] mb-2">
                    <ShoppingBag className="w-3.5 h-3.5 inline mr-1" />
                    Acessórios opcionais
                  </label>
                  <div className="space-y-2">
                    {accessoryOptions.map((acc) => {
                      const qty = selectedAccessories[acc.id] || 0;
                      return (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between bg-[#141420] border border-[#2a2a3a] rounded-lg px-4 py-3"
                        >
                          <div>
                            <p className="text-sm text-white">{acc.name}</p>
                            <p className="text-xs text-[#666]">
                              R$ {formatCurrency(parseFloat(acc.dailyRate || "0"))}/dia
                              {acc.category && ` · ${acc.category}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedAccessories((prev) => ({
                                ...prev,
                                [acc.id]: Math.max(0, qty - 1),
                              }))}
                              className="w-7 h-7 rounded-md bg-[#1a1a2e] text-[#888] border border-[#2a2a3a] flex items-center justify-center text-sm hover:text-white"
                            >
                              -
                            </button>
                            <span className="text-sm font-medium w-5 text-center">{qty}</span>
                            <button
                              onClick={() => setSelectedAccessories((prev) => ({
                                ...prev,
                                [acc.id]: Math.min(acc.quantity, qty + 1),
                              }))}
                              className="w-7 h-7 rounded-md bg-[#1a1a2e] text-[#888] border border-[#2a2a3a] flex items-center justify-center text-sm hover:text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price summary */}
              {numDays > 0 && (
                <div className="bg-[#141420] border border-[#2a2a3a] rounded-xl p-5">
                  <h3 className="text-xs text-[#888] uppercase tracking-wider mb-3">Resumo do valor</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#aaa]">Bicicleta ({numDays} {numDays === 1 ? "dia" : "dias"})</span>
                      <span className="text-white">R$ {formatCurrency(bikeSubtotal)}</span>
                    </div>
                    {applicableDiscount > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span>Desconto ({applicableDiscount}%)</span>
                        <span>- R$ {formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {accessoriesTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#aaa]">Acessórios</span>
                        <span className="text-white">R$ {formatCurrency(accessoriesTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#aaa]">Taxa de entrega</span>
                      <span className="text-white">R$ {formatCurrency(deliveryFee)}</span>
                    </div>
                    <div className="border-t border-[#2a2a3a] pt-2 mt-2 flex justify-between">
                      <span className="font-semibold text-white">Total</span>
                      <span className="font-bold text-[#C8920A] text-lg">R$ {formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Nav */}
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm text-[#888] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canGoStep2}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#C8920A] text-[#0a0a0f] hover:bg-[#d9a020]"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Client Data ────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Seus dados
            </h2>
            <p className="text-sm text-[#888] mb-6">
              Preencha seus dados para finalizar a reserva
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Nome completo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full bg-[#141420] border border-[#2a2a3a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#C8920A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-[#141420] border border-[#2a2a3a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#C8920A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Telefone / WhatsApp *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(48) 99999-9999"
                    className="w-full bg-[#141420] border border-[#2a2a3a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#C8920A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">CPF</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-[#141420] border border-[#2a2a3a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#C8920A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Instagram</label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@seuinstagram"
                    className="w-full bg-[#141420] border border-[#2a2a3a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#C8920A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1.5">Hospedagem em Floripa</label>
                <input
                  type="text"
                  value={accommodation}
                  onChange={(e) => setAccommodation(e.target.value)}
                  placeholder="Nome do hotel, pousada ou endereço"
                  className="w-full bg-[#141420] border border-[#2a2a3a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#C8920A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1.5">Observações</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguma informação adicional? (altura, preferências, etc.)"
                  rows={3}
                  className="w-full bg-[#141420] border border-[#2a2a3a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#C8920A] focus:outline-none resize-none"
                />
              </div>
            </div>

            <p className="text-[10px] text-[#555] mt-3">* Campos obrigatórios (nome + email ou telefone)</p>

            {/* Nav */}
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm text-[#888] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canGoStep3}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#C8920A] text-[#0a0a0f] hover:bg-[#d9a020]"
              >
                Revisar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Summary & Confirm ──────────────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Confirme sua reserva
            </h2>
            <p className="text-sm text-[#888] mb-6">
              Revise todos os detalhes antes de enviar
            </p>

            <div className="space-y-4">
              {/* Bike */}
              <div className="bg-[#141420] border border-[#2a2a3a] rounded-xl p-5">
                <h3 className="text-xs text-[#C8920A] uppercase tracking-wider mb-3 font-semibold">Bicicleta</h3>
                <p className="text-sm text-white font-medium">{selectedBike?.model}</p>
                <p className="text-xs text-[#888]">
                  {selectedBike?.brand} {selectedBike?.category && `· ${selectedBike.category}`}
                  {selectedBike?.size && ` · Aro ${selectedBike.size}`}
                </p>
              </div>

              {/* Period */}
              <div className="bg-[#141420] border border-[#2a2a3a] rounded-xl p-5">
                <h3 className="text-xs text-[#C8920A] uppercase tracking-wider mb-3 font-semibold">Período</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] text-[#666] mb-0.5">Início</p>
                    <p className="text-white">{new Date(startDate + "T12:00").toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#666] mb-0.5">Devolução</p>
                    <p className="text-white">{new Date(endDate + "T12:00").toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#666] mb-0.5">Entrega às</p>
                    <p className="text-white">{deliveryTime}</p>
                  </div>
                </div>
                <p className="text-xs text-[#666] mt-2">{numDays} {numDays === 1 ? "dia" : "dias"} de aluguel</p>
              </div>

              {/* Accessories */}
              {Object.entries(selectedAccessories).filter(([, q]) => q > 0).length > 0 && (
                <div className="bg-[#141420] border border-[#2a2a3a] rounded-xl p-5">
                  <h3 className="text-xs text-[#C8920A] uppercase tracking-wider mb-3 font-semibold">Acessórios</h3>
                  {Object.entries(selectedAccessories)
                    .filter(([, q]) => q > 0)
                    .map(([id, qty]) => {
                      const acc = accessoryOptions.find((a) => a.id === Number(id));
                      if (!acc) return null;
                      return (
                        <div key={id} className="flex justify-between text-sm mb-1">
                          <span className="text-[#aaa]">{acc.name} x{qty}</span>
                          <span className="text-white">
                            R$ {formatCurrency(parseFloat(acc.dailyRate || "0") * numDays * qty)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Client */}
              <div className="bg-[#141420] border border-[#2a2a3a] rounded-xl p-5">
                <h3 className="text-xs text-[#C8920A] uppercase tracking-wider mb-3 font-semibold">Seus dados</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-[#666]">Nome</p>
                    <p className="text-white">{name}</p>
                  </div>
                  {email && (
                    <div>
                      <p className="text-[10px] text-[#666]">Email</p>
                      <p className="text-white">{email}</p>
                    </div>
                  )}
                  {phone && (
                    <div>
                      <p className="text-[10px] text-[#666]">Telefone</p>
                      <p className="text-white">{phone}</p>
                    </div>
                  )}
                  {accommodation && (
                    <div>
                      <p className="text-[10px] text-[#666]">Hospedagem</p>
                      <p className="text-white">{accommodation}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="bg-[#C8920A]/10 border border-[#C8920A]/30 rounded-xl p-5">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#aaa]">Bicicleta ({numDays} dias)</span>
                    <span className="text-white">R$ {formatCurrency(bikeSubtotal)}</span>
                  </div>
                  {applicableDiscount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Desconto ({applicableDiscount}%)</span>
                      <span>- R$ {formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  {accessoriesTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#aaa]">Acessórios</span>
                      <span className="text-white">R$ {formatCurrency(accessoriesTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#aaa]">Taxa de entrega</span>
                    <span className="text-white">R$ {formatCurrency(deliveryFee)}</span>
                  </div>
                  <div className="border-t border-[#C8920A]/20 pt-3 mt-3 flex justify-between items-center">
                    <span className="font-semibold text-white text-base">Total</span>
                    <span className="font-bold text-[#C8920A] text-2xl">R$ {formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {submitMutation.isError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 mt-4">
                {submitMutation.error?.message || "Erro ao enviar reserva. Tente novamente."}
              </div>
            )}

            {/* Nav */}
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm text-[#888] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 bg-[#C8920A] text-[#0a0a0f] hover:bg-[#d9a020]"
              >
                {submitMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Check className="w-4 h-4" /> Confirmar Reserva</>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1a2e] mt-12 py-6 text-center">
        <p className="text-xs text-[#555]">
          Bike To Go Floripa — Aluguel de bicicletas
        </p>
      </footer>
    </div>
  );
}
