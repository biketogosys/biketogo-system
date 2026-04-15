import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, Settings as SettingsIcon, Truck, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Settings() {
  const { data: settings, isLoading } = trpc.settings.getAll.useQuery();
  const setMutation = trpc.settings.set.useMutation({
    onSuccess: () => toast.success("Configuração salva!"),
    onError: (e) => toast.error(e.message),
  });

  const [deliveryFee, setDeliveryFee] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("19:00");
  const [deliveryMargin, setDeliveryMargin] = useState("30");
  const [shopifyApiKey, setShopifyApiKey] = useState("");

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s: any) => { map[s.key] = s.value; });
      setDeliveryFee(map["delivery_fee"] || "30");
      setWhatsappNumber(map["whatsapp_number"] || "");
      setOpeningTime(map["opening_time"] || "09:00");
      setClosingTime(map["closing_time"] || "19:00");
      setDeliveryMargin(map["delivery_margin_min"] || "30");
      setShopifyApiKey(map["shopify_api_key"] || "");
    }
  }, [settings]);

  const handleSave = (key: string, value: string) => {
    setMutation.mutate({ key, value });
  };

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
          Ajuste as configurações gerais do sistema
        </p>
      </div>

      <div className="space-y-6">
        {/* Delivery */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Entrega</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Taxa de entrega (R$)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="bg-secondary border-border"
                  placeholder="30.00"
                />
                <Button
                  size="sm"
                  onClick={() => handleSave("delivery_fee", deliveryFee)}
                  disabled={setMutation.isPending}
                  style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Margem de trânsito (min)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={deliveryMargin}
                  onChange={(e) => setDeliveryMargin(e.target.value)}
                  className="bg-secondary border-border"
                  placeholder="30"
                />
                <Button
                  size="sm"
                  onClick={() => handleSave("delivery_margin_min", deliveryMargin)}
                  disabled={setMutation.isPending}
                  style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Horário de Funcionamento</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Abertura</Label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="bg-secondary border-border"
                />
                <Button
                  size="sm"
                  onClick={() => handleSave("opening_time", openingTime)}
                  disabled={setMutation.isPending}
                  style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Fechamento</Label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="bg-secondary border-border"
                />
                <Button
                  size="sm"
                  onClick={() => handleSave("closing_time", closingTime)}
                  disabled={setMutation.isPending}
                  style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Notificações</h2>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Número WhatsApp para receber notificações
            </Label>
            <div className="flex gap-2">
              <Input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="bg-secondary border-border"
                placeholder="+55 48 99999-9999"
              />
              <Button
                size="sm"
                onClick={() => handleSave("whatsapp_number", whatsappNumber)}
                disabled={setMutation.isPending}
                style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
              >
                <Save className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Formato: +55 48 99999-9999 (com código do país e DDD)
            </p>
          </div>
        </div>

        {/* API Integration */}
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
              <Button
                size="sm"
                onClick={() => handleSave("shopify_api_key", shopifyApiKey)}
                disabled={setMutation.isPending}
                style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
              >
                <Save className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Use esta chave no formulário do Shopify para autenticar as requisições
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
