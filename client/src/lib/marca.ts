// ─── Logo da marca nas telas do sistema ─────────────────────────────────────
//
// ⚠️ INCIDENTE 2026-09-14: "todas as logos do projeto estão sumindo". O Login e
// a barra lateral apontavam para uma URL FIXA na CDN do template Manus
// (`d2xsxph8kpxj0f.cloudfront.net/...`), herança dos checkpoints v1.1 e v2.0. O
// projeto Manus perdeu o acesso ao arquivo e a CDN passou a responder HTTP 403
// — a logo quebrou em todo lugar que dependia dela, inclusive no app instalado.
// O `/reservar` continuou normal porque usa a logo enviada em Configurações.
//
// Regra: imagem de interface é arquivo DO PRÓPRIO sistema (`client/public`),
// servido junto com a tela. Nunca URL de terceiro: quem hospeda decide quando
// ela some, e a gente só descobre pelo print da cliente.
//
// Por que o ícone e não a logo de Configurações (`company_logo_url`): aquela
// tem 1,3 MB, passa por redirect de storage com URL assinada e tem o "go" em
// preto, que desaparece no tema escuro. O ícone (a coroa) tem aro dourado,
// fundo transparente, pesa 45 KB, já é o ícone do app instalado e o fallback do
// PDF — e fica legível nos dois temas.
export const LOGO_MARCA = "/icons/icon-192.png";
