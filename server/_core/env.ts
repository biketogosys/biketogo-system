// ─── Segredo de assinatura: FONTE ÚNICA, sem fallback ────────────────────────
/**
 * `JWT_SECRET` assina DUAS coisas independentes e igualmente sensíveis:
 * 1. o cookie de sessão do painel (`btg_session`);
 * 2. os tokens HMAC públicos: link de contrato e upload de documento.
 *
 * ⚠️ Antes de 2026-08-11 havia um fallback hardcoded (`"biketogo-secret-key-
 * change-me"`, VERSIONADO no Git) para a sessão e `""` para o HMAC, e o
 * servidor subia normalmente sem a variável. Uma env apagada por engano no
 * Railway, um serviço recriado sem copiar as variáveis ou um rollback de
 * configuração bastava para:
 *   - qualquer pessoa forjar um JWT de admin com o segredo público, e
 *   - qualquer pessoa forjar link de contrato (`hmac("", ...)`) e ler nome,
 *     CPF, RG e telefone de TODOS os clientes, enumerando o id.
 *
 * Nada disso deixava rastro: o único sinal era um `console.warn`.
 *
 * Agora o processo **não sobe em produção** sem um segredo de verdade. Falhar
 * alto na largada é infinitamente melhor que degradar em silêncio.
 *
 * Gerar: `openssl rand -base64 48`
 */
const MIN_SEGREDO = 32;
const jwtSecret = process.env.JWT_SECRET ?? "";

if (process.env.NODE_ENV === "production" && jwtSecret.length < MIN_SEGREDO) {
  throw new Error(
    `[FATAL] JWT_SECRET ausente ou curto demais (mínimo ${MIN_SEGREDO} caracteres, ` +
    `recebido ${jwtSecret.length}). O servidor NÃO sobe sem ele: sem segredo, o ` +
    `cookie de sessão e os links públicos de contrato viram forjáveis por qualquer ` +
    `pessoa. Gere um com: openssl rand -base64 48`,
  );
}

// Fora de produção (dev:local e testes) o segredo é opcional, mas avisa alto.
// O `dev:local` define o seu em `_core/dev-local.ts`.
if (process.env.NODE_ENV !== "production" && jwtSecret.length < MIN_SEGREDO) {
  console.warn(
    `[SEC] JWT_SECRET ausente ou curto (${jwtSecret.length} caracteres). ` +
    `Tolerado fora de produção; em produção o processo aborta.`,
  );
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: jwtSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  shopifyAllowedOrigin: process.env.SHOPIFY_ALLOWED_ORIGIN ?? "",
  // E-mail (Resend) — notificações do dono. Sem a key, modo log-only (dev).
  // EMAIL_FROM precisa de domínio verificado no Resend; onboarding@resend.dev
  // só entrega para o e-mail da própria conta Resend (bom pro 1º smoke test).
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Bike To Go <onboarding@resend.dev>",
  // URL pública do app (Railway/domínio próprio) — usada em links de e-mail.
  appUrl: process.env.APP_URL ?? "",
  // Storage S3 (Supabase Storage é S3-compatível). Usado como fallback quando
  // o proxy do Manus (BUILT_IN_FORGE_API_*) não está configurado.
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3Region: process.env.S3_REGION ?? "us-east-1",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
};
