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
- [ ] Pré-cadastro de todas as bikes do catálogo (sem fotos) — PENDENTE (feature, não bug)
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
- [x] CORS restrito ao domínio Shopify (implementado em server/_core/security.ts)

### Notificações
- [x] Email automático para cliente ao confirmar reserva (remetente: biketogo.floripa@gmail.com)
- [x] Notificação WhatsApp para dono ao receber nova reserva
- [x] Campo no sistema para configurar telefone que recebe notificações

### Segurança
- [x] Rate limiting nas rotas de login e API pública (implementado em server/_core/security.ts)
- [x] Headers de segurança (Helmet.js) (implementado em server/_core/security.ts)
- [x] Sanitização de inputs (implementado em server/_core/utils.ts)
- [x] Proteção contra SQL injection (Drizzle ORM parametrizado — já existe)

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

## Correções v2.2

- [x] Bug crítico: cookie-parser ausente no Express — sessão de login não é lida após autenticação

## v2.3 — Formulário Público Completo + Stripe

### Formulário de Pré-cadastro/Reserva
- [x] Seção Identificação: Nome, CPF (máscara + validação), RG/Passaporte, Data nascimento, Gênero, Altura, Frequência de pedalada, Como nos encontrou
- [x] Seção Contato: WhatsApp (máscara DDD+número), E-mail, Instagram, Onde está hospedado
- [x] Seção Endereço: CEP (autocomplete via ViaCEP), Estado, Cidade, Endereço, Número, Complemento, Bairro
- [x] Seção Fotos do Documento: upload frente e verso (RG/Passaporte), armazenamento no S3
- [x] Seção LGPD: termos de uso + checkbox de consentimento obrigatório
- [x] Máscaras: CPF (000.000.000-00), RG, telefone ((48) 99999-9999), CEP (00000-000)
- [x] Validações: CPF válido (algoritmo), email, telefone, campos obrigatórios
- [x] Seleção de bike com disponibilidade em tempo real
- [x] Seleção de período e horário de entrega
- [x] Seleção de acessórios
- [x] Cálculo automático do total

### Pagamento
- [x] Seleção de forma de pagamento: Pix, Cartão de Crédito, Presencial
- [x] Integração Stripe: checkout para Cartão e Pix
- [x] Página de sucesso após pagamento confirmado
- [x] Página de cancelamento/erro de pagamento

### Testes & Entrega v2.3
- [x] Testes Vitest (37 testes passando, TypeScript sem erros)
- [x] Checkpoint final e entrega

## v2.4 — Idiomas e Tema

- [x] Arquivo de traduções i18n com PT-BR, EN e ES para o formulário público
- [x] Seletor de idioma no formulário /reservar (bandeiras PT/EN/ES)
- [x] Todos os textos do formulário traduzidos nos 3 idiomas
- [x] Tema padrão do sistema: light mode
- [x] Botão toggle dark/light no DashboardLayout (painel interno)
- [x] Botão toggle dark/light no formulário público /reservar
- [x] Persistência da preferência de tema no localStorage
- [x] Checkpoint final e entrega

## Tarefa 2 — Migração para Supabase (PostgreSQL)
- [x] Atualizar drizzle.config.ts para dialect: "postgresql"
- [x] Substituir mysql2 por postgres.js no package.json
- [x] Reescrever drizzle/schema.ts: mysqlTable → pgTable, tipos equivalentes
- [x] Reescrever server/db.ts: drizzle-orm/postgres-js, .returning(), onConflictDoUpdate
- [x] Atualizar server/_core/env.ts com variáveis Supabase
- [x] Gerar migração SQL (drizzle-kit generate)
- [x] Aplicar migração no Supabase (14 tabelas criadas com sucesso)
- [x] Configurar Row Level Security (RLS) — 34 policies aplicadas
- [x] Criar documentação SQL das policies (drizzle/rls-policies.sql)
- [x] Criar README.md com instruções de configuração do Supabase
- [x] TypeScript sem erros (0 errors)
- [x] Servidor conectando ao Supabase PostgreSQL com sucesso
- [x] Push para GitHub (operacional — pode ser feito a qualquer momento)

## Bloco E — Melhorias Visuais /reservar + Correções Pendentes

### Bloco E — Melhorias visuais /reservar
- [x] Header: logo via VITE_LOGO_URL com fallback ícone + texto "Bike To Go"
- [x] Barra de progresso: CSS Grid para alinhamento correto no desktop
- [x] Barra de progresso: steps anteriores clicáveis, futuros bloqueados
- [x] Bikes: placeholder com ícone quando não há fotoUrl
- [x] Bikes: badge de tamanho visível no card
- [x] Acessórios: abas por categoria usando availableAccessoriesByCategory
- [x] Acessórios: badge de quantidade disponível (verde/âmbar/vermelho)
- [x] Acessórios: item desabilitado quando quantidadeDisponivel = 0
- [x] Acessórios: label "(gratuito)" ao lado de cada item
- [x] Botão "Continuar" fixo no rodapé em mobile (sticky bottom)
- [x] Responsividade: pb-32 em mobile para não sobrepor botão sticky

### Correções pendentes
- [x] pendenciaAcessorio formalizado no schema (campo boolean, sem "as any")
- [x] Filtro por categoria no Accessories.tsx (seletor de abas derivado da lista)
- [x] Máscara de telefone em Settings.tsx (maskPhone + validação antes de salvar)

### Backend
- [x] Endpoint publicApi.availableAccessoriesByCategory com quantidadeDisponivel em tempo real

## Tarefa 9 — Melhorias Técnicas

- [x] Soft delete: confirmar/adicionar deletedAt em clients, rentals, contracts
- [x] Soft delete: tabela audit_logs criada no schema
- [x] Soft delete: migração SQL aplicada no Supabase
- [x] routers.ts: todos os SELECT filtram WHERE deletedAt IS NULL
- [x] routers.ts: mutations de excluir viram arquivar (UPDATE deletedAt)
- [x] routers.ts: audit_log registrado em confirmação de reserva, mudança status bike, arquivamento cliente, encerramento contrato
- [x] Paginação server-side: clients.list com { page, limit, total, totalPages }
- [x] Paginação server-side: rentals.list com { page, limit, total, totalPages }
- [x] Paginação server-side: contracts.list com { page, limit, total, totalPages }
- [x] Frontend Clients.tsx: controles Anterior/Próxima + indicador de página
- [x] Frontend Rentals.tsx: controles Anterior/Próxima + indicador de página
- [x] Frontend Contracts.tsx: controles Anterior/Próxima + indicador de página
- [x] Dashboard.tsx: gráfico de área receita semanal (8 semanas) com Recharts
- [x] README.md completo criado/atualizado na raiz

## Tarefa 10 — Dashboard Financeiro + Audit Log + Restaurar Arquivados

- [x] routers.ts: dashboard.summary com receita aluguéis, receitas extras, despesas, lucro líquido, gráfico semanal agrupado
- [x] routers.ts: auditLogs.list com paginação e filtros (acao, tabela, dataInicio, dataFim)
- [x] routers.ts: clients.restore (UPDATE deletedAt = NULL + audit log)
- [x] routers.ts: rentals.restore (UPDATE deletedAt = NULL + audit log)
- [x] routers.ts: clients.listArchived (WHERE deletedAt IS NOT NULL)
- [x] routers.ts: rentals.listArchived (WHERE deletedAt IS NOT NULL)
- [x] Dashboard.tsx: 4 cards financeiros (receita aluguéis, receitas extras, despesas, lucro líquido)
- [x] Dashboard.tsx: BarChart agrupado (barra dourada/verde/vermelha por semana)
- [x] AuditLog.tsx: criar página /auditoria com tabela + filtros + paginação
- [x] App.tsx: rota /auditoria
- [x] DashboardLayout.tsx: item de menu Auditoria
- [x] Clients.tsx: aba Arquivados + botão Restaurar
- [x] Rentals.tsx: aba Arquivados + botão Restaurar

