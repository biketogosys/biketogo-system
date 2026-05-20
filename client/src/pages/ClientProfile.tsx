import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, CheckCircle, Ban, Mail, Phone, MapPin,
  Instagram, Building2, Ruler, Bike, Clock, FileText, Shield,
  User, Image as ImageIcon, Trash2, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Tab = "cadastro" | "documentacao" | "alugueis" | "historico";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    lead: { cls: "badge-lead", label: "Lead" },
    verified: { cls: "badge-verified", label: "Verificado" },
    blocked: { cls: "badge-blocked", label: "Bloqueado" },
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

export default function ClientProfile() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const clientId = parseInt(params.id ?? "0");
  const [activeTab, setActiveTab] = useState<Tab>("cadastro");
  const utils = trpc.useUtils();

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

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "cadastro", label: "Cadastro", icon: User },
    { id: "documentacao", label: "Documentação", icon: FileText },
    { id: "alugueis", label: "Aluguéis", icon: Bike },
    { id: "historico", label: "Histórico", icon: Clock },
  ];

  const rentals = rentalsData?.items ?? [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
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
              defaultValue={client.notes ?? ""}
              rows={4}
              className="text-xs bg-secondary border-border resize-none"
              placeholder="Adicione observações sobre o cliente..."
              onBlur={(e) => {
                if (e.target.value !== client.notes) {
                  updateMutation.mutate({ id: clientId, notes: e.target.value });
                }
              }}
            />
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
                  {client.instagram && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Instagram className="w-3 h-3" />
                      {client.instagram}
                    </div>
                  )}
                </div>
              </div>
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
                    <InfoRow label="CPF" value={client.cpf} />
                    <InfoRow label="RG / Passaporte" value={client.rg} />
                    <InfoRow label="Data de nascimento" value={client.birthDate} />
                    <InfoRow label="Gênero" value={client.gender} />
                    <InfoRow label="Altura" value={client.height ? `${client.height} m` : null} />
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
                        ? `Aceito em ${(client as any).lgpdConsentAt ? new Date((client as any).lgpdConsentAt).toLocaleString("pt-BR") : "data n\u00e3o registrada"}`
                        : "N\u00e3o registrado"}
                    </p>
                  </div>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                    (client as any).lgpdConsent ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"
                  }`}>
                    {(client as any).lgpdConsent ? "Aceito" : "Pendente"}
                  </span>
                </div>

                {/* Photos from public form */}
                {((client as any).docFrontUrl || (client as any).docBackUrl) && (
                  <div>
                    <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                      Fotos do Documento (Formul\u00e1rio P\u00fablico)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(client as any).docFrontUrl && (
                        <div className="bg-secondary border border-border rounded-lg overflow-hidden">
                          <div className="aspect-video bg-muted flex items-center justify-center">
                            <img src={(client as any).docFrontUrl} alt="Frente do documento" className="w-full h-full object-cover" />
                          </div>
                          <div className="p-3"><p className="text-xs font-medium text-foreground">Frente do Documento</p></div>
                        </div>
                      )}
                      {(client as any).docBackUrl && (
                        <div className="bg-secondary border border-border rounded-lg overflow-hidden">
                          <div className="aspect-video bg-muted flex items-center justify-center">
                            <img src={(client as any).docBackUrl} alt="Verso do documento" className="w-full h-full object-cover" />
                          </div>
                          <div className="p-3"><p className="text-xs font-medium text-foreground">Verso do Documento</p></div>
                        </div>
                      )}
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
                        <div className="aspect-video bg-muted flex items-center justify-center">
                          <img
                            src={doc.url}
                            alt={doc.type}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-foreground capitalize">
                              {doc.type === "rg_front" ? "RG — Frente" : doc.type === "rg_back" ? "RG — Verso" : "Documento"}
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
                            <span>Pagamento: {rental.paymentMethod}</span>
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
