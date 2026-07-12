# REDESIGN-PLAN.md — Rework total de UI do BikeTogo

Plano de ação para elevar o sistema a qualidade **premium/entregável**, ancorado
em 7 skills (registradas aqui pra não viverem só em chat — lição do /btw).

## Skills-base (governam este rework)

| Skill | Papel no rework |
|---|---|
| `anthropic-skills:shadcn-ui-system` | Design system da casa: tokens, blueprints, anti-slop, dark-âmbar. **Base de tudo.** |
| `anthropic-skills:shadcn` | Fonte viva das APIs dos componentes shadcn (nunca inventar prop de memória). |
| `anthropic-skills:redesign-existing-projects` | Método audit→diagnose→fix; catálogo de "AI fingerprints" a exterminar. |
| `anthropic-skills:emil-design-eng` | Polish invisível: estados, timing, detalhes que fazem "feel great". |
| `anthropic-skills:apple-design` | Materiais/profundidade, mola física, transições interrompíveis, tipografia óptica, reduced-motion. |
| `anthropic-skills:animation-vocabulary` | Nomear efeitos com precisão (glossário reverso) ao especificar motion. |
| `anthropic-skills:improve-animations` | Auditar o motion do código (read-only) e emitir plano priorizado de movimento. |

> **Nota de nomenclatura:** você pediu `/review-animations` — essa skill não
> existe com esse nome no ambiente. A equivalente é **`improve-animations`**
> (auditoria read-only de motion → plano). É ela que uso na Fase 3.

## Leitura honesta de arquitetura (antes de apagar nada)

- O `client/src/index.css` tem **295 linhas** e a **fundação está correta**:
  Tailwind v4 (`@import "tailwindcss"` + `@theme inline`), tokens OKLCH completos
  (inclui `--sidebar-*` e `--chart-*`), dark-first, acento âmbar
  `oklch(0.82 0.17 80)`. Isso é exatamente o que a `shadcn-ui-system` prescreve.
- O que está feio (botão âmbar gigante do "Nova Bicicleta", modais sem refinamento)
  **não vem dos tokens** — vem da **camada de componentes**: estilo inconsistente,
  sem estados de hover/active/focus caprichados, sem motion, sem hierarquia de
  elevação. O CSS não é o doente; os componentes são.
- **Apagar 100% do CSS literalmente quebraria todas as ~11 telas de uma vez**
  (sem tokens = sem cor; sem `.dialog-mobile`/`.badge-*` = layout quebrado) e
  levaria horas só pra voltar ao estado atual. A `redesign-existing-projects`
  diz isso na cara: *"Small, targeted improvements over big rewrites. Do not
  break existing functionality."*

**Recomendação:** rebuild do `index.css` **do zero de verdade** (é pequeno e vale
reescrever canonicamente, adicionando o que falta — motion tokens, escala de
z-index, sombras tintadas, escala tipográfica, materiais de vidro), **mantendo os
nomes de token** que os componentes já consomem, pra não detonar tudo ao mesmo
tempo. Depois, rework **componente a componente e tela a tela** — que é onde mora
o ganho real de "entregável". App continua funcionando o tempo todo.

---

## Decisões travadas (Matheus, esta sessão)
- **Fase 1 = rebuild preservando os nomes de token** (não nuke literal). App
  nunca fica 100% sem estilo.
- **Execução fase por fase com revisão**: cada fase → mostro no `dev:local` →
  aprovação → próxima.

## Fase 0 — Auditoria + decisões de linguagem ✅ (este documento)
**Skills:** redesign-existing-projects · apple-design · emil-design-eng

### Achados da auditoria (AI fingerprints encontrados nas telas reais)
Levantados na varredura E2E desta sessão (todas as 11 telas exercitadas):
- **Botão âmbar "gritante" chapado** — ex.: "Criar bicicleta"/"Nova Bicicleta"
  é um bloco âmbar sólido de largura total sem hierarquia nem estado de press.
  (Saturação alta + sem profundidade = o fingerprint nº1 que você apontou.)
