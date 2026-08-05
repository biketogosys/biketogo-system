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

  // ERRO DE REDE, antes de tudo: aqui a promessa do fetch rejeita ANTES de
  // existir resposta, então não há `data.code` nem mensagem do servidor — a tela
  // mostrava o "Failed to fetch" cru do navegador, que não diz o que aconteceu e
  // ainda dá a impressão de que a culpa foi de quem clicou. Cada navegador tem
  // seu texto: Chrome "Failed to fetch", Firefox "NetworkError...", Safari
  // "Load failed", iOS "The Internet connection appears to be offline".
  const causa = typeof e?.cause?.message === "string" ? e.cause.message : "";
  const pareceRede = /failed to fetch|networkerror|network request failed|load failed|connection appears to be offline|err_internet_disconnected/i;
  if (!code && (pareceRede.test(msg) || pareceRede.test(causa))) {
    return typeof navigator !== "undefined" && navigator.onLine === false
      ? "Você está sem internet. Reconecte e tente de novo."
      : "Sem conexão com o servidor. Verifique a internet e tente de novo em alguns instantes.";
  }

  // JSON do zod (começa com "[" ou contém "code":) => mensagem genérica de validação
  if (msg.startsWith("[") || msg.includes('"code"'))
    return "Dados inválidos. Verifique os campos e tente novamente.";

  // ⚠️ A mensagem do SERVIDOR vem antes do mapa por código: o servidor sabe o
  // caso concreto, o mapa só sabe o código. Enquanto foi o contrário, qualquer
  // PRECONDITION_FAILED virava "item indisponível no período" — inclusive
  // "Este contrato já teve o pagamento confirmado" e "O cliente não tem e-mail
  // no cadastro", que não têm nada a ver com disponibilidade.
  // "Mensagem humana" = frase para gente ler. Não vale o próprio código do erro
  // (`PRECONDITION_FAILED`), que alguns caminhos usam como mensagem — esse cai
  // no mapa logo abaixo.
  const pareceCodigo = /^[A-Z][A-Z0-9_]*$/.test(msg);
  const humana = msg && msg.length <= 140 && !msg.includes("{") && !/error/i.test(msg) && !pareceCodigo;
  if (humana) return msg;

  if (code && map[code]) return map[code];
  return fallback;
}
