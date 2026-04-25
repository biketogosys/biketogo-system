/**
 * Stripe helpers — Bike To Go
 * Suporta: Cartão de Crédito, Pix (via Stripe) e Pagar na Entrega (presencial)
 */
import Stripe from "stripe";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada.");
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

export interface CheckoutParams {
  rentalId: number;
  clientId: number;
  clientName: string;
  clientEmail?: string | null;
  bikeModel: string;
  startDate: string;
  endDate: string;
  totalAmountBRL: number; // valor em reais (ex: 150.00)
  paymentType: "card" | "pix";
  origin: string; // window.location.origin do frontend
}

export interface CheckoutResult {
  sessionId: string;
  checkoutUrl: string;
}

/**
 * Cria uma Stripe Checkout Session para cartão ou Pix.
 * Retorna a URL de checkout para redirecionar o cliente.
 */
export async function createStripeCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  const stripe = getStripe();

  const amountCents = Math.round(params.totalAmountBRL * 100);
  if (amountCents < 50) {
    throw new Error("Valor mínimo para pagamento online é R$ 0,50.");
  }

  const paymentMethodTypes = (
    params.paymentType === "pix" ? ["pix"] : ["card"]
  ) as Stripe.Checkout.SessionCreateParams["payment_method_types"];

  const session = await stripe.checkout.sessions.create({
    payment_method_types: paymentMethodTypes,
    mode: "payment",
    customer_email: params.clientEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: `Aluguel — ${params.bikeModel}`,
            description: `Período: ${formatDate(params.startDate)} a ${formatDate(params.endDate)}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      rental_id: String(params.rentalId),
      client_id: String(params.clientId),
      client_name: params.clientName,
      bike_model: params.bikeModel,
    },
    client_reference_id: String(params.rentalId),
    success_url: `${params.origin}/reserva-confirmada?session_id={CHECKOUT_SESSION_ID}&rental_id=${params.rentalId}`,
    cancel_url: `${params.origin}/reservar?cancelled=1`,
    // Pix expira em 30 minutos
    ...(params.paymentType === "pix" ? { expires_at: Math.floor(Date.now() / 1000) + 1800 } : {}),
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url!,
  };
}

/**
 * Verifica e processa um webhook do Stripe.
 * Retorna o evento verificado ou lança erro se a assinatura for inválida.
 */
export function constructStripeEvent(payload: Buffer, signature: string): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET não configurada.");
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * Recupera uma Checkout Session pelo ID.
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}