- **Modais sem elevação/entrada** — abrem sem transição, backdrop chapado,
  sombra preta genérica (`shadow-2xl`), cantos uniformes.
- **Sem estados de hover/active/focus caprichados** — botões e linhas não têm
  `scale` no press; focus-ring inconsistente entre primitivos.
- **Motion ~zero** — nenhuma entrada escalonada, nenhuma mola; skeletons já
  entraram (bom), mas o resto é estático.
- **Cards genéricos** (border + shadow + bg) repetidos sem elevação semântica.
- **Sombras pretas puras** em vez de tintadas com o hue do fundo.
- **`style={{fontFamily:'Montserrat'}}` inline** ainda em 2 telas (Settings,
  UserManagement header) — resíduo pré-Geist.
- **`text-red-400`/gray hardcoded** em pontos soltos (não-tokenizados).
- **Toasts com "!"** ("Cliente criado com sucesso!", "Cadastro validado!") —
  a redesign skill pede confiança sem exclamação.
- **Título com fonte de heading sem tracking** — display sem presença.

### Decisões de design (linguagem premium — governam F1–F4)
1. **Tipografia (Geist):** escala explícita display→caption; tracking negativo
   (`-0.02em`) em display/h1, `tabular-nums` em toda métrica/valor/data; body
   ~65ch; pesos 400/500/600 pra hierarquia (não só 400/700). Sentence case
   (mata Title Case). Aposentar todo `Montserrat` inline.
2. **Cor/superfície:** manter dark-âmbar. Grays tintados de um só matiz.
   Âmbar do CTA rebaixado (menos "gritante": usar como acento, não bloco sólido
   de largura total por padrão). Status calibrado < 80% sat. **Sombras tintadas**
   (hue do fundo, não preto puro).
3. **Profundidade (apple materials):** elevação em camadas — card < popover <
   dialog < toast, cada nível com sombra tintada + z-index da escala. Backdrop de
   dialog com blur sutil + material de vidro.
4. **Estados (emil):** todo interativo com hover (shift/scale), active
   (`scale(0.98)`/`translateY(1px)`), focus-ring visível e consistente,
   transição 150–250ms. Nada instantâneo.
5. **Motion (apple):** entrada escalonada em listas/cards, mola física nas
   transições, interrompível, `prefers-reduced-motion` desliga tudo.
6. **Componentes:** menos "1 filled + 1 ghost" repetido — introduzir tertiary/
   link. CTA não precisa ser bloco âmbar full-width sempre.
7. **Copy:** remover "!" de sucesso; voz ativa; mensagens de erro diretas.

**Entregável desta fase:** este bloco de decisões (acima) — aprovado, vira o
contrato visual das fases 1–4.

## Fase 1 — Rebuild do `index.css` do zero (0,5 sessão) — ⏳ PRÓXIMA (turnkey)
**Skills:** shadcn-ui-system · shadcn · apple-design
**Decisão travada:** preservar os nomes de token existentes (não nuke literal).

> **Começar a próxima sessão AQUI.** Passos concretos:
> 1. `Skill anthropic-skills:shadcn-ui-system` (tokens da casa) + `apple-design`
>    (materiais/sombra/motion tokens) antes de escrever.
> 2. Subir `dev:local` e tirar screenshot do estado atual (Dashboard + modal de
>    bike) como "antes".
> 3. Reescrever `client/src/index.css` (hoje 295 linhas) mantendo TODOS os nomes
>    de token que os componentes usam. Conferir a lista de consumidores:
>    `grep -roE "(bg|text|border|ring|fill)-(background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring|sidebar|chart-[1-5])" client/src --include=*.tsx | sort -u`
> 4. Utilitários load-bearing que NÃO podem sumir (senão quebra tela):
>    `.dialog-mobile`, `.safe-area-bottom`, `.row-actions`, `.table-compact`,
>    `.container`. Badges `.badge-lead/verified/blocked/available/rented/maintenance`
>    ainda são usados em `Clients.tsx` (StatusBadge) e talvez outros — **conferir
>    com grep antes de remover**; migrar consumidores pro `UnitStatusBadge` ou
>    manter as classes por ora.
> 5. Gate: `npm run check` (0) + `dev:local` renderiza as 11 telas com cor certa.
>    NÃO seguir pra F2 sem esse gate verde.

