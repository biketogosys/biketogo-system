# Referência Visual BikeSys — Bike To Go

## Tela 1: Clientes - Lista
- Listagem com colunas: ID, PF/PJ (ícone), Cliente (nome), Localidade, Situação de cadastro, Atualização, Status, Ações
- Situação de cadastro: badge colorido — LEAD (laranja), Verificado (azul)
- Status: badge — Ativo (verde)
- Barra lateral direita: contador de "Clientes Lead" (186 NEW) e "Clientes Cadastrados" (1.917)
- Campo de busca: "Parâmetro de pesquisa"
- Botões no topo: C (atualizar), + (novo cliente)
- Abas no topo da lista: Listagem | Alertas (com badge de contagem)

## Tela 2: Clientes - Visão Geral (Perfil do cliente)
- Painel lateral esquerdo "Controles":
  - Alerta laranja: "LEAD! Este é um cadastro preenchido pelo Cliente." + botão "Validar cadastro"
  - Situação: LEAD
  - Cadastro em: 11/04/2026 às 02h19
  - Atualizado: 11/04/2026
  - Recebe e-mail: toggle on
  - Bloqueado: toggle off
  - Expira em: 11/04/2031
  - Observações
- Abas do perfil: Cadastro | Documentação | Aluguéis | Ordens de Serviços | Créditos | Histórico
- Aba Cadastro:
  - Identificação: ID (1955), Nome (LUCAS DIAS), País (Brasil), Gênero (Masculino)
  - Documentos Pessoa Física: RG/Passaporte, CPF, Data Nascimento, Idade calculada
  - Telefone/E-mail: DDI + número, e-mail com ícone WhatsApp
  - Endereço: CEP, Rua, Número, Bairro, Cidade/Estado
  - Extras: Altura, Freq. pedal, Onde encontrou, Instagram, Hospedagem

## Funcionalidades a implementar no sistema próprio
1. Login com e-mail e senha (dois usuários: dona + desenvolvedor)
2. Lista de clientes com busca, filtros e badges de status
3. Perfil completo do cliente com todas as abas
4. Status: Lead (cadastro pelo site) → Verificado (validado manualmente)
5. Cadastro de bicicletas (modelo, tamanho, série, status)
6. Registro de aluguéis (cliente, bike, datas, valor, forma de pagamento)
7. Histórico por cliente
8. Dashboard com resumo (clientes, aluguéis ativos, receita)
9. Notificação WhatsApp ao receber novo cadastro
10. Integração com formulário do Shopify via API

## Identidade visual do sistema próprio
- Fundo escuro (dark mode) como o BikeSys
- Cores da Bike To Go: dourado #C8920A, preto/escuro
- Badges coloridos para status
- Layout responsivo (desktop prioritário, mas funcional no celular)
