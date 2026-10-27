import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ordersQuery } from "@/lib/queries";
import { accessQuery } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ORDER_STATUS, brl, termLabel } from "@/lib/brand";
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
    if (!order || ["cancelled", "sent", "invoiced"].includes(order.status)) {
      toast.error("Pedidos enviados ou faturados não podem ser excluídos.");
      return;
    }
    const kind = order.kind === "orcamento" ? "orçamento" : "pedido";
    if (!window.confirm(`Excluir o ${kind} nº ${order.number} da lista? O registro será preservado como cancelado no histórico.`)) return;
    setDeletingId(id);
    try {
      const { data: current, error: checkError } = await supabase.from("orders").select("status").eq("id", id).single();
      if (checkError || !current || ["sent", "invoiced", "cancelled"].includes(current.status)) {
        toast.error("Exclusão bloqueada: o pedido já foi enviado, faturado ou cancelado.");
        return;
      }
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
  const list = (data ?? []).filter(o => o.status !== "cancelled");
  const totalPedidos = list.filter(o => o.kind !== "orcamento").reduce((sum,o) => sum + Number(o.total || 0),0);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  async function changeStatus(id: string, status: string) {
    if (!isAdmin || savingStatus) return;
    setSavingStatus(id);
    const { error } = await supabase.rpc("update_order_status", { order_id: id, new_status: status });
    setSavingStatus(null);
    if (error) { toast.error("Não foi possível alterar o status: " + error.message); return; }
    await qc.invalidateQueries({ queryKey: ["orders"] });
    toast.success("Status do pedido atualizado.");
  }
  return (
    <div className="meus-pedidos-page mx-auto w-full max-w-4xl space-y-3 px-2 pb-24 sm:px-4">
      <h1 className="rounded-2xl border-2 border-[#d4af37] bg-[#102a52] px-3 py-3 text-center text-[clamp(1.5rem,6vw,2rem)] font-black uppercase text-white">MEUS PEDIDOS</h1>
      <section className="rounded-2xl border-2 border-red-800 bg-red-700 px-3 py-3 text-center text-white shadow-md" aria-label="Total dos pedidos realizados"><p className="text-sm font-bold uppercase tracking-wide">Total dos pedidos feitos</p><p className="mt-1 text-3xl font-black">{brl(totalPedidos)}</p></section>
      {isLoading ? <div className="surface-card h-24 animate-pulse" /> : list.length === 0 ? (
        <p className="surface-card p-5 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((o) => {
            const c = o.customer_snapshot as { company_name?: string; trade_name?: string };
            const st = ORDER_STATUS[o.status];
            return (
              <li key={o.id} className="meus-pedidos-card flex flex-col gap-2 rounded-2xl border-2 border-[#102a52] bg-white p-3 shadow-sm sm:p-4">
                <Link to="/pedidos/$id" params={{ id: o.id }} className="flex w-full min-w-0 flex-wrap items-start justify-between gap-2 rounded-lg p-1 text-[#102a52] hover:bg-slate-50 sm:gap-4">
                  <div className="min-w-0 flex-1 basis-[55%]">
                    <p className="text-xs font-bold uppercase text-[#102a52]">Dados do pedido</p><p className="font-extrabold">Nº {o.number} · {c.trade_name || c.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.item_count} itens · {termLabel(o.payment_term)}
                      {o.kind === "orcamento" && " · Orçamento"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{brl(Number(o.total))}</p>
                    <p className="mt-1 text-[11px] font-bold uppercase">Status do pedido</p><span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", st?.tone)}>{st?.label}</span>
                  </div>
                </Link>
                {isAdmin && <label className="flex w-full max-w-xs flex-col gap-1 text-xs font-bold">Status<select aria-label={`Status do pedido ${o.number}`} value={o.status} disabled={savingStatus === o.id} onChange={e=>void changeStatus(o.id,e.target.value)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-[#102a52]"><option value="received">Feito pedido</option><option value="processing">Em andamento</option><option value="sent">Enviado</option><option value="invoiced">Faturado</option></select></label>}
                {isAdmin && !["cancelled", "sent", "invoiced"].includes(o.status) && <button type="button" disabled={deletingId !== null} onClick={() => void cancelOrder(o.id)} aria-label={`Excluir ${o.kind === "orcamento" ? "orçamento" : "pedido"} nº ${o.number}`} title={`Excluir ${o.kind === "orcamento" ? "orçamento" : "pedido"} nº ${o.number}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-red-300 bg-red-50 text-red-700 hover:border-red-600 hover:bg-red-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-red-400 disabled:opacity-40"><Trash2 size={19}/></button>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
