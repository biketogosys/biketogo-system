export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
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
