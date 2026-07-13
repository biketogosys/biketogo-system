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

## Fase 1 — Rebuild do `index.css` do zero (0,5 sessão) — ✅ FEITA
**Skills:** shadcn-ui-system · shadcn · apple-design
**Decisão travada:** preservar os nomes de token existentes (não nuke literal).

> **Concluída.** `client/src/index.css` reescrito canonicamente do zero mantendo
> TODOS os nomes de token consumidos (censo por grep: só o set padrão shadcn).
> Somados os tokens que faltavam: escala de motion (`--ease-spring` via
> `linear()` + `--ease-out/in-out/emphasized` + `--dur-fast/base/slow/slower`),
> escala de z-index (`--z-dropdown…toast`), **sombras tintadas** (sobrescrevem a
> escala do Tailwind — `shadow-sm/md/lg/xl/2xl` viram tintadas e theme-reactive,
> mais profundas no dark), **material de vidro** (`.glass` + `--glass-*`) e
> **escala tipográfica óptica** (`text-display/h1/h2/h3/caption` com line-height +
> tracking + weight pareados). Grays ganharam faísca quente (hue 75, chroma
> mínima) pra casar com o âmbar. Badges `.badge-*` **mantidos e calibrados**
> (< 80% sat, mesma forma) — migração pro `UnitStatusBadge` fica pra Fase 4.
> Corrigido de brinde o warning de ordem de `@import` do postcss (fonte movida
> pro topo). **Gate verde:** `tsc` 0 · `npm test` 61/61 · tokens light+dark lidos
> ao vivo no DOM (dashboard 9 cards, primary, badges) via computed styles ·
> zero erro de console. (Screenshot da preview travou — limitação do renderer;
> verificação feita por computed-styles em elementos reais, mais precisa que olho
> nu pra mudança de token.)

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

## Fase 2 — Primitivos shadcn polidos (1 sessão) — ✅ FEITA
**Skills:** shadcn · emil-design-eng · apple-design

Reforjar os primitivos em `components/ui/` ao padrão premium (é o que conserta o
"Nova Bicicleta"): `button` (hover/active `scale(0.98)`, focus-ring consistente,
variantes sem âmbar-gritante), `dialog` (elevação/backdrop/entrada com mola),
`input`/`select`/`textarea` (focus-ring, estados), `card` (elevação semântica, não
border+shadow padrão), `table`, `badge`, `skeleton`, `tabs`, `sonner` (toasts).
- **Gate:** conferir cada primitivo no `dev:local` (o modal de bike bonito).

> **Concluída.** Reforjados usando os tokens de motion/sombra da Fase 1:
> - **button** — `transition-all` → props específicas + `duration-150 ease-out`
>   (curva forte da casa) + `active:scale-[0.97]` (feedback de press, emil); âmbar
>   ganhou `shadow-sm` tintada + press que escurece (deixa de ser bloco chapado);
>   hover refinado em outline/ghost/secondary; `link` sem scale.
> - **dialog** — backdrop `bg-black/50` + `backdrop-blur-[2px]` (scrim material
>   apple "dim to focus"); content `shadow-lg`→`shadow-2xl` tintada, `rounded-lg`
>   →`rounded-xl` (14px); close button virou ghost icon-button de verdade
>   (hover bg, `active:scale-95`, foco consistente). Modal segue centrado
>   (transform-origin center é o certo p/ modal, emil).
> - **input/textarea** — affordance de hover na borda (`hover:border-ring/45`) +
>   `border-color` na transição.
> - **select** — trigger com press (`active:scale-[0.99]`) + hover border +
>   **chevron gira 180° ao abrir** (`[&[data-state=open]>svg]:rotate-180` +
>   `transition-transform`).
> - **card** — `transition-shadow` pronto (um `hover:shadow-md` no uso eleva).
> - **tabs** — trigger com `active:scale-[0.98]` + transição de bg.
> - `badge`/`skeleton`/`sonner` — deixados como estão (já aceitáveis; tocá-los
>   seria ruído). Nota: `sonner.tsx` importa `useTheme` de `next-themes` (dead
>   weight — app usa `ThemeContext`; retorna "system", inofensivo).
> **Gate verde:** `tsc` 0 · `npm test` 61/61 · verificado ao vivo em dark no DOM —
> "Nova Bicicleta" (transição específica + ease-out + sombra), dialog aberto
> (blur(2px) + shadow-2xl + radius 14px), input/select transições, chevron
> rotate 180° (valor assentado) · zero erro de console. (Screenshot da preview
> segue travando no ambiente — verificação por computed-styles em elementos reais.)