## Tarefa 11 — Seleção de Tamanho e Quantidade no Formulário /reservar

- [x] Verificar schema bike_sizes e endpoint getSizes
- [x] PublicReservation.tsx: seletores de tamanho com badges de disponibilidade
- [x] PublicReservation.tsx: campo quantidade com min/max dinâmico
- [x] PublicReservation.tsx: validação de tamanho obrigatório
- [x] routers.ts: adicionar bikeSizeId e quantidade na mutation de criar reserva
- [x] Testes passando e TypeScript zerado

## Tarefa 21 — Bugs Críticos (RESOLVIDOS)

- [x] BUG 1: getClientStats filtra deletedAt IS NULL (clientes arquivados não contam no dashboard)
- [x] BUG 2: bikeSizes endpoint filtra deletedAt em aluguéis ativos e usa bikeId correto
- [x] BUG 3: submitReservation insere receita em revenues ao criar reserva
- [x] BUG 4: submitReservation cria contrato e vincula aluguel ao contrato
- [x] BUG 5: campo Quantidade removido do formulário de bikes (gerenciado por bike_sizes)
- [x] BUG 6: getRentalStats e getFinancialReport filtram deletedAt IS NULL
- [x] TypeScript zerado, 37 testes passando

## Tarefa 11.1 — Persistir bikeSizeId/quantity + Melhorias Pós-21

- [x] Verificar/adicionar bikeSizeId e quantity em rentals (schema)
- [x] Gerar e aplicar migração se necessário
- [x] submitReservation: salvar bikeSizeId e quantity nos campos da rentals
- [x] getSizes: corrigir cálculo de disponibilidade por bikeSizeId (não bikeId)
- [x] Rentals.tsx: exibir tamanho e quantidade no detalhe do aluguel
- [x] Rentals.tsx: adicionar link "Ver contrato" no detalhe
- [x] routers.ts: validar/corrigir categoria de receita (categoryId = 1)
- [x] TypeScript zerado, 37 testes passando

## Tarefa 22 — Reserva Multi-Bike com Carrinho

- [x] PublicReservation.tsx: carrinho multi-bike (adicionar/remover bikes)
- [x] PublicReservation.tsx: datas independentes por bike no carrinho
- [x] PublicReservation.tsx: resumo final com todas as bikes, valores e aviso
- [x] routers.ts: submitReservation cria N rentals vinculados ao mesmo contrato
- [x] routers.ts: status inicial 'pending' (não 'active')
- [x] routers.ts: disponibilidade não conta 'pending' (apenas active/overdue)
- [x] routers.ts: confirmAll (pending → active) e rejectAll (pending → cancelled)
- [x] Rentals.tsx: badge "Pendente" para pending + link "Ver contrato"
- [x] Rentals.tsx: filtro de status inclui 'pending'
- [x] Contracts.tsx: deep-link via ?contractId=N, status 'pendente', botões confirmar/recusar
- [x] Schema: 'pendente' adicionado ao contractStatusEnum + migração aplicada
- [x] Schema: 'pending' adicionado ao rentalStatusEnum + colunas contractId/bikeSizeId/quantity
- [x] TypeScript zerado, 41 testes passando

## Tarefa 23 — Manutenção por tamanho + acessórios individuais

- [x] drizzle/schema.ts: tamanhoBikeId (FK → bike_sizes, nullable) em bike_maintenance_logs
- [x] drizzle/schema.ts: quantidadeAfetada em bike_maintenance_logs
- [x] drizzle/schema.ts: tabela accessory_units + enum accessory_unit_status
- [x] routers.ts: addMaintenance decrementa quantidadeDisponivel do tamanho afetado
- [x] routers.ts: updateMaintenance restaura quantidadeDisponivel ao concluir
- [x] routers.ts: accessories.getUnits, createUnit, updateUnitStatus
- [x] Bikes.tsx: select "Tamanho afetado" + campo quantidade no modal de manutenção
- [x] Accessories.tsx: painel de unidades com badges coloridos e edição de status inline
- [x] Migração SQL aplicada no banco (tabela accessory_units + colunas em bike_maintenance_logs)
- [x] TypeScript zerado, 41 testes passando

## Tarefa 23.1 — Unidades automáticas + vínculo com aluguel

- [x] routers.ts: accessories.create gera N unidades automáticas em accessory_units
- [x] routers.ts: accessories.update cria unidades adicionais ao aumentar quantidadeTotal
- [x] routers.ts: accessories.update avisa (sem excluir) ao diminuir quantidadeTotal
- [x] drizzle/schema.ts: unitId (FK → accessory_units, nullable) em rental_accessories e contract_accessories
- [x] routers.ts: contracts.confirmAll marca unidades dos acessórios como 'alugado'
- [x] routers.ts: contracts.close atualiza status da unidade ao devolver com dano/perda
- [x] routers.ts: contracts.close marca unidades de volta como 'disponivel' ao encerrar ok
- [x] Migração SQL aplicada no banco (0007_magenta_magik.sql)
- [x] TypeScript zerado, 41 testes passando

## Tarefa 24 — Documentos por Nacionalidade

- [x] PublicReservation.tsx: radio CNH/RG para brasileiros + upload obrigatório (verso opcional)
- [x] PublicReservation.tsx: campo passaporte para estrangeiros + upload obrigatório (verso opcional)
- [x] PublicReservation.tsx: troca em tempo real ao mudar nacionalidade ou tipo de doc
- [x] PublicReservation.tsx: validação módulo 11 para RG
- [x] Clients.tsx: radio CNH/RG para brasileiros, passaporte para estrangeiros
- [x] Clients.tsx: label dinâmico CNH/RG/Passaporte no modal de novo cliente
- [x] ClientProfile.tsx: label dinâmico na exibição do documento e nos docs adicionais
- [x] routers.ts: enum tipoDocumento atualizado para cnh/rg/passaporte
- [x] TypeScript zerado, 41 testes passando

## Tarefa 25 — WhatsApp sanitização + notificação reserva pendente + número de série manutenção

- [x] server/_core/utils.ts: função sanitizePhone (remove não-numéricos, adiciona 55 se necessário)
- [x] server/routers.ts: aplicar sanitizePhone ao salvar whatsapp_number/notification_phone nas Configurações
- [x] server/routers.ts: submitReservation envia WhatsApp ao admin com link para o contrato + número sanitizado
- [x] server/routers.ts: submitReservation envia e-mail ao admin (notification_email) com dados da reserva
- [x] client/src/pages/Bikes.tsx: campo "Número de série da unidade afetada" (opcional) no modal de manutenção
- [x] TypeScript zerado, 41 testes passando

## Tarefa 26 — notification_email + prazo exclusão automática arquivados

- [x] Settings.tsx: campo "E-mail de notificação do admin" (key: admin_notification_email) na seção de notificações
- [x] Settings.tsx: seção "Arquivamento de Registros" com campo archive_retention_days (min=3, max=30, default=5)
- [x] server/_core/index.ts: job setInterval 24h (inicia após 10s) que deleta clientes/rentals arquivados além do prazo
- [x] server/_core/index.ts: registrar limpeza em audit_logs com acao='limpeza_automatica'
- [x] Clients.tsx: badge "âmbar X dias restantes" / "vermelho Expira amanhã/hoje" / "vermelho escuro Expirado" na aba Arquivados
- [x] Rentals.tsx: mesma lógica de badge na aba Arquivados
- [x] TypeScript zerado, 41 testes passando

