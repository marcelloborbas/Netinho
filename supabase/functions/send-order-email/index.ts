import { createClient } from "npm:@supabase/supabase-js@2";
import { jsPDF } from "npm:jspdf@4.2.1";
import { autoTable } from "npm:jspdf-autotable@5.0.8";
import ExcelJS from "npm:exceljs@4.4.0";
import { EMAIL_VERSION, sendOrderEmail } from "./provider.ts";

// Only explicit commercial-user requests send an email. Prices and customer
// data are loaded again through the caller's RLS session, never from the body.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "X-Netinho-Email-Version": EMAIL_VERSION },
  });
Deno.serve(async (request) => {
  console.info("send-order-email request", { version: EMAIL_VERSION, method: request.method });
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Autenticação necessária" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anonKey) throw new Error("Configuração de autenticação indisponível.");
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return json({ error: "Sessão inválida" }, 401);
    const { data: access, error: accessError } = await client.rpc("access_context");
    if (accessError || !access?.can_sell)
      return json({ error: "Acesso comercial necessário" }, 403);
    const { orderId } = await request.json();
    if (typeof orderId !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(orderId))
      return json({ error: "Pedido inválido" }, 400);
    const [{ data: order, error }, { data: items, error: itemError }] = await Promise.all([
      client.from("orders").select("*").eq("id", orderId).single(),
      client.from("order_items").select("*").eq("order_id", orderId).order("created_at"),
    ]);
    if (error || itemError || !order || !items?.length)
      return json({ error: "Pedido não encontrado" }, 404);
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("send-order-email configuration missing", { version: EMAIL_VERSION, secret: "RESEND_API_KEY" });
      return json(
        { error: "O serviço de envio está indisponível. O pedido está salvo; não crie outro pedido." },
        503,
      );
    }
    const brl = (value: unknown) =>
      Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const customer = order.customer_snapshot ?? {};
    const { data: seller } = await client
      .from("profiles")
      .select("full_name,email")
      .eq("id", order.seller_id)
      .maybeSingle();
    const sellerLabel = seller?.full_name || seller?.email || "Representante comercial";
    const doc = new jsPDF();
    doc.setFillColor(26, 28, 32);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255);
    doc.setFontSize(22);
    doc.text("NETINHO AUTO PARTS", 14, 15);
    doc.setFontSize(9);
    doc.text("FCO Automotive | HD Embreagens", 14, 23);
    doc.setTextColor(30);
    doc.setFontSize(14);
    doc.text(`${order.kind === "orcamento" ? "Orçamento" : "Pedido"} ${order.number}`, 14, 41);
    autoTable(doc, {
      startY: 47,
      theme: "grid",
      styles: { fontSize: 9 },
      body: [
        ["Cliente", customer.company_name ?? "", "CNPJ", customer.cnpj ?? ""],
        [
          "Endereço",
          [customer.address, customer.city, customer.state].filter(Boolean).join(", "),
          "Telefone",
          customer.phone ?? "",
        ],
        ["Representante", sellerLabel, "Condição", order.payment_term],
        ["Comprador", order.buyer ?? "", "Transportadora", order.carrier ?? ""],
      ],
    });
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
      theme: "striped",
      showFoot: "lastPage",
      headStyles: { fillColor: [200, 30, 30] },
      styles: { fontSize: 8 },
      head: [["Marca / código", "Aplicação", "Qtd.", "Desc.", "Unitário", "Total"]],
      body: items.map((item) => [
        `${item.manufacturer ?? "FCO"} ${item.code}`,
        item.application,
        item.quantity,
        `${item.discount_pct}%`,
        brl(item.net_price),
        brl(item.line_total),
      ]),
      foot: [["", "", "", "", "TOTAL", brl(order.total)]],
      columnStyles: { 1: { cellWidth: 65 } },
    });
    if (order.notes) {
      let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      doc.setFontSize(9);
      for (const line of ["Observações:", ...doc.splitTextToSize(order.notes, 180)]) {
        if (y > 278) {
          doc.addPage();
          y = 18;
        }
        doc.text(line, 14, y);
        y += 5;
      }
    }
    const content = doc.output("datauristring").split(",")[1];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Pedido");
    sheet.columns = [
      { header: "Campo / Código", key: "code", width: 25 },
      { header: "Descrição / Aplicação", key: "description", width: 55 },
      { header: "Quantidade", key: "quantity", width: 16 },
      { header: "Desconto (%)", key: "discount", width: 17 },
      { header: "Valor unitário (R$)", key: "unit", width: 23 },
      { header: "Total (R$)", key: "total", width: 23 },
    ];
    sheet.addRow(["NETINHO AUTO PARTS", "Pedido " + order.number]);
    sheet.addRow(["Cliente", customer.company_name ?? ""]);
    sheet.addRow(["CNPJ", customer.cnpj ?? ""]);
    sheet.addRow(["Comprador", order.buyer ?? ""]);
    sheet.addRow(["Representante", sellerLabel]);
    sheet.addRow(["Condição de pagamento", order.payment_term]);
    sheet.addRow(["Endereço", [customer.address, customer.city, customer.state].filter(Boolean).join(", ")]);
    sheet.addRow(["Telefone", customer.phone ?? ""]);
    sheet.addRow(["Observações", order.notes ?? ""]);
    sheet.addRow([]);
    const tableHeader = sheet.addRow(["Marca / Código", "Aplicação", "Quantidade", "Desconto (%)", "Unitário (R$)", "Total (R$)"]);
    for (const item of items) {
      sheet.addRow([
        `${item.manufacturer ?? "FCO"} ${item.code}`,
        item.application ?? "",
        Number(item.quantity),
        Number(item.discount_pct ?? 0),
        Number(item.net_price),
        Number(item.line_total),
      ]);
    }
    sheet.addRow(["TOTAL", "", "", "", "", Number(order.total)]);
    sheet.getRow(1).font = { bold: true, size: 15 };
    tableHeader.font = { bold: true };
    sheet.getRow(sheet.rowCount).font = { bold: true };
    for (let i = tableHeader.number + 1; i <= sheet.rowCount; i++) {
      sheet.getCell(`E${i}`).numFmt = '"R$" #,##0.00';
      sheet.getCell(`F${i}`).numFmt = '"R$" #,##0.00';
    }
    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    const xlsxBytes = new Uint8Array(xlsxBuffer);
    let binary = "";
    for (const byte of xlsxBytes) binary += String.fromCharCode(byte);
    const excelContent = btoa(binary);
    if (!content) throw new Error("Não foi possível gerar o PDF do pedido.");
    try {
      const emailId = await sendOrderEmail({
        orderId: order.id, number: order.number, kind: order.kind,
        replyTo: seller?.email || undefined,
        text: `Segue pedido ${order.number} em PDF e Excel (.xlsx).\nCliente: ${customer.company_name ?? ""}\nRepresentante: ${sellerLabel}\nTotal: ${brl(order.total)}`,
        pdf: content, xlsx: excelContent,
      }, apiKey);
      return json({ sent: true, orderId: order.id, emailId, version: EMAIL_VERSION });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "O envio não foi confirmado. O pedido está salvo." }, 502);
    }
  } catch (error) {
    console.error("send-order-email internal failure", { version: EMAIL_VERSION, reason: error instanceof Error ? error.message : "Unknown failure" });
    return json({ error: "Não foi possível enviar o e-mail. O pedido está salvo; não crie outro pedido." }, 500);
  }
});
