import { LayoutGrid, Grid3x3, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ViewMode } from "@/hooks/useViewMode";

// Q14: alternador reutilizável de modo de visualização (grade / compacto / lista).
// Ícones lucide, seleção única, sempre com um valor (não permite desmarcar).
const OPTIONS: { value: ViewMode; label: string; Icon: typeof LayoutGrid }[] = [
  { value: "grid", label: "Grade", Icon: LayoutGrid },
  { value: "compact", label: "Compacto", Icon: Grid3x3 },
  { value: "list", label: "Lista", Icon: List },
];

export function ViewModeToggle({
  value,
  onChange,
  className,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => { if (v) onChange(v as ViewMode); }}
      variant="outline"
      size="sm"
      className={className}
    >
      {OPTIONS.map(({ value: v, label, Icon }) => (
        <ToggleGroupItem key={v} value={v} aria-label={label} title={label} className="size-9 p-0">
          <Icon className="size-4" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
