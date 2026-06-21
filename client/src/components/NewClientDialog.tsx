import { trpc } from "@/lib/trpc";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { X, Upload, FileText, Image as ImageIcon, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskCPF, maskRG, maskCEP, maskPhone, maskDate, isValidCPF, fetchViaCEP } from "@/hooks/useMask";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground block">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-border mb-3">
      <span className="text-[#C8920A] text-xs font-bold uppercase tracking-widest">{title}</span>
    </div>
  );
}

export default function NewClientDialog({ open, onClose, onSuccess }: Props) {
  // ─── Identificação ─────────────────────────────────────────────────────────
  const [docOrigin, setDocOrigin] = useState<"brasileiro" | "estrangeiro">("brasileiro");
  const isBrazilian = docOrigin === "brasileiro";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [passport, setPassport] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // ─── Contato ───────────────────────────────────────────────────────────────
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // ─── Medidas ───────────────────────────────────────────────────────────────
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  // ─── Endereço ──────────────────────────────────────────────────────────────
  const [zipCode, setZipCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [stateUF, setStateUF] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  // ─── Documento ─────────────────────────────────────────────────────────────
  const [docFrontBase64, setDocFrontBase64] = useState<string | null>(null);
  const [docFrontPreview, setDocFrontPreview] = useState<string | null>(null);
  const [docFrontMime, setDocFrontMime] = useState("image/jpeg");
  const [docFrontIsPdf, setDocFrontIsPdf] = useState(false);
  const [docFrontName, setDocFrontName] = useState("");
  const [docBackBase64, setDocBackBase64] = useState<string | null>(null);
  const [docBackPreview, setDocBackPreview] = useState<string | null>(null);
  const [docBackMime, setDocBackMime] = useState("image/jpeg");
  const [showVerso, setShowVerso] = useState(false);
  const [docUploading, setDocUploading] = useState(false);

  // ─── LGPD ──────────────────────────────────────────────────────────────────
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // ─── Errors & submitting ───────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = trpc.clients.create.useMutation({
    onError: (err) => toast.error(err.message),
  });
  const uploadDocMutation = trpc.publicApi.uploadDocument.useMutation();

  // ─── CEP autocomplete ──────────────────────────────────────────────────────
  const handleCEP = useCallback(async (val: string) => {
    const masked = maskCEP(val);
    setZipCode(masked);
    const clean = masked.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetchViaCEP(clean);
      if (r) {
        setStreet(r.logradouro || "");
        setNeighborhood(r.bairro || "");
        setCity(r.localidade || "");
        setStateUF(r.uf || "");
      }
    } catch {}
    finally { setCepLoading(false); }
  }, []);

  // ─── Document photo handler ────────────────────────────────────────────────
  const handleDocPhoto = (side: "front" | "back", file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrors(e => ({ ...e, [side === "front" ? "docFront" : "docBack"]: "Arquivo muito grande (máx. 10 MB)" }));
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

  // ─── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim() || firstName.trim().length < 2) errs.firstName = "Nome obrigatório (mín. 2 caracteres)";
    if (!lastName.trim() || lastName.trim().length < 2) errs.lastName = "Sobrenome obrigatório (mín. 2 caracteres)";
    if (!birthDate || birthDate.length < 10) errs.birthDate = "Data de nascimento obrigatória";
    if (isBrazilian) {
      if (!cpf || cpf.replace(/\D/g, "").length < 11) {
        errs.cpf = "CPF obrigatório (11 dígitos)";
      } else if (!isValidCPF(cpf)) {
        errs.cpf = "CPF inválido — verifique os dígitos";
      }
      const rgDigits = rg.replace(/[.\-\s]/g, "");
      if (!rgDigits || rgDigits.length < 7) errs.rg = "RG obrigatório (mín. 7 dígitos)";
    } else {
      if (!passport.trim() || passport.trim().length < 5) errs.passport = "Passaporte obrigatório (mínimo 5 caracteres)";
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "E-mail obrigatório e válido";
    if (!phone.trim()) errs.phone = "Telefone obrigatório";
    if (!height.trim()) errs.height = "Altura obrigatória";
    if (!weight.trim()) errs.weight = "Peso obrigatório";
    if (!lgpdConsent) errs.lgpdConsent = "Você precisa aceitar os termos de privacidade para continuar.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const name = `${firstName.trim()} ${lastName.trim()}`;

      // Upload documents first to get URLs
      let docFrontUrl: string | undefined;
      let docBackUrl: string | undefined;

      if (docFrontBase64) {
        setDocUploading(true);
        try {
          // Create client first with status lead to get an ID for upload
          const { id } = await createMutation.mutateAsync({
            name,
            cpf: isBrazilian ? cpf : undefined,
            rg: isBrazilian ? rg : undefined,
            nacionalidade: docOrigin,
            tipoDocumento: isBrazilian ? "rg" : "passaporte",
            numeroPassaporte: !isBrazilian ? passport : undefined,
            birthDate,
            phone,
            email,
            height,
            weight,
            accommodation,
            zipCode,
            street,
            number,
            complement,
            neighborhood,
            city,
            state: stateUF,
            country: isBrazilian ? "Brasil" : undefined,
            lgpdConsent,
            status: "lead",
          });

          // Upload front doc
          await uploadDocMutation.mutateAsync({ clientId: id, base64: docFrontBase64, side: "front", mimeType: docFrontMime });

          // Upload back doc if present
          if (docBackBase64) {
            await uploadDocMutation.mutateAsync({ clientId: id, base64: docBackBase64, side: "back", mimeType: docBackMime });
          }
        } finally {
          setDocUploading(false);
        }
      } else {
        // No document — create directly
        await createMutation.mutateAsync({
          name,
          cpf: isBrazilian ? cpf : undefined,
          rg: isBrazilian ? rg : undefined,
          nacionalidade: docOrigin,
          tipoDocumento: isBrazilian ? "rg" : "passaporte",
          numeroPassaporte: !isBrazilian ? passport : undefined,
          birthDate,
          phone,
          email,
          height,
          weight,
          accommodation,
          zipCode,
          street,
          number,
          complement,
          neighborhood,
          city,
          state: stateUF,
          country: isBrazilian ? "Brasil" : undefined,
          lgpdConsent,
          status: "lead",
        });
      }

      toast.success("Cliente criado com sucesso!");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const inputCls = "bg-secondary border-border text-sm";
  const inputErrCls = "bg-secondary border-red-500 text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Novo Cliente
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-6">

          {/* ── Identificação ──────────────────────────────────────────────── */}
          <div>
            <SectionHeader title="🪪 Identificação" />
            <div className="space-y-3">
              {/* Origem do documento */}
              <Field label="Origem do documento" required>
                <div className="flex gap-4 mt-1">
                  {(["brasileiro", "estrangeiro"] as const).map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="docOrigin"
                        value={opt}
                        checked={docOrigin === opt}
                        onChange={() => { setDocOrigin(opt); setCpf(""); setRg(""); setPassport(""); }}
                        className="accent-[#C8920A] w-4 h-4"
                      />
                      <span className="text-sm text-foreground capitalize">{opt === "brasileiro" ? "Brasileiro" : "Estrangeiro"}</span>
                    </label>
                  ))}
                </div>
              </Field>

              {/* Nome / Sobrenome */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome" required error={errors.firstName}>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="João" className={errors.firstName ? inputErrCls : inputCls} />
                </Field>
                <Field label="Sobrenome" required error={errors.lastName}>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Silva" className={errors.lastName ? inputErrCls : inputCls} />
                </Field>
              </div>

              {/* CPF + RG (brasileiro) */}
              {isBrazilian && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CPF" required error={errors.cpf}>
                    <Input value={cpf} onChange={e => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} className={errors.cpf ? inputErrCls : inputCls} />
                  </Field>
                  <Field label="RG" required error={errors.rg}>
                    <Input value={rg} onChange={e => setRg(maskRG(e.target.value))} placeholder="00.000.000-0" maxLength={12} className={errors.rg ? inputErrCls : inputCls} />
                  </Field>
                </div>
              )}

              {/* Passaporte (estrangeiro) */}
              {!isBrazilian && (
                <Field label="Passaporte" required error={errors.passport}>
                  <Input value={passport} onChange={e => setPassport(e.target.value.toUpperCase())} placeholder="Ex: AB123456" maxLength={20} className={errors.passport ? inputErrCls : inputCls} />
                </Field>
              )}

              {/* Data de nascimento */}
              <Field label="Data de nascimento" required error={errors.birthDate}>
                <Input value={birthDate} onChange={e => setBirthDate(maskDate(e.target.value))} placeholder="DD/MM/AAAA" maxLength={10} className={errors.birthDate ? inputErrCls : inputCls} />
              </Field>
            </div>
          </div>

          {/* ── Contato ────────────────────────────────────────────────────── */}
          <div>
            <SectionHeader title="📞 Contato" />
            <div className="space-y-3">
              <Field label="WhatsApp" required error={errors.phone}>
                <Input value={phone} onChange={e => setPhone(maskPhone(e.target.value))} placeholder="(48) 9 9999-9999" maxLength={16} className={errors.phone ? inputErrCls : inputCls} />
              </Field>
              <Field label="E-mail" required error={errors.email}>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@email.com" className={errors.email ? inputErrCls : inputCls} />
              </Field>
            </div>
          </div>

          {/* ── Medidas ────────────────────────────────────────────────────── */}
          <div>
            <SectionHeader title="📏 Medidas" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Altura (m)" required error={errors.height}>
                <Input value={height} onChange={e => setHeight(e.target.value)} placeholder="1.75" className={errors.height ? inputErrCls : inputCls} />
              </Field>
              <Field label="Peso (kg)" required error={errors.weight}>
                <Input type="number" min="20" max="300" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="75" className={errors.weight ? inputErrCls : inputCls} />
              </Field>
            </div>
          </div>

          {/* ── Endereço ───────────────────────────────────────────────────── */}
          <div>
            <SectionHeader title="📍 Endereço" />
            <div className="space-y-3">
              <Field label="CEP">
                <div className="relative">
                  <Input
                    value={zipCode}
                    onChange={e => handleCEP(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className={inputCls}
                  />
                  {cepLoading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-[#C8920A]" />}
                </div>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Rua">
                    <Input value={street} onChange={e => setStreet(e.target.value)} placeholder="Rua das Flores" className={inputCls} />
                  </Field>
                </div>
                <Field label="Número">
                  <Input value={number} onChange={e => setNumber(e.target.value)} placeholder="123" className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Complemento">
                  <Input value={complement} onChange={e => setComplement(e.target.value)} placeholder="Apto 4" className={inputCls} />
                </Field>
                <Field label="Bairro">
                  <Input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Centro" className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Cidade">
                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Florianópolis" className={inputCls} />
                  </Field>
                </div>
                <Field label="Estado">
                  <Input value={stateUF} onChange={e => setStateUF(e.target.value.toUpperCase())} placeholder="SC" maxLength={2} className={inputCls} />
                </Field>
              </div>
              <Field label="Hospedagem (opcional)">
                <Input value={accommodation} onChange={e => setAccommodation(e.target.value)} placeholder="Hotel, Airbnb, etc." className={inputCls} />
              </Field>
            </div>
          </div>

          {/* ── Documento ──────────────────────────────────────────────────── */}
          <div>
            <SectionHeader title="📄 Documento de identificação" />
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Envie o PDF da CNH digital (gov.br) ou RG — frente, verso e QR num arquivo só — ou uma foto do documento.
              </p>

              {/* Zona de upload única */}
              <div>
                <p className="text-xs font-semibold mb-2 text-muted-foreground">
                  {docFrontBase64 && showVerso
                    ? "Frente"
                    : docFrontIsPdf
                    ? "Documento (PDF)"
                    : "Documento"}
                  <span className="text-red-400 ml-0.5" />
                </p>

                {/* Hidden inputs */}
                <input ref={frontRef} type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleDocPhoto("front", f); }} />
                <input ref={backRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleDocPhoto("back", f); }} />

                {docFrontBase64 ? (
                  docFrontIsPdf ? (
                    /* PDF preview */
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-[#C8920A]/40 bg-[#C8920A]/5">
                      <FileText className="w-8 h-8 text-[#C8920A] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{docFrontName}</p>
                        <p className="text-xs text-muted-foreground">PDF carregado</p>
                      </div>
                      <button type="button" onClick={() => { setDocFrontBase64(null); setDocFrontIsPdf(false); setDocFrontName(""); }}
                        className="w-7 h-7 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-all flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* Image preview */
                    <div className="relative">
                      <img src={docFrontPreview!} alt="Frente" className="w-full h-36 object-cover rounded-xl border border-[#C8920A]/30" />
                      <button type="button" onClick={() => { setDocFrontBase64(null); setDocFrontPreview(null); setShowVerso(false); setDocBackBase64(null); setDocBackPreview(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                ) : (
                  /* Upload zone */
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-[#C8920A]/50 hover:bg-[#C8920A]/5 transition-all"
                    onClick={() => frontRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleDocPhoto("front", f); }}
                  >
                    <div className="flex gap-3">
                      <FileText className="w-7 h-7 text-[#C8920A]/60" />
                      <ImageIcon className="w-7 h-7 text-[#C8920A]/60" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Arraste aqui ou clique para selecionar</p>
                    <p className="text-xs text-muted-foreground">PDF ou imagem · até 10 MB</p>
                  </div>
                )}
                {errors.docFront && <p className="text-red-400 text-xs mt-1">{errors.docFront}</p>}
              </div>

              {/* Botão "Adicionar verso" — só para imagem, não PDF */}
              {docFrontBase64 && !docFrontIsPdf && !showVerso && (
                <button type="button"
                  onClick={() => setShowVerso(true)}
                  className="text-xs text-[#C8920A] underline underline-offset-2 hover:text-[#d9a020] transition-colors">
                  + Adicionar verso (opcional)
                </button>
              )}

              {/* Verso */}
              {showVerso && (
                <div>
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Verso</p>
                  {docBackPreview ? (
                    <div className="relative">
                      <img src={docBackPreview} alt="Verso" className="w-full h-36 object-cover rounded-xl border border-[#C8920A]/30" />
                      <button type="button" onClick={() => { setDocBackBase64(null); setDocBackPreview(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-[#C8920A]/50 hover:bg-[#C8920A]/5 transition-all"
                      onClick={() => backRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleDocPhoto("back", f); }}
                    >
                      <Upload className="w-6 h-6 text-[#C8920A]/60" />
                      <p className="text-xs text-muted-foreground">Clique ou arraste a foto aqui</p>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG — máx. 10 MB</p>
                    </div>
                  )}
                  {errors.docBack && <p className="text-red-400 text-xs mt-1">{errors.docBack}</p>}
                </div>
              )}
            </div>
          </div>

          {/* ── LGPD ───────────────────────────────────────────────────────── */}
          <div>
            <SectionHeader title="🛡️ Privacidade" />
            <div className="space-y-3">
              <div className="bg-secondary/50 border border-border rounded-lg p-4 text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground block mb-1">Política de Privacidade — LGPD</strong>
                Seus dados pessoais serão utilizados exclusivamente para a prestação dos serviços de aluguel de bicicletas da Bike To Go, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Não compartilhamos seus dados com terceiros sem seu consentimento.
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={lgpdConsent} onChange={e => setLgpdConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#C8920A] flex-shrink-0" />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  Li e concordo com a Política de Privacidade e autorizo o tratamento dos meus dados pessoais para a finalidade descrita acima. <span className="text-red-400">*</span>
                </span>
              </label>
              {errors.lgpdConsent && <p className="text-red-400 text-xs">{errors.lgpdConsent}</p>}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={marketingConsent} onChange={e => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#C8920A] flex-shrink-0" />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  Aceito receber comunicações de marketing e promoções da Bike To Go.
                </span>
              </label>
            </div>
          </div>

          {/* ── Botões ─────────────────────────────────────────────────────── */}
          <div className="flex gap-3 pt-2 pb-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || docUploading}
              className="flex-1"
              style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
            >
              {submitting || docUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Criando...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" />Criar cliente</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
