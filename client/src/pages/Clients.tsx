import { useState, useRef, useCallback } from "react";
import { RotateCcw, Archive, Smartphone, Download, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import {
  Search, Plus, Loader2, User, MapPin, Calendar, ChevronRight,
  Trash2, X, Upload, AlertCircle, FileText, Image as ImageIcon,
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
  maskCPF, maskRG, maskCEP, maskPhone, isValidCPF, fetchViaCEP,
  dateDisplayToISO, maskDate,
} from "@/hooks/useMask";
import { trpc } from "@/lib/trpc";

// ─── Status Badge ─────────────────────────────────────────────────────────────
type Status = "lead" | "verified" | "blocked" | "recusado" | undefined;

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

// ─── Empty form state ─────────────────────────────────────────────────────────
function emptyForm() {
  return {
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "",
    nacionalidade: "" as "" | "brasileiro" | "estrangeiro",
    cpf: "",
    rg: "",
    numeroPassaporte: "",
    phone: "",
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
    pedalFrequency: "",
    origin: "",
    accommodation: "",
    notes: "",
    docFrontBase64: null as string | null,
    docFrontMime: "image/jpeg",
    docFrontIsPdf: false,
    docBackBase64: null as string | null,
    docBackMime: "image/jpeg",
    showVerso: false,
    lgpdConsent: false,
    marketingConsent: false,
  };
}

// ─── New Client Modal ────────────────────────────────────────────────────────
interface NewClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function NewClientModal({ open, onClose, onSuccess }: NewClientModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("identificacao");
  const [cepLoading, setCepLoading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
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

  const uploadDocMutation = trpc.publicApi.uploadDocument.useMutation();

  function resetForm() {
    setForm(emptyForm());
    setActiveTab("identificacao");
  }

  function set<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const handleCEP = useCallback(async (val: string) => {
    const masked = maskCEP(val);
    setForm((f) => ({ ...f, zipCode: masked }));
    const clean = masked.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetchViaCEP(clean);
      if (r) {
        setForm((f) => ({
          ...f,
          street: r.logradouro || f.street,
          neighborhood: r.bairro || f.neighborhood,
          city: r.localidade || f.city,
          state: r.uf || f.state,
        }));
      }
    } catch {}
    finally { setCepLoading(false); }
  }, []);

  const handleDocPhoto = (side: "front" | "back", file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (max. 10 MB)");
      return;
    }
    const mime = file.type || "image/jpeg";
    const isPdf = mime === "application/pdf";
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = ev.target?.result as string;
      if (side === "front") {
        setForm((f) => ({
          ...f,
          docFrontBase64: b64,
          docFrontMime: mime,
          docFrontIsPdf: isPdf,
          showVerso: isPdf ? false : f.showVerso,
        }));
      } else {
        setForm((f) => ({ ...f, docBackBase64: b64, docBackMime: mime }));
      }
    };
    reader.readAsDataURL(file);
  };

  const validate = (): boolean => {
    const isBrazilian = form.nacionalidade === "brasileiro";
    if (!form.firstName.trim() || form.firstName.trim().length < 2) {
      toast.error("Nome obrigatorio (min. 2 caracteres)");
      setActiveTab("identificacao");
      return false;
    }
    if (!form.lastName.trim() || form.lastName.trim().length < 2) {
      toast.error("Sobrenome obrigatorio (min. 2 caracteres)");
      setActiveTab("identificacao");
      return false;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("E-mail obrigatorio e valido");
      setActiveTab("contato");
      return false;
    }
    if (!form.phone.trim()) {
      toast.error("Telefone obrigatorio");
      setActiveTab("contato");
      return false;
    }
    if (!form.height.trim()) {
      toast.error("Altura obrigatoria");
      setActiveTab("perfil");
      return false;
    }
    if (!form.weight.trim()) {
      toast.error("Peso obrigatorio");
      setActiveTab("perfil");
      return false;
    }
    if (isBrazilian) {
      if (!form.cpf || form.cpf.replace(/\D/g, "").length < 11) {
        toast.error("CPF obrigatorio (11 digitos)");
        setActiveTab("identificacao");
        return false;
      }
      if (!isValidCPF(form.cpf)) {
        toast.error("CPF invalido - verifique os digitos");
        setActiveTab("identificacao");
        return false;
      }
      const rgDigits = form.rg.replace(/[.\-\s]/g, "");
      if (!rgDigits || rgDigits.length < 7) {
        toast.error("RG obrigatorio (min. 7 digitos)");
        setActiveTab("identificacao");
        return false;
      }
    } else if (form.nacionalidade === "estrangeiro") {
      if (!form.numeroPassaporte.trim() || form.numeroPassaporte.trim().length < 5) {
        toast.error("Passaporte obrigatorio (minimo 5 caracteres)");
        setActiveTab("identificacao");
        return false;
      }
    }
    if (!form.lgpdConsent) {
      toast.error("Voce precisa aceitar os termos de privacidade para continuar.");
      setActiveTab("lgpd");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setDocUploading(true);
    try {
      const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
      const isBrazilian = form.nacionalidade === "brasileiro";

      const result = await createMutation.mutateAsync({
        name,
        firstName: form.firstName,
        lastName: form.lastName,
        cpf: isBrazilian ? form.cpf : undefined,
        rg: isBrazilian ? form.rg : undefined,
        nacionalidade: (form.nacionalidade || undefined) as "brasileiro" | "estrangeiro" | undefined,
        tipoDocumento: isBrazilian ? "rg" : "passaporte",
        numeroPassaporte: form.nacionalidade === "estrangeiro" ? form.numeroPassaporte : undefined,
        birthDate: form.birthDate ? dateDisplayToISO(form.birthDate) : undefined,
        gender: form.gender || undefined,
        phone: form.phone || undefined,
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
        height: form.height || undefined,
        weight: form.weight || undefined,
        pedalFrequency: form.pedalFrequency || undefined,
        origin: form.origin || undefined,
        accommodation: form.accommodation || undefined,
        notes: form.notes || undefined,
        lgpdConsent: form.lgpdConsent,
        status: "lead",
      });

      if (form.docFrontBase64 && result?.id) {
        await uploadDocMutation.mutateAsync({
          clientId: result.id,
          base64: form.docFrontBase64,
          side: "front",
          mimeType: form.docFrontMime,
        });
        if (form.docBackBase64) {
          await uploadDocMutation.mutateAsync({
            clientId: result.id,
            base64: form.docBackBase64,
            side: "back",
            mimeType: form.docBackMime,
          });
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar cliente.");
    } finally {
      setDocUploading(false);
    }
  };

  if (!open) return null;

  const inputCls = "bg-secondary border-border text-sm";
  const labelCls = "text-xs text-muted-foreground mb-1.5 block";
  const isBrazilian = form.nacionalidade === "brasileiro";
  const canSave = form.lgpdConsent && !createMutation.isPending && !docUploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { onClose(); resetForm(); }} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Novo Cliente
          </h2>
          <button onClick={() => { onClose(); resetForm(); }} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-shrink-0 mx-5 mt-4 overflow-x-auto">
              <TabsList className="flex w-max min-w-full h-auto gap-0.5">
                {[
                  { value: "identificacao", label: "1. ID" },
                  { value: "contato", label: "2. Contato" },
                  { value: "endereco", label: "3. Endereco" },
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

              <TabsContent value="identificacao" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelCls}>Nome *</Label>
                    <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Joao" className={inputCls} />
                  </div>
                  <div>
                    <Label className={labelCls}>Sobrenome *</Label>
                    <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Silva" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelCls}>Data de nascimento</Label>
                    <Input value={form.birthDate} onChange={(e) => set("birthDate", maskDate(e.target.value))} placeholder="DD/MM/AAAA" className={inputCls} maxLength={10} />
                  </div>
                  <div>
                    <Label className={labelCls}>Genero</Label>
                    <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                      <SelectTrigger className={inputCls}><SelectValue placeholder="--" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                        <SelectItem value="Prefiro nao informar">Prefiro nao informar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className={labelCls}>Nacionalidade</Label>
                  <Select value={form.nacionalidade} onValueChange={(v) => set("nacionalidade", v as "brasileiro" | "estrangeiro")}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brasileiro">Brasileiro</SelectItem>
                      <SelectItem value="estrangeiro">Estrangeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isBrazilian ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className={labelCls}>CPF *</Label>
                      <Input value={form.cpf} onChange={(e) => set("cpf", maskCPF(e.target.value))} placeholder="000.000.000-00" className={inputCls} maxLength={14} />
                    </div>
                    <div>
                      <Label className={labelCls}>RG *</Label>
                      <Input value={form.rg} onChange={(e) => set("rg", maskRG(e.target.value))} placeholder="00.000.000-0" className={inputCls} maxLength={12} />
                    </div>
                  </div>
                ) : form.nacionalidade === "estrangeiro" ? (
                  <div>
                    <Label className={labelCls}>Passaporte *</Label>
                    <Input value={form.numeroPassaporte} onChange={(e) => set("numeroPassaporte", e.target.value.toUpperCase())} placeholder="AB123456" className={inputCls} maxLength={50} />
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="contato" className="mt-0 space-y-4">
                <div>
                  <Label className={labelCls}>WhatsApp *</Label>
                  <Input value={form.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} placeholder="(48) 9 9999-9999" className={inputCls} maxLength={16} />
                </div>
                <div>
                  <Label className={labelCls}>E-mail *</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="joao@email.com" className={inputCls} />
                </div>
                <div>
                  <Label className={labelCls}>Instagram</Label>
                  <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@usuario" className={inputCls} />
                </div>
              </TabsContent>

              <TabsContent value="endereco" className="mt-0 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label className={labelCls}>CEP</Label>
                    <div className="relative">
                      <Input value={form.zipCode} onChange={(e) => handleCEP(e.target.value)} placeholder="00000-000" className={inputCls} maxLength={9} />
                      {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                  <div>
                    <Label className={labelCls}>Estado</Label>
                    <Input value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} placeholder="SC" className={inputCls} maxLength={2} />
                  </div>
                </div>
                <div>
                  <Label className={labelCls}>Rua</Label>
                  <Input value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="Rua das Flores" className={inputCls} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className={labelCls}>Numero</Label>
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
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Florianopolis" className={inputCls} />
                  </div>
                </div>
                <div>
                  <Label className={labelCls}>Pais</Label>
                  <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Brasil" className={inputCls} />
                </div>
              </TabsContent>

              <TabsContent value="documento" className="mt-0 space-y-5">
                <p className="text-xs text-muted-foreground">
                  Envie o PDF da CNH digital (gov.br) ou RG ou uma foto do documento.
                </p>
                <div>
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">
                    {form.docFrontBase64 && form.showVerso ? "Frente" : form.docFrontIsPdf ? "Documento (PDF)" : "Documento"}
                  </p>
                  <input ref={frontRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocPhoto("front", f); e.target.value = ""; }} />
                  {form.docFrontBase64 ? (
                    form.docFrontIsPdf ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-[#C8920A]/40 bg-[#C8920A]/5">
                        <FileText className="w-8 h-8 text-[#C8920A] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">PDF carregado</p>
                        </div>
                        <button type="button"
                          onClick={() => setForm((f) => ({ ...f, docFrontBase64: null, docFrontIsPdf: false }))}
                          className="w-7 h-7 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-all flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <img src={form.docFrontBase64} alt="Frente" className="w-full h-36 object-cover rounded-xl border border-[#C8920A]/30" />
                        <button type="button"
                          onClick={() => setForm((f) => ({ ...f, docFrontBase64: null, showVerso: false, docBackBase64: null }))}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  ) : (
                    <div
                      className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-[#C8920A]/50 hover:bg-[#C8920A]/5 transition-all"
                      onClick={() => frontRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleDocPhoto("front", f); }}
                    >
                      <div className="flex gap-3">
                        <FileText className="w-7 h-7 text-[#C8920A]/60" />
                        <ImageIcon className="w-7 h-7 text-[#C8920A]/60" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Arraste aqui ou clique para selecionar</p>
                      <p className="text-xs text-muted-foreground">PDF ou imagem - ate 10 MB</p>
                    </div>
                  )}
                </div>
                {form.docFrontBase64 && !form.docFrontIsPdf && !form.showVerso && (
                  <button type="button" onClick={() => set("showVerso", true)}
                    className="text-xs text-[#C8920A] underline underline-offset-2 hover:text-[#d9a020] transition-colors">
                    + Adicionar verso (opcional)
                  </button>
                )}
                {form.showVerso && (
                  <div>
                    <p className="text-xs font-semibold mb-2 text-muted-foreground">Verso</p>
                    <input ref={backRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocPhoto("back", f); e.target.value = ""; }} />
                    {form.docBackBase64 ? (
                      <div className="relative">
                        <img src={form.docBackBase64} alt="Verso" className="w-full h-36 object-cover rounded-xl border border-[#C8920A]/30" />
                        <button type="button" onClick={() => set("docBackBase64", null)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-[#C8920A]/50 hover:bg-[#C8920A]/5 transition-all"
                        onClick={() => backRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleDocPhoto("back", f); }}
                      >
                        <Upload className="w-6 h-6 text-[#C8920A]/60" />
                        <p className="text-xs text-muted-foreground">Clique ou arraste a foto aqui</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="border-t border-border pt-4">
                  <p className="text-[13px] font-medium mb-3 flex items-center gap-1.5 text-muted-foreground">
                    <HelpCircle className="w-4 h-4 text-gray-500 shrink-0" />
                    Como baixar o PDF da sua CNH digital
                  </p>
                  <ol className="flex flex-col gap-2.5">
                    {[
                      { Icon: Smartphone, text: "Abra a Carteira Digital de Transito ou o gov.br e acesse sua CNH" },
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

              <TabsContent value="perfil" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelCls}>Altura (m) *</Label>
                    <Input value={form.height} onChange={(e) => set("height", e.target.value)} placeholder="1.75" className={inputCls} />
                  </div>
                  <div>
                    <Label className={labelCls}>Peso (kg) *</Label>
                    <Input type="number" min="20" max="300" step="0.1" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="75" className={inputCls} />
                  </div>
                </div>
                <div>
                  <Label className={labelCls}>Experiencia em ciclismo</Label>
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
                      <SelectItem value="Indicacao de amigo">Indicacao de amigo</SelectItem>
                      <SelectItem value="Shopify">Shopify</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={labelCls}>Hospedagem / Acomodacao</Label>
                  <Input value={form.accommodation} onChange={(e) => set("accommodation", e.target.value)} placeholder="Hotel, pousada..." className={inputCls} />
                </div>
                <div>
                  <Label className={labelCls}>Observacoes internas</Label>
                  <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notas sobre o cliente..." className={`${inputCls} resize-none`} rows={3} />
                </div>
              </TabsContent>

              <TabsContent value="lgpd" className="mt-0 space-y-5">
                <div className="rounded-lg border border-border bg-secondary/50 p-4 text-xs text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground mb-2">Politica de Privacidade - LGPD</p>
                  <p>
                    Seus dados pessoais serao utilizados exclusivamente para a prestacao dos servicos de aluguel de bicicletas da Bike To Go, em conformidade com a Lei Geral de Protecao de Dados (Lei n. 13.709/2018). Nao compartilhamos seus dados com terceiros sem seu consentimento.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="lgpdConsent" checked={form.lgpdConsent} onCheckedChange={(v) => set("lgpdConsent", !!v)} className="mt-0.5" />
                  <label htmlFor="lgpdConsent" className="text-sm text-foreground cursor-pointer leading-snug">
                    Li e concordo com a Politica de Privacidade e autorizo o tratamento dos meus dados pessoais. <span className="text-red-400">*</span>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="marketingConsent" checked={form.marketingConsent} onCheckedChange={(v) => set("marketingConsent", !!v)} className="mt-0.5" />
                  <label htmlFor="marketingConsent" className="text-sm text-muted-foreground cursor-pointer leading-snug">
                    Aceito receber comunicacoes de marketing e promocoes da Bike To Go.
                  </label>
                </div>
              </TabsContent>

            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => { onClose(); resetForm(); }} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSave} className="flex-1"
                style={canSave ? { background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" } : {}}>
                {createMutation.isPending || docUploading ? (
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
    { label: "Recusado", value: "recusado" as Status, cls: "badge-blocked" },
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
