// ─── Textos dos e-mails ao CLIENTE, em português, inglês e espanhol ─────────
// Pedido da dona (2026-10-15): o cliente estrangeiro recebia tudo em português,
// inclusive os termos do contrato que ele precisa ler antes de fechar. O idioma
// vem do cadastro (`clients.idioma`), nunca da nacionalidade.
//
// Regras deste arquivo:
// - Os rótulos repetem os da página pública (`PublicContract.tsx`), que é o
//   destino do botão do e-mail: o cliente lê a mesma palavra nos dois lugares.
//   Exceção já existente em português: "Entrega" no e-mail, "Retirada" na página.
// - Espanhol no "tú", como a página e o /reservar.
// - Datas continuam DD/MM/AAAA nos três idiomas, e o dinheiro continua em reais
//   no formato brasileiro: é um contrato brasileiro, só lido em outra língua.
// - Texto com `<strong>` é HTML montado AQUI; o que vem do usuário (nome,
//   contrato) entra escapado por quem chama.
//
// Os e-mails para a LOJA (novo lead, teste de envio, pendência) continuam em
// português e não passam por aqui.
import type { Idioma } from "./idioma";

type Textos = {
  /** Atributo `lang` do <html>. */
  htmlLang: string;
  /** Locale da data por extenso no fecho ("Florianópolis, 11 de agosto de 2026"). */
  localeData: string;
  oi: (nome: string) => string;
  formas: Record<string, string>;
  status: Record<string, string>;

  detalhes: string;
  contratoN: (n: number) => string;
  calculado: string;
  entrega: string;
  tempo: string;
  devolucao: string;
  diarias: (n: number) => string;
  periodosVariados: string;

  itens: string;
  colEquipamento: string;
  colFator: string;
  colTotal: string;
  tamanho: (t: string) => string;
  /** Período de um item, na linha de detalhe. */
  periodo: (de: string, ate: string) => string;
  porDiaria: (valor: string) => string;
  acessorios: string;
  subtotal: string;
  desconto: string;
  totalIgual: string;
  bicicleta: string;
  acessorio: string;

  reserva: {
    titulo: string;
    assunto: (n: number) => string;
    preheader: (n: number) => string;
    evento: string;
    complemento: string;
    botao: string;
    legenda: string;
    condicoes: string;
    objeto: string;
    condicoesGerais: string;
    fecho: [string, string];
  };

  recibo: {
    titulo: string;
    assunto: (n: number) => string;
    preheader: (n: number, valor: string) => string;
    evento: string;
    complemento: string;
    bloco: string;
    totalRecebido: string;
    botao: string;
    legenda: string;
    fecho: string;
    ajuste: (data: string, de: number, para: number, valorDe: string, valorPara: string) => string;
    /** Peças da frase de quitação. `nome`, `valor` e `data` já chegam como HTML. */
    quitacao: {
      deQuem: (nome: string, valor: string) => string;
      semNome: (valor: string) => string;
      noDia: (data: string) => string;
      contrato: (n: number) => string;
      objeto: string;
      /** "10/08/2026 a 15/08/2026": o período como entra na frase. */
      periodo: (de: string, ate: string | null) => string;
      /** Recebe o período já montado por `periodo` (e escapado). */
      noPeriodo: (periodo: string) => string;
    };
  };

  boasVindas: {
    titulo: string;
    assunto: (empresa: string) => string;
    preheader: (nome: string) => string;
    /** Quando o cadastro vem sem nome ("Oi, tudo bem!"). */
    nomeVazio: string;
    viaReservar: string;
    viaManual: string;
    proximoPasso: string;
    botao: string;
    mensagemWhatsapp: (nome: string) => string;
  };
};

