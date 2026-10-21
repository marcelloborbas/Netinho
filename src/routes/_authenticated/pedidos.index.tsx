import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ordersQuery } from "@/lib/queries";
import { accessQuery } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ban } from "lucide-react";
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
  const { data: access } = useQuery(accessQuery);
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isAdmin = access?.level === 1;
  async function cancelOrder(id: string) {
    if (!isAdmin || deletingId) return;
    const order = data?.find((o) => o.id === id);
    if (!order || order.status === "cancelled") return;
    const kind = order.kind === "orcamento" ? "orçamento" : "pedido";
    const warning = order.status === "invoiced"
      ? "ATENÇÃO: este pedido está FATURADO. Alterar o status no site não cancela a nota fiscal ou a venda na distribuidora. Confirma a alteração do status?"
      : `Deseja cancelar o ${kind} nº ${order.number}? Ele desaparecerá da lista de pedidos, mas permanecerá registrado no histórico do sistema.`;
    if (!window.confirm(warning)) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.rpc("update_order_status", {
        order_id: id,
        new_status: "cancelled",
      });
      if (error) {
        toast.error(`Não foi possível cancelar o ${kind}. Verifique a permissão do administrador. ${error.message}`);
        return;
      }
      toast.success(`${kind === "pedido" ? "Pedido" : "Orçamento"} nº ${order.number} cancelado.`);
      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["order", id] });
    } catch {
      toast.error("Falha de comunicação ao cancelar. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  }
  const [q, setQ] = useState("");
  const t = q.toLowerCase().trim();
  const list = (data ?? []).filter((o) => {
    if (o.status === "cancelled") return false;
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
              <li key={o.id} className="flex items-center gap-2">
                <Link to="/pedidos/$id" params={{ id: o.id }} className="surface-card flex min-w-0 flex-1 items-center justify-between gap-3 p-4">
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
                {isAdmin && o.status !== "cancelled" && <button type="button" disabled={deletingId !== null} onClick={() => void cancelOrder(o.id)} aria-label={`Cancelar ${o.kind === "orcamento" ? "orçamento" : "pedido"} nº ${o.number}`} title={`Cancelar ${o.kind === "orcamento" ? "orçamento" : "pedido"} nº ${o.number}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-red-300 bg-red-50 text-red-700 hover:border-red-600 hover:bg-red-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-red-400 disabled:opacity-40"><Ban size={19}/></button>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
