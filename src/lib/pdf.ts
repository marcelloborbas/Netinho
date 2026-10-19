import type { Order, OrderItem } from "./queries";
import { BRAND, brl, termLabel } from "./brand";

/** Formulário único de pedidos e orçamentos para peças FCO e HD. */
export async function downloadOrderPdf(
  order: Order,
  items: OrderItem[],
  sellerName: string,
  save = true,
) {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  type Snap = Partial<
    Record<
      | "company_name"
      | "trade_name"
      | "address"
      | "district"
      | "city"
      | "state"
      | "cep"
      | "cnpj"
      | "state_registration"
      | "carrier"
      | "carrier_phone"
      | "email"
      | "phone"
      | "buyer",
      string | null
    >
  >;
  const c = (order.customer_snapshot ?? {}) as Snap;
  const documentKind = order.kind === "orcamento" ? "orçamento" : "pedido";
  const fileName = `${documentKind}-${order.number}.pdf`;
  const manufacturer = (item: OrderItem) => {
    const stored = (item as OrderItem & { manufacturer?: string }).manufacturer;
    if (stored === "FCO" || stored === "HD") return stored;
    const category = item.category ?? "";
    const prefix = category.match(/^(FCO|HD)\b/i)?.[1]?.toUpperCase();
    return prefix ?? "—";
  };
  const v = (x: unknown) => (x == null || x === "" ? "-" : String(x));

  doc.setFillColor(28, 29, 32);
  doc.rect(0, 0, 210, 28, "F");
  doc.setFillColor(220, 38, 38);
  doc.circle(18, 14, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(BRAND.name, 30, 14);
  doc.setFontSize(8);
  doc.text(BRAND.tagline.toUpperCase(), 30, 19);
  doc.text(BRAND.phone, 30, 23.5);
  doc.setFontSize(14);
  doc.text(`${order.kind === "orcamento" ? "ORÇAMENTO" : "PEDIDO"} Nº ${order.number}`, 200, 14, {
    align: "right",
  });
  doc.setFontSize(9);
  doc.text(new Date(order.created_at).toLocaleString("pt-BR"), 200, 20, { align: "right" });

  doc.setTextColor(20, 20, 20);
  autoTable(doc, {
    startY: 33,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.6 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 28 },
      2: { fontStyle: "bold", cellWidth: 26 },
    },
    body: [
      ["Razão Social", v(c.company_name), "Fantasia", v(c.trade_name)],
      ["Endereço", v(c.address), "Bairro", v(c.district)],
      ["Cidade", v(c.city), "Estado / CEP", `${v(c.state)} / ${v(c.cep)}`],
      ["CNPJ", v(c.cnpj), "Insc. Est.", v(c.state_registration)],
      ["Cond. Pagto", termLabel(order.payment_term), "Entrega", v(order.delivery)],
      ["Transportadora", v(order.carrier ?? c.carrier), "Fone Transp.", v(c.carrier_phone)],
      ["E-mail", v(c.email), "Fone", v(c.phone)],
      ["Vendedor", sellerName || "-", "Comprador", v(order.buyer ?? c.buyer)],
    ],
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4,
    theme: "striped",
    showFoot: "lastPage",
    headStyles: { fillColor: [200, 30, 30] },
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    head: [
      ["MARCA / CÓD.", "Família", "Aplicação", "Quant.", "Desc.", "Preço NF Líq.", "Total NF"],
    ],
    columnStyles: {
      2: { cellWidth: 70 },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    body: items.map((i) => [
      `${manufacturer(i)} ${i.code}`,
      i.category,
      i.application,
      String(i.quantity),
      `${Number(i.discount_pct)}%`,
      brl(Number(i.net_price)),
      brl(Number(i.line_total)),
    ]),
    foot: [["", "", "", "", "", "TOTAL", brl(Number(order.total))]],
    footStyles: { fillColor: [28, 29, 32], halign: "right" },
  });

  {
    let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    const lines: string[] = doc.splitTextToSize(order.notes || "Sem observações.", 180);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    for (const line of ["OBSERVAÇÕES / AUTORIZAÇÃO:", ...lines, "", "Conferido por: _______________________    Data: ____/____/________"]) {
      if (y > 276) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, 14, y);
      y += 5;
    }
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(`Netinho Auto Parts | FCO Automotive e HD Embreagens`, 14, 289);
    doc.text(`${page} / ${pages}`, 196, 289, { align: "right" });
  }
  if (save) doc.save(fileName);
  return new File([doc.output("blob")], fileName, { type: "application/pdf" });
}