const PT: Textos = {
  htmlLang: "pt-BR",
  localeData: "pt-BR",
  oi: (nome) => `Oi, ${nome}!`,
  formas: {
    pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito",
    cash: "Dinheiro", other: "Outra forma",
  },
  status: {
    pendente: "Reserva registrada", ativo: "Em circulação",
    parcialmente_devolvido: "Devolução parcial", encerrado: "Encerrado", cancelado: "Cancelado",
  },

  detalhes: "Detalhes da locação",
  contratoN: (n) => `Contrato #${n}`,
  calculado: "Calculado para o seguinte período de uso:",
  entrega: "Entrega",
  tempo: "Tempo contratado",
  devolucao: "Devolução prevista",
  diarias: (n) => `${n} ${n === 1 ? "diária" : "diárias"}`,
  periodosVariados: "Períodos diferentes por item",

  itens: "Itens da locação",
  colEquipamento: "Equipamento",
  colFator: "Fator",
  colTotal: "Total",
  tamanho: (t) => `Tam. ${t}`,
  periodo: (de, ate) => `${de} a ${ate}`,
  porDiaria: (v) => `${v} por diária`,
  acessorios: "Acessórios inclusos",
  subtotal: "Subtotal",
  desconto: "Desconto",
  totalIgual: "Total =",
  bicicleta: "Bicicleta",
  acessorio: "Acessório",

  reserva: {
    titulo: "Reserva de aluguel de bicicletas",
    assunto: (n) => `Reserva de aluguel de bicicletas: contrato #${n}`,
    preheader: (n) => `Reserva #${n} registrada`,
    evento: "Reservado! Registramos o seu pedido de reserva de bicicleta.",
    // Quem chama é o CLIENTE (pedido da dona, 2026-08-04): a loja não sai
    // atrás, a conversa começa por ele no WhatsApp.
    complemento: "Abaixo estão os detalhes e as condições do contrato de locação, para você ler com calma. Chame a gente no WhatsApp para combinar a entrega.",
    botao: "Visualizar detalhes da reserva",
    legenda: "Acompanhe a sua reserva online quando quiser. O link é só seu.",
    condicoes: "Condições do contrato",
    objeto: "Objeto do contrato",
    condicoesGerais: "Condições gerais",
    fecho: [
      "A Bike To Go se responsabiliza pela integridade e pelo funcionamento dos equipamentos locados, e o cliente deve devolvê-los nas mesmas condições em que foram disponibilizados.",
      "Os valores acima se referem ao período informado. Devolução antecipada ou renovação alteram o valor, e a página de acompanhamento passa a mostrar o valor atualizado.",
    ],
  },

  recibo: {
    titulo: "Recibo de pagamento",
    assunto: (n) => `Recibo de pagamento de locação de bicicletas: contrato #${n}`,
    preheader: (n, valor) => `Contrato #${n} encerrado · ${valor}`,
    evento: "Obrigado por pedalar com a gente! O seu aluguel foi encerrado.",
    complemento: "Abaixo está o recibo com o resumo da locação e do pagamento, para você guardar.",
    bloco: "Recibo de pagamento",
    totalRecebido: "Total recebido",
    botao: "Visualizar contrato",
    legenda: "Os detalhes completos continuam disponíveis online.",
    fecho: "Este recibo refere-se exclusivamente aos equipamentos, valores e período de locação descritos acima. Guarde-o para seus registros.",
    ajuste: (data, de, para, valorDe, valorPara) =>
      `Devolução antecipada em ${data}: período ajustado de ${de} para ${para} ${para === 1 ? "diária" : "diárias"} e valor de ${valorDe} para ${valorPara}.`,
    quitacao: {
      deQuem: (nome, valor) => `Recebemos de <strong>${nome}</strong> o valor de ${valor}`,
      semNome: (valor) => `Recebemos o valor de ${valor}`,
      noDia: (data) => `, no dia <strong>${data}</strong>`,
      contrato: (n) => `, referente ao <strong>contrato #${n}</strong>`,
      objeto: ", de aluguel de equipamentos para ciclismo",
      periodo: (de, ate) => (ate ? `${de} a ${ate}` : de),
      noPeriodo: (p) => `, no período de ${p}`,
    },
  },

  boasVindas: {
    titulo: "Cadastro recebido",
    assunto: (empresa) => `Cadastro recebido — ${empresa}`,
    preheader: (nome) => `Oi ${nome}! Recebemos o seu cadastro. Chame a gente no WhatsApp para fechar a reserva.`,
    nomeVazio: "tudo bem",
    viaReservar: "Recebemos o seu cadastro. Obrigado por escolher a gente para o seu passeio.",
    viaManual: "Seu cadastro foi criado aqui na loja. Obrigado por escolher a gente para o seu passeio.",
    proximoPasso: "<strong>O próximo passo é seu:</strong> chame a gente no WhatsApp para combinar <strong>a bike, as datas e a entrega</strong>. É por lá que a reserva é fechada.",
    botao: "Chamar no WhatsApp",
    mensagemWhatsapp: (nome) => `Oi! Sou ${nome} e acabei de fazer meu cadastro.`,
  },
};

