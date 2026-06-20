/**
 * PublicReservation.tsx — Formulário público de pré-cadastro
 * Fluxo: Identificação → Contato → Endereço → Documentos + LGPD
 * O cliente preenche apenas seus dados; o admin cria o aluguel manualmente.
 * Suporte a idiomas: PT-BR 🇧🇷 | EN 🇺🇸 | ES 🇪🇸
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  Loader2, ChevronRight, ChevronLeft, Check, X, Sun, Moon, Bike,
  HelpCircle, Smartphone, Download, Upload, FileText, Image as ImageIcon, Info,
} from "lucide-react";
import { translations, languages, type Language } from "@/lib/i18n";
import { maskCPF, maskRG, maskCEP, maskPhone, maskDate, isValidCPF } from "@/hooks/useMask";

// ─── Logo URL via env ─────────────────────────────────────────────────────────
const LOGO_URL = (import.meta as any).env?.VITE_LOGO_URL as string | undefined;

// ─── Máscara auxiliar ─────────────────────────────────────────────────────────
function maskHeight(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 3);
  if (d.length >= 2) return d[0] + "." + d.slice(1);
  return d;
}

function validateCPF(cpf: string) {
  return isValidCPF(cpf);
}

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

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

  // ─── Lightbox ────────────────────────────────────────────────────────────────
  const [lbSrc, setLbSrc] = useState<string | null>(null);
  const [lbAlt, setLbAlt] = useState("");
  const openLb = (src: string, alt: string) => { setLbSrc(src); setLbAlt(alt); };
  const closeLb = () => setLbSrc(null);

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
  const lgpdBoxBg = isDark ? "bg-[#141420] border-[#2a2a3a]" : "bg-gray-50 border-gray-200";

  // ─── Steps (4 steps: Identificação, Contato, Endereço, Documentos+LGPD) ──────
  const STEPS = [
    t.sectionIdentification,
    t.sectionContact,
    t.sectionAddress,
    t.sectionDocumentPhotos,
  ];

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 0 — Identificação
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [passport, setPassport] = useState("");
  const [docOrigin, setDocOrigin] = useState("Brasil (+55)");
  const isBrazilian = docOrigin === "Brasil (+55)";
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
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

  // Step 3 — Documentos + LGPD
  const [docType, setDocType] = useState<"cnh" | "rg">("cnh");
  const [docFrontPreview, setDocFrontPreview] = useState<string | null>(null);
  const [docFrontBase64, setDocFrontBase64] = useState<string | null>(null);
  const [docFrontMime, setDocFrontMime] = useState<string>("image/jpeg");
  const [docFrontIsPdf, setDocFrontIsPdf] = useState(false);
  const [docFrontName, setDocFrontName] = useState("");
  const [docBackPreview, setDocBackPreview] = useState<string | null>(null);
  const [docBackBase64, setDocBackBase64] = useState<string | null>(null);
  const [docBackMime, setDocBackMime] = useState<string>("image/jpeg");
  const [showVerso, setShowVerso] = useState(false);
  const [docFrontUploading, setDocFrontUploading] = useState(false);
  const [docBackUploading, setDocBackUploading] = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // ─── Mutations & Queries ──────────────────────────────────────────────────────
  const submitMutation = trpc.publicApi.submitPreRegistration.useMutation();
  const uploadDocMutation = trpc.publicApi.uploadDocument.useMutation();
  const { data: waData } = trpc.publicApi.getReservationWhatsApp.useQuery();

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
    const mime = file.type || "image/jpeg";
    const isPdf = mime === "application/pdf";
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = ev.target?.result as string;
      if (side === "front") {
        setDocFrontBase64(b64);
        setDocFrontMime(mime);
        setDocFrontName(file.name);
        if (isPdf) {
          setDocFrontIsPdf(true);
          setDocFrontPreview(null);
          setShowVerso(false);
        } else {
          setDocFrontIsPdf(false);
          setDocFrontPreview(b64);
        }
      } else {
        setDocBackBase64(b64);
        setDocBackMime(mime);
        setDocBackPreview(b64);
      }
      setErrors(e => { const n = { ...e }; delete n[side === "front" ? "docFront" : "docBack"]; return n; });
    };
    reader.readAsDataURL(file);
  };

  // ─── Validation ───────────────────────────────────────────────────────────────
  const validate = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!firstName.trim() || firstName.trim().length < 2) errs.firstName = t.required;
      if (!lastName.trim() || lastName.trim().length < 2) errs.lastName = t.required;
      if (isBrazilian) {
        if (!cpf || cpf.replace(/\D/g, "").length < 11) {
          errs.cpf = lang === "pt" ? "CPF obrigatório (11 dígitos)" : lang === "en" ? "CPF required (11 digits)" : "CPF obligatorio (11 dígitos)";
        } else if (!validateCPF(cpf)) {
          errs.cpf = lang === "pt" ? "CPF inválido — verifique os dígitos" : lang === "en" ? "Invalid CPF — check the digits" : "CPF inválido — verifique los dígitos";
        }
        if (docType === "rg") {
          const rgDigits = rg.replace(/[.\-\s]/g, "");
          if (!rgDigits || rgDigits.length < 7) {
            errs.rg = lang === "pt" ? "RG obrigatório" : "RG required";
          } else {
            const digits = rgDigits.toUpperCase();
            const body = digits.slice(0, -1);
            const lastChar = digits[digits.length - 1];
            let sum = 0;
            for (let i = 0; i < body.length; i++) sum += parseInt(body[i], 10) * (body.length + 1 - i);
            const rem = sum % 11;
            const expected = rem < 2 ? "0" : String(11 - rem);
            if (lastChar !== "X" && lastChar !== expected) errs.rg = lang === "pt" ? "Dígito verificador do RG inválido" : "Invalid RG check digit";
          }
        }
      } else {
        if (!passport.trim() || passport.trim().length < 5) errs.passport = lang === "pt" ? "Passaporte obrigatório (mínimo 5 caracteres)" : lang === "en" ? "Passport required (min. 5 characters)" : "Pasaporte obligatorio (mín. 5 caracteres)";
      }
      if (!birthDate || birthDate.length < 10) errs.birthDate = t.invalidDate;
      if (!height || !height.trim()) errs.height = lang === "pt" ? "Altura obrigatória" : lang === "en" ? "Height required" : "Altura obligatoria";
      if (!weight || !weight.trim()) errs.weight = lang === "pt" ? "Peso obrigatório" : lang === "en" ? "Weight required" : "Peso obligatorio";
    }
    if (s === 1) {
      if (!phone || phone.replace(/\D/g,"").length < 10) errs.phone = t.invalidPhone;
      if (!email || !email.trim()) errs.email = lang === "pt" ? "E-mail obrigatório" : lang === "en" ? "Email required" : "Correo obligatorio";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t.invalidEmail;
      // accommodation is optional — no validation
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
      if (!lgpdConsent) errs.lgpdConsent = t.mustAcceptLgpd;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validate(step)) setStep(s => s + 1);
  };
  const prevStep = () => setStep(s => s - 1);

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate(3)) return;
    setSubmitting(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    try {
      const result = await submitMutation.mutateAsync({
        name: fullName,
        cpf: isBrazilian ? cpf : undefined,
        rg: isBrazilian ? rg : undefined,
        passport: !isBrazilian ? passport : undefined,
        docOrigin,
        birthDate,
        gender,
        height: height ? String(parseFloat(height) || 0) : "0",
        weight: weight ? String(parseFloat(weight) || 0) : "0",
        pedalFreq,
        howFound: origin,
        phone,
        email,
        instagram,
        accommodation,
        zipCode,
        street,
        number,
        complement,
        neighborhood,
        city,
        state: stateUF,
        country,
        lgpdConsent,
      });

      // Upload documents after client is created
      if (result.clientId) {
        if (docFrontBase64) {
          setDocFrontUploading(true);
          try { await uploadDocMutation.mutateAsync({ clientId: result.clientId, base64: docFrontBase64, side: "front", mimeType: docFrontMime }); }
          finally { setDocFrontUploading(false); }
        }
        if (docBackBase64) {
          setDocBackUploading(true);
          try { await uploadDocMutation.mutateAsync({ clientId: result.clientId, base64: docBackBase64, side: "back", mimeType: docBackMime }); }
          finally { setDocBackUploading(false); }
        }
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrors({ submit: err?.message || t.errorMessage });
    } finally { setSubmitting(false); }
  };

  // ─── Success screen ───────────────────────────────────────────────────────────
  if (submitted) {
    const waNumber = waData?.number;
    const waMsg = encodeURIComponent(
      lang === "pt"
        ? "Olá! Acabei de me cadastrar no site da Bike To Go e gostaria de solicitar uma reserva."
        : lang === "en"
        ? "Hi! I just registered on the Bike To Go website and would like to request a reservation."
        : "¡Hola! Acabo de registrarme en el sitio de Bike To Go y me gustaría solicitar una reserva."
    );
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#C8920A]/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-[#C8920A]" />
          </div>
          <h1 className={`text-2xl font-bold ${textPrimary} mb-3`} style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {lang === "pt" ? "Cadastro enviado com sucesso!" : lang === "en" ? "Registration submitted successfully!" : "¡Registro enviado con éxito!"}
          </h1>
          <p className={`${textSecondary} text-sm leading-relaxed mb-6`}>
            {lang === "pt"
              ? "Seu cadastro foi concluído. Agora você já pode solicitar sua reserva."
              : lang === "en"
              ? "Your registration is complete. You can now request your reservation."
              : "Tu registro fue completado. Ahora puedes solicitar tu reserva."}
          </p>
          <div className={`${cardBg} border rounded-xl p-5 text-left mb-6`}>
            <p className={`text-sm font-semibold ${textPrimary} mb-2`}>
              {lang === "pt" ? "Próximos passos:" : lang === "en" ? "Next steps:" : "Próximos pasos:"}
            </p>
            <ul className={`text-sm ${textSecondary} space-y-1.5 list-disc list-inside`}>
              <li>{lang === "pt" ? "Escolha a bicicleta desejada." : lang === "en" ? "Choose the desired bicycle." : "Elige la bicicleta deseada."}</li>
              <li>{lang === "pt" ? "Solicite sua reserva pelo WhatsApp." : lang === "en" ? "Request your reservation via WhatsApp." : "Solicita tu reserva por WhatsApp."}</li>
              <li>{lang === "pt" ? "Confirme a disponibilidade." : lang === "en" ? "Confirm availability." : "Confirma la disponibilidad."}</li>
            </ul>
          </div>
          {waNumber && (
            <a
              href={`https://wa.me/55${waNumber}?text=${waMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl font-bold text-base transition-all bg-[#C8920A] text-[#0a0a0f] hover:bg-[#d9a020]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {lang === "pt" ? "Solicitar reserva pelo WhatsApp" : lang === "en" ? "Request reservation via WhatsApp" : "Solicitar reserva por WhatsApp"}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} ${textPrimary}`}>
      {/* ─── Lightbox overlay ──────────────────────────────────────────────────── */}
      {lbSrc && (
        <div
          role="dialog"
          aria-modal
          tabIndex={0}
          onClick={closeLb}
          onKeyDown={e => e.key === "Escape" && closeLb()}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{ outline: "none" }}
          ref={el => el?.focus()}
        >
          <button
            onClick={closeLb}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Fechar"
          >
            <span className="text-xl leading-none">×</span>
          </button>
          <img
            src={lbSrc}
            alt={lbAlt}
            onClick={e => e.stopPropagation()}
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
            style={{ objectFit: "contain" }}
          />
        </div>
      )}

      {/* ─── Header ───────────────────────────────────────────────────────────── */}
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
            <button onClick={toggleTheme} title={isDark ? "Light mode" : "Dark mode"} className={themeBtnClass}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Progress bar ─────────────────────────────────────────────────────── */}
      <div className={`${progressBg} border-b`}>
        <div className="max-w-2xl mx-auto px-4 py-3">
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
          <span className={`text-[11px] sm:hidden ${textSecondary}`}>{step + 1}/{STEPS.length} — {STEPS[step]}</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-32 sm:pb-8">
        {/* Title */}
        <div className="text-center mb-8">
          <span className="inline-block bg-[#C8920A] text-[#0a0a0f] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
            {lang === "pt" ? "Pré-Cadastro" : lang === "en" ? "Pre-Registration" : "Pre-Registro"}
          </span>
          <h2 className={`text-3xl font-extrabold ${textPrimary} mb-2`} style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {lang === "pt" ? (<>Cadastre-se para <span className="text-[#C8920A]">alugar</span></>)
              : lang === "en" ? (<>Register to <span className="text-[#C8920A]">rent</span></>)
              : (<>Regístrate para <span className="text-[#C8920A]">alquilar</span></>)}
          </h2>
          <p className={`${textSecondary} text-sm max-w-md mx-auto leading-relaxed`}>
            {lang === "pt"
              ? "Preencha seus dados e nossa equipe entrará em contato para combinar a bike e os acessórios ideais."
              : lang === "en"
              ? "Fill in your details and our team will contact you to arrange the ideal bike and accessories."
              : "Completa tus datos y nuestro equipo se pondrá en contacto para combinar la bici y los accesorios ideales."}
          </p>
        </div>

        {/* ─── STEP 0: Identificação ────────────────────────────────────────── */}
        {step === 0 && (
          <div className={`${cardBg} border rounded-2xl p-6 space-y-5`}>
            <div className={`flex items-center gap-2 pb-3 border-b ${sectionBorder}`}>
              <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">🪪 {t.sectionIdentification}</span>
            </div>

            {/* Origem */}
            <Field label={lang === "pt" ? "Origem" : lang === "en" ? "Origin" : "Origen"}>
              <select className={selectBase} value={docOrigin} onChange={e => { setDocOrigin(e.target.value); }}>
                <option value="Brasil (+55)">🇧🇷 Brasil (+55)</option>
                <option value="Argentina (+54)">🇦🇷 Argentina (+54)</option>
                <option value="Chile (+56)">🇨🇱 Chile (+56)</option>
                <option value="Uruguai (+598)">🇺🇾 Uruguai (+598)</option>
                <option value="EUA (+1)">🇺🇸 EUA (+1)</option>
                <option value="Outro">🌍 {lang === "pt" ? "Outro país" : lang === "en" ? "Other country" : "Otro país"}</option>
              </select>
            </Field>

            {/* Nome / Sobrenome */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label={lang === "pt" ? "Nome" : lang === "en" ? "First Name" : "Nombre"}
                required
                error={errors.firstName}
              >
                <input
                  className={errors.firstName ? inputError : inputNormal}
                  placeholder={lang === "pt" ? "Ex: Maria" : lang === "en" ? "e.g. Maria" : "Ej: María"}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  maxLength={60}
                />
              </Field>
              <Field
                label={lang === "pt" ? "Sobrenome" : lang === "en" ? "Last Name" : "Apellido"}
                required
                error={errors.lastName}
              >
                <input
                  className={errors.lastName ? inputError : inputNormal}
                  placeholder={lang === "pt" ? "Ex: Silva" : lang === "en" ? "e.g. Silva" : "Ej: García"}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  maxLength={60}
                />
              </Field>
            </div>

            {/* CPF / RG / Passaporte */}
            {isBrazilian && (
              <>
                <div className="flex gap-4">
                  {(["cnh", "rg"] as const).map(dt => (
                    <label key={dt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="docType"
                        value={dt}
                        checked={docType === dt}
                        onChange={() => { setDocType(dt); setRg(""); }}
                        className="accent-[#C8920A] w-4 h-4"
                      />
                      <span className={`text-sm font-medium ${textPrimary}`}>
                        {dt === "cnh" ? (lang === "pt" ? "CNH" : lang === "en" ? "Driver's License" : "Licencia") : "RG"}
                      </span>
                    </label>
                  ))}
                </div>
                <Field label="CPF" required error={errors.cpf}>
                  <input className={errors.cpf ? inputError : inputNormal} placeholder="000.000.000-00"
                    value={cpf} onChange={e => setCpf(maskCPF(e.target.value))} maxLength={14} />
                </Field>
                {docType === "rg" && (
                  <Field label="RG" required error={errors.rg}>
                    <input className={errors.rg ? inputError : inputNormal} placeholder="00.000.000-0"
                      value={rg} onChange={e => setRg(maskRG(e.target.value))} maxLength={12} />
                  </Field>
                )}
              </>
            )}
            {!isBrazilian && (
              <Field
                label={lang === "pt" ? "Passaporte" : lang === "en" ? "Passport" : "Pasaporte"}
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

            {/* Data de nascimento */}
            <Field label={t.birthDate} required error={errors.birthDate}>
              <input className={errors.birthDate ? inputError : inputNormal} placeholder="DD/MM/AAAA"
                value={birthDate} onChange={e => setBirthDate(maskDate(e.target.value))} maxLength={10} />
            </Field>

            {/* Gênero */}
            <Field label={t.gender}>
              <select className={selectBase} value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">—</option>
                <option value="Masculino">{t.genderMale}</option>
                <option value="Feminino">{t.genderFemale}</option>
                <option value="Outro">{t.genderOther}</option>
                <option value="Prefiro não informar">{t.genderPreferNotToSay}</option>
              </select>
            </Field>

            {/* Altura / Peso */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t.height} required error={errors.height} hint={t.heightHint}>
                <input
                  className={errors.height ? inputError : inputNormal}
                  placeholder={t.heightPlaceholder}
                  value={height}
                  onChange={e => setHeight(maskHeight(e.target.value))}
                />
              </Field>
              <Field
                label={lang === "pt" ? "Peso (kg)" : lang === "en" ? "Weight (kg)" : "Peso (kg)"}
                required
                error={errors.weight}
              >
                <input
                  className={errors.weight ? inputError : inputNormal}
                  type="number" min="20" max="300" step="0.1"
                  placeholder={lang === "pt" ? "Ex: 75.5" : "e.g. 75.5"}
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                />
              </Field>
            </div>

            {/* Frequência de pedal */}
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

            {/* Como nos encontrou */}
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
              <Field label={t.email} required error={errors.email}>
                <input className={errors.email ? inputError : inputNormal} placeholder={t.emailPlaceholder}
                  type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t.instagram}>
                <input className={inputNormal} placeholder={t.instagramPlaceholder}
                  value={instagram} onChange={e => setInstagram(e.target.value)} />
              </Field>
              <Field label={t.accommodation} hint={t.accommodationHint}>
                <input className={inputNormal} placeholder={t.accommodationPlaceholder}
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

        {/* ─── STEP 3: Documentos + LGPD ────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Documentos */}
            <div className={`${cardBg} border rounded-2xl p-6 space-y-5`}>
              <div className={`flex items-center gap-2 pb-3 border-b ${sectionBorder}`}>
                <span className="text-[#C8920A] text-sm font-bold uppercase tracking-widest">📄 {t.sectionDocumentPhotos}</span>
              </div>

              {/* Seletor CNH/RG (apenas brasileiros) */}
              {isBrazilian && (
                <div className="flex gap-4">
                  {(["cnh", "rg"] as const).map(dt => (
                    <label key={dt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="docTypeUpload"
                        value={dt}
                        checked={docType === dt}
                        onChange={() => {
                          setDocType(dt);
                          setDocFrontBase64(null); setDocFrontPreview(null);
                          setDocFrontIsPdf(false); setDocFrontName("");
                          setDocBackBase64(null); setDocBackPreview(null);
                          setShowVerso(false);
                          setErrors(prev => { const n = { ...prev }; delete n.docFront; delete n.docBack; return n; });
                        }}
                        className="accent-[#C8920A] w-4 h-4"
                      />
                      <span className={`text-sm font-medium ${textPrimary}`}>
                        {dt === "cnh" ? (lang === "pt" ? "CNH" : lang === "en" ? "Driver's License" : "Licencia") : "RG"}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Título da seção de documento */}
              <div>
                <p className={`text-xs font-semibold mb-2 ${textSecondary}`}>
                  {lang === "pt"
                    ? `Documento de identificação`
                    : lang === "en" ? "Identification document" : "Documento de identificación"}
                </p>
                <p className={`text-xs ${textSecondary} mb-4 leading-relaxed`}>
                  {lang === "pt"
                    ? `Envie o PDF da sua ${isBrazilian ? (docType === "cnh" ? "CNH digital (gov.br)" : "RG") : "passaporte"} — frente, verso e QR num arquivo só — ou uma foto do documento.`
                    : lang === "en"
                    ? `Send the PDF of your ${isBrazilian ? (docType === "cnh" ? "digital driver's license (gov.br)" : "ID card") : "passport"} — front, back and QR in one file — or a photo of the document.`
                    : `Envía el PDF de tu ${isBrazilian ? (docType === "cnh" ? "licencia digital (gov.br)" : "documento de identidad") : "pasaporte"} — frente, dorso y QR en un solo archivo — o una foto del documento.`}
                </p>
              </div>

              {/* Zona de upload única */}
              <div>
                <p className={`text-xs font-semibold mb-2 ${textSecondary}`}>
                  {docFrontBase64 && showVerso
                    ? (lang === "pt" ? "Frente" : lang === "en" ? "Front" : "Frente")
                    : docFrontIsPdf
                    ? (lang === "pt" ? "Documento (PDF)" : lang === "en" ? "Document (PDF)" : "Documento (PDF)")
                    : (lang === "pt" ? "Documento" : lang === "en" ? "Document" : "Documento")}
                  <span className="text-red-400 ml-0.5">*</span>
                </p>

                {/* Input file oculto */}
                <input
                  ref={frontRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleDocPhoto("front", f); }}
                />

                {/* Prévia: PDF */}
                {docFrontBase64 && docFrontIsPdf ? (
                  <div className={`relative flex items-center gap-3 rounded-xl border p-4 ${isDark ? "border-[#C8920A]/30 bg-[#141420]" : "border-[#C8920A]/30 bg-orange-50"}`}>
                    <div className="w-10 h-10 rounded-lg bg-[#C8920A]/20 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[#C8920A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${textPrimary}`}>{docFrontName || "documento.pdf"}</p>
                      <p className={`text-xs ${textSecondary}`}>PDF</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setDocFrontBase64(null); setDocFrontPreview(null); setDocFrontIsPdf(false); setDocFrontName(""); setShowVerso(false); }}
                      className="w-7 h-7 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/40 transition-all shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {docFrontUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                        <Loader2 className="w-6 h-6 animate-spin text-[#C8920A]" />
                      </div>
                    )}
                  </div>
                ) : docFrontPreview ? (
                  /* Prévia: imagem */
                  <div className="relative">
                    <img
                      src={docFrontPreview}
                      alt="Frente"
                      className="w-full h-36 object-cover rounded-xl border border-[#C8920A]/30 cursor-pointer"
                      onClick={() => openLb(docFrontPreview, lang === "pt" ? "Frente" : "Front")}
                    />
                    <button
                      type="button"
                      onClick={() => { setDocFrontBase64(null); setDocFrontPreview(null); setDocFrontIsPdf(false); setDocFrontName(""); setShowVerso(false); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {docFrontUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                        <Loader2 className="w-6 h-6 animate-spin text-[#C8920A]" />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Drop zone vazia */
                  <div
                    className={`${uploadZoneBase} ${errors.docFront ? "border-red-500/60" : uploadZoneEmpty}`}
                    onClick={() => frontRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleDocPhoto("front", f);
                    }}
                  >
                    <div className="flex justify-center gap-2.5 mb-1">
                      <span className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </span>
                      <span className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-500" />
                      </span>
                    </div>
                    <p className={`text-sm font-medium text-center ${errors.docFront ? "text-red-400" : textPrimary}`}>
                      {lang === "pt" ? "Arraste aqui ou clique para selecionar" : lang === "en" ? "Drag here or click to select" : "Arrastra aquí o haz clic para seleccionar"}
                    </p>
                    <p className={`text-xs ${errors.docFront ? "text-red-400" : textMuted}`}>
                      {lang === "pt" ? "PDF ou imagem · até 10 MB" : lang === "en" ? "PDF or image · up to 10 MB" : "PDF o imagen · hasta 10 MB"}
                    </p>
                  </div>
                )}
                {errors.docFront && <p className="text-[11px] text-red-400 mt-1">{errors.docFront}</p>}
              </div>

              {/* Botão "Adicionar verso" — só aparece quando: imagem selecionada + não é PDF + verso ainda não visível */}
              {docFrontBase64 && !docFrontIsPdf && !showVerso && (
                <button
                  type="button"
                  onClick={() => setShowVerso(true)}
                  className={`text-xs font-medium transition-colors ${isDark ? "text-[#888] hover:text-[#C8920A]" : "text-gray-400 hover:text-[#C8920A]"}`}
                >
                  + {lang === "pt" ? "Adicionar verso (opcional)" : lang === "en" ? "Add back side (optional)" : "Agregar dorso (opcional)"}
                </button>
              )}

              {/* Slot de verso — só quando showVerso e não é PDF */}
              {showVerso && !docFrontIsPdf && (
                <div>
                  <p className={`text-xs font-semibold mb-2 ${textSecondary}`}>
                    {lang === "pt" ? "Verso (opcional)" : lang === "en" ? "Back (optional)" : "Dorso (opcional)"}
                  </p>
                  <input
                    ref={backRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleDocPhoto("back", f); }}
                  />
                  {docBackPreview ? (
                    <div className="relative">
                      <img
                        src={docBackPreview}
                        alt="Verso"
                        className="w-full h-36 object-cover rounded-xl border border-[#C8920A]/30 cursor-pointer"
                        onClick={() => openLb(docBackPreview, lang === "pt" ? "Verso" : "Back")}
                      />
                      <button
                        type="button"
                        onClick={() => { setDocBackBase64(null); setDocBackPreview(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {docBackUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                          <Loader2 className="w-6 h-6 animate-spin text-[#C8920A]" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`${uploadZoneBase} ${uploadZoneEmpty}`}
                      onClick={() => backRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleDocPhoto("back", f);
                      }}
                    >
                      <Upload className="w-6 h-6 text-[#C8920A]/60" />
                      <p className={`text-xs text-center ${textMuted}`}>
                        {lang === "pt" ? "Clique ou arraste a foto aqui" : lang === "en" ? "Click or drag photo here" : "Haz clic o arrastra la foto aquí"}
                      </p>
                      <p className={`text-[10px] ${textMuted}`}>JPG, PNG — máx. 10 MB</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tutorial CNH digital (ícones lucide, sem emoji) */}
              <div className={`border-t ${sectionBorder} pt-4`}>
                <p className={`text-[13px] font-medium mb-3 flex items-center gap-1.5 ${textSecondary}`}>
                  <HelpCircle className="w-4 h-4 text-gray-500 shrink-0" />
                  {lang === "pt" ? "Como baixar o PDF da sua CNH digital"
                    : lang === "en" ? "How to download your digital driver's license PDF"
                    : "Cómo descargar el PDF de tu licencia digital"}
                </p>
                <ol className="flex flex-col gap-2.5">
                  {[
                    {
                      icon: Smartphone,
                      pt: "Abra a Carteira Digital de Trânsito ou o gov.br e acesse sua CNH",
                      en: "Open Carteira Digital de Trânsito or gov.br and access your license",
                      es: "Abre Carteira Digital de Trânsito o gov.br y accede a tu licencia",
                    },
                    {
                      icon: Download,
                      pt: "Toque em Exportar / Baixar PDF e salve o arquivo",
                      en: "Tap Export / Download PDF and save the file",
                      es: "Toca Exportar / Descargar PDF y guarda el archivo",
                    },
                    {
                      icon: Upload,
                      pt: "Volte aqui e envie o PDF na área acima",
                      en: "Come back and upload the PDF above",
                      es: "Vuelve y sube el PDF arriba",
                    },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    const last = i === 2;
                    return (
                      <li key={i} className="flex items-center gap-3">
                        <span className={`shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] font-medium ${last ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" : isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"}`}>{i + 1}</span>
                        <Icon className={`w-[19px] h-[19px] shrink-0 ${last ? "text-blue-600 dark:text-blue-400" : "text-gray-500"}`} />
                        <span className={`text-[13px] leading-relaxed ${textSecondary}`}>{lang === "pt" ? s.pt : lang === "en" ? s.en : s.es}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Nota: estrangeiro / foto */}
              <div className={`rounded-lg px-3 py-2.5 flex items-start gap-2 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
                <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <span className={`text-xs leading-relaxed ${textSecondary}`}>
                  {lang === "pt"
                    ? "Estrangeiro ou sem CNH digital? Envie uma foto do documento (passaporte ou RG)."
                    : lang === "en"
                    ? "Foreigner or no digital license? Send a photo of your document (passport or ID)."
                    : "¿Extranjero o sin licencia digital? Envía una foto del documento (pasaporte o DNI)."}
                </span>
              </div>
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
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={marketingConsent} onChange={e => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#C8920A] flex-shrink-0" />
                <span className={`text-sm ${textSecondary} leading-relaxed`}>
                  {lang === "pt" ? "Aceito receber comunicações de marketing e promoções da Bike To Go." : lang === "en" ? "I agree to receive marketing communications and promotions from Bike To Go." : "Acepto recibir comunicaciones de marketing y promociones de Bike To Go."}
                </span>
              </label>

              {errors.submit && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-sm text-red-400">
                  {errors.submit}
                </div>
              )}

              <button onClick={handleSubmit} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all disabled:opacity-50 bg-[#C8920A] text-[#0a0a0f] hover:bg-[#d9a020]">
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />
                    {lang === "pt" ? "Enviando..." : lang === "en" ? "Sending..." : "Enviando..."}
                  </>
                ) : (
                  <><Check className="w-5 h-5" />
                    {lang === "pt" ? "Enviar Pré-Cadastro" : lang === "en" ? "Submit Pre-Registration" : "Enviar Pre-Registro"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── Navigation — sticky no mobile ───────────────────────────────── */}
        {step < 3 && (
          <div className={`fixed bottom-0 left-0 right-0 sm:static sm:mt-6 px-4 py-3 sm:px-0 sm:py-0 safe-area-bottom ${
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
        {step === 3 && step > 0 && (
          <div className={`fixed bottom-0 left-0 right-0 sm:hidden px-4 py-3 safe-area-bottom ${
            isDark
              ? "bg-[#0a0a0f]/95 border-t border-[#1a1a2e]"
              : "bg-white/95 border-t border-gray-200"
          } backdrop-blur z-40`}>
            <button onClick={prevStep} className={`${navBtnSecondary} w-full justify-center`}>
              <ChevronLeft className="w-4 h-4" />
              {lang === "pt" ? "Voltar" : lang === "en" ? "Back" : "Volver"}
            </button>
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
