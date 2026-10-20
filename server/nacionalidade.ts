// ─── Nacionalidade e documento do cliente ────────────────────────────────────
// Bug real (2026-10-20): o /reservar decide brasileiro × estrangeiro pela
// "origem do documento" e manda CPF/RG OU passaporte, mas o servidor IGNORAVA a
// nacionalidade e gravava o passaporte na coluna `rg`. Em produção: os 50
// cadastros vindos do link estavam sem nacionalidade, 8 deles estrangeiros com
// o passaporte no RG. Consequências, todas vistas pela dona:
//   - o perfil mostrava "Brasileiro" para todo cadastro sem nacionalidade;
//   - editar o cliente exigia CPF (nacionalidade vazia era tratada como
//     brasileira), e estrangeiro não tem CPF: não salvava;
//   - o PDF imprimia o passaporte com o rótulo "RG";
//   - o aviso de cadastro repetido nunca achava passaporte repetido, porque a
//     busca olha `numero_passaporte`, que ficava vazio.
// Os cadastros antigos são corrigidos por `scripts/corrigir-nacionalidade-reservar.sql`.

export type Nacionalidade = "brasileiro" | "estrangeiro";

const limpo = (v?: string | null) => {
  const t = (v ?? "").trim();
  return t ? t : null;
};

/**
 * O que gravar a partir do formulário público. A nacionalidade vem do
 * formulário; formulário antigo (aba aberta antes do deploy) não manda, e aí
 * ela sai dos documentos: CPF é brasileiro, só passaporte é estrangeiro.
 */
export function documentosDoReservar(input: {
  nacionalidade?: Nacionalidade | null;
  cpf?: string | null;
  rg?: string | null;
  passport?: string | null;
}): {
  nacionalidade: Nacionalidade | null;
  cpf: string | null;
  rg: string | null;
  numeroPassaporte: string | null;
  tipoDocumento: "passaporte" | null;
} {
  const cpf = limpo(input.cpf);
  const rg = limpo(input.rg);
  // Mesmo formato do cadastro manual (que já digita em maiúsculas) e da busca
  // de duplicado, que compara em maiúsculas.
  const passaporte = limpo(input.passport)?.toUpperCase() ?? null;
  const nacionalidade = input.nacionalidade
    ?? (cpf ? "brasileiro" : passaporte ? "estrangeiro" : null);

  if (nacionalidade === "estrangeiro") {
    return { nacionalidade, cpf: null, rg: null, numeroPassaporte: passaporte, tipoDocumento: "passaporte" };
  }
  return { nacionalidade, cpf, rg, numeroPassaporte: null, tipoDocumento: null };
}

/**
 * Documento que vai na caixa do LOCATÁRIO no contrato, com o rótulo certo.
 * Estrangeiro sai com o passaporte; o resto, com o RG. Cobre também o cadastro
 * antigo que ainda tenha o passaporte na coluna `rg` (sai com o rótulo de RG,
 * como sempre saiu, até o script de correção rodar).
 */
export function documentoDoContrato(cliente: {
  nacionalidade?: string | null;
  rg?: string | null;
  numeroPassaporte?: string | null;
} | null | undefined): { valor: string | null; tipo: "rg" | "passaporte" } {
  const rg = limpo(cliente?.rg);
  const passaporte = limpo(cliente?.numeroPassaporte);
  if (passaporte && (cliente?.nacionalidade === "estrangeiro" || !rg)) {
    return { valor: passaporte, tipo: "passaporte" };
  }
  return { valor: rg, tipo: "rg" };
}
