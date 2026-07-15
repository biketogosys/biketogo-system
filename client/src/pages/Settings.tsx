import { useState, useEffect, useMemo, useRef } from "react";
import { maskPhone } from "@/hooks/useMask";
import { toast } from "sonner";
import {
  Loader2, Save, Settings as SettingsIcon, Truck, Phone, Clock, Mail,
  MessageCircle, Link, Eye, EyeOff, Building2, Plus, X, Bike, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { friendlyError } from "@/lib/utils";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";





// ── Section save button ──────────────────────────────────────────────────────
function SectionSaveBtn({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      disabled={saving}
      className="gap-1.5"
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      Salvar
    </Button>
  );
}

// ── Simple field (no save button) ───────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = "text", hint, mono, secret,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string; mono?: boolean; secret?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="relative">
        <Input
          type={secret && !show ? "password" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`bg-secondary border-border ${mono ? "font-mono text-xs" : ""} ${secret ? "pr-9" : ""}`}
          placeholder={placeholder}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function FieldTextarea({
  label, value, onChange, placeholder, hint, rows = 4,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; rows?: number;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-secondary border-border w-full text-sm resize-y"
        placeholder={placeholder}
        rows={rows}
      />
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const { data: settings, isLoading } = trpc.settings.getAll.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  // Textos legais padrão do contrato — MESMA fonte que o PDF usa como fallback.
  // Sem isto, o campo aparecia vazio aqui enquanto o PDF saía com as cláusulas:
  // o texto legal que ia pro documento ficava invisível e não-editável.
  const { data: contractDefaults } = trpc.settings.getContractDefaults.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const setManyMutation = trpc.settings.setMany.useMutation({
    onSuccess: () => toast.success("Configurações salvas"),
    onError: (e) => toast.error(friendlyError(e)),
  });

  // ── Company ──────────────────────────────────────────────────────────────────
  const [companyName, setCompanyName] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const uploadLogoMutation = trpc.settings.uploadLogo.useMutation({
    onSuccess: (data) => { setCompanyLogoUrl(data.url); toast.success("Logo salva com sucesso"); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const [companyCnpj, setCompanyCnpj] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyState, setCompanyState] = useState("");
  const [companyCep, setCompanyCep] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyForo, setCompanyForo] = useState("");
  const [companyCaucao, setCompanyCaucao] = useState("");
  // ── Contract content (per-language) ─────────────────────────────────────────
  type Lang = "pt" | "en" | "es";
  const LANGS: Lang[] = ["pt", "en", "es"];
  const [objeto, setObjeto] = useState<Record<Lang, string>>({ pt: "", en: "", es: "" });
  const [clauses, setClauses] = useState<Record<Lang, string[]>>({ pt: [""], en: [""], es: [""] });
  const [savingContent, setSavingContent] = useState(false);



  // ── Operating Hours ──────────────────────────────────────────────────────────
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("19:00");

  // ── Notifications ────────────────────────────────────────────────────────────
  const [whatsappReservas, setWhatsappReservas] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");

  // ── Archive ──────────────────────────────────────────────────────────────────
  const [archiveRetentionDays, setArchiveRetentionDays] = useState("5");

  // ── Shopify ───────────────────────────────────────────────────────────────────────────
  const [shopifyApiKey, setShopifyApiKey] = useState("");

  // ── Section saving flags ─────────────────────────────────────────────────────
  const [savingCompany, setSavingCompany] = useState(false);

  const [savingOperating, setSavingOperating] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingShopify, setSavingShopify] = useState(false);
  const [savingArchive, setSavingArchive] = useState(false);

  // ── Load settings ────────────────────────────────────────────────────────────
  const hydratedRef = useRef(false);
  useEffect(() => {
    // Espera TAMBÉM os defaults: sem eles não dá pra pré-preencher o texto legal
    // que o PDF usa quando o banco está vazio.
    if (!settings || !contractDefaults) return;
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const map: Record<string, string> = {};
    settings.forEach((s: any) => { map[s.key] = s.value; });


    setOpeningTime(map["opening_time"] || "09:00");
    setClosingTime(map["closing_time"] || "19:00");
    setWhatsappReservas(map["whatsapp_reservas"] || "");
    setNotificationEmail(map["notification_email"] || "");
    setArchiveRetentionDays(map["archive_retention_days"] || "5");
    setShopifyApiKey(map["shopify_api_key"] || "");
    setCompanyName(map["company_name"] || "");
    setCompanyCnpj(map["company_cnpj"] || "");
    setCompanyAddress(map["company_address"] || "");
    setCompanyCity(map["company_city"] || "");
    setCompanyState(map["company_state"] || "");
    setCompanyCep(map["company_cep"] || "");
    setCompanyPhone(map["company_phone"] || "");
    setCompanyEmail(map["company_email"] || "");
    setCompanyWebsite(map["company_website"] || "");
    setCompanyForo(map["company_foro"] || "");
    setCompanyCaucao(map["company_caucao"] || "");
    // Load per-language contract content
    const parseClauses = (raw: string) => {
      const parsed = raw.split(/\n{2,}/).map((p) => p.trim().replace(/^\d+[.\-)\s]+/, "").trim()).filter(Boolean);
      return parsed.length ? parsed : [""];
    };
    const newObjeto: Record<Lang, string> = { pt: "", en: "", es: "" };
    const newClauses: Record<Lang, string[]> = { pt: [""], en: [""], es: [""] };
    for (const lang of LANGS) {
      // Ordem de precedência (a MESMA do PDF em server/pdf.ts):
      //   1) valor por idioma no banco  → company_object_<lang> / company_terms_<lang>
      //   2) legado (só pt)             → company_object / company_terms
      //   3) texto PADRÃO embutido      → server/contract-defaults.ts
      // O passo (3) é o fix: antes o campo ficava vazio aqui e o PDF saía com o
      // default — o texto legal do contrato era invisível e não-editável.
      const objLang = (map[`company_object_${lang}`] || "").trim();
      const objLegacy = lang === "pt" ? (map["company_object"] || "").trim() : "";
      newObjeto[lang] = objLang || objLegacy || contractDefaults.objeto[lang];

      const termsLang = (map[`company_terms_${lang}`] || "").trim();
      const termsLegacy = lang === "pt" ? (map["company_terms"] || "").trim() : "";
      const raw = termsLang || termsLegacy || contractDefaults.termos[lang];
      newClauses[lang] = parseClauses(raw);
    }
    setObjeto(newObjeto);
    setClauses(newClauses);
    setCompanyLogoUrl(map["company_logo_url"] || "");


  }, [settings, contractDefaults]);

  // ── Section save helpers ─────────────────────────────────────────────────────
  async function saveSection(
    entries: Array<{ key: string; value: string }>,
    setSaving: (v: boolean) => void,
    validate?: () => string | null
  ) {
    if (validate) {
      const err = validate();
      if (err) { toast.error(err); return; }
    }
    setSaving(true);
    try {
      await setManyMutation.mutateAsync({ entries });
    } finally {
      setSaving(false);
    }
  }



  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ajuste as configurações gerais do sistema e canais de comunicação
        </p>
      </div>

      <div className="space-y-6">
        {/* ─── Dados da Empresa ────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Dados da Empresa</h2>
            </div>
            <SectionSaveBtn
              saving={savingCompany}
              onClick={() => saveSection([
                { key: "company_name", value: companyName },
                { key: "company_cnpj", value: companyCnpj },
                { key: "company_address", value: companyAddress },
                { key: "company_city", value: companyCity },
                { key: "company_state", value: companyState },
                { key: "company_cep", value: companyCep },
                { key: "company_phone", value: companyPhone },
                { key: "company_email", value: companyEmail },
                { key: "company_website", value: companyWebsite },
                { key: "company_foro", value: companyForo },
                { key: "company_caucao", value: companyCaucao },
                { key: "company_logo_url", value: companyLogoUrl },
              ], setSavingCompany)}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Informações usadas no cabeçalho do contrato PDF e nos e-mails automáticos.
          </p>
          {/* Logo da empresa */}
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Logo da empresa (PDF)</Label>
            <div className="flex items-center gap-3">
              {companyLogoUrl && (
                <img src={companyLogoUrl} alt="Logo" className="h-12 w-auto object-contain rounded border border-border bg-white p-1" />
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande (máx 5 MB)"); return; }
                    setUploadingLogo(true);
                    try {
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const base64 = ev.target?.result as string;
                        await uploadLogoMutation.mutateAsync({ base64, mimeType: file.type });
                        setUploadingLogo(false);
                      };
                      reader.onerror = () => { toast.error("Erro ao ler arquivo"); setUploadingLogo(false); };
                      reader.readAsDataURL(file);
                    } catch (err: any) {
                      toast.error(friendlyError(err, "Erro ao enviar logo"));
                      setUploadingLogo(false);
                    }
                  }}
                />
                <Button variant="outline" size="sm" disabled={uploadingLogo} asChild>
                  <span className="gap-1.5 flex items-center">
                    {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="text-xs">📎</span>}
                    {companyLogoUrl ? "Trocar logo" : "Enviar logo"}
                  </span>
                </Button>
              </label>
              {companyLogoUrl && (
                <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => setCompanyLogoUrl("")}>Remover</Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Aparece no cabeçalho do contrato PDF. PNG ou WEBP com fundo transparente recomendado.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome da empresa" value={companyName} onChange={setCompanyName} placeholder="Bike To Go Floripa" />
            <Field label="CNPJ" value={companyCnpj} onChange={setCompanyCnpj} placeholder="00.000.000/0001-00" mono />
            <div className="sm:col-span-2">
              <Field label="Endereço (rua, número, complemento)" value={companyAddress} onChange={setCompanyAddress} placeholder="Rua das Flores, 123 — Sala 2" />
            </div>
            <Field label="Cidade" value={companyCity} onChange={setCompanyCity} placeholder="Florianópolis" />
            <Field label="Estado (UF)" value={companyState} onChange={setCompanyState} placeholder="SC" />
            <Field label="CEP" value={companyCep} onChange={setCompanyCep} placeholder="88000-000" mono />
            <Field label="Telefone da empresa" value={companyPhone} onChange={(v) => setCompanyPhone(maskPhone(v))} placeholder="(48) 99999-9999" />
            <Field label="E-mail da empresa" value={companyEmail} onChange={setCompanyEmail} placeholder="contato@biketogo.com.br" type="email" />
            <Field label="Site" value={companyWebsite} onChange={setCompanyWebsite} placeholder="https://biketogo.com.br" />

            {/* ── Campos do Contrato PDF ── */}
            <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Campos do Contrato PDF</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Foro (comarca)"
                  value={companyForo}
                  onChange={setCompanyForo}
                  placeholder="Florianópolis/SC"
                  hint="Foro de eleição para resolução de conflitos"
                />
                <Field
                  label="Valor de caução (R$)"
                  value={companyCaucao}
                  onChange={setCompanyCaucao}
                  placeholder="500.00"
                  type="number"
                  hint="Caução exigida no contrato (opcional)"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Conteúdo do contrato (por idioma) ──────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Conteúdo do contrato</h2>
            </div>
            <SectionSaveBtn
              saving={savingContent}
              onClick={() => {
                const entries: Array<{ key: string; value: string }> = [];
                for (const lang of LANGS) {
                  entries.push({ key: `company_object_${lang}`, value: objeto[lang] });
                  entries.push({
                    key: `company_terms_${lang}`,
                    value: clauses[lang].map((c) => c.trim()).filter(Boolean).map((c, i) => `${i + 1}. ${c}`).join("\n\n"),
                  });
                }
                saveSection(entries, setSavingContent);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Texto do Objeto do contrato e as cláusulas de Termos, editáveis por idioma. Este é exatamente o texto que sai no PDF do contrato — os campos já vêm preenchidos com o padrão. Edite e salve para que o seu texto passe a valer.
          </p>
          <Tabs defaultValue="pt">
            <TabsList className="mb-4">
              <TabsTrigger value="pt">🇧🇷 PT</TabsTrigger>
              <TabsTrigger value="en">🇺🇸 EN</TabsTrigger>
              <TabsTrigger value="es">🇪🇸 ES</TabsTrigger>
            </TabsList>
            {LANGS.map((lang) => (
              <TabsContent key={lang} value={lang} className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Objeto do contrato</Label>
                  <Textarea
                    rows={5}
                    value={objeto[lang]}
                    onChange={(e) => setObjeto((prev) => ({ ...prev, [lang]: e.target.value }))}
                    placeholder="Texto do objeto do contrato..."
                    className="bg-secondary border-border text-sm resize-y"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Termos e condições</Label>
                  <p className="text-xs text-muted-foreground mb-3">Cada cláusula é numerada automaticamente no PDF. Estas são as cláusulas que saem hoje no contrato — edite, remova ou adicione as suas.</p>
                  <div className="space-y-2">
                    {clauses[lang].map((clause, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span
                          className="mt-2 flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground"
                        >
                          {i + 1}.
                        </span>
                        <Textarea
                          rows={2}
                          value={clause}
                          onChange={(e) => setClauses((prev) => ({ ...prev, [lang]: prev[lang].map((c, idx) => idx === i ? e.target.value : c) }))}
                          placeholder={`Cláusula ${i + 1}...`}
                          className="bg-secondary border-border text-sm resize-y flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => setClauses((prev) => {
                            const next = prev[lang].filter((_, idx) => idx !== i);
                            return { ...prev, [lang]: next.length ? next : [""] };
                          })}
                          className="mt-2 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remover cláusula"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setClauses((prev) => ({ ...prev, [lang]: [...prev[lang], ""] }))}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar cláusula
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* ─── Operating Hours ──────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Horário de Funcionamento</h2>
            </div>
            <SectionSaveBtn
              saving={savingOperating}
              onClick={() => saveSection([
                { key: "opening_time", value: openingTime },
                { key: "closing_time", value: closingTime },
              ], setSavingOperating)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Abertura" value={openingTime} onChange={setOpeningTime} type="time" />
            <Field label="Fechamento" value={closingTime} onChange={setClosingTime} type="time" />
          </div>
        </div>

        {/* ─── Notifications (contact) ──────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Contato & Notificações</h2>
            </div>
            <SectionSaveBtn
              saving={savingNotifications}
              onClick={() => {
                const resDigits = whatsappReservas.replace(/\D/g, "");
                if (whatsappReservas && resDigits.length < 10) {
                  toast.error("Número de WhatsApp para reservas inválido. Informe DDD + número.");
                  return;
                }
                saveSection([
                  { key: "whatsapp_reservas", value: whatsappReservas },
                  { key: "notification_email", value: notificationEmail },
                ], setSavingNotifications);
              }}
            />
          </div>
          <div className="space-y-4">
            <Field
              label="Número de WhatsApp para reservas"
              value={whatsappReservas}
              onChange={(v) => setWhatsappReservas(maskPhone(v))}
              placeholder="(48) 99999-9999"
              hint="Exibido no formulário público /reservar após o cadastro. DDD + número."
            />
            <Field
              label="Email de contato / remetente"
              value={notificationEmail}
              onChange={setNotificationEmail}
              placeholder="biketogo.floripa@gmail.com"
              hint="Email usado como remetente nas confirmações de reserva para clientes"
            />

          </div>
        </div>

        {/* ─── Shopify Integration ──────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Integração Shopify</h2>
            </div>
            <SectionSaveBtn
              saving={savingShopify}
              onClick={() => saveSection([{ key: "shopify_api_key", value: shopifyApiKey }], setSavingShopify)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Chave de API para o formulário Shopify
            </Label>
            <div className="flex gap-2">
              <Input
                value={shopifyApiKey}
                onChange={(e) => setShopifyApiKey(e.target.value)}
                className="bg-secondary border-border font-mono text-xs"
                placeholder="Gere uma chave segura"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const key = crypto.randomUUID().replace(/-/g, "");
                  setShopifyApiKey(key);
                }}
              >
                Gerar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Use esta chave no formulário do Shopify para autenticar as requisições
            </p>
          </div>
        </div>

        {/* ─── Archive Retention ─────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Arquivamento de Registros</h2>
            </div>
            <SectionSaveBtn
              saving={savingArchive}
              onClick={() => {
                const v = parseInt(archiveRetentionDays);
                if (isNaN(v) || v < 3 || v > 30) {
                  toast.error("Informe um valor entre 3 e 30 dias.");
                  return;
                }
                saveSection([{ key: "archive_retention_days", value: archiveRetentionDays }], setSavingArchive);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Registros arquivados (clientes e aluguéis) são excluídos automaticamente após o prazo configurado.
            Um job automático roda a cada 24h e remove os registros expirados.
          </p>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Excluir registros arquivados após X dias</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                min={3}
                max={30}
                value={archiveRetentionDays}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) setArchiveRetentionDays(String(Math.min(30, Math.max(3, v))));
                }}
                className="bg-secondary border-border w-24"
              />
              <span className="text-sm text-muted-foreground">dias (mín. 3, máx. 30)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Padrão: 5 dias. Badges de expiração aparecem nas abas Arquivados de Clientes e Aluguéis.
            </p>
          </div>
        </div>

        {/* ─── Public form link ───────────────────────────────────────────────────── */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Link className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Formulário Público de Reserva</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Compartilhe este link com seus clientes ou integre no Shopify via iframe.
            O formulário permite que clientes façam o pré-cadastro online.
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={`${window.location.origin}/reservar`}
              className="bg-secondary border-border font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/reservar`);
                toast.success("Link copiado");
              }}
            >
              Copiar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
