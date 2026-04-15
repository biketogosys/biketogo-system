# Bike To Go — Sistema de Gestão | TODO

## Banco de Dados & Backend
- [x] Schema: tabela clients (clientes)
- [x] Schema: tabela bikes (bicicletas)
- [x] Schema: tabela rentals (aluguéis)
- [x] Schema: tabela client_documents (fotos de documentos)
- [x] Migração e aplicação do schema no banco
- [x] Router tRPC: clients (CRUD, busca, filtros, validação)
- [x] Router tRPC: bikes (CRUD)
- [x] Router tRPC: rentals (CRUD)
- [x] Endpoint público POST /api/shopify/precadastro (recebe dados do Liquid)
- [x] Notificação WhatsApp ao receber novo cadastro

## Autenticação & Acesso
- [x] Login com e-mail e senha (admin/user)
- [x] Controle de acesso por papel (adminProcedure)
- [x] Página de login com identidade visual Bike To Go

## Layout & Tema
- [x] Dark mode com cor de destaque #C8920A
- [x] DashboardLayout com sidebar de navegação
- [x] Fontes: Inter para corpo, Montserrat para títulos

## Módulo Clientes
- [x] Lista de clientes com busca (nome, CPF, RG)
- [x] Filtros por status: Lead / Verificado / Bloqueado
- [x] Badges coloridos por status
- [x] Contadores: total Lead e total Cadastrados
- [x] Perfil do cliente — aba Cadastro
- [x] Perfil do cliente — aba Documentação (fotos RG frente/verso)
- [x] Perfil do cliente — aba Aluguéis
- [x] Perfil do cliente — aba Histórico
- [x] Painel lateral de controles (situação, validar, toggles, expiração, observações)
- [x] Botão "Validar cadastro" (muda status de Lead para Verificado)

## Módulo Bicicletas
- [x] Lista de bicicletas com status (disponível / alugada / manutenção)
- [x] Cadastro/edição de bicicleta (série, modelo, tamanho, status)

## Módulo Aluguéis
- [x] Lista de aluguéis com filtros
- [x] Registro de aluguel (cliente, bike, datas, valor, pagamento, status)
- [x] Vinculação automática de status da bike ao registrar aluguel

## Dashboard
- [x] Card: total de clientes
- [x] Card: aluguéis ativos
- [x] Card: receita do mês
- [x] Card: novos leads
- [x] Gráfico ou lista de atividade recente

## Testes & Entrega
- [x] Testes Vitest para routers principais (15 testes passando)
- [x] Checkpoint e publicação

## Melhorias v1.1
- [x] Upload e exibição da logo Bike To Go na sidebar
- [x] Módulo de Acessórios (schema, router, página com CRUD)
- [x] Substituir select de cliente por autocomplete com busca em tempo real no módulo de Aluguéis
- [x] Rota /acessorios registrada no App.tsx e DashboardLayout

## Correções v1.2
- [x] Corrigir erro "Too big: limit <=200" nas queries de paginação
- [x] Adicionar seleção de acessórios no formulário de cadastro de aluguel

## v2.0 — Escopo Completo

### Banco de Dados — Novas tabelas e campos
- [x] Bikes: adicionar campos marca, categoria, descrição técnica, peso, limite peso ciclista, preço por dia, foto URL, quantidade
- [x] Nova tabela: bike_discount_rules (desconto progressivo por bike)
- [x] Nova tabela: rental_accessories (vínculo acessórios-aluguel)
- [x] Rentals: adicionar campos deliveryDate, deliveryTime, deliveryFee, returnCondition, paymentType (online/presencial), stripeSessionId
- [x] Nova tabela: expense_categories (categorias de despesa editáveis)
- [x] Nova tabela: revenue_categories (categorias de receita editáveis)
- [x] Nova tabela: expenses (despesas operacionais)
- [x] Nova tabela: revenues (receitas extras)
- [x] Nova tabela: system_settings (taxa entrega, telefone WhatsApp, etc.)
- [x] Nova tabela: admin_users (login próprio email+senha, fora do Manus OAuth)
- [x] Gerar migrações e aplicar SQL

### Autenticação — Sistema próprio (fora do Manus OAuth)
- [x] Login com email + senha (bcrypt)
- [x] Gerenciamento de usuários: adicionar/remover quem pode acessar
- [x] Sessões JWT com expiração configurável
- [x] Página de login atualizada

