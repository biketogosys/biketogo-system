import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff, Sparkles, Pencil, Trash2, Plus, LogOut, X } from "lucide-react";
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
import { useConfirm } from "@/components/ConfirmDialog";
import { friendlyError } from "@/lib/utils";
import {
  CATEGORIAS,
  CategoriaBadge,
  formatarDataAtualizacao,
  type Categoria,
  type UpdateItem,
} from "@/components/UpdateCategoria";

/**
 * `/publicar-atualizacoes` — página ESCONDIDA de publicação do changelog
 * (2026-08-17, pedido do Matheus).
 *
 * ⚠️ Não é o painel: fica **fora** do `ProtectedRoute`, não aparece na sidebar
 * e não usa a sessão do sistema. A credencial é separada (variável de ambiente,
 * não é linha de `admin_users`), então estar logado como admin não dá acesso
 * aqui — e entrar aqui não dá acesso a nada do sistema.
 *
 * O servidor é quem barra: as mutations de publicar/editar/apagar exigem o
 * cookie `btg_publicador`. Esta tela só decide o que desenhar.
 */
export default function PublishUpdates() {
  const utils = trpc.useUtils();
  const { data: sessao, isLoading } = trpc.updates.souPublicador.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessao?.autenticado) {
    return (
      <LoginPublicador
        configurado={sessao?.configurado ?? false}
        onEntrou={() => utils.updates.souPublicador.invalidate()}
      />
    );
  }

  return <PainelPublicacao onSair={() => utils.updates.souPublicador.invalidate()} />;
}

// ─── Tela de login ───────────────────────────────────────────────────────────

function LoginPublicador({
  configurado,
  onEntrou,
}: {
  configurado: boolean;
  onEntrou: () => void;
}) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const login = trpc.updates.loginPublicador.useMutation({
    onSuccess: () => {
      toast.success("Tudo certo.");
      onEntrou();
    },
    onError: (e) => toast.error(friendlyError(e, "Usuário ou senha incorretos.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim()) return toast.error("Informe o usuário.");
    if (!senha) return toast.error("Informe a senha.");
    login.mutate({ usuario: usuario.trim(), senha });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Publicar atualizações
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Área restrita ao desenvolvedor
            </p>
          </div>

          <div className="mx-8 border-t border-border" />

          {/* Sem as variáveis no servidor ninguém entra — dizer isso é melhor
              que deixar a pessoa achando que errou a senha. */}
          {!configurado ? (
            <div className="px-8 py-8 text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                A publicação ainda não foi configurada neste servidor.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2 leading-relaxed">
                Defina <code className="font-mono">PUBLICADOR_USUARIO</code> e{" "}
                <code className="font-mono">PUBLICADOR_SENHA_HASH</code> nas variáveis de ambiente.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pub-usuario" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Usuário
                </Label>
                <Input
                  id="pub-usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  maxLength={200}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pub-senha" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="pub-senha"
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="current-password"
                    maxLength={200}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={login.isPending} className="w-full gap-2">
                {login.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Painel de publicação ────────────────────────────────────────────────────

function PainelPublicacao({ onSair }: { onSair: () => void }) {
  const utils = trpc.useUtils();
  const confirmDialog = useConfirm();
  const [editando, setEditando] = useState<UpdateItem | null>(null);
  const [formAberto, setFormAberto] = useState(false);

  const { data, isLoading } = trpc.updates.list.useQuery({ limit: 100 });
  const itens = (data?.items ?? []) as UpdateItem[];

  const logout = trpc.updates.logoutPublicador.useMutation({
    onSuccess: () => {
      toast.success("Você saiu.");
      onSair();
    },
  });

  const apagar = trpc.updates.delete.useMutation({
    onSuccess: () => {
      toast.success("Atualização removida.");
      utils.updates.list.invalidate();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const handleDelete = async (item: UpdateItem) => {
    const ok = await confirmDialog({
      title: "Remover esta atualização?",
      description: `"${item.titulo}" some da lista que a loja vê.`,
      confirmText: "Remover",
      destructive: true,
    });
    if (ok) apagar.mutate({ id: item.id });
  };

  const abrirNova = () => { setEditando(null); setFormAberto(true); };
  const abrirEdicao = (item: UpdateItem) => { setEditando(item); setFormAberto(true); };
  const fechar = () => { setFormAberto(false); setEditando(null); };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">Publicar atualizações</h1>
              <p className="text-xs text-muted-foreground truncate">
                O que você postar aqui aparece para a loja
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate()}
            className="gap-2 shrink-0"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>

        {/* Formulário (inline, não modal: esta página existe só para isso) */}
        {formAberto ? (
          <FormularioAtualizacao
            key={editando?.id ?? "novo"}
            item={editando}
            onPronto={fechar}
            onCancelar={fechar}
          />
        ) : (
          <Button onClick={abrirNova} className="w-full gap-2 mb-5">
            <Plus className="size-4" />
            Nova atualização
          </Button>
        )}

        {/* Lista do que já foi publicado */}
        <div className="mt-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Publicadas
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : itens.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nada publicado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {itens.map((item) => (
                <div key={item.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <CategoriaBadge categoria={item.categoria} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatarDataAtualizacao(item.criadoEm)}
                      </span>
                    </div>
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
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mt-2">{item.titulo}</h3>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">
                    {item.descricao}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Formulário ──────────────────────────────────────────────────────────────

function FormularioAtualizacao({
  item,
  onPronto,
  onCancelar,
}: {
  item: UpdateItem | null;
  onPronto: () => void;
  onCancelar: () => void;
}) {
  const utils = trpc.useUtils();
  const [titulo, setTitulo] = useState(item?.titulo ?? "");
  const [descricao, setDescricao] = useState(item?.descricao ?? "");
  const [categoria, setCategoria] = useState<Categoria>(item?.categoria ?? "melhoria");

  const invalidate = () => {
    utils.updates.list.invalidate();
    utils.updates.naoLidas.invalidate();
  };

  const criar = trpc.updates.create.useMutation({
    onSuccess: () => { toast.success("Publicado. A loja já consegue ver."); invalidate(); onPronto(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const editar = trpc.updates.update.useMutation({
    onSuccess: () => { toast.success("Atualização salva."); invalidate(); onPronto(); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const salvando = criar.isPending || editar.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return toast.error("Informe o título.");
    if (!descricao.trim()) return toast.error("Escreva a descrição.");
    if (item) {
      editar.mutate({ id: item.id, titulo: titulo.trim(), descricao: descricao.trim(), categoria });
    } else {
      criar.mutate({ titulo: titulo.trim(), descricao: descricao.trim(), categoria });
    }
  };

  const ajuda = CATEGORIAS.find((c) => c.valor === categoria)?.ajuda;

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          {item ? "Editar atualização" : "Nova atualização"}
        </h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancelar} aria-label="Fechar">
          <X className="size-4" />
        </Button>
      </div>

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
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.valor} value={c.valor}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {ajuda && <p className="text-xs text-muted-foreground/70">{ajuda}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="upd-descricao" className="text-xs text-muted-foreground">Descrição *</Label>
          <Textarea
            id="upd-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Explique em poucas linhas, em palavras simples, o que mudou para ela."
            rows={6}
            maxLength={5000}
          />
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancelar} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando} className="flex-1">
            {salvando ? "Salvando..." : item ? "Salvar" : "Publicar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
