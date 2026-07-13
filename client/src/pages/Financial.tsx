import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Tag, Download, Wallet,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  ReceiptText, HandCoins, Bike,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { DataTable } from "@/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { useConfirm } from "@/components/ConfirmDialog";
import { friendlyError } from "@/lib/utils";

type TxType = "expense" | "revenue";

interface TxRow {
  id: number;
  categoryId: number;
  description: string | null;
  amount: string;
  date: string | Date;
}

// ─── Período ─────────────────────────────────────────────────────────────────
type PeriodKey = "mes_atual" | "mes_anterior" | "ultimos_3_meses" | "este_ano" | "personalizado";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "mes_atual", label: "Mês atual" },
  { key: "mes_anterior", label: "Mês anterior" },
  { key: "ultimos_3_meses", label: "Últimos 3 meses" },
  { key: "este_ano", label: "Este ano" },
  { key: "personalizado", label: "Personalizado" },
];

function getPresetDates(key: Exclude<PeriodKey, "personalizado">): { startDate: string; endDate: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  switch (key) {
    case "mes_atual":
      return {
        startDate: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case "mes_anterior":
      return {
        startDate: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        endDate: fmt(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "ultimos_3_meses":
      return {
        startDate: fmt(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
        endDate: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case "este_ano":
      return {
        startDate: fmt(new Date(now.getFullYear(), 0, 1)),
        endDate: fmt(new Date(now.getFullYear(), 11, 31)),
      };
  }
}

// ─── Formatação ──────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Datas "YYYY-MM-DD" formatadas direto da string (new Date() jogaria pra UTC e
// mostraria o dia anterior no fuso local)
function fmtDate(v: string | Date) {
  if (v instanceof Date) return v.toLocaleDateString("pt-BR");
  const [y, m, d] = v.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

// ─── Gerenciador de categorias ───────────────────────────────────────────────
function CategoryManagerDialog({
  type,
  open,
  onClose,
}: {
  type: TxType;
  open: boolean;
  onClose: () => void;
}) {
  const confirmDialog = useConfirm();
  const [newName, setNewName] = useState("");
  const utils = trpc.useUtils();
  const isExpense = type === "expense";

  const expenseCats = trpc.financial.expenseCategories.useQuery(undefined, { enabled: open });
  const revenueCats = trpc.financial.revenueCategories.useQuery(undefined, { enabled: open });
  const { data: categories, isLoading } = isExpense ? expenseCats : revenueCats;

  const invalidate = () => {
    utils.financial.expenseCategories.invalidate();
    utils.financial.revenueCategories.invalidate();
  };

  const createExpenseCat = trpc.financial.createExpenseCategory.useMutation({
    onSuccess: () => { toast.success("Categoria criada"); invalidate(); setNewName(""); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const createRevenueCat = trpc.financial.createRevenueCategory.useMutation({
    onSuccess: () => { toast.success("Categoria criada"); invalidate(); setNewName(""); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const deleteExpenseCat = trpc.financial.deleteExpenseCategory.useMutation({
    onSuccess: () => { toast.success("Categoria removida."); invalidate(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const deleteRevenueCat = trpc.financial.deleteRevenueCategory.useMutation({
    onSuccess: () => { toast.success("Categoria removida."); invalidate(); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const createMutation = isExpense ? createExpenseCat : createRevenueCat;
  const deleteMutation = isExpense ? deleteExpenseCat : deleteRevenueCat;

  const handleCreate = () => {
    if (newName.trim()) createMutation.mutate({ name: newName.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm dialog-mobile">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Tag className="size-4 text-primary" />
            Categorias de {isExpense ? "Despesa" : "Receita"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nova categoria..."
              className="text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={createMutation.isPending || !newName.trim()}
              aria-label="Adicionar categoria"
            >
              <Plus className="size-4" />
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {(categories ?? []).map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 group"
                >
                  <span className="text-sm text-foreground">{cat.name}</span>
                  <button
                    onClick={async () => {
                      if (await confirmDialog({ title: "Remover categoria?", confirmText: "Remover", destructive: true })) {
                        deleteMutation.mutate({ id: cat.id });
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remover categoria ${cat.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              {(categories ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma categoria cadastrada
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Formulário de lançamento ────────────────────────────────────────────────
function TransactionDialog({
  type,
  item,
  open,
  onClose,
  onSuccess,
}: {
  type: TxType;
  item: TxRow | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isExpense = type === "expense";

  const expenseCats = trpc.financial.expenseCategories.useQuery(undefined, { enabled: open });
  const revenueCats = trpc.financial.revenueCategories.useQuery(undefined, { enabled: open });
  const { data: categories } = isExpense ? expenseCats : revenueCats;

  const [form, setForm] = useState(() => ({
    categoryId: item?.categoryId ? String(item.categoryId) : "",
    description: item?.description ?? "",
    amount: item?.amount ?? "",
    date: item?.date
      ? (item.date instanceof Date ? item.date.toISOString() : item.date).split("T")[0]
      : new Date().toISOString().split("T")[0],
  }));

  const createExpense = trpc.financial.createExpense.useMutation({
    onSuccess: () => { toast.success("Despesa registrada"); onSuccess(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const updateExpense = trpc.financial.updateExpense.useMutation({
    onSuccess: () => { toast.success("Despesa atualizada"); onSuccess(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const createRevenue = trpc.financial.createRevenue.useMutation({
    onSuccess: () => { toast.success("Receita registrada"); onSuccess(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const updateRevenue = trpc.financial.updateRevenue.useMutation({
    onSuccess: () => { toast.success("Receita atualizada"); onSuccess(); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const isPending =
    createExpense.isPending || updateExpense.isPending ||
    createRevenue.isPending || updateRevenue.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) return toast.error("Selecione uma categoria.");
    if (!form.description.trim()) return toast.error("Descrição é obrigatória.");
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Informe um valor válido.");

    const payload = {
      categoryId: parseInt(form.categoryId),
      description: form.description.trim(),
      amount: form.amount,
      date: form.date,
    };

    if (isExpense) {
      if (item) updateExpense.mutate({ id: item.id, ...payload });
      else createExpense.mutate(payload);
    } else {
      if (item) updateRevenue.mutate({ id: item.id, ...payload });
      else createRevenue.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md dialog-mobile">
        <DialogHeader>
          <DialogTitle className="text-base">
            {item ? "Editar" : "Nova"} {isExpense ? "Despesa" : "Receita"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tx-category" className="text-xs text-muted-foreground">Categoria *</Label>
            <Select
              value={form.categoryId}
              onValueChange={(v) => setForm({ ...form, categoryId: v })}
            >
              <SelectTrigger id="tx-category" className="w-full">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-description" className="text-xs text-muted-foreground">Descrição *</Label>
            <Input
              id="tx-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount" className="text-xs text-muted-foreground">Valor (R$) *</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date" className="text-xs text-muted-foreground">Data *</Label>
              <Input
                id="tx-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Salvando..." : item ? "Salvar" : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── KPI cards do período ────────────────────────────────────────────────────
function KpiCardSkeleton() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-8 w-36" />
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5">
        <Skeleton className="h-4 w-40" />
      </CardFooter>
    </Card>
  );
}

function FinancialKpiCards({
  report,
  loading,
}: {
  report?: { rentalRevenue: string; extraRevenue: string; totalExpenses: string };
  loading: boolean;
}) {
  const gridCls =
    "grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4";

  if (loading) {
    return (
      <div className={gridCls}>
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
    );
  }

  const rentalRevenue = Number(report?.rentalRevenue ?? 0);
  const extraRevenue = Number(report?.extraRevenue ?? 0);
  const totalExpenses = Number(report?.totalExpenses ?? 0);
  const netProfit = rentalRevenue + extraRevenue - totalExpenses;

  return (
    <div className={gridCls}>
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="min-w-0 truncate">Receita de aluguéis</CardDescription>
            <Badge variant="outline" className="shrink-0">
              <Bike />
              pagos
            </Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums whitespace-nowrap @[250px]/card:text-3xl">
            {fmtBRL(rentalRevenue)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Contratos com pagamento confirmado</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="min-w-0 truncate">Receitas extras</CardDescription>
            <Badge variant="outline" className="shrink-0">
              <ArrowUpRight />
              extras
            </Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums whitespace-nowrap @[250px]/card:text-3xl">
            {fmtBRL(extraRevenue)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Lançamentos manuais de receita</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="min-w-0 truncate">Despesas</CardDescription>
            <Badge variant="outline" className="shrink-0">
              <ArrowDownRight />
              saídas
            </Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums whitespace-nowrap @[250px]/card:text-3xl">
            {fmtBRL(totalExpenses)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Custos lançados no período</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="min-w-0 truncate">Lucro líquido</CardDescription>
            <Badge variant="outline" className="shrink-0">
              {netProfit >= 0 ? <TrendingUp /> : <TrendingDown />}
              {netProfit >= 0 ? "positivo" : "negativo"}
            </Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums whitespace-nowrap @[250px]/card:text-3xl">
            {fmtBRL(netProfit)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Receitas − despesas do período</div>
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 20;

export default function Financial() {
  const confirmDialog = useConfirm();
  const utils = trpc.useUtils();

  const [tab, setTab] = useState<"expenses" | "revenues">("expenses");
  const [period, setPeriod] = useState<PeriodKey>("mes_atual");
  const [customStart, setCustomStart] = useState(() => getPresetDates("mes_atual").startDate);
  const [customEnd, setCustomEnd] = useState(() => getPresetDates("mes_atual").endDate);
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [expensePage, setExpensePage] = useState(1);
  const [revenuePage, setRevenuePage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TxRow | null>(null);
  const [showCategories, setShowCategories] = useState(false);

  const isExpense = tab === "expenses";
  const txType: TxType = isExpense ? "expense" : "revenue";

  const { startDate, endDate } = useMemo(() => {
    if (period === "personalizado") return { startDate: customStart, endDate: customEnd };
    return getPresetDates(period);
  }, [period, customStart, customEnd]);

  const datesValid = !!startDate && !!endDate && startDate <= endDate;

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: report, isLoading: reportLoading } = trpc.financial.report.useQuery(
    { startDate, endDate },
    { enabled: datesValid }
  );

  const { data: expenseCategories } = trpc.financial.expenseCategories.useQuery();
  const { data: revenueCategories } = trpc.financial.revenueCategories.useQuery();
  const categories = isExpense ? expenseCategories : revenueCategories;

  // IDs de categoria de despesa e receita COLIDEM (serials independentes) —
  // o mapa precisa ser só do tipo ativo, nunca dos dois juntos
  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const c of categories ?? []) {
      map[c.id] = c.name;
    }
    return map;
  }, [categories]);

  const listInput = (page: number) => ({
    categoryId: categoryFilter === "todas" ? undefined : parseInt(categoryFilter),
    startDate,
    endDate,
    limit: PAGE_LIMIT,
    offset: (page - 1) * PAGE_LIMIT,
  });

  const { data: expensesData, isLoading: expensesLoading } = trpc.financial.expenses.useQuery(
    listInput(expensePage),
    { enabled: datesValid && isExpense }
  );
  const { data: revenuesData, isLoading: revenuesLoading } = trpc.financial.revenues.useQuery(
    listInput(revenuePage),
    { enabled: datesValid && !isExpense }
  );

  const currentData = isExpense ? expensesData : revenuesData;
  const currentLoading = isExpense ? expensesLoading : revenuesLoading;
  const items = (currentData?.items ?? []) as TxRow[];
  const total = currentData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const currentPage = isExpense ? expensePage : revenuePage;
  const setCurrentPage = isExpense ? setExpensePage : setRevenuePage;

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const invalidateTx = () => {
    utils.financial.expenses.invalidate();
    utils.financial.revenues.invalidate();
    utils.financial.report.invalidate();
  };

  const deleteExpense = trpc.financial.deleteExpense.useMutation({
    onSuccess: () => { toast.success("Despesa removida."); invalidateTx(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const deleteRevenue = trpc.financial.deleteRevenue.useMutation({
    onSuccess: () => { toast.success("Receita removida."); invalidateTx(); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const handleDelete = async (item: TxRow) => {
    const ok = await confirmDialog({
      title: "Remover lançamento?",
      description: item.description ?? undefined,
      confirmText: "Remover",
      destructive: true,
    });
    if (!ok) return;
    if (isExpense) deleteExpense.mutate({ id: item.id });
    else deleteRevenue.mutate({ id: item.id });
  };

  // ─── Colunas ───────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<TxRow, unknown>[]>(() => [
    {
      id: "data",
      header: "Data",
      accessorKey: "date",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {fmtDate(row.original.date)}
        </span>
      ),
    },
    {
      id: "categoria",
      header: "Categoria",
      accessorFn: (r) => categoryMap[r.categoryId] ?? "—",
      cell: ({ getValue }) => (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {getValue() as string}
        </Badge>
      ),
    },
    {
      id: "descricao",
      header: "Descrição",
      accessorKey: "description",
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{row.original.description || "—"}</span>
      ),
    },
    {
      id: "valor",
      header: "Valor",
      accessorFn: (r) => parseFloat(r.amount),
      cell: ({ row }) => (
        <span
          className={`text-sm font-medium tabular-nums ${
            isExpense ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {isExpense ? "− " : "+ "}
          {fmtBRL(parseFloat(row.original.amount))}
        </span>
      ),
    },
    {
      id: "acoes",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setEditItem(row.original); setShowForm(true); }}
          >
            <Pencil className="size-3.5" />
            <span className="sr-only">Editar lançamento</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={deleteExpense.isPending || deleteRevenue.isPending}
            onClick={() => handleDelete(row.original)}
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">Remover lançamento</span>
          </Button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [categoryMap, isExpense, deleteExpense.isPending, deleteRevenue.isPending]);

  // ─── CSV ───────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!report) return;
    const rentalRevenue = Number(report.rentalRevenue);
    const extraRevenue = Number(report.extraRevenue);
    const totalExpenses = Number(report.totalExpenses);
    const rows = [
      "Tipo,Valor",
      `Receita de Alugueis,${rentalRevenue.toFixed(2)}`,
      `Receitas Extras,${extraRevenue.toFixed(2)}`,
      `Total Receitas,${(rentalRevenue + extraRevenue).toFixed(2)}`,
      `Total Despesas,${totalExpenses.toFixed(2)}`,
      `Lucro Líquido,${(rentalRevenue + extraRevenue - totalExpenses).toFixed(2)}`,
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-financeiro-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const tabOptions = [
    { value: "expenses", label: "Despesas", count: isExpense ? total : undefined },
    { value: "revenues", label: "Receitas", count: !isExpense ? total : undefined },
  ];

  return (
    <div className="@container/main p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Financeiro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Despesas, receitas e resultado do período
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!report}>
            <Download className="size-4 mr-1" /> Exportar CSV
          </Button>
          <Button size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <Plus className="size-4 mr-1" /> {isExpense ? "Nova despesa" : "Nova receita"}
          </Button>
        </div>
      </div>

      {/* Seletor de período */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={(v) => {
          setPeriod(v as PeriodKey);
          setExpensePage(1);
          setRevenuePage(1);
        }}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {period === "personalizado" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => { setCustomStart(e.target.value); setExpensePage(1); setRevenuePage(1); }}
              className="h-9 w-38 text-sm"
              aria-label="Data início"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => { setCustomEnd(e.target.value); setExpensePage(1); setRevenuePage(1); }}
              className="h-9 w-38 text-sm"
              aria-label="Data fim"
            />
          </div>
        )}
        {!datesValid && (
          <span className="text-xs text-destructive">Período inválido — confira as datas.</span>
        )}
      </div>

      {/* KPI cards */}
      <FinancialKpiCards report={report} loading={reportLoading && datesValid} />

      {/* Toolbar da lista */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedTabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as typeof tab);
            setCategoryFilter("todas");
            setExpensePage(1);
            setRevenuePage(1);
          }}
          options={tabOptions}
        />
        <div className="flex items-center gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(v) => { setCategoryFilter(v); setExpensePage(1); setRevenuePage(1); }}
          >
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9" onClick={() => setShowCategories(true)}>
            <Tag className="size-3.5 mr-1" /> Categorias
          </Button>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={items}
        loading={currentLoading && datesValid}
        pagination={{ page: currentPage, totalPages, onPageChange: setCurrentPage }}
        empty={
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            {isExpense
              ? <ReceiptText className="h-10 w-10 opacity-30" />
              : <HandCoins className="h-10 w-10 opacity-30" />}
            <p className="text-sm">
              {isExpense ? "Nenhuma despesa no período." : "Nenhuma receita no período."}
            </p>
          </div>
        }
      />

      {/* Dialogs — key força remount ao trocar tipo/item (estado do form limpo) */}
      {showForm && (
        <TransactionDialog
          key={`${txType}-${editItem?.id ?? "new"}`}
          type={txType}
          item={editItem}
          open={showForm}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSuccess={() => { setShowForm(false); setEditItem(null); invalidateTx(); }}
        />
      )}
      {showCategories && (
        <CategoryManagerDialog
          key={txType}
          type={txType}
          open={showCategories}
          onClose={() => setShowCategories(false)}
        />
      )}
    </div>
  );
}
