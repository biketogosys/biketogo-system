/**
 * UnitStatusBadge — mapa canônico único de status de unidade de bike/acessório.
 *
 * Reutilizado por Bikes.tsx e Accessories.tsx.
 * Cores semânticas (emerald/amber/orange/slate/red) são intencionais:
 * status precisa de cor semântica própria, não tokenizada para primary.
 */

export type BikeUnitStatus = "disponivel" | "alugado" | "manutencao" | "perdido" | "roubado";

interface StatusConfig {
  label: string;
  cls: string;
}

export const UNIT_STATUS_LABELS: Record<BikeUnitStatus, string> = {
  disponivel: "Disponível",
  alugado: "Alugado",
  manutencao: "Em manutenção",
  perdido: "Perdido",
  roubado: "Roubado",
};

export const UNIT_STATUS_CONFIG: Record<BikeUnitStatus, StatusConfig> = {
  disponivel: {
    label: "Disponível",
    cls: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  },
  alugado: {
    label: "Alugado",
    cls: "bg-amber-500/20 text-amber-600 border-amber-500/30 dark:text-amber-400",
  },
  manutencao: {
    label: "Em manutenção",
    cls: "bg-orange-500/20 text-orange-600 border-orange-500/30 dark:text-orange-400",
  },
  perdido: {
    label: "Perdido",
    cls: "bg-slate-500/20 text-slate-500 border-slate-500/30 dark:text-slate-400",
  },
  roubado: {
    label: "Roubado",
    cls: "bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400",
  },
};

interface UnitStatusBadgeProps {
  status: BikeUnitStatus | string;
  className?: string;
}

export function UnitStatusBadge({ status, className = "" }: UnitStatusBadgeProps) {
  const config = UNIT_STATUS_CONFIG[status as BikeUnitStatus] ?? {
    label: status,
    cls: "bg-secondary text-secondary-foreground border-border",
  };

  return (
    <span
      className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${config.cls} ${className}`}
    >
      {config.label}
    </span>
  );
}
