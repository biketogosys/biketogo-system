/**
 * Diárias cobradas — lado do CLIENTE (2026-08-18).
 *
 * ⚠️ **ESPELHO do `billableDaysWithTime`** de `server/rental-period.ts`. Se as
 * duas divergirem, a tela mostra um valor e o banco grava outro. Mora aqui, e
 * não dentro do modal, para ter teste próprio: já existiam QUATRO cópias desta
 * conta no projeto e duas passaram a divergir em silêncio quando a régua virou
 * blocos de 24h.
 */

/** "HH:MM" → minutos desde a meia-noite; null se não for hora válida. */
export function minutosDoDia(hora?: string | null): number | null {
  if (!hora) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Com horário nas duas pontas: blocos de 24h a partir da entrega.
 * Sem horário: dia de calendário (contratos anteriores à migração 0022).
 *
 * Sem tolerância, de propósito: 24h01 já é a segunda diária. A folga é humana
 * (a loja simplesmente não edita o contrato), não do código.
 */
export function diariasCobradas(
  startDate: string,
  endDate: string,
  startTime?: string | null,
  endTime?: string | null,
): number {
  if (!startDate || !endDate) return 1;
  const diffDias = Math.round(
    (Date.parse(endDate) - Date.parse(startDate)) / (1000 * 60 * 60 * 24),
  );

  const inicio = minutosDoDia(startTime);
  const fim = minutosDoDia(endTime);
  if (inicio == null || fim == null) return Math.max(1, diffDias);

  const totalMinutos = diffDias * 24 * 60 + (fim - inicio);
  if (totalMinutos <= 0) return 1;
  return Math.max(1, Math.ceil(totalMinutos / (24 * 60)));
}

/**
 * Rede de segurança dos campos de data/hora (2026-08-19).
 *
 * ⚠️ Existe por causa de um relato da Cassiana: ela preencheu data e horário,
 * os campos mostravam os valores, mas o sistema continuou dizendo "escolha o
 * período primeiro" e não liberou a bike — o que ela digitou apareceu na tela
 * mas não chegou ao estado do React.
 *
 * `onChange` depende de o navegador avisar a cada tecla. Quando isso falha
 * (input date/time tem histórico de inconsistência), o valor fica preso na tela
 * e o formulário trava sem explicação. Ler de novo quando o campo perde o foco
 * cobre o buraco: sair do campo é exatamente o que se faz para clicar na bike.
 *
 * Devolve o valor a aplicar, ou `null` quando não há nada a fazer — assim não
 * causa render extra em quem já estava funcionando.
 */
export function valorASincronizar(
  valorNoCampo: string,
  valorNoEstado: string,
): string | null {
  if (!valorNoCampo) return null;
  if (valorNoCampo === valorNoEstado) return null;
  return valorNoCampo;
}
