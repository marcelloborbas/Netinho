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
  const [year, month] = current.split("-").map(Number);
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
  const max = Math.max(1, ...(data ?? []).map(item => item.total));
  const total = data?.[data.length - 1]?.total ?? 0;
  return <section className="mx-3 mb-3 rounded-2xl border border-[#d4af37]/70 bg-[#071b36] px-4 py-4 text-white shadow-lg sm:mx-6 sm:px-6" aria-label="Evolução das suas vendas">
    <button type="button" onClick={() => void navigate({ to: "/pedidos" })} className="flex w-full items-center justify-between gap-3 text-left focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd43b]">
      <span className="text-base font-extrabold text-[#f1ce67] sm:text-xl">EVOLUÇÃO DAS SUAS VENDAS</span>
      <span className="text-xs font-semibold text-white/80">Ver relatório ›</span>
    </button>
    {isLoading ? <p className="py-8 text-center text-sm">Carregando suas vendas…</p> :
      isError ? <p className="py-8 text-center text-sm">Não foi possível consultar suas vendas.</p> :
      <><p className="mt-2 text-xs text-white/75">Total do mês atual</p>
        <p className="text-2xl font-black text-[#ffe083]">{brl(total)}</p>
        <div className="mt-4 grid h-32 grid-cols-6 items-end gap-2 sm:h-44" role="img" aria-label={`Vendas dos últimos seis meses: ${(data ?? []).map(item => `${item.label}: ${brl(item.total)}`).join("; ")}`}>
          {(data ?? []).map(item => <div key={item.key} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
            <span className="max-w-full truncate text-[9px] font-bold text-[#ffe083] sm:text-xs" title={brl(item.total)}>{item.total > 0 ? brl(item.total) : "—"}</span>
            <div className="flex h-[75%] w-full items-end justify-center">
              <div className="w-full max-w-12 rounded-t-md bg-gradient-to-t from-[#1b75ce] to-[#f4c64c]" style={{ height: `${item.total > 0 ? Math.max(7, item.total / max * 100) : 2}%` }} />
            </div>
            <span className="text-[11px] font-semibold sm:text-sm">{item.label}</span>
          </div>)}
        </div>
      </>}
  </section>;
}