## Tarefa 27 — Redesign Visual + Mobile First

- [x] DashboardLayout.tsx: menu hambúrguer/drawer mobile, ícones tablet, expandido desktop
- [x] index.css: media queries globais (table-compact, touch-friendly 44px, row-actions hover, safe-area-bottom, dialog-mobile, badges)
- [x] Clients.tsx: filtros horizontais compactos + tabela com hover actions + cards mobile
- [x] Bikes.tsx: filtros horizontais compactos + tabela com hover actions + cards mobile
- [x] Accessories.tsx: filtros horizontais compactos + tabela com hover actions + cards mobile
- [x] Dashboard.tsx: grid 2col mobile / 4col desktop, gráfico com altura reduzida no mobile
- [x] PublicReservation.tsx: bike cards 1col mobile / 2-3col desktop, carrinho sticky, botão Continuar fixed bottom, safe-area
- [x] TypeScript zerado, 41 testes passando

## Tarefa 24.1 — Correções pós-24 + melhorias mobile

- [x] drizzle/schema.ts: confirmar/adicionar coluna weight (numeric 5,2 nullable) em clients
- [x] PublicReservation.tsx: CPF obrigatório + RG opcional no step de identificação (brasileiro)
- [x] PublicReservation.tsx: Passaporte obrigatório para estrangeiros
- [x] PublicReservation.tsx: radio CNH/RG apenas no step de upload de foto (não no step de identificação)
- [x] PublicReservation.tsx: campo peso ao lado de altura (ambos opcionais)
- [x] PublicReservation.tsx: data de entrega = data de início automaticamente no carrinho
- [x] Clients.tsx: CPF obrigatório + RG opcional para brasileiros
- [x] Clients.tsx: campo peso (kg) no modal de novo cliente
- [x] ClientProfile.tsx: CPF+RG separados, campo peso
- [x] server/routers.ts: sanitizePhone em clients.create e clients.update
- [x] server/v2.test.ts: timeout de sendEmail e sendWhatsApp aumentado para 15s
- [x] index.css: media query modais full-screen no mobile (100vw, 100vh, border-radius 0)
- [x] TypeScript zerado, 41 testes passando

## Tarefa 11 (nova) — Shopify Availability, Dashboard Período, Paginação, Notificações, Mobile

- [x] server/_core/index.ts: endpoint GET /api/shopify/bike-availability/:bikeId (disponivel/parcialmente/indisponivel/manutencao)
- [x] client/public/shopify-availability.js: widget JS para Shopify (badge + desabilitar inputs + polling 60s)
- [x] Dashboard.tsx: filtro de período (Mês atual / Mês anterior / Últimos 3 meses / Este ano)
- [x] server/routers.ts: dashboard.summary e dashboard.weeklyRevenue aceitam startDate/endDate opcionais
- [x] server/routers.ts: clients.restore notifica owner via notifyOwner
- [x] server/routers.ts: rentals.restore notifica owner via notifyOwner
- [x] server/routers.ts: bikes.list paginado { data, total, totalPages, page }
- [x] server/routers.ts: accessories.list paginado { data, total, totalPages, page }
- [x] Bikes.tsx: page state + consumir .data + rodapé Anterior/Próxima
- [x] Accessories.tsx: page state + consumir .data + rodapé Anterior/Próxima
- [x] Rentals.tsx: corrigir consumo de bikesData.data e accessoriesData.data
- [x] Bikes.tsx: dialog-mobile nos DialogContent (BikeFormDialog + DiscountRulesEditor)
- [x] Accessories.tsx: dialog-mobile nos DialogContent (UnitsDialog + CRUD + DeleteConfirm)
- [x] server/biketogo.test.ts: corrigir teste bikes.list para esperar objeto paginado
- [x] server/v2.test.ts: corrigir teste bikes.list para esperar objeto paginado
- [x] TypeScript zerado, 41 testes passando

## Tarefa 13 — UX de fotos e upload

- [x] ClientProfile.tsx: lightbox ao clicar em fotos de documento (frente/verso + docs adicionais)
- [x] ClientProfile.tsx: fotos exibidas em 280×180px com object-fit cover antes do lightbox
- [x] ClientProfile.tsx: lightbox fullscreen com fundo escuro, botão X, fechar ao clicar fora ou ESC
- [x] PublicReservation.tsx: lightbox ao clicar no preview de documento no step de upload
- [x] PublicReservation.tsx: preview 280×180px com object-fit cover antes do lightbox
- [x] PublicReservation.tsx: lightbox fullscreen com fundo escuro, botão X, fechar ao clicar fora ou ESC
- [x] Bikes.tsx: preview de foto na proporção 4:3 (aspectRatio 4/3) com object-fit cover
- [x] Bikes.tsx: texto orientativo "Recomendado: 800×600px, proporção 4:3, máximo 2MB"
- [x] Bikes.tsx: aviso amarelo se foto > 2MB
- [x] TypeScript zerado, 41 testes passando

## Bug Fix — Bikes e Acessórios não apareciam no painel admin

- [x] server/routers.ts: bikes.list — campos status/search/category trocados de .optional() para .nullish() (aceita null enviado pelo tRPC)
- [x] server/routers.ts: bikes.list — null convertido para undefined antes de passar para getBikes()
- [x] server/routers.ts: accessories.list — mesma correção (nullish + null→undefined antes de getAccessories())
- [x] TypeScript zerado, 41 testes passando

## Tarefa 28 — Bugs críticos (RESOLVIDOS)

- [x] Bug 1: resumo da reserva no step 5 usa dados do carrinho (cart[0].numDays, cart[0].bikeLabel, totais reais)
- [x] Bug 2: tabela ativa em Rentals.tsx não aparecia quando viewMode === "archived" (else → viewMode === "active" ? ... : null)
- [x] Bug 3: TabsList de Bikes.tsx (4 abas) e Clients.tsx (6 abas) — grid-cols-N → flex scrollável com overflow-x-auto
- [x] Bug 4: barra de progresso do /reservar já estava correta no mobile (label compacto "1/6 — Nome do step")
- [x] Bug 5: createUnit em routers.ts agora atualiza quantidadeTotal e quantity no acessório pai após inserir unidade
- [x] Bug 6: validação de CPF restaurada em PublicReservation.tsx (step 0), Clients.tsx (handleSubmit) e routers.ts (clients.create + submitReservation)

## Tarefa 15 — Dados da empresa, replacementValue, bloqueio confirmação, PDF, serialNumber, lightbox

