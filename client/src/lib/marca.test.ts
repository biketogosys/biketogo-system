/**
 * Logo da marca (2026-09-14).
 *
 * Incidente: o Login e a barra lateral apontavam para a CDN do template Manus,
 * que passou a responder 403, e a logo sumiu do sistema inteiro — inclusive do
 * app instalado. Detalhe em `marca.ts`.
 *
 * O que este arquivo protege não é a URL de hoje, é a REGRA: imagem de tela é
 * arquivo do próprio sistema. Um endereço de terceiro colado de novo num
 * componente derruba o teste antes de derrubar a tela da loja.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { LOGO_MARCA } from "./marca";

const RAIZ = path.resolve(import.meta.dirname, "..", "..");

function arquivosDoFront(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = path.join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosDoFront(caminho);
    return /\.(tsx?|html|css)$/.test(nome) && !/\.test\.ts$/.test(nome) ? [caminho] : [];
  });
}

describe("logo da marca", () => {
  it("aponta para um arquivo que EXISTE em client/public", () => {
    expect(LOGO_MARCA.startsWith("/")).toBe(true);
    expect(existsSync(path.join(RAIZ, "public", LOGO_MARCA))).toBe(true);
  });

  it("é um PNG de verdade (não um arquivo vazio ou corrompido)", () => {
    const bytes = readFileSync(path.join(RAIZ, "public", LOGO_MARCA));
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.length).toBeGreaterThan(1_000);
  });

  it("⭐ nenhuma tela carrega imagem hospedada fora do sistema", () => {
    const externas: string[] = [];
    for (const arquivo of [...arquivosDoFront(path.join(RAIZ, "src")), path.join(RAIZ, "index.html")]) {
      const conteudo = readFileSync(arquivo, "utf8");
      for (const m of conteudo.matchAll(/https?:\/\/[^\s"'`)]+\.(png|jpe?g|svg|webp|gif)/gi)) {
        externas.push(`${path.relative(RAIZ, arquivo)}: ${m[0]}`);
      }
    }
    expect(externas).toEqual([]);
  });
});
