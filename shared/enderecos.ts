// ─── Endereço conforme o país ────────────────────────────────────────────────
// Decisão da dona (2026-10-26): *"O endereço é o do cliente mesmo, então tem que
// ser conforme o país. O endereço da hospedagem não precisa ter, eles fazem
// muita bagunça com isso"*.
//
// Antes, o endereço era brasileiro para todo mundo: CEP de 8 números (letras
// apagadas na digitação), uma das 27 UFs obrigatória e país fixo "Brasil" no
// código. Turista dos EUA (ZIP de 5), da Itália (CAP) ou da Argentina (CPA com
// letras) não conseguia informar o endereço de casa.
//
// Regras:
// - **Brasil** continua como sempre: CEP com máscara e busca no ViaCEP, UF,
//   número e bairro.
// - **Outro país** vira endereço internacional: linha 1 (rua e número), linha 2,
//   cidade, região e código postal com o NOME e o EXEMPLO do país. O formato do
//   código NÃO é validado: um código recusado por engano trava o cadastro do
//   turista, e aqui o endereço é registro do contrato, não entrega de correio.
// - Os nomes de país são os de `client/src/lib/countries.ts` (em português),
//   que é a lista do formulário e o que fica gravado em `clients.country`.
//
// Lado do servidor e do cliente leem daqui: formulário público, cadastro
// manual, perfil e PDF do contrato.

export type IdiomaEndereco = "pt" | "en" | "es";
type Texto = Record<IdiomaEndereco, string>;

export type FormatoEndereco = {
  brasil: boolean;
  /** Nome do código postal no país ("CEP", "ZIP code", "CAP"...). */
  codigo: Texto;
  exemploCodigo: string;
  codigoObrigatorio: boolean;
  /** Estado, província, região... `null` quando o endereço do país não usa. */
  regiao: Texto | null;
  exemploRegiao: string;
  regiaoObrigatoria: boolean;
};

const mesmo = (s: string): Texto => ({ pt: s, en: s, es: s });

const ESTADO: Texto = { pt: "Estado", en: "State", es: "Estado" };
const PROVINCIA: Texto = { pt: "Província", en: "Province", es: "Provincia" };
const DEPARTAMENTO: Texto = { pt: "Departamento", en: "Department", es: "Departamento" };
const CODIGO_POSTAL: Texto = { pt: "Código postal", en: "Postal code", es: "Código postal" };

const BRASIL: FormatoEndereco = {
  brasil: true,
  codigo: mesmo("CEP"), exemploCodigo: "00000-000", codigoObrigatorio: true,
  regiao: ESTADO, exemploRegiao: "SC", regiaoObrigatoria: true,
};

/** País sem regra própria: tudo genérico, código postal opcional. */
const GENERICO: FormatoEndereco = {
  brasil: false,
  codigo: CODIGO_POSTAL, exemploCodigo: "", codigoObrigatorio: false,
  regiao: { pt: "Estado / Província / Região", en: "State / Province / Region", es: "Estado / Provincia / Región" },
  exemploRegiao: "", regiaoObrigatoria: false,
};

