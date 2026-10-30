import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ordersQuery } from "@/lib/queries";
import { accessQuery } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ChartColumnIncreasing, ChevronRight, Building2, CalendarDays, CreditCard, Coins } from "lucide-react";
import { ORDER_STATUS, brl, termLabel } from "@/lib/brand";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pedidos/")({
  head: () => ({
    meta: [
      { title: "Minhas Vendas – NETINHO" },
      { name: "description", content: "Histórico de pedidos enviados." },
      { property: "og:title", content: "Minhas Vendas – NETINHO" },
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
  // Ciclo mensal de Brasília; histórico permanece no banco e no relatório.
  const monthKey = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(date);
    return parts.find(p => p.type === "year")?.value + "-" + parts.find(p => p.type === "month")?.value;
  };
  const thisMonth = monthKey(new Date());
  const list = (data ?? []).filter(o => o.status !== "cancelled" && monthKey(new Date(o.created_at)) === thisMonth);
  const totalPedidos = list.filter(o => o.kind !== "orcamento").reduce((sum,o) => sum + Number(o.total || 0),0);
  return (
    <div className="meus-pedidos-page mx-auto w-full max-w-4xl space-y-4 px-2 pb-28 sm:px-4">
      <h1 className="rounded-[24px] border-[3px] border-[#f3b51c] bg-gradient-to-b from-[#0755a5] to-[#061c44] px-3 py-5 text-center text-[clamp(1.5rem,6vw,2.2rem)] font-black uppercase text-[#ffcd42] shadow-lg">MINHAS VENDAS</h1>
      <Link to="/pedidos/relatorio" className="flex min-h-20 items-center justify-center gap-3 rounded-[22px] border-[3px] border-[#f2bf37] bg-white px-4 py-4 text-center text-base font-black uppercase text-[#102a52] shadow-sm hover:bg-blue-50"><ChartColumnIncreasing size={22}/> Relatório de Vendas por Cliente e Mês</Link>
      <section className="rounded-[24px] border-[3px] border-red-500 bg-gradient-to-br from-[#f91515] to-[#b90000] px-3 py-5 text-center text-white shadow-lg" aria-label="Total dos pedidos realizados"><p className="text-sm font-bold uppercase tracking-wide">Total das vendas realizadas</p><p className="mt-1 text-[clamp(2rem,8vw,3.5rem)] font-black">{brl(totalPedidos)}</p></section>
      {isLoading ? <div className="surface-card h-24 animate-pulse" /> : list.length === 0 ? (
        <p className="surface-card p-5 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
      ) : (
        <ul className="space-y-4">
          {list.map((o) => {
            const c = o.customer_snapshot as { company_name?: string; trade_name?: string };
            const st = ORDER_STATUS[o.status];
            return (
              <li key={o.id} className="meus-pedidos-card flex flex-col gap-3 rounded-[24px] border-[3px] border-[#128cde] bg-gradient-to-br from-white to-[#f0f8ff] p-4 shadow-md sm:p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(95px,auto)] items-start gap-x-2 gap-y-3 text-[#102a52] sm:gap-x-4">
                  <Link to="/pedidos/$id" params={{ id: o.id }} className="min-w-0 rounded-lg p-1 hover:bg-slate-50">
                    <p className="text-xs font-bold uppercase">Dados do pedido</p>
                    <p className="break-words font-extrabold">Nº {o.number} · {(c.trade_name || c.company_name || "Cliente").trim().split(/\s+/)[0]}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.item_count} itens · {termLabel(o.payment_term)}
                      {o.kind === "orcamento" && " · Orçamento"}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#cb0000] to-[#f40000] px-4 py-3 text-lg font-black text-[#ffe64a] shadow-md"><Coins size={20} aria-hidden="true" />{brl(Number(o.total))}</p>
                  </Link>
                  <div className="flex min-w-0 flex-col items-end gap-2 pt-1 text-right">
                    <p className="text-[10px] font-bold uppercase leading-tight">Status do pedido</p>
                    <span className={cn("rounded-xl px-3 py-2 text-[11px] font-bold", st?.tone)}>{st?.label}</span>
                  </div>
                </div>
                {isAdmin && !["cancelled", "sent", "invoiced"].includes(o.status) && <button type="button" disabled={deletingId !== null} onClick={() => void cancelOrder(o.id)} aria-label={`Excluir ${o.kind === "orcamento" ? "orçamento" : "pedido"} nº ${o.number}`} title={`Excluir ${o.kind === "orcamento" ? "orçamento" : "pedido"} nº ${o.number}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-red-300 bg-red-50 text-red-700 hover:border-red-600 hover:bg-red-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-red-400 disabled:opacity-40"><Trash2 size={19}/></button>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
