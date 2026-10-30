/**
 * Foto do documento no /reservar: reduzir antes de enviar e insistir no envio.
 *
 * Caso real (2026-10-29): dois dos 25 cadastros do link em outubro (clientes
 * 100 e 104) terminaram sem documento, e os outros 23 chegaram. O formulário exige
 * a foto, mas o envio acontece DEPOIS do cadastro gravado e a falha era
 * engolida: a tela dizia "concluído" e a loja só descobriu abrindo o perfil.
 * A foto ia no tamanho do celular (3 a 8 MB) pela internet de turista.
 *
 * Mora aqui, e não na página, para ter teste próprio.
 */

/** Lado maior da foto enviada. Passaporte e CNH continuam legíveis com folga. */
export const LADO_MAXIMO = 2000;
const QUALIDADE_JPEG = 0.85;

/** Encolhe mantendo a proporção; foto já pequena não é ampliada. */
export function dimensoesReduzidas(
  largura: number,
  altura: number,
  maximo = LADO_MAXIMO,
): { largura: number; altura: number } {
  const maior = Math.max(largura, altura);
  if (maior <= maximo) return { largura, altura };
  const fator = maximo / maior;
  return { largura: Math.round(largura * fator), altura: Math.round(altura * fator) };
}

/** Tamanho em bytes do arquivo que um data URL base64 representa. */
export function bytesDoDataUrl(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

function lerComoDataUrl(arquivo: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result as string);
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(arquivo);
  });
}

function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagem ilegível")); };
    img.src = url;
  });
}

/**
 * Foto reduzida a JPEG de até LADO_MAXIMO px; PDF passa como veio.
 *
 * Se o navegador não conseguir abrir a imagem (HEIC fora do Safari, por
 * exemplo), vai o arquivo original: reduzir é ganho, não condição para enviar.
 * O <img> já aplica a rotação EXIF, então a foto tirada em pé continua em pé.
 */
export async function prepararFoto(arquivo: File): Promise<{ base64: string; mime: string }> {
  const mimeOriginal = arquivo.type || "image/jpeg";
  const original = async () => ({ base64: await lerComoDataUrl(arquivo), mime: mimeOriginal });
  if (!mimeOriginal.startsWith("image/")) return original();
  try {
    const img = await carregarImagem(arquivo);
    const { largura, altura } = dimensoesReduzidas(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original();
    // Fundo branco: PNG com transparência viraria preto no JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, largura, altura);
    ctx.drawImage(img, 0, 0, largura, altura);
    const reduzida = canvas.toDataURL("image/jpeg", QUALIDADE_JPEG);
    // Foto que já era leve pode ficar MAIOR ao virar JPEG: aí vai a original.
    if (bytesDoDataUrl(reduzida) >= arquivo.size) return original();
    return { base64: reduzida, mime: "image/jpeg" };
  } catch {
    return original();
  }
}

/**
 * Envia com até `tentativas` chamadas e diz se o documento chegou.
 *
 * - `FORBIDDEN` é o servidor dizendo que aquele lado JÁ tem arquivo: a
 *   tentativa anterior gravou e a resposta se perdeu no caminho. Chegou.
 * - `BAD_REQUEST` (arquivo recusado) e `UNAUTHORIZED` (sessão de envio
 *   vencida, 2h) não mudam na segunda vez: para na hora.
 * - O resto (rede caindo, servidor fora) vale insistir.
 */
export async function enviarComRetentativa(
  enviar: () => Promise<unknown>,
  {
    tentativas = 3,
    esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  }: { tentativas?: number; esperar?: (ms: number) => Promise<void> } = {},
): Promise<"enviado" | "falhou"> {
  for (let i = 1; i <= tentativas; i++) {
    try {
      await enviar();
      return "enviado";
    } catch (e: any) {
      const codigo = e?.data?.code;
      if (codigo === "FORBIDDEN") return "enviado";
      if (codigo === "BAD_REQUEST" || codigo === "UNAUTHORIZED") return "falhou";
      if (i < tentativas) await esperar(i * 1500);
    }
  }
  return "falhou";
}
