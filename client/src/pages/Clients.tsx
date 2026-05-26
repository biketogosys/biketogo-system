import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { RotateCcw, Archive } from "lucide-react";
import { Link } from "wouter";
import {
  Search, Plus, Loader2, User, MapPin, Calendar, ChevronRight,
  Trash2, X, Upload, CheckCircle2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  maskCPF, maskRG, maskCEP, maskPhone, isValidCPF, isValidRG, fetchViaCEP,
  dateDisplayToISO, maskDate,
} from "@/hooks/useMask";

// ─── Status Badge ─────────────────────────────────────────────────────────────
type Status = "lead" | "verified" | "blocked" | undefined;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    lead: { cls: "badge-lead", label: "Lead" },
    verified: { cls: "badge-verified", label: "Verificado" },
    blocked: { cls: "badge-blocked", label: "Bloqueado" },
  };
  const s = map[status] ?? { cls: "badge-lead", label: status };
  return <span className={s.cls}>{s.label}</span>;
}

// ─── DDI list ─────────────────────────────────────────────────────────────────
const DDI_LIST = [
  { code: "+55", label: "🇧🇷 +55 Brasil" },
  { code: "+1",  label: "🇺🇸 +1 EUA/Canadá" },
  { code: "+54", label: "🇦🇷 +54 Argentina" },
  { code: "+56", label: "🇨🇱 +56 Chile" },
  { code: "+598", label: "🇺🇾 +598 Uruguai" },
  { code: "+595", label: "🇵🇾 +595 Paraguai" },
  { code: "+34", label: "🇪🇸 +34 Espanha" },
  { code: "+351", label: "🇵🇹 +351 Portugal" },
  { code: "+44", label: "🇬🇧 +44 Reino Unido" },
  { code: "+49", label: "🇩🇪 +49 Alemanha" },
  { code: "+33", label: "🇫🇷 +33 França" },
  { code: "+39", label: "🇮🇹 +39 Itália" },
  { code: "+81", label: "🇯🇵 +81 Japão" },
  { code: "+86", label: "🇨🇳 +86 China" },
  { code: "+91", label: "🇮🇳 +91 Índia" },
];

// ─── Empty form state ─────────────────────────────────────────────────────────
function emptyForm() {
  return {
    name: "",
    birthDate: "",
    nacionalidade: "" as "" | "brasileiro" | "estrangeiro",
    tipoDocumento: "cnh" as "cnh" | "rg" | "passaporte", // cnh ou rg para brasileiro, passaporte para estrangeiro
    cpf: "",
    rg: "",
    numeroPassaporte: "",
    ddi: "+55",
    phone: "",
    phoneAlt: "",
    email: "",
    instagram: "",
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    country: "Brasil",
    height: "",
    weight: "",
    pedalFrequency: "" as "" | "iniciante" | "intermediario" | "avancado",
    tipoUso: "" as "" | "lazer" | "esporte" | "urbano" | "cicloturismo",
    notes: "",
    accommodation: "",
    origin: "",
    lgpdConsent: false,
    aceiteMarketing: false,
  };
}

