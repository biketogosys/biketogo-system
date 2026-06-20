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
import { trpc } from "@/lib/trpc";

const GOLD = "oklch(0.68 0.12 65)";
const GOLD_FG = "oklch(0.10 0.005 240)";



// ── Section save button ──────────────────────────────────────────────────────
function SectionSaveBtn({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      disabled={saving}
      style={{ background: GOLD, color: GOLD_FG }}
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
  const { data: settings, isLoading } = trpc.settings.getAll.useQuery();
  const setManyMutation = trpc.settings.setMany.useMutation({
    onSuccess: () => toast.success("Configurações salvas!"),
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
  const [companyForo, setCompanyForo] = useState("");
  const [companyTerms, setCompanyTerms] = useState("");
  const [companyCaucao, setCompanyCaucao] = useState("");



  // ── Operating Hours ──────────────────────────────────────────────────────────
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("19:00");

  // ── Notifications ────────────────────────────────────────────────────────────
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappReservas, setWhatsappReservas] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [adminNotificationEmail, setAdminNotificationEmail] = useState("");

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
  useEffect(() => {
    if (!settings) return;
    const map: Record<string, string> = {};
    settings.forEach((s: any) => { map[s.key] = s.value; });


    setOpeningTime(map["opening_time"] || "09:00");
    setClosingTime(map["closing_time"] || "19:00");
    setWhatsappNumber(map["whatsapp_number"] || "");
    setWhatsappReservas(map["whatsapp_reservas"] || "");
    setNotificationEmail(map["notification_email"] || "");
    setAdminNotificationEmail(map["admin_notification_email"] || "");
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
    setCompanyTerms(map["company_terms"] || "");
    setCompanyCaucao(map["company_caucao"] || "");


  }, [settings]);

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
                { key: "company_terms", value: companyTerms },
              ], setSavingCompany)}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Informações usadas no cabeçalho do contrato PDF e nos e-mails automáticos.
          </p>
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
                <div className="sm:col-span-2">
                  <FieldTextarea
                    label="Termos e condições do contrato"
                    value={companyTerms}
                    onChange={setCompanyTerms}
                    placeholder="Cláusulas e condições gerais do contrato de aluguel..."
                    hint="Texto exibido na seção de Termos e Condições do PDF. Use linhas em branco para separar cláusulas."
                    rows={6}
                  />
                </div>
              </div>
            </div>
          </div>
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
                const digits = whatsappNumber.replace(/\D/g, "");
                if (whatsappNumber && digits.length < 10) {
                  toast.error("Número de WhatsApp inválido. Informe DDD + número.");
                  return;
                }
                const resDigits = whatsappReservas.replace(/\D/g, "");
                if (whatsappReservas && resDigits.length < 10) {
                  toast.error("Número de WhatsApp para reservas inválido. Informe DDD + número.");
                  return;
                }
                saveSection([
                  { key: "whatsapp_number", value: whatsappNumber },
                  { key: "whatsapp_reservas", value: whatsappReservas },
                  { key: "notification_email", value: notificationEmail },
                  { key: "admin_notification_email", value: adminNotificationEmail },
                ], setSavingNotifications);
              }}
            />
          </div>
          <div className="space-y-4">
            <Field
              label="Número WhatsApp para receber notificações"
              value={whatsappNumber}
              onChange={(v) => setWhatsappNumber(maskPhone(v))}
              placeholder="(48) 99999-9999"
              hint="Formato: (48) 99999-9999 — DDD + número"
            />
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
            <Field
              label="E-mail de notificação do admin"
              value={adminNotificationEmail}
              onChange={setAdminNotificationEmail}
              placeholder="admin@empresa.com"
              hint="Receba alertas de novas reservas pendentes neste e-mail"
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
