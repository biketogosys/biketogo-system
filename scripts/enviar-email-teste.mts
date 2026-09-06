// ─────────────────────────────────────────────────────────────────────────────
// enviar-email-teste.mts
//
// Manda um e-mail DE VERDADE, pelo mesmo caminho que o sistema usa, para o
// endereço que você escolher. Serve para medir entregabilidade sem precisar
// cadastrar cliente nem criar contrato em produção.
//
// Nasceu em 2026-09-06: dois clientes não receberam e-mails que o Resend
// marcou como Delivered, e testar exigia criar um contrato real só para ver
// onde a mensagem caía.
//
// O que ele NÃO faz: não toca no banco, não cria contrato, não altera nada. O
// conteúdo é um contrato de exemplo montado em memória — mas o REMETENTE, a
// API, o HTML, a parte texto e os cabeçalhos são exatamente os de produção, que
// é o que os filtros avaliam.
//
// Uso:
//   railway run npx tsx scripts/enviar-email-teste.mts voce@gmail.com
//   railway run npx tsx scripts/enviar-email-teste.mts test-a1b2@srv1.mail-tester.com
//   railway run npx tsx scripts/enviar-email-teste.mts voce@gmail.com --tipo recibo
//
// O `railway run` empresta as variáveis de produção (RESEND_API_KEY, EMAIL_FROM,
// APP_URL). Sem elas o script não envia: ele mostra o que enviaria e explica o
// que falta, em vez de fingir que deu certo.
//
// ⚠️ Mande só para caixas SUAS. Sai assinado com o domínio da loja.
// ─────────────────────────────────────────────────────────────────────────────
import { buildReservationEmail, buildReceiptEmail } from "../server/email-contract";
import { htmlParaTexto, sendEmailDetalhado } from "../server/email";
import { EMPRESA_VAZIA, carregarEmpresa } from "../server/email-layout";
import { DEFAULT_OBJETO, DEFAULT_TERMOS } from "../server/contract-defaults";
import { ENV } from "../server/_core/env";

const args = process.argv.slice(2);
const destino = args.find((a) => a.includes("@"));
const tipo = (args.includes("--tipo") ? args[args.indexOf("--tipo") + 1] : "reserva") as "reserva" | "recibo";

if (!destino) {
  console.error("✗ Falta o endereço de destino.\n");
  console.error("  railway run npx tsx scripts/enviar-email-teste.mts voce@gmail.com");
  console.error("  railway run npx tsx scripts/enviar-email-teste.mts voce@gmail.com --tipo recibo\n");
  process.exit(1);
}
if (tipo !== "reserva" && tipo !== "recibo") {
  console.error(`✗ Tipo inválido: "${tipo}". Use "reserva" ou "recibo".`);
  process.exit(1);
}

const hoje = new Date();
const dia = (n: number) => new Date(hoje.getTime() + n * 86400000).toISOString().slice(0, 10);

/** Contrato de exemplo: o conteúdo é fictício, o envio é real. */
const dados = {
  contractId: 9999,
  status: tipo === "recibo" ? "encerrado" : "ativo",
  cliente: { nome: "Cliente de Teste", email: destino },
  periodo: { inicio: dia(3), fim: dia(5), horaInicio: "09:00", horaFim: "18:00" },
  itens: [{
    modelo: "Sense MTB Trail 29",
    categoria: "mtb",
    tamanho: "M",
    cor: "Preta",
    numerosSistema: ["MTB-M-001"],
    quantidade: 1,
    inicio: dia(3),
    fim: dia(5),
    horaInicio: "09:00",
    horaFim: "18:00",
    diaria: "150.00",
    desconto: null,
    total: "300.00",
  }],
  acessorios: [{ nome: "Capacete", qty: 1 }],
  valorTotal: "300.00",
  pago: tipo === "recibo",
  formasPagamento: tipo === "recibo" ? [{ method: "pix", amount: "300.00" }] : [],
  dataPagamento: tipo === "recibo" ? dia(0) : null,
  ajustes: [],
} as any;

// A empresa vem do banco quando há DATABASE_URL (é o que o cliente vê de
// verdade); sem banco, cai nos placeholders e o teste continua válido.
const empresa = await carregarEmpresa().catch(() => EMPRESA_VAZIA);

const base = (ENV.appUrl ?? "").replace(/\/+$/, "");
const link = `${base || "https://sistema.biketogofloripa.com.br"}/contrato/9999.exemplodetokenparateste`;

const { subject, html } = tipo === "reserva"
  ? buildReservationEmail(dados, { objeto: DEFAULT_OBJETO.pt, termos: DEFAULT_TERMOS.pt }, empresa, link)
  : buildReceiptEmail(dados, empresa, link);

const texto = htmlParaTexto(html);

console.log(`\n── E-MAIL DE TESTE (${tipo}) ──`);
console.log(`  de      : ${ENV.emailFrom || "(EMAIL_FROM não definido)"}`);
console.log(`  para    : ${destino}`);
console.log(`  assunto : ${subject}`);
console.log(`  HTML    : ${(Buffer.byteLength(html, "utf8") / 1024).toFixed(1)} KB`);
console.log(`  texto   : ${texto.length} caracteres ${texto.length > 200 ? "✅" : "⚠️ curto demais"}`);
console.log(`  link    : ${link}`);
if (!base) {
  console.log("  ⚠️ APP_URL vazio: usando o domínio da loja como padrão. Em produção o link sai do APP_URL.");
} else if (base.includes("railway.app")) {
  console.log("  ⚠️ APP_URL aponta para o domínio do Railway. Link que não bate com o remetente é gatilho de spam.");
}

if (!ENV.resendApiKey) {
  console.log("\n✗ RESEND_API_KEY não está no ambiente: NADA foi enviado.");
  console.log("  → rode com `railway run` na frente para pegar as variáveis de produção.\n");
  process.exit(1);
}

const r = await sendEmailDetalhado({ to: destino, subject, html, replyTo: null });
if (r.ok) {
  console.log("\n✅ Enviado. Agora confira, nesta ordem: Entrada · Promoções (Gmail) · Lixo eletrônico · Outros (Outlook).");
  console.log("   No mail-tester, volte na página e clique em \"Then check your score\".\n");
} else {
  console.log(`\n✗ Não enviou: ${r.motivo}\n`);
  process.exit(1);
}