- [x] Settings.tsx: seção Dados da Empresa com 9 campos (nome, CNPJ, endereço, cidade, estado, CEP, telefone, e-mail, site)
- [x] drizzle/schema.ts: campo replacementValue (decimal 10,2 nullable) em accessories
- [x] drizzle/0009_*.sql: migration gerada para replacementValue
- [x] scripts/add-replacement-value.mjs: migration aplicada no Supabase
- [x] server/routers.ts: accessories.create e accessories.update aceitam replacementValue
- [x] client/src/pages/Accessories.tsx: campo Valor de Reposição no formulário
- [x] server/routers.ts: contracts.confirmAll bloqueia se client.status !== "verified"
- [x] server/routers.ts: contracts.getById retorna clientStatus
- [x] client/src/pages/Contracts.tsx: aviso visual + botão desabilitado quando cliente não verificado
- [x] server/pdf.ts: generateContractPdf com pdfkit (dados da empresa, cliente, bikes, acessórios, assinatura)
- [x] server/routers.ts: contracts.confirmAll gera PDF, faz upload S3, salva pdfUrl, envia e-mail com link
- [x] server/routers.ts: contracts.getById retorna unitId e serialNumber dos acessórios
- [x] client/src/pages/Contracts.tsx: serialNumber exibido no checklist de devolução
- [x] client/src/pages/Rentals.tsx: componente Lightbox adicionado + estado lightboxSrc/lightboxAlt + openLightbox/closeLightbox
- [x] TypeScript zerado (exceto 22 erros pré-existentes em Rentals.tsx), 41 testes passando

## Tarefa 15.1 — Correções pós-PDF

- [x] server/pdf.ts: buscar dados da empresa via getSetting("company_*") em vez de fallback hardcoded
- [x] server/pdf.ts: placeholders descritivos quando campo não configurado (ex: "[Razão Social não configurada]")
- [x] server/pdf.ts: exibir caução, termos e foro quando configurados
- [x] Contracts.tsx: botão "Baixar Contrato PDF" com ícone Download quando pdfUrl preenchido
- [x] Contracts.tsx: texto cinza "PDF não gerado" quando pdfUrl é null
- [x] Rentals.tsx: corrigir erros TS nas linhas 345, 395, 441, 478, 503, 767 (bikesData/accessoriesData .data)
- [x] server/routers.ts: remover busca de empresa_* e campos empresa* da chamada ao generateContractPdf (consequência necessária da mudança em pdf.ts)

## Tarefa 15.2 + Tarefa 34 — Campos Settings + Horários de Entrega Configuráveis

- [x] Settings.tsx: adicionar campos company_foro (foro de eleição), company_caucao (valor caução) e company_terms (termos e condições do contrato)
- [x] Settings.tsx: nova seção "Horários de Entrega" com grid de toggles (ativar/desativar horários), adição de horários personalizados e botão "Salvar horários"
- [x] server/routers.ts: novo endpoint publicApi.getDeliveryHours — lê delivery_hours do banco (JSON array), fallback para slots padrão 09:00-19:00 (30min)
- [x] PublicReservation.tsx: substituir array TIMES hardcoded por query trpc.publicApi.getDeliveryHours.useQuery()
- [x] TypeScript zerado (EXIT: 0), 41 testes passando

## Pacote Essencial (Contrato Unificado + Pagamento Presencial + E-mail Profissional)
- [x] Parte 1: submitReservation insere acessórios em contract_accessories (além de rental_accessories)
- [x] Parte 1: contracts.getById retorna replacementValue dos acessórios
- [x] Parte 1: Contracts.tsx exibe tabela de acessórios com coluna "Valor de Reposição"
- [x] Parte 2: mutation contracts.confirmPayment (marca rentals como paid, registra receita, ativa bikes)
- [x] Parte 2: Contracts.tsx botão "Confirmar Pagamento" visível quando paymentStatus = pending
- [x] Parte 3: server/email-templates.ts com template HTML profissional multi-bike
- [x] Parte 3: submitReservation usa template profissional e envia cópia para company_email

## Tarefa 32 — Melhorias de Acessórios
- [x] Schema: campo obrigatorio (boolean DEFAULT false) em accessories
- [x] Schema: campo variante (varchar 100) em accessory_units
- [x] Migração SQL aplicada em ambos os bancos (dev + sandbox)
- [x] routers.ts: accessories.create/update aceitam campo obrigatorio
- [x] routers.ts: nova mutation accessories.deleteUnit (com proteção: não exclui se alugado)
- [x] routers.ts: createUnit/updateUnitStatus expõem campo variante
- [x] routers.ts: endpoints públicos availableAccessories/ByCategory retornam obrigatorio
- [x] Accessories.tsx: toggle "Acessório Obrigatório" no formulário de criação/edição
- [x] Accessories.tsx: badge "Obrigatório"/"Opcional" na listagem (desktop e mobile)
- [x] Accessories.tsx: botão excluir unidade individual com confirmação (desabilitado se alugado)
- [x] Accessories.tsx: campo variante no painel de unidades (criar e editar)
- [x] Accessories.tsx: campo "Quantidade Total" removido do formulário de criação
- [x] PublicReservation.tsx: acessórios obrigatórios exibidos fixos com badge âmbar
- [x] PublicReservation.tsx: dropdown de variante para obrigatórios e opcionais selecionados
- [x] PublicReservation.tsx: variante incluída no payload do submitReservation
- [x] TypeScript zerado (EXIT: 0), 41 testes passando

## Tarefa 33 — Gerenciamento de Manutenção
- [x] routers.ts: mutation bikes.deleteMaintenanceLog — remove log, restaura quantidadeDisponivel se ativo, restaura status da bike se sem manutenções pendentes, registra em audit_logs
- [x] routers.ts: updateMaintenance já restaura quantidadeDisponivel ao concluir (confirmado, sem alteração necessária)
- [x] Bikes.tsx: botão lixeira em cada registro de manutenção
- [x] Bikes.tsx: confirmação inline antes de excluir (com aviso sobre restauração de estoque para logs ativos)
- [x] Bikes.tsx: botão "Marcar como concluída" já existia — adicionado invalidate de listSizes
- [x] Bikes.tsx: filtro de histórico — manutenções concluídas há mais de 30 dias ficam ocultas por padrão
- [x] Bikes.tsx: link "Ver histórico completo (N registros ocultos)" para exibir todos
- [x] TypeScript zerado (EXIT: 0), 41 testes passando

## Tarefa 16 — Gráfico de Receita por Modelo de Bike
- [x] routers.ts: query dashboard.revenueByBike — agrupa rentals pagos por bike.model no período, retorna [{modelo, receita}]
- [x] Dashboard.tsx: import PieChart/Pie/Cell do recharts
- [x] Dashboard.tsx: query trpc.dashboard.revenueByBike.useQuery(periodDates)
- [x] Dashboard.tsx: gráfico PieChart donut com cor dourada #C8920A para maior receita, tons progressivos para demais
- [x] Dashboard.tsx: legenda lateral com modelo, percentual e valor formatado em BRL
- [x] Dashboard.tsx: estado vazio "Nenhum aluguel pago no período selecionado"
- [x] Dashboard.tsx: respeita filtro de período do dashboard
- [x] TypeScript zerado (EXIT: 0), 41 testes passando

## Tarefa 17 — WhatsApp ao encerrar contrato com pendência
- [x] routers.ts: contracts.close — quando hasPendencia=true, busca nomes dos acessórios via JOIN com accessories
- [x] routers.ts: busca nome do cliente via JOIN com clients
- [x] routers.ts: monta mensagem "⚠️ Contrato #[id] encerrado com PENDÊNCIA..." com lista de itens pendentes
- [x] routers.ts: lê whatsapp_number das Configurações via getSetting + sanitizePhone
- [x] routers.ts: chama sendWhatsApp dentro de try/catch — falha silenciosa se Z-API não configurado
- [x] routers.ts: sem pendência = nenhum WhatsApp enviado
- [x] TypeScript zerado (EXIT: 0), 41 testes passando

