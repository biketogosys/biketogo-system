/**
 * PDF DO CONTRATO — número de páginas (2026-09-05).
 *
 * **Relato da Cassiana (WhatsApp, 10:50):** *"tive que fazer uma alteração no
 * horário do contrato / fui gerar ele agora pra imprimir / bugou"*. O contrato
 * #30 saiu com **36 páginas** e 1,4 MB.
 *
 * **A causa, lida no próprio arquivo dela:** da página 2 à 34 cada página tinha
 * UM texto solto — "0009 - Espátulas", depois "ESP-040", depois
 * "05/09/2026 a 07/09/2026" — repetindo de três em três. É a tabela de
 * ACESSÓRIOS: ela não tinha quebra de página (a de bikes tem), então quando o
 * `y` passava do fim da folha o PDFKit abria uma página nova sozinho **a cada
 * `doc.text`** — e são 3 colunas por acessório. 11 acessórios = 33 páginas.
 *
 * A alteração de horário só foi o gatilho: qualquer regeração do PDF de um
 * contrato com muitos acessórios cai nisso.
 *
 * ⚠️ O PDF usa fonte EMBUTIDA (subset), então o texto não é conferível por
 * extração — por isso o que se mede aqui é a ESTRUTURA (contagem de páginas),
 * que é exatamente o que quebrou.
 */
import zlib from "zlib";
import { describe, expect, it, vi } from "vitest";
import { generateContractPdf, type ContractPdfData } from "./pdf";

// Cada caso gera um PDF de verdade; sob a suíte inteira em paralelo, 30s
// apertava e o teste ficava intermitente.
vi.setConfig({ testTimeout: 90_000 });

/** Conta as páginas lendo o próprio arquivo gerado. */
function contarPaginas(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

/**
 * Blocos de texto da ÚLTIMA página, fora o rodapé — serve para provar que a
 * assinatura não ficou sozinha (a folha final tem que trazer texto antes dela).
 *
 * ⚠️ Não dá para pegar "o último stream do arquivo": o rodapé é carimbado por
 * ÚLTIMO em todas as páginas, então o fim do arquivo é sempre rodapé. É preciso
 * seguir o objeto de página e o `/Contents` dele, que é como o PDF se organiza.
 */
function blocosDeTextoNaUltimaPagina(pdf: Buffer): number {
  const bruto = pdf.toString("latin1");

  // Ordem REAL das páginas: o /Kids do nó /Pages. Ordenar por número de objeto
  // não vale — o PDFKit não garante que uma coisa siga a outra.
  const kids = bruto.match(/\/Kids\s*\[([^\]]*)\]/);
  const ordem = [...(kids?.[1] ?? "").matchAll(/(\d+) 0 R/g)].map((m) => Number(m[1]));
  const ultimaPagina = ordem[ordem.length - 1];
  if (!ultimaPagina) return 0;

  // ⚠️ Achar o objeto pelo INÍCIO DE LINHA. Um `matchAll` de "N 0 obj" sobre o
  // arquivo inteiro casa dentro de stream binário e devolve objeto truncado —
  // foi assim que a primeira versão deste helper leu "página vazia" numa página
  // que tinha a assinatura.
  const candidatos = (n: number) => {
    const marca = "\n" + n + " 0 obj";
    const fatias: string[] = [];
    for (let i = bruto.indexOf(marca); i >= 0; i = bruto.indexOf(marca, i + 1)) {
      fatias.push(bruto.slice(i + marca.length));
    }
    return fatias;
  };

  const ref = (candidatos(ultimaPagina)[0] ?? "").match(/\/Contents\s+(\d+) 0 R/);
  if (!ref) return 0;

  // ⚠️ O tamanho do stream vem do `/Length` declarado, NUNCA de procurar
  // "endstream": são bytes binários e o corte por marcador erra.
  let raw = "";
  for (const conteudo of candidatos(Number(ref[1]))) {
    const len = conteudo.match(/\/Length\s+(\d+)/);
    const i = conteudo.indexOf("stream");
    if (!len || i < 0) continue;
    let de = i + "stream".length;
    while (conteudo[de] === "\r" || conteudo[de] === "\n") de++;
    const corpo = Buffer.from(conteudo.slice(de, de + Number(len[1])), "latin1");
    try {
      raw = zlib.inflateSync(corpo).toString("latin1");
      break;
    } catch {
      // sem compressão (stream pequeno): o corpo já é o conteúdo
      const cru = corpo.toString("latin1");
      if (cru.includes("Tm")) {
        raw = cru;
        break;
      }
    }
  }
  if (!raw) return -1; // não conseguiu ler: falhar alto é melhor que dizer "vazia"
  // o rodapé desta página entra junto: 2 textos (empresa + "Página X de Y")
  return Math.max(0, (raw.match(/Tm/g) ?? []).length - 2);
}

