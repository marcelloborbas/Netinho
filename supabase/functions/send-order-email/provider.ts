export const EMAIL_VERSION = "2026-10-29.1";
export const ORDER_FROM = "pedidos@netinhoautoparts.live";
export const ORDER_TO = "netinhoautoparts@gmail.com";

export interface OrderEmail {
  orderId: string;
  number: number;
  kind: string;
  replyTo?: string;
  text: string;
  pdf: string;
  xlsx: string;
}

// A stable payload/key lets Resend deduplicate retries for this saved order.
export async function sendOrderEmail(email: OrderEmail, apiKey: string, request: typeof fetch = fetch) {
  const response = await request("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `netinho-order-${email.orderId}`,
    },
    body: JSON.stringify({
      from: ORDER_FROM,
      to: [ORDER_TO],
      reply_to: email.replyTo,
      subject: `${email.kind === "orcamento" ? "Orçamento" : "Pedido"} ${email.number} | Netinho Auto Parts`,
      text: email.text,
      attachments: [
        { filename: `pedido-${email.number}.pdf`, content: email.pdf },
        { filename: `pedido-${email.number}.xlsx`, content: email.xlsx },
      ],
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    // Never include credential values, even if a provider echoes one in its error.
    console.error("send-order-email provider failure", {
      version: EMAIL_VERSION, orderId: email.orderId, status: response.status,
      body: body.replaceAll(apiKey, "[REDACTED]"),
    });
    throw new Error(`O Resend recusou o envio (código ${response.status}). O pedido está salvo; não crie outro pedido.`);
  }
  let result: unknown;
  try { result = JSON.parse(body); } catch { result = null; }
  if (!result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string" || !result.id.trim()) {
    console.error("send-order-email missing confirmation", { version: EMAIL_VERSION, orderId: email.orderId, status: response.status });
    throw new Error("O serviço de e-mail não confirmou o envio. O pedido está salvo; não crie outro pedido.");
  }
  console.info("send-order-email accepted", { version: EMAIL_VERSION, orderId: email.orderId, emailId: result.id });
  return result.id;
}