import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/brand";
import { ArrowLeft, FileText, TrendingUp, BarChart3, ShoppingCart, Users, Coins, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pedidos/relatorio")({
  head: () => ({ meta: [{ title: "Relatório mensal de vendas | Netinho Auto Parts" }] }),
  component: MonthlySalesReport,
});

type OrderRow = {
  id: string;
  seller_id: string;
  number: number | string;
  created_at: string;
  total: number | null;
  kind: string | null;
  status: string;
  customer_snapshot: unknown;
};

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const formatDate = (value: string) => new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const brazilMonth = (date: Date) => { const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(date); return `${parts.find(p => p.type === "year")?.value}-${parts.find(p => p.type === "month")?.value}`; };

async function loadMonth(year: number, month: number): Promise<OrderRow[]> {
  // A consulta permanece sob as políticas de acesso (RLS) já aplicadas aos pedidos.
  // Margem de 1 dia em UTC para contemplar a virada do mês no horário de Brasília.
  const start = new Date(Date.UTC(year, month - 1, 1) - 86400000).toISOString();
  const end = new Date(Date.UTC(year, month, 1) + 86400000).toISOString();
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user) throw authError ?? new Error("Faça login para consultar suas vendas.");
  const rows: OrderRow[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from("orders")
      .select("id,seller_id,number,created_at,total,kind,status,customer_snapshot")
      .eq("seller_id",auth.user.id)
      .gte("created_at", start).lt("created_at", end)
      .order("created_at", { ascending: false }).range(from, from + 499);
    if (error) throw error;
    rows.push(...(data ?? []) as OrderRow[]);
    if (!data || data.length < 500) break;
  }
  return rows.filter(o => {
    const localMonth = brazilMonth(new Date(o.created_at));
    return localMonth === `${year}-${String(month).padStart(2, "0")}`;
  });
}

