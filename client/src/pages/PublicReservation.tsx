/*
 * PublicReservation.tsx — Formulário público de pré-cadastro e reserva
 * Fluxo multi-step: Identificação → Contato → Endereço → Documentos → Bike/Período → Pagamento/LGPD
 * Suporte a idiomas: PT-BR 🇧🇷 | EN 🇺🇸 | ES 🇪🇸
 *
 * Bloco E — melhorias visuais:
 *  - Header com logo via VITE_LOGO_URL (fallback texto)
 *  - Barra de progresso com steps clicáveis (steps anteriores)
 *  - Bikes: placeholder quando sem foto, badge de disponibilidade por tamanho
 *  - Acessórios: abas por categoria, badge de qtd disponível, desabilitar se qty=0, label (gratuito)
 *  - Botão "Continuar" fixo no rodapé em mobile (sticky bottom)
 */
import { useState, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, ChevronRight, ChevronLeft, Check, Upload, X, Sun, Moon, Bike } from "lucide-react";
import { translations, languages, type Language } from "@/lib/i18n";
import { maskCPF, maskRG, maskCEP, maskPhone, maskDate, isValidCPF } from "@/hooks/useMask";

// ─── Logo URL via env ─────────────────────────────────────────────────────────
const LOGO_URL = (import.meta as any).env?.VITE_LOGO_URL as string | undefined;

// ─── Máscara auxiliar (específica deste formulário) ───────────────────────────
function maskHeight(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 3);
  if (d.length >= 2) return d[0] + "." + d.slice(1);
  return d;
}

