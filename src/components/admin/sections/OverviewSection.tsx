import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import {
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Search,
  ShoppingCart,
  Clock3,
  Activity,
} from "lucide-react";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

/** Atalhos para as áreas de administração. */
export function OverviewSection() {
  const { data: me } = useQuery(meQuery);
  const { data: activity, isLoading, isError } = useQuery({
    queryKey: ["admin-overview-activity"],
    enabled: !!me?.isAdmin,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("id,number,created_at,total,status,kind")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const rows = data ?? [];
      const orders = rows.filter((o) => o.kind !== "orcamento");
      const recent = orders.slice(0, 5);
      const pending = orders.filter((o) => !["cancelled", "faturado", "invoiced", "delivered", "concluido"].includes(o.status.toLowerCase()));
      return { recent, pending: pending.slice(0, 5), pendingCount: pending.length };
    },
  });
  const dateLabel = (date: string) => new Date(date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return (
    <div className="space-y-3 text-navy">
      <AdminSectionHeader
        icon={LayoutDashboard}
        title="Visão geral"
        description="Acompanhamento operacional e acesso rápido às tarefas"
      />
      <section aria-label="Acompanhamento operacional" className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-black"><Clock3 size={18} className="text-gold-deep"/>Pedidos em acompanhamento</h3>
            <Link to="/admin" search={{secao:"pedidos"}} className="text-xs font-bold text-navy underline-offset-2 hover:underline">Ver todos</Link>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">Até 5 pedidos recentes ainda não finalizados, entre os últimos 100 registros consultados.</p>
          {isLoading ? <p className="text-sm">Carregando pedidos…</p> : isError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar os pedidos.</p> : !activity?.pending.length ? <p className="text-sm text-muted-foreground">Nenhum pedido em acompanhamento nesta consulta.</p> :
            <ul className="divide-y divide-border">{activity.pending.map((order) => <li key={order.id} className="flex items-center justify-between gap-2 py-2 text-xs">
              <span className="min-w-0"><strong className="block text-sm">Pedido #{order.number}</strong><span className="text-muted-foreground">{dateLabel(order.created_at)} · {order.status}</span></span>
              <strong className="shrink-0">{brl(Number(order.total ?? 0))}</strong>
            </li>)}</ul>}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-black"><Activity size={18} className="text-gold-deep"/>Últimos pedidos</h3>
            <Link to="/admin" search={{secao:"pedidos"}} className="text-xs font-bold text-navy underline-offset-2 hover:underline">Gerenciar pedidos</Link>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">Últimos 5 pedidos registrados, sem orçamentos.</p>
          {isLoading ? <p className="text-sm">Carregando movimentações…</p> : isError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar a movimentação.</p> : !activity?.recent.length ? <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p> :
            <ul className="divide-y divide-border">{activity.recent.map((order) => <li key={order.id} className="flex items-center justify-between gap-2 py-2 text-xs">
              <span className="min-w-0"><strong className="block text-sm">Pedido #{order.number}</strong><span className="text-muted-foreground">{dateLabel(order.created_at)} · {order.status}</span></span>
              <strong className="shrink-0">{brl(Number(order.total ?? 0))}</strong>
            </li>)}</ul>}
        </div>
      </section>
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