Reescrever `client/src/index.css` canonicamente, do zero, mantendo nomes de token:
- `@theme inline` completo (cores, radius, fontes) — como está, revisado.
- Paleta OKLCH refinada: grays tintados consistentes (um só matiz), destructive/
  emerald/amber de status calibrados < 80% saturação.
- **Novos tokens que faltam:** durações e easings de motion (`--ease-spring`,
  `--dur-fast/base/slow`), escala de z-index (`--z-dropdown/modal/toast`),
  sombras tintadas (`--shadow-sm/md/lg` com hue do fundo), material de vidro
  (`--glass-*`), escala tipográfica (`--text-display/h1/h2/...`).
- `@layer base`: body/headings/scrollbar/cursor (revisado), `@media (prefers-
  reduced-motion)` global, `scroll-behavior: smooth`.
- `@layer components`: manter utilitários load-bearing (`.dialog-mobile`,
  `.safe-area-bottom`, `.row-actions`, `.table-compact`); **aposentar os
  `.badge-*` ad-hoc** migrando pro `UnitStatusBadge`/variantes shadcn.
- **Gate:** app sobe, todas as telas renderizam com as cores certas (tsc + visual).

## Fase 2 — Primitivos shadcn polidos (1 sessão)
**Skills:** shadcn · emil-design-eng · apple-design

Reforjar os primitivos em `components/ui/` ao padrão premium (é o que conserta o
"Nova Bicicleta"): `button` (hover/active `scale(0.98)`, focus-ring consistente,
variantes sem âmbar-gritante), `dialog` (elevação/backdrop/entrada com mola),
`input`/`select`/`textarea` (focus-ring, estados), `card` (elevação semântica, não
border+shadow padrão), `table`, `badge`, `skeleton`, `tabs`, `sonner` (toasts).
- **Gate:** conferir cada primitivo no `dev:local` (o modal de bike bonito).

## Fase 3 — Sistema de movimento (0,5 sessão)
**Skills:** improve-animations · apple-design · animation-vocabulary

1. `improve-animations`: auditar o motion atual (hoje ~zero) → plano priorizado.
2. Primitivas de motion: entrada escalonada (stagger) em listas/cards, mola física
   nas transições (não linear), transições interrompíveis, respeito a
   `prefers-reduced-motion`. Nomear cada efeito via `animation-vocabulary`.
- **Gate:** motion perceptível mas sóbrio; reduced-motion desliga tudo.

## Fase 4 — Rework tela a tela (2–3 sessões)
**Skills:** todas

Aplicar primitivos polidos + motion + correções de layout, uma tela por vez, com
verificação visual a cada uma (nunca quebrar função). Ordem por impacto:
`/reservar` (cara pública) → Dashboard → Contratos → Bikes/Acessórios →
Clientes/ClientProfile → Financeiro → Usuários/Auditoria → Configurações → Login.

## Fase 5 — QA final (0,5 sessão)
`tsc` 0 · `npm test` 61 · varredura de fugitivos de cor (zero) · reduced-motion ·
mobile (375px sem overflow) · conferência visual das 11 telas · a11y (focus,
contraste ≥ 4.5:1, alvos ≥ 44px).

---

## Ordem canônica de prioridade (da redesign skill)
1. Fonte → 2. Paleta → 3. Hover/active → 4. Layout/espaço → 5. Trocar componentes
genéricos → 6. Loading/empty/error → 7. Polish tipográfico final.

## Realidade de esforço
~5–6 sessões de trabalho. O app permanece **funcional e commitável ao fim de cada
fase** — nada de "tudo quebrado por 3 dias". Cada fase tem um gate de verificação.