// ─── New Client Modal (6 tabs) ────────────────────────────────────────────────
interface NewClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function NewClientModal({ open, onClose, onSuccess }: NewClientModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("identificacao");
  const [cepLoading, setCepLoading] = useState(false);
  const [docFrenteFile, setDocFrenteFile] = useState<File | null>(null);
  const [docVersoFile, setDocVersoFile] = useState<File | null>(null);
  const [docFrentePreview, setDocFrentePreview] = useState("");
  const [docVersoPreview, setDocVersoPreview] = useState("");
  const frenteRef = useRef<HTMLInputElement>(null);
  const versoRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente criado com sucesso!");
      utils.clients.list.invalidate();
      onSuccess();
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setForm(emptyForm());
    setActiveTab("identificacao");
    setDocFrenteFile(null);
    setDocVersoFile(null);
    setDocFrentePreview("");
    setDocVersoPreview("");
  }

  function set<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCEPBlur() {
    const digits = form.zipCode.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    const result = await fetchViaCEP(digits);
    setCepLoading(false);
    if (!result) return toast.error("CEP não encontrado.");
    setForm((f) => ({
      ...f,
      street: result.logradouro || f.street,
      neighborhood: result.bairro || f.neighborhood,
      city: result.localidade || f.city,
      state: result.uf || f.state,
    }));
  }

  function handleFileChange(side: "frente" | "verso", file: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (side === "frente") { setDocFrenteFile(file); setDocFrentePreview(url); }
    else { setDocVersoFile(file); setDocVersoPreview(url); }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setActiveTab("identificacao"); return toast.error("Nome é obrigatório."); }
    if (!form.lgpdConsent) { setActiveTab("lgpd"); return toast.error("Aceite os termos de uso para continuar."); }
    if (form.nacionalidade === "brasileiro" && form.cpf && !isValidCPF(form.cpf)) {
      setActiveTab("identificacao");
      return toast.error("CPF inválido. Verifique os dígitos verificadores.");
    }
    if (form.rg && !isValidRG(form.rg)) {
      setActiveTab("identificacao");
      return toast.error("RG inválido. Verifique o dígito verificador.");
    }

    const phone = form.ddi !== "+55" ? `${form.ddi} ${form.phone}` : form.phone;

    createMutation.mutate({
      name: form.name,
      cpf: form.nacionalidade !== "estrangeiro" ? (form.cpf || undefined) : undefined,
      rg: form.nacionalidade !== "estrangeiro" ? (form.rg || undefined) : undefined,
      birthDate: form.birthDate ? dateDisplayToISO(form.birthDate) : undefined,
      nacionalidade: (form.nacionalidade || undefined) as "brasileiro" | "estrangeiro" | undefined,
      tipoDocumento: (form.tipoDocumento || undefined) as "cnh" | "rg" | "passaporte" | undefined,
      numeroPassaporte: form.tipoDocumento === "passaporte" ? (form.numeroPassaporte || undefined) : undefined,
      phone: phone || undefined,
      email: form.email || undefined,
      instagram: form.instagram || undefined,
      zipCode: form.zipCode || undefined,
      street: form.street || undefined,
      number: form.number || undefined,
      complement: form.complement || undefined,
      neighborhood: form.neighborhood || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      country: form.country || "Brasil",
      pedalFrequency: form.pedalFrequency || undefined,
      origin: form.origin || undefined,
      accommodation: form.accommodation || undefined,
      notes: form.notes || undefined,
      height: form.height || undefined,
      weight: form.weight || undefined,
      lgpdConsent: form.lgpdConsent,
      status: "lead",
    });
  }

  if (!open) return null;

  const inputCls = "bg-secondary border-border text-sm";
  const labelCls = "text-xs text-muted-foreground mb-1.5 block";
  const canSave = form.lgpdConsent && !createMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { onClose(); resetForm(); }} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Novo Cliente
          </h2>
          <button onClick={() => { onClose(); resetForm(); }} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="flex-shrink-0 mx-5 mt-4 grid grid-cols-6 h-auto gap-0.5">
              {[
                { value: "identificacao", label: "1. ID" },
                { value: "contato", label: "2. Contato" },
                { value: "endereco", label: "3. Endereço" },
                { value: "documento", label: "4. Docs" },
                { value: "perfil", label: "5. Perfil" },
                { value: "lgpd", label: "6. LGPD" },
              ].map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-1 py-1.5">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* ── Aba 1: Identificação ── */}
              <TabsContent value="identificacao" className="mt-0 space-y-4">
                <div>
                  <Label className={labelCls}>Nome completo *</Label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="João Silva" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelCls}>Data de nascimento</Label>
                    <Input
                      value={form.birthDate}
                      onChange={(e) => set("birthDate", maskDate(e.target.value))}
                      placeholder="DD/MM/AAAA"
                      className={inputCls}
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Nacionalidade</Label>
                    <Select value={form.nacionalidade} onValueChange={(v) => set("nacionalidade", v as "brasileiro" | "estrangeiro")}>
                      <SelectTrigger className={inputCls}>
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brasileiro">Brasileiro</SelectItem>
                        <SelectItem value="estrangeiro">Estrangeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Documentos: CPF+RG para brasileiros, Passaporte para estrangeiros */}
                {form.nacionalidade !== "estrangeiro" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className={labelCls}>
                        CPF
                        {form.cpf.replace(/\D/g, "").length === 11 && (
                          isValidCPF(form.cpf)
                            ? <CheckCircle2 className="inline w-3 h-3 ml-1 text-green-500" />
                            : <AlertCircle className="inline w-3 h-3 ml-1 text-destructive" />
                        )}
                      </Label>
                      <Input
                        value={form.cpf}
                        onChange={(e) => set("cpf", maskCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        className={inputCls}
                        maxLength={14}
                      />
                    </div>
                    <div>
                      <Label className={labelCls}>
                        RG
                        {form.rg.replace(/[.\-\s]/g, "").length >= 8 && (
                          isValidRG(form.rg)
                            ? <CheckCircle2 className="inline w-3 h-3 ml-1 text-green-500" />
                            : <AlertCircle className="inline w-3 h-3 ml-1 text-destructive" />
                        )}
                      </Label>
                      <Input
                        value={form.rg}
                        onChange={(e) => set("rg", maskRG(e.target.value))}
                        placeholder="00.000.000-0"
                        className={inputCls}
                        maxLength={12}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className={labelCls}>Número do Passaporte *</Label>
                    <Input
                      value={form.numeroPassaporte}
                      onChange={(e) => { set("numeroPassaporte", e.target.value.toUpperCase()); set("tipoDocumento", "passaporte"); }}
                      placeholder="AB123456"
                      className={inputCls}
                      maxLength={50}
                    />
                  </div>
                )}
              </TabsContent>

              {/* ── Aba 2: Contato ── */}
              <TabsContent value="contato" className="mt-0 space-y-4">
                <div>
                  <Label className={labelCls}>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="joao@email.com" className={inputCls} />
                </div>
                <div>
                  <Label className={labelCls}>WhatsApp</Label>
                  <div className="flex gap-2">
                    <Select value={form.ddi} onValueChange={(v) => set("ddi", v)}>
                      <SelectTrigger className={`${inputCls} w-44 flex-shrink-0`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DDI_LIST.map((d) => (
                          <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={form.phone}
                      onChange={(e) => set("phone", form.ddi === "+55" ? maskPhone(e.target.value) : e.target.value)}
                      placeholder={form.ddi === "+55" ? "(48) 9 9999-9999" : "Número"}
                      className={`${inputCls} flex-1`}
                    />
                  </div>
                </div>
                <div>
                  <Label className={labelCls}>Telefone alternativo</Label>
                  <Input
                    value={form.phoneAlt}
                    onChange={(e) => set("phoneAlt", maskPhone(e.target.value))}
                    placeholder="(48) 3333-4444"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className={labelCls}>Instagram</Label>
                  <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@usuario" className={inputCls} />
                </div>
              </TabsContent>

              {/* ── Aba 3: Endereço ── */}
              <TabsContent value="endereco" className="mt-0 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label className={labelCls}>CEP</Label>
                    <div className="relative">
                      <Input
                        value={form.zipCode}
                        onChange={(e) => set("zipCode", maskCEP(e.target.value))}
                        onBlur={handleCEPBlur}
                        placeholder="00000-000"
                        className={inputCls}
                        maxLength={9}
                      />
                      {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                  <div>
                    <Label className={labelCls}>Estado</Label>
                    <Input value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} placeholder="SC" className={inputCls} maxLength={2} />
                  </div>
                </div>
                <div>
                  <Label className={labelCls}>Logradouro</Label>
                  <Input value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="Rua das Flores" className={inputCls} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className={labelCls}>Número</Label>
                    <Input value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="123" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <Label className={labelCls}>Complemento</Label>
                    <Input value={form.complement} onChange={(e) => set("complement", e.target.value)} placeholder="Apto 4" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelCls}>Bairro</Label>
                    <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="Centro" className={inputCls} />
                  </div>
                  <div>
                    <Label className={labelCls}>Cidade</Label>
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Florianópolis" className={inputCls} />
                  </div>
                </div>
                <div>
                  <Label className={labelCls}>País</Label>
                  <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Brasil" className={inputCls} />
                </div>
              </TabsContent>

              {/* ── Aba 4: Documentos ── */}
              <TabsContent value="documento" className="mt-0 space-y-5">
                <p className="text-xs text-muted-foreground">
                  Faça upload das fotos do documento de identificação. A frente é obrigatória.
                </p>
                {/* Frente */}
                <div>
                  <Label className={labelCls}>Frente do documento *</Label>
                  <input
                    ref={frenteRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange("frente", e.target.files?.[0] ?? null)}
                  />
                  {docFrentePreview ? (
                    <div className="relative w-full h-36 rounded-lg overflow-hidden border border-border bg-secondary">
                      <img src={docFrentePreview} alt="Frente" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setDocFrenteFile(null); setDocFrentePreview(""); }}
                        className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => frenteRef.current?.click()}
                      className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Clique para selecionar</span>
                    </button>
                  )}
                </div>
                {/* Verso */}
                <div>
                  <Label className={labelCls}>Verso do documento (opcional)</Label>
                  <input
                    ref={versoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange("verso", e.target.files?.[0] ?? null)}
                  />
                  {docVersoPreview ? (
                    <div className="relative w-full h-36 rounded-lg overflow-hidden border border-border bg-secondary">
                      <img src={docVersoPreview} alt="Verso" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setDocVersoFile(null); setDocVersoPreview(""); }}
                        className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => versoRef.current?.click()}
                      className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Clique para selecionar (opcional)</span>
                    </button>
                  )}
                </div>
                {(docFrenteFile || docVersoFile) && (
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Os documentos serão enviados após criar o cliente (integração S3 pendente).
                  </p>
                )}
              </TabsContent>

              {/* ── Aba 5: Perfil de uso ── */}
              <TabsContent value="perfil" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelCls}>Altura (cm)</Label>
                    <Input
                      value={form.height}
                      onChange={(e) => set("height", e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder="175"
                      className={inputCls}
                      maxLength={3}
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Peso (kg)</Label>
                    <Input
                      type="number"
                      min="20"
                      max="300"
                      step="0.1"
                      value={form.weight}
                      onChange={(e) => set("weight", e.target.value)}
                      placeholder="75.5"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <Label className={labelCls}>Experiência em ciclismo</Label>
                  <Select value={form.pedalFrequency} onValueChange={(v) => set("pedalFrequency", v as "iniciante" | "intermediario" | "avancado")}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={labelCls}>Tipo de uso preferido</Label>
                  <Select value={form.tipoUso} onValueChange={(v) => set("tipoUso", v as "lazer" | "esporte" | "urbano" | "cicloturismo")}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lazer">Lazer</SelectItem>
                      <SelectItem value="esporte">Esporte</SelectItem>
                      <SelectItem value="urbano">Urbano</SelectItem>
                      <SelectItem value="cicloturismo">Cicloturismo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={labelCls}>Origem / Como nos conheceu</Label>
                  <Input value={form.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Instagram, indicação..." className={inputCls} />
                </div>
                <div>
                  <Label className={labelCls}>Hospedagem / Acomodação</Label>
                  <Input value={form.accommodation} onChange={(e) => set("accommodation", e.target.value)} placeholder="Hotel, pousada..." className={inputCls} />
                </div>
                <div>
                  <Label className={labelCls}>Observações internas (visível apenas para admin)</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Notas sobre o cliente..."
                    className={`${inputCls} resize-none`}
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* ── Aba 6: LGPD ── */}
              <TabsContent value="lgpd" className="mt-0 space-y-5">
                <div className="rounded-lg border border-border bg-secondary/50 p-4 text-xs text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground mb-2">Termos de uso e Política de Privacidade</p>
                  <p>
                    Ao cadastrar seus dados, você concorda com o tratamento das informações pessoais
                    pela Bike To Go para fins de gestão de locações, comunicação e melhorias de serviço,
                    conforme a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
                  </p>
                  <p className="mt-2">
                    Seus dados são armazenados com segurança e não serão compartilhados com terceiros
                    sem seu consentimento explícito.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="lgpdConsent"
                    checked={form.lgpdConsent}
                    onCheckedChange={(v) => set("lgpdConsent", !!v)}
                    className="mt-0.5"
                  />
                  <label htmlFor="lgpdConsent" className="text-sm text-foreground cursor-pointer leading-snug">
                    Li e aceito os Termos de Uso e a Política de Privacidade. *
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="aceiteMarketing"
                    checked={form.aceiteMarketing}
                    onCheckedChange={(v) => set("aceiteMarketing", !!v)}
                    className="mt-0.5"
                  />
                  <label htmlFor="aceiteMarketing" className="text-sm text-muted-foreground cursor-pointer leading-snug">
                    Aceito receber comunicações de marketing e promoções por e-mail e WhatsApp. (opcional)
                  </label>
                </div>
                {!form.lgpdConsent && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    O aceite dos termos é obrigatório para salvar o cadastro.
                  </p>
                )}
              </TabsContent>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => { onClose(); resetForm(); }} className="flex-1">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!canSave}
                className="flex-1"
                style={canSave ? { background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" } : {}}
              >
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
                ) : (
                  "Salvar cliente"
                )}
              </Button>
            </div>
          </Tabs>
        </form>
      </div>
    </div>
  );
}

