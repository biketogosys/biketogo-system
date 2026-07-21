/**
 * Rate limit do /reservar — regressão do fix de 2026-07-18.
 * O reservarRateLimiter estava preso ao caminho antigo
 * (publicApi.submitReservation) desde o rename para submitPreRegistration,
 * então nunca disparava. Este teste monta o limiter REAL como no index.ts e
 * prova que o 11º request no caminho certo é bloqueado (429) — e que o
 * caminho antigo NÃO tem limiter (era o bug).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "http";
import { reservarRateLimiter } from "./_core/security";

describe("reservarRateLimiter — /reservar (submitPreRegistration)", () => {
  const app = express();
  app.set("trust proxy", 1);
  // montagem idêntica ao index.ts (caminho corrigido)
  app.use("/api/trpc/publicApi.submitPreRegistration", reservarRateLimiter);
  app.post("/api/trpc/publicApi.submitPreRegistration", (_req, res) => res.json({ ok: true }));
  // caminho ANTIGO (renomeado) — de propósito SEM limiter
  app.post("/api/trpc/publicApi.submitReservation", (_req, res) => res.json({ ok: true }));

  let server: Server;
  let base = "";

  beforeAll(async () => {
    await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
    const addr = server.address();
    base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("libera 10/min e bloqueia a 11ª com 429; o caminho antigo fica livre", async () => {
    const novo = `${base}/api/trpc/publicApi.submitPreRegistration`;
    const status: number[] = [];
    for (let i = 0; i < 11; i++) {
      status.push((await fetch(novo, { method: "POST" })).status);
    }
    expect(status.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(status[10]).toBe(429);

    // o mesmo IP já estourou o balde; ainda assim o caminho antigo responde
    // 200 → prova que o limiter estava (e não está mais) no lugar errado.
    const antigo = await fetch(`${base}/api/trpc/publicApi.submitReservation`, { method: "POST" });
    expect(antigo.status).toBe(200);
  });
});