### Módulo Bicicletas — Melhorias
- [x] Formulário: novos campos (marca, categoria, tamanho, descrição, peso, limite peso, preço/dia, foto, quantidade)
- [x] Tabela de desconto progressivo por bike (a partir de X dias, Y% off)
- [ ] Pré-cadastro de todas as bikes do catálogo (sem fotos)
- [x] Status: Disponível / Alugada / Em Manutenção visível no formulário Shopify

### Módulo Aluguéis — Melhorias
- [x] Seleção de bike com verificação de disponibilidade por período (calendário range)
- [x] Seleção de horário de entrega (09h às 19h, intervalos 30min, margem 15-30min)
- [x] Taxa de entrega fixa configurável no sistema
- [x] Cálculo automático do valor com desconto progressivo
- [x] Forma de pagamento: Online (Stripe) ou Presencial
- [x] Tela de encerramento: confirmar devolução + condição da bike (OK / Com dano)
- [x] Tabela rental_accessories vinculando acessórios ao aluguel

### Módulo Financeiro — Novo
- [x] Categorias de despesa: criar/editar/excluir livremente
- [x] Categorias de receita: criar/editar/excluir livremente
- [x] Registro de despesas com categoria, valor, data, descrição
- [x] Registro de receitas extras (além dos aluguéis)
- [x] Relatório de faturamento por mês e por período personalizado
- [x] Cálculo: Receita bruta − Despesas = Lucro bruto / Lucro real
- [x] Download do relatório em CSV/Excel

### Integração Shopify — API pública
- [x] Endpoint público para receber dados do formulário Shopify
- [x] Endpoint público para listar bikes disponíveis (com status e períodos bloqueados)
- [x] Chave de API secreta para autenticação do formulário
- [ ] CORS restrito ao domínio Shopify

### Notificações
- [x] Email automático para cliente ao confirmar reserva (remetente: biketogo.floripa@gmail.com)
- [x] Notificação WhatsApp para dono ao receber nova reserva
- [x] Campo no sistema para configurar telefone que recebe notificações

### Segurança
- [ ] Rate limiting nas rotas de login e API pública
- [ ] Headers de segurança (Helmet.js)
- [ ] Sanitização de inputs
- [ ] Proteção contra SQL injection (Drizzle ORM parametrizado — já existe)

### Exclusão de registros
- [x] Botão excluir com confirmação em Clientes
- [x] Botão excluir com confirmação em Aluguéis
- [x] Botão excluir com confirmação em Acessórios (já existe)
- [x] Botão excluir com confirmação em Bicicletas (já existe)

### Configurações do sistema
- [x] Tela de configurações: taxa de entrega, telefone WhatsApp, horário funcionamento
- [x] Gerenciamento de usuários do sistema (adicionar/remover acesso)

### Testes & Entrega v2.0
- [x] Testes Vitest para novos routers e funcionalidades
- [x] Verificação TypeScript sem erros
- [x] Checkpoint final e entrega

## v2.1 — Formulário Público + Comunicação

### Formulário Público (embeddable no Shopify)
- [x] Página pública /reservar com formulário completo de reserva
- [x] Dados pessoais: nome, email, telefone, CPF
- [x] Seleção de bike com fotos, preço/dia e disponibilidade em tempo real
- [x] Seleção de período (data início e fim) com calendário
- [x] Seleção de horário de entrega (09h-19h, intervalos 30min)
- [x] Seleção de acessórios opcionais
- [x] Cálculo automático do valor total (desconto progressivo + taxa entrega + acessórios)
- [x] Resumo da reserva antes de confirmar
- [x] Design responsivo mobile-first com identidade Bike To Go
- [x] Endpoint público para processar a reserva (cria cliente lead + rental)

### Sistema de Notificações
- [x] Helper de envio de email via Resend API (preparado para API key futura)
- [x] Email automático para cliente ao confirmar reserva
- [x] Notificação para o dono (via notifyOwner) ao receber nova reserva
- [x] Notificação WhatsApp para dono ao receber nova reserva (Z-API ou Cloud API)
- [x] Template de email HTML com identidade visual Bike To Go
- [x] Configuração de email/telefone/API keys na tela de Configurações

### Testes & Entrega v2.1
- [x] Testes Vitest para endpoints de reserva e notificação (37 testes passando)
- [x] Checkpoint final e entrega
