import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { maskPhone } from "@/hooks/useMask";
import { toast } from "sonner";
import {
  Loader2, Save, Settings as SettingsIcon, Truck, Phone, Clock, Mail,
  MessageCircle, Link, Eye, EyeOff, Building2, Plus, X, Bike,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const GOLD = "oklch(0.68 0.12 65)";
const GOLD_FG = "oklch(0.10 0.005 240)";

/** Default delivery hour slots */
const DEFAULT_DELIVERY_HOURS = [
  "08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00","18:00",
];

function SaveBtn({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button size="sm" onClick={onClick} disabled={disabled} style={{ background: GOLD, color: GOLD_FG }}>
      <Save className="w-3.5 h-3.5" />
    </Button>
  );
}

function SettingField({
  label, value, onChange, onSave, saving, placeholder, type = "text", hint, mono, secret,
}: {
  label: string; value: string; onChange: (v: string) => void; onSave: () => void;
  saving: boolean; placeholder?: string; type?: string; hint?: string; mono?: boolean; secret?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
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
        <SaveBtn onClick={onSave} disabled={saving} />
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function SettingTextarea({
  label, value, onChange, onSave, saving, placeholder, hint, rows = 4,
}: {
  label: string; value: string; onChange: (v: string) => void; onSave: () => void;
  saving: boolean; placeholder?: string; hint?: string; rows?: number;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="flex gap-2 items-start">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-secondary border-border flex-1 text-sm resize-y"
          placeholder={placeholder}
          rows={rows}
        />
        <SaveBtn onClick={onSave} disabled={saving} />
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const { data: settings, isLoading } = trpc.settings.getAll.useQuery();
  const setMutation = trpc.settings.set.useMutation({
    onSuccess: () => toast.success("Configuração salva!"),
    onError: (e) => toast.error(e.message),
  });

  // ── Company ──────────────────────────────────────────────────────────────────
  const [companyName, setCompanyName] = useState("");
  const [companyCnpj, setCompanyCnpj] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyState, setCompanyState] = useState("");
  const [companyCep, setCompanyCep] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  // New PDF fields
  const [companyForo, setCompanyForo] = useState("");
  const [companyTerms, setCompanyTerms] = useState("");
  const [companyCaucao, setCompanyCaucao] = useState("");

  // ── Delivery ─────────────────────────────────────────────────────────────────
  const [deliveryFee, setDeliveryFee] = useState("");
  const [deliveryMargin, setDeliveryMargin] = useState("30");

  // ── Delivery Hours ───────────────────────────────────────────────────────────
  // Each entry: { time: "HH:MM", active: boolean, custom: boolean }
  type HourEntry = { time: string; active: boolean; custom: boolean };
  const [deliveryHours, setDeliveryHours] = useState<HourEntry[]>(() =>
    DEFAULT_DELIVERY_HOURS.map((t) => ({ time: t, active: true, custom: false }))
  );
  const [newHourInput, setNewHourInput] = useState("");
  const [hoursSaving, setHoursSaving] = useState(false);

  // ── Operating Hours ──────────────────────────────────────────────────────────
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("19:00");

  // ── Notifications ────────────────────────────────────────────────────────────
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [adminNotificationEmail, setAdminNotificationEmail] = useState("");

  // ── Archive ──────────────────────────────────────────────────────────────────
  const [archiveRetentionDays, setArchiveRetentionDays] = useState("5");

  // ── Email (Resend) ───────────────────────────────────────────────────────────
  const [resendApiKey, setResendApiKey] = useState("");

  // ── WhatsApp Z-API ───────────────────────────────────────────────────────────
  const [zapiInstanceId, setZapiInstanceId] = useState("");
  const [zapiToken, setZapiToken] = useState("");

  // ── WhatsApp Cloud API ───────────────────────────────────────────────────────
  const [waApiToken, setWaApiToken] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");

  // ── Shopify ──────────────────────────────────────────────────────────────────
  const [shopifyApiKey, setShopifyApiKey] = useState("");

  // ── Load settings ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!settings) return;
    const map: Record<string, string> = {};
    settings.forEach((s: any) => { map[s.key] = s.value; });

    setDeliveryFee(map["delivery_fee"] || "30");
    setDeliveryMargin(map["delivery_margin_min"] || "30");
    setOpeningTime(map["opening_time"] || "09:00");
    setClosingTime(map["closing_time"] || "19:00");
    setWhatsappNumber(map["whatsapp_number"] || "");
    setNotificationEmail(map["notification_email"] || "");
    setAdminNotificationEmail(map["admin_notification_email"] || "");
    setArchiveRetentionDays(map["archive_retention_days"] || "5");
    setResendApiKey(map["resend_api_key"] || "");
    setZapiInstanceId(map["zapi_instance_id"] || "");
    setZapiToken(map["zapi_token"] || "");
    setWaApiToken(map["whatsapp_api_token"] || "");
    setWaPhoneId(map["whatsapp_phone_id"] || "");
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
    setCompanyTerms(map["company_terms"] || "");
    setCompanyCaucao(map["company_caucao"] || "");

    // Load delivery hours
    if (map["delivery_hours"]) {
      try {
        const saved: string[] = JSON.parse(map["delivery_hours"]);
        // Merge: default hours + custom hours from saved, mark active/inactive
        const allTimes = new Set([...DEFAULT_DELIVERY_HOURS, ...saved]);
        const entries: HourEntry[] = Array.from(allTimes)
          .sort()
          .map((t) => ({
            time: t,
            active: saved.includes(t),
            custom: !DEFAULT_DELIVERY_HOURS.includes(t),
          }));
        setDeliveryHours(entries);
      } catch {
        // keep defaults
      }
    }
  }, [settings]);

  const save = (key: string, value: string) => setMutation.mutate({ key, value });
  const saving = setMutation.isPending;

  // ── Delivery hours helpers ───────────────────────────────────────────────────
  const activeHours = useMemo(() => deliveryHours.filter((h) => h.active).map((h) => h.time), [deliveryHours]);

  function toggleHour(time: string) {
    setDeliveryHours((prev) => prev.map((h) => h.time === time ? { ...h, active: !h.active } : h));
  }

  function addCustomHour() {
    const t = newHourInput.trim();
    if (!t.match(/^\d{2}:\d{2}$/)) { toast.error("Formato inválido. Use HH:MM (ex: 07:30)"); return; }
    if (deliveryHours.some((h) => h.time === t)) { toast.error("Horário já existe"); return; }
    setDeliveryHours((prev) => [...prev, { time: t, active: true, custom: true }].sort((a, b) => a.time.localeCompare(b.time)));
    setNewHourInput("");
  }

  function removeCustomHour(time: string) {
    setDeliveryHours((prev) => prev.filter((h) => h.time !== time));
  }

  async function saveDeliveryHours() {
    setHoursSaving(true);
    try {
      await setMutation.mutateAsync({ key: "delivery_hours", value: JSON.stringify(activeHours) });
    } finally {
      setHoursSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ajuste as configurações gerais do sistema e canais de comunicação
        </p>
      </div>

      <div className="space-y-6">
        {/* ─── Dados da Empresa ────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Dados da Empresa</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Informações usadas no cabeçalho do contrato PDF e nos e-mails automáticos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SettingField
              label="Nome da empresa"
              value={companyName}
              onChange={setCompanyName}
              onSave={() => save("company_name", companyName)}
              saving={saving}
              placeholder="Bike To Go Floripa"
            />
            <SettingField
              label="CNPJ"
              value={companyCnpj}
              onChange={setCompanyCnpj}
              onSave={() => save("company_cnpj", companyCnpj)}
              saving={saving}
              placeholder="00.000.000/0001-00"
              mono
            />
            <div className="sm:col-span-2">
              <SettingField
                label="Endereço (rua, número, complemento)"
                value={companyAddress}
                onChange={setCompanyAddress}
                onSave={() => save("company_address", companyAddress)}
                saving={saving}
                placeholder="Rua das Flores, 123 — Sala 2"
              />
            </div>
            <SettingField
              label="Cidade"
              value={companyCity}
              onChange={setCompanyCity}
              onSave={() => save("company_city", companyCity)}
              saving={saving}
              placeholder="Florianópolis"
            />
            <SettingField
              label="Estado (UF)"
              value={companyState}
              onChange={setCompanyState}
              onSave={() => save("company_state", companyState)}
              saving={saving}
              placeholder="SC"
            />
            <SettingField
              label="CEP"
              value={companyCep}
              onChange={setCompanyCep}
              onSave={() => save("company_cep", companyCep)}
              saving={saving}
              placeholder="88000-000"
              mono
            />
            <SettingField
              label="Telefone da empresa"
              value={companyPhone}
              onChange={(v) => setCompanyPhone(maskPhone(v))}
              onSave={() => save("company_phone", companyPhone)}
              saving={saving}
              placeholder="(48) 99999-9999"
            />
            <SettingField
              label="E-mail da empresa"
              value={companyEmail}
              onChange={setCompanyEmail}
              onSave={() => save("company_email", companyEmail)}
              saving={saving}
              placeholder="contato@biketogo.com.br"
              type="email"
            />
            <SettingField
              label="Site"
              value={companyWebsite}
              onChange={setCompanyWebsite}
              onSave={() => save("company_website", companyWebsite)}
              saving={saving}
              placeholder="https://biketogo.com.br"
            />
            {/* ── Novos campos para o PDF ── */}
            <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Campos do Contrato PDF</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingField
                  label="Foro (comarca)"
                  value={companyForo}
                  onChange={setCompanyForo}
                  onSave={() => save("company_foro", companyForo)}
                  saving={saving}
                  placeholder="Florianópolis/SC"
                  hint="Foro de eleição para resolução de conflitos"
                />
                <SettingField
                  label="Valor de caução (R$)"
                  value={companyCaucao}
                  onChange={setCompanyCaucao}
                  onSave={() => save("company_caucao", companyCaucao)}
                  saving={saving}
                  placeholder="500.00"
                  type="number"
                  hint="Caução exigida no contrato (opcional)"
                />
                <div className="sm:col-span-2">
                  <SettingTextarea
                    label="Termos e condições do contrato"
                    value={companyTerms}
                    onChange={setCompanyTerms}
                    onSave={() => save("company_terms", companyTerms)}
                    saving={saving}
                    placeholder="Cláusulas e condições gerais do contrato de aluguel..."
                    hint="Texto exibido na seção de Termos e Condições do PDF"
                    rows={6}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Delivery ─────────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Entrega</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SettingField
              label="Taxa de entrega (R$)"
              value={deliveryFee}
              onChange={setDeliveryFee}
              onSave={() => save("delivery_fee", deliveryFee)}
              saving={saving}
              type="number"
              placeholder="30.00"
            />
            <SettingField
              label="Margem de trânsito (min)"
              value={deliveryMargin}
              onChange={setDeliveryMargin}
              onSave={() => save("delivery_margin_min", deliveryMargin)}
              saving={saving}
              type="number"
              placeholder="30"
            />
          </div>
        </div>

        {/* ─── Horários de Entrega ──────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Bike className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Horários de Entrega</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Defina quais horários aparecem para o cliente no formulário de reserva.
            Apenas os horários <strong>ativos</strong> (marcados) serão exibidos.
          </p>

          {/* Grid de toggles */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
            {deliveryHours.map((h) => (
              <div key={h.time} className="relative group">
                <button
                  type="button"
                  onClick={() => toggleHour(h.time)}
                  className={`w-full text-sm font-medium py-2 px-3 rounded-lg border transition-colors ${
                    h.active
                      ? "border-primary/60 text-primary"
                      : "border-border text-muted-foreground opacity-50 hover:opacity-75"
                  }`}
                  style={h.active ? { background: "oklch(0.68 0.12 65 / 0.12)" } : {}}
                >
                  {h.time}
                </button>
                {h.custom && (
                  <button
                    type="button"
                    onClick={() => removeCustomHour(h.time)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white hidden group-hover:flex items-center justify-center"
                    title="Remover horário personalizado"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Adicionar horário personalizado */}
          <div className="flex gap-2 mb-4">
            <Input
              type="time"
              value={newHourInput}
              onChange={(e) => setNewHourInput(e.target.value)}
              className="bg-secondary border-border w-36 font-mono text-sm"
              placeholder="HH:MM"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addCustomHour}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar horário
            </Button>
          </div>

          {/* Resumo + salvar */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {activeHours.length} horário(s) ativo(s) de {deliveryHours.length} total
            </p>
            <Button
              size="sm"
              onClick={saveDeliveryHours}
              disabled={hoursSaving}
              style={{ background: GOLD, color: GOLD_FG }}
              className="gap-1.5"
            >
              {hoursSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar horários
            </Button>
          </div>
        </div>

        {/* ─── Operating Hours ──────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Horário de Funcionamento</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SettingField
              label="Abertura"
              value={openingTime}
              onChange={setOpeningTime}
              onSave={() => save("opening_time", openingTime)}
              saving={saving}
              type="time"
            />
            <SettingField
              label="Fechamento"
              value={closingTime}
              onChange={setClosingTime}
              onSave={() => save("closing_time", closingTime)}
              saving={saving}
              type="time"
            />
          </div>
        </div>

        {/* ─── Notifications (contact) ──────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Contato & Notificações</h2>
          </div>
          <div className="space-y-4">
            <SettingField
              label="Número WhatsApp para receber notificações"
              value={whatsappNumber}
              onChange={(v) => setWhatsappNumber(maskPhone(v))}
              onSave={() => {
                const digits = whatsappNumber.replace(/\D/g, "");
                if (whatsappNumber && digits.length < 10) {
                  toast.error("Número de WhatsApp inválido. Informe DDD + número.");
                  return;
                }
                save("whatsapp_number", whatsappNumber);
              }}
              saving={saving}
              placeholder="(48) 99999-9999"
              hint="Formato: (48) 99999-9999 — DDD + número"
            />
            <SettingField
              label="Email de contato / remetente"
              value={notificationEmail}
              onChange={setNotificationEmail}
              onSave={() => save("notification_email", notificationEmail)}
              saving={saving}
              placeholder="biketogo.floripa@gmail.com"
              hint="Email usado como remetente nas confirmações de reserva para clientes"
            />
            <SettingField
              label="E-mail de notificação do admin"
              value={adminNotificationEmail}
              onChange={setAdminNotificationEmail}
              onSave={() => save("admin_notification_email", adminNotificationEmail)}
              saving={saving}
              placeholder="admin@empresa.com"
              hint="Receba alertas de novas reservas pendentes neste e-mail"
            />
          </div>
        </div>

        {/* ─── Email API (Resend) ───────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Email Automático (Resend)</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Opcional
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Configure a API do{" "}
            <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Resend
            </a>{" "}
            para enviar emails automáticos de confirmação de reserva para os clientes.
            Crie uma conta gratuita (100 emails/dia) e gere uma API key.
          </p>
          <SettingField
            label="Resend API Key"
            value={resendApiKey}
            onChange={setResendApiKey}
            onSave={() => save("resend_api_key", resendApiKey)}
            saving={saving}
            placeholder="re_xxxxxxxxxxxxxxxxx"
            mono
            secret
            hint="Encontre em resend.com > API Keys"
          />
        </div>

        {/* ─── WhatsApp API ─────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">WhatsApp Automático</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Opcional
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Configure uma das opções abaixo para enviar notificações automáticas via WhatsApp quando uma nova reserva for feita.
          </p>

          {/* Z-API */}
          <div className="mb-5 pb-5 border-b border-border">
            <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5" />
              Opção 1: Z-API (Recomendado para Brasil)
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Crie uma conta em{" "}
              <a href="https://z-api.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                z-api.io
              </a>{" "}
              e conecte seu WhatsApp. Copie o Instance ID e Token do painel.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SettingField
                label="Z-API Instance ID"
                value={zapiInstanceId}
                onChange={setZapiInstanceId}
                onSave={() => save("zapi_instance_id", zapiInstanceId)}
                saving={saving}
                placeholder="XXXXXX"
                mono
              />
              <SettingField
                label="Z-API Token"
                value={zapiToken}
                onChange={setZapiToken}
                onSave={() => save("zapi_token", zapiToken)}
                saving={saving}
                placeholder="Token da instância"
                mono
                secret
              />
            </div>
          </div>

          {/* WhatsApp Cloud API */}
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5" />
              Opção 2: WhatsApp Cloud API (Meta)
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Configure pelo{" "}
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Meta for Developers
              </a>
              . Requer conta Business verificada.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SettingField
                label="Access Token"
                value={waApiToken}
                onChange={setWaApiToken}
                onSave={() => save("whatsapp_api_token", waApiToken)}
                saving={saving}
                placeholder="Bearer token"
                mono
                secret
              />
              <SettingField
                label="Phone Number ID"
                value={waPhoneId}
                onChange={setWaPhoneId}
                onSave={() => save("whatsapp_phone_id", waPhoneId)}
                saving={saving}
                placeholder="ID do número"
                mono
              />
            </div>
          </div>
        </div>

        {/* ─── Shopify Integration ──────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Integração Shopify</h2>
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
                size="sm"
                variant="outline"
                onClick={() => {
                  const key = crypto.randomUUID().replace(/-/g, "");
                  setShopifyApiKey(key);
                }}
              >
                Gerar
              </Button>
              <SaveBtn onClick={() => save("shopify_api_key", shopifyApiKey)} disabled={saving} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Use esta chave no formulário do Shopify para autenticar as requisições
            </p>
          </div>
        </div>

        {/* ─── Archive Retention ─────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Arquivamento de Registros</h2>
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
              <SaveBtn
                onClick={() => {
                  const v = parseInt(archiveRetentionDays);
                  if (isNaN(v) || v < 3 || v > 30) {
                    toast.error("Informe um valor entre 3 e 30 dias.");
                    return;
                  }
                  save("archive_retention_days", archiveRetentionDays);
                }}
                disabled={saving}
              />
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
            O formulário permite que clientes escolham a bike, período e façam a reserva online.
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
                toast.success("Link copiado!");
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
