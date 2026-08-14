import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { ENV } from "./env";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { createClient, updateRental, getDb, getSetting, createAuditLog, getBikeById } from "../db";
import { clients as clientsTable, rentals as rentalsTable } from "../../drizzle/schema";
import { isNotNull, lt, and as andOp } from "drizzle-orm";
import { sendNewLeadEmail } from "../email";
import { markOverdueRentals } from "../overdue";
import {
  registerSecurityMiddlewares,
  loginRateLimiter,
  precadastroRateLimiter,
  reservarRateLimiter,
  uploadDocumentoRateLimiter,
  shopifyCorsMiddleware,
} from "./security";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const server = createServer(app);

  // ─── Helmet.js — headers de segurança HTTP ────────────────────────────────
  registerSecurityMiddlewares(app);

  // ─── Body parser: limite POR ROTA ─────────────────────────────────────────
  // ⚠️ Era `50mb` para TUDO (2026-08-11). O Express bufferiza o corpo em
  // memória ANTES de qualquer validação, então qualquer endpoint, com ou sem
  // rate limit, aceitava 50MB: dez requisições simultâneas = 500MB e o
  // contêiner do Railway morre bem antes disso.
  //
  // Só três procedures recebem arquivo (base64). O resto é JSON de formulário,
  // que não passa de alguns KB.
  //
  // ⚠️ A escolha é por SUBSTRING do path, não por rota exata, porque o cliente
  // usa `httpBatchLink`: várias procedures viajam numa requisição só e o path
  // vira `/api/trpc/auth.me,clients.stats`. Uma regra por caminho exato não
  // pegaria o upload quando ele fosse agrupado com outra chamada.
  const ROTAS_DE_UPLOAD = /uploadDocument|uploadBikePhoto|uploadLogo/;
  const jsonPadrao = express.json({ limit: "1mb" });
  const jsonUpload = express.json({ limit: "20mb" });

  app.use((req, res, next) =>
    (ROTAS_DE_UPLOAD.test(req.path) ? jsonUpload : jsonPadrao)(req, res, next),
  );
  // Nenhum fluxo envia formulário urlencoded grande: o upload é JSON.
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  // Cookie parser — required for reading session cookies (btg_session, app_session_id)
  app.use(cookieParser());
  // ─── Atalho de sessão do harness LOCAL (nunca existe em produção) ─────────
  // O preview do Claude Code recria o navegador a cada restart do servidor e a
  // sessão cai; sem isto, toda verificação visual de tela autenticada exige
  // login manual. Dupla trava: só existe com DEV_PGLITE (que apenas o
  // `dev:local` define) E fora de produção. Loga o admin SEMEADO do banco de
  // demonstração, que só existe no PGlite local.
  if (process.env.DEV_PGLITE && process.env.NODE_ENV !== "production") {
    app.get("/__dev-login", async (_req, res) => {
      try {
        const { getAdminUserByEmail } = await import("../db");
        const jwt = (await import("jsonwebtoken")).default;
        const email = process.env.DEV_LOGIN_EMAIL || "admin@dev.local";
        const user = await getAdminUserByEmail(email);
        if (!user) return res.status(404).send(`Admin de dev não encontrado: ${email}`);
        // Mesma fonte única do resto do app (nunca `|| ""`, que geraria token
        // assinado com chave vazia). Esta rota só existe fora de produção.
        const token = jwt.sign(
          { userId: user.id, role: user.role },
          ENV.cookieSecret,
          { expiresIn: "7d" },
        );
        res.cookie("btg_session", token, {
          httpOnly: true, secure: false, sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, path: "/",
        });
        res.redirect("/");
      } catch (err) {
        res.status(500).send(`Falha no login de dev: ${String(err)}`);
      }
    });
    console.log("[dev-local] Atalho de sessão ativo: http://localhost:" + (process.env.PORT || 3000) + "/__dev-login");
  }

  // Storage proxy for /manus-storage/* paths
  registerStorageProxy(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // ─── Public endpoint: Shopify pre-registration form ──────────────────────
  // CORS restrito + Rate limiting para rotas Shopify
  app.post(
    "/api/shopify/precadastro",
    shopifyCorsMiddleware,
    precadastroRateLimiter,
    async (req, res) => {
      try {
        const body = req.body;
        const clientId = await createClient({
          name: body.name || "Sem nome",
          cpf: body.cpf,
          rg: body.rg,
          birthDate: body.birthDate,
          gender: body.gender,
          height: body.height,
          pedalFrequency: body.pedalFrequency,
          origin: body.origin,
          phone: body.phone,
          email: body.email,
          instagram: body.instagram,
          accommodation: body.accommodation,
          zipCode: body.zipCode,
          street: body.street,
          number: body.number,
          neighborhood: body.neighborhood,
          city: body.city,
          state: body.state,
          country: body.country || "Brasil",
          status: "lead",
          source: "shopify",
        });

        // Notificar o dono por e-mail (Resend) — não-fatal por construção
        await sendNewLeadEmail({
          clientId,
          name: body.name || "Sem nome",
          phone: body.phone,
          email: body.email,
          city: body.city,
          source: "shopify",
        });

        res.json({ success: true, clientId });
      } catch (error) {
        console.error("[Shopify Precadastro]", error);
        res.status(500).json({ success: false, error: "Erro ao salvar cadastro." });
      }
    }
  );

  // ─── Public endpoint: Shopify bike availability ─────────────────────────
  app.get(
    "/api/shopify/bike-availability/:bikeId",
    shopifyCorsMiddleware,
    async (req, res) => {
      try {
        const bikeId = parseInt(req.params.bikeId);
        if (!bikeId || isNaN(bikeId)) return res.status(400).json({ error: "bikeId inválido" });

        const db = await getDb();
        if (!db) return res.status(503).json({ error: "DB unavailable" });

        const bike = await getBikeById(bikeId);
        if (!bike) return res.status(404).json({ error: "Bike não encontrada" });

        // LOTE-2B: short-circuit de maintenance removido — disponibilidade derivada de bike_units via getSizeAvailability
        // Buscar tamanhos com disponibilidade derivada (modelo fonte única de verdade)
        const { bikeSizes: bs } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const { getSizeAvailability } = await import("../db");

        const allSizes = await db.select().from(bs).where(eq(bs.bikeId, bikeId));

        const tamanhos = await Promise.all(
          allSizes.map(async (size) => {
            const disponivel = await getSizeAvailability(size.id);
            return { tamanho: size.tamanho, quantidadeDisponivel: disponivel };
          })
        );

        let statusBike: "disponivel" | "parcialmente" | "indisponivel" | "manutencao";
        if (tamanhos.length === 0) {
          // LOTE-2B: bike sem tamanhos = sem unidades = nada para alugar
          statusBike = "indisponivel";
        } else {
          const totalDisp = tamanhos.reduce((s, t) => s + t.quantidadeDisponivel, 0);
          const totalTotal = tamanhos.length;
          const dispCount = tamanhos.filter((t) => t.quantidadeDisponivel > 0).length;
          if (totalDisp === 0) statusBike = "indisponivel";
          else if (dispCount < totalTotal) statusBike = "parcialmente";
          else statusBike = "disponivel";
        }

        return res.json({
          disponivel: statusBike === "disponivel" || statusBike === "parcialmente",
          status: statusBike,
          tamanhos,
        });
      } catch (error) {
        console.error("[Shopify Availability]", error);
        res.status(500).json({ error: "Erro interno" });
      }
    }
  );

  // ─── CORS para OPTIONS em rotas Shopify ───────────────────────────────────
  app.options("/api/shopify/*", shopifyCorsMiddleware);

  // ─── Rate limiting para login (tRPC auth.login) ───────────────────────────
  // Aplica rate limit em todas as chamadas tRPC de login
  app.use("/api/trpc/auth.login", loginRateLimiter);

  // ─── Rate limiting para pré-cadastro do /reservar ─────────────────────────
  // Procedure foi renomeado submitReservation → submitPreRegistration quando a
  // reserva online foi vetada (virou só pré-cadastro); o limiter ficou preso ao
  // nome antigo e não disparava. Corrigido 2026-07-18.
  app.use("/api/trpc/publicApi.submitPreRegistration", reservarRateLimiter);

  // ─── Rate limiting para o upload de documento ─────────────────────────────
  // Era o único endpoint público pesado sem limite (2026-08-07): 10MB por
  // chamada, sem teto de repetição dentro das 2h de validade do token.
  app.use("/api/trpc/publicApi.uploadDocument", uploadDocumentoRateLimiter);

  // ─── CORS genérico para demais rotas (não-Shopify) ────────────────────────
  app.use((req, res, next) => {
    // Não sobrescrever headers já definidos pelo shopifyCorsMiddleware
    if (!res.getHeader("Access-Control-Allow-Origin")) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

// ─── Job de limpeza automática de arquivados (a cada 24h) ──────────────────
async function runArchiveCleanup() {
  try {
    const db = await getDb();
    if (!db) return;

    const retentionStr = await getSetting("archive_retention_days");
    const retentionDays = Math.max(3, Math.min(30, parseInt(retentionStr || "5") || 5));

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    // Deletar clientes arquivados expirados
    const deletedClients = await db
      .delete(clientsTable)
      .where(andOp(isNotNull(clientsTable.deletedAt), lt(clientsTable.deletedAt, cutoff)))
      .returning({ id: clientsTable.id });

    // Deletar rentals arquivados expirados
    const deletedRentals = await db
      .delete(rentalsTable)
      .where(andOp(isNotNull(rentalsTable.deletedAt), lt(rentalsTable.deletedAt, cutoff)))
      .returning({ id: rentalsTable.id });

    const totalDeleted = deletedClients.length + deletedRentals.length;

    if (totalDeleted > 0) {
      console.log(`[ArchiveCleanup] Removed ${deletedClients.length} clients and ${deletedRentals.length} rentals (retention: ${retentionDays} days)`);
      await createAuditLog({
        adminId: null,
        acao: "limpeza_automatica",
        tabela: "clients,rentals",
        dadosDepois: {
          clientsRemoved: deletedClients.length,
          rentalsRemoved: deletedRentals.length,
          retentionDays,
          cutoff: cutoff.toISOString(),
        },
      });
    } else {
      console.log(`[ArchiveCleanup] No expired archived records found (retention: ${retentionDays} days)`);
    }
  } catch (err) {
    console.error("[ArchiveCleanup] Error during cleanup:", err);
  }
}

// Rodar imediatamente ao iniciar e depois a cada 24h
setTimeout(() => {
  runArchiveCleanup();
  setInterval(runArchiveCleanup, 24 * 60 * 60 * 1000);
}, 10_000); // aguardar 10s para o servidor estar pronto

// ─── Job: marcar aluguéis vencidos como overdue (fuso America/Sao_Paulo) ────
async function runOverdueSweep() {
  try {
    const db = await getDb();
    if (!db) return;
    const ids = await markOverdueRentals(db);
    if (ids.length > 0) {
      console.log(`[OverdueSweep] ${ids.length} aluguel(is) marcado(s) como overdue: ${ids.join(", ")}`);
      await createAuditLog({
        adminId: null,
        acao: "overdue_automatico",
        tabela: "rentals",
        dadosDepois: { rentalIds: ids, total: ids.length },
      });
    }
  } catch (err) {
    console.error("[OverdueSweep] Error:", err);
  }
}

// De hora em hora (não a cada 24h): setInterval ancora no boot do servidor —
// com 24h um aluguel vencido à meia-noite SP só seria marcado no horário do
// último deploy. A varredura é idempotente e custa 1 UPDATE.
setTimeout(() => {
  runOverdueSweep();
  setInterval(runOverdueSweep, 60 * 60 * 1000);
}, 15_000);


