import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";
import { Search, Plus, Loader2, User, MapPin, Calendar, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import NewClientDialog from "@/components/NewClientDialog";

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

export default function Clients() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>(undefined);
  const [showNew, setShowNew] = useState(false);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.clients.list.useQuery({
    search: search || undefined,
    status,
    limit: 100,
    offset: 0,
  });

  const clients = data?.items ?? [];
  const total = data?.total ?? 0;

  const statusFilters: { label: string; value: Status; cls: string }[] = [
    { label: "Todos", value: undefined, cls: "" },
    { label: "Lead", value: "lead", cls: "badge-lead" },
    { label: "Verificado", value: "verified", cls: "badge-verified" },
    { label: "Bloqueado", value: "blocked", cls: "badge-blocked" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} cliente{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setShowNew(true)}
          className="gap-2"
          style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
        >
          <Plus className="w-4 h-4" />
          Novo cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou RG..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setStatus(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                status === f.value
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <User className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Desktop table */}
          <table className="w-full hidden md:table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  ID
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Cliente
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Localidade
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Atualização
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {clients.map((client, idx) => (
                <tr
                  key={client.id}
                  className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${
                    idx === clients.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    #{client.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{client.name}</p>
                        {client.cpf && (
                          <p className="text-xs text-muted-foreground">{client.cpf}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(client.city || client.state) ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {[client.city, client.state, client.country].filter(Boolean).join("/")}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(client.updatedAt).toLocaleDateString("pt-BR")}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${client.id}`}>
                      <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                        Ver <ChevronRight className="w-3 h-3" />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {clients.map((client) => (
              <Link key={client.id} href={`/clientes/${client.id}`}>
                <div className="p-4 flex items-center gap-3 hover:bg-accent/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[client.city, client.state].filter(Boolean).join("/") || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={client.status} />
                    <span className="text-xs text-muted-foreground">#{client.id}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showNew && (
        <NewClientDialog
          open={showNew}
          onClose={() => setShowNew(false)}
          onSuccess={() => {
            setShowNew(false);
            utils.clients.list.invalidate();
          }}
        />
      )}
    </div>
  );
}