const EN: Textos = {
  htmlLang: "en",
  localeData: "en-GB",
  oi: (nome) => `Hi, ${nome}!`,
  formas: {
    pix: "Pix", credit_card: "Credit card", debit_card: "Debit card",
    cash: "Cash", other: "Other method",
  },
  status: {
    pendente: "Reservation registered", ativo: "In circulation",
    parcialmente_devolvido: "Partially returned", encerrado: "Closed", cancelado: "Cancelled",
  },

  detalhes: "Rental details",
  contratoN: (n) => `Contract #${n}`,
  calculado: "Calculated for the following usage period:",
  entrega: "Delivery",
  tempo: "Contracted time",
  devolucao: "Expected return",
  diarias: (n) => `${n} ${n === 1 ? "day" : "days"}`,
  periodosVariados: "Different periods per item",

  itens: "Rental items",
  colEquipamento: "Equipment",
  colFator: "Factor",
  colTotal: "Total",
  tamanho: (t) => `Size ${t}`,
  periodo: (de, ate) => `${de} to ${ate}`,
  porDiaria: (v) => `${v} per day`,
  acessorios: "Included accessories",
  subtotal: "Subtotal",
  desconto: "Discount",
  totalIgual: "Total =",
  bicicleta: "Bicycle",
  acessorio: "Accessory",

  reserva: {
    titulo: "Bicycle rental reservation",
    assunto: (n) => `Bicycle rental reservation: contract #${n}`,
    preheader: (n) => `Reservation #${n} registered`,
    evento: "Booked! We have registered your bicycle reservation request.",
    complemento: "Below are the details and the conditions of the rental contract, for you to read carefully. Message us on WhatsApp to arrange the delivery.",
    botao: "View reservation details",
    legenda: "Track your reservation online whenever you like. The link is yours only.",
    condicoes: "Contract conditions",
    objeto: "Object of the contract",
    condicoesGerais: "General conditions",
    fecho: [
      "Bike To Go is responsible for the integrity and working order of the rented equipment, and the client must return it in the same condition it was provided.",
      "The amounts above refer to the period shown. An early return or a renewal changes the amount, and the tracking page then shows the updated value.",
    ],
  },

  recibo: {
    titulo: "Payment receipt",
    assunto: (n) => `Bicycle rental payment receipt: contract #${n}`,
    preheader: (n, valor) => `Contract #${n} closed · ${valor}`,
    evento: "Thanks for riding with us! Your rental has been closed.",
    complemento: "Below is the receipt with a summary of the rental and the payment, for your records.",
    bloco: "Payment receipt",
    totalRecebido: "Total received",
    botao: "View contract",
    legenda: "The full details remain available online.",
    fecho: "This receipt refers exclusively to the equipment, amounts and rental period described above. Keep it for your records.",
    ajuste: (data, de, para, valorDe, valorPara) =>
      `Early return on ${data}: rental period adjusted from ${de} to ${para} ${para === 1 ? "day" : "days"} and amount from ${valorDe} to ${valorPara}.`,
    quitacao: {
      deQuem: (nome, valor) => `We received from <strong>${nome}</strong> the amount of ${valor}`,
      semNome: (valor) => `We received the amount of ${valor}`,
      noDia: (data) => `, on <strong>${data}</strong>`,
      contrato: (n) => `, relating to <strong>contract #${n}</strong>`,
      objeto: ", for the rental of cycling equipment",
      periodo: (de, ate) => (ate ? `${de} to ${ate}` : de),
      noPeriodo: (p) => `, for the period ${p}`,
    },
  },

  boasVindas: {
    titulo: "Registration received",
    assunto: (empresa) => `Registration received — ${empresa}`,
    preheader: (nome) => `Hi ${nome}! We have received your registration. Message us on WhatsApp to confirm the reservation.`,
    nomeVazio: "there",
    viaReservar: "We have received your registration. Thank you for choosing us for your ride.",
    viaManual: "Your registration has been created here at the store. Thank you for choosing us for your ride.",
    proximoPasso: "<strong>The next step is yours:</strong> message us on WhatsApp to arrange <strong>the bike, the dates and the delivery</strong>. That is where the reservation is confirmed.",
    botao: "Message us on WhatsApp",
    mensagemWhatsapp: (nome) => `Hi! I'm ${nome} and I have just registered.`,
  },
};

