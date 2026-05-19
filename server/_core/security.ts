import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Express, Request, Response, NextFunction } from "express";
import { ENV } from "./env";

// ─── Rate Limiters ──────────────────────────────────────────────────────────

/** POST /auth/login → 5 tentativas/min por IP */
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: { error: "Muitas tentativas de login. Tente novamente em 1 minuto." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /api/shopify/precadastro → 20 req/min por IP */
export const precadastroRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Muitas requisições. Tente novamente em 1 minuto." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /reservar (tRPC publicApi.submitReservation) → 10 req/min por IP */
export const reservarRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Muitas requisições de reserva. Tente novamente em 1 minuto." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── CORS restrito para rotas Shopify ───────────────────────────────────────

export function shopifyCorsMiddleware(req: Request, res: Response, next: NextFunction) {
  const allowedOrigin = ENV.shopifyAllowedOrigin;

  // Se SHOPIFY_ALLOWED_ORIGIN estiver configurada, restringir
  if (allowedOrigin) {
    const requestOrigin = req.headers.origin || "";
    if (requestOrigin && requestOrigin !== allowedOrigin) {
      return res.status(403).json({ error: "Origin não autorizada." });
    }
    res.header("Access-Control-Allow-Origin", allowedOrigin);
  } else {
    // Fallback: permitir qualquer origin (dev)
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
}

// ─── Registrar todos os middlewares de segurança ────────────────────────────

export function registerSecurityMiddlewares(app: Express) {
  // Helmet — headers de segurança HTTP
  app.use(
    helmet({
      contentSecurityPolicy: false, // Desabilitado para não quebrar o frontend SPA
      crossOriginEmbedderPolicy: false,
    })
  );
}