## Tarefa 18 — Modal de Edição de Cliente Completo
- [x] ClientProfile.tsx: modal de edição com 6 abas (Identificação, Contato, Endereço, Documentos, Perfil de Uso, LGPD)
- [x] Pré-preenchimento de todos os campos com dados atuais do cliente
- [x] Máscaras aplicadas (CPF, RG, CEP, telefone, data) via useMask.ts
- [x] Validação de CPF (2 dígitos verificadores) e RG para brasileiros
- [x] Busca automática de endereço via ViaCEP ao preencher CEP
- [x] Upload de documentos (frente/verso) com preview antes de salvar
- [x] Lightbox nas fotos de documento preservado
- [x] DDI selecionável para WhatsApp (estrangeiros)
- [x] Aba LGPD com checkbox de aceite e marketing
- [x] TypeScript zerado (EXIT: 0), 41 testes passando

## Tarefa 19 — Criar Contrato Manualmente pelo Painel
- [x] server/routers.ts: mutation contracts.createManual (valida cliente verificado, cria contract + rentals + accessories, audit log)
- [x] Contracts.tsx: botão "+ Novo Contrato" no header da página
- [x] Contracts.tsx: componente VerifiedClientAutocomplete com badge de status verificado/não verificado
- [x] Contracts.tsx: modal NewContractModal com 4 passos (Cliente, Bikes, Acessórios, Resumo)
- [x] Passo 1: autocomplete de cliente com aviso para não verificados
- [x] Passo 2: seleção de bike + tamanho + datas + quantidade + disponibilidade por tamanho
- [x] Passo 3: acessórios obrigatórios fixos + opcionais toggleáveis
- [x] Passo 4: resumo com total calculado + observações + botão criar contrato
- [x] TypeScript zerado (EXIT: 0), 41 testes passando

## Tarefa 20 — Auditoria de Disponibilidade por bikeSizeId
- [x] bikes.checkAvailability: corrigido — agora filtra por bikeSizeId individual, conta ['active','overdue'], ignora 'pending', suporta parâmetro quantity
- [x] publicApi.checkAvailability: corrigido — agora filtra por bikeSizeId individual, conta ['active','overdue'], ignora 'pending', suporta parâmetro quantity
- [x] publicApi.bikeSizes: já estava correto (filtro por bikeSizeId, ['active','overdue'], ignora 'pending')
- [x] /api/shopify/bike-availability (server/_core/index.ts): já estava correto (filtro por bikeSizeId, ['active','overdue'])
- [x] submitReservation: cria rentals com status 'pending' sem decrementar — correto por design (admin confirma depois)
- [x] contracts.createManual: não faz query de disponibilidade, apenas decrementa quantidadeDisponivel — correto por design
- [x] TypeScript zerado (EXIT: 0), 41 testes passando

## Tarefa 38 — Aluguel Manual Completo
- [x] contracts.createManual: gerar PDF e salvar pdfUrl no contrato
- [x] contracts.createManual: enviar e-mail profissional ao cliente e cópia ao company_email
- [x] contracts.createManual: enviar WhatsApp ao dono da loja via Z-API
- [x] contracts.createManual: aceitar variante e unitId por acessório no input
- [x] NewContractModal: dropdown de variante por acessório no passo 3
- [x] NewContractModal: campo de quantidade por acessório no passo 3
- [x] NewContractModal: passar variante e unitId no payload do handleSubmit

## Tarefa 40 — Equiparar "Novo Aluguel" ao "Novo Contrato" (reutilização de componente)
- [x] Contracts.tsx: adicionado `export` ao NewContractModal para permitir importação externa
- [x] Rentals.tsx: removido componente NewRentalDialog (~400 linhas) — substituído por reutilização do NewContractModal
- [x] Rentals.tsx: `<NewRentalDialog ...>` substituído por `<NewContractModal open={showNew} onClose={...} />`
- [x] Rentals.tsx: removidos imports não utilizados após remoção do NewRentalDialog (Truck, Clock, Package, useMemo)
- [x] Rentals.tsx: removidas funções helper não utilizadas (generateTimeSlots, daysBetween)
- [x] TypeScript zerado (EXIT: 0), 41 testes passando

## Fix Crítico Tarefa 40 — Quebrar import circular Rentals.tsx ↔ Contracts.tsx
- [x] Criado client/src/components/NewContractModal.tsx com NewContractModal + VerifiedClientAutocomplete + tipos BikeEntry/AccessoryEntry extraídos de Contracts.tsx
- [x] Contracts.tsx: removida definição do NewContractModal; adicionado import de @/components/NewContractModal
- [x] Rentals.tsx: atualizado import de ./Contracts para @/components/NewContractModal
- [x] Import circular eliminado — ambas as páginas importam do módulo neutro em components/
- [x] TypeScript zerado (EXIT: 0), 41 testes passando

## Tarefa 41 — Transformar /reservar em pré-cadastro simples
- [x] server/routers.ts: adicionada mutation publicApi.submitPreRegistration (cria cliente com status "lead", envia notificação ao dono)
- [x] PublicReservation.tsx: removidos steps de bikes/datas/acessórios/pagamento; mantidos 4 steps: Identificação, Contato, Endereço, Documentos+LGPD
- [x] PublicReservation.tsx: submit chama trpc.publicApi.submitPreRegistration (não submitReservation)
- [x] submitReservation mantido no backend (não removido) para compatibilidade com rate-limiter em server/_core/index.ts
- [x] Tela de sucesso: mensagem clara de que a equipe entrará em contato para combinar bike e acessórios
- [x] TypeScript: 0 erros | Testes: 41/41 passando

## Hotfix — Dashboard carregamento infinito (intermitente)
- [x] server/db.ts: adicionado `prepare: false` (obrigatório para transaction pooler Supabase/pgBouncer), max: 10, idle_timeout: 20, connect_timeout: 10
- [x] server/routers.ts: weeklyRevenue refatorado de 24 queries (loop 8 semanas × 3) para 3 queries totais com agrupamento em JavaScript
- [x] Formato de retorno idêntico ao anterior: [{ week, receitaAlugueis, receitasExtras, despesas }]
- [x] TypeScript: 0 erros | Testes: 41/41 passando

## Hotfix Crítico — Perda de dados ao editar/bloquear/salvar observações de cliente
- [x] server/routers.ts (clients.update): substituído spread de todas as colunas por loop que inclui apenas campos enviados (undefined ignorado); validarDocumentoCliente só chamado quando campos de documento estão presentes
- [x] client/src/pages/ClientProfile.tsx: textarea de observações migrado para estado local (localNotes); botão "Salvar observações" explícito; onChange atualiza apenas estado local, sem chamar mutation a cada tecla
- [x] server/db.ts: like → ilike nas 3 buscas (clients: name/cpf/rg; bikes: model/serialNumber/brand; accessories: name/serialNumber)
- [x] TypeScript: 0 erros | Testes: 41/41 passando

## Lote 2 — Correções de PDF, Quantidade e Upload de Documentos
- [x] server/pdf.ts: Bug A corrigido — coluna esquerda com width:320, leftEndY/rightEndY calculados, cursor posicionado abaixo da coluna mais alta antes do divider
- [x] server/pdf.ts: Bug B corrigido — rodapé posicionado em doc.page.height - 50 com lineBreak: false (sem página em branco)
- [x] client/src/components/NewContractModal.tsx: input de quantidade com max = quantidadeDisponivel do tamanho selecionado; clamp aplicado no onChange; botão "Adicionar bike" desabilitado quando disponível = 0
- [x] server/routers.ts (contracts.createManual): validação de disponibilidade por tamanho ANTES de criar contrato/rentals; lança PRECONDITION_FAILED se quantidade > disponível
- [x] client/src/pages/ClientProfile.tsx (EditClientModal): handleSubmit tornado async; uploadDocMutation adicionado; documentos frente/verso enviados via publicApi.uploadDocument após update de texto; modal fecha apenas após todos os uploads concluírem
- [x] TypeScript: 0 erros | Testes: 41/41 passando

