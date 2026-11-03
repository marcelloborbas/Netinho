import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/brand";
import { ArrowLeft, FileText, TrendingUp, BarChart3, ShoppingCart, Users, Coins, ClipboardList, CalendarDays, CircleCheck, Percent } from "lucide-react";

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

export function MonthlySalesReport({ embedded = false }: { embedded?: boolean } = {}) {
  const today = new Date();
  const brasil = brazilMonth(today);
  const [year, setYear] = useState(Number(brasil.slice(0, 4)));
  const [month, setMonth] = useState(Number(brasil.slice(5, 7)));
  const [selectedClient, setSelectedClient] = useState("todos");
  const [activeReport, setActiveReport] = useState<"cliente" | "mes">("cliente");
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["sales-monthly-report", year, month],
    queryFn: () => loadMonth(year, month),
  });
  const {data:commissionRate, isError:commissionError}=useQuery({queryKey:["my-sales-commission"],queryFn:async()=>{const {data:auth,error:authError}=await supabase.auth.getUser();if(authError||!auth.user)throw authError??new Error("Sem login");const {data,error}=await supabase.from("salesperson_commission_rates" as never).select("rate").eq("user_id",auth.user.id).maybeSingle();if(error)throw error;return (data as {rate:number}|null)?.rate??null;}});
  const { customers } = useMemo(() => {
    const groups = new Map<string, { name: string; total: number; orders: OrderRow[] }>();
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
    }
    return { customers: [...groups.entries()].map(([key, group]) => ({...group, key})).sort((a,b) => b.total - a.total || a.name.localeCompare(b.name)) };
  }, [data]);
  const historyMonths = useMemo(() => Array.from({length: 6}, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (5 - index), 15));
    return {year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, label: MONTHS[date.getUTCMonth()].slice(0, 3)};
  }), [year, month]);
  const {data: history = [], isLoading: historyLoading, isError: historyError} = useQuery({
    queryKey: ["my-sales-history", year, month, selectedClient],
    queryFn: async () => Promise.all(historyMonths.map(async (period) => {
      const orders = await loadMonth(period.year, period.month);
      const valid = orders.filter(o => { if (o.kind === "orcamento" || o.status === "cancelled") return false; if (selectedClient === "todos") return true; const snap = (o.customer_snapshot ?? {}) as {id?:string; document?:string; trade_name?:string; company_name?:string}; const name = (snap.trade_name || snap.company_name || "Cliente não identificado").trim(); return (snap.id || snap.document || name.toLocaleLowerCase("pt-BR")) === selectedClient; });
      return {...period, total: valid.reduce((sum, order) => sum + Number(order.total || 0), 0)};
    })),
  });
  const chartMax = Math.max(1, ...history.map(item => item.total));
  const previousTotal = history.length > 1 ? history[history.length - 2].total : 0;
  const currentTotal = history.length ? history[history.length - 1].total : 0;
  const growth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;

  const visibleCustomers = selectedClient === "todos" ? customers : customers.filter(c => c.key === selectedClient);
  const visibleTotal = visibleCustomers.reduce((sum, c) => sum + c.total, 0);
  const visibleCount = visibleCustomers.reduce((sum, c) => sum + c.orders.length, 0);
  const years = Array.from({ length: 8 }, (_, i) => Number(brasil.slice(0,4)) - i);
  if (!years.includes(year)) years.unshift(year);
  return <main className="w-full min-w-0 space-y-2 bg-gradient-to-b from-[#f0f7ff] to-white px-1 pt-0 pb-5 text-[#092454] sm:px-3 lg:px-5">
    {!embedded && <Link to="/pedidos" className="inline-flex min-h-11 items-center gap-2 font-bold text-[#102a52]"><ArrowLeft size={19}/> Minhas Vendas</Link>}
    <header className="w-full overflow-hidden rounded-b-[16px] bg-[#073c82]">
      <img src="/images/vendas-cabeçalho.webp" alt="Netinho Auto Parts — Minhas Vendas. LIA apresenta o relatório e a evolução das vendas." className="block h-auto max-h-[19dvh] w-full object-contain object-top sm:max-h-[23dvh]" decoding="async" />
    </header>
    <section className="grid grid-cols-2 gap-2 rounded-[16px] border border-[#c4d6ee] bg-white p-2 shadow-sm sm:grid-cols-3">
      <label className="text-base font-black text-[#102a52]"><span className="flex items-center gap-2"><CalendarDays size={20}/> Mês</span>
        <select aria-label="Selecionar mês" value={month} onChange={e => { setMonth(Number(e.target.value)); setSelectedClient("todos"); }} className="mt-1 min-h-9 w-full rounded-xl border-2 border-[#79a9d9] bg-white px-3 text-base font-bold text-[#102a52] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffcb28]">
          {MONTHS.map((name, i) => <option key={name} value={i+1}>{name}</option>)}
        </select>
      </label>
      <label className="text-base font-black text-[#102a52]"><span className="flex items-center gap-2"><CalendarDays size={20}/> Ano</span>
        <select aria-label="Selecionar ano" value={year} onChange={e => { setYear(Number(e.target.value)); setSelectedClient("todos"); }} className="mt-1 min-h-9 w-full rounded-lg border border-blue-300 bg-white px-2 text-base">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <label className="col-span-2 text-sm font-extrabold text-[#102a52] sm:col-span-1" htmlFor="cliente-relatorio"><span className="flex items-center gap-2"><Users size={20}/> Cliente</span>
        <select id="cliente-relatorio" value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="mt-1 min-h-9 w-full rounded-xl border-2 border-[#79a9d9] bg-white px-3 text-base font-bold text-[#102a52] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffcb28]">
          <option value="todos">Todos os clientes ({customers.length})</option>
          {customers.map(customer => <option key={customer.key} value={customer.key}>{customer.name}</option>)}
        </select>
      </label>
    </section>
    <div className="grid grid-cols-2 gap-1.5" id="indicadores-vendas">
      <section className="flex min-w-0 flex-col items-center justify-center rounded-xl border-2 border-[#ffd44a] bg-gradient-to-b from-[#ff351a] via-[#e00000] to-[#a90000] px-1.5 py-2 text-center text-white shadow-[0_4px_15px_#a9000044]" aria-live="polite">
        <p className="text-[10px] font-extrabold uppercase leading-tight sm:text-sm">Vendas do Período</p>
        <p className="mt-1 break-all text-[clamp(1rem,4.7vw,2rem)] font-black leading-tight tabular-nums text-[#ffe346]">{isLoading ? "Carregando..." : isError ? "—" : brl(visibleTotal)}</p>
      </section>
      <section className="flex min-w-0 flex-col items-center justify-center rounded-xl border-2 border-[#ffd44a] bg-gradient-to-b from-[#1264b3] via-[#0a3c7c] to-[#062450] px-1.5 py-2 text-center text-white shadow-[0_4px_15px_#092b5a44]" aria-live="polite">
        <p className="text-[10px] font-extrabold uppercase leading-tight sm:text-sm">Comissão Estimada do Período</p>
        <p className="mt-1 break-all text-[clamp(1rem,4.7vw,2rem)] font-black leading-tight tabular-nums text-[#ffe346]">{commissionRate == null || commissionError || isLoading || isError ? "—" : brl(Math.round(visibleTotal * Number(commissionRate)) / 100)}</p>
      </section>
    </div>
    <section id="evolucao-vendas" aria-label="Evolução das vendas pessoais" className="overflow-hidden rounded-[26px] border-[3px] border-[#ffce2c] bg-gradient-to-b from-[#0a5aab] via-[#06316d] to-[#021844] p-3 shadow-[0_4px_0_#a96e00,0_5px_20px_#002a6c88] text-white">
      <div className="flex items-center gap-2">
        <BarChart3 className="shrink-0 text-[#ffd42a]" size={30}/>
        <div><h2 className="text-lg font-black uppercase leading-tight">Evolução das Vendas</h2><p className="text-xs text-[#d7e8ff]">Seu desempenho nos últimos seis meses</p></div>
      </div>
      {historyError ? <p role="alert" className="mt-4 text-sm">Não foi possível consultar o histórico de vendas.</p> :
      historyLoading ? <p role="status" className="mt-4 text-sm">Carregando evolução...</p> :
      <div className="mt-2 grid h-[min(20dvh,165px)] grid-cols-6 gap-1.5 border-b border-[#8bcaff] pb-1 sm:h-60 sm:gap-3">
        {history.map((item, index) => <div key={`${item.year}-${item.month}`} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
          <span className="max-w-full truncate text-[10px] font-extrabold tabular-nums sm:text-xs" title={brl(item.total)}>{item.total >= 1000 ? `R$ ${(item.total/1000).toLocaleString("pt-BR",{maximumFractionDigits:1})}k` : `R$ ${Math.round(item.total)}`}</span>
          <div className={`w-full max-w-16 rounded-t-md border border-white/40 shadow-[0_0_10px_#28baff77] ${index === history.length-1 ? "bg-gradient-to-t from-[#d48a00] to-[#ffed25]" : index % 2 ? "bg-gradient-to-t from-[#dc7500] to-[#ffae20]" : "bg-gradient-to-t from-[#065ac0] to-[#1cc7ff]"}`} style={{height: `${Math.max(item.total > 0 ? 7 : 2, (item.total/chartMax)*100)}%`}} title={`${MONTHS[item.month-1]} de ${item.year}: ${brl(item.total)}`}/>
          <span className="text-[10px] font-bold sm:text-xs">{item.label}</span>
        </div>)}
      </div>}
      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border-2 border-[#ffda34] bg-[#041a42]/70 p-2">
        <span className="text-sm font-black uppercase sm:text-lg">Desempenho</span>
        <span className={`text-xl font-black tabular-nums ${growth == null ? "text-white" : growth >= 0 ? "text-[#6eff6e]" : "text-[#ffb3b3]"}`}>{historyLoading || historyError || growth == null ? "—" : `${growth > 0 ? "+" : ""}${growth.toLocaleString("pt-BR",{maximumFractionDigits:1})}%`}</span>
        <span className="max-w-24 text-right text-[10px] leading-tight text-[#dceaff]">Em relação ao mês anterior</span>
      </div>
      <p className="sr-only">Histórico pessoal dos pedidos, excluindo orçamentos e cancelamentos. Valores sujeitos a atualização.</p>
    </section>

    <nav aria-label="Consultas do relatório" className="grid grid-cols-2 gap-2">
      <button type="button" aria-pressed={activeReport === "cliente"} aria-controls="detalhamento-vendas" onClick={() => setActiveReport("cliente")} className={activeReport === "cliente" ? "flex min-h-11 items-center justify-center gap-1 rounded-xl border-2 border-[#e9b323] bg-[#073b83] px-2 text-center text-xs font-black text-[#ffdf48] shadow-md sm:text-sm" : "flex min-h-11 items-center justify-center gap-1 rounded-xl border-2 border-[#e9b323] bg-[#073b83] px-2 text-center text-xs font-black text-white shadow-md sm:text-sm"}><Users size={19}/> Vendas por Cliente</button>
      <button type="button" aria-pressed={activeReport === "mes"} aria-controls="detalhamento-vendas" onClick={() => setActiveReport("mes")} className={activeReport === "mes" ? "flex min-h-11 items-center justify-center gap-1 rounded-xl border-2 border-[#e9b323] bg-[#073b83] px-2 text-center text-xs font-black text-[#ffdf48] shadow-md sm:text-sm" : "flex min-h-11 items-center justify-center gap-1 rounded-xl border-2 border-[#e9b323] bg-[#073b83] px-2 text-center text-xs font-black text-white shadow-md sm:text-sm"}><CalendarDays size={19}/> Vendas por Mês</button>
    </nav>
    <section id="detalhamento-vendas" aria-live="polite" className="min-w-0 overflow-hidden rounded-xl border-2 border-[#d7b14d] bg-white shadow-sm">
      {activeReport === "cliente" ? (
        <>
          <h3 className="bg-[#092b61] px-3 py-2 text-base font-black text-white">Vendas por Cliente — {MONTHS[month - 1]} de {year}</h3>
          {isLoading ? <p className="p-3">Carregando vendas por cliente...</p> : isError ? <p className="p-3 text-red-700">Não foi possível consultar as vendas por cliente.</p> : visibleCustomers.length === 0 ? <p className="p-3">Nenhuma venda encontrada para os filtros selecionados.</p> : (
            <ul className="divide-y divide-[#d5e2f4]">
              {visibleCustomers.map(customer => (
                <li key={customer.key} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-extrabold text-[#092b61]">{customer.name}</p>
                      <p className="text-xs text-[#39577a]">{customer.orders.length} pedido(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black tabular-nums text-[#a51515]">{brl(customer.total)}</p>
                      {commissionRate != null && !commissionError && <p className="text-xs font-semibold text-[#174e9b]">Comissão estimada: {brl(Math.round(customer.total * Number(commissionRate)) / 100)}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customer.orders.map(order => <Link key={order.id} to="/pedidos/$id" params={{ id: order.id }} className="rounded-lg border border-[#b9cfea] bg-[#f0f6ff] px-2 py-1 text-xs font-bold text-[#123b74] hover:bg-[#daeaff]">Pedido nº {order.number} · {brl(Number(order.total || 0))}</Link>)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <h3 className="bg-[#092b61] px-3 py-2 text-base font-black text-white">Vendas por Mês — últimos seis meses</h3>
          {historyLoading ? <p className="p-3">Carregando vendas mensais...</p> : historyError ? <p className="p-3 text-red-700">Não foi possível consultar as vendas mensais.</p> : (
            <ul className="divide-y divide-[#d5e2f4]">
              {history.map(period => (
                <li key={period.year + "-" + period.month} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="font-bold text-[#123b74]">{MONTHS[period.month - 1]} de {period.year}</span>
                  <strong className="shrink-0 tabular-nums text-[#a51515]">{brl(period.total)}</strong>
                </li>
              ))}
            </ul>
          )}
          <p className="px-3 py-2 text-xs text-[#39577a]">Valores conforme o cliente selecionado e o mês/ano de referência.</p>
        </>
      )}
    </section>
    <section className="hidden">
      <h2 className="flex items-center gap-2 bg-gradient-to-b from-[#0e519a] to-[#06204d] px-4 py-3 text-lg font-black uppercase text-white"><BarChart3 size={22} className="text-[#ffdb38]"/> Resumo do período</h2>
      <div className="grid grid-cols-1 gap-1.5 p-3 text-[#102a52]">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-white to-[#d5eaff] px-4 py-2"><ShoppingCart className="shrink-0 text-[#0753a3]" size={22}/><p className="flex-1 text-sm font-bold">Total de pedidos</p><strong className="text-xl tabular-nums">{visibleCount}</strong></div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-white to-[#d5eaff] px-4 py-2"><Users className="shrink-0 text-[#0753a3]" size={22}/><p className="flex-1 text-sm font-bold">Total de clientes</p><strong className="text-xl tabular-nums">{visibleCustomers.length}</strong></div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-white to-[#d5eaff] px-4 py-2"><BarChart3 className="shrink-0 text-[#0753a3]" size={22}/><p className="flex-1 text-sm font-bold">Valor total das vendas</p><strong className="text-base font-black tabular-nums">{brl(visibleTotal)}</strong></div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-white to-[#d5eaff] px-4 py-2"><Coins className="shrink-0 text-[#0753a3]" size={22}/><p className="flex-1 text-sm font-bold">Comissão estimada</p><strong className="text-base font-black tabular-nums">{commissionRate == null || commissionError ? "—" : brl(Math.round(visibleTotal*Number(commissionRate))/100)}</strong></div>
      </div>
    </section>
    {isError && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">Não foi possível carregar os pedidos. <button type="button" onClick={() => void refetch()} className="font-bold underline">Tentar novamente</button></div>}
    {!isLoading && !isError && customers.length === 0 && <p className="rounded-xl border bg-white p-5 text-center">Nenhuma venda encontrada neste mês.</p>}
  </main>;
}
