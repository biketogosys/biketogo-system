// Extraído de Contracts.tsx (Tarefa 40 fix) para quebrar import circular
// entre Rentals.tsx e Contracts.tsx.
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Package,
  Plus,
  Search,
  X,
  Check,
  Trash2,
  Pencil,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { friendlyError } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// "YYYY-MM-DD" → "DD/MM/YYYY" (exibição no carrinho/resumo do contrato).
function fmtDateBr(d?: string): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}/${y}` : d;
}

// Rótulos amigáveis das categorias do catálogo (valor cru no banco → exibição).
// Chave desconhecida cai no próprio valor (ver uso). Ajustar se surgirem novas.
const CATEGORY_LABELS: Record<string, string> = {
  mtb: "Mountain Bike",
  speed: "Speed / Road",
  gravel: "Gravel",
  urbana: "Urbana",
};

// Formas de pagamento (valor do enum no banco → rótulo). Alinhado ao
// paymentMethodEnum do schema (pix/credit_card/debit_card/cash/other).
// Exportado: a seleção acontece no CONFIRMAR PAGAMENTO (devolução da bike),
// não na criação do contrato — pedido da Cassiana 2026-07-22.
export const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "other", label: "Outro" },
];

// ─── Types ──────────────────────────────────────────────────────────────────────────────────
type BikeEntry = {
  rentalId?: number;      // present for existing rentals in ativo/parcial edit mode
  locked?: boolean;       // true for returned rentals — cannot be edited or removed
  bikeId: number;
  bikeModel: string;
  bikeBrand: string;
  bikeSizeId: number | null;
  tamanho: string;
  startDate: string;
  endDate: string;
  quantity: number;
  dailyRate: string;
  numDays: number;
  totalAmount: string;
  discountPercent?: number;   // desconto progressivo aplicado (exibição + auditoria)
  unitIds: number[];          // BU-PICK-FRONT: IDs das unidades físicas escolhidas
  unitNumeros?: string[];     // só para exibir no cart
};

// ─── VerifiedClientAutocomplete ───────────────────────────────────────────────
function VerifiedClientAutocomplete({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string, name: string, status: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = trpc.clients.list.useQuery(
    { search: inputValue, limit: 10, page: 1 },
    { enabled: open || inputValue.length > 0 }
  );
  const clients = data?.items ?? [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Cliques em BARRA DE ROLAGEM disparam mousedown mas não devem fechar a
      // lista. O corpo do modal (altura fixa + overflow-y-auto) tem barra própria:
      // rolar o formulário fechava o autocomplete. Ignora 3 casos de scrollbar:
      const root = document.documentElement;
      // 1) barra da janela (clique além da largura/altura útil do documento)
      if (e.clientX > root.clientWidth || e.clientY > root.clientHeight) return;
      // 2/3) barra de um elemento rolável (clique cai no "gutter", além do client*)
      if (
        (target.scrollHeight > target.clientHeight && e.offsetX > target.clientWidth) ||
        (target.scrollWidth > target.clientWidth && e.offsetY > target.clientHeight)
      ) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(id: number, name: string, status: string) {
    onChange(String(id), name, status);
    setSelectedName(name);
    setInputValue("");
    setOpen(false);
  }

  function handleClear() {
    setInputValue(""); setSelectedName(""); onChange("", "", ""); setOpen(false);
  }

  const displayValue = selectedName || inputValue;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Digite o nome ou CPF do cliente..."
          value={displayValue}
          onChange={(e) => { setInputValue(e.target.value); setSelectedName(""); onChange("", "", ""); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-8 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        />
        {displayValue && (
          <button type="button" onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && (inputValue.length > 0 || clients.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {clients.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">{inputValue ? "Nenhum cliente encontrado" : "Digite para buscar..."}</div>
          ) : (
            clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c.id, c.name, c.status)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                    {c.status !== "verified" && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md border bg-amber-500/20 text-amber-600 border-amber-500/30 dark:text-amber-400">Não verificado</span>
                    )}
                    {c.status === "verified" && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md border bg-emerald-500/20 text-emerald-600 border-emerald-500/30 dark:text-emerald-400">Verificado</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.cpf && `CPF: ${c.cpf}`}{c.cpf && c.phone && " · "}{c.phone && c.phone}
                  </div>
                </div>
                {value === String(c.id) && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── NewContractModal ─────────────────────────────────────────────────────────
type EditPrefill = {
  contractId: number;
  contractStatus: string; // "pendente" | "ativo" | "parcialmente_devolvido"
  clientId: number;
  clientName: string;
  bikes: BikeEntry[];
  accessories: Array<{ accessoryId: number; variante: string | null; qty: number }>;
};

/**
 * Q8 — duplicar contrato. É CRIAÇÃO (não tem contractId): copia cliente, bikes
 * e acessórios de um contrato existente para um período NOVO.
 * ⚠️ Não copia `unitIds` de propósito: disponibilidade é POR DATA, então a
 * unidade física do contrato original pode estar ocupada no período novo. Vão
 * vazias e o servidor auto-atribui (ou o usuário escolhe no lápis do carrinho).
 */
type DuplicatePrefill = {
  contractId: number;
  clientId: number;
  clientName: string;
  bikes: Array<{
    bikeId: number;
    bikeModel: string;
    bikeBrand: string;
    bikeSizeId: number | null;
    tamanho: string;
    quantity: number;
    dailyRate: string;
  }>;
  accessories: Array<{ accessoryId: number; variante: string | null; qty: number }>;
};

export function NewContractModal({
  open,
  onClose,
  editPrefill,
  duplicateFrom,
  initialClient,
  initialStartDate,
}: {
  open: boolean;
  onClose: () => void;
  editPrefill?: EditPrefill;
  /** Q8: pré-carrega um contrato existente em período novo (modo criação) */
  duplicateFrom?: DuplicatePrefill;
  initialClient?: { clientId: number; clientName: string };
  /** Data de início pré-preenchida (F1.1: clique num dia da agenda) */
  initialStartDate?: string;
}) {
  const isEditMode = !!editPrefill;
  const utils = trpc.useUtils();
  const [step, setStep] = useState(1);
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientStatus, setClientStatus] = useState("verified"); // prefill always verified
  const [bikeEntries, setBikeEntries] = useState<BikeEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [accSelections, setAccSelections] = useState<Record<number, Record<string, number>>>({});
  const [prefillSelections, setPrefillSelections] = useState<Record<number, Record<string, number>>>({});

  // Prefill state when edit mode opens
  useEffect(() => {
    if (open && isEditMode && editPrefill) {
      setClientId(String(editPrefill.clientId));
      setClientName(editPrefill.clientName);
      setClientStatus("verified");
      setBikeEntries(editPrefill.bikes);
      // Convert accessories list to accSelections
      const sel: Record<number, Record<string, number>> = {};
      for (const l of editPrefill.accessories) {
        const k = l.variante ?? "__sem__";
        (sel[l.accessoryId] ??= {})[k] = (sel[l.accessoryId]?.[k] ?? 0) + l.qty;
      }
      setAccSelections(sel);
      setPrefillSelections(sel);
      setStep(1);
    } else if (open && !isEditMode && initialClient) {
      setClientId(String(initialClient.clientId));
      setClientName(initialClient.clientName);
      setClientStatus("verified");
      setStep(2);
    }
  }, [open, isEditMode]);

  // ─── Q8 — DUPLICAÇÃO ────────────────────────────────────────────────────────
  // O período novo é escolhido no PASSO 1 (que no modo duplicar substitui a
  // seleção de cliente — o cliente já vem do contrato original).
  // ⚠️ Um dialog SÓ, de propósito: um Dialog de período separado ficava montado
  // junto com este e os dois Radix brigavam — o antigo travava visível
  // (data-state=closed com opacity 1) e o novo entrava com opacity 0.
  const isDuplicateMode = !!duplicateFrom && !isEditMode;
  const [dupStart, setDupStart] = useState("");
  const [dupEnd, setDupEnd] = useState("");

  const { data: dupRules } = trpc.bikes.discountRulesBatch.useQuery(
    { bikeIds: Array.from(new Set((duplicateFrom?.bikes ?? []).map((b) => b.bikeId))) },
    { enabled: open && isDuplicateMode },
  );

  useEffect(() => {
    if (!(open && isDuplicateMode && duplicateFrom)) return;
    setClientId(String(duplicateFrom.clientId));
    setClientName(duplicateFrom.clientName);
    setClientStatus("verified");
    const sel: Record<number, Record<string, number>> = {};
    for (const l of duplicateFrom.accessories) {
      const k = l.variante ?? "__sem__";
      (sel[l.accessoryId] ??= {})[k] = (sel[l.accessoryId]?.[k] ?? 0) + l.qty;
    }
    setAccSelections(sel);
    setStep(1);
  }, [open, isDuplicateMode]);

  /** Monta o carrinho com as bikes do original no período escolhido (passo 1→2). */
  function applyDuplicateBikes() {
    if (!duplicateFrom) return;
    setBikeEntries(
      duplicateFrom.bikes.map((b) => {
        const base = {
          ...b,
          startDate: dupStart,
          endDate: dupEnd,
          unitIds: [] as number[], // por data: o servidor auto-atribui no período novo
        };
        const { numDays, totalAmount, discountPercent } = calcTotal(base, (dupRules?.[b.bikeId] ?? []) as any);
        return { ...base, numDays, totalAmount, discountPercent };
      }),
    );
    // Deixa o período também nos campos de seleção (adicionar outra bike já vem
    // com as mesmas datas, que é o esperado).
    setSelStartDate(dupStart);
    setSelEndDate(dupEnd);
  }

  // Bike selection state
  const [selCategory, setSelCategory] = useState("all");
  const [selBikeId, setSelBikeId] = useState("");
  const [selBikeSizeId, setSelBikeSizeId] = useState("");
  const [selStartDate, setSelStartDate] = useState(initialStartDate ?? "");
  const [selEndDate, setSelEndDate] = useState("");
  const [selQty, setSelQty] = useState(1);
  // BU-PICK-FRONT: unidades físicas selecionadas
  const [selUnitIds, setSelUnitIds] = useState<number[]>([]);

  const { data: bikesData } = trpc.bikes.list.useQuery(
    { page: 1, limit: 100 },
    { enabled: open && step === 2 }
  );
  const allBikes = bikesData?.data ?? [];
  // Filtro de categoria: só aparece se o catálogo tiver categorias preenchidas.
  const categories = Array.from(
    new Set(allBikes.map((b: any) => b.category).filter(Boolean) as string[])
  ).sort();
  const bikes = selCategory === "all"
    ? allBikes
    : allBikes.filter((b: any) => b.category === selCategory);

  // Datas primeiro: o breakdown dos tamanhos é calculado PARA O PERÍODO escolhido
  // (e, na edição, sem contar os aluguéis do próprio contrato).
  const { data: sizesData } = trpc.bikes.listSizes.useQuery(
    {
      bikeId: Number(selBikeId),
      startDate: selStartDate || undefined,
      endDate: selEndDate || undefined,
      excludeContractId: isEditMode && editPrefill ? editPrefill.contractId : undefined,
    },
    { enabled: !!selBikeId && step === 2 }
  );
  const sizes = sizesData ?? [];

  // Descontos progressivos da bike selecionada (bug Cassiana 2026-07-22: as
  // regras existiam no cadastro mas NÃO entravam no valor do contrato).
  const { data: discountRules = [] } = trpc.bikes.discountRules.useQuery(
    { bikeId: Number(selBikeId) },
    { enabled: !!selBikeId && step === 2 }
  );

  // BU-PICK-FRONT: buscar unidades disponíveis quando tamanho + datas estiverem preenchidos.
  // Em modo edição, exclui o PRÓPRIO contrato — senão os aluguéis dele bloqueiam
  // suas unidades e "a bike some" ao tentar alterar (bug Cassiana 2026-07-22).
  const { data: availUnits = [] } = trpc.bikeUnits.available.useQuery(
    {
      bikeSizeId: Number(selBikeSizeId), startDate: selStartDate, endDate: selEndDate,
      excludeContractId: isEditMode && editPrefill ? editPrefill.contractId : undefined,
    },
    { enabled: !!(selBikeSizeId && selStartDate && selEndDate) }
  );
  // Unidades que JÁ estão no carrinho em período sobreposto não podem ser
  // oferecidas de novo (guarda anti-duplicação — bug da edição, 2026-07-22).
  const cartBlockedUnitIds = new Set(
    bikeEntries
      .filter((e) => selStartDate && selEndDate && e.startDate <= selEndDate && selStartDate <= e.endDate)
      .flatMap((e) => e.unitIds ?? []),
  );
  const pickableUnits = (availUnits as any[]).filter((u) => !cartBlockedUnitIds.has(u.id));

  // "Editar" do carrinho recarrega os campos com unidades já escolhidas —
  // este flag impede o reset abaixo de apagá-las nesse único ciclo.
  const skipUnitResetRef = useRef(false);

  // BU-PICK-FRONT-FIX: zerar seleção ao trocar tamanho/datas para evitar unitIds do tamanho anterior
  useEffect(() => {
    if (skipUnitResetRef.current) { skipUnitResetRef.current = false; return; }
    setSelUnitIds([]);
    prevAvailRef.current = [];
  }, [selBikeSizeId, selStartDate, selEndDate]);

  // Pré-marcar o primeiro ao carregar (sugestão) — só entre as ainda selecionáveis
  const prevAvailRef = useRef<typeof availUnits>([]);
  useEffect(() => {
    const prev = prevAvailRef.current;
    if (pickableUnits.length > 0 && prev.length === 0 && selUnitIds.length === 0) {
      setSelUnitIds([pickableUnits[0].id]);
    }
    if (pickableUnits.length === 0 && prev.length > 0) {
      setSelUnitIds([]);
    }
    prevAvailRef.current = pickableUnits as typeof availUnits;
  }, [pickableUnits.length, availUnits]);

  const { data: accData } = trpc.accessories.list.useQuery(
    { page: 1, limit: 100 },
    { enabled: open && step === 3 }
  );
  const accList = accData?.data ?? [];

  // availability query for step 3 — POR PERÍODO do contrato (span das bikes no
  // carrinho). Sem período a query cai no estoque "de agora" (fallback).
  const accIds = (accData?.data ?? []).map((a: any) => a.id);
  const accPeriod = (() => {
    const starts = bikeEntries.map((b) => b.startDate).filter(Boolean).sort();
    const ends = bikeEntries.map((b) => b.endDate).filter(Boolean).sort();
    return { startDate: starts[0], endDate: (ends.length ? ends : starts).slice(-1)[0] };
  })();
  const { data: availData } = trpc.accessories.availability.useQuery(
    {
      accessoryIds: accIds,
      startDate: accPeriod.startDate,
      endDate: accPeriod.endDate,
      // na edição, o próprio contrato não pode bloquear suas unidades
      excludeContractId: isEditMode && editPrefill ? editPrefill.contractId : undefined,
    },
    { enabled: step === 3 && accIds.length > 0 && !!accPeriod.startDate && !!accPeriod.endDate }
  );

  /**
   * Q8 — clamp dos acessórios copiados ao disponível NO PERÍODO.
   * Rede de segurança: com a disponibilidade de acessório agora POR DATA
   * (2026-07-23), o capacete do contrato original volta a estar livre no período
   * novo — então no caso comum este clamp NÃO corta nada. Ainda vale quando a
   * qtd copiada excede o estoque real do período (ex.: outro contrato pegou a
   * unidade no meio). Corta e avisa antes do resumo, em vez de estourar no save.
   */
  const dupAccClampedRef = useRef(false);
  useEffect(() => {
    if (!(isDuplicateMode && step === 3 && availData)) return;
    if (dupAccClampedRef.current) return;
    dupAccClampedRef.current = true;

    // Calculado FORA do updater de propósito: o updater do setState roda depois,
    // então preencher a lista de cortes lá dentro deixava o aviso sempre vazio.
    const cortes: string[] = [];
    const next: Record<number, Record<string, number>> = {};
    for (const [idStr, byKey] of Object.entries(accSelections)) {
      const accId = Number(idStr);
      const av = (availData as any[]).find((a) => a.accessoryId === accId);
      const nome = (accData?.data ?? []).find((a: any) => a.id === accId)?.name ?? `#${accId}`;
      for (const [key, qty] of Object.entries(byKey)) {
        const variante = key === "__sem__" ? null : key;
        const disp = (av?.variantes ?? []).find((v: any) => (v.variante ?? null) === variante)?.disponivel ?? 0;
        const usado = Math.min(qty, disp);
        if (usado < qty) cortes.push(`${nome}${variante ? ` (${variante})` : ""}: ${qty}→${usado}`);
        if (usado > 0) (next[accId] ??= {})[key] = usado;
      }
    }
    if (cortes.length === 0) return;
    setAccSelections(next);
    toast.warning(`Estoque insuficiente, ajustei: ${cortes.join(" · ")}. Escolha outra variante se precisar.`, {
      duration: 10000,
    });
  }, [isDuplicateMode, step, availData, accData]);

  const selectedBike = bikes.find((b) => b.id === Number(selBikeId));

  function calcTotal(
    entry: Omit<BikeEntry, "totalAmount" | "numDays">,
    rules: Array<{ minDays: number; discountPercent: string }> = [],
  ): { numDays: number; totalAmount: string; discountPercent?: number } {
    if (!entry.startDate || !entry.endDate) return { numDays: 0, totalAmount: "0.00" };
    const start = new Date(entry.startDate);
    const end = new Date(entry.endDate);
    const numDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const rate = parseFloat(entry.dailyRate || "0");
    const base = rate * numDays * entry.quantity;
    // Desconto progressivo: vale a regra de MAIOR minDays que o período atingir
    const rule = rules
      .filter((r) => numDays >= r.minDays)
      .sort((a, b) => b.minDays - a.minDays)[0];
    const pct = rule ? parseFloat(String(rule.discountPercent)) : 0;
    const totalAmount = (base * (1 - (isNaN(pct) ? 0 : pct) / 100)).toFixed(2);
    return { numDays, totalAmount, discountPercent: pct > 0 ? pct : undefined };
  }

  function handleAddBike() {
    if (!selBikeId || !selStartDate || !selEndDate) {
      toast.error("Selecione a bike, data de início e data de devolução.");
      return;
    }
    // BU-PICK-FRONT: exigir ao menos 1 unidade quando tamanho selecionado
    if (selBikeSizeId && selUnitIds.length === 0) {
      toast.error("Selecione ao menos uma unidade.");
      return;
    }
    // Guarda anti-duplicação (bug Cassiana 2026-07-22): a mesma unidade não pode
    // entrar duas vezes no contrato com períodos sobrepostos.
    const fmtBr = (d: string) => d.split("-").reverse().join("/");
    const overlapEntry = (e: BikeEntry) => e.startDate <= selEndDate && selStartDate <= e.endDate;
    const unitConflict = bikeEntries.find(
      (e) => overlapEntry(e) && (e.unitIds ?? []).some((u) => selUnitIds.includes(u)),
    );
    if (unitConflict) {
      const nums = (unitConflict.unitNumeros ?? []).join(", ") || "esta unidade";
      toast.error(`${nums} já está neste contrato de ${fmtBr(unitConflict.startDate)} a ${fmtBr(unitConflict.endDate)}. Edite a entrada existente ou escolha outro período.`);
      return;
    }
    // Modo quantidade (sem tamanho): mesma bike com período sobreposto = duplicada
    if (!selBikeSizeId) {
      const dup = bikeEntries.find((e) => e.bikeId === Number(selBikeId) && overlapEntry(e));
      if (dup) {
        toast.error(`Esta bike já está no contrato de ${fmtBr(dup.startDate)} a ${fmtBr(dup.endDate)}. Edite a entrada existente em vez de adicionar de novo.`);
        return;
      }
    }
    const bike = bikes.find((b) => b.id === Number(selBikeId));
    const size = sizes.find((s) => s.id === Number(selBikeSizeId));
    const chosenNumeros = (availUnits as any[]).filter((u) => selUnitIds.includes(u.id)).map((u) => u.numeroSistema);
    const entry: Omit<BikeEntry, "totalAmount" | "numDays"> = {
      bikeId: Number(selBikeId),
      bikeModel: bike?.model ?? "",
      bikeBrand: bike?.brand ?? "",
      bikeSizeId: selBikeSizeId ? Number(selBikeSizeId) : null,
      tamanho: size?.tamanho ?? "",
      startDate: selStartDate,
      endDate: selEndDate,
      quantity: selBikeSizeId ? selUnitIds.length : selQty,
      dailyRate: bike?.dailyRate ?? "0",
      unitIds: selBikeSizeId ? selUnitIds : [],
      unitNumeros: chosenNumeros.length > 0 ? chosenNumeros : undefined,
    };
    const { numDays, totalAmount, discountPercent } = calcTotal(entry, discountRules as any[]);
    setBikeEntries((prev) => [...prev, { ...entry, numDays, totalAmount, discountPercent }]);
    setSelBikeId(""); setSelBikeSizeId(""); setSelStartDate(""); setSelEndDate(""); setSelQty(1); setSelUnitIds([]);
  }

  function handleRemoveBike(idx: number) {
    setBikeEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  // Editar bike do carrinho: devolve a entrada para os campos do formulário
  // (datas, bike, tamanho, unidades) e a remove do carrinho — ajustou, re-adiciona.
  // Antes o único caminho era "remover e adicionar de novo", que ninguém descobre
  // sozinho — a Cassiana caiu no loop de duplicar (2026-07-22).
  function handleEditEntry(idx: number) {
    const b = bikeEntries[idx];
    if (!b || b.locked) return;
    skipUnitResetRef.current = true; // preservar as unidades da entrada no reset
    setSelCategory("all");
    setSelBikeId(String(b.bikeId));
    setSelBikeSizeId(b.bikeSizeId ? String(b.bikeSizeId) : "");
    setSelStartDate(b.startDate);
    setSelEndDate(b.endDate);
    setSelQty(b.quantity);
    setSelUnitIds(b.unitIds ?? []);
    setBikeEntries((prev) => prev.filter((_, i) => i !== idx));
    toast.info("Bike carregada nos campos — ajuste e clique em \"Adicionar bike ao contrato\".");
  }

  const grandTotal = bikeEntries.reduce((s, b) => s + parseFloat(b.totalAmount), 0);

  const createMutation = trpc.contracts.createManual.useMutation({
    onSuccess: (res) => {
      toast.success(`Contrato #${res.id} criado com sucesso!`);
      utils.contracts.list.invalidate();
      handleReset();
      onClose();
    },
    onError: (e) => toast.error(friendlyError(e, "Erro ao criar contrato.")),
  });

  const updateMutation = trpc.contracts.update.useMutation({
    onSuccess: (res) => {
      toast.success(`Contrato #${res.id} atualizado!`);
      utils.contracts.getById.invalidate({ id: res.id });
      utils.contracts.list.invalidate();
      handleReset();
      onClose();
    },
    onError: (e) => toast.error(friendlyError(e, "Erro ao atualizar contrato.")),
  });

  function handleReset() {
    setStep(1); setClientId(""); setClientName(""); setClientStatus("");
    setBikeEntries([]); setAccSelections({}); setPrefillSelections({}); setNotes("");
    setDupStart(""); setDupEnd(""); dupAccClampedRef.current = false;
    setSelCategory("all");
    setSelBikeId(""); setSelBikeSizeId(""); setSelStartDate(""); setSelEndDate(""); setSelQty(1);
  }

  const isAtivoParcial = isEditMode && editPrefill && editPrefill.contractStatus !== "pendente";

  function handleSubmit() {
    if (!clientId) { toast.error("Selecione um cliente."); return; }
    // For ativo/parcial, non-locked entries must be at least 1
    const editableBikes = bikeEntries.filter(b => !b.locked);
    if (editableBikes.length === 0 && !bikeEntries.some(b => b.locked)) {
      toast.error("Adicione pelo menos uma bike."); return;
    }
    const bikePayload = bikeEntries.map((b) => ({
      rentalId: b.rentalId,
      bikeId: b.bikeId,
      bikeSizeId: b.bikeSizeId,
      startDate: b.startDate,
      endDate: b.endDate,
      quantity: b.quantity,
      dailyRate: b.dailyRate,
      totalAmount: b.totalAmount,
      discountPercent: b.discountPercent != null ? String(b.discountPercent) : undefined,
      unitIds: b.unitIds?.length ? b.unitIds : undefined, // BU-PICK-FRONT
    }));
    const accPayload: Array<{accessoryId:number;variante?:string;qty:number}> = [];
    for (const [idStr, byKey] of Object.entries(accSelections))
      for (const [key, qty] of Object.entries(byKey))
        if (qty > 0) accPayload.push({ accessoryId: Number(idStr), variante: key === "__sem__" ? undefined : key, qty });
    if (isEditMode && editPrefill) {
      updateMutation.mutate({
        id: editPrefill.contractId,
        clientId: Number(clientId),
        bikes: bikePayload,
        accessories: accPayload,
      });
    } else {
      createMutation.mutate({
        clientId: Number(clientId),
        bikes: bikePayload,
        accessories: accPayload,
        notes: notes || undefined,
      });
    }
  }

  // No modo duplicar o passo 1 é o PERÍODO (o cliente vem do contrato original)
  const stepLabels = [isDuplicateMode ? "Período" : "Cliente", "Bikes", "Acessórios", "Resumo"];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { handleReset(); onClose(); } }}>
      <DialogContent className="dialog-mobile dialog-steps sm:max-w-2xl p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" />
            {isEditMode
              ? `Editar Contrato #${editPrefill?.contractId}`
              : isDuplicateMode
                ? "Duplicar Contrato"
                : "Novo Contrato Manual"}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-5 pt-4 shrink-0">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                step > i + 1 ? "bg-emerald-500 text-white" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {step > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs truncate ${step === i + 1 ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
              {i < stepLabels.length - 1 && <div className={`h-px flex-1 mx-1 ${step > i + 1 ? "bg-emerald-500" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Step 1 (modo duplicar): período novo — o cliente já vem do original */}
        {step === 1 && isDuplicateMode && duplicateFrom && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-md border bg-sky-500/10 border-sky-500/30 text-xs text-sky-700 dark:text-sky-400">
              <Copy className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Cópia do contrato <strong>#{duplicateFrom.contractId}</strong> de{" "}
                <strong>{duplicateFrom.clientName}</strong>: {duplicateFrom.bikes.length} bike(s)
                {duplicateFrom.accessories.length > 0 && ` e ${duplicateFrom.accessories.length} acessório(s)`}.
                As unidades físicas serão reatribuídas no período novo.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs">Data início</Label>
                <Input type="date" value={dupStart} onChange={(e) => setDupStart(e.target.value)} className="text-sm" />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Data devolução</Label>
                <Input type="date" value={dupEnd} onChange={(e) => setDupEnd(e.target.value)} min={dupStart} className="text-sm" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A disponibilidade é conferida nas datas escolhidas — se alguma bike estiver ocupada no período, o próximo passo avisa.
            </p>
            <div className="rounded-md border bg-muted/40 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Será copiado</p>
              {duplicateFrom.bikes.map((b, i) => (
                <p key={i} className="text-sm">
                  {b.bikeModel}
                  {b.tamanho && <span className="text-xs text-muted-foreground"> ({b.tamanho})</span>}
                  <span className="text-xs text-muted-foreground"> · {b.quantity}x</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Select client */}
        {step === 1 && !isDuplicateMode && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Buscar cliente</Label>
              <VerifiedClientAutocomplete
                value={clientId}
                onChange={(id, name, status) => { setClientId(id); setClientName(name); setClientStatus(status); }}
              />
            </div>
            {clientId && clientStatus !== "verified" && (
              <div className="flex items-center gap-2 p-3 rounded-md border bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Este cliente ainda não foi verificado. Apenas clientes verificados podem ter contratos criados manualmente.
              </div>
            )}
            {clientId && clientStatus === "verified" && (
              <div className="flex items-center gap-2 p-3 rounded-md border bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span><strong>{clientName}</strong> selecionado(a).</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Add bikes — DATAS PRIMEIRO (2026-07-22): a disponibilidade é
            por data, então o período define o que os seletores mostram. */}
        {step === 2 && (
          <div className="space-y-4">
            {isDuplicateMode && (
              <div className="flex items-start gap-2 p-2.5 rounded-md border bg-sky-500/10 border-sky-500/30 text-xs text-sky-700 dark:text-sky-400">
                <Copy className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Cópia do contrato de <strong>{duplicateFrom?.clientName}</strong> no período novo.
                  As <strong>unidades físicas serão reatribuídas</strong> (a disponibilidade é por data) —
                  use o lápis se quiser escolher unidades específicas.
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs">Data início</Label>
                <Input type="date" value={selStartDate} onChange={(e) => setSelStartDate(e.target.value)} className="text-sm" />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Data devolução</Label>
                <Input type="date" value={selEndDate} onChange={(e) => setSelEndDate(e.target.value)} min={selStartDate} className="text-sm" />
              </div>
            </div>
            {!(selStartDate && selEndDate) && (
              <p className="text-xs text-muted-foreground">
                Escolha o período primeiro — a disponibilidade das bikes é calculada pelas datas.
              </p>
            )}
            {categories.length > 0 && (
              <div className="min-w-0">
                <Label className="mb-1 block text-xs">Categoria</Label>
                <Select
                  value={selCategory}
                  onValueChange={(v) => { setSelCategory(v); setSelBikeId(""); setSelBikeSizeId(""); }}
                  disabled={!(selStartDate && selEndDate)}
                >
                  <SelectTrigger className="text-sm w-full min-w-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <Label className="mb-1 block text-xs">Bicicleta</Label>
                <Select
                  value={selBikeId}
                  onValueChange={(v) => { setSelBikeId(v); setSelBikeSizeId(""); }}
                  disabled={!(selStartDate && selEndDate)}
                >
                  <SelectTrigger className="text-sm w-full min-w-0"><SelectValue placeholder="Selecionar bike" /></SelectTrigger>
                  <SelectContent>
                    {bikes.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.model}{b.brand ? ` — ${b.brand}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Label className="mb-1 block text-xs">Tamanho</Label>
                <Select value={selBikeSizeId} onValueChange={setSelBikeSizeId} disabled={!selBikeId || sizes.length === 0}>
                  <SelectTrigger className="text-sm w-full min-w-0"><SelectValue placeholder={sizes.length === 0 ? "Sem tamanhos" : "Selecionar"} /></SelectTrigger>
                  <SelectContent>
                    {/* Com datas escolhidas, o "disp." é DO PERÍODO (listSizes
                        recebe as datas) — agora o número é verdadeiro. */}
                    {sizes.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.tamanho} — {(s as any).disponivel ?? 0} disp. no período
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* BU-PICK-FRONT: seletor de unidades físicas (substitui campo Quantidade) */}
              {selBikeSizeId && (
                <div className="col-span-2">
                  <Label className="mb-1 block text-xs">Unidades físicas</Label>
                  {!(selStartDate && selEndDate) ? (
                    // Sem datas ainda não dá pra saber — antes dizia "nenhuma
                    // disponível", que lia como bike indisponível (bug Cassiana)
                    <p className="text-xs text-muted-foreground py-1">Escolha as datas para ver as unidades disponíveis no período.</p>
                  ) : pickableUnits.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">
                      {(availUnits as any[]).length > 0
                        ? "Todas as unidades deste período já estão no contrato (edite a entrada existente)."
                        : "Nenhuma unidade disponível no período."}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {pickableUnits.map((u) => {
                        const checked = selUnitIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() =>
                              setSelUnitIds((prev) =>
                                checked ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                              )
                            }
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                              checked
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-border hover:border-primary/60"
                            }`}
                          >
                            {u.numeroSistema}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selUnitIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{selUnitIds.length} unidade(s) selecionada(s)</p>
                  )}
                </div>
              )}
              {!selBikeSizeId && (
                <div>
                  <Label className="mb-1 block text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={selQty}
                    onChange={(e) => setSelQty(Math.min(Math.max(1, Number(e.target.value)), 10))}
                    className="text-sm"
                  />
                </div>
              )}
              {selectedBike && (
                <div className="flex items-end">
                  <p className="text-xs text-muted-foreground">R$ {selectedBike.dailyRate ?? "—"}/dia</p>
                </div>
              )}
            </div>
            {/* BUGFIX (Cassiana 2026-07-22): o disable checava disponibilidade "AGORA"
                (coluna sem data) — bike alugada em julho travava o botão até para um
                período LIVRE em setembro. A verdade é por data: o seletor de unidades
                acima + handleAddBike já barram quando não há unidade no período. */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddBike}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar bike ao contrato
            </Button>

            {/* Financial warning for ativo/parcial edit */}
            {isAtivoParcial && (
              <div className="flex items-start gap-2 p-2.5 rounded-md border bg-amber-500/10 border-amber-500/30 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Alterar valores lançará um ajuste no financeiro e o contrato será regenerado em PDF.</span>
              </div>
            )}

            {bikeEntries.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bikes adicionadas</p>
                {bikeEntries.map((b, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-md border ${
                    b.locked ? "bg-muted/30 opacity-70" : "bg-muted/50"
                  }`}>
                    <div className="min-w-0 flex-1">
                      {/* Linha 1: modelo + tamanho + selos */}
                      <div className="flex items-center gap-1.5 flex-wrap text-sm">
                        <span className="font-medium leading-tight">{b.bikeModel}</span>
                        {b.tamanho && <span className="text-xs text-muted-foreground">({b.tamanho})</span>}
                        {b.discountPercent != null && b.discountPercent > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 dark:text-emerald-400">
                            −{b.discountPercent}%
                          </span>
                        )}
                        {b.locked && <span className="text-xs text-muted-foreground">(devolvida)</span>}
                      </div>
                      {/* Linha 2: período + dias/qtd + unidades */}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span className="tabular-nums">{fmtDateBr(b.startDate)} → {fmtDateBr(b.endDate)}</span>
                        <span> · {b.numDays}d · {b.quantity}x</span>
                        {b.unitNumeros && b.unitNumeros.length > 0 && (
                          <span> · Nº {b.unitNumeros.join(", ")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold whitespace-nowrap tabular-nums">R$ {b.totalAmount}</span>
                      {!b.locked && (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleEditEntry(i)} title="Editar datas/unidades desta bike" className="text-muted-foreground hover:text-primary p-0.5">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleRemoveBike(i)} title="Remover do contrato" className="text-muted-foreground hover:text-destructive p-0.5">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Accessories */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Selecione a quantidade de cada variante desejada. Acessórios obrigatórios precisam de ao menos 1 unidade.</p>
            {/* Sem scroll próprio: o corpo do modal já rola (altura fixa) —
                dois scrolls aninhados prendiam a lista numa janelinha. */}
            <div className="space-y-3">
              {accList.map((acc) => {
                const isMandatory = (acc as any).obrigatorio;
                const accAvail = (availData ?? []).find((av: any) => av.accessoryId === acc.id);
                const variantes: Array<{variante: string|null; disponivel: number}> = accAvail?.variantes ?? [];
                const hasUnits = variantes.length > 0;
                const byKey = accSelections[acc.id] ?? {};
                const totalSelected = Object.values(byKey).reduce((s, q) => s + q, 0);
                return (
                  <div key={acc.id} className="border rounded-md overflow-hidden">
                    <div className="flex items-center gap-2 p-2.5 bg-muted/20">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm truncate">{acc.name}</span>
                        {isMandatory && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-md border bg-amber-500/20 text-amber-600 border-amber-500/30 dark:text-amber-400">Obrigatório</span>}
                      </div>
                      {totalSelected > 0 && <span className="text-xs text-primary font-medium">{totalSelected} selecionado(s)</span>}
                    </div>
                    {!hasUnits ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Sem unidades cadastradas</div>
                    ) : (
                      <div className="px-3 pb-3 pt-2 space-y-2">
                        {variantes.map(({ variante, disponivel }) => {
                          const key = variante ?? "__sem__";
                          const maxQty = disponivel + (isEditMode ? (prefillSelections[acc.id]?.[key] ?? 0) : 0);
                          const qty = byKey[key] ?? 0;
                          return (
                            <div key={key} className="flex items-center gap-3">
                              <span className="text-sm flex-1">{variante ?? "(padrão)"} <span className="text-xs text-muted-foreground">({disponivel} disp.)</span></span>
                              <div className="flex items-center gap-1">
                                <button type="button" className="w-6 h-6 rounded border flex items-center justify-center text-sm hover:bg-muted"
                                  onClick={() => setAccSelections(prev => {
                                    const cur = (prev[acc.id] ?? {})[key] ?? 0;
                                    const next = Math.max(0, cur - 1);
                                    return { ...prev, [acc.id]: { ...(prev[acc.id] ?? {}), [key]: next } };
                                  })}>-</button>
                                <input type="number" className="w-10 h-6 text-center text-sm border rounded"
                                  min={0} max={maxQty} value={qty}
                                  onChange={(e) => {
                                    const v = Math.min(Math.max(0, Number(e.target.value)), maxQty);
                                    setAccSelections(prev => ({ ...prev, [acc.id]: { ...(prev[acc.id] ?? {}), [key]: v } }));
                                  }} />
                                <button type="button" className="w-6 h-6 rounded border flex items-center justify-center text-sm hover:bg-muted"
                                  disabled={qty >= maxQty}
                                  onClick={() => setAccSelections(prev => {
                                    const cur = (prev[acc.id] ?? {})[key] ?? 0;
                                    const next = Math.min(maxQty, cur + 1);
                                    return { ...prev, [acc.id]: { ...(prev[acc.id] ?? {}), [key]: next } };
                                  })}>+</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {accList.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">Nenhum acessório cadastrado.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-muted/50 border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cliente</p>
              <p className="font-medium">{clientName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Bikes</p>
              {bikeEntries.map((b, i) => (
                <div key={i} className="flex justify-between gap-2 text-sm py-1 border-b last:border-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">{b.bikeModel}</span>
                      {b.tamanho ? <span className="text-xs text-muted-foreground">({b.tamanho})</span> : null}
                      {b.discountPercent != null && b.discountPercent > 0 && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">−{b.discountPercent}%</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {fmtDateBr(b.startDate)} → {fmtDateBr(b.endDate)} · {b.numDays}d · {b.quantity}x{b.unitNumeros && b.unitNumeros.length > 0 ? ` · Nº ${b.unitNumeros.join(", ")}` : ""}
                    </div>
                  </div>
                  <span className="font-medium whitespace-nowrap tabular-nums">R$ {b.totalAmount}</span>
                </div>
              ))}
            </div>
{(() => {
                const accSummary: Array<{name: string; variante: string|null; qty: number; obrigatorio: boolean}> = [];
                for (const [idStr, byKey] of Object.entries(accSelections)) {
                  const accItem = accList.find((a: any) => a.id === Number(idStr));
                  for (const [key, qty] of Object.entries(byKey)) {
                    if (qty > 0) accSummary.push({ name: accItem?.name ?? `Acessório #${idStr}`, variante: key === "__sem__" ? null : key, qty, obrigatorio: !!(accItem as any)?.obrigatorio });
                  }
                }
                return accSummary.length > 0 ? (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Acessórios</p>
                    {accSummary.map((a, i) => (
                      <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                        <span>{a.name}{a.variante ? ` (${a.variante})` : ""} × {a.qty}{a.obrigatorio && <span className="ml-1 text-xs text-amber-600">(obrig.)</span>}</span>
                        <span className="text-muted-foreground">gratuito</span>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">R$ {grandTotal.toFixed(2)}</span>
            </div>
            {/* Forma de pagamento saiu daqui de propósito: a Cassiana recebe na
                DEVOLUÇÃO — a escolha vive no botão "Confirmar Pagamento". */}
            <div>
              <Label className="mb-1 block text-xs">Observações (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações internas..." rows={2} className="text-sm" />
            </div>
          </div>
        )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 px-5 py-4 border-t border-border shrink-0">
          <div>
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                ← Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { handleReset(); onClose(); }}>Cancelar</Button>
            {step < 4 ? (
              <Button
                size="sm"
                onClick={() => {
                  if (step === 1 && isDuplicateMode) {
                    if (!dupStart || !dupEnd) { toast.error("Escolha o período novo."); return; }
                    if (dupEnd < dupStart) { toast.error("A devolução não pode ser antes do início."); return; }
                    applyDuplicateBikes(); // só aqui as bikes entram no carrinho
                  } else if (step === 1 && (!clientId || clientStatus !== "verified")) {
                    toast.error("Selecione um cliente verificado."); return;
                  }
                  if (step === 2 && bikeEntries.length === 0) {
                    toast.error("Adicione pelo menos uma bike."); return;
                  }
                  if (step === 3) {
                    const mandatory = accList.filter((a: any) => a.obrigatorio);
                    for (const ma of mandatory) {
                      const total = Object.values(accSelections[ma.id] ?? {}).reduce((s, q) => s + q, 0);
                      if (total >= 1) continue;
                      // Distinguir "esqueceu de escolher" de "não há nenhum em
                      // estoque" — com 0 disponível em todas as variantes o
                      // usuário ficava preso sem entender o que fazer.
                      const av = (availData as any[] | undefined)?.find((a) => a.accessoryId === ma.id);
                      const estoque = (av?.variantes ?? []).reduce((s: number, v: any) => s + (v.disponivel ?? 0), 0);
                      toast.error(
                        estoque === 0
                          ? `Sem estoque de "${ma.name}" (obrigatório) — nenhuma unidade disponível. Libere uma unidade em Acessórios ou desmarque a obrigatoriedade.`
                          : `Selecione ao menos 1 unidade do acessório obrigatório: ${ma.name}`,
                        { duration: 8000 },
                      );
                      return;
                    }
                  }
                  setStep((s) => s + 1);
                }}
              >
                Próximo →
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                {isEditMode ? "Salvar Alterações" : "Criar Contrato"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
