/**
 * RG brasileiro: cada estado tem o seu formato, e não existe dígito
 * verificador comum a todos.
 *
 * Caso real (2026-11-06): RG de Minas vem com letras ("MG-12.345.678") e o
 * cadastro não aceitava. A máscara apagava as letras e a validação só aceitava
 * o formato de SP: números com X no fim, de 7 a 9 caracteres. RG com mais de
 * 9 dígitos (o do RS tem 10) também não cabia: a máscara cortava o último
 * dígito sem avisar.
 *
 * A regra pega erro de digitação, não confere documento: de 7 a 14 letras e
 * números, pelo menos 6 deles dígitos. Server e as duas telas usam esta.
 */

/** Sem pontuação nem espaço, em maiúsculas: "mg-12.345.678" → "MG12345678". */
export function limparRG(rg: string): string {
  return rg.toUpperCase().replace(/[.\-\s/]/g, "");
}

export function rgValido(rg: string): boolean {
  const limpo = limparRG(rg);
  if (!/^[A-Z0-9]{7,14}$/.test(limpo)) return false;
  return (limpo.match(/\d/g)?.length ?? 0) >= 6;
}

/**
 * Máscara do campo. Só número (até 9, com X no fim) ganha o formato de SP,
 * como sempre ganhou. Mais de 9 dígitos fica sem pontuação; com letra, fica
 * como a pessoa digitou, porque cada estado pontua de um jeito.
 */
export function mascararRG(valor: string): string {
  const digitado = valor.toUpperCase().replace(/[^A-Z0-9.\-\s/]/g, "").slice(0, 20);
  const limpo = limparRG(digitado);
  if (/^\d{0,8}[\dX]?$/.test(limpo)) {
    if (limpo.length <= 2) return limpo;
    if (limpo.length <= 5) return limpo.replace(/(\d{2})(\d)/, "$1.$2");
    if (limpo.length <= 8) return limpo.replace(/(\d{2})(\d{3})(\d)/, "$1.$2.$3");
    return limpo.replace(/(\d{2})(\d{3})(\d{3})([\dX])/, "$1.$2.$3-$4");
  }
  if (/^\d+$/.test(limpo)) return limpo.slice(0, 14);
  return digitado;
}