## Fase 3 — Sistema de movimento (0,5 sessão) — ✅ FEITA
**Skills:** improve-animations · apple-design · animation-vocabulary

1. `improve-animations`: auditar o motion atual (hoje ~zero) → plano priorizado.
2. Primitivas de motion: entrada escalonada (stagger) em listas/cards, mola física
   nas transições (não linear), transições interrompíveis, respeito a
   `prefers-reduced-motion`. Nomear cada efeito via `animation-vocabulary`.
- **Gate:** motion perceptível mas sóbrio; reduced-motion desliga tudo.

> **Concluída.** Sistema de movimento (primitivas reusáveis) em `index.css`:
> - **`.motion-stagger`** — Stagger (fade-in + slide-in-from-bottom) nos filhos
>   diretos, passo ~40ms, cap em 12; **`.motion-enter`** (rise+fade),
>   **`.motion-enter-spring`** (Pop-in com overshoot via `--ease-spring`),
>   **`.motion-enter-scale`** (scale-in de 0.96, nunca de scale(0) — emil).
> - **Padrão `@starting-style` + transition** (não keyframes): o estado de
>   REPOUSO é visível; o offset de entrada vive só no `@starting-style`. À prova
>   de falha — se a transição não rodar (aba oculta no mount, browser sem
>   suporte, reduced-motion), o conteúdo aparece assentado, **nunca preso
>   invisível**. Só `transform`+`opacity`+`box-shadow` (compositor).
> - **Regras não-camadas de propósito** — vencem a utility `transition-shadow`
>   do Card (camada `utilities`); `box-shadow` incluído na lista pra o card não
>   perder a transição de sombra.
> - **Demonstração:** KPI cards do dashboard (`SectionCards`) sobem em cascata ao
>   montar. Rollout amplo (todas as telas) é a Fase 4.
> **Gate:** `tsc` 0 · `npm test` 61/61 · verificado no DOM — cards com
> `transition: opacity, transform, box-shadow` + delays escalonados (0.02→0.14s)
> + curva ease-out, **repouso opacity 1** (robusto) · zero erro de console.
> **Nota honesta:** o renderer da preview não avança o relógio de animação (rAF
> não dispara — mesma causa do screenshot travar), então NÃO deu pra *ver* a
> cascata rodar aqui; verifiquei o mecanismo (correto + à prova de falha). Em
> browser real roda. Recomendo o Matheus abrir `dev:local` e conferir a olho.

## Fase 4 — Rework tela a tela (2–3 sessões) — ⏳ EM ANDAMENTO
**Skills:** todas

Aplicar primitivos polidos + motion + correções de layout, uma tela por vez, com
verificação visual a cada uma (nunca quebrar função). Ordem por impacto:
`/reservar` (cara pública) → Dashboard → Contratos → Bikes/Acessórios →
Clientes/ClientProfile → Financeiro → Usuários/Auditoria → Configurações → Login.

### Progresso
- ✅ **`/reservar` (PublicReservation)** — polish targeted (sem rewrite; a tela já
  fora tokenizada no R9, zero fugitivo de cor). `transition-all` → transições
  específicas + `active:scale` (press) em TODOS os botões (nav, tema, idioma,
  CTAs, upload, remover-imagem); CTAs âmbar ganharam `shadow-sm` tintada +
  `ease-out`; **motion de entrada** (`.motion-enter`) nos 5 cards de step (entrada
  perceptível a cada passo) + `.motion-enter-spring` no ícone de sucesso; copy:
  removido "!" das 3 mensagens de sucesso (pt/en/es). **Gate:** `tsc` 0 ·
  `npm test` 61/61 · verificado no DOM (Continuar com press+shadow+ease-out; step
  card com transição opacity/transform/box-shadow e **repouso opacity 1**; 11
  campos do step 0 intactos; zero "!"; zero erro de console). Motion não deu pra
  *ver* rodar (relógio da preview congelado) — mecanismo verificado + à prova de
  falha. **Aguardando revisão do Matheus antes da próxima tela (Dashboard).**
