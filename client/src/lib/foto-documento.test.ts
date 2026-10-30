/**
 * Foto do documento do /reservar (2026-10-29): clientes 100 e 104 terminaram o
 * cadastro sem documento porque o envio falhou e ninguém ficou sabendo.
 */
import { describe, expect, it, vi } from "vitest";
import { bytesDoDataUrl, dimensoesReduzidas, enviarComRetentativa } from "./foto-documento";

const erroTrpc = (code: string) => Object.assign(new Error(code), { data: { code } });
const semEspera = { esperar: async () => {} };

describe("dimensoesReduzidas", () => {
  it.each([
    [4032, 3024, 2000, 1500], // foto de celular deitada
    [3024, 4032, 1500, 2000], // em pé
    [1200, 800, 1200, 800], // já pequena: não amplia
    [2000, 1000, 2000, 1000], // exatamente no limite
  ])("%sx%s vira %sx%s", (l, a, lEsperada, aEsperada) => {
    expect(dimensoesReduzidas(l, a)).toEqual({ largura: lEsperada, altura: aEsperada });
  });
});

describe("bytesDoDataUrl", () => {
  it.each([
    ["data:image/jpeg;base64,QUJD", 3], // "ABC"
    ["data:image/jpeg;base64,QUI=", 2], // "AB"
    ["data:application/pdf;base64,QQ==", 1], // "A"
  ])("%s tem %s bytes", (url, bytes) => {
    expect(bytesDoDataUrl(url)).toBe(bytes);
  });
});

describe("enviarComRetentativa", () => {
  it("chega na primeira", async () => {
    const enviar = vi.fn().mockResolvedValue({ url: "x" });
    expect(await enviarComRetentativa(enviar, semEspera)).toBe("enviado");
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it("rede caindo duas vezes e voltando na terceira", async () => {
    const enviar = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ url: "x" });
    expect(await enviarComRetentativa(enviar, semEspera)).toBe("enviado");
    expect(enviar).toHaveBeenCalledTimes(3);
  });

  it("falhando sempre, para em três e diz que não chegou", async () => {
    const enviar = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await enviarComRetentativa(enviar, semEspera)).toBe("falhou");
    expect(enviar).toHaveBeenCalledTimes(3);
  });

  it("espera mais a cada tentativa", async () => {
    const esperar = vi.fn(async () => {});
    await enviarComRetentativa(vi.fn().mockRejectedValue(new Error("x")), { esperar });
    expect(esperar.mock.calls).toEqual([[1500], [3000]]);
  });

  it("FORBIDDEN depois de uma queda é a tentativa anterior que gravou", async () => {
    // O servidor recusa o segundo envio do mesmo lado porque o primeiro chegou;
    // quem perdeu foi só a resposta. Tratar como falha mandaria o turista
    // reenviar um documento que a loja já tem.
    const enviar = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValue(erroTrpc("FORBIDDEN"));
    expect(await enviarComRetentativa(enviar, semEspera)).toBe("enviado");
    expect(enviar).toHaveBeenCalledTimes(2);
  });

  it.each(["BAD_REQUEST", "UNAUTHORIZED"])("%s não muda na segunda vez: para na hora", async (code) => {
    const enviar = vi.fn().mockRejectedValue(erroTrpc(code));
    expect(await enviarComRetentativa(enviar, semEspera)).toBe("falhou");
    expect(enviar).toHaveBeenCalledTimes(1);
  });
});
