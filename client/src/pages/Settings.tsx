import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { maskPhone } from "@/hooks/useMask";
import { toast } from "sonner";
import { Loader2, Save, Settings as SettingsIcon, Truck, Phone, Clock, Mail, MessageCircle, Link, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GOLD = "oklch(0.68 0.12 65)";
const GOLD_FG = "oklch(0.10 0.005 240)";

function SaveBtn({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button size="sm" onClick={onClick} disabled={disabled} style={{ background: GOLD, color: GOLD_FG }}>
      <Save className="w-3.5 h-3.5" />
    </Button>
  );
}

function SettingField({
  label,
  value,
  onChange,
  onSave,
  saving,
  placeholder,
  type = "text",
  hint,
  mono,
  secret,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  placeholder?: string;
  type?: string;
  hint?: string;
  mono?: boolean;
  secret?: boolean;
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

export default function Settings() {
  const { data: settings, isLoading } = trpc.settings.getAll.useQuery();
  const setMutation = trpc.settings.set.useMutation({
    onSuccess: () => toast.success("Configuração salva!"),
    onError: (e) => toast.error(e.message),
  });

  // Delivery
  const [deliveryFee, setDeliveryFee] = useState("");
  const [deliveryMargin, setDeliveryMargin] = useState("30");
  // Hours
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("19:00");
  // Notifications
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  // Email (Resend)
  const [resendApiKey, setResendApiKey] = useState("");
  // WhatsApp Z-API
  const [zapiInstanceId, setZapiInstanceId] = useState("");
  const [zapiToken, setZapiToken] = useState("");
  // WhatsApp Cloud API
  const [waApiToken, setWaApiToken] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  // Shopify
  const [shopifyApiKey, setShopifyApiKey] = useState("");

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s: any) => { map[s.key] = s.value; });
      setDeliveryFee(map["delivery_fee"] || "30");
      setDeliveryMargin(map["delivery_margin_min"] || "30");
      setOpeningTime(map["opening_time"] || "09:00");
      setClosingTime(map["closing_time"] || "19:00");
      setWhatsappNumber(map["whatsapp_number"] || "");
      setNotificationEmail(map["notification_email"] || "");
      setResendApiKey(map["resend_api_key"] || "");
      setZapiInstanceId(map["zapi_instance_id"] || "");
      setZapiToken(map["zapi_token"] || "");
      setWaApiToken(map["whatsapp_api_token"] || "");
      setWaPhoneId(map["whatsapp_phone_id"] || "");
      setShopifyApiKey(map["shopify_api_key"] || "");
    }
  }, [settings]);

  const save = (key: string, value: string) => setMutation.mutate({ key, value });
  const saving = setMutation.isPending;

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
              hint="Email usado como remetente nas confirmações de reserva"
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
            Configure a API do <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Resend</a> para
            enviar emails automáticos de confirmação de reserva para os clientes.
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
              Crie uma conta em <a href="https://z-api.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">z-api.io</a> e
              conecte seu WhatsApp. Copie o Instance ID e Token do painel.
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
              Configure pelo <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta for Developers</a>.
              Requer conta Business verificada.
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

        {/* ─── Public form link ─────────────────────────────────────────────── */}
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
