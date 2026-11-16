import { AdminPageNavigation } from "@/components/AdminPageNavigation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { meQuery } from "@/lib/queries";
import { Users, ClipboardList, UserRound, BriefcaseBusiness, Warehouse, ChevronRight, MessageCircle, Download, LoaderCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-gestao")({
  staticData: { sitemap: false },
  component: Admin,
  head: () => ({ meta: [{ title: "Administração | Netinho Auto Parts" }] }),
});

const actions = [
  { label: "Pessoas e Comissões", description: "Perfis, comissões e áreas de atuação", to: "/pessoas", Icon: Users },
  { label: "Pedidos", description: "Acompanhar pedidos e solicitações", to: "/admin-pedidos", Icon: ClipboardList },
  { label: "Clientes", description: "Consultar cadastros comerciais", to: "/clientes", Icon: UserRound },
  { label: "Vendedores", description: "Equipe e acompanhamento de vendas", to: "/vendedores", Icon: BriefcaseBusiness },
  { label: "Comunicação WhatsApp", description: "Mensagens individuais ou para todos os representantes", to: "/admin-comunicacao", Icon: MessageCircle },
  { label: "Distribuidoras", description: "Parceiros e fornecedores", to: "/distribuidoras", Icon: Warehouse },
] as const;

type ExportRow = Record<string, unknown>;

async function readAllRows(table: string): Promise<ExportRow[]> {
  const rows: ExportRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from(table as never).select("*").range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Falha ao exportar ${table}: ${error.message}`);
    const page = (data ?? []) as ExportRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function exportAdminData() {
  // Use the current authenticated Supabase connection; never write to the source database.
  const [profiles, customers, products, ddds, territories] = await Promise.all([
    readAllRows("profiles"),
    readAllRows("customers"),
    readAllRows("products"),
    readAllRows("representative_area_ddds"),
    readAllRows("person_territories"),
  ]);
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Netinho Auto Parts";
  workbook.created = new Date();
  const sheets: Array<[string, ExportRow[]]> = [
    ["Representantes", profiles],
    ["Clientes", customers],
    ["Produtos", products],
    ["DDDs", ddds],
    ["Áreas de atuação", territories],
  ];
  for (const [name, rows] of sheets) {
    const sheet = workbook.addWorksheet(name);
    const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
    if (!columns.length) {
      sheet.addRow(["Sem registros neste cadastro"]);
      continue;
    }
    sheet.columns = columns.map(key => ({ header: key, key, width: Math.min(42, Math.max(16, key.length + 5)) }));
    for (const row of rows) {
      const clean: Record<string, string | number | boolean | null> = {};
      for (const key of columns) {
        const value = row[key];
        // Avoid Excel formula injection in text fields from external records.
        clean[key] = value == null ? null : typeof value === "number" || typeof value === "boolean" ? value : typeof value === "string" ? (/^[=+@\\-\\t\\r]/.test(value) ? "'" + value : value) : JSON.stringify(value);
      }
      sheet.addRow(clean);
    }
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102A52" } };
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  }
  const bytes = await workbook.xlsx.writeBuffer();
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `netinho-exportacao-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function Admin() {
  const { data: me, isLoading } = useQuery(meQuery);
  const [exporting, setExporting] = useState(false);
  async function handleExport() {
    if (!me?.isAdmin || exporting) return;
    setExporting(true);
    try { await exportAdminData(); toast.success("Arquivo Excel preparado para download."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao exportar cadastros."); }
    finally { setExporting(false); }
  }
  if (isLoading) return <p className="p-5">Carregando administração…</p>;
  if (!me?.isAdmin) return <p className="surface-card p-5 text-sm">Acesso restrito ao administrador.</p>;
  return <main className="mx-auto w-full max-w-5xl space-y-5 px-3 py-5 pb-28 text-[#102a52] sm:px-6">
      <AdminPageNavigation/>
    <header className="rounded-[1.6rem] border-2 border-[#d9aa30] bg-gradient-to-br from-[#153e75] to-[#06162e] px-5 py-6 text-center text-white shadow-xl">
      <h1 className="text-2xl font-black sm:text-3xl">Painel Administrativo</h1>
    </header>
    <section aria-label="Áreas de administração" className="rounded-[1.6rem] border border-[#d7dfe8] bg-white p-3 shadow-lg sm:p-5">
      <nav className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map(({label,to,Icon},index) => <Link key={to} to={to} className={`group flex min-h-24 items-center gap-3 rounded-2xl border border-[#d9aa30]/60 bg-gradient-to-r from-[#fffef8] to-[#f7f9fc] p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#bc8d25] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 sm:p-4 ${index===0?"sm:col-span-2":""}`}>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#174c89] to-[#081f43] text-[#f9d875] shadow-md"><Icon size={26}/></span>
          <span className="min-w-0 flex-1 text-sm font-extrabold leading-snug sm:text-base">{label}</span>
          <ChevronRight className="shrink-0 text-[#b88928] transition-transform group-hover:translate-x-1" size={22}/>
        </Link>)}
      </nav>
    </section>
    <section className="rounded-2xl border border-[#d9aa30]/60 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black">Exportação de cadastros</h2>
      <p className="mt-1 text-sm">Baixe um único arquivo Excel com abas separadas para representantes, clientes, produtos, DDDs e áreas de atuação. Somente leitura; nenhuma alteração será feita no banco.</p>
      <button type="button" disabled={exporting} onClick={handleExport} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#102a52] px-5 py-3 font-black text-white disabled:opacity-60">
        {exporting ? <LoaderCircle size={20} className="animate-spin"/> : <Download size={20}/>}
        {exporting ? "Preparando Excel..." : "EXPORTAR DADOS"}
      </button>
    </section>
  </main>;
}
