/**
 * PARTE TEXTO PURO dos e-mails (2026-09-06).
 *
 * **Por que existe:** dois clientes não receberam e-mails que o Resend marcou
 * como *Delivered* — um no Gmail, que nem no spam apareceu. Auditados SPF, DKIM
 * e DMARC (todos certos) e corrigido o `APP_URL` (os links apontavam para o
 * domínio do Railway, cara de phishing), sobrou um último gatilho no nosso
 * controle: **a mensagem ia só como HTML**. E-mail sem parte `text/plain` é
 * sinal de spam em qualquer checklist de entregabilidade.
 *
 * O que se prova aqui: a alternativa em texto tem o MESMO conteúdo do HTML —
 * principalmente **o link do contrato**, que é a razão de o e-mail existir. Uma
 * parte texto vazia ou truncada seria pior que não ter.
 */
import { describe, expect, it } from "vitest";
import { htmlParaTexto } from "./email";

describe("htmlParaTexto", () => {
  it("mantém o texto e descarta a marcação", () => {
    const html = "<div><h1>Reserva confirmada</h1><p>Olá, <b>Daniel</b>!</p></div>";
    const txt = htmlParaTexto(html);
    expect(txt).toContain("Reserva confirmada");
    expect(txt).toContain("Olá, Daniel!");
    expect(txt).not.toMatch(/<[a-z]/i);
  });

  it("⭐ preserva o LINK do contrato (é o motivo do e-mail existir)", () => {
    const url = "https://sistema.biketogofloripa.com.br/contrato/38.b3779306aa8f";
    const txt = htmlParaTexto(`<a href="${url}" style="color:#000">Ver meu contrato</a>`);
    expect(txt).toBe(`Ver meu contrato: ${url}`);
  });

  it("link cujo rótulo já é o endereço não vira endereço repetido", () => {
    const url = "https://sistema.biketogofloripa.com.br/contrato/9.abc";
    expect(htmlParaTexto(`<a href="${url}">${url}</a>`)).toBe(url);
  });

  it("não deixa vazar CSS nem script para o corpo do texto", () => {
    const html = "<style>.x{color:red}</style><script>alert(1)</script><p>Conteúdo</p>";
    const txt = htmlParaTexto(html);
    expect(txt).toBe("Conteúdo");
  });

  it("converte as entidades que o layout usa (o valor não pode sair quebrado)", () => {
    expect(htmlParaTexto("<p>R$&nbsp;450,00 &amp; taxa</p>")).toBe("R$ 450,00 & taxa");
    expect(htmlParaTexto("<p>&lt;tag&gt; &quot;aspas&quot; &#39;linha&#39;</p>")).toBe(`<tag> "aspas" 'linha'`);
  });

  it("uma tabela de itens continua legível linha a linha", () => {
    const html = `<table><tr><td>Bike</td><td>2 diárias</td><td>R$ 300,00</td></tr>
                  <tr><td>Capacete</td><td>1</td><td>gratuito</td></tr></table>`;
    const linhas = htmlParaTexto(html).split("\n").filter(Boolean);
    expect(linhas[0]).toBe("Bike 2 diárias R$ 300,00");
    expect(linhas[1]).toBe("Capacete 1 gratuito");
  });

  it("não devolve uma parede de linhas em branco (texto vazio é pior que nenhum)", () => {
    const html = "<p>Um</p><br><br><br><br><p>Dois</p>";
    expect(htmlParaTexto(html)).toBe("Um\n\nDois");
  });
});

/**
 * DESTINO AVULSO do e-mail de teste (2026-09-06).
 *
 * Pedido do Matheus: testar entregabilidade sem CLI e sem terminal, direto no
 * sistema que já está no ar. Antes o teste ia só para o `notification_email`,
 * então conferir outra caixa exigia trocar essa configuração e lembrar de
 * voltar — que é como uma caixa errada fica gravada por semanas.
 */
describe("enviarEmailDeTeste — destino", () => {
  it("recusa endereço sem @, com motivo legível em vez de tentar enviar", async () => {
    const { enviarEmailDeTeste } = await import("./email");
    const r = await enviarEmailDeTeste("nao-e-email");
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/não é um e-mail válido/i);
  });

  it("endereço avulso vence a caixa configurada (é o ponto do campo)", async () => {
    const { enviarEmailDeTeste } = await import("./email");
    // Sem RESEND_API_KEY o envio falha no transporte, mas o destinatário já foi
    // escolhido antes disso — que é o que este teste observa.
    const r = await enviarEmailDeTeste("igymfu@gmail.com");
    expect(r.motivo).toMatch(/RESEND_API_KEY/i);
    expect(r.motivo).not.toMatch(/não é um e-mail válido/i);
  });

  it("espaços em branco contam como vazio (cai na caixa configurada)", async () => {
    const { enviarEmailDeTeste } = await import("./email");
    const r = await enviarEmailDeTeste("   ");
    // Sem banco no teste, a caixa configurada não existe: o motivo tem que ser
    // esse, e não o de e-mail inválido.
    expect(r.motivo).toMatch(/Nenhum e-mail configurado|RESEND_API_KEY/i);
  });
});
