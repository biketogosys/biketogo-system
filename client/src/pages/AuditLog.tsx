import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Shield, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACOES = [
  "arquivou_cliente",
  "restaurou_cliente",
  "arquivou_aluguel",
  "restaurou_aluguel",
  "encerrou_contrato",
  "arquivou_contrato",
  "atualizou_bike",
  "confirmou_reserva",
];

const TABELAS = ["clients", "rentals", "contracts", "bikes"];

function formatAcao(acao: string) {
  return acao
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTabela(tabela: string) {
  const map: Record<string, string> = {
    clients: "Clientes",
    rentals: "Aluguéis",
    contracts: "Contratos",
    bikes: "Bicicletas",
  };
  return map[tabela] ?? tabela;
}

function badgeColor(acao: string) {
  if (acao.includes("restaurou")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  if (acao.includes("arquivou")) return "bg-red-500/15 text-red-400 border-red-500/20";
  if (acao.includes("encerrou")) return "bg-amber-500/15 text-amber-400 border-amber-500/20";
  return "bg-sky-500/15 text-sky-400 border-sky-500/20";
}

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [acao, setAcao] = useState<string>("");
  const [tabela, setTabela] = useState<string>("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const { data, isLoading } = trpc.auditLogs.list.useQuery({
    page,
    limit: 25,
    acao: acao || undefined,
    tabela: tabela || undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function resetFilters() {
    setAcao("");
    setTabela("");
    setDataInicio("");
    setDataFim("");
    setPage(1);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Auditoria
          </h1>
          <p className="text-xs text-muted-foreground">
            Registro de todas as ações administrativas
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            value={acao || "all"}
            onValueChange={(v) => { setAcao(v === "all" ? "" : v); setPage(1); }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {ACOES.map((a) => (
                <SelectItem key={a} value={a}>{formatAcao(a)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={tabela || "all"}
            onValueChange={(v) => { setTabela(v === "all" ? "" : v); setPage(1); }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Tabela" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tabelas</SelectItem>
              {TABELAS.map((t) => (
                <SelectItem key={t} value={t}>{formatTabela(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              className="h-9 text-sm pl-8"
              value={dataInicio}
              onChange={(e) => { setDataInicio(e.target.value); setPage(1); }}
              placeholder="Data início"
            />
          </div>

          <div className="flex gap-2">
            <Input
              type="date"
              className="h-9 text-sm flex-1"
              value={dataFim}
              onChange={(e) => { setDataFim(e.target.value); setPage(1); }}
              placeholder="Data fim"
            />
            {(acao || tabela || dataInicio || dataFim) && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="h-9 px-3 text-xs">
                Limpar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-mobile-cards bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Shield className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data/Hora</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ação</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tabela</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registro ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                      <td data-label="Data/Hora" className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(log.criadoEm).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td data-label="Ação" className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${badgeColor(log.acao)}`}>
                          {formatAcao(log.acao)}
                        </span>
                      </td>
                      <td data-label="Tabela" className="px-4 py-3 text-foreground">{formatTabela(log.tabela)}</td>
                      <td data-label="Registro ID" className="px-4 py-3 text-muted-foreground">{log.registroId ?? "—"}</td>
                      <td data-label="Admin ID" className="px-4 py-3 text-muted-foreground">{log.adminId ?? "—"}</td>
                      <td data-label="IP" className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.ip ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {total} registro(s) — Página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 px-3"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 px-3"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
