import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus, Loader2, X, Search, Pencil, Trash2,
  TrendingUp, TrendingDown, DollarSign, Download,
  BarChart3, Tag, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TabType = "expenses" | "revenues" | "report";

// ─── Category Manager ────────────────────────────────────────────────────────
function CategoryManager({
  type,
  onClose,
}: {
  type: "expense" | "revenue";
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const utils = trpc.useUtils();

  const { data: categories, isLoading } = type === "expense"
    ? trpc.financial.expenseCategories.useQuery()
    : trpc.financial.revenueCategories.useQuery();

  const createMutation = type === "expense"
    ? trpc.financial.createExpenseCategory.useMutation({
        onSuccess: () => { toast.success("Categoria criada!"); utils.financial.expenseCategories.invalidate(); setNewName(""); },
        onError: (e) => toast.error(e.message),
      })
    : trpc.financial.createRevenueCategory.useMutation({
        onSuccess: () => { toast.success("Categoria criada!"); utils.financial.revenueCategories.invalidate(); setNewName(""); },
        onError: (e) => toast.error(e.message),
      });

  const deleteMutation = type === "expense"
    ? trpc.financial.deleteExpenseCategory.useMutation({
        onSuccess: () => { toast.success("Categoria removida."); utils.financial.expenseCategories.invalidate(); },
        onError: (e) => toast.error(e.message),
      })
    : trpc.financial.deleteRevenueCategory.useMutation({
        onSuccess: () => { toast.success("Categoria removida."); utils.financial.revenueCategories.invalidate(); },
        onError: (e) => toast.error(e.message),
      });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Categorias de {type === "expense" ? "Despesa" : "Receita"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nova categoria..."
              className="bg-secondary border-border text-sm"
              onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) createMutation.mutate({ name: newName.trim() }); }}
            />
            <Button
              onClick={() => { if (newName.trim()) createMutation.mutate({ name: newName.trim() }); }}
              disabled={createMutation.isPending || !newName.trim()}
              size="sm"
              style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {(categories ?? []).map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary/50 group">
                  <span className="text-sm text-foreground">{cat.name}</span>
                  <button
                    onClick={() => { if (confirm("Remover esta categoria?")) deleteMutation.mutate({ id: cat.id }); }}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {(categories ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma categoria cadastrada</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Expense/Revenue Form Dialog ─────────────────────────────────────────────
function TransactionFormDialog({
  type,
  item,
  onClose,
  onSuccess,
}: {
  type: "expense" | "revenue";
  item?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: categories } = type === "expense"
    ? trpc.financial.expenseCategories.useQuery()
    : trpc.financial.revenueCategories.useQuery();

  const [form, setForm] = useState({
    categoryId: item?.categoryId ? String(item.categoryId) : "",
    description: item?.description ?? "",
    amount: item?.amount ?? "",
    date: item?.date ? new Date(item.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    notes: item?.notes ?? "",
  });

  const createExpense = trpc.financial.createExpense.useMutation({
    onSuccess: () => { toast.success("Despesa registrada!"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  const updateExpense = trpc.financial.updateExpense.useMutation({
    onSuccess: () => { toast.success("Despesa atualizada!"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  const createRevenue = trpc.financial.createRevenue.useMutation({
    onSuccess: () => { toast.success("Receita registrada!"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  const updateRevenue = trpc.financial.updateRevenue.useMutation({
    onSuccess: () => { toast.success("Receita atualizada!"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) return toast.error("Selecione uma categoria.");
    if (!form.description.trim()) return toast.error("Descrição é obrigatória.");
    if (!form.amount) return toast.error("Valor é obrigatório.");

    const payload = {
      categoryId: parseInt(form.categoryId),
      description: form.description,
      amount: form.amount,
      date: form.date,
      notes: form.notes || undefined,
    };

    if (type === "expense") {
      if (item) updateExpense.mutate({ id: item.id, ...payload });
      else createExpense.mutate(payload);
    } else {
      if (item) updateRevenue.mutate({ id: item.id, ...payload });
      else createRevenue.mutate(payload);
    }
  };

  const isPending = createExpense.isPending || updateExpense.isPending || createRevenue.isPending || updateRevenue.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {item ? "Editar" : "Nova"} {type === "expense" ? "Despesa" : "Receita"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Categoria *</Label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
            >
              <option value="">Selecionar...</option>
              {(categories ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Descrição *</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Valor (R$) *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Data *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-secondary border-border" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Observações</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-secondary border-border" placeholder="Opcional..." />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={isPending} className="flex-1" style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}>
              {isPending ? "Salvando..." : item ? "Salvar" : "Registrar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Report Tab ──────────────────────────────────────────────────────────────
function ReportTab() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const { data: report, isLoading } = trpc.financial.report.useQuery(
    { startDate, endDate },
    { enabled: !!startDate && !!endDate }
  );

  const rentalRevenue = Number(report?.rentalRevenue ?? 0);
  const extraRevenue = Number(report?.extraRevenue ?? 0);
  const totalExpensesVal = Number(report?.totalExpenses ?? 0);
  const totalRevenueVal = rentalRevenue + extraRevenue;
  const netProfitVal = totalRevenueVal - totalExpensesVal;

  const exportCSV = () => {
    if (!report) return;
    const rows: string[] = ["Tipo,Valor"];
    rows.push(`Receita de Alugueis,${rentalRevenue.toFixed(2)}`);
    rows.push(`Receitas Extras,${extraRevenue.toFixed(2)}`);
    rows.push(`Total Receitas,${totalRevenueVal.toFixed(2)}`);
    rows.push(`Total Despesas,${totalExpensesVal.toFixed(2)}`);
    rows.push(`Lucro Líquido,${netProfitVal.toFixed(2)}`);

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-financeiro-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  return (
    <div className="space-y-6">
      {/* Date range */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Data início</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-card border-border" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Data fim</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-card border-border" />
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2" disabled={!report}>
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : report ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Aluguéis</span>
              </div>
              <p className="text-xl font-bold text-primary">
                R$ {rentalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-xs text-muted-foreground">Receitas extras</span>
              </div>
              <p className="text-xl font-bold text-green-400">
                R$ {extraRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-xs text-muted-foreground">Despesas</span>
              </div>
              <p className="text-xl font-bold text-red-400">
                R$ {totalExpensesVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Lucro líquido</span>
              </div>
              <p className={`text-xl font-bold ${netProfitVal >= 0 ? "text-green-400" : "text-red-400"}`}>
                R$ {netProfitVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Selecione o período para gerar o relatório</p>
        </div>
      )}
    </div>
  );
}

// ─── Transaction List Tab ────────────────────────────────────────────────────
function TransactionListTab({ type }: { type: "expense" | "revenue" }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showCategories, setShowCategories] = useState(false);
  const utils = trpc.useUtils();

  const { data: categories } = type === "expense"
    ? trpc.financial.expenseCategories.useQuery()
    : trpc.financial.revenueCategories.useQuery();

  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    (categories ?? []).forEach((c: any) => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  const { data, isLoading } = type === "expense"
    ? trpc.financial.expenses.useQuery({ limit: 200, offset: 0 })
    : trpc.financial.revenues.useQuery({ limit: 200, offset: 0 });

  const deleteExpense = trpc.financial.deleteExpense.useMutation({
    onSuccess: () => { toast.success("Despesa removida."); utils.financial.expenses.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteRevenue = trpc.financial.deleteRevenue.useMutation({
    onSuccess: () => { toast.success("Receita removida."); utils.financial.revenues.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const items = useMemo(() => {
    const list = (data as any)?.items ?? data ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((i: any) =>
      (i.description || "").toLowerCase().includes(q) ||
      (categoryMap[i.categoryId] || "").toLowerCase().includes(q)
    );
  }, [data, search, categoryMap]);

  const handleDelete = (id: number) => {
    if (!confirm("Remover este lançamento?")) return;
    if (type === "expense") deleteExpense.mutate({ id });
    else deleteRevenue.mutate({ id });
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditItem(null);
    if (type === "expense") utils.financial.expenses.invalidate();
    else utils.financial.revenues.invalidate();
  };

  const isExpense = type === "expense";
  const colorClass = isExpense ? "text-red-400" : "text-green-400";
  const Icon = isExpense ? TrendingDown : TrendingUp;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por descrição ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategories(true)} className="gap-1 text-xs">
            <Tag className="w-3.5 h-3.5" /> Categorias
          </Button>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="gap-2" style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}>
            <Plus className="w-4 h-4" /> {isExpense ? "Nova despesa" : "Nova receita"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Icon className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhum lançamento encontrado</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Data", "Categoria", "Descrição", "Valor", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {item.date ? new Date(item.date).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {categoryMap[item.categoryId] || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{item.description}</td>
                  <td className={`px-4 py-3 text-sm font-medium ${colorClass}`}>
                    R$ {parseFloat(item.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditItem(item); setShowForm(true); }} className="text-muted-foreground hover:text-primary">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <TransactionFormDialog
          type={type}
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSuccess={handleSuccess}
        />
      )}

      {showCategories && (
        <CategoryManager type={type} onClose={() => setShowCategories(false)} />
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Financial() {
  const [tab, setTab] = useState<TabType>("expenses");

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: "expenses", label: "Despesas", icon: TrendingDown },
    { key: "revenues", label: "Receitas", icon: TrendingUp },
    { key: "report", label: "Relatório", icon: BarChart3 },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Financeiro
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Controle de despesas, receitas e relatórios</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-secondary/50 rounded-lg p-1 w-fit">
        {tabs.map(({ key, label, icon: TabIcon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TabIcon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "expenses" && <TransactionListTab type="expense" />}
      {tab === "revenues" && <TransactionListTab type="revenue" />}
      {tab === "report" && <ReportTab />}
    </div>
  );
}
