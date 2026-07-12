/**
 * ClientFormModal — formulário único de cliente (criar E editar).
 * Substitui o NewClientModal (Clients.tsx) e o EditClientModal (ClientProfile.tsx),
 * que eram ~90% duplicados. Modo edição = prop `client` presente.
 *
 * Montar condicionalmente ({show && <ClientFormModal .../>}) — o estado do form
 * é inicializado no mount (prefill do client em edição, vazio em criação).
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  X, Loader2, FileText, Image as ImageIcon, Upload,
  HelpCircle, Smartphone, Download, AlertCircle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  maskCPF, maskRG, maskCEP, maskPhone, maskDate, isValidCPF, fetchViaCEP,
  dateDisplayToISO, dateISOToDisplay,
} from "@/hooks/useMask";
import { friendlyError } from "@/lib/utils";

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

// Extrai o DDI de um telefone salvo como "+XX numero"
function parseDDI(phone: string | null | undefined): { ddi: string; number: string } {
  if (!phone) return { ddi: "+55", number: "" };
  const match = phone.match(/^(\+\d{1,4})\s(.+)$/);
  if (match) return { ddi: match[1], number: match[2] };
  return { ddi: "+55", number: phone };
}

interface ClientFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Presente = modo edição */
  client?: any;
}

export function ClientFormModal({ open, onClose, onSuccess, client }: ClientFormModalProps) {
  const isEdit = !!client;
  const clientId: number | undefined = client?.id;

  const { ddi: initDdi, number: initPhone } = parseDDI(client?.phone);
  const nameParts = (client?.name ?? "").trim().split(" ");
  const initFirst = client?.firstName || nameParts[0] || "";
  const initLast = client?.lastName || nameParts.slice(1).join(" ") || "";

  const [form, setForm] = useState(() => ({
    firstName: initFirst,
    lastName: initLast,
    birthDate: client?.birthDate ? dateISOToDisplay(client.birthDate) : "",
    gender: client?.gender ?? "",
    nacionalidade: (client?.nacionalidade as "" | "brasileiro" | "estrangeiro") ?? "",
    tipoDocumento: (client?.tipoDocumento as "cnh" | "rg" | "passaporte") ?? "rg",
    cpf: client?.cpf ?? "",
    rg: client?.rg ?? "",
    numeroPassaporte: client?.numeroPassaporte ?? "",
    ddi: initDdi,
    phone: initPhone,
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
    origin: client?.origin ?? "",
    accommodation: client?.accommodation ?? "",
    notes: client?.notes ?? "",
    lgpdConsent: client?.lgpdConsent ?? false,
    marketingConsent: false,
    // upload de documento (novo arquivo; os já salvos vivem na aba Documentação do perfil)
    docFrontBase64: null as string | null,
    docFrontMime: "image/jpeg",
    docFrontIsPdf: false,
    docBackBase64: null as string | null,
    docBackMime: "image/jpeg",
    showVerso: false,
  }));

  const [activeTab, setActiveTab] = useState("identificacao");
  const [cepLoading, setCepLoading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const createMutation = trpc.clients.create.useMutation({
    onError: (err) => toast.error(friendlyError(err)),
  });
  const updateMutation = trpc.clients.update.useMutation({
    onError: (err) => toast.error(friendlyError(err)),
  });
  const uploadDocMutation = trpc.publicApi.uploadDocument.useMutation();
  const getUploadTokenMut = trpc.clients.getUploadToken.useMutation();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
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
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      if (side === "front") {
        setForm((f) => ({
          ...f,
          docFrontBase64: b64,
          docFrontMime: mime,
          docFrontIsPdf: isPdf,
          showVerso: isPdf ? false : f.showVerso,
          docBackBase64: isPdf ? null : f.docBackBase64,
        }));
      } else {
        setForm((f) => ({ ...f, docBackBase64: b64, docBackMime: mime }));
      }
    };
    reader.readAsDataURL(file);
  };

  const isBrazilian = form.nacionalidade !== "estrangeiro";

  const validate = (): boolean => {
    const fail = (tab: string, msg: string) => { setActiveTab(tab); toast.error(msg); return false; };
    if (!form.firstName.trim() || form.firstName.trim().length < 2) return fail("identificacao", "Nome obrigatório (mín. 2 caracteres)");
    if (!form.lastName.trim() || form.lastName.trim().length < 2) return fail("identificacao", "Sobrenome obrigatório (mín. 2 caracteres)");
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return fail("contato", "E-mail obrigatório e válido");
    // Telefone é exigido só na criação (não travar edição de registro legado sem telefone)
    if (!isEdit && !form.phone.trim()) return fail("contato", "Telefone obrigatório");
    if (!form.height.trim()) return fail("perfil", "Altura obrigatória");
    if (!String(form.weight).trim()) return fail("perfil", "Peso obrigatório");
    if (isBrazilian && form.nacionalidade === "brasileiro" || (isEdit && isBrazilian)) {
      if (!form.cpf || form.cpf.replace(/\D/g, "").length < 11) return fail("identificacao", "CPF obrigatório (11 dígitos)");
      if (!isValidCPF(form.cpf)) return fail("identificacao", "CPF inválido — verifique os dígitos");
      const rgDigits = form.rg.replace(/[.\-\s]/g, "");
      if (!rgDigits || rgDigits.length < 7) return fail("identificacao", "RG obrigatório (mín. 7 dígitos)");
    }
    if (form.nacionalidade === "estrangeiro" && !isEdit) {
      if (!form.numeroPassaporte.trim() || form.numeroPassaporte.trim().length < 5) return fail("identificacao", "Passaporte obrigatório (mínimo 5 caracteres)");
    }
    if (!form.lgpdConsent) return fail("lgpd", "Você precisa aceitar os termos de privacidade para continuar.");
    return true;
  };

  async function uploadDocs(targetClientId: number) {
    if (!form.docFrontBase64 && !form.docBackBase64) return;
    // SEC-1: token HMAC, nunca clientId cru
    const { uploadToken } = await getUploadTokenMut.mutateAsync({ clientId: targetClientId });
    if (form.docFrontBase64) {
      await uploadDocMutation.mutateAsync({ token: uploadToken, base64: form.docFrontBase64, side: "front", mimeType: form.docFrontMime });
    }
    if (form.docBackBase64) {
      await uploadDocMutation.mutateAsync({ token: uploadToken, base64: form.docBackBase64, side: "back", mimeType: form.docBackMime });
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setDocUploading(true);
    try {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
      const phone = form.ddi !== "+55" && form.phone ? `${form.ddi} ${form.phone}` : form.phone;
      const docFields = isBrazilian
        ? { cpf: form.cpf || undefined, rg: form.rg || undefined, numeroPassaporte: undefined }
        : { cpf: undefined, rg: undefined, numeroPassaporte: form.numeroPassaporte || undefined };
      const common = {
        name: fullName,
        ...docFields,
        nacionalidade: (form.nacionalidade || undefined) as "brasileiro" | "estrangeiro" | undefined,
        birthDate: form.birthDate ? dateDisplayToISO(form.birthDate) : undefined,
        gender: form.gender || undefined,
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
        height: form.height || undefined,
        weight: String(form.weight) || undefined,
        pedalFrequency: form.pedalFrequency || undefined,
        origin: form.origin || undefined,
        accommodation: form.accommodation || undefined,
        notes: form.notes || undefined,
        lgpdConsent: form.lgpdConsent,
      };

      if (isEdit && clientId) {
        await updateMutation.mutateAsync({
          id: clientId,
          ...common,
          tipoDocumento: isBrazilian ? form.tipoDocumento : "passaporte",
        });
        await uploadDocs(clientId);
        toast.success("Cliente atualizado com sucesso!");
        utils.clients.byId.invalidate({ id: clientId });
        utils.clients.list.invalidate();
      } else {
        const result = await createMutation.mutateAsync({
          ...common,
          firstName: form.firstName,
          lastName: form.lastName,
          tipoDocumento: isBrazilian ? "rg" : "passaporte",
          status: "lead",
        });
        if (result?.id) await uploadDocs(result.id);
        toast.success("Cliente criado com sucesso!");
        utils.clients.list.invalidate();
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || (isEdit ? "Erro ao salvar cliente." : "Erro ao criar cliente."));
    } finally {
      setDocUploading(false);
    }
  };

  const inputCls = "bg-secondary border-border text-sm";
  const labelCls = "text-xs text-muted-foreground mb-1.5 block";
  const isPending = createMutation.isPending || updateMutation.isPending || docUploading;
  const canSave = form.lgpdConsent && !isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[95vh] p-0 gap-0 flex flex-col overflow-hidden dialog-mobile">
        <DialogHeader className="px-5 py-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-base">{isEdit ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>

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
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brasileiro">Brasileiro</SelectItem>
                      <SelectItem value="estrangeiro">Estrangeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.nacionalidade !== "estrangeiro" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className={labelCls}>
                        CPF *
                        {form.cpf.replace(/\D/g, "").length === 11 && (
                          isValidCPF(form.cpf)
                            ? <CheckCircle2 className="inline w-3 h-3 ml-1 text-emerald-500" />
                            : <AlertCircle className="inline w-3 h-3 ml-1 text-destructive" />
                        )}
                      </Label>
                      <Input value={form.cpf} onChange={(e) => set("cpf", maskCPF(e.target.value))} placeholder="000.000.000-00" className={inputCls} maxLength={14} />
                    </div>
                    <div>
                      <Label className={labelCls}>RG *</Label>
                      <Input value={form.rg} onChange={(e) => set("rg", maskRG(e.target.value))} placeholder="00.000.000-0" className={inputCls} maxLength={12} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className={labelCls}>Número do Passaporte *</Label>
                    <Input value={form.numeroPassaporte} onChange={(e) => { set("numeroPassaporte", e.target.value.toUpperCase()); set("tipoDocumento", "passaporte"); }} placeholder="AB123456" className={inputCls} maxLength={50} />
                  </div>
                )}
              </TabsContent>

              {/* ── Aba 2: Contato ── */}
              <TabsContent value="contato" className="mt-0 space-y-4">
                <div>
                  <Label className={labelCls}>WhatsApp {!isEdit && "*"}</Label>
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
                  {isEdit && " Documentos já enviados aparecem na aba Documentação do perfil."}
                </p>
                <div>
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">
                    {form.docFrontBase64 && form.showVerso ? "Frente" : form.docFrontIsPdf ? "Documento (PDF)" : "Documento"}
                  </p>
                  <input ref={frontRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocPhoto("front", f); e.target.value = ""; }} />
                  {form.docFrontBase64 ? (
                    form.docFrontIsPdf ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/40 bg-primary/5">
                        <FileText className="w-8 h-8 text-primary flex-shrink-0" />
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
                        <img src={form.docFrontBase64} alt="Frente" className="w-full h-36 object-cover rounded-xl border border-primary/30" />
                        <button type="button"
                          onClick={() => setForm((f) => ({ ...f, docFrontBase64: null, showVerso: false, docBackBase64: null }))}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  ) : (
                    <div
                      className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                      onClick={() => frontRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleDocPhoto("front", f); }}
                    >
                      <div className="flex gap-3">
                        <FileText className="w-7 h-7 text-primary/60" />
                        <ImageIcon className="w-7 h-7 text-primary/60" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Arraste aqui ou clique para selecionar</p>
                      <p className="text-xs text-muted-foreground">PDF ou imagem — até 10 MB</p>
                    </div>
                  )}
                </div>
                {form.docFrontBase64 && !form.docFrontIsPdf && !form.showVerso && (
                  <button type="button" onClick={() => set("showVerso", true)}
                    className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
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
                        <img src={form.docBackBase64} alt="Verso" className="w-full h-36 object-cover rounded-xl border border-primary/30" />
                        <button type="button" onClick={() => set("docBackBase64", null)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                        onClick={() => backRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleDocPhoto("back", f); }}
                      >
                        <Upload className="w-6 h-6 text-primary/60" />
                        <p className="text-xs text-muted-foreground">Clique ou arraste a foto aqui</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="border-t border-border pt-4">
                  <p className="text-[13px] font-medium mb-3 flex items-center gap-1.5 text-muted-foreground">
                    <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    Como baixar o PDF da sua CNH digital
                  </p>
                  <ol className="flex flex-col gap-2.5">
                    {[
                      { Icon: Smartphone, text: "Abra a Carteira Digital de Trânsito ou o gov.br e acesse sua CNH" },
                      { Icon: Download, text: "Toque em Exportar / Baixar PDF e salve o arquivo" },
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3 text-xs text-muted-foreground leading-relaxed">
                        <span className="font-bold text-primary min-w-fit">{i + 1}.</span>
                        <div className="flex gap-2 items-start">
                          <item.Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{item.text}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="rounded-lg px-3 py-2.5 flex items-start gap-2 bg-secondary/50">
                  <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Estrangeiro ou sem CNH digital? Envie uma foto do documento (passaporte ou RG).
                  </span>
                </div>
              </TabsContent>

              {/* ── Aba 5: Perfil ── */}
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
                  <Checkbox id="cf-lgpdConsent" checked={form.lgpdConsent} onCheckedChange={(v) => set("lgpdConsent", !!v)} className="mt-0.5" />
                  <label htmlFor="cf-lgpdConsent" className="text-sm text-foreground cursor-pointer leading-snug">
                    Li e concordo com a Política de Privacidade e autorizo o tratamento dos meus dados pessoais. <span className="text-destructive">*</span>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="cf-marketingConsent" checked={form.marketingConsent} onCheckedChange={(v) => set("marketingConsent", !!v)} className="mt-0.5" />
                  <label htmlFor="cf-marketingConsent" className="text-sm text-muted-foreground cursor-pointer leading-snug">
                    Aceito receber comunicações de marketing e promoções da Bike To Go.
                  </label>
                </div>
              </TabsContent>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSave} className="flex-1">
                {isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
                ) : (
                  isEdit ? "Salvar alterações" : "Salvar cliente"
                )}
              </Button>
            </div>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
