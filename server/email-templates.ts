/**
 * Professional HTML email templates for Bike To Go.
 * All templates use inline styles for maximum email client compatibility.
 * Brand color: #C8920A (gold)
 */

export type CartBikeItem = {
  bikeModel: string;
  bikeBrand?: string;
  startDate: string;
  endDate: string;
  deliveryTime?: string;
  totalAmount?: string;
};

export type ReservationEmailData = {
  clientName: string;
  cartItems: CartBikeItem[];
  accessories?: string[];
  grandTotal: string;
  paymentMethod?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  logoUrl?: string;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}

function paymentMethodLabel(method?: string): string {
  const map: Record<string, string> = {
    pix: "Pix",
    credit_card: "Cartão de Crédito",
    debit_card: "Cartão de Débito",
    cash: "Dinheiro",
    other: "Outro",
    presential: "Presencial",
  };
  return method ? (map[method] ?? method) : "A definir";
}

/**
 * Build the professional reservation confirmation email HTML.
 * Used for both client confirmation and owner copy.
 */
export function buildProfessionalReservationEmail(data: ReservationEmailData): string {
  const {
    clientName,
    cartItems,
    accessories = [],
    grandTotal,
    paymentMethod,
    companyName = "Bike To Go",
    companyEmail = "",
    companyPhone = "",
    logoUrl = "",
  } = data;

  const logoSection = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}" style="height:48px;max-width:200px;object-fit:contain;" />`
    : `<span style="font-size:22px;font-weight:700;color:#C8920A;letter-spacing:-0.5px;">${escapeHtml(companyName)}</span>`;

  const bikeRows = cartItems.map((item) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #2a2a3a;color:#e0e0e0;font-size:14px;">
        <strong style="color:#ffffff;">${escapeHtml(item.bikeBrand ? `${item.bikeBrand} ${item.bikeModel}` : item.bikeModel)}</strong>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #2a2a3a;color:#b0b0c0;font-size:13px;white-space:nowrap;">
        ${escapeHtml(formatDate(item.startDate))} → ${escapeHtml(formatDate(item.endDate))}
        ${item.deliveryTime ? `<br/><span style="color:#C8920A;font-size:12px;">Entrega: ${escapeHtml(item.deliveryTime)}</span>` : ""}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #2a2a3a;color:#C8920A;font-size:14px;font-weight:600;text-align:right;white-space:nowrap;">
        ${item.totalAmount ? `R$ ${Number(item.totalAmount).toFixed(2)}` : "—"}
      </td>
    </tr>
  `).join("");

  const accessoriesSection = accessories.length > 0
    ? `
    <div style="margin-top:24px;padding:16px;background:#1a1a2a;border-radius:8px;border:1px solid #2a2a3a;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Acessórios Incluídos</p>
      <p style="margin:0;color:#c0c0d0;font-size:14px;">${accessories.map(escapeHtml).join(" &bull; ")}</p>
    </div>`
    : "";

  const contactSection = (companyEmail || companyPhone)
    ? `
    <p style="margin:0 0 4px;font-size:13px;color:#888;">
      ${companyPhone ? `📞 ${escapeHtml(companyPhone)}` : ""}
      ${companyPhone && companyEmail ? " &nbsp;|&nbsp; " : ""}
      ${companyEmail ? `✉️ <a href="mailto:${escapeHtml(companyEmail)}" style="color:#C8920A;text-decoration:none;">${escapeHtml(companyEmail)}</a>` : ""}
    </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reserva Recebida — ${escapeHtml(companyName)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;padding:32px 24px;background:#111118;border-radius:12px 12px 0 0;border:1px solid #1e1e2e;border-bottom:none;">
      ${logoSection}
    </div>

    <!-- Gold divider -->
    <div style="height:3px;background:linear-gradient(90deg,#C8920A,#e8b030,#C8920A);"></div>

    <!-- Body -->
    <div style="background:#13131f;padding:32px 24px;border:1px solid #1e1e2e;border-top:none;border-bottom:none;">

      <!-- Greeting -->
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
        Reserva Recebida! 🚲
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#a0a0b0;line-height:1.6;">
        Olá, <strong style="color:#ffffff;">${escapeHtml(clientName)}</strong>!<br/>
        Recebemos sua reserva com sucesso. Confira os detalhes abaixo.
      </p>

      <!-- Notice -->
      <div style="padding:14px 16px;background:#1e1a0a;border-left:3px solid #C8920A;border-radius:4px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#d4a830;line-height:1.5;">
          ⚠️ <strong>Sua reserva será confirmada após a verificação dos seus dados.</strong><br/>
          Você receberá uma confirmação em breve.
        </p>
      </div>

      <!-- Bikes table -->
      <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Bicicletas Reservadas</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #2a2a3a;border-radius:8px;overflow:hidden;margin-bottom:0;">
        <thead>
          <tr style="background:#1a1a2a;">
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Modelo</th>
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Período</th>
            <th style="padding:10px 16px;text-align:right;font-size:12px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${bikeRows}
        </tbody>
      </table>

      ${accessoriesSection}

      <!-- Total & Payment -->
      <div style="margin-top:24px;padding:16px 20px;background:#1a1a2a;border-radius:8px;border:1px solid #2a2a3a;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <p style="margin:0 0 2px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Valor Total</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#C8920A;">R$ ${escapeHtml(Number(grandTotal).toFixed(2))}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0 0 2px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Forma de Pagamento</p>
          <p style="margin:0;font-size:14px;color:#c0c0d0;">${escapeHtml(paymentMethodLabel(paymentMethod))}</p>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#0d0d18;padding:24px;border-radius:0 0 12px 12px;border:1px solid #1e1e2e;border-top:none;text-align:center;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#C8920A;">${escapeHtml(companyName)}</p>
      ${contactSection}
      <p style="margin:16px 0 0;font-size:11px;color:#444;line-height:1.5;">
        Este e-mail foi enviado automaticamente. Por favor, não responda diretamente a esta mensagem.
      </p>
    </div>

  </div>
</body>
</html>`;
}
