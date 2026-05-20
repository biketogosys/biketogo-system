# BikeTogo System

Sistema de gestão para aluguel de bicicletas e acessórios — **Bike To Go Floripa**. Controla o ciclo completo de uma locação: cadastro de clientes, gestão da frota de bikes e acessórios, emissão de contratos multi-bike, controle financeiro, formulário público de reservas online e dashboard com gráfico de receita semanal.

## Sobre o projeto

O sistema é utilizado pela equipe da Bike To Go para gerenciar reservas, contratos, frota e financeiro. Clientes finais acessam o formulário público em `/reservar` para solicitar aluguéis online. O painel administrativo é protegido por autenticação Manus OAuth.

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22 + Express 4 |
| API | tRPC 11 (type-safe end-to-end) |
| Frontend | React 19 + TypeScript + Vite 7 |
| Estilo | Tailwind CSS 4 + shadcn/ui |
| ORM | Drizzle ORM |
| Banco de dados | Supabase (PostgreSQL 17) |
| Autenticação | Manus OAuth + Admin local (email/senha com bcrypt) |
| Testes | Vitest |
| Gráficos | Recharts |

## Pré-requisitos

- **Node.js 18+** (recomendado: 22 LTS)
- **pnpm** (`npm install -g pnpm`)
- Conta no **Supabase** (plano gratuito suficiente para desenvolvimento)

---

## Instalação

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd biketogo-system

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais

# 4. Aplique as migrations do banco
pnpm drizzle-kit generate
node apply-migration.mjs

# 5. (Opcional) Aplique as políticas RLS
node apply-rls.mjs
```

---

## Como configurar o Supabase

### 1. Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e crie um novo projeto
2. Anote as seguintes informações do painel **Settings > API**:
   - **Project URL** (`SUPABASE_URL`)
   - **anon public key** (`SUPABASE_ANON_KEY`)
   - **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`)
3. Em **Settings > Database**, copie a **Connection string (URI)** no formato:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   Esta será a `DATABASE_URL`.

### 2. Variáveis de Ambiente

