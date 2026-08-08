import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

// ─── Log de duração por operação ─────────────────────────────────────────────
/**
 * Nasceu da queixa "o sistema está meio lento" (2026-08-06): ninguém sabia ONDE
 * o tempo era gasto em produção, e sem número qualquer otimização é chute. Uma
 * linha por chamada, com prefixo greppável no log do Railway:
 *
 *   [perf] contracts.getById query 412ms ok
 *   [perf] contracts.update mutation 2318ms ok LENTO
 *   [perf] auth.login mutation 89ms erro=UNAUTHORIZED
 *
 * `grep LENTO` dá a lista curta do que dói; o corte sai de `PERF_SLOW_MS`
 * (padrão 1000ms). Mede o tempo da PROCEDURE inteira, não do banco: para saber
 * se o custo é rede ou consulta, é preciso instrumentar o `db` também.
 *
 * ⚠️ Silencioso na suíte (`VITEST`/`NODE_ENV=test`): são centenas de chamadas e
 * o ruído esconderia a saída do próprio teste.
 */
const PERF_SLOW_MS = Number(process.env.PERF_SLOW_MS) || 1000;
const PERF_QUIETO = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

const perfLog = t.middleware(async ({ path, type, next }) => {
  if (PERF_QUIETO) return next();

  const inicio = performance.now();
  const res = await next();
  const ms = Math.round(performance.now() - inicio);
  const marca = ms >= PERF_SLOW_MS ? " LENTO" : "";

  if (res.ok) {
    console.log(`[perf] ${path} ${type} ${ms}ms ok${marca}`);
  } else {
    const codigo = res.error instanceof TRPCError ? res.error.code : "ERRO";
    console.log(`[perf] ${path} ${type} ${ms}ms erro=${codigo}${marca}`);
  }
  return res;
});

/**
 * Base de TODAS as procedures. O `adminAuthProcedure`/`adminOnlyProcedure` do
 * `routers.ts` derivam do `publicProcedure`, então medir aqui cobre o app
 * inteiro sem precisar tocar em cada procedure.
 */
const baseProcedure = t.procedure.use(perfLog);

export const publicProcedure = baseProcedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = baseProcedure.use(requireUser);

export const adminProcedure = baseProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
