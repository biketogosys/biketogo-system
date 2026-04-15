/**
 * WhatsApp notification helper.
 * Supports two providers (configure in system settings):
 *
 * 1. WhatsApp Cloud API (Meta):
 *    - Settings key: "whatsapp_api_token" (Bearer token)
 *    - Settings key: "whatsapp_phone_id" (Phone number ID from Meta dashboard)
 *
 * 2. Z-API (Brazilian provider):
 *    - Settings key: "zapi_instance_id"
 *    - Settings key: "zapi_token"
 *
 * When no provider is configured, messages are logged to console.
 * The recipient number is read from "whatsapp_number" setting.
 */
import { getSetting } from "./db";

export type WhatsAppMessage = {
  to?: string; // Override recipient (defaults to whatsapp_number setting)
  text: string;
};

/**
 * Send a WhatsApp message to the configured owner number.
 * Returns true if sent, false if skipped or failed.
 */
export async function sendWhatsApp(message: WhatsAppMessage): Promise<boolean> {
  const recipientNumber = message.to || (await getSetting("whatsapp_number"));

  if (!recipientNumber) {
    console.log("[WhatsApp] No recipient number configured. Message:", message.text);
    return false;
  }

  // Clean phone number: remove spaces, dashes, parentheses
  const cleanNumber = recipientNumber.replace(/[\s\-\(\)]/g, "");

  // Try Z-API first (more common in Brazil)
  const zapiInstanceId = await getSetting("zapi_instance_id");
  const zapiToken = await getSetting("zapi_token");

  if (zapiInstanceId && zapiToken) {
    return sendViaZApi(zapiInstanceId, zapiToken, cleanNumber, message.text);
  }

  // Try WhatsApp Cloud API (Meta)
  const waToken = await getSetting("whatsapp_api_token");
  const waPhoneId = await getSetting("whatsapp_phone_id");

  if (waToken && waPhoneId) {
    return sendViaCloudApi(waToken, waPhoneId, cleanNumber, message.text);
  }

  // No provider configured — log only
  console.log(`[WhatsApp] No provider configured. Would send to ${cleanNumber}:`);
  console.log(`[WhatsApp] ${message.text}`);
  return false;
}

/**
 * Send via Z-API (https://z-api.io)
 */
async function sendViaZApi(
  instanceId: string,
  token: string,
  phone: string,
  text: string
): Promise<boolean> {
  try {
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message: text }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "");
      console.warn(`[WhatsApp/Z-API] Failed (${response.status}):`, error);
      return false;
    }

    console.log(`[WhatsApp/Z-API] Sent to ${phone}`);
    return true;
  } catch (error) {
    console.warn("[WhatsApp/Z-API] Error:", error);
    return false;
  }
}

/**
 * Send via WhatsApp Cloud API (Meta)
 */
async function sendViaCloudApi(
  token: string,
  phoneId: string,
  phone: string,
  text: string
): Promise<boolean> {
  try {
    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text },
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "");
      console.warn(`[WhatsApp/CloudAPI] Failed (${response.status}):`, error);
      return false;
    }

    console.log(`[WhatsApp/CloudAPI] Sent to ${phone}`);
    return true;
  } catch (error) {
    console.warn("[WhatsApp/CloudAPI] Error:", error);
    return false;
  }
}

/**
 * Build a new reservation notification message for the owner.
 */
export function buildOwnerReservationMessage(data: {
  clientName: string;
  clientPhone?: string;
  bikeModel: string;
  startDate: string;
  endDate: string;
  deliveryTime?: string;
  totalAmount?: string;
}): string {
  const lines = [
    `🚲 *Nova Reserva — Bike To Go*`,
    ``,
    `*Cliente:* ${data.clientName}`,
    data.clientPhone ? `*Telefone:* ${data.clientPhone}` : null,
    `*Bicicleta:* ${data.bikeModel}`,
    `*Período:* ${data.startDate} a ${data.endDate}`,
    data.deliveryTime ? `*Entrega:* ${data.deliveryTime}` : null,
    data.totalAmount ? `*Valor:* R$ ${data.totalAmount}` : null,
    ``,
    `Acesse o sistema para mais detalhes.`,
  ];

  return lines.filter(Boolean).join("\n");
}