Configure as seguintes variáveis no seu ambiente (`.env` local ou secrets do deploy):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Connection string PostgreSQL do Supabase (pooler, porta 6543) |
| `JWT_SECRET` | Sim | Segredo para assinar os cookies de sessão |
| `VITE_APP_ID` | Sim | ID do aplicativo Manus OAuth |
| `OAUTH_SERVER_URL` | Sim | URL base do servidor Manus OAuth (backend) |
| `VITE_OAUTH_PORTAL_URL` | Sim | URL do portal de login Manus (frontend) |
| `OWNER_OPEN_ID` | Sim | Open ID do proprietário do projeto Manus |
| `OWNER_NAME` | Sim | Nome do proprietário (usado em notificações) |
| `BUILT_IN_FORGE_API_URL` | Sim | URL das APIs internas Manus (LLM, storage, etc.) |
| `BUILT_IN_FORGE_API_KEY` | Sim | Bearer token para APIs internas (server-side) |
| `VITE_FRONTEND_FORGE_API_KEY` | Sim | Bearer token para APIs internas (frontend) |
| `VITE_FRONTEND_FORGE_API_URL` | Sim | URL das APIs internas Manus (frontend) |
| `SUPABASE_URL` | Sim | URL do projeto Supabase (ex: `https://xxxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Sim | Chave pública anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave service_role (somente backend, nunca expor no frontend) |
| `VITE_APP_TITLE` | Não | Título exibido na aba do navegador |
| `VITE_APP_LOGO` | Não | URL da logo exibida no painel admin |
| `VITE_LOGO_URL` | Não | URL da logo exibida no formulário público `/reservar` |
| `STRIPE_SECRET_KEY` | Não | Chave secreta Stripe (para pagamentos online) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Não | Chave pública Stripe (frontend) |
| `STRIPE_WEBHOOK_SECRET` | Não | Segredo do webhook Stripe |

### 3. Aplicar Migrações

```bash
# Gerar SQL de migração (caso altere o schema)
pnpm drizzle-kit generate

# Aplicar migração no banco
node apply-migration.mjs
```

### 4. Configurar Row Level Security (RLS)

As políticas RLS estão documentadas em `drizzle/rls-policies.sql` e podem ser aplicadas via:

```bash
node apply-rls.mjs
```

**Resumo das políticas:**

| Tabela | Acesso Admin | Acesso Cliente |
|--------|-------------|----------------|
| `clients` | Total (CRUD) | Nenhum |
| `client_documents` | Total (CRUD) | Leitura dos próprios documentos |
| `rentals` | Total (CRUD) | Leitura dos próprios aluguéis |
| `bikes` | Total (CRUD) | Leitura pública |
| `accessories` | Total (CRUD) | Leitura pública |
| `bike_discount_rules` | Total (CRUD) | Leitura pública |
| `expenses` | Total (CRUD) | Nenhum |
| `expense_categories` | Total (CRUD) | Nenhum |
| `revenues` | Total (CRUD) | Nenhum |
| `revenue_categories` | Total (CRUD) | Nenhum |
| `admin_users` | Total (CRUD) | Nenhum |
| `system_settings` | Total (CRUD) | Nenhum |
| `users` | Total (CRUD) | Leitura do próprio registro |

> **Nota:** O backend Node.js utiliza a `service_role` key do Supabase, que bypassa RLS automaticamente. As policies protegem apenas acesso direto via client SDK.

### 5. Estrutura do Banco

O schema está definido em `drizzle/schema.ts` usando Drizzle ORM com `pgTable`. Tabelas:

- `users` — Usuários autenticados via Manus OAuth
- `admin_users` — Administradores com login local (email/senha)
- `clients` — Clientes cadastrados
- `client_documents` — Documentos dos clientes (RG, etc.)
- `bikes` — Bicicletas do inventário
- `bike_discount_rules` — Regras de desconto progressivo
- `accessories` — Acessórios para aluguel
- `rentals` — Registros de aluguel
- `rental_accessories` — Acessórios vinculados a um aluguel
- `expenses` — Despesas financeiras
- `expense_categories` — Categorias de despesas
- `revenues` — Receitas extras
- `revenue_categories` — Categorias de receitas
- `system_settings` — Configurações do sistema (chave/valor)

---

## Como rodar o projeto

### Desenvolvimento

```bash
pnpm dev
```

O servidor inicia em `http://localhost:3000`. O frontend é servido pelo Vite com HMR.

### Produção

```bash
pnpm build   # Compila frontend (Vite) + backend (esbuild)
pnpm start   # Inicia o servidor compilado em dist/index.js
```

---

## Como rodar os testes

```bash
pnpm test
```

Os testes usam **Vitest** e estão em `server/*.test.ts`. Para modo watch:

```bash
pnpm test --watch
```

---

## Estrutura de pastas

```
biketogo-system/
├── client/                  # Frontend React
│   ├── public/              # Arquivos estáticos (favicon, robots.txt)
│   └── src/
│       ├── components/      # Componentes reutilizáveis (shadcn/ui + custom)
│       ├── hooks/           # Hooks customizados (useMask, etc.)
│       ├── pages/           # Páginas da aplicação
│       │   ├── Dashboard.tsx        # Painel principal com gráfico de receita
│       │   ├── Clients.tsx          # Gestão de clientes
│       │   ├── Rentals.tsx          # Gestão de aluguéis
│       │   ├── Bikes.tsx            # Gestão de bicicletas
│       │   ├── Accessories.tsx      # Gestão de acessórios
│       │   ├── Contracts.tsx        # Contratos multi-bike
│       │   ├── Financial.tsx        # Financeiro (receitas e despesas)
│       │   ├── Settings.tsx         # Configurações do sistema
│       │   └── PublicReservation.tsx # Formulário público /reservar
│       ├── lib/trpc.ts      # Cliente tRPC
│       ├── App.tsx          # Roteamento e layout
│       └── index.css        # Estilos globais e tokens de design
├── drizzle/                 # Schema e migrations do banco
│   ├── schema.ts            # Definição de todas as tabelas
│   ├── rls-policies.sql     # Políticas RLS do Supabase
│   └── *.sql                # Migrations geradas pelo drizzle-kit
├── server/                  # Backend Express + tRPC
│   ├── _core/               # Infraestrutura (OAuth, context, LLM, maps)
│   ├── db.ts                # Helpers de query (camada de dados)
│   ├── routers.ts           # Todos os procedures tRPC
│   ├── storage.ts           # Helpers S3 (upload de arquivos)
│   └── *.test.ts            # Testes Vitest
├── shared/                  # Tipos e constantes compartilhados
├── README.md                # Este arquivo
└── package.json
```

---

## Funcionalidades principais

- **Formulário público de reservas** (`/reservar`) — Clientes fazem reservas online com seleção de bike, acessórios e período. Suporte a documentos brasileiros (CPF/RG) e estrangeiros (Passaporte).
- **Gestão de clientes** — Cadastro completo, validação de status (Lead → Verificado), histórico de aluguéis, paginação server-side (20/página).
- **Gestão de frota** — Bicicletas com tamanhos, fotos, regras de desconto progressivo e controle de disponibilidade em tempo real.
- **Aluguéis** — Criação, devolução com checklist de condições, cálculo automático de valores com descontos, paginação server-side.
- **Contratos multi-bike** — Agrupa múltiplos aluguéis em um contrato, com checklist de acessórios e encerramento formal, paginação server-side.
- **Financeiro** — Registro de receitas e despesas, relatórios mensais, gráfico de receita semanal (Recharts).
- **Soft delete + Audit log** — Exclusões são arquivamentos reversíveis (`deletedAt`); ações críticas são registradas em `audit_logs`.
- **Dashboard** — Painel com estatísticas em tempo real e gráfico de área com receita das últimas 8 semanas.

---

## Notas de segurança

- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` ou `JWT_SECRET` no frontend.
- O arquivo `.env` está no `.gitignore` — nunca o commite.
- As políticas RLS garantem que cada usuário acesse apenas seus próprios dados.
- O driver de banco é `postgres.js` (ESM-first, sem dependências nativas). A conexão usa SSL obrigatório (`ssl: 'require'`) para Supabase.
- Pagamentos via Stripe usam webhooks com verificação de assinatura HMAC.
