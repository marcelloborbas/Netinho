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
    // Modelo oficial aprovado, preservando logotipo, desenho e formatação da planilha.
    const templateUrl = "https://raw.githubusercontent.com/marcelloborbas/Netinho/main/Formulario_Pedido_Netinho_Auto_Parts.xlsx";
    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) throw new Error("Modelo oficial de pedido indisponível: " + templateResponse.status);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await templateResponse.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("Modelo de pedido sem planilha");
    // Preencher apenas campos do modelo; nunca reconstruir a folha.
    const put = (cell: string, value: ExcelJS.CellValue) => { sheet.getCell(cell).value = value; };
    put("B1", "NETINHO AUTO PARTS");
    put("B2", "Representante Oficial");
    put("B3", "Pedidos: netinhoautoparts@gmail.com");
    put("B4", "netinhoautoparts.live");
    put("A5", "(15) 9.9245-8492");
    put("B6", new Date(order.created_at ?? Date.now()).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) + "  Nº " + order.number);
    put("B8", customer.company_name ?? "");
    put("G8", customer.trade_name ?? customer.fantasy_name ?? "");
    put("B9", customer.address ?? "");
    put("G9", customer.neighborhood ?? "");
    put("B10", customer.city ?? "");
    put("G10", customer.state ?? "");
    put("I10", customer.zip_code ?? customer.cep ?? "");
    put("B11", customer.cnpj ?? "");
    put("G11", customer.state_registration ?? "");
    put("B12", order.payment_term ?? "");
    put("G12", "FOB");
    put("B13", "FOB");
    put("B14", customer.email ?? "");
    put("H14", customer.phone ?? "");
    put("B15", sellerLabel);
    put("G15", order.buyer ?? "");
    put("A17", "CÓDIGO");
    put("B17", "Família Produto");
    const firstItemRow = 18;
    const lastTemplateItemRow = 36;
    if (items.length > lastTemplateItemRow - firstItemRow + 1) {
      sheet.duplicateRow(lastTemplateItemRow, items.length - (lastTemplateItemRow - firstItemRow + 1), true);
    }
    for (let i = 0; i < Math.max(items.length, lastTemplateItemRow - firstItemRow + 1); i++) {
      const row = firstItemRow + i;
      const item = items[i];
      put("A" + row, item ? String(item.code ?? "") : "");
      put("B" + row, item ? String(item.manufacturer ?? "") : "");
      put("D" + row, item ? String(item.application ?? "") : "");
      put("F" + row, item ? Number(item.quantity) : 0);
      put("G" + row, item ? Number(item.discount_pct ?? 0) : 0);
      put("H" + row, item ? Number(item.net_price) : 0);
      // Valor unitário já líquido: não aplicar desconto novamente.
      put("I" + row, item ? { formula: `F${row}*H${row}`, result: Number(item.line_total) } : 0);
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
