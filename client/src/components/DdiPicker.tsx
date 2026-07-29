// ─── Seletor de DDI do telefone (mundo inteiro, com busca) ───────────────────
// A lista tem ~200 países, então Select simples não serve: sem busca a Cassiana
// rolaria a lista inteira atrás do país do turista. Combobox da casa
// (Popover + Command), busca por nome do país OU pelo código (+351).
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { DDI_OPTIONS, ddiLabel } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";

export function DdiPicker({
  value,
  onChange,
  className,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const atual = ddiLabel(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`justify-between font-normal ${className ?? ""}`}
        >
          <span className="truncate">
            {atual ? `${atual.flag} ${atual.code}` : value || "DDI"}
          </span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            // itemValue = "Portugal +351": casa por país ou por código, e
            // ignora o "+" pra quem digita só os números.
            const alvo = itemValue.toLowerCase();
            const q = search.toLowerCase().replace(/^\+/, "");
            return alvo.includes(q) || alvo.replace(/\+/g, "").includes(q) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar país ou código..." />
          <CommandList>
            <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
            <CommandGroup>
              {DDI_OPTIONS.map((o) => (
                <CommandItem
                  key={`${o.name}-${o.code}`}
                  value={`${o.name} ${o.code}`}
                  onSelect={() => { onChange(o.code); setOpen(false); }}
                >
                  <span className="mr-2">{o.flag}</span>
                  <span className="flex-1 truncate">{o.name}</span>
                  <span className="text-muted-foreground tabular-nums">{o.code}</span>
                  {value === o.code && <Check className="ml-2 h-4 w-4 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