// ─── Main Clients page ────────────────────────────────────────────────────────
export default function Clients() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>(undefined);
  const [showNew, setShowNew] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  const [archivedPage, setArchivedPage] = useState(1);
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

  const { data, isLoading } = trpc.clients.list.useQuery({
    search: search || undefined,
    status,
    page,
    limit: 20,
  }, { enabled: viewMode === "active" });

  const { data: archivedData, isLoading: archivedLoading } = trpc.clients.listArchived.useQuery({
    page: archivedPage,
    limit: 20,
  }, { enabled: viewMode === "archived" });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => { toast.success("Cliente arquivado."); utils.clients.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const restoreMutation = trpc.clients.restore.useMutation({
    onSuccess: () => {
      toast.success("Cliente restaurado com sucesso.");
      utils.clients.listArchived.invalidate();
      utils.clients.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const clients = data?.items ?? [];
  const total = data?.total ?? 0;
  const archivedClients = archivedData?.items ?? [];
  const archivedTotal = archivedData?.total ?? 0;

  const statusFilters: { label: string; value: Status; cls: string }[] = [
    { label: "Todos", value: undefined, cls: "" },
    { label: "Lead", value: "lead", cls: "badge-lead" },
    { label: "Verificado", value: "verified", cls: "badge-verified" },
    { label: "Bloqueado", value: "blocked", cls: "badge-blocked" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Clientes
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            {total} cliente{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setShowNew(true)}
          className="gap-2 h-9 text-xs md:text-sm"
          style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo cliente</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* View mode tabs + Filters — single compact row */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setViewMode("active")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
              viewMode === "active"
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-3.5 h-3.5" /> Ativos
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

        {/* Filters — horizontal compact */}
        {viewMode === "active" && (
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou RG..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-border h-9 text-sm"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {statusFilters.map((f) => (
                <button
                  key={String(f.value)}
                  onClick={() => setStatus(f.value)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all border ${
                    status === f.value
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              {(search || status) && (
                <button
                  onClick={() => { setSearch(""); setStatus(undefined); }}
                  className="px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground border border-border bg-card"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Archived table */}
      {viewMode === "archived" && (
        <>
          {archivedLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : archivedClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Archive className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhum cliente arquivado</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full hidden md:table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">ID</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Cliente</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Arquivado em</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {archivedClients.map((client, idx) => (
                    <tr key={client.id} className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${idx === archivedClients.length - 1 ? "border-b-0" : ""}` }>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">#{client.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-muted-foreground">{client.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{client.name}</p>
                            {client.cpf && <p className="text-xs text-muted-foreground">{client.cpf}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <span>{client.deletedAt ? new Date(client.deletedAt).toLocaleDateString("pt-BR") : "—"}</span>
                          {(() => { const b = calcRetentionBadge(client.deletedAt); return b ? <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${b.cls}`}>{b.label}</span> : null; })()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => restoreMutation.mutate({ id: client.id })}
                          disabled={restoreMutation.isPending}
                        >
                          <RotateCcw className="w-3 h-3" /> Restaurar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-border">
                {archivedClients.map((client) => (
                  <div key={client.id} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-muted-foreground">{client.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground">Arquivado em {client.deletedAt ? new Date(client.deletedAt).toLocaleDateString("pt-BR") : "—"}</p>
                      {(() => { const b = calcRetentionBadge(client.deletedAt); return b ? <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${b.cls} mt-0.5`}>{b.label}</span> : null; })()}
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => restoreMutation.mutate({ id: client.id })} disabled={restoreMutation.isPending}>
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

      {/* Active table */}
      {viewMode === "active" && isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : viewMode === "active" && clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <User className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhum cliente encontrado</p>
        </div>
      ) : viewMode === "active" && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full table-compact">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Cliente</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Localidade</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Status</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Atualização</th>
                  <th className="w-24 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="group border-b border-border/40 last:border-b-0">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-semibold text-primary">{client.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-foreground truncate">{client.name}</p>
                          {client.cpf && <p className="text-[11px] text-muted-foreground">{client.cpf}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {(client.city || client.state) ? (
                        <span className="text-[12px] text-muted-foreground">
                          {[client.city, client.state].filter(Boolean).join("/")}
                        </span>
                      ) : (
                        <span className="text-[12px] text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={client.status} /></td>
                    <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                      {new Date(client.updatedAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 row-actions">
                        <Link href={`/clientes/${client.id}`}>
                          <button className="text-[12px] text-primary hover:underline font-medium">Ver</button>
                        </Link>
                        <button
                          onClick={() => { if (confirm(`Arquivar ${client.name}?`)) deleteMutation.mutate({ id: client.id }); }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {clients.map((client) => (
              <Link key={client.id} href={`/clientes/${client.id}`}>
                <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3 active:bg-accent/40 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">{client.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[client.city, client.state].filter(Boolean).join("/") || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={client.status} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {(data?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                ← Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {data?.totalPages ?? 1}
              </span>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPage((p) => p + 1)} disabled={page >= (data?.totalPages ?? 1)}>
                Próxima →
              </Button>
            </div>
          )}
        </>
      )}

      <NewClientModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onSuccess={() => setShowNew(false)}
      />
    </div>
  );
}
