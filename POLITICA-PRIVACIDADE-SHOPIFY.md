# Adendo à Política de Privacidade — Sistema de Reservas

> **Para o Matheus, não para publicar como está.**
>
> A política que já está no ar em `biketogofloripa.com.br/pages/politica-de-privacidade`
> **serve e não precisa ser refeita.** Ela cobre bem a parte de site e loja
> (cookies, Google Analytics, marketing, direitos do titular).
>
> O que falta é a parte do **sistema de reservas**, que ela foi escrita antes de
> existir. Este documento é um **adendo**: a Cassiana cola no fim da página
> existente, sem apagar nada.
>
> ⚠️ **Antes de publicar:** um advogado deve dar uma passada. Quem responde como
> controladora é ela, não você. Este texto é levantamento técnico do que o
> sistema faz de fato, escrito para ser entendido por leigo, não parecer
> jurídico.
>
> ⚠️ **Dois pontos precisam ser confirmados por você antes de publicar.** Estão
> marcados no fim.

---

## Por que cada bloco existe (base legal)

Não inventei requisito. Cada seção do adendo atende um inciso do **art. 9º da
LGPD** (Lei 13.709/2018), que obriga o controlador a dar ao titular informação
"clara, adequada e ostensiva" sobre o tratamento:

| Bloco do adendo | Base legal |
|---|---|
| Quais dados o sistema coleta | art. 9º, I e II (finalidade e forma) |
| Imagem do documento | art. 9º, I e II — a imagem é tratamento distinto de coletar o número |
| Com quem compartilhamos (Supabase, Railway, Resend, ViaCEP) | **art. 9º, V** (uso compartilhado e sua finalidade) — exigência explícita |
| Transferência internacional | **art. 33** + Resolução CD/ANPD nº 19 (23/08/2024) |
| Por quanto tempo guardamos | **art. 9º, II** (duração) + arts. 15 e 16 (término e eliminação) |
| Link público do contrato | art. 9º, II (forma do tratamento) |
| Direitos do titular | art. 9º, VII + **art. 18** |

---

## TEXTO PARA COLAR NO SHOPIFY

Copie daqui para baixo e cole ao fim da página de política de privacidade.

---

### Sistema de reservas e contratos

Esta seção complementa a política acima e descreve especificamente como tratamos
os dados coletados no nosso sistema de reservas, disponível em
`sistema.biketogofloripa.com.br/reservar`.

**Quais dados coletamos no pré-cadastro**

Nome completo, data de nascimento, CPF, RG ou passaporte, altura e peso,
telefone, e-mail, Instagram, endereço, local de hospedagem e a frequência com
que você pedala. Altura e peso são usados exclusivamente para escolher o tamanho
adequado da bicicleta.

**Imagem do documento de identificação**

Além do número do documento, coletamos e armazenamos a **imagem digitalizada do
seu documento de identificação com foto** (CNH, RG, CIN ou passaporte), enviada
por você no formulário. Ela é usada apenas para conferir a sua identidade na
entrega da bicicleta e para instruir o contrato de locação. O acesso a esse
arquivo é restrito à equipe da Bike To Go.

**Finalidade e base legal**

Os dados acima são tratados para identificar você no contrato de locação,
reservar a bicicleta e os acessórios, combinar entrega e devolução, emitir o
contrato e o recibo, e para comunicação sobre a sua reserva. A base legal é a
**execução do contrato** (art. 7º, V, da LGPD). O envio de comunicações de
marketing depende de aceite específico e separado, que você pode revogar a
qualquer momento.

**Empresas que operam a nossa infraestrutura**

Não vendemos os seus dados. Para operar o sistema, eles são armazenados e
processados pelas seguintes empresas, que atuam como operadoras e só podem
utilizá-los para prestar esse serviço:

- **Supabase** — banco de dados e armazenamento dos arquivos enviados
- **Railway** — hospedagem do sistema
- **Resend** — envio dos e-mails de reserva e de recibo
- **ViaCEP** — consulta automática de endereço a partir do CEP informado

**Transferência internacional de dados**

Parte da infraestrutura descrita acima opera em servidores localizados fora do
Brasil, o que caracteriza transferência internacional de dados nos termos do
**art. 33 da LGPD**. A transferência ocorre exclusivamente para a execução do
contrato de locação e está sujeita às garantias contratuais exigidas pela
legislação brasileira.

**Link de acompanhamento do contrato**

Ao registrar a sua reserva, enviamos por e-mail um link exclusivo pelo qual você
acompanha o seu contrato sem precisar de senha. Qualquer pessoa que tenha esse
link consegue visualizar os dados daquele contrato, por isso recomendamos que
não seja compartilhado com terceiros.

**Por quanto tempo guardamos**

