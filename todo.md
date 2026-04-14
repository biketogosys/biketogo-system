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
