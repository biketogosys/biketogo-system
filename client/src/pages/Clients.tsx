import { useState, useCallback, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { usePageParam } from "@/hooks/usePageParam";
import {
  Search, Plus, User, Trash2, RotateCcw, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { obfuscateCPF } from "@/hooks/useMask";
import { trpc } from "@/lib/trpc";
import { useConfirm } from "@/components/ConfirmDialog";
import { friendlyError } from "@/lib/utils";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { DataTable } from "@/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { ClientFormModal } from "@/components/ClientFormModal";

// ─── CPF Cell (LGPD — LOTE-3) ─────────────────────────────────────────────────────────────────────────────
function CpfCell({ cpf, className }: { cpf: string; className?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      <span>{visible ? cpf : obfuscateCPF(cpf)}</span>
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="text-muted-foreground hover:text-foreground p-0"
        aria-label={visible ? "Ocultar CPF" : "Mostrar CPF"}
      >
        {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
type Status = "lead" | "verified" | "blocked" | "recusado" | undefined;

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

// ─── Main Clients page ────────────────────────────────────────────────────────
export default function Clients() {
  const confirmDialog = useConfirm();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>(undefined);
  const [showNew, setShowNew] = useState(false);
  // Q13: paginação única na URL (?page). As views ativos/arquivados têm queries
  // exclusivas e a troca de view reseta para 1, então um só estado é equivalente.
  const [page, setPage] = usePageParam();
  const [view, setView] = useState<"ativos" | "arquivados">("ativos");
  const utils = trpc.useUtils();
  const limit = 20;

  const { data: settingsData } = trpc.settings.getAll.useQuery();
  const retentionDays = useMemo(() => {
    if (!settingsData) return 5;
    const map: Record<string, string> = {};
    (settingsData as any[]).forEach((s: any) => { map[s.key] = s.value; });
    return Math.max(3, Math.min(30, parseInt(map["archive_retention_days"] || "5") || 5));
  }, [settingsData]);

  const calcRetentionBadge = useCallback((deletedAt: string | Date | null | undefined): { label: string; cls: string } | null => {
    if (!deletedAt) return null;
    const archived = new Date(deletedAt);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - archived.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeft = retentionDays - daysSince;
    if (daysLeft < 0) return { label: "Expirado", cls: "bg-destructive/20 text-destructive border-destructive/40" };
    if (daysLeft <= 2) return { label: daysLeft === 0 ? "Expira hoje" : "Expira amanhã", cls: "bg-destructive/10 text-destructive border-destructive/30" };
    return { label: `${daysLeft} dias restantes`, cls: "bg-primary/10 text-primary border-primary/30" };
  }, [retentionDays]);

  const { data, isLoading } = trpc.clients.list.useQuery({
    search: search || undefined,
    status,
    page,
    limit,
  }, { enabled: view === "ativos" });

  const { data: archivedData, isLoading: archivedLoading } = trpc.clients.listArchived.useQuery({
    page,
    limit,
  }, { enabled: view === "arquivados" });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => { toast.success("Cliente arquivado."); utils.clients.list.invalidate(); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const restoreMutation = trpc.clients.restore.useMutation({
    onSuccess: () => {
      toast.success("Cliente restaurado com sucesso.");
      utils.clients.listArchived.invalidate();
      utils.clients.list.invalidate();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const clients = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const archivedClients = archivedData?.items ?? [];
  const archivedTotal = archivedData?.total ?? 0;
  const archivedTotalPages = archivedData?.totalPages ?? 1;

  // ─── Column definitions ──────────────────────────────────────────────────────
  type ClientRow = (typeof clients)[number];
  type ArchivedRow = (typeof archivedClients)[number];

  const activeColumns = useMemo<ColumnDef<ClientRow, unknown>[]>(() => [
    {
      id: "cliente",
      header: "Cliente",
      accessorFn: (r) => r.name,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-semibold text-primary">{c.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{c.name}</p>
              {c.cpf && <CpfCell cpf={c.cpf} className="text-[11px] text-muted-foreground" />}
            </div>
          </div>
        );
      },
    },
    {
      id: "localidade",
      header: "Localidade",
      accessorFn: (r) => [r.city, r.state].filter(Boolean).join("/") || "—",
      cell: ({ getValue }) => (
        <span className="text-[12px] text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "atualizacao",
      header: "Atualização",
      accessorKey: "updatedAt",
      cell: ({ row }) => (
        <span className="text-[12px] text-muted-foreground">
          {new Date(row.original.updatedAt).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      id: "acoes",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Link href={`/clientes/${c.id}`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">Ver</Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: `Arquivar ${c.name}?`,
                  description: "O cliente será movido para a lista de arquivados.",
                  confirmText: "Arquivar",
                  destructive: true,
                });
                if (ok) deleteMutation.mutate({ id: c.id });
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      },
    },
  ], [deleteMutation.isPending, confirmDialog]);

  const archivedColumns = useMemo<ColumnDef<ArchivedRow, unknown>[]>(() => [
    {
      id: "cliente",
      header: "Cliente",
      accessorFn: (r) => r.name,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground">{c.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{c.name}</p>
              {c.cpf && <CpfCell cpf={c.cpf} className="text-[11px] text-muted-foreground" />}
            </div>
          </div>
        );
      },
    },
    {
      id: "arquivadoEm",
      header: "Arquivado em",
      accessorKey: "deletedAt",
      cell: ({ row }) => {
        const c = row.original;
        const badge = calcRetentionBadge(c.deletedAt);
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {c.deletedAt ? new Date(c.deletedAt).toLocaleDateString("pt-BR") : "—"}
            </span>
            {badge && (
              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.cls}`}>
                {badge.label}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "acoes",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => restoreMutation.mutate({ id: row.original.id })}
          disabled={restoreMutation.isPending}
        >
          <RotateCcw className="w-3 h-3" /> Restaurar
        </Button>
      ),
    },
  ], [restoreMutation.isPending, calcRetentionBadge]);

  // ─── Tab options ─────────────────────────────────────────────────────────────
  const tabOptions = useMemo(() => [
    { value: "ativos", label: "Ativos", count: view === "ativos" ? total : undefined },
    { value: "arquivados", label: "Arquivados", count: view === "arquivados" ? archivedTotal : undefined },
  ], [view, total, archivedTotal]);

  const isLoadingCurrent = view === "arquivados" ? archivedLoading : isLoading;
  const currentData = view === "arquivados" ? archivedClients : clients;
  const currentTotalPages = view === "arquivados" ? archivedTotalPages : totalPages;
  const currentPage = page;
  const setCurrentPage = setPage;

  // Q13: corrige ?page fora do intervalo. Usa o totalPages CRU da query (undefined
  // durante o load) — nunca o default 1, senão o clamp resetaria a cada refetch.
  const loadedTotalPages = view === "arquivados" ? archivedData?.totalPages : data?.totalPages;
  useEffect(() => {
    if (loadedTotalPages && page > loadedTotalPages) setPage(loadedTotalPages);
  }, [loadedTotalPages, page, setPage]);

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} cliente{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Cliente
        </Button>
      </div>

      {/* Filtros — visíveis apenas na aba Ativos */}
      {view === "ativos" && (
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou RG..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={status ?? "todos"} onValueChange={(v) => { setStatus(v === "todos" ? undefined : v as Status); setPage(1); }}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="verified">Verificado</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
              <SelectItem value="recusado">Recusado</SelectItem>
            </SelectContent>
          </Select>
          {(search || status) && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setSearch(""); setStatus(undefined); }}>
              Limpar
            </Button>
          )}
        </div>
      )}

      {/* SegmentedTabs */}
      <SegmentedTabs
        value={view}
        onValueChange={(v) => { setView(v as typeof view); setPage(1); }}
        options={tabOptions}
      />

      {/* DataTable */}
      <DataTable
        columns={view === "arquivados" ? (archivedColumns as ColumnDef<unknown, unknown>[]) : (activeColumns as ColumnDef<unknown, unknown>[])}
        data={currentData as unknown[]}
        loading={isLoadingCurrent}
        pagination={{ page: currentPage, totalPages: currentTotalPages, onPageChange: setCurrentPage }}
        empty={
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <User className="h-10 w-10 opacity-30" />
            <p className="text-sm">
              {view === "arquivados" ? "Nenhum cliente arquivado." : "Nenhum cliente encontrado."}
            </p>
          </div>
        }
      />

      {showNew && (
        <ClientFormModal
          open
          onClose={() => setShowNew(false)}
          onSuccess={() => setShowNew(false)}
        />
      )}
    </div>
  );
}