Mantemos os seus dados enquanto durar a relação de locação e pelo prazo
necessário ao cumprimento de obrigações legais e fiscais. Cadastros arquivados
que não se converteram em locação são eliminados automaticamente do sistema após
o prazo nele definido. Você pode solicitar a exclusão antes desse prazo,
ressalvadas as informações que a legislação nos obriga a manter.

**Seus direitos**

A qualquer momento e sem custo, você pode confirmar a existência de tratamento,
acessar os seus dados, corrigir informações incompletas ou desatualizadas,
solicitar anonimização ou eliminação, pedir a portabilidade, obter informação
sobre com quem compartilhamos e revogar o consentimento, conforme o **art. 18 da
LGPD**. Para exercer qualquer um desses direitos, escreva para
**biketogo.floripa@gmail.com**. Você também pode apresentar reclamação à
Autoridade Nacional de Proteção de Dados (ANPD).

*Última atualização: agosto de 2026.*

---

## 🔴 CORRIGIR TAMBÉM NO TEXTO ANTIGO: o e-mail de contato não existe

A política **que já está publicada** indica `contato@biketogofloripa.com.br`
como canal para o titular exercer os direitos dele. **Esse endereço não existe**
(confirmado pelo Matheus em 2026-08-11).

E não é só que a caixa não foi criada: o **MX do domínio `biketogofloripa.com.br`
aponta para o Shopify**, então nada enviado para qualquer endereço nesse domínio
é entregue. Foi exatamente esse achado que motivou o Reply-To dos e-mails do
sistema (LEVA, item 12).

**Por que isso é mais grave que um detalhe de contato:** o art. 9º, IV da LGPD
exige "informações de contato do controlador", e o art. 18 garante ao titular o
direito de acessar, corrigir e eliminar os dados. Um canal que não recebe
mensagem transforma esses direitos em letra morta. Se alguém tentar exercê-los
e não obtiver resposta, a falha é da controladora.

**O que fazer:** trocar, na política já publicada, **todas** as ocorrências de
`contato@biketogofloripa.com.br` por **`biketogo.floripa@gmail.com`**, que é a
caixa que a loja realmente lê. O adendo abaixo já sai com o endereço correto.

⚠️ Vale conferir se o mesmo endereço morto aparece em outras páginas do site
(rodapé, "fale conosco", termos de uso).

---

## ⚠️ DOIS PONTOS A CONFIRMAR ANTES DE PUBLICAR

### 1. Onde ficam os servidores (afeta o bloco de transferência internacional)

O `.env.example` do projeto sugere `S3_REGION=sa-east-1`, que é **São Paulo**. Se
o Supabase estiver mesmo nessa região, **banco e arquivos ficam no Brasil** e não
há transferência internacional para eles.

O que precisa ser verificado:

| Serviço | Onde conferir | Se estiver no Brasil |
|---|---|---|
| **Supabase** | Painel → Settings → General → Region | Sai do bloco |
| **Railway** | Painel do serviço → Settings → Region | Sai do bloco |
| **Resend** | Empresa americana | **Fica** de qualquer forma |

⚠️ Mesmo que Supabase e Railway estejam no Brasil, **o Resend sozinho já
caracteriza transferência internacional**, porque os e-mails de reserva e recibo
levam nome, contrato e valores. O bloco continua necessário; o que muda é a
extensão.

Se **tudo estiver no Brasil menos o Resend**, troque o parágrafo por:

> *"O envio dos nossos e-mails é feito por empresa com servidores localizados
> fora do Brasil, o que caracteriza transferência internacional de dados nos
> termos do art. 33 da LGPD. A transferência ocorre exclusivamente para
> comunicar você sobre a sua reserva e está sujeita às garantias contratuais
> exigidas pela legislação brasileira."*

### 2. Prazo concreto de retenção

O texto acima diz "após o prazo nele definido", que é vago de propósito porque o
prazo é configurável (`archive_retention_days`, hoje com padrão de poucos dias).

Se a Cassiana quiser um número fixo na política, é melhor: prazo concreto é mais
defensável que fórmula genérica. Decida com ela e troque a frase por algo como
*"são eliminados automaticamente após 90 dias"*.

---

## O que NÃO entrou, e por quê

| Item | Por que ficou de fora |
|---|---|
| Cookies do sistema | O `/reservar` não usa cookie de rastreamento. A política do site já cobre os do Shopify |
| Google Analytics | Não existe no sistema |
| Decisão automatizada (art. 20) | O sistema não toma decisão automatizada sobre pessoas |
| Encarregado / DPO (art. 41) | Obrigatório, mas a ANPD dispensa pequeno porte de indicar formalmente. O canal de contato já cumpre a função. **Confirmar com advogado** |
| Dados de menores (art. 14) | A loja não aluga para menor desacompanhado. Se passar a alugar, exige seção própria |