const ES: Textos = {
  htmlLang: "es",
  localeData: "es-ES",
  oi: (nome) => `¡Hola, ${nome}!`,
  formas: {
    pix: "Pix", credit_card: "Tarjeta de crédito", debit_card: "Tarjeta de débito",
    cash: "Efectivo", other: "Otra forma",
  },
  status: {
    pendente: "Reserva registrada", ativo: "En circulación",
    parcialmente_devolvido: "Devolución parcial", encerrado: "Finalizado", cancelado: "Cancelado",
  },

  detalhes: "Detalles del alquiler",
  contratoN: (n) => `Contrato #${n}`,
  calculado: "Calculado para el siguiente período de uso:",
  entrega: "Entrega",
  tempo: "Tiempo contratado",
  devolucao: "Devolución prevista",
  diarias: (n) => `${n} ${n === 1 ? "día" : "días"}`,
  periodosVariados: "Períodos diferentes por ítem",

  itens: "Ítems del alquiler",
  colEquipamento: "Equipo",
  colFator: "Factor",
  colTotal: "Total",
  tamanho: (t) => `Talla ${t}`,
  periodo: (de, ate) => `del ${de} al ${ate}`,
  porDiaria: (v) => `${v} por día`,
  acessorios: "Accesorios incluidos",
  subtotal: "Subtotal",
  desconto: "Descuento",
  totalIgual: "Total =",
  bicicleta: "Bicicleta",
  acessorio: "Accesorio",

  reserva: {
    titulo: "Reserva de alquiler de bicicletas",
    assunto: (n) => `Reserva de alquiler de bicicletas: contrato #${n}`,
    preheader: (n) => `Reserva #${n} registrada`,
    evento: "¡Reservado! Registramos tu pedido de reserva de bicicleta.",
    complemento: "A continuación están los detalles y las condiciones del contrato de alquiler, para que los leas con calma. Escríbenos por WhatsApp para coordinar la entrega.",
    botao: "Ver detalles de la reserva",
    legenda: "Sigue tu reserva en línea cuando quieras. El enlace es solo tuyo.",
    condicoes: "Condiciones del contrato",
    objeto: "Objeto del contrato",
    condicoesGerais: "Condiciones generales",
    fecho: [
      "Bike To Go se responsabiliza por la integridad y el funcionamiento de los equipos alquilados, y el cliente debe devolverlos en las mismas condiciones en que fueron entregados.",
      "Los valores de arriba corresponden al período indicado. Una devolución anticipada o una renovación cambian el valor, y la página de seguimiento pasa a mostrar el valor actualizado.",
    ],
  },

  recibo: {
    titulo: "Recibo de pago",
    assunto: (n) => `Recibo de pago del alquiler de bicicletas: contrato #${n}`,
    preheader: (n, valor) => `Contrato #${n} finalizado · ${valor}`,
    evento: "¡Gracias por pedalear con nosotros! Tu alquiler fue finalizado.",
    complemento: "A continuación está el recibo con el resumen del alquiler y del pago, para que lo guardes.",
    bloco: "Recibo de pago",
    totalRecebido: "Total recibido",
    botao: "Ver contrato",
    legenda: "Los detalles completos siguen disponibles en línea.",
    fecho: "Este recibo se refiere exclusivamente a los equipos, valores y período de alquiler descritos arriba. Guárdalo para tus registros.",
    ajuste: (data, de, para, valorDe, valorPara) =>
      `Devolución anticipada el ${data}: período ajustado de ${de} a ${para} ${para === 1 ? "día" : "días"} y valor de ${valorDe} a ${valorPara}.`,
    quitacao: {
      deQuem: (nome, valor) => `Recibimos de <strong>${nome}</strong> el valor de ${valor}`,
      semNome: (valor) => `Recibimos el valor de ${valor}`,
      noDia: (data) => `, el día <strong>${data}</strong>`,
      contrato: (n) => `, referente al <strong>contrato #${n}</strong>`,
      objeto: ", de alquiler de equipos de ciclismo",
      periodo: (de, ate) => (ate ? `del ${de} al ${ate}` : `del ${de}`),
      noPeriodo: (p) => `, en el período ${p}`,
    },
  },

  boasVindas: {
    titulo: "Registro recibido",
    assunto: (empresa) => `Registro recibido — ${empresa}`,
    preheader: (nome) => `¡Hola ${nome}! Recibimos tu registro. Escríbenos por WhatsApp para cerrar la reserva.`,
    nomeVazio: "qué tal",
    viaReservar: "Recibimos tu registro. Gracias por elegirnos para tu paseo.",
    viaManual: "Tu registro fue creado aquí en la tienda. Gracias por elegirnos para tu paseo.",
    proximoPasso: "<strong>El próximo paso es tuyo:</strong> escríbenos por WhatsApp para coordinar <strong>la bici, las fechas y la entrega</strong>. Es por ahí que se cierra la reserva.",
    botao: "Escríbenos por WhatsApp",
    mensagemWhatsapp: (nome) => `¡Hola! Soy ${nome} y acabo de registrarme.`,
  },
};

export const TEXTOS_EMAIL: Record<Idioma, Textos> = { pt: PT, en: EN, es: ES };
