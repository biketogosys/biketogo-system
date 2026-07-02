import { trpc } from "@/lib/trpc";
import { NewContractModal } from "@/components/NewContractModal";
import { useParams, useLocation } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, CheckCircle, Mail, Phone,
  Bike, Clock, FileText, Shield,
  User, Image as ImageIcon, Trash2, Upload, X,
  CheckCircle2, AlertCircle, Edit2, CreditCard, PlusCircle, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  maskCPF, maskRG, maskCEP, maskPhone, maskDate,
  isValidCPF, fetchViaCEP, dateDisplayToISO, dateISOToDisplay,
} from "@/hooks/useMask";
import { HelpCircle, Smartphone, Download } from "lucide-react";

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    lead: { cls: "badge-lead", label: "Lead" },
    verified: { cls: "badge-verified", label: "Verificado" },
    blocked: { cls: "badge-blocked", label: "Bloqueado" },
    recusado: { cls: "badge-blocked", label: "Recusado" },
  };
  const s = map[status] ?? { cls: "badge-lead", label: status };
  return <span className={s.cls}>{s.label}</span>;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
interface EditClientModalProps {
  open: boolean;
  onClose: () => void;
  client: any;
  clientId: number;
  onSuccess: () => void;
}

function EditClientModal({ open, onClose, client, clientId, onSuccess }: EditClientModalProps) {
  // Parse DDI from phone: if phone starts with +XX, extract it
  function parseDDI(phone: string | null | undefined): { ddi: string; number: string } {
    if (!phone) return { ddi: "+55", number: "" };
    const match = phone.match(/^(\+\d{1,4})\s(.+)$/);
    if (match) return { ddi: match[1], number: match[2] };
    return { ddi: "+55", number: phone };
  }

  const { ddi: initDdi, number: initPhone } = parseDDI(client?.phone);

  // Split existing name into firstName/lastName
  const nameParts = (client?.name ?? "").trim().split(" ");
  const initFirst = (client as any)?.firstName || nameParts[0] || "";
  const initLast = (client as any)?.lastName || nameParts.slice(1).join(" ") || "";

  const [form, setForm] = useState(() => ({
    firstName: initFirst,
    lastName: initLast,
    birthDate: client?.birthDate ? dateISOToDisplay(client.birthDate) : "",
    gender: (client as any)?.gender ?? "",
    nacionalidade: (client?.nacionalidade as "" | "brasileiro" | "estrangeiro") ?? "",
    tipoDocumento: (client?.tipoDocumento as "cnh" | "rg" | "passaporte") ?? "cnh",
    cpf: client?.cpf ?? "",
    rg: client?.rg ?? "",
    numeroPassaporte: client?.numeroPassaporte ?? "",
    ddi: initDdi,
    phone: initPhone,
    phoneAlt: client?.phoneAlt ?? "",
    email: client?.email ?? "",
    instagram: client?.instagram ?? "",
    zipCode: client?.zipCode ?? "",
    street: client?.street ?? "",
    number: client?.number ?? "",
    complement: client?.complement ?? "",
    neighborhood: client?.neighborhood ?? "",
    city: client?.city ?? "",
    state: client?.state ?? "",
    country: client?.country ?? "Brasil",
    height: client?.height ?? "",
    weight: client?.weight ?? "",
    pedalFrequency: client?.pedalFrequency ?? "",
    notes: client?.notes ?? "",
    accommodation: client?.accommodation ?? "",
    origin: client?.origin ?? "",
    lgpdConsent: client?.lgpdConsent ?? false,
    aceiteMarketing: client?.aceiteMarketing ?? false,
    // doc upload state
    docFrontBase64: null as string | null,
    docFrontIsPdf: false,
    docBackBase64: null as string | null,
    showVerso: false,
  }));

  const [activeTab, setActiveTab] = useState("identificacao");
  const [cepLoading, setCepLoading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const docRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const updateMutation = trpc.clients.update.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const uploadDocMutation = trpc.publicApi.uploadDocument.useMutation();
  const getUploadTokenMut = trpc.clients.getUploadToken.useMutation();

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
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

  function handleDocPhoto(side: "front" | "back", file: File) {
    const isPdf = file.type === "application/pdf";
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      if (side === "front") {
        setForm((f) => ({ ...f, docFrontBase64: b64, docFrontIsPdf: isPdf, showVerso: isPdf ? false : f.showVerso, docBackBase64: isPdf ? null : f.docBackBase64 }));
      } else {
        setForm((f) => ({ ...f, docBackBase64: b64 }));
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim()) { setActiveTab("identificacao"); return toast.error("Nome é obrigatório."); }
    if (!form.lastName.trim()) { setActiveTab("identificacao"); return toast.error("Sobrenome é obrigatório."); }
    if (!form.email.trim()) { setActiveTab("contato"); return toast.error("E-mail é obrigatório."); }
    if (form.nacionalidade !== "estrangeiro") {
      if (!form.cpf.trim()) { setActiveTab("identificacao"); return toast.error("CPF é obrigatório."); }
      if (!isValidCPF(form.cpf)) { setActiveTab("identificacao"); return toast.error("CPF inválido."); }
      if (!form.rg.trim() || form.rg.replace(/\D/g, "").length < 7) { setActiveTab("identificacao"); return toast.error("RG inválido (mín. 7 dígitos)."); }
    }
    if (!form.height.trim()) { setActiveTab("perfil"); return toast.error("Altura é obrigatória."); }
    if (!form.weight.toString().trim()) { setActiveTab("perfil"); return toast.error("Peso é obrigatório."); }
    if (!form.lgpdConsent) { setActiveTab("lgpd"); return toast.error("Aceite os termos de uso."); }

    const phone = form.ddi !== "+55" ? `${form.ddi} ${form.phone}` : form.phone;
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;

    setDocUploading(true);
    try {
      await updateMutation.mutateAsync({
        id: clientId,
        name: fullName || undefined,
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
      });

      // Upload documents if selected (SEC-1: obtain HMAC token first)
      if (form.docFrontBase64 || form.docBackBase64) {
        const { uploadToken } = await getUploadTokenMut.mutateAsync({ clientId });
        if (form.docFrontBase64) {
          const mimeType = form.docFrontIsPdf ? "application/pdf" : "image/jpeg";
          await uploadDocMutation.mutateAsync({ token: uploadToken, base64: form.docFrontBase64, side: "front", mimeType });
        }
        if (form.docBackBase64) {
          await uploadDocMutation.mutateAsync({ token: uploadToken, base64: form.docBackBase64, side: "back", mimeType: "image/jpeg" });
        }
      }

      toast.success("Cliente atualizado com sucesso!");
      utils.clients.byId.invalidate({ id: clientId });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar cliente.");
    } finally {
      setDocUploading(false);
    }
  }

  if (!open) return null;

  const inputCls = "bg-secondary border-border text-sm";
  const labelCls = "text-xs text-muted-foreground mb-1.5 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Editar Cliente
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-shrink-0 mx-5 mt-4 overflow-x-auto">
              <TabsList className="flex w-max min-w-full h-auto gap-0.5">
                {[
                  { value: "identificacao", label: "1. ID" },
                  { value: "contato", label: "2. Contato" },
                  { value: "endereco", label: "3. Endereço" },
                  { value: "documento", label: "4. Docs" },
                  { value: "perfil", label: "5. Perfil" },
                  { value: "lgpd", label: "6. LGPD" },
                ].map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-2 py-1.5 flex-1 min-w-[60px]">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* ── Aba 1: Identificação ── */}
              <TabsContent value="identificacao" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelCls}>Nome *</Label>
                    <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="João" className={inputCls} />
                  </div>
                  <div>
                    <Label className={labelCls}>Sobrenome *</Label>
                    <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Silva" className={inputCls} />
                  </div>
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
                    <Label className={labelCls}>Gênero</Label>
                    <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                      <SelectTrigger className={inputCls}><SelectValue placeholder="--" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                        <SelectItem value="Prefiro nao informar">Prefiro não informar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                {/* Documentos: CPF+RG para brasileiros, Passaporte para estrangeiros */}
                {form.nacionalidade !== "estrangeiro" ? (
                  <>
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
                        <Label className={labelCls}>RG *</Label>
                        <Input
                          value={form.rg}
                          onChange={(e) => set("rg", maskRG(e.target.value))}
                          placeholder="00.000.000-0"
                          className={inputCls}
                          maxLength={12}
                        />
                      </div>
                    </div>
                  </>
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
                  Envie o PDF da CNH digital (gov.br) ou RG — frente, verso e QR num arquivo só — ou uma foto do documento.
                </p>
                {/* Zona única */}
                <div>
                  <Label className={labelCls}>
                    {form.docFrontBase64 && form.showVerso ? "Frente" : form.docFrontIsPdf ? "Documento (PDF)" : "Documento"}
                  </Label>
                  <input
                    ref={docRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocPhoto("front", f); e.target.value = ""; }}
                  />
                  {form.docFrontBase64 ? (
                    <div className="relative w-full rounded-lg overflow-hidden border border-border bg-secondary">
                      {form.docFrontIsPdf ? (
                        <div className="flex items-center gap-3 px-4 py-3">
                          <FileText className="w-8 h-8 text-[#C8920A]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">PDF selecionado</p>
                            <p className="text-xs text-muted-foreground">Frente, verso e QR incluídos</p>
                          </div>
                          <button type="button" onClick={() => setForm((f) => ({ ...f, docFrontBase64: null, docFrontIsPdf: false, showVerso: false, docBackBase64: null }))} className="text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <img src={form.docFrontBase64} alt="Frente" className="w-full h-36 object-cover" />
                          <button type="button" onClick={() => setForm((f) => ({ ...f, docFrontBase64: null, showVerso: false, docBackBase64: null }))} className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80">
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div
                      className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:border-[#C8920A]/50 hover:text-[#C8920A] transition-colors"
                      onClick={() => docRef.current?.click()}
                      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleDocPhoto("front", f); }}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <div className="flex gap-3">
                        <FileText className="w-6 h-6 text-[#C8920A]/60" />
                        <ImageIcon className="w-6 h-6 text-[#C8920A]/60" />
                      </div>
                      <p className="text-xs font-medium">Arraste aqui ou clique para selecionar</p>
                      <p className="text-[11px] text-muted-foreground/70">PDF ou imagem · até 10 MB</p>
                    </div>
                  )}
                </div>
                {/* Botão adicionar verso */}
                {form.docFrontBase64 && !form.docFrontIsPdf && !form.showVerso && (
                  <button type="button" onClick={() => set("showVerso", true)}
                    className="text-xs text-[#C8920A] underline underline-offset-2 hover:opacity-80 transition-opacity">
                    + Adicionar verso
                  </button>
                )}
                {/* Verso */}
                {form.showVerso && (
                  <div>
                    <Label className={labelCls}>Verso</Label>
                    <input ref={backRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocPhoto("back", f); e.target.value = ""; }} />
                    {form.docBackBase64 ? (
                      <div className="relative w-full rounded-lg overflow-hidden border border-border bg-secondary">
                        <img src={form.docBackBase64} alt="Verso" className="w-full h-36 object-cover" />
                        <button type="button" onClick={() => setForm((f) => ({ ...f, docBackBase64: null }))} className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:border-[#C8920A]/50 hover:text-[#C8920A] transition-colors"
                        onClick={() => backRef.current?.click()}
                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleDocPhoto("back", f); }}
                        onDragOver={(e) => e.preventDefault()}>
                        <ImageIcon className="w-6 h-6 text-[#C8920A]/60" />
                        <p className="text-xs">Clique ou arraste a foto aqui</p>
                      </div>
                    )}
                  </div>
                )}
                {/* Tutorial */}
                <div className="border-t border-border pt-4">
                  <p className="text-[13px] font-medium mb-3 flex items-center gap-1.5 text-muted-foreground">
                    <HelpCircle className="w-4 h-4 text-gray-500 shrink-0" />
                    Como baixar o PDF da sua CNH digital
                  </p>
                  <ol className="flex flex-col gap-2.5">
                    {[
                      { Icon: Smartphone, text: "Abra a Carteira Digital de Trânsito ou o gov.br e acesse sua CNH" },
                      { Icon: Download, text: "Toque em Exportar / Baixar PDF e salve o arquivo" },
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3 text-xs text-muted-foreground leading-relaxed">
                        <span className="font-bold text-[#C8920A] min-w-fit">{i + 1}.</span>
                        <div className="flex gap-2 items-start">
                          <item.Icon className="w-4 h-4 text-[#C8920A] mt-0.5 flex-shrink-0" />
                          <span>{item.text}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="rounded-lg px-3 py-2.5 flex items-start gap-2 bg-secondary/50">
                  <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Estrangeiro ou sem CNH digital? Envie uma foto do documento (passaporte ou RG).
                  </span>
                </div>
              </TabsContent>

              {/* ── Aba 5: Perfil de uso ── */}
              <TabsContent value="perfil" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelCls}>Altura (m) *</Label>
                    <Input
                      value={form.height}
                      onChange={(e) => set("height", e.target.value)}
                      placeholder="1.75"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Peso (kg) *</Label>
                    <Input
                      type="number"
                      min="20"
                      max="300"
                      step="0.1"
                      value={form.weight}
                      onChange={(e) => set("weight", e.target.value)}
                      placeholder="75"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <Label className={labelCls}>Experiência em ciclismo</Label>
                  <Select value={form.pedalFrequency} onValueChange={(v) => set("pedalFrequency", v)}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Raramente">Raramente</SelectItem>
                      <SelectItem value="1x por semana">1x por semana</SelectItem>
                      <SelectItem value="2-3x por semana">2-3x por semana</SelectItem>
                      <SelectItem value="4-5x por semana">4-5x por semana</SelectItem>
                      <SelectItem value="Diariamente">Diariamente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={labelCls}>Como nos encontrou</Label>
                  <Select value={form.origin} onValueChange={(v) => set("origin", v)}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pela internet">Pela internet</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Indicacao de amigo">Indicação de amigo</SelectItem>
                      <SelectItem value="Shopify">Shopify</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
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
                    id="editLgpdConsent"
                    checked={form.lgpdConsent}
                    onCheckedChange={(v) => set("lgpdConsent", !!v)}
                    className="mt-0.5"
                  />
                  <label htmlFor="editLgpdConsent" className="text-sm text-foreground cursor-pointer leading-snug">
                    Li e aceito os Termos de Uso e a Política de Privacidade.
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="editAceiteMarketing"
                    checked={form.aceiteMarketing}
                    onCheckedChange={(v) => set("aceiteMarketing", !!v)}
                    className="mt-0.5"
                  />
                  <label htmlFor="editAceiteMarketing" className="text-sm text-muted-foreground cursor-pointer leading-snug">
                    Aceito receber comunicações de marketing e promoções por e-mail e WhatsApp. (opcional)
                  </label>
                </div>
                {client?.lgpdConsentAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Aceite registrado em: {new Date(client.lgpdConsentAt).toLocaleString("pt-BR")}
                  </p>
                )}
              </TabsContent>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || docUploading}
                className="flex-1"
                style={!(updateMutation.isPending || docUploading) ? { background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" } : {}}
              >
                {(updateMutation.isPending || docUploading) ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
                ) : (
                  "Salvar alterações"
                )}
              </Button>
            </div>
          </Tabs>
        </form>
      </div>
    </div>
  );
}

