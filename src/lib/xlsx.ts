import type { Order, OrderItem } from "./queries";
import { BRAND, termLabel } from "./brand";

/** Campos de endereço e contato gravados no momento do pedido. */
type CustomerSnapshot = {
  company_name?: string | null;
  trade_name?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  cnpj?: string | null;
  state_registration?: string | null;
  phone?: string | null;
  email?: string | null;
  carrier?: string | null;
  carrier_phone?: string | null;
  buyer?: string | null;
};

/** Planilha comercial única para pedidos e orçamentos FCO / HD. */
export async function downloadOrderXlsx(order: Order, items: OrderItem[], sellerName: string) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Netinho Auto Parts";
  const sheet = workbook.addWorksheet("Formulário", { pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  sheet.columns = [
    { key: "a", width: 20 }, { key: "b", width: 17 }, { key: "c", width: 24 },
    { key: "d", width: 18 }, { key: "e", width: 13 }, { key: "f", width: 14 },
    { key: "g", width: 19 }, { key: "h", width: 20 },
  ];
  try {
    const response = await fetch("/favicon.png");
    if (response.ok) {
      const imageId = workbook.addImage({ buffer: await response.arrayBuffer(), extension: "png" });
      sheet.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 58, height: 58 } });
    }
  } catch { /* Logo opcional */ }
  const c = (order.customer_snapshot ?? {}) as CustomerSnapshot;
  const v = (x: unknown) => x == null || x === "" ? "—" : String(x);
  const header = (range: string, value: string, color = "102A52") => {
    sheet.mergeCells(range);
    const cell = sheet.getCell(range.split(":")[0] ?? range);
    cell.value = value;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + color } };
    cell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  header("A1:H2", "NETINHO AUTO PARTS | FORMULÁRIO DE " + (order.kind === "orcamento" ? "ORÇAMENTO" : "PEDIDO"));
  sheet.getRow(1).height = 25; sheet.getRow(2).height = 22;
  header("A3:H3", "Nº " + order.number + "  |  " + new Date(order.created_at).toLocaleDateString("pt-BR") + "  |  FCO / HD", "174E9B");
  const field = (row: number, label1: string, value1: unknown, label2: string, value2: unknown) => {
    sheet.getCell("A" + row).value = label1; sheet.mergeCells("B" + row + ":D" + row);
    sheet.getCell("B" + row).value = v(value1);
    sheet.getCell("E" + row).value = label2; sheet.mergeCells("F" + row + ":H" + row);
    sheet.getCell("F" + row).value = v(value2);
    for (const col of ["A", "E"]) {
      const cell = sheet.getCell(col + row);
      cell.font = { bold: true, color: { argb: "FF102A52" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2FF" } };
    }
    sheet.getRow(row).height = 24;
  };
  field(5, "Razão social", c.company_name, "Fantasia", c.trade_name);
  field(6, "Endereço", c.address, "Bairro", c.district);
  field(7, "Cidade", c.city, "UF / CEP", [c.state, c.cep].filter(Boolean).join(" / "));
  field(8, "CNPJ", c.cnpj, "Inscrição estadual", c.state_registration);
  field(9, "Telefone", c.phone, "E-mail", c.email);
  field(10, "Pagamento", termLabel(order.payment_term), "Entrega", order.delivery);
  field(11, "Transportadora", order.carrier || c.carrier, "Telefone transp.", c.carrier_phone);
  field(12, "Vendedor", sellerName, "Comprador", order.buyer || c.buyer);
  field(13, "Netinho", BRAND.phone, "E-mail", BRAND.orderEmail);
  const headRow = 14;
  const columns = ["MARCA", "CÓDIGO", "FAMÍLIA", "APLICAÇÃO", "QTD.", "DESC. %", "PREÇO LÍQ.", "TOTAL"];
  sheet.getRow(headRow).values = columns;
  sheet.getRow(headRow).height = 30;
  sheet.getRow(headRow).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF174E9B" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  items.forEach((item, index) => {
    const row = headRow + index + 1;
    const category = item.category || "";
    const brand = (item as OrderItem & { manufacturer?: string }).manufacturer || category.match(/^(FCO|HD)\b/i)?.[1] || "—";
    sheet.getRow(row).values = [brand, item.code, category, item.application, item.quantity, Number(item.discount_pct), Number(item.net_price), { formula: `E${row}*G${row}`, result: Number(item.line_total) }];
    sheet.getRow(row).height = 33;
    for (const col of ["D", "C"]) sheet.getCell(col + row).alignment = { wrapText: true, vertical: "middle" };
    for (const col of ["G", "H"]) sheet.getCell(col + row).numFmt = '"R$" #,##0.00';
    if (index % 2 === 0) sheet.getRow(row).eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F5FC" } }; });
  });
  const totalRow = headRow + items.length + 1;
  sheet.mergeCells(`A${totalRow}:G${totalRow}`);
  sheet.getCell("A" + totalRow).value = "TOTAL DO " + (order.kind === "orcamento" ? "ORÇAMENTO" : "PEDIDO");
  sheet.getCell("A" + totalRow).font = { bold: true, color: { argb: "FF102A52" } };
  sheet.getCell("H" + totalRow).value = { formula: `SUM(H${headRow + 1}:H${totalRow - 1})`, result: Number(order.total) };
  sheet.getCell("H" + totalRow).numFmt = '"R$" #,##0.00';
  sheet.getCell("H" + totalRow).font = { bold: true, color: { argb: "FFBD2026" } };
  sheet.mergeCells(`A${totalRow + 2}:H${totalRow + 3}`);
  sheet.getCell("A" + (totalRow + 2)).value = "OBSERVAÇÕES: " + (order.notes || "Sem observações.");
  sheet.getCell("A" + (totalRow + 2)).alignment = { wrapText: true, vertical: "top" };
  sheet.mergeCells(`A${totalRow + 5}:H${totalRow + 5}`);
  sheet.getCell("A" + (totalRow + 5)).value = "Conferido por: ________________________________________     Data: ____/____/________";
  sheet.pageSetup.printArea = `A1:H${totalRow + 5}`;
  const data = await workbook.xlsx.writeBuffer();
  const blob = new Blob([data as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${order.kind === "orcamento" ? "orcamento" : "pedido"}-${order.number}.xlsx`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
