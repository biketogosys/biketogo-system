/**
 * Formulário Público de Reserva — Bike To Go Floripa
 * Multi-step: Identificação → Contato → Endereço → Documentos → Bike/Período → Pagamento/LGPD
 */
import { useState, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, ChevronRight, ChevronLeft, Check, Upload, X } from "lucide-react";

// ─── Máscaras ──────────────────────────────────────────────────────────────────
function maskCPF(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}
function maskCEP(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d{0,3})/, "$1-$2");
}
function maskDate(v: string) {
  return v.replace(/\D/g, "").slice(0, 8)
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2");
}
function maskHeight(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 3);
  if (d.length >= 2) return d[0] + "." + d.slice(1);
  return d;
}

// ─── Validação CPF ─────────────────────────────────────────────────────────────
function validateCPF(cpf: string) {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(c[10]);
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function daysBetween(start: string, end: string) {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const GENDERS = ["Masculino","Feminino","Não-binário","Prefiro não informar"];
const PEDAL_FREQ = ["Nunca pedalo","1x por semana","2-3x por semana","Diariamente","Atleta/Profissional"];
const ORIGINS = ["Pela internet","Instagram","Indicação de amigo","Google","Shopify","Outro"];
const DOC_ORIGINS = ["Brasil (+55)","Argentina","Chile","Uruguai","EUA","Europa","Outro país"];

const TIMES: string[] = [];
for (let h = 9; h <= 19; h++) {
  TIMES.push(`${String(h).padStart(2,"0")}:00`);
  if (h < 19) TIMES.push(`${String(h).padStart(2,"0")}:30`);
}

const STEPS = ["Identificação","Contato","Endereço","Documentos","Reserva","Pagamento"];

// ─── Input styles ──────────────────────────────────────────────────────────────
const baseInput = "w-full bg-[#141420] border rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none transition-colors";
const normalInput = `${baseInput} border-[#2a2a3a] focus:border-[#C8920A]`;
const errorInput = `${baseInput} border-red-500/60 focus:border-red-400 bg-red-900/10`;

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#aaa]">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <span className="text-[11px] text-[#555]">{hint}</span>}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function PublicReservation() {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // Step 0 — Identificação
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [docOrigin, setDocOrigin] = useState("Brasil (+55)");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [pedalFreq, setPedalFreq] = useState("1x por semana");
  const [origin, setOrigin] = useState("Pela internet");

  // Step 1 — Contato
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [accommodation, setAccommodation] = useState("");

  // Step 2 — Endereço
  const [zipCode, setZipCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country] = useState("Brasil");
  const [cepLoading, setCepLoading] = useState(false);

  // Step 3 — Documentos
  const [docFrontPreview, setDocFrontPreview] = useState<string | null>(null);
  const [docBackPreview, setDocBackPreview] = useState<string | null>(null);
  const [docFrontBase64, setDocFrontBase64] = useState<string | null>(null);
  const [docBackBase64, setDocBackBase64] = useState<string | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  // Step 4 — Bike + Período
  const [selectedBikeId, setSelectedBikeId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [selectedAccessories, setSelectedAccessories] = useState<Record<number, number>>({});

  // Step 5 — Pagamento + LGPD
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix" | "cash">("card");
  const [lgpdConsent, setLgpdConsent] = useState(false);

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data: bikesRaw, isLoading: bikesLoading } = trpc.publicApi.availableBikes.useQuery();
  const { data: accessoriesRaw } = trpc.publicApi.availableAccessories.useQuery();
  const { data: deliveryFeeStr } = trpc.publicApi.deliveryFee.useQuery();
  const { data: discountRulesRaw } = trpc.publicApi.bikeDiscountRules.useQuery(
    { bikeId: selectedBikeId! }, { enabled: !!selectedBikeId }
  );
  const { data: availabilityResult } = trpc.publicApi.checkAvailability.useQuery(
    { bikeId: selectedBikeId!, startDate, endDate },
    { enabled: !!selectedBikeId && !!startDate && !!endDate }
  );

  const bikes = (bikesRaw ?? []) as any[];
  const accessories = (accessoriesRaw ?? []) as any[];
  const deliveryFee = parseFloat(deliveryFeeStr || "0");
  const discountRules = (discountRulesRaw ?? []) as any[];
  const isAvailable = availabilityResult ?? true;

  const submitMutation = trpc.publicApi.submitReservation.useMutation();
  const checkoutMutation = trpc.publicApi.createCheckout.useMutation();
  const uploadDocMutation = trpc.publicApi.uploadDocument.useMutation();

  // ─── Pricing ─────────────────────────────────────────────────────────────────
  const selectedBike = bikes.find(b => b.id === selectedBikeId);
  const numDays = startDate && endDate ? daysBetween(startDate, endDate) : 0;
  const dailyRate = parseFloat(selectedBike?.dailyRate || "0");

  const applicableDiscount = useMemo(() => {
    if (!discountRules.length || numDays <= 0) return 0;
    const sorted = [...discountRules].sort((a: any, b: any) => b.minDays - a.minDays);
    const rule = sorted.find((r: any) => numDays >= r.minDays);
    return rule ? parseFloat(rule.discountPercent) : 0;
  }, [discountRules, numDays]);

  const bikeSubtotal = dailyRate * numDays;
  const discountAmount = bikeSubtotal * (applicableDiscount / 100);
  const accTotal = useMemo(() => {
    let t = 0;
    for (const [id, qty] of Object.entries(selectedAccessories)) {
      if ((qty as number) <= 0) continue;
      const acc = accessories.find((a: any) => a.id === Number(id));
      if (acc) t += parseFloat(acc.dailyRate || "0") * numDays * (qty as number);
    }
    return t;
  }, [selectedAccessories, accessories, numDays]);
  const grandTotal = bikeSubtotal - discountAmount + accTotal + (selectedBikeId ? deliveryFee : 0);

  // ─── CEP autocomplete ─────────────────────────────────────────────────────────
  const fetchCEP = useCallback(async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setStreet(d.logradouro || "");
        setNeighborhood(d.bairro || "");
        setCity(d.localidade || "");
        setState(d.uf || "");
      }
    } catch {}
    finally { setCepLoading(false); }
  }, []);

  // ─── Document photo ───────────────────────────────────────────────────────────
  const handleDocPhoto = (side: "front" | "back", file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrors(e => ({ ...e, [side === "front" ? "docFront" : "docBack"]: "Arquivo muito grande (máx. 10 MB)" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = ev.target?.result as string;
      if (side === "front") { setDocFrontBase64(b64); setDocFrontPreview(b64); }
      else { setDocBackBase64(b64); setDocBackPreview(b64); }
      setErrors(e => { const n = { ...e }; delete n[side === "front" ? "docFront" : "docBack"]; return n; });
    };
    reader.readAsDataURL(file);
  };

  // ─── Validation ───────────────────────────────────────────────────────────────
  const validate = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!name.trim() || name.trim().length < 3) errs.name = "Nome completo obrigatório (mín. 3 caracteres)";
      if (!cpf || !validateCPF(cpf)) errs.cpf = "CPF inválido";
      if (!rg.trim()) errs.rg = "RG ou Passaporte obrigatório";
      if (!birthDate || birthDate.length < 10) errs.birthDate = "Data de nascimento inválida (dd/mm/aaaa)";
      if (!height) errs.height = "Altura obrigatória";
    }
    if (s === 1) {
      if (!phone || phone.replace(/\D/g,"").length < 10) errs.phone = "WhatsApp inválido";
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "E-mail inválido";
      if (!accommodation.trim()) errs.accommodation = "Informe onde está hospedado";
    }
    if (s === 2) {
      if (!zipCode || zipCode.replace(/\D/g,"").length < 8) errs.zipCode = "CEP inválido";
      if (!street.trim()) errs.street = "Endereço obrigatório";
      if (!number.trim()) errs.number = "Número obrigatório";
      if (!neighborhood.trim()) errs.neighborhood = "Bairro obrigatório";
      if (!city.trim()) errs.city = "Cidade obrigatória";
      if (!state) errs.state = "Estado obrigatório";
    }
    if (s === 3) {
      if (!docFrontBase64) errs.docFront = "Foto da frente do documento obrigatória";
      if (!docBackBase64) errs.docBack = "Foto do verso do documento obrigatória";
    }
    if (s === 4) {
      if (!selectedBikeId) errs.bikeId = "Selecione uma bicicleta";
      if (!startDate) errs.startDate = "Data de início obrigatória";
      if (!endDate) errs.endDate = "Data de devolução obrigatória";
      if (startDate && endDate && new Date(endDate) <= new Date(startDate)) errs.endDate = "Data de devolução deve ser após a data de início";
      if (!deliveryTime) errs.deliveryTime = "Horário de entrega obrigatório";
      if (availabilityResult === false) errs.bikeId = "Bicicleta indisponível para o período selecionado";
    }
    if (s === 5) {
      if (!lgpdConsent) errs.lgpdConsent = "Você deve aceitar os termos para continuar";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => { if (validate(step)) setStep(s => s + 1); };
  const prevStep = () => setStep(s => s - 1);

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate(5)) return;
    setSubmitting(true);
    try {
      const accArr = Object.entries(selectedAccessories)
        .filter(([, q]) => (q as number) > 0)
        .map(([id, qty]) => ({ accessoryId: Number(id), quantity: qty as number }));

      const res = await submitMutation.mutateAsync({
        name,
        cpf: cpf.replace(/\D/g,""),
        rg,
        birthDate: birthDate.split("/").reverse().join("-"),
        gender: gender || undefined,
        height,
        phone,
        email: email || undefined,
        instagram: instagram || undefined,
        accommodation,
        // Address
        zipCode: zipCode.replace(/\D/g,""),
        street,
        number,
        complement: complement || undefined,
        neighborhood,
        city,
        state,
        country,
        // Profile
        docOrigin,
        pedalFreq,
        howFound: origin,
        lgpdConsent,
        // Rental
        bikeId: selectedBikeId!,
        startDate,
        endDate,
        deliveryTime,
        totalAmount: grandTotal.toFixed(2),
        discountPercent: applicableDiscount.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        paymentMethod: paymentMethod === "cash" ? "cash" : "stripe",
        accessories: accArr,
      });

      // Upload document photos
      if (docFrontBase64 && res.clientId) {
        try { await uploadDocMutation.mutateAsync({ clientId: res.clientId, side: "front", base64: docFrontBase64, mimeType: "image/jpeg" }); } catch {}
      }
      if (docBackBase64 && res.clientId) {
        try { await uploadDocMutation.mutateAsync({ clientId: res.clientId, side: "back", base64: docBackBase64, mimeType: "image/jpeg" }); } catch {}
      }

      // Stripe checkout
      if (paymentMethod !== "cash" && res.rentalId) {
        const checkout = await checkoutMutation.mutateAsync({
          rentalId: res.rentalId,
          clientId: res.clientId,
          clientName: name,
          clientEmail: email || undefined,
          bikeModel: selectedBike?.model || "Bicicleta",
          startDate,
          endDate,
          totalAmountBRL: grandTotal,
          paymentType: paymentMethod,
          origin: window.location.origin,
        });
        setCheckoutUrl(checkout.checkoutUrl);
        window.open(checkout.checkoutUrl, "_blank");
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrors({ submit: err.message || "Erro ao enviar. Tente novamente." });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success ──────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#C8920A]/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-[#C8920A]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Reserva enviada!
          </h1>
          <p className="text-[#aaa] text-sm leading-relaxed mb-6">
            Recebemos sua solicitação. Nossa equipe entrará em contato pelo WhatsApp <strong className="text-white">{phone}</strong> para confirmar os detalhes da entrega.
          </p>
          {checkoutUrl && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 mb-4 text-left">
              <p className="text-amber-300 text-sm font-semibold mb-1">Pagamento pendente</p>
              <p className="text-amber-200/70 text-xs mb-2">Uma nova aba foi aberta para finalizar o pagamento via Stripe.</p>
              <a href={checkoutUrl} target="_blank" rel="noopener noreferrer"
                className="text-[#C8920A] text-sm underline font-medium">
                Clique aqui se a aba não abriu →
              </a>
            </div>
          )}
          <div className="bg-[#141420] border border-[#2a2a3a] rounded-xl p-5 text-left">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-[10px] text-[#666]">Bicicleta</p><p className="text-white font-medium">{selectedBike?.model}</p></div>
              <div><p className="text-[10px] text-[#666]">Período</p><p className="text-white font-medium">{numDays} dias</p></div>
              <div><p className="text-[10px] text-[#666]">Entrega às</p><p className="text-white font-medium">{deliveryTime}</p></div>
              <div><p className="text-[10px] text-[#666]">Total</p><p className="text-[#C8920A] font-bold">R$ {formatCurrency(grandTotal)}</p></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-[#1a1a2e] bg-[#0a0a0f]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#C8920A]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              🚲 Bike To Go Floripa
            </h1>
            <p className="text-xs text-[#666]">Aluguel de bicicletas</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#888]">Etapa {step + 1} de {STEPS.length}</p>
            <p className="text-sm font-semibold text-[#C8920A]">{STEPS[step]}</p>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-[#0d0d1a] border-b border-[#1a1a2e]">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex gap-1 mb-2">
            {STEPS.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-all"
                style={{ background: i <= step ? "#C8920A" : "#1a1a2e" }} />
            ))}
          </div>
          <div className="flex justify-between">
            {STEPS.map((s, i) => (
              <span key={i} className="text-[10px] transition-colors"
                style={{ color: i === step ? "#C8920A" : i < step ? "#7a6010" : "#444" }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-24">
        {/* Title */}
        <div className="text-center mb-8">
          <span className="inline-block bg-[#C8920A] text-[#0a0a0f] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
            Pré-Cadastro
          </span>
          <h2 className="text-3xl font-extrabold text-white mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Cadastre-se para <span className="text-[#C8920A]">alugar</span>
          </h2>
          <p className="text-[#888] text-sm max-w-md mx-auto leading-relaxed">
            Preencha o formulário abaixo para agilizar seu atendimento. Após o envio, nossa equipe entrará em contato pelo WhatsApp para confirmar sua reserva.
          </p>
        </div>

        {/* ─── STEP 0: Identificação ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a2e]">
              <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">👤 Identificação</span>
            </div>

            <Field label="Nome Completo" required error={errors.name}>
              <input className={errors.name ? errorInput : normalInput} placeholder="Seu nome completo"
                value={name} onChange={e => setName(e.target.value)} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="CPF" required error={errors.cpf}>
                <input className={errors.cpf ? errorInput : normalInput} placeholder="000.000.000-00"
                  value={cpf} onChange={e => setCpf(maskCPF(e.target.value))} />
              </Field>
              <Field label="Origem do Documento">
                <select className={normalInput} value={docOrigin} onChange={e => setDocOrigin(e.target.value)}>
                  {DOC_ORIGINS.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>

            <Field label="RG / Passaporte" required error={errors.rg}
              hint="Somente números e traços. Passaporte: informe o número completo.">
              <input className={errors.rg ? errorInput : normalInput} placeholder="Ex: 12.345.678-9"
                value={rg} onChange={e => setRg(e.target.value)} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Data de Nascimento" required error={errors.birthDate}>
                <input className={errors.birthDate ? errorInput : normalInput} placeholder="dd/mm/aaaa"
                  value={birthDate} onChange={e => setBirthDate(maskDate(e.target.value))} />
              </Field>
              <Field label="Gênero">
                <select className={normalInput} value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">Prefiro não informar</option>
                  {GENDERS.map(g => <option key={g}>{g}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Altura" required error={errors.height} hint="Usamos para indicar a bike ideal para você.">
                <input className={errors.height ? errorInput : normalInput} placeholder="Ex: 1.75"
                  value={height} onChange={e => setHeight(maskHeight(e.target.value))} />
              </Field>
              <Field label="Frequência de Pedalada">
                <select className={normalInput} value={pedalFreq} onChange={e => setPedalFreq(e.target.value)}>
                  {PEDAL_FREQ.map(f => <option key={f}>{f}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Como Nos Encontrou?">
              <select className={normalInput} value={origin} onChange={e => setOrigin(e.target.value)}>
                {ORIGINS.map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
          </div>
        )}

        {/* ─── STEP 1: Contato ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a2e]">
              <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">📞 Contato</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="WhatsApp" required error={errors.phone}>
                <input className={errors.phone ? errorInput : normalInput} placeholder="(48) 99999-9999"
                  value={phone} onChange={e => setPhone(maskPhone(e.target.value))} type="tel" />
              </Field>
              <Field label="E-Mail" error={errors.email}>
                <input className={errors.email ? errorInput : normalInput} placeholder="seu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} type="email" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Instagram">
                <input className={normalInput} placeholder="@seu.perfil"
                  value={instagram} onChange={e => setInstagram(e.target.value)} />
              </Field>
              <Field label="Onde Está Hospedado?" required error={errors.accommodation}
                hint="Bairro ou nome do local em Floripa.">
                <input className={errors.accommodation ? errorInput : normalInput}
                  placeholder="Hotel, pousada, airbnb..."
                  value={accommodation} onChange={e => setAccommodation(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Endereço ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a2e]">
              <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">🏠 Endereço de Residência</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="CEP" required error={errors.zipCode}>
                <div className="relative">
                  <input className={errors.zipCode ? errorInput : normalInput} placeholder="00000-000"
                    value={zipCode} onChange={e => { const v = maskCEP(e.target.value); setZipCode(v); fetchCEP(v); }} />
                  {cepLoading && <Loader2 className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-[#C8920A]" />}
                </div>
              </Field>
              <Field label="Estado" required error={errors.state}>
                <select className={errors.state ? errorInput : normalInput} value={state} onChange={e => setState(e.target.value)}>
                  <option value="">Selecione</option>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Cidade" required error={errors.city}>
                <input className={errors.city ? errorInput : normalInput} placeholder="Sua cidade"
                  value={city} onChange={e => setCity(e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Field label="Endereço" required error={errors.street}>
                  <input className={errors.street ? errorInput : normalInput} placeholder="Rua, Avenida..."
                    value={street} onChange={e => setStreet(e.target.value)} />
                </Field>
              </div>
              <Field label="Número" required error={errors.number}>
                <input className={errors.number ? errorInput : normalInput} placeholder="Nº"
                  value={number} onChange={e => setNumber(e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Complemento">
                <input className={normalInput} placeholder="Apto, bloco..."
                  value={complement} onChange={e => setComplement(e.target.value)} />
              </Field>
              <Field label="Bairro" required error={errors.neighborhood}>
                <input className={errors.neighborhood ? errorInput : normalInput} placeholder="Seu bairro"
                  value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Documentos ───────────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a2e]">
              <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">📄 Fotos do Documento</span>
            </div>
            <p className="text-sm text-[#888] leading-relaxed">
              Envie a <strong className="text-white">frente</strong> e o <strong className="text-white">verso</strong> do seu RG ou Passaporte. Ambas as fotos são obrigatórias para prosseguir.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {(["front", "back"] as const).map(side => {
                const preview = side === "front" ? docFrontPreview : docBackPreview;
                const err = side === "front" ? errors.docFront : errors.docBack;
                const ref = side === "front" ? frontRef : backRef;
                const label = side === "front" ? "Frente do documento" : "Verso do documento";
                return (
                  <div key={side} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#aaa]">{label}<span className="text-red-400 ml-0.5">*</span></label>
                    <div
                      onClick={() => ref.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer min-h-[140px] transition-all ${
                        err ? "border-red-500/60 bg-red-900/10" :
                        preview ? "border-[#C8920A]/60 bg-[#C8920A]/5" :
                        "border-[#2a2a3a] bg-[#141420] hover:border-[#C8920A]/40"
                      }`}>
                      {preview ? (
                        <>
                          <img src={preview} alt={label} className="max-h-28 max-w-full rounded-lg object-cover" />
                          <button onClick={e => { e.stopPropagation(); if (side === "front") { setDocFrontBase64(null); setDocFrontPreview(null); } else { setDocBackBase64(null); setDocBackPreview(null); } }}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center hover:bg-red-500">
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-[#C8920A]" />
                          <span className="text-sm text-[#888] font-medium">Clique ou arraste aqui</span>
                          <span className="text-[11px] text-[#555]">JPG, PNG ou HEIC · Máx. 10 MB</span>
                        </>
                      )}
                    </div>
                    <input ref={ref} type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && handleDocPhoto(side, e.target.files[0])} />
                    {err && <span className="text-[11px] text-red-400">{err}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── STEP 4: Bike + Período ───────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            {/* Bike selection */}
            <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-6">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a2e] mb-4">
                <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">🚲 Escolha a Bicicleta</span>
              </div>
              {bikesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#C8920A]" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bikes.filter((b: any) => b.status === "available").map((bike: any) => (
                    <div key={bike.id} onClick={() => setSelectedBikeId(bike.id)}
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${
                        selectedBikeId === bike.id
                          ? "border-[#C8920A] bg-[#C8920A]/10"
                          : "border-[#2a2a3a] bg-[#141420] hover:border-[#C8920A]/40"
                      }`}>
                      {bike.photoUrl && (
                        <img src={bike.photoUrl} alt={bike.model}
                          className="w-full h-24 object-cover rounded-lg mb-3" />
                      )}
                      <div className="font-bold text-sm text-white">{bike.model}</div>
                      {bike.brand && <div className="text-xs text-[#888]">{bike.brand}</div>}
                      {bike.category && <div className="text-[11px] text-[#555]">{bike.category}</div>}
                      <div className="mt-2 text-base font-bold text-[#C8920A]">
                        R$ {formatCurrency(parseFloat(bike.dailyRate || "0"))}/dia
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {errors.bikeId && <p className="text-red-400 text-xs mt-2">{errors.bikeId}</p>}
            </div>

            {/* Period & delivery */}
            <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a2e]">
                <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">📅 Período e Entrega</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Data de Início" required error={errors.startDate}>
                  <input type="date" className={errors.startDate ? errorInput : normalInput}
                    value={startDate} min={new Date().toISOString().split("T")[0]}
                    onChange={e => setStartDate(e.target.value)} />
                </Field>
                <Field label="Data de Devolução" required error={errors.endDate}>
                  <input type="date" className={errors.endDate ? errorInput : normalInput}
                    value={endDate} min={startDate || new Date().toISOString().split("T")[0]}
                    onChange={e => setEndDate(e.target.value)} />
                </Field>
              </div>

              <Field label="Horário de Entrega" required error={errors.deliveryTime}
                hint="Funcionamos das 09h às 19h. Considere uma margem de 15-30 min.">
                <select className={errors.deliveryTime ? errorInput : normalInput}
                  value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)}>
                  <option value="">Selecione o horário</option>
                  {TIMES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>

              {/* Availability indicator */}
              {selectedBikeId && startDate && endDate && (
                <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                  availabilityResult === false
                    ? "bg-red-900/20 border border-red-500/30 text-red-400"
                    : availabilityResult === true
                    ? "bg-green-900/20 border border-green-500/30 text-green-400"
                    : "bg-[#141420] border border-[#2a2a3a] text-[#888]"
                }`}>
                  {availabilityResult === true && "✓ Bicicleta disponível para o período!"}
                  {availabilityResult === false && "✗ Bicicleta indisponível para este período"}
                  {availabilityResult === undefined && "Verificando disponibilidade..."}
                </div>
              )}

              {/* Price summary */}
              {numDays > 0 && selectedBikeId && (
                <div className="bg-[#141420] border border-[#2a2a3a] rounded-xl p-4">
                  <p className="text-xs text-[#888] uppercase tracking-wider mb-3">Resumo do valor</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#aaa]">Bike ({numDays} dia{numDays > 1 ? "s" : ""} × R$ {formatCurrency(dailyRate)})</span><span className="text-white">R$ {formatCurrency(bikeSubtotal)}</span></div>
                    {applicableDiscount > 0 && <div className="flex justify-between text-green-400"><span>Desconto progressivo ({applicableDiscount}%)</span><span>- R$ {formatCurrency(discountAmount)}</span></div>}
                    {accTotal > 0 && <div className="flex justify-between"><span className="text-[#aaa]">Acessórios</span><span className="text-white">R$ {formatCurrency(accTotal)}</span></div>}
                    <div className="flex justify-between"><span className="text-[#aaa]">Taxa de entrega</span><span className="text-white">R$ {formatCurrency(deliveryFee)}</span></div>
                    <div className="flex justify-between border-t border-[#2a2a3a] pt-2 mt-1">
                      <span className="font-bold text-white">Total</span>
                      <span className="font-bold text-[#C8920A] text-lg">R$ {formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accessories */}
            {accessories.length > 0 && (
              <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-6">
                <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a2e] mb-4">
                  <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">🎒 Acessórios Opcionais</span>
                </div>
                <div className="space-y-2">
                  {accessories.map((acc: any) => {
                    const qty = selectedAccessories[acc.id] || 0;
                    return (
                      <div key={acc.id} className="flex items-center justify-between bg-[#141420] border border-[#2a2a3a] rounded-lg px-4 py-3">
                        <div>
                          <p className="text-sm text-white font-medium">{acc.name}</p>
                          <p className="text-xs text-[#666]">R$ {formatCurrency(parseFloat(acc.dailyRate || "0"))}/dia</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedAccessories(p => ({ ...p, [acc.id]: Math.max(0, qty - 1) }))}
                            className="w-7 h-7 rounded-md bg-[#1a1a2e] text-[#888] border border-[#2a2a3a] flex items-center justify-center text-sm hover:text-white">-</button>
                          <span className="text-sm font-medium w-5 text-center">{qty}</span>
                          <button onClick={() => setSelectedAccessories(p => ({ ...p, [acc.id]: Math.min(acc.quantity, qty + 1) }))}
                            className="w-7 h-7 rounded-md bg-[#1a1a2e] text-[#888] border border-[#2a2a3a] flex items-center justify-center text-sm hover:text-white">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 5: Pagamento + LGPD ─────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5">
            {/* Resumo final */}
            {numDays > 0 && selectedBikeId && (
              <div className="bg-[#C8920A]/10 border border-[#C8920A]/30 rounded-2xl p-5">
                <p className="text-xs text-[#C8920A] uppercase tracking-wider font-bold mb-3">📋 Resumo da Reserva</p>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div><p className="text-[10px] text-[#888]">Bicicleta</p><p className="text-white font-medium">{selectedBike?.model}</p></div>
                  <div><p className="text-[10px] text-[#888]">Período</p><p className="text-white font-medium">{numDays} dia{numDays > 1 ? "s" : ""}</p></div>
                  <div><p className="text-[10px] text-[#888]">Início</p><p className="text-white font-medium">{new Date(startDate + "T12:00").toLocaleDateString("pt-BR")}</p></div>
                  <div><p className="text-[10px] text-[#888]">Entrega às</p><p className="text-white font-medium">{deliveryTime}</p></div>
                </div>
                <div className="border-t border-[#C8920A]/20 pt-3 flex justify-between items-center">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-[#C8920A] font-extrabold text-2xl">R$ {formatCurrency(grandTotal)}</span>
                </div>
              </div>
            )}

            {/* Payment method */}
            <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a2e]">
                <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">💳 Forma de Pagamento</span>
              </div>
              {[
                { value: "card" as const, icon: "💳", label: "Cartão de Crédito", desc: "Pague online com segurança via Stripe" },
                { value: "pix" as const, icon: "⚡", label: "Pix", desc: "Pagamento instantâneo via Stripe" },
                { value: "cash" as const, icon: "🤝", label: "Pagar na Entrega", desc: "Pague presencialmente ao receber a bike" },
              ].map(opt => (
                <div key={opt.value} onClick={() => setPaymentMethod(opt.value)}
                  className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                    paymentMethod === opt.value
                      ? "border-[#C8920A] bg-[#C8920A]/10"
                      : "border-[#2a2a3a] bg-[#141420] hover:border-[#C8920A]/40"
                  }`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    paymentMethod === opt.value ? "border-[#C8920A]" : "border-[#555]"
                  }`}>
                    {paymentMethod === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-[#C8920A]" />}
                  </div>
                  <span className="text-xl">{opt.icon}</span>
                  <div>
                    <p className="font-bold text-sm text-white">{opt.label}</p>
                    <p className="text-xs text-[#666]">{opt.desc}</p>
                  </div>
                </div>
              ))}
              {paymentMethod !== "cash" && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg px-4 py-3 text-xs text-blue-300">
                  Após confirmar, você será redirecionado para o ambiente seguro do Stripe para finalizar o pagamento.
                </div>
              )}
            </div>

            {/* LGPD */}
            <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a2e]">
                <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">🛡️ Privacidade e Consentimento (LGPD)</span>
              </div>
              <div className="bg-[#141420] border border-[#2a2a3a] rounded-lg p-4 text-xs text-[#888] leading-relaxed">
                <strong className="text-white block mb-1">Termos de uso e privacidade</strong>
                Ao enviar este formulário, seus dados pessoais serão coletados pela Bike To Go Floripa exclusivamente para fins de cadastro, controle de aluguel de bicicletas e comunicação via WhatsApp. Suas informações serão tratadas de forma segura e confidencial, conforme a <strong className="text-white">Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>. Você pode solicitar a exclusão ou correção dos seus dados a qualquer momento entrando em contato pelo e-mail ou WhatsApp da loja.
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={lgpdConsent} onChange={e => setLgpdConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#C8920A] flex-shrink-0" />
                <span className="text-sm text-[#aaa] leading-relaxed">
                  Li e concordo com os termos acima e autorizo o uso dos meus dados pessoais conforme a LGPD.
                </span>
              </label>
              {errors.lgpdConsent && <p className="text-red-400 text-xs">{errors.lgpdConsent}</p>}
            </div>

            {errors.submit && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-sm text-red-400">
                {errors.submit}
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all disabled:opacity-50 bg-[#C8920A] text-[#0a0a0f] hover:bg-[#d9a020]">
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
              ) : paymentMethod === "cash" ? (
                <><Check className="w-5 h-5" /> Confirmar Reserva</>
              ) : (
                <><Check className="w-5 h-5" /> Confirmar e Pagar</>
              )}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className={`flex mt-6 gap-3 ${step === 0 ? "justify-end" : "justify-between"}`}>
          {step > 0 && (
            <button onClick={prevStep}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm text-[#888] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          {step < 5 && (
            <button onClick={nextStep}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all bg-[#C8920A] text-[#0a0a0f] hover:bg-[#d9a020]">
              Continuar <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>

      <footer className="border-t border-[#1a1a2e] py-6 text-center">
        <p className="text-xs text-[#555]">Bike To Go Floripa — Aluguel de bicicletas</p>
      </footer>
    </div>
  );
}