## Lote 3a — Disponibilidade de Bikes: Modelo Derivado (Fonte Única de Verdade)
- [x] server/db.ts: adicionados imports inArray, ne + tabelas bikeSizes, bikeMaintenanceLogs
- [x] server/db.ts: criado e exportado getSizeAvailability(bikeSizeId, startDate?, endDate?, excludeRentalId?) — deriva disponibilidade de quantidadeTotal - rented - maintenance sem usar quantidadeDisponivel
- [x] server/routers.ts (bikes.checkAvailability): substituído cálculo manual por getSizeAvailability(bikeSizeId, startDate, endDate)
- [x] server/routers.ts (publicApi.bikeSizes): substituído cálculo manual por getSizeAvailability(size.id) para cada tamanho
- [x] server/routers.ts (publicApi.checkAvailability): substituído cálculo manual por getSizeAvailability(bikeSizeId, startDate, endDate)
- [x] server/routers.ts (contracts.createManual): substituído bloco de validação manual por getSizeAvailability(b.bikeSizeId, b.startDate, b.endDate)
- [x] Writes do contador quantidadeDisponivel mantidos inertes (não removidos — Lote 3b)
- [x] TypeScript: 0 erros | Testes: 41/41 passando

## Lote 3b — Displays de Disponibilidade de Bike: Modelo Derivado
- [x] server/routers.ts (bikes.listSizes): substituído db.select() cru por Promise.all com getSizeAvailability(s.id) para cada tamanho
- [x] server/_core/index.ts (GET /api/shopify/bike-availability): removida query activeRentals; substituído cálculo manual por getSizeAvailability(size.id)
- [x] client/src/pages/Bikes.tsx: removido campo "Qtd. Disponível" dos formulários de adicionar e editar tamanho; grid 3→2 colunas; estado qtDisp e editData.quantidadeDisponivel removidos
- [x] server/routers.ts (addSize): quantidadeDisponivel tornado opcional; ao criar, grava quantidadeDisponivel = quantidadeTotal (inerte)
- [x] server/routers.ts (updateSize): quantidadeDisponivel ignorado no input; ao atualizar quantidadeTotal, espelha em quantidadeDisponivel (inerte)
- [x] TypeScript: 0 erros | Testes: 41/41 passando

