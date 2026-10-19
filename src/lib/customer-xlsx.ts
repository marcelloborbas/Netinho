import type { Customer } from "./queries";

/** Emite a ficha cadastral do cliente no padrão único Netinho FCO / HD. */
export async function downloadCustomerXlsx(customer: Customer) {
  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();
  book.creator = "Netinho Auto Parts";
  const sheet = book.addWorksheet("Ficha Cadastral", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  sheet.columns = Array.from({ length: 8 }, () => ({ width: 17 }));
  sheet.mergeCells("A1:H2");
  const title = sheet.getCell("A1");
  title.value = "NETINHO AUTO PARTS  |  FICHA CADASTRAL";
  title.font = { name: "Arial", size: 17, bold: true, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102A52" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 25;
  sheet.getRow(2).height = 25;
  sheet.mergeCells("A3:H3");
  sheet.getCell("A3").value = "Cadastro único de clientes • FCO e HD";
  sheet.getCell("A3").alignment = { horizontal: "center" };
  sheet.getCell("A3").font = { bold: true, color: { argb: "FF102A52" } };
  sheet.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2FF" } };
  const data = customer as unknown as Record<string, unknown>;
  const val = (...keys: string[]) => {
    const value = keys.map((key) => data[key]).find((v) => v !== null && v !== undefined && v !== "");
    return value === undefined ? "" : String(value);
  };
  let row = 5;
  const section = (label: string, fields: Array<[string, string]>) => {
    sheet.mergeCells(`A${row}:H${row}`);
    const heading = sheet.getCell("A" + row);
    heading.value = label;
    heading.font = { bold: true, color: { argb: "FFFFFFFF" } };
    heading.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102A52" } };
    sheet.getRow(row).height = 24;
    row++;
    for (const [name, value] of fields) {
      sheet.mergeCells(`A${row}:C${row}`);
      sheet.mergeCells(`D${row}:H${row}`);
      const labelCell = sheet.getCell("A" + row);
      labelCell.value = name;
      labelCell.font = { bold: true, color: { argb: "FF102A52" } };
      labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2FF" } };
      const valueCell = sheet.getCell("D" + row);
      valueCell.value = value;
      valueCell.alignment = { wrapText: true, vertical: "middle" };
      valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FBFF" } };
      sheet.getRow(row).height = 25;
      row++;
    }
    row++;
  };
  section("DADOS DA EMPRESA", [
    ["Nome fantasia", val("trade_name")], ["Razão social", val("company_name")],
    ["CNPJ", val("cnpj")], ["Inscrição estadual", val("state_registration")],
    ["Endereço", val("address")], ["Bairro", val("district")],
    ["Cidade", val("city")], ["UF", val("state")], ["CEP", val("cep")],
    ["Telefone", val("phone")], ["WhatsApp", val("whatsapp", "mobile")],
    ["E-mail", val("email")], ["Site", val("website")],
    ["Capital social", val("capital")], ["Número de empregados", val("employees")],
    ["Simples Nacional", val("simples_nacional")], ["Finalidade", val("purpose")],
  ]);
  section("TRANSPORTADORA", [
    ["Nome da transportadora", val("carrier")], ["Telefone", val("carrier_phone")],
    ["CNPJ", val("carrier_cnpj")], ["Cidade / UF", val("carrier_city")],
  ]);
  section("CONTATOS COMERCIAIS E FINANCEIROS", [
    ["Responsável comercial / comprador", val("buyer")],
    ["E-mail comercial", val("buyer_email")], ["Telefone comercial", val("buyer_phone")],
    ["Responsável financeiro", val("finance_contact")],
    ["E-mail financeiro", val("finance_email")], ["Telefone financeiro", val("finance_phone")],
    ["Contato NF-e", val("nfe_contact")], ["E-mail NF-e", val("nfe_email")],
  ]);
  section("INFORMAÇÕES COMERCIAIS", [
    ["Como conheceu a empresa?", val("referral_source")],
    ["Principais produtos", val("products")], ["Região de atuação", val("region")],
    ["Concorrentes", val("competitors")], ["Faturamento anual anterior", val("annual_revenue")],
    ["Expectativas comerciais", val("commercial_expectations")],
  ]);
  section("REFERÊNCIAS", [
    ["Fornecedor / contato 1", val("reference_1")],
    ["Fornecedor / contato 2", val("reference_2")],
    ["Fornecedor / contato 3", val("reference_3")],
    ["Referência bancária", val("bank_reference")],
  ]);
  section("CONTROLE INTERNO", [
    ["Representante", val("representative")],
    ["Data do cadastro", val("created_at") ? new Date(val("created_at")).toLocaleDateString("pt-BR") : ""],
    ["Observações", val("notes", "observations")],
  ]);
  sheet.pageSetup.printArea = `A1:H${row - 1}`;
  const buffer = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `ficha-cadastral-${String(customer.trade_name || customer.company_name || "cliente").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase()}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
