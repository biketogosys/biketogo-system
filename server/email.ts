/**
 * Email helper using Resend API.
 * Configure the API key in system settings (key: "resend_api_key")
 * and the sender email (key: "notification_email").
 * When no API key is configured, emails are logged to console instead.
 */
import { getSetting } from "./db";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Send an email via Resend API.
 * Returns true if sent, false if skipped (no API key) or failed.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = await getSetting("resend_api_key");
  const senderEmail = await getSetting("notification_email") || "biketogo.floripa@gmail.com";

  if (!apiKey) {
    console.log("[Email] Resend API key not configured. Email would be sent to:", payload.to);
    console.log("[Email] Subject:", payload.subject);
    console.log("[Email] Body preview:", payload.html.substring(0, 200));
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Bike To Go <${senderEmail}>`,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "");
      console.warn(`[Email] Failed to send (${response.status}):`, error);
      return false;
    }

    console.log(`[Email] Sent to ${payload.to}: ${payload.subject}`);
    return true;
  } catch (error) {
    console.warn("[Email] Error sending email:", error);
    return false;
  }
}

/**
 * Build the reservation confirmation email HTML.
 */
export function buildReservationEmailHtml(data: {
  clientName: string;
  bikeModel: string;
  startDate: string;
  endDate: string;
  deliveryTime?: string;
  totalAmount?: string;
  accessories?: string[];
}): string {
  const accessoriesList = data.accessories?.length
    ? `<p style="margin:0 0 8px"><strong>Acessórios:</strong> ${data.accessories.join(", ")}</p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <!-- Header -->
    <div style="text-align:center;padding:24px 0;border-bottom:2px solid #C8920A;">
      <h1 style="margin:0;color:#C8920A;font-size:28px;font-family:'Montserrat',Arial,sans-serif;font-weight:700;">
        Bike To Go
      </h1>
      <p style="margin:4px 0 0;color:#888;font-size:13px;">Florianópolis</p>
    </div>

    <!-- Content -->
    <div style="padding:32px 0;">
      <h2 style="margin:0 0 16px;color:#f0f0f0;font-size:20px;font-family:'Montserrat',Arial,sans-serif;">
        Reserva Confirmada!
      </h2>
      <p style="margin:0 0 24px;color:#ccc;font-size:15px;line-height:1.6;">
        Olá <strong style="color:#f0f0f0;">${data.clientName}</strong>, sua reserva foi recebida com sucesso!
        Confira os detalhes abaixo:
      </p>

      <!-- Details card -->
      <div style="background:#141420;border:1px solid #2a2a3a;border-radius:12px;padding:24px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#ccc;font-size:14px;">
          <strong style="color:#C8920A;">Bicicleta:</strong>
          <span style="color:#f0f0f0;">${data.bikeModel}</span>
        </p>
        <p style="margin:0 0 8px;color:#ccc;font-size:14px;">
          <strong style="color:#C8920A;">Período:</strong>
          <span style="color:#f0f0f0;">${data.startDate} a ${data.endDate}</span>
        </p>
        ${data.deliveryTime ? `
        <p style="margin:0 0 8px;color:#ccc;font-size:14px;">
          <strong style="color:#C8920A;">Horário de entrega:</strong>
          <span style="color:#f0f0f0;">${data.deliveryTime}</span>
        </p>` : ""}
        ${accessoriesList}
        ${data.totalAmount ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #2a2a3a;">
          <p style="margin:0;color:#C8920A;font-size:18px;font-weight:700;">
            Total: R$ ${data.totalAmount}
          </p>
        </div>` : ""}
      </div>

      <p style="margin:0 0 8px;color:#ccc;font-size:14px;line-height:1.6;">
        Entraremos em contato para confirmar os detalhes da entrega.
        Se tiver alguma dúvida, entre em contato pelo WhatsApp ou Instagram.
      </p>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #2a2a3a;padding-top:20px;text-align:center;">
      <p style="margin:0;color:#666;font-size:12px;">
        Bike To Go Floripa — Aluguel de bicicletas
      </p>
      <p style="margin:4px 0 0;color:#555;font-size:11px;">
        Este é um email automático, não responda diretamente.
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}
