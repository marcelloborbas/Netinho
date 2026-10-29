import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendOrderEmail } from "../../supabase/functions/send-order-email/provider";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke }, rpc: mocks.rpc } }));
import { confirmOrderEmail } from "@/lib/order-email";

const savedOrder = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const email = { orderId: savedOrder, number: 123, kind: "pedido", text: "Total: R$ 123,45", pdf: "JVBERi0xLjQ=", xlsx: "UEsDBA==" };
beforeEach(() => { vi.clearAllMocks(); });

describe("saved order email", () => {
  it("sends both attachments to Netinho using the requested sender and stable saved-order key", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: "email-123" }), { status: 200 }));
    await expect(sendOrderEmail(email, "test-credential", request)).resolves.toBe("email-123");
    const [, options] = request.mock.calls[0];
    const body = JSON.parse(String(options?.body));
    expect(body.from).toBe("pedidos@netinhoautoparts.live");
    expect(body.to).toEqual(["netinhoautoparts@gmail.com"]);
    expect(body.attachments).toEqual([
      { filename: "pedido-123.pdf", content: "JVBERi0xLjQ=" },
      { filename: "pedido-123.xlsx", content: "UEsDBA==" },
    ]);
    expect(body.text).toBe("Total: R$ 123,45");
    expect(new Headers(options?.headers).get("Idempotency-Key")).toBe(`netinho-order-${savedOrder}`);
  });
  it("logs provider status and reason without confirming a rejected send", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"message":"Sender domain not verified"}', { status: 403 }));
    await expect(sendOrderEmail(email, "test-credential", request)).rejects.toThrow("403");
    expect(log).toHaveBeenCalledWith("send-order-email provider failure", expect.objectContaining({ status: 403, body: '{"message":"Sender domain not verified"}' }));
    log.mockRestore();
  });
  it("does not treat an HTTP success without an email identifier as confirmation", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(sendOrderEmail(email, "test-credential", request)).rejects.toThrow("não confirmou");
    log.mockRestore();
  });
  it("invokes sending for the saved order without creating any order, including a retry", async () => {
    mocks.invoke.mockResolvedValue({ data: { sent: true, orderId: savedOrder, emailId: "email-123" }, error: null });
    await confirmOrderEmail(savedOrder);
    await confirmOrderEmail(savedOrder);
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.invoke).toHaveBeenCalledWith("send-order-email", { body: { orderId: savedOrder } });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects an unconfirmed result or a different saved order", async () => {
    mocks.invoke.mockResolvedValue({ data: { sent: true, orderId: "other", emailId: "email-123" }, error: null });
    await expect(confirmOrderEmail(savedOrder)).rejects.toThrow("não confirmou");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("surfaces the function's error message and never recreates the saved order", async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { message: "HTTP failure", context: new Response('{"error":"O Resend recusou o envio (código 403)."}', { status: 502 }) } });
    await expect(confirmOrderEmail(savedOrder)).rejects.toThrow("403");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});