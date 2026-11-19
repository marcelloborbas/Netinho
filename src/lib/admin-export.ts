import { supabase } from "@/integrations/supabase/client";

/** Exportação somente leitura dos cadastros para um único arquivo Excel. */
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
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Netinho Auto Parts";
  workbook.created = new Date();
  const summary = workbook.addWorksheet("Resumo da exportação");
  summary.addRow(["Cadastro", "Tabela", "Situação", "Registros", "Detalhes"]);
  for (const result of results)
    summary.addRow([
      result.sheet,
      result.table,
      result.error ? "NÃO EXPORTADO" : result.rows.length ? "EXPORTADO" : "VAZIO",
      result.error ? "" : result.rows.length,
      result.error,
    ]);
  summary.columns = [{ width: 24 }, { width: 34 }, { width: 20 }, { width: 14 }, { width: 95 }];
  summary.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summary.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102A52" } };
  const sheets: Array<[string, ExportRow[]]> = results
    .filter((result) => !result.error)
    .map((result) => [result.sheet, result.rows]);
  for (const [name, rows] of sheets) {
    const sheet = workbook.addWorksheet(name);
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    if (!columns.length) {
      sheet.addRow(["Sem registros neste cadastro"]);
      continue;
    }
    sheet.columns = columns.map((key) => ({
      header: key,
      key,
      width: Math.min(42, Math.max(16, key.length + 5)),
    }));
    for (const row of rows) {
      const clean: Record<string, string | number | boolean | null> = {};
      for (const key of columns) {
        const value = row[key];
        // Avoid Excel formula injection in text fields from external records.
        clean[key] =
          value == null
            ? null
            : typeof value === "number" || typeof value === "boolean"
              ? value
              : typeof value === "string"
                ? /^[=+@\\-\\t\\r]/.test(value)
                  ? "'" + value
                  : value
                : JSON.stringify(value);
      }
      sheet.addRow(clean);
    }
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102A52" } };
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rows.length + 1, column: columns.length },
    };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  }
  const bytes = await workbook.xlsx.writeBuffer();
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `netinho-exportacao-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return results.filter((result) => result.error).length;
}
