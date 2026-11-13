/**
 * Dados de cadastro do cliente (2026-11-09).
 *
 * A dona queria ver os dados do cliente sem sair do contrato: *"na própria tela
 * do contrato ou um popup estático na hora de clicar no nome"*.
 *
 * Esses campos têm regra (nacionalidade vazia é "Não informada", nunca
 * "Brasileiro"; os rótulos do endereço mudam por país). As seções moram aqui
 * para a aba Cadastro da ficha e o popup do contrato não divergirem.
 */
import { Shield, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { languages } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { formatoEndereco } from "@shared/enderecos";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type Cliente = inferRouterOutputs<AppRouter>["clients"]["byId"];

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {/* E-mail longo não tem onde quebrar: sem isto invade a coluna do lado. */}
      <span className="text-sm text-foreground [overflow-wrap:anywhere]">{value}</span>
    </div>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

export function ClientDataSections({
  client,
  grade = "grid-cols-2 md:grid-cols-3",
}: {
  client: Cliente;
  /** Colunas da grade. O popup é estreito e usa duas em qualquer tela. */
  grade?: string;
}) {
  const fmt = formatoEndereco(client.country);
  const classeGrade = `grid ${grade} gap-4`;
  return (
    <div className="space-y-6">
      <div>
        <Titulo>Identificação</Titulo>
        <div className={classeGrade}>
          <InfoRow label="Nome" value={client.name} />
          <InfoRow label="Data de nascimento" value={client.birthDate} />
          <InfoRow label="Gênero" value={client.gender} />
          {/* Vazio é "não informada", nunca "Brasileiro" (2026-10-20): era
              assim que todo estrangeiro do /reservar aparecia brasileiro. */}
          <InfoRow
            label="Nacionalidade"
            value={
              client.nacionalidade === "estrangeiro" ? "Estrangeiro"
                : client.nacionalidade === "brasileiro" ? "Brasileiro"
                : "Não informada"
            }
          />
          {client.nacionalidade !== "estrangeiro" ? (
            <>
              <InfoRow label="CPF" value={client.cpf} />
              <InfoRow label="RG" value={client.rg} />
              <InfoRow label="Tipo de documento" value={client.tipoDocumento?.toUpperCase()} />
            </>
          ) : (
            <InfoRow label="Passaporte" value={client.numeroPassaporte} />
          )}
          <InfoRow label="Altura" value={client.height ? `${client.height} cm` : null} />
          <InfoRow label="Peso" value={client.weight ? `${client.weight} kg` : null} />
          <InfoRow label="Frequência de pedal" value={client.pedalFrequency} />
          <InfoRow label="Origem" value={client.origin} />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <Titulo>Contato</Titulo>
        <div className={classeGrade}>
          <InfoRow label="WhatsApp" value={client.phone} />
          <InfoRow label="E-mail" value={client.email} />
          <InfoRow
            label="Idioma dos e-mails"
            value={languages.find((l) => l.code === client.idioma)?.label ?? "Português"}
          />
          <InfoRow label="Instagram" value={client.instagram} />
          <InfoRow label="Hospedagem" value={client.accommodation} />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <Titulo>Endereço</Titulo>
        {/* Rótulos conforme o país (2026-10-26): "ZIP code", "CAP",
            "Província"... O complemento não aparecia em lugar nenhum. */}
        <div className={classeGrade}>
          <InfoRow label={fmt.codigo.pt} value={client.zipCode} />
          <InfoRow label={fmt.brasil ? "Rua" : "Endereço"} value={client.street} />
          <InfoRow label="Número" value={client.number} />
          <InfoRow label="Complemento" value={client.complement} />
          <InfoRow label="Bairro" value={client.neighborhood} />
          <InfoRow label="Cidade" value={client.city} />
          <InfoRow label={fmt.regiao?.pt ?? "Região"} value={client.state} />
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
  );
}

/** Popup só de leitura: editar continua sendo na ficha do cliente. */
export function ClientDataDialog({ clientId, onClose }: { clientId: number; onClose: () => void }) {
  const { data: client, isLoading } = trpc.clients.byId.useQuery({ id: clientId }, { retry: 1 });
  return (
    <Dialog open onOpenChange={(aberto) => { if (!aberto) onClose(); }}>
      <DialogContent
        aria-describedby={undefined}
        className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto dialog-mobile"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Dados do cliente
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : client ? (
          <ClientDataSections client={client} grade="grid-cols-2" />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Não foi possível carregar os dados do cliente. Tente de novo.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
