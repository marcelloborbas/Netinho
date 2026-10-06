import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus, ClipboardList, ShoppingCart, Phone } from "lucide-react";
import { meQuery, ordersQuery } from "@/lib/queries";
import { BRAND, ORDER_STATUS, brl } from "@/lib/brand";
import { useDraft } from "@/lib/order-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel – NETINHO Representações" },
      { name: "description", content: "Painel do representante: novo pedido, clientes, catálogo e histórico." },
      { property: "og:title", content: "Painel – NETINHO Representações" },
      { property: "og:description", content: "Painel do representante NETINHO." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useQuery(meQuery);
  const { data: orders, isLoading } = useQuery(ordersQuery);
  const draft = useDraft();
  const month = new Date().toISOString().slice(0, 7);
  const monthOrders = (orders ?? []).filter((o) => o.created_at.startsWith(month) && o.status !== "cancelled");
  const monthTotal = monthOrders.reduce((s, o) => s + Number(o.total), 0);

  const actions = [
    { to: "/catalogo", label: draft.items.length ? "Continuar pedido" : "Novo pedido", icon: ShoppingCart, primary: true },
    { to: "/catalogo", label: "Pesquisar produto", icon: Search },
    { to: "/clientes", label: "Clientes", icon: UserPlus },
    { to: "/pedidos", label: "Meus pedidos", icon: ClipboardList },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Olá,</p>
        <h1 className="text-4xl font-bold uppercase">{me?.name?.split(" ")[0] ?? "..."}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {actions.map((a) => (
          <Link key={a.label} to={a.to}
            className={cn("flex min-h-24 flex-col justify-between p-4 transition active:scale-[0.98]",
              "primary" in a ? "rounded-xl bg-gradient-red text-primary-foreground shadow-glow" : "surface-card")}>
            <a.icon className="h-6 w-6" />
            <span className="font-display text-lg font-bold uppercase leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pedidos no mês</p>
          <p className="font-display text-3xl font-bold">{monthOrders.length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total no mês</p>
          <p className="font-display text-3xl font-bold">{brl(monthTotal)}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold uppercase">Últimos pedidos</h2>
        {isLoading ? <div className="surface-card h-24 animate-pulse" /> :
          !orders?.length ? (
            <p className="surface-card p-5 text-sm text-muted-foreground">Nenhum pedido ainda. Toque em “Novo pedido” para começar.</p>
          ) : (
            <ul className="space-y-2">
              {orders.slice(0, 5).map((o) => {
                const c = o.customer_snapshot as { company_name?: string };
                const st = ORDER_STATUS[o.status];
                return (
                  <li key={o.id}>
                    <Link to="/pedidos/$id" params={{ id: o.id }} className="surface-card flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <p className="font-semibold">Nº {o.number} · <span className="truncate">{c.company_name}</span></p>
                        <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{brl(Number(o.total))}</p>
                        <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", st?.tone)}>{st?.label}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
      </section>

      <a href={`https://wa.me/${BRAND.phoneDigits}`} target="_blank" rel="noreferrer"
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Phone className="h-4 w-4" /> NETINHO {BRAND.phone}
      </a>
    </div>
  );
}
