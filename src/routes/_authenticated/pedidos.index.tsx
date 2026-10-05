import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ordersQuery } from "@/lib/queries";
import { ORDER_STATUS, brl, termLabel } from "@/lib/brand";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pedidos/")({
  head: () => ({
    meta: [
      { title: "Meus pedidos – NETINHO" },
      { name: "description", content: "Histórico de pedidos enviados." },
      { property: "og:title", content: "Meus pedidos – NETINHO" },
      { property: "og:description", content: "Histórico de pedidos enviados." },
    ],
  }),
  component: Orders,
});

function Orders() {
  const { data, isLoading } = useQuery(ordersQuery);
  const [q, setQ] = useState("");
  const t = q.toLowerCase().trim();
  const list = (data ?? []).filter((o) => {
    const c = o.customer_snapshot as { company_name?: string; trade_name?: string };
    return !t || String(o.number).includes(t) || c.company_name?.toLowerCase().includes(t) || c.trade_name?.toLowerCase().includes(t);
  });
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold uppercase">Pedidos</h1>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número ou cliente" className="h-12" />
      {isLoading ? <div className="surface-card h-24 animate-pulse" /> : list.length === 0 ? (
        <p className="surface-card p-5 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((o) => {
            const c = o.customer_snapshot as { company_name?: string; trade_name?: string };
            const st = ORDER_STATUS[o.status];
            return (
              <li key={o.id}>
                <Link to="/pedidos/$id" params={{ id: o.id }} className="surface-card flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">Nº {o.number} · {c.trade_name || c.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.item_count} itens · {termLabel(o.payment_term)}
                      {o.kind === "orcamento" && " · Orçamento"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{brl(Number(o.total))}</p>
                    <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", st?.tone)}>{st?.label}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
