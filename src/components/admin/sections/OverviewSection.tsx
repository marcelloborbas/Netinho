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
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";
import { exportAdminData } from "@/lib/admin-export";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

/** Início e fim (UTC) do mês corrente no fuso de São Paulo. */
function currentMonthRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  // São Paulo usa UTC-3 o ano todo.
  return {
    start: new Date(Date.UTC(year, month - 1, 1, 3)).toISOString(),
    end: new Date(Date.UTC(year, month, 1, 3)).toISOString(),
  };
}

/** Indicadores, atalhos para todas as seções e exportação dos cadastros. */
export function OverviewSection() {
  const { data: me } = useQuery(meQuery);
  const [exporting, setExporting] = useState(false);
  const {
    data: kpis,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-overview-kpis"],
    enabled: !!me?.isAdmin,
    staleTime: 60_000,
    queryFn: async () => {
      const { start, end } = currentMonthRange();
      const [people, customers, monthOrders] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("access_active", true),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        (async () => {
          const rows: Array<{ total: number | null; kind: string; status: string }> = [];
          for (let from = 0; ; from += 500) {
            const { data, error } = await supabase
              .from("orders")
              .select("total,kind,status")
              .gte("created_at", start)
              .lt("created_at", end)
              .range(from, from + 499);
            if (error) throw error;
            rows.push(...(data ?? []));
            if (!data || data.length < 500) break;
          }
          return rows;
        })(),
      ]);
      if (people.error) throw people.error;
      if (customers.error) throw customers.error;
      const valid = monthOrders.filter((o) => o.kind !== "orcamento" && o.status !== "cancelled");
      return {
        activePeople: people.count ?? 0,
        customers: customers.count ?? 0,
        monthOrders: valid.length,
        monthTotal: valid.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
      };
    },
  });
  async function handleExport() {
    if (!me?.isAdmin || exporting) return;
    setExporting(true);
    try {
      const missing = await exportAdminData();
      if (missing)
        toast.warning(
          `Excel gerado parcialmente: ${missing} cadastro(s) indisponível(is). Consulte a aba Resumo da exportação.`,
        );
      else toast.success("Arquivo Excel preparado para download.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao exportar cadastros.");
    } finally {
      setExporting(false);
    }
  }
  const value = (v: number | string | undefined) =>
    isLoading ? "…" : isError || v === undefined ? "—" : v;
  const cards = [
    { label: "Acessos ativos", value: value(kpis?.activePeople) },
    { label: "Clientes", value: value(kpis?.customers) },
    { label: "Pedidos no mês", value: value(kpis?.monthOrders) },
    { label: "Vendido no mês", value: value(kpis ? brl(kpis.monthTotal) : undefined) },
  ];
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
            {exporting ? "Preparando Excel…" : "Exportar cadastros"}
          </button>
        }
      />
      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <dt className="text-xs font-semibold text-muted-foreground">{card.label}</dt>
            <dd className="mt-1 truncate text-xl font-black tabular-nums">{card.value}</dd>
          </div>
        ))}
      </dl>
      {isError && (
        <p role="alert" className="text-xs text-destructive">
          Não foi possível calcular todos os indicadores.
        </p>
      )}
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
