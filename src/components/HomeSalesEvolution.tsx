import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/brand";

const monthKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(date);
  return `${parts.find(p => p.type === "year")?.value}-${parts.find(p => p.type === "month")?.value}`;
};
const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

async function loadSalesEvolution() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw authError ?? new Error("Faça login para consultar suas vendas.");
  const current = monthKey(new Date());
  const [year = new Date().getUTCFullYear(), month = new Date().getUTCMonth() + 1] = current.split("-").map(Number);
  const periods = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 - (5 - i), 15));
    return { key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`, label: months[date.getUTCMonth()] };
  });
  const first = new Date(Date.UTC(year, month - 6, 1) - 86400000).toISOString();
  const totals = new Map(periods.map(period => [period.key, 0]));
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from("orders")
      .select("created_at,total,kind,status")
      .eq("seller_id", auth.user.id)
      .gte("created_at", first)
      .order("created_at", { ascending: true })
      .range(from, from + 499);
    if (error) throw error;
    for (const order of data ?? []) {
      if (order.kind === "orcamento" || order.status === "cancelled") continue;
      const key = monthKey(new Date(order.created_at));
      if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + Number(order.total || 0));
    }
    if (!data || data.length < 500) break;
  }
  return periods.map(period => ({ ...period, total: totals.get(period.key) ?? 0 }));
}

export function HomeSalesEvolution() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["home-sales-evolution"],
    queryFn: loadSalesEvolution,
    staleTime: 120_000,
  });
  const history = data ?? [];
  const chartMax = Math.max(1, ...history.map(item => item.total));
  const previousTotal = history.length > 1 ? history[history.length - 2]?.total ?? 0 : 0;
  const currentTotal = history[history.length - 1]?.total ?? 0;
  const growth = previousTotal > 0 ? (currentTotal - previousTotal) / previousTotal * 100 : null;
  return <section className="mx-3 mb-3 !min-h-0 !h-auto overflow-hidden rounded-[26px] border-[3px] border-[#ffce2c] bg-gradient-to-b from-[#0a5aab] via-[#06316d] to-[#021844] p-3 text-white shadow-[0_4px_0_#a96e00,0_5px_20px_#002a6c88] sm:mx-6" aria-label="Evolução das vendas pessoais">
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8 shrink-0 text-[#ffd42a]" aria-hidden="true"><path d="M3 3v18h18M7 16v-4M12 16V7M17 16V5"/></svg>
      <div><h2 className="text-lg font-black uppercase leading-tight">Evolução das Vendas</h2><p className="text-xs text-[#d7e8ff]">Seu desempenho nos últimos seis meses</p></div>
    </div>
    {isError ? <p role="alert" className="mt-4 text-sm">Não foi possível consultar o histórico de vendas.</p> :
      isLoading ? <p role="status" className="mt-4 text-sm">Carregando evolução...</p> :
      <div className="mt-2 grid h-[165px] grid-cols-6 gap-1.5 border-b border-[#8bcaff] pb-1 sm:h-60 sm:gap-3" role="img" aria-label={`Vendas dos últimos seis meses: ${history.map(item => `${item.label}: ${brl(item.total)}`).join("; ")}`}>
        {history.map((item, index) => <div key={item.key} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
          <span className="max-w-full truncate text-[10px] font-extrabold tabular-nums sm:text-xs" title={brl(item.total)}>{item.total >= 1000 ? `R$ ${(item.total / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k` : `R$ ${Math.round(item.total)}`}</span>
          <div className={`w-full max-w-16 rounded-t-md border border-white/40 shadow-[0_0_10px_#28baff77] ${index === history.length - 1 ? "bg-gradient-to-t from-[#d48a00] to-[#ffed25]" : index % 2 ? "bg-gradient-to-t from-[#dc7500] to-[#ffae20]" : "bg-gradient-to-t from-[#065ac0] to-[#1cc7ff]"}`} style={{ height: `${Math.max(item.total > 0 ? 7 : 2, item.total / chartMax * 100)}%` }} title={brl(item.total)} />
          <span className="text-[10px] font-bold sm:text-xs">{item.label}</span>
        </div>)}
      </div>}
    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border-2 border-[#ffda34] bg-[#041a42]/70 p-2">
      <span className="text-sm font-black uppercase sm:text-lg">Desempenho</span>
      <span className={`text-xl font-black tabular-nums ${growth == null ? "text-white" : growth >= 0 ? "text-[#6eff6e]" : "text-[#ffb3b3]"}`}>{isLoading || isError || growth == null ? "—" : `${growth > 0 ? "+" : ""}${growth.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}</span>
      <span className="max-w-24 text-right text-[10px] leading-tight text-[#dceaff]">Em relação ao mês anterior</span>
    </div>
  </section>;
}
