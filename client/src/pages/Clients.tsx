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
      toast.error("Arquivo muito grande (máx. 10 MB)");
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
      toast.error("Nome obrigatório (mín. 2 caracteres)");
      setActiveTab("identificacao");
      return false;
    }
    if (!form.lastName.trim() || form.lastName.trim().length < 2) {
      toast.error("Sobrenome obrigatório (mín. 2 caracteres)");
      setActiveTab("identificacao");
      return false;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("E-mail obrigatório e válido");
      setActiveTab("contato");
      return false;
    }
    if (!form.phone.trim()) {
      toast.error("Telefone obrigatório");
      setActiveTab("contato");
      return false;
    }
    if (!form.height.trim()) {
      toast.error("Altura obrigatória");
      setActiveTab("perfil");
      return false;
    }
    if (!form.weight.trim()) {
      toast.error("Peso obrigatório");
      setActiveTab("perfil");
      return false;
    }
    if (isBrazilian) {
      if (!form.cpf || form.cpf.replace(/\D/g, "").length < 11) {
        toast.error("CPF obrigatório (11 dígitos)");
        setActiveTab("identificacao");
        return false;
      }
      if (!isValidCPF(form.cpf)) {
        toast.error("CPF inválido — verifique os dígitos");
        setActiveTab("identificacao");
        return false;
      }
      const rgDigits = form.rg.replace(/[.\-\s]/g, "");
      if (!rgDigits || rgDigits.length < 7) {
        toast.error("RG obrigatório (mín. 7 dígitos)");
        setActiveTab("identificacao");
        return false;
      }
    } else if (form.nacionalidade === "estrangeiro") {
      if (!form.numeroPassaporte.trim() || form.numeroPassaporte.trim().length < 5) {
        toast.error("Passaporte obrigatório (mínimo 5 caracteres)");
        setActiveTab("identificacao");
        return false;
      }
    }
    if (!form.lgpdConsent) {
      toast.error("Você precisa aceitar os termos de privacidade para continuar.");
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
        {/* Header */}
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
                    <Input value={form.birthDate} onChange={(e) => set("birthDate", maskDate(e.target.value))} placeholder="DD/MM/AAAA" className={inputCls} maxLength={10} />
                  </div>
                  <div>
                    <Label className={labelCls}>Gênero</Label>
                    <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                      <SelectTrigger className={inputCls}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                        <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
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

              {/* ── Aba 2: Contato ── */}
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

              {/* ── Aba 3: Endereço ── */}
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

                {/* Zona de upload principal */}
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
                      <p className="text-xs text-muted-foreground">PDF ou imagem · até 10 MB</p>
                    </div>
                  )}
                </div>

                {/* Botão adicionar verso */}
                {form.docFrontBase64 && !form.docFrontIsPdf && !form.showVerso && (
                  <button type="button" onClick={() => set("showVerso", true)}
                    className="text-xs text-[#C8920A] underline underline-offset-2 hover:text-[#d9a020] transition-colors">
                    + Adicionar verso (opcional)
                  </button>
                )}

                {/* Verso */}
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
                        <p className="text-[10px] text-muted-foreground">JPG, PNG — máx. 10 MB</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tutorial CNH */}
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
                    <Input value={form.height} onChange={(e) => set("height", e.target.value)} placeholder="1.75" className={inputCls} />
                  </div>
                  <div>
                    <Label className={labelCls}>Peso (kg) *</Label>
                    <Input type="number" min="20" max="300" step="0.1" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="75" className={inputCls} />
                  </div>
                </div>
                <div>
                  <Label className={labelCls}>Experiência em ciclismo</Label>
                  <Select value={form.pedalFrequency} onValueChange={(v) => set("pedalFrequency", v)}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
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
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pela internet">Pela internet</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Indicação de amigo">Indicação de amigo</SelectItem>
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
                  <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notas sobre o cliente..." className={`${inputCls} resize-none`} rows={3} />
                </div>
              </TabsContent>

              {/* ── Aba 6: LGPD ── */}
              <TabsContent value="lgpd" className="mt-0 space-y-5">
                <div className="rounded-lg border border-border bg-secondary/50 p-4 text-xs text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground mb-2">Política de Privacidade — LGPD</p>
                  <p>
                    Seus dados pessoais serão utilizados exclusivamente para a prestação dos serviços de aluguel de bicicletas da Bike To Go, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Não compartilhamos seus dados com terceiros sem seu consentimento.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="lgpdConsent" checked={form.lgpdConsent} onCheckedChange={(v) => set("lgpdConsent", !!v)} className="mt-0.5" />
                  <label htmlFor="lgpdConsent" className="text-sm text-foreground cursor-pointer leading-snug">
                    Li e concordo com a Política de Privacidade e autorizo o tratamento dos meus dados pessoais para a finalidade descrita acima. <span className="text-red-400">*</span>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="marketingConsent" checked={form.marketingConsent} onCheckedChange={(v) => set("marketingConsent", !!v)} className="mt-0.5" />
                  <label htmlFor="marketingConsent" className="text-sm text-muted-foreground cursor-pointer leading-snug">
                    Aceito receber comunicações de marketing e promoções da Bike To Go.
                  </label>
                </div>
              </TabsContent>

            </div>

            {/* Footer */}
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