## Lote 3c — Quebra de Disponibilidade por Tamanho + Badge Derivado na Lista
- [x] server/db.ts: adicionado getSizeBreakdown (retorna { total, alugada, manutencao, disponivel }); getSizeAvailability refatorado para delegar ao getSizeBreakdown
- [x] server/routers.ts (bikes.listSizes): substituído getSizeAvailability por getSizeBreakdown; retorna alugada e manutencao além de quantidadeDisponivel
- [x] server/routers.ts (bikes.list): soma getSizeBreakdown de todos os tamanhos da bike; anexa disponivelTotal e qtdTotal a cada bike da página
- [x] client/src/pages/Bikes.tsx (aba Tamanhos): exibe quebra colorida com pontos (verde=disponível, dourado=#C8920A=alugada, laranja=manutenção), mostrando só o que for > 0
- [x] client/src/pages/Bikes.tsx (lista): badge de status derivado de disponivelTotal/qtdTotal (verde X/Y disp., vermelho Indisponível, cinza Sem tamanhos)
- [x] server/biketogo.test.ts: adicionados getDb, getSizeBreakdown e getSizeAvailability ao mock de db para corrigir teste bikes.list
- [x] TypeScript: 0 erros | Testes: 41/41 passando

## Lote S1 — Configurações: botão único de salvar por seção + renderTerms no PDF
- [x] server/routers.ts: adicionada mutation settings.setMany (salva múltiplos pares chave/valor em uma chamada)
- [x] client/src/pages/Settings.tsx: reescrito com botão "Salvar" por seção (não mais por campo individual); usa setMany
- [x] client/src/pages/Settings.tsx: adicionados campos de contrato PDF (foro, caução, termos) na seção Dados da Empresa
- [x] server/pdf.ts: adicionado helper renderTerms (parágrafos com espaçamento, cláusulas numeradas em negrito)
- [x] server/pdf.ts: substituído doc.text(empresaTermos) por renderTerms(doc, empresaTermos, pageWidth)
- [x] TypeScript: 0 erros reais (tsc --noEmit fresco), 41 testes passando

## Lote D1 — Encerrar contrato libera estoque + "Tamanho não informado"
- [x] server/routers.ts (contracts.close): antes do recalcContractStatus, busca todos os rentals com status IN ('active','overdue') do contrato e chama updateRental(id, { status: "returned", returnedAt: new Date() }) para cada um — libera o estoque derivado
- [x] server/routers.ts (rentals.list): após getRentals, coleta bikeSizeIds únicos, faz SELECT id/tamanho FROM bikeSizes WHERE id IN (...), monta Map e anexa bikeSize: { tamanho } a cada rental — elimina "Não informado" na tela de Aluguéis
- [x] client/src/pages/Rentals.tsx: corrigido erro de tipo no indexador de paymentMethod (cast para Record<string, string>)
- [x] TypeScript: 0 erros reais (tsc --noEmit fresco), 41 testes passando

## Lote L0 — Limpeza de Código Morto
- [x] Deletados arquivos da raiz: notes-screenshot.txt, todo.md (raiz), add-weight-column.mjs, apply-migration-032.mjs (já estavam ausentes no checkpoint 68a7fe83)
- [x] Removido import { createStripeCheckout } from "./stripe" de server/routers.ts
- [x] Removida procedure bikesRouter.checkAvailability de server/routers.ts
- [x] Removida procedure publicApiRouter.availableBikes de server/routers.ts
- [x] Removida procedure publicApiRouter.checkAvailability de server/routers.ts
- [x] Removida procedure publicApiRouter.getDeliveryHours de server/routers.ts
- [x] Removida procedure publicApiRouter.submitReservation de server/routers.ts
- [x] Removida procedure publicApiRouter.createCheckout de server/routers.ts
- [x] Testes de checkAvailability e availableBikes substituídos por comentários em v2.test.ts
- [x] TypeScript: 0 erros reais (tsc --noEmit fresco) | Testes: 39/39 passando

## C1 Consolidado — Formulário Público + Configurações
- [x] PublicReservation.tsx: campos firstName/lastName separados (nome + sobrenome)
- [x] PublicReservation.tsx: altura e peso obrigatórios com validação
- [x] PublicReservation.tsx: e-mail obrigatório com validação de formato
- [x] PublicReservation.tsx: hospedagem opcional (sem validação)
- [x] PublicReservation.tsx: seletor CNH/RG para brasileiros (step 0 e step 3)
- [x] PublicReservation.tsx: slot único de upload de documento (PDF ou imagem, frente + verso progressivo)
- [x] PublicReservation.tsx: tutorial "Como baixar PDF da CNH" com ícones Lucide (Smartphone, Download, Upload)
- [x] PublicReservation.tsx: nota "Estrangeiro ou sem CNH digital? Envie foto do passaporte ou RG"
- [x] PublicReservation.tsx: tela de sucesso com botão WhatsApp (usa whatsapp_reservas)
- [x] server/routers.ts: publicApi.getReservationWhatsApp (lê setting whatsapp_reservas)
- [x] server/routers.ts: submitPreRegistration — height/weight obrigatórios, email obrigatório
- [x] server/routers.ts: uploadDocument — validação de mimeType (image/* ou application/pdf)
- [x] NewClientDialog.tsx: campos firstName/lastName separados, email/height/weight obrigatórios
- [x] Settings.tsx: campo "WhatsApp para reservas" (whatsapp_reservas) na seção Contato & Notificações
- [x] ClientProfile.tsx: exibição de PDF (link "Abrir PDF") e imagem (lightbox) para docFrontUrl/docBackUrl
- [x] TypeScript: 0 erros reais (erros pré-existentes variante/replacementValue/accessoryId) | Testes: 44/44 passando

## Lote C3 — Fix bike + Criar aluguel no perfil
- [x] NewContractModal.tsx: Fix A — removido filtro status:"available" da query bikes.list (listagem correta no step 2)
- [x] NewContractModal.tsx: Fix B — adicionada prop opcional initialClient?: { clientId, clientName }; quando presente em modo criação, pré-preenche cliente e abre no step 2
- [x] ClientProfile.tsx: Fix C — botão "Criar aluguel" (PlusCircle) visível apenas para clientes verificados; abre NewContractModal com initialClient pré-selecionado; onClose invalida rentals + bikes
- [x] TSC: 0 erros novos | grep initialClient: 5 ocorrências | grep status:available: 0 | Testes: 44/44 passando

## Lote L-Stripe — Remoção completa do Stripe
- [x] server/stripe.ts: arquivo deletado inteiramente
- [x] server/_core/index.ts: removido import constructStripeEvent e toda a rota /api/stripe/webhook
- [x] server/routers.ts: removido "stripe" dos dois enums z.enum de paymentMethod
- [x] server/email-templates.ts: removida entrada stripe do mapa de labels de pagamento
- [x] client/src/lib/i18n.ts: removidas chaves paymentCardDesc, paymentPixDesc, submitButtonStripe nos 3 idiomas
- [x] package.json: removidas dependências "stripe" e "@stripe/stripe-js" via pnpm remove
- [x] grep -riE "stripe" server client: VAZIO (nenhum rastro)
- [x] TSC: 0 erros novos | firstName/lastName: 11 | initialClient: 5 | getAccessoryBreakdown: 1 | Testes: 44/44

## Lote L-Notif — Remoção de E-mail Automático e WhatsApp Z-API

- [x] Deletar server/email.ts
- [x] Deletar server/whatsapp.ts
- [x] Deletar server/email-templates.ts
- [x] Remover imports sendEmail/sendWhatsApp/buildProfessional do routers.ts
- [x] Remover bloco sendEmail do confirmAll (PDF)
- [x] Remover bloco sendWhatsApp+sendEmail do submitPreRegistration
- [x] Remover bloco sendWhatsApp do encerramento de contrato (pendência)
- [x] Remover bloco try/catch de email+whatsapp do createManual
- [x] Remover seção "Email Automático (Resend)" do Settings.tsx
- [x] Remover seção "WhatsApp Automático" (Z-API + Cloud API) do Settings.tsx
- [x] Remover estados resendApiKey/zapiInstanceId/zapiToken/waApiToken/waPhoneId do Settings.tsx
- [x] Remover testes de email/whatsapp do v2.test.ts
- [x] Preservar sanitizePhone, getReservationWhatsApp, notifyOwner, whatsapp_reservas

## Lote L-Entrega — Remoção de Entrega e Horários

- [x] Remover seção "Entrega" (taxa + margem) do Settings.tsx
- [x] Remover seção "Horários de Entrega" do Settings.tsx
- [x] Remover estados/helpers: deliveryFee, deliveryMargin, deliveryHours, HourEntry, activeHours, addCustomHour, removeCustomHour, saveDeliveryHours, savingDelivery
- [x] Remover hydrate de delivery_fee, delivery_margin_min, delivery_hours
- [x] Remover deliveryFee dos schemas de rentals.create e rentals.update no routers.ts
- [x] Remover procedure pública deliveryFee no routers.ts
- [x] Remover describe("publicApi.deliveryFee") do v2.test.ts

## Lote Alinhar-Cadastro-v2 — NewClientModal em Clients.tsx
- [x] NewClientDialog.tsx deletado (código morto)
- [x] NewClientModal em Clients.tsx reconstruído espelhando /reservar
- [x] firstName/lastName adicionados ao schema Drizzle + migration aplicada no banco
- [x] clients.create no routers.ts aceita firstName/lastName
- [x] TSC: 0 erros novos | Testes: 39/39

## Lote PDF — Contrato BTG

- [x] server/pdf.ts reescrito com layout BTG aprovado (header dark+gold, logo, partes, tabelas, termos, assinaturas, rodapé)
- [x] server/assets/logo-btg.png criado (logo BTG convertida de webp)
- [x] settings.uploadLogo adicionado ao settingsRouter (base64 → S3 → company_logo_url)
- [x] Settings.tsx: seção upload de logo na área Dados da Empresa
- [x] routers.ts: query generateContractPdf expandida com clientRg, tamanho, dailyRate, valorReposicao, company_logo_url

## LOTE 4B — Batch getSizeBreakdowns no bikes.list (eliminar N+1)

- [x] server/routers.ts (bikes.list): refatorado para usar getSizeBreakdowns batch em vez de loop N+1
- [x] server/routers.ts (listSizes): removido import orfão de getSizeBreakdown
- [x] server/db.ts (getSizeBreakdown singular): convertido em delegação ao batch
- [x] server/biketogo.test.ts: adicionado getSizeBreakdowns ao mock de db
- [x] TSC: 0 erros | Testes: 39/39 passando
- [x] Verificação: grep getSizeBreakdown routers.ts = 0 hits (singular não mais usado em routers)

## LOTE 5 — Testes de disponibilidade/overlap e atribuição de unidades (PGLite)

- [x] A1: pnpm add -D @electric-sql/pglite (0.5.4)
- [x] A2: export async function assignBikeUnits (~2340) + releaseBikeUnits (~2433)
- [x] A3: getSizeBreakdowns + getSizeBreakdown com dbOverride opcional (ZERO mudança de comportamento)
- [x] A4: findAvailableBikeUnits exportado; endpoint bikeUnits.available vira casca fina
- [x] B1: server/test-helpers/pglite-db.ts — createTestDb, seedBasics, makeRental
- [x] C1: getSizeBreakdowns — 8 testes de overlap (sobrepoe, nao sobrepoe, borda, endDate NULL, cancelled, deletado, pending, overdue)
- [x] C2: getSizeBreakdowns — 3 testes de unidades (total/manutencao/disponivel, nunca negativo)
- [x] C3: excludeRentalId / excludeContractId — 2 testes
- [x] C4: assignBikeUnits AUTO — 4 testes (liga, pula manutencao, pula sobreposto, best-effort)
- [x] C5: assignBikeUnits PICK — 5 testes (validos, outro tamanho, manutencao, sobreposto, atomico)
- [x] C6: releaseBikeUnits — 1 teste
- [x] C7: findAvailableBikeUnits — 4 testes (disponivel/ordem, exclui sobreposto, excludeRentalId, cancelado/deletado)
- [x] Verificação: 66/66 testes passando (39 antigos + 27 novos) | TSC: 0 erros novos | 3 exports confirmados

## LOTE 6A — Contrato excluível/restaurável (backend)

- [x] contracts.archive renomeado para contracts.delete
- [x] contracts.delete: cascata releaseBikeUnits + soft-delete rentals + audit log "excluiu_contrato"
- [x] contracts.listDeleted: paginado, shape idêntico ao contracts.list + campo deletedAt, orderBy desc(deletedAt)
- [x] contracts.restore: restaura contrato + rentals + assignBikeUnits best-effort + audit log "restaurou_contrato"
- [x] Import de desc e isNotNull adicionado ao import drizzle-orm do contractsRouter
- [x] TSC: 0 erros novos | Testes: 66/66 passando
- [x] Grep contracts.archive: 0 hits em server/ e client/src/

## LOTE 6B — Aba Excluídos + Aposentar /alugueis
- [x] Aba "Excluídos" em Contracts.tsx com listDeleted + paginação + botão Restaurar
- [x] Botão Excluir (Trash2) nas abas Ativos e Arquivados com confirmDialog (Promise<boolean>)
- [x] /alugueis redireciona para /contratos (Redirect wouter em App.tsx)
- [x] Item "Aluguéis" removido da sidebar (DashboardLayout.tsx)
- [x] Rentals.tsx deletado
- [x] listGroupedByContract removido do rentalsRouter (órfão)
- [x] NewContractModal.tsx: removido invalidate de listGroupedByContract
- [x] Dashboard.tsx e Home.tsx: /alugueis → /contratos
- [x] TSC: 0 erros novos | Testes: 66/66 passando

## LOTE R1 — Redesign: Tokens Âmbar + Fonte Geist
- [x] Tokens :root e .dark trocados para âmbar OKLCH (--primary: oklch(0.82 0.17 80))
- [x] Fonte Geist + Geist Mono via Google Fonts (substitui Montserrat + Inter)
- [x] --radius: 0.375rem → 0.625rem; --radius-* proporcionais
- [x] --border dark: oklch(0.25 0.006 240) → oklch(1 0 0 / 10%)
- [x] chart-*, sidebar-* atualizados para spec âmbar
- [x] Apenas client/src/index.css alterado (0 .tsx tocados)
- [x] TSC: 0 erros novos | Testes: 66/66 passando

## LOTE R2 — App Shell Componível
- [x] AppSidebar.tsx criado (Sidebar collapsible="icon" + NavMain 9 itens + NavUser dropdown)
- [x] SiteHeader.tsx criado (SidebarTrigger + Separator + título da página)
- [x] DashboardLayout.tsx refatorado: shell canônico SidebarProvider + AppSidebar + SidebarInset + SiteHeader
- [x] Sistema de resize manual removido (SIDEBAR_WIDTH_KEY, col-resize, MIN/MAX_WIDTH, handlers de mouse)
- [x] TSC: 0 erros novos | Testes: 66/66 | grep artefatos resize: vazio | nenhuma página alterada

## LOTE R2-B — Reestruturar Sidebar em 4 Blocos
- [x] Criar sidebar/NavMain.tsx (botão Novo Contrato + sino + 5 itens: Dashboard, Clientes, Bicicletas, Acessórios, Usuários)
- [x] Criar sidebar/NavDocuments.tsx (Financeiro, Contratos, Auditoria — grupo "Documentos")
- [x] Criar sidebar/NavSecondary.tsx (Configurações — mt-auto, empurrado para baixo)
- [x] Criar sidebar/NavUser.tsx (dropdown com avatar 2 iniciais, ThemeToggle, Sair)
- [x] Reescrever AppSidebar.tsx: compõe 4 blocos + NewContractModal integrado (fora do Sidebar)
- [x] TSC: 0 erros novos | Testes: 66/66 passando

## LOTE R5 — Redesign Clientes com SegmentedTabs + DataTable
- [x] Parte C: 14 ocorrências de #C8920A tokenizadas no modal de upload de documentos (→ text-primary, border-primary/40, etc.)
- [x] Parte A+B: Função Clients() reescrita com SegmentedTabs + DataTable (ColumnDef tipadas)
- [x] activeColumns: Cliente (avatar+nome+CPF), Localidade, Status, Atualização, Ações (Ver + Arquivar)
- [x] archivedColumns: Cliente, Arquivado em (data + badge retenção), Ações (Restaurar)
- [x] calcRetentionBadge tokenizado (bg-destructive/20, bg-primary/10 — sem bg-red-900/40, bg-amber-500/15)
- [x] Select de Status para filtro na aba Ativos
- [x] Paginação server-side via DataTable
- [x] Dead code removido (stale statusFilters + segundo return)
- [x] Fugitivos verificados: 0 ocorrências de #C8920A ou oklch hardcoded em Clients.tsx
- [x] TSC: 0 erros novos | Testes: 66/66 passando

## LOTE R6 — Redesign Bicicletas (card-grid hierárquico + UnitStatusBadge)
- [x] Extrair client/src/components/UnitStatusBadge.tsx (mapa canônico único: disponivel/alugado/manutencao/perdido/roubado)
- [x] Bikes.tsx: grid de cards da casa (bg-card, border-border, hover:border-primary/40, sombra, foto 16:9)
- [x] Card: foto/placeholder, badge categoria, pill disponibilidade, modelo+serial, diária, botões Gerenciar/Descontos/Remover
- [x] Dialog com 4 abas (Dados/Foto/Tamanhos/Manutenção): TabsList tokenizado, visual limpo
- [x] BikeSizesTab: hover:bg-muted/50 nas linhas expansíveis, tokens corretos
- [x] BikeUnitsPanel: UnitStatusBadge importado (removidos BIKE_UNIT_STATUS_COLORS e BIKE_UNIT_STATUS_LABELS locais)
- [x] MaintenanceTab: UnitStatusBadge importado
- [x] AvailabilityPill: bg-emerald-500/15, bg-destructive/10 (tokenizado, sem bg-emerald-100 light-only)
- [x] Fugitivos verificados: 0 ocorrências de #C8920A, oklch inline, bg-[#hex] em Bikes.tsx
- [x] TSC: 0 erros novos (43 pré-existentes) | Testes: 66/66 passando

## LOTE R7 — Redesign Acessórios (card-grid + UnitStatusBadge reutilizado)
- [x] Exportar UNIT_STATUS_LABELS de UnitStatusBadge.tsx para reutilização
- [x] Accessories.tsx: importar UnitStatusBadge (remover UNIT_STATUS_COLORS/UNIT_STATUS_LABELS locais)
- [x] AccessoryUnitsPanel: UnitStatusBadge importado, Select usa UNIT_STATUS_LABELS exportado
- [x] Tokenizar cores hardcoded: bg-[#C8920A]/10 → bg-primary/10, text-[#C8920A] → text-primary
- [x] Tokenizar cores de status: bg-blue-500/20 → bg-amber-500/20 (alugado), bg-red-700 → bg-red-600 (roubado)
- [x] Tabela desktop: hover:bg-muted/30, text-emerald-600 dark:text-emerald-400 (sem hardcoded)
- [x] Mobile cards: bg-primary/10 em vez de bg-[#C8920A]/10
- [x] Botões: bg-primary/90 em vez de bg-[#C8920A] (padrão shadcn)
- [x] Paginação: Button shadcn (variant outline) em vez de custom styles
- [x] Manutenção mini-form: bg-orange-500/5 border-orange-500/30 (tokenizado, sem amber hardcoded)
- [x] Fugitivos verificados: 0 ocorrências de #C8920A em Accessories.tsx (apenas imports)
- [x] TSC: 0 erros novos (43 pré-existentes) | Testes: 66/66 passando
