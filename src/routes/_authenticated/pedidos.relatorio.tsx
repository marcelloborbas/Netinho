import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/brand";
import { ArrowLeft, FileText } from "lucide-react";

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
  const visibleCustomers = selectedClient === "todos" ? customers : customers.filter(c => c.name === selectedClient);
  const visibleTotal = visibleCustomers.reduce((sum, c) => sum + c.total, 0);
  const visibleCount = visibleCustomers.reduce((sum, c) => sum + c.orders.length, 0);
  const years = Array.from({ length: 8 }, (_, i) => Number(brasil.slice(0,4)) - i);
  if (!years.includes(year)) years.unshift(year);
  return <main className="mx-auto w-full max-w-4xl space-y-4 px-3 pb-24 sm:px-5">
    <Link to="/pedidos" className="inline-flex min-h-11 items-center gap-2 font-bold text-[#102a52]"><ArrowLeft size={19}/> Minhas Vendas</Link>
    <h1 className="rounded-2xl border-2 border-[#d4af37] bg-[#102a52] px-4 py-4 text-center text-2xl font-black uppercase text-white">Relatório de Vendas</h1>
    <section className="grid grid-cols-2 gap-3 rounded-xl border border-blue-200 bg-white p-4">
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
    <section className="rounded-xl border border-blue-200 bg-white p-4">
      <label className="block text-sm font-extrabold text-[#102a52]" htmlFor="cliente-relatorio">Cliente</label>
      <select id="cliente-relatorio" value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-blue-300 bg-white px-3 text-base font-semibold text-[#102a52]">
        <option value="todos">Todos os clientes ({customers.length})</option>
        {customers.map((customer, i) => <option key={i} value={customer.name}>{customer.name}</option>)}
      </select>
      <p className="mt-2 text-xs text-slate-600">Selecione um cliente para ver somente os pedidos e o total dele no mês escolhido.</p>
    </section>
    <section className="rounded-2xl bg-red-700 px-4 py-5 text-center text-white" aria-live="polite">
      <p className="text-sm font-extrabold uppercase">Total de vendas · {MONTHS[month-1]} de {year}</p>
      <p className="mt-1 text-3xl font-black">{isLoading ? "Carregando..." : brl(visibleTotal)}</p>
      <p className="mt-2 text-sm font-semibold">{visibleCount} pedidos · {visibleCustomers.length} clientes</p>
    </section>
    <section className="rounded-xl border-2 border-[#d4af37] bg-white p-4 text-[#102a52]">
      <p className="font-black uppercase">Sua comissão estimada</p>
      <p className="mt-1 text-sm font-semibold">Taxa cadastrada: {commissionError ? "Indisponível" : commissionRate == null ? "Não definida pela Administração" : `${Number(commissionRate).toLocaleString("pt-BR")}%`}</p>
      <p className="mt-2 text-2xl font-black">{commissionRate == null || commissionError || isLoading ? "—" : brl(Math.round(visibleTotal * Number(commissionRate)) / 100)}</p>
      <p className="mt-1 text-xs text-slate-600">Estimativa sobre os pedidos do período selecionado; não representa comissão paga. Confirme a regra de apuração e o faturamento com a Administração.</p>
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
        {customer.orders.map(order => <Link key={order.id} to="/pedidos/$id" params={{ id: order.id }} className="flex min-h-12 items-center justify-between gap-2 py-2 text-sm hover:underline">
          <span className="flex items-center gap-2"><FileText size={16}/> Nº {order.number} · {formatDate(order.created_at)}</span>
          <strong>{brl(Number(order.total || 0))}</strong>
        </Link>)}
      </div>
    </section>)}
    <p className="text-xs text-slate-600">Relatório dos pedidos realizados por sua conta. Exclui orçamentos e pedidos cancelados; inclui pedidos ainda não faturados.</p>
  </main>;
}