function MonthlySalesReport() {
  const today = new Date();
  const brasil = brazilMonth(today);
  const [year, setYear] = useState(Number(brasil.slice(0, 4)));
  const [month, setMonth] = useState(Number(brasil.slice(5, 7)));
  const [selectedClient, setSelectedClient] = useState("todos");
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["sales-monthly-report", year, month],
    queryFn: () => loadMonth(year, month),
  });
  const {data:commissionRate, isError:commissionError}=useQuery({queryKey:["my-sales-commission"],queryFn:async()=>{const {data:auth,error:authError}=await supabase.auth.getUser();if(authError||!auth.user)throw authError??new Error("Sem login");const {data,error}=await supabase.from("salesperson_commission_rates" as never).select("rate").eq("user_id",auth.user.id).maybeSingle();if(error)throw error;return (data as {rate:number}|null)?.rate??null;}});
  const { customers, total, count } = useMemo(() => {
    const groups = new Map<string, { name: string; total: number; orders: OrderRow[] }>();
    let total = 0;
    let count = 0;
    for (const order of data) {
      if (order.kind === "orcamento" || order.status === "cancelled") continue;
      const snapshot = (order.customer_snapshot ?? {}) as { id?: string; company_name?: string; trade_name?: string; document?: string };
      const name = (snapshot.trade_name || snapshot.company_name || "Cliente não identificado").trim();
      const key = snapshot.id || snapshot.document || name.toLocaleLowerCase("pt-BR");
      const group = groups.get(key) ?? { name, total: 0, orders: [] };
      const value = Number(order.total || 0);
      group.total += value;
      group.orders.push(order);
      groups.set(key, group);
      total += value;
      count++;
    }
    return { customers: [...groups.values()].sort((a,b) => b.total - a.total || a.name.localeCompare(b.name)), total, count };
  }, [data]);
  const historyMonths = useMemo(() => Array.from({length: 6}, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (5 - index), 15));
    return {year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, label: MONTHS[date.getUTCMonth()].slice(0, 3)};
  }), [year, month]);
  const {data: history = [], isLoading: historyLoading, isError: historyError} = useQuery({
    queryKey: ["my-sales-history", year, month],
    queryFn: async () => Promise.all(historyMonths.map(async (period) => {
      const orders = await loadMonth(period.year, period.month);
      const valid = orders.filter(o => o.kind !== "orcamento" && o.status !== "cancelled");
      return {...period, total: valid.reduce((sum, order) => sum + Number(order.total || 0), 0)};
    })),
  });
  const chartMax = Math.max(1, ...history.map(item => item.total));
  const previousTotal = history.length > 1 ? history[history.length - 2].total : 0;
  const currentTotal = history.length ? history[history.length - 1].total : 0;
  const growth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;
  const recentOrders = useMemo(() => data.filter(order => order.kind !== "orcamento" && order.status !== "cancelled")
    .filter(order => selectedClient === "todos" || ((order.customer_snapshot ?? {}) as {trade_name?: string; company_name?: string}).trade_name === selectedClient || ((order.customer_snapshot ?? {}) as {company_name?: string}).company_name === selectedClient)
    .slice(0, 4), [data, selectedClient]);
  const visibleCustomers = selectedClient === "todos" ? customers : customers.filter(c => c.name === selectedClient);
  const visibleTotal = visibleCustomers.reduce((sum, c) => sum + c.total, 0);
  const visibleCount = visibleCustomers.reduce((sum, c) => sum + c.orders.length, 0);
  const years = Array.from({ length: 8 }, (_, i) => Number(brasil.slice(0,4)) - i);
  if (!years.includes(year)) years.unshift(year);
  return <main className="mx-auto w-full max-w-4xl space-y-4 px-3 pb-24 sm:px-5">
    <Link to="/pedidos" className="inline-flex min-h-11 items-center gap-2 font-bold text-[#102a52]"><ArrowLeft size={19}/> Minhas Vendas</Link>
    <header className="rounded-[28px] border-[3px] border-[#ffd44a] bg-gradient-to-b from-[#104e96] via-[#082d67] to-[#061a3d] px-3 py-5 text-center text-white shadow-[0_0_18px_#f7b51b77]">
      <h1 className="flex items-center justify-center gap-2 text-2xl font-black uppercase tracking-tight sm:text-3xl"><TrendingUp className="shrink-0 text-[#ffda35]" size={30}/> Minhas <span className="text-[#ffd43a]">Vendas</span></h1>
      <p className="mt-1 text-xs font-semibold text-[#e5f2ff]">Acompanhe seus pedidos, valores e comissões.</p>
    </header>
    <section className="grid grid-cols-2 gap-3 rounded-2xl border-2 border-[#d4af37] bg-white p-4 shadow-[0_4px_15px_#092b5a20]">
      <label className="text-sm font-bold text-[#102a52]">Mês
        <select aria-label="Selecionar mês" value={month} onChange={e => setMonth(Number(e.target.value))} className="mt-1 min-h-12 w-full rounded-lg border border-blue-300 bg-white px-2 text-base">
          {MONTHS.map((name, i) => <option key={name} value={i+1}>{name}</option>)}
        </select>
      </label>
      <label className="text-sm font-bold text-[#102a52]">Ano
        <select aria-label="Selecionar ano" value={year} onChange={e => setYear(Number(e.target.value))} className="mt-1 min-h-12 w-full rounded-lg border border-blue-300 bg-white px-2 text-base">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
    </section>
    <section className="rounded-2xl border-2 border-[#d4af37] bg-white p-4 shadow-sm">
      <label className="block text-sm font-extrabold text-[#102a52]" htmlFor="cliente-relatorio">Cliente</label>
      <select id="cliente-relatorio" value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-blue-300 bg-white px-3 text-base font-semibold text-[#102a52]">
        <option value="todos">Todos os clientes ({customers.length})</option>
        {customers.map((customer, i) => <option key={i} value={customer.name}>{customer.name}</option>)}
      </select>
      <p className="mt-2 text-xs text-slate-600">Selecione um cliente para ver somente os pedidos e o total dele no mês escolhido.</p>
    </section>
    <section aria-label="Evolução das vendas pessoais" className="overflow-hidden rounded-[24px] border-[3px] border-[#ffd44a] bg-gradient-to-b from-[#0c4b91] via-[#082f6d] to-[#061c46] p-4 text-white shadow-[0_5px_20px_#0a438244]">
      <div className="flex items-center gap-2">
        <BarChart3 className="shrink-0 text-[#ffd42a]" size={30}/>
        <div><h2 className="text-lg font-black uppercase leading-tight">Evolução das Vendas</h2><p className="text-xs text-[#d7e8ff]">Seu desempenho nos últimos seis meses</p></div>
      </div>
      {historyError ? <p role="alert" className="mt-4 text-sm">Não foi possível consultar o histórico de vendas.</p> :
      historyLoading ? <p role="status" className="mt-4 text-sm">Carregando evolução...</p> :
      <div className="mt-5 grid h-44 grid-cols-6 items-end gap-1.5 border-b border-[#8bcaff] pb-1 sm:h-56 sm:gap-3">
        {history.map((item, index) => <div key={`${item.year}-${item.month}`} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
          <span className="max-w-full truncate text-[9px] font-extrabold tabular-nums sm:text-xs" title={brl(item.total)}>{item.total >= 1000 ? `R$ ${(item.total/1000).toLocaleString("pt-BR",{maximumFractionDigits:1})}k` : `R$ ${Math.round(item.total)}`}</span>
          <div className={`w-full max-w-16 rounded-t-md border border-white/40 shadow-[0_0_10px_#28baff77] ${index === history.length-1 ? "bg-gradient-to-t from-[#d48a00] to-[#ffed25]" : index % 2 ? "bg-gradient-to-t from-[#dc7500] to-[#ffae20]" : "bg-gradient-to-t from-[#065ac0] to-[#1cc7ff]"}`} style={{height: `${Math.max(item.total > 0 ? 7 : 2, (item.total/chartMax)*100)}%`}} title={`${MONTHS[item.month-1]} de ${item.year}: ${brl(item.total)}`}/>
          <span className="text-[10px] font-bold sm:text-xs">{item.label}</span>
        </div>)}
      </div>}
      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-[#6ac3ff] bg-[#041a42]/70 p-3">
        <span className="text-xs font-black uppercase sm:text-sm">Desempenho mensal</span>
        <span className={`text-xl font-black tabular-nums ${growth == null ? "text-white" : growth >= 0 ? "text-[#6eff6e]" : "text-[#ffb3b3]"}`}>{growth == null ? "—" : `${growth > 0 ? "+" : ""}${growth.toLocaleString("pt-BR",{maximumFractionDigits:1})}%`}</span>
        <span className="max-w-24 text-right text-[10px] leading-tight text-[#dceaff]">Em relação ao mês anterior</span>
      </div>
      <p className="mt-2 text-[10px] text-[#c5dcfa]">Histórico pessoal dos pedidos, excluindo orçamentos e cancelamentos. Valores sujeitos a atualização.</p>
    </section>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <section className="rounded-2xl border-2 border-[#ffd44a] bg-gradient-to-b from-[#ef1313] to-[#a90000] px-4 py-5 text-center text-white shadow-[0_4px_15px_#a9000044]" aria-live="polite">
      <p className="text-sm font-extrabold uppercase">Total de vendas · {MONTHS[month-1]} de {year}</p>
      <p className="mt-1 text-3xl font-black">{isLoading ? "Carregando..." : brl(visibleTotal)}</p>
      <p className="mt-2 text-sm font-semibold">{visibleCount} pedidos · {visibleCustomers.length} clientes</p>
    </section>
    <section className="rounded-2xl border-2 border-[#d4af37] bg-gradient-to-b from-[#0d4d93] to-[#062450] p-4 text-white shadow-[0_4px_15px_#092b5a44]">
      <p className="font-black uppercase">Sua comissão estimada</p>
      <p className="mt-1 text-sm font-semibold">Taxa cadastrada: {commissionError ? "Indisponível" : commissionRate == null ? "Não definida pela Administração" : `${Number(commissionRate).toLocaleString("pt-BR")}%`}</p>
      <p className="mt-2 text-2xl font-black">{commissionRate == null || commissionError || isLoading ? "—" : brl(Math.round(visibleTotal * Number(commissionRate)) / 100)}</p>
      <p className="mt-1 text-xs text-[#d8e9ff]">Estimativa sobre os pedidos do período selecionado; não representa comissão paga. Confirme a regra de apuração e o faturamento com a Administração.</p>
    </section>
    </div>
    <section className="overflow-hidden rounded-2xl border-2 border-[#d4af37] bg-white shadow-sm">
      <h2 className="flex items-center gap-2 bg-[#082f68] px-4 py-3 text-lg font-black uppercase text-white"><ClipboardList size={22} className="text-[#ffdb38]"/> Últimos pedidos</h2>
      {recentOrders.length === 0 ? <p className="p-4 text-sm text-[#102a52]">Nenhum pedido no período selecionado.</p> : <div className="divide-y divide-[#d8e6f7]">
        {recentOrders.map(order => <Link key={order.id} to="/pedidos/$id" params={{id:order.id}} className="flex min-h-16 items-center justify-between gap-2 px-4 py-3 text-[#102a52] hover:bg-[#edf6ff]">
          <div className="min-w-0"><p className="text-sm font-black">Pedido Nº {order.number}</p><p className="truncate text-xs">{((order.customer_snapshot ?? {}) as {trade_name?: string; company_name?: string}).trade_name || ((order.customer_snapshot ?? {}) as {company_name?: string}).company_name || "Cliente não identificado"}</p><p className="text-[11px] text-[#536c86]">{formatDate(order.created_at)} · {order.status}</p></div>
          <strong className="shrink-0 rounded-lg bg-gradient-to-b from-[#ffe34b] to-[#e9a800] px-2 py-2 text-xs text-[#102a52] sm:text-sm">{brl(Number(order.total || 0))}</strong>
        </Link>)}
      </div>}
    </section>
    <section className="overflow-hidden rounded-2xl border-2 border-[#d4af37] bg-white shadow-sm">
      <h2 className="flex items-center gap-2 bg-[#082f68] px-4 py-3 text-lg font-black uppercase text-white"><BarChart3 size={22} className="text-[#ffdb38]"/> Resumo do período</h2>
      <div className="grid grid-cols-2 gap-2 p-3 text-center text-[#102a52]">
        <div className="rounded-xl bg-[#e7f2ff] p-3"><ShoppingCart className="mx-auto text-[#0753a3]" size={22}/><p className="text-xs font-bold">Pedidos</p><strong className="text-xl">{visibleCount}</strong></div>
        <div className="rounded-xl bg-[#e7f2ff] p-3"><Users className="mx-auto text-[#0753a3]" size={22}/><p className="text-xs font-bold">Clientes</p><strong className="text-xl">{visibleCustomers.length}</strong></div>
        <div className="rounded-xl bg-[#e7f2ff] p-3"><BarChart3 className="mx-auto text-[#0753a3]" size={22}/><p className="text-xs font-bold">Vendas</p><strong className="text-sm">{brl(visibleTotal)}</strong></div>
        <div className="rounded-xl bg-[#e7f2ff] p-3"><Coins className="mx-auto text-[#0753a3]" size={22}/><p className="text-xs font-bold">Comissão estimada</p><strong className="text-sm">{commissionRate == null || commissionError ? "—" : brl(Math.round(visibleTotal*Number(commissionRate))/100)}</strong></div>
      </div>
    </section>
    {isError && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">Não foi possível carregar os pedidos. <button type="button" onClick={() => void refetch()} className="font-bold underline">Tentar novamente</button></div>}
    {!isLoading && !isError && customers.length === 0 && <p className="rounded-xl border bg-white p-5 text-center">Nenhuma venda encontrada neste mês.</p>}
    {visibleCustomers.map((customer, index) => <section key={`${customer.name}-${index}`} className="rounded-xl border-2 border-[#102a52] bg-white p-4 text-[#102a52]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 break-words text-lg font-black">{customer.name}</h2>
        <strong className="rounded-lg bg-[#102a52] px-3 py-2 text-white">{brl(customer.total)}</strong>
      </div>
      <p className="mb-3 mt-1 text-sm font-semibold">{customer.orders.length} pedido(s)</p>
      <div className="divide-y divide-slate-200">
        {customer.orders.map(order => <div key={order.id} className="py-3">
          <Link to="/pedidos/$id" params={{ id: order.id }} className="flex min-h-11 items-center justify-between gap-2 text-sm hover:underline">
            <span className="flex items-center gap-2"><FileText size={16}/> Nº {order.number} · {formatDate(order.created_at)}</span>
            <strong>{brl(Number(order.total || 0))}</strong>
          </Link>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#b91c1c] px-4 py-3 text-white shadow-sm" aria-label={`Comissão estimada do pedido ${order.number}`}>
            <div>
              <p className="text-xs font-black uppercase tracking-wide">Sua comissão nesta venda</p>
              <p className="mt-0.5 text-xs font-medium text-red-100">{commissionError ? "Não foi possível consultar a taxa" : commissionRate == null ? "Aguardando definição pela Administração" : `Estimativa · ${Number(commissionRate).toLocaleString("pt-BR")}%`}</p>
            </div>
            <strong className="text-xl font-black tabular-nums">{commissionRate == null || commissionError ? "—" : brl(Math.round(Number(order.total || 0) * Number(commissionRate)) / 100)}</strong>
          </div>
        </div>)}
      </div>
    </section>)}
    <p className="text-xs text-slate-600">Relatório dos pedidos realizados por sua conta. Exclui orçamentos e pedidos cancelados; inclui pedidos ainda não faturados.</p>
  </main>;
}