/** Países de onde a loja mais recebe turistas, com o formato local. */
const PAISES: Record<string, Partial<FormatoEndereco>> = {
  "Argentina": { codigo: { pt: "Código postal (CPA)", en: "Postal code (CPA)", es: "Código postal (CPA)" }, exemploCodigo: "C1425ABC", codigoObrigatorio: true, regiao: PROVINCIA, exemploRegiao: "Buenos Aires", regiaoObrigatoria: true },
  "Uruguai": { codigo: CODIGO_POSTAL, exemploCodigo: "11000", codigoObrigatorio: true, regiao: DEPARTAMENTO, exemploRegiao: "Montevideo", regiaoObrigatoria: true },
  "Chile": { codigo: CODIGO_POSTAL, exemploCodigo: "8320000", codigoObrigatorio: true, regiao: { pt: "Região", en: "Region", es: "Región" }, exemploRegiao: "Metropolitana", regiaoObrigatoria: true },
  "Paraguai": { codigo: CODIGO_POSTAL, regiao: DEPARTAMENTO, exemploRegiao: "Central" },
  "Colômbia": { codigo: CODIGO_POSTAL, exemploCodigo: "110111", codigoObrigatorio: true, regiao: DEPARTAMENTO, exemploRegiao: "Cundinamarca", regiaoObrigatoria: true },
  "Peru": { codigo: CODIGO_POSTAL, exemploCodigo: "15001", codigoObrigatorio: true, regiao: { pt: "Região", en: "Region", es: "Región" }, exemploRegiao: "Lima" },
  "México": { codigo: CODIGO_POSTAL, exemploCodigo: "06000", codigoObrigatorio: true, regiao: ESTADO, exemploRegiao: "CDMX", regiaoObrigatoria: true },
  "Estados Unidos": { codigo: mesmo("ZIP code"), exemploCodigo: "10001", codigoObrigatorio: true, regiao: ESTADO, exemploRegiao: "NY", regiaoObrigatoria: true },
  "Canadá": { codigo: { pt: "Código postal", en: "Postal code", es: "Código postal" }, exemploCodigo: "K1A 0B1", codigoObrigatorio: true, regiao: PROVINCIA, exemploRegiao: "ON", regiaoObrigatoria: true },
  "Reino Unido": { codigo: mesmo("Postcode"), exemploCodigo: "SW1A 1AA", codigoObrigatorio: true, regiao: { pt: "Condado", en: "County", es: "Condado" }, exemploRegiao: "" },
  "Irlanda": { codigo: mesmo("Eircode"), exemploCodigo: "D02 X285", regiao: { pt: "Condado", en: "County", es: "Condado" }, exemploRegiao: "Dublin" },
  "Portugal": { codigo: CODIGO_POSTAL, exemploCodigo: "1000-001", codigoObrigatorio: true, regiao: { pt: "Distrito", en: "District", es: "Distrito" }, exemploRegiao: "Lisboa" },
  "Espanha": { codigo: CODIGO_POSTAL, exemploCodigo: "28001", codigoObrigatorio: true, regiao: PROVINCIA, exemploRegiao: "Madrid", regiaoObrigatoria: true },
  "Itália": { codigo: { pt: "CAP (código postal)", en: "CAP (postal code)", es: "CAP (código postal)" }, exemploCodigo: "00184", codigoObrigatorio: true, regiao: PROVINCIA, exemploRegiao: "RM", regiaoObrigatoria: true },
  "França": { codigo: mesmo("Code postal"), exemploCodigo: "75001", codigoObrigatorio: true, regiao: null },
  "Alemanha": { codigo: { pt: "PLZ (código postal)", en: "PLZ (postal code)", es: "PLZ (código postal)" }, exemploCodigo: "10115", codigoObrigatorio: true, regiao: null },
  "Áustria": { codigo: { pt: "PLZ (código postal)", en: "PLZ (postal code)", es: "PLZ (código postal)" }, exemploCodigo: "1010", codigoObrigatorio: true, regiao: null },
  "Suíça": { codigo: CODIGO_POSTAL, exemploCodigo: "8001", codigoObrigatorio: true, regiao: { pt: "Cantão", en: "Canton", es: "Cantón" }, exemploRegiao: "ZH" },
  "Bélgica": { codigo: CODIGO_POSTAL, exemploCodigo: "1000", codigoObrigatorio: true, regiao: null },
  "Holanda": { codigo: mesmo("Postcode"), exemploCodigo: "1012 AB", codigoObrigatorio: true, regiao: null },
  "Países Baixos": { codigo: mesmo("Postcode"), exemploCodigo: "1012 AB", codigoObrigatorio: true, regiao: null },
  "Austrália": { codigo: mesmo("Postcode"), exemploCodigo: "2000", codigoObrigatorio: true, regiao: ESTADO, exemploRegiao: "NSW", regiaoObrigatoria: true },
};

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * Brasil é o padrão quando o país está vazio: todo cadastro anterior a esta
 * mudança foi gravado com "Brasil" (fixo no formulário) ou sem país.
 */
export function ehBrasil(pais: string | null | undefined): boolean {
  const p = normalizar(pais ?? "");
  return p === "" || p === "brasil" || p === "brazil";
}

export function formatoEndereco(pais: string | null | undefined): FormatoEndereco {
  if (ehBrasil(pais)) return BRASIL;
  const alvo = normalizar(pais ?? "");
  const nome = Object.keys(PAISES).find((k) => normalizar(k) === alvo);
  return nome ? { ...GENERICO, ...PAISES[nome] } : GENERICO;
}

/** "Argentina (+54)" (valor do select de origem do documento) → "Argentina". */
export function paisDaOrigem(origem: string | null | undefined): string {
  const m = /^(.*?)\s*\(\+\d+\)$/.exec((origem ?? "").trim());
  return m ? m[1] : "";
}

/**
 * Endereço numa linha, para o contrato (caixa do LOCATÁRIO no PDF).
 * Brasil: "Rua X, 123 (Apto 4) · Bairro · Cidade/UF · CEP 00000-000".
 * Exterior: "123 Main St (Apt 4) · New York · NY · 10001 · Estados Unidos",
 * sem o rótulo "CEP" e com o país, que é o que localiza o resto.
 */
export function enderecoEmLinha(c: {
  street?: string | null; number?: string | null; complement?: string | null;
  neighborhood?: string | null; city?: string | null; state?: string | null;
  zipCode?: string | null; country?: string | null;
} | null | undefined): string | null {
  if (!c) return null;
  const v = (s?: string | null) => (s ?? "").trim();
  const compl = v(c.complement) ? ` (${v(c.complement)})` : "";

  const partes = ehBrasil(c.country)
    ? [
        [v(c.street), v(c.number)].filter(Boolean).join(", ") + compl,
        v(c.neighborhood),
        [v(c.city), v(c.state)].filter(Boolean).join("/"),
        v(c.zipCode) ? `CEP ${v(c.zipCode)}` : "",
      ]
    : [
        [v(c.street), v(c.number)].filter(Boolean).join(", ") + compl,
        v(c.neighborhood),
        v(c.city),
        v(c.state),
        v(c.zipCode),
        v(c.country),
      ];
  const limpas = partes.map((p) => p.trim()).filter(Boolean);
  return limpas.length ? limpas.join(" · ") : null;
}