- ✅ **Dashboard** (via review) — removido gradiente âmbar que vazava nos KPI
  cards (dark); `whitespace-nowrap` nos valores (negativo não quebra); route-fade
  no shell.
- ✅ **Contratos** — 22 fugitivos de cor tokenizados: status badges (contrato +
  aluguel + condição) migrados pro padrão canônico do `UnitStatusBadge`
  (`bg-<cor>-500/20 … dark:text-<cor>-400`, theme-adaptive, de-pilled p/
  `rounded-md`); botões "confirmar/encerrar" verdes → `<Button>` default (âmbar da
  casa) e o de devolução → `variant` destructive/default condicional; link
  `text-blue-600` → `text-primary`; radios → `accent-primary`/`accent-destructive`;
  labels de dano → `text-destructive`. 4 toasts com "!" limpos. **Gate:** `tsc` 0 ·
  `npm test` 61/61 · status colors verificados no DOM (dark, contraste legível) ·
  zero botão verde remanescente · zero erro de console.
- ✅ **Bikes/Acessórios** — toasts com "!" limpos (sed em ~16 mensagens);
  `transition-all` → específico + `active:scale-95` nos chips de filtro; card de
  bike com `transition-[border-color,box-shadow]`; **`.motion-stagger` no grid de
  bikes** (cascata na entrada). Cores de status (slate/red/orange p/ perdido/
  roubado/manutenção) **mantidas** — são a exceção semântica legítima (já
  theme-adaptive, casam com UnitStatusBadge; hovers dos botões de status espelham
  a cor que vão setar). Botão "Novo Acessório" já padronizado (`size="sm"`).
  Primitivas de motion ganharam `border-color` na transição (cards com hover de
  borda não quebram sob stagger). **Gate:** `tsc` 0 · `npm test` 61/61 · card de
  bike com `transition: opacity,transform,box-shadow,border-color` + repouso
  opacity 1 · chips com transição específica · zero toast "!" · zero erro console.
- ✅ **Clientes/ClientProfile** — `Clients.tsx` já estava limpo (zero fugitivo,
  usa `.badge-*` calibrados da F1 + DataTable). `ClientProfile.tsx`: box/botão
  "Recusado/Recusar" `red-500` → **tokens `destructive`**; consentimento LGPD e
  dot de timeline `green-500` → `emerald` theme-adaptive (+ badge de-pilled p/
  `rounded-md`); tab de navegação `transition-all` → específico + `ease-out` +
  `active:scale-[0.98]`; 2 toasts com "!" limpos. **Gate:** `tsc` 0 · `npm test`
  61/61 · verificado no DOM (badges de cliente calibrados; tabs com transição
  específica+ease-out; 4 elementos `destructive` vivos) · zero erro de console.
- ✅ **Financeiro** — tinha os **mesmos 2 problemas do Dashboard** nos KPI cards
  (R8): gradiente âmbar vazando no dark + `CardAction` espremendo o valor. Mesma
  correção: gradiente removido, header reestruturado (badge → linha da descrição,
  `CardTitle` largura total + `whitespace-nowrap`), import `CardAction` removido.
  7 toasts com "!" limpos. **Gate:** `tsc` 0 · `npm test` 61/61 · verificado no
  DOM (dark): 4 cards sem gradiente, título full-width 267px, badge na linha da
  descrição · zero erro de console.
- ✅ **Usuários/Auditoria** — `UserManagement.tsx`: removido **Montserrat inline**
  do h1 (herda Geist global agora), 2 toasts com "!" limpos, botão "Novo usuário"
  já a `size="sm"` (32px). `AuditLog.tsx`: removido Montserrat inline do h1; mapa
  de cores de ação (`badgeColor`) — `blue` → `sky` (consistência com o "info" de
  Contratos), resto (emerald/red/amber) mantido (semântico theme-adaptive). **Gate:**
  `tsc` 0 · `npm test` 61/61 · verificado no DOM: títulos em Geist (`inlineStyle:
  none`), badge de ação em sky, badges de usuário calibrados · zero erro console.
- ⬜ Configurações · ⬜ Login

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
