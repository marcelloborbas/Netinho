import { supabase } from "@/integrations/supabase/client";

/** Exportação somente leitura dos cadastros para um único arquivo PDF. */
type ExportRow = Record<string, unknown>;

async function readAllRows(table: string): Promise<ExportRow[]> {
  const rows: ExportRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from(table as never)
      .select("*")
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Falha ao exportar ${table}: ${error.message}`);
    const page = (data ?? []) as ExportRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

export async function exportAdminData(): Promise<number> {
  // Use the current authenticated Supabase connection; never write to the source database.
  const sources = [
    { sheet: "Perfis com acesso", table: "profiles" },
    { sheet: "Representantes comerciais", table: "commercial_representatives" },
    { sheet: "Dados comerciais", table: "commercial_representative_details" },
    { sheet: "Perfis representantes", table: "representative_profiles" },
    { sheet: "Dados privados representantes", table: "representative_private_details" },
    { sheet: "Comissões comerciais", table: "commercial_representative_commission_rates" },
    { sheet: "Comissões usuários", table: "salesperson_commission_rates" },
    { sheet: "Clientes", table: "customers" },
    { sheet: "Produtos", table: "products" },
    { sheet: "Categorias", table: "categories" },
    { sheet: "Pedidos", table: "orders" },
    { sheet: "Itens dos pedidos", table: "order_items" },
    { sheet: "DDDs", table: "representative_area_ddds" },
    { sheet: "Áreas de atuação", table: "person_territories" },
  ];
  const results = await Promise.all(
    sources.map(async (source) => {
      try {
        return { ...source, rows: await readAllRows(source.table), error: "" };
      } catch (error) {
        return {
          ...source,
          rows: [] as ExportRow[],
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );
  if (results.every((result) => result.error)) {
    throw new Error(
      "Não foi possível consultar nenhuma tabela. Verifique a conexão do site com o Supabase e as permissões de leitura.",
    );
  }
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const date = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const title = (heading: string) => {
    pdf.setFillColor(16, 42, 82);
    pdf.rect(0, 0, pageWidth, 21, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("NETINHO AUTO PARTS", 12, 9);
    pdf.setFontSize(9);
    pdf.text(heading, 12, 16);
    pdf.setTextColor(16, 42, 82);
  };
  title("Exportação administrativa - " + date);
  autoTable(pdf, {
    startY: 27,
    head: [["Cadastro", "Tabela", "Situação", "Registros", "Detalhes"]],
    body: results.map((r) => [r.sheet, r.table, r.error ? "NÃO EXPORTADO" : r.rows.length ? "EXPORTADO" : "VAZIO", r.error ? "—" : String(r.rows.length), r.error]),
    theme: "grid",
    styles: { fontSize: 8, overflow: "linebreak" },
    headStyles: { fillColor: [16, 42, 82] },
    margin: { left: 12, right: 12 },
  });
  for (const result of results) {
    if (result.error) continue;
    pdf.addPage();
    title(result.sheet + " - " + result.rows.length + " registros");
    if (!result.rows.length) {
      pdf.setFontSize(10);
      pdf.text("Nenhum registro encontrado.", 12, 32);
      continue;
    }
    const columns = Array.from(new Set(result.rows.flatMap((row) => Object.keys(row))));
    // Dividir tabelas muito largas para manter todos os campos legíveis no PDF.
    const batchSize = 5;
    for (let index = 0; index < columns.length; index += batchSize) {
      if (index > 0) {
        pdf.addPage();
        title(result.sheet + " - campos " + (index + 1) + " a " + Math.min(index + batchSize, columns.length));
      }
      const keys = columns.slice(index, index + batchSize);
      autoTable(pdf, {
        startY: 26,
        head: [["#", ...keys]],
        body: result.rows.map((row, rowIndex) => [String(rowIndex + 1), ...keys.map((key) => {
          const value = row[key];
          return value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
        })]),
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", valign: "top" },
        headStyles: { fillColor: [16, 42, 82] },
        columnStyles: { 0: { cellWidth: 10 } },
        margin: { left: 10, right: 10, top: 15, bottom: 13 },
        didDrawPage: ({ pageNumber }) => {
          pdf.setFontSize(8);
          pdf.setTextColor(90, 100, 115);
          pdf.text("Netinho Auto Parts | " + result.sheet + " | página " + pageNumber, 10, pdf.internal.pageSize.getHeight() - 6);
        },
      });
    }
  }
  pdf.save(`netinho-exportacao-${new Date().toISOString().slice(0, 10)}.pdf`);
  return results.filter((result) => result.error).length;
}
