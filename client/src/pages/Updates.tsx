import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Sparkles, Plus, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ConfirmDialog";
import { friendlyError } from "@/lib/utils";
import { usePapel } from "@/hooks/usePapel";

type Categoria = "novidade" | "melhoria" | "correcao";

type UpdateItem = {
  id: number;
  titulo: string;
  descricao: string;
  categoria: Categoria;
  criadoEm: string | Date;
  autorNome: string | null;
};

// Padrão de status theme-adaptive da casa (nunca a paleta clara, que some no dark).
const CATEGORIA_CONFIG: Record<Categoria, { label: string; cls: string }> = {
  novidade: { label: "Novidade", cls: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 dark:text-emerald-400" },
  melhoria: { label: "Melhoria", cls: "bg-sky-500/20 text-sky-600 border-sky-500/30 dark:text-sky-400" },
  correcao: { label: "Correção", cls: "bg-amber-500/20 text-amber-600 border-amber-500/30 dark:text-amber-400" },
};

function CategoriaBadge({ categoria }: { categoria: Categoria }) {
  const config = CATEGORIA_CONFIG[categoria];
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-md border font-medium shrink-0 ${config.cls}`}>
      {config.label}
    </span>
  );
}

/**
 * "17 ago 2026". Medido a 375px: por extenso ("17 de agosto de 2026") o par
 * badge + data pede 195px e só sobram 189 depois dos botões de ação, então a
 * data caía para uma segunda linha e desalinhava o topo do card. A forma curta
 * cabe com folga em qualquer largura e continua legível.
 */
function formatarData(data: string | Date) {
  const d = new Date(data);
  const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${String(d.getDate()).padStart(2, "0")} ${mes} ${d.getFullYear()}`;
}

export default function Updates() {
  const { isAdmin } = usePapel();
  const confirmDialog = useConfirm();
  const utils = trpc.useUtils();
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<UpdateItem | null>(null);

  const { data, isLoading } = trpc.updates.list.useQuery({ limit: 100 });
  const itens = (data?.items ?? []) as UpdateItem[];

  // Abriu a aba: zera o badge de novidade do menu. Dispara uma vez por visita,
  // não por item carregado — não importa o que já veio na tela.
  const marcarLidas = trpc.updates.marcarLidas.useMutation({
    onSuccess: () => utils.updates.naoLidas.invalidate(),
  });
  useEffect(() => {
    marcarLidas.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteMutation = trpc.updates.delete.useMutation({
    onSuccess: () => {
      toast.success("Atualização removida.");
      utils.updates.list.invalidate();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const abrirNova = () => { setEditando(null); setFormOpen(true); };
  const abrirEdicao = (item: UpdateItem) => { setEditando(item); setFormOpen(true); };

  const handleDelete = async (item: UpdateItem) => {
    const ok = await confirmDialog({
      title: "Remover esta atualização?",
      description: `"${item.titulo}" some da lista que a Cassiana vê. Não afeta nada além disso.`,
      confirmText: "Remover",
      destructive: true,
    });
    if (ok) deleteMutation.mutate({ id: item.id });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Atualizações</h1>
            <p className="text-xs text-muted-foreground">O que mudou no sistema</p>
          </div>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={abrirNova} className="gap-2">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nova atualização</span>
          </Button>
        )}
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : itens.length === 0 ? (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState
            icon={Sparkles}
            title="Nenhuma atualização ainda"
            description={
              isAdmin
                ? "Cada entrega vira um post aqui, pra você acompanhar o que mudou."
                : "Quando o sistema receber novidades, elas aparecem aqui."
            }
            actionLabel={isAdmin ? "Nova atualização" : undefined}
            onAction={isAdmin ? abrirNova : undefined}
            actionIcon={Plus}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => (
            <div key={item.id} className="bg-card border border-border rounded-xl p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <CategoriaBadge categoria={item.categoria} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatarData(item.criadoEm)}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => abrirEdicao(item)}
                      aria-label="Editar atualização"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => handleDelete(item)}
                      aria-label="Remover atualização"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <h2 className="text-sm font-semibold text-foreground mt-2">{item.titulo}</h2>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">
                {item.descricao}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* key força remount ao trocar de item (estado do form limpo) */}
      {formOpen && (
        <UpdateFormDialog
          key={editando?.id ?? "novo"}
          open={formOpen}
          item={editando}
          onClose={() => { setFormOpen(false); setEditando(null); }}
        />
      )}
    </div>
  );
}

function UpdateFormDialog({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: UpdateItem | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [titulo, setTitulo] = useState(item?.titulo ?? "");
  const [descricao, setDescricao] = useState(item?.descricao ?? "");
  const [categoria, setCategoria] = useState<Categoria>(item?.categoria ?? "melhoria");

  const invalidate = () => utils.updates.list.invalidate();

  const createMutation = trpc.updates.create.useMutation({
    onSuccess: () => { toast.success("Atualização publicada."); invalidate(); onClose(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const updateMutation = trpc.updates.update.useMutation({
    onSuccess: () => { toast.success("Atualização salva."); invalidate(); onClose(); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim()) return;
    if (item) {
      updateMutation.mutate({ id: item.id, titulo: titulo.trim(), descricao: descricao.trim(), categoria });
    } else {
      createMutation.mutate({ titulo: titulo.trim(), descricao: descricao.trim(), categoria });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md dialog-mobile">
        <DialogHeader>
          <DialogTitle className="text-base">
            {item ? "Editar atualização" : "Nova atualização"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="upd-titulo" className="text-xs text-muted-foreground">Título *</Label>
            <Input
              id="upd-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Recibo agora mostra o desconto"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="upd-categoria" className="text-xs text-muted-foreground">Categoria</Label>
            <Select value={categoria} onValueChange={(v) => setCategoria(v as Categoria)}>
              <SelectTrigger id="upd-categoria" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="novidade">Novidade</SelectItem>
                <SelectItem value="melhoria">Melhoria</SelectItem>
                <SelectItem value="correcao">Correção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="upd-descricao" className="text-xs text-muted-foreground">Descrição *</Label>
            <Textarea
              id="upd-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Explique em poucas linhas, em palavras simples, o que mudou pra ela."
              rows={5}
              maxLength={5000}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Salvando..." : item ? "Salvar" : "Publicar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