const contratoBase: ContractPdfData = {
  id: 30,
  criadoEm: new Date("2026-09-05T10:00:00Z"),
  valorTotal: "1188.00",
  client: {
    name: "Vanessa Gomes",
    cpf: "123.456.789-00",
    phone: "48999999999",
    email: "vanessa@exemplo.com",
  } as ContractPdfData["client"],
  rentals: [],
  accessories: [],
} as ContractPdfData;

/**
 * O que empurra a tabela de acessórios para o fim da folha: quanto conteúdo veio
 * antes. Com 1 bike ela ainda cabia e o bug não aparecia — foi assim que ele
 * passou despercebido até um contrato de verdade cruzar a borda.
 */
function bikes(n: number): ContractPdfData["rentals"] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1, bikeModel: "Road Basic - Domane AL 2 - 4ª geração", bikeBrand: "Trek", tamanho: "56",
    quantity: 1, startDate: "2026-09-05", endDate: "2026-09-07",
    startTime: "09:00", endTime: "18:00",
    dailyRate: "65.00", totalAmount: "195.00",
    bikeUnitNumeros: `RD-BSC-${256 - i}`,
    bikeSerialNumber: null, discountPercent: "10",
  })) as ContractPdfData["rentals"];
}

/**
 * Os acessórios do contrato #30 dela: **32 unidades** (capacete, cadeado, farol
 * dianteiro e traseiro, bomba, bolsa de selim, canivete). Lidos do PDF que ela
 * mandou: 21 linhas couberam na página 1 e as 11 restantes viraram 33 páginas.
 */
const NOMES = [
  "0003 - Capacete", "0004 - Cadeado", "0001 - Farol Dianteiro", "0002 - Farol Traseiro",
  "0005 - Bomba de Ar de Mão", "0006 - Bolsa de Selim", "0008 - Canivete Ferramentas",
];
function acessorios(n: number): ContractPdfData["accessories"] {
  return Array.from({ length: n }, (_, i) => ({
    accessoryName: NOMES[i % NOMES.length],
    serialNumber: `CAP-${String(20 + i).padStart(3, "0")}`,
    periodo: "05/09/2026 a 07/09/2026",
  })) as ContractPdfData["accessories"];
}

describe("PDF do contrato — não pode explodir em páginas", () => {
  it("contrato SEM acessórios cabe em poucas páginas (referência)", async () => {
    const pdf = await generateContractPdf({ ...contratoBase, rentals: bikes(1), accessories: [] });
    const paginas = contarPaginas(pdf);
    expect(paginas).toBeLessThanOrEqual(4);
  });

  /**
   * O gatilho é a tabela de acessórios CRUZAR a borda da folha, e onde ela
   * começa depende de quanto veio antes. Por isso a varredura: com 1 bike o bug
   * não aparecia, e foi assim que ele ficou escondido até o contrato dela.
   */
  /**
   * ⭐ O contrato #30, reconstruído do PDF que ela mandou: 3 bikes com desconto
   * e **32 acessórios**. Antes da correção saía com **36 páginas**.
   */
  it("o caso dela: 3 bikes + 32 acessórios não viram 36 páginas", async () => {
    const pdf = await generateContractPdf({
      ...contratoBase, rentals: bikes(3), accessories: acessorios(32),
    });
    expect(contarPaginas(pdf)).toBeLessThanOrEqual(5);
  });

  /**
   * O gatilho é a tabela CRUZAR a borda da folha, e onde ela começa depende de
   * quanto veio antes — por isso a varredura, e não um número mágico. Foi
   * exatamente por caber que o bug ficou escondido nos contratos menores.
   */
  it("nenhuma combinação de bikes × acessórios explode em páginas", async () => {
    const estouros: string[] = [];
    // Combinações concentradas na BORDA (é onde o bug vivia): 21 linhas é a
    // última que cabia na folha do contrato dela, 22 é a primeira que estourava.
    for (const nBikes of [1, 3, 8]) {
      for (const nAcc of [21, 22, 32]) {
        const pdf = await generateContractPdf({
          ...contratoBase, rentals: bikes(nBikes), accessories: acessorios(nAcc),
        });
        const paginas = contarPaginas(pdf);
        if (paginas > 7) estouros.push(`${nBikes} bikes × ${nAcc} acessórios = ${paginas} páginas`);
      }
    }
    expect(estouros).toEqual([]);
  });

  it("aguenta um contrato absurdo (60 acessórios) sem uma página por célula", async () => {
    const pdf = await generateContractPdf({ ...contratoBase, rentals: bikes(1), accessories: acessorios(60) });
    const paginas = contarPaginas(pdf);
    // 60 linhas de 16pt = ~960pt ≈ 2 páginas de tabela. Se cada célula virasse
    // página, seriam 180.
    expect(paginas).toBeLessThanOrEqual(8);
  });

  it("o tamanho do arquivo acompanha (a logo era reembutida em cada página)", async () => {
    const pdf = await generateContractPdf({ ...contratoBase, rentals: bikes(8), accessories: acessorios(11) });
    expect(pdf.length).toBeLessThan(600_000); // o dela saiu com 1,4 MB
  });
});

