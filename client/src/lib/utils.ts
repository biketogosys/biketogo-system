import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// LOTE-3: helper central de erros amigáveis
export function friendlyError(
  err: unknown,
  fallback = "Algo deu errado. Tente novamente."
): string {
  console.error(err); // detalhe técnico só no console
  const e = err as any;
  const code: string | undefined = e?.data?.code;
  const map: Record<string, string> = {
    UNAUTHORIZED: "Sessão expirada. Faça login novamente.",
    FORBIDDEN: "Você não tem permissão para essa ação.",
    NOT_FOUND: "Registro não encontrado.",
    CONFLICT: "Já existe um registro com esses dados.",
    PRECONDITION_FAILED: "Não foi possível concluir: item indisponível no período.",
    PAYLOAD_TOO_LARGE: "Arquivo muito grande.",
    TOO_MANY_REQUESTS: "Muitas tentativas. Aguarde um instante.",
  };
  const msg = typeof e?.message === "string" ? e.message.trim() : "";
  // JSON do zod (começa com "[" ou contém "code":) => mensagem genérica de validação
  if (msg.startsWith("[") || msg.includes('"code"'))
    return "Dados inválidos. Verifique os campos e tente novamente.";
  if (code && map[code]) return map[code];
  // mensagens curtas e humanas do próprio servidor (pt) passam direto
  if (msg && msg.length <= 140 && !msg.includes("{") && !/error/i.test(msg))
    return msg;
  return fallback;
}
