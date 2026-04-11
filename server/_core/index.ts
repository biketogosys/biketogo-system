import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { createClient } from "../db";
import { notifyOwner } from "./notification";

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
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // ─── Public endpoint: Shopify pre-registration form ──────────────────────
  app.post("/api/shopify/precadastro", async (req, res) => {
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

      // Notify owner via built-in notification
      await notifyOwner({
        title: `Novo pré-cadastro: ${body.name}`,
        content: `Cliente ${body.name} (CPF: ${body.cpf || 'N/A'}) realizou pré-cadastro pelo site. ID: #${clientId}`,
      });

      res.json({ success: true, clientId });
    } catch (error) {
      console.error("[Shopify Precadastro]", error);
      res.status(500).json({ success: false, error: "Erro ao salvar cadastro." });
    }
  });

  // ─── CORS for Shopify ──────────────────────────────────────────────────────
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
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
