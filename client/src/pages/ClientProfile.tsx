import { trpc } from "@/lib/trpc";
import { NewContractModal } from "@/components/NewContractModal";
import { ClientFormModal } from "@/components/ClientFormModal";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle, Mail, Phone,
  Bike, Clock, FileText, Shield,
  User, Image as ImageIcon, Trash2,
  Edit2, CreditCard, PlusCircle, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { friendlyError } from "@/lib/utils";
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
      toast.success("Cadastro validado");
      utils.clients.byId.invalidate({ id: clientId });
    },
    onError: (e) => toast.error(friendlyError(e)),
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
    onError: (e) => toast.error(friendlyError(e)),
  });

  // M1 — optimistic: os Switches (Bloqueado / Recebe e-mail) mexem na hora.
  // Antes esperavam o round-trip e pareciam travados; rollback se o servidor
  // recusar.
  const updateMutation = trpc.clients.update.useMutation({
    onMutate: async (vars) => {
      await utils.clients.byId.cancel({ id: clientId });
      const prev = utils.clients.byId.getData({ id: clientId });
      utils.clients.byId.setData({ id: clientId }, (old) =>
        old ? { ...old, ...vars } : old,
      );
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) utils.clients.byId.setData({ id: clientId }, ctx.prev);
      toast.error(friendlyError(e));
    },
    onSettled: () => {
      utils.clients.byId.invalidate({ id: clientId });
    },
  });

  const deleteDocMutation = trpc.clients.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento removido.");
      utils.clients.documents.invalidate({ clientId });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-9 w-72" />
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        </div>
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
        <ClientFormModal
          open
          onClose={() => setShowEditModal(false)}
          client={client}
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
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-destructive font-medium">
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
                className="w-full mb-3 text-sm border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Recusar cadastro
              </Button>
            )}

            {/* Reject dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogContent className="dialog-mobile">
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
                className="w-full mb-3 text-sm border-primary text-primary"
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
                    { onSuccess: () => { toast.success("Observações salvas"); setLocalNotes(null); } }
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
                  <h1 className="text-xl font-bold text-foreground">
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
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-[color,background-color,border-color] duration-150 ease-out active:scale-[0.98] whitespace-nowrap flex-shrink-0 ${
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
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-md font-medium ${
                    (client as any).lgpdConsent ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
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
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
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
