import { supabase } from "@/integrations/supabase/client";

// This operation only sends an already-created order; it must never create one.
export async function confirmOrderEmail(orderId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("send-order-email", { body: { orderId } });
  if (error) {
    let reason = error.message;
    if (error.context instanceof Response) {
      try {
        const body = await error.context.clone().json();
        if (typeof body.error === "string") reason = body.error;
      } catch { /* Keep the invocation error if the body isn't JSON. */ }
    }
    throw new Error(reason || "O envio do e-mail não foi confirmado.");
  }
  if (data?.sent !== true || data.orderId !== orderId || typeof data.emailId !== "string" || !data.emailId.trim()) {
    throw new Error(data?.error || "O serviço de e-mail não confirmou o envio.");
  }
}