// ─── Validação CPF (delega para useMask) ──────────────────────────────────────
function validateCPF(cpf: string) {
  return isValidCPF(cpf);
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
const TIMES: string[] = [];
for (let h = 9; h <= 19; h++) {
  TIMES.push(`${String(h).padStart(2,"0")}:00`);
  if (h < 19) TIMES.push(`${String(h).padStart(2,"0")}:30`);
}

// ─── Field component ───────────────────────────────────────────────────────────
function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#aaa] dark:text-[#aaa] light-label">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <span className="text-[11px] text-[#888]">{hint}</span>}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function PublicReservation() {
  // ─── Language & Theme ─────────────────────────────────────────────────────────
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("btg_lang") as Language | null;
    if (saved && ["pt","en","es"].includes(saved)) return saved;
    const browser = navigator.language.toLowerCase();
    if (browser.startsWith("es")) return "es";
    if (browser.startsWith("en")) return "en";
    return "pt";
  });
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("btg_form_theme") === "dark";
  });

  const t = translations[lang];

  const changeLang = (l: Language) => {
    setLang(l);
    localStorage.setItem("btg_lang", l);
  };
  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem("btg_form_theme", next ? "dark" : "light");
      return next;
    });
  };

  // ─── Theme classes ────────────────────────────────────────────────────────────
  const bg = isDark ? "bg-[#0a0a0f]" : "bg-gray-50";
  const cardBg = isDark ? "bg-[#0d0d1a] border-[#1a1a2e]" : "bg-white border-gray-200";
  const headerBg = isDark ? "bg-[#0a0a0f]/95 border-[#1a1a2e]" : "bg-white/95 border-gray-200";
  const progressBg = isDark ? "bg-[#0d0d1a] border-[#1a1a2e]" : "bg-gray-100 border-gray-200";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-[#888]" : "text-gray-500";
  const textMuted = isDark ? "text-[#555]" : "text-gray-400";
  const sectionBorder = isDark ? "border-[#1a1a2e]" : "border-gray-100";
  const inputBase = `w-full border rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors ${isDark ? "bg-[#141420] text-white placeholder-[#555]" : "bg-white text-gray-800 placeholder-gray-400"}`;
  const inputNormal = `${inputBase} ${isDark ? "border-[#2a2a3a] focus:border-[#C8920A]" : "border-gray-300 focus:border-[#C8920A]"}`;
  const inputError = `${inputBase} border-red-500/60 focus:border-red-400`;
  const selectBase = `w-full border rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors ${isDark ? "bg-[#141420] text-white border-[#2a2a3a] focus:border-[#C8920A]" : "bg-white text-gray-800 border-gray-300 focus:border-[#C8920A]"}`;
  const navBtnSecondary = `flex items-center gap-2 px-5 py-3 rounded-xl text-sm border transition-all ${isDark ? "text-[#888] border-[#2a2a3a] hover:border-[#3a3a4a]" : "text-gray-500 border-gray-300 hover:border-gray-400"}`;
  const langBtnBase = isDark ? "border-[#2a2a3a] bg-[#141420]" : "border-gray-200 bg-gray-100";
  const langBtnInactive = isDark ? "text-[#888] hover:text-white" : "text-gray-500 hover:text-gray-800";
  const themeBtnClass = `p-2 rounded-lg border transition-all ${isDark ? "border-[#2a2a3a] bg-[#141420] text-[#888] hover:text-white" : "border-gray-200 bg-gray-100 text-gray-500 hover:text-gray-800"}`;
  const uploadZoneBase = `relative border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer min-h-[140px] transition-all`;
  const uploadZoneEmpty = isDark ? "border-[#2a2a3a] bg-[#141420] hover:border-[#C8920A]/40" : "border-gray-300 bg-gray-50 hover:border-[#C8920A]/60";
  const paymentOptionBase = `flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all`;
  const paymentOptionInactive = isDark ? "border-[#2a2a3a] bg-[#141420] hover:border-[#C8920A]/40" : "border-gray-200 bg-gray-50 hover:border-[#C8920A]/60";
  const lgpdBoxBg = isDark ? "bg-[#141420] border-[#2a2a3a]" : "bg-gray-50 border-gray-200";
  const bikeCardInactive = isDark ? "border-[#2a2a3a] bg-[#141420] hover:border-[#C8920A]/40" : "border-gray-200 bg-gray-50 hover:border-[#C8920A]/60";
  const summaryBg = isDark ? "bg-[#0d0d1a] border-[#1a1a2e]" : "bg-white border-gray-200";
  const radioInactive = isDark ? "border-[#555]" : "border-gray-400";
  const tabBase = `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer`;
  const tabActive = `bg-[#C8920A] text-[#0a0a0f]`;
  const tabInactive = isDark ? `text-[#888] hover:text-white border border-[#2a2a3a] hover:border-[#C8920A]/40` : `text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-[#C8920A]/60`;

  const STEPS = [
    t.sectionIdentification,
    t.sectionContact,
    t.sectionAddress,
    t.sectionDocumentPhotos,
    t.sectionBikeSelection,
    t.sectionPayment,
  ];

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // Step 0 — Identificação
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [passport, setPassport] = useState("");
  const [docOrigin, setDocOrigin] = useState("Brasil (+55)");
  const isBrazilian = docOrigin === "Brasil (+55)";
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [pedalFreq, setPedalFreq] = useState("");
  const [origin, setOrigin] = useState("");

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
  const [stateUF, setStateUF] = useState("");
  const [country] = useState("Brasil");
  const [cepLoading, setCepLoading] = useState(false);

  // Step 3 — Documentos
  const [docFrontPreview, setDocFrontPreview] = useState<string | null>(null);
  const [docBackPreview, setDocBackPreview] = useState<string | null>(null);
  const [docFrontBase64, setDocFrontBase64] = useState<string | null>(null);
  const [docBackBase64, setDocBackBase64] = useState<string | null>(null);
  const [docFrontUploading, setDocFrontUploading] = useState(false);
  const [docBackUploading, setDocBackUploading] = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  // Step 4 — Bike + Período + Acessórios
  const [selectedBikeId, setSelectedBikeId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [selectedAccessories, setSelectedAccessories] = useState<Record<number, number>>({});
  const [activeAccCategory, setActiveAccCategory] = useState<string | null>(null);

  // Step 5 — Pagamento + LGPD
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix" | "cash">("cash");
  const [lgpdConsent, setLgpdConsent] = useState(false);

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data: bikesRaw, isLoading: bikesLoading } = trpc.publicApi.availableBikes.useQuery();
  const { data: accByCategoryRaw } = trpc.publicApi.availableAccessoriesByCategory.useQuery();
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
  const accByCategory = (accByCategoryRaw ?? []) as { category: string; accessories: any[] }[];
  const deliveryFee = parseFloat(deliveryFeeStr || "0");
  const discountRules = (discountRulesRaw ?? []) as any[];
  const isAvailable = availabilityResult ?? true;
  const submitMutation = trpc.publicApi.submitReservation.useMutation();
  const checkoutMutation = trpc.publicApi.createCheckout.useMutation();
  const uploadDocMutation = trpc.publicApi.uploadDocument.useMutation();

  // ─── Active accessory category (default to first) ────────────────────────────
  const effectiveAccCategory = activeAccCategory ?? (accByCategory[0]?.category ?? null);

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
    let total = 0;
    for (const [id, qty] of Object.entries(selectedAccessories)) {
      if ((qty as number) <= 0) continue;
      const acc = accessories.find((a: any) => a.id === Number(id));
      if (acc) total += parseFloat(acc.dailyRate || "0") * numDays * (qty as number);
    }
    return total;
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
        setStateUF(d.uf || "");
      }
    } catch {}
    finally { setCepLoading(false); }
  }, []);

  // ─── Document photo ───────────────────────────────────────────────────────────
  const handleDocPhoto = (side: "front" | "back", file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrors(e => ({ ...e, [side === "front" ? "docFront" : "docBack"]: t.docUploadError }));
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
      if (!name.trim() || name.trim().length < 3) errs.name = t.required;
      if (isBrazilian) {
        if (!cpf || !validateCPF(cpf)) errs.cpf = t.invalidCpf;
      } else {
        if (!passport.trim() || passport.trim().length < 5) errs.passport = lang === "pt" ? "Passaporte obrigatório (mínimo 5 caracteres)" : lang === "en" ? "Passport required (min. 5 characters)" : "Pasaporte obligatorio (mín. 5 caracteres)";
      }
      if (!birthDate || birthDate.length < 10) errs.birthDate = t.invalidDate;
      if (!height) errs.height = t.required;
    }
    if (s === 1) {
      if (!phone || phone.replace(/\D/g,"").length < 10) errs.phone = t.invalidPhone;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t.invalidEmail;
      if (!accommodation.trim()) errs.accommodation = t.required;
    }
    if (s === 2) {
      if (!zipCode || zipCode.replace(/\D/g,"").length < 8) errs.zipCode = t.required;
      if (!street.trim()) errs.street = t.required;
      if (!number.trim()) errs.number = t.required;
      if (!neighborhood.trim()) errs.neighborhood = t.required;
      if (!city.trim()) errs.city = t.required;
      if (!stateUF) errs.state = t.required;
    }
    if (s === 3) {
      if (!docFrontBase64) errs.docFront = t.required;
      if (!docBackBase64) errs.docBack = t.required;
    }
    if (s === 4) {
      if (!selectedBikeId) errs.bike = t.mustSelectBike;
      if (!startDate || !endDate) errs.dates = t.mustSelectDates;
      if (!deliveryTime) errs.deliveryTime = t.mustSelectTime;
      if (selectedBikeId && startDate && endDate && !isAvailable) errs.bike = t.bikeUnavailable;
    }
    if (s === 5) {
      if (!paymentMethod) errs.payment = t.mustSelectPayment;
      if (!lgpdConsent) errs.lgpdConsent = t.mustAcceptLgpd;
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
      const rentalAccessories = Object.entries(selectedAccessories)
        .filter(([, qty]) => (qty as number) > 0)
        .map(([id, qty]) => ({ accessoryId: Number(id), quantity: qty as number }));
      const result = await submitMutation.mutateAsync({
        name, cpf: isBrazilian ? cpf : "", rg: isBrazilian ? rg : passport, docOrigin, birthDate, gender, height: String(parseFloat(height) || 0),
        pedalFreq, howFound: origin, phone, email, instagram, accommodation,
        zipCode, street, number, complement, neighborhood, city, state: stateUF, country,
        lgpdConsent,
        bikeId: selectedBikeId!, startDate, endDate,
        deliveryTime,
        deliveryFee: String(deliveryFee),
        paymentMethod: paymentMethod === "card" ? "stripe" : paymentMethod as "pix" | "cash" | "stripe",
        totalAmount: String(grandTotal), accessories: rentalAccessories,
      });
      let docFrontUrl: string | undefined;
      let docBackUrl: string | undefined;
      if (result.clientId) {
        if (docFrontBase64) {
          setDocFrontUploading(true);
          try { const r = await uploadDocMutation.mutateAsync({ clientId: result.clientId, base64: docFrontBase64, side: "front" }); docFrontUrl = r.url; }
          finally { setDocFrontUploading(false); }
        }
        if (docBackBase64) {
          setDocBackUploading(true);
          try { const r = await uploadDocMutation.mutateAsync({ clientId: result.clientId, base64: docBackBase64, side: "back" }); docBackUrl = r.url; }
          finally { setDocBackUploading(false); }
        }
      }
      void docFrontUrl; void docBackUrl;
      if (paymentMethod !== "cash" && result.clientId && result.rentalId) {
        try {
          const checkout = await checkoutMutation.mutateAsync({
            rentalId: result.rentalId, clientId: result.clientId,
            clientName: name,
            clientEmail: email || undefined,
            bikeModel: selectedBike?.model || "N/A",
            startDate, endDate,
            totalAmountBRL: grandTotal,
            paymentType: paymentMethod as "card" | "pix",
            origin: window.location.origin,
          });
          if (checkout.checkoutUrl) { setCheckoutUrl(checkout.checkoutUrl); window.open(checkout.checkoutUrl, "_blank"); }
        } catch {}
      }
      setSubmitted(true);
    } catch (err: any) {
      setErrors({ submit: err?.message || t.errorMessage });
    } finally { setSubmitting(false); }
  };

  // ─── Success screen ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#C8920A]/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-[#C8920A]" />
          </div>
          <h1 className={`text-2xl font-bold ${textPrimary} mb-3`} style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {t.successTitle}
          </h1>
          <p className={`${textSecondary} text-sm leading-relaxed mb-6`}>{t.successMessage}</p>
          {checkoutUrl && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 mb-4 text-left">
              <p className="text-amber-300 text-sm font-semibold mb-1">{t.paymentPix}</p>
              <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="text-[#C8920A] text-sm underline font-medium">
                {t.submitButtonStripe} →
              </a>
            </div>
          )}
          <div className={`${cardBg} border rounded-xl p-5 text-left`}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className={`text-[10px] ${textMuted}`}>{t.summaryBike}</p><p className={`${textPrimary} font-medium`}>{selectedBike?.model}</p></div>
              <div><p className={`text-[10px] ${textMuted}`}>{t.sectionRentalPeriod}</p><p className={`${textPrimary} font-medium`}>{numDays} {numDays === 1 ? t.day : t.days}</p></div>
              <div><p className={`text-[10px] ${textMuted}`}>{t.deliveryTime}</p><p className={`${textPrimary} font-medium`}>{deliveryTime}</p></div>
              <div><p className={`text-[10px] ${textMuted}`}>{t.summaryTotal}</p><p className="text-[#C8920A] font-bold">R$ {formatCurrency(grandTotal)}</p></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} ${textPrimary}`}>
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className={`border-b ${headerBg} backdrop-blur sticky top-0 z-50`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {LOGO_URL ? (
              <img src={LOGO_URL} alt="Bike To Go" className="h-9 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#C8920A]/20 flex items-center justify-center">
                  <Bike className="w-5 h-5 text-[#C8920A]" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-[#C8920A] leading-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    Bike To Go
                  </h1>
                  <p className={`text-[10px] ${textMuted} leading-tight`}>Floripa</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Language selector */}
            <div className={`flex items-center gap-0.5 border rounded-lg p-0.5 ${langBtnBase}`}>
              {languages.map(l => (
                <button key={l.code} onClick={() => changeLang(l.code)} title={l.label}
                  className={`px-2 py-1 rounded-md text-sm transition-all ${
                    lang === l.code ? "bg-[#C8920A] text-[#0a0a0f] font-bold shadow-sm" : langBtnInactive
                  }`}>
                  {l.flag}
                </button>
              ))}
            </div>
            {/* Theme toggle */}
            <button onClick={toggleTheme} title={isDark ? "Light mode" : "Dark mode"} className={themeBtnClass}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Progress bar ────────────────────────────────────────────────────── */}
      <div className={`${progressBg} border-b`}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          {/* Barras de progresso */}
          <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { if (i < step) setStep(i); }}
                className={`h-1.5 rounded-full transition-all ${i < step ? "cursor-pointer" : "cursor-default"}`}
                style={{ background: i <= step ? "#C8920A" : isDark ? "#1a1a2e" : "#d1d5db" }}
                title={i < step ? STEPS[i] : undefined}
              />
            ))}
          </div>
          {/* Labels desktop */}
          <div className="hidden sm:grid gap-1" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => { if (i < step) setStep(i); }}
                className={`text-[10px] text-left transition-colors truncate ${i < step ? "cursor-pointer hover:text-[#C8920A]" : "cursor-default"}`}
                style={{ color: i === step ? "#C8920A" : i < step ? "#7a6010" : isDark ? "#444" : "#9ca3af" }}
                title={i < step ? s : undefined}
              >
                {s}
              </button>
            ))}
          </div>
          {/* Label mobile */}
          <span className={`text-[11px] sm:hidden ${textSecondary}`}>{step + 1}/{STEPS.length} — {STEPS[step]}</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-32 sm:pb-8">
        {/* Title */}
        <div className="text-center mb-8">
          <span className="inline-block bg-[#C8920A] text-[#0a0a0f] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
            {t.pageTitle}
          </span>
          <h2 className={`text-3xl font-extrabold ${textPrimary} mb-2`} style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {lang === "pt" ? (<>Cadastre-se para <span className="text-[#C8920A]">alugar</span></>)
              : lang === "en" ? (<>Register to <span className="text-[#C8920A]">rent</span></>)
              : (<>Regístrate para <span className="text-[#C8920A]">alquilar</span></>)}
          </h2>
          <p className={`${textSecondary} text-sm max-w-md mx-auto leading-relaxed`}>{t.pageSubheading}</p>
        </div>

        {/* ─── STEP 0: Identificação ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className={`${cardBg} border rounded-2xl p-6 space-y-5`}>
            <div className={`flex items-center gap-2 pb-3 border-b ${sectionBorder}`}>
              <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">👤 {t.sectionIdentification}</span>
            </div>
            <Field label={t.fullName} required error={errors.name}>
              <input className={errors.name ? inputError : inputNormal} placeholder={t.fullNamePlaceholder}
                value={name} onChange={e => setName(e.target.value)} />
            </Field>
            {/* Origem do documento — sempre visível */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t.docOrigin}>
                <select className={selectBase} value={docOrigin} onChange={e => {
                  setDocOrigin(e.target.value);
                  // Limpar erros de documento ao trocar
                  setErrors(prev => { const n = { ...prev }; delete n.cpf; delete n.rg; delete n.passport; return n; });
                }}>
                  <option value="Brasil (+55)">{t.docOriginBrazil}</option>
                  <option value="Estrangeiro">{t.docOriginForeign}</option>
                </select>
              </Field>
              <Field label={t.birthDate} required error={errors.birthDate}>
                <input className={errors.birthDate ? inputError : inputNormal} placeholder={t.birthDatePlaceholder}
                  value={birthDate} onChange={e => setBirthDate(maskDate(e.target.value))} />
              </Field>
            </div>
            {/* CPF + RG (Brasil) ou Passaporte (Estrangeiro) */}
            {isBrazilian ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t.cpf} required error={errors.cpf}>
                  <input className={errors.cpf ? inputError : inputNormal} placeholder={t.cpfPlaceholder}
                    value={cpf} onChange={e => setCpf(maskCPF(e.target.value))} />
                </Field>
                <Field label={t.rg} hint={t.rgHint}>
                  <input className={inputNormal} placeholder={t.rgPlaceholder}
                    value={rg} onChange={e => setRg(maskRG(e.target.value))} maxLength={12} />
                </Field>
              </div>
            ) : (
              <Field
                label={lang === "pt" ? "Número do Passaporte" : lang === "en" ? "Passport Number" : "Número de Pasaporte"}
                required
                error={errors.passport}
              >
                <input
                  className={errors.passport ? inputError : inputNormal}
                  placeholder={lang === "pt" ? "Ex: AB123456" : lang === "en" ? "e.g. AB123456" : "Ej: AB123456"}
                  value={passport}
                  onChange={e => setPassport(e.target.value.toUpperCase())}
                  maxLength={20}
                />
              </Field>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t.gender}>
                <select className={selectBase} value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">—</option>
                  <option value="Masculino">{t.genderMale}</option>
                  <option value="Feminino">{t.genderFemale}</option>
                  <option value="Outro">{t.genderOther}</option>
                  <option value="Prefiro não informar">{t.genderPreferNotToSay}</option>
                </select>
              </Field>
              <Field label={t.height} required error={errors.height} hint={t.heightHint}>
                <input className={errors.height ? inputError : inputNormal} placeholder={t.heightPlaceholder}
                  value={height} onChange={e => setHeight(maskHeight(e.target.value))} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t.pedalFrequency}>
                <select className={selectBase} value={pedalFreq} onChange={e => setPedalFreq(e.target.value)}>
                  <option value="">—</option>
                  <option value="Raramente">{t.pedalFreqRarely}</option>
                  <option value="1x por semana">{lang === "pt" ? "1x por semana" : lang === "en" ? "1x per week" : "1x por semana"}</option>
                  <option value="2-3x por semana">{lang === "pt" ? "2-3x por semana" : lang === "en" ? "2-3x per week" : "2-3x por semana"}</option>
                  <option value="4-5x por semana">{lang === "pt" ? "4-5x por semana" : lang === "en" ? "4-5x per week" : "4-5x por semana"}</option>
                  <option value="Diariamente">{t.pedalFreqDaily}</option>
                </select>
              </Field>
              <Field label={t.howFoundUs}>
                <select className={selectBase} value={origin} onChange={e => setOrigin(e.target.value)}>
                  <option value="">—</option>
                  <option value="Pela internet">{t.howFoundInternet}</option>
                  <option value="Instagram">{t.howFoundInstagram}</option>
                  <option value="Indicação de amigo">{t.howFoundFriend}</option>
                  <option value="Shopify">{t.howFoundShopify}</option>
                  <option value="Outro">{t.howFoundOther}</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* ─── STEP 1: Contato ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div className={`${cardBg} border rounded-2xl p-6 space-y-5`}>
            <div className={`flex items-center gap-2 pb-3 border-b ${sectionBorder}`}>
              <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">📞 {t.sectionContact}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t.whatsapp} required error={errors.phone}>
                <input className={errors.phone ? inputError : inputNormal} placeholder={t.whatsappPlaceholder}
                  value={phone} onChange={e => setPhone(maskPhone(e.target.value))} />
              </Field>
              <Field label={t.email} error={errors.email}>
                <input className={errors.email ? inputError : inputNormal} placeholder={t.emailPlaceholder}
                  type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t.instagram}>
                <input className={inputNormal} placeholder={t.instagramPlaceholder}
                  value={instagram} onChange={e => setInstagram(e.target.value)} />
              </Field>
              <Field label={t.accommodation} required error={errors.accommodation} hint={t.accommodationHint}>
                <input className={errors.accommodation ? inputError : inputNormal} placeholder={t.accommodationPlaceholder}
                  value={accommodation} onChange={e => setAccommodation(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Endereço ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div className={`${cardBg} border rounded-2xl p-6 space-y-5`}>
            <div className={`flex items-center gap-2 pb-3 border-b ${sectionBorder}`}>
              <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">🏠 {t.sectionAddress}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label={t.zipCode} required error={errors.zipCode}>
                <div className="relative">
                  <input className={errors.zipCode ? inputError : inputNormal} placeholder={t.zipCodePlaceholder}
                    value={zipCode} onChange={e => {
                      const v = maskCEP(e.target.value);
                      setZipCode(v);
                      if (v.replace(/\D/g,"").length === 8) fetchCEP(v);
                    }} />
                  {cepLoading && <Loader2 className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-[#C8920A]" />}
                </div>
              </Field>
              <Field label={t.state} required error={errors.state}>
                <select className={errors.state ? `${inputError} appearance-none` : selectBase} value={stateUF} onChange={e => setStateUF(e.target.value)}>
                  <option value="">{t.statePlaceholder}</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label={t.city} required error={errors.city}>
                <input className={errors.city ? inputError : inputNormal} placeholder={t.cityPlaceholder}
                  value={city} onChange={e => setCity(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Field label={t.street} required error={errors.street}>
                  <input className={errors.street ? inputError : inputNormal} placeholder={t.streetPlaceholder}
                    value={street} onChange={e => setStreet(e.target.value)} />
                </Field>
              </div>
              <Field label={t.number} required error={errors.number}>
                <input className={errors.number ? inputError : inputNormal} placeholder={t.numberPlaceholder}
                  value={number} onChange={e => setNumber(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t.complement}>
                <input className={inputNormal} placeholder={t.complementPlaceholder}
                  value={complement} onChange={e => setComplement(e.target.value)} />
              </Field>
              <Field label={t.neighborhood} required error={errors.neighborhood}>
                <input className={errors.neighborhood ? inputError : inputNormal} placeholder={t.neighborhoodPlaceholder}
                  value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Documentos ───────────────────────────────────────────── */}
        {step === 3 && (
          <div className={`${cardBg} border rounded-2xl p-6 space-y-5`}>
            <div className={`flex items-center gap-2 pb-3 border-b ${sectionBorder}`}>
              <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">📄 {t.sectionDocumentPhotos}</span>
            </div>
            <p className={`text-sm ${textSecondary} leading-relaxed`}>{t.docPhotosDescription}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {(["front", "back"] as const).map(side => {
                const preview = side === "front" ? docFrontPreview : docBackPreview;
                const err = side === "front" ? errors.docFront : errors.docBack;
                const uploading = side === "front" ? docFrontUploading : docBackUploading;
                const ref = side === "front" ? frontRef : backRef;
                const label = side === "front" ? t.docFront : t.docBack;
                return (
                  <div key={side} className="flex flex-col gap-1.5">
                    <label className={`text-xs font-semibold ${isDark ? "text-[#aaa]" : "text-gray-600"}`}>
                      {label}<span className="text-red-400 ml-0.5">*</span>
                    </label>
                    <div
                      onClick={() => ref.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleDocPhoto(side, f); }}
                      className={`${uploadZoneBase} ${
                        err ? "border-red-500/60 bg-red-900/10" :
                        preview ? "border-[#C8920A]/60 bg-[#C8920A]/5" : uploadZoneEmpty
                      }`}>
                      {uploading ? (
                        <><Loader2 className="w-8 h-8 animate-spin text-[#C8920A]" /><span className={`text-sm ${textSecondary}`}>{t.docUploading}</span></>
                      ) : preview ? (
                        <>
                          <img src={preview} alt={label} className="max-h-28 max-w-full rounded-lg object-cover" />
                          <button onClick={e => {
                            e.stopPropagation();
                            if (side === "front") { setDocFrontBase64(null); setDocFrontPreview(null); }
                            else { setDocBackBase64(null); setDocBackPreview(null); }
                          }} className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center hover:bg-red-500">
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-[#C8920A]" />
                          <span className={`text-sm ${textSecondary} font-medium`}>{t.docUploadHint}</span>
                          <span className={`text-[11px] ${textMuted}`}>{t.docUploadFormats}</span>
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

        {/* ─── STEP 4: Bike + Período + Acessórios ─────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            {/* Bike selection */}
            <div className={`${cardBg} border rounded-2xl p-6`}>
              <div className={`flex items-center gap-2 pb-3 border-b ${sectionBorder} mb-4`}>
                <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">🚲 {t.sectionBikeSelection}</span>
              </div>
              {errors.bike && <p className="text-red-400 text-sm mb-3">{errors.bike}</p>}
              {bikesLoading ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#C8920A]" />
                  <span className={textSecondary}>{t.loadingBikes}</span>
                </div>
              ) : bikes.length === 0 ? (
                <p className={`${textSecondary} text-sm text-center py-6`}>{t.noBikesAvailable}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bikes.map((bike: any) => (
                    <div key={bike.id} onClick={() => setSelectedBikeId(bike.id)}
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${
                        selectedBikeId === bike.id ? "border-[#C8920A] bg-[#C8920A]/10" : bikeCardInactive
                      }`}>
                      {/* Foto da bike ou placeholder */}
                      {bike.photoUrl ? (
                        <img src={bike.photoUrl} alt={bike.model} className="w-full h-28 object-cover rounded-lg mb-3" />
                      ) : (
                        <div className={`w-full h-28 rounded-lg mb-3 flex items-center justify-center ${isDark ? "bg-[#1a1a2e]" : "bg-gray-100"}`}>
                          <Bike className={`w-10 h-10 ${isDark ? "text-[#2a2a3a]" : "text-gray-300"}`} />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`font-bold text-sm ${textPrimary} truncate`}>{bike.model}</p>
                          {bike.brand && <p className={`text-xs ${textMuted}`}>{bike.brand}</p>}
                          {bike.size && (
                            <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${isDark ? "bg-[#1a1a2e] text-[#888]" : "bg-gray-100 text-gray-500"}`}>
                              {bike.size}
                            </span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[#C8920A] font-bold text-sm">R$ {formatCurrency(parseFloat(bike.dailyRate || "0"))}</p>
                          <p className={`text-[10px] ${textMuted}`}>{t.perDay}</p>
                        </div>
                      </div>
                      {selectedBikeId === bike.id && (
                        <div className="mt-2 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-[#C8920A]" />
                          <span className="text-[#C8920A] text-xs font-semibold">{t.selected}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rental period */}
            <div className={`${cardBg} border rounded-2xl p-6 space-y-4`}>
              <div className={`flex items-center gap-2 pb-3 border-b ${sectionBorder}`}>
                <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">📅 {t.sectionRentalPeriod}</span>
              </div>
              {errors.dates && <p className="text-red-400 text-sm">{errors.dates}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t.startDate} required>
                  <input type="date" className={inputNormal} value={startDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => setStartDate(e.target.value)} />
                </Field>
                <Field label={t.endDate} required>
                  <input type="date" className={inputNormal} value={endDate}
                    min={startDate || new Date().toISOString().split("T")[0]}
                    onChange={e => setEndDate(e.target.value)} />
                </Field>
              </div>
              {numDays > 0 && (
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${textSecondary}`}>{numDays} {numDays === 1 ? t.day : t.days}</span>
                  {selectedBikeId && startDate && endDate && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isAvailable ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {isAvailable ? t.bikeAvailable : t.bikeUnavailable}
                    </span>
                  )}
                </div>
              )}
              <Field label={t.deliveryTime} required error={errors.deliveryTime}>
                <select className={errors.deliveryTime ? `${inputError} appearance-none` : selectBase}
                  value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)}>
                  <option value="">{t.selectTime}</option>
                  {TIMES.map(time => <option key={time} value={time}>{time}</option>)}
                </select>
              </Field>
            </div>

            {/* Accessories — abas por categoria */}
            {accByCategory.length > 0 && (
              <div className={`${cardBg} border rounded-2xl p-6 space-y-4`}>
                <div className={`flex items-center gap-2 pb-3 border-b ${sectionBorder}`}>
                  <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">🎒 {t.sectionAccessories}</span>
                </div>
                {/* Abas de categoria */}
                {accByCategory.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {accByCategory.map(group => (
                      <button
                        key={group.category}
                        onClick={() => setActiveAccCategory(group.category)}
                        className={`${tabBase} ${effectiveAccCategory === group.category ? tabActive : tabInactive}`}
                      >
                        {group.category}
                      </button>
                    ))}
                  </div>
                )}
                {/* Lista de acessórios da categoria ativa */}
                <div className="space-y-3">
                  {(accByCategory.find(g => g.category === effectiveAccCategory)?.accessories ?? []).map((acc: any) => {
                    const qty = selectedAccessories[acc.id] || 0;
                    const avail = acc.quantidadeDisponivel ?? 0;
                    const isDisabled = avail === 0;
                    return (
                      <div key={acc.id} className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                        isDisabled
                          ? isDark ? "border-[#1a1a2e] opacity-50" : "border-gray-100 opacity-50"
                          : isDark ? "border-[#2a2a3a]" : "border-gray-200"
                      }`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-medium ${textPrimary}`}>{acc.name}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              isDisabled
                                ? "bg-red-500/20 text-red-400"
                                : avail <= 2
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-green-500/20 text-green-400"
                            }`}>
                              {isDisabled
                                ? (lang === "pt" ? "Indisponível" : lang === "en" ? "Unavailable" : "No disponible")
                                : `${avail} ${lang === "pt" ? "disp." : lang === "en" ? "avail." : "disp."}`}
                            </span>
                          </div>
                          <p className={`text-xs ${textMuted} mt-0.5`}>
                            {lang === "pt" ? "(gratuito)" : lang === "en" ? "(free)" : "(gratuito)"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            disabled={isDisabled || qty === 0}
                            onClick={() => setSelectedAccessories(prev => ({ ...prev, [acc.id]: Math.max(0, (prev[acc.id] || 0) - 1) }))}
                            className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? "border-[#2a2a3a] text-[#888] hover:border-[#C8920A] hover:text-[#C8920A]" : "border-gray-300 text-gray-500 hover:border-[#C8920A] hover:text-[#C8920A]"}`}>
                            −
                          </button>
                          <span className={`w-6 text-center text-sm font-bold ${textPrimary}`}>{qty}</span>
                          <button
                            disabled={isDisabled || qty >= avail}
                            onClick={() => setSelectedAccessories(prev => ({ ...prev, [acc.id]: Math.min(avail, (prev[acc.id] || 0) + 1) }))}
                            className="w-7 h-7 rounded-full bg-[#C8920A] text-[#0a0a0f] flex items-center justify-center text-sm font-bold hover:bg-[#d9a020] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
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
            {selectedBikeId && numDays > 0 && (
              <div className={`${summaryBg} border rounded-2xl p-5`}>
                <p className={`text-sm font-bold ${textPrimary} mb-3`}>{t.summaryTitle}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={textSecondary}>{t.summaryBike} ({numDays} {numDays === 1 ? t.day : t.days})</span>
                    <span className={textPrimary}>R$ {formatCurrency(bikeSubtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>{t.summaryDiscount} ({applicableDiscount}%)</span>
                      <span>−R$ {formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  {accTotal > 0 && (
                    <div className="flex justify-between">
                      <span className={textSecondary}>{t.summaryAccessories}</span>
                      <span className={textPrimary}>R$ {formatCurrency(accTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={textSecondary}>{t.summaryDelivery}</span>
                    <span className={textPrimary}>{deliveryFee > 0 ? `R$ ${formatCurrency(deliveryFee)}` : t.summaryFree}</span>
                  </div>
                  <div className={`flex justify-between font-bold text-base pt-2 border-t ${sectionBorder}`}>
                    <span className={textPrimary}>{t.summaryTotal}</span>
                    <span className="text-[#C8920A]">R$ {formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 5: Pagamento + LGPD ─────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5">
            {/* Payment */}
            <div className={`${cardBg} border rounded-2xl p-6 space-y-4`}>
              <div className={`flex items-center gap-2 pb-3 border-b ${sectionBorder}`}>
                <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">💳 {t.sectionPayment}</span>
              </div>
              {errors.payment && <p className="text-red-400 text-sm">{errors.payment}</p>}
              {[
                { value: "card" as const, icon: "💳", label: t.paymentCard, desc: t.paymentCardDesc },
                { value: "pix" as const, icon: "⚡", label: t.paymentPix, desc: t.paymentPixDesc },
                { value: "cash" as const, icon: "🤝", label: t.paymentCash, desc: t.paymentCashDesc },
              ].map(opt => (
                <div key={opt.value} onClick={() => setPaymentMethod(opt.value)}
                  className={`${paymentOptionBase} ${
                    paymentMethod === opt.value ? "border-[#C8920A] bg-[#C8920A]/10" : paymentOptionInactive
                  }`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    paymentMethod === opt.value ? "border-[#C8920A]" : radioInactive
                  }`}>
                    {paymentMethod === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-[#C8920A]" />}
                  </div>
                  <span className="text-xl">{opt.icon}</span>
                  <div>
                    <p className={`font-bold text-sm ${textPrimary}`}>{opt.label}</p>
                    <p className={`text-xs ${textMuted}`}>{opt.desc}</p>
                  </div>
                </div>
              ))}
              {paymentMethod !== "cash" && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg px-4 py-3 text-xs text-blue-300">
                  {lang === "pt" && "Após confirmar, você será redirecionado para o ambiente seguro do Stripe para finalizar o pagamento."}
                  {lang === "en" && "After confirming, you will be redirected to Stripe's secure environment to complete the payment."}
                  {lang === "es" && "Tras confirmar, serás redirigido al entorno seguro de Stripe para finalizar el pago."}
                </div>
              )}
            </div>

            {/* LGPD */}
            <div className={`${cardBg} border rounded-2xl p-6 space-y-4`}>
              <div className={`flex items-center gap-2 pb-3 border-b ${sectionBorder}`}>
                <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">🛡️ {t.sectionPrivacy}</span>
              </div>
              <div className={`${lgpdBoxBg} border rounded-lg p-4 text-xs ${textSecondary} leading-relaxed`}>
                <strong className={`${textPrimary} block mb-1`}>{t.lgpdTitle}</strong>
                {t.lgpdText}
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={lgpdConsent} onChange={e => setLgpdConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#C8920A] flex-shrink-0" />
                <span className={`text-sm ${textSecondary} leading-relaxed`}>{t.lgpdConsent}</span>
              </label>
              {errors.lgpdConsent && <p className="text-red-400 text-xs">{errors.lgpdConsent}</p>}
            </div>

            {/* Summary recap */}
            {selectedBike && numDays > 0 && (
              <div className={`${summaryBg} border rounded-2xl p-5`}>
                <p className={`text-sm font-bold ${textPrimary} mb-3`}>{t.summaryTitle}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={textSecondary}>{selectedBike.model} × {numDays} {numDays === 1 ? t.day : t.days}</span>
                    <span className={textPrimary}>R$ {formatCurrency(bikeSubtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>{t.summaryDiscount} ({applicableDiscount}%)</span>
                      <span>−R$ {formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  {accTotal > 0 && (
                    <div className="flex justify-between">
                      <span className={textSecondary}>{t.summaryAccessories}</span>
                      <span className={textPrimary}>R$ {formatCurrency(accTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={textSecondary}>{t.summaryDelivery}</span>
                    <span className={textPrimary}>{deliveryFee > 0 ? `R$ ${formatCurrency(deliveryFee)}` : t.summaryFree}</span>
                  </div>
                  <div className={`flex justify-between font-bold text-base pt-2 border-t ${sectionBorder}`}>
                    <span className={textPrimary}>{t.summaryTotal}</span>
                    <span className="text-[#C8920A]">R$ {formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-sm text-red-400">
                {errors.submit}
              </div>
            )}
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all disabled:opacity-50 bg-[#C8920A] text-[#0a0a0f] hover:bg-[#d9a020]">
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {t.submitting}</>
              ) : paymentMethod === "cash" ? (
                <><Check className="w-5 h-5" /> {t.submitButtonCash}</>
              ) : (
                <><Check className="w-5 h-5" /> {t.submitButtonStripe}</>
              )}
            </button>
          </div>
        )}

        {/* ─── Navigation — sticky no mobile ───────────────────────────────── */}
        {step < 5 && (
          <div className={`fixed bottom-0 left-0 right-0 sm:static sm:mt-6 px-4 py-3 sm:px-0 sm:py-0 ${
            isDark
              ? "bg-[#0a0a0f]/95 border-t border-[#1a1a2e] sm:bg-transparent sm:border-0"
              : "bg-white/95 border-t border-gray-200 sm:bg-transparent sm:border-0"
          } backdrop-blur sm:backdrop-blur-none z-40`}>
            <div className={`flex gap-3 max-w-2xl mx-auto ${step === 0 ? "justify-end" : "justify-between"}`}>
              {step > 0 && (
                <button onClick={prevStep} className={navBtnSecondary}>
                  <ChevronLeft className="w-4 h-4" />
                  {lang === "pt" ? "Voltar" : lang === "en" ? "Back" : "Volver"}
                </button>
              )}
              <button onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all bg-[#C8920A] text-[#0a0a0f] hover:bg-[#d9a020]">
                {lang === "pt" ? "Continuar" : lang === "en" ? "Continue" : "Continuar"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className={`border-t ${isDark ? "border-[#1a1a2e]" : "border-gray-200"} py-6 text-center`}>
        <p className={`text-xs ${textMuted}`}>
          Bike To Go Floripa — {lang === "pt" ? "Aluguel de bicicletas" : lang === "en" ? "Bike rentals" : "Alquiler de bicicletas"}
        </p>
      </footer>
    </div>
  );
}
