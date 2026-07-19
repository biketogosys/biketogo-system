// ─── Busca global Ctrl+K (Q1) ────────────────────────────────────────────────
// Botão no SiteHeader + CommandDialog com atalho Ctrl/Cmd+K. Busca server-side
// (dashboard.search, debounce de 250ms) em clientes/contratos/bikes; com o
// campo vazio vira paleta de navegação. Filtro client-side do cmdk desligado
// (shouldFilter=false) — quem filtra é o servidor.
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Bike, CalendarDays, DollarSign, FileText, LayoutDashboard,
  Search, Settings, Shield, User, Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: CalendarDays, label: "Agenda", path: "/agenda" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: Bike, label: "Bicicletas", path: "/bicicletas" },
  { icon: FileText, label: "Contratos", path: "/contratos" },
  { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
  { icon: Shield, label: "Auditoria", path: "/auditoria" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

const CLIENT_STATUS: Record<string, string> = {
  lead: "Lead", verified: "Verificado", blocked: "Bloqueado",
};
const CONTRACT_STATUS: Record<string, string> = {
  pendente: "Pendente", ativo: "Ativo", parcialmente_devolvido: "Parcial",
  encerrado: "Encerrado", cancelado: "Cancelado",
};

function useDebounced(value: string, ms: number): string {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [, navigate] = useLocation();
  const debounced = useDebounced(q, 250);

  // Ctrl+K / Cmd+K abre e fecha
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const searching = debounced.trim().length >= 2;
  const { data, isFetching } = trpc.dashboard.search.useQuery(
    { q: debounced },
    { enabled: open && searching, placeholderData: (prev) => prev },
  );

  const navFiltered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return NAV;
    return NAV.filter((n) => n.label.toLowerCase().includes(term));
  }, [q]);

  function go(path: string) {
    setOpen(false);
    setQ("");
    navigate(path);
  }

  const hasResults =
    (data?.clients.length ?? 0) + (data?.bikes.length ?? 0) + (data?.contracts.length ?? 0) > 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-auto flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
        aria-label="Buscar (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Buscar</span>
        <kbd className="pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setQ(""); }}
        title="Busca global"
        description="Busque clientes, contratos e bicicletas ou navegue pelo sistema"
        commandProps={{ shouldFilter: false }}
      >
        <CommandInput
          placeholder="Cliente, CPF, contrato, bike…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          {searching && !isFetching && !hasResults && navFiltered.length === 0 && (
            <CommandEmpty>Nada encontrado.</CommandEmpty>
          )}

          {searching && (data?.clients.length ?? 0) > 0 && (
            <CommandGroup heading="Clientes">
              {data!.clients.map((c) => (
                <CommandItem key={`c-${c.id}`} value={`cliente-${c.id}`} onSelect={() => go(`/clientes/${c.id}`)}>
                  <User />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {c.cpf ? `${c.cpf} · ` : ""}{CLIENT_STATUS[c.status] ?? c.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {searching && (data?.contracts.length ?? 0) > 0 && (
            <CommandGroup heading="Contratos">
              {data!.contracts.map((c) => (
                <CommandItem key={`ct-${c.id}`} value={`contrato-${c.id}`} onSelect={() => go("/contratos")}>
                  <FileText />
                  <span className="truncate">Contrato #{c.id} — {c.clientName}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {CONTRACT_STATUS[c.status] ?? c.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {searching && (data?.bikes.length ?? 0) > 0 && (
            <CommandGroup heading="Bicicletas">
              {data!.bikes.map((b) => (
                <CommandItem key={`b-${b.id}`} value={`bike-${b.id}`} onSelect={() => go("/bicicletas")}>
                  <Bike />
                  <span className="truncate">{b.model}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {b.brand ? `${b.brand} · ` : ""}#{b.serialNumber}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {searching && hasResults && navFiltered.length > 0 && <CommandSeparator />}

          {navFiltered.length > 0 && (
            <CommandGroup heading="Ir para">
              {navFiltered.map((n) => (
                <CommandItem key={n.path} value={`nav-${n.path}`} onSelect={() => go(n.path)}>
                  <n.icon />
                  <span>{n.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
