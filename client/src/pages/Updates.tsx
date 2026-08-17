import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CategoriaBadge,
  formatarDataAtualizacao,
  type UpdateItem,
} from "@/components/UpdateCategoria";

/**
 * Aba Atualizações — **leitura pura** (2026-08-17, 2ª volta).
 *
 * Ninguém publica por aqui, nem o admin: quem escreve entra pela página
 * separada `/publicar-atualizacoes`, com credencial própria. Esta tela é o que
 * a loja abre para saber o que mudou, e por isso não tem botão, lápis nem
 * lixeira — o feed é comunicado, não caixa de entrada editável.
 */
export default function Updates() {
  const utils = trpc.useUtils();

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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Atualizações</h1>
          <p className="text-xs text-muted-foreground">O que mudou no sistema</p>
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState
            icon={Sparkles}
            title="Nenhuma atualização ainda"
            description="Quando o sistema receber melhorias, correções ou novidades, elas aparecem aqui."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => (
            <div key={item.id} className="bg-card border border-border rounded-xl p-4 md:p-5">
              <div className="flex items-center gap-2 min-w-0">
                <CategoriaBadge categoria={item.categoria} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatarDataAtualizacao(item.criadoEm)}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-foreground mt-2">{item.titulo}</h2>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">
                {item.descricao}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
