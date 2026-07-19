// ─── M1: devolução com optimistic update ─────────────────────────────────────
// A ação diária da Cassiana. Antes esperava o round-trip inteiro (no 4G da
// rua parecia travado); agora a linha some na hora e só volta se o servidor
// recusar. Hook compartilhado por Dashboard e Agenda — a lógica de cache
// vive num lugar só.
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/** Remove o aluguel de todas as listas (arrays) do objeto cacheado. */
function dropRental<T>(data: T, rentalId: number): T {
  if (!data || typeof data !== "object") return data;
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    next[k] = Array.isArray(v)
      ? v.filter((it: { id?: number }) => it?.id !== rentalId)
      : v;
  }
  return next as T;
}

export function useMarkReturned() {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  // Chaves parciais: pegam TODAS as variantes cacheadas (a agenda é keyed
  // por {from,to}, então cada semana visitada tem seu próprio cache).
  const returnsKey = getQueryKey(trpc.dashboard.returns);
  const agendaKey = getQueryKey(trpc.dashboard.agenda);

  return trpc.dashboard.markReturned.useMutation({
    onMutate: async ({ rentalId }) => {
      // Cancela refetches em voo — senão a resposta antiga sobrescreve o
      // update otimista e a linha "volta" por um instante.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: returnsKey }),
        queryClient.cancelQueries({ queryKey: agendaKey }),
      ]);
      const prev = [
        ...queryClient.getQueriesData({ queryKey: returnsKey }),
        ...queryClient.getQueriesData({ queryKey: agendaKey }),
      ];
      queryClient.setQueriesData({ queryKey: returnsKey }, (d: unknown) => dropRental(d, rentalId));
      queryClient.setQueriesData({ queryKey: agendaKey }, (d: unknown) => dropRental(d, rentalId));
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      // Rollback: devolve cada cache ao estado anterior.
      for (const [key, data] of ctx?.prev ?? []) queryClient.setQueryData(key, data);
      toast.error(e.message || "Não foi possível registrar a devolução.");
    },
    onSuccess: () => toast.success("Devolução registrada."),
    onSettled: () => {
      utils.dashboard.returns.invalidate();
      utils.dashboard.agenda.invalidate();
      utils.dashboard.summary.invalidate();
    },
  });
}
