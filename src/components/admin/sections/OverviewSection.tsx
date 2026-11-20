import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ChevronRight,
  ClipboardList,
  Download,
  LayoutDashboard,
  LoaderCircle,
  Search,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { meQuery } from "@/lib/queries";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";
import { exportAdminData } from "@/lib/admin-export";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

/** Indicadores, atalhos para todas as seções e exportação dos cadastros. */
export function OverviewSection() {
  const { data: me } = useQuery(meQuery);
  const [exporting, setExporting] = useState(false);
  async function handleExport() {
    if (!me?.isAdmin || exporting) return;
    setExporting(true);
    try {
      const missing = await exportAdminData();
      if (missing)
        toast.warning(
          `PDF gerado parcialmente: ${missing} cadastro(s) indisponível(is). Consulte o resumo da exportação na primeira página.`,
        );
      else toast.success("Arquivo PDF preparado para download.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao exportar cadastros.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="space-y-3 text-navy">
      <AdminSectionHeader
        icon={LayoutDashboard}
        title="Visão geral"
        description="Pedidos do mês sem orçamentos e cancelamentos"
        actions={
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExport()}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-gold px-4 text-sm font-extrabold text-gold-foreground shadow hover:bg-gold-soft disabled:opacity-60"
          >
            {exporting ? (
              <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <Download size={18} aria-hidden="true" />
            )}
            {exporting ? "Preparando PDF…" : "Exportar dados em PDF"}
          </button>
        }
      />
      <section
        aria-label="Todas as áreas do painel"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        {ADMIN_SECTIONS.filter((s) => s.id !== "visao-geral").map(
          ({ id, label, description, icon: Icon }) => (
            <Link
              key={id}
              to="/admin"
              search={{ secao: id }}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition hover:border-gold"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-gold"
                aria-hidden="true"
              >
                <Icon size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm">{label}</strong>
                <span className="block truncate text-xs text-muted-foreground">{description}</span>
              </span>
              <ChevronRight
                size={18}
                aria-hidden="true"
                className="shrink-0 text-gold-deep transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          ),
        )}
      </section>
      <section
        aria-label="Ferramentas administrativas em outras telas"
        className="rounded-2xl border border-border bg-card p-3 shadow-sm"
      >
        <h3 className="text-sm font-black">Ações do administrador dentro das telas de venda</h3>
        <ul className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
          <li>
            <Link
              to="/catalogo"
              className="flex items-center gap-2 font-bold underline-offset-2 hover:underline"
            >
              <Search size={15} aria-hidden="true" />
              Catálogo: campanhas Oferta/Saldão
            </Link>
          </li>
          <li>
            <Link
              to="/pedidos"
              className="flex items-center gap-2 font-bold underline-offset-2 hover:underline"
            >
              <ClipboardList size={15} aria-hidden="true" />
              Minhas Vendas: cancelar pedidos
            </Link>
          </li>
          <li>
            <Link
              to="/pedido"
              className="flex items-center gap-2 font-bold underline-offset-2 hover:underline"
            >
              <ShoppingCart size={15} aria-hidden="true" />
              Novo pedido sem limite de desconto
            </Link>
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          O status de cada pedido é alterado na própria ficha do pedido (seção Pedidos → Abrir).
        </p>
      </section>
    </div>
  );
}