// ─── Main ClientProfile ───────────────────────────────────────────────────────
type Tab = "cadastro" | "documentacao" | "alugueis" | "historico";

export default function ClientProfile() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const clientId = parseInt(params.id ?? "0");
  const [activeTab, setActiveTab] = useState<Tab>("cadastro");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewRental, setShowNewRental] = useState(false);
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const openLightbox = (src: string, alt: string) => { setLightboxSrc(src); setLightboxAlt(alt); };
  const closeLightbox = () => setLightboxSrc(null);

  const { data: client, isLoading } = trpc.clients.byId.useQuery({ id: clientId });
  const { data: docs } = trpc.clients.documents.useQuery({ clientId });
  const { data: rentalsData } = trpc.rentals.list.useQuery({ clientId, limit: 50, page: 1 });

  const validateMutation = trpc.clients.validate.useMutation({
    onSuccess: () => {
      toast.success("Cadastro validado!");
      utils.clients.byId.invalidate({ id: clientId });
    },
    onError: (e) => toast.error(e.message),
  });

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const rejectMutation = trpc.clients.reject.useMutation({
    onSuccess: () => {
      toast.success("Cadastro recusado.");
      setShowRejectDialog(false);
      setMotivoRecusa("");
      utils.clients.byId.invalidate({ id: clientId });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.byId.invalidate({ id: clientId });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteDocMutation = trpc.clients.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento removido.");
      utils.clients.documents.invalidate({ clientId });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Cliente não encontrado.
      </div>
    );
  }

  const lightboxEl = lightboxSrc ? <Lightbox src={lightboxSrc} alt={lightboxAlt} onClose={closeLightbox} /> : null;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "cadastro", label: "Cadastro", icon: User },
    { id: "documentacao", label: "Documentação", icon: FileText },
    { id: "alugueis", label: "Aluguéis", icon: Bike },
    { id: "historico", label: "Histórico", icon: Clock },
  ];

  const rentals = rentalsData?.items ?? [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {lightboxEl}

      {/* Edit Modal */}
      {showEditModal && (
        <EditClientModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          client={client}
          clientId={clientId}
          onSuccess={() => utils.clients.byId.invalidate({ id: clientId })}
        />
      )}

      {/* New Rental Modal */}
      <NewContractModal
        open={showNewRental}
        onClose={() => {
          setShowNewRental(false);
          utils.rentals.list.invalidate({ clientId, limit: 50, page: 1 });
          utils.bikes.list.invalidate();
        }}
        initialClient={{ clientId, clientName: client.name }}
      />

      {/* Back button */}
      <button
        onClick={() => navigate("/clientes")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para clientes
      </button>

      {/* Breadcrumb */}
      <div className="text-xs text-muted-foreground mb-4">
        Início / Clientes / {client.name}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* ── Left sidebar: controls ── */}
        <div className="lg:w-64 flex-shrink-0 space-y-4">
          {/* Status card */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Controles
            </p>

            {/* Lead alert */}
            {client.status === "lead" && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-amber-400 font-medium">
                  Lead — cadastro preenchido pelo cliente.
                </p>
              </div>
            )}

            {/* Recusado alert */}
            {client.status === "recusado" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-red-400 font-medium">
                  Recusado — {(client as any).motivoRecusa || "sem motivo informado"}
                </p>
              </div>
            )}

            {/* Validate button */}
            {client.status !== "verified" && (
              <Button
                onClick={() => validateMutation.mutate({ id: clientId })}
                disabled={validateMutation.isPending}
                className="w-full mb-3 text-sm"
                style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {validateMutation.isPending ? "Validando..." : "Validar cadastro"}
              </Button>
            )}

            {/* Reject button — only for leads */}
            {client.status === "lead" && (
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(true)}
                className="w-full mb-3 text-sm border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Recusar cadastro
              </Button>
            )}

            {/* Reject dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Recusar cadastro</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Motivo da recusa (obrigatório)</Label>
                  <Textarea
                    rows={3}
                    value={motivoRecusa}
                    onChange={(e) => setMotivoRecusa(e.target.value)}
                    placeholder="Informe o motivo da recusa..."
                    className="bg-secondary border-border text-sm"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancelar</Button>
                  <Button
                    variant="destructive"
                    disabled={!motivoRecusa.trim() || rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate({ id: clientId, motivo: motivoRecusa.trim() })}
                  >
                    {rejectMutation.isPending ? "Recusando..." : "Confirmar recusa"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* New Rental button — only for verified clients */}
            {client.status === "verified" && (
              <Button
                variant="outline"
                onClick={() => setShowNewRental(true)}
                className="w-full mb-3 text-sm"
                style={{ borderColor: "oklch(0.68 0.12 65)", color: "oklch(0.68 0.12 65)" }}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Criar aluguel
              </Button>
            )}

            {/* Edit button */}
            <Button
              variant="outline"
              onClick={() => setShowEditModal(true)}
              className="w-full mb-3 text-sm"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar cadastro
            </Button>

            {/* Situation */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Situação</span>
                <StatusBadge status={client.status} />
              </div>
              <div className="flex items-center justify-between">
                <span>Cadastro em</span>
                <span className="text-foreground">
                  {new Date(client.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Atualizado</span>
                <span className="text-foreground">
                  {new Date(client.updatedAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>

            <div className="border-t border-border my-3" />

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Bloqueado</Label>
                <Switch
                  checked={client.status === "blocked"}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({
                      id: clientId,
                      status: checked ? "blocked" : "lead",
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Recebe e-mail</Label>
                <Switch
                  checked={client.receiveEmail ?? true}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ id: clientId, receiveEmail: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Observações
            </p>
            <Textarea
              value={localNotes ?? (client.notes ?? "")}
              rows={4}
              className="text-xs bg-secondary border-border resize-none"
              placeholder="Adicione observações sobre o cliente..."
              onChange={(e) => setLocalNotes(e.target.value)}
            />
            <button
              className="mt-2 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              disabled={updateMutation.isPending || (localNotes === null || localNotes === (client.notes ?? ""))}
              onClick={() => {
                if (localNotes !== null) {
                  updateMutation.mutate(
                    { id: clientId, notes: localNotes },
                    { onSuccess: () => { toast.success("Observações salvas!"); setLocalNotes(null); } }
                  );
                }
              }}
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar observações"}
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0">
          {/* Client header */}
          <div className="bg-card border border-border rounded-xl p-5 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-primary">
                  {client.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {client.name}
                  </h1>
                  <StatusBadge status={client.status} />
                  <span className="text-xs text-muted-foreground font-mono">ID: {client.id}</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {client.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {client.phone}
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {client.email}
                    </div>
                  )}
                </div>
              </div>
              {/* Quick edit button in header */}
              <button
                onClick={() => setShowEditModal(true)}
                className="flex-shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Editar cadastro"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-card border border-border rounded-lg p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="bg-card border border-border rounded-xl p-5">
            {activeTab === "cadastro" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                    Identificação
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoRow label="Nome" value={client.name} />
                    <InfoRow label="Data de nascimento" value={client.birthDate} />
                    <InfoRow label="Gênero" value={client.gender} />
                    <InfoRow label="Nacionalidade" value={(client as any).nacionalidade === "estrangeiro" ? "Estrangeiro" : "Brasileiro"} />
                    {(client as any).nacionalidade !== "estrangeiro" ? (
                      <>
                        <InfoRow label="CPF" value={(client as any).cpf} />
                        <InfoRow label="RG" value={(client as any).rg} />
                        <InfoRow label="Tipo de documento" value={(client as any).tipoDocumento?.toUpperCase()} />
                      </>
                    ) : (
                      <InfoRow label="Passaporte" value={(client as any).numeroPassaporte} />
                    )}
                    <InfoRow label="Altura" value={client.height ? `${client.height} cm` : null} />
                    <InfoRow label="Peso" value={(client as any).weight ? `${(client as any).weight} kg` : null} />
                    <InfoRow label="Frequência de pedal" value={client.pedalFrequency} />
                    <InfoRow label="Origem" value={client.origin} />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                    Contato
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoRow label="WhatsApp" value={client.phone} />
                    <InfoRow label="E-mail" value={client.email} />
                    <InfoRow label="Instagram" value={client.instagram} />
                    <InfoRow label="Hospedagem" value={client.accommodation} />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                    Endereço
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoRow label="CEP" value={client.zipCode} />
                    <InfoRow label="Rua" value={client.street} />
                    <InfoRow label="Número" value={client.number} />
                    <InfoRow label="Bairro" value={client.neighborhood} />
                    <InfoRow label="Cidade" value={client.city} />
                    <InfoRow label="Estado" value={client.state} />
                    <InfoRow label="País" value={client.country} />
                  </div>
                </div>

                {client.source && (
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="w-3 h-3" />
                      Cadastro via: <span className="text-foreground capitalize">{client.source}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "documentacao" && (
              <div className="space-y-6">
                {/* LGPD consent status */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary">
                  <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Consentimento LGPD</p>
                    <p className="text-xs text-muted-foreground">
                      {(client as any).lgpdConsent
                        ? `Aceito em ${(client as any).lgpdConsentAt ? new Date((client as any).lgpdConsentAt).toLocaleString("pt-BR") : "data não registrada"}`
                        : "Não registrado"}
                    </p>
                  </div>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                    (client as any).lgpdConsent ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"
                  }`}>
                    {(client as any).lgpdConsent ? "Aceito" : "Pendente"}
                  </span>
                </div>

                {/* Photos/PDF from public form */}
                {((client as any).docFrontUrl || (client as any).docBackUrl) && (
                  <div>
                    <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                      Documento de Identificação (Formulário Público)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(client as any).docFrontUrl && (() => {
                        const url: string = (client as any).docFrontUrl;
                        const isPdf = url.toLowerCase().includes(".pdf") || url.includes("application/pdf");
                        return (
                          <div className="bg-secondary border border-border rounded-lg overflow-hidden">
                            {isPdf ? (
                              <div className="flex flex-col items-center justify-center gap-2 p-4" style={{ height: 180 }}>
                                <FileText className="w-10 h-10 text-primary/60" />
                                <p className="text-xs text-muted-foreground">Documento PDF</p>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                                >
                                  <span>Abrir PDF</span>
                                </a>
                              </div>
                            ) : (
                              <div
                                className="bg-muted flex items-center justify-center cursor-zoom-in overflow-hidden"
                                style={{ width: "100%", height: 180 }}
                                onClick={() => openLightbox(url, "Frente do Documento")}
                                title="Clique para ampliar"
                              >
                                <img src={url} alt="Frente do documento" style={{ width: 280, height: 180, objectFit: "cover", display: "block" }} />
                              </div>
                            )}
                            <div className="p-3"><p className="text-xs font-medium text-foreground">{isPdf ? "Documento (PDF)" : "Frente do Documento"}</p></div>
                          </div>
                        );
                      })()}
                      {(client as any).docBackUrl && (() => {
                        const url: string = (client as any).docBackUrl;
                        const isPdf = url.toLowerCase().includes(".pdf") || url.includes("application/pdf");
                        return (
                          <div className="bg-secondary border border-border rounded-lg overflow-hidden">
                            {isPdf ? (
                              <div className="flex flex-col items-center justify-center gap-2 p-4" style={{ height: 180 }}>
                                <FileText className="w-10 h-10 text-primary/60" />
                                <p className="text-xs text-muted-foreground">Verso PDF</p>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                                >
                                  <span>Abrir PDF</span>
                                </a>
                              </div>
                            ) : (
                              <div
                                className="bg-muted flex items-center justify-center cursor-zoom-in overflow-hidden"
                                style={{ width: "100%", height: 180 }}
                                onClick={() => openLightbox(url, "Verso do Documento")}
                                title="Clique para ampliar"
                              >
                                <img src={url} alt="Verso do documento" style={{ width: 280, height: 180, objectFit: "cover", display: "block" }} />
                              </div>
                            )}
                            <div className="p-3"><p className="text-xs font-medium text-foreground">{isPdf ? "Verso (PDF)" : "Verso do Documento"}</p></div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Additional uploaded documents */}
                <div>
                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">
                    Documentos Adicionais
                  </h3>
                  {(!docs || docs.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm">Nenhum documento enviado</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {docs.map((doc) => (
                        <div key={doc.id} className="bg-secondary border border-border rounded-lg overflow-hidden">
                          <div
                            className="bg-muted flex items-center justify-center cursor-zoom-in overflow-hidden"
                            style={{ width: "100%", height: 180 }}
                            onClick={() => openLightbox(doc.url, doc.type)}
                            title="Clique para ampliar"
                          >
                            <img
                              src={doc.url}
                              alt={doc.type}
                              style={{ width: 280, height: 180, objectFit: "cover", display: "block" }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                          <div className="p-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-foreground capitalize">
                                {(() => {
                                  const td = (client as any).tipoDocumento as string | undefined;
                                  const docName = td === "cnh" ? "CNH" : td === "rg" ? "RG" : td === "passaporte" ? "Passaporte" : "Documento";
                                  const dt = doc.type as string;
                                  if (dt === "rg_front" || dt === "doc_front") return `${docName} — Frente`;
                                  if (dt === "rg_back" || dt === "doc_back") return `${docName} — Verso`;
                                  return "Documento";
                                })()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteDocMutation.mutate({ id: doc.id })}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "alugueis" && (
              <div>
                <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">
                  Aluguéis
                </h3>
                {rentals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Bike className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">Nenhum aluguel registrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rentals.map((rental) => (
                      <div key={rental.id} className="bg-secondary border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            Aluguel #{rental.id}
                          </span>
                          <span className={`badge-${rental.status === "active" ? "rented" : rental.status === "returned" ? "available" : "maintenance"}`}>
                            {rental.status === "active" ? "Ativo" : rental.status === "returned" ? "Devolvido" : rental.status === "overdue" ? "Atrasado" : "Cancelado"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span>Saída: {new Date(rental.startDate).toLocaleDateString("pt-BR")}</span>
                          {rental.returnedAt && (
                            <span>Devolução: {new Date(rental.returnedAt).toLocaleDateString("pt-BR")}</span>
                          )}
                          {rental.totalAmount && (
                            <span>Total: R$ {parseFloat(rental.totalAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          )}
                          {rental.paymentMethod && (
                            <span className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              {rental.paymentMethod}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "historico" && (
              <div>
                <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">
                  Histórico
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">Cadastro criado</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(client.createdAt).toLocaleString("pt-BR")} via {client.source ?? "sistema"}
                      </p>
                    </div>
                  </div>
                  {client.status === "verified" && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-foreground">Cadastro validado</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(client.updatedAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
