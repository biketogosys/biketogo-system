import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Q9 — estado vazio com CTA. Fonte única pras listas do admin.
 *
 * A distinção que importa (e que os "Nenhum X encontrado" secos não faziam):
 * lista vazia porque **ainda não existe nada** ≠ vazia porque **o filtro não
 * casou**. O primeiro caso pede "criar"; o segundo pede "limpar filtro" —
 * oferecer "criar" pra quem só digitou errado na busca é ruído.
 *
 * Uso típico numa DataTable:
 *   empty={<EmptyState icon={User} title="Nenhum cliente ainda" ... />}
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
}: {
  icon: LucideIcon;
  title: string;
  /** Uma linha explicando o que entra nesta lista (opcional) */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
      <Icon className="h-10 w-10 opacity-30" aria-hidden />
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-xs max-w-xs mx-auto leading-relaxed">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="gap-2">
          {ActionIcon && <ActionIcon className="h-4 w-4" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
