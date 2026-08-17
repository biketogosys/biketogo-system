#!/usr/bin/env node
/**
 * Gera o hash bcrypt da senha do PUBLICADOR do changelog (/publicar-atualizacoes).
 *
 *   node scripts/gerar-hash-publicador.mjs "sua-senha-aqui"
 *
 * Copie a saída para as variáveis do Railway:
 *   PUBLICADOR_USUARIO      = o nome de usuário que você vai digitar
 *   PUBLICADOR_SENHA_HASH   = o hash impresso aqui
 *
 * ⚠️ A senha em texto NUNCA é guardada em lugar nenhum: nem no banco, nem no
 * repositório, nem nas variáveis. Só o hash viaja.
 *
 * ⚠️ Este login é separado do login do sistema de propósito: quem entra em
 * /publicar-atualizacoes não é um usuário da tabela `admin_users` e não aparece
 * na tela de Usuários.
 */
import bcrypt from "bcryptjs";

const senha = process.argv[2];

if (!senha) {
  console.error("\nUso: node scripts/gerar-hash-publicador.mjs \"sua-senha-aqui\"\n");
  process.exit(1);
}

if (senha.length < 10) {
  // Não é frescura: esta credencial fica numa página pública, sem 2FA. O rate
  // limit segura a força bruta online, mas senha curta é convite.
  console.error("\n✖ Senha curta demais (mínimo 10 caracteres). Use uma frase.\n");
  process.exit(1);
}

const hash = await bcrypt.hash(senha, 10);

console.log(`
Hash gerado. Coloque estas duas variáveis no Railway:

  PUBLICADOR_USUARIO=<o usuário que você quiser digitar no login>
  PUBLICADOR_SENHA_HASH=${hash}

Depois de salvar, o Railway reinicia o serviço sozinho e a senha nova já vale.
`);