describe("PDF do contrato — o documento tem que se acomodar sozinho", () => {
  /**
   * Pedido da Cassiana (2026-09-05, 11:06): *"acabei de gerar outro contrato,
   * são 2 bikes, consequentemente 2 de tudo também. Ficou só a assinatura na
   * última página. Tem como ajustar pra ela não ficar 'sozinha' em uma página?"*
   *
   * O bloco de assinatura é ancorado no rodapé de propósito (o espaço em branco
   * tem que sobrar ACIMA da linha, é onde se assina), então ele não pode subir.
   * O que muda é o ÚLTIMO parágrafo dos termos, que desce junto com ele.
   */
  it("a assinatura nunca fica sozinha na última página", async () => {
    const sozinhas: string[] = [];
    for (const nBikes of [1, 2, 3, 4, 5, 6]) {
      for (const nAcc of [0, 2, 4, 8, 12, 20, 21, 22, 26, 32]) {
        const pdf = await generateContractPdf({
          ...contratoBase, rentals: bikes(nBikes), accessories: acessorios(nAcc),
        });
        // O bloco de assinatura sozinho são ~5 blocos de texto (2 nomes, 2
        // rótulos e o fecho). Se a última página tiver só isso, ficou órfã.
        const blocos = blocosDeTextoNaUltimaPagina(pdf);
        if (blocos <= 6) sozinhas.push(`${nBikes} bikes × ${nAcc} acessórios (${blocos} blocos)`);
      }
    }
    expect(sozinhas).toEqual([]);
  });

  /**
   * O que a pergunta do Matheus cobra de verdade: *"o pdf não é flexível? quanto
   * mais adiciona ou menos coisa tem, ele vai ficar quebrando assim?"*.
   *
   * O documento é desenhado por COORDENADA em várias seções, então ele só é
   * flexível onde existe guarda de quebra. Este teste varre a faixa inteira de
   * tamanhos reais e exige que o número de páginas cresça de forma previsível —
   * é o que pega uma seção nova sem guarda no futuro.
   */
  it("o número de páginas cresce de forma previsível em toda a faixa de tamanhos", async () => {
    const fora: string[] = [];
    for (const nBikes of [1, 3, 6, 10]) {
      for (const nAcc of [0, 5, 15, 25, 40, 60]) {
        const pdf = await generateContractPdf({
          ...contratoBase, rentals: bikes(nBikes), accessories: acessorios(nAcc),
        });
        const paginas = contarPaginas(pdf);
        // Teto honesto: 2 folhas fixas (capa + termos/assinatura) mais o que as
        // tabelas realmente ocupam (~30 linhas de bike e ~45 de acessório por
        // folha), com 1 de folga.
        const teto = 3 + Math.ceil(nBikes / 20) + Math.ceil(nAcc / 40);
        if (paginas > teto) fora.push(`${nBikes} bikes × ${nAcc} acessórios = ${paginas} páginas (teto ${teto})`);
      }
    }
    expect(fora).toEqual([]);
  });

  /**
   * A seção de Valores também é desenhada por coordenada e cresce com caução,
   * forma de pagamento e um ajuste por bike devolvida antes do combinado — foi
   * a segunda seção sem guarda, achada na auditoria de 2026-09-05.
   */
  it("Valores com caução, forma de pagamento e vários ajustes não estoura", async () => {
    const ajustes = Array.from({ length: 6 }, (_, i) => ({
      data: "2026-09-06", diariasDe: 3, diariasPara: 2,
      valorDe: "396.00", valorPara: "264.00", bikeId: i + 1,
    }));
    const pdf = await generateContractPdf({
      ...contratoBase,
      rentals: bikes(6),
      accessories: acessorios(20),
      paymentMethod: "pix",
      ajustes,
    } as ContractPdfData);
    expect(contarPaginas(pdf)).toBeLessThanOrEqual(5);
  });
});
