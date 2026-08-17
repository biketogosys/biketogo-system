/**
 * Entry de desenvolvimento LOCAL — sobe o servidor completo (API + Vite)
 * com banco PGlite em disco (.dev-db/), sem Supabase e sem .env.
 *
 *   npm run dev:local         → sobe em http://localhost:3000
 *   npm run dev:local:fresh   → apaga .dev-db/ e recria banco + seed
 *
 * Login semeado: admin@dev.local / dev123
 *
 * As variáveis são definidas ANTES do import do index (que lê env no load).
 * Import dinâmico é obrigatório aqui — import estático içaria o index para
 * antes das atribuições.
 */
process.env.NODE_ENV ||= "development";
process.env.DEV_PGLITE ||= "file";
process.env.JWT_SECRET ||= "dev-local-secret-nao-usar-em-prod";
process.env.PORT ||= "3000";

// Publicador do changelog (/publicar-atualizacoes): dev / dev123.
// Hash bcrypt de "dev123" — em produção as duas variáveis vêm do Railway e a
// senha de verdade nunca aparece no repositório.
process.env.PUBLICADOR_USUARIO ||= "dev";
process.env.PUBLICADOR_SENHA_HASH ||= "$2b$10$Ajy06xNMenjXKWTNj9O3xuDkngAq3YTaaSYbZDLK65HLW31dpnSZ.";

void import("./index");

export {};